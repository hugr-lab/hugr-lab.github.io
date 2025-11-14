# Aggregations Guide

## 📊 Two Types of Aggregations

Hugr auto-generates two aggregation types for each data object:

1. **`<object>_aggregation`** - Single-row aggregation (aggregate all matching records)
2. **`<object>_bucket_aggregation`** - Bucket aggregation (GROUP BY with aggregations per group)

---

## 🔢 Single Row Aggregation

Aggregate all matching records into a single result:

```graphql
query {
  orders_aggregation(
    filter: { status: { eq: "completed" } }
  ) {
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

**Result:** Single object with aggregated values.

---

## 📦 Bucket Aggregation (GROUP BY)

Group records and aggregate each group:

```graphql
query {
  orders_bucket_aggregation(
    filter: { status: { eq: "completed" } }
  ) {
    key {
      status
      customer {
        country
      }
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
```

**Result:** Array of buckets, each with `key` (grouping fields) and `aggregations` (aggregated values).

---

## 🔧 Aggregation Functions by Type

### Numeric Fields (Int, Float, BigInt)

```graphql
field {
  count             # Count of non-null values
  count(distinct: true)  # Distinct count
  sum               # Sum
  avg               # Average
  min               # Minimum
  max               # Maximum
  stddev            # Standard deviation
  variance          # Variance
  list(distinct: true)  # Array of values
  any               # Any non-null value
  last              # Last non-null value
}
```

### String Fields

```graphql
field {
  count             # Count of non-null values
  count(distinct: true)  # Distinct count
  string_agg(separator: ", ")  # Concatenate
  list(distinct: true)  # Array of values
  any               # Any non-null value
  last              # Last non-null value
}
```

### Boolean Fields

```graphql
field {
  count             # Count of non-null values
  bool_and          # Logical AND
  bool_or           # Logical OR
}
```

### Timestamp/Date Fields

```graphql
field {
  count             # Count of non-null values
  min               # Earliest
  max               # Latest
}
```

### JSON/JSONB Fields

```graphql
metadata {
  count(path: "$.user_id")
  sum(path: "$.amount")
  avg(path: "$.score")
  string_agg(path: "$.name", separator: ", ")
  bool_and(path: "$.active")
  list(path: "$.tags", distinct: true)
}
```

---

## 🔗 Nested Aggregations (Through Relations)

Aggregate related data through defined relationships:

```graphql
query {
  customers_aggregation {
    _rows_count

    # Aggregate related orders
    orders {
      _rows_count
      total {
        sum
        avg
      }

      # Further aggregate order_details
      order_details {
        quantity {
          sum
        }
      }
    }
  }
}
```

**Pattern:** Follows schema relations (customers → orders → order_details).

---

## 📊 Sub-Aggregations

Apply aggregation functions to aggregated results:

```graphql
query {
  regions_bucket_aggregation {
    key {
      region
    }
    aggregations {
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

**Use Case:** Multi-level aggregations (region → stores → revenue).

---

## 🔍 Filtering Aggregations

### Filter Before Aggregating

```graphql
orders_aggregation(
  filter: {
    status: { eq: "completed" }
    created_at: { gte: "2024-01-01" }
  }
) {
  _rows_count
  total { sum }
}
```

### Multiple Aggregations with Different Filters

Use aliases to apply different filters:

```graphql
products_bucket_aggregation {
  key {
    category { name }
  }

  all: aggregations {
    _rows_count
  }

  in_stock: aggregations(
    filter: { stock_quantity: { gt: 0 } }
  ) {
    _rows_count
    stock_quantity { sum }
  }

  on_sale: aggregations(
    filter: { discount: { gt: 0 } }
  ) {
    _rows_count
    discount { avg }
  }
}
```

---

## 🔗 inner on Relation Aggregations

Use `inner: true` on relation aggregations to filter parent records:

```graphql
query {
  customers {
    id
    name

    # Aggregate orders for each customer
    orders_aggregation {
      _rows_count
      total { sum }
    }

    # Aggregate only high-value orders
    # AND filter customers: only those with high-value orders
    high_value_orders: orders_aggregation(
      filter: { total: { gte: 1000 } }
      inner: true  # Only customers with orders matching filter
    ) {
      _rows_count
      total { sum avg }
    }
  }
}
```

**Effect:** Customers without orders ≥ 1000 will still appear, but `high_value_orders` will be null for them. If you want to exclude those customers entirely, use relation filter on the parent query.

---

## 📈 Time-Based Grouping

### Bucket by Time Period

```graphql
orders_bucket_aggregation {
  key {
    date: created_at(bucket: month)
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

**Available buckets:** `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

### Extract Time Parts

```graphql
bucket_aggregation {
  key {
    year: _created_at_part(extract: year)
    month: _created_at_part(extract: month)
  }
  aggregations {
    _rows_count
  }
}
```

### Custom Intervals

```graphql
sensor_data_bucket_aggregation {
  key {
    timestamp(bucket_interval: "15 minutes")
  }
  aggregations {
    temperature { avg min max }
  }
}
```

---

## 🔢 Sorting and Pagination

### Sort by Aggregated Values

```graphql
orders_bucket_aggregation(
  order_by: [
    { field: "aggregations.total.sum", direction: DESC }
  ]
  limit: 10
) {
  key {
    customer_id
  }
  aggregations {
    total { sum }  # Must be selected for sorting
  }
}
```

### Sort by Key Fields

```graphql
products_bucket_aggregation(
  order_by: [
    { field: "key.category.name", direction: ASC }
    { field: "aggregations._rows_count", direction: DESC }
  ]
) {
  key {
    category { name }
  }
  aggregations {
    _rows_count
  }
}
```

### Pagination

```graphql
bucket_aggregation(
  limit: 100
  offset: 0
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]
) {
  key { ... }
  aggregations { ... }
}
```

---

## 🔗 Aggregations with _join

Aggregate dynamically joined data:

```graphql
query {
  products_aggregation {
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
```

**Use Case:** Aggregate data from unrelated tables at query time.

---

## 🗺️ Aggregations with _spatial

Aggregate spatially related records:

```graphql
query {
  cities_aggregation {
    _rows_count
    population { sum avg }

    _spatial(field: "boundary", type: CONTAINS) {
      locations_aggregation(field: "point") {
        _rows_count
      }
    }
  }
}
```

**Use Case:** Aggregate geographic data within spatial boundaries.

---

## 🎯 Key Concepts Summary

| Concept | Usage | Example |
|---------|-------|---------|
| **Single row** | Aggregate all records | `orders_aggregation { ... }` |
| **Bucket** | GROUP BY aggregation | `orders_bucket_aggregation { key {...} aggregations {...} }` |
| **Nested** | Aggregate through relations | `customers_aggregation { orders { ... } }` |
| **Sub-aggregation** | Aggregate aggregations | `stores_aggregation { revenue { sum { sum } } }` |
| **Filtered** | Filter before aggregating | `aggregations(filter: {...})` |
| **inner** | Filter parent by child existence | `orders_aggregation(inner: true, filter: {...})` |
| **Time-based** | Group by time periods | `created_at(bucket: month)` |
| **_join** | Aggregate unrelated data | `_join(fields: [...]) { ..._aggregation }` |
| **_spatial** | Aggregate geographic data | `_spatial(...) { ..._aggregation }` |

---

## 📚 Related Resources

- **Filter operators:** `hugr://docs/data-types` → "Filter Operators by Type"
- **Query patterns:** `hugr://docs/patterns` → "Aggregation Patterns"
- **Filter construction:** `hugr://docs/filters` → Boolean logic, relation filters
- **Validation errors:** `hugr://docs/data-types` → "Common Validation Errors & Fixes"

---

## ⚠️ Common Mistakes

1. ❌ `count_distinct` → ✅ `count(distinct: true)`
2. ❌ Lowercase `desc` → ✅ Uppercase `DESC`
3. ❌ `order_by: { field: "total.sum" }` → ✅ `{ field: "aggregations.total.sum" }` (for bucket aggregations)
4. ❌ Forgot to select field being sorted → ✅ Always select fields used in `order_by`
5. ❌ Using `limit` on aggregation list → ✅ Use `filter` or parent-level `limit`

**For complete error reference:** Read `hugr://docs/data-types` → "Common Validation Errors & Fixes"
