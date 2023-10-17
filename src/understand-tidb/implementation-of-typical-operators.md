# Implementation of Typical Operators

This section will introduce the implementation details of 3 typical TiDB operators: HashJoin, HashAgg and Sort

### Sort

Sort operator is used to arrange the result set of a query in a specific order. In TiDB the operator implement sort is [`SortExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L36). `SortExec` implement three basic interface of `Executor`

* [Open](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L89) initialize the operator, setup memory tracker and disk tracker
* [Next](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L112) each call of `Next` will return a chunk of data, return an empty chunk means the execution is done for current executor
* [Close](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L65) is responsible for release all the resource hold by the executor

The basic idea in `SortExec` is the read all the data from its child executor, then sort the whole data set. 

In `Next`, it calls [`fetchRowChunks`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L179)  to read all the data from its child executor. `fetchRowChunks` tries to save all the data in one [`SortedRowContainer`](https://github.com/pingcap/tidb/blob/v7.4.0/util/chunk/row_container.go#L460), the memory usage could be very high, in order to control the memory usage, `SortExec` also support spill to disk. The details of spill to disk is hidden inside `SortedRowContainer`, each time when insert a chunk into current `SortedRowContainer` returns `ErrCannotAddBecauseSorted`, it means current `SortedRowContainer` is spilled, `SortExec` will generate a new `SortedRowContainer` and insert the chunk to the new one. When there is no data from its child executor, `SortExec`  will [sort](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L241) current `SortedRowContainer`.

After `fetchRowChunks` finishes, `Next` will begin to generate sorted results, depends weather spill to disk is triggered or not, there is two ways to generate the final sorted results

* Spill is not triggered: this is the simple case, when spill is not triggered, since the whole `SortedRowContainer` is sorted at the end of `fetchRowChunks`, in `Next`, it just calls [`GetSortedRowAndAlwaysAppendToChunk`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L133) to retrieve the sorted data from `SortedRowContainer`
* Spill is triggered: when spill is triggered, each round of spill will generate an independent `SortedRowContainer`, and will be saved in [`partitionList`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L55), in `Next`, it use [external multi way merge sort](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L143) to merge all the partial sorted data stream into one final sorted data stream. 

### HashAgg

`HashAgg` operator uses hash table to perform grouping and aggregation. In TiDB the operator implement hash aggregation is [`HashAggExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L91).  `HashAggExec` implement three basic interface of `Executor`

* [Open](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L201) initialize the operator, setup memory tracker and disk tracker, setup other meta info for aggregation
* [Next](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L112) each call of `Next` will return a chunk of data, return an empty chunk means the execution is done for current executor
* [Close](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L65) is responsible for release all the resource hold by the executor

`HashAgg` has two execution mode: parallel execution and un-parallel execution. During build stage, the planner is responsible to decide the execution mode for a `HashAgg`, a `HashAgg` will be in un-parallel execution mode if one of these conditions is true

* The aggregation function contains `distinct`
* The aggregation function contains `order by`(in `GROUP_CONCAT`)
* User explicitly set both `tidb_hashagg_final_concurrency` and `tidb_hashagg_partial_concurrency` to 1

#### Un-parallel execution

Un-parallel execution mode executes aggregation in one thread/goroutine, [`unparallelExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L493) is the core function for un-parallel execution. In `unparallelExec`, it first read all the data from its child executor, aggregate the data using [execute](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L548), after `execute` is done, `unparallelExec` begin to generate result by traverse all the group by key, and generate one row for each key by [AppendFinalResult2Chunk](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L505)

#### Parallel execution

Parallel execution mode executes aggregation using multiple threads/goroutines, it divides the aggregation into two stage

* Partial stage: each threads aggregate part of the input data into partial results
* Final stage: each threads aggregate partial results into final results

The parallel execution flow is as the following graph shows

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

There are 3 types of threads to read data and execute the aggregation

* [`fetchChildData`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L343): the concurrency of `fetchChildData` is 1, it reads data from the child executor, and put it into `inputCh` as the input of each partial worker
* [`HashAggPartialWorker`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_partial_worker.go#L38): the concurrency of `HashAggPartialWorker` is `hashAggPartialConcurrency`, it reads input data and executes partial aggregation on the data, generates partial result and send it to final worker
* [`HashAggFinalWorker`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_final_worker.go#L40): the concurrency of `HashAggFinalWorker` is `hashAggFinalConcurrency`, it reads partial results and generate final results and send it to `finalOutputCh`

Like `Sort`, `HashAgg` is also a memory intensive operator. When `HashAgg` is running in un-parallel execution mode, it also support spill to disk(spill to disk in parallel execution mode is under [development](https://github.com/pingcap/tidb/issues/46631)). Unlike `Sort`, which will spill all data into disk, in current implementation,  the main idea in `HashAgg` spill is that once a `HashAgg` is marked to spill, for all the subsequent input, if the group by key of a row is already in current hash map, then this row will be inserted into the hash map, otherwise, this row will be spilled to the disk. The details of `HashAgg` spill can be found [here](https://github.com/pingcap/tidb/blob/v7.4.0/executor/aggregate/agg_hash_executor.go#L587). 

### HashJoin

