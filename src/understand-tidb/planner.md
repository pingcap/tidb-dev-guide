# Planner

The `planner` package contains most of the codes related to SQL optimization. The input of the planner is an AST of the query returned from the parser, and the output of the planner is a plan tree that would be used for further execution.

## Package Structure

| Package                                                                                              | Description                                                                                                                          |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------|
| [tidb/planner/cascades](https://github.com/pingcap/tidb/tree/master/planner/cascades)                | The next generation Cascades model planner, which is under development and disabled by default                                       |
| [tidb/planner/core](https://github.com/pingcap/tidb/tree/master/planner/core)                        | The core logic of the currently used System R model planner. The Cascades model planner also calls utility functions in this package |                                                                    |
| [tidb/planner/implementation](https://github.com/pingcap/tidb/tree/master/planner/implementation)    | Physical implementations for the operators in Cascades planner                                                                       |
| [tidb/planner/memo](https://github.com/pingcap/tidb/tree/master/planner/memo)                        | Intermediate results for the searching procedure of Cascades planner                                                                 |
| [tidb/planner/property](https://github.com/pingcap/tidb/tree/master/planner/property)                | Properties about the output of operators, including schema, stats, order property, partition property, etc                           |
| [tidb/planner/util](https://github.com/pingcap/tidb/tree/master/planner/util)                        | Common utility functions / structures shared by the two planners                                                                     |

We can see that, TiDB has two planners, one is of System R model, which is defaultly used, and the other is of Cascades model, which is still under development. The unified entry function of planner module is `Optimize()`, before diving into either of the two planners, it would firstly check if there is any intervention for the planner from the "SQL Plan Management" module, if yes, the AST of the query would be modified before going through the optimization procedures. "SQL Plan Management" module is beyond the scope of this article, and it would be introduced in the [SQL Plan Management](sql-plan-management.md) section.

This article would only focus on introducing the System R planner, i.e, the `core` package, readers who are interested in the Cascacdes planner can refer to this [design](https://github.com/pingcap/tidb/tree/master/docs/design/2018-08-29-new-planner.md) doc.

## Optimization Procedures

Ignore the trivial steps, the query optimization procedures can be briefly divided into 4 phases:

1. build an initial logical plan
2. logically optimize the initial logical plan
3. physically optimize the logical plan
4. tidy up the physical plan

### Plan Building

The entry function of this phase is `PlanBuilder.Build()`, it would translate the input AST to a logical plan tree from bottom up according to the predefined rules / orders. Specifically, it would check each sub-clause of the query, and build a corresponding operator for the clause. The operators are connected as a DAG, which is known as a logical plan tree.

A key step in this phase is translating the expressions for each clause, e.g, `where a = 1` would have a `Selection` operator built correspondingly, and an expression `eq(a, 1)` would be translated and saved in the `Selection operator`. The expression translation logics are encapsulated in a structure `expressionRewriter` and its methods. The `expressionRewriter` would traverse and transalte the AST expressions recursively, and utilize a result stack for intermediate results.

`expressionRewriter` would not only do the simple expression transaltions, but would optimize subqueries in the expressions. The details of subquery optimization would not be explained here, because they are pretty complicated. Briefly speaking, for most of the uncorrelated subqueries, `expressionRewriter` would directly execute them and substitute them with the result constants. For correlated subqueries, or some of the uncorrelated subqueries, `expressionRewriter` would build a subtree from them and connect it with the main plan tree using a `LogicalJoin` or `LogicalApply` operator. Note that, `LogicalApply` is a special kind of join operator which can only be executed in a nested-loop approach. `LogicalApply` operator in some plan trees can be converted to a regular `LogicalJoin`, which can be executed in other more efficient join algorithms, and planner would do this conversion in the subsequent logical optimization phase if possible.

During the plan building process, optimization flags would be collected for each operator built. For example, if a `Selection` operator is built, then an optimization flag like `flagPredicatePushDown` would be set in the plan builder. These saved flags would be used later in the logical optimization phase.

### Logical Optimization

The entry function of this phase(also known as rule-based optimization) is `logicalOptimize()`. This function would do logically equivalent transformations for the initial plan tree according to relational algebra, and the result plan tree should be better than the initial one from the execution efficiency perspective in principle. Specifically, `logicalOptimize()` would traverse all the logical optimization rules predefined as `optRuleList` in order, and check if a rule is applicable by referring to the optimization flags saved during the plan building phase. If the flag is set for a rule, planner would traverse the plan tree from top down, and apply the transformations implied by the rule to the subtree satisfying the rule prerequisites.

An example logical optimization rule is "column pruning", for each operator in the plan tree, it would collect the columns needed by the upper operators, and prune the unneeded columns from the output. Another example rule is "decorrelation", it would try to pull up operators referring correlated columns, and resolve the column dependency, hence convert the `LogicalApply` operator to a regular `LogicalJoin`.

### Physical Optimization

The entry function of this phase(also known as cost-based optimization) is `physicalOptimize()`, it would do cost based enumeration for the implementations of each logical operator, and find a combination of all operators with the lowest cost as the final physical plan. Specifically, each logical operator would implement an interface function `exhaustPhysicalPlans()` to list all the possible physical algorithms, e.g, `LogicalAggregation` would have two possible implementations including `PhysicalStreamAggregation` and `PhysicalHashAggregation`. Each implementation may require specific properties for its child's output, e.g, `PhysicalStreamAggregation` would require that the child's output rows should be in order of the `GROUP BY` columns. These properties are recorded in `PhysicalProperty` structure, and passed down to the enumeration procedure of the child operators.

Once the planner knows the specific implementation of the plan tree, or of a subtree, it can compute a cost for this implementation. The cost of one implementation is calculated as a sum of its resource consumptions including CPU, Memory, Network, IO, etc. For each kind of resource specifically, the consumption is measured based on a unit factor(e.g, scanFactor is the unit factor for IO consumption, which means the cost of scanning 1 byte data on TiKV or TiFlash), and the estimated number of rows / bytes to be processed by this operator. Note that, these unit factors can be customized by setting system variables like `tidb_opt_xxx_factor` to fit clusters of different hardware configurations. Each implementation of the whole logical plan tree would have a cost then, planner would choose the one with the lowest cost for execution.

One thing worth mention is that, TiDB supports pushing some operators down to storage engine to speed up the query execution, e.g, we can push `Selection` operator down to the coprocessor of TiKV, and reduce the rows returned from TiKV to TiDB through the network. The logic about deciding whether to push operators down to storage engine or not is piggybacked on the search framework of the physical optimization. Specifically, it is achieved by introducing `TaskType` field into `PhysicalProperty`, for example, once the planner wants to push down a `Limit` operator to TiKV, it would enumerate an implementation `PhysicalLimit` which has `CopXXXTaskType` as the `TaskType` of the required `PhysicalProperty` for its child. Once the child of `PhysicalLimit` has generated a TiKV implementation, these two plan snippets would be concatenated in `attach2Task()` interface, hence achieving the operator pushdown for storage engine.

### Post Optimization

The entry function of this phase is `postOptimize()`. The query optimization has almost finished when coming here, this phase would not apply big changes to the plan, it would only do some clean and tidy up works. The jobs in this phase include a new round of projection elimination(the first round is applied in logical optimization), and projection injection to simplify the code implementations of executor package, and so on.

## Summary

This section talks about the brief steps of query optimization, and the corresponding entry functions for each step.
