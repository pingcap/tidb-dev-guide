# The lifecycle of a statement

## MySQL protocol package with command and statement string

After [connecting and getting authenticated](understand-tidb/mysql-protocol-and-session-management.md) the server is in a [statement execution loop](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L938) until the client is disconnected.

The [dispatch](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1111) function checks what kind of command was sent through the MySQL protocol and dispatches the matching function, like this snippet:
```golang
	switch cmd {
...
	case mysql.ComQuit:
		return io.EOF
	case mysql.ComInitDB:
		if err := cc.useDB(ctx, dataStr); err != nil {
			return err
		}
		return cc.writeOK(ctx)
	case mysql.ComQuery: // Most frequently used command.
		return cc.handleQuery(ctx, dataStr)
```
Where [mysql.ComQuery](https://github.com/pingcap/parser/blob/d4a88481405f8c59d45fc0a9c38ee24d55b9bf49/mysql/const.go#L102) is routed to [handleQuery](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1633), which handles all different non-prepared statements (some commands like change database/schema or ping are handled directly in the dispatch function).

## Statement string to Abstract Syntax Tree

In [handleQuery](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1633) we first needs to [parse](https://github.com/pingcap/parser/blob/d4a88481405f8c59d45fc0a9c38ee24d55b9bf49/yy_parser.go#L137) the statement string, which is done by [the parser, which is in its own repository](https://github.com/pingcap/parser) which is a MySQL compatible parser which parses statements and returns an Abstract Syntax Tree (AST) representing the statement.

## AST -> Physical execution plan

We now have a statement in AST form to handle in [handleStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1814)/[ExecuteStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/session/session.go#L1620) where the Abstract Syntax Tree is [compiled](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/executor/compiler.go#L50) to a physical execution plan, including [optimizing](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/planner/optimize.go#L100) the execution plan, through a cost based optimizer. There are several steps in this process, such as name resolution, transaction management, [privilege checks](understand-tidb/privilege-management.md), handling given hints, etc.

## Executing the optimized plan

The optimized plan is executed through [runStmt](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/session/session.go#L1750), which builds an [executor](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/executor/adapter.go#L319) from the plan which will return a record set or directly execute the statements in case no records will be returned (like `INSERT`/`UPDATE`/`DELETE`). Before returning the record set, the executor starts the execution by calling the `Open()` API and the `Next()` api to retrieve the first chunk of data or execute the statement fully if no records are to be returned.

### Requests sent to TiKV/TiFlash coprocessors

### Sending the result back to the client

If the statement returns a record set, it is handled in [writeChunks](https://github.com/pingcap/tidb/blob/30cf15a59db11c34ffe05fc926152a43327eaa61/server/conn.go#L1993) which loops over the record set's `Next()` 

Notice that things like error handling, tracing etc. are not explained in this page.

## TODO list (to be removed when completed)
Agenda:

* the key components that a statement needs to pass-through
  * where the statement is received in a session - Done
  * where the statement is parsed into an AST - Done
  * where the AST is converted into an execution plan - Done
  * where the execution plan is executed - Done
  * where the request is sent to TiKV coprocessor
  * where the execution result is returned to the client - Done
* an example of Data Definition Language statement/DDL
* an example of Data Modification Language statement/DML
* an example of Data Query Language statement/DQL

```sql
-- DDL
create table t(a bigint, b bigint);

-- DML
insert into t values (1, 1);

-- DQL
select * from t where a = 1;
```

