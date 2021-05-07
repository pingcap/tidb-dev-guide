# Build TiDB from Source

## Prerequisites

- `git` any version.
- `go` 1.13, higher version may work.
- (optional) `mysql` 5.6, 5.7 or 8.0.

The source code of TiDB is hosted on GitHub as a git repository. To work with git repository, please [install `git`](https://git-scm.com/downloads).

TiDB is a Go project and thus its building requires a working [Go environment](https://golang.org/doc/install). At the moment we use 1.13 in development, although higher version may work.

After build TiDB from source, you can use use [official mysql client](https://dev.mysql.com/downloads/mysql/) to connect to TiDB. It is not required if you want to build TiDB only.

## Clone

Clone the source code to your development machine.

```
mkdir -p $GOPATH/src/github.com/pingcap
cd $GOPATH/src/github.com/pingcap
git clone https://github.com/pingcap/tidb.git
```

## Build

Build TiDB from the source code.

```
cd $GOPATH/src/github.com/pingcap/tidb
make
```

## Run

Now you have the `tidb-server` binary under `bin` directory, execute it for a TiDB server instance.

```
cd $GOPATH/src/github.com/pingcap/tidb/bin
./tidb-server
```

This starts the TiDB server listening on port 4000 with embedded `unistore`.

## Connect

You can use official mysql client to connect to TiDB.

```
mysql -h 127.0.0.1 -P 4000 -u root -D test --prompt="tidb> " 
```
