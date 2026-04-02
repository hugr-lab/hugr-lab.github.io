---
title: Application Interfaces
sidebar_position: 3
description: Reference for Application, DataSourceUser, DBInitializer, DBMigrator, and other interfaces.
---

# Application Interfaces

Hugr apps are built by implementing Go interfaces. The only required interface is `Application`; all others are optional and enable additional capabilities.

## Application (required)

Every hugr app must implement `Application`:

```go
type Application interface {
    Info() AppInfo
    Listner() (net.Listener, error)
    Init(ctx context.Context) error
    Shutdown(ctx context.Context) error
    Catalog(ctx context.Context) (catalog.Catalog, error)
}
```

| Method | Description |
|--------|-------------|
| `Info()` | Returns app metadata: name, description, version, URI |
| `Listner()` | Creates the TCP listener for the gRPC server |
| `Init(ctx)` | Called after all data sources are provisioned and loaded. Use to verify DB access, warm caches, etc. |
| `Shutdown(ctx)` | Called on graceful shutdown before unloading from hugr |
| `Catalog(ctx)` | Returns the app's catalog (functions, tables). Use `CatalogMux` for the handler-based approach |

### AppInfo

```go
type AppInfo struct {
    Name        string // Unique app name (becomes GraphQL module)
    Description string // Human-readable description
    Version     string // Semantic version (triggers migrations on change)
    URI         string // gRPC endpoint: grpc://host:port or grpc+tls://host:port
    DefaultSchema string // Schema name that maps to top-level module (default: "default")
}
```

**Name rules:**
- Cannot start with `_` or a digit
- Cannot contain spaces or special characters (except `.`, `-`, `_`)
- Reserved names: `function`, `core`, `mutation_function`, `_system`

## DataSourceUser (optional)

Implement to declare data sources that hugr provisions and mounts as sub-modules. Any hugr-supported data source type can be used (postgres, duckdb, mysql, mssql, http, etc.). Schema initialization and migrations are currently supported only for PostgreSQL.

```go
type DataSourceUser interface {
    DataSources(ctx context.Context) ([]DataSourceInfo, error)
}
```

```go
type DataSourceInfo struct {
    Name        string // Short name (becomes appName.dsName in hugr)
    Type        string // Any hugr type: "postgres", "duckdb", "mysql", "mssql", "http", etc.
    Description string
    Path        string // Connection string, supports env vars: [$DB_HOST]
    Version     string // Used for migration tracking (PostgreSQL only)
    ReadOnly    bool
    HugrSchema  string // Optional GraphQL SDL for custom schema
}
```

## ApplicationDBInitializer (optional)

Implement to provide SQL for initial schema creation:

```go
type ApplicationDBInitializer interface {
    InitDBSchemaTemplate(ctx context.Context, name string) (string, error)
}
```

The returned SQL is executed in a transaction when the database is first provisioned. Supports Go template variables: `{{ .VectorSize }}`, `{{ .EmbedderName }}`.

## ApplicationDBMigrator (optional)

Implement to provide SQL for schema migrations:

```go
type ApplicationDBMigrator interface {
    MigrateDBSchemaTemplate(ctx context.Context, name, fromVersion string) (string, error)
}
```

Called when the app version changes. `fromVersion` is the currently installed version.

## MultiCatalogProvider (optional)

Implement to dynamically add/remove catalogs at runtime:

```go
type MultiCatalogProvider interface {
    SetMultiCatalogMux(mux MultiCatalogMux)
    InitMultiCatalog(ctx context.Context) error
}
```

`SetMultiCatalogMux` is called before the gRPC server starts. `InitMultiCatalog` is called after successful registration with hugr.

## TLSConfigProvider (optional)

Implement to enable TLS on the gRPC server:

```go
type TLSConfigProvider interface {
    TLSConfig(ctx context.Context) (*tls.Config, error)
}
```

## Interface Composition

Interfaces can be combined freely:

```go
type MyApp struct{}

// Required
var _ app.Application = (*MyApp)(nil)

// Optional — enables DB provisioning
var _ app.DataSourceUser = (*MyApp)(nil)
var _ app.ApplicationDBInitializer = (*MyApp)(nil)
var _ app.ApplicationDBMigrator = (*MyApp)(nil)
```
