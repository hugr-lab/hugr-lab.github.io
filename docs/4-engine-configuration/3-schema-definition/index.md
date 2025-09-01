---
slug: /docs/4-engine-configuration/3-schema-definition
title: Overview
sidebar_position: 1
---

The schema definition in the Hugr engine is a crucial aspect that defines the structure and organization of data within the engine. The schema definition describes the data source structures, makes it possible to query and manipulate them by unified GraphQL API. Technically, the schema definition is a GraphQL SDL (Schema Definition Language) documents that specifies the tables, views, relations and functions provided by the data sources as GraphQL objects.

Each hugr data source has its own catalogs, that contains one or many GraphQL files. This files can be stored in the local file system or in the object storages.
If data source is marked as `self_defined`, additional schema definition will be generated.

All hugr specific schema definitions implemented by GraphQL [directives](../../8-references/1-directives.md) that applyed to the types, inputs and fields.

Generated unified GraphQL schema can be extended by a special data source type [`extension`](../4-extension.md).

Schema definition files can contain definition for:
- [Tables](./3-data-objects/2-tables.md)
- [Views](./3-data-objects/3-views.md)
- [Functions](./2-function.md)

For table and view definitions, you can specify foreign key constraints, which allow you to define relationships between tables, subquery fields (joins) and function calls.

Based on the schema definition files, hugr will generate the necessary GraphQL types, queries, and mutations to interact with the defined data sources.

## Subquery

Table and views can include relationships between each other using [foreign key constraints](./3-data-objects/7-relations.md) or defined [join](./3-data-objects/8-joins.md) criteria. These relationships can be used to create more complex queries and to ensure data integrity.

Tables and views can also include function calls with partial argument mapping to the field values.

## Queries and Mutations Structure

For the function, tables and views can be specified [modules](./4-modules.md). This means that generated queries and mutations will be placed in the hierarchical structure based on the module definitions. For example module `sales` for the table `orders` table - the generated data query will be accessible under the `sales` namespace:

```graphql
query {
  sales {
    orders {
      id
      total
    }
  }
}
```

Modules can be nested, allowing for more complex query structures. For example, if you have a module `sales.reports`, you could query it like this:

```graphql
query {
  sales {
    reports {
      total_sales {
        category
        year
        total
      }
    }
  }
}
```

All functions placed in the separate top-level `functions` namespace will be accessible under the `functions` namespace:

```graphql
query {
  functions {
    func1(arg: 1234)
    module{
      func2(val: "example") {
        id
        name
      }
    }
  }
}
```

The generated mutations are generated the same way.