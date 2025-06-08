---
sidebar_position: 2
title: PostgreSQL Data Source
---

The PostgreSQL data source allows you to connect to a PostgreSQL database. It can be used to access and manipulate data stored in PostgreSQL tables and views.

To set up a PostgreSQL data source you need to add data source record to the `data_sources` table through the GraphQL API.

The `path` should contain PostgreSQL connection string (e.g. `postgres://user:password@host:port/database?param=val`). The path can also contain envinronment variables, for example `postgres://user:password@host:port/[$HUGR_DB_NAME]`. When the data source are being attached to the Hugr engine, the environment variables will be replaced with the actual values.

```graphql
mutation addPostgresDataSet($data: data_sources_mut_input_data! = {}) {
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
    "name": "pg",
    "type": "postgres",
    "connection_string": "postgres://user:password@host:port/database",
    "prefix": "ds1",
    "description": "My PostgreSQL data set",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false,
    "catalogs": [
      {
        "name": "pg_catalog",
        "description": "My PostgreSQL catalog source",
        "path": "s3://my-bucket/pg-catalog/",
        "type": "uri"
      }
    ]
  }
}
```

## PostgreSQL schema definition

As the database source the PostgreSQL data source can be marked as `read_only` or `self_defined`. The `read_only` means that the data source is read-only and its data cannot be modified. The `self_defined` means that the data source is self-defined and the GraphQL schema definition will be generated base on the Tables and Views metadata.

You can also add a number of catalogs to the PostgreSQL data source. All data source catalogs will be merged into one catalog, as well with the self-defined generated definitions.

## Query push-downing

The PostgreSQL data source in `hugr` supports query push-down to the PostgreSQL database. This means that the `hugr` engine will try to push down all parts of the query:

- Filters (`WHERE` clauses)
- Sorting (`ORDER BY` clauses)
- Pagination (`LIMIT` and `OFFSET` clauses)
- Aggregations (`GROUP BY` clauses and aggregate functions like `COUNT`, `SUM`, `AVG`, etc.)
- Joins between tables and views (`JOIN` clauses)

This allows the PostgreSQL database to handle the query execution, which can significantly improve performance for large datasets.

Because the `hugr` supports schema extensions and query-time joins and spatial queries, it can be so when the subquery it self contain joins with other data source data objects, in this case only filters, sorting and pagination can be pushed down.

## Range data types support

The `hugr` supports PostgreSQL range types, which allow you to represent a range of values in a single column. You can use the following types in your schema definitions to work with range data:

- `IntRange`: Represents a range of 4 bytes integers.
- `BigIntRange`: Represents a range of 8 bytes integers.
- `TimestampRange`: Represents a range of timestamps.

## PostGIS support

The PostgreSQL data source also supports PostGIS, which is a spatial database extender for PostgreSQL. If you have PostGIS installed in your PostgreSQL database, you can use spatial queries and functions in your `hugr` queries.

The `hugr` defines special scalar type `geometry` to represent both geometry and geography PostGIS types. You can use this type in your schema definitions to work with spatial data.

## TimescaleDB support

The PostgreSQL data source supports TimescaleDB, which is a time-series database built on top of PostgreSQL. If you have TimescaleDB installed in your PostgreSQL database, you can use time-series queries and functions in your `hugr` queries.

You can use special `@hypertable` directive in table definitions to mark a table as a TimescalleDB hypertable and mark Timestamp column `timescale_key` to use time-series functions (time buckets).

## Limitations

The PostgreSQL auto-generated schema (when `self_defined` is set to `true`) has following limitations:

- Only tables and views are supported. The functions are not supported.
- All views are generated as tables, so you can query them as tables, but also will be generated data mutation operations for them.
- Relationships are not generated for the tables and views. You can define them manually in the catalog files.

So, practically, we don't recommend to use the PostgreSQL data source with `self_defined` set to `true` for the production usage, but it can be used for the schema development - you can get auto-generated schema with following function call after the data source added and attached to the Hugr engine:

```graphql
query schema{
  function{
    core{
      describe_data_source_schema(name: "pg", self: true)
    }
  }
}
```

It will return the schema definition GraphQL string, that you can use to create the catalog file for the data source.

## Example

- PostgreSQL data source example with the Northwind database: [Get Started with PostgreSQL](../../8-examples/1-postgres-get-started.mdx)
