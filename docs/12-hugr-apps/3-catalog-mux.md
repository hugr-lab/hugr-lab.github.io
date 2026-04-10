---
title: CatalogMux API
sidebar_position: 4
description: Register scalar functions, table functions, tables, and table references using the CatalogMux handler framework.
---

# CatalogMux API

`CatalogMux` is the recommended way to build hugr app catalogs. It provides a handler-based API for registering functions and tables with automatic GraphQL SDL generation.

For lower-level control, you can register `catalog.Table`, `catalog.ScalarFunction`, `catalog.TableFunction` interfaces directly, or provide raw SDL.

All catalog interfaces are defined in the [`github.com/hugr-lab/airport-go/catalog`](https://github.com/hugr-lab/airport-go) package.

## Creating a CatalogMux

```go
import "github.com/hugr-lab/query-engine/client/app"

func (a *MyApp) Catalog(ctx context.Context) (catalog.Catalog, error) {
    mux := app.New()
    // register functions, tables, table functions...
    return mux, nil
}
```

---

## Scalar Functions

### Handler-based (simple)

Register with `HandleFunc`:

```go
err := mux.HandleFunc("default", "add",
    func(w *app.Result, r *app.Request) error {
        return w.Set(r.Int64("a") + r.Int64("b"))
    },
    app.Arg("a", app.Int64),
    app.Arg("b", app.Int64),
    app.Return(app.Int64),
    app.Desc("Add two numbers"),
)
```

**Parameters:**
- Schema name (`"default"` = top-level module, others = nested modules)
- Function name
- Handler function `func(w *Result, r *Request) error`
- Options: `Arg()`, `ArgDesc()`, `Return()`, `Desc()`, `Mutation()`

### Mutation functions

By default, scalar functions are exposed as GraphQL queries (extend the `Function` type) and called via `query { function { ... } }`. To register a function with side effects as a GraphQL mutation, add the `Mutation()` option — the function will extend `MutationFunction` and must be called via `mutation { function { ... } }`.

```go
err := mux.HandleFunc("default", "send_message",
    func(w *app.Result, r *app.Request) error {
        to := r.String("to")
        body := r.String("body")
        // perform side effect (send notification, update external system, etc.)
        return w.Set(fmt.Sprintf("sent to %s: %s", to, body))
    },
    app.Desc("Send a message to a recipient"),
    app.Arg("to", app.String),
    app.Arg("body", app.String),
    app.Return(app.String),
    app.Mutation(),
)
```

GraphQL call:

```graphql
mutation {
  function {
    my_app {
      send_message(to: "alice", body: "hello")
    }
  }
}
```

The same function is **not** callable via a query operation — it only appears under the `MutationFunction` type. The `Mutation()` option works in any schema, including nested ones (e.g., `schema "admin"` produces `mutation { function { my_app { admin { reset_counter } } } }`).

`Mutation()` only applies to scalar functions registered via `HandleFunc`. Table functions, tables, and table refs use their own write-enablement mechanisms (see the table sections below).

### Server-injected arguments (ArgFromContext)

Use `app.ArgFromContext(name, type, placeholder)` to declare a function argument whose value is injected from the request's auth context. The argument is hidden from the GraphQL schema — clients cannot see or set it. At handler execution time, read the value via `r.String(name)`, `r.Int64(name)`, etc., the same as a regular argument.

```go
err := mux.HandleFunc("default", "my_orders",
    func(w *app.Result, r *app.Request) error {
        userID := r.String("user_id") // injected from auth context
        limit := r.Int64("limit")
        // ... fetch orders for userID ...
        return w.Set("ok")
    },
    app.Arg("limit", app.Int64),
    app.ArgFromContext("user_id", app.String, "[$auth.user_id]"),
    app.Return(app.String),
)
```

GraphQL call:

```graphql
{ function { my_app { my_orders(limit: 10) } } }
```

The `user_id` argument is **not** in the public schema. The hugr planner injects the current user's ID into the SQL function call before invoking your handler.

**Allowed placeholders**:

| Placeholder | Source |
|-------------|--------|
| `[$auth.user_id]` | Authenticated user ID (string) |
| `[$auth.user_id_int]` | Authenticated user ID parsed as integer |
| `[$auth.user_name]` | Authenticated user display name |
| `[$auth.role]` | Authenticated role |
| `[$auth.auth_type]` | Auth method (`apiKey`, `jwt`, `oidc`, etc.) |
| `[$auth.provider]` | Auth provider name |
| `[$auth.impersonated_by_role]` | Original role when impersonating |
| `[$auth.impersonated_by_user_id]` | Original user ID when impersonating |
| `[$auth.impersonated_by_user_name]` | Original user name when impersonating |
| `[$catalog]` | Current catalog name |

If the auth context value is unavailable (e.g., anonymous request), the placeholder resolves to `NULL`. Your handler receives an empty/zero value via `r.String()` etc.

`ArgFromContext()` works for both scalar and table functions, in default and named schemas. Clients attempting to set a value for a server-injected argument receive a clear error: `argument "user_id" is server-injected and cannot be set by client`.

### Direct interface registration

For full control, implement `catalog.ScalarFunction` and register directly:

```go
mux.ScalarFunc("default", &myScalarFunc{})
```

```go
// catalog.ScalarFunction interface (from airport-go/catalog)
type ScalarFunction interface {
    Name() string
    Comment() string
    Signature() FunctionSignature
    Execute(ctx context.Context, input arrow.RecordBatch) (arrow.Array, error)
}

type FunctionSignature struct {
    Parameters []arrow.DataType
    ReturnType arrow.DataType
}
```

### With manual SDL

Wrap any scalar function with custom SDL:

```go
mux.ScalarFunc("default", app.WithScalarFuncSDL(&myFunc{}, `
    my_func(input: String!): String @function(name: "my_func")
`))
```

---

## Tables

### Direct interface registration

Implement `catalog.Table` and register:

```go
mux.Table("default", &ItemsTable{})
```

```go
// catalog.Table interface (from airport-go/catalog)
type Table interface {
    Name() string
    Comment() string
    ArrowSchema(columns []string) *arrow.Schema
    Scan(ctx context.Context, opts *ScanOptions) (array.RecordReader, error)
}
```

SDL is auto-generated from the Arrow schema. Mutable tables get `@table`, read-only get `@view`.

### Insertable / Updatable / Deletable Tables

To enable GraphQL mutations, implement additional interfaces:

```go
// Enable INSERT mutations
type InsertableTable interface {
    Table
    Insert(ctx context.Context, rows array.RecordReader, opts *DMLOptions) (*DMLResult, error)
}

// Enable UPDATE mutations
type UpdatableTable interface {
    Table
    Update(ctx context.Context, rowIDs []int64, rows array.RecordReader, opts *DMLOptions) (*DMLResult, error)
}

// Enable DELETE mutations
type DeletableTable interface {
    Table
    Delete(ctx context.Context, rowIDs []int64, opts *DMLOptions) (*DMLResult, error)
}
```

Example:

```go
type OrdersTable struct{}

func (t *OrdersTable) Name() string { return "orders" }
// ... ArrowSchema, Scan ...

func (t *OrdersTable) Insert(ctx context.Context, rows array.RecordReader, opts *catalog.DMLOptions) (*catalog.DMLResult, error) {
    // insert logic
    return &catalog.DMLResult{AffectedRows: 1}, nil
}

// Register — auto-detected as insertable
mux.Table("default", &OrdersTable{})
```

### Schema Options for Tables

```go
mux.Table("default", &myTable{},
    app.WithDescription("My table description"),
    app.WithPK("id"),
    app.WithFieldDescription("name", "User display name"),
    app.WithFilterRequired("tenant_id"),
    app.WithReferences("orders", []string{"id"}, []string{"user_id"}, "users", "orders"),
)
```

| Option | Description |
|--------|-------------|
| `WithDescription(desc)` | Table description |
| `WithPK(fields...)` | Primary key fields |
| `WithFieldDescription(field, desc)` | Field-level description |
| `WithFilterRequired(fields...)` | Fields required in filters |
| `WithReferences(name, srcFields, refFields, query, refQuery)` | Add @references relation |
| `WithM2MReferences(...)` | Many-to-many reference |
| `WithFieldReferences(fieldName, refName, query, refQuery)` | Field-level reference |
| `WithRawSDL(sdl)` | Override auto-generated SDL entirely |

### With manual SDL

```go
mux.Table("default", app.WithSDL(&myTable{}, `
type orders @table(name: "orders") {
    id: Int! @pk
    customer: String!
    total: Float!
    created_at: Timestamp
}
`))
```

---

## Table Functions (Parameterized Views)

Table functions are tables that accept arguments — useful for search, filtering, paginated views.

### Handler-based (simple)

```go
err := mux.HandleTableFunc("default", "search",
    func(w *app.Result, r *app.Request) error {
        query := r.String("query")
        for _, item := range items {
            if strings.Contains(item.Name, query) {
                w.Append(item.ID, item.Name)
            }
        }
        return nil
    },
    app.Arg("query", app.String),
    app.ColPK("id", app.Int64),
    app.Col("name", app.String),
    app.ColDesc("score", app.Float64, "Relevance score"),
    app.ColNullable("details", app.String),
)
```

**Column options:**
- `Col(name, type)` — regular column
- `ColPK(name, type)` — primary key column
- `ColNullable(name, type)` — nullable column
- `ColDesc(name, type, description)` — column with description

### Direct interface registration

```go
mux.TableFunc("default", &myTableFunc{})
```

```go
// catalog.TableFunction interface (from airport-go/catalog)
type TableFunction interface {
    Name() string
    Comment() string
    Signature() FunctionSignature
    SchemaForParameters(ctx context.Context, params []any) (*arrow.Schema, error)
    Execute(ctx context.Context, params []any, opts *ScanOptions) (array.RecordReader, error)
}
```

### TableFunctionInOut

For functions that transform input row sets:

```go
mux.TableFuncInOut("default", &myTransformFunc{})
```

```go
// catalog.TableFunctionInOut interface (from airport-go/catalog)
type TableFunctionInOut interface {
    Name() string
    Comment() string
    Signature() FunctionSignature
    SchemaForParameters(ctx context.Context, params []any, inputSchema *arrow.Schema) (*arrow.Schema, error)
    Execute(ctx context.Context, params []any, input array.RecordReader, opts *ScanOptions) (array.RecordReader, error)
}
```

---

## Table References

Table references delegate execution to DuckDB function calls — useful for wrapping existing DuckDB table functions:

```go
mux.TableRef("default", &myTableRef{})
```

```go
// catalog.TableRef interface (from airport-go/catalog)
type TableRef interface {
    Name() string
    Comment() string
    ArrowSchema() *arrow.Schema
    FunctionCalls(ctx context.Context, req *FunctionCallRequest) ([]FunctionCall, error)
}
```

---

## Manual SDL

### Global SDL override

Replace all auto-generated SDL with custom SDL:

```go
mux := app.New()
mux.WithSDL(`
type users @table(name: "users") {
    id: Int! @pk
    name: String!
    email: String!
}

type orders @view(name: "orders") {
    id: Int! @pk
    user_id: Int!
    total: Float!
}
`)
```

### Per-item SDL wrapping

Attach custom SDL to individual items:

```go
// Table with custom SDL
mux.Table("default", app.WithSDL(&myTable{}, `type ... @table(...) { ... }`))

// Table ref with custom SDL
mux.TableRef("default", app.WithTableRefSDL(&myRef{}, `type ... @view(...) { ... }`))

// Scalar function with custom SDL
mux.ScalarFunc("default", app.WithScalarFuncSDL(&myFunc{}, `my_func(...): String @function(...)`))

// Table function with custom SDL
mux.TableFunc("default", app.WithTableFuncSDL(&myTF{}, `type ... @view(...) { ... }`))
```

---

## Type Constants

| Type constant | GraphQL type | Arrow type | Go type |
|--------------|-------------|-----------|---------|
| `app.Boolean` | `Boolean` | `Boolean` | `bool` |
| `app.Int8` | `Int` | `Int8` | `int8` |
| `app.Int16` | `Int` | `Int16` | `int16` |
| `app.Int32` | `Int` | `Int32` | `int32` |
| `app.Int64` | `BigInt` | `Int64` | `int64` |
| `app.Uint8` | `UInt` | `Uint8` | `uint8` |
| `app.Uint16` | `UInt` | `Uint16` | `uint16` |
| `app.Uint32` | `UInt` | `Uint32` | `uint32` |
| `app.Uint64` | `BigUInt` | `Uint64` | `uint64` |
| `app.Float32` | `Float` | `Float32` | `float32` |
| `app.Float64` | `Float` | `Float64` | `float64` |
| `app.String` | `String` | `String` | `string` |
| `app.Timestamp` | `DateTime` | `Timestamp_us` | `time.Time` |
| `app.Date` | `Date` | `Date32` | `time.Time` |
| `app.Geometry` | `Geometry` | `GeometryExtension` | `orb.Geometry` |

## Request Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `r.Bool(name)` | `bool` | Boolean argument |
| `r.Int8(name)` | `int8` | 8-bit integer |
| `r.Int16(name)` | `int16` | 16-bit integer |
| `r.Int32(name)` | `int32` | 32-bit integer |
| `r.Int64(name)` | `int64` | 64-bit integer |
| `r.Uint8(name)` | `uint8` | Unsigned 8-bit |
| `r.Uint16(name)` | `uint16` | Unsigned 16-bit |
| `r.Uint32(name)` | `uint32` | Unsigned 32-bit |
| `r.Uint64(name)` | `uint64` | Unsigned 64-bit |
| `r.Float32(name)` | `float32` | 32-bit float |
| `r.Float64(name)` | `float64` | 64-bit float |
| `r.String(name)` | `string` | String argument |
| `r.Bytes(name)` | `[]byte` | Binary data |
| `r.Geometry(name)` | `orb.Geometry` | Geometry value |
| `r.Get(name)` | `any` | Raw value (any type) |
| `r.Context()` | `context.Context` | Request context |

---

## Schemas (Modules)

The first argument to all registration methods is the schema name:

- `"default"` — top-level app module (no extra nesting)
- Any other name — nested module: `{ app_name { schema_name { ... } } }`

```go
// Top-level: { function { my_app { add(...) } } }
mux.HandleFunc("default", "add", ...)

// Nested: { function { my_app { admin { user_count } } } }
mux.HandleFunc("admin", "user_count", ...)
```

See [Schema Design](./5-schema-design.md) for details.

## GraphQL Query Paths

| Registration | GraphQL Path |
|-------------|-------------|
| `HandleFunc("default", "add", ...)` | `{ function { app_name { add(...) } } }` |
| `HandleFunc("default", "send", ..., app.Mutation())` | `mutation { function { app_name { send(...) } } }` |
| `HandleFunc("admin", "count", ...)` | `{ function { app_name { admin { count } } } }` |
| `HandleFunc("admin", "reset", ..., app.Mutation())` | `mutation { function { app_name { admin { reset } } } }` |
| `Table("default", &items{})` | `{ app_name { items { ... } } }` |
| `HandleTableFunc("default", "search", ...)` | `{ app_name { search(args: {...}) { ... } } }` |
| `HandleTableFunc("reports", "daily", ...)` | `{ app_name { reports { reports_daily(args: {...}) { ... } } } }` |
