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
