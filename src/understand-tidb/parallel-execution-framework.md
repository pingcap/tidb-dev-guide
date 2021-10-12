# Parallel Execution Framework

In order to make full use of the multi-core ability of modern hardware, most popular DBMS have implemented the ability of parallel execution SQL execution engine.

There are three common parallel implementations: Intra operator parallelism, Exchange operator, and Morsel-Driven parallelism. And TiDB adopts the first approach.

## TiDB Implementation

In intra-operator parallelism, multiple goroutines will be created inside the operator for parallel processing. The creation, termination and synchronization of the goroutines are handled by the operator itself.

Most operators will create multiple goroutines in `Open()` or the first call of `Next()`. And they will wait on channels for input Chunk. Also, a special channel is responsible for notifying whether to stop the computation. And `WaitGroup` can be used to wait for the termination of all goroutines. This usually happens when `Close()` is called.

Taking HashJoin as an example, all workers will be started at the first call of `Next()`, including:

1. buildSideFetcher: Will call `buildSideExec.Next()` to fetch input Chunk.
2. builderWorker: Receive data from the buildSideFetcher and build the HashTable.
3. probeSideFetcher: Wait for the end of building of the HashTable and call `probeSideExec.Next()` to fetch input Chunk.
4. probeWorker: Receive data from the probeSideFetcher and then probe the HashTable.

When the main goroutine calls `HashJoinExec.Next()`, it will read data from the result channel and send an empty Chunk to the resource channel. When `HashJoinExec.Close()` is called, a special channel will be closed and all workers waiting on the channel will exit.

The parallel implementations of operators are various. For example, HashAgg is divided into two stages. Each stage will start multiple goroutines (partialWorkers and finalWorkers).

It is worth noting that we still use the traditional Volcano-model, the `Next()` is only called by a single thread. The parallelism only occurs in the internal processing of the operator.

The degree of parallelism (DOP) can be controlled by the session variable. For example, `tidb_executor_concurrency` is 5 by default. It means HashJoin will create five goroutines to probe HashTable. You can also control the parallelism of a specific operator by changing the session variable, such as `tidb_hash_join_concurrency`.

At present, most important operators have implemented intra-operator parallelism:

1. Join: HashJoin, IndexJoin, IndexHashJoin, IndexMergeJoin
2. Apply: ParallelApply
3. Aggregation: HashAgg
4. Other: Union, Projection
5. Reader: TableReader, IndexReader

Other operators are still single threaded: TopN, Limit, Sort, MergeJoin, StreamAgg, Selection, WindowFunc. But some of them (TopN, Limit, StreamAgg, Selection) can be pushed down to TiKV.

## Other Parallelism Implementation

Intra operator parallelism is the most intuitive way to implement parallelism, but its implementation is complex, because every operator needs to implement parallelism independently. What's worse, too many threads will increase the scheduling overhead. Although, the use of goroutines can alleviate this problem.

A more traditional way to implement parallelism is to use the exchange operator. By encapsulating the parallel logic into the exchange operator, all other operators only need to consider the single thread implementation.

The exchange operator is responsible for data exchange between different threads. The internal implementation of exchange is divided into two parts: sender and receiver. And data is transferred from sender to receiver in different ways, such as hash partition, random distribution or sort merge.

There are usually two ways to control DOP:

1. Users can use hints to specify DOP explicitly.
2. The optimizer can choose DOP according to the table size of the scan operation automatically.

This approach requires the optimizer to generate parallel plans. Generally, plan generation is divided into two stages. The first stage generates serial plans, and the second stage generates its corresponding parallel plans. The second stage is mainly responsible for inserting the exchange operator into the plan tree at the appropriate position. Both heuristic rules and cost model can be used to get the optimal parallel plan.

Currently, TiDB has a simplified implementation of exchange operator: `Shuffle Operator`. It can make MergeJoin, StreamAgg and WindowFunc run in parallel. And you can enable MergeJoin to be parallel by setting `tidb_merge_join_concurrency` be greater than 1.

For Morsel-Driven, it implements parallelism by dividing data into fixed size blocks (Morsel: usually 100000 rows). And a customized scheduler will be responsible for task scheduling to achieve better load balancing. And TiDB doesn't use this approach for now.
