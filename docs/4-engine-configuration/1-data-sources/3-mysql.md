---
sidebar_position: 4
title: MySQL
description: MySQL data source configuration and usage in Hugr engine. Includes query push-down and JSON support.
---

The MySQL databases can be used as data sources in Hugr engine. The engine doesn't support query push-down for MySQL, but it can be used to access and manipulate data stored in MySQL tables and views.

## Technical details

The MySQL data source is a attached data base in the DuckDB computation engine used by `hugr` query engine. So MySQL has all same limitations as DuckDB data source, but it can be used to access and manipulate data stored in MySQL tables and views.

## Limitations

The MySQL autoincrement columns are not supported in the Hugr engine. Even though the `hugr` engine can read the data and mutate data in the MySQL tables. The insert mutations for tables with primary key in the `hugr` should return created record, but in case the MySQL table has autoincrement primary key, the `hugr` engine cannot return the created record, because it doesn't know the value of the autoincrement column. So, if you want to use MySQL as a data source in Hugr, you should avoid using autoincrement columns in your tables or not define the primary key by those fields.

## Setting up MySQL data source

To set up a MySQL data source you need to add data source record to the `data_sources` table through the GraphQL API.

The `path` should contain MySQL connection string (e.g. `mysql://user:password@host:port/database?param=val`). The path can also contain environment variables, for example `mysql://user:password@host:port/[$HUGR_DB_NAME]`. When the data source is being attached to the Hugr engine, the environment variables will be replaced with the actual values.

```graphql
mutation addMySQLDataSet($data: data_sources_mut_input_data! = {}) {
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
    "name": "mysql",
    "type": "mysql",
    "connection_string": "mysql://user:password@host:port/database",
    "prefix": "ds1",
    "description": "My MySQL data set",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false,
    "catalogs": [
      {
        "name": "mysql_catalog",
        "description": "My MySQL catalog source",
        "path": "s3://my-bucket/my-mysql-catalog.graphql",
        "type": "uriFile"
      }
    ]
  }
}
```

The `connection_string` can also contain the `ssl` parameter to enable SSL connection to the MySQL server, for example: `mysql://user:password@host:port/database?ssl=true`.

## MySQL schema definition

As the database source the MySQL data source can be marked as `read_only` or `self_defined`. The `read_only` means that the data source is read-only and its data cannot be modified. The `self_defined` means that the data source is self-defined and the GraphQL schema definition will be generated based on the Tables and Views metadata.

You can also add a number of catalogs to the MySQL data source. All data source catalogs will be merged into one catalog, as well with the self-defined generated definitions.

## Example

- [MySQL: HR CRM Example](../../8-examples/3-mysql.mdx)
