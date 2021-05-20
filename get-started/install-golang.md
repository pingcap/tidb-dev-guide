# Install Golang

In order to build TiDB from source code, you need to have Go installed on your development environment.

Most of TiDB developers are using Linux or MacOS, but if you are using Windows 10, you might want to have [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install-win10) prepared for better experience, although TiDB should compile and run on Windows 10, it is not expected to be deployed on Windows, and you might have to figure out many troubles on your own (although you are welcomed to share them on our [forum](https://internals.tidb.io/)).


TiDB currently used Go1.13 to compile, but we have plan to upgrade the compiler to Go1.16 recently. You can of course go to [Go's download page](https://golang.org/dl/) and choose the version 1.13 and follow the [install instruction](https://golang.org/doc/install) to get the compiler installed.

However, since we might update the compiler version in the near future, if you are under Linux or MacOS you are strongly suggested to try [gvm](https://github.com/moovweb/gvm) which stands for Go Version Manager.

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

