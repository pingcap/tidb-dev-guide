# Implementation of Vectorized Execution
This section introduces the implementation details of the TiDB vectorized execution model.
## Understanding Vectorized Execution
Vectorized execution, also known as batch processing, is a method of processing data in batches, rather than row by row. Traditional row-based processing handles one row at a time, which can lead to significant overhead and reduced efficiency, especially when dealing with large datasets. Vectorized execution, on the other hand, processes data in chunks or vectors, allowing for better utilization of CPU and memory resources.
## Key Benefits of Vectorized Execution
1. **Improved CPU Utilization**: Processing data in batches minimizes the overhead associated with instruction fetching and decoding, leading to better CPU utilization and improved performance.
2. **Reduced Memory Access**: Data processed in vectors is more likely to be present in the CPU cache, reducing the need for memory access, which is often a performance bottleneck.
3. **Reduced Branching**: Traditional row-based processing often involves conditional statements and branching, which can hinder performance. Vectorized execution minimizes branching, leading to more predictable and faster execution.
## Implementing Vectorized Execution in TiDB
TiDB leverages a memory layout similar to Apache Arrow to enable the execution of a batch of data at a time. This approach allows for efficient data processing, reducing overhead and improving performance.
### Columnar Memory Layout Implementation in TiDB
In TiDB, the columnar memory layout is defined as a `Column`, and a batch of these `Columns` is referred to as a `Chunk`. The implementation of `Column` draws inspiration from Apache Arrow, ensuring efficient data processing. Depending on the data type they store, TiDB employs two types of `Columns`:
- **Column with Fixed Length**: These Columns store data of a fixed length, such as Double, Bigint, Decimal, and similar data types. This structure is optimized for predictable and consistent data sizes, facilitating efficient processing.
- **Column with Variable Length**: These Columns accommodate variable-length data types, including Char, Varchar, and others. Variable-length data types can hold a range of character lengths, and the Column structure adapts to handle such variability.
In TiDB, the Column and Chunk types are defined as follows:
``` go
type Column struct {
    length     int      // the number of elements in the column
    nullBitmap []byte   // bitmap indicating null values
    offsets    []int64  // used for varLen column; row i starts from data[offsets[i]]
    data       []byte   // the actual data
    elemBuf    []byte   // used to indicate the byte length of each element for fixed-length objects
    // ... (additional fields)
}

type Chunk struct {
    columns  []*Column
    sel      []int      // sel indicates which rows are selected. If it is nil, all rows are selected.
    capacity int        // capacity indicates the maximum number of rows this chunk can hold.
    // ... (additional fields)
}
```

### Column and Chunk Data Manipulation
TiDB supports various data manipulation operations on `Column` and `Chunk`:

**Appending a Fixed-Length Non-NULL Value to a Column**:
- To append an element, a specific `append` method tailored to the data type is called (e.g., [AppendInt64](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/column.go#L246-L248)).
- The data to be appended is shallow copied to the `elemBuf` using an `unsafe.Pointer`.
- The data in `elemBuf` is then appended to the `data`.
- A `1` is appended to the `nullBitmap`.

**Appending a Non-Fixed-Length Non-NULL Value to a Column**:
- To append a variable-length data value, such as a string, it is directly appended to the `data`.
- A `1` is appended to the `nullBitmap`.
- The starting point of the newly appended data in the `data` is recorded in the `offsets`.

**Appending a NULL Value to a Column**:
- To append a NULL value, [AppendNull](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/column.go#L229-L237) function is used.
- A `0` is appended to the `nullBitmap`.
- If it's a fixed-length column, a placeholder data of the same size as `elemBuf` is appended to the `data`.
- If it's a variable-length column, no data is appended to the `data`, but the starting point of the next element is recorded in the `offsets`.

**Appending a NULL Value to a Column**:
- To append a NULL value, the [AppendNull](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/column.go#L229-L237) function is used.
- A `0` is appended to the `nullBitmap`.
- If it's a fixed-length column, a placeholder data of the same size as `elemBuf` is appended to the `data`.
- If it's a variable-length column, no data is appended to the `data`, but the starting point of the next element is recorded in the `offsets`.

**Reading a Value from a Column**:
- Values in a `Column` can be read using functions like [GetInt64(rowIdx)](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/column.go#L551-L553) and [GetString(rowIdx)](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/column.go#L576-L578). The reading principle can be deduced from the earlier-described appending mechanism. Here, we retrieve the specified element in the `Column` based on the rowID. The details of reading from a `Column` are consistent with the principles discussed for appending.

**Reading a Row from a Chunk**:
- Within a `Chunk`, the concept of a [Row](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/row.go#L25-L28) is logical. The data for a row is stored across different `Columns` in the `Chunk`. The data for the same row in various columns is not necessarily stored consecutively in memory. When obtaining a `Row` object, there is no need to perform data copying, as the data for the same row is already stored in the corresponding `Columns`.
- The concept of a `Row` is useful because, during the operation of operators, data is often accessed and processed on a per-row basis. For example, operations like aggregation, sorting, and similar tasks work with data at the row level.
- You can retrieve a row from a `Chunk` using the [GetRow(rowIdx)](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/chunk.go#L356-L368) function. Once you have a `Row` object, you can further access the data in specific columns within that row using functions like [Row::GetInt64(colIdx)](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/row.go#L51-L53), which allows you to retrieve the data corresponding to the specified column index for that row.

### Examples
#### How expression is evaluated
In this section, we’ll use the TiDB expression `colA * 0.8 + colB` to demonstrate how expression evaluation works using vectorized execution and to highlight the performance gap between row-based execution and vectorized execution.

**Expression Tree Representation**
The TiDB expression `colA * 0.8 + colB` is parsed into an expression evaluation tree, where each non-leaf node represents an arithmetic operator, and the leaf nodes represent the data source. Each non-leaf node can be either a constant (like `0.8`) or a field (like `colA`) in the table. The parent-child relationship between nodes indicates a computationally dependent relationship: the evaluation result of the child node is the input data for the parent node.

```
                             ┌─┐
                         ┌───┤+├───┐
                         │   └─┘   │
                        ┌┴┐       ┌┴┐
  colA*0.8+colB───►  ┌──┤*├───┐   │B│
                     │  └─┘   │   └─┘
                    ┌┴┐     ┌─┴─┐
                    │A│     │0.8│
                    └─┘     └───┘
```
**Non-Vectorized Execution**

In a non-vectorized execution model, the computing logic of each node can be abstracted using the following evaluation interface:
```
type Node interface {
    evalReal(row Row) (val float64, isNull bool)
}
```
Taking `*`, `0.8`, and `col` nodes as examples, all three nodes implement the interface above. Their pseudocode is as follows:
```
func (node *multiplyRealNode) evalReal(row Row) (float64, bool) {
    v1, null1 := node.leftChild.evalReal(row)
    v2, null2 := node.rightChild.evalReal(row)
    return v1 * v2, null1 || null2
}

func (node *constantNode) evalReal(row Row) (float64, bool) {
    return node.someConstantValue, node.isNull  // 0.8 in this case
}

func (node *columnNode) evalReal(row Row) (float64, bool) {
    return row.GetReal(node.colIdx)
}
```

In non-vectorized execution, the expression is iterated over rows. Every time this function performs a multiplication, only a few instructions are actually involved in the "real" multiplication compared to the number of assembly instructions required to perform the function.

**Vectorized Execution**

In vectorized execution, the interface to evaluate an expression in a batch manner in TiDB looks like this:


```
type VecNode interface {
  vecEvalReal(input *Chunk, result *Column)
}
```
Taking `multiplyRealNode` as an example:
```
func (node *multiplyRealNode) vecEvalReal(input *Chunk, result *Column) {
  buf := pool.AllocColumnBuffer(TypeReal, input.NumRows())
  defer pool.ReleaseColumnBuffer(buf)
  node.leftChild.vecEvalReal(input, result)
  node.rightChild.vecEvalReal(input, buf)

  f64s1 := result.Float64s()
  f64s2 := buf.Float64s()
  result.MergeNulls(buf)
  for i := range i64s1 {
     if result.IsNull(i) {
        continue
     }
     i64s1[i] *= i64s2[i]
  }
}
```

This implementation reduces the interpretation overhead by batch processing, which is more beneficial for modern CPUs:

- A vector of data is sequentially accessed. This reduces CPU cache misses.
- Most of the computational work is within a simple loop. This facilitates CPU branch prediction and instruction pipelining.

We use the same dataset (1024 rows formed by two columns of floating-point numbers) to compute `colA * 0.8 + colB` in two ways: row-based execution and vectorized execution. The results are as follows:


```
BenchmarkVec-12           152166              7056 ns/op               0 B/op          0 allocs/op
BenchmarkRow-12            28944             38461 ns/op               0 B/op          0 allocs/op
```

The results above show vectorized execution is four times faster than row-based execution. 
For more details about the vectorized expression evaluation, you can refer to [this link](https://www.pingcap.com/blog/10x-performance-improvement-for-expression-evaluation-made-possible-by-vectorized-execution/).


#### How operators are evaluated
In this section, we'll dive deeper into the evaluation of operators with a focus on HashJoin as an example. 
HashJoin in vectorized execution consists of the following steps:

**Hashing Phase**

Let's consider the table to be used for constructing the hash table as 't'. The data involved in table 't' is read into `Chunk` in batches. First, the data in the Chunk is filtered by columns according to the predicates on table 't'. The filtered results for these columns are then combined into a `selected` array. In the `selected` array, true values indicate valid rows. You can find the relevant code in the [VectorizedFilter](https://github.com/pingcap/tidb/blob/fd3b2cc571a23ec5169ffe428a7b1232c8ccab96/pkg/executor/join.go#L1252) section.
Subsequently, the hash values for the remaining valid data in the Chunk are calculated column-wise, and these hash values are concatenated to form the final hash key if a row. You can refer to the code in [HashChunkSelected](https://github.com/pingcap/tidb/blob/fd3b2cc571a23ec5169ffe428a7b1232c8ccab96/pkg/executor/hash_table.go#L467) for further details.
Finally, the `selected` array is used for filtering, and the hash key for valid rows, along with their corresponding row pointers, is used to construct the hash table.

**Probe Phase**

The probe phase in HashJoin is similar to the build phase. Initially, data from the probe table is read into Chunk in batches. Predicates are applied to the Chunk to filter it by columns, and a `selected` array is created to identify valid rows. The hash keys are then computed for each of the valid rows in the Chunk.

Subsequently, for the valid rows in the Chunk, the hash value is used to perform lookups in the hash table constructed during the build phase. This lookup operation aims to find matching rows in the hash table based on the calculated hash values. You can refer to the code in [join2Chunk](https://github.com/pingcap/tidb/blob/fd3b2cc571a23ec5169ffe428a7b1232c8ccab96/pkg/executor/join.go#L987) for implementation details.

**Matching and Output**

When matching rows are found in the hash table, the results are output as joined rows and are stored in a new `Chunk`. You can refer to the code in [joinMatchedProbeSideRow2Chunk](https://github.com/pingcap/tidb/blob/fd3b2cc571a23ec5169ffe428a7b1232c8ccab96/pkg/executor/join.go#L925).

Vectorized computation in HashJoin offers significant advantages over row-based computation, primarily in terms of performance. Vectorized computation allows for batch processing of data, reducing instruction fetch and decode overhead, leading to better CPU utilization, reduced memory access, fewer conditional branches, and improved parallelism. These advantages make vectorized HashJoin significantly more efficient and performant when dealing with large datasets.

## Conlusion
In conclusion, TiDB's efficient data processing, inspired by the Apache Arrow memory layout with columns and chunks, offers a powerful tool for modern data professionals. Through vectorized execution, TiDB optimizes CPU utilization, reduces memory access overhead, and minimizes branching, resulting in significantly faster and more efficient query performance.
