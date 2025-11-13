# Prompt: Performance Optimization

## Core Directive

**Build queries that are efficient, scalable, and respectful of system resources.**

---

## Performance Principles

### 1. Always Limit Results
```graphql
# ❌ DANGEROUS - Could return millions of records
customers { id name }

# ✅ SAFE - Bounded result set
customers(limit: 100) { id name }
```

### 2. Filter Early and Specifically
```graphql
# ❌ BAD - Fetch all, filter later
customers {
  orders(filter: { total: { gt: 1000 } }) { ... }
}

# ✅ GOOD - Filter at source
customers(filter: {
  orders: { any_of: { total: { gt: 1000 } } }
}) {
  orders(filter: { total: { gt: 1000 } }) { ... }
}
```

### 3. Prefer Aggregations
```graphql
# ❌ BAD - Fetch all to count
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

### 4. Minimize Field Selection
```graphql
# ❌ BAD - Fetch unused fields
customers {
  id name email phone address city state zip country
  created_at updated_at notes metadata
}

# ✅ GOOD - Only needed fields
customers {
  id
  name
  email
}
```

---

## Query Optimization Strategies

### Strategy 1: Limit at Every Level

**Problem:** Unbounded queries can return huge datasets

**Solution:**
```graphql
query {
  # Limit root query
  customers(limit: 10) {
    id
    name

    # Limit nested queries
    orders(nested_limit: 5) {
      id
      total

      # Limit further nested
      order_details(nested_limit: 3) {
        product { name }
        quantity
      }
    }
  }
}
```

**Rules:**
- Root queries: Use `limit`
- Nested queries: Use `nested_limit`
- Default limit: 100 (adjust based on use case)

---

### Strategy 2: Filter at Highest Level

**Problem:** Filtering after joins fetches unnecessary data

**Bad Example:**
```graphql
# Fetches all customers, then filters orders
customers {
  orders(filter: { status: { eq: "pending" } }) { ... }
}
```

**Good Example:**
```graphql
# Only fetch customers with pending orders
customers(filter: {
  orders: { any_of: { status: { eq: "pending" } } }
}) {
  orders(filter: { status: { eq: "pending" } }) { ... }
}
```

---

### Strategy 3: Use Aggregations Instead of Raw Data

**When to Use Aggregations:**
- Counting records
- Summing values
- Finding min/max
- Calculating averages
- Grouping data

**Bad Example:**
```graphql
# Fetch 100k orders to calculate total
orders(limit: 100000) {
  id
  total
}
# Calculate sum in application
```

**Good Example:**
```graphql
# Calculate sum in database
orders_aggregation {
  _rows_count
  total { sum }
}
```

---

### Strategy 4: Optimize Nested Queries

**Problem:** N+1 queries in nested relations

Hugr optimizes this automatically, but you can help:

**Use nested_limit:**
```graphql
customers(limit: 10) {
  id
  name
  # Get only recent orders per customer
  orders(
    nested_limit: 5
    nested_order_by: [{ field: "created_at", direction: DESC }]
  ) {
    id
    total
  }
}
```

**Use aggregations for counts:**
```graphql
customers {
  id
  name
  # Don't fetch all orders, just count
  orders_aggregation {
    _rows_count
    total { sum }
  }
}
```

---

### Strategy 5: Use Efficient Filter Operators

**Operator Performance (Best to Worst):**
1. `eq` - Exact match (indexed)
2. `in` - List match (indexed)
3. `gt`, `gte`, `lt`, `lte` - Range (indexed if range index)
4. `like` with prefix - Pattern match (can use index)
5. `like` with wildcard - Pattern match (slower)
6. `ilike` - Case-insensitive (slowest)
7. `regex` - Regular expression (slowest)

**Best Practice:**
```graphql
# ✅ BEST - Exact match
filter: { status: { eq: "active" } }

# ✅ GOOD - List match
filter: { country: { in: ["USA", "Canada"] } }

# ⚠️ OK - Prefix search
filter: { name: { like: "Smith%" } }

# ❌ SLOW - Wildcard search
filter: { name: { like: "%smith%" } }

# ❌ SLOWER - Case-insensitive wildcard
filter: { name: { ilike: "%smith%" } }

# ❌ SLOWEST - Regex
filter: { name: { regex: "^S.*h$" } }
```

---

### Strategy 6: Combine Filters Efficiently

**Use IN Instead of Multiple OR:**
```graphql
# ❌ BAD
filter: {
  _or: [
    { country: { eq: "USA" } }
    { country: { eq: "Canada" } }
    { country: { eq: "Mexico" } }
  ]
}

# ✅ GOOD
filter: {
  country: { in: ["USA", "Canada", "Mexico"] }
}
```

**Combine AND Conditions:**
```graphql
# ✅ GOOD - Single filter
filter: {
  status: { eq: "active" }
  created_at: { gte: "2024-01-01" }
  country: { in: ["USA", "Canada"] }
}

# ❌ BAD - Separate queries
active: orders(filter: { status: { eq: "active" } }) { ... }
recent: orders(filter: { created_at: { gte: "2024-01-01" } }) { ... }
```

---

### Strategy 7: Optimize Aggregations

**Limit Aggregation Input:**
```graphql
# ✅ GOOD - Filter before aggregating
orders_aggregation(
  filter: {
    created_at: { gte: "2024-01-01" }
    status: { eq: "completed" }
  }
) {
  _rows_count
  total { sum }
}

# ❌ BAD - Aggregate everything
orders_aggregation {
  _rows_count
  total { sum }
}
```

**Limit Bucket Results:**
```graphql
# ✅ GOOD - Top 10 groups
orders_bucket_aggregation(
  order_by: [{ field: "aggregations.total.sum", direction: DESC }]
  limit: 10
) {
  key { customer_id }
  aggregations { total { sum } }
}

# ❌ BAD - All groups (could be thousands)
orders_bucket_aggregation {
  key { customer_id }
  aggregations { total { sum } }
}
```

---

### Strategy 8: Optimize Joins

**For Relations:**
```graphql
# ✅ GOOD - Use inner join when appropriate
customers {
  orders(inner: true) { ... }  # Only customers with orders
}

# Use nested_limit
customers {
  orders(nested_limit: 5) { ... }
}
```

**For Dynamic Joins:**
```graphql
# ✅ GOOD - Filter joined data
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    filter: { status: { eq: "pending" } }
    limit: 100
  ) { ... }
}

# ❌ BAD - No filter or limit
_join(fields: ["id"]) {
  orders(fields: ["customer_id"]) { ... }
}
```

**Use distinct When Needed:**
```graphql
_join(fields: ["id"]) {
  orders(
    fields: ["customer_id"]
    distinct: true  # Eliminate duplicates
  ) {
    status
    payment_method
  }
}
```

---

## Performance Checklist

Before executing a query, verify:

### Data Queries
- [ ] Has `limit` specified
- [ ] Filters applied at highest level
- [ ] Only necessary fields selected
- [ ] Nested queries have `nested_limit`
- [ ] Efficient filter operators used
- [ ] Indexed fields used in filters/sorts

### Aggregation Queries
- [ ] Filters applied before aggregation
- [ ] Bucket aggregations have `limit`
- [ ] Only needed aggregation functions selected
- [ ] Grouping keys are selective

### Join Queries
- [ ] Join fields are indexed
- [ ] Filters applied on both sides
- [ ] `limit` or `nested_limit` used
- [ ] `distinct` used when appropriate
- [ ] `inner: true` used when applicable

---

## Common Performance Issues

### Issue 1: Missing Limits

**Problem:**
```graphql
customers { orders { id } }
```

**Impact:** Could fetch millions of records

**Solution:**
```graphql
customers(limit: 10) {
  orders(nested_limit: 5) { id }
}
```

---

### Issue 2: Fetching Data to Count

**Problem:**
```graphql
customers {
  orders { id }
}
# Count in application
```

**Impact:** Transfers unnecessary data

**Solution:**
```graphql
customers {
  orders_aggregation {
    _rows_count
  }
}
```

---

### Issue 3: Inefficient Filters

**Problem:**
```graphql
filter: { name: { ilike: "%search%" } }
```

**Impact:** Can't use indexes, full table scan

**Solution:**
- Use exact match when possible: `{ eq: "value" }`
- Use prefix search: `{ like: "prefix%" }`
- Create full-text search indexes
- Consider `discovery-data_object_field_values` to validate inputs

---

### Issue 4: Unbounded Nested Queries

**Problem:**
```graphql
customers(limit: 10) {
  orders { id }  # Could be thousands per customer
}
```

**Impact:** 10 customers × 1000 orders = 10,000 records

**Solution:**
```graphql
customers(limit: 10) {
  orders(nested_limit: 5) { id }
}
```

---

### Issue 5: Over-Fetching Fields

**Problem:**
```graphql
customers {
  id name email phone address city state zip
  country notes metadata preferences settings
  created_at updated_at deleted_at
}
```

**Impact:** Increased transfer time, memory usage

**Solution:**
```graphql
customers {
  id
  name
  email
}
```

---

## Database-Specific Optimizations

### PostgreSQL / MySQL

**Ensure Indexes On:**
- Primary keys (automatic)
- Foreign keys
- Fields used in `filter`
- Fields used in `order_by`
- Fields used in `GROUP BY` (bucket keys)

**Use Appropriate Index Types:**
- B-tree: Standard queries, ranges
- GiST: Geometry fields (PostGIS)
- GIN: JSONB fields, full-text search
- HNSW/IVFFlat: Vector fields (pgvector)

---

### DuckDB

**Optimization Tips:**
- Use Parquet files for large datasets
- Leverage partitioning (Hive-style)
- Use appropriate compression
- Consider materialized views for repeated aggregations

---

## Monitoring and Debugging

### Check Query Execution Time

If query is slow:

1. **Reduce result size**
   - Add stricter filters
   - Reduce limit
   - Select fewer fields

2. **Verify indexes**
   - Check filtered fields have indexes
   - Check join fields have indexes

3. **Simplify query**
   - Remove complex nested queries
   - Use aggregations instead of raw data
   - Break into multiple smaller queries

4. **Check data volume**
   - Use `_rows_count` to understand data size
   - Filter to reduce dataset

---

## Response Template

When optimizing a query:

```markdown
**Performance Analysis:**

Current query has these concerns:
- [List performance issues]

**Recommended Optimizations:**

1. [Optimization 1]
   - Current: [current approach]
   - Optimized: [optimized approach]
   - Impact: [performance improvement]

2. [Optimization 2]
   ...

**Optimized Query:**
```graphql
[optimized query]
```

**Expected Performance:**
- Estimated records: [count]
- Transfer size: [reduced/optimized]
- Execution strategy: [description]
```

---

## Quick Reference: Performance Rules

1. ✅ **Always** use `limit`
2. ✅ **Always** filter early
3. ✅ **Prefer** aggregations over raw data
4. ✅ **Minimize** field selection
5. ✅ **Use** `nested_limit` for nested queries
6. ✅ **Use** indexed fields in filters
7. ✅ **Use** `eq` and `in` over `like` and `regex`
8. ✅ **Use** `inner: true` when appropriate
9. ✅ **Use** `distinct` to eliminate duplicates
10. ✅ **Limit** bucket aggregation results

---

## Next Steps

- **[p-data-analysis.md](./p-data-analysis.md)** - Analyze optimized query results
- **[r-querying-basics.md](./r-querying-basics.md)** - Query fundamentals

## Related Resources

- **[r-aggregations.md](./r-aggregations.md)** - Efficient aggregation patterns
- **[r-relations-joins.md](./r-relations-joins.md)** - Optimizing joins
