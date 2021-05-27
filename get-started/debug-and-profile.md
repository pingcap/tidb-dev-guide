# Debug and profile


In this section, you will learn how to debug TiDB, which is very helpful not only for debugging, but also enables you to stop TiDB at any line of code, and inspect values and stacks. You will also learn how to profile TiDB to catch the performance bottleneck.

## Use delve for debugging

[Delve](https://github.com/go-delve/delve) is a debugger for the Go programming language, it provides GDB like command line debugging experience but is much more Go native.

### Install delve

To install delve, you can refer to the [installation guide](https://github.com/go-delve/delve/tree/master/Documentation/installation). After the installation, you will have an executable file named `dlv` in `$GOPATH/bin` or `$HOME/go/bin` depending on how your environment variables are set, and you can then type the following command to verify the installation.

```
$ dlv version
Delve Debugger
Version: 1.5.0
Build: $Id: ca5318932770ca063fc9885b4764c30bfaf8a199 $
```

### Attaching delve to a running TiDB process

As mentioned in [Get the code, build and run](https://zz-jason.gitbook.io/tidb-dev-guide/get-started/build-tidb-from-source), once you get the TiDB server running, you can try to attach the delve debugger.

For example, you can typically build and run a standalone TiDB server by

```
$ make server
$ ./bin/tidb-server
```

in the root directory of the source code.

You can then start a new shell and use `ps` or `pgrep` to find the PID of the tidb server process you just started.

```
$ pgrep tidb-server
1394942
```

If there are multiple PIDs listed, it might be that you have multiple tidb servers running, and you should figure out the PID of the tidb server you are planning to debug with using commands like `ps $PID` where `$PID` is the PID you are trying to know more about.

```
$ ps 1394942
    PID TTY      STAT   TIME COMMAND
1394942 pts/11   SNl    0:02 ./bin/tidb-server
```

Once you got the PID, you can then attach delve onto it by

```
$ dlv attach 1394942
```

You might encounter error messages like

```
$ dlv attach 1394942
Could not attach to pid 1394942: this could be caused by a kernel security setting, try writing "0" to /proc/sys/kernel/yama/ptrace_scope
```

You should follow the instruction and execute the following command as the root user to override the kernel security setting.

```
# echo 0 > /proc/sys/kernel/yama/ptrace_scope
```

You should then retry attaching and it should work.

Entering the debugging interface, you will find it familiar if you've worked with GDB. It is a interactive dialogue that allows you to interact with the execution of the tidb server attached on. You should type `help` into the dialogue and read the help messages.

### Using delve for debugging

After attaching delve to the running TiDB server process, you can now set breakpoints, and the TiDB server will pause the execution at the breakpoints you specified.

To create a breakpoint, you can write

```
break [name] <linespec>
```

where `[name]` stands for the name for the breakpoint, and `<linespec>` is the position of a line of code in the source code.

Once the execution is paused, the context of the execution is fully preserved, and you are free to inspect the value of different variables, print the calling stack and even jump bewteen different goroutines. Once you are satisfied, you can resume the execution by stepping into the next line of code or continue the execution until the next breakpoint is encountered.

Here is an example of how delve is typically used for understanding the execution.

In [tidb/issues/23609](https://github.com/pingcap/tidb/issues/23609), TiDB paniced upon the execution of a given SQL, and it is fixed in [tidb/pull/24051](https://github.com/pingcap/tidb/pull/24051).

Before the fix, the commit ID is `05e584f145f12a31f76306b57dbc6633265f1dfc`, you can checkout this commit and trying to reproduce the problem stated in the issue.

```
$ git checkout 05e584f145f12a31f76306b57dbc6633265f1dfc
$ make server
$ ./bin/tidb-server
```

the above commands will get a standalone TiDB server running. Connect it with MySQL client

```
$ mysql -u root -h 0.0.0.0 -P 4000 -D test --comments
```

and set up the schema by the following SQL.

```sql
CREATE TABLE `t1` (
  `a` timestamp NULL DEFAULT NULL,
  `b` year(4) DEFAULT NULL,
  KEY `a` (`a`),
  KEY `b` (`b`)
);
insert into t1 values("2002-10-03 04:28:53", 2000);
```

Upon querying it with

```sql
select /*+ inl_join (x,y) */ * from t1 x cross join t1 y on x.a=y.b;
```

you will notice that the MySQL client complains with error

```
MySQL [test]> select /*+ inl_join (x,y) */ * from t1 x cross join t1 y on x.a=y.b;
ERROR 1292 (22007): Incorrect time value: '{2000 0 0 0 0 0 0}'
```

and note in the shell session where the TiDB server is brought up, the log message prints the stack of the error

```
[2021/05/24 18:26:45.722 +08:00] [INFO] [conn.go:878] ["command dispatched failed"] [conn=3] [connInfo="id:3, addr:127.0.0.1:50554 status:10, collation:utf8_general_ci, user:root"] [command=Query] [status="inTxn:0, autocommit:1"] [sql="select /*+ inl_join (x,y) */ * from t1 x cross join t1 y on x.a=y.b"] [txn_mode=OPTIMISTIC] [err="[types:1292]Incorrect time value: '{2000 0 0 0 0 0 0}'\ngithub.com/pingcap/errors.AddStack\n\t/home/ichn/.gvm/pkgsets/go1.13/global/pkg/mod/github.com/pingcap/errors@v0.11.5-0.20201126102027-b0a155152ca3/errors.go:174\ngithub.com/pingcap/errors.(*Error).GenWithStackByArgs\n\t/home/ichn/.gvm/pkgsets/go1.13/global/pkg/mod/github.com/pingcap/errors@v0.11.5-0.20201126102027-b0a155152ca3/normalize.go:156\ngithub.com/pingcap/tidb/types.CoreTime.GoTime\n\t/home/ichn/Projects/pingcap/tidb/types/core_time.go:181\ngithub.com/pingcap/tidb/types.(*Time).ConvertTimeZone\n\t/home/ichn/Projects/pingcap/tidb/types/time.go:358\ngithub.com/pingcap/tidb/util/codec.EncodeMySQLTime\n\t/home/ichn/Projects/pingcap/tidb/util/codec/codec.go:184\ngithub.com/pingcap/tidb/util/codec.encode\n\t/home/ichn/Projects/pingcap/tidb/util/codec/codec.go:99\ngithub.com/pingcap/tidb/util/codec.EncodeKey\n\t/home/ichn/Projects/pingcap/tidb/util/codec/codec.go:287\ngithub.com/pingcap/tidb/executor.(*innerWorker).constructLookupContent\n\t/home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:526\ngithub.com/pingcap/tidb/executor.(*innerWorker).handleTask\n\t/home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:487\ngithub.com/pingcap/tidb/executor.(*innerWorker).run\n\t/home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:469\nruntime.goexit\n\t/home/ichn/.gvm/gos/go1.13/src/runtime/asm_amd64.s:1357"]
```

Read carefully and you will find `err="XXX"` pattern in the log, and you can use `echo` to make that message more human readable (replace `XXX` with the text you see in the log message).

```
$ echo "XXX"
[types:1292]Incorrect time value: '{2000 0 0 0 0 0 0}'
github.com/pingcap/errors.AddStack
        /home/ichn/.gvm/pkgsets/go1.13/global/pkg/mod/github.com/pingcap/errors@v0.11.5-0.20201126102027-b0a155152ca3/errors.go:174
github.com/pingcap/errors.(*Error).GenWithStackByArgs
        /home/ichn/.gvm/pkgsets/go1.13/global/pkg/mod/github.com/pingcap/errors@v0.11.5-0.20201126102027-b0a155152ca3/normalize.go:156
github.com/pingcap/tidb/types.CoreTime.GoTime
        /home/ichn/Projects/pingcap/tidb/types/core_time.go:181
github.com/pingcap/tidb/types.(*Time).ConvertTimeZone
        /home/ichn/Projects/pingcap/tidb/types/time.go:358
github.com/pingcap/tidb/util/codec.EncodeMySQLTime
        /home/ichn/Projects/pingcap/tidb/util/codec/codec.go:184
github.com/pingcap/tidb/util/codec.encode
        /home/ichn/Projects/pingcap/tidb/util/codec/codec.go:99
github.com/pingcap/tidb/util/codec.EncodeKey
        /home/ichn/Projects/pingcap/tidb/util/codec/codec.go:287
github.com/pingcap/tidb/executor.(*innerWorker).constructLookupContent
        /home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:526
github.com/pingcap/tidb/executor.(*innerWorker).handleTask
        /home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:487
github.com/pingcap/tidb/executor.(*innerWorker).run
        /home/ichn/Projects/pingcap/tidb/executor/index_lookup_join.go:469
runtime.goexit
        /home/ichn/.gvm/gos/go1.13/src/runtime/asm_amd64.s:1357
```

Now we know where the error is stemed from, let's take a closer look at the execution.

Instinctively, it is best to break at the higherest level of the stack where it is specific enough to be only encountered by the SQL that make it panic. The logic is, the higher the level of the stack is, the more steps you can track and the more information about how the bug occurs can be learnt, however if it is too high level, then the breakpoint might be encountered many times by other execution path that won't cause the expected bug. In this case, you should pick and try out different the stack level that best fits the trade off or using conditional breakpoints which we won't cover in this guide and is upon to your own discovery.

Here, let's just set up a breakpoint at `executor.(*innerWorker).constructLookupContent` by

```
(dlv) b executor/index_lookup_join.go:487
```


1. locate the code
2. set a breakpoint
3. prepare data so that the execution needs to get through the breakpoint
4. inspect values, follow the execution step by step




### Using delve to debug test case

If test cases failed, you can also use delve to debug test case. Get the name of the test case, and then use

```
dlv test -- -check.f TestName
```

to start a 

### Understand how TiDB works through debugging

## Using `pprof` for profiling

In most cases, if you are proposing performance related pull request, you need to using benchmark to show improvements or regression-free.

including but not limited to:

* how to debug tidb
* how to write benchmarks
* how to profile

