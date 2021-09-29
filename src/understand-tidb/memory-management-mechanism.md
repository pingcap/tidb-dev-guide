# Memory Management Mechanism
In TiDB, we set a memory usage quota for a query, and introduce two interfaces called `Tracker` and `OOMAction` for memory management.

## Tracker

The `Tracker` is used to track the memory usage of each element. `Tracker` uses a tree structure to track memory usage.

```golang
// Genral use cases:
//
//                                                   /--- Tracker(Component in Executor, e.g. list/rowContainer/worker)
//                                                   |           ...
//                        /--- Tracker(Executor1) ---+--- Tracker(Component)
//                        |
//    Tracker(Session) ---+--- Tracker(Executor2)
//          |             |         ...
//          |             \--- Tracker(Executor3)
//     OOM-Action1
//          |
//          |
//     OOM-Action2
//         ...
```

When a component allocates some memory, we can call the function `Tracker.Consume(bytes)` to tell `Tracker` how much memory it uses. `Tracker.Comsume` will call recursively, accumulate memory usage and trigger OOM-Action when exceeded.

## OOM-Action

`OOM-Action` is a series of actions linked by a linked list to reduce memory usage. Each node on the linked list abstracts a strategy to be used when the memory usage of a SQL exceeds the memory quota. For example, we define the spill to disk strategy as `SpillDiskAction`, rate limit strategy as `rateLimitAction` and cancel strategy as `PanicOnExceed`.

### Rate Limit

TiDB supports dynamic memory control for the operator that reads data. By default, this operator uses the maximum number of threads that `tidb_disql_scan_concurrency` allows to read data. When the memory usage of a single SQL execution exceeds `tidb_mem_quota_query` each time, the operator that reads data stops one thread.
In implementation, we use `rateLimitAction` to dynamically control the data reading speed of `TableReader`.

### Spill Disk

TiDB supports disk spill for execution operators. When the memory usage of a SQL execution exceeds the memory quota, tidb-server can spill the intermediate data of execution operators to the disk to relieve memory pressure. Operators supporting disk spill include Sort, MergeJoin, HashJoin, and HashAgg.

#### SpillDiskAction

In implementation, we use `SpillDiskAction` to control the spill disk of `HashJoin` and `MergeJoin`. The data will be placed in Chunk unit when spilling. We can get any data in Chunk through random I/O.

#### SortAndSpillDiskAction

In implementation, we use `SortAndSpillDiskAction` to control the spill disk of `Sort`.
If the input of `SortExec` is small then the sort occurs in memory. If the input is large, the `SortAndSpillDiskAction` will be triggered, an external sort algorithm is used. We can split the input into multiple partitions and perform a merge sort on them. External sorting algorithms generally fall into two ways, sorting and merge. In the sorting phase, chunks of data small enough to fit in main memory are read, sorted, and written out to a temporary file. In the merge phase, the sorted subfiles are combined, and the final result will be outputted.

#### AggSpillDiskAction

In implementation, we use `AggSpillDiskAction` to control the spill disk of `HashAgg`. When `AggSpillDiskAction` is triggered, it will switch HashAgg executor to spill-mode, and the memory usage of HashAgg will not grow.

We use the following algorithm to control the memory increasing:
1. When the memory usage is higher than the mem-quota, switch the HashAgg executor to spill-mode.
2. When HashAgg is in spill-mode, keep the tuple in the hashMap no longer growing.
  a. If the processing key exists in the Map, aggregate the result.
  b. If the processing key doesn't exist in the Map, spill the data to disk.
3. After all data have been processed, output the aggregate result in the Map, clear the Map. Then read the spilling data from disk, repeat the Step1-Step3 until all data have been aggregated.

As we can see, unlike other spilling implementations, `AggSpillDiskAction` does not make the memory drop immediately, but keeps the memory no longer growing. 

### Log/Cancel

When the above methods cannot control the memory within the threshold, we will try to use `PanicOnExceed` to cancel the SQL or use `LogOnExceed` to log the SQL info.