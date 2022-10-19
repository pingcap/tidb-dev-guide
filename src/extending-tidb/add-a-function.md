# Add a function

To add a builtin function to TiDB the best practice is to look at MySQL first and try to implement the function in such a way that it is commpatible. Avoid adding functions that are already deprecated in MySQL or that might soon be deprecrated.

Here we will implement a `HELLO()` function that has one argument that is a string.

```
sql> SELECT HELLO("world");
ERROR: 1305 (42000): FUNCTION test.hello does not exist
```

The first step is to define the name of the function in `parser/ast/functions.go`:
```go
// List scalar function names.
const (
...
        Hello = "hello"
)
```

This links `ast.Hello` with "hello". Note that the lookup for the function is done with the lowercase name, so always use the lowercase name, otherwise it won't find the function.

The next step is to modify `expression/builtin.go`

```go
var funcs = map[string]functionClass{
...
        ast.Hello: &helloFunctionClass{baseFunctionClass{ast.Hello, 1, 1}},
}
```

Now we need to define `helloFunctionClass`. We will do this in `expression/builtin_string.go`. The functions are organised in multiple files, pick the one that fits best.

```go
var (
...
        _ functionClass = &helloFunctionClass{}
)
...
var (
        _ builtinFunc = &builtinHelloSig{}
)
...
type helloFunctionClass struct {
        baseFunctionClass
}

func (c *helloFunctionClass) getFunction(ctx sessionctx.Context, args []Expression) (builtinFunc, error) {
        if err := c.verifyArgs(args); err != nil {
                return nil, err
        }
        bf, err := newBaseBuiltinFuncWithTp(ctx, c.funcName, args, types.ETString, types.ETString)
        if err != nil {
                return nil, err
        }
        sig := &builtinHelloSig{bf}
        return sig, nil
}

type builtinHelloSig struct {
        baseBuiltinFunc
}

func (b *builtinHelloSig) Clone() builtinFunc {
        newSig := &builtinHelloSig{}
        newSig.cloneFrom(&b.baseBuiltinFunc)
        return newSig
}

func (b *builtinHelloSig) evalString(row chunk.Row) (name string, isNull bool, err error) {
        name, isNull, err = b.args[0].EvalString(b.ctx, row)
        if isNull || err != nil {
                return name, isNull, err
        }
        return "hello " + name, false, nil
}
```

The `getFunction()` method can return different functions depending on the type and number of arguments. This example always returns the same function that has one string argument and returns a string.

Here `evalString()` gets called for every row. If the function returns an integer you have to use `evalInt` and there are also functions for Decimal, Real, Time and JSON.


The final result:

```
sql> SELECT HELLO("world");
+----------------+
| HELLO("world") |
+----------------+
| hello world    |
+----------------+
1 row in set (0.0007 sec)
```

To show the function with multiple rows:

```
sql> WITH names AS (SELECT "Europe" AS "name" UNION ALL SELECT "America" UNION ALL SELECT "China")
   -> SELECT HELLO(name) FROM names;
+---------------+
| HELLO(name)   |
+---------------+
| hello Europe  |
| hello America |
| hello China   |
+---------------+
3 rows in set (0.0008 sec)
```

For testing have a look at `expression/builtin_string_test.go`