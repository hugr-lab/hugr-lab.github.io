# Relations and Joins

## Overview

Hugr supports two types of data joining:
1. **Relations** - Predefined foreign key relationships (`@field_references`, `@references`)
2. **Dynamic Joins** - Ad-hoc query-time joins (`_join` field)

---

## Relations (Foreign Keys)

### Types of Relations

**One-to-One / Many-to-One:**
```graphql
type orders @table(name: "orders") {
  customer_id: Int! @field_references(
    references_name: "customers"
    field: "id"
    query: "customer"              # Field name on orders
    references_query: "orders"      # Field name on customers
  )
}
```

Generated fields:
- `orders.customer` - Get the customer for an order
- `customers.orders` - Get all orders for a customer

**Many-to-Many:**
```graphql
type product_categories @table(name: "product_categories", is_m2m: true) {
  product_id: Int! @pk @field_references(...)
  category_id: Int! @pk @field_references(...)
}
```

Generated fields:
- `products.categories` - Get all categories for a product
- `categories.products` - Get all products in a category

---

### Querying Relations

#### Basic Subquery

```graphql
customers {
  id
  name
  orders {  # Related orders
    id
    total
    created_at
  }
}
```

#### With Filters

```graphql
customers {
  id
  name
  orders(
    filter: { status: { eq: "pending" } }
    order_by: [{ field: "created_at", direction: DESC }]
    limit: 5
  ) {
    id
    total
  }
}
```

#### Nested Relations

```graphql
customers {
  id
  name
  orders {
    id
    total
    order_details {
      product {
        name
        price
      }
      quantity
    }
  }
}
```

---

### Filtering by Relations

Filter parent records based on related data:

```graphql
# Customers with pending orders over $1000
customers(filter: {
  orders: {
    any_of: {
      _and: [
        { status: { eq: "pending" } }
        { total: { gt: 1000 } }
      ]
    }
  }
}) {
  id
  name
}
```

**List Operators:**
- `any_of` - At least one related record matches
- `all_of` - All related records match
- `none_of` - No related records match

---

### Aggregating Relations

```graphql
customers {
  id
  name

  # Aggregate all orders
  orders_aggregation {
    _rows_count
    total { sum avg }
  }

  # Aggregate recent orders
  recent_orders: orders_aggregation(
    filter: { created_at: { gte: "2024-01-01" } }
  ) {
    _rows_count
    total { sum }
  }
}
```

---

### Nested Pagination

Control pagination at the relation level:

```graphql
customers(limit: 10) {
  id
  name
  orders(
    nested_limit: 5                    # 5 orders per customer
    nested_offset: 0
    nested_order_by: [{ field: "created_at", direction: DESC }]
  ) {
    id
    created_at
  }
}
```

**Key Difference:**
- `limit` - Applied **before** join (total records)
- `nested_limit` - Applied **after** join (per parent)

---

### Inner Joins

Use `inner: true` to exclude records without relations:

```graphql
customers {
  id
  name
  orders(inner: true) {  # Only customers with orders
    id
    total
  }
}
```

**Default behavior is LEFT JOIN** (includes all parent records).

---

## Dynamic Joins (_join)

Every data object has a `_join` field for ad-hoc joins at query time.

### Basic Join

```graphql
customers {
  id
  name
  _join(fields: ["id"]) {
    orders(fields: ["customer_id"]) {
      id
      total
    }
  }
}
```

This creates: `customers.id = orders.customer_id`

---

### Multi-Field Join

```graphql
order_details {
  product_id
  supplier_id
  _join(fields: ["product_id", "supplier_id"]) {
    supplier_products(fields: ["product_id", "supplier_id"]) {
      price
      lead_time
    }
  }
}
```

Creates: `order_details.product_id = supplier_products.product_id AND order_details.supplier_id = supplier_products.supplier_id`

---

### Cross-Source Joins

Join data from different data sources:

```graphql
postgres_customers {
  id
  email
  _join(fields: ["email"]) {
    mysql_users(fields: ["email"]) {
      last_login
      preferences
    }
  }
}
```

---

### Join Arguments

All standard query arguments work with joins:

**filter** - Filter joined data
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    filter: { status: { eq: "completed" } }
  ) { ... }
}
```

**order_by** - Sort before join
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    order_by: [{ field: "created_at", direction: DESC }]
  ) { ... }
}
```

**nested_order_by** - Sort after join
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    nested_order_by: [{ field: "total", direction: DESC }]
  ) { ... }
}
```

**limit** / **offset** - Limit before join
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    limit: 100
  ) { ... }
}
```

**nested_limit** / **nested_offset** - Limit after join (per parent)
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    nested_limit: 5  # 5 orders per customer
  ) { ... }
}
```

**inner** - Use INNER JOIN instead of LEFT JOIN
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    inner: true  # Only customers with orders
  ) { ... }
}
```

**distinct** - Eliminate duplicate rows
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    distinct: true
  ) {
    status
    payment_method
  }
}
```

---

### Aggregating Joined Data

#### Single-Row Aggregation

```graphql
customers {
  id
  name
  _join(fields: ["id"]) {
    orders_aggregation(fields: ["customer_id"]) {
      _rows_count
      total { sum avg }
    }
  }
}
```

#### Filtered Aggregation

```graphql
customers {
  id
  _join(fields: ["id"]) {
    # All orders
    all: orders_aggregation(fields: ["customer_id"]) {
      _rows_count
      total { sum }
    }

    # Completed orders only
    completed: orders_aggregation(
      fields: ["customer_id"]
      filter: { status: { eq: "completed" } }
    ) {
      _rows_count
      total { sum avg }
    }
  }
}
```

#### Bucket Aggregation

```graphql
customers {
  id
  _join(fields: ["id"]) {
    orders_bucket_aggregation(fields: ["customer_id"]) {
      key {
        status
      }
      aggregations {
        _rows_count
        total { sum }
      }
    }
  }
}
```

---

### Using _join in Bucket Keys

Group by fields from joined data:

```graphql
orders_bucket_aggregation {
  key {
    # Join to get customer region
    customer_info: _join(fields: ["customer_id"]) {
      customers(fields: ["id"]) {
        region
        country
      }
    }

    # Join to get product category
    product_info: _join(fields: ["product_id"]) {
      products(fields: ["id"]) {
        category { name }
      }
    }
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

This creates multi-dimensional analysis by customer region/country and product category.

---

### Multiple Joins (Use Aliases)

**Important:** When using multiple `_join` fields, you must use aliases:

```graphql
customers {
  id
  name

  # First join - must use alias
  orders_join: _join(fields: ["id"]) {
    orders(fields: ["customer_id"]) {
      id
      total
    }
  }

  # Second join - must use alias
  crm_join: _join(fields: ["email"]) {
    crm_contacts(fields: ["email"]) {
      last_contact
      notes
    }
  }
}
```

---

### Chaining Joins

```graphql
customers {
  id
  name

  # First join: get orders
  _join(fields: ["id"]) {
    orders(fields: ["customer_id"]) {
      id
      total

      # Nested join: get order details
      _join(fields: ["id"]) {
        order_details(fields: ["order_id"]) {
          quantity
          product { name }
        }
      }
    }
  }
}
```

---

## When to Use Relations vs Dynamic Joins

### Use Relations When:

✅ Relationship is stable and frequently used
✅ Need filter/aggregate by related data
✅ Schema can be updated to define relationship
✅ Joining within same data source

### Use Dynamic Joins When:

✅ Ad-hoc analysis
✅ Cross-source joins
✅ Relationship not defined in schema
✅ Experimental queries
✅ Joining with function results

---

## Common Patterns

### Pattern 1: Customer Order History

```graphql
customers(limit: 10) {
  id
  name
  email

  # Recent orders
  recent_orders: orders(
    filter: { created_at: { gte: "2024-01-01" } }
    order_by: [{ field: "created_at", direction: DESC }]
    nested_limit: 5
  ) {
    id
    total
    status
  }

  # Order statistics
  orders_aggregation {
    _rows_count
    total { sum avg }
  }
}
```

### Pattern 2: Product Details with Categories

```graphql
products {
  id
  name
  price

  # M2M relation
  categories {
    id
    name
  }

  # Supplier (M2O relation)
  supplier {
    id
    company_name
  }
}
```

### Pattern 3: Cross-Source Enrichment

```graphql
postgres_orders {
  id
  customer_email
  total

  # Join with external CRM
  _join(fields: ["customer_email"]) {
    crm_contacts(fields: ["email"]) {
      segment
      lifetime_value
      risk_score
    }
  }
}
```

### Pattern 4: Hierarchical Data

```graphql
# Self-referencing relation
employees {
  id
  name
  title

  # Manager (M2O)
  manager {
    id
    name
    title
  }

  # Subordinates (O2M)
  subordinates {
    id
    name
    title
  }
}
```

---

## Performance Best Practices

### 1. Always Filter Joined Data

```graphql
# ✅ GOOD
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    filter: { created_at: { gte: "2024-01-01" } }
  ) { ... }
}

# ❌ BAD - No filter
_join(fields: ["id"]) {
  orders(fields: ["customer_id"]) { ... }
}
```

### 2. Use nested_limit

```graphql
# ✅ GOOD
customers {
  orders(nested_limit: 5) { ... }
}

# ❌ BAD - Might fetch thousands
customers {
  orders { ... }
}
```

### 3. Use Aggregations When Possible

```graphql
# ✅ GOOD - Efficient aggregation
customers {
  orders_aggregation {
    _rows_count
    total { sum }
  }
}

# ❌ BAD - Fetch all to count
customers {
  orders { id }
}
```

### 4. Index Join Fields

Ensure database indexes on:
- Source join fields
- Target join fields
- Filter fields
- Sort fields

### 5. Use inner: true When Appropriate

```graphql
# Only customers with orders
customers {
  orders(inner: true) { ... }
}
```

---

## Error Handling

### Type Mismatch

```graphql
# ❌ ERROR - Type mismatch
customers {
  id  # Int
  _join(fields: ["id"]) {
    orders(fields: ["customer_email"]) { ... }  # String
  }
}
```

Error: "Type mismatch in join fields: Int cannot be joined with String"

### Invalid Field Names

```graphql
# ❌ ERROR
_join(fields: ["non_existent_field"]) { ... }
```

Error: "Field 'non_existent_field' does not exist"

---

## Next Steps

- **[r-advanced-features.md](./r-advanced-features.md)** - Spatial joins, vector search
- **[p-query-construction.md](./p-query-construction.md)** - AI guidance for building queries
- **[p-performance-optimization.md](./p-performance-optimization.md)** - Performance best practices

## Related Documentation

- [Relations](https://hugr-lab.github.io/docs/graphql/queries/relations)
- [Dynamic Joins](https://hugr-lab.github.io/docs/graphql/queries/dynamic-joins)
- [Foreign Keys](https://hugr-lab.github.io/docs/engine-configuration/schema-definition/data-objects/relations)
