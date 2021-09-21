# Session

The `session` package (and related packages such as `sessionctx` and `variable`) are responsible for maintaining the state of both sessions and transactions.

## New session origins

New connections are first established in the `server` package. After some initial protocol negotiation, the `server` package [calls](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/server/driver_tidb.go#L181-L186) `session.CreateSession()`. This function then calls `session.createSessionWithOpt()` (via `CreateSessionWithOpt()`) which creates the session.

Sessions used for internal server operations are [usually created in a different manner](https://github.com/pingcap/tidb/blob/649ed6abc9790cfdd2a17065118379d8abcc7595/executor/simple.go#L83-L93), with the sessionctx being retrieved from a pool of sessions maintained by `domain`:
```go
dom := domain.GetDomain(e.ctx)
sysSessionPool := dom.SysSessionPool()
ctx, err := sysSessionPool.Get()
if err != nil {
    return nil, err
}
restrictedCtx := ctx.(sessionctx.Context)
restrictedCtx.GetSessionVars().InRestrictedSQL = true
```

Internal sessions will not show up in the output of `SHOW PROCESSLIST`, and because they do not have a privilege manager handle attached skip all privilege checks.

## System variable state

System variables follow similar semantics to MySQL:
- If a variable includes `SESSION` scope, the value is copied to the session state when the session is created.
- Any changes to the `GLOBAL` value will not apply to any existing sessions.

The state of the variables is stored in [`sessionVars`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/sessionctx/variable/session.go#L432-L958). The raw _string_ values are stored in a map named [`systems`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/sessionctx/variable/session.go#L449-L450). This string value is used for persistence in the `mysql.global_variables` table.

For many variables, as well as a _string_ value there is a typed field in `sessionVars`. For example:

`SessionVars.systems["tidb_skip_utf8_check"]` (string) maps to `SessionVars.SkipUTF8Check` (bool).

The typed value is set when the `SetSession` attached to the [system variable definition](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/sessionctx/variable/sysvar.go#L1029-L1032) is called. For `tidb_skip_utf8_check` this is as follows:

```go
{Scope: ScopeGlobal | ScopeSession, Name: TiDBSkipUTF8Check, Value: BoolToOnOff(DefSkipUTF8Check), Type: TypeBool, SetSession: func(s *SessionVars, val string) error {
		s.SkipUTF8Check = TiDBOptOn(val)
		return nil
	}},
```

The `SetSession` function can also be considered an `Init` function, since it is called when the session is created and the values are copied from global scope. To disable `SetSession` from being called on creation, `skipInit` can be set to `true`. For example with [`CharsetDatabase`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/sessionctx/variable/sysvar.go#L745-L752):

```go
{Scope: ScopeGlobal | ScopeSession, Name: CharsetDatabase, Value: mysql.DefaultCharset, skipInit: true, Validation: func(vars *SessionVars, normalizedValue string, originalValue string, scope ScopeFlag) (string, error) {
    return checkCharacterSet(normalizedValue, CharsetDatabase)
}, SetSession: func(s *SessionVars, val string) error {
	if cs, err := charset.GetCharsetInfo(val); err == nil {
		s.systems[CollationDatabase] = cs.DefaultCollation
	}
	return nil
}},
```

In the above example, skipping the `SetSession` function is useful because it prevents the `CollationDatabase` from being overwritten when the session is initialized. This is only expected if the user issues a statement to change the `CharsetDatabase` value.

### Differences from MySQL

In TiDB, changes to `GLOBAL` scoped system variables are propagated to other TiDB servers in the cluster and persist across restarts. The notification event to other servers is sent via an etcd channel in the call `domain.GetDomain(s).NotifyUpdateSysVarCache()`:

```go
// replaceGlobalVariablesTableValue executes restricted sql updates the variable value
// It will then notify the etcd channel that the value has changed.
func (s *session) replaceGlobalVariablesTableValue(ctx context.Context, varName, val string) error {
	stmt, err := s.ParseWithParams(ctx, `REPLACE INTO %n.%n (variable_name, variable_value) VALUES (%?, %?)`, mysql.SystemDB, mysql.GlobalVariablesTable, varName, val)
	if err != nil {
		return err
	}
	_, _, err = s.ExecRestrictedStmt(ctx, stmt)
	domain.GetDomain(s).NotifyUpdateSysVarCache() // <-- the notification happens here
	return err
}
```

Because `GLOBAL` scoped variables are propagated to other servers, TiDB also has a special concept of "instance-scoped variables". An instance scoped variable is actually a `SESSION` scoped variable that has a `GetSession` method which returns data that is specific to an instance. For example, [`tidb_general_log`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/sessionctx/variable/sysvar.go#L1315-L1321):

```go
{Scope: ScopeSession, Name: TiDBGeneralLog, Value: BoolToOnOff(DefTiDBGeneralLog), Type: TypeBool, skipInit: true, SetSession: func(s *SessionVars, val string) error {
	ProcessGeneralLog.Store(TiDBOptOn(val))
	return nil
}, GetSession: func(s *SessionVars) (string, error) {
	return BoolToOnOff(ProcessGeneralLog.Load()), nil
}},
```

The decision to make an option such as `tidb_general_log` instance scoped is because it references a file on the local filesystem. This may create issues when global, as the path may not be writable on each tidb-server in the cluster.

As you can see by the `Scope: Session`, instance-scoped variables are not natively handled by the sysvar framework, but are instead denoted by the `GetSession()` function reading from a global location. The documentation for [`tidb_general_log`](https://docs.pingcap.com/tidb/dev/system-variables#tidb_general_log) also notes it as "instance" scoped by convention.

## Transaction state

The `session` is responsible for keeping modified KV-pairs in an in-memory buffer until the transaction commits. A `commit` statement only sets the session variable state that it is [no longer in an active transaction](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/executor/simple.go#L701-L703):

```go
func (e *SimpleExec) executeCommit(s *ast.CommitStmt) {
	e.ctx.GetSessionVars().SetInTxn(false)
}
```

The function [`autoCommitAfterStmt()`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/session/tidb.go#L242-L267) which is called as part of [`finishStmt()`](https://github.com/pingcap/tidb/blob/246c59d5c926780235dd25aef27c469ffe376e21/session/tidb.go#L207-L224) is responsible for committing the transaction:

```go
if !sessVars.InTxn() {
	if err := se.CommitTxn(ctx); err != nil {
		if _, ok := sql.(*executor.ExecStmt).StmtNode.(*ast.CommitStmt); ok {
			err = errors.Annotatef(err, "previous statement: %s", se.GetSessionVars().PrevStmt)
		}
		return err
	}
	return nil
}
```

The `session.CommitTxn()` function will handle the `commit`, including retry (if permitted). There is also special handling for both pessimistic and optimistic transactions, as well as removing the KV pairs which apply to temporary tables from the transaction buffer.

## See also

- [The lifecycle of a statement](the-lifecycle-of-a-statement.md)
- [Privilege management](privilege.md)
- [Transaction](transaction.md)