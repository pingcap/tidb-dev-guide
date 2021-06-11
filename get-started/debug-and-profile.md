# Debug and profile

In this section, you will learn the following things:
- How to debug TiDB
- How to pause the execution at any line of code to inspect values and stacks
- how to profile TiDB to catch a performance bottleneck

## Use delve for debugging

[Delve](https://github.com/go-delve/delve) is a debugger for the Go programming language. It provides GDB-like command-line debugging experience and is much more Go native.

### Install delve

To install delve, you can refer to the [installation guide](https://github.com/go-delve/delve/tree/master/Documentation/installation). After the installation, you will have an executable file named `dlv` in `$GOPATH/bin` or `$HOME/go/bin` depending on how your environment variables are set, and you can then type the following command to verify the installation.

```
$ dlv version
Delve Debugger
Version: 1.5.0
Build: $Id: ca5318932770ca063fc9885b4764c30bfaf8a199 $
```

### Attaching delve to a running TiDB process

As mentioned in [Get the code, build and run](build-tidb-from-source.md), once you get the TiDB server running, you can try to attach the delve debugger.

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

Entering the debugging interface, you will find it familiar if you’ve worked with GDB. It is a interactive dialogue that allows you to interact with the execution of the tidb server attached on. You should type `help` into the dialogue and read the help messages.

### Using delve for debugging

After attaching delve to the running TiDB server process, you can now set breakpoints, and the TiDB server will pause the execution at the breakpoints you specified.

To create a breakpoint, you can write

```
break [name] <linespec>
```

where `[name]` stands for the name for the breakpoint, and `<linespec>` is the position of a line of code in the source code.

Once the execution is paused, the context of the execution is fully preserved, and you are free to inspect the value of different variables, print the calling stack and even jump bewteen different goroutines. Once you are satisfied, you can resume the execution by stepping into the next line of code or continue the execution until the next breakpoint is encountered.

Basically, the following steps are typical when you are using debugger:

1. locate the code and set a breakpoint
2. prepare data so that the execution will get through the breakpoint, and pause there as expected
3. inspect values, follow the execution step by step

### Using delve to debug test case

If test cases failed, you can also use delve to debug test case. Get the name of the test case, and then use

```
dlv test -- -check.f TestName
```

at the corresponding package directory to start a debugging session that will stop at the entry of the test. For example, if you failed on `TearDownTest` in `executor/executor_test.go`, you need to get to `executor/` and run `dlv test -- -check.f TearDownTest` in your shell.

### Understand how TiDB works through debugging

Other than debugging a bug, it is also recommended to use the debugger for understanding how TiDB works through tracking the execution step by step.

There are some functions in TiDB that are critical to understand the internals of TiDB, and you should try to pause the execution there and then run TiDB step by step to help you better understand how TiDB works.

For example,

1. `[executor/compiler.go:Compile](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/executor/compiler.go#L48)` is where every SQL is compiled and optimized
2. `[planner/planner.go:Optimize](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/planner/optimize.go#L80)` is where the SQL optimization starts
3. `[executor/adapter.go:ExecStmt.Exec](https://github.com/pingcap/tidb/blob/5c95062cc34d6d37e2e921f9bddba6205b43ee3a/executor/adapter.go#L312)` is where the SQL plan turns into executor, and where the SQL execution starts
4. Each `Open`, `Next` and `Close` function of each executor marks the volcano-style execution logic

As you are reading the TiDB source code, you are strongly encouraged to set a breakpoint and use the debugger to trace the execution whenever you feel confused or uncertain about the code.

## Using `pprof` for profiling

For any database system, performance is always an important issue, and if you want to know where the performance bottleneck is, Go provides a powerful profiling tool called `pprof` for this purpose.

### Gathering runtime profiling information through HTTP end points

Normally, when you have a TiDB server running, it will expose a profiling end point through HTTP at `http://127.0.0.1:10080/debug/pprof/profile`, and you can get the profile result through

```bash
$ curl -G "127.0.0.1:10080/debug/pprof/profile?seconds=45" > profile.profile
$ go tool pprof -http 127.0.0.1:4001 profile.profile
```

which will capture the profiling information for 45 seconds, and then provide a web view for the profiling result at `127.0.0.1:4001`, which contains the [flame graph](http://www.brendangregg.com/flamegraphs.html) of the execution and many more views that can help you diagnosis the performance bottleneck.

Similarly, other runtime information can also be gathered through this end point, for example:

- Goroutine:

```bash
curl -G "127.0.0.1:10080/debug/pprof/goroutine" > goroutine.profile
```

- Trace:

```bash
$ curl -G "127.0.0.1:10080/debug/pprof/trace?seconds=3" > trace.profile
$ go tool trace -http 127.0.0.1:4001 trace.profile
```

- Heap:

```bash
$ curl -G "127.0.0.1:10080/debug/pprof/heap" > heap.profile
$ go tool pprof -http 127.0.0.1:4001 heap.profile
```

You can refer to Go's [diagnostics document](https://golang.org/doc/diagnostics) for how these information can be analyzed.

### Profiling during benchmarking

When you are proposing performance related features for TiDB, it is recommended to also include a benchmark result to proof the performance gain or your code won't introduce any performance regression. In this case, you need to write your own benchmark test like in `executor/benchmark.go`.

For example, if you want to benchmark the window functions, there are already `BenchmarkWindow` in the benchmark tests, so you can run

```bash
$ cd executor
$ go test -bench BenchmarkWindow -run BenchmarkWindow -benchmem
```

to get the benchmark result.

If you find any performance regression, and you want to know how the regression is caused, you could use command like

```bash
$ go test -bench BenchmarkWindow -run BenchmarkWindow -benchmem -memprofile memprofile.out -cpuprofile profile.out
```

to also generate the profling information, and you can then analyze them as described in the above section.
