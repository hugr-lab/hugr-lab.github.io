# Data Types and Operations Reference

Quick reference for filter operators, aggregation functions, and list operations.

## Field Types in GraphQL Schema

**Understand the difference between field types:**

### 1. Direct Table/View Fields (Scalar Fields)
These are regular columns from the database:
```graphql
customers {
  id              # Direct field (Int)
  name            # Direct field (String)
  email           # Direct field (String)
  created_at      # Direct field (Timestamp)
  active          # Direct field (Boolean)
}
```
**Filter these with scalar operators:** `eq`, `in`, `like`, `gt`, `lt`

### 2. Relation Fields (Subqueries)
These are related objects accessible through foreign keys:
```graphql
customers {
  id
  name

  # ONE-TO-MANY RELATION (returns array)
  orders {        # Subquery! Not a table field
    id
    total
  }

  # MANY-TO-ONE RELATION (returns single object)
  company {       # Subquery! Not a table field
    name
    country
  }
}
```
**Filter relations with:**
- Many-to-one: Direct access `company: { country: { eq: "USA" } }`
- One-to-many: List operators `orders: { any_of: {...} }`

### 3. Aggregation Fields
These compute values across records:
```graphql
customers {
  id
  name

  # AGGREGATION SUBQUERY (computes from related records)
  orders_aggregation {
    _rows_count
    total { sum avg }
  }

  # BUCKET AGGREGATION (GROUP BY)
  orders_bucket_aggregation {
    key { status }
    aggregations { _rows_count }
  }
}
```
**These are computed, not stored fields!**

### 4. Special Subquery Fields
These enable dynamic operations:
```graphql
customers {
  id
  email

  # DYNAMIC JOIN (no predefined relation needed)
  _join(fields: ["email"]) {
    external_data(fields: ["email"]) {
      data
    }
  }

  # SPATIAL JOIN (for geometry fields)
  _spatial(field: "location", type: DWITHIN) {
    nearby_stores(field: "location") {
      name
    }
  }
}
```

### 5. Function Call Fields
These invoke server-side functions:
```graphql
customers {
  id

  # FUNCTION CALL (parameterized)
  customer_stats(from: "2024-01-01", to: "2024-12-31") {
    total_orders
    total_spent
  }
}
```

**⚠️ CRITICAL: Always use `schema-type_fields` to discover which fields are available!**

## Filter Operators by Type

### String Fields
```graphql
name: {
  eq: "exact match"           # Equal to
  ne: "not this"              # Not equal to
  in: ["option1", "option2"]  # In list
  like: "%pattern%"           # Pattern match (% = wildcard)
  ilike: "%CASE%"             # Case-insensitive pattern
  regex: "^[A-Z].*"           # Regular expression
  is_null: true               # Is/is not null
}
```

### Numeric Fields (Int, Float, BigInt)
```graphql
age: {
  eq: 25                      # Equal to
  ne: 30                      # Not equal to
  in: [25, 30, 35]            # In list
  gt: 18                      # Greater than
  gte: 18                     # Greater than or equal
  lt: 65                      # Less than
  lte: 65                     # Less than or equal
  is_null: false              # Is/is not null
}
```

### Boolean Fields
```graphql
active: {
  eq: true                    # Equal to
  is_null: false              # Is/is not null
}
```

### Timestamp/Date Fields
```graphql
created_at: {
  eq: "2024-01-01T00:00:00Z"  # Equal to
  gt: "2024-01-01"            # After
  gte: "2024-01-01"           # After or equal
  lt: "2024-12-31"            # Before
  lte: "2024-12-31"           # Before or equal
  is_null: false              # Is/is not null
}
```

### JSON Fields
```graphql
metadata: {
  eq: {"key": "value"}        # Equal to
  contains: {"key": "value"}  # Contains key-value
  has: ["key1", "key2"]       # Has keys
  has_all: ["key1", "key2"]   # Has all keys
  is_null: false              # Is/is not null
}
```

### Geometry Fields
```graphql
location: {
  eq: "POINT(0 0)"            # Equal to
  intersects: "POLYGON(...)"  # Intersects
  contains: "POINT(0 0)"      # Contains
  is_null: false              # Is/is not null
}
```

## List Filter Operators (Relations)

**⚠️ USE THESE FOR ONE-TO-MANY AND MANY-TO-MANY RELATIONS!**

### any_of - At least one matches
```graphql
filter: {
  orders: {
    any_of: {
      status: { eq: "pending" }
      total: { gt: 1000 }
    }
  }
}
```
Finds customers who have AT LEAST ONE order that is pending OR has total > 1000.

### all_of - All must match
```graphql
filter: {
  orders: {
    all_of: {
      status: { eq: "completed" }
      total: { gte: 100 }
    }
  }
}
```
Finds customers where ALL their orders are completed AND total >= 100.

### none_of - None can match
```graphql
filter: {
  orders: {
    none_of: {
      status: { eq: "cancelled" }
    }
  }
}
```
Finds customers who have NO cancelled orders.

**❌ NEVER use any_of/all_of/none_of for scalar fields!**
**✅ ONLY use for relation fields (one-to-many, many-to-many)**

## Boolean Logic

### _and - All conditions must match
```graphql
filter: {
  _and: [
    { status: { eq: "active" } }
    { age: { gte: 18 } }
    { country: { eq: "USA" } }
  ]
}
```

### _or - At least one condition matches
```graphql
filter: {
  _or: [
    { priority: { eq: "high" } }
    { urgent: { eq: true } }
  ]
}
```

### _not - Negate condition
```graphql
filter: {
  _not: {
    status: { eq: "deleted" }
  }
}
```

## Aggregation Functions by Type

### Numeric Fields (Int, Float, BigInt)
```graphql
field_name {
  count                   # Count non-null values
  count(distinct: true)   # Count distinct values
  sum                     # Sum of values
  avg                     # Average value
  min                     # Minimum value
  max                     # Maximum value
  stddev                  # Standard deviation
  variance                # Variance
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
}
```

### String Fields
```graphql
field_name {
  count                   # Count non-null values
  count(distinct: true)   # Count distinct values
  min                     # Alphabetically first
  max                     # Alphabetically last
  string_agg(separator: ", ")  # Concatenate with separator
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
}
```

### Boolean Fields
```graphql
field_name {
  count                   # Count non-null values
  bool_and                # Logical AND of all values
  bool_or                 # Logical OR of all values
  list                    # Array of all values
}
```

### Date/Timestamp Fields
```graphql
field_name {
  count                   # Count non-null values
  min                     # Earliest date/time
  max                     # Latest date/time
  list                    # Array of all values
}
```

**⚠️ Always use `schema-type_fields` to check exact available functions for your field!**

## Special Fields

### _rows_count
```graphql
aggregations {
  _rows_count  # Total rows in aggregation (NOT "count"!)
}
```

### distinct_on
```graphql
objects(
  distinct_on: ["field1", "field2"]
) {
  field1
  field2
}
```
Returns unique combinations of specified fields.

## Sorting

### Direction (Enum)
```graphql
order_by: [
  { field: "name", direction: ASC }   # ✅ Uppercase!
  { field: "date", direction: DESC }  # ✅ Uppercase!
]
```

**❌ NEVER use lowercase:** `asc`, `desc`
**✅ ALWAYS use uppercase:** `ASC`, `DESC`

### Nested Sorting
```graphql
order_by: [
  { field: "category.name", direction: ASC }
  { field: "price", direction: DESC }
]
```

### Sort by Aggregations
```graphql
bucket_aggregation(
  order_by: [
    { field: "aggregations.total.sum", direction: DESC }
    { field: "key.category", direction: ASC }
  ]
)
```

## Common Patterns

### Multiple Scalar Conditions
```graphql
filter: {
  status: { in: ["active", "pending"] }  # ✅ Use 'in' for multiple values
  age: { gte: 18, lte: 65 }              # ✅ Combine operators
}
```

### Relation Filter (Many-to-One)
```graphql
filter: {
  customer: {                  # Direct access to related object
    country: { eq: "USA" }
    vip: { eq: true }
  }
}
```

### Relation Filter (One-to-Many)
```graphql
filter: {
  orders: {                    # Use any_of/all_of/none_of
    any_of: {
      status: { eq: "pending" }
      total: { gt: 1000 }
    }
  }
}
```

### Deep Nested Relations
```graphql
filter: {
  orders: {
    any_of: {
      items: {
        any_of: {
          product: {
            category: { eq: "electronics" }
            price: { gt: 500 }
          }
        }
      }
    }
  }
}
```

Finds customers who have at least one order containing at least one item of an electronic product over $500.

## Key Rules

1. **Check operators first:** Use `schema-type_fields(type_name: "TypeName_filter_input")` to see available operators
2. **any_of/all_of/none_of:** ONLY for relations, NEVER for scalars
3. **in operator:** For multiple scalar values, use `in: [val1, val2]`
4. **Uppercase enums:** ASC/DESC, not asc/desc
5. **_rows_count:** Not `count` at aggregation root
6. **distinct:** Use `count(distinct: true)` or `distinct_on`
