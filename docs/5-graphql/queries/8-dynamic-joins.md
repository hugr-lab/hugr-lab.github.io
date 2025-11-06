---
title: "Dynamic Joins (_join)"
sidebar_position: 8
---

# Dynamic Joins (_join)

Every data object in Hugr includes a special `_join` field that allows you to create ad-hoc joins at query time. This is particularly useful for joining data that doesn't have predefined foreign key relationships, joining across different data sources, or creating complex join patterns dynamically.

## Basic Dynamic Join

### Simple Join by Single Field

Join two data objects by matching field values:

```graphql
query {
  customers {
    id
    name
    email
    # Join with orders at query time
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
        total
        created_at
      }
    }
  }
}
```

This creates a join where `customers.id = orders.customer_id`.

### Join by Multiple Fields

For composite keys, specify multiple fields:

```graphql
query {
  order_details {
    order_id
    product_id
    quantity
    # Join by multiple fields
    _join(fields: ["product_id", "supplier_id"]) {
      supplier_products(fields: ["product_id", "supplier_id"]) {
        price
        lead_time
      }
    }
  }
}
```

This creates: `order_details.product_id = supplier_products.product_id AND order_details.supplier_id = supplier_products.supplier_id`.

## Cross-Source Joins

Join data from different data sources:

```graphql
query {
  # PostgreSQL customers
  postgres_customers {
    id
    email
    # Join with MySQL users by email
    _join(fields: ["email"]) {
      mysql_users(fields: ["email"]) {
        last_login
        preferences
        activity_score
      }
    }
  }
}
```

### Multi-Source Aggregation

Combine data from multiple sources:

```graphql
query {
  # DuckDB analytics
  analytics_customers {
    customer_id
    lifetime_value
    # Join with PostgreSQL orders
    _join(fields: ["customer_id"]) {
      postgres_orders(fields: ["customer_id"]) {
        id
        status
        total
      }
      # And aggregate
      postgres_orders_aggregation(fields: ["customer_id"]) {
        _rows_count
        total { sum avg }
      }
    }
  }
}
```

## Joining with Filters

### Filter Joined Data

Apply filters to the joined data:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        filter: {
          _and: [
            { status: { eq: "completed" } }
            { total: { gte: 100 } }
          ]
        }
      ) {
        id
        total
        status
      }
    }
  }
}
```

### Filter Before Join

The `filter` argument applies **before** the join:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      # Filter orders before joining
      orders(
        fields: ["customer_id"]
        filter: {
          created_at: { gte: "2024-01-01" }
        }
      ) {
        id
        created_at
      }
    }
  }
}
```

## Sorting Joined Data

### order_by for Pre-Join Sorting

Sort **before** the join:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        order_by: [{ field: "created_at", direction: DESC }]
        limit: 5
      ) {
        id
        created_at
      }
    }
  }
}
```

### nested_order_by for Post-Join Sorting

Sort **after** the join:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        nested_order_by: [{ field: "total", direction: DESC }]
        nested_limit: 5
      ) {
        id
        total
      }
    }
  }
}
```

## Pagination for Joined Data

### limit and offset (Pre-Join)

Applied before the join:

```graphql
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        limit: 100
        offset: 0
      ) {
        id
      }
    }
  }
}
```

### nested_limit and nested_offset (Post-Join)

Applied after the join (per parent record):

```graphql
query {
  customers(limit: 10) {
    id
    name
    _join(fields: ["id"]) {
      # Get 5 orders per customer
      orders(
        fields: ["customer_id"]
        nested_order_by: [{ field: "created_at", direction: DESC }]
        nested_limit: 5
        nested_offset: 0
      ) {
        id
        created_at
      }
    }
  }
}
```

## Aggregating Joined Data

### Single Row Aggregation

Aggregate all joined records:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders_aggregation(fields: ["customer_id"]) {
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
}
```

### Filtered Aggregation

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      # All orders
      all_orders: orders_aggregation(fields: ["customer_id"]) {
        _rows_count
        total { sum }
      }
      # Completed orders only
      completed_orders: orders_aggregation(
        fields: ["customer_id"]
        filter: { status: { eq: "completed" } }
      ) {
        _rows_count
        total { sum avg }
      }
    }
  }
}
```

### Bucket Aggregation

Group and aggregate joined data:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      # Group orders by status
      orders_bucket_aggregation(fields: ["customer_id"]) {
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
}
```

### Nested Bucket Aggregation

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders_bucket_aggregation(
        fields: ["customer_id"]
        order_by: [
          { field: "aggregations.total.sum", direction: DESC }
        ]
      ) {
        key {
          status
          created_at(bucket: month)
        }
        aggregations {
          _rows_count
          total { sum avg }
        }
      }
    }
  }
}
```

## Aggregating with Joined Data

Join in aggregation queries:

```graphql
query {
  # Aggregate products
  products_aggregation {
    _rows_count
    price { avg }
    # Join with reviews and aggregate
    _join(fields: ["id"]) {
      reviews_aggregation(fields: ["product_id"]) {
        _rows_count
        rating {
          avg
          min
          max
        }
      }
    }
  }
}
```

Bucket aggregation with joins:

```graphql
query {
  products_bucket_aggregation {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
      price { avg }
      # Join and aggregate reviews per category
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

### Using _join in Grouping Keys

You can use `_join` in bucket aggregation keys to group by fields from joined data:

```graphql
query {
  orders_bucket_aggregation {
    key {
      # Group by joined customer's country
      _join(fields: ["customer_id"]) {
        customers(fields: ["id"]) {
          country
          segment
        }
      }
      status
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

This groups orders by customer country, customer segment, and order status.

**Practical example** - Sales by region and product category:

```graphql
query {
  sales_bucket_aggregation {
    key {
      # Join to get customer region
      customer_info: _join(fields: ["customer_id"]) {
        customers(fields: ["id"]) {
          region
          city
        }
      }
      # Join to get product category
      product_info: _join(fields: ["product_id"]) {
        products(fields: ["id"]) {
          category {
            name
          }
        }
      }
    }
    aggregations {
      _rows_count
      amount { sum avg }
      quantity { sum }
    }
  }
}
```

This creates a multi-dimensional analysis grouping sales by customer region, customer city, and product category.

## Complex Join Patterns

### Chain Multiple Joins

```graphql
query {
  customers {
    id
    name
    # First join: get orders
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
        total
        # Nested join: get order items
        _join(fields: ["id"]) {
          order_details(fields: ["order_id"]) {
            quantity
            product {
              name
            }
          }
        }
      }
    }
  }
}
```

### Multiple Joins on Same Level

**Important:** When using multiple `_join` fields on the same level, you must use aliases to avoid name conflicts.

```graphql
query {
  customers {
    id
    name
    email
    # MUST use aliases for multiple joins
    orders_join: _join(fields: ["id"]) {
      # Join with orders
      orders(fields: ["customer_id"]) {
        id
        total
      }
    }
    # Second join with different source
    crm_join: _join(fields: ["email"]) {
      # Join with external system
      crm_contacts(fields: ["email"]) {
        last_contact
        notes
      }
    }
  }
}
```

### Join with Function Results

Combine joins with function calls:

```graphql
query {
  customers {
    id
    name
    # Get recommendations from function
    recommendations(limit: 5) {
      product_id
      score
      # Join to get product details
      _join(fields: ["product_id"]) {
        products(fields: ["id"]) {
          id
          name
          price
        }
      }
    }
  }
}
```

## Using inner Argument

Control join type (LEFT vs INNER). By default, dynamic joins use LEFT JOIN, which includes all parent records even if no matching child records exist. Use `inner: true` to switch to INNER JOIN behavior.

### LEFT JOIN (default)

```graphql
query {
  customers {
    id
    name
    # LEFT JOIN - includes all customers
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
      }
    }
  }
}
```

**Result:**
- All customers are returned
- Customers without orders have empty joined data
- Use when you want to see all parent records

### INNER JOIN

```graphql
query {
  customers {
    id
    name
    # INNER JOIN - only customers with orders
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        inner: true
      ) {
        id
      }
    }
  }
}
```

**Result:**
- Only customers with orders are returned
- Customers without orders are completely excluded
- Use when you only need records with matching joins

### With Filters

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      # Only customers with high-value orders
      orders(
        fields: ["customer_id"]
        filter: { total: { gte: 1000 } }
        inner: true
      ) {
        id
        total
      }
    }
  }
}
```

Returns only customers who have orders with total >= 1000.

### Cross-Source INNER JOIN

```graphql
query {
  postgres_customers {
    id
    email
    # Only customers who exist in MySQL
    _join(fields: ["email"]) {
      mysql_users(
        fields: ["email"]
        inner: true
      ) {
        last_login
      }
    }
  }
}
```

Returns only customers that exist in both databases.

## Advanced Join Scenarios

### Join with Computed Fields

```graphql
query {
  orders {
    id
    customer_email  # Computed field
    _join(fields: ["customer_email"]) {
      external_users(fields: ["email"]) {
        subscription_tier
        account_status
      }
    }
  }
}
```

### Join with Array Fields

When joining with array fields, joins use **strict equality** with logical AND across all specified fields.

```graphql
query {
  products {
    id
    primary_tag_id  # Single value field
    # Join uses strict equality: products.primary_tag_id = tags.id
    _join(fields: ["primary_tag_id"]) {
      tags(fields: ["id"]) {
        name
        description
      }
    }
  }
}
```

**Note:** Array field joins use exact value matching, not array containment. Multiple fields are joined with AND condition (field1 = field1 AND field2 = field2).

### Self-Join

```graphql
query {
  employees {
    id
    name
    manager_id
    # Self-join to get manager info
    _join(fields: ["manager_id"]) {
      manager: employees(fields: ["id"]) {
        id
        name
        title
      }
    }
  }
}
```

## Combining _join with _spatial

Join dynamically and then apply spatial filters:

```graphql
query {
  customers {
    id
    name
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
        delivery_location
        # Spatial join on delivery locations
        _spatial(field: "delivery_location", type: DWITHIN, buffer: 5000) {
          warehouses(field: "location") {
            id
            name
          }
        }
      }
    }
  }
}
```

## Performance Considerations

### 1. Filter Joined Data

**Important:** Always apply filters to joined data to reduce the dataset and improve performance.

```graphql
# Good - Filter joined data
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        filter: {
          created_at: { gte: "2024-01-01" }
          status: { eq: "completed" }
        }
      ) {
        id
        total
      }
    }
  }
}

# Avoid - Fetching all orders without filters
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
        total
      }
    }
  }
}
```

### 2. Use distinct for Performance

Use `distinct` parameter when joining to eliminate duplicate rows and speed up queries:

```graphql
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        distinct: true  # Eliminates duplicate rows
      ) {
        status
        payment_method
      }
    }
  }
}
```

`distinct` is particularly useful:
- When joining produces duplicate rows
- In aggregations to count unique values
- When fetching lookup/reference data

### 3. Always Use Limit

```graphql
# Good - Limit joined data
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        limit: 100
      ) {
        id
      }
    }
  }
}

# Avoid - May fetch thousands of orders
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
      }
    }
  }
}
```

### 4. Filter Parent Data Early

```graphql
# Good - Filter before join
query {
  customers(filter: { country: { eq: "USA" } }) {
    id
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
      }
    }
  }
}
```

### 5. Use Aggregations When Possible

```graphql
# Better - Use aggregation
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders_aggregation(fields: ["customer_id"]) {
        _rows_count
        total { sum }
      }
    }
  }
}

# Avoid - Fetching all orders just for count
query {
  customers {
    id
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
      }
    }
  }
}
```

### 6. Index Join Fields

Ensure indexes on:
- Source fields (left side of join)
- Target fields (right side of join)
- Fields used in filters
- Fields used in sorting

### 7. Limit Parent Query

```graphql
# Good - Limit parent records
query {
  customers(limit: 10) {
    id
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
      }
    }
  }
}
```

## Common Patterns

### Enrichment from External Source

```graphql
query {
  products {
    id
    sku
    # Enrich with external inventory data
    _join(fields: ["sku"]) {
      external_inventory(fields: ["sku"]) {
        warehouse_location
        quantity_on_hand
        next_restock_date
      }
    }
  }
}
```

### Denormalized Reporting

```graphql
query {
  fact_sales {
    sale_id
    amount
    sale_date
    # Join multiple dimensions - use aliases for multiple joins
    customer_dimension: _join(fields: ["customer_id"]) {
      dim_customers(fields: ["id"]) {
        name
        segment
      }
    }
    product_dimension: _join(fields: ["product_id"]) {
      dim_products(fields: ["id"]) {
        name
        category
      }
    }
  }
}
```

### Audit Trail

```graphql
query {
  orders {
    id
    created_at
    updated_at
    # Join with audit log
    _join(fields: ["id"]) {
      audit_log(
        fields: ["entity_id"]
        filter: {
          entity_type: { eq: "order" }
        }
        order_by: [{ field: "timestamp", direction: DESC }]
      ) {
        timestamp
        action
        user_id
        changes
      }
    }
  }
}
```

## Error Handling

If join fields don't match types, you'll get an error:

```graphql
query {
  customers {
    id  # Int
    _join(fields: ["id"]) {
      # Error: id is Int, but email is String
      orders(fields: ["customer_email"]) {
        id
      }
    }
  }
}
```

## Next Steps

- Learn about [Spatial Queries](./9-spatial.md) for geographic joins
- See [Aggregations](./7-aggregations.md) for aggregating joined data
- Check [Relations](./5-relations.md) for predefined foreign key relationships
