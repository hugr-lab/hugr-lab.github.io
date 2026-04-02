---
title: Schema Design
sidebar_position: 6
description: How app schemas map to GraphQL modules — default schema, named schemas, naming conventions.
---

# Schema Design

Hugr apps organize their API using **schemas** which map to GraphQL **modules** (nested types).

## Default Schema

Functions and tables registered under the `"default"` schema appear at the app's top-level module — no extra nesting.

```go
mux.HandleFunc("default", "add", handler, ...)
mux.Table("default", &ItemsTable{})
```

```graphql
# Functions at: function → app_name → add
{ function { my_app { add(a: 1, b: 2) } } }

# Tables at: app_name → items
{ my_app { items { id name } } }
```

You can customize the default schema name via `AppInfo.DefaultSchema`:

```go
func (a *MyApp) Info() app.AppInfo {
    return app.AppInfo{
        Name:          "my_app",
        DefaultSchema: "main",  // "main" schema = top-level (instead of "default")
        // ...
    }
}
```

## Named Schemas (Nested Modules)

Any non-default schema creates a nested module:

```go
mux.HandleFunc("admin", "user_count", handler, ...)
mux.HandleTableFunc("admin", "audit", handler, ...)
```

```graphql
# Functions: function → app_name → schema_name → function_name
{ function { my_app { admin { user_count } } } }

# Table functions: app_name → schema_name → table_function_name
{ my_app { admin { admin_audit(args: { limit: 10 }) { id action } } } }
```

## Naming Conventions

### App Name → GraphQL Module

The app name becomes the top-level GraphQL module:

| App Name | Module Path |
|----------|-------------|
| `my_app` | `{ my_app { ... } }` |
| `analytics` | `{ analytics { ... } }` |

### DS Name → Sub-Module

Data source names use dot notation: `appName.dsName`:

| DS Registration | GraphQL Path |
|----------------|-------------|
| `my_app.store` | `{ my_app { store { ... } } }` |
| `my_app.logs` | `{ my_app { logs { ... } } }` |

### Table Functions in Named Schemas

Table functions in named schemas get a prefixed name to avoid collisions:

| Schema | Name | GraphQL Field |
|--------|------|--------------|
| `default` | `search` | `search` |
| `admin` | `audit` | `admin_audit` |
| `reports` | `daily` | `reports_daily` |

## Reserved Names

These names cannot be used as app names:

- `function` — conflicts with Function root type
- `mutation_function` — conflicts with MutationFunction root type
- `core` — reserved for system functions
- `_system` — reserved for internal use
- Names starting with `_` — reserved

## Example: Multi-Schema App

```go
func (a *MyApp) Catalog(ctx context.Context) (catalog.Catalog, error) {
    mux := app.New()

    // Default schema — top-level
    mux.HandleFunc("default", "version", versionHandler, app.Return(app.String))
    mux.Table("default", &UsersTable{})

    // Admin schema — nested module
    mux.HandleFunc("admin", "stats", statsHandler, app.Return(app.Int64))
    mux.HandleTableFunc("admin", "logs", logsHandler, ...)

    // Reports schema — another nested module
    mux.HandleTableFunc("reports", "daily", dailyHandler, ...)

    return mux, nil
}
```

GraphQL schema:

```graphql
# Functions
{ function { my_app { version } } }
{ function { my_app { admin { stats } } } }

# Tables and table functions
{ my_app { users { id name } } }
{ my_app { admin { admin_logs(args: {...}) { ... } } } }
{ my_app { reports { reports_daily(args: {...}) { ... } } } }
```
