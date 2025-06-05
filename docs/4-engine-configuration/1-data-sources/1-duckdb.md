---
sidebar_position: 2
title: DuckDB Data Source
---

The DuckDB data source allows you to connect to a DuckDB database file, that can be accessed by multiple users. It can be placed in the file system or in a object storage like S3 or GCS.

To set up a DuckDB data source you need to add data source record to the `data_sources` table through the GraphQL API.

The `path` can point to a duckdb file in the accessible file system location (e.g. `/workplace/my-duckdb-file.duckdb`) or in object storage (e.g. `s3://my-bucket/my-duckdb-file.duckdb`). As well it supports to use in-memory duckdb database by passing `:memory:`.

The database files that are stored in the object storage should be accessible only in the read-only mode.

If you are in the cluster environment you should set the data source read-only to `true`, because the DuckDB database file can be accessed by multiple users and it does not support writes to the same file from different process at the same time.

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
    "name": "ds",
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
        "name": "ds_catalog",
        "description": "",
        "path": "",
        "type": "duckdb"
      }
    ]
  }
}
```
