# Get the code, build and run

## Prerequisites

* `git`: The source code of TiDB is hosted on GitHub as a git repository. To work with git repository, please [install `git`](https://git-scm.com/downloads).
* `go`: TiDB is a Go project thus its building requires a working `go` environment. See the previous [Install Golang](install-golang.md) section to prepare the environment.
* `mysql` client (optional): After building TiDB from source, you can use the official [MySQL client](https://dev.mysql.com/downloads/mysql/) to connect to TiDB. It is not required if you want to build TiDB only.

> **Note:**
>
> TiDB should compile and run on Windows 10, but it is not expected to be deployed on Windows, where you might encounter many compatibility problems. To have a better experience, it is recommended to [install WSL2](https://docs.microsoft.com/en-us/windows/wsl/install-win10) first.

## Clone

Clone the source code to your development machine.

```bash
git clone https://github.com/pingcap/tidb.git
```

## Build

Build TiDB from the source code.

```bash
cd tidb
make
```

## Run

Now you have the `tidb-server` binary under the `bin` directory, execute it for a TiDB server instance.

```bash
./bin/tidb-server
```

This starts the TiDB server listening on port 4000 with embedded `unistore`.

## Connect

You can use official MySQL client to connect to TiDB:

```bash
mysql -h 127.0.0.1 -P 4000 -u root -D test --prompt="tidb> " --comments
```

where

* `-h 127.0.0.1` sets the Host to local host loopback interface
* `-P 4000` uses port 4000
* `-u root` connect as root user (`-p` not given, the development build has no password for root)
* `-D test` use Schema/Database test
* `--prompt "tidb> "` sets the prompt to distinguish it from a connection to MySQL
* `--comments` preserves comments like `/*T![clustered_index NONCLUSTERED */` instead of stripping them when sending the query to the server.

If you encounter any problems during your journey, do not hesitate to reach out on the [TiDB Internals forum](https://internals.tidb.io/).
