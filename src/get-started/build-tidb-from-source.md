# Get the code, build and run

## Prerequisites

* `git`: The source code of TiDB is hosted on GitHub as a git repository. To work with git repository, please [install `git`](https://git-scm.com/downloads).
* `go`: TiDB is a Go project thus its building requires a working `go` environment. See the previous [Install Golang](https://github.com/zz-jason/tidb-dev-guide/tree/ac6b65f27b589a78fff1767e94703eb1ca25874e/get-started/get-started/install-golang.md) section to prepare the environment.
* `mysql` client \(optional\): After building TiDB from source, you can use use the official [MySQL client](https://dev.mysql.com/downloads/mysql/) to connect to TiDB. It is not required if you want to build TiDB only.

## Clone

Clone the source code to your development machine.

```bash
mkdir -p $GOPATH/src/github.com/pingcap
cd $GOPATH/src/github.com/pingcap
git clone https://github.com/pingcap/tidb.git
```

## Build

Build TiDB from the source code.

```bash
cd $GOPATH/src/github.com/pingcap/tidb
make
```

## Run

Now you have the `tidb-server` binary under the `bin` directory, execute it for a TiDB server instance.

```bash
cd $GOPATH/src/github.com/pingcap/tidb/bin
./tidb-server
```

This starts the TiDB server listening on port 4000 with embedded `unistore`.

## Connect

You can use official MySQL client to connect to TiDB:

```bash
mysql -h 127.0.0.1 -P 4000 -u root -D test --prompt="tidb> "
```

