# Filter Construction Guide

Complete guide to building filters in Hugr GraphQL queries.

## 🎯 Critical Concepts

### Filter Object vs Scalar Field

**IMPORTANT:** Boolean logic operators (`_and`, `_or`, `_not`) work ONLY at filter object level, NOT on individual fields!

```graphql
# ✅ CORRECT - Boolean logic on filter object
filter: {
  _and: [
    { status: { eq: "active" } }
    { age: { gte: 18 } }
  ]
}

# ❌ WRONG - Boolean logic on scalar field
filter: {
  status: {
    _not: { eq: "inactive" }  # NO! StringFilter doesn't have _not
  }
}

# ✅ CORRECT - Wrap field in _not at object level
filter: {
  _not: {
    status: { eq: "inactive" }
  }
}
```

---

## 📦 Filter Object Structure

Every `filter` argument accepts a filter object with these fields:

```graphql
filter: {
  # Scalar fields (direct table columns)
  field_name: { operator: value }

  # Relation fields (foreign keys, one-to-many)
  relation_name: { any_of: {...} }

  # Boolean logic (OBJECT LEVEL!)
  _and: [ {...}, {...} ]
  _or: [ {...}, {...} ]
  _not: {...}
}
```

### Available at Filter Object Level

**These work at ROOT filter level:**
- `_and: [...]` - ALL conditions must match (AND logic)
- `_or: [...]` - ANY condition must match (OR logic)
- `_not: {...}` - NEGATES the entire filter

**NOT available inside scalar field filters!**

---

## 🔢 Scalar Field Filters

Scalar fields (String, Int, Boolean, Timestamp, Array, etc.) use **type-specific operators**.

**For complete operator reference by type, see:** `hugr://docs/data-types`

### Key Concepts

**Each scalar type has different operators:**
- **String:** `eq`, `in`, `like`, `ilike`, `regex`, `is_null`
- **Numeric (Int/Float/BigInt):** `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `is_null`
- **Boolean:** `eq`, `is_null`
- **Timestamp/Date:** `eq`, `gt`, `gte`, `lt`, `lte`, `is_null`
- **Array (scalar lists):** `eq`, `contains`, `intersects`, `is_null`

**Common pattern - field with operator:**
```graphql
filter: {
  field_name: { operator: value }
}
```

**Example:**
```graphql
filter: {
  name: { like: "%pattern%" }      # String field
  age: { gte: 18 }                 # Numeric field
  active: { eq: true }             # Boolean field
  tags: { intersects: ["a", "b"] } # Array field
}
```

**NOT available on scalar fields:** ❌ `_not`, `_and`, `_or` (use at filter object level!)

**For full operator lists and examples:** Read `hugr://docs/data-types` → "Filter Operators by Type"

---

## 🔗 Relation Field Filters

Relation fields (one-to-many, many-to-many) use **list operators**.

### One-to-Many Relations

```graphql
filter: {
  orders: {                    # Relation field
    any_of: {                  # At least one matches
      status: { eq: "pending" }
      total: { gt: 1000 }
    }
  }
}
```

### Many-to-One Relations

```graphql
filter: {
  customer: {                  # Relation field (direct access)
    country: { eq: "USA" }
    vip: { eq: true }
  }
}
```

### List Operators for Relations

- `any_of: {...}` - At least ONE related record matches
- `all_of: {...}` - ALL related records match
- `none_of: {...}` - NO related records match

**ONLY for relation fields, NOT for scalar arrays!**

**See `hugr://docs/patterns` for detailed relation filter examples.**

---

## 🔍 Filtering Through Subqueries (inner)

Use the `inner` argument on relation fields to filter parent records by the existence of related data.

### inner: true - Filter Parent by Child Existence

**Without inner (default - LEFT JOIN):**
Returns all parent records, even if they have no related child records.

**With inner: true (INNER JOIN):**
Returns only parent records that have at least one matching child record.

### Example: Many-to-One Relations (orders → customer)

```graphql
query {
  # All orders with their customers (LEFT JOIN)
  orders {
    id
    total
    customer {  # May be null
      id
      name
    }
  }

  # Only orders that have a customer (INNER JOIN)
  orders {
    id
    total
    customer(inner: true) {  # Filters orders: only those with customer
      id
      name
    }
  }
}
```

### Example: One-to-Many Relations (customers → orders)

```graphql
query {
  # All customers (even without orders)
  customers {
    id
    name
    orders {  # May be empty array
      id
      total
    }
  }

  # Only customers who have orders (INNER JOIN)
  customers {
    id
    name
    orders(
      inner: true  # Filters customers: only those with orders
      filter: { status: { eq: "completed" } }
    ) {
      id
      total
      status
    }
  }
}
```

### Example: Many-to-Many Relations (products ↔ categories)

```graphql
query {
  # Only products that are in at least one category
  products {
    id
    name
    categories(inner: true) {  # Filters products
      id
      name
    }
  }

  # Only categories that have at least one product
  categories {
    id
    name
    products(inner: true) {  # Filters categories
      id
      name
    }
  }
}
```

### Combining inner with Filters

```graphql
query {
  # Only customers with high-value completed orders
  customers {
    id
    name
    orders(
      inner: true  # Must have orders matching filter
      filter: {
        _and: [
          { status: { eq: "completed" } }
          { total: { gte: 1000 } }
        ]
      }
    ) {
      id
      total
      status
    }
  }
}
```

### Use Cases for inner: true

1. **Filter by existence:**
   - Customers with orders
   - Products in categories
   - Orders with reviews

2. **Exclude orphans:**
   - Order details without products
   - Orders without customers
   - Employees without departments

3. **Required relationships:**
   - Only show records with valid foreign keys
   - Ensure data integrity in queries

---

## 🔗 Filtering with Dynamic Joins (_join)

Use `_join` for query-time joins when NO predefined relation exists.

### Basic Pattern

```graphql
table_a {
  id
  _join(fields: ["id"]) {
    table_b(
      fields: ["a_id"]
      filter: { status: { eq: "active" } }
    ) {
      id
      data
    }
  }
}
```

**Key Points:**
- `_join(fields: ["field1", "field2"])` - join source fields
- `table_b(fields: ["match1", "match2"])` - join target fields
- Can apply `filter` to joined data
- Can aggregate joined results

**For advanced patterns:** See `hugr://docs/patterns` → "_join Patterns"

---

## 🗺️ Spatial Filtering (_spatial)

For geographic data, use `_spatial` to filter by spatial relationships.

### Basic Pattern

```graphql
regions {
  id
  name
  _spatial(
    field: "boundary"
    type: CONTAINS  # or INTERSECTS, WITHIN, DWITHIN
    buffer: 5000    # optional, for DWITHIN (meters)
  ) {
    locations(
      field: "point"
      filter: { active: { eq: true } }
    ) {
      id
      name
    }
  }
}
```

### Spatial Types

- `INTERSECTS` - Geometries share any space
- `WITHIN` - Geometry completely inside
- `CONTAINS` - Reference inside geometry
- `DISJOINT` - Geometries don't overlap
- `DWITHIN` - Within distance (requires buffer)

**Key Points:**
- `field:` geometry field on parent object
- `type:` spatial relationship type
- `buffer:` distance in meters (for DWITHIN)
- Can apply `filter` to spatial results
- Can aggregate spatial results

**For advanced patterns:** See `hugr://docs/patterns` → "Spatial Query Patterns"

---

## 🎭 Boolean Logic

### _and - All Conditions Must Match

```graphql
filter: {
  _and: [
    { status: { eq: "active" } }
    { age: { gte: 18 } }
    { country: { eq: "USA" } }
  ]
}
```

Equivalent to: `status = 'active' AND age >= 18 AND country = 'USA'`

**Implicit AND:**
```graphql
# These two are equivalent:
filter: {
  status: { eq: "active" }
  age: { gte: 18 }
}

filter: {
  _and: [
    { status: { eq: "active" } }
    { age: { gte: 18 } }
  ]
}
```

### _or - Any Condition Must Match

```graphql
filter: {
  _or: [
    { status: { eq: "active" } }
    { status: { eq: "pending" } }
  ]
}
```

Equivalent to: `status = 'active' OR status = 'pending'`

**Better alternative - use `in`:**
```graphql
filter: {
  status: { in: ["active", "pending"] }  # ✅ Simpler!
}
```

### _not - Negates Condition

```graphql
filter: {
  _not: {
    status: { eq: "cancelled" }
  }
}
```

Equivalent to: `status != 'cancelled'`

**For scalar fields, negate at object level:**
```graphql
# ✅ CORRECT
filter: {
  _not: { name: { like: "%test%" } }
}

# ❌ WRONG - StringFilter has no _not
filter: {
  name: { _not: { like: "%test%" } }
}
```

### Combining Logic Operators

```graphql
filter: {
  _and: [
    {
      _or: [
        { status: { eq: "active" } }
        { status: { eq: "pending" } }
      ]
    }
    { age: { gte: 18 } }
    {
      _not: {
        email: { like: "%@test.com" }
      }
    }
  ]
}
```

Equivalent to: `(status = 'active' OR status = 'pending') AND age >= 18 AND email NOT LIKE '%@test.com'`

---

## ⚠️ Common Mistakes

### Mistake 1: Boolean Logic on Scalar Field

```graphql
# ❌ WRONG
filter: {
  name: {
    _not: { like: "%test%" }  # StringFilter has no _not!
  }
}

# ✅ CORRECT
filter: {
  _not: {
    name: { like: "%test%" }
  }
}
```

### Mistake 2: Non-existent Operators

```graphql
# ❌ WRONG - "contains" for String (doesn't exist)
filter: {
  name: { contains: "test" }  # NO! Use like: "%test%"
}

# ✅ CORRECT
filter: {
  name: { like: "%test%" }
}
```

### Mistake 3: Prisma-style Operators

```graphql
# ❌ WRONG - _some doesn't exist in Hugr
filter: {
  tags: { _some: "value" }  # This is Prisma, not Hugr!
}

# ✅ CORRECT - use intersects for arrays
filter: {
  tags: { intersects: ["value"] }
}

# ✅ CORRECT - use any_of for relations
filter: {
  orders: { any_of: { status: { eq: "pending" } } }
}
```

### Mistake 4: Using `in` vs Relation Operators

```graphql
# For scalar fields - use 'in'
filter: {
  status: { in: ["active", "pending"] }  # ✅ Correct
}

# For relation fields - use any_of/all_of/none_of
filter: {
  orders: {
    any_of: { status: { eq: "pending" } }  # ✅ Correct
  }
}

# ❌ WRONG - any_of on scalar field
filter: {
  status: { any_of: { eq: "active" } }  # NO! status is scalar
}
```

---

## 🔍 How to Find Available Operators

**ALWAYS use schema introspection to check operators:**

```graphql
{
  __type(name: "customers_list_filter") {
    inputFields {
      name
      type {
        name
        inputFields {
          name
        }
      }
    }
  }
}
```

Or use MCP tool: `schema-type_fields(type_name: "customers_list_filter")`

**Filter type naming:**
- List filters: `<object>_list_filter`
- Aggregation filters: `<object>_aggregation_filter`
- Scalar types: `StringFilter`, `IntFilter`, `BooleanFilter`, etc.

---

## 📚 Related Resources

- **Operator reference by type:** `hugr://docs/data-types`
- **Advanced patterns:** `hugr://docs/patterns` → "_join Patterns", "Spatial Query Patterns"
- **Aggregation guide:** `hugr://docs/aggregations`
- **Common validation errors:** `hugr://docs/data-types` → "Common Validation Errors & Fixes"

---

## ✅ Quick Reference

| What | Where | Operators / Usage |
|------|-------|-------------------|
| **Boolean logic** | Filter object level | `_and`, `_or`, `_not` |
| **String field** | Inside field | `eq`, `in`, `like`, `ilike`, `regex`, `is_null` |
| **Numeric field** | Inside field | `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `is_null` |
| **Boolean field** | Inside field | `eq`, `is_null` |
| **Array field** | Inside field | `eq`, `contains`, `intersects`, `is_null` |
| **Relation field** | Inside field | `any_of`, `all_of`, `none_of` (one-to-many) |
| **Relation field** | Direct access | Nested object (many-to-one) |
| **Subquery filtering** | Aggregation argument | `inner: true` (only matching rows) |
| **Dynamic joins** | `_join(fields)` | Query-time joins with nested `filter` |
| **Spatial joins** | `_spatial(field, type, buffer)` | Geographic filtering (INTERSECTS, WITHIN, DWITHIN, etc.) |

**Remember:**
1. `_and/_or/_not` at **filter object level** ONLY
2. Scalar fields have **NO boolean logic operators**
3. For operator details: Read `hugr://docs/data-types`
4. Use `inner: true` in aggregations to filter by joined data
5. Use `_join` for dynamic cross-source joins with filters
6. Use `_spatial` for geographic queries with spatial filters
7. Read error messages - they tell you exactly what's wrong!
