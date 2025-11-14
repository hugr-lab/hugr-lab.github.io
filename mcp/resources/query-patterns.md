# Query Patterns

## 🎯 Decision Tree: What to Use When

**Step 1: Need to filter by related data?**
- ✅ **YES** → Use **Relation Filters** (any_of/all_of/none_of or direct access)
- ❌ NO → Continue to Step 2

**Step 2: Need to join unrelated objects?**
- ✅ **YES** → Use **_join** for ad-hoc joins
- ❌ NO → Continue to Step 3

**Step 3: Need unique values?**
- ✅ **YES** → Use **distinct_on**
- ❌ NO → Use basic query

**Step 4: Need data transformation?**
- ✅ **ALWAYS** → Use **jq** (NEVER Python!)

**Step 5: Before executing:**
- 🚫 **MANDATORY** → Validate with **data-validate_graphql_query**

## ⚠️ CRITICAL Rules

**RULE #0: 🚫 NEVER USE PYTHON/PANDAS/DUCKDB!**
Use ONLY GraphQL + jq!

1. **Use Module Path** - Discovery returns `module` field, use it
2. **Check Filter Operators** - Use `schema-type_fields` on filter input types
3. **Scalar vs Relation Filters**:
   - Scalars: `eq`, `in`, `like`, `gt`, `lt`
   - Relations: `any_of`, `all_of`, `none_of`
4. **_rows_count** (NOT `count`)
5. **ASC/DESC** (uppercase!)
6. **count(distinct: true)** (NOT `distinct_count`)
7. **Validate First** - data-validate_graphql_query is MANDATORY
8. **Prioritize Relation Filters** - Use before considering _join

## 🚫 Anti-Patterns

### ❌ WRONG: Two Queries + Filter by IDs
```python
# DON'T DO THIS!
customers = query("{ customers(filter: {country: {eq: 'USA'}}) { id } }")
ids = [c['id'] for c in customers]
orders = query(f"{{ orders(filter: {{customer_id: {{in: {ids}}}}}}) {{ ... }} }}")
```

### ✅ CORRECT: One Query with Relation Filter
```graphql
query {
  module {
    orders(filter: {
      customer: { country: { eq: "USA" } }  # ← Filter through relation!
    }) {
      id
      customer { name country }
    }
  }
}
```

### ❌ WRONG: Python for Transformations
```python
# DON'T DO THIS!
data = execute(query)
result = [{'name': item['name'], 'total': sum(...)} for item in data]
```

### ✅ CORRECT: jq for Transformations
```jq
.data.module.customers | map({
  name,
  total: (.orders | map(.amount) | add)
})
```

## 🎯 PRIORITY #1: Relation Filters

**Use relation filters FIRST - before considering _join!**

### Many-to-One (Direct Access)
```graphql
filter: {
  customer: {              # Direct access to related object
    country: { eq: "USA" }
    tier: { eq: "premium" }
  }
}
```

### One-to-Many with any_of
```graphql
filter: {
  orders: {
    any_of: {              # At least one order matches
      status: { eq: "pending" }
      total: { gt: 1000 }
    }
  }
}
```

### One-to-Many with all_of
```graphql
filter: {
  orders: {
    all_of: {              # ALL orders must match
      status: { eq: "completed" }
    }
  }
}
```

### One-to-Many with none_of
```graphql
filter: {
  orders: {
    none_of: {             # NO orders can match
      status: { eq: "cancelled" }
    }
  }
}
```

### Deep Nested Relations (3+ levels)
```graphql
filter: {
  orders: {                                    # Level 1
    any_of: {
      items: {                                 # Level 2
        any_of: {
          product: {                           # Level 3
            category: {                        # Level 4
              name: { eq: "electronics" }
            }
            price: { gt: 500 }
          }
        }
      }
    }
  }
}
```

**This finds customers with at least one order containing at least one electronic product over $500.**

### Combined Filters
```graphql
filter: {
  country: { eq: "USA" }                      # Scalar filter
  active: { eq: true }                        # Scalar filter
  orders: {                                   # Relation filter
    any_of: {
      status: { in: ["pending", "processing"] }
      created_at: { gte: "2024-01-01" }
    }
  }
  purchases: {                                # Another relation filter
    none_of: {
      category: { eq: "restricted" }
    }
  }
}
```

## 🔗 _join Patterns (When NO Relation Exists)

**Use _join ONLY when there's no predefined relation!**

### Basic _join
```graphql
table_a {
  id
  email
  _join(fields: ["email"]) {
    table_b(fields: ["email"]) {
      id
      data
    }
  }
}
```

### Multi-Field _join
```graphql
_join(fields: ["field1", "field2"]) {
  target(fields: ["match1", "match2"]) {
    ...
  }
}
```

### _join with Aggregation
```graphql
products {
  id
  name
  _join(fields: ["id"]) {
    reviews_aggregation(fields: ["product_id"]) {
      _rows_count
      rating { avg }
    }
  }
}
```

**⚠️ Remember: Check for relations first with `schema-type_fields`!**

## ✨ distinct_on Patterns

**Use distinct_on for unique combinations:**

### Single Field
```graphql
customers(distinct_on: ["country"]) {
  country
}
```

### Multiple Fields
```graphql
orders(distinct_on: ["customer_id", "status"]) {
  customer_id
  status
}
```

### With Filter
```graphql
orders(
  filter: { created_at: { gte: "2024-01-01" } }
  distinct_on: ["customer_id"]
) {
  customer_id
  customer { name }
}
```

### With Sorting
```graphql
orders(
  distinct_on: ["customer_id"]
  order_by: [
    { field: "customer_id", direction: ASC }
    { field: "created_at", direction: DESC }
  ]
) {
  customer_id
  created_at
  total
}
```

**Returns the most recent order for each customer.**

## ✅ jq Transformations (Server-Side Processing)

**ALWAYS use jq for data processing - NO Python!**

### Basic Operations
```jq
# Select fields
.data.module.objects | map({id, name})

# Filter
.data.module.objects | map(select(.amount > 1000))

# Calculate
.data.module.objects | map(.amount) | add

# Group by
.data.module.objects | group_by(.category) | map({
  category: .[0].category,
  total: map(.amount) | add,
  count: length
})

# Sort
.data.module.objects | sort_by(.created_at) | reverse

# Unique
.data.module.objects | map(.status) | unique
```

### Advanced with Functions
```jq
# Define function
def total: map(.amount) | add;
.data.module.customers | map({
  name,
  total_spent: (.orders | total)
})

# Conditionals
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

# Statistics
.data.module.orders_bucket_aggregation | {
  total: map(.aggregations.amount.sum) | add,
  average: (map(.aggregations.amount.sum) | add) / length,
  max: map(.aggregations.amount.sum) | max
}
```

## ⚠️ MANDATORY Validation Workflow

**NEVER execute without validation!**

```
1. Build query + jq transform
2. ✅ Validate with data-validate_graphql_query
3. If valid → Execute with data-inline_graphql_result
4. If invalid → Fix and repeat step 2
```

### Example
```
# Step 1: Validate
Tool: data-validate_graphql_query
Input: {
  query: "query { module { objects(filter: {...}) { fields } } }",
  jq_transform: ".data.module.objects | map({id, name})"
}
Result: true ✓  OR  Error message

# Step 2: Execute (only if validated!)
Tool: data-inline_graphql_result
Input: { query: "...", jq_transform: "..." }
```

## Module Structure

```graphql
# Root module
query { customers { id } }

# Sub-module
query { sales { orders { id } } }

# Nested modules
query { sales { analytics { revenue { metric } } } }
```

**Always use the `module` field from discovery results!**

## Aggregation Patterns

### Single-Row Aggregation
```graphql
orders_aggregation(filter: { status: { eq: "completed" } }) {
  _rows_count
  total {
    sum
    avg
    min
    max
  }
  customer_id {
    count(distinct: true)  # Distinct count
  }
}
```

### Bucket Aggregation (GROUP BY)
```graphql
orders_bucket_aggregation(
  filter: { status: { eq: "completed" } }
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]
  limit: 10
) {
  key {
    status
    customer { country }  # Group by relation!
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

### Time-Based Grouping
```graphql
bucket_aggregation {
  key {
    order_date(bucket: month)
    year: _order_date_part(extract: year)
  }
  aggregations {
    _rows_count
    revenue { sum }
  }
}
```

## Nested Queries with Relations

### Fetch Related Data
```graphql
customers(limit: 10) {
  id
  name

  # One-to-many relation
  orders(
    filter: { status: { eq: "pending" } }
    nested_limit: 5
  ) {
    id
    total
  }

  # Aggregation over relation
  orders_aggregation {
    _rows_count
    total { sum }
  }
}
```

### Deep Nesting
```graphql
customers {
  id
  orders {
    id
    items {
      id
      product {
        id
        name
        category { name }
      }
    }
  }
}
```

## Sorting Patterns

### Basic Sorting
```graphql
order_by: [
  { field: "name", direction: ASC }
  { field: "created_at", direction: DESC }
]
```

### Sort by Relation
```graphql
order_by: [
  { field: "customer.country", direction: ASC }
  { field: "total", direction: DESC }
]
```

### Sort by Aggregation
```graphql
bucket_aggregation(
  order_by: [
    { field: "aggregations.total.sum", direction: DESC }
  ]
)
```

## Complete Example: Multi-Object Query

```graphql
query {
  module {
    # Count total customers
    customers_aggregation { _rows_count }

    # Get recent orders with relation filter
    orders(
      filter: {
        customer: {          # Relation filter!
          country: { eq: "USA" }
          tier: { eq: "premium" }
        }
        status: { in: ["pending", "processing"] }
      }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) {
      id
      total
      customer { name tier }
    }

    # Revenue by month
    orders_bucket_aggregation(
      filter: { status: { eq: "completed" } }
      order_by: [{ field: "key.month", direction: DESC }]
    ) {
      key {
        month: created_at(bucket: month)
      }
      aggregations {
        _rows_count
        total { sum avg }
      }
    }
  }
}
```

With jq transform:
```jq
{
  total_customers: .data.module.customers_aggregation._rows_count,
  recent_orders: .data.module.orders | map({
    id,
    total,
    customer: .customer.name
  }),
  monthly_revenue: .data.module.orders_bucket_aggregation | map({
    month: .key.month,
    revenue: .aggregations.total.sum,
    orders: .aggregations._rows_count
  })
}
```

## Key Takeaways

1. **Relation Filters FIRST** - Check `schema-type_fields` for relations
2. **_join if needed** - Only when no relation exists
3. **distinct_on** - For unique combinations
4. **jq ALWAYS** - Never Python/Pandas/DuckDB
5. **Validate MANDATORY** - Every query, every time
6. **Deep nesting OK** - Filter by relations 3-4 levels deep
7. **Read `hugr://docs/data-types`** - For operators and functions reference

## 🔍 Troubleshooting

**If you get validation errors**, read `hugr://docs/data-types` section **"Common Validation Errors & Fixes"**.

Common mistakes covered:
- Non-existent fields (forgot to use `schema-type_fields`)
- Non-existent operators (`not_ilike`, `not_like` don't exist)
- Wrong `order_by` structure for aggregations
- Perl/PCRE regex instead of POSIX ERE
- Using `any_of` on scalar fields instead of `in`

**Prevention: ALWAYS validate queries with `data-validate_graphql_query` BEFORE execution!**
