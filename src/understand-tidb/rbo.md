# Rule-based Optimization

As stated in the planner overview, rule-based optimization (usually used interchangeably with logical optimization in TiDB code) consists of logical optimization rules. These rules have predefined order to be iterated. Each rule has a responding flag, a rule will be applied only if it is flagged and not disabled. The flag is set according to the SQL in the plan building stage.

The rule-based optimization will produce a logical plan tree that is logically equal to the original one. Besides the original plan tree, it will also make use of table schema information to make optimizations, but it doesn't rely on the statistics to do optimization (join reorder is the only exception, we'll talk about it later).

## Implementation Patterns

Code for each rule is placed in a separated file named "rule_xxx_xxx.go".

All logical rule implements the [`logicalOptRule`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/optimizer.go#L85-L89) interface.

It is defined as follows:

```go
type logicalOptRule interface {
	optimize(context.Context, LogicalPlan) (LogicalPlan, error)
	name() string
}
```

The overall logic of a rule is traversing the plan tree, matching a specific operator (or a pattern), and modifying the plan tree.

The traversal logic is implemented mainly in two ways:

1. Implement a method for the rule and recursively call itself in it. Logics for all kinds of operator are implemented in this method, e.g., [`(*decorrelateSolver).optimize()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L122) for decorrelation and [`(*aggregationEliminator).optimize()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_elimination.go#L182) for aggregation elimination.
2. Add a method into the [`LogicalPlan`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/plan.go#L229) interface and recursively call this method in it. Each operator has an implementation. Like [`PredicatePushDown()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/plan.go#L236-L239) for predicate pushdown and [`PruneColumns()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/plan.go#L241-L242) for column pruning.

## Rules

### Column Pruning

This is a very fundamental optimization. It will prune unneeded columns for each operator. 

This main logic is in `PruneColumns(parentUsedCols []*expression.Column) error` method of the `LogicalPlan` interface. It traverses the plan tree from top to bottom. Each operator receives which columns are used by the parent operator, then uses this information to prune unneeded columns from itself (different kinds of operator would have different behaviors), then collect and pass columns needed by itself to its children.

### Decorrelation

As stated in the planner overview, the correlated subquery in the SQL becomes the `Apply` operator, which is a special kind of `Join` operator, in the plan tree. If we can transform it to a normal `Join` and keep it logically equal to the `Apply`, we can do make more optimizations that are only available to normal join operators. 

An `Apply` is equivalent to a `Join` if there are no correlated columns in its inner side. Here we try to pull up operators with correlated columns in the inner side across the `Apply`, then `Apply` can be changed to `Join` directly. So this kind of transformation is called decorrelation.

The main logic is in [`(*decorrelateSolver).optimize()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L122). It finds `Apply` and tries to decorrelate it.

Currently, there're several cases we can decorrelate.

[If the inner side is a `Selection`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L132), we can directly change it to a join condition of the `Apply`.

Example:
```sql
CREATE TABLE t1(a INT, b INT);
CREATE TABLE t2(a INT, b INT);
EXPLAIN SELECT * FROM t1 WHERE t1.a IN (SELECT t2.a FROM t2 WHERE t2.b = t1.b);
```
```
+------------------------------+----------+-----------+---------------+--------------------------------------------------------------------------+
| id                           | estRows  | task      | access object | operator info                                                            |
+------------------------------+----------+-----------+---------------+--------------------------------------------------------------------------+
| HashJoin_22                  | 7984.01  | root      |               | semi join, equal:[eq(test2.t1.b, test2.t2.b) eq(test2.t1.a, test2.t2.a)] |
| ├─TableReader_28(Build)      | 9990.00  | root      |               | data:Selection_27                                                        |
| │ └─Selection_27             | 9990.00  | cop[tikv] |               | not(isnull(test2.t2.a))                                                  |
| │   └─TableFullScan_26       | 10000.00 | cop[tikv] | table:t2      | keep order:false, stats:pseudo                                           |
| └─TableReader_25(Probe)      | 9980.01  | root      |               | data:Selection_24                                                        |
|   └─Selection_24             | 9980.01  | cop[tikv] |               | not(isnull(test2.t1.a)), not(isnull(test2.t1.b))                         |
|     └─TableFullScan_23       | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                                           |
+------------------------------+----------+-----------+---------------+--------------------------------------------------------------------------+
```

[If the inner side is a `MaxOneRow`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L143) and its child can assure there will be one row at most, which means the `MaxOneRow` is unneeded, we can remove the `MaxOneRow`.

Example:
```sql
CREATE TABLE t1(a INT UNIQUE NOT NULL, b INT);
CREATE TABLE t2(a INT, b INT);
EXPLAIN SELECT t2.a, (SELECT t1.a FROM t1 WHERE t1.a = t2.a) FROM t2;
```
```
+-----------------------------+----------+-----------+----------------------+-----------------------------------------------------+
| id                          | estRows  | task      | access object        | operator info                                       |
+-----------------------------+----------+-----------+----------------------+-----------------------------------------------------+
| HashJoin_19                 | 12500.00 | root      |                      | left outer join, equal:[eq(test2.t2.a, test2.t1.a)] |
| ├─IndexReader_26(Build)     | 10000.00 | root      |                      | index:IndexFullScan_25                              |
| │ └─IndexFullScan_25        | 10000.00 | cop[tikv] | table:t1, index:a(a) | keep order:false, stats:pseudo                      |
| └─TableReader_22(Probe)     | 10000.00 | root      |                      | data:TableFullScan_21                               |
|   └─TableFullScan_21        | 10000.00 | cop[tikv] | table:t2             | keep order:false, stats:pseudo                      |
+-----------------------------+----------+-----------+----------------------+-----------------------------------------------------+
```

[If the inner side is a `Projection`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L149), we can move the calculation in the `Projection` into the `Apply` and add a new `Projection` above `Apply` if needed.

[If the inner side is an `Aggregation`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L168), it will be more complicated to decorrelate it. To assure correctness, there are many requirements. For example, the output schema of the outer side must be unique, the join type must be `InnerJoin` or `LeftOuterJoin`, there cannot be any join conditions in the `Apply`, and so on. We can pull up the `Aggregation` only when all of them are met. During pulling up, we cannot directly move the `Aggregation` to above the `Apply`. To assure correctness, its `GroupByItems` should also be set to the unique key of the outer side, and the join type of the `Apply` should also be set to `LeftOuterJoin`.

Example:
```sql
CREATE TABLE t1(a INT UNIQUE NOT NULL, b INT);
CREATE TABLE t2(a INT, b INT);
EXPLAIN SELECT a, (SELECT sum(t2.b) FROM t2 WHERE t2.a = t1.a) FROM t1;
```
```
+----------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------+
| id                               | estRows  | task      | access object        | operator info                                                                              |
+----------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------+
| HashAgg_11                       | 8000.00  | root      |                      | group by:Column#13, funcs:firstrow(Column#11)->test2.t1.a, funcs:sum(Column#12)->Column#10 |
| └─Projection_22                  | 12487.50 | root      |                      | test2.t1.a, cast(test2.t2.b, decimal(32,0) BINARY)->Column#12, test2.t1.a                  |
|   └─HashJoin_13                  | 12487.50 | root      |                      | left outer join, equal:[eq(test2.t1.a, test2.t2.a)]                                        |
|     ├─TableReader_21(Build)      | 9990.00  | root      |                      | data:Selection_20                                                                          |
|     │ └─Selection_20             | 9990.00  | cop[tikv] |                      | not(isnull(test2.t2.a))                                                                    |
|     │   └─TableFullScan_19       | 10000.00 | cop[tikv] | table:t2             | keep order:false, stats:pseudo                                                             |
|     └─IndexReader_18(Probe)      | 10000.00 | root      |                      | index:IndexFullScan_17                                                                     |
|       └─IndexFullScan_17         | 10000.00 | cop[tikv] | table:t1, index:a(a) | keep order:false, stats:pseudo                                                             |
+----------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------+
```

There is one more case we can decorrelate when we fail to decorrelate `Apply` with an `Aggregation` in the inner side directly. That's [when the inner side is an `Aggregation`, and the `Aggregation`'s child operator is a `Selection`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L228). Here we try to pull up the equal conditions in the `Selection` to above `Aggregation`, then change it to a join condition of the `Apply`. To assure correctness, correlated columns of the pulled-up conditions should also be added into `LogicalAggregation.GroupByItems`. Note that we'll do this transformation only if the `Apply` is guaranteed can be changed to a `Join`. Otherwise, we'll keep the plan tree unchanged.

Example:
```sql
CREATE TABLE t1(a INT, b INT);
CREATE TABLE t2(a INT, b INT);
EXPLAIN SELECT a, (SELECT sum(t2.b) FROM t2 WHERE t2.a = t1.a) FROM t1;
```
```
+----------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
| id                               | estRows  | task      | access object | operator info                                                                                |
+----------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
| HashJoin_11                      | 10000.00 | root      |               | left outer join, equal:[eq(test2.t1.a, test2.t2.a)]                                          |
| ├─HashAgg_20(Build)              | 7992.00  | root      |               | group by:test2.t2.a, funcs:sum(Column#11)->Column#10, funcs:firstrow(test2.t2.a)->test2.t2.a |
| │ └─TableReader_21               | 7992.00  | root      |               | data:HashAgg_15                                                                              |
| │   └─HashAgg_15                 | 7992.00  | cop[tikv] |               | group by:test2.t2.a, funcs:sum(test2.t2.b)->Column#11                                        |
| │     └─Selection_19             | 9990.00  | cop[tikv] |               | not(isnull(test2.t2.a))                                                                      |
| │       └─TableFullScan_18       | 10000.00 | cop[tikv] | table:t2      | keep order:false, stats:pseudo                                                               |
| └─TableReader_14(Probe)          | 10000.00 | root      |               | data:TableFullScan_13                                                                        |
|   └─TableFullScan_13             | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                                                               |
+----------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
```

This rule will keep trying to decorrelate an `Apply` until it can't be decorrelated anymore. [If there are no correlated columns in its inner side now](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_decorrelate.go#L127), it is converted to a `Join`.

### Aggregation Elimination

This rule finds `Aggregation`s and tries to remove useless `Aggregation` operator or useless `DISTINCT` of aggregate functions.

A `DISTINCT` of an aggregate function is useless when the argument of the aggregate function is a unique column. In this case, we can set the `AggFuncDesc.HasDistinct` to `false` directly. 

Example:
```sql
CREATE TABLE t(a INT, b INT UNIQUE);
EXPLAIN SELECT count(distinct b) FROM t;
```
```
+----------------------------+----------+-----------+---------------------+----------------------------------+
| id                         | estRows  | task      | access object       | operator info                    |
+----------------------------+----------+-----------+---------------------+----------------------------------+
| StreamAgg_20               | 1.00     | root      |                     | funcs:count(Column#6)->Column#4  |
| └─IndexReader_21           | 1.00     | root      |                     | index:StreamAgg_8                |
|   └─StreamAgg_8            | 1.00     | cop[tikv] |                     | funcs:count(test2.t.b)->Column#6 |
|     └─IndexFullScan_19     | 10000.00 | cop[tikv] | table:t, index:b(b) | keep order:false, stats:pseudo   |
+----------------------------+----------+-----------+---------------------+----------------------------------+
```

This part is implemented in [`(*aggregationEliminateChecker).tryToEliminateDistinct()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_elimination.go#L73).

An `Aggregation` is useless if its `GroupByItems` are unique column(s). In this case, we can remove this `Aggregation`. But we still need a `Projection` in the same place. Because for most aggregate function, its arguments and result have different types and we need a `Projection` to keep their types correct. And we also need to rewrite some expressions to correctly handle `NULL` values.

Example:
```sql
CREATE TABLE t(a INT, b INT UNIQUE NOT NULL);
EXPLAIN SELECT count(a), sum(a), max(a) FROM t GROUP BY b;
```
```
+-------------------------+----------+-----------+---------------+---------------------------------------------------------------------------------------------------+
| id                      | estRows  | task      | access object | operator info                                                                                     |
+-------------------------+----------+-----------+---------------+---------------------------------------------------------------------------------------------------+
| Projection_5            | 10000.00 | root      |               | if(isnull(test2.t.a), 0, 1)->Column#4, cast(test2.t.a, decimal(32,0) BINARY)->Column#5, test2.t.a |
| └─TableReader_7         | 10000.00 | root      |               | data:TableFullScan_6                                                                              |
|   └─TableFullScan_6     | 10000.00 | cop[tikv] | table:t       | keep order:false, stats:pseudo                                                                    |
+-------------------------+----------+-----------+---------------+---------------------------------------------------------------------------------------------------+

```

This part is implemented in [`(*aggregationEliminateChecker).tryToEliminateAggregation()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_elimination.go#L40).

### Projection Elimination

Projection elimination finds `Projection` and try to remove useless `Projection`s. The main logic is in [`(*projectionEliminator).eliminate(p LogicalPlan, replace map[string]*expression.Column, canEliminate bool)`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_eliminate_projection.go#L153).

Generally, there are two cases we can optimize. First, if there are two `Projection`s in a row, we can merge them into one `Projection`. Second, if all expressions of a `Projection` are `Column`, which means there are no extra calculations, we can remove this `Projection`.

Note that for the second case, not all `Projection` can be eliminated. For example, the `Projection` at the top of the plan tree or below `UnionAll` can't be removed. This is indicated by the `canEliminate` parameter.

### Max/Min Elimination

Max/Min elimination finds `Aggregation` with `max()` or `min()` aggregate function. It doesn't actually "eliminate" the `Aggregation`. It adds `Limit` and `Sort` to get the same effect of `max()` and `min()`, but the `Aggregagation` is remained to assure correctness.

Example:
```sql
CREATE TABLE t(a int, b int UNIQUE NOT NULL);
EXPLAIN SELECT MAX(a) FROM t;
```
```
+--------------------------------+----------+-----------+---------------+-----------------------------------+
| id                             | estRows  | task      | access object | operator info                     |
+--------------------------------+----------+-----------+---------------+-----------------------------------+
| StreamAgg_10                   | 1.00     | root      |               | funcs:max(test2.t.a)->Column#4    |
| └─TopN_11                      | 1.00     | root      |               | test2.t.a:desc, offset:0, count:1 |
|   └─TableReader_19             | 1.00     | root      |               | data:TopN_18                      |
|     └─TopN_18                  | 1.00     | cop[tikv] |               | test2.t.a:desc, offset:0, count:1 |
|       └─Selection_17           | 9990.00  | cop[tikv] |               | not(isnull(test2.t.a))            |
|         └─TableFullScan_16     | 10000.00 | cop[tikv] | table:t       | keep order:false, stats:pseudo    |
+--------------------------------+----------+-----------+---------------+-----------------------------------+
```
```sql
EXPLAIN SELECT MIN(a) FROM t;
```
```
+--------------------------------+----------+-----------+---------------+--------------------------------+
| id                             | estRows  | task      | access object | operator info                  |
+--------------------------------+----------+-----------+---------------+--------------------------------+
| StreamAgg_10                   | 1.00     | root      |               | funcs:min(test2.t.a)->Column#4 |
| └─TopN_11                      | 1.00     | root      |               | test2.t.a, offset:0, count:1   |
|   └─TableReader_19             | 1.00     | root      |               | data:TopN_18                   |
|     └─TopN_18                  | 1.00     | cop[tikv] |               | test2.t.a, offset:0, count:1   |
|       └─Selection_17           | 9990.00  | cop[tikv] |               | not(isnull(test2.t.a))         |
|         └─TableFullScan_16     | 10000.00 | cop[tikv] | table:t       | keep order:false, stats:pseudo |
+--------------------------------+----------+-----------+---------------+--------------------------------+
```

This change enables TiDB to make use of indexes, which are ordered by certain column(s). In the optimal case, we only need to scan one row in TiKV.

This optimization will become a little more complicated when there are more than one `max()` or `min()` function. In this case, we will compose a plan tree for every `max()` or `min()` function, then put them together with a `Join`. Note that we'll only do this when we can make sure every `max()` or `min()` function can benefit from index. This is checked in [`(*maxMinEliminator).splitAggFuncAndCheckIndices()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_max_min_eliminate.go#L135).

Example:
```sql
CREATE TABLE t(a int, b int, INDEX ia(a), INDEX ib(b));
EXPLAIN SELECT MAX(a), MIN(b) FROM t;
```
```
+----------------------------------+---------+-----------+----------------------+-------------------------------------+
| id                               | estRows | task      | access object        | operator info                       |
+----------------------------------+---------+-----------+----------------------+-------------------------------------+
| HashJoin_18                      | 1.00    | root      |                      | CARTESIAN inner join                |
| ├─StreamAgg_34(Build)            | 1.00    | root      |                      | funcs:min(test2.t.b)->Column#5      |
| │ └─Limit_38                     | 1.00    | root      |                      | offset:0, count:1                   |
| │   └─IndexReader_45             | 1.00    | root      |                      | index:Limit_44                      |
| │     └─Limit_44                 | 1.00    | cop[tikv] |                      | offset:0, count:1                   |
| │       └─IndexFullScan_43       | 1.00    | cop[tikv] | table:t, index:ib(b) | keep order:true, stats:pseudo       |
| └─StreamAgg_21(Probe)            | 1.00    | root      |                      | funcs:max(test2.t.a)->Column#4      |
|   └─Limit_25                     | 1.00    | root      |                      | offset:0, count:1                   |
|     └─IndexReader_32             | 1.00    | root      |                      | index:Limit_31                      |
|       └─Limit_31                 | 1.00    | cop[tikv] |                      | offset:0, count:1                   |
|         └─IndexFullScan_30       | 1.00    | cop[tikv] | table:t, index:ia(a) | keep order:true, desc, stats:pseudo |
+----------------------------------+---------+-----------+----------------------+-------------------------------------+
```

### Predicate Pushdown

This is a very fundamental and important optimization. It traverses the plan tree from top to bottom, collects predicates (filter conditions), and tries to push them down as deep as possible.

The main logic is in the `PredicatePushDown([]expression.Expression) ([]expression.Expression, LogicalPlan)` method of `LogicalPlan` interface. The parament is the pushed-down predicates. The return values are predicates that can't be pushed down anymore and the child operator after pushing down predicates.

The predicates mainly come from `Selection`. The predicates can be pushed across some operators, like `Projection` and `UnionAll`. For some operators, we can only push down predicates when some requirements are met. For example, we can only push predicates across `Window` if all `Column`s in the predicates are `Window`'s `PartitionBy` columns. For some operators, we can't push predicates across them, like `Limit`. 

In the optimal case, the predicates reach `DataSource` and can be pushed down to the storage layer in the physical optimization stage.

`Join` is a special case in this rule. We not only push down predicates for `Join`, but we also make some other optimizations here. They are implemented in [`(*LogicalJoin).PredicatePushDown`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_predicate_push_down.go#L132). Two of them are important and explained as follows.

First, we will try to "simplify" outer joins, which means convert outer joins to inner joins. As we know, outer join is different from inner join because we will pad `NULL`s for unmatched rows from the outer side. If the predicates are guaranteed to filter such rows, this join makes no difference from an inner join. In this case, we can directly change it to an inner join.

Example:
```sql
CREATE TABLE t(a int, b int);
CREATE TABLE t1(a int, b int);
EXPLAIN SELECT * FROM t LEFT JOIN t1 ON t.a = t1.a WHERE t1.a IS NOT NULL;
```
```
+------------------------------+----------+-----------+---------------+-----------------------------------------------+
| id                           | estRows  | task      | access object | operator info                                 |
+------------------------------+----------+-----------+---------------+-----------------------------------------------+
| HashJoin_8                   | 12487.50 | root      |               | inner join, equal:[eq(test2.t.a, test2.t1.a)] |
| ├─TableReader_15(Build)      | 9990.00  | root      |               | data:Selection_14                             |
| │ └─Selection_14             | 9990.00  | cop[tikv] |               | not(isnull(test2.t1.a))                       |
| │   └─TableFullScan_13       | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                |
| └─TableReader_12(Probe)      | 9990.00  | root      |               | data:Selection_11                             |
|   └─Selection_11             | 9990.00  | cop[tikv] |               | not(isnull(test2.t.a))                        |
|     └─TableFullScan_10       | 10000.00 | cop[tikv] | table:t       | keep order:false, stats:pseudo                |
+------------------------------+----------+-----------+---------------+-----------------------------------------------+
```

Second, we will also try to derive some extra conditions from the existing predicates or try to add `NOT NULL` when possible. This enables us to push more predicates down.

Example:
```sql
EXPLAIN SELECT * FROM t1 JOIN t ON t1.b = t.b WHERE (t1.a=1 AND t.a=1) OR (t1.a=2 AND t.a=2);
```
```
+---------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| id                              | estRows  | task      | access object        | operator info                                                                                                                                                                                                            |
+---------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| IndexJoin_13                    | 24.98    | root      |                      | inner join, inner:IndexLookUp_12, outer key:test2.t1.b, inner key:test2.t2.b, equal cond:eq(test2.t1.b, test2.t2.b), other cond:or(and(eq(test2.t1.a, 1), eq(test2.t2.a, 1)), and(eq(test2.t1.a, 2), eq(test2.t2.a, 2))) |
| ├─TableReader_27(Build)         | 19.98    | root      |                      | data:Selection_26                                                                                                                                                                                                        |
| │ └─Selection_26                | 19.98    | cop[tikv] |                      | not(isnull(test2.t1.b)), or(eq(test2.t1.a, 1), eq(test2.t1.a, 2))                                                                                                                                                        |
| │   └─TableFullScan_25          | 10000.00 | cop[tikv] | table:t1             | keep order:false, stats:pseudo                                                                                                                                                                                           |
| └─IndexLookUp_12(Probe)         | 1.00     | root      |                      |                                                                                                                                                                                                                          |
|   ├─IndexRangeScan_9(Build)     | 1.00     | cop[tikv] | table:t2, index:b(b) | range: decided by [eq(test2.t2.b, test2.t1.b)], keep order:false, stats:pseudo                                                                                                                                           |
|   └─Selection_11(Probe)         | 1.00     | cop[tikv] |                      | or(eq(test2.t2.a, 1), eq(test2.t2.a, 2))                                                                                                                                                                                 |
|     └─TableRowIDScan_10         | 1.00     | cop[tikv] | table:t2             | keep order:false, stats:pseudo                                                                                                                                                                                           |
+---------------------------------+----------+-----------+----------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
```

### Outer Join Elimination

This rule finds and tries to eliminate `Join`. Specifically, it removes the `Join` and its inner side sub-plan tree.

We can do this only when the operators above `Join` only need columns from their outer side. But this is not enough. We also need at least one of the following requirements to be met:

1. The join keys from the inner side are unique. This means the `LogicalJoin` has no effects on the rows from the outer side;
2. Duplicated rows from the output of `Join` have no effect on the calculation results. Specifically, this is when there's a `Aggregation` above the `Join` and the aggregation functions in it have `DISTINCT` or are `max()`, `min()`, `firstrow()` or `approx_count_distinct()`.

Example:
```sql
CREATE TABLE t1(a INT, b INT);
CREATE TABLE t2(a INT, b INT UNIQUE NOT NULL);
EXPLAIN SELECT t1.a, t1.b FROM t1 LEFT JOIN t2 on t1.b = t2.b;
```
```
+-----------------------+----------+-----------+---------------+--------------------------------+
| id                    | estRows  | task      | access object | operator info                  |
+-----------------------+----------+-----------+---------------+--------------------------------+
| TableReader_7         | 10000.00 | root      |               | data:TableFullScan_6           |
| └─TableFullScan_6     | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo |
+-----------------------+----------+-----------+---------------+--------------------------------+
```
```sql
EXPLAIN SELECT count(distinct t1.a), max(t1.b) FROM t1 LEFT JOIN t2 on t1.b = t2.b;
```
```
+--------------------------+----------+-----------+---------------+-----------------------------------------------------------------------------+
| id                       | estRows  | task      | access object | operator info                                                               |
+--------------------------+----------+-----------+---------------+-----------------------------------------------------------------------------+
| StreamAgg_8              | 1.00     | root      |               | funcs:count(distinct test2.t1.a)->Column#7, funcs:max(test2.t1.b)->Column#8 |
| └─TableReader_12         | 10000.00 | root      |               | data:TableFullScan_11                                                       |
|   └─TableFullScan_11     | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                                              |
+--------------------------+----------+-----------+---------------+-----------------------------------------------------------------------------+
```

### Partition Pruning

This rule finds `DataSource` containing a partitioned table. For each partition, there will be a separated `DataSource`, and they will be composed together by a special `PartitionUnionAll` operator. This rule is responsible for this work, and during this process, it will try to prune unneeded partitions according to the pushed-down filter conditions.

The rationale of this rule is rather simple, but there are different kinds of partition types and the pushed-down conditions can be very complicated. So the implementation details of this rule are also complicated. Some descriptions of these details can be found in the [official docs](https://docs.pingcap.com/tidb/dev/partitioned-table#partition-pruning).

Note that there is a feature called [dynamic pruning](https://docs.pingcap.com/tidb/dev/partitioned-table#dynamic-pruning-mode). As of this section is written, it is an experimental feature and is not enabled by default. In this mode, we no longer build a `DataSource` for every partition. Accessing partitions is done in one operator, and the partition pruning work is done at the execution stage. So this rule is not needed in this mode.

### Aggregation Pushdown

This rule finds `LogicalAggregation` and tries to push it down. Currently, we can push it across `Join`, `Projection`, `UnionAll`, and `PartitionUnionAll`. Note that pushdown here doesn't mean "move this operator below other operators". There should be one `Aggregation` remained in the original position and another `Aggregation` pushed down to assure correctness.

[Pushing `Aggregation` across `Join`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_push_down.go#L405) is the most complicated case of them. The aggregate functions are separated into left and right sides and we try to push them to the left and right side of `Join` respectively. There are many requirements to make this transformation. For example, the join type should be among `InnerJoin`, `LeftOuterJoin` and `RightOuterJoin`. Only specific types of aggregate functions can be pushed down. And when we try to push aggregate functions down to one side of the `Join`, there can't be `count()` and `sum()` functions in the other side. If all requirements are met, we can generate and push down `Aggregation`. The new `Aggregation` is also transformed and different from the original `Aggregation`. For example, the columns in the join conditions should be added into `GroupByItems`.

Example:
```sql
CREATE TABLE t1(a int, b int);
CREATE TABLE t2(a int, b int);
set @@tidb_opt_agg_push_down=1;
explain select max(t1.b), min(t2.b) from t1 left join t2 on t1.a = t2.a;
```
```
+------------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
| id                                 | estRows  | task      | access object | operator info                                                                                |
+------------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
| HashAgg_9                          | 1.00     | root      |               | funcs:max(Column#10)->Column#7, funcs:min(Column#9)->Column#8                                |
| └─HashJoin_10                      | 8000.00  | root      |               | left outer join, equal:[eq(test2.t1.a, test2.t2.a)]                                          |
|   ├─HashAgg_25(Build)              | 7992.00  | root      |               | group by:test2.t2.a, funcs:min(Column#13)->Column#9, funcs:firstrow(test2.t2.a)->test2.t2.a  |
|   │ └─TableReader_26               | 7992.00  | root      |               | data:HashAgg_20                                                                              |
|   │   └─HashAgg_20                 | 7992.00  | cop[tikv] |               | group by:test2.t2.a, funcs:min(test2.t2.b)->Column#13                                        |
|   │     └─Selection_24             | 9990.00  | cop[tikv] |               | not(isnull(test2.t2.a))                                                                      |
|   │       └─TableFullScan_23       | 10000.00 | cop[tikv] | table:t2      | keep order:false, stats:pseudo                                                               |
|   └─HashAgg_16(Probe)              | 8000.00  | root      |               | group by:test2.t1.a, funcs:max(Column#11)->Column#10, funcs:firstrow(test2.t1.a)->test2.t1.a |
|     └─TableReader_17               | 8000.00  | root      |               | data:HashAgg_12                                                                              |
|       └─HashAgg_12                 | 8000.00  | cop[tikv] |               | group by:test2.t1.a, funcs:max(test2.t1.b)->Column#11                                        |
|         └─TableFullScan_15         | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                                                               |
+------------------------------------+----------+-----------+---------------+----------------------------------------------------------------------------------------------+
```

[Pushing `Aggregation` across `Projection`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_push_down.go#L436) is rather simple. It directly moves the calculation in the `Projection` into `Aggregation`. Then the `Projection` can be removed. And there will be only one `Aggregation`.

[Pushing `Aggregation` across `UnionAll` and `PartitionUnionAll`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_aggregation_push_down.go#L475-L485) share the same logic. It's similar to the `LogicalJoin` case. There will be some checks. If all requirements are met. We can generate and push down a new `LogicalAggregation` across `UnionAll` or `PartitionUnionAll`. Note that the original `Aggregation` may also be modified here.

Example:
```sql
CREATE TABLE t1(a int, b int);
CREATE TABLE t2(a int, b int);
set @@tidb_opt_agg_push_down=1;
explain select count(a) from (select * from t1 union all select * from t2);
```
```
+----------------------------------+----------+-----------+----------------------+------------------------------------+
| id                               | estRows  | task      | access object        | operator info                      |
+----------------------------------+----------+-----------+----------------------+------------------------------------+
| HashAgg_14                       | 1.00     | root      |                      | funcs:count(Column#10)->Column#9   |
| └─Union_15                       | 2.00     | root      |                      |                                    |
|   ├─StreamAgg_31                 | 1.00     | root      |                      | funcs:count(Column#12)->Column#10  |
|   │ └─IndexReader_32             | 1.00     | root      |                      | index:StreamAgg_19                 |
|   │   └─StreamAgg_19             | 1.00     | cop[tikv] |                      | funcs:count(test2.t1.a)->Column#12 |
|   │     └─IndexFullScan_30       | 10000.00 | cop[tikv] | table:t1, index:a(a) | keep order:false, stats:pseudo     |
|   └─StreamAgg_48                 | 1.00     | root      |                      | funcs:count(Column#14)->Column#10  |
|     └─TableReader_49             | 1.00     | root      |                      | data:StreamAgg_40                  |
|       └─StreamAgg_40             | 1.00     | cop[tikv] |                      | funcs:count(test2.t2.a)->Column#14 |
|         └─TableFullScan_47       | 10000.00 | cop[tikv] | table:t2             | keep order:false, stats:pseudo     |
+----------------------------------+----------+-----------+----------------------+------------------------------------+
```

### TopN Pushdown

`TopN` is an operator not directly respond to any syntax in the SQL. Its semantic is equal to a `Limit` above a `Sort`. We can execute it more efficiently when they are together, so we create a new operator for this case.

```go
type LogicalTopN struct {
	baseLogicalPlan

	ByItems    []*util.ByItems
	Offset     uint64
	Count      uint64
	limitHints limitHintInfo
}

type LogicalLimit struct {
	logicalSchemaProducer

	Offset     uint64
	Count      uint64
	limitHints limitHintInfo
}

type LogicalSort struct {
	baseLogicalPlan

	ByItems []*util.ByItems
}
```

This rule is mainly implemented by the `pushDownTopN(topN *LogicalTopN) LogicalPlan` method of the `LogicalPlan` interface. Like the predicate push down, it traverses the plan tree from top to bottom and collects `TopN` information from operators.

[When it meets a `Limit`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_topn_push_down.go#L87), the `Limit` itself is converted into a `TopN` and pushed down. This is where the `TopN` operator appears for the first time in a plan tree.

For most kinds of operators, the pushed-down `TopN` just can't be pushed down anymore, and it becomes a `TopN` operator above this operator.

There are several cases we can optimize:

[When it meets a `Sort`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_topn_push_down.go#L72), it is merged into `ByItems` of the pushed-down `TopN`. If the `TopN` already has `ByItems`, this `Sort` becomes useless and can be removed directly.

[When it meets a `Projection`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_topn_push_down.go#L112), the `TopN` can be directly pushed down across it.

When it meets a [`UnionAll`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_topn_push_down.go#L95) or [`Join`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_topn_push_down.go#L168). The `TopN` can be pushed down. Like in the aggregation push down, we put one `TopN` above and push down another one across the operator. The pushed-down one should be modified. Its `Offset` should be added into `Count` and set to 0. Also note that for `Join`, we can only push down for outer joins and only push down across the outer side.

Example:
```sql
CREATE TABLE t1(a INT, b INT);
CREATE TABLE t2(a INT, b INT);
EXPLAIN SELECT * FROM t1 LEFT JOIN t2 ON t1.a = t2.a ORDER BY t1.b LIMIT 20, 10;
```
```
+----------------------------------+----------+-----------+---------------+-----------------------------------------------------+
| id                               | estRows  | task      | access object | operator info                                       |
+----------------------------------+----------+-----------+---------------+-----------------------------------------------------+
| TopN_12                          | 10.00    | root      |               | test2.t1.b, offset:20, count:10                     |
| └─HashJoin_18                    | 37.50    | root      |               | left outer join, equal:[eq(test2.t1.a, test2.t2.a)] |
|   ├─TopN_19(Build)               | 30.00    | root      |               | test2.t1.b, offset:0, count:30                      |
|   │ └─TableReader_26             | 30.00    | root      |               | data:TopN_25                                        |
|   │   └─TopN_25                  | 30.00    | cop[tikv] |               | test2.t1.b, offset:0, count:30                      |
|   │     └─TableFullScan_24       | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo                      |
|   └─TableReader_29(Probe)        | 9990.00  | root      |               | data:Selection_28                                   |
|     └─Selection_28               | 9990.00  | cop[tikv] |               | not(isnull(test2.t2.a))                             |
|       └─TableFullScan_27         | 10000.00 | cop[tikv] | table:t2      | keep order:false, stats:pseudo                      |
+----------------------------------+----------+-----------+---------------+-----------------------------------------------------+
```
```sql
EXPLAIN SELECT * FROM (select * from t1 union all select * from t2) ORDER BY b LIMIT 20, 10;
```
```
+----------------------------------+----------+-----------+---------------+--------------------------------+
| id                               | estRows  | task      | access object | operator info                  |
+----------------------------------+----------+-----------+---------------+--------------------------------+
| TopN_17                          | 10.00    | root      |               | Column#8, offset:20, count:10  |
| └─Union_22                       | 60.00    | root      |               |                                |
|   ├─TopN_24                      | 30.00    | root      |               | test2.t1.b, offset:0, count:30 |
|   │ └─TableReader_31             | 30.00    | root      |               | data:TopN_30                   |
|   │   └─TopN_30                  | 30.00    | cop[tikv] |               | test2.t1.b, offset:0, count:30 |
|   │     └─TableFullScan_29       | 10000.00 | cop[tikv] | table:t1      | keep order:false, stats:pseudo |
|   └─TopN_33                      | 30.00    | root      |               | test2.t2.b, offset:0, count:30 |
|     └─TableReader_40             | 30.00    | root      |               | data:TopN_39                   |
|       └─TopN_39                  | 30.00    | cop[tikv] |               | test2.t2.b, offset:0, count:30 |
|         └─TableFullScan_38       | 10000.00 | cop[tikv] | table:t2      | keep order:false, stats:pseudo |
+----------------------------------+----------+-----------+---------------+--------------------------------+
```

### Join Reorder

Join reorder tries to find the most efficient order to join several tables together. In fact, it's not a rule-based optimization. It makes use of statistics to estimate row counts of join results. We put join reorder in this stage out of convenience.

Currently, we have implemented two join reorder algorithms: greedy and dynamic programming. The dynamic programming one is not mature enough now and is disabled by default. We focus on the greedy algorithm here.

There are three files relevant to join reorder. `rule_join_reorder.go` contains the entry and common logic of join reorder. `rule_join_reorder_dp.go` contains the dynamic programming algorithm. `rule_join_reorder_greedy.go` contains the greedy algorithm.

At the beginning of join reorder, we extract "join groups" from the plan tree. A join group is some sub-trees connected together by inner `Join`s directly, which means there can't exist any other kind of operator between inner `Join`s. The join reorder algorithm optimizes one join group at a time. And join groups are optimized from bottom to top.

For every node in a join group, the row count is estimated. The join result row count is estimated using the simple and classic [`leftRowCount * rightRowCount / max(leftNDV, rightNDV)`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/stats.go#L1084) formula. Then two of them, which can get the minimum cost (calculated in [`(*baseSingleGroupJoinOrderSolver).baseNodeCumCost()`](https://github.com/pingcap/tidb/blob/94e30df8e2d8ba2a1a26f153f40067ba3acd78eb/planner/core/rule_join_reorder.go#L135)), are chosen, connected by an inner join, then added into the join group. This process is repeated until all nodes in the join group are joined together.

### Build Key Information

This one is actually not an optimization rule. It collects information from bottom to top that is needed by other optimizations. Two kinds of information are collected and set up for each operator.

The first information is the unique key. This is collected in `DataSource` from table schema information and stored as `KeyInfo` in the `Schema` for each operator. There is one thing tricky about the unique key: when you declare `UNIQUE` for one column when creating a table, there can be duplicated `NULL`s in this column actually. You should declare `UNIQUE NOT NULL` to get "true" uniqueness.

The second is the `MaxOneRow` attribute, which means if this operator is guaranteed to output no more than one row.

## Ending

Currently, our rule-based optimization is a batch of rules executed in a fixed order. This is not enough to make some optimizations when the query is complicated. So we usually do more things than what the name of a rule implies. As stated above, we specially optimize `Join`s in predicate pushdown. Except for that, we also try to eliminate aggregations in aggregation pushdown and build key information for the newly generated `Aggregation`s. There are more examples like that.

Some optimization rules are also not guaranteed to produce a better plan like decorrelation and aggregation push down. In theory, the physical distribution of data should be considered when making such optimizations. However, we don't have such a fine-grained strategy for these rules. Now we mainly rely on heuristics and variables that control the behaviors.

As this section is written, TiDB doesn't record transformation steps in rule-based optimization and doesn't support printing logical plans. But usually, the transformation steps are reliably reproducible given query and table schema. So the most effective method to learn about it in depth or investigate a bug is to place breakpoints in `logicalOptimize()` and see the runtime information using debug tools.
