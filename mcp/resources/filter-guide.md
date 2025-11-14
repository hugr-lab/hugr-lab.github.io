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

Scalar fields (String, Int, Boolean, Timestamp, etc.) use **type-specific operators**.

### String Fields

```graphql
name: {
  eq: "exact"           # Equal
  in: ["val1", "val2"]  # In list
  like: "%pattern%"     # SQL LIKE (% wildcard)
  ilike: "%PATTERN%"    # Case-insensitive LIKE
  regex: "^[A-Z]+"      # POSIX ERE regex (NOT Perl!)
  is_null: false        # NULL check
}
```

**Available operators:** `eq`, `in`, `like`, `ilike`, `regex`, `is_null`

**NOT available:** ❌ `contains`, `not_like`, `not_ilike`, `not_regex`, `_not`, `_and`, `_or`

### Numeric Fields (Int, Float, BigInt)

```graphql
age: {
  eq: 25                # Equal
  in: [25, 30, 35]      # In list
  gt: 18                # Greater than
  gte: 18               # Greater than or equal
  lt: 65                # Less than
  lte: 65               # Less than or equal
  is_null: false        # NULL check
}
```

**Available operators:** `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `is_null`

### Boolean Fields

```graphql
active: {
  eq: true              # Equal
  is_null: false        # NULL check
}
```

**Available operators:** `eq`, `is_null`

### Timestamp/Date Fields

```graphql
created_at: {
  eq: "2024-01-01T00:00:00Z"   # Equal
  gt: "2024-01-01"              # After
  gte: "2024-01-01"             # After or equal
  lt: "2024-12-31"              # Before
  lte: "2024-12-31"             # Before or equal
  is_null: false                # NULL check
}
```

**Available operators:** `eq`, `gt`, `gte`, `lt`, `lte`, `is_null`

### List/Array Fields (scalar arrays)

```graphql
tags: {
  eq: ["val1", "val2"]           # Exact array match
  contains: ["val1", "val2"]     # Contains all values
  intersects: ["val1", "val2"]   # Has any of values
  is_null: false                 # NULL check
}
```

**Available operators:** `eq`, `contains`, `intersects`, `is_null`

**NOT available:** ❌ `_some`, `_every`, `_none` (these don't exist - use relation operators instead)

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

| What | Where | Operators |
|------|-------|-----------|
| **Boolean logic** | Filter object level | `_and`, `_or`, `_not` |
| **String field** | Inside field | `eq`, `in`, `like`, `ilike`, `regex`, `is_null` |
| **Numeric field** | Inside field | `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `is_null` |
| **Boolean field** | Inside field | `eq`, `is_null` |
| **Array field** | Inside field | `eq`, `contains`, `intersects`, `is_null` |
| **Relation field** | Inside field | `any_of`, `all_of`, `none_of` (for one-to-many) |
| **Relation field** | Direct access | Nested object (for many-to-one) |

**Remember:**
1. `_and/_or/_not` at **filter object level** ONLY
2. Scalar fields have **NO boolean logic operators**
3. Use `schema-type_fields` to verify available operators
4. Read error messages - they tell you exactly what's wrong!
