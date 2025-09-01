---
title: Queries
sidebar_position: 4
---

Hugr automatically generates various query types for each data object (table or view). These queries provide comprehensive data access patterns without manual implementation.

## Select Queries

Basic selection query for retrieving multiple records:

```graphql
query {
  customers(
    filter: { country: { eq: "USA" } }
    order_by: [{ field: "name", direction: ASC }]
    limit: 10
    offset: 20
    distinct_on: ["city"]
  ) {
    id
    name
    city
    country
  }
}
```

### Query Arguments

| Argument | Type | Description | Default |
|----------|------|-------------|---------|
| `filter` | `<object>_filter` | Filter conditions | - |
| `order_by` | `[OrderByField]` | Sort order | - |
| `limit` | `Int` | Maximum records to return | 2000 |
| `offset` | `Int` | Number of records to skip | 0 |
| `distinct_on` | `[String]` | Fields for DISTINCT clause | - |

## Select by Primary Key

Retrieve a single record using primary key fields:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    email
  }
}
```

For composite primary keys:

```graphql
query {
  order_details_by_pk(order_id: 100, product_id: 50) {
    quantity
    unit_price
    total
  }
}
```

## Select by Unique Constraint

Queries generated for each unique constraint:

```graphql
query {
  customers_by_email(email: "user@example.com") {
    id
    name
    created_at
  }
}
```

## Filter Input Types

Hugr generates filter input types for each data object:

```graphql
input customers_filter {
  # Scalar field filters
  id: IntFilter
  name: StringFilter
  created_at: TimestampFilter
  
  # Relation filters
  orders: orders_list_filter
  
  # Boolean logic
  _and: [customers_filter]
  _or: [customers_filter]
  _not: customers_filter
}
```

### Filter Operators by Type

**Numeric fields (Int, Float, BigInt):**
- `eq` - Equal to
- `ne` - Not equal to  
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In list
- `is_null` - Is null

**String fields:**
- `eq` - Equal to
- `ne` - Not equal to
- `like` - Pattern match (% as wildcard)
- `ilike` - Case-insensitive pattern match
- `in` - In list
- `regex` - Regular expression match
- `is_null` - Is null

**Boolean fields:**
- `eq` - Equal to
- `is_null` - Is null

**Timestamp/Date fields:**
- `eq` - Equal to
- `gt` - After
- `gte` - After or equal
- `lt` - Before
- `lte` - Before or equal
- `is_null` - Is null

## Complex Filtering

### Boolean Logic

Combine filters using AND, OR, NOT:

```graphql
query {
  orders(filter: {
    _and: [
      { status: { eq: "completed" } }
      { total: { gte: 100 } }
    ]
    _or: [
      { priority: { eq: "high" } }
      { customer: { vip: { eq: true } } }
    ]
    _not: {
      deleted_at: { is_null: false }
    }
  }) {
    id
    status
    total
  }
}
```

### Relation Filters

Filter by related object fields:

```graphql
query {
  customers(filter: {
    orders: {
      any_of: {
        status: { eq: "pending" }
        total: { gt: 1000 }
      }
    }
  }) {
    id
    name
    orders {
      id
      status
      total
    }
  }
}
```

### List Filter Operators

For one-to-many and many-to-many relations:
- `any_of` - At least one related record matches
- `all_of` - All related records match
- `none_of` - No related records match

## Sorting

Sort by single or multiple fields:

```graphql
query {
  products(order_by: [
    { field: "category.name", direction: ASC }
    { field: "price", direction: DESC }
  ]) {
    id
    name
    price
    category {
      name
    }
  }
}
```

## Pagination

Implement pagination using limit and offset:

```graphql
query GetPage {
  customers(
    limit: 10
    offset: 20
  ) {
    id
    name
  }
}
```

With variables:
```graphql
query GetPageWithVars($limit: Int!, $offset: Int!) {
  customers(
    limit: $limit
    offset: $offset
  ) {
    id
    name
  }
}
```

## Distinct Values

Get unique values using distinct_on:

```graphql
query {
  customers(distinct_on: ["country", "city"]) {
    country
    city
  }
}
```

## Parameterized View Queries

For parameterized views, include the args parameter:

```graphql
query {
  top_customers(
    args: {
      from: "2024-01-01"
      to: "2024-12-31"
    }
    filter: { total_spent: { gte: 10000 } }
    limit: 5
  ) {
    customer_id
    total_spent
  }
}
```