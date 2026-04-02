---
title: Data Sources
sidebar_position: 5
description: Declare PostgreSQL databases with automatic provisioning, schema init, and migrations.
---

# Data Sources

Hugr apps can declare data sources of any hugr-supported type (postgres, duckdb, mysql, mssql, http, etc.) that hugr mounts as sub-modules. Schema initialization and migrations are currently supported only for PostgreSQL — other types are attached and mounted as-is.

## Declaring Data Sources

Implement `DataSourceUser`:

```go
func (a *MyApp) DataSources(ctx context.Context) ([]app.DataSourceInfo, error) {
    return []app.DataSourceInfo{
        {
            Name:        "store",
            Type:        "postgres",
            Description: "Application database",
            Path:        os.Getenv("PG_DSN"),
            Version:     a.Info().Version,
            ReadOnly:    false,
            HugrSchema:  `
type orders @table(name: "orders") {
    id: Int! @pk
    customer: String!
    total: Float!
    created_at: Timestamp
}
`,
        },
    }, nil
}
```

### DataSourceInfo Fields

| Field | Description |
|-------|-------------|
| `Name` | Short name. Becomes `appName.dsName` in hugr (e.g. `my_app.store`) |
| `Type` | Any hugr type: `"postgres"`, `"duckdb"`, `"mysql"`, `"mssql"`, `"http"`, etc. Init/migrate only for postgres |
| `Description` | Human-readable description |
| `Path` | Connection DSN. Supports env var substitution: `postgres://[$DB_USER]:[$DB_PASS]@host/db` |
| `Version` | Used for migration tracking. Typically matches `AppInfo.Version` |
| `ReadOnly` | If true, no write mutations generated |
| `HugrSchema` | Optional GraphQL SDL. If empty, hugr auto-generates from DB schema |

## Schema Initialization

Implement `ApplicationDBInitializer` to provide the initial SQL:

```go
func (a *MyApp) InitDBSchemaTemplate(ctx context.Context, name string) (string, error) {
    switch name {
    case "store":
        return `
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer TEXT NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO orders (customer, total) VALUES ('demo', 99.99);
`, nil
    default:
        return "", fmt.Errorf("unknown data source: %s", name)
    }
}
```

This SQL is executed in a transaction on first provisioning. A `_hugr_app_meta` table tracks the installed version.

### Template Variables

SQL templates support Go `text/template` variables:

| Variable | Description |
|----------|-------------|
| `{{ .VectorSize }}` | Embedding vector dimension (0 if not configured) |
| `{{ .EmbedderName }}` | System embedder name (empty if not configured) |

## Migrations

Implement `ApplicationDBMigrator`:

```go
func (a *MyApp) MigrateDBSchemaTemplate(ctx context.Context, name, fromVersion string) (string, error) {
    switch name {
    case "store":
        return `
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
`, nil
    default:
        return "", fmt.Errorf("unknown data source: %s", name)
    }
}
```

Migrations run automatically when the app version changes:
1. App starts with version `2.0.0`
2. Hugr checks `_hugr_app_meta` — current version is `1.0.0`
3. Calls `MigrateDBSchemaTemplate("store", "1.0.0")`
4. Executes SQL in a transaction
5. Updates `_hugr_app_meta` to `2.0.0`

## HugrSchema vs Self-Defined

| Approach | When to use |
|----------|-------------|
| **HugrSchema** (explicit SDL) | You want precise control over the GraphQL schema — custom field descriptions, specific types |
| **Self-defined** (empty HugrSchema) | Let hugr auto-discover tables from the database. Simpler but less control |

## GraphQL Path

App data sources are mounted as nested modules:

```
{ app_name { ds_name { table_name { field } } } }
```

Example: `{ my_app { store { orders { id customer total } } } }`

## Provisioning Flow

```
App starts
  → Registers with hugr (LoadDataSource)
  → hugr reads _mount.data_sources
  → For each DS:
      → Check _hugr_app_meta version
      → Init or Migrate if needed
      → Register DS in CoreDB
      → Load DS (compile catalog)
  → Call _mount.init() → app.Init(ctx)
```
