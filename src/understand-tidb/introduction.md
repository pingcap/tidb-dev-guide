# Introduction of TiDB Architecture

Understanding TiDB talks about the architecture of TiDB, the modules it consists of, and the responsibility of each module.

## TiDB Architecture

When people refer to TiDB, they usually refer to the entire TiDB distributed database that includes three components: the TiDB stateless server, the Placement Driver (PD) server, and the storage server, TiKV or TiFlash. The TiDB server does not store data; it only computes and processes SQL queries. The PD server is the managing components of the entire cluster. The storage server is responsible for persistently storing data.

Let's see an architecture graph from TiDB stateless server's perspective.

![tidb-architecture](../img/tidb-architecture.png)

As you can see, TiDB is a SQL engine that supports the MySQL protocol with some kind of distributed KV storage engine that supports transactions as the underlying storage.

Here come three significant questions.

1. How to support MySQL protocol?
2. How to communicate with storage engine, store and load data?
3. How to implement SQL functions?

This section will start with a few of brief descriptions of what modules TiDB has and what they do, and then put them together to answer these three questions.

## Code Structure

TiDB source code is fully hosted on Github, you can see all the information from the [repository homepage](https://github.com/pingcap/tidb). The whole repository is developed in Golang and divided into many packages according to functional modules.

Most of the packages export services in the form of interfaces, and most of the functionality is concentrated in one package. But there are packages that provide basic functionality and are dependent on many packages, so these packages need special attention.

The main method of TiDB locates in `tidb-server/main.go`, which defines how the service is started.

The build system of the entire project can be found in the `Makefile`.

In addition to the code, there are many test cases, which can be found with suffix `_test.go`. There is also toolkit under the `cmd` directory for doing performance tests or constructing test data.

### Module Structure

TiDB has a number of modules. Table below is an overview that shows what each module does, and if you want to see the code for the relevant function, you can find the corresponding module directly.

| Package                                                                                                         | Description                                                                                                                                                                                                                                                                                    |
| :-------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pingcap/tidb/pkg/bindinfo](https://github.com/pingcap/tidb/tree/master/pkg/bindinfo)                           | Handles all global sql bind operations, and caches the sql bind info from storage.                                                                                                                                                                                                             |
| [pingcap/tidb/pkg/config](https://github.com/pingcap/tidb/tree/master/pkg/config)                               | The configuration definition.                                                                                                                                                                                                                                                                  |
| [pingcap/tidb/pkg/ddl](https://github.com/pingcap/tidb/tree/master/pkg/ddl)                                     | The execution logic of data definition language (DDL).                                                                                                                                                                                                                                         |
| [pingcap/tidb/pkg/distsql](https://github.com/pingcap/tidb/tree/master/pkg/distsql)                             | The abstraction of the distributed computing interfaces to isolate the logic between the executor and the TiKV client                                                                                                                                                                          |
| [pingcap/tidb/pkg/domain](https://github.com/pingcap/tidb/tree/master/pkg/domain)                               | The abstraction of a storage space in which databases and tables can be created. Like namespace, databases with the same name can exist in different domains. In most cases, a single TiDB instance only creates one Domain instance with details about the information schema and statistics. |
| [pingcap/tidb/pkg/errno](https://github.com/pingcap/tidb/tree/master/pkg/errno)                                 | The definition of MySQL error code, error message, and error summary.                                                                                                                                                                                                                          |
| [pingcap/tidb/pkg/executor](https://github.com/pingcap/tidb/tree/master/pkg/executor)                           | The operator related code that contains the execution logic of most statements.                                                                                                                                                                                                                |
| [pingcap/tidb/pkg/expression](https://github.com/pingcap/tidb/tree/master/pkg/expression)                       | The expression-related code that contains various operators and built-in functions.                                                                                                                                                                                                            |
| [pingcap/tidb/pkg/infoschema](https://github.com/pingcap/tidb/tree/master/pkg/infoschema)                       | The metadata management module for SQL statements; accessed when all the operations on the information schema are executed.                                                                                                                                                                    |
| [pingcap/tidb/pkg/kv](https://github.com/pingcap/tidb/tree/master/pkg/kv)                                       | The Key-Value engine interface and some public methods; the interfaces defined in this package need to be implemented by the storage engine which is going to adapt TiDB SQL layer.                                                                                                            |
| [pingcap/tidb/pkg/lock](https://github.com/pingcap/tidb/tree/master/pkg/lock)                                   | The implementation of LOCK/UNLOCK TABLES.                                                                                                                                                                                                                                                      |
| [pingcap/tidb/pkg/meta](https://github.com/pingcap/tidb/tree/master/pkg/meta)                                   | Manages the SQL metadata in the storage engine through the features of the structure package; infoschema and DDL use this module to access or modify the SQL metadata .                                                                                                                        |
| [pingcap/tidb/pkg/meta/autoid](https://github.com/pingcap/tidb/tree/master/pkg/meta/autoid)                     | A module to generate the globally unique monotonically incremental IDs for each table, as well as the database ID and table ID.                                                                                                                                                                |
| [pingcap/tidb/pkg/metrics](https://github.com/pingcap/tidb/tree/master/pkg/metrics)                             | Store the metrics information of all modules.                                                                                                                                                                                                                                                  |
| [pingcap/tidb/pkg/owner](https://github.com/pingcap/tidb/tree/master/pkg/owner)                                 | Some tasks in the TiDB cluster can be executed by only one instance, such as the asynchronous schema change. This owner module is used to coordinate and generate a task executor among multiple TiDB servers. Each task has its own executor.                                                 |
| [pingcap/tidb/pkg/parser](https://github.com/pingcap/tidb/tree/master/pkg/parser)                               | A MySQL compatible SQL parser used by TiDB, also contains the data structure definition of abstract syntax tree (AST) and other metadata.                                                                                                                                                      |
| [pingcap/tidb/pkg/planner](https://github.com/pingcap/tidb/tree/master/pkg/planner)                             | Queries optimization related code.                                                                                                                                                                                                                                                             |
| [pingcap/tidb/pkg/plugin](https://github.com/pingcap/tidb/tree/master/pkg/plugin)                               | The plugin framework of TiDB.                                                                                                                                                                                                                                                                  |
| [pingcap/tidb/pkg/privilege](https://github.com/pingcap/tidb/tree/master/pkg/privilege)                         | The management interface of user privileges.                                                                                                                                                                                                                                                   |
| [pingcap/tidb/pkg/server](https://github.com/pingcap/tidb/tree/master/pkg/server)                               | Code of the MySQL protocol and connection management.                                                                                                                                                                                                                                          |
| [pingcap/tidb/pkg/session](https://github.com/pingcap/tidb/tree/master/pkg/session)                             | Code of session management.                                                                                                                                                                                                                                                                    |
| [pingcap/tidb/pkg/sessionctx/binloginfo](https://github.com/pingcap/tidb/tree/master/pkg/sessionctx/binloginfo) | Output binlog information.                                                                                                                                                                                                                                                                     |
| [pingcap/tidb/pkg/sessionctx/stmtctx](https://github.com/pingcap/tidb/tree/master/pkg/sessionctx/stmtctx)       | Necessary information for the statement of a session during runtime.                                                                                                                                                                                                                           |
| [pingcap/tidb/pkg/sessionctx/variable](https://github.com/pingcap/tidb/tree/master/pkg/sessionctx/variable)     | System variable related code.                                                                                                                                                                                                                                                                  |
| [pingcap/tidb/pkg/statistics](https://github.com/pingcap/tidb/tree/master/pkg/statistics)                       | Code of table statistics.                                                                                                                                                                                                                                                                      |
| [pingcap/tidb/pkg/store](https://github.com/pingcap/tidb/tree/master/pkg/store)                                 | Storage engine drivers, wrapping Key-Value client to meet the requirements of TiDB.                                                                                                                                                                                                            |
| [tikv/client-go](https://github.com/tikv/client-go)                                                             | The Go client of TiKV.                                                                                                                                                                                                                                                                         |
| [pingcap/tidb/pkg/structure](https://github.com/pingcap/tidb/tree/master/pkg/structure)                         | The structured API defined on the Transactional Key-Value API, providing structures like List, Queue, and HashMap.                                                                                                                                                                             |
| [pingcap/tidb/pkg/table](https://github.com/pingcap/tidb/tree/master/pkg/table)                                 | The abstraction of Table in SQL.                                                                                                                                                                                                                                                               |
| [pingcap/tidb/pkg/tablecodec](https://github.com/pingcap/tidb/tree/master/pkg/tablecodec)                       | Encode and decode data from SQL to Key-Value. See the codec package for the specific encoding and decoding solution for each data type.                                                                                                                                                        |
| [pingcap/tidb/pkg/telemetry](https://github.com/pingcap/tidb/tree/master/pkg/telemetry)                         | Code of telemetry collect and report.                                                                                                                                                                                                                                                          |
| [pingcap/tidb/cmd/tidb-server](https://github.com/pingcap/tidb/tree/master/cmd/tidb-server)                     | The main method of the TiDB service.                                                                                                                                                                                                                                                           |
| [pingcap/tidb/pkg/types](https://github.com/pingcap/tidb/tree/master/pkg/types)                                 | All the type related code, including the definition of and operation on types.                                                                                                                                                                                                                 |
| [pingcap/tidb/pkg/util](https://github.com/pingcap/tidb/tree/master/pkg/util)                                   | Utilities.                                                                                                                                                                                                                                                                                     |

At a glance, TiDB has 80 packages, which might let you feel overwhelmed, but not all of them are important, and some features only involve a small number of packages, so where to start to look at the source code depends on the purpose of looking at the source code.

If you want to understand the implementation details of a specific feature, then you can refer to the module description above and just find the corresponding module.

If you want to have a comprehensive understanding of the source code, then you can start from `tidb-server/main.go` and see how tidb-server starts and how it waits for and handles user requests. Then follow the code all the way through to see the exact execution of the SQL. There are also some important modules that need to be looked at to know how they are implemented. For the auxiliary modules, you can look at them selectively to get a general impression.

### SQL Layer Architecture

![sql-layer-architecture](../img/sql-layer-architecture.png)

This is a detailed SQL layer architecture graph. You can read it from left to right.

### Protocol Layer

The leftmost is the Protocol Layer of TiDB, this is the interface to interact with Client, currently TiDB only supports MySQL protocol, the related code is in the `server` package.

The purpose of this layer is to manage the client connection, parse MySQL commands and return the execution result. The specific implementation is according to MySQL protocol, you can refer to [MySQL Client/Server Protocol document](https://dev.mysql.com/doc/internals/en/client-server-protocol.html). If you need to use MySQL protocol parsing and processing functions in your project, you can refer to this module.

The logic for connection establishment is in the `Run()` method of `server.go`, mainly in the following two lines.

```go
conn, err := s.listener.Accept()
clientConn := s.newConn(conn)
go s.onConn(clientConn)
```

The entry method for a single session processing command is to call the `dispatch` method of the `clientConn` class, where the protocol is parsed and passed to a different handler.

### SQL Layer

Generally speaking, a SQL statement needs to go through a series of processes: 

1. syntax parsing
2. validity verification
3. building query plan 
4. optimizing query plan
5. generating executor according to plan
6. executing and returning results

These processes locate at the following modules:

| Package               | Usage                                                                       |
| :-------------------- | :-------------------------------------------------------------------------- |
| pingcap/tidb/sever    | Interface between protocol layer and SQL layer                              |
| pingcap/tidb/parser   | SQL parsing and syntax analyze                                              |
| pingcap/tidb/planner  | Validation, query plan building, query plan optimizing                      |
| pingcap/tidb/executor | Executor generation and execution                                           |
| pingcap/tidb/distsql  | Send request to TiKV and aggregate return results from TiKV via TiKV Client |
| pingcap/tidb/kv       | KV client interface                                                         |
| tikv/client-go        | TiKV Go Client                                                              |

### KV API Layer

TiDB relies on the underlying storage engine to store and load data. It does not rely on a specific storage engine (such as TiKV), but has some requirements for the storage engine, and any engine that meets these requirements can be used (TiKV is the most suitable one).

The most basic requirement is "Key-Value engine with transactions and Golang driver". The more advanced requirement is "support for distributed computation interface", so that TiDB can push some computation requests down to the storage engine.

These requirements can be found in the interfaces of the `kv` package, and the storage engine needs to provide a Golang driver that implements these interfaces, which TiDB then uses to manipulate the underlying data.

As for the most basic requirement, these interfaces are related:

* `Transaction`: Basic manipulation of transaction
* `Receiver`: Interface for reading data
* `Mutator`: Interface for mutating data
* `Storage`: Basic functionality provided by the driver
* `Snapshot`: Basic manipulation of data snapshot
* `Iterator`: Result of `Seek`, used to iterate data

With the above interfaces, you are able to do all the required operations on the data and complete all the SQL functions. However, for more efficient computing, we have also defined an advanced computing interface, which can focus on these three interfaces or structures:

* `Client`: Send request to storage engine
* `Request`: Payload of the request
* `Response`: Abstraction of result

## Summary

This section talks about the source structure of TiDB and the architecture of three significant components. More details will be described in the later sections.
