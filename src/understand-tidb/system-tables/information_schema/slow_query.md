# slow_query

## Overview

Slow queries logs are written to `tidb-slow.log` (set with `slow-query-file` in the config) if they are over the `slow-threshold` (300ms by default). If `record-plan-in-slow-log` is enabled this will include the execution plan.

Each TiDB node writes its own slow logs.

### SLOW_QUERY
```
   +------------+
   | App or CLI |
   +------------+
         |
     SQL Query
     SLOW_QUERY
         |
     +--------+
     |  TiDB  |
     +--------+
         |
  +---------------+
  | tidb-slow.log |
  +---------------+
```

The slow log can be viewed directly or via the `information_schema.SLOW_QUERY` table.

The column definition is in [`slowQueryCols`](https://github.com/pingcap/tidb/blob/1521bf723dd023da655add0f883acaab5ee69683/pkg/infoschema/tables.go#L874-L956).

The [`SlowQueryExtractor`](https://github.com/pingcap/tidb/blob/1521bf723dd023da655add0f883acaab5ee69683/pkg/planner/core/memtable_predicate_extractor.go#L1282) helps to extract some predicates of `slow_query`.

A lot of the other logic can be found in [`slow_query.go`](https://github.com/pingcap/tidb/blob/master/pkg/executor/slow_query.go).

This table has [`RuntimeStats`](https://github.com/pingcap/tidb/blob/2e51209f483bb7909be1eb0b55e5f18f0c437a25/pkg/executor/slow_query.go#L1114-L1119), which adds stats to `EXPLAIN ANALYZE` output.

### CLUSTER_SLOW_QUERY

There is also the `information_schema.CLUSTER_SLOW_QUERY` table that combines the slow log from all nodes into a single table.

The [TiDB Dashboard](https://docs.pingcap.com/tidb/stable/dashboard-slow-query) uses the `CLUSTER_SLOW_QUERY` table to display the slow queries in a webpage.

```
                  +----------------+
                  | TiDB Dashboard |
                  |   or App/CLI   |
                  +----------------+
                         |
                      SQL Query
                  CLUSTER_SLOW_QUERY
                         |
                      +--------+
        +--gRPC-------| TiDB 1 |------gRPC--+
        |             +--------+            |
   +--------+            |               +--------+
   | TiDB 0 |            |               | TiDB 2 |
   +--------+            |               +--------+
      |                  |                  |
+---------------+  +---------------+  +---------------+
| tidb-slow.log |  | tidb-slow.log |  | tidb-slow.log |
+---------------+  +---------------+  +---------------+
```

The protobuf messages are defined in [`diagnosticspb.proto`](https://github.com/pingcap/kvproto/blob/master/proto/diagnosticspb.proto) in the `pingcap/kvproto` repo.

This table uses the [`clusterLogRetriever`](https://github.com/pingcap/tidb/blob/1521bf723dd023da655add0f883acaab5ee69683/pkg/executor/memtable_reader.go#L361) with the [`ClusterLogTableExtractor`](https://github.com/pingcap/tidb/blob/1521bf723dd023da655add0f883acaab5ee69683/pkg/planner/core/memtable_predicate_extractor.go#L756).

There are no `RuntimeStats` for this table, see [this issue](https://github.com/pingcap/tidb/issues/56707) for a request to add that.

## Documentation

- User docs
    - [information_schema.slow_query](https://docs.pingcap.com/tidb/stable/information-schema-slow-query)
    - [Identify Slow Queries](https://docs.pingcap.com/tidb/stable/identify-slow-queries#query-the-number-of-slow-queries-for-each-tidb-node-in-a-cluster)