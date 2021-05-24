# Debug and profile


In this section, you will learn how to debug TiDB, which is very helpful not only for debugging, but also enables you to stop TiDB at any line of code, and inspect values and stacks. You will also learn how to profile TiDB to catch the performance bottleneck.

## TL;DR

* how to use GoLand for debugging
* how to use delve for debugging from command line
* using `pprof` for profiling
* using `perf` for profiling

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

the above commands will get a standalone TiDB server running. Connect it with MySQL client and set up the schema.

```
```

1. locate the code
2. set a breakpoint
3. prepare data so that the execution needs to get through the breakpoint
4. inspect values, follow the execution step by step




### Using delve to debug test case

### Understand how TiDB works through debugging

## Using `pprof` for profiling

In most cases, if you are proposing performance related pull request, you need to using benchmark to show improvements or regression-free.

including but not limited to:

* how to debug tidb
* how to write benchmarks
* how to profile

