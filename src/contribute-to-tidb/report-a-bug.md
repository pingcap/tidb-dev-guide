# Report a Bug

While bugs are unfortunate, they're a reality in software. We can't fix what we don't know about, so please report liberally. If you're not sure if something is a bug or not, feel free to file a bug anyway.

If you're using the nightly build, please check if the bug exists in the latest codebase before filing your bug. It might be fixed already.

If you have the chance, before reporting a bug, please [search existing issues](https://github.com/pingcap/tidb/issues?q=is%3Aissue), as it's possible that someone else has already reported your error. This doesn't always work, and sometimes it's hard to know what to search for, so consider this extra credit. We won't mind if you accidentally file a duplicate report.

Similarly, to help others who encountered the bug find your issue, consider filing an issue with a descriptive title, which contains information that might be unique to it. This can be the components related to or database feature used, the conditions that trigger the bug, or part of the error message if there is any. An example could be: [`ddl: admin cancel column-type-change will not release the background work goroutine`](https://github.com/pingcap/tidb/issues/24584).

Opening an issue is as easy as following [this link](https://github.com/pingcap/tidb/issues/new?assignees=&labels=type%2Fbug&template=bug-report.md) and filling out the fields in the appropriate provided template. The fields mainly consist of

1. Minimal reproduce step.
2. What did you expect to see?
3. What did you see instead?
4. What is your TiDB version?

For minimal reproduce step, it would be better to provide an executable SQL script, take [pingcap/tidb#25007](https://github.com/pingcap/tidb/issues/25007) as an example:

```sql
set global tidb_enable_change_column_type = 1;

drop table tbl_19;
create table tbl_19 ( col_73 decimal(45,8) default 13.654 not null);
insert  into tbl_19 set col_73 = 0.4352;

alter table tbl_19 change column col_73 col_159 timestamp;
select * from tbl_19;
```

After the bug reported is recognized with consensus, you can ask for assignment and start fixing the bug after assigned. See also [Contribute Code](contribute-code.md)
