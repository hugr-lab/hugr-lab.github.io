# Aggregations - Single-Row and Bucket Aggregations

## Overview

Hugr provides two types of aggregations for each data object:
1. **Single-Row Aggregation** - `<object>_aggregation` - Aggregate all matching records into one row
2. **Bucket Aggregation** - `<object>_bucket_aggregation` - Group records and aggregate each group (SQL GROUP BY)

---

## Single-Row Aggregation

### Basic Structure

```graphql
<object>_aggregation(
  filter: { ... }
  order_by: [ ... ]
  limit: N
) {
  _rows_count
  field_name {
    aggregation_function
  }
}
```

### Example

```graphql
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
```

**Response:**
```json
{
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
```

---

## Aggregation Functions by Field Type

### Numeric Fields (Int, Float, BigInt)

```graphql
price {
  count          # Count non-null values
  sum            # Sum of all values
  avg            # Average value
  min            # Minimum value
  max            # Maximum value
  list(distinct: true)   # Array of values
  any            # Any non-null value
  last           # Last non-null value
}
```

### String Fields

```graphql
name {
  count                              # Count non-null values
  string_agg(separator: ", ")        # Concatenate with separator
  list(distinct: true)               # Array of values
  any                                # Any non-null value
  last                               # Last non-null value
}
```

### Boolean Fields

```graphql
active {
  count         # Count non-null values
  bool_and      # Logical AND of all values
  bool_or       # Logical OR of all values
}
```

### Timestamp Fields

```graphql
created_at {
  count    # Count non-null values
  min      # Earliest date/time
  max      # Latest date/time
}
```

### JSON/JSONB Fields

```graphql
metadata {
  count(path: "user_id")              # Count specific path
  sum(path: "amount")                 # Sum numeric values
  avg(path: "score")                  # Average
  min(path: "price")                  # Minimum
  max(path: "price")                  # Maximum
  list(path: "tags", distinct: true) # Array of values
  string_agg(path: "name", separator: ", ")
  bool_and(path: "active")
  bool_or(path: "enabled")
  any(path: "status")
  last(path: "status")
}
```

---

## Bucket Aggregation (GROUP BY)

### Basic Structure

```graphql
<object>_bucket_aggregation(
  filter: { ... }
  order_by: [ ... ]
  limit: N
  offset: M
) {
  key {
    field1
    field2
  }
  aggregations {
    _rows_count
    field_name {
      aggregation_function
    }
  }
}
```

### Simple Example

```graphql
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
```

**Response:**
```json
[
  {
    "key": { "status": "pending" },
    "aggregations": {
      "_rows_count": 45,
      "total": { "sum": 4532.10, "avg": 100.71 }
    }
  },
  {
    "key": { "status": "completed" },
    "aggregations": {
      "_rows_count": 1234,
      "total": { "sum": 123456.78, "avg": 100.04 }
    }
  }
]
```

---

## Grouping Strategies

### Group by Single Field

```graphql
products_bucket_aggregation {
  key {
    category
  }
  aggregations {
    _rows_count
    price { avg }
  }
}
```

### Group by Multiple Fields

```graphql
orders_bucket_aggregation {
  key {
    status
    customer { country }
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

### Group by Nested Relations

```graphql
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
    quantity { sum }
    unit_price { avg }
  }
}
```

---

## Time-Based Aggregations

### Group by Time Buckets

```graphql
orders_bucket_aggregation {
  key {
    created_at(bucket: month)
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

**Available buckets:**
- `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

### Extract Time Parts

```graphql
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
```

### Custom Time Intervals

```graphql
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
```

---

## Sorting Aggregations

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
    _rows_count
    total {
      sum  # Must be selected for sorting
    }
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

---

## Multiple Aggregations with Different Filters

Use aliases to apply different filters to aggregations:

```graphql
products_bucket_aggregation {
  key {
    category { name }
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
```

**Sorting with filtered aggregations:**
```graphql
order_by: [
  { field: "premium.price.avg", direction: DESC }
]
```

---

## Nested Aggregations

### Aggregate Related Data

```graphql
customers_aggregation {
  _rows_count

  # Aggregate through relation
  orders {
    _rows_count
    total { sum avg }

    # Further nest
    order_details {
      quantity { sum }
      unit_price { avg }
    }
  }
}
```

### Subquery Aggregations

Aggregate related records for each parent:

```graphql
customers {
  id
  name

  # Aggregate orders for each customer
  orders_aggregation {
    _rows_count
    total { sum avg }
  }
}
```

### Filtered Subquery Aggregations

```graphql
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
    filter: { created_at: { gte: "2024-01-01" } }
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
```

---

## Bucket Aggregations on Relations

### Group Related Data

```graphql
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
```

### With @unnest Directive

Flatten subquery results for aggregation:

```graphql
orders_bucket_aggregation {
  key {
    customer { country }

    # Flatten order_details
    order_details @unnest {
      product {
        category { name }
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
```

**Warning:** `@unnest` multiplies rows like SQL JOIN. Use carefully!

---

## Aggregations with Dynamic Joins

### Join and Aggregate

```graphql
customers {
  id
  _join(fields: ["id"]) {
    orders_aggregation(fields: ["customer_id"]) {
      _rows_count
      total { sum avg }
    }
  }
}
```

### Bucket Aggregation with Joins

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

## Common Patterns

### Pattern 1: Summary Statistics

```graphql
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
```

### Pattern 2: Top N Groups

```graphql
# Top 10 customers by revenue
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
```

### Pattern 3: Time Series Analysis

```graphql
orders_bucket_aggregation(
  filter: { created_at: { gte: "2024-01-01" } }
) {
  key {
    date: created_at(bucket: day)
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

### Pattern 4: Multi-Dimensional Analysis

```graphql
sales_bucket_aggregation {
  key {
    year: sale_date(bucket: year)
    quarter: sale_date(bucket: quarter)
    region
    product { category }
  }
  aggregations {
    _rows_count
    amount { sum }
    quantity { sum }
  }
}
```

---

## Performance Best Practices

### 1. Apply Filters Before Aggregation

```graphql
# ✅ GOOD - Filter first
orders_aggregation(
  filter: { created_at: { gte: "2024-01-01" } }
) {
  _rows_count
  total { sum }
}

# ❌ BAD - Aggregate all, filter later
```

### 2. Limit Bucket Results

```graphql
# ✅ GOOD
orders_bucket_aggregation(
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]
  limit: 100
) {
  key { customer_id }
  aggregations { total { sum } }
}
```

### 3. Use Aggregations Instead of Counting Rows

```graphql
# ❌ BAD - Fetch all rows just to count
customers {
  orders { id }
}
# Then count in application

# ✅ GOOD - Use aggregation
customers {
  orders_aggregation {
    _rows_count
  }
}
```

### 4. Index Group By Fields

Ensure indexes exist on:
- Fields used in `key` (GROUP BY)
- Fields used in `filter`
- Fields used in `order_by`

---

## Next Steps

- **[r-relations-joins.md](./r-relations-joins.md)** - Learn about relations and joins
- **[r-advanced-features.md](./r-advanced-features.md)** - Explore spatial and vector aggregations
- **[p-data-analysis.md](./p-data-analysis.md)** - AI guidance for data analysis

## Related Documentation

- [Aggregations](https://hugr-lab.github.io/docs/graphql/queries/aggregations)
- [Bucket Aggregations](https://hugr-lab.github.io/docs/graphql/queries/aggregations#bucket-aggregation-group-by)
- [Time-Based Aggregations](https://hugr-lab.github.io/docs/graphql/queries/aggregations#time-based-aggregations)
