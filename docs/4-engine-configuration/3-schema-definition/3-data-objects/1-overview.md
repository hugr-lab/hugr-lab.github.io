---
title: Data Objects Overview
sidebar_position: 1
---

# Data Objects Overview

The data objects section provides an overview of the data structures used in the Hugr query engine. Data objects are the building blocks of database data sources, representing tables and views. They enable processing of tabular data through filtering, aggregation, joins, and mutations via a unified GraphQL API.

## Types of Data Objects

Hugr supports the following types of data objects:

- **Tables** - Primary data objects corresponding to database tables. Support full CRUD operations (create, read, update, delete) through the GraphQL API.
- **Views** - Virtual tables based on query results. Used to simplify complex queries or provide an additional abstraction layer over base tables.
- **Parameterized Views** - Views that accept parameters, enabling dynamic and adaptive APIs while using standard Hugr filtering and aggregation approaches.

## Schema Definition

Data objects are defined as GraphQL types and marked with corresponding directives:
- `@table` for tables
- `@view` for views
- `@view` with additional `@args` for parameterized view arguments

## Generated Operations

For each data object, Hugr automatically generates:

### Queries
- `<object_name>` - Select data with filtering, sorting, pagination
- `<object_name>_by_pk` - Select single record by primary key
- `<object_name>_by_<unique>` - Select single record by unique constraint
- `<object_name>_aggregation` - Aggregate data
- `<object_name>_bucket_aggregation` - Group and aggregate data

### Mutations (tables only)
- `insert_<object_name>` - Insert new records
- `update_<object_name>` - Update existing records
- `delete_<object_name>` - Delete records

## Schema Compilation

During compilation, Hugr enhances data objects with:
- Additional calculated fields for certain data types
- Subquery fields for related objects
- Aggregation and grouping capabilities for related data
- Query-time join fields (`_join`)
- Spatial join fields (`_spatial`) for geometry fields

## Naming and Modules

To avoid naming conflicts:
- Object names can have a prefix defined for the data source
- Objects can be organized into modules for hierarchical query structure

For example, if a data source is named `sales` with prefix `se_`, the `customers` table would become `se_customers` in the GraphQL schema.

## Example

Consider a data source connected as module `sales` with a `customers` table defined in module `crm`:

```graphql
type customers @table(name: "customers") @module(name: "crm") {
  id: Int! @pk
  name: String!
  email: String!
  created_at: Timestamp
}
```

This generates queries accessible as:
```graphql
query {
  sales {
    crm {
      customers { ... }
      customers_by_pk(id: 1) { ... }
      customers_aggregation { ... }
      customers_bucket_aggregation { ... }
    }
  }
}

mutation {
  sales {
    crm {
      insert_customers(data: { ... }) { ... }
      update_customers(filter: { ... }, data: { ... }) { ... }
      delete_customers(filter: { ... }) { ... }
    }
  }
}
```