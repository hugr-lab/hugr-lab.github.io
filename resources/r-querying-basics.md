# Querying Basics - Filtering, Sorting, Pagination

## Query Structure

### Basic Data Query

```graphql
query {
  module_name {
    data_object_name(
      filter: { ... }
      order_by: [ ... ]
      limit: N
      offset: M
      distinct_on: [ ... ]
    ) {
      field1
      field2
    }
  }
}
```

**All arguments are optional**, but it's recommended to always use `limit`.

---

## Filtering

### Filter Operators by Type

#### String Operators
```graphql
filter: {
  name: {
    eq: "exact match"
    in: ["value1", "value2"]
    like: "pattern%"           # SQL LIKE
    ilike: "%case%insensitive%" # Case-insensitive
    regex: "^pattern$"          # Regular expression
    is_null: false
  }
}
```

#### Numeric Operators (Int, Float, BigInt)
```graphql
filter: {
  price: {
    eq: 100
    gt: 50                  # Greater than
    gte: 50                 # Greater than or equal
    lt: 200                 # Less than
    lte: 200                # Less than or equal
    in: [10, 20, 30]
    is_null: false
  }
}
```

#### Boolean Operators
```graphql
filter: {
  active: {
    eq: true
    is_null: false
  }
}
```

#### Timestamp Operators
```graphql
filter: {
  created_at: {
    eq: "2024-01-01T00:00:00Z"
    gte: "2024-01-01T00:00:00Z"  # On or after
    lt: "2024-02-01T00:00:00Z"   # Before
    is_null: false
  }
}
```

#### JSON/JSONB Operators
```graphql
filter: {
  metadata: {
    eq: { "key": "value" }              # Exact match
    contains: { "user_id": 123 }        # Contains key-value
    has: "transaction_id"                # Has key
    has_all: ["user_id", "session_id"]  # Has all keys
    is_null: false
  }
}
```

#### Geometry Operators
```graphql
filter: {
  location: {
    eq: "POINT(1 2)"                    # WKT format
    intersects: {                        # GeoJSON format
      type: "Polygon"
      coordinates: [[[0,0], [0,1], [1,1], [1,0], [0,0]]]
    }
    contains: "POINT(5 5)"
    is_null: false
  }
}
```

---

### Boolean Logic

#### AND (Implicit)
Multiple filters at the same level are combined with AND:

```graphql
filter: {
  status: { eq: "active" }
  price: { gte: 100 }
  country: { eq: "USA" }
}
# WHERE status = 'active' AND price >= 100 AND country = 'USA'
```

#### AND (Explicit)
```graphql
filter: {
  _and: [
    { status: { eq: "active" } }
    { price: { gte: 100 } }
    { country: { eq: "USA" } }
  ]
}
```

#### OR
```graphql
filter: {
  _or: [
    { status: { eq: "pending" } }
    { status: { eq: "processing" } }
  ]
}
# WHERE status = 'pending' OR status = 'processing'
```

#### NOT
```graphql
filter: {
  _not: {
    status: { in: ["cancelled", "refunded"] }
  }
}
# WHERE NOT (status IN ('cancelled', 'refunded'))
```

#### Complex Combinations
```graphql
filter: {
  _and: [
    {
      _or: [
        { status: { eq: "pending" } }
        { status: { eq: "processing" } }
      ]
    }
    { priority: { eq: "high" } }
    {
      _not: {
        customer: { country: { eq: "blocked_country" } }
      }
    }
  ]
}
```

---

### Filtering by Relations

**Important:** Only works with `@field_references` or `@references` relations.

#### One-to-One / Many-to-One
```graphql
# Orders from US customers
orders(filter: {
  customer: {
    country: { eq: "USA" }
  }
}) {
  id
  customer { name country }
}
```

#### Nested Relations
```graphql
# Orders from customers in New York
orders(filter: {
  customer: {
    address: {
      city: { eq: "New York" }
    }
  }
}) {
  id
}
```

#### One-to-Many / Many-to-Many

**any_of** - At least one related record matches:
```graphql
# Customers with at least one pending order
customers(filter: {
  orders: {
    any_of: {
      status: { eq: "pending" }
    }
  }
}) {
  id
  name
}
```

**all_of** - All related records match:
```graphql
# Customers where ALL orders are completed
customers(filter: {
  orders: {
    all_of: {
      status: { eq: "completed" }
    }
  }
}) {
  id
  name
}
```

**none_of** - No related records match:
```graphql
# Customers with no cancelled orders
customers(filter: {
  orders: {
    none_of: {
      status: { eq: "cancelled" }
    }
  }
}) {
  id
  name
}
```

---

## Sorting

### Basic Sorting

```graphql
order_by: [
  { field: "created_at", direction: DESC }
]
```

**Directions:**
- `ASC` - Ascending (A→Z, 0→9, oldest→newest)
- `DESC` - Descending (Z→A, 9→0, newest→oldest)

### Multi-Column Sorting

```graphql
order_by: [
  { field: "country", direction: ASC }
  { field: "city", direction: ASC }
  { field: "name", direction: ASC }
]
```

### Sorting by Nested Fields

```graphql
# Sort orders by customer name
orders(
  order_by: [
    { field: "customer.name", direction: ASC }
  ]
) {
  id
  customer { name }
}
```

### Sorting in Subqueries

Use `nested_order_by` for sorting **after** the join:

```graphql
customers {
  id
  name
  orders(
    nested_order_by: [{ field: "total", direction: DESC }]
    nested_limit: 5
  ) {
    id
    total
  }
}
```

---

## Pagination

### Simple Pagination

```graphql
# First page (10 records)
customers(limit: 10, offset: 0) {
  id
  name
}

# Second page
customers(limit: 10, offset: 10) {
  id
  name
}

# Third page
customers(limit: 10, offset: 20) {
  id
  name
}
```

### With Sorting

```graphql
customers(
  order_by: [{ field: "created_at", direction: DESC }]
  limit: 20
  offset: 0
) {
  id
  name
  created_at
}
```

### Nested Pagination

For subqueries, use `nested_limit` and `nested_offset`:

```graphql
# Get 10 customers, 5 most recent orders each
customers(limit: 10) {
  id
  name
  orders(
    nested_order_by: [{ field: "created_at", direction: DESC }]
    nested_limit: 5
    nested_offset: 0
  ) {
    id
    created_at
  }
}
```

**Key Difference:**
- `limit` - Applied **before** join (total records in source table)
- `nested_limit` - Applied **after** join (per parent record)

---

## Distinct Values

### distinct_on

Get unique records based on field values:

```graphql
# Get one customer per country
customers(
  distinct_on: ["country"]
  order_by: [{ field: "country", direction: ASC }]
) {
  country
  name
}
```

### Multiple Fields

```graphql
# Get one customer per country/city combination
customers(
  distinct_on: ["country", "city"]
  order_by: [
    { field: "country", direction: ASC }
    { field: "city", direction: ASC }
  ]
) {
  country
  city
  name
}
```

**Important:** `distinct_on` fields must match the first fields in `order_by`.

---

## Query Patterns

### Pattern 1: Recent Records
```graphql
orders(
  order_by: [{ field: "created_at", direction: DESC }]
  limit: 10
) {
  id
  created_at
  total
}
```

### Pattern 2: Search by Name
```graphql
customers(
  filter: {
    _or: [
      { name: { ilike: "%search_term%" } }
      { email: { ilike: "%search_term%" } }
    ]
  }
  limit: 20
) {
  id
  name
  email
}
```

### Pattern 3: Active Records Only
```graphql
products(
  filter: {
    _and: [
      { deleted_at: { is_null: true } }
      { active: { eq: true } }
    ]
  }
) {
  id
  name
}
```

### Pattern 4: Date Range
```graphql
orders(
  filter: {
    created_at: {
      gte: "2024-01-01T00:00:00Z"
      lt: "2024-02-01T00:00:00Z"
    }
  }
) {
  id
  created_at
}
```

### Pattern 5: High-Value Transactions
```graphql
orders(
  filter: {
    _and: [
      { total: { gte: 1000 } }
      { status: { eq: "completed" } }
    ]
  }
  order_by: [{ field: "total", direction: DESC }]
  limit: 10
) {
  id
  total
  customer { name }
}
```

### Pattern 6: Nested Filters
```graphql
# Customers who ordered electronics
customers(
  filter: {
    orders: {
      any_of: {
        order_details: {
          any_of: {
            product: {
              category: { eq: "electronics" }
            }
          }
        }
      }
    }
  }
) {
  id
  name
}
```

---

## Performance Best Practices

### 1. Always Use Limit
```graphql
# ❌ BAD - Might return millions of records
customers { id name }

# ✅ GOOD
customers(limit: 100) { id name }
```

### 2. Filter Early
```graphql
# ❌ BAD - Filter after fetching all
customers {
  orders {  # Fetches all orders
    id
    total
  }
}

# ✅ GOOD - Filter before fetching
customers {
  orders(filter: { status: { eq: "pending" } }) {
    id
    total
  }
}
```

### 3. Use Specific Filters
```graphql
# ❌ BAD - Using regex unnecessarily
filter: { email: { regex: "^user@example\\.com$" } }

# ✅ GOOD - Use exact match
filter: { email: { eq: "user@example.com" } }
```

### 4. Index Filter Fields
Ensure database indexes exist on:
- Fields used in `filter`
- Fields used in `order_by`
- Foreign key fields

### 5. Use IN Instead of Multiple OR
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

### 6. Limit Nested Queries
```graphql
# ❌ BAD - Might fetch thousands of orders
customers(limit: 10) {
  orders {  # No limit
    id
  }
}

# ✅ GOOD
customers(limit: 10) {
  orders(nested_limit: 5) {
    id
  }
}
```

---

## Common Mistakes

### Mistake 1: Wrong Operator Names
```graphql
# ❌ Wrong
filter: { name: { equals: "John" } }
filter: { price: { greater_than: 100 } }

# ✅ Correct
filter: { name: { eq: "John" } }
filter: { price: { gt: 100 } }
```

### Mistake 2: Forgetting is_null
```graphql
# ❌ Won't find NULL values
filter: { phone: { eq: null } }

# ✅ Correct
filter: { phone: { is_null: true } }
```

### Mistake 3: Inconsistent distinct_on and order_by
```graphql
# ❌ Error - order_by must start with distinct_on fields
distinct_on: ["country"]
order_by: [{ field: "name", direction: ASC }]

# ✅ Correct
distinct_on: ["country"]
order_by: [
  { field: "country", direction: ASC }
  { field: "name", direction: ASC }
]
```

### Mistake 4: Using limit Instead of nested_limit
```graphql
# ❌ Wrong - limits source table before join
customers {
  orders(limit: 5) {  # First 5 orders total, not per customer
    id
  }
}

# ✅ Correct - 5 orders per customer
customers {
  orders(nested_limit: 5) {
    id
  }
}
```

---

## Next Steps

- **[r-aggregations.md](./r-aggregations.md)** - Learn about aggregations
- **[r-relations-joins.md](./r-relations-joins.md)** - Master relations and joins
- **[p-query-construction.md](./p-query-construction.md)** - AI guidance for building queries

## Related Documentation

- [GraphQL Filtering](https://hugr-lab.github.io/docs/graphql/queries/filtering)
- [Sorting & Pagination](https://hugr-lab.github.io/docs/graphql/queries/sorting-pagination)
- [Relations](https://hugr-lab.github.io/docs/graphql/queries/relations)
