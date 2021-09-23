# DQL
## 1 概述
本章节主要讲述 TiDB 中一条数据查询语句的执行过程，从 SQL 处理流程出发，描述了一条 SQL 怎样发送至 TiDB，TiDB 在接收到 SQL 后在哪里对其怎样处理和执行，执行完得到结果后怎么返回。

## 2 执行流程
从整体来看，一条 SQL 语句的执行过程主要分为三个部分
1. Protocol Layer  
   Protocol 层主要负责协议解析和转换，这一部分的逻辑都在 server 这个包中，主要逻辑分为两块：一是连接的建立和管理，每个连接对应于一个 Session；二是在单个连接上的处理逻辑。
2. SQL Layer  
   SQL 层的处理是 TiDB 中最为复杂的部分，因为 SQL 本身是一门十分复杂的语言，数据类型多，操作符多，语法组合多，需要大量的代码来处理，加上底层是一个分布式的存储引擎，会面临很多单机存储引擎不会遇到的问题。
3. KV API Layer  
   KV API 层主要作用是将请求路由到正确的的 KV Server，接收返回消息传给 SQL 层，并在此过程中处理各种异常逻辑

一条 SQL 首先要经过协议解析和转换，拿到语句内容，然后经过 SQL 核心层逻辑处理，生成查询计划，最后去存储引擎中获取数据，进行计算，返回结果。本章节主要详细讲解 SQL 层。

### 2.1 协议层
#### 2.1.1 入口
TiDB 协议层的入口逻辑在 server/conn.go 中，当与客户端建立好连接以后，TiDB 会启动一个 goroutine 监听端口，不断等待客户端发来的包，对包做处理，我们可以看 [clientConn.Run()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/conn.go#L911), 这里会在一个循环中不断读取网络包，然后调用 [clientConn.dispatch()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/conn.go#L1111) 方法处理收到的请求,
```go=
data, err := cc.readPacket()
if err = cc.dispatch(ctx, data) 
```
dispatch 要处理原始的data byte 数组， 第一个 byte 就是 command 类型，本章介绍的类型为 COM_QUERY，详细的 byte 数组内容读者可以参考 [MySQL 协议](https://dev.mysql.com/doc/internals/en/client-server-protocol.html)。对于 Command Query，从客户端发送来的主要是 SQL 文本，处理函数是 [clientConn.handleQuery()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/conn.go#L1633)，这个函数具体会执行 [TiDBContext.ExecuteStmt() ](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/driver_tidb.go#L217)方法，这个方法的实现在 server/driver_tidb.go 中，
```go=
func (tc *TiDBContext) ExecuteStmt(ctx context.Context, stmt ast.StmtNode) (ResultSet, error) {
	rs, err := tc.Session.ExecuteStmt(ctx, stmt)
```
[session.ExecuteStmt()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/session/session.go#L1620) 在 session.go 中实现，从此步骤开始进入 SQL 核心层，经过一系列处理后得到 SQL 的执行结果。

#### 2.1.2 出口
当通过上面一系列操作得到 SQL 执行结果后，按照 MySQL 协议的要求，将结果按照 Field 列数和行数通过 [clientConn.writeResultSet()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/conn.go#L1943) 写回到客户端中。

### 2.2 SQL 层
SQL层有几个重要的概念，我们需要关注几个重要的接口
* [session](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/session/session.go#L123)
* [RecordSet](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/util/sqlexec/restricted_sql_executor.go#L133)
* [Plan](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/planner/core/plan.go#L36)
* [Executor](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/executor/executor.go#L258)

#### 2.2.1 Session
Session 中最重要的函数是 ExecuteStmt ，这里会调用下面所述的各种模块，根据 Session 的环境变量比如 AutoCommit，时区等完成语句执行.
#### 2.2.2 Parser
[Parser](https://github.com/pingcap/parser/blob/10b704ade769e4eb0681b74c0c223c4291073308/yy_parser.go) 由 [Lexer](https://github.com/pingcap/parser/blob/10b704ade769e4eb0681b74c0c223c4291073308/lexer.go) & Yacc 构成，可以将文本解析成抽象语法树（AST）
```go=
p := parserPool.Get().(*parser.Parser)
defer parserPool.Put(p)
p.SetSQLMode(s.sessionVars.SQLMode)
p.SetParserConfig(s.sessionVars.BuildParserConfig())
tmp, warn, err := p.Parse(sql, charset, collation)
```  
在解析过程中，会先用 lexer 不断地将文本转换成 token，交付给 Parser，Parser 是根据 [yacc 语法](https://github.com/pingcap/tidb/blob/45457ea8810ca7b835da4ba7f55d0eee02043ac5/parser/parser.y) 生成，根据语法不断的决定 Lexer 中发来的 token 序列可以匹配哪条语法规则，最终输出结构化的节点。 例如对于这样一条语句
```SELECT * FROM t WHERE c > 1;```
，可以匹配 [SelectStmt 的规则](https://github.com/pingcap/tidb/blob/45457ea8810ca7b835da4ba7f55d0eee02043ac5/parser/parser.y#L3936) ，被转换成下面这样一个数据结构：
```go=
type SelectStmt struct {
	dmlNode

	// SelectStmtOpts wraps around select hints and switches.
	*SelectStmtOpts
	// Distinct represents whether the select has distinct option.
	Distinct bool
	// From is the from clause of the query.
	From *TableRefsClause
	// Where is the where clause in select statement.
	Where ExprNode
	// Fields is the select expression list.
	Fields *FieldList
	// GroupBy is the group by expression list.
	GroupBy *GroupByClause
	// Having is the having condition.
	Having *HavingClause
	// WindowSpecs is the window specification list.
	WindowSpecs []WindowSpec
	// OrderBy is the ordering expression list.
	OrderBy *OrderByClause
	// Limit is the limit clause.
	Limit *Limit
	// LockInfo is the lock type
	LockInfo *SelectLockInfo
	// TableHints represents the table level Optimizer Hint for join type
	TableHints []*TableOptimizerHint
	// IsInBraces indicates whether it's a stmt in brace.
	IsInBraces bool
	// WithBeforeBraces indicates whether stmt's with clause is before the brace.
	// It's used to distinguish (with xxx select xxx) and with xxx (select xxx)
	WithBeforeBraces bool
	// QueryBlockOffset indicates the order of this SelectStmt if counted from left to right in the sql text.
	QueryBlockOffset int
	// SelectIntoOpt is the select-into option.
	SelectIntoOpt *SelectIntoOption
	// AfterSetOperator indicates the SelectStmt after which type of set operator
	AfterSetOperator *SetOprType
	// Kind refer to three kind of statement: SelectStmt, TableStmt and ValuesStmt
	Kind SelectStmtKind
	// Lists is filled only when Kind == SelectStmtKindValues
	Lists []*RowExpr
	With  *WithClause
}
```
根据 SQL 语句，```FROM t``` 被解析为 FROM字段，```WHERE c > 1``` 被解析为 Where字段，```*``` 被解析为 Fields字段。所有的语句的结构够都被抽象为一个 ast.StmtNode，大部分 ast 包中的数据结构，都实现了 ast.Node接口，这个接口有一个 Accept方法，后续对 AST 的处理，主要依赖这个 Accept 方法，以 Visitor 模式 遍历所有的节点以及对 AST 做结构转换。
#### 2.2.3 Compile
生成 AST 后，我们就可以通过 [Compiler.Compile()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/executor/compiler.go#L50) 来做各种验证、变化、优化:
```go=
compiler := executor.Compiler{Ctx: s}
stmt, err := compiler.Compile(ctx, stmtNode)
```
Compile 函数中，主要有三个步骤：
1. plan.Preprocess: 做一些合法性检查以及名字绑定；
2. plan.Optimize：制定查询计划，并优化，这个是最核心的步骤之一；
3. 构造 executor.ExecStmt结构：这个 [ExecStmt](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/executor/adapter.go#L186) 结构持有查询计划，是后续执行的基础，非常重要，特别是 Exec 这个方法。

#### 2.2.4 Executor
在执行器生成过程中 [ExecStmt.buildExecutor()](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/executor/adapter.go#L764) 会将 plan 转换成 executor，执行引擎即可通过 executor 执行之前定下的查询计划， 生成执行器之后，被封装在一个 recordSet结构中：
```go=
return &recordSet{
    executor:   e,
    stmt:       a,
    txnStartTS: txnStartTS,
}
```
这个结构实现了 [ast.RecordSet](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/util/sqlexec/restricted_sql_executor.go#L133) 接口，从字面上大家可以看出，这个接口代表了查询结果集的抽象，我们看一下它的几个方法：
```go=
type RecordSet interface {
	// Fields gets result fields.
	Fields() []*ast.ResultField

	// Next reads records into chunk.
	Next(ctx context.Context, req *chunk.Chunk) error

	// NewChunk create a chunk.
	NewChunk() *chunk.Chunk

	// Close closes the underlying iterator, call Next after Close will
	// restart the iteration.
	Close() error
}
```
通过注释大家可以看到这个接口的作用，简单来说，可以调用 Fields() 方法获得结果集每一列的类型，调用 Next 可以获取一批数据，调用 Close() 可以关闭结果集。

TiDB 的执行引擎是以 Volcano 模型运行，所有的物理 Executor 构成一个树状结构，每一层通过调用下一层的 Next() 方法获取结果。 假设语句是 ```SELECT c1 FROM t WHERE c2 > 1;```，并且查询计划选择的是全表扫描+过滤，那么执行器树会是下面这样：

![](../img/dql-volcano.png)
图中可以看到 Executor 之间的调用关系和数据之间的流动方式。一条数据查询语句的计算起点也就是最顶层的 next 是由给[客户端返回数据的地方调用](https://github.com/pingcap/tidb/blob/05d2210647d6a1503a8d772477e43b14a024f609/server/conn.go#L2016)的：
```go=
		err := rs.Next(ctx, req)
```
这里的 rs 即为一个 RecordSet 接口，对其不断的调用 Next()，拿到更多结果，返回给 Client 端。

## 3 整体框架图
根据上面描述的一条数据查询语句的执行流程，可以用一副图来描述执行的整体框架：

![](../img/dql-frame-diagram.png)
