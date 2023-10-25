# Implementation of Vectorized Execution
This section introduces the implementation details of the TiDB vectorized execution model. 
## Understanding Vectorized Execution
Vectorized execution, also known as batch processing, is a method of processing data in batches, rather than row by row. Traditional row-based processing handles one row at a time, which can lead to significant overhead and reduced efficiency, especially when dealing with large datasets. Vectorized execution, on the other hand, processes data in chunks or vectors, which allows for better utilization of CPU and memory resources.
## Key Benefits of Vectorized Execution
1. **Improved CPU Utilization**: Processing data in batches minimizes the overhead associated with instruction fetchin and decoding, leading to better CPU utilization and improved performance.
2. **Reduced Memory Access**: Data processed in vectors is more likely to be present in the CPU cache, reducing the need for memory access, which is often a performance bottleneck.
3. **Reduced Branching**: Traditional row-based processing often involves conditional statements and branching, which can hinder performance. Vectorized execution minimizes branching, leading to more predictable and faster execution.
## Implementing Vectirized Execution in TiDB
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

### Example: How to execute `select a+1, b-10 from t where a%2=0` using vectorized execution
To execute the SQL query `SELECT a+1, b-10 FROM t WHERE a%2=0` using vectorized execution, we can follow a series of operations, including TableReader, Selection, and Projection. Let's break down the process step by step:

Suppose we have a table `t` with the following data:

```
+------+------+
|  a   |  b   |
+------+------+
|  1   |  10  |
|  2   |  20  |
|  3   |  30  |
|  4   |  40  |
+------+------+
```

1. **TableReader Operation**:
   - The TableReader reads the data from the table and [decodes](https://github.com/pingcap/tidb/blob/ecaa1c518cc9367844ebb5206f2e970461c8bf28/pkg/util/chunk/codec.go#L259-L270) it into a `Chunk`. The `Chunk` contains two columns, as shown below:
   
   ```
   | 1 | 10 |
   | 2 | 20 |
   | 3 | 30 |
   | 4 | 40 |
   ```

2. **Selection Operation**:
   - The Selection operation applies a condition to the data in the `Chunk`. In this case, the condition is `a%2=0`, which filters rows where the remainder of `a` divided by 2 is equal to 0. The Selection operation marks rows that do not satisfy the condition as invalid, but the length of the columns remains unchanged. The result looks like this:
   
   ```
   | N/A | N/A |
   | 2   | 20  |
   | N/A | N/A |
   | 4   | 40  |
   ```

3. **Projection Operation**:
   - The Projection operation calculates the expressions `a+1` and `b-10` on the valid rows. The invalid rows remain unchanged. The result of the projection is as follows:

   ```
   | N/A | N/A |
   | 3   | 10  |
   | N/A | N/A |
   | 5   | 30  |
   ```

4. **Output to Client**:
   - Finally, the valid rows are copied to a new `Chunk` to ensure memory continuity, and the result is returned to the client. The client receives the final result, which looks like this:

   ```
   | 3 | 10 |
   | 5 | 30 |
   ```

The SQL query is executed efficiently through vectorized operations, which allow for filtering, transformation, and projection of data in a batch-oriented manner, reducing the need for row-by-row processing.

## Conlusion
In conclusion, TiDB's efficient data processing, inspired by the Apache Arrow memory layout with columns and chunks, offers a powerful tool for modern data professionals. Through vectorized execution, TiDB optimizes CPU utilization, reduces memory access overhead, and minimizes branching, resulting in significantly faster and more efficient query performance.g
