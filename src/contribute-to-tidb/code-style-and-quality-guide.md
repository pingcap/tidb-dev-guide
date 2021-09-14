# TiDB Code Style and Quality Guide

This is an attempt to capture the code and quality standard that we want to maintain.

## The newtype pattern improves code quality

We can create a new type using the `type` keyword.

The newtype pattern is perhaps most often used in Golang to get around type restrictions rather than to try to create new ones. It is used to create different interface implementations for a type or to extend a builtin type or a type from an existing package with new methods.

However, it is generally useful to improve code clarity by marking that data has gone through either a validation or a transformation. Using a different type can reduce error handling and prevent improper usage.

```go
package main

import (
    "fmt"
    "strings"
)

type Email string

func newEmail(email string) (Email, error) {
    if !strings.Contains(email, "@") {
        return Email(""), fmt.Errorf("Expected @ in the email")
    }
    return Email(email), nil
}

func (email Email) Domain() string {
    return strings.Split(string(email), "@")[1]
}

func main() {
    ping, err := newEmail("go@pingcap.com")
    if err != nil { panic(err) }
    fmt.Println(ping.Domain())
}
```

## When to use value or pointer receiver

Because pointer receivers need to be used some of the time, Go programmers often use them all of the time.
This is a typical outline of Go code:

``` go
type struct S {}
func NewStruct() *S
func (s *S) structMethod()
```

Using pointers for the entire method set means we have to read the source code of every function to determine if it mutates the struct. Mutations are a source of error. This is particularly true in concurrent programs. We can contrast this with values: these are always concurrent safe.

For code clarity and bug reduction a best practice is to default to using values and value receivers.
However, pointer receivers are often required to satisfy an interface or for performance reasons, and this need overrides any default practice.

However, performance can favor either approach. One might assume that pointers would always perform better because it avoids copying. However, the performance is roughly the same for small structs in micro benchmark. This is because the copying is cheap, inlining can often avoid copying anyways, and pointer indirection has its own small cost. In a larger program with a goal of predictable low latency the value approach can be more favorable because it avoids [heap allocation and any additional GC overhead](https://segment.com/blog/allocation-efficiency-in-high-performance-go-services/).

As a rule of thumb is that when a struct has 10 or more words we should use pointer receivers. However, to actually know which is best for performance depends on how the struct is used in the program and must ultimately be determined by profiling. For example these are some factors that affect things:

* method size: small inlineable methods favor value receivers.
* Is the struct called repeatedly in a for loop? This favors pointer receivers.
* What is the GC behavior of the rest of the program? GC pressure may favor value receivers.

## Parallel For-Loop

There are two types of for loop on range: "with index" and "without index". Let's see an example for range with index.

```go
func TestRangeWithIndex(t *testing.T) {
	rows := []struct{ index int }{{index: 0}, {index: 1}, {index: 2}}
	for _, row := range rows {
		row.index += 10
	}
	for i, row := range rows {
		require.Equal(t, i+10, row.index)
	}
}
```

the output is:

```
    Error Trace:	version_test.go:39
    Error:      	Not equal: 
                    expected: 10
                    actual  : 0
    Test:       	TestShowRangeWithIndex
```

Test fails because when range with index, the loop iterator variable is the same instance of the variable with a clone of iteration target value.

### The same instance of the variable

Since the the loop iterator variable is the same instance of the variable, it may result in tricky error with parallel for-loop.

```go
done := make(chan bool)
values := []string{"a", "b", "c"}
for _, v := range values {
	go func() {
		fmt.Println(v)
		done <- true
	}()
}
for _ = range values {
	<-done
}
```

You might expect to see `a`, `b`, `c` as the output, but you'll probably see instead is `c`, `c`, `c`. 

This is because each iteration of the loop uses the same instance of the variable `v`, so each closure shares that single variable.

This is the same reason which result wrong test when use `t.Parallel()` with range, which is covered in [Parallel section of Write and run unit tests](../get-started/write-and-run-unit-tests.md#parallel)

### A clone of iteration target value

Since the loop iterator variable is a clone of iteration target value, it may result in logic error. It can also lead to performance issue compared with none-index range loop or bare for loop.

```go
type Item struct {
	id  int
	value [1024]byte
}

func BenchmarkRangeIndexStruct(b *testing.B) {
	var items [1024]Item
	for i := 0; i < b.N; i++ {
		var tmp int
		for k := range items {
			tmp = items[k].id
		}
		_ = tmp
	}
}

func BenchmarkRangeStruct(b *testing.B) {
	var items [1024]Item
	for i := 0; i < b.N; i++ {
		var tmp int
		for _, item := range items {
			tmp = item.id
		}
		_ = tmp
	}
}
```

```
BenchmarkRangeIndexStruct-12             4875518               246.0 ns/op
BenchmarkRangeStruct-12                    16171             77523 ns/op
```

You can see range with index is much slower than range without index, since range with index use cloned value so have big performance decrease if cloned value use lots of memory.
