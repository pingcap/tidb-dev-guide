# Memory Management Mechanism

TiDB's memory management basically consists of a memory usage quota settings for each query, and two interfaces, called `Tracker` and `OOMAction`.

## Tracker

`Tracker` tracks the memory usage of each element with a tree structure.

Genral use cases:

```text
                                               /--- Tracker(Component in Executor, e.g. list/rowContainer/worker)
                                               |           ...
                    /--- Tracker(Executor1) ---+--- Tracker(Component)
                    |
Tracker(Session) ---+--- Tracker(Executor2)
      |             |         ...
      |             \--- Tracker(Executor3)
 OOM-Action1
      |
      |
 OOM-Action2
     ...
```

When a component allocates some memory, we can call the function `Tracker.Consume(bytes)` to tell `Tracker` how much memory it uses. `Tracker.Comsume` will call recursively, accumulate memory usage and trigger OOM-Action when exceeded.

## OOM-Action

`OOM-Action` is a series of actions grouped in a linked list to reduce memory usage. Each node on the linked list abstracts a strategy to be used when the memory usage of a SQL exceeds the memory quota. For example, we define the spill to disk strategy as `SpillDiskAction`, rate limit strategy as `rateLimitAction` and cancel strategy as `PanicOnExceed`.

### Rate Limit

TiDB supports dynamic memory control for the operator that reads data. By default, this operator uses the maximum number of threads that `tidb_disql_scan_concurrency` allows to read data. When the memory usage of a single SQL execution exceeds `tidb_mem_quota_query` each time, the operator that reads data stops one thread.

We use `rateLimitAction` to dynamically control the data reading speed of `TableReader`.

### Spill Disk

TiDB supports disk spill for execution operators. When the memory usage of a SQL execution exceeds the memory quota, tidb-server can spill the intermediate data of execution operators to the disk to relieve memory pressure. Operators supporting disk spill include Sort, MergeJoin, HashJoin, and HashAgg.

#### SpillDiskAction

We use `SpillDiskAction` to control the spill disk of `HashJoin` and `MergeJoin`. The data will be placed in Chunk unit when spilling. We can get any data in Chunk through random I/O.

#### SortAndSpillDiskAction

We use `SortAndSpillDiskAction` to control the spill disk of `Sort`.

If the input of `SortExec` is small, then it sorts in memory. If the input is large, the `SortAndSpillDiskAction` will be triggered, and an external sort algorithm will be used. We can split the input into multiple partitions and perform a merge sort on them.

External sorting algorithms generally have two stages, sort and merge. In the sort stage, chunks of data small enough to fit in main memory are read, sorted, and written out to a temporary file. In the merge stage, the sorted subfiles are combined, and the final result will be outputted.

#### AggSpillDiskAction

We use `AggSpillDiskAction` to control the spill disk of `HashAgg`. When `AggSpillDiskAction` is triggered, it will switch HashAgg executor to spill-mode, and the memory usage of HashAgg won't grow.

We use the following algorithm to control the memory increasing:

1. When the memory usage is higher than the `mem-quota-query`, switch the HashAgg executor to spill-mode.
2. When HashAgg is in spill-mode, keep the tuple in the hash map no longer growing.
  a. If the processing key exists in the Map, aggregate the result.
  b. If the processing key doesn't exist in the Map, spill the data to disk.
3. After all data have been processed, output the aggregate result in the map, clear the map. Then read the spilling data from disk, repeat the Step1-Step3 until all data gets aggregated.

As we can see, unlike other spilling implementations, `AggSpillDiskAction` does not make the memory drop immediately, but keeps the memory no longer growing. 

### Log/Cancel

When the above methods cannot control the memory within the threshold, we will try to use `PanicOnExceed` to cancel the SQL or use `LogOnExceed` to log the SQL info.