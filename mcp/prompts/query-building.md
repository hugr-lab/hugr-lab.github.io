# Query Building

## ⚠️ CRITICAL: Read Query Patterns Resource First

**BEFORE building ANY query**, read resource `hugr://docs/patterns` for:
- **Anti-Patterns** - What NEVER to do (two queries, Python, etc.)
- **jq Transformations** - How to process data on server (with functions!)
- **Validation Workflow** - MANDATORY validation before execution
- Module structure requirements
- `_rows_count` vs `count`
- `ASC`/`DESC` (uppercase!)
- Scalar vs Relation filter syntax

## ⚠️ CRITICAL: Check Search Results for Completeness

When using introspection tools, **ALWAYS check if you received all results:**

```json
Result format: { "total": 50, "returned": 20, "items": [...] }
```

**If `returned` < `total`** → You're missing results!

- Use pagination (`offset`/`limit`) to get remaining items
- Or use search (`relevance_query`) to find specific fields
- See discovery prompt for detailed examples

**Don't assume a field doesn't exist just because it's not in the first 20 results!**

## Construction Workflow

### Step 1: Get Module Path from Discovery

**Discovery returns `module` field - ALWAYS USE IT!**

```
Example: discovery-search_module_data_objects returns:
{
  name: "orders",
  module: "sales.analytics",  ← Use this full path!
  type: "table"
}

Build query with full module nesting:
query {
  sales {           ← From module path
    analytics {     ← From module path
      orders { ... }
    }
  }
}
```

### Step 2: Verify ALL Fields and Operators

**CRITICAL: Check EVERY field and operator before using!**

```
1. Verify object fields:
   schema-type_fields(type_name: "orders")
   → Check field exists and get its exact type

2. For SCALAR field filters - CHECK OPERATORS:
   schema-type_fields(type_name: "String_filter_input")
   → Returns: {items: [{name: "eq"}, {name: "in"}, {name: "like"}, ...]}
   → Use ONLY what exists: eq, in, like, ilike, regex
   → ❌ NEVER use any_of for scalar fields!

   schema-type_fields(type_name: "Int_filter_input")
   → Returns operators: eq, in, gt, gte, lt, lte

3. For RELATION field filters:
   schema-type_fields(type_name: "orders_filter")
   → Check if relation field exists and its type
   → Many-to-one: direct access
   → One-to-many: any_of/all_of/none_of

4. For aggregations:
   schema-type_fields(type_name: "orders_aggregations")
   → Get exact available functions per field

5. For enums:
   schema-enum_values(type_name: "OrderDirection")
   → Confirm values (ASC/DESC uppercase!)
```

### Step 3: Build Complex Query First

**❌ NEVER do this:** Two queries (see Anti-Patterns in `hugr://docs/patterns`)
**✅ ALWAYS do this:** One query with relation filters or _join

**Bad Approach (DON'T DO THIS!):**
```
1. Query customers where country = "USA" → get IDs
2. Query orders where customer_id IN [IDs]
```

**Good Approach:**
```graphql
query {
  module {
    # ✅ Single query with relation filter
    orders(
      filter: {
        customer: { country: { eq: "USA" } }  # ← Filter through relation!
      }
    ) {
      id
      total
      customer { name country }
    }
  }
}
```

**Or use _join for ad-hoc joins:**
```graphql
query {
  module {
    table_a {
      id
      join_field
      _join(fields: ["join_field"]) {
        table_b(fields: ["matching_field"]) {
          id
          data
        }
      }
    }
  }
}
```

**Multi-object queries in ONE request:**
```graphql
query {
  module {
    # Count records
    customers_aggregation { _rows_count }

    # Get recent orders with filters
    orders(
      filter: { customer: { status: { eq: "active" } } }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) { id customer { name } }

    # Aggregate by month
    orders_bucket_aggregation {
      key { month: created_at(bucket: month) }
      aggregations { total { sum } }
    }
  }
}
```

### Step 4: VALIDATE Query (MANDATORY!)

**🚫 NEVER execute without validating first!**

**Use data-validate_graphql_query - REQUIRED, not optional!**

```
Tool: data-validate_graphql_query
Input: {
  query: "query { module { data_object(filter: {...}, limit: 100) { fields } } }",
  variables: {},
  jq_transform: ".data.module.data_object | map({id, name})"  // If using jq
}

Returns: true ✓
  OR
Error: "Field 'field_name' not found on type 'ObjectType'"
  OR
Error: "jq compile error: syntax error near '}'"
```

**Validates BOTH GraphQL query AND jq transform!**

**Why validation is mandatory:**
- ✅ Catches field name errors before execution
- ✅ Catches type mismatches immediately
- ✅ Validates jq syntax errors
- ✅ Saves time - fails fast without fetching data
- ✅ No wasted API calls

**Workflow:**
```
1. Build query + jq transform
2. ✅ VALIDATE with data-validate_graphql_query
3. If passes → Execute with data-inline_graphql_result (Step 5)
4. If fails → Fix errors and go back to step 2
```

### Step 5: Execute Query and Process with jq

**Execute with jq transform for data processing:**

```
Tool: data-inline_graphql_result
Input: {
  query: "query { module { objects { id name amount } } }",
  jq_transform: ".data.module.objects | map({id, name, amount})"
}
```

**Use jq for ALL data transformations (see `hugr://docs/patterns` for examples):**

```jq
# Basic transformations
.data.module.objects | map({id, name})

# Filtering
.data.module.objects | map(select(.amount > 1000))

# Calculations
.data.module.objects | map({
  id,
  name,
  total: (.items | map(.price) | add)
})

# Grouping
.data.module.objects | group_by(.category) | map({
  category: .[0].category,
  total: map(.amount) | add,
  count: length
})

# Statistics
.data.module.orders_bucket_aggregation | {
  total: map(.aggregations.amount.sum) | add,
  average: (map(.aggregations.amount.sum) | add) / length
}
```

**❌ NEVER use Python/Pandas for these operations!**
**✅ ALWAYS use jq - it runs on the server!**

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


## 🚫 Output Rules

**NO Files Unless Explicitly Requested:**
- ❌ NO `.py`, `.sql`, `.md`, `.html` files
- ❌ NO "demonstration scripts" or "example queries"
- ✅ Everything in chat as plain text

**Be Concise:**
- Show query + brief explanation
- If fails, show error + fix
- Keep it brief - user will ask for detail if needed

**No Unsolicited Advice:**
- ❌ Don't give performance tips (unless asked)
- ❌ Don't suggest optimizations (unless asked)
- ❌ Don't show alternative approaches (unless asked)

## Response Format

✅ **GOOD:**
```
Query validated ✓

query {
  module {
    orders(filter: {customer: {country: {eq: "USA"}}}) {
      id total customer { name }
    }
  }
}

This filters orders by customer's country using relation filter.
```

❌ **BAD:**
```
I've created three files to help you:
1. query_examples.sql - 50 example queries
2. graphql_demo.py - Python script to execute
3. performance_guide.md - Optimization tips
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
