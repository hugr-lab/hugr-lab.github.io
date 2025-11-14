# Query Building

## Construction Principles

1. **Discover First** - Use discovery tools before building
2. **Filter Early** - Apply filters at highest level possible
3. **Always Limit** - Protect against large result sets
4. **Validate Fields** - Confirm all field names exist
5. **Prefer Aggregations** - Use aggregations vs fetching all data

## Query Type Selection

Based on requirements, choose:

**Data Query** - List records
```graphql
object(filter, order_by, limit) { fields }
```

**Primary Key Query** - Single record
```graphql
object_by_pk(id: value) { fields }
```

**Single Aggregation** - Overall stats
```graphql
object_aggregation(filter) {
  _rows_count
  field { sum avg }
}
```

**Bucket Aggregation** - Grouped analysis
```graphql
object_bucket_aggregation(filter, limit) {
  key { group_fields }
  aggregations { metrics }
}
```

## Filter Construction

### Simple Conditions
```graphql
filter: {
  field: { eq: "value" }
}
```

### Multiple Conditions (AND)
```graphql
filter: {
  field1: { eq: "value1" }
  field2: { gte: 100 }
}
```

### OR Logic
```graphql
filter: {
  _or: [
    { field: { eq: "value1" } }
    { field: { eq: "value2" } }
  ]
}
```

### Relation Filters
```graphql
# One-to-one/Many-to-one
filter: {
  related_object: {
    field: { eq: "value" }
  }
}

# One-to-many/Many-to-many
filter: {
  related_objects: {
    any_of: { field: { eq: "value" } }
  }
}
```

### Operator Selection
Use most efficient operator:
1. `eq`, `in` - Best (indexed)
2. `gt`, `gte`, `lt`, `lte` - Good (range queries)
3. `like` with prefix - OK (`"prefix%"`)
4. `like` with wildcards - Slower (`"%pattern%"`)
5. `ilike` - Case-insensitive (slower)
6. `regex` - Slowest

## Sorting

### Basic Sort
```graphql
order_by: [
  { field: "field_name", direction: DESC }
]
```

### Multi-Field Sort
```graphql
order_by: [
  { field: "priority", direction: DESC }
  { field: "created_at", direction: ASC }
]
```

### Sort Aggregations
```graphql
# For bucket aggregations
order_by: [
  { field: "aggregations.total.sum", direction: DESC }
]
```

**Important:** Sorted fields must be selected in query.

## Pagination

### Root Level
```graphql
object(
  limit: 100
  offset: 0
) { ... }
```

### Nested Level
```graphql
parent(limit: 10) {
  children(
    nested_limit: 5
    nested_offset: 0
  ) { ... }
}
```

**Key Difference:**
- `limit` - Applied before join
- `nested_limit` - Applied after join (per parent)

## Field Selection

Select minimal required fields:

```graphql
# ✅ Good
{
  id
  name
  status
}

# ❌ Bad - unnecessary fields
{
  id
  name
  status
  created_at
  updated_at
  metadata
  notes
  ...
}
```

## Building Aggregations

### Overall Statistics
```graphql
object_aggregation(
  filter: { date_field: { gte: "2024-01-01" } }
) {
  _rows_count
  numeric_field {
    sum
    avg
    min
    max
  }
  date_field {
    min
    max
  }
}
```

### Grouped Analysis
```graphql
object_bucket_aggregation(
  filter: { ... }
  order_by: [{ field: "aggregations.value.sum", direction: DESC }]
  limit: 10
) {
  key {
    category_field
    related { dimension_field }
  }
  aggregations {
    _rows_count
    value { sum avg }
  }
}
```

### Time Series
```graphql
object_bucket_aggregation {
  key {
    time_bucket: timestamp_field(bucket: day)
  }
  aggregations {
    _rows_count
    metric { sum }
  }
}
```

## Building Joins

### Relations (Predefined)
```graphql
parent {
  id
  # Subquery with filter and limit
  children(
    filter: { status: { eq: "active" } }
    nested_limit: 5
  ) {
    id
    value
  }
}
```

### Dynamic Joins
```graphql
source_object {
  id
  join_field

  _join(fields: ["join_field"]) {
    target_object(
      fields: ["matching_field"]
      filter: { ... }
      limit: 100
    ) {
      id
      data
    }
  }
}
```

### Join Aggregations
```graphql
parent {
  id
  _join(fields: ["id"]) {
    child_aggregation(fields: ["parent_id"]) {
      _rows_count
      value { sum }
    }
  }
}
```

## Validation Before Execution

Check:
- [ ] All type names discovered
- [ ] All field names exist in schema
- [ ] Filter operators are valid for field types
- [ ] Sort fields are selected in query
- [ ] Limit is applied (unless by_pk query)
- [ ] Module path is correct
- [ ] Nested queries have nested_limit

## Common Patterns

### Recent Records
```graphql
object(
  order_by: [{ field: "created_at", direction: DESC }]
  limit: 10
) {
  id
  created_at
  ...
}
```

### Search
```graphql
object(
  filter: {
    _or: [
      { field1: { ilike: "%search%" } }
      { field2: { ilike: "%search%" } }
    ]
  }
  limit: 20
) { ... }
```

### Top N
```graphql
object_bucket_aggregation(
  order_by: [{ field: "aggregations.metric.sum", direction: DESC }]
  limit: 10
) {
  key { dimension }
  aggregations { metric { sum } }
}
```

### Date Range
```graphql
filter: {
  date_field: {
    gte: "2024-01-01T00:00:00Z"
    lt: "2024-02-01T00:00:00Z"
  }
}
```

## Error Prevention

### Type Mismatches
```graphql
# ❌ Wrong - Int vs String
_join(fields: ["id"]) {
  other(fields: ["email"]) { ... }
}

# ✅ Right - matching types
_join(fields: ["email"]) {
  other(fields: ["email"]) { ... }
}
```

### Missing Fields
```graphql
# ❌ Wrong - sorting unselected field
order_by: [{ field: "price" }]
{ id name }  # price not selected

# ✅ Right
{ id name price }
```

### Unbounded Queries
```graphql
# ❌ Dangerous
object { ... }

# ✅ Safe
object(limit: 100) { ... }
```

## Performance Checklist

- [ ] `limit` specified on root query
- [ ] `nested_limit` on nested queries
- [ ] Filters use efficient operators (`eq`, `in` over `regex`)
- [ ] Filters applied at highest level
- [ ] Only necessary fields selected
- [ ] Aggregations used instead of fetching all data
- [ ] Indexed fields used in filters/sorts when possible

## Response Template

When building query:

```
Based on discovered schema:
- Module: [name]
- Object: [name] ([table/view])
- Fields: [relevant fields]
- Filters: [filter strategy]

Query strategy:
- Type: [Data/Aggregation/Bucket]
- Limit: [value]
- Sort: [field and direction]

[GraphQL Query]
```


---

{{#if task}}
## Current Task

**Query Requirement:** {{task}}

**Instructions:**
1. Use discovery tools to confirm schema structure first
2. Choose appropriate query type (data/aggregation/bucket)
3. Apply filters, limits, and sorting
4. Follow performance guidelines above
5. Validate query before execution

Use the patterns and guidelines above to construct an efficient query.
{{/if}}
