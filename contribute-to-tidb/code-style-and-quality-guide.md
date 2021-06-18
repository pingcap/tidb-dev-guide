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

## Consider using values instead of pointers

Many Go programmers over-use pointers as opposed to just using values directly. Go programs often return pointers to structs with a wrapper and then all functions use the struct as a pointer:

``` go
type struct S {}; func NewStruct() *S

func (s *S) structMethod()
```

Using pointers for the entire method set means we can no longer differentiate by the method signature when a function mutates the struct and when it simply reads data. This increases the chances of errors due to the struct ending up in an unintended state.

Consider whether you can use the struct directly without a pointer. The main reason not to do this is to be able to meet the requirements of an interface.

One might assume that pointers would always perform better. However, this is only the case for methods that are called frequently (generally in a for loop) or if the struct is very large. For infrequently accessed code and smaller structs, copying structs can actually perform significantly better because they avoid any GC overhead.
