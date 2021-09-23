# Execution Framework
In order to make full use of the multi-core ability of modern hardware, most popular DBMS have implemented the ability of parallel execution SQL execution engine.

There are three common parallel implementations:
1. Intra operator parallelism.
2. Exchange operator.
3. Morsel-Driven parallelism.

## Intra-operator Parallelism
In intra-operator parallelism, multiple goroutines will be created inside the operator for parallel processing. The creation, termination and synchronization of the goroutines are handled by the operator itself.
For example, in HashJoin, after the hashtable on the build side is built, multiple goroutines will lookup the hashtable at the same time to speed up the execution of HashJoin.
And the parallel implementation of each operator is different. Hashagg is divided into two stages. Each stage will start multiple goroutines.
It's still the traditional Volcano-model, and the `Next()` is still called by a single thread. The parallelism only occurs in the internal processing of the operator.

The degree of parallelism(DOP) can be controlled by the session variable. For example, in TiDB `tidb_executor_Concurrency` is 5 by default. it means HashJoin will create 5 goroutines to probe HashTable when it's opened.
You can also control the parallelism of a specific operator by setting the session variable, such as `tidb_hash_join_concurrency`.

## Exchange Operator
Intra operator parallelism is the most intuitive way to implement parallelism, but the implementation is more complex, because every operator needs to implement parallelism independently.
Moreover, too many threads will increase the scheduling overhead. However, the use of goroutines can alleviate this problem.

The most traditional way to implement parallelism is to use the exchange operator. By encapsulating the parallel logic into the exchange operator, all other operators only need to consider the single thread implementation.
The exchange operator is responsible for data exchange between different threads. The internal implementation of exchange is divided into two parts: sender and receiver.
And data is transferred from sender to receiver in different ways, such as hash partition, random distribution or sort merge.

There are usually two ways to control DOP:
1. Users can use hints to specify DOP explicitly.
2. The optimizer can choose DOP according to the table size of the scan operation automatically.

This approach requires the optimizer to generate parallel plans. Generally, the generation of plans is divided into two stages. The first stage generates serial plans, and the second stage generates its corresponding parallel plans. The second stage is mainly responsible for inserting the exchange operator into the plan tree at the appropriate position. Both heuristic rules and costs model can be used to get the optimal parallel plan

## Morsel-Driven Parallelism
The parallel implementation of HyPer adopts `Morsel-Driven`, which is introduced in the 2014 paper `Morsel-Driven Parallelism: A NUMA-Aware Query Evaluation Framework for the Many-Core Age`.

The parallel implementation does not depend on the exchange operator, and the specification of DOP and the generation of parallel plans no longer depend on the optimizer.
The input of each opeartor will be divided into fixed size data blocks(Morsel: 100000 rows in the original paper).
And task consists of pipeline(code) and a morsel(data), which are handed over to a specific physical thread to process.
Also task scheduling is no longer dependent on the operating system or any runtime(Golang runtime), but is controlled by the database kernel itself.

Compared with exchange parallelism, the advantages of morsel driven parallelism are:
1. Better load balancing: In the data skew scenario, we may got straggler threads in the exchange framework, which will slow down the execution of the whole query. Morsel driven makes the load of each worker more balanced by using work stealing, which is implemented in the customized task scheduler.
3. Custom scheduling logic: In the exchange framework, the scheduling of threads is handled by the operating system, and the underlying operating system cannot perceive the execution priority of different queries. In morsel driven, pipeline + morsel will be encapsulated as a task, placed on the central scheduler and executed by each worker, so you can explicitly control the scheduling logic and set different scheduling strategies to prevent the performance of small queries be affected by large queries.
4. NUMA awareness: In Morsel-Driven Parallelism, each operator will only process the data inside its own socket. The data transfer between sockets will be handled carefully in specific point, such as using lock-free HashTable.

## TiDB implementation
TiDB currently adopts the first approach. Some operators, such as HashJoin and HashAgg, have multiple channels for communication, which makes the implementation more complicated.
Some other operators(such as TopN, Limit, Selection) don't implement parallelism explicitly, but they can be pushed down to TiKV.
And there are still some operators in TiDB that are neither pushed down to TiKV nor parallelized explicitly, such as Sort/MergeJoin/WindowFunction, which can be solved by introducing the Exchange operator.
