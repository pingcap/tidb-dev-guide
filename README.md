# TiDB Development Guide

This repository contains the source of TiDB Development Guide.

* The target audience of this guide is TiDB contributors, both new and experienced.
* The objective of this guide is to help contributors become an expert of TiDB, who is familiar with its design and implementation and thus is able to use it fluently in the real world as well as develop TiDB itself deeply.

## Requirements

Building the book requires [mdBook](https://github.com/rust-lang-nursery/mdBook). To get it:

```bash
$ cargo install mdbook
```

## Building

To build the book, type:

```bash
$ mdbook build
```

The output will be in the `book` subdirectory. To check it out, open it in
your web browser.

_Firefox:_
```bash
$ firefox book/html/index.html                       # Linux
$ open -a "Firefox" book/html/index.html             # OS X
$ Start-Process "firefox.exe" .\book\html\index.html # Windows (PowerShell)
$ start firefox.exe .\book\html\index.html           # Windows (Cmd)
```

_Chrome:_
```bash
$ google-chrome book/html/index.html                 # Linux
$ open -a "Google Chrome" book/html/index.html       # OS X
$ Start-Process "chrome.exe" .\book\html\index.html  # Windows (PowerShell)
$ start chrome.exe .\book\html\index.html            # Windows (Cmd)
```

## Contribute to this guide

See [CONTRIBUTING](CONTRIBUTING.md) for details.
