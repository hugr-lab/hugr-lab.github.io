---
title: "Aggregations"
sidebar_position: 7
---

# Aggregations

Hugr provides powerful aggregation capabilities for analyzing data. For each data object, two aggregation query types are automatically generated: single-row aggregations (`<object>_aggregation`) and bucket aggregations (`<object>_bucket_aggregation`) for grouped results.

## Single Row Aggregation

Aggregate all matching records into a single result:

```graphql
query {
  orders_aggregation {
    _rows_count
    total {
      sum
      avg
      min
      max
    }
    created_at {
      min
      max
    }
  }
}
```

Response:
```json
{
  "data": {
    "orders_aggregation": {
      "_rows_count": 1523,
      "total": {
        "sum": 152340.50,
        "avg": 100.03,
        "min": 5.99,
        "max": 9999.99
      },
      "created_at": {
        "min": "2023-01-01T00:00:00Z",
        "max": "2024-03-15T23:59:59Z"
      }
    }
  }
}
```

## Aggregation Functions by Type

### Numeric Fields (Int, Float, BigInt)

```graphql
query {
  products_aggregation {
    price {
      count      # Count non-null values
      sum        # Sum of all values
      avg        # Average value
      min        # Minimum value
      max        # Maximum value
      list(distinct: true)  # Array of values
      any        # Any non-null value
      last       # Last non-null value
    }
  }
}
```

### String Fields

```graphql
query {
  customers_aggregation {
    name {
      count                           # Count non-null values
      string_agg(separator: ", ")     # Concatenate with separator
      list(distinct: true)            # Array of values
      any                             # Any non-null value
      last                            # Last non-null value
    }
  }
}
```

### Boolean Fields

```graphql
query {
  products_aggregation {
    in_stock {
      count       # Count non-null values
      bool_and    # Logical AND of all values
      bool_or     # Logical OR of all values
    }
  }
}
```

### Date/Timestamp Fields

```graphql
query {
  orders_aggregation {
    created_at {
      count    # Count non-null values
      min      # Earliest date/time
      max      # Latest date/time
    }
  }
}
```

### JSON/JSONB Fields

```graphql
query {
  events_aggregation {
    metadata {
      count(path: "user_id")           # Count specific path
      sum(path: "amount")              # Sum numeric values
      avg(path: "score")               # Average
      min(path: "price")               # Minimum value
      max(path: "price")               # Maximum value
      list(path: "tags", distinct: true)  # Array of values
      string_agg(path: "name", separator: ", ")  # Concatenate strings
      bool_and(path: "active")         # Logical AND
      bool_or(path: "enabled")         # Logical OR
      any(path: "status")              # Any non-null value
      last(path: "status")             # Last non-null value
    }
  }
}
```

## Filtered Aggregation

Apply filters before aggregating:

```graphql
query {
  orders_aggregation(
    filter: {
      _and: [
        { status: { eq: "completed" } }
        { created_at: { gte: "2024-01-01" } }
      ]
    }
  ) {
    _rows_count
    total {
      sum
      avg
    }
  }
}
```

## Bucket Aggregation (GROUP BY)

Group records and aggregate each group:

```graphql
query {
  orders_bucket_aggregation {
    key {
      status
    }
    aggregations {
      _rows_count
      total {
        sum
        avg
        min
        max
      }
    }
  }
}
```

Response:
```json
{
  "data": {
    "orders_bucket_aggregation": [
      {
        "key": { "status": "pending" },
        "aggregations": {
          "_rows_count": 45,
          "total": { "sum": 4532.10, "avg": 100.71, "min": 10.00, "max": 500.00 }
        }
      },
      {
        "key": { "status": "completed" },
        "aggregations": {
          "_rows_count": 1234,
          "total": { "sum": 123456.78, "avg": 100.04, "min": 5.99, "max": 9999.99 }
        }
      }
    ]
  }
}
```

### Grouping by Multiple Fields

```graphql
query {
  orders_bucket_aggregation {
    key {
      status
      customer {
        country
      }
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

### Grouping by Nested Objects

```graphql
query {
  orders_bucket_aggregation {
    key {
      customer {
        category {
          name
        }
        country
      }
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

## Sorting Aggregations

### Sort by Aggregated Values

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
        sum  # Must be selected for sorting
      }
    }
  }
}
```

### Sort by Key Fields

```graphql
query {
  products_bucket_aggregation(
    order_by: [
      { field: "key.category.name", direction: ASC }
      { field: "aggregations._rows_count", direction: DESC }
    ]
  ) {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
    }
  }
}
```

### Sort by Multiple Aggregations

```graphql
query {
  orders_bucket_aggregation(
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
      { field: "aggregations._rows_count", direction: DESC }
    ]
  ) {
    key {
      customer_id
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

## Time-Based Aggregations

### Group by Time Buckets

```graphql
query {
  orders_bucket_aggregation {
    key {
      created_at(bucket: month)
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

Available time buckets:
- `minute`
- `hour`
- `day`
- `week`
- `month`
- `quarter`
- `year`

### Extract Time Parts

```graphql
query {
  orders_bucket_aggregation {
    key {
      year: _created_at_part(extract: year)
      month: _created_at_part(extract: month)
      day: _created_at_part(extract: day)
      hour: _created_at_part(extract: hour)
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

### Custom Time Intervals

```graphql
query {
  sensor_data_bucket_aggregation {
    key {
      timestamp(bucket_interval: "15 minutes")
    }
    aggregations {
      temperature {
        avg
        min
        max
      }
    }
  }
}
```

## Multiple Aggregations with Filters

Apply different filters to different aggregations using aliases:

```graphql
query {
  products_bucket_aggregation {
    key {
      category {
        name
      }
    }
    # All products
    all: aggregations {
      _rows_count
      price { avg }
    }
    # In stock only
    in_stock: aggregations(
      filter: { in_stock: { eq: true } }
    ) {
      _rows_count
      stock_quantity { sum }
    }
    # On sale only
    on_sale: aggregations(
      filter: { discount: { gt: 0 } }
    ) {
      _rows_count
      discount { avg max }
    }
    # Premium products (price > 100)
    premium: aggregations(
      filter: { price: { gt: 100 } }
    ) {
      _rows_count
      price { avg min max }
    }
  }
}
```

### Sorting Filtered Aggregations

```graphql
query {
  products_bucket_aggregation(
    order_by: [
      { field: "premium.price.avg", direction: DESC }
    ]
  ) {
    key {
      category { name }
    }
    premium: aggregations(
      filter: { price: { gt: 100 } }
    ) {
      _rows_count
      price { avg }
    }
  }
}
```

## Nested Aggregations

### Aggregating Related Data

```graphql
query {
  customers_aggregation {
    _rows_count
    # Aggregate orders through relation
    orders {
      _rows_count
      total {
        sum
        avg
      }
      # Further aggregate order details
      order_details {
        quantity { sum }
        unit_price { avg }
      }
    }
  }
}
```

### Subquery Aggregations

Aggregate related records for each parent:

```graphql
query {
  customers {
    id
    name
    # Aggregate orders for each customer
    orders_aggregation {
      _rows_count
      total {
        sum
        avg
      }
    }
  }
}
```

### Filtered Subquery Aggregations

```graphql
query {
  customers {
    id
    name
    # All orders
    all_orders: orders_aggregation {
      _rows_count
      total { sum }
    }
    # Recent orders only
    recent_orders: orders_aggregation(
      filter: {
        created_at: { gte: "2024-01-01" }
      }
    ) {
      _rows_count
      total { sum avg }
    }
    # High-value orders
    large_orders: orders_aggregation(
      filter: { total: { gte: 1000 } }
    ) {
      _rows_count
      total { sum avg }
    }
  }
}
```

## Bucket Aggregations on Relations

Group and aggregate related data:

```graphql
query {
  customers {
    id
    name
    # Group orders by status
    orders_bucket_aggregation {
      key {
        status
      }
      aggregations {
        _rows_count
        total { sum avg }
      }
    }
  }
}
```

### Nested Bucket Aggregations

```graphql
query {
  customers {
    id
    name
    # Group orders by product category
    orders_bucket_aggregation {
      key {
        order_details @unnest {
          product {
            category {
              name
            }
          }
        }
      }
      aggregations {
        _rows_count
        total { sum }
        order_details {
          quantity { sum }
        }
      }
    }
  }
}
```

## Using @unnest Directive

Flatten subquery results for aggregation:

```graphql
query {
  orders_bucket_aggregation {
    key {
      customer {
        country
      }
      # Flatten order_details
      order_details @unnest {
        product {
          category {
            name
          }
        }
      }
    }
    aggregations {
      _rows_count
      total { sum }
      order_details {
        quantity { sum }
        unit_price { avg }
      }
    }
  }
}
```

**Warning**: `@unnest` multiplies rows like SQL JOIN. Use carefully!

## Aggregations with Grouping by Related Fields

### Group by Foreign Key Fields

```graphql
query {
  orders_bucket_aggregation {
    key {
      customer {
        id
        name
        country
      }
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

### Multiple Relation Levels

```graphql
query {
  order_details_bucket_aggregation {
    key {
      product {
        category {
          name
        }
      }
      order {
        customer {
          country
        }
      }
    }
    aggregations {
      _rows_count
      quantity { sum }
      unit_price { avg }
    }
  }
}
```

## Sub-Aggregations

Apply aggregation functions to aggregated results:

```graphql
query {
  regions_bucket_aggregation {
    key {
      region
    }
    aggregations {
      # Aggregate stores
      stores {
        _rows_count
      }
      # Sub-aggregate: aggregate the aggregations
      stores_aggregation {
        revenue {
          sum {
            sum    # Sum of sums
            avg    # Average of sums
            min    # Minimum sum
            max    # Maximum sum
          }
        }
      }
    }
  }
}
```

## Aggregations with _join

Aggregate dynamically joined data:

```graphql
query {
  products_aggregation {
    _rows_count
    price { avg }
    # Dynamically join and aggregate reviews
    _join(fields: ["id"]) {
      reviews(fields: ["product_id"]) {
        _rows_count
        rating { avg }
      }
    }
  }
}
```

Bucket aggregation with _join:

```graphql
query {
  products_bucket_aggregation {
    key {
      category { name }
    }
    aggregations {
      _rows_count
      price { avg }
      _join(fields: ["id"]) {
        reviews_aggregation(fields: ["product_id"]) {
          _rows_count
          rating { avg }
        }
      }
    }
  }
}
```

## Aggregations with _spatial

Aggregate spatially related records:

```graphql
query {
  cities_aggregation {
    _rows_count
    population { sum avg }
    # Aggregate nearby locations
    _spatial(field: "boundary", type: CONTAINS) {
      locations(field: "point") {
        _rows_count
      }
    }
  }
}
```

Bucket aggregation with spatial:

```graphql
query {
  regions_bucket_aggregation {
    key {
      region_type
    }
    aggregations {
      _rows_count
      area { sum }
      _spatial(field: "boundary", type: CONTAINS) {
        businesses_aggregation(field: "location") {
          _rows_count
        }
        businesses_bucket_aggregation(field: "location") {
          key {
            business_type
          }
          aggregations {
            _rows_count
          }
        }
      }
    }
  }
}
```

## Pagination for Bucket Aggregations

Limit and offset bucket results:

```graphql
query {
  orders_bucket_aggregation(
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
    ]
    limit: 10
    offset: 0
  ) {
    key {
      customer_id
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

## Performance Optimization

### 1. Apply Filters Early

```graphql
# Good - Filter before aggregation
query {
  orders_aggregation(
    filter: {
      created_at: { gte: "2024-01-01" }
    }
  ) {
    _rows_count
    total { sum }
  }
}
```

### 2. Limit Aggregated Data

```graphql
# Use filters to reduce dataset
query {
  large_table_aggregation(
    filter: {
      created_at: { gte: "2024-01-01" }
    }
    limit: 100000
  ) {
    _rows_count
    amount { sum }
  }
}
```

### 3. Limit Bucket Results

```graphql
# Return only top N groups
query {
  orders_bucket_aggregation(
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
    ]
    limit: 100
  ) {
    key { customer_id }
    aggregations {
      total { sum }
    }
  }
}
```

### 4. Use Indexes

Ensure indexes on:
- Fields used in GROUP BY (key fields)
- Fields used in filters
- Fields used in ORDER BY
- Foreign key fields in relations

## Common Patterns

### Sales Dashboard

```graphql
query SalesDashboard {
  # Total sales
  orders_aggregation(
    filter: { status: { eq: "completed" } }
  ) {
    _rows_count
    total { sum avg }
  }

  # Sales by status
  orders_bucket_aggregation {
    key {
      status
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }

  # Top customers
  orders_bucket_aggregation(
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
    ]
    limit: 10
  ) {
    key {
      customer {
        id
        name
      }
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

### Time Series Analysis

```graphql
query TimeSeries {
  orders_bucket_aggregation(
    filter: {
      created_at: { gte: "2024-01-01" }
    }
  ) {
    key {
      date: created_at(bucket: day)
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

### Category Statistics

```graphql
query CategoryStats {
  products_bucket_aggregation {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
      price { avg min max }
      in_stock: aggregations(
        filter: { in_stock: { eq: true } }
      ) {
        _rows_count
      }
    }
  }
}
```

## Next Steps

- Learn about [Dynamic Joins](./8-dynamic-joins.md) for ad-hoc query-time joins
- See [Spatial Queries](./9-spatial.md) for geographic aggregations
- Check [Filtering](./3-filtering.md) for complex aggregation filters
