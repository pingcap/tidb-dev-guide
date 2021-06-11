# Introduction of TiDB architecture

Sections in this chapter discuss TiDB internals. This section as an introduction talks about what is the architecture of TiDB, what modules it consists of, and what is the responsibility of each module.

## TiDB Architecture

The term TiDB has two meanings. One is the whole distributed database management system, the other is the SQL layer of the database. This chapter focuses on the SQL layer.

Let's see the architecture graph.

![tidb-architecture](https://user-images.githubusercontent.com/18818196/121637571-28acae80-cabc-11eb-970e-14af8a7a6246.png)

As you can see from the graph, TiDB is a SQL engine that supports the MySQL protocol with some kind of distributed KV storage engine that supports transactions as the underlying storage.

Here come three significant questions.

1. How to support MySQL protocol?
2. How to communicate with storage engine, store and load data?
3. How to implement SQL functions?

This section will start with some brief descriptions of what modules TiDB has and what they do, and then put them together by these three questions.

## Code Structure

TiDB source code is fully hosted on Github, you can see all the information from the [repository homepage](https://github.com/pingcap/tidb). The whole repository is developed in Golang and divided into many Packages according to functional modules. Through dependency analysis tools, you can see the dependencies between packages inside the project.

Most of the packages export services in the form of interfaces, and most of the functionality is concentrated in one package. But there are packages that provide basic functionality and are dependent on many packages, so these packages need special attention.

The main file of TiDB is in `tidb-server/main.go`, which defines how the service is started. The Build method for the entire project can be found in the `Makefile`.

In addition to the code, there are many test cases, which can be found in `xx_test.go`. There is also toolkit under the `cmd` directory for doing performance tests or constructing test data.

### Module Structure

TiDB has a number of modules. Below is an overview that shows what each module does, and if you want to see the code for the relevant function, you can find the corresponding module directly.

| Package                | Introduction                                                                                                                                                                                                                                                               |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ast                    | Abstract syntax tree data structure definition, e.g. `SelectStmt` defines what data structure a Select statement is parsed into                                                                                                                                            |
| cmd/benchdb            | Simple benchmark tool for performance optimization                                                                                                                                                                                                                         |
| cmd/benchfilesort      | Simple benchmark tool for performance optimization                                                                                                                                                                                                                         |
| cmd/benchkv            | Transactional KV API benchmark tool, which can also be seen as a sample of the KV interface in use                                                                                                                                                                         |
| cmd/benchraw           | Raw KV API benchmark tool, which can also be seen as an example of using the KV interface without transactions                                                                                                                                                             |
| cmd/importer           | Tool for falsifying data based on table structure and statistical information for constructing test data                                                                                                                                                                   |
| config                 | Configuration file-related logic                                                                                                                                                                                                                                           |
| context                | Mainly including Context interface, providing some basic functional abstraction, many packages and functions will depend on this interface, the abstraction of these functions as an interface is to solve the dependency between packages                                 |
| ddl                    | DDL execution logic                                                                                                                                                                                                                                                        |
| distsql                | Abstraction of the distributed computing interface, with this package isolating the logic between Executor and TiKV Client                                                                                                                                                 |
| domain                 | domain can be thought of as an abstraction of a storage space in which databases can be created, tables can be created, and databases with the same name can exist between different domains, kind of like a Name Space. schema information, statistical information, etc. |
| executor               | Executor-related logic, you can assume that most of the execution logic of the statement is here                                                                                                                                                                           |
| expression             | Expression-related logic, including various operators, built-in functions                                                                                                                                                                                                  |
| expression/aggregation | Logic related to aggregated expressions, such as Sum, Count, and other functions                                                                                                                                                                                           |
| infoschema             | SQL meta information management module, in addition to the Information Schema operations, will be accessed here                                                                                                                                                            |
| kv                     | KV engine interface and some common methods, the underlying storage engine needs to implement the interfaces defined in this package                                                                                                                                       |
| meta                   | Use the functions provided by the structure package to manage the SQL meta information stored in the storage engine. infoschema and DDL uses this module to access or modify the SQL meta information                                                                      |
| meta/autoid            | Module for generating globally unique self-incrementing IDs, in addition to the self-incrementing IDs for each table, and for generating globally unique Database IDs and Table IDs                                                                                        |
| metrics                | Metrics related information, all the modules' Metrics information is here                                                                                                                                                                                                  |
| owner                  | Some tasks in a TiDB cluster can only be performed by one instance, such as asynchronous Schema changes, a module used to coordinate between multiple tidb-servers to generate a task executor. Each task generates its own executor.                                      |
| perfschema             | Performance Schema related features, not enabled by default                                                                                                                                                                                                                |
| planner                | Query optimization-related logic                                                                                                                                                                                                                                           |
| privilege              | User Rights Management Interface                                                                                                                                                                                                                                           |
| privilege/privileges   | User rights management function implementation                                                                                                                                                                                                                             |
| server                 | MySQL Protocol and Session Management Related Logic                                                                                                                                                                                                                        |
| sessionctx/binloginfo  | Output binlog information to the binlog module                                                                                                                                                                                                                             |
| sessionctx/stmtctx     | Information needed to run statements in Session                                                                                                                                                                                                                            |
| sessionctx/variable    | System Variable Related Code                                                                                                                                                                                                                                               |
| statistics             | Statistical Information Module                                                                                                                                                                                                                                             |
| store                  | Storage engine related logic, here is the interaction logic between storage engine and SQL layer                                                                                                                                                                           |
| structure              | A layer of structured API defined on top of the Transactional KV API, providing structures such as List, Queue, and HashMap                                                                                                                                                |
| table                  | Abstraction of Table for SQL                                                                                                                                                                                                                                               |
| table/tables           | Implementation of the interfaces defined in the table package                                                                                                                                                                                                              |
| tablecodec             | SQL to Key-Value codecs, see `codec` package for the specific codec scheme for each data type                                                                                                                                                                              |
| tidb-server            | the main function of TiDB server                                                                                                                                                                                                                                           |
| types                  | All type-related logic, including some type definitions, operations on types, etc.                                                                                                                                                                                         |
| types/json             | json type-related logic                                                                                                                                                                                                                                                    |
| util                   | Some utilities, there are many packages in this directory, only a few important packages will be introduced here                                                                                                                                                           |
| util/admin             | Some methods used by TiDB's administrative statements (`Admin` statements)                                                                                                                                                                                                 |
| util/charset           | Charset related logic                                                                                                                                                                                                                                                      |
| util/chunk             | Chunk is a data representation structure introduced in TiDB version 1.1. A Chunk stores a number of rows of data, and when performing SQL calculations, the data flows between modules in Chunks                                                                           |
| util/codec             | Codecs for various data types                                                                                                                                                                                                                                              |


At a glance, TiDB has 80 packages, which might let you feel overwhelmed, but not all of them are important, and some features only involve a small number of packages, so where to start to look at the source code depends on the purpose of looking at the source code.

If you want to understand the implementation details of a specific feature, then you can refer to the module profiles above and just find the corresponding module.

If you want to have a comprehensive understanding of the source code, then you can start from `tidb-server/main.go` and see how tidb-server starts and how it waits for and handles user requests. Then follow the code all the way through to see the exact execution of the SQL. There are also some important modules that need to be looked at to know how they are implemented. For the auxiliary modules, you can look at them selectively to get a general impression.

### SQL Layer Architecture

![sql-layer-architecture](https://user-images.githubusercontent.com/18818196/121646008-6e22a900-cac7-11eb-954a-fbca825855b0.png)

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
3. making query plan 
4. optimizing query plan
5. generating querier according to plan
6. executing and returning results

These processes locate at the following modules:

| Package                     | Usage                                                                       |
| :-------------------------- | :-------------------------------------------------------------------------- |
| pingcap/tidb/sever          | Interface between protocol layer and SQL layer                              |
| pingcap/tidb/pingcap/parser | SQL parsing and syntax analyze                                              |
| pingcap/tidb/planner        | Validation, query plan building, query plan optimizing                      |
| pingcap/tidb/executor       | Executor generation and execution                                           |
| pingcap/tidb/distsql        | Send request to TiKV and aggregate return results from TiKV via TiKV Client |
| pingcap/tidb/store/tikv     | TiKV Client                                                                 |

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

With the above interfaces, you are able to do all the required operations on the data and complete all the SQL functions. However, for more efficient computing, we have also defined an advanced computing interface, which can focus on these three interfaces or struct:

* `Client`: Send request to storage engine
* `Request`: Payload of the request
* `Response`: Abstraction of result

## Summary

This section talks about the source structure of tidb and the architecture of three significant components. More details will be described in the later sections.
