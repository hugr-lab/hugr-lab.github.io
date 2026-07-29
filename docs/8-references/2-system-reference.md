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
| `type_name` | `String!` (PK) | Type name (`*` for all types), or a `data-object:<op>` marker (see below) |
| `field_name` | `String!` (PK) | Field name (`*` for all fields); for `data-object:*` rows, the data object's GraphQL type name (or `*`) |
| `hidden` | `Boolean` | Hide from schema introspection (default: `false`) |
| `disabled` | `Boolean` | Deny access (default: `false`) |
| `filter` | `JSON` | Required filter values for queries |
| `data` | `JSON` | Required field values for mutations |

Matching precedence for field-level rows is most-specific first: exact `(type_name, field_name)` > `(type_name, *)` > `(*, field_name)` > `(*, *)`; with no matching row, access is allowed by default.

A `type_name` of the form `data-object:query`, `data-object:insert`, `data-object:update`, or `data-object:delete` makes the row a **table-level** (data-object) rule instead of a field-level one. `field_name` then holds the data object's GraphQL type name (or `*`). These rules apply wherever the table is materialised — direct query, `_by_pk`, relations, `_join`, aggregations, and mutations — and compose with field-level rules (filters by AND, `disabled` by OR, mutation `data` force-stamped last). See [Access Control → Data-Object Permissions](../4-engine-configuration/5-access-control.md#data-object-table-level-permissions).

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
| `claims` | `JSON` | Static claims. The `role`/`user_id`/`user_name` keys set the identity; any other scalar key is exposed as an `[$auth.<claim>]` permission variable (see [Custom Claim Variables](../4-engine-configuration/5-access-control.md#custom-claim-variables)) |

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

The `core.catalog` module is the **curation and maintenance** surface of the
catalog: it holds the `annotate_*` mutation functions and the schema-maintenance
operations. See [Curation Functions](#curation-functions) and
[Catalog Maintenance Functions](#catalog-maintenance-functions).

Reading the catalog has two surfaces instead:

- **[`core.entity_*` views](#entity-views)** — the logical model as
  plain rows, an administrative surface that executes entirely inside the CoreDB
  engine and supports semantic search.
- **[`_catalog` meta queries](#logical-model-introspection-meta-queries)** —
  request-scoped, permission-filtered introspection for clients.

:::note Replaced in CoreDB 0.0.20

The read-only views this module used to publish over the compiled schema
(`catalogs`, `types`, `fields`, `arguments`, `modules`, `module_catalogs`,
`data_objects`, `data_object_queries`, `module_intro`, `enum_values`) are
**gone**, together with the `_schema_*` tables behind them. A schema is no
longer compiled and stored as GraphQL type rows: the logical model is stored
instead, and the served surface is generated from it on read.

Migration at a glance:

| Was | Now |
|-----|-----|
| `core.catalog.catalogs` | `core.entity_data_sources`, `core.entity_catalogs` |
| `core.catalog.catalog_dependencies` | `core.entity_catalog_dependencies` |
| `core.catalog.modules`, `module_catalogs`, `module_intro` | `core.entity_modules`, `core.entity_module_data_sources`, `core.entity_functions` |
| `core.catalog.types` | `core.entity_data_objects` (tables/views) and `core.entity_types` (source-declared types) |
| `core.catalog.fields`, `arguments`, `enum_values` | `core.entity_fields`; function arguments are structured in `core.entity_functions.args` |
| `core.catalog.data_objects`, `data_object_queries` | generated on read — query the GraphQL schema through `__schema` / `_catalog` |

:::

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

## Logical-Model Introspection (Meta Queries)

A family of meta queries exposes hugr's logical data model (module tree, data objects with relations, functions, data sources) beside the standard `__schema`/`__type` introspection. They are resolved on the metadata path — never planned or executed as data queries — and respect the same role-based visibility rules as `__schema` (hidden elements are absent everywhere, disabled elements stay visible). Unknown names resolve to `null`, never an error. See [GraphQL API — Logical Model Introspection](/docs/querying/graphql#logical-model-introspection-_catalog) for usage examples.

### Meta Queries

| Query | Returns | Description |
|-------|---------|-------------|
| `_catalog` | `_Module` | The root module (`name: ""`) — entry point to the whole tree |
| `_module(name: String!)` | `_Module` | Module by full dotted name; `""` = root module |
| `_dataObject(name: String!)` | `_DataObject` | Data object by GraphQL type name; `null` for non-data-object types |
| `_function(module: String!, name: String!)` | `_Function` | Callable member (function/mutation/subscription); `module: ""` = root-level functions |
| `_dataSources` | `[_DataSource!]` | The attached data sources that contribute anything visible to the caller |
| `_dataSource(name: String!)` | `_DataSource` | Data source by name; `null` when absent, inactive, or contributing nothing visible |
| `_types(scope: _TypeScope = SOURCE)` | `[__Type!]` | Logical-model type definitions: `SOURCE` — residual base types defined by data sources (structs, inputs, enums; excludes data objects, module roots and generated helper types); `SYSTEM` — engine-defined types. Compiler-derived types belong to neither scope |

### `_Module`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Full dotted module name; empty string for the root module |
| `description` | `String` | Module description |
| `longDescription` | `String` | Curated/summarized long description |
| `dataSources` | `[String!]!` | Distinct data sources contributing this module's direct members |
| `modules` | `[_Module!]` | Direct child modules; children with no visible content are omitted |
| `dataObjects` | `[_DataObject!]` | Member data objects (root: objects without `@module`) |
| `functions` | `[_Function!]` | All callable members, including subscriptions |
| `queryType` / `mutationType` / `subscriptionType` / `functionType` / `mutationFunctionType` | `__Type` | The module's generated root types (root module: `Query`/`Mutation`/`Subscription`/`Function`/`MutationFunction`); `null` when absent |

### `_DataSource`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Data source name (the `@catalog` name) |
| `engine` | `String` | The source's engine type string |
| `description` / `longDescription` | `String` | Descriptions |
| `readOnly` | `Boolean!` | Mutations are not generated for this source |
| `asModule` | `Boolean!` | The source is exposed as a module of its own |
| `isExtension` | `Boolean!` | The source extends other sources' objects |
| `modules` | `[String!]!` | Modules this source places members in; `""` is the root module |

### `_DataObject`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | GraphQL type name (source-prefixed, globally unique) |
| `type` | `_DataObjectType!` | `TABLE` or `VIEW` |
| `properties` | `_DataObjectProperties!` | Extensible flag bag: `isCube`, `isM2M`, `isHypertable`, `softDelete`, `hasVectors` |
| `description` / `longDescription` | `String` | Descriptions |
| `moduleName` / `module` | `String!` / `_Module` | Owning module (name / back-reference) |
| `primaryKey` | `[String!]!` | `@pk` field names; empty when none |
| `args` | `[__InputValue!]` | Parameterized-view arguments; `null` when not parameterized |
| `fields` | `[__Field!]` | Fields (permission-filtered, same rules as `__Type.fields`) |
| `relations` | `[_Relation!]` | Logical edges to other data objects, both directions |
| `dataSourceName` | `String!` | Owning data source |
| `dataSources` | `[String!]!` | Owner plus sources that contributed extension fields |

### `_Relation`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Relation name (`@references(name:)`) or the join field name |
| `direction` | `_RelationDirection!` | `FORWARD` (viewed object is the source) or `BACK` (it is the destination) |
| `kind` | `_RelationKind!` | `FK`, `M2M`, or `JOIN` (`JOIN` is one-directional, always `FORWARD`) |
| `fieldName` | `String` | The field on the viewed object materializing the edge |
| `description` | `String` | Per-endpoint description |
| `dataObject` | `_DataObject` | The far object (M2M: the far leg, not the junction) |
| `through` | `_DataObject` | M2M junction; `null` otherwise |
| `sourceKeys` / `destinationKeys` | `[String!]!` | Key field mappings in canonical source→destination orientation |
| `dataSource` | `String` | Declaring data source (cross-source edges visible) |

Relation SQL (`@join(sql:)` and similar) is never exposed.

### `_Function`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `String!` | Field name on the module's function root type |
| `type` | `_FunctionType!` | `FUNCTION`, `MUTATION`, or `SUBSCRIPTION` |
| `description` / `longDescription` | `String` | Descriptions |
| `moduleName` / `module` | `String!` / `_Module` | Owning module |
| `args` | `[__InputValue!]` | Client-facing arguments (`@arg_default` server-injected arguments excluded) |
| `returns` | `__Type` | Return type |
| `isTable` | `Boolean!` | `true` when the function returns a row set |
| `dataSourceName` | `String` | Owning data source |

### Enums

| Enum | Values |
|------|--------|
| `_TypeScope` | `SOURCE`, `SYSTEM` |
| `_DataObjectType` | `TABLE`, `VIEW` |
| `_FunctionType` | `FUNCTION`, `MUTATION`, `SUBSCRIPTION` |
| `_RelationDirection` | `FORWARD`, `BACK` |
| `_RelationKind` | `FK`, `M2M`, `JOIN` |

All meta-types resolve through standard introspection (`__type(name: "_Module")`), and the meta root queries are ordinary system fields of `Query` (single-underscore names, like `_join` and `jq`) visible in `__schema` output — GraphiQL autocomplete and code generators work with them out of the box. GraphQL reserves double-underscore names for the built-in introspection system, which is why the family uses a single underscore.

---

## Entity Views

The logical model is also queryable as plain rows: the `core` module publishes `entity_*` views over the CoreDB `catalog` schema, written on every catalog load/reload. They are the SQL half of the logical model (the `_catalog` meta queries are the GraphQL half). The views are hosted on the core data source, so they execute **entirely inside the CoreDB engine** — full pushdown on a PostgreSQL CoreDB, ready for pgvector/HNSW-backed semantic search.

| View | Content |
|------|---------|
| `core.entity_modules` | Module tree nodes (name, parent, effective description) — only modules with at least one active data source |
| `core.entity_module_data_sources` | Module → contributing data sources, as a closure over submodules |
| `core.entity_data_sources` | Data sources with their runtime state; configuration joined in when present |
| `core.entity_catalogs` | Registered catalog (schema definition) sources |
| `core.entity_catalog_dependencies` | Declared dependency edges between stored catalogs |
| `core.entity_data_objects` | Tables/views: name, data source, module, kind, parsed properties |
| `core.entity_fields` | Data-object fields: type, properties, attribution, `is_pk`, ordinal — including declared `@join` / `@function_call` fields |
| `core.entity_relations` | ONE row per logical `@references` edge (`fk` / `m2m`), keyed `(source, name)`, with both generated nav fields (`source_field` / `destination_field`) and key mappings |
| `core.entity_functions` | Functions, mutations and subscriptions with structured `args` |
| `core.entity_types` | Residual source-defined types as raw SDL |
| `core.entity_annotations` | The curation overlay: descriptions, audit fields, the embedding vector — including *orphans* (curation of currently unloaded entities) and load-time seed rows |

The views apply **no row-level permission filtering** — they are an *administrative* surface. Access is governed by the ordinary data-object permission rules applied to the views themselves (grant, hide or disable `core.entity_*` per role exactly like any other data object); request-scoped, permission-filtered catalog introspection is exclusively the job of the `_catalog` meta queries. The views' only built-in filter is the **data-source state semi-join**: entities of unloaded, disabled or suspended data sources are hidden (their rows stay in storage — unloading is a flag flip, and loading an unchanged source back is instant; rows are physically deleted only when a source is *unregistered*). Effective descriptions COALESCE the annotations overlay over the source-provided text; raw SQL (view definitions, computed-field expressions, join conditions, default expressions, function SQL) is never projected. When an embedder is configured the views project the annotation-joined `vec` and carry `@embeddings` — semantic search pushes down into the CoreDB engine (pgvector/HNSW on PostgreSQL), and the engine **seeds** vector-only annotation rows from the source-schema descriptions during every load, so a just-connected source is semantically searchable immediately; curation and summarization refine on top and always win. Relation-generated navigation fields are curated as ordinary **field** annotations keyed by the owning object and the field name (`source.source_field` / `destination.destination_field` — set with `annotate_field`); `entity_relations` projects the curated text in its `*_field_description` columns.

---

## Schema Management Functions

These mutation functions manage schema metadata in the core database. They are used by the AI summarizer and administrative tools.

### Curation Functions

Descriptions are curated through the mutation functions of the `core.catalog` module. Writes land in the **annotations overlay** (`catalog.annotations`) — storage the data-source load/unload/reload machinery never touches — so curated descriptions **survive unload and reload by construction**. When an embedder is configured, the embedding vector is recomputed on every write.

An **empty** description clears the curation: the source-provided (generated) text shows through again.

```graphql
mutation {
  function { core { catalog {
    annotate_data_object(
      name: "customers"
      description: "CRM customers"
      long_description: ""
    ) { success }
  } } }
}
```

Curation has two surfaces. Prefer the **logical** one — a curated logical entity also shows through on everything generation derives from it (its filter, aggregation and mutation-input fields):

| Function | Arguments |
|----------|-----------|
| `annotate_module` | `name`, `description`, `long_description` |
| `annotate_data_source` | `name`, `description`, `long_description` |
| `annotate_data_object` | `name`, `description`, `long_description` |
| `annotate_field` | `type_name`, `name`, `description`, `long_description` — also covers relation navigation fields |
| `annotate_type` | `name` (a source-declared struct or input type), `description`, `long_description` |
| `annotate_function` | `module` (`""` = root), `name`, `kind` (`"function"` \| `"mutation"` \| `"subscription"`, default `"function"`), `description`, `long_description` |

The **generated** GraphQL surface is reachable only where a single generated type, field or argument has no logical entity to key on:

| Function | Arguments |
|----------|-----------|
| `annotate_gql_type` | `name`, `description`, `long_description` |
| `annotate_gql_field` | `type_name`, `name`, `description`, `long_description` |
| `annotate_gql_argument` | `type_name`, `field_name`, `name`, `description`, `long_description` |

Summarization progress is tracked by the summarizer tool itself — the engine stores the curated text and its embedding only.

### Catalog Maintenance Functions

| Function | Arguments | Description |
|----------|-----------|-------------|
| `remove_data_source_schema` | `name: String!` | Delete a data source's stored schema entirely; curation is kept. Rejected while the source is still loaded — unload it first. |
| `reset_data_source_version` | `name: String!` | Reset the stored schema version so the next load re-reads the source and rewrites its schema instead of reusing the stored one. |
| `reindex_embeddings` | `name: String = ""`, `batch_size: Int = 50` | Recompute embedding vectors; empty `name` means every entity. Requires a configured embedder. |

`_schema_reset_summarized` was **removed** — what to re-summarize is a summarizer-side decision now.

The older `_schema_*` names survive only as the internal DuckDB UDFs these fields are bound to; they are no longer part of the GraphQL surface.

---

## Core DB Tables (DDL)

These are the underlying SQL tables in the core database that back the system. They are managed automatically by the engine and should not be modified directly.

### The `catalog` namespace — logical model storage

A data source's schema is stored as a **logical model** in the `catalog` schema; the served GraphQL surface (filters, aggregations, mutation inputs, navigation fields, module roots) is generated from these rows **on read**. There is no compiled-schema table.

Property bags are typed `STRUCT` columns on a DuckDB CoreDB and `JSONB` on PostgreSQL — the writer sends the same JSON text to both. Raw SQL that the engine executes (view definitions, computed-field expressions, join conditions, function bodies) lives in those bags and is never projected by the [`core.entity_*` views](#entity-views).

| Table | Primary key | Content |
|-------|-------------|---------|
| `catalog.data_source_meta` | `data_source` | Per-source load state: content-hash `version`, `engine`, `prefix`, `as_module`, `read_only`, `is_extension`, and the flags `loaded` / `disabled` / `suspended`. Unloading is a **flag flip** — rows stay, so reloading an unchanged source is instant. A pseudo-row `_embedder` fingerprints the embedder configuration. |
| `catalog.modules` | `name` | Module tree; `parent` is derived from the dotted name at write time. |
| `catalog.module_data_sources` | `module`, `data_source` | Module → contributing source **closure**, with `has_*` flags recording which root kinds (query, mutation, function, mutation function, subscription) the source contributes. Module visibility is a plain semi-join against `data_source_meta`. |
| `catalog.data_objects` | `name` | Tables/views/cubes: prefixed GraphQL `name`, `original_name`, `data_source`, `module`, `kind`, property bag. |
| `catalog.fields` | `type_name`, `name` | Data-object fields, including declared `@join` / `@function_call` fields, with `ordinal`, `deprecation_reason` and a property bag. Struct and input types live in `catalog.types` as SDL instead. |
| `catalog.relations` | `source`, `name` | One row per logical `@references` edge (`fk` \| `m2m`), readable from both sides: `destination`, `m2m_object`, key mappings, and the generated navigation field names. |
| `catalog.functions` | `module`, `name`, `kind` | Functions, mutation functions and subscriptions. `kind` is part of the identity — the same name may exist in more than one root namespace. |
| `catalog.types` | `name` | Residual source-defined base types (structs, inputs, enums) kept as raw SDL. |
| `catalog.annotations` | `entity_kind`, `entity_key` | The **curation overlay**: `description`, `long_description`, audit columns and the embedding `vec`. Load/unload/reload never touch it, so curated text survives by construction; orphan rows (curation of an unloaded entity) are legal, and rows with a vector but no text are load-time seeds. |
| `catalog.data_source_dependencies` | `data_source`, `depends_on` | Declared cross-source dependency edges. |

On PostgreSQL the `vector` extension is created and `catalog.annotations.vec` gets an HNSW cosine index; on DuckDB the vector is a `FLOAT[N]` array.

:::info Removed in CoreDB 0.0.20

The eleven compiled-schema tables — `_schema_catalogs`, `_schema_types`, `_schema_fields`, `_schema_arguments`, `_schema_enum_values`, `_schema_directives`, `_schema_modules`, `_schema_data_objects`, `_schema_data_object_queries`, `_schema_catalog_dependencies` and `_schema_module_type_catalogs` — were **dropped**. `_schema_settings` is not one of them: it survives and still holds the `schema_version` counter.

An existing database must be migrated before an engine of this version will start — see [CoreDB version and migrations](#coredb-version-and-migrations).

:::

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

### CoreDB version and migrations

The core database carries its own version in a one-row `version` table. The current version is **`0.0.20`**, and the engine compares it **for equality** at startup — a database at any other version is refused, in either direction. An engine upgrade therefore requires migrating the core database first.

A **new** database is created at the current version directly, so a fresh install needs no migration step.

For an **existing** database:

- The [`ghcr.io/hugr-lab/automigrate` image](/docs/deployment/container#1-automigrate-image-recommended) applies pending migrations on startup — the recommended path, and the reason most deployments never run a migration by hand.
- The standalone `migrate` binary from the [`hugr`](https://github.com/hugr-lab/hugr) repository does the same job out of band: `migrate -core-db <path-or-postgres-url> -path ./migrations`.

Migrations support both CoreDB backends (embedded DuckDB and PostgreSQL). **Back the core database up first** — it holds curation, permissions and API keys, none of which can be regenerated from a data source.
