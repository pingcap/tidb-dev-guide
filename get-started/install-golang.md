# Install Golang

To build TiDB from source code, you need to install Go in your development environment first. If Go is not installed yet, you can follow the instructions in this document for installation.

## TL;DR

* Install Go 1.13
* Manage Go toolchain using gvm

## Install Go 1.13

Most TiDB developers are using Linux or MacOS. If you are using Windows 10, to have a better experience, it is recommended to [install Windows Subsystem for Linux 2 (WSL2)](https://docs.microsoft.com/en-us/windows/wsl/install-win10) on Windows 10 first. TiDB should compile and run on Windows 10, but it is not expected to be deployed on Windows, where you might encounter many compatibility problems. In that case, you can either figure out the solutions on your own or share the problems on our [forum](https://internals.tidb.io/).

Currently, TiDB uses Go 1.13 to compile the code, but we plan to upgrade the compiler to Go 1.16 in the near future. To install Go 1.13, go to [Go's download page](https://golang.org/dl/), choose version 1.13, and then follow the [install instruction](https://golang.org/doc/install).

## Manage Go toolchain using gvm

We might update the compiler version of TiDB in the near future. If you are using Linux or MacOS, to manage Go versions in an easy way, you are recommended to try [Go Version Manager (gvm)](https://github.com/moovweb/gvm).

To install gvm, use

```bash
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
```

Change `base` to `zsh` if you are using `zsh`.

Once you have gvm installed, you can have many different Go compilers with different versions managed by it. First of all, install Go1.13 and set it as default

```bash
gvm install go1.13
gvm use go1.13 --default
```

In the future, if we upgrade the compiler to Go1.16, you can then change `go1.13` to `go1.16` on the above two commands and rerun them, and you are then all set.

For now, you can type `go version` in the shell to verify the installation.

In the next chapter, you will learn how to obtain the source code of TiDB and how to build it.

If you encounter any problems during your journey, do not hesitate to reach out on our developer forum at [https://internals.tidb.io/](https://internals.tidb.io/).
