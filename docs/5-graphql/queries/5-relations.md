---
title: "Relations & Subqueries"
sidebar_position: 5
---

# Relations & Subqueries

Hugr automatically generates relation fields based on foreign keys defined with `@field_references` and `@references` directives. These fields allow you to fetch related data in a single query, avoiding N+1 query problems and enabling complex data retrieval patterns.

## Basic Relations

### One-to-One Relations

Fetch a single related record:

```graphql
query {
  orders {
    id
    total
    # One-to-one: each order has one customer
    customer {
      id
      name
      email
    }
  }
}
```

### One-to-Many Relations

Fetch multiple related records:

```graphql
query {
  customers {
    id
    name
    # One-to-many: each customer has many orders
    orders {
      id
      total
      created_at
    }
  }
}
```

### Many-to-Many Relations

Access related records through junction tables:

```graphql
query {
  products {
    id
    name
    # Many-to-many through product_categories junction
    categories {
      id
      name
      description
    }
  }

  categories {
    id
    name
    # Reverse many-to-many
    products {
      id
      name
      price
    }
  }
}
```

## Filtering Subqueries

### Filter Related Records

Apply filters to subqueries:

```graphql
query {
  customers {
    id
    name
    # Only pending orders
    pending_orders: orders(
      filter: { status: { eq: "pending" } }
    ) {
      id
      status
      total
    }
  }
}
```

### Complex Subquery Filters

```graphql
query {
  customers {
    id
    name
    # High-value recent orders
    important_orders: orders(
      filter: {
        _and: [
          { total: { gte: 1000 } }
          { created_at: { gte: "2024-01-01" } }
          { status: { in: ["pending", "processing"] } }
        ]
      }
    ) {
      id
      total
      created_at
      status
    }
  }
}
```

### Filter by Nested Relations

```graphql
query {
  customers {
    id
    name
    # Orders containing electronic products
    electronics_orders: orders(
      filter: {
        order_details: {
          any_of: {
            product: {
              category: { name: { eq: "Electronics" } }
            }
          }
        }
      }
    ) {
      id
      total
    }
  }
}
```

## Sorting Subqueries

### order_by for Subqueries

Sort related records:

```graphql
query {
  customers {
    id
    name
    # Most recent orders first
    orders(
      order_by: [{ field: "created_at", direction: DESC }]
    ) {
      id
      created_at
      total
    }
  }
}
```

### Sort by Related Fields

```graphql
query {
  orders {
    id
    total
    # Order details sorted by product name
    order_details(
      order_by: [{ field: "product.name", direction: ASC }]
    ) {
      quantity
      product {
        name
      }
    }
  }
}
```

### nested_order_by

Sort after the join is performed:

```graphql
query {
  customers(limit: 10) {
    id
    name
    orders(
      nested_order_by: [{ field: "total", direction: DESC }]
      nested_limit: 5
    ) {
      id
      total
    }
  }
}
```

Difference between `order_by` and `nested_order_by`:
- `order_by` - Applied before join (to the orders table)
- `nested_order_by` - Applied after join (to orders for each customer)

## Limiting Subqueries

### Basic Limit

Limit the number of related records:

```graphql
query {
  customers {
    id
    name
    # Only last 5 orders
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

Control pagination per parent record:

```graphql
query {
  customers {
    id
    name
    # 5 orders per customer, skip first 10
    orders(
      nested_order_by: [{ field: "created_at", direction: DESC }]
      nested_limit: 5
      nested_offset: 10
    ) {
      id
      created_at
    }
  }
}
```

## Nested Relations

### Multi-Level Nesting

Query through multiple relation levels:

```graphql
query {
  customers {
    id
    name
    orders {
      id
      total
      order_details {
        quantity
        unit_price
        product {
          id
          name
          category {
            id
            name
          }
        }
      }
      shipper {
        name
        phone
      }
    }
  }
}
```

### Filtering Nested Relations

```graphql
query {
  customers {
    id
    name
    orders(
      filter: { status: { eq: "completed" } }
    ) {
      id
      status
      order_details(
        filter: {
          product: {
            category: { name: { eq: "Electronics" } }
          }
        }
      ) {
        quantity
        product {
          name
          category {
            name
          }
        }
      }
    }
  }
}
```

## Aggregating Related Data

### Single Row Aggregation

Get aggregated statistics for related records:

```graphql
query {
  customers {
    id
    name
    # Aggregate all orders
    orders_aggregation {
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

### Filtered Aggregation

Aggregate with filters:

```graphql
query {
  customers {
    id
    name
    # All orders stats
    all_orders: orders_aggregation {
      _rows_count
      total { sum }
    }
    # Only completed orders
    completed_orders: orders_aggregation(
      filter: { status: { eq: "completed" } }
    ) {
      _rows_count
      total { sum }
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

### Nested Aggregations

Aggregate through multiple levels:

```graphql
query {
  customers {
    id
    name
    # Aggregate orders and their details
    orders_aggregation {
      _rows_count
      total { sum }
      # Aggregate order details within orders
      order_details {
        quantity { sum }
        unit_price { avg }
      }
    }
  }
}
```

### Bucket Aggregation on Relations

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
        total {
          sum
          avg
        }
      }
    }
  }
}
```

### Complex Bucket Aggregations

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

## Predefined Joins

### Custom Join Fields

Use `@join` directive for custom join conditions:

```graphql
# Schema definition
extend type customers {
  # Spatial join
  nearby_stores: [stores] @join(
    references_name: "stores"
    sql: "ST_DWithin([source.location], [dest.location], 5000)"
  )
}
```

Query custom joins:

```graphql
query {
  customers {
    id
    name
    location
    # Stores within 5km
    nearby_stores {
      id
      name
      location
    }
  }
}
```

### Complex Join Conditions

```graphql
# Schema definition
extend type orders {
  similar_orders: [orders] @join(
    references_name: "orders"
    source_fields: ["customer_id"]
    references_fields: ["customer_id"]
    sql: """
      [source.id] != [dest.id] AND
      ABS([source.total] - [dest.total]) < 100
    """
  )
}
```

Query with complex joins:

```graphql
query {
  orders {
    id
    total
    customer_id
    # Similar orders from same customer
    similar_orders(limit: 5) {
      id
      total
    }
  }
}
```

### Aggregating Custom Joins

```graphql
query {
  customers {
    id
    name
    # Aggregate nearby stores
    nearby_stores_aggregation {
      _rows_count
    }
    # Group nearby stores by type
    nearby_stores_bucket_aggregation {
      key {
        store_type
      }
      aggregations {
        _rows_count
      }
    }
  }
}
```

## Table Function Joins

### Using @table_function_call_join

For functions returning sets of related data:

```graphql
# Schema definition
extend type sensors {
  readings: [sensor_reading] @table_function_call_join(
    references_name: "get_sensor_readings"
    args: { time_range: "24h" }
    source_fields: ["id"]
    references_fields: ["sensor_id"]
  )
}
```

Query function joins:

```graphql
query {
  sensors {
    id
    name
    # Last 24h readings
    readings(limit: 100) {
      timestamp
      value
      unit
    }
  }
}
```

### Filtering Function Joins

```graphql
query {
  sensors {
    id
    name
    # High readings only
    high_readings: readings(
      filter: { value: { gte: 100 } }
      order_by: [{ field: "timestamp", direction: DESC }]
    ) {
      timestamp
      value
    }
  }
}
```

### Aggregating Function Joins

```graphql
query {
  sensors {
    id
    name
    # Aggregate readings
    readings_aggregation {
      _rows_count
      value {
        avg
        min
        max
      }
    }
  }
}
```

## Inner Joins

By default, Hugr uses LEFT JOINs. Use `inner: true` for INNER JOINs:

```graphql
query {
  customers {
    id
    name
    # Only customers with orders
    orders(inner: true) {
      id
      total
    }
  }
}
```

This excludes customers without orders from results.

## Self-Referential Relations

### Hierarchical Data

```graphql
# Schema definition
type employees @table(name: "employees") {
  id: Int! @pk
  name: String!
  manager_id: Int @field_references(
    references_name: "employees"
    field: "id"
    query: "manager"
    references_query: "subordinates"
  )
}
```

Query hierarchies:

```graphql
query {
  employees {
    id
    name
    # Direct manager
    manager {
      id
      name
    }
    # Direct reports
    subordinates {
      id
      name
    }
  }
}
```

### Multi-Level Hierarchies

```graphql
query {
  employees {
    id
    name
    manager {
      id
      name
      # Manager's manager
      manager {
        id
        name
      }
    }
    subordinates {
      id
      name
      # Subordinates' subordinates
      subordinates {
        id
        name
      }
    }
  }
}
```

## Performance Optimization

### 1. Always Limit Subqueries

```graphql
# Good
query {
  customers {
    id
    orders(limit: 10) {
      id
    }
  }
}

# Avoid - May fetch thousands of orders per customer
query {
  customers {
    id
    orders {
      id
    }
  }
}
```

### 2. Use Aggregations Instead

When you only need counts or statistics:

```graphql
# Better
query {
  customers {
    id
    orders_aggregation {
      _rows_count
      total { sum }
    }
  }
}

# Avoid
query {
  customers {
    id
    orders {
      id
      total
    }
  }
}
```

### 3. Filter Early

Apply filters at the top level when possible:

```graphql
# Better - Filter customers first
query {
  customers(filter: { country: { eq: "USA" } }) {
    id
    orders {
      id
    }
  }
}

# Less efficient - Filter after join
query {
  orders(filter: { customer: { country: { eq: "USA" } } }) {
    id
    customer {
      id
    }
  }
}
```

### 4. Select Only Required Fields

```graphql
# Good
query {
  customers {
    id
    orders(limit: 5) {
      id
      total
    }
  }
}

# Avoid - Fetching unnecessary fields
query {
  customers {
    id
    name
    email
    phone
    address
    orders(limit: 5) {
      id
      total
      status
      created_at
      updated_at
      notes
      metadata
    }
  }
}
```

### 5. Use Batch Loading

Hugr automatically batches subqueries to avoid N+1 problems.

## Common Patterns

### Master-Detail View

```graphql
query GetOrderDetails($orderId: Int!) {
  orders_by_pk(id: $orderId) {
    id
    order_date
    status
    total
    customer {
      name
      email
      phone
    }
    order_details {
      quantity
      unit_price
      product {
        name
        sku
      }
    }
    shipper {
      name
      phone
    }
  }
}
```

### Recent Activity

```graphql
query GetCustomerActivity($customerId: Int!) {
  customers_by_pk(id: $customerId) {
    id
    name
    recent_orders: orders(
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) {
      id
      created_at
      status
      total
    }
  }
}
```

### Dashboard Statistics

```graphql
query GetDashboard {
  customers_aggregation {
    _rows_count
  }

  customers(limit: 10) {
    id
    name
    orders_aggregation {
      _rows_count
      total { sum }
    }
  }

  orders_bucket_aggregation {
    key {
      status
    }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

## Next Steps

- Learn about [Function Fields](./6-function-fields.md) to embed function calls in data objects
- See [Aggregations](./7-aggregations.md) for detailed aggregation patterns
- Check [Dynamic Joins](./8-dynamic-joins.md) for ad-hoc query-time joins
