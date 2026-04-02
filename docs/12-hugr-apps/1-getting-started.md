---
title: Getting Started
sidebar_position: 2
description: Create your first hugr app with a scalar function and a table in 10 minutes.
---

# Getting Started

This guide walks you through creating a minimal hugr app that exposes a scalar function and a static table into hugr's GraphQL schema.

## Prerequisites

- Go 1.26+ installed
- A running hugr instance (e.g. `dev-server` on `localhost:15100`)

## 1. Create a new Go project

```bash
mkdir my-hugr-app && cd my-hugr-app
go mod init my-hugr-app
go get github.com/hugr-lab/query-engine/client@latest
```

## 2. Write the application

Create `main.go`:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"

    "github.com/apache/arrow-go/v18/arrow"
    "github.com/apache/arrow-go/v18/arrow/array"
    "github.com/apache/arrow-go/v18/arrow/memory"
    "github.com/hugr-lab/airport-go/catalog"
    "github.com/hugr-lab/query-engine/client"
    "github.com/hugr-lab/query-engine/client/app"
)

func main() {
    ctx, cancel := signal.NotifyContext(context.Background(),
        syscall.SIGINT, syscall.SIGTERM)
    defer cancel()

    hugrURL := os.Getenv("HUGR_URL")
    if hugrURL == "" {
        hugrURL = "http://localhost:15100/ipc"
    }

    c := client.NewClient(hugrURL)
    myApp := &MyApp{}
    if err := c.RunApplication(ctx, myApp); err != nil {
        log.Fatal(err)
    }
}

type MyApp struct{}

func (a *MyApp) Info() app.AppInfo {
    return app.AppInfo{
        Name:        "my_app",
        Description: "My first hugr app",
        Version:     "1.0.0",
        URI:         "grpc://localhost:50051",
    }
}

func (a *MyApp) Listner() (net.Listener, error) {
    return net.Listen("tcp", "0.0.0.0:50051")
}

func (a *MyApp) Init(ctx context.Context) error {
    log.Println("App initialized")
    return nil
}

func (a *MyApp) Shutdown(ctx context.Context) error {
    log.Println("App shutting down")
    return nil
}

func (a *MyApp) Catalog(ctx context.Context) (catalog.Catalog, error) {
    mux := app.New()

    // Register a scalar function: add(a, b) -> Int64
    err := mux.HandleFunc("default", "add",
        func(w *app.Result, r *app.Request) error {
            return w.Set(r.Int64("a") + r.Int64("b"))
        },
        app.Arg("a", app.Int64),
        app.Arg("b", app.Int64),
        app.Return(app.Int64),
    )
    if err != nil {
        return nil, err
    }

    // Register a static table: items(id, name)
    mux.Table("default", &ItemsTable{})

    return mux, nil
}

// ItemsTable implements catalog.Table
type ItemsTable struct{}

func (t *ItemsTable) Name() string    { return "items" }
func (t *ItemsTable) Comment() string { return "Static items" }

func (t *ItemsTable) ArrowSchema(columns []string) *arrow.Schema {
    return arrow.NewSchema([]arrow.Field{
        {Name: "id", Type: arrow.PrimitiveTypes.Int64, Nullable: false},
        {Name: "name", Type: arrow.BinaryTypes.String, Nullable: false},
    }, nil)
}

func (t *ItemsTable) Scan(ctx context.Context, opts *catalog.ScanOptions) (array.RecordReader, error) {
    schema := t.ArrowSchema(nil)
    mem := memory.DefaultAllocator
    bldr := array.NewRecordBuilder(mem, schema)
    defer bldr.Release()

    bldr.Field(0).(*array.Int64Builder).AppendValues([]int64{1, 2, 3}, nil)
    bldr.Field(1).(*array.StringBuilder).AppendValues([]string{"alpha", "beta", "gamma"}, nil)

    rec := bldr.NewRecord()
    return array.NewRecordReader(schema, []arrow.Record{rec})
}
```

## 3. Run the app

```bash
# Start hugr first (in another terminal):
# dev-server

# Then run your app:
go run main.go
```

You should see:

```
INFO starting application server name=my_app uri=grpc://localhost:50051
INFO application server started and registered with Hugr name=my_app
```

## 4. Query via GraphQL

**Scalar function:**

```graphql
{
  function {
    my_app {
      add(a: 10, b: 20)
    }
  }
}
```

Response: `{"data": {"function": {"my_app": {"add": 30}}}}`

**Table:**

```graphql
{
  my_app {
    items {
      id
      name
    }
  }
}
```

Response:

```json
{
  "data": {
    "my_app": {
      "items": [
        {"id": 1, "name": "alpha"},
        {"id": 2, "name": "beta"},
        {"id": 3, "name": "gamma"}
      ]
    }
  }
}
```

## What's next?

- [Application Interfaces](./2-interfaces.md) — learn about `DataSourceUser`, `DBInitializer`, and other interfaces
- [CatalogMux API](./3-catalog-mux.md) — register table functions, use options, set descriptions
- [Data Sources](./4-data-sources.md) — add a PostgreSQL database to your app
- [Schema Design](./5-schema-design.md) — organize with named schemas and modules
