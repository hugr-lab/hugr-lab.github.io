# Query Building

## ⚠️ CRITICAL: Read Query Patterns Resource First

**BEFORE building ANY query**, read resource `hugr://docs/patterns` for:
- Module structure requirements
- `_rows_count` vs `count`
- `ASC`/`DESC` (uppercase!)
- `count(distinct: true)` syntax
- Common mistakes to avoid

## Construction Workflow

### Step 1: Verify ALL Fields with schema-type_fields

**NEVER assume fields exist!**

```
For EACH field you want to use:
1. schema-type_fields(type_name: "ObjectType")
   → Verify field exists and get its type

2. If using filters:
   schema-type_fields(type_name: "ObjectType_filter")
   → Verify filter field exists

3. For filter operators:
   schema-type_fields(type_name: "FieldType_filter_input")
   → Get available operators (eq, in, gt, etc.)

4. If using aggregations:
   schema-type_fields(type_name: "ObjectType_aggregations")
   → Get available functions (sum, avg, count, etc.)

5. For sorting enum values:
   schema-enum_values(type_name: "OrderDirection")
   → Confirm ASC/DESC values
```

### Step 2: Build Complex Query First

**Think GraphQL, not SQL!**

- ❌ Don't: Query IDs first, then query data for those IDs
- ✅ Do: Use nested filters to get everything in ONE query

- ❌ Don't: Multiple simple queries
- ✅ Do: One complex multi-object query

Example:
```graphql
query {
  module {
    # Get counts
    customers_aggregation { _rows_count }

    # Get recent orders
    orders(
      filter: {
        customer: {
          country: { eq: "USA" }
          status: { eq: "active" }
        }
      }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) { id customer { name } }

    # Get revenue by month
    orders_bucket_aggregation {
      key { month: created_at(bucket: month) }
      aggregations { total { sum } }
    }
  }
}
```

### Step 3: Validate Query

**ALWAYS validate before execution!**

**Option 1: Use data-validate_graphql_query (Recommended)**

```
Tool: data-validate_graphql_query
Input: {
  query: "query { module { data_object(filter: {...}, limit: 100) { fields } } }",
  variables: {},
  jq_transform: ".data.module.data_object | map({id, name})"  // Optional
}

Returns: true ✓
  OR
Error: "Field 'field_name' not found on type 'ObjectType'"
  OR
Error: "jq compile error: syntax error near '}'"
```

**Validates both GraphQL query AND jq transform!**

**Option 2: Test with limit: 0**

```graphql
# Test query structure without fetching data
query {
  module {
    data_object(
      filter: { complex_filter_here }
      order_by: [{ field: "field", direction: DESC }]
      limit: 0  # ← No data returned, validates structure
    ) {
      id
      fields
      relations { ... }
    }
  }
}
```

**Best practice:** Use data-validate_graphql_query first, then execute with real data.

### Step 4: Execute and Get Results

Use `data-inline_graphql_result` with optional jq transform.

## Construction Principles

1. **Verify Fields** - ALWAYS use schema-type_fields before using ANY field
2. **Complex First** - Build complete query, validate with limit: 0
3. **Nested Filters** - Use deep filtering instead of multiple queries
4. **Module Structure** - Wrap in correct module hierarchy
5. **Check CRITICAL Rules** - _rows_count, ASC/DESC, count(distinct: true)
6. **Filter Early** - Apply filters at highest level possible
7. **Always Limit** - Protect against large result sets
8. **Prefer Aggregations** - Use server-side aggregations

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

## Anti-Patterns to Avoid

### ❌ Wrong: Two Queries
```
Step 1: Get IDs
query { users(filter: {...}) { id } }

Step 2: Get data for IDs
query { users(filter: { id: { in: $ids } }) { id name } }
```

### ✅ Right: Single Query with Nested Filter
```graphql
query {
  users(
    filter: {
      purchases: {
        any_of: {
          product: { category: { eq: "electronics" } }
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
}
```

### ❌ Wrong: Python/Script for Query Generation
```python
for offset in range(0, total, 100):
    query = f"query {{ objects(limit: 100, offset: {offset}) {{ data }} }}"
    execute(query)
```

### ✅ Right: Single Paginated Query or Aggregation
```graphql
# If need counts only
query { objects_aggregation { _rows_count } }

# If need data
query { objects(limit: 1000) { data } }
```

### ❌ Wrong: Assuming Field Names
```graphql
aggregation {
  count          # ← Doesn't exist!
  value_count    # ← Doesn't exist!
}
order_by: [{ field: "name", direction: asc }]  # ← lowercase!
```

### ✅ Right: Verified Fields
```graphql
aggregation {
  _rows_count    # ← Verified exists
  field {
    count(distinct: true)  # ← Verified syntax
  }
}
order_by: [{ field: "name", direction: ASC }]  # ← Uppercase!
```

### ❌ Wrong: Query Without Module Structure
```graphql
query {
  orders { ... }  # ← May fail if orders is in sub-module
}
```

### ✅ Right: Proper Module Nesting
```graphql
query {
  sales {
    orders { ... }  # ← Correct module path
  }
}
```

## Verification Checklist

Before executing query:

**Field Verification:**
- [ ] Used `schema-type_fields` for object type
- [ ] Verified ALL fields exist
- [ ] Checked filter operators with type introspection
- [ ] Confirmed aggregation functions available
- [ ] Verified enum values (ASC/DESC, etc.)

**Query Structure:**
- [ ] Wrapped in correct module hierarchy
- [ ] Used `_rows_count` (not `count`)
- [ ] Used uppercase `ASC`/`DESC`
- [ ] Applied `limit` to all queries (except _by_pk)
- [ ] Used `nested_limit` for nested queries

**Complexity:**
- [ ] Built complex query instead of multiple simple ones
- [ ] Used nested filters instead of two-step approach
- [ ] Validated with `data-validate_graphql_query` first
- [ ] Considered multi-object query instead of separate requests

**Performance:**
- [ ] Filters at highest level possible
- [ ] Aggregation instead of fetching data
- [ ] Exact operators (eq, in) over patterns (like, regex)

## Response Template

When building query:

```
Verification steps:
1. schema-type_fields(type_name: "ObjectType") ✓
   Fields: [list verified fields]

2. schema-type_fields(type_name: "ObjectType_filter") ✓
   Filter fields: [list]

3. schema-type_fields(type_name: "ObjectType_aggregations") ✓
   Aggregation functions: [list]

Based on discovered schema:
- Module: [name]
- Object: [name] ([table/view])
- Fields: [verified fields]
- Filters: [verified operators]

Query strategy:
- Type: [Data/Aggregation/Bucket/Multi-Object]
- Complexity: [Simple/Complex with nested filters]
- Validation: Will use data-validate_graphql_query first
- Limit: [value]
- Sort: [field, direction in UPPERCASE]

[GraphQL Query]

Validation:
Tool: data-validate_graphql_query
Result: [true ✓ or error message]

Next step: Execute with data-inline_graphql_result (+ optional jq transform).
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
