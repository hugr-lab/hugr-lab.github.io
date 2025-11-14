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

When aggregating data with joins, use the `inner` argument to filter aggregation results.

### inner: true - Only Include Matching Rows

**Without inner (default):**
All rows in the parent dataset are included, even if they have no matching joined data.

**With inner: true:**
Only rows that have matching joined data are included in the aggregation.

### Example: Population Density with inner

```graphql
query {
  h3(resolution: 6) {
    cell
    data {
      # Only include cells that have population data
      districts: boundaries_aggregation(
        field: "geom"
        inner: true  # Filter: only cells with district data
      ) {
        pop: _join(fields: ["district_code"]) {
          population(fields: ["code"]) {
            count {
              sum
            }
          }
        }
      }

      # All cells included
      buildings: buildings_aggregation(
        field: "geom"
        # inner: false (default) - all cells
      ) {
        area {
          sum
        }
      }
    }
  }
}
```

**Use Case:** When calculating distributions or ratios, `inner: true` ensures the denominator is only calculated for rows with numerator data.

---

## 🔗 Filtering with Dynamic Joins (_join)

Use `_join` for query-time joins and filter the joined data.

### Basic Query-Time Join

```graphql
query {
  customers(
    filter: { country: { eq: "USA" } }
  ) {
    id
    name

    # Join with orders at query time
    _join(fields: ["id"]) {
      orders(
        fields: ["customer_id"]
        filter: {
          status: { eq: "pending" }
          total: { gt: 1000 }
        }
      ) {
        id
        total
        status
      }
    }
  }
}
```

### Cross-Source Joins with Filters

```graphql
query {
  postgres_customers(
    filter: { active: { eq: true } }
  ) {
    id
    name

    # Join with MySQL orders from different data source
    _join(fields: ["email"]) {
      mysql_orders(
        fields: ["customer_email"]
        filter: {
          created_at: { gte: "2024-01-01" }
          status: { in: ["pending", "processing"] }
        }
      ) {
        id
        total
      }
    }
  }
}
```

### Aggregating Joined Data with Filters

```graphql
query {
  products {
    id
    name

    _join(fields: ["id"]) {
      # Aggregate only 5-star reviews
      reviews_aggregation(
        fields: ["product_id"]
        filter: { rating: { eq: 5 } }
      ) {
        _rows_count
        rating {
          avg
        }
      }
    }
  }
}
```

**Pattern:**
1. Filter parent data (customers, products, etc.)
2. Join at query time with `_join`
3. Filter joined data with nested `filter`
4. Can aggregate joined results

---

## 🗺️ Spatial Filtering (_spatial)

For geographic data, use `_spatial` to filter by spatial relationships.

### Basic Spatial Join with Filter

```graphql
query {
  stores(
    filter: { active: { eq: true } }
  ) {
    id
    name
    location

    # Find customers within 5km
    _spatial(
      field: "location"
      type: DWITHIN
      buffer: 5000  # meters
    ) {
      customers(
        field: "address_location"
        filter: {
          vip: { eq: true }
          last_order: { gte: "2024-01-01" }
        }
      ) {
        id
        name
      }
    }
  }
}
```

### Spatial Join Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `INTERSECTS` | Geometries share any space | Find overlapping regions |
| `WITHIN` | Geometry completely inside | Find points in polygon |
| `CONTAINS` | Reference inside geometry | Find polygon containing point |
| `DISJOINT` | Geometries don't overlap | Find non-adjacent areas |
| `DWITHIN` | Within distance (needs buffer) | Find nearby locations |

### Complex Spatial Query

```graphql
query {
  delivery_zones {
    id
    name
    boundary

    # Active orders within zone
    _spatial(field: "boundary", type: CONTAINS) {
      orders(
        field: "delivery_location"
        filter: {
          _and: [
            { status: { in: ["pending", "processing"] } }
            { scheduled_time: { lte: "2024-12-31T23:59:59Z" } }
            {
              customer: {
                vip: { eq: true }
              }
            }
          ]
        }
      ) {
        id
        delivery_location
        customer {
          name
        }
      }
    }
  }
}
```

### Spatial Aggregation with Filters

```graphql
query {
  regions {
    id
    name

    _spatial(field: "boundary", type: CONTAINS) {
      # Aggregate only residential buildings
      buildings_aggregation(
        field: "location"
        filter: {
          building_type: { eq: "residential" }
        }
      ) {
        _rows_count
        area {
          sum
        }
      }
    }
  }
}
```

**Pattern:**
1. Filter parent geographic data
2. Spatial join with `_spatial(field, type, buffer)`
3. Filter joined spatial data
4. Can aggregate spatial results

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
- **Relation filter patterns:** `hugr://docs/patterns`
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
