# Query Patterns

## ⚠️ CRITICAL Rules

**RULE #0: ❌ NEVER USE PYTHON/PANDAS/DUCKDB FOR ANALYSIS!**
**Use ONLY GraphQL aggregations + jq transforms!**

1. **Use Module from Discovery** - Discovery returns `module` field, USE IT:
   ```graphql
   # discovery-search_module_data_objects returns:
   # {name: "orders", module: "sales.analytics", ...}

   query { sales { analytics { orders { id } } } }  # ✅ Use full module path from discovery
   query { orders { id } }                          # ❌ Wrong - missing module!
   ```

2. **ALWAYS Verify Filter Operators** - Check `schema-type_fields` on filter input types:
   ```graphql
   # For SCALAR fields - check available operators first:
   schema-type_fields(type_name: "String_filter_input")
   # Returns: {items: [{name: "eq"}, {name: "in"}, {name: "like"}, ...]}

   # Then use ONLY operators that exist:
   filter: { name: { in: ["A", "B"] } }     # ✅ Correct - "in" exists for String
   filter: { name: { any_of: [...] } }      # ❌ WRONG - any_of is NOT for scalars!
   ```

3. **Scalar vs Relation Filters** - COMPLETELY DIFFERENT syntax:
   ```graphql
   # SCALAR FIELDS (String, Int, Boolean, etc.) - use field operators:
   filter: { status: { eq: "active" } }               # ✅ String with eq operator
   filter: { status: { in: ["active", "pending"] } }  # ✅ String with in operator
   filter: { price: { gt: 100, lt: 500 } }            # ✅ Numeric with gt/lt operators
   filter: { name: { like: "%test%" } }               # ✅ String with like operator

   # ❌ NEVER use any_of/all_of/none_of for scalar fields!
   filter: { status: { any_of: ["active"] } }         # ❌ WRONG!

   # RELATION FIELDS - different syntax based on cardinality:
   # Many-to-one: Direct access to related object fields
   filter: { customer: { country: { eq: "USA" } } }   # ✅ Direct field access

   # One-to-many/Many-to-many: Use any_of, all_of, none_of
   filter: { items: { any_of: { product_id: { eq: 123 } } } }  # ✅ Use any_of for relation
   ```

4. **Row Count** - Use `_rows_count` (NOT `count`):
   ```graphql
   aggregations { _rows_count }  # ✅ Correct
   aggregations { count }        # ❌ Wrong (doesn't exist)
   ```

5. **Sort Direction** - Use UPPERCASE `ASC`/`DESC`:
   ```graphql
   order_by: [{ field: "name", direction: ASC }]   # ✅ Correct
   order_by: [{ field: "name", direction: asc }]   # ❌ Wrong (lowercase)
   ```

6. **Distinct Count** - Use `count(distinct: true)`:
   ```graphql
   field { count(distinct: true) }  # ✅ Correct
   field { distinct_count }          # ❌ Wrong (doesn't exist)
   ```

7. **Large Queries OK** - Use `max_result_size`, NOT Python:
   ```graphql
   # ✅ Single large GraphQL query
   data-inline_graphql_result(query: "...", max_result_size: 50000)

   # ❌ Python/Pandas/DuckDB loops
   ```

8. **Complex Queries First** - Build full nested query, validate with data-validate_graphql_query, then execute

## 🚫 Anti-Patterns: NEVER Do This!

### ❌ WRONG: Two Queries Instead of Relation Filter
```python
# DON'T DO THIS!
# Step 1: Get IDs
query1 = """
query {
  module {
    customers(filter: { country: { eq: "USA" } }) {
      id
    }
  }
}
"""
customer_ids = [r['id'] for r in execute(query1)]

# Step 2: Filter by IDs
query2 = f"""
query {{
  module {{
    orders(filter: {{ customer_id: {{ in: {customer_ids} }} }}) {{
      id total
    }}
  }}
}}
"""
```

### ✅ CORRECT: Single Query with Relation Filter
```graphql
query {
  module {
    orders(
      filter: {
        customer: { country: { eq: "USA" } }  # ← Filter through relation!
      }
    ) {
      id
      total
      customer { id name country }
    }
  }
}
```

### ❌ WRONG: Get Values, Then Use _join
```python
# DON'T DO THIS!
# Step 1: Get email addresses
emails = execute("query { users { email } }")

# Step 2: Use in _join
query = build_join_query_with_emails(emails)
```

### ✅ CORRECT: Direct _join from Source
```graphql
query {
  module {
    users {
      id
      email
      _join(fields: ["email"]) {
        external_profiles(fields: ["email"]) {
          platform
          profile_url
        }
      }
    }
  }
}
```

### ❌ WRONG: Python for Data Transformation
```python
# DON'T DO THIS!
results = execute(query)
transformed = []
for item in results:
    transformed.append({
        'name': item['customer']['name'],
        'total': sum(order['amount'] for order in item['orders']),
        'count': len(item['orders'])
    })
```

### ✅ CORRECT: jq Transform on Server
```graphql
# Query
query {
  module {
    customers {
      name
      orders { amount }
    }
  }
}

# jq transform (server-side!)
.data.module.customers | map({
  name: .name,
  total: (.orders | map(.amount) | add),
  count: (.orders | length)
})
```

## ✅ jq Transformations: Use for ALL Data Processing

**jq executes on the SERVER - no Python needed!**

### Basic jq Operations
```jq
# Select fields
.data.module.objects | map({id, name})

# Filter items
.data.module.objects | map(select(.amount > 1000))

# Calculate sums
.data.module.objects | map(.amount) | add

# Group by (using reduce)
.data.module.objects | group_by(.category) | map({
  category: .[0].category,
  total: map(.amount) | add,
  count: length
})

# Sort
.data.module.objects | sort_by(.created_at) | reverse

# Unique values
.data.module.objects | map(.status) | unique
```

### Advanced jq with Functions
```jq
# Define function and use it
def total: map(.amount) | add;
.data.module.customers | map({
  name: .name,
  total_spent: (.orders | total)
})

# Conditional logic
.data.module.objects | map(
  if .amount > 1000 then "high"
  elif .amount > 500 then "medium"
  else "low"
  end
)

# String operations
.data.module.objects | map({
  name: .name | ascii_upcase,
  slug: .name | ascii_downcase | gsub(" "; "-")
})

# Date/time operations
.data.module.events | map({
  date: .created_at | split("T")[0],
  hour: .created_at | split("T")[1] | split(":")[0]
})

# Nested transformations
.data.module.customers | map({
  name,
  top_orders: (.orders | sort_by(.amount) | reverse | .[0:5] | map({id, amount}))
})
```

### jq for Analysis
```jq
# Statistics
.data.module.orders_bucket_aggregation | {
  total_groups: length,
  total_revenue: map(.aggregations.amount.sum) | add,
  avg_per_group: (map(.aggregations.amount.sum) | add) / length,
  max_revenue: map(.aggregations.amount.sum) | max,
  min_revenue: map(.aggregations.amount.sum) | min
}

# Pivot table
.data.module.sales | group_by(.region) | map({
  region: .[0].region,
  by_product: group_by(.product) | map({
    product: .[0].product,
    total: map(.amount) | add
  })
})
```

**IMPORTANT: Validate complex jq with data-validate_graphql_query first!**

## ⚠️ MANDATORY: Validate ALL Queries Before Execution

**NEVER execute a query without validation!**

### Validation Workflow
```
1. Build GraphQL query
2. Add jq transform if needed
3. ✅ Validate with data-validate_graphql_query
4. If validation passes → Execute with data-inline_graphql_result
5. If validation fails → Fix errors and repeat
```

### Example
```
# Step 1: Validate
Tool: data-validate_graphql_query
Input: {
  query: "query { module { objects(filter: {...}) { fields } } }",
  jq_transform: ".data.module.objects | map({id, name})"
}
Result: true ✓  OR  "Error: Field 'xyz' not found"

# Step 2: Execute (only if validation passed!)
Tool: data-inline_graphql_result
Input: {
  query: "...",  # Same query
  jq_transform: "..."  # Same transform
}
```

**Why validate?**
- Catches field name errors
- Catches type mismatches
- Catches jq syntax errors
- Saves time - fails fast without data execution

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

**CRITICAL Structure:**
```
object_bucket_aggregation {
  key { ...grouping_fields... }       # What to GROUP BY
  aggregations { ...metrics... }      # What to CALCULATE for each group
}
```

**Basic Example:**
```graphql
orders_bucket_aggregation(
  filter: { status: { eq: "completed" } }
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]  # ✅ DESC uppercase
  limit: 10
) {
  key {
    # GROUP BY these fields
    customer_id
    product_category
  }
  aggregations {
    # CALCULATE these metrics for each group
    _rows_count  # ✅ Count rows in group
    total {
      sum      # Sum of 'total' field
      avg      # Average
    }
    quantity {
      sum
      count(distinct: true)  # ✅ Distinct values
    }
  }
}

# ⚠️ IMPORTANT: Available aggregation functions vary by field!
# Always verify with: schema-type_fields(type_name: "orders_aggregations")
```

**Grouping by Related Object Fields:**
```graphql
orders_bucket_aggregation {
  key {
    # Group by fields from related object
    customer {
      country
      tier
    }
    # Can also include direct fields
    status
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

**Common Mistake:**
```graphql
# ❌ Wrong: aggregations inside key
key {
  customer_id
  aggregations { _rows_count }  # Wrong place!
}

# ✅ Correct: aggregations is separate
key { customer_id }
aggregations { _rows_count }
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
