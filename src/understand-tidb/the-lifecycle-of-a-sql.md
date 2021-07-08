# The lifecycle of a SQL

Agenda:

* the key components that a SQL needs to pass-through
  * where the sql is received in a session
  * where the sql is parsed into an AST
  * where the AST is converted into an execution plan
  * where the execution plan is executed
  * where the request is sent to TiKV coprocessor
  * where the execution result is returned to the client
* an example of DDL
* an example of DML
* an example of DQL

```sql
-- DDL
create table t(a bigint, b bigint);

-- DML
insert into t values (1, 1);

-- DQL
select * from t where a = 1;
```

