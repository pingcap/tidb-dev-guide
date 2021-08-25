# The Lifecycle of a Statement

## MySQL protocol package with command and statement string

After connecting and getting authenticated, the server is in a [statement execution loop](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L938) until the client is disconnected.

The [dispatch](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1111) function checks what kind of command was sent through the MySQL protocol and dispatches the matching function, like this snippet:
```golang
	switch cmd {
	// ...
	case mysql.ComQuit:
		return io.EOF
	case mysql.ComInitDB:
		if err := cc.useDB(ctx, dataStr); err != nil {
			return err
		}
		return cc.writeOK(ctx)
	case mysql.ComQuery: // Most frequently used command.
		return cc.handleQuery(ctx, dataStr)
	// ...
	}
```
Where [mysql.ComQuery](https://github.com/pingcap/parser/blob/d4a88481405f8c59d45fc0a9c38ee24d55b9bf49/mysql/const.go#L102) is routed to [handleQuery](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1633), which handles all different non-prepared statements (some commands like change database/schema or ping are handled directly in the dispatch function).

TiDB keep the state between statements like sql_mode, transaction state etc. in the clientConn's [sessionctx.Context](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/sessionctx/context.go#L43) struct.

The MySQL protocol is synchronous, and the typical execution flow revolves around a client sending a single query, and receiving an optional result set ending with an OK package containing the success flag and optional warnings/errors and possible metadata such as affected rows.

As shown here; it is possible that a client might send multiple queries in one mysql.ComQuery call, in which case the cc.ctx.Parse will return multiple results. However; this is not a common occurence. By default, multiple statements in one mysql.ComQuery call is disabled for security reasons, like making sql injectios like `SELECT user FROM users WHERE id = ''/* sql injection */; INSERT INTO users VALUES (null, 'EvilUser'); -- '`. Clients must explicitly enable the ClientMultiStatements protocol feature.

## High level code for handling a query

Real types and function names, but only high level for less distraction by too much details

Further explanations below.

```golang
// handleQuery is the entry point for running client connection statements/queries
func (cc *clientConn) handleQuery(ctx context.Context, sql string) (error) {
	stmts, err := cc.ctx.Parse(ctx, sql)
	// ...

	for i, stmt := range stmts {
		retryable, err = cc.handleStmt(ctx, stmt, ...)
		// ...
	}
}

// handleStmt handles a single statement
func (cc *clientConn) handleStmt(ctx context.Context, stmt ast.StmtNode, ...) (bool, error) {
	resultSet, err := cc.ctx.ExecuteStmt(ctx, stmt)
	// ...
	retryable, err := cc.writeResultset(ctx, resultSet, ...)
	// ...
}

func (tc *TiDBContext) ExecuteStmt(ctx context.Context, stmt ast.StmtNode) (ResultSet, error) {
	resultSet, err := tc.Session.ExecuteStmt(ctx, stmt)
	// ...
	return resultSet, err
}

// ExecuteStmt takes an Abstract Syntax Tree and will go through the optimizer and start the execution
// and return a recordSet.
func (s *session) ExecuteStmt(ctx context.Context, stmtNode ast.StmtNode) (sqlexec.RecordSet, error) {
	// ...
	compiler := executor.Compiler{Ctx: s}
	stmt, err := compiler.Compile(ctx, stmtNode)
	// ...

	resultSet, err := runStmt(ctx, s, stmt)
	// ...
	return resultSet, err
}

// Compile compiles an ast.StmtNode to a physical plan.
func (c *Compiler) Compile(ctx context.Context, stmtNode ast.StmtNode) (*ExecStmt, error) {
	// ...

	// PrepareTxnCtx starts a goroutine to begin a transaction if needed, and creates a new transaction context.
	s.PrepareTxnCtx(ctx)


	// Preprocess resolves table names of the node, and checks some statements validation.
	err := plannercore.Preprocess(c.Ctx, stmtNode, plannercore.WithPreprocessorReturn(ret), plannercore.WithExecuteInfoSchemaUpdate(pe))
	// ...

	// Optimize does optimization and creates a Plan.
	// The node must be prepared first.
	finalPlan, names, err := planner.Optimize(ctx, c.Ctx, stmtNode, ret.InfoSchema)
}

// runStmt executes the sqlexec.Statement and commit or rollback the current transaction.
func runStmt(ctx context.Context, se *session, s sqlexec.Statement) (sqlexec.RecordSet, error) {
	rs, err := s.Exec(ctx)
	// ...
	return &execStmtResult{RecordSet: rs, ...}, err
}

// writeResultset iterates over the Resultset and sends it to the client connection.
func (cc *clientConn) writeResultset(ctx context.Context, rs ResultSet ...) (bool, error) {
	retryable, err = cc.writeChunks(ctx, rs, ...)
	// ...
	return false, cc.flush(ctx)
}

// writeChunks writes data from a Chunk, which filled data by a ResultSet, into a connection.
func (cc *clientConn) writeChunks(ctx context.Context, rs ResultSet ...) (bool, error) {
	req := rs.NewChunk()
	for {
		err := rs.Next(ctx, req)
		// ...
		rowCount := req.NumRows()
		if rowCount == 0 {
			break
		}
		cc.writePacket(...)
	}
	return false, cc.writeEOF(...)
}
```


## Statement string to Abstract Syntax Tree

In [handleQuery](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1633) the statement string is [parsed](https://github.com/pingcap/parser/blob/d4a88481405f8c59d45fc0a9c38ee24d55b9bf49/yy_parser.go#L137) by [the parser, which is in its own repository](https://github.com/pingcap/parser), that is a MySQL compatible parser parsing statements and returns an Abstract Syntax Tree (AST) representing the statement. See more in the [parser section](parser.md)

Example of Abstract Syntax tree, the fragment of a `WHERE` clause `` `id` > 1 AND `value` = 'Second' `` looks like:
```go
ast.BinaryOperationExpr{
  Op: opcode.LogicAnd,
  L:  ast.BinaryOperationExpr{
    Op: opcode.GT,
    L:  ast.ColumnName{Name: 'id'},
    R:  parser_driver.ValueExpr{i: 1}
  },
  R: ast.BinaryOperationExpr{
    Op: opcode.EQ,
    L:  ast.ColumnName{Name: 'value'},
    R:  parser_driver.ValueExpr{b: 'Second'}
  },
}
```

## AST -> Physical execution plan

Then the statement in AST form is handled in [handleStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1814)/[ExecuteStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/session/session.go#L1620) where the Abstract Syntax Tree is [compiled](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/executor/compiler.go#L50) first to a logical plan and then to a physical execution plan, including [optimizing](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/planner/optimize.go#L100) the execution plan, through a cost based optimizer. There are several steps in this process, such as name resolution, transaction management, [privilege checks](privilege.md), handling given hints, etc.

One important thing to note is the `planner.TryFastPlan()` function that checks if there is a shortcut for a PointGet plan, to avoid spending too much time in the optimizer for _simple_ queries, like primary key lookups.

For deeper understanding, please read the [planner section](planner.md)

Example of plan from a simple select:
```sql
tidb> explain select id, value from t where id > 1 and value = 'Second';
+--------------------------+---------+-----------+---------------+----------------------------------+
| id                       | estRows | task      | access object | operator info                    |
+--------------------------+---------+-----------+---------------+----------------------------------+
| TableReader_7            | 0.00    | root      |               | data:Selection_6                 |
| └─Selection_6            | 0.00    | cop[tikv] |               | eq(test.t.value, "Second")       |
|   └─TableRangeScan_5     | 1.00    | cop[tikv] | table:t       | range:(1,+inf], keep order:false |
+--------------------------+---------+-----------+---------------+----------------------------------+
```

Where TableReader_7 is the task which will run in TiDB, getting already filtered data from Selection_6 scheduled on the storage nodes (TiKV/TiFlash) directly connected to the storage nodes Table/index range scan task/coprocessor, TableRangeScan_5.

## Executing the optimized plan

The optimized plan is executed through [runStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/session/session.go#L1750), which builds an [executor](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/executor/adapter.go#L319) from the plan and will return a record set or directly execute the statements in case no records will be returned, like `INSERT`/`UPDATE`/`DELETE` statements. Before returning the record set, the executor starts the execution by calling the Volcano inspired `Open()` API and the `Next()` api to retrieve the first chunk of data or execute the statement fully if no records are to be returned.

The executors are often including coprocessors as seen above, where tasks can be seen as stream processors and can be parallelized and delegated to storage nodes (TiKV/TiFlash).

### Requests sent to TiKV/TiFlash coprocessors

During the execution different task are executed as coprocessors and delegated/pushed down to the storage nodes (TiKV/TiFlash) for both scaling and more optimized use of the cluster.

This way there is less data sent between TiDB nodes and TiKV/TiFlash nodes (only filtered and aggregated results) and the computation/load are distributed across several storage nodes.

Common coprocessors are: TableScan (simplest form no real optimisation), IndexScan (Range reads from index), Selection (Filter on condition, `WHERE` clause etc.), LIMIT (no more than N records), TopN (Order + Limit), Aggregation (`GROUP BY`)

```go
// HandleStreamRequest handles the coprocessor stream request.
func (h *CoprocessorDAGHandler) HandleStreamRequest(ctx context.Context, req *coprocessor.Request, stream tikvpb.Tikv_CoprocessorStreamServer) error {
  e, err := h.buildDAGExecutor(req)
  err = e.Open(ctx)
  chk := newFirstChunk(e)
  for {
    chk.Reset()
    err = Next(ctx, e, chk)
    // ...
    if chk.NumRows() == 0 {
       return h.buildResponseAndSendToStream(chk, ...)
    }
  }
}
```

As seen above the Volcano inspired execution is iterating over `chunks` of data, not records one-by-one, which also allows for vectorization, which formats the chunk data so it can be processed as a vector instead of looping over each record and column one by one.

### Sending the result back to the client

If the statement returns a record set, it is handled in [writeChunks](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1993) which loops over the record set's `Next()` until empty and then adds some context/metadata to the MySQL OK package and flushes the data back to the client.

Notice that things like error handling, tracing etc. are not explained in this page.
