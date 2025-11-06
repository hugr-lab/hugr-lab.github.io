---
title: "Sorting & Pagination"
sidebar_position: 4
---

# Sorting & Pagination

Hugr provides comprehensive sorting and pagination capabilities to control the order and size of query results. You can sort by multiple fields, including nested fields from relations, and paginate results using limit and offset.

## Basic Sorting

### Sort by Single Field

Sort results using the `order_by` argument:

```graphql
query {
  customers(order_by: [{ field: "name", direction: ASC }]) {
    id
    name
    email
  }
}
```

Direction options:
- `ASC` - Ascending order (A-Z, 0-9, oldest to newest)
- `DESC` - Descending order (Z-A, 9-0, newest to oldest)

### Sort by Multiple Fields

Specify multiple sorting criteria (applied in order):

```graphql
query {
  customers(order_by: [
    { field: "country", direction: ASC }
    { field: "city", direction: ASC }
    { field: "name", direction: ASC }
  ]) {
    id
    name
    city
    country
  }
}
```

Equivalent to SQL:
```sql
ORDER BY country ASC, city ASC, name ASC
```

## Sorting by Field Types

### Numeric Fields

```graphql
query {
  products(order_by: [{ field: "price", direction: DESC }]) {
    id
    name
    price
  }
}
```

### String Fields

```graphql
query {
  customers(order_by: [{ field: "name", direction: ASC }]) {
    id
    name
  }
}
```

String sorting is:
- Case-sensitive by default
- Follows database collation rules
- Alphabetical order (A-Z or Z-A)

### Date and Timestamp Fields

```graphql
query {
  orders(order_by: [{ field: "created_at", direction: DESC }]) {
    id
    created_at
    status
  }
}
```

### Boolean Fields

```graphql
query {
  products(order_by: [
    { field: "in_stock", direction: DESC }  # true before false
    { field: "name", direction: ASC }
  ]) {
    id
    name
    in_stock
  }
}
```

## Sorting by Related Fields

### One-to-One Relations

Sort by fields in related objects:

```graphql
query {
  orders(order_by: [
    { field: "customer.country", direction: ASC }
    { field: "customer.name", direction: ASC }
  ]) {
    id
    customer {
      country: country
      name
    }
    total
  }
}
```

**Important**: The related field must be selected in the query:

```graphql
# Valid - customer.name is selected
query {
  orders(order_by: [{ field: "customer.name", direction: ASC }]) {
    id
    customer {
      name  # ✓ Selected
    }
  }
}

# Invalid - customer.name not selected
query {
  orders(order_by: [{ field: "customer.name", direction: ASC }]) {
    id
    customer {
      id  # ✗ name not selected
    }
  }
}
```

### Multiple Relation Levels

```graphql
query {
  order_details(order_by: [
    { field: "product.category.name", direction: ASC }
    { field: "product.name", direction: ASC }
  ]) {
    id
    product {
      name
      category {
        name
      }
    }
  }
}
```

### Sorting by Aggregated Relations

Sort by aggregation results:

```graphql
query {
  customers(order_by: [
    { field: "orders_aggregation.total.sum", direction: DESC }
  ]) {
    id
    name
    orders_aggregation {
      total {
        sum  # Must be selected
      }
    }
  }
}
```

## Field Aliases in ORDER BY

When using field aliases, reference the alias in `order_by`:

```graphql
query {
  products(order_by: [
    { field: "category_name", direction: ASC }
  ]) {
    id
    name
    category {
      category_name: name  # Alias
    }
  }
}
```

## Nested Sorting

For subqueries, use `order_by` or `nested_order_by`:

### order_by in Subqueries

Applies before the join:

```graphql
query {
  customers {
    id
    name
    orders(
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 5
    ) {
      id
      created_at
    }
  }
}
```

### nested_order_by

Applies after the join:

```graphql
query {
  customers {
    id
    name
    orders(
      nested_order_by: [{ field: "created_at", direction: DESC }]
      nested_limit: 5
    ) {
      id
      created_at
    }
  }
}
```

## Basic Pagination

### Using Limit

Limit the number of results:

```graphql
query {
  customers(limit: 10) {
    id
    name
  }
}
```

Default limits:
- Maximum: 2000 records per query
- No default limit (returns all records up to maximum)

### Using Offset

Skip a number of records:

```graphql
query {
  customers(
    limit: 10
    offset: 20
  ) {
    id
    name
  }
}
```

Returns records 21-30.

## Offset-Based Pagination

### Page-by-Page Navigation

```graphql
query GetPage($page: Int!, $pageSize: Int!) {
  customers(
    order_by: [{ field: "id", direction: ASC }]
    limit: $pageSize
    offset: $page * $pageSize
  ) {
    id
    name
    email
  }
}
```

Variables for page 3 with 20 items per page:
```json
{
  "page": 2,
  "pageSize": 20
}
```

### Calculating Total Pages

Use aggregation to get total count:

```graphql
query GetPageWithTotal($page: Int!, $pageSize: Int!) {
  customers(
    order_by: [{ field: "id", direction: ASC }]
    limit: $pageSize
    offset: $page * $pageSize
  ) {
    id
    name
  }

  customers_aggregation {
    _rows_count
  }
}
```

Calculate pages:
```typescript
const totalPages = Math.ceil(
  result.customers_aggregation._rows_count / pageSize
);
```

## Cursor-Based Pagination

For better performance with large datasets, use cursor-based pagination:

```graphql
query GetCustomersAfter($cursor: Int!, $limit: Int!) {
  customers(
    filter: { id: { gt: $cursor } }
    order_by: [{ field: "id", direction: ASC }]
    limit: $limit
  ) {
    id
    name
    email
  }
}
```

Get next page using last ID as cursor:
```json
{
  "cursor": 100,
  "limit": 20
}
```

### Bi-Directional Cursor Pagination

```graphql
# Forward pagination
query GetNext($cursor: Int!, $limit: Int!) {
  customers(
    filter: { id: { gt: $cursor } }
    order_by: [{ field: "id", direction: ASC }]
    limit: $limit
  ) {
    id
    name
  }
}

# Backward pagination
query GetPrevious($cursor: Int!, $limit: Int!) {
  customers(
    filter: { id: { lt: $cursor } }
    order_by: [{ field: "id", direction: DESC }]
    limit: $limit
  ) {
    id
    name
  }
}
```

## Distinct Results

### DISTINCT ON Specific Fields

Get unique values for specified fields:

```graphql
query {
  customers(distinct_on: ["country"]) {
    country
  }
}
```

Returns one customer per unique country.

### Multiple DISTINCT Fields

```graphql
query {
  customers(distinct_on: ["country", "city"]) {
    country
    city
  }
}
```

Returns one customer per unique country-city combination.

### DISTINCT with ORDER BY

Combine DISTINCT with sorting:

```graphql
query {
  orders(
    distinct_on: ["customer_id"]
    order_by: [
      { field: "customer_id", direction: ASC }
      { field: "created_at", direction: DESC }
    ]
  ) {
    customer_id
    created_at
    total
  }
}
```

Returns the most recent order for each customer.

**Important**: When using `distinct_on`, the first `order_by` field must be one of the `distinct_on` fields.

## Nested Pagination

### Limit Subquery Results

```graphql
query {
  customers {
    id
    name
    # Get only 5 most recent orders
    recent_orders: orders(
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 5
    ) {
      id
      created_at
    }
  }
}
```

### nested_limit and nested_offset

Control pagination after joins:

```graphql
query {
  customers(limit: 10) {
    id
    name
    orders(
      nested_order_by: [{ field: "created_at", direction: DESC }]
      nested_limit: 5
      nested_offset: 0
    ) {
      id
      created_at
    }
  }
}
```

Difference between `limit` and `nested_limit`:
- `limit` - Applied before join (limits orders before joining to customers)
- `nested_limit` - Applied after join (limits orders per customer)

## Sorting Aggregations

### Sort Bucket Aggregations

```graphql
query {
  orders_bucket_aggregation(
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
    ]
    limit: 10
  ) {
    key {
      status
    }
    aggregations {
      _rows_count
      total {
        sum  # Must be selected
      }
    }
  }
}
```

### Sort by Multiple Aggregations

```graphql
query {
  products_bucket_aggregation(
    order_by: [
      { field: "aggregations._rows_count", direction: DESC }
      { field: "aggregations.price.avg", direction: ASC }
    ]
  ) {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
      price {
        avg
      }
    }
  }
}
```

### Sort by Key Fields

```graphql
query {
  orders_bucket_aggregation(
    order_by: [
      { field: "key.customer.country", direction: ASC }
      { field: "aggregations.total.sum", direction: DESC }
    ]
  ) {
    key {
      customer {
        country
      }
    }
    aggregations {
      total {
        sum
      }
    }
  }
}
```

## Performance Considerations

### 1. Use Indexes for Sorting

Ensure indexes exist on sorted fields:
```sql
-- PostgreSQL example
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### 2. Limit Results

Always use `limit` to prevent large result sets:

```graphql
# Good
query {
  customers(limit: 100) {
    id
    name
  }
}

# Avoid - May return millions of rows
query {
  customers {
    id
    name
  }
}
```

### 3. Use Cursor Pagination for Large Datasets

Offset pagination becomes slow with high offsets:

```graphql
# Slow for large offsets
query {
  customers(
    order_by: [{ field: "id", direction: ASC }]
    offset: 1000000  # Slow!
    limit: 20
  ) {
    id
  }
}

# Faster with cursor
query {
  customers(
    filter: { id: { gt: 1000000 } }
    order_by: [{ field: "id", direction: ASC }]
    limit: 20
  ) {
    id
  }
}
```

### 4. Limit Nested Queries

Always limit subquery results:

```graphql
query {
  customers(limit: 10) {
    id
    orders(limit: 10) {  # ✓ Limit subquery
      id
    }
  }
}
```

### 5. Sort by Indexed Fields

Prefer sorting by indexed fields:

```graphql
# Good - Primary key is indexed
query {
  customers(order_by: [{ field: "id", direction: ASC }]) {
    id
  }
}

# May be slow - Computed fields aren't indexed
query {
  customers(order_by: [{ field: "full_name", direction: ASC }]) {
    id
  }
}
```

## Common Patterns

### Most Recent Records

```graphql
query {
  orders(
    order_by: [{ field: "created_at", direction: DESC }]
    limit: 20
  ) {
    id
    created_at
  }
}
```

### Top N by Value

```graphql
query {
  products(
    order_by: [{ field: "sales_count", direction: DESC }]
    limit: 10
  ) {
    id
    name
    sales_count
  }
}
```

### Alphabetical List

```graphql
query {
  customers(
    order_by: [{ field: "name", direction: ASC }]
  ) {
    id
    name
  }
}
```

### Random Sample

While Hugr doesn't have built-in random ordering, you can:

1. Get total count
2. Generate random offsets
3. Fetch individual records

```graphql
query {
  # Get total
  customers_aggregation {
    _rows_count
  }
}

# Then fetch random offset
query GetRandom($randomOffset: Int!) {
  customers(
    offset: $randomOffset
    limit: 1
  ) {
    id
    name
  }
}
```

## Next Steps

- Learn about [Relations](./5-relations.md) for working with related data
- See [Aggregations](./7-aggregations.md) for sorting aggregated results
- Check [Filtering](./3-filtering.md) to combine with sorting and pagination
