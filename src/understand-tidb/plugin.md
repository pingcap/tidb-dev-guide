# Plugin

The plugin API allows TiDB to be extended with new features such as audit logging or IP allow/deny listing.

Sample code is provided for a basic audit logging plugin at [`./tidb/plugin/conn_ip_example/`](https://github.com/pingcap/tidb/tree/master/plugin/conn_ip_example). For an example on compiling TiDB and this plugin:

```bash
plugin="conn_ip_example"
cd cmd/pluginpkg
go install
cd ../../plugin/$plugin
pluginpkg -pkg-dir . -out-dir .
cd ../..
 
./bin/tidb-server -plugin-dir /path/to/tidb/plugin/$plugin -plugin-load $plugin-1
```

An explanation of what this does:

- `cd cmd/pluginpkg` and `go install` compiles the command line utility called `pluginpkg`, which is used to build the plugin.
- `pluginpkg -pkg-dir . -out-dir .` reads the plugin code + `manifest.toml` file and generates a shared object file for the plugin (`conn_ip_example-1.so`).
- When the tidb-server starts, it can load plugins in a specified directory (`plugin-dir`).

## Customizing the example plugin

The manifest file describes the capabilities of the plugin, and which features it implements. For a basic version:

```toml
name = "conn_ip_example"
kind = "Audit"
description = "just a test"
version = "1"
license = ""
validate = "Validate"
onInit = "OnInit"
onShutdown = "OnShutdown"
export = [
    {extPoint="OnGeneralEvent", impl="OnGeneralEvent"},
    {extPoint="OnConnectionEvent", impl="OnConnectionEvent"}
]
```

In addition to this basic example, plugins can also implement an `OnFlush` function. This is called when the statement `FLUSH TIDB PLUGINS pluginName` is executed. TiDB does not require plugins to implement a `OnFlush` function, but when specified it will call this method on all TiDB nodes in the cluster.

### OnConnectionEvent

The `OnConnectionEvent` is called when a new connection is initially created (`event plugin.ConnectionEvent == plugin.PreAuth`) and again when the connection is successfully established (`event plugin.ConnectionEvent == plugin.Connected`).

To prevent a connection from being created, an error should be returned for the event `plugin.PreAuth`.

### OnGeneralEvent

The `OnGeneralEvent` is currently called when a statement has finished executing, and thus the API does not currently allow plugins to prevent a statement from being executed.

General events are useful for audting operations performed by users. Because [`sctx SessionVars`](https://github.com/pingcap/tidb/blob/b2a1d21284b75e3137f499d8954071a7b32f7b3b/sessionctx/variable/session.go#L432-L436) is available in the `OnGeneralEvent` function, it is possible to obtain a lot of additional information about the statement being executed. For example:

* `sctx.User` contains the `*auth.UserIdentity` of the user who is executing this session, and `sctx.ActiveRoles` contains the list of active roles associated with the session.
* `sctx.DBName` contains the name of the database the user is executing in.
* `sctx.StmtCtx` contains the context of the statement that was executed. For example `sctx.StmtCtx.SQLDigest()` can be called to get a digest of the executed statement, and `sctx.StmtCtx.Tables` contains a slice of tables that are accessed by the statement.

## Additional Reading

* [Plugin Framework RFC Proposal](https://github.com/pingcap/tidb/blob/master/docs/design/2018-12-10-plugin-framework.md)
