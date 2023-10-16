# Implementation of Typical Operators

This section will introduce the implementation details of 3 typical TiDB operators: HashJoin, HashAgg and Sort

### Sort

Sort operator is used to arrange the result set of a query in a specific order. In TiDB the operator implement sort is [`SortExec`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L36). `SortExec` implement three basic interface of `Executor`

* [Open](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L89) initialize the operator, setup memory tracker and disk tracker
* [Next](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L112) each call of `Next` will return a chunk of data, return an empty chunk means the execution is done for current executor
* [Close](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L65) is responsible for release all the resource hold by the executor

The basic idea in `SortExec` is the read all the data from its child executor, then sort the whole data set. 

In `Next`, it calls [`fetchRowChunks`](https://github.com/pingcap/tidb/blob/v7.4.0/executor/sort.go#L179)  to read all the data from its child executor. `fetchRowChunks` tries to save all the data in one [`SortedRowContainer`](https://github.com/pingcap/tidb/blob/master/pkg/util/chunk/row_container.go#L487), the memory usage could be very high, in order to control the memory usage, `SortExec` also support spill to disk. The details of spill to disk is hidden inside `SortedRowContainer`, each time when insert a chunk into current `SortedRowContainer` returns `ErrCannotAddBecauseSorted`, it means current `SortedRowContainer` is spilled, `SortExec` will generate a new `SortedRowContainer` and insert the chunk to the new one. When there is no data from its child executor, `SortExec`  will [sort](https://github.com/pingcap/tidb/blob/master/pkg/executor/sort.go#L241) current `SortedRowContainer`.

After `fetchRowChunks` finishes, `Next` will begin to generate sorted results, depends weather spill to disk is triggered or not, there is two ways to generate the final sorted results

* Spill is not triggered: this is the simple case, when spill is not triggered, since the whole `SortedRowContainer` is sorted at the end of `fetchRowChunks`, in `Next`, it just calls [`GetSortedRowAndAlwaysAppendToChunk`](https://github.com/pingcap/tidb/blob/master/pkg/executor/sort.go#L133) to retrieve the sorted data from `SortedRowContainer`
* Spill is triggered: when spill is triggered, each round of spill will generate an independent `SortedRowContainer`, and will be saved in [`partitionList`](https://github.com/pingcap/tidb/blob/master/pkg/executor/sort.go#L55), in `Next`, it use [external multi way merge sort](https://github.com/pingcap/tidb/blob/master/pkg/executor/sort.go#L143) to merge all the partial sorted data stream into one final sorted data stream. 

### HashAgg

HashAgg operator uses hash table to perform grouping and aggregation. In TiDB the operator implement hash aggregation is []()
