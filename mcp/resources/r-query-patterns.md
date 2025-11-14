# Query Patterns

## ⚠️ CRITICAL Rules

**Before building any query:**

1. **Module Structure** - ALL queries must be wrapped in module structure:
   ```graphql
   query {
     module_name {
       data_object { ... }
     }
   }
   ```
   Root module objects can be at query root. Sub-module objects MUST be nested.

2. **Row Count** - Use `_rows_count` (NOT `count`):
   ```graphql
   aggregation { _rows_count }  # ✅ Correct
   aggregation { count }         # ❌ Wrong
   ```

3. **Sort Direction** - Use UPPERCASE enums:
   ```graphql
   order_by: [{ field: "name", direction: ASC }]  # ✅ Correct
   order_by: [{ field: "name", direction: asc }]  # ❌ Wrong
   # Valid values: ASC, DESC (uppercase!)
   ```

4. **Distinct Count** - Use `count(distinct: true)`:
   ```graphql
   field { count(distinct: true) }  # ✅ Correct
   field { distinct_count }          # ❌ Wrong (doesn't exist)
   field { value_count }             # ❌ Wrong (doesn't exist)
   ```

5. **Verify Fields** - ALWAYS check field existence with `schema-type_fields` before using

6. **Complex Queries First** - Build full query, validate with `limit: 0`, then execute

## Module Structure

### Root Module
```graphql
query {
  # Objects in root module
  customers(limit: 10) { id name }
}
```

### Sub-Module
```graphql
query {
  sales {
    # Objects in sales module
    orders(limit: 10) { id total }
  }
}
```

### Nested Modules
```graphql
query {
  sales {
    analytics {
      # Objects in sales.analytics module
      revenue_summary { metric value }
    }
  }
}
```

## Basic Queries

### List with Filter and Limit
```graphql
data_object(
  filter: { field: { eq: "value" } }
  order_by: [{ field: "field_name", direction: DESC }]
  limit: 100
) {
  id
  field1
  field2
}
```

### Single Record by Primary Key
```graphql
data_object_by_pk(id: 123) {
  id
  field1
}
```

### With Relations
```graphql
parent_object(limit: 10) {
  id
  name

  # One-to-many relation
  child_objects(
    filter: { status: { eq: "active" } }
    nested_limit: 5
  ) {
    id
    value
  }
}
```

## Aggregation Patterns

### Single-Row Aggregation
```graphql
data_object_aggregation(
  filter: { field: { gte: "2024-01-01" } }
) {
  _rows_count  # ✅ Use _rows_count
  numeric_field {
    sum
    avg
    min
    max
    count(distinct: true)  # ✅ Distinct count
  }
}
```

### Bucket Aggregation (GROUP BY)
```graphql
data_object_bucket_aggregation(
  filter: { ... }
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]  # ✅ DESC uppercase
  limit: 10
) {
  key {
    group_field
    related_object {
      category_field
    }
  }
  aggregations {
    _rows_count  # ✅ Use _rows_count
    value_field {
      sum
      avg
      count(distinct: true)  # ✅ Distinct values
    }
  }
}
```

### Time Series
```graphql
data_object_bucket_aggregation(
  order_by: [{ field: "key.date", direction: ASC }]  # ✅ ASC uppercase
) {
  key {
    date: timestamp_field(bucket: day)
  }
  aggregations {
    _rows_count
    value { sum }
  }
}
```

### Multiple Filtered Aggregations
```graphql
data_object_bucket_aggregation {
  key { category }

  all: aggregations {
    _rows_count
  }

  active: aggregations(
    filter: { status: { eq: "active" } }
  ) {
    _rows_count
  }

  high_value: aggregations(
    filter: { value: { gt: 1000 } }
  ) {
    value { sum avg }
  }
}
```

## Deep Nested Filtering

### Filter by Related Objects (Multiple Levels)
```graphql
# Find orders where customer's company is in USA
orders(
  filter: {
    customer: {
      company: {
        country: { eq: "USA" }
      }
    }
  }
  limit: 100
) {
  id
  total
  customer {
    name
    company {
      name
      country
    }
  }
}
```

### Filter with Back-References
```graphql
# Find customers with active orders and shipped items
customers(
  filter: {
    orders: {
      any_of: {
        status: { eq: "active" }
        items: {
          any_of: {
            shipped: { eq: true }
          }
        }
      }
    }
  }
  limit: 100
) {
  id
  name
}
```

### Complex Nested Filter
```graphql
filter: {
  related_object: {
    field1: { eq: "value" }
    sub_related: {
      field2: { gt: 100 }
      deep_related: {
        field3: { in: ["a", "b"] }
      }
    }
    back_refs: {
      any_of: {
        status: { eq: "active" }
      }
    }
  }
}
```

### Alternative: Single Complex Query Instead of Two Queries
```graphql
# ❌ Bad: Two queries
# Query 1: Get IDs
# Query 2: Get data for those IDs

# ✅ Good: One query with nested filter
users(
  filter: {
    purchases: {
      any_of: {
        product: {
          category: { eq: "electronics" }
        }
        amount: { gt: 1000 }
      }
    }
  }
  limit: 100
) {
  id
  name
  purchases(
    filter: {
      product: { category: { eq: "electronics" } }
      amount: { gt: 1000 }
    }
    nested_limit: 10
  ) {
    id
    amount
    product { name }
  }
}
```

## Join Patterns

### Dynamic Join
```graphql
object_a {
  id
  join_field

  _join(fields: ["join_field"]) {
    object_b(fields: ["matching_field"]) {
      id
      data
    }
  }
}
```

### Multi-Field Join
```graphql
_join(fields: ["field1", "field2"]) {
  target_object(fields: ["match1", "match2"]) {
    ...
  }
}
```

### Join with Aggregation
```graphql
parent_object {
  id

  _join(fields: ["id"]) {
    related_aggregation(fields: ["parent_id"]) {
      _rows_count
      value { sum }
    }
  }
}
```

### Cross-Source Join
```graphql
source_a_object {
  id
  email

  _join(fields: ["email"]) {
    source_b_object(fields: ["user_email"]) {
      last_activity
      preferences
    }
  }
}
```

## Query Validation

### Test with limit: 0
```graphql
# Build complex query, test structure with limit: 0
data_object(
  filter: { ... complex filter ... }
  order_by: [{ field: "field", direction: DESC }]
  limit: 0  # ✅ No data returned, but validates query structure
) {
  id
  field1
  related {
    field2
  }
}
# If successful, change limit: 0 to limit: 100
```

## Advanced Patterns

### Spatial Query
```graphql
regions {
  id
  boundary

  _spatial(field: "boundary", type: CONTAINS) {
    points(field: "location") {
      id
      name
    }
  }
}
```

### Semantic Search
```graphql
documents(
  similarity: {
    name: "embedding"
    text: "machine learning research"  # Text query, not vector
    distance: Cosine
    limit: 10
  }
  filter: {
    category: { eq: "research" }
  }
) {
  id
  title
  _distance
}
```

### Multi-Object Query (GraphQL Power!)
```graphql
query {
  # Get data from multiple objects in ONE request
  module_name {
    customers_aggregation {
      _rows_count
    }

    orders(
      filter: { status: { eq: "pending" } }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) {
      id
      total
    }

    revenue_bucket_aggregation {
      key {
        month: created_at(bucket: month)
      }
      aggregations {
        total { sum }
      }
    }
  }
}
# ✅ All results in one response - use jq to transform!
```

### Complex AND/OR Filtering
```graphql
filter: {
  _and: [
    {
      _or: [
        { field1: { eq: "value1" } }
        { field1: { eq: "value2" } }
      ]
    }
    { field2: { gte: 100 } }
    {
      related_objects: {
        any_of: {
          status: { eq: "active" }
          value: { gt: 50 }
        }
      }
    }
  ]
}
```

## Performance Best Practices

### Always Use Limit
```graphql
# ❌ Dangerous
data_object { fields }

# ✅ Safe
data_object(limit: 100) { fields }
```

### Filter Early (Push Down)
```graphql
# ✅ Filter at root - efficient
parent(filter: { field: { eq: "value" } }) {
  children { ... }
}

# ❌ Filter nested - inefficient
parent {
  children(filter: { parent: { field: { eq: "value" } } }) { ... }
}
```

### Use Aggregations Over Fetching
```graphql
# ✅ Efficient - server-side count
data_object_aggregation {
  _rows_count
}

# ❌ Wasteful - fetch all, count client-side
data_object(limit: 10000) {
  id
}
```

### Limit Nested Queries
```graphql
parent(limit: 10) {
  children(nested_limit: 5) { ... }
}
```

### Prefer Exact Operators
```graphql
# ✅ Fast (indexed)
filter: { status: { eq: "active" } }
filter: { country: { in: ["USA", "CA"] } }

# ⚠️ Slower
filter: { name: { like: "%pattern%" } }
filter: { name: { ilike: "%pattern%" } }
filter: { name: { regex: "pattern" } }
```

### Batch with Single Query, Not Loops
```graphql
# ❌ Bad: Generate 100 separate queries
# for id in ids:
#   query { object_by_pk(id: $id) { ... } }

# ✅ Good: Single query with filter
query {
  objects(
    filter: { id: { in: $ids } }
    limit: 1000
  ) {
    id
    data
  }
}
```

## Common Mistakes to Avoid

1. ❌ Using `count` instead of `_rows_count`
2. ❌ Using lowercase `asc`/`desc` instead of `ASC`/`DESC`
3. ❌ Querying outside module structure
4. ❌ Using invented functions like `value_count`, `distinct_count`
5. ❌ Two queries instead of one with nested filters
6. ❌ Python/scripts for query generation instead of direct complex queries
7. ❌ Fetching data for client-side analysis instead of using aggregations
8. ❌ Not validating queries with `limit: 0` first
