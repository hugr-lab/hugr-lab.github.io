---
sidebar_position: 2
title: PostgreSQL
description: PostgreSQL data source configuration and usage in the Hugr engine. Includes query push-down, range types, PostGIS, and TimescaleDB support.
---


The PostgreSQL data source allows you to connect to a PostgreSQL database. It can be used to access and manipulate data stored in PostgreSQL tables and views.


The PostgreSQL data source is a powerful feature of the Hugr engine, allowing you to leverage the capabilities of PostgreSQL, including query push-down, range data types, PostGIS support, and TimescaleDB support. You can use it to rapidly develop a data backend for your applications and services, while taking advantage of the rich features of PostgreSQL.


Additionally, PostgreSQL with TimescaleDB, PostGIS, and pg_duckdb extensions can be used as a data warehouse, and Hugr can serve as a data access layer for your data warehouse, providing a unified GraphQL API for your data.

## Setting up PostgreSQL data source

To set up a PostgreSQL data source, you need to add a data source record to the `data_sources` table through the GraphQL API.

The `path` should contain a PostgreSQL connection string (e.g., `postgres://user:password@host:port/database?param=val`). The path can also contain environment variables, for example: `postgres://user:password@host:port/[$HUGR_DB_NAME]`. When the data source is being attached to the Hugr engine, the environment variables will be replaced with the actual values.

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


As a database source, the PostgreSQL data source can be marked as `read_only` or `self_defined`. The `read_only` flag means that the data source is read-only and its data cannot be modified. The `self_defined` flag means that the data source is self-defined and the GraphQL schema definition will be generated based on the tables and views metadata.

You can also add multiple catalogs to the PostgreSQL data source. All data source catalogs will be merged into one catalog, along with the self-defined generated definitions.

## Query Push-Down


The PostgreSQL data source in `hugr` supports query push-down to the PostgreSQL database. This means that the `hugr` engine will try to push down all parts of the query:

- Filters (`WHERE` clauses)
- Sorting (`ORDER BY` clauses)
- Pagination (`LIMIT` and `OFFSET` clauses)
- Aggregations (`GROUP BY` clauses and aggregate functions like `COUNT`, `SUM`, `AVG`, etc.)
- Joins between tables and views (`JOIN` clauses)


This allows the PostgreSQL database to handle query execution, which can significantly improve performance for large datasets.

Because `hugr` supports schema extensions, query-time joins, and spatial queries, if a subquery itself contains joins with other data source objects, only filters, sorting, and pagination can be pushed down in that case.

## Range Data Types Support


`hugr` supports PostgreSQL range types, which allow you to represent a range of values in a single column. You can use the following types in your schema definitions to work with range data:

- `IntRange`: Represents a range of 4 bytes integers.
- `BigIntRange`: Represents a range of 8 bytes integers.
- `TimestampRange`: Represents a range of timestamps.

## PostGIS Support


The PostgreSQL data source also supports PostGIS, which is a spatial database extender for PostgreSQL. If you have PostGIS installed in your PostgreSQL database, you can use spatial queries and functions in your `hugr` queries.


`hugr` defines a special scalar type `geometry` to represent both geometry and geography PostGIS types. You can use this type in your schema definitions to work with spatial data.

## TimescaleDB Support


The PostgreSQL data source supports TimescaleDB, which is a time-series database built on top of PostgreSQL. If you have TimescaleDB installed in your PostgreSQL database, you can use time-series queries and functions in your `hugr` queries.

You can use the special `@hypertable` directive in table definitions to mark a table as a TimescaleDB hypertable and mark the timestamp column with `timescale_key` to use time-series functions (time buckets).

## Limitations


The PostgreSQL auto-generated schema (when `self_defined` is set to `true`) has the following limitations:

- Only tables and views are supported. Functions are not supported.
- All views are generated as tables, so you can query them as tables, but data mutation operations will also be generated for them.
- Relationships are not generated for tables and views. You can define them manually in the catalog files.

So, in practice, we do not recommend using the PostgreSQL data source with `self_defined` set to `true` for production usage, but it can be useful for schema development. You can get the auto-generated schema with the following function call after the data source is added and attached to the Hugr engine:

```graphql
query schema{
  function{
    core{
      describe_data_source_schema(name: "pg", self: true)
    }
  }
}
```

It will return the schema definition as a GraphQL string, which you can use to create the catalog file for the data source.

## Example

- PostgreSQL data source example with the Northwind database: [Get Started with PostgreSQL](../../9-examples/1-postgres-get-started.mdx)
