# Install Golang

To build TiDB from source code, you need to install Go in your development environment first. If Go is not installed yet, you can follow the instructions in this document for installation.

## Install Go 1.16

Currently, TiDB uses Go 1.16 to compile the code. To install Go 1.16, go to [Go's download page](https://golang.org/dl/), choose version 1.16, and then follow the [installation instructions](https://golang.org/doc/install).

## Manage the Go toolchain using gvm

If you are using Linux or MacOS, you can manage Go versions with [Go Version Manager (gvm)](https://github.com/moovweb/gvm) easily.

To install gvm, run the following command:

```bash
curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer | sh
```

Once you have gvm installed, you can use it to manage multiple different Go compilers with different versions. Let's install Go 1.16 and set it as default:

```bash
gvm install go1.16
gvm use go1.16 --default
```

Now, you can type `go version` in the shell to verify the installation:

```bash
go version
# OUTPUT:
# go version go1.16 linux/amd64
```

In the next chapter, you will learn how to obtain the TiDB source code and how to build it.

If you encounter any problems during your journey, do not hesitate to reach out on the [TiDB Internals forum](https://internals.tidb.io/).
