# Privilege

At its core, TiDB's approach to user privileges is similar to that of MySQL:

* The privileges are stored in tables such as `mysql.user` and `mysql.db`.
* The privilege tables are then loaded into an [in-memory cache](https://github.com/pingcap/tidb/blob/master/privilege/privileges/cache.go). The cache is then used by the privilege manager to determine the privileges of a user.
* The cache is automatically updated when using privilege control statements such as `GRANT` and `REVOKE`. The statement `FLUSH PRIVILEGES` can also be used to manually reload the cache for when manual changes are made to the privilege tables.

## Behavior differences from MySQL

Implicit updates to the privilege cache (i.e. when `GRANT` or `REVOKE` statements are executed) run immediately on the instance of TiDB that is executing the statement. A [notification is also sent to all TiDB instances](https://github.com/pingcap/tidb/blob/5e05922de6a253859cfbfe19356de8a2e2db39da/domain/domain.go#L1355-L1373) to rebuild their cache. This notification is sent asynchronously, so it is possible that when a load balancer is used, the cache will be out of date when attempting to reconnect to a TiDB instance immediately.

Because the asynchronous notifications do not guarantee delivery, TiDB will also [automatically rebuild the privilege cache](https://github.com/pingcap/tidb/blob/5e05922de6a253859cfbfe19356de8a2e2db39da/domain/domain.go#L852-L908) every 5-10 minutes in a loop. This behavior is not strictly MySQL compatible, because in MySQL the privilege cache will only ever be rebuilt from a `FLUSH PRIVILEGES` statement, a restart, or a privilege control statement.

Client certificate options are stored in the `mysql.global_priv` table instead of the `mysql.user` table. This behavior is not intentional, and may be changed in the future.

## Adding privilege checks to a statement

Some privilege checks are automatically assigned during plan building, for example ensuring that you have permissions to the tables that will be accessed. These checks are skipped for `information_schema` tables, and should you add an additional statement (such as `SHOW xyz`), you will also need to ensure that privilege checks are added.

Should you need to add privilege checks there are two options:

1. During plan building you can attach `visitInfo` to the plan (examples: [`SET CONFIG`](https://github.com/pingcap/tidb/blob/5e05922de6a253859cfbfe19356de8a2e2db39da/planner/core/planbuilder.go#L745), [`SHOW BACKUPS`](https://github.com/pingcap/tidb/blob/5e05922de6a253859cfbfe19356de8a2e2db39da/planner/core/planbuilder.go#L2378-L2380))

2. In the executor function which handles the statement (examples: [`SHOW PROCESSLIST`](https://github.com/pingcap/tidb/blob/1a54708a7f8f86515236626c78e97a33d8adf583/executor/show.go#L368-L380)).

The first option is recommended, as it is much less verbose. However, `visitInfo` does not handle cases where the statement can behave differently depending on the permissions of the user executing it. All users can execute the `SHOW PROCESSLIST` statement, but to see the sessions of other users requires the `PROCESS` privilege.

`visitInfo` also only supports **AND** semantics. For complex scenarios (such as `DROP USER` requiring either `CREATE USER` **OR** `DELETE` privileges on the `mysql.user` table), option 2 is required.

### Manually checking with the privilege manager

For (2) above, manual checks should follow the following pattern:

```go
checker := privilege.GetPrivilegeManager(e.ctx)
if checker != nil && !checker.RequestVerification(ctx.GetSessionVars().ActiveRoles, schema.Name.L, table.Name.L, "", mysql.AllPrivMask) {
    /* do something */
}
..
if checker == nil || !checker.RequestDynamicVerification(ctx.GetSessionVars().ActiveRoles, "RESTRICTED_TABLES_ADMIN", false) {
    /* do something */
}
```

The check for `checker != nil` is important because for internal SQL statements the privilege manager is not present. These statements are expected to fall through and satisfy the privilege check.

### Static and dynamic privileges

Privileges fall into two categories:

* Static privileges: These are the "traditional" privileges such as `INSERT`, `UPDATE`, `SELECT`, `DELETE`, `SUPER`, `PROCESS` which have existed in MySQL for a long time. They can *usually* be assigned to a user on either a global or database/table level.
* Dynamic privileges: These are new privileges such as `BACKUP_ADMIN`, `RESTORE_ADMIN`, `CONNECTION_ADMIN`. They can only be assigned on a global level, and each have their own "grantable" attribute.

Dynamic privileges were introduced in MySQL 8.0 (and [TiDB 5.1](https://github.com/pingcap/tidb/blob/master/docs/design/2021-03-09-dynamic-privileges.md)) to solve a specific issue, which is that the `SUPER` privilege is too coarse. There are many scenarios where a user needs to be assigned the `SUPER` privilege to perform a specific action, but too many other privileges are granted at the same time.

Any statements added to TiDB **should no longer require** the `SUPER` privilege directly. Instead, a dynamic privilege should be added [which will be satified](https://github.com/pingcap/tidb/blob/5e05922de6a253859cfbfe19356de8a2e2db39da/privilege/privileges/cache.go#L1009) by the `SUPER` privilege.

### Security Enhanced Mode

TiDB features an extension to MySQL called [Security Enhanced Mode](https://github.com/pingcap/tidb/blob/master/docs/design/2021-03-09-security-enhanced-mode.md) (SEM), which is disabled by default. One of the main aims of SEM is to reduce the privileges of `SUPER` and instead require specific "restricted" dynamic privileges instead. The design is inspired by features such as "Security Enhanced Linux" (SeLinux) and AppArmor.

SEM plugs directly into the privilege manager, but the hard coded list of restricted objects lives in [`./util/sem/*`](https://github.com/pingcap/tidb/blob/master/util/sem/sem.go). It is expected that over time SEM will protect against additional operations which are considered to be high risk or too broad.

### Recommended Reading

* [Technical Design: Security Enhanced Mode](https://github.com/pingcap/tidb/blob/master/docs/design/2021-03-09-security-enhanced-mode.md)
* [Technical Design: Dynamic Privileges](https://github.com/pingcap/tidb/blob/master/docs/design/2021-03-09-dynamic-privileges.md)
* [MySQL Worklog: Pluggable Dynamic Privileges](https://dev.mysql.com/worklog/task/?id=8131)
