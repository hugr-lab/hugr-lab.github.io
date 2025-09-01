---
title: Tables
sidebar_position: 2
---

# Tables

Tables are the primary data objects in Hugr, corresponding to physical tables in the underlying database. They support full CRUD operations through the generated GraphQL API.

## Defining Tables

Tables are defined using the `@table` directive on a GraphQL type:

```graphql
type customers @table(name: "customers") {
  id: Int! @pk
  name: String!
  email: String!
  created_at: Timestamp
  deleted_at: Timestamp
}
```

### Table Directive Parameters

- `name` - Physical table name in the database
- `is_m2m` - Marks table as many-to-many relationship (default: false)
- `soft_delete` - Enable soft delete functionality (default: false)
- `soft_delete_cond` - SQL condition to check if record is deleted
- `soft_delete_set` - SQL statement to mark record as deleted

## Primary Keys

Use the `@pk` directive to define primary key fields:

```graphql
type orders @table(name: "orders") {
  id: Int! @pk
  company_id: Int! @pk  # Composite primary key
  customer_id: Int!
  total: Float!
}
```

Primary keys enable:
- Generation of `<table>_by_pk` queries
- Return of inserted records in mutations
- Optimized single-record queries

## Unique Constraints

Define unique constraints using the `@unique` directive:

```graphql
type customers @table(name: "customers") 
  @unique(fields: ["email"])
  @unique(fields: ["tax_id", "country"], query_suffix: "by_tax") {
  id: Int! @pk
  email: String!
  tax_id: String!
  country: String!
}
```

This generates additional queries:
- `customers_by_email`
- `customers_by_tax`

## Field Mapping

Map GraphQL fields to database columns using `@field_source`:

```graphql
type customers @table(name: "customers") {
  id: String! @pk @field_source(field: "customer_id")
  companyName: String! @field_source(field: "company_name")
}
```

## Calculated Fields

Add calculated fields using the `@sql` directive:

```graphql
type order_details @table(name: "order_details") {
  unit_price: Float! @field_source(field: "price")
  quantity: Int!
  discount: Float!
  total: Float! @sql(exp: "round((objects.price * [quantity] * (1 - [discount]))*100)/100")
}
```
**Note:**  

- To reference data object fields within SQL expressions, use the field names enclosed in square brackets `[field_name]`. This applies to both calculated fields and fields that have been renamed using the `@field_source` directive.  
- If you need to access the original source field directly, use the data object alias `objects` with dot notation, for example: `objects.<field_name>`.


## Default Values and Sequences

Define default values or sequences for auto-generated IDs:

```graphql
type customers @table(name: "customers") {
  id: Int! @pk @default(sequence: "customers_id_seq")
  status: String! @default(value: "active")
  created_at: Timestamp!
}
```

## Soft Delete

Enable soft delete to mark records as deleted without physical removal:

```graphql
type customers @table(
  name: "customers"
  soft_delete: true
  soft_delete_cond: "deleted_at IS NULL"
  soft_delete_set: "deleted_at = NOW()"
) {
  id: Int! @pk
  name: String!
  deleted_at: Timestamp
}
```

## Many-to-Many Tables

Define junction tables for many-to-many relationships:

```graphql
type customer_types @table(name: "customer_customer_demo", is_m2m: true) {
  customer_id: String! @pk @field_references(
    references_name: "customers"
    field: "id"
    query: "customer"
    references_query: "types"
  )
  type_id: String! @pk @field_references(
    references_name: "customer_types"
    field: "id"
    query: "type"
    references_query: "customers"
  )
}
```