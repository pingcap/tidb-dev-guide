# Implementation of Typical Operators

This section introduces the implementation details of three typical TiDB operators: Sort, HashAgg, and HashJoin.

Firstly, every operator should implement three basic interfaces of `Executor`:

- [Open](https://github.com/pingcap/tidb/blob/v7.4.0/executor/internal/exec/executor.go#L50) - Initializes the operator, sets up the memory tracker/disk tracker, and other meta-info for the current operator.
- [Next](https://github.com/pingcap/tidb/blob/v7.4.0/executor/internal/exec/executor.go#L51) - Each call to `Next` returns a chunk of data. Returning an empty chunk indicates that the execution is complete for the current executor. Note that `Next` is not thread-safe. It's by design that `Next` is not called concurrently for all operators.
- [Close](https://github.com/pingcap/tidb/blob/v7.4.0/executor/internal/exec/executor.go#L52) - Responsible for releasing all resources held by the executor.

### Sort

The Sort operator is used to arrange the result set of a query in a specific order. In TiDB, the operator implementing sort is [`SortExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L36). The fundamental concept behind `SortExec` is to read all the data from its child executor and then sort the entire data set.

In `Next`, it invokes [`fetchRowChunks`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L179) to read all the data from its child executor. `fetchRowChunks` aims to store all the data in one [`SortedRowContainer`](https://github.com/pingcap/tidb/blob/v7.4.0/util/chunk/row_container.go#L460). The memory usage grows as the input data volume increases. To manage the memory usage, `SortExec` has spill-to-disk support. The details of this spilling are encapsulated within `SortedRowContainer`. Every time the insertion of a chunk into the current `SortedRowContainer` returns `ErrCannotAddBecauseSorted`, it indicates that the current `SortedRowContainer` has been spilled. `SortExec` will then create a new `SortedRowContainer` and insert the chunk into this new container. Once there's no data coming from its child executor, `SortExec` will [sort](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L241) the current `SortedRowContainer`.

After `fetchRowChunks` completes, `Next` starts producing sorted results. Depending on whether a spill to disk was initiated, there are two methods to produce the final sorted outcomes:

* Spill not initiated: In this straightforward scenario, if there's no spill, since the entire `SortedRowContainer` gets sorted at the end of `fetchRowChunks`, during `Next`, it simply invokes [`GetSortedRowAndAlwaysAppendToChunk`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L133) to fetch the sorted data from `SortedRowContainer`.
* Spill initiated: When a spill occurs, each spilling round produces an independent `SortedRowContainer`, stored in [`partitionList`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L55). In `Next`, an [external multi-way merge sort](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L143) merges all partially sorted data streams into one final sorted data stream.

### HashAgg

The `HashAgg` operator uses a hash table to perform grouping and aggregation. In TiDB, the operator implementing hash aggregation is [`HashAggExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L91).

`HashAgg` has two execution modes: parallel and non-parallel execution. During the build stage, the planner is responsible for deciding the execution mode for a `HashAgg`. A `HashAgg` will operate in non-parallel execution mode if one of the following conditions is true:

* The aggregation function contains `distinct`.
* The aggregation function (`GROUP_CONCAT`) contains `order by`.
* The user explicitly sets both `hashAggPartialConcurrency` and `hashAggFinalConcurrency` to 1.

#### Non-parallel Execution

Non-parallel execution mode performs aggregation in a single thread. [`unparallelExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L493) is the core function for non-parallel execution. In `unparallelExec`, it first reads all the data from its child executor, then aggregates the data using [execute](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L548). After `execute` completes, `unparallelExec` starts to generate results by traversing all the group-by keys, generating one row for each key by calling [AppendFinalResult2Chunk](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L505) for each aggregation function.

#### Parallel Execution

Parallel execution mode performs aggregation using multiple threads, dividing the aggregation into two stages:

* Partial stage: each thread aggregates a portion of the input data into partial results.
* Final stage: each thread aggregates the partial results into final results.

The flow of parallel execution is illustrated in the following graph:

```
                            +-------------+
                            | Main Thread |
                            +------+------+
                                   ^
                                   |
                                   +
                              +-+-            +-+
                              | |    ......   | |  finalOutputCh
                              +++-            +-+
                               ^
                               |
                               +---------------+
                               |               |
                 +--------------+             +--------------+
                 | final worker |     ......  | final worker |
                 +------------+-+             +-+------------+
                              ^                 ^
                              |                 |
                             +-+  +-+  ......  +-+
                             | |  | |          | |
                             ...  ...          ...    partialOutputChs
                             | |  | |          | |
                             +++  +++          +++
                              ^    ^            ^
          +-+                 |    |            |
          | |        +--------o----+            |
 inputCh  +-+        |        +-----------------+---+
          | |        |                              |
          ...    +---+------------+            +----+-----------+
          | |    | partial worker |   ......   | partial worker |
          +++    +--------------+-+            +-+--------------+
           |                     ^                ^
           |                     |                |
      +----v---------+          +++ +-+          +++
      | data fetcher | +------> | | | |  ......  | |   partialInputChs
      +--------------+          +-+ +-+          +-+

```

There are three types of threads that read data and execute the aggregation:

* [`fetchChildData`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L343): This thread's concurrency level is set to 1. It reads data from the child executor and places it into `inputCh`, serving as the input for each partial worker.
* [`HashAggPartialWorker`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_partial_worker.go#L38): The concurrency of `HashAggPartialWorker` is determined by `hashAggPartialConcurrency`. This worker reads the input data, executes partial aggregation on the data, produces partial results, and sends them to the final worker.
* [`HashAggFinalWorker`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_final_worker.go#L40): The concurrency of `HashAggFinalWorker` is set by `hashAggFinalConcurrency`. This worker reads partial results, produces final results, and sends them to `finalOutputCh`.

Similar to `Sort`, `HashAgg` is also a memory-intensive operator. When `HashAgg` runs in non-parallel execution mode, it supports spill-to-disk functionality (spill-to-disk in parallel execution mode is currently [under development](https://github.com/pingcap/tidb/issues/46631)). Unlike `Sort`, which spills all data to disk, the `HashAgg` approach is different. In the current implementation, once a `HashAgg` is flagged for spilling, for all subsequent inputs, if the group-by key of a row already exists in the current hash map, the row will be inserted into the hash map. If not, the row gets spilled to disk. Detailed workings of the `HashAgg` spill can be explored [here](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L587).

### HashJoin

The `HashJoin` operator uses a hash table to perform the join operation. In TiDB, the operator that implements hash join is [`HashJoinExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L121).

`HashJoin` constructs the results in two distinct stages:

1. Fetch data from the build side child and build a hash table.
2. Fetch data from the probe side child and probe the hash table using multiple join workers.

#### Build stage

The [fetchAndBuildHashTable](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L1168) function orchestrates the build stage. Two threads are engaged in this work:

* [fetchBuildSideRows](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L1182) reads data from the build side child and funnels it into the `buildSideResultCh`.
* [buildHashTableForList](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L1193) retrieves input data from `buildSideResultCh` and subsequently constructs the hash table based on this input.

Detailed mechanics of building the hash table are encapsulated within the [`hashRowContainer`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/hash_table.go#L102). It's worth noting that, as of now, TiDB does not support the parallel building of hash tables.

#### Probe stage 

The [`fetchAndProbeHashTable`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L390) function executes the probe stage. This stage engages two types of threads:

* [`fetchProbeSideChunks`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L235) operates with a concurrency of 1. It reads data from the probe child and dispatches them to various probe workers.
* [`probeWorker`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L88) instances read data from `fetchProbeSideChunks` and probe concurrently. The concurrency level is determined by `ExecutorConcurrency`.

Each `probeWorker` holds a [`joiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L62) , `joiner` is the core data structure that implements different join semantics. Each kind of join should implements its own joiner. Currently, TiDB support the following joiners

* [`innerJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L959) used for inner join
* [`leftOuterJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L805) used for left outer join
* [`rightOuterJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L884) used for right outer join
* [`semiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L364) used for left outer join
* [`antiSemiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L497) used for anti semi join
* [`antiLeftOuterSemiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L720) used for anti left outer semi join
* [`leftOuterSemiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L566) used for left outer semi join
* [`nullAwareAntiSemiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L450) used for left outer join
* [`nullAwareAntiLeftOuterSemiJoiner`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L648) used for left outer join

`joiner` has 3 basic interfaces

* [`tryToMatchInners`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L75) for each of the row from probe side, try to match the rows from the build side, return true if matches, and also need to set `isNull` for `AntiSemiJoin/LeftOuterSemiJoin/AntiLeftOuterSemiJoin`
* [`tryToMatchOuters`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L80) only used in outer join when outer side is used to build hash table, for each of row from probe(inner) side, try to match the rows from the build(outer) side
* [`onMissMatch`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/joiner.go#L107) used for semi join family to handle the case that no rows are matched for the probe row.

In `probeWorker`, it reads data from the probe side, and for each probe row, tries to match the hash table and save the result into result chunk. For most of the case, it uses [`join2Chunk`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L977) to do the probe, and for outer join that uses outer side as the build side, it need use [`join2ChunkForOuterHashJoin`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/join.go#L1076) to do the probe.

Inside `join2Chunk/join2ChunkForOuterHashJoin`, for each probe row, the probe work contains three steps

* Before look up the hash table, use some quick tests to find if probe row will not match. An example is for inner join, if the join key contains null, it can skip probe hash table stage, since null never matches any value. For the rows that can not match, call `onMissMatch`
* Look up hash table, to find potential match rows from hash table
* If there is no potential match rows, call `onMissMatch`, otherwise, call `tryToMatch`
