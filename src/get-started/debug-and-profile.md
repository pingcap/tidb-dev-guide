# Debug and profile

In this section, you will learn the following things:

* How to debug TiDB
* How to pause the execution at any line of code to inspect values and stacks
* How to profile TiDB to catch a performance bottleneck

## Use delve for debugging

[Delve](https://github.com/go-delve/delve) is a debugger for the Go programming language. It provides GDB-like command-line debugging experience and is much more Go native that GDB.

### Install delve

To install delve, you can refer to the [installation guide](https://github.com/go-delve/delve/tree/master/Documentation/installation). After the installation, you will have an executable file named `dlv` in `$GOPATH/bin` or `$HOME/go/bin` depending on how your environment variables are set, and you can then run the following command to verify the installation.

```
$ dlv version
Delve Debugger
Version: 1.5.0
Build: $Id: ca5318932770ca063fc9885b4764c30bfaf8a199 $
```

### Attach delve to a running TiDB process

Once you get the TiDB server running, you can try attaching the delve debugger.

For example, you can build and run a standalone TiDB server by running the following commands in the root directory of the source code.

```bash
make server
./bin/tidb-server
```


You can then start a new shell and use `ps` or `pgrep` to find the PID of the tidb server process you just started.

```bash
pgrep tidb-server
# OUTPUT:
# 1394942
```

If multiple PIDs are listed in the output, it indicates that you might have multiple TiDB servers running at the same time. To figure out the PID of the tidb server you are planning to debug, you can use commands such as `ps $PID`, where `$PID` is the PID you are trying to know more about.

```bash
ps 1394942
# OUTPUT:
#     PID TTY      STAT   TIME COMMAND
# 1394942 pts/11   SNl    0:02 ./bin/tidb-server
```

Once you get the PID, you can attach delve onto it by running the following command:

```bash
dlv attach 1394942
```

You might get error messages of the kernel security setting as follows:

```
Could not attach to pid 1394942: this could be caused by a kernel security setting, try writing "0" to /proc/sys/kernel/yama/ptrace_scope
```

To resolve the error, you need to follow the instructions provided in the error message and execute the following command as the root user to override the kernel security setting.

```bash
echo 0 > /proc/sys/kernel/yama/ptrace_scope
```

Then retry attaching delve onto the PID and it should work.

Once entering the debugging interface, you will find it familiar if you’ve worked with GDB. It is an interactive dialogue that allows you to interact with the execution of the tidb server attached on. To learn more information about delve, you can type `help` into the dialogue and read help messages.

### Use delve for debugging

After attaching delve to the running TiDB server process, you can now set breakpoints, and the TiDB server will pause the execution at the breakpoints you specified.

To create a breakpoint, you can write

```
break [name] <linespec>
```

where `[name]` is the name for the breakpoint, and `<linespec>` is the position of a line of code in the source code. Note the name is optional.

For example, the following command will create a breakpoint at the `Next` function of `HashJoinExec` (the line number can be subject to change due to the modification of the source code).

```bash
dlv debug tidb-server/main.go
# OUTPUT:
# Type 'help' for list of commands.
# (dlv) break executor/join.go:653
# Breakpoint 1 (enabled) set at 0x36752d8 for github.com/pingcap/tidb/executor.(*HashJoinExec).Next() ./executor/join.go:653
# (dlv)
```

Once the execution is paused, the context of the execution is fully preserved. You are free to inspect the values of different variables, print the calling stack, and even jump between different goroutines. Once you finish the inspection, you can resume the execution by stepping into the next line of code or continue the execution until the next breakpoint is encountered.

Typically, you need to take the following steps when you are using a debugger:

1. Locate the code and set a breakpoint.
2. Prepare data so that the execution will get through the breakpoint, and pause at the specified breakpoint as expected.
3. Inspect values, and follow the execution step by step.

### Using delve to debug test case

If a test case fails, you can also use delve to debug the test case. Get the name of the test case, go to the corresponding package directory, and then run the following command to start a debugging session that will stop at the entry of the test. 

```
dlv test -- -check.f TestName
```

For example, if you failed on `TearDownTest` in `executor/executor_test.go`, you need to go to the `executor/` directory,  and then  run `dlv test -- -check.f TearDownTest` in your shell.

### Understand how TiDB works through debugging

Besides debugging a bug, it is also recommended to use the debugger to understand how TiDB works through tracking the execution step by step.

Some TiDB functions are critical for you to understand the internals of TiDB. To better understand how TiDB works, you can try pausing the execution for these TiDB functions, and then run TiDB step by step.

For example,

1. [`executor/compiler.go:Compile`](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/executor/compiler.go#L48) is where each SQL statement is compiled and optimized.
2. [`planner/planner.go:Optimize`](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/planner/optimize.go#L80) is where the SQL optimization starts.
3. [`executor/adapter.go:ExecStmt.Exec`](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/executor/adapter.go#L312) is where the SQL plan turns into executor, and where the SQL execution starts.
4. Each `Open`, `Next`, and `Close` function of each executor marks the volcano-style execution logic.

When you are reading the TiDB source code, you are strongly encouraged to set a breakpoint and use the debugger to trace the execution whenever you feel confused or uncertain about the code.

## Using `pprof` for profiling

For any database system, performance is always important. If you want to know where the performance bottleneck is, You can use a powerful profiling tool called `pprof` provided by Go.

### Gather runtime profiling information through HTTP end points

When you have a TiDB server running, normally, it will expose a profiling end point through HTTP at `http://127.0.0.1:10080/debug/pprof/profile`, and you can get the profile result by running the following commands:

```bash
curl -G "127.0.0.1:10080/debug/pprof/profile?seconds=45" > profile.profile
go tool pprof -http 127.0.0.1:4001 profile.profile
```

The commands will capture the profiling information for 45 seconds, and then provide a web view for the profiling result at `127.0.0.1:4001`, which contains the [flame graph](http://www.brendangregg.com/flamegraphs.html) of the execution and more views that can help you diagnosis the performance bottleneck.

Similarly, you can also gather other runtime information through this end point. For example:

* Goroutine:

```bash
curl -G "127.0.0.1:10080/debug/pprof/goroutine" > goroutine.profile
```

* Trace:

```bash
curl -G "127.0.0.1:10080/debug/pprof/trace?seconds=3" > trace.profile
go tool trace -http 127.0.0.1:4001 trace.profile
```

* Heap:

```bash
curl -G "127.0.0.1:10080/debug/pprof/heap" > heap.profile
go tool pprof -http 127.0.0.1:4001 heap.profile
```

To learn how the runtime information is analyzed, see Go's [diagnostics document](https://golang.org/doc/diagnostics).

### Profiling during benchmarking

When you are proposing a performance-related feature for TiDB, it is recommended to also include a benchmark result as proof of the performance gain or your code won't introduce any performance regression. In this case, you need to write your own benchmark test like in `executor/benchmark.go`.

For example, if you want to benchmark the window functions, because `BenchmarkWindow` are already in the benchmark tests, you can run the following commands to get the benchmark result.

```bash
cd executor
go test -bench BenchmarkWindow -run BenchmarkWindow -benchmem
```


If you find any performance regression, and you want to know how the regression is caused, you could use a command similarly as follows:

```bash
go test -bench BenchmarkWindow -run BenchmarkWindow -benchmem -memprofile memprofile.out -cpuprofile profile.out
```

To also generate the profiling information, and you can then analyze them as described in the above section.
