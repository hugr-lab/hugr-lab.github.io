---
sidebar_position: 8
title: DuckLake
description: DuckLake data source provides lakehouse capabilities with snapshot-based versioning, time-travel queries, and support for various metadata backends (DuckDB, PostgreSQL).
---


DuckLake is a lakehouse format built on top of DuckDB. It provides snapshot-based versioning, time-travel queries, and efficient schema evolution. DuckLake stores metadata in a separate database (DuckDB file or PostgreSQL) and data files in Parquet format on local storage or object storage (S3, GCS, Azure Blob Storage).

To set up a DuckLake data source, add a data source record to the `data_sources` table through the GraphQL API.

## Connection Formats

DuckLake supports three connection path formats:

### 1. Secret Reference

If you have already created a DuckLake secret in DuckDB, reference it by name:

```graphql
mutation addDuckLakeDataSet($data: data_sources_mut_input_data! = {}) {
  core {
    insert_data_sources(data: $data) {
      name
      description
      as_module
      disabled
      path
      prefix
      read_only
      self_defined
      type
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "my_lake",
    "type": "ducklake",
    "path": "my_existing_secret",
    "prefix": "lake",
    "description": "My DuckLake dataset",
    "read_only": false,
    "self_defined": true,
    "as_module": true
  }
}
```

### 2. DuckDB File Metadata

Use a DuckDB file as the metadata database, with optional data path for file storage:

```json
{
  "data": {
    "name": "my_lake",
    "type": "ducklake",
    "path": "/data/metadata.duckdb?data_path=s3://my-bucket/lake-data/",
    "prefix": "lake",
    "description": "DuckLake with DuckDB metadata",
    "read_only": false,
    "self_defined": true,
    "as_module": true
  }
}
```

### 3. PostgreSQL Metadata

Use a PostgreSQL database as the metadata backend. This is recommended for production deployments and cluster environments:

```json
{
  "data": {
    "name": "my_lake",
    "type": "ducklake",
    "path": "postgres://user:password@host:5432/metadata_db?data_path=s3://my-bucket/lake-data/",
    "prefix": "lake",
    "description": "DuckLake with PostgreSQL metadata",
    "read_only": false,
    "self_defined": true,
    "as_module": true
  }
}
```

### Path Query Parameters

| Parameter | Description |
|-----------|-------------|
| `data_path` | Storage location for data files (local path or object storage URI) |
| `metadata_secret` | Name of an existing DuckDB secret for remote metadata credentials |
| `metadata_type` | Remote metadata backend type: `postgres`, `mysql`, `sqlite` |
| `schema_filter` | Regexp to filter schemas for self-describe (e.g. `^(public\|analytics)$`) |
| `table_filter` | Regexp to filter tables for self-describe (e.g. `^(users\|orders)$`) |

Storage secrets for object storage (S3, GCS, Azure) must be registered via existing hugr storage methods before configuring the DuckLake data source.

## Self-Describing Schema

DuckLake data sources support self-describing schema generation (`self_defined: true`). The engine introspects DuckLake metadata tables and automatically generates a GraphQL schema for all tables and views, including column types, primary keys, and nullable fields.

The type mapping from DuckDB to GraphQL:

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

### Incremental Schema Compilation

DuckLake tracks schema changes via snapshot versions. When the schema version changes, hugr performs an incremental re-introspect, detecting only added, dropped, or modified tables. This is significantly faster than full re-introspection for large schemas.

## Time Travel with `@at`

DuckLake supports time-travel queries via the `@at` directive, allowing you to query data as it existed at a specific snapshot version or timestamp.

### In Schema Definitions (SDL)

Pin a table to a specific version or timestamp at the schema level:

```graphql
type historical_prices @table(name: "prices") @at(version: 5) {
  id: BigInt! @pk
  product_id: BigInt!
  price: Float!
  updated_at: Timestamp
}

type january_snapshot @table(name: "orders") @at(timestamp: "2026-01-01T00:00:00Z") {
  id: BigInt! @pk
  customer_id: BigInt!
  total: Float!
  order_date: Timestamp
}
```

### In Queries

Apply time travel at query time using the `@at` directive on query fields:

```graphql
query {
  lake {
    # Query data at a specific snapshot version
    prices(filter: { product_id: { eq: 42 } }) @at(version: 3) {
      id
      price
      updated_at
    }
    # Query data at a specific timestamp
    orders(limit: 10) @at(timestamp: "2026-01-15T10:30:00Z") {
      id
      customer_id
      total
      order_date
    }
  }
}
```

The `@at` directive accepts exactly one of:
- `version: Int` — snapshot version number
- `timestamp: String` — RFC 3339 timestamp (e.g. `2026-01-15T10:30:00Z`)

The `@at` directive is only valid on query fields. Using `@at` on mutations (insert, update, delete) will result in an error.

The `@at` directive is capability-gated — it only works with data sources whose engine supports time travel (currently DuckLake). Using it with other data sources (DuckDB, PostgreSQL, etc.) will produce a compilation error.

## Mutations

DuckLake tables support standard CRUD mutations (insert, update, delete) — the same as DuckDB tables. Mutations automatically create new snapshots.

## Management Functions

DuckLake management functions are available in the `core.ducklake` module. All functions require the `name` argument — the hugr data source name.

### Maintenance Operations

```graphql
mutation {
  function {
    core {
      ducklake {
        # Run all maintenance operations (recommended)
        checkpoint(name: "my_lake") { success message }

        # Expire old snapshots
        expire_snapshots(name: "my_lake", older_than: "7 days", dry_run: true) {
          success message
        }

        # Merge small adjacent data files
        merge_adjacent_files(name: "my_lake", table_name: "orders") {
          success message
        }

        # Rewrite data files with many deletes
        rewrite_data_files(name: "my_lake", delete_threshold: 0.5) {
          success message
        }

        # Clean up old files scheduled for deletion
        cleanup_old_files(name: "my_lake", older_than: "30 days") {
          success message
        }

        # Flush inlined data to Parquet files
        flush_inlined_data(name: "my_lake") { success message }
      }
    }
  }
}
```

### Configuration Options

```graphql
mutation {
  function {
    core {
      ducklake {
        # Set a catalog-level option
        set_option(
          name: "my_lake"
          option: parquet_compression
          value: "zstd"
        ) { success message }

        # Set a table-level option
        set_option(
          name: "my_lake"
          option: target_file_size
          value: "256MB"
          table_name: "orders"
        ) { success message }
      }
    }
  }
}
```

Available options:

| Option | Description | Default |
|--------|-------------|---------|
| `data_inlining_row_limit` | Maximum rows to inline in a single insert | 10 |
| `parquet_compression` | Compression: uncompressed, snappy, gzip, zstd, brotli, lz4, lz4_raw | snappy |
| `parquet_version` | Parquet format version: 1 or 2 | 1 |
| `parquet_compression_level` | Compression level | 3 |
| `parquet_row_group_size` | Rows per row group | 122880 |
| `parquet_row_group_size_bytes` | Bytes per row group | — |
| `hive_file_pattern` | Write in Hive-style folder structure | true |
| `target_file_size` | Target data file size for insertion and compaction | 512MB |
| `require_commit_message` | Require explicit commit message | false |
| `rewrite_delete_threshold` | Fraction of deleted data before rewrite (0-1) | 0.95 |
| `delete_older_than` | Age threshold for unused file removal | — |
| `expire_older_than` | Age threshold for snapshot expiration | — |
| `auto_compact` | Include table in compaction | true |
| `encrypted` | Encrypt Parquet files | false |
| `per_thread_output` | Separate output files per thread | false |
| `data_path` | Path to data files | — |

### DDL Operations

DuckLake supports schema modification via GraphQL mutations:

```graphql
mutation {
  function {
    core {
      ducklake {
        # Create a new table
        create_table(
          name: "my_lake"
          table_name: "products"
          columns: [
            { name: "id", type: INTEGER }
            { name: "name", type: VARCHAR }
            { name: "price", type: DOUBLE }
            { name: "created_at", type: TIMESTAMP }
          ]
        ) { success message }

        # Add a column
        add_column(
          name: "my_lake"
          table_name: "products"
          column_name: "category"
          column_type: VARCHAR
          default_value: "uncategorized"
        ) { success message }

        # Drop a column
        drop_column(
          name: "my_lake"
          table_name: "products"
          column_name: "category"
        ) { success message }

        # Rename a column
        rename_column(
          name: "my_lake"
          table_name: "products"
          old_column_name: "name"
          new_column_name: "title"
        ) { success message }

        # Rename a table
        rename_table(
          name: "my_lake"
          old_table_name: "products"
          new_table_name: "catalog_products"
        ) { success message }

        # Drop a table
        drop_table(name: "my_lake", table_name: "catalog_products") {
          success message
        }

        # Create a schema
        create_schema(name: "my_lake", schema_name: "analytics") {
          success message
        }

        # Drop a schema (must be empty)
        drop_schema(name: "my_lake", schema_name: "analytics") {
          success message
        }
      }
    }
  }
}
```

Allowed column types: `BOOLEAN`, `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, `HUGEINT`, `FLOAT`, `DOUBLE`, `DECIMAL`, `VARCHAR`, `CHAR`, `BLOB`, `DATE`, `TIME`, `TIMESTAMP`, `TIMESTAMPTZ`, `INTERVAL`, `UUID`, `JSON`, `GEOMETRY`.

DDL operations trigger incremental schema recompilation — the new table or column is immediately available in the GraphQL schema.

### Query Functions

```graphql
query {
  function {
    core {
      ducklake {
        # Get catalog info
        info(name: "my_lake") {
          name
          snapshot_count
          current_snapshot
          table_count
          schema_count
          view_count
          schema_version
          metadata_backend
          ducklake_version
          data_path
          created_at
          last_modified_at
        }

        # Get current snapshot ID
        current_snapshot(name: "my_lake")
      }
    }
  }
}
```

### Metadata Views

DuckLake exposes metadata via parameterized views in the `core.ducklake` module:

```graphql
query {
  core {
    ducklake {
      # Snapshot history
      snapshots(args: { name: "my_lake" }) {
        snapshot_id
        snapshot_time
        schema_version
        changes
      }

      # Table statistics
      table_stats(args: { name: "my_lake" }) {
        table_name
        file_count
        file_size_bytes
        delete_file_count
        delete_file_size_bytes
      }

      # Data files for a specific table
      data_files(args: { name: "my_lake", table_name: "orders" }) {
        data_file
        data_file_size_bytes
        delete_file
        delete_file_size_bytes
      }
    }
  }
}
```

## Limitations

### Cluster Environment

When using DuckLake with PostgreSQL metadata in a cluster environment, all nodes share the same metadata database. The metadata backend handles concurrent access automatically. However, DuckDB-file-based metadata does not support concurrent writes from multiple processes — use PostgreSQL metadata for cluster deployments.

### Object Storage

Data files stored on object storage (S3, GCS, Azure) require appropriate storage secrets to be registered in hugr before configuring the DuckLake data source.
