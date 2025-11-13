# Query Patterns

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
  _rows_count
  numeric_field {
    sum
    avg
    min
    max
  }
}
```

### Bucket Aggregation (GROUP BY)
```graphql
data_object_bucket_aggregation(
  filter: { ... }
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]
  limit: 10
) {
  key {
    group_field
    related_object {
      category_field
    }
  }
  aggregations {
    _rows_count
    value_field {
      sum
      avg
    }
  }
}
```

### Time Series
```graphql
data_object_bucket_aggregation {
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

### Vector Similarity Search
```graphql
documents(
  similarity: {
    name: "embedding"
    vector: [0.1, 0.2, ...]
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

### Complex Filtering
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

### Filter Early
```graphql
# ✅ Filter at root
parent(filter: { field: { eq: "value" } }) {
  children { ... }
}

# ❌ Filter nested
parent {
  children(filter: { parent: { field: { eq: "value" } } }) { ... }
}
```

### Use Aggregations
```graphql
# ✅ Efficient
data_object_aggregation {
  _rows_count
}

# ❌ Wasteful
data_object {
  id
}  # Then count in application
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
