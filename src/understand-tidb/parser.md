# Parser

The code for the parser lives in the [pingcap/parser](https://github.com/pingcap/parser/) repo.

The main file is `parser.y` which is used by [goyacc](https://pkg.go.dev/golang.org/x/tools/cmd/goyacc) to generate `parser.go`.

After making changes in the parser use `make` to update the parser and follow [this procedure](https://github.com/pingcap/parser/blob/master/docs/update-parser-for-tidb.md) to have TiDB use your copy of the parser. This can be a local copy or a copy on GitHub. This allows you to make changes to both the parser and TiDB and test them together.