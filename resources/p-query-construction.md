# Prompt: Query Construction

## Core Directive

**Build efficient, validated GraphQL queries based on discovered schema and user requirements.**

---

## Query Construction Principles

### 1. Always Use Discovery First
Never construct queries without discovery:
```
❌ WRONG: Directly write query
✅ RIGHT: Discovery → Validation → Construction
```

### 2. Apply Filters Early
Filter at the highest level possible:
```graphql
# ✅ GOOD - Filter customers first
customers(filter: { country: { eq: "USA" } }) {
  orders { ... }
}

# ❌ BAD - Fetch all customers, filter orders
customers {
  orders(filter: { customer: { country: { eq: "USA" } } }) { ... }
}
```

### 3. Always Use Limits
Protect against large datasets:
```graphql
# ✅ GOOD
customers(limit: 100) { ... }

# ❌ BAD - No limit
customers { ... }
```

### 4. Prefer Aggregations Over Raw Data
When counting or summarizing:
```graphql
# ✅ GOOD
customers_aggregation {
  _rows_count
}

# ❌ BAD - Fetch all to count
customers {
  id
}
```

---

## Query Construction Workflow

### Step 1: Understand Requirements

Parse user intent:
- What data do they need?
- Do they need raw data or aggregations?
- Are filters required?
- Do they need related data?
- What's the output format?

**Example User Request:**
> "Show me top 10 US customers by order value in 2024"

**Parsed Requirements:**
- Data: Customers
- Filter: Country = "USA", Orders in 2024
- Aggregation: Sum of order values
- Sort: By total descending
- Limit: 10

---

### Step 2: Discover Schema

Based on requirements, discover:

```
1. Find customer data object
   └─> discovery-search_modules
   └─> discovery-search_module_data_objects

2. Check customer fields
   └─> schema-type_fields(type_name="customers")

3. Verify filter options
   └─> schema-type_fields(type_name="customers_filter")

4. Check aggregation availability
   └─> schema-type_fields(type_name="customers")
   └─> Look for orders_aggregation or bucket_aggregation
```

---

### Step 3: Choose Query Type

Based on requirements, select appropriate query type:

**Option A: Data Query** - For listing records
```graphql
customers(filter: ..., order_by: ..., limit: ...) {
  fields...
}
```

**Option B: Single-Row Aggregation** - For totals/averages
```graphql
customers_aggregation(filter: ...) {
  _rows_count
  field { sum avg min max }
}
```

**Option C: Bucket Aggregation** - For grouped analysis
```graphql
customers_bucket_aggregation(filter: ...) {
  key { ... }
  aggregations { ... }
}
```

**Option D: Primary Key Query** - For single record
```graphql
customers_by_pk(id: 123) {
  fields...
}
```

---

### Step 4: Construct Filters

Build filter object based on validated operators:

**Simple Filter:**
```graphql
filter: {
  country: { eq: "USA" }
}
```

**Multiple Conditions (AND):**
```graphql
filter: {
  country: { eq: "USA" }
  status: { eq: "active" }
}
```

**Boolean Logic:**
```graphql
filter: {
  _and: [
    { country: { in: ["USA", "Canada"] } }
    { status: { eq: "active" } }
  ]
}
```

**Relation Filters:**
```graphql
filter: {
  orders: {
    any_of: {
      total: { gte: 1000 }
      created_at: { gte: "2024-01-01" }
    }
  }
}
```

---

### Step 5: Add Sorting

Determine sort fields and direction:

**Single Field:**
```graphql
order_by: [
  { field: "created_at", direction: DESC }
]
```

**Multiple Fields:**
```graphql
order_by: [
  { field: "country", direction: ASC }
  { field: "name", direction: ASC }
]
```

**Sort by Nested Field:**
```graphql
order_by: [
  { field: "customer.name", direction: ASC }
]
```

**Sort Aggregations:**
```graphql
# For bucket aggregations
order_by: [
  { field: "aggregations.total.sum", direction: DESC }
]
```

---

### Step 6: Apply Pagination

**Standard Pagination:**
```graphql
customers(
  limit: 20
  offset: 0
) { ... }
```

**Nested Pagination:**
```graphql
customers(limit: 10) {
  orders(
    nested_limit: 5
    nested_offset: 0
  ) { ... }
}
```

---

### Step 7: Select Fields

Choose minimal required fields:

**Basic Fields:**
```graphql
{
  id
  name
  email
  created_at
}
```

**With Relations:**
```graphql
{
  id
  name
  orders(limit: 5) {
    id
    total
    created_at
  }
}
```

**With Aggregations:**
```graphql
{
  id
  name
  orders_aggregation {
    _rows_count
    total { sum avg }
  }
}
```

---

## Query Patterns

### Pattern 1: List Recent Records

**Requirements:** Get 10 most recent orders

**Query:**
```graphql
query {
  northwind {
    orders(
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) {
      id
      total
      created_at
      customer {
        name
      }
    }
  }
}
```

---

### Pattern 2: Filter and Search

**Requirements:** Find customers in USA whose name contains "tech"

**Query:**
```graphql
query {
  northwind {
    customers(
      filter: {
        _and: [
          { country: { eq: "USA" } }
          { name: { ilike: "%tech%" } }
        ]
      }
      limit: 20
    ) {
      id
      name
      country
    }
  }
}
```

---

### Pattern 3: Aggregation with Grouping

**Requirements:** Total sales by country

**Query:**
```graphql
query {
  northwind {
    orders_bucket_aggregation {
      key {
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
}
```

---

### Pattern 4: Complex Filter with Relations

**Requirements:** Customers who ordered electronics in 2024

**Query:**
```graphql
query {
  northwind {
    customers(
      filter: {
        orders: {
          any_of: {
            _and: [
              { created_at: { gte: "2024-01-01" } }
              {
                order_details: {
                  any_of: {
                    product: {
                      category: { eq: "electronics" }
                    }
                  }
                }
              }
            ]
          }
        }
      }
      limit: 50
    ) {
      id
      name
      email
    }
  }
}
```

---

### Pattern 5: Top N with Aggregation

**Requirements:** Top 10 customers by total order value

**Query:**
```graphql
query {
  northwind {
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
          email
        }
      }
      aggregations {
        _rows_count
        total {
          sum
        }
      }
    }
  }
}
```

---

### Pattern 6: Time-Based Analysis

**Requirements:** Daily sales for last 30 days

**Query:**
```graphql
query {
  northwind {
    orders_bucket_aggregation(
      filter: {
        created_at: { gte: "2024-01-01" }
      }
      order_by: [
        { field: "key.date", direction: ASC }
      ]
    ) {
      key {
        date: created_at(bucket: day)
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
}
```

---

### Pattern 7: Multi-Dimensional Analysis

**Requirements:** Sales by country, category, and quarter

**Query:**
```graphql
query {
  northwind {
    order_details_bucket_aggregation {
      key {
        order {
          customer {
            country
          }
          quarter: created_at(bucket: quarter)
        }
        product {
          category {
            name
          }
        }
      }
      aggregations {
        quantity { sum }
        total { sum }
      }
    }
  }
}
```

---

### Pattern 8: Dynamic Join Query

**Requirements:** Cross-source data join

**Query:**
```graphql
query {
  postgres_db {
    customers(limit: 10) {
      id
      email
      _join(fields: ["email"]) {
        mysql_db_user_activity(fields: ["user_email"]) {
          last_login
          page_views
        }
      }
    }
  }
}
```

---

## Validation Checklist

Before finalizing query, verify:

- [ ] All type names are discovered (not assumed)
- [ ] All field names exist in schema
- [ ] Filter operators are valid
- [ ] Sort fields are requested in selection
- [ ] Limit is applied (unless primary key query)
- [ ] Module path is correct
- [ ] Relation names match schema
- [ ] Aggregation fields are available

---

## Error Handling

### Common Errors and Fixes

**Error: Field doesn't exist**
```
❌ customers { nonexistent_field }
✅ Check: schema-type_fields(type_name="customers")
```

**Error: Invalid filter operator**
```
❌ filter: { name: { equals: "John" } }
✅ Check: schema-type_fields(type_name="String_filter_input")
✅ Use: { name: { eq: "John" } }
```

**Error: Type not found**
```
❌ type_name: "customers"
✅ Try: "nw_customers" or other prefix
```

**Error: Cannot sort by unselected field**
```
❌ order_by: [{ field: "price" }]
   { id name }  # price not selected
✅ { id name price }
```

---

## Optimization Guidelines

### 1. Minimize Field Selection
```graphql
# ✅ Select only needed fields
{ id name email }

# ❌ Select everything
{ id name email phone address city state zip country ... }
```

### 2. Use Aggregations Instead of Fetching All
```graphql
# ✅ Efficient aggregation
orders_aggregation {
  _rows_count
  total { sum }
}

# ❌ Fetch all to count
orders {
  id
  total
}
```

### 3. Limit Nested Queries
```graphql
# ✅ Limited nested query
customers(limit: 10) {
  orders(nested_limit: 5) { ... }
}

# ❌ Unbounded nested query
customers(limit: 10) {
  orders { ... }  # Could be thousands per customer
}
```

### 4. Apply Filters Early
```graphql
# ✅ Filter at root
customers(filter: { country: { eq: "USA" } }) {
  orders { ... }
}

# ❌ Filter nested
customers {
  orders(filter: { customer: { country: { eq: "USA" } } }) { ... }
}
```

---

## Response Template

When constructing a query for a user:

```markdown
Based on your requirements, I've discovered the schema and constructed this query:

**Discovered Schema:**
- Module: [module_name]
- Data Object: [object_name] ([table/view])
- Key Fields: [field1, field2, ...]
- Available Filters: [operators]

**Query Strategy:**
- Query Type: [Data/Aggregation/Bucket]
- Filters: [filter description]
- Sorting: [sort description]
- Limit: [limit value]

**GraphQL Query:**
```graphql
query {
  [module] {
    [object]([arguments]) {
      [fields]
    }
  }
}
```

**Expected Results:**
[Describe what the query will return]
```

---

## Next Steps

After constructing query:
- **[p-performance-optimization.md](./p-performance-optimization.md)** - Optimize query performance
- **[p-data-analysis.md](./p-data-analysis.md)** - Analyze query results

## Related Resources

- **[r-querying-basics.md](./r-querying-basics.md)** - Query fundamentals
- **[r-aggregations.md](./r-aggregations.md)** - Aggregation patterns
- **[r-relations-joins.md](./r-relations-joins.md)** - Joining data
