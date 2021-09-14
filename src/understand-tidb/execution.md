# Execution

The `executor` package contains most of the codes related to execution. The input of the executor is a plan tree of the query returned from the planner, and the output of the executor is the result of the query.

## Execution Framework

TiDB builds the computing engine based on the distributed storage provided by TiKV. The TiKV server implements a coprocessor framework to support distributed computing. The computing operations will be pushed to the TiKV coprocessor as far as possible to accelerate the computation speed. That is to say, a sub-plan of the SQL execution plan will be executed in parallel on different TiKV servers, and the result of each sub-plan will be collected to a TiDB server to compute for the final result. 

The processing model of the execution plan tree is known as the Volcano iterator model. The essential of the Volcano model is abstracted to 3 interfaces: `Open`, `Next`, and `Close`. All operators offer the same interfaces and the implementation is opaque.

`Open` will be invoked in turn for each operator to init the needed resources before computing. Conversely, `Close` will release the resources. To obtain the query output, the final operator in the plan tree will keep invoking `Next` until no tuple is pulled from its child.

It's easy to understand how the Volcano model works for single-process execution. For parallism issues, the Volcano introduces an operator called `exchange` at any desired point in a plan tree. Further explanation about the parallism-related issues would be introduced in the [execution-framework.md](execution-framework.md) section.

## Vectorized Execution

Like the Volcano iteration model, vectorization uses pull-based (root-to-leaf traversal) iteration where each operator has a `next` method that produces result tuples. However, each `next` call fetches a block of tuples instead of just one tuple. The main principle of vectorized execution is batched execution on a columnar data representation:  every “work” primitive function that manipulates data does not work on a single data item, but on a vector (an array) of such data items that represents multiple tuples. The idea behind vectorized execution is to amortize the iterator call overhead by performing as much as possible inside the data manipulation methods. For example, this work can be to hash 1000s of values, compare 1000s of string pairs, update a 1000 aggregates, or fetch a 1000 values from 1000s of addresses.

Columnar Different from the row-oriented data representation, columnar format organize data by column rather by row. By storing data in columns rather than rows, the database can more precisely access the data it needs to answer a query rather than scanning and discarding unwanted data in rows. The memory columnar data representation in TiDB is defined as `Chunk`, which is inspired by [Apache Arrow](https://arrow.apache.org/).  The detailed definition and usage of `Chunk` will be introduced in the [implementation-of-vectorized-execution.md](implementation-of-vectorized-execution.md) section.

## Memory Management Machanism

In TiDB, we set a memory usage quota for a query, and introduce two interfaces called `Tracker` and `OOMAction` for memory management.

The `Tracker` is used to track the memory usage of each element. The `OOMAction` is used to abstract the strategies to be used when the memory usage of a SQL exceeds the memory quota.

For example, we define the spill to disk strategy as `DiskSpillAction`. `DiskSpillAction` might be triggered by `HashJoin` or `Sort` when the memory quota is exceeded. If a query requires an order guarantee, and there is no index to guarantee the order, then the execution must sort the input before proceeding. If the input is small then the sort occurs in memory. We can split the input into multiple partitions and perform a merge sort on them. If the input is large, the `DiskSpillAction` will be triggered, an external sort algorithm is used. External sorting algorithms generally fall into two ways, sorting and merge. In the sorting phase, chunks of data small enough to fit in main memory are read, sorted, and written out to a temporary file. In the merge phase, the sorted subfiles are combined, and the final result will be outputted.

For more details, you can refers to the [Memory Management Mechanism](memory-management-mechanism.md) section.

## Typical Operators

TiDB implements multiple algorithms for the Join, Aggregation, Sort operators, and so on. We'll take some of them for detailed introduction. Readers who are interested can refer to the [implementation-of-typical-operators.md](implementation-of-typical-operators.md).