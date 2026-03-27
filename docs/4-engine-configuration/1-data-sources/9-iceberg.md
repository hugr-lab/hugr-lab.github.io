---
sidebar_position: 9
title: Iceberg
description: Apache Iceberg data source provides access to Iceberg catalogs with table discovery, time-travel queries, and standard DML operations via DuckDB's iceberg extension.
---

[Apache Iceberg](https://iceberg.apache.org/) is an open table format for large-scale analytic datasets. Hugr supports Iceberg catalogs as data sources through DuckDB's [iceberg extension](https://duckdb.org/docs/stable/core_extensions/iceberg/overview), providing automatic table discovery, time-travel queries via snapshots, and standard DML operations (INSERT, UPDATE, DELETE).

Hugr works with any Iceberg REST catalog that implements the [Iceberg REST API](https://iceberg.apache.org/concepts/catalog/#decoupling-using-the-rest-catalog), including [Apache Polaris](https://polaris.apache.org/), [Lakekeeper](https://lakekeeper.io/), and others. It also supports AWS Glue and S3 Tables catalogs.

To set up an Iceberg data source, add a data source record to the `data_sources` table through the GraphQL API.

## Connection Formats

Iceberg supports five connection path formats, specified in the `path` field:

### 1. REST Catalog (HTTPS)

Connect to an Iceberg REST catalog over HTTPS with OAuth2 authentication:

```graphql
mutation addIcebergSource($data: data_sources_mut_input_data! = {}) {
  core {
    insert_data_sources(data: $data) {
      name
      type
      path
      prefix
      self_defined
      as_module
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "ice_catalog",
    "type": "iceberg",
    "path": "iceberg://catalog.example.com/warehouse?client_id=my_client&client_secret=my_secret&oauth2_server_uri=https://catalog.example.com/v1/oauth/tokens",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

### 2. REST Catalog (HTTP)

For local or development REST catalogs without TLS, use the `iceberg+http://` scheme:

```json
{
  "data": {
    "name": "ice_local",
    "type": "iceberg",
    "path": "iceberg+http://localhost:8181/warehouse",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

When no authentication parameters are provided, hugr connects without OAuth2 (`AUTHORIZATION_TYPE 'none'`).

#### Endpoint Path Prefix

Some catalogs serve the REST API at a non-root path. For example, Apache Polaris uses `/api/catalog` as a prefix. In this case, include the prefix in the path — the **last** segment is treated as the warehouse name, and everything before it becomes the endpoint:

```json
{
  "data": {
    "name": "ice_polaris",
    "type": "iceberg",
    "path": "iceberg+http://polaris:8181/api/catalog/iceberg_warehouse?client_id=root&client_secret=s3cr3t&oauth2_server_uri=http://polaris:8181/api/catalog/v1/oauth/tokens&oauth2_scope=PRINCIPAL_ROLE:ALL",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

This sets the DuckDB `ENDPOINT` to `http://polaris:8181/api/catalog` and the warehouse to `iceberg_warehouse`.

### 3. AWS Glue Catalog

Connect to an AWS Glue catalog:

```json
{
  "data": {
    "name": "ice_glue",
    "type": "iceberg",
    "path": "iceberg+glue://123456789?region=us-east-1",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

### 4. AWS S3 Tables

Connect to AWS S3 Tables (Iceberg-managed tables in S3):

```json
{
  "data": {
    "name": "ice_s3t",
    "type": "iceberg",
    "path": "iceberg+s3tables://arn:aws:s3tables:us-east-1:123456789:bucket/my-bucket?region=us-east-1",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

### 5. Secret Reference

If you have already created an Iceberg secret in DuckDB, reference it by name:

```json
{
  "data": {
    "name": "ice_catalog",
    "type": "iceberg",
    "path": "my_iceberg_secret",
    "prefix": "ice",
    "self_defined": true,
    "as_module": true
  }
}
```

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `client_id` | OAuth2 client ID | `admin` |
| `client_secret` | OAuth2 client secret | `password` |
| `oauth2_server_uri` | OAuth2 token endpoint URL | `https://catalog.example.com/v1/oauth/tokens` |
| `oauth2_scope` | OAuth2 scope | `PRINCIPAL_ROLE:ALL` |
| `token` | Bearer token (alternative to OAuth2) | `eyJhbG...` |
| `region` | AWS region (for Glue/S3 Tables) | `us-east-1` |
| `access_delegation_mode` | Credential delegation mode (see [Catalog-Specific Notes](#catalog-specific-notes)) | `vended_credentials` |
| `schema_filter` | Regexp to filter namespaces | `^default$` |
| `table_filter` | Regexp to filter tables | `^(users\|orders)$` |

### Data Source Options

| Option | Type | Description |
|--------|------|-------------|
| `self_defined` | Boolean | When `true`, auto-generates GraphQL schema from catalog metadata |
| `as_module` | Boolean | When `true`, exposes as a top-level GraphQL module |
| `read_only` | Boolean | When `true`, blocks all DML mutations |

## S3 Storage Access

If the Iceberg catalog stores data files on S3-compatible storage (such as MinIO or AWS S3), you must register the storage credentials in hugr before loading the Iceberg data source:

```graphql
mutation {
  function {
    core {
      storage {
        register_object_storage(
          type: "S3"
          name: "my_s3"
          scope: "s3://warehouse"
          key: "access_key"
          secret: "secret_key"
          region: "us-east-1"
          endpoint: "s3.amazonaws.com"
          use_ssl: true
          url_style: "path"
        ) { success message }
      }
    }
  }
}
```

For MinIO or other local S3-compatible services, set `use_ssl: false` and `endpoint` to the service address.

:::tip
The S3 `scope` must match the bucket prefix used by the Iceberg catalog. For example, if the catalog stores data in `s3://iceberg-warehouse/`, set `scope: "s3://iceberg-warehouse"`.
:::

## Self-Describing Schema

Iceberg data sources support self-describing schema generation (`self_defined: true`). The engine introspects the Iceberg catalog's `information_schema` and automatically generates a GraphQL schema for all discovered tables, including column types and nullable fields.

Iceberg namespaces are mapped to GraphQL modules. For example, a table `default.sensors` in an Iceberg catalog with prefix `ice` produces:

```graphql
query {
  ice {
    default {
      default_sensors {
        id
        name
        temperature
      }
    }
  }
}
```

The type mapping from DuckDB to GraphQL follows the same convention as [DuckLake](8-ducklake.md):

| DuckDB Type | GraphQL Type |
|-------------|--------------|
| BOOLEAN | Boolean |
| TINYINT, SMALLINT, INTEGER | Int |
| BIGINT, HUGEINT | BigInt |
| FLOAT, DOUBLE, DECIMAL | Float |
| VARCHAR, CHAR, UUID | String |
| BLOB | String |
| DATE | Date |
| TIME | Time |
| TIMESTAMP, TIMESTAMPTZ | Timestamp |
| JSON | JSON |
| GEOMETRY | Geometry |

## Time Travel with `@at`

Iceberg supports time-travel queries via the `@at` directive, allowing you to query data as it existed at a specific snapshot.

:::note
Iceberg snapshot IDs are large random numbers (e.g. `7733883404728353578`), not sequential version numbers. You can find snapshot IDs by querying the Iceberg catalog metadata via its REST API or by using tools like DuckDB CLI.
:::

### In Queries

Apply time travel at query time using the `@at` directive on query fields:

```graphql
query {
  ice {
    default {
      # Query data at a specific snapshot
      default_sensors @at(version: 7733883404728353578) {
        id
        name
        temperature
      }

      # Query data at a specific timestamp
      default_sensors @at(timestamp: "2025-01-01T12:00:00Z") {
        id
        name
        temperature
      }
    }
  }
}
```

### Compare Snapshots

Use aliases to compare data across different points in time:

```graphql
query {
  ice {
    default {
      before: default_sensors @at(version: 7733883404728353578) {
        id
        temperature
      }
      after: default_sensors {
        id
        temperature
      }
    }
  }
}
```

### In Schema Definitions (SDL)

Pin a table to a specific snapshot version or timestamp at the schema level:

```graphql
type historical_sensors @table(name: "default.sensors") @at(version: 7733883404728353578) {
  id: BigInt! @pk
  name: String
  temperature: Float
}
```

The `@at` directive accepts exactly one of:
- `version: Int` — snapshot ID
- `timestamp: String` — RFC 3339 timestamp (e.g. `2025-01-15T10:30:00Z`)

The `@at` directive is only valid on query fields. Using `@at` on mutations will result in an error.

## Mutations

Iceberg tables support standard DML mutations (INSERT, UPDATE, DELETE) — the same as DuckDB tables. Each mutation creates a new Iceberg snapshot.

:::note
DuckDB's Iceberg extension does not yet support targeted inserts (i.e., inserting into specific columns). All columns must be provided in INSERT mutations. This is a DuckDB limitation and will be resolved in future DuckDB releases.
:::

To make an Iceberg source read-only (blocking all DML), set `read_only: true` when registering the data source.

## DuckLake Bridge

If you use DuckLake, you can import Iceberg catalog metadata into a DuckLake catalog using the `iceberg_to_ducklake` mutation. This allows you to query Iceberg data through DuckLake's management and versioning infrastructure.

```graphql
mutation {
  function {
    core {
      ducklake {
        iceberg_to_ducklake(
          iceberg_catalog: "ice_catalog"
          ducklake_catalog: "my_lake"
        ) { success message }
      }
    }
  }
}
```

The `clear` parameter resets the DuckLake catalog before import. The `skip_tables` parameter accepts a comma-separated list of tables to exclude.

:::note
The `iceberg_to_ducklake` function requires the target DuckLake catalog to be empty. Create a dedicated DuckLake data source for the bridge.
:::

## Catalog-Specific Notes

### Apache Polaris

[Apache Polaris](https://polaris.apache.org/) serves its REST API at `/api/catalog/v1/` (not `/v1/`). Use the endpoint path prefix in the connection URI:

```
iceberg+http://polaris:8181/api/catalog/iceberg_warehouse?...
```

Polaris distributes the configured S3 storage endpoint to DuckDB clients. Ensure the endpoint is reachable from the hugr process. When running hugr in Docker alongside Polaris and MinIO, use Docker-internal hostnames (e.g. `minio:9000`).

Polaris supports [vended credentials](https://duckdb.org/docs/current/core_extensions/iceberg/iceberg_rest_catalogs#polaris) — where the catalog provides temporary S3 credentials to clients instead of static endpoints. To enable this, add `access_delegation_mode=vended_credentials` to the connection URI. This requires Polaris to be configured with an STS-capable storage backend (e.g. AWS S3 with IAM roles).

Polaris requires `oauth2_scope=PRINCIPAL_ROLE:ALL` (or a specific principal role) for catalog access.

### Lakekeeper

[Lakekeeper](https://lakekeeper.io/) serves the REST API at the root path (`/v1/`), so no endpoint prefix is needed:

```
iceberg+http://lakekeeper:8181/warehouse?client_id=...&client_secret=...&oauth2_server_uri=http://lakekeeper:8181/v1/oauth/tokens
```

### AWS Glue

AWS Glue catalogs use SigV4 authentication. Hugr automatically sets `AUTHORIZATION_TYPE 'sigv4'` when the `iceberg+glue://` scheme is used. Ensure the AWS credentials are available via the standard AWS credential chain (environment variables, instance profile, etc.).

### AWS S3 Tables

S3 Tables use the same authentication as AWS Glue. The ARN format is:

```
iceberg+s3tables://arn:aws:s3tables:REGION:ACCOUNT:bucket/BUCKET_NAME?region=REGION
```

## Limitations

### DDL Not Supported

Iceberg data sources do not support DDL operations (CREATE TABLE, ALTER TABLE, DROP TABLE) through hugr. Tables must be created and managed externally via the Iceberg catalog or tools like Spark, DuckDB CLI, or Trino.

### No MERGE Support

DuckDB's Iceberg extension does not support MERGE operations. Use separate INSERT, UPDATE, and DELETE statements instead.

### Targeted Inserts Not Supported

DuckDB's Iceberg extension requires all columns to be specified in INSERT operations. Partial column inserts (targeted inserts) are not yet supported.

### No Incremental Schema Compilation

Unlike DuckLake, Iceberg data sources do not support incremental schema compilation. Schema changes in the Iceberg catalog trigger a full re-introspection. The schema version is based on a content hash of the discovered tables and columns.

### `CREATE OR REPLACE` Not Supported

DuckDB's Iceberg extension does not support `CREATE OR REPLACE TABLE`. Use `DROP TABLE IF EXISTS` followed by `CREATE TABLE` when recreating tables externally.

### Catalog Authentication

When connecting to a secured REST catalog, ensure the OAuth2 or bearer token credentials are valid and have sufficient permissions to list namespaces and tables. Authentication errors during attach will prevent the data source from loading.

### Storage Endpoint Visibility

The Iceberg REST catalog distributes its configured S3 storage endpoint to clients. If hugr runs outside the catalog's network (e.g., on the host while the catalog is in Docker), the storage endpoint may not be reachable. Ensure the S3 endpoint configured in the catalog is accessible from the hugr process.
