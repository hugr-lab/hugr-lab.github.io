---
sidebar_position: 2
title: DuckDB
description: DuckDB data source allows you to connect to a DuckDB database file, that can be accessed by multiple users. It can be placed in the file system or in a object storage like S3 or GCS.
---

The DuckDB data source allows you to connect to a DuckDB database file, that can be accessed by multiple users. It can be placed in the file system or in a object storage like S3 or GCS.

To set up a DuckDB data source you need to add data source record to the `data_sources` table through the GraphQL API.

The `path` can point to a duckdb file in the accessible file system location (e.g. `/workplace/my-duckdb-file.duckdb`) or in object storage (e.g. `s3://my-bucket/my-duckdb-file.duckdb`). As well it supports to use in-memory duckdb database by passing `:memory:`.

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

As the database source the DuckDB data source can be marked as `read_only` or `self_defined`. The `read_only` means that the data source is read-only and it cannot be modified. The `self_defined` means that the data source is self-defined and the GraphQL schema definition will be generated base on the Table and Views metadata from the DuckDB database.

You can also add a number of catalogs to the DuckDB data source. All data source catalogs will be merged into one catalog, as well with the self-defined generated definitions.

## DuckDB as a dataset

You can also see that the DuckDB databases with same structure can be used as a dataset in Hugr. We can set up a number of DuckDB databases as data sources as modules, so that the all queries will have same signatures, and you can change only root module name to switch between different datasets.

## DuckDB file views

You can also use DuckDB to view the data in the files, that are stored in the object storage like S3 or GCS. The DuckDB can read the files from the object storage and you can use it as a data source in Hugr.

You can create views in the DuckDB database and use them as a dataset in `hugr` or you can define it in the catalog sources use `@view` directive with sql parameter to define it. It the last case you can use in memory DuckDB database to query the files without creating a physical DuckDB database file.

## Limitations

### DuckDB in cluster environment

The DuckDB doesn't support the write operations to the same database file from different processes at the same time. So, if you are using DuckDB in the cluster environment, you should set the data source read-only to `true`, because the DuckDB database file can be accessed by multiple users and it does not support writes to the same file from different process at the same time.

### DuckDB on object storage

The database files that are stored in the object storage should be accessible only in the read-only mode.

## DuckDB views

Currently, the DuckDB doesn't support materialized views, and querying across views can have side effects during the query optimization. So, it is recommended to use the DuckDB views only with relations that are not inside in the view base query.

### Self-defined data source

Self-defined data sources can have side effects and support auto-generated relationships only for the DuckDB data source, because it uses the DuckDB metadata queries to generate the schema. For other data sources, you need to define the relationships manually.

### Performance

The files like CSV are very slow to query, so it is recommended to load the data into the DuckDB database or parquet files to improve the performance. The DuckDB can read the parquet files directly from the object storage, so you can use it as a data source in Hugr.

## Examples

You can find the examples of the DuckDB data source:

- [DuckDB: Healthcare - Providers Open Payments Data](../../8-examples/2-duckdb.mdx).
