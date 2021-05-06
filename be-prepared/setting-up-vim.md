# Setting up Vim

## macOS

Vim requirement:

* version &gt;= 7.4
* python3 enabled

### Recommended plugins

* [fatih/vim-go](https://github.com/fatih/vim-go): this plugin adds Go language support for Vim, with lots of features, like:
  * Compile your package with `:GoBuild`, install it with `:GoInstall` or test it with `:GoTest`. Run a single test with `:GoTestFunc`\).
  * Quickly execute your current file\(s\) with `:GoRun`.
  * Improved syntax highlighting and folding.
* [ycm-core/YouCompleteMe](https://github.com/ycm-core/YouCompleteMe): YouCompleteMe is a fast, as-you-type, fuzzy-search code completion, comprehension and refactoring engine for Vim.

If you are using [vim-plug](https://github.com/junegunn/vim-plug) to management your vim plugins, you can add the following lines to your `.vimrc`:

```text
Plug 'fatih/vim-go', {'do': ':GoInstallBinaries'}
Plug 'Valloric/YouCompleteMe',  {'for': ['c', 'cpp', 'go', 'java', 'python'], 'do': './install.py'}
```



