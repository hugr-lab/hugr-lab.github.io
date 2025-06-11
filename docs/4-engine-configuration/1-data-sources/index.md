---
sidebar_position: 1
title: Overview
description: Overview of the data sources supported by the `hugr` query engine and how to configure them.
---


The `hugr` query engine supports multiple data sources, allowing you to connect to various databases and data stores. Each data source can be configured with its own connection settings and schema definitions (catalogs).
This flexibility enables you to work with different types of data and integrate them into your applications seamlessly.

## Supported Data Sources

The following data sources are supported by the `hugr` query engine:

- **DuckDB**: A lightweight, embedded database engine (see [DuckDB](1-duckdb.md)).
- **PostgreSQL**: A powerful, open-source relational database system (see [PostgreSQL](2-postgres.md)).
- **MySQL**: A widely used open-source relational database management system (see [MySQL](3-mysql.md)).
- **DuckLake**: A data lake solution that supports various storage systems, including cloud storage and distributed file systems. DuckLake is designed to handle large volumes of data and provides efficient querying capabilities and able to manage data and schema changes through snapshots (in development).
- **HTTP RESTful API**: Allows you to connect to any RESTful API endpoint (see [HTTP RESTful API](4-http.md)).
- **Extension**: A special data source types that allows you to extend GraphQL data objects (tables and views) to add extra subquery (joins) and function calls fields. This is useful for creating custom logic or aggregations using data from other sources. The extension data source can also defines cross-data source views, which allow you to combine data from multiple data sources into a single view. This is useful for creating complex queries that span multiple data sources.

The file views (spatial formats, CSV, parquet, etc.) are supported through the DuckDB data source, which can read and write various file formats and locations directly.

## Configuration

### System tables

Data sources can be configured by unified GraphQL API. This allows for a consistent and streamlined approach to managing data sources across different environments and use cases.
The following system tables are available for managing data sources:

- `data_sources`: Contains information about all configured data sources.
- `catalog_sources`: Contains information about the one or more schema definitions (catalogs).
- `catalogs`: Contains information about the assigned catalogs to the data sources.

#### Data Sources Table

The `data_sources` table contains the following fields:

| Field         | Type     | Description                                           |
|---------------|----------|-------------------------------------------------------|
| `name`        | String   | Unique name of the data source.                       |
| `type`        | String   | Type of the data source (e.g., `postgres`, `mysql`, etc.). |
| `prefix`      | String   | Prefix for the data source schema types and queries to avoid naming conflicts. |
| `description` | String   | Description of the data source.                      |
| `as_module`   | Boolean  | Indicates if the data source should be attached to the GraphQL schema as a module. |
| `disabled`    | Boolean  | Indicates if the data source is disabled, and shouldn't be loaded at startup. |
| `path`        | String   | Connection string or path, it depends on data source type.|
| `read_only`   | Boolean  | Indicates if the data source is read-only, it would not allow to generate GraphQL mutations.|
| `self_defined`| Boolean  | Indicates if the data source is self-defined, some of the data source types may return their schema definition with out needs to make catalogs. |

The path can contain environment variables, which will be resolved at runtime. This allows for flexible configuration without hardcoding sensitive information like passwords. The name of the environment variable should be passed in the format `[$ENV_VAR_NAME]`.

#### Catalog sources Table

The `catalog_sources` table contains the following fields:

| Field         | Type     | Description                                           |
|---------------|----------|-------------------------------------------------------|
| `name`        | String   | Unique name of the catalog.                           |
| `type`        | String   | Type of the catalog (e.g., `uri`, `localFS`, etc.).   |
| `description` | String   | Description of the catalog.                           |
| `path`        | String   | Path to the catalog file or URI.                      |

### System functions

To manually load/reload or unload the data sources you can use the `load_data_sources` and `unload_data_sources` mutation function. These mutations allow you to dynamically manage the data sources without needing to restart the engine.

```graphql
mutation loadDataSources {
  core {
    load_data_sources(name: "northwind") {
      success
      message
    }
  }
}
```

```graphql
mutation unloadDataSources {
  core {
    unload_data_sources(name: "northwind") {
      success
      message
    }
  }
}
```

All GraphQL queries and mutations to manage data sources are available in the module `core` in the root query and mutation types.

In clustered environments, to load/reload or unload data sources, you can use the `load_data_sources` and `unload_data_sources` mutations in `core.cluster` module. These mutations ensure that the data sources are synchronized across all nodes in the cluster.

```graphql
mutation loadDataSources {
  core {
    cluster{
      load_data_sources(name: "northwind") {
        success
        message
      }
    }
  }
}
```

```graphql
mutation unloadDataSources {
  core {
    cluster {
      unload_data_sources(name: "northwind") {
        success
        message
      }
    }
  }
}
```

You can get the list of all data sources by querying the `data_sources` table:

```graphql
query getDataSources {
  core {
    data_sources {
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

## Example Configuration

Here is an example of how to configure a PostgreSQL data source:

```graphql
mutation addNorthwindDataSet($data: data_sources_mut_input_data! = {}) {
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
    "name": "northwind",
    "type": "postgres",
    "prefix": "nw",
    "description": "The Northwind database example",
    "read_only": false,
    "as_module": true,
    "path": "postgres://hugr:hugr_password@postgres:5432/northwind",
    "catalogs": [
      {
        "name": "northwind",
        "type": "uri",
        "description": "Northwind database schema",
        "path": "/workspace/get-started/schema"
      }
    ]
  }
}
```

To learn how to mutation works go to the [GraphQL Operations - Mutations](../../5-graphql/2-mutations.md) section.

## Self-Describing Data Sources

The data sources can be marked as self-describing (`self_defined: true`), which means that the data source will provide its own schema definition. This is useful for data sources that can generate their schema dynamically or have a predefined schema that does not require external catalogs.

When a data source is self-defined, it will automatically generate the GraphQL schema. All rational data sources (DuckDB, PostgreSQL, MySQL) support self-defined schema generation based on the metadata of the database objects (tables and views), you can use the following query to retrieve the schema:

```graphql
query schema{
  function{
    core{
      describe_data_source_schema(name: "pg", self: true, log: true)
    }
  }
}
```

The argument `self: true` indicates that the schema should be generated based on the data source metadata, if it is not set, the schema will generate based on linked catalogs and self-defined flag. The `log: true` argument will log the generated schema to the stdout, it can be useful for debugging purposes.

## Rational databases

The `hugr` uses the rational database data sources (DuckDB, PostgreSQL, MySQL, DuckLake) as attached databases to the DuckDB query engine. You can explore the internal data sources structure (tables, views, constraints) by using metadata queries by views in core.meta module.

For example, this query is used to define the schema for the self-defined data sources:

```graphql
query dbMeta($name: String!) {
  core {
    meta {
      databases_by_name(name: $name) {
        name
        description: comment
        type
        schemas(filter:{
          _or:[
            {internal: {eq: false}}
            {name: {eq: "public"}}
            {name: {eq: "main"}}
          ]
          _not: {
                  _or:[
              {name: {like: "_timescaledb%"}}
              {name: {eq: "timescaledb_experimental"}}
              {name: {eq: "timescaledb_information"}}
            ]
          }
        }){
          name
          description: comment
          tables(filter:{internal: {eq: false}}){
            name
            description: comment
            schema_name: schema_name
            columns(filter: {internal: {eq: false}}){
              name
              description: comment
              data_type
              default
              is_nullable
            }
            constraints(filter:{
              database_name: {eq: $name}
            }){
              name
              type
              references_schema_name: schema_name
              references_table_name
              columns
              references_columns
            }
          }
          views(filter:{internal: {eq: false}}){
            name
            description: comment
            schema_name: schema_name
            columns(filter: {internal: {eq: false}}){
              name
              description: comment
              data_type
              default
              is_nullable
            }
          }
        }
      }
    }
  }
}
```

## Service data sources

The `hugr` query engine also supports service data sources, which are used to connect to external services or APIs (e.g., REST). These data sources can be used to fetch data from RESTful APIs or other external services.
