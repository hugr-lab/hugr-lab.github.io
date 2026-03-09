---
sidebar_position: 2
---
# System Reference

This page documents all built-in system modules, tables, views, and functions that are available in every `hugr` instance. These modules are automatically loaded at startup and provide core infrastructure for data source management, schema introspection, clustering, GIS operations, object storage, and node information.

## core Module

The `core` module manages data sources, catalog sources, roles, API keys, and provides lifecycle functions for loading/unloading data sources.

### Tables

#### `data_sources`

Registered data sources. Each entry defines a connection to an external database or service.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Data source name |
| `type` | `String!` | Source type: `duckdb`, `postgres`, `http`, `extension` |
| `prefix` | `String!` | Prefix added to all types in this source. When `as_module` is true, queries are placed in a separate module |
| `as_module` | `Boolean!` | Whether to expose as a separate GraphQL module (default: `false`) |
| `description` | `String` | Human-readable description |
| `path` | `String!` | Connection path (DB file path, connection string, or URL depending on type) |
| `disabled` | `Boolean` | Disable without removing (default: `false`) |
| `self_defined` | `Boolean` | If true, the source returns its own schema definition (default: `false`) |
| `read_only` | `Boolean` | Read-only mode (default: `false`) |

#### `catalog_sources`

Schema catalog sources that provide GraphQL schema definitions for data sources.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Catalog source name |
| `type` | `String!` | Source type: `localFS` (local directory) or `uri` (remote file) |
| `description` | `String` | Human-readable description |
| `path` | `String!` | Path to schema files (directory path or URI) |

#### `catalogs`

Many-to-many mapping between data sources and catalog sources.

| Field | Type | Description |
|-------|------|-------------|
| `catalog_name` | `String!` (PK) | References `catalog_sources.name` |
| `data_source_name` | `String!` (PK) | References `data_sources.name` |

#### `roles`

Permission roles that can be assigned to users and API keys.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Role name (built-in: `admin`, `public`, `readonly`) |
| `description` | `String!` | Role description |
| `disabled` | `Boolean` | Disable the role (default: `false`) |

#### `role_permissions`

Fine-grained permissions controlling visibility and access to types and fields per role.

| Field | Type | Description |
|-------|------|-------------|
| `role` | `String!` (PK) | References `roles.name` |
| `type_name` | `String!` (PK) | Type name (`*` for all types) |
| `field_name` | `String!` (PK) | Field name (`*` for all fields) |
| `hidden` | `Boolean` | Hide from schema introspection (default: `false`) |
| `disabled` | `Boolean` | Deny access (default: `false`) |
| `filter` | `JSON` | Required filter values for queries |
| `data` | `JSON` | Required field values for mutations |

#### `api_keys`

API keys for authentication with optional role binding and expiration.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | API key name |
| `description` | `String!` | Description |
| `key` | `String!` | API key value (unique) |
| `default_role` | `String` | References `roles.name` |
| `disabled` | `Boolean` | Disable the key (default: `false`) |
| `is_temporal` | `Boolean` | Whether the key expires (default: `false`) |
| `expires_at` | `Timestamp` | Expiration date (required if `is_temporal` is true) |
| `headers` | `JSON` | HTTP header mapping for extracting user info: `{"role": "x-role", "user_id": "x-user-id", "user_name": "x-user-name"}` |
| `claims` | `JSON` | Static claims: `{"role": "role", "user_id": "user-id", "user_name": "user-name"}` |

### Functions

#### `load_data_source`

Load or reload a data source catalog into the engine.

```graphql
mutation {
  load_data_source(name: "my_source") {
    success
    message
  }
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Data source name to load |

Returns: `OperationResult`

#### `unload_data_source`

Unload a data source catalog without deleting its configuration.

```graphql
mutation {
  unload_data_source(name: "my_source") {
    success
    message
  }
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Data source name to unload |

Returns: `OperationResult`

#### `checkpoint`

Force a DuckDB checkpoint (flush WAL to disk).

```graphql
mutation {
  checkpoint(name: "my_db") {
    success
    message
  }
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String` | Database name (empty string for default) |

Returns: `OperationResult`

#### `data_source_status`

Get the current status of a data source.

```graphql
{
  data_source_status(name: "my_source")
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Data source name |

Returns: `String` (status text)

#### `describe_data_source_schema`

Describe the schema of a data source. Useful for debugging schema compilation.

```graphql
{
  describe_data_source_schema(name: "my_source", self: true, log: false)
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Data source name |
| `self` | `Boolean` | Show the self-defined schema (default: `false`) |
| `log` | `Boolean` | Include compilation log (default: `false`) |

Returns: `String` (schema description)

---

## core.catalog Module

The `core.catalog` module provides read-only views over the compiled schema metadata stored in the core database. All views support relationship navigation via `@references` and `@field_references` directives. When `EMBEDDER_URL` is configured, catalogs, types, fields, and modules also include `@embeddings` support for vector similarity search.

### Views

#### `catalogs`

Schema catalogs representing compiled data sources.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Catalog name |
| `version` | `String!` | Schema version hash |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |
| `type` | `String` | Data source type (from catalog or data_sources table) |
| `prefix` | `String` | Type prefix |
| `as_module` | `Boolean` | Whether exposed as module |
| `read_only` | `Boolean` | Read-only flag |
| `disabled` | `Boolean!` | Disabled flag |
| `suspended` | `Boolean!` | Suspended flag (dependency unavailable) |
| `is_summarized` | `Boolean!` | Whether AI summarization has been applied |
| `vec` | `Vector` | Embedding vector (when embeddings enabled) |

**Relationships:**
- Referenced by `catalog_dependencies`, `types`, `fields`, `module_catalogs`, `module_intro`

#### `catalog_dependencies`

Tracks dependencies between catalogs (e.g., extension sources depending on base sources).

| Field | Type | Description |
|-------|------|-------------|
| `catalog` | `String!` (PK) | The dependent catalog |
| `depends_on` | `String!` (PK) | The catalog being depended on |

**Relationships:**
- `catalog_info` -> `catalogs` (the dependent catalog)
- `depends_on_info` -> `catalogs` (the dependency target)
- Reverse: `catalogs.dependencies`, `catalogs.dependents`

#### `types`

All type definitions in the compiled schema.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Type name |
| `kind` | `String!` | GraphQL type kind (OBJECT, INPUT_OBJECT, ENUM, SCALAR, etc.) |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |
| `hugr_type` | `String!` | Hugr-specific type classification |
| `module` | `String!` | Module this type belongs to |
| `catalog` | `String` | Catalog this type belongs to |
| `is_summarized` | `Boolean!` | Whether AI summarization has been applied |
| `vec` | `Vector` | Embedding vector (when embeddings enabled) |

**Relationships:**
- `module_info` -> `modules` (owning module)
- `catalog_info` -> `catalogs` (owning catalog)
- Reverse: `fields.root_type`, `data_objects.type`, `arguments.argument_type`, `enum_values.type`

#### `fields`

All field definitions across all types.

| Field | Type | Description |
|-------|------|-------------|
| `type_name` | `String!` (PK) | Parent type name |
| `name` | `String!` (PK) | Field name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |
| `field_type` | `String!` | Full GraphQL type signature |
| `field_type_name` | `String!` | Base type name (unwrapped) |
| `hugr_type` | `String!` | Hugr-specific field classification |
| `catalog` | `String` | Catalog this field belongs to |
| `dependency_catalog` | `String` | Extension source catalog (for cross-source fields) |
| `is_pk` | `Boolean!` | Whether this is a primary key field |
| `is_summarized` | `Boolean!` | Whether AI summarization has been applied |
| `ordinal` | `Int!` | Field position order |
| `vec` | `Vector` | Embedding vector (when embeddings enabled) |

**Relationships:**
- `root_type` -> `types` (parent type)
- `type` -> `types` (field's GraphQL type)
- `catalog_info` -> `catalogs` (owning catalog)
- `dependency_catalog_info` -> `catalogs` (extension source)
- Reverse: `arguments.field`, `data_object_queries.field`

#### `arguments`

Field arguments for parameterized fields (queries, functions).

| Field | Type | Description |
|-------|------|-------------|
| `type_name` | `String!` (PK) | Parent type name |
| `field_name` | `String!` (PK) | Parent field name |
| `name` | `String!` (PK) | Argument name |
| `description` | `String!` | Description |
| `arg_type` | `String!` | Full argument type signature |
| `arg_type_name` | `String!` | Base argument type name |
| `is_list` | `Boolean!` | Whether the argument is a list |
| `is_non_null` | `Boolean!` | Whether the argument is required |
| `default_value` | `String` | Default value |

**Relationships:**
- `field` -> `fields` (parent field, composite key: `type_name` + `field_name`)
- `argument_type` -> `types` (argument's type definition)

#### `modules`

Schema modules grouping types and operations.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Module name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |
| `query_root` | `String` | Root query type name |
| `mutation_root` | `String` | Root mutation type name |
| `function_root` | `String` | Root function type name |
| `mut_function_root` | `String` | Root mutation function type name |
| `is_summarized` | `Boolean!` | Whether AI summarization has been applied |
| `vec` | `Vector` | Embedding vector (when embeddings enabled) |

**Relationships:**
- `query` -> `types` (root query type)
- `mutation` -> `types` (root mutation type)
- `function` -> `types` (root function type)
- `mut_function` -> `types` (root mutation function type)
- Reverse: `types.module_info`, `module_catalogs.module_info`, `module_intro.module_info`

#### `module_catalogs`

Many-to-many associations between modules and catalogs.

| Field | Type | Description |
|-------|------|-------------|
| `module` | `String!` (PK) | Module name |
| `catalog` | `String!` (PK) | Catalog name |

**Relationships:**
- `module_info` -> `modules`
- `catalog_info` -> `catalogs`

#### `data_objects`

Data objects represent tables and views that have query capabilities.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Data object name (matches a type name) |
| `filter_type_name` | `String` | Filter input type for this data object |
| `args_type_name` | `String` | Args input type for this data object |

**Relationships:**
- `type` -> `types` (the type definition)
- `filter_type` -> `types` (filter input type)
- `args_type` -> `types` (args input type)
- Reverse: `data_object_queries.data_object`

#### `data_object_queries`

Query fields available for each data object (e.g., list, by PK, aggregation).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Query field name |
| `object_name` | `String!` (PK) | Data object name |
| `query_root` | `String!` | Root type containing this query |
| `query_type` | `String!` | Query type classification |

**Relationships:**
- `data_object` -> `data_objects` (the data object)
- `field` -> `fields` (composite key: `query_root` + `name`)
- `module_query_type` -> `types` (root query type)

#### `module_intro`

Aggregated SQL view providing a flat listing of all module operations (queries, mutations, functions, mutation functions).

| Field | Type | Description |
|-------|------|-------------|
| `module` | `String!` | Module name |
| `type_type` | `String!` | Operation kind: `queries`, `mutation`, `function`, `mut_function` |
| `type_name` | `String!` | Root type name |
| `field_name` | `String!` | Operation field name |
| `field_description` | `String!` | Field description |
| `hugr_type` | `String!` | Hugr type classification |
| `catalog` | `String` | Owning catalog |

**Relationships:**
- `module_info` -> `modules`
- `catalog_info` -> `catalogs`

#### `enum_values`

Values for enum type definitions.

| Field | Type | Description |
|-------|------|-------------|
| `type_name` | `String!` (PK) | Enum type name |
| `name` | `String!` (PK) | Enum value name |
| `description` | `String!` | Value description |
| `ordinal` | `Int!` | Value position order |

**Relationships:**
- `type` -> `types` (the enum type)

---

## core.meta Module

The `core.meta` module exposes DuckDB system catalog views for introspecting the underlying database engine. All views are read-only.

### Functions

#### `duckdb_version`

Returns the DuckDB engine version string.

```graphql
{
  core_meta {
    duckdb_version
  }
}
```

### Views

#### `databases`

Attached DuckDB databases.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `BigInt!` (PK) | Database OID |
| `name` | `String!` | Database name (unique) |
| `type` | `String!` | Database type |
| `comment` | `String` | Comment |
| `readonly` | `Boolean` | Read-only flag |
| `internal` | `Boolean` | Internal database flag |

#### `schemas`

Database schemas.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `BigInt!` (PK) | Schema OID |
| `name` | `String!` (PK) | Schema name |
| `database_id` | `BigInt!` | References `databases.id` |
| `database_name` | `String!` | Database name |
| `internal` | `Boolean` | Internal schema flag |

#### `tables`

Database tables.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `BigInt!` (PK) | Table OID |
| `name` | `String!` | Table name |
| `database_id` | `BigInt!` | References `databases.id` |
| `schema_id` | `BigInt!` | References `schemas.id` |
| `estimated_size` | `BigInt` | Estimated row count |
| `column_count` | `Int` | Number of columns |
| `index_count` | `Int` | Number of indexes |
| `has_primary_key` | `Boolean` | Whether a PK exists |
| `temporary` | `Boolean` | Temporary table flag |

#### `views`

Database views.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `BigInt!` (PK) | View OID |
| `name` | `String!` (PK) | View name |
| `database_id` | `BigInt!` | References `databases.id` |
| `schema_id` | `BigInt!` | References `schemas.id` |
| `column_count` | `Int` | Number of columns |
| `temporary` | `Boolean` | Temporary view flag |

#### `columns`

Table and view columns.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Column name |
| `database_id` | `BigInt!` | References `databases.id` |
| `schema_id` | `BigInt!` | References `schemas.id` |
| `table_id` | `BigInt!` | References `tables.id` or `views.id` |
| `table_name` | `String!` | Parent table/view name |
| `data_type` | `String` | Column data type |
| `is_nullable` | `Boolean` | Nullable flag |
| `default` | `String` | Default value expression |
| `ordinal_position` | `Int` | Column position |

#### `constraints`

Table constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK, NOT NULL).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Constraint name |
| `table_id` | `BigInt!` | References `tables.id` |
| `type` | `String` | Constraint type |
| `columns` | `[String!]` | Constrained column names |
| `references_table_name` | `String` | Referenced table (FK only) |
| `references_columns` | `[String!]` | Referenced column names (FK only) |

#### `extensions`

DuckDB extensions (installed and loaded).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Extension name |
| `loaded` | `Boolean` | Whether currently loaded |
| `installed` | `Boolean` | Whether installed |
| `install_path` | `String` | Installation path |
| `description` | `String` | Extension description |
| `version` | `String` | Extension version |

#### `functions`

Registered DuckDB functions.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Function name |
| `database_name` | `String!` | Owning database |
| `schema_name` | `String!` | Owning schema |
| `type` | `String` | Function type (scalar, aggregate, table, macro) |
| `return_type` | `String` | Return type |
| `parameters` | `[String!]` | Parameter names |
| `parameter_types` | `[String!]` | Parameter types |
| `has_side_effects` | `Boolean` | Side-effect flag |

#### `settings`

DuckDB configuration settings.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Setting name |
| `value` | `String` | Current value |
| `description` | `String` | Setting description |
| `input_type` | `String` | Expected input type |
| `scope` | `String` | Setting scope |

#### `duckdb_memory`

DuckDB memory usage by component.

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `String!` (PK) | Memory component tag |
| `memory_usage` | `BigInt` | Memory usage in bytes |
| `temporary_storage` | `BigInt` | Temporary storage in bytes |

#### `secrets`

DuckDB registered secrets (credentials for remote storage).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Secret name |
| `type_name` | `String!` | Secret type (references `secret_types.type`) |
| `provider` | `String` | Provider name |
| `persistent` | `Boolean` | Persisted across restarts |
| `scope` | `[String]` | Scope patterns |

#### `secret_types`

Available secret types.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `String!` (PK) | Type identifier |
| `default_provider` | `String` | Default provider |
| `extension_name` | `String` | Providing extension |

#### `log_contexts` and `log_entries`

DuckDB logging information (when logging is enabled).

**log_contexts:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `BigInt!` (PK) | Context ID |
| `scope` | `String!` | Log scope |
| `connection_id` | `String` | Connection identifier |
| `transaction_id` | `String` | Transaction identifier |
| `query_id` | `String` | Query identifier |

**log_entries:**

| Field | Type | Description |
|-------|------|-------------|
| `context_id` | `BigInt!` | References `log_contexts.id` |
| `timestamp` | `Timestamp!` | Entry timestamp |
| `type` | `String` | Log entry type |
| `log_level` | `String` | Severity level |
| `message` | `String` | Log message text |

#### `temporary_files`

DuckDB temporary files on disk.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `String!` (PK) | File path |
| `size` | `BigInt` | File size in bytes |

---

## core.cluster Module

The `core.cluster` module provides cluster management for multi-node deployments. It manages node registration, schema synchronization, and broadcast operations between management and worker nodes.

### Tables

#### `nodes`

Cluster node registry. Each node registers on startup and updates its heartbeat periodically.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Unique node identifier |
| `url` | `String!` | Node IPC endpoint URL |
| `role` | `String!` | Node role: `management` or `worker` |
| `version` | `String` | Binary version |
| `started_at` | `Timestamp` | Node start time |
| `last_heartbeat` | `Timestamp` | Last heartbeat timestamp |
| `error` | `String` | Last error (`null` = healthy) |

### Query Functions

#### `schema_version`

Returns the current schema version counter, used for cluster change detection.

```graphql
{
  core_cluster {
    schema_version
  }
}
```

Returns: `Int!`

#### `my_role`

Returns this node's cluster role (`management` or `worker`).

Returns: `String!`

#### `management_url`

Returns the management node's IPC URL (from the `_cluster_nodes` table).

Returns: `String` (null if no management node registered)

### Mutation Functions (User-facing)

These mutations are forwarded to the management node if executed on a worker.

| Function | Arguments | Description |
|----------|-----------|-------------|
| `load_source` | `name: String!` | Load/compile data source across the cluster |
| `unload_source` | `name: String!` | Unload data source across the cluster |
| `reload_source` | `name: String!` | Reload data source across the cluster |
| `register_storage` | `type`, `name`, `scope`, `key`, `secret`, `endpoint`, `use_ssl`, `url_style`, `region` | Register object storage secret across the cluster |
| `unregister_storage` | `name: String!` | Unregister object storage secret across the cluster |
| `invalidate_cache` | `catalog: String` | Invalidate schema cache across the cluster |

### Internal Mutation Functions

These are broadcast targets used internally between cluster nodes. They require `CLUSTER_SECRET` authentication.

| Function | Arguments | Description |
|----------|-----------|-------------|
| `handle_source_load` | `name: String!` | Worker: attach source without recompile |
| `handle_source_unload` | `name: String!` | Worker: detach source |
| `handle_cache_invalidate` | `catalog: String` | Handle cache invalidation broadcast |
| `handle_secret_sync` | _(none)_ | Worker: re-sync secrets from management |

---

## core.gis Module

The `core.gis` module provides geospatial utility functions for converting between geometries and H3 hexagonal cells.

### Functions

#### `geom_to_h3_cells`

Convert a geometry to a set of H3 cells at the given resolution.

```graphql
{
  core_gis {
    geom_to_h3_cells(geom: "POINT(0 0)", resolution: 8, simplify: true, compact: false)
  }
}
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `geom` | `Geometry!` | | Input geometry |
| `resolution` | `Int!` | `8` | H3 resolution level (0-15) |
| `simplify` | `Boolean` | `true` | Simplify geometry before tessellation |
| `compact` | `Boolean` | `false` | Compact the resulting cell set |

Returns: `[H3Cell!]`

#### `h3_cell_to_geom`

Convert an H3 cell to its boundary geometry.

| Argument | Type | Description |
|----------|------|-------------|
| `cell` | `H3Cell!` | H3 cell index |

Returns: `Geometry!`

#### `h3_cells_to_multi_polygon`

Convert a set of H3 cells to a multi-polygon geometry.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `cells` | `[H3Cell!]!` | | H3 cell indexes |
| `compact` | `Boolean` | `false` | Compact cells before conversion |

Returns: `Geometry!`

---

## core.storage Module

The `core.storage` module manages object storage registrations (S3, GCS, R2, etc.) for accessing remote files.

### Mutation Functions

#### `register_object_storage`

Register a new or update an existing object storage with credentials.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `String!` | | Storage type (e.g., `s3`, `gcs`, `r2`) |
| `name` | `String!` | | Storage name |
| `scope` | `String!` | | Bucket name or sub-path |
| `key` | `String!` | | Access key ID |
| `secret` | `String!` | | Secret access key |
| `region` | `String` | `""` | AWS region |
| `endpoint` | `String!` | | Endpoint URL |
| `use_ssl` | `Boolean!` | `true` | Use HTTPS |
| `url_style` | `String!` | | URL style: `path` or `vhost` |
| `url_compatibility` | `Boolean` | `false` | URL compatibility mode |
| `kms_key_id` | `String` | `""` | AWS KMS key for server-side encryption |
| `account_id` | `String` | `""` | Cloudflare R2 account ID |

Returns: `OperationResult`

#### `unregister_storage`

Unregister an existing object storage.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Storage name to unregister |

Returns: `OperationResult`

### Views

#### `registered_object_storages`

Currently registered object storages.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | Storage name |
| `type` | `String!` | Storage type |
| `scope` | `[String]` | Bucket/path scopes |
| `parameters` | `String` | Storage parameters |

#### `ls`

Directory listing with support for object storages. Reads file contents at the given path.

| Argument | Type | Description |
|----------|------|-------------|
| `path` | `String!` | Path to list (supports `s3://`, `gcs://`, local paths) |

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` (PK) | File name |
| `content` | `String!` | File content |

---

## core.info Module

The `core.info` module provides node information and version details.

### Functions

#### `info`

Returns detailed information about the current node, including configuration.

```graphql
{
  info {
    cluster_mode
    node_role
    node_name
    version
    build_date
    config {
      admin_ui
      debug
      allow_parallel
      max_parallel_queries
      max_depth
      duckdb { path max_open_conns }
      cache { ttl }
    }
  }
}
```

Returns: `NodeInfo!`

**NodeInfo fields:**

| Field | Type | Description |
|-------|------|-------------|
| `cluster_mode` | `Boolean!` | Whether cluster mode is enabled |
| `node_role` | `String!` | Node role (`management`, `worker`, or `standalone`) |
| `node_name` | `String!` | Node name |
| `version` | `String!` | Software version |
| `build_date` | `String!` | Build date |
| `config` | `NodeConfig!` | Engine configuration |

**NodeConfig fields:**

| Field | Type | Description |
|-------|------|-------------|
| `admin_ui` | `Boolean!` | Admin UI enabled |
| `debug` | `Boolean!` | Debug mode |
| `allow_parallel` | `Boolean!` | Parallel query execution enabled |
| `max_parallel_queries` | `Int!` | Maximum concurrent queries |
| `max_depth` | `Int!` | Maximum query depth |
| `duckdb` | `DuckDBConfig!` | DuckDB engine configuration |
| `coredb` | `CoreDBConfig!` | Core database configuration |
| `auth` | `[AuthProviderConfig!]` | Configured auth providers |
| `cache` | `CacheConfig!` | Cache configuration |

#### `version`

Returns a simplified version object.

```graphql
{
  version {
    version
    build_date
  }
}
```

Returns: `NodeVersion!` with fields `version: String!` and `build_date: String!`

---

## Schema Management Functions

These mutation functions manage schema metadata in the core database. They are used by the AI summarizer, embedding indexer, and administrative tools.

### `_schema_update_type_desc`

Update a type's description and mark it as summarized.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Type name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |

### `_schema_update_field_desc`

Update a field's description and mark it as summarized.

| Argument | Type | Description |
|----------|------|-------------|
| `type_name` | `String!` | Parent type name |
| `name` | `String!` | Field name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |

### `_schema_update_module_desc`

Update a module's description and mark it as summarized.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Module name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |

### `_schema_update_catalog_desc`

Update a catalog's description and mark it as summarized.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Catalog name |
| `description` | `String!` | Short description |
| `long_description` | `String!` | Detailed description |

### `_schema_reset_summarized`

Reset the `is_summarized` flag so the AI summarizer re-processes entities.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `String` | `""` | Entity name (empty for all) |
| `scope` | `String` | `"all"` | Scope: `all`, `catalog`, or `type` |

### `_schema_reindex`

Recompute embedding vectors. When `name` is empty, reindexes all entities.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `String` | `""` | Entity name (empty for all) |
| `batch_size` | `Int` | `50` | Batch size for embedding computation |

### `_schema_hard_remove`

Hard-delete a catalog and all its schema objects from the core database. Rejects the operation if the catalog has an active engine.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Catalog name to remove |

### `_schema_version_clean`

Reset a catalog's version to force recompilation on next startup.

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Catalog name |

---

## Core DB Tables (DDL)

These are the underlying SQL tables in the core database that back the system. They are managed automatically by the engine and should not be modified directly.

### `_schema_catalogs`

Stores compiled catalog metadata.

```sql
CREATE TABLE _schema_catalogs (
    name VARCHAR NOT NULL PRIMARY KEY,
    version VARCHAR NOT NULL DEFAULT '',
    description VARCHAR NOT NULL DEFAULT '',
    long_description VARCHAR NOT NULL DEFAULT '',
    source_type VARCHAR NOT NULL DEFAULT '',
    prefix VARCHAR NOT NULL DEFAULT '',
    as_module BOOLEAN NOT NULL DEFAULT FALSE,
    read_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_summarized BOOLEAN NOT NULL DEFAULT FALSE,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    suspended BOOLEAN NOT NULL DEFAULT FALSE,
    vec FLOAT[<vector_size>]
);
```

### `_schema_types`

Stores all compiled type definitions.

```sql
CREATE TABLE _schema_types (
    name VARCHAR NOT NULL PRIMARY KEY,
    kind VARCHAR NOT NULL,
    description VARCHAR NOT NULL DEFAULT '',
    long_description VARCHAR NOT NULL DEFAULT '',
    hugr_type VARCHAR NOT NULL DEFAULT '',
    module VARCHAR NOT NULL DEFAULT '',
    catalog VARCHAR,
    directives JSON NOT NULL DEFAULT '[]',
    interfaces VARCHAR NOT NULL DEFAULT '',
    union_types VARCHAR NOT NULL DEFAULT '',
    is_summarized BOOLEAN NOT NULL DEFAULT FALSE,
    vec FLOAT[<vector_size>]
);
```

**Indexes:** `catalog`, `hugr_type`, `kind`

### `_schema_fields`

Stores all compiled field definitions.

```sql
CREATE TABLE _schema_fields (
    type_name VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    field_type VARCHAR NOT NULL,
    field_type_name VARCHAR NOT NULL DEFAULT '',
    description VARCHAR NOT NULL DEFAULT '',
    long_description VARCHAR NOT NULL DEFAULT '',
    hugr_type VARCHAR NOT NULL DEFAULT '',
    catalog VARCHAR,
    dependency_catalog VARCHAR,
    directives JSON NOT NULL DEFAULT '[]',
    is_pk BOOLEAN NOT NULL DEFAULT FALSE,
    is_summarized BOOLEAN NOT NULL DEFAULT FALSE,
    vec FLOAT[<vector_size>],
    ordinal INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (type_name, name)
);
```

**Indexes:** `type_name`, `catalog`, `hugr_type`, `dependency_catalog`

### `_schema_arguments`

Stores field argument definitions.

```sql
CREATE TABLE _schema_arguments (
    type_name VARCHAR NOT NULL,
    field_name VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    arg_type VARCHAR NOT NULL,
    arg_type_name VARCHAR NOT NULL DEFAULT '',
    default_value VARCHAR,
    description VARCHAR NOT NULL DEFAULT '',
    directives JSON NOT NULL DEFAULT '[]',
    ordinal INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (type_name, field_name, name)
);
```

**Indexes:** `type_name`, `(type_name, field_name)`

### `_schema_enum_values`

Stores enum value definitions.

```sql
CREATE TABLE _schema_enum_values (
    type_name VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR NOT NULL DEFAULT '',
    directives JSON NOT NULL DEFAULT '[]',
    ordinal INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (type_name, name)
);
```

**Indexes:** `type_name`

### `_schema_directives`

Stores custom directive definitions.

```sql
CREATE TABLE _schema_directives (
    name VARCHAR NOT NULL PRIMARY KEY,
    description VARCHAR NOT NULL DEFAULT '',
    locations VARCHAR NOT NULL DEFAULT '',
    is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
    arguments VARCHAR NOT NULL DEFAULT '[]'
);
```

### `_schema_modules`

Stores module definitions.

```sql
CREATE TABLE _schema_modules (
    name VARCHAR NOT NULL PRIMARY KEY,
    description VARCHAR NOT NULL DEFAULT '',
    long_description VARCHAR NOT NULL DEFAULT '',
    query_root VARCHAR,
    mutation_root VARCHAR,
    function_root VARCHAR,
    mut_function_root VARCHAR,
    is_summarized BOOLEAN NOT NULL DEFAULT FALSE,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    vec FLOAT[<vector_size>]
);
```

### `_schema_settings`

Key-value settings store (includes `schema_version` counter and `config`).

```sql
CREATE TABLE _schema_settings (
    key VARCHAR NOT NULL PRIMARY KEY,
    value JSON NOT NULL
);
```

### `_cluster_nodes`

Cluster node registry for multi-node deployments.

```sql
CREATE TABLE _cluster_nodes (
    name VARCHAR NOT NULL PRIMARY KEY,
    url VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    version VARCHAR,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error VARCHAR
);
```

### Other Internal Tables

| Table | Description |
|-------|-------------|
| `_schema_catalog_dependencies` | Tracks catalog-to-catalog dependencies (PK: `catalog_name`, `depends_on`) |
| `_schema_data_objects` | Stores data object metadata (PK: `name`) with `filter_type_name` and `args_type_name` |
| `_schema_data_object_queries` | Stores query fields for data objects (PK: `name`, `object_name`) |
| `_schema_module_type_catalogs` | Module-type-catalog associations (PK: `type_name`, `catalog_name`) |
