---
sidebar_position: 2
title: DuckDB
description: DuckDB data source allows you to connect to a DuckDB database file, which can be accessed by multiple users. It can be placed in the file system or in object storage like S3 or GCS.
---


The DuckDB data source allows you to connect to a DuckDB database file, which can be accessed by multiple users. It can be placed in the file system or in object storage like S3 or GCS.

To set up a DuckDB data source, you need to add a data source record to the `data_sources` table through the GraphQL API.

The `path` can point to a DuckDB file in an accessible file system location (e.g., `/workplace/my-duckdb-file.duckdb`) or in object storage (e.g., `s3://my-bucket/my-duckdb-file.duckdb`). It also supports using an in-memory DuckDB database by passing `:memory:`.

```graphql
mutation addDuckDBDataSet($data: data_sources_mut_input_data! = {}) {
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
      catalogs {
        name
        description
        path
        type
      }
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "quack",
    "type": "duckdb",
    "path": "/workplace/my-duckdb-file.duckdb",
    "prefix": "ds1",
    "description": "My DuckDB data set",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false,
    "catalogs": [
      {
        "name": "quack_catalog",
        "description": "My DuckDB catalog source",
        "path": "s3://my-bucket/my-duckdb-catalog.graphql",
        "type": "uriFile"
      }
    ]
  }
}
```

## DuckDB definition


As a database source, the DuckDB data source can be marked as `read_only` or `self_defined`. The `read_only` flag means that the data source is read-only and cannot be modified. The `self_defined` flag means that the data source is self-defined and the GraphQL schema definition will be generated based on the table and view metadata from the DuckDB database.

You can also add multiple catalogs to the DuckDB data source. All data source catalogs will be merged into one catalog, along with the self-defined generated definitions.

## DuckDB as a dataset

DuckDB databases with the same structure can be used as datasets in Hugr. You can set up multiple DuckDB databases as data sources (modules), so that all queries will have the same signatures, and you only need to change the root module name to switch between different datasets.

## DuckDB file views


You can also use DuckDB to view data in files stored in object storage like S3 or GCS. DuckDB can read files directly from object storage, and you can use it as a data source in Hugr.

You can create views in the DuckDB database and use them as a dataset in `hugr`, or you can define them in the catalog sources using the `@view` directive with the `sql` parameter. In the latter case, you can use an in-memory DuckDB database to query the files without creating a physical DuckDB database file.

## Limitations

### DuckDB in cluster environment

DuckDB does not support write operations to the same database file from different processes at the same time. So, if you are using DuckDB in a cluster environment, you should set the data source `read_only` to `true`, because the DuckDB database file can be accessed by multiple users, but it does not support writes to the same file from different processes simultaneously.

### DuckDB on object storage

Database files that are stored in object storage should be accessible only in read-only mode.

## DuckDB views

Currently, DuckDB does not support materialized views, and querying across views can have side effects during query optimization. Therefore, it is recommended to use DuckDB views only with relations that are not included in the base query of the view.

### Self-defined data source

Self-defined data sources can have side effects and support auto-generated relationships only for the DuckDB data source, because it uses DuckDB metadata queries to generate the schema. For other data sources, you need to define the relationships manually.

### Performance

Files like CSV are very slow to query, so it is recommended to load the data into the DuckDB database or Parquet files to improve performance. DuckDB can read Parquet files directly from object storage, so you can use them as a data source in Hugr.

## Examples

You can find examples of the DuckDB data source:

- [DuckDB: Healthcare - Providers Open Payments Data](../../8-examples/2-duckdb.mdx).
- [DuckDB: Spatial - OpenStreetMap](../../8-examples/5-duckdb-spatial.mdx).
