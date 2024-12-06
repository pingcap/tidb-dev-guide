# System tables

There are multiple types of system tables:

- `mysql` schema: There are mostly real tables stored on TiKV
- [`information_schema`](information_schema/introduction.md): These tables are generated on request and not stored on disk.
- `performance_schema`: These tables are generated on request and not stored on disk.
- `metrics_schema`: These are metrics from Prometheus, not real tables.
- `SYS`: these are views etc to make `performance_schema` easier to use.

See also the docs:
- [TiDB mysql schema](https://docs.pingcap.com/tidb/stable/mysql-schema)
- [TiDB information_schema](https://docs.pingcap.com/tidb/stable/information-schema)
- [TiDB performance_schema](https://docs.pingcap.com/tidb/stable/performance-schema)
- [TiDB sys schema](https://docs.pingcap.com/tidb/stable/sys-schema)
- [TiDB metrics_schema](https://docs.pingcap.com/tidb/stable/metrics-schema)
- [MySQL performance_schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html)
- [MySQL information_schema](https://dev.mysql.com/doc/refman/8.4/en/information-schema.html)
- [MySQL sys schema](https://dev.mysql.com/doc/refman/8.4/en/sys-schema.html)
- [MySQL mysql schema](https://dev.mysql.com/doc/refman/8.4/en/system-schema.html)