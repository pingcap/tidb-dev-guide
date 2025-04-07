# Install Golang

To build TiDB from source code, you need to install Go in your development environment first. If Go is not installed yet, you can follow the instructions in this document for installation.

## Install Go

TiDB periodically upgrades its Go version to keep up with Golang. Currently, upgrade plans are announced on [TiDB Internals forum](https://internals.tidb.io/tags/c/general/announcement).

To get the right version of Go, take a look at the [`go.mod` file in TiDB's repository](https://github.com/pingcap/tidb/blob/master/go.mod). You should see that there is a line like `go 1.21` (the number may be different) in the first few lines of this file. You can also run the following command to get the Go version:

```bash
curl -s -S -L https://github.com/pingcap/tidb/blob/master/go.mod | grep -Eo "\"go [[:digit:]]+(\.[[:digit:]]+)+\""
```

Now that you've got the version number, go to [Go's download page](https://golang.org/dl/), choose the corresponding version, and then follow the [installation instructions](https://golang.org/doc/install).

## Manage the Go toolchain using gvm

If you are using Linux or MacOS, you can manage Go versions with [Go Version Manager (gvm)](https://github.com/moovweb/gvm) easily.

To install gvm, run the following command:

```bash
curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer | sh
```

Once you have gvm installed, you can use it to manage multiple different Go compilers with different versions. Let's install the corresponding Go version and set it as default:

```bash
TIDB_GOVERSION=$(curl -s -S -L https://github.com/pingcap/tidb/blob/master/go.mod | grep -Eo "\"go [[:digit:]]+(\.[[:digit:]]+)+\"" | grep -Eo "[[:digit:]]+\.[[:digit:]]+(\.[[:digit:]]+)?")
gvm install go${TIDB_GOVERSION}
gvm use go${TIDB_GOVERSION} --default
```

Now, you can type `go version` in the shell to verify the installation:

```bash
go version
# Note: In your case, the version number might not be '1.21', it should be the
#   same as the value of ${TIDB_GOVERSION}.
#
# OUTPUT:
# go version go1.21 linux/amd64
```

In the next chapter, you will learn how to obtain the TiDB source code and how to build it.

If you encounter any problems during your journey, do not hesitate to reach out on the [TiDB Internals forum](https://internals.tidb.io/).
