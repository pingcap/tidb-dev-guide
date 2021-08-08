# TiDB Statistics

In the TiDB's SQL optimization phase, we will have the cases like which index of one table is most suitable one, whether a join operator should be a hash join, a index nested loop join or other join algorithm. Thus we need the statistics of the table to know its data distribution, guiding the TiDB choose the optimial execution plan.

In this article, we would first introduce the data structure that database could use then have a easy guide of TiDB's statistics.

## Statistics introduction

There're many data structures to show the distribution of the data. Here we introduce three kind of them: histogram, count-min sketch and top-n value(most frequnt values).

### Histogram

#### Introduction

Histogram splits the data into many buckets and uses some simple things to describing the bucket, such as how many records in in this bucket. It's widely used in many RDBMS to do the range estimation. We have two different type of histogram depending on the bucketing strategy: equal-depth histogram and equal-width histogram.

We choose the equal-depth histogram according to the paper [Accurate estimation of the number of tuples satisfying a condition](https://dl.acm.org/citation.cfm?id=602294). The equal-depth histogram has a better guarantee of the error rate compared in the worst cases, compared with the equal-width histogram. The so-called equal-depth histogram means that the number of values falling into each bucket is as equal as possible. For example, we want to split the given records set `1.6, 1.9, 1.9, 2.0, 2.4, 2.6, 2.7, 2.7, 2.8, 2.9, 3.4, 3.5` into 4 buckets. Then we would get the final result as `[1.6, 1.9], [2.0, 2.6], [2.7, 2.8], [2.9, 3.5]`, the depth of each bucket is 3, i.e. the number of records in each bucket is 3. The graph is shown as below.

![equal-depth histogram](/src/img/stats-histogram.png)

#### Constrcution

The construction will vary depending on whether we know the size of the complete dataset.

If we know the size, we can dicide the depth of the bucket. So we just iterating each value `v`:

- If `v` equals to the previous one, we just place it to the same bucket no matter the bucket is full or not. This can make sure that the same value is always in the same bucket.
- If not, we check whether the bucket is full or not. If not full, put it into the current bucket. Otherwise we put it to a new bucket.

If we don't know the size, we construct the histogram in the following way. We initialize the bucket depth to 1 for each bucket. And just inserting the data like before. Once the we meet the case that one bucket exceeds the needed depth, we double the depth of the bucket and combine two adjacent buckets into one bucket.

### Count-Min Sketch(Legacy in TiDB)

The Count-Min Sketch is a data structure that can handle equivalence queries, join size estimation, etc., and provides strong accuracy guarantees. Since its introduction in 2003 in the paper [An improved data stream summary: The count-min sketch and its applications](http://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf), it has gained widespread use due to its simplicity of creation and use.

Count-Min Sketch maintains an array of d*w counts, and for each value, maps it to a column in each row using d separate hash functions, and modifies the count value at those d positions. This is shown in the following figure.

![count-min sketch](/src/img/stats-cmsketch.png)

This way, when querying how many times a value appears, the d hash functions are still used to find the position mapped to in each row, and the minimum of these d values is used as the estimate.

### Top-N value(Most Frequent Value)

The count-min sketch would meet hash collision when the dataset grows. But the histogram is not very suitable for the equivalence queries. Thus we extracts the Top-N value(the most frequent value) of the dataset out of the histogram, to improve the accuracy of the equivalence queries. We will store the top-n item as `(value, cnt)`. For example, we have a dataset `1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 4, 4, 5, 6, 7`. When the top-n size is 1, we would store `[(1, 7)]` in the top-n and construct the hitogram using the remaining data `2, 2, 3, 4, 4, 5, 6, 7`.

For more information of the related techniques, you can refer to the paper [Synopses for Massive Data: Samples,Histograms, Wavelets, Sketches](https://dl.acm.org/doi/10.1561/1900000004).

### Estimation

In SQL queries, we often use some condition to filter out some data, and the main role of statistics estimation is to estimate the number of data entries after these filtering conditions, so that the optimizer can choose the optimal execution plan. In this part, we would have a simple indroduction about the estimation using these data structures.

#### Range Estimation

For a range query on a particular column, we choose the histogram for estimation.

In the previous introduction of the equal-depth histogram, we were given a histogram containing four buckets `[1.6, 1.9], [2.0, 2.6], [2.7, 2.8], [2.9, 3.5]`, all of which have a bucket depth of 3. Suppose we have such a histogram and we want to know how many values fall in the interval `[1.7, 2.8]`. If we put this interval on the histogram, we can see that two buckets are completely covered, namely bucket `[2.0, 2.6]` and bucket `[2.7, 2.8]`, so there are 6 values in the interval `[2.0, 2.8]`. However, the first bucket is only partially covered, so the problem becomes how to estimate the number of values in the interval `[1.7, 1.9]`. When we already know that there are 3 values in the interval `[1.6, 1.9]`, how can we estimate how many values are in `[1.7, 1.9]`? A common approach is to assume that the range is continuous and uniform, so we can estimate the range as a proportion of the bucket, i.e. `(1.9 - 1.7) / (1.9 - 1.6) * 3 = 2`.

But there is another problem here is to go to the ratio when estimating, which is easy for numeric types, but what about other types, let's say string types? One way is to map strings to numbers and then calculate the ratio, see [statistics/scalar.go](https://github.com/pingcap/tidb/blob/master/statistics/scalar.go) for details.

#### Point estimation

The histogram is stretched for such equal-value on a certain value. The common estimation method is to assume that each value occurs an equal number of times, so that (total number of rows/number of different values) can be estimated. When the Count-Min Sketch exists we choose Count-Min Sketch's for estimation of equal-value queries.

Since the result of Count-Min Sketch estimation is always not smaller than the actual value, we choose the `Count-Mean-Min Sketch` proposed in the paper [New estimation algorithms for streaming data: Count-min can do more](http://webdocs.cs.ualberta.ca/~drafiei/papers/cmm.pdf), which is the same as Count-Min Sketch in the update time, but the difference is with the query time: for each row i, if the hash function maps to value j, then `(N - CM[i, j]) / (w-1) (N is the total number of inserted values)` is used as the noise generated by other values, so `CM[i,j] - (N - CM[i, j]) / (w-1)` is used as the estimation value for this row. And then the median of the estimated values for all rows is used as the final estimate.

When the Count-Min Sketch is removed, we extract the top-n values out of the histogram. So we first check whether the value is in the top-n for the point estimation and return the accurate occurrence if it's in the top-n. Otherwise we use the `the number of rows in the histogram / the ndv in the histogram`. Since the top-n values are extracted, the accuracy of this case is improved.

#### Multi-column estimation

The above two subsections describe how we estimate query conditions on a single column, but actual query statements often contain multiple query conditions on multiple columns, so we need to consider how to handle the multi-column case. In TiDB, the Selectivity function in [selectivity.go](https://github.com/pingcap/tidb/blob/master/statistics/selectivity.go) implements this functionality, and it is the most important interface to the optimizer provided by the statistics information module.

When dealing with query conditions on multiple columns, a common practice is to assume that the different columns are independent of each other, so we just multiply the selectivity between the different columns. However, for filter conditions on an index that can be used to construct a range of index scans, i.e., for an index like `(a, b, c)` and conditions like `(a = 1 and b = 1 and c < 5)` or `(a = 1 and b = 1)`, the selectivity be estimated by the index's statistics using the method mentioned earlier, so that there is no need to assume that the columns are independent of each other.

Therefore, one of the most important tasks of Selectivity is to divide all the query conditions into as few groups as possible, so that the conditions in each group can be estimated using the statistics on a column or index, so that we can make as few independence assumptions as possible.

We use a simple greedy algorithm do the grouping. We always choose the index/column which cover the most remaining filters and remove these filters, go into next round until all filters are covered. The last step is to do the estimation using the statistics on each column and each index as mentioned before, and combine them with the independence assumption as the final result.


## Summary

The collection and maintenance of statistics is the core function of the database. And for the cost-based query optimizer, the accuracy of statistics directly affects the query performance. In the distributed database, collecting statistics is not much different from standalone, but maintaining statistics has more challenges, such as how to maintain accurate and timely statistics in the case of multi-node updates.

For dynamic updating of histograms, the industry generally has two approaches.

- For each addition or deletion, go to update the corresponding bucket depth. Splitting a bucket when its depth is too high is generally done by dividing the width of the bucket equally, although this makes it difficult to accurately determine the splitting point and causes errors.
- Using the actual number obtained from the query to adjust the histogram with feedback assumes that the error contributed by all buckets is uniform, and uses the continuous value assumption to adjust all the buckets involved. However the assumption of uniformity of errors often causes problems, such as when a newly inserted value is larger than the maximum value of the histogram, it will spread the error caused by the newly inserted value to the histogram, thus causing errors.

Currently TiDB's statistics are still dominated by single-column statistics. To reduce the use of independence assumptions, TiDB will explore the collection and maintenance of multi-column statistics to provide more accurate statistics for the optimizer in the near future.