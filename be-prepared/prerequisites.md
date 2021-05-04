# Prerequisites

Before getting a copy of the source code and building it, you may need to install the following things:

* `git`
* `go`:1.13

## macOS

### Install `git`:

```bash
brew install git
```

### Install `go` 1.13:

Download go binary package and unarchive it:

```bash
wget https://golang.org/dl/go1.13.15.darwin-amd64.tar.gz
tar zxf go1.13.15.darwin-amd64.tar.gz
```

Set `GOHOME` and `GOPATH` and `PATH` environment variables in your `.bash_profile` or `.zshrc` file:

```bash
GOROOT=/path/to/your/goroot
GOPATH=/path/to/your/gopath
PATH=$GOPATH/bin:$GOROOT/bin:$PATH
```

## Linux

## Windows

## References

1. [Download and install](https://golang.org/doc/install)
2. [How to Write Go Code \(with GOPATH\)](https://golang.org/doc/gopath_code)

