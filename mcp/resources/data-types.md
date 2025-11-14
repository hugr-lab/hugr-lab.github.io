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
  eq: "exact match"           # Equal to (exact string match)
  in: ["option1", "option2"]  # In list
  like: "%pattern%"           # Pattern match (% = wildcard, _ = single char)
  ilike: "%CASE%"             # Case-insensitive pattern match
  regex: "^[A-Z][a-z]+"       # Regular expression (POSIX ERE syntax)
  is_null: true               # Is/is not null
}
```

**Available String Operators:**
- ✅ `eq`, `in`, `like`, `ilike`, `regex`, `is_null`
- ❌ **NOT AVAILABLE:** `not_like`, `not_ilike`, `not_regex` (use boolean logic instead)

**Pattern Matching Examples:**
```graphql
# like / ilike patterns (SQL LIKE syntax)
name: { like: "John%" }      # Starts with "John"
name: { like: "%Doe" }       # Ends with "Doe"
name: { like: "%John%" }     # Contains "John"
name: { like: "J_hn" }       # Matches "John", "Jahn" (single char wildcard)
name: { ilike: "%john%" }    # Case-insensitive contains

# regex (POSIX ERE - Extended Regular Expression)
name: { regex: "^[A-Z][a-z]+" }        # Starts with uppercase, lowercase letters
email: { regex: "^[a-z0-9._%+-]+@" }   # Email pattern
code: { regex: "^(USD|EUR|GBP)$" }     # Exact match from set
```

**⚠️ REGEX SYNTAX - CRITICAL:**
- **Use POSIX ERE syntax** (PostgreSQL and DuckDB standard)
- **NOT Perl/PCRE syntax** - these features DON'T work:
  - ❌ Lookahead/lookbehind: `(?=`, `(?!`, `(?<=`, `(?<!`
  - ❌ Non-capturing groups: `(?:`
  - ❌ Lazy quantifiers: `*?`, `+?`
  - ❌ Unicode properties: `\p{L}`, `\p{N}`
  - ❌ Atomic groups: `(?>...)`

**✅ POSIX ERE Features (THESE WORK):**
- Basic: `.` (any char), `^` (start), `$` (end)
- Quantifiers: `*` (0+), `+` (1+), `?` (0-1), `{n}`, `{n,m}`
- Character classes: `[abc]`, `[^abc]`, `[a-z]`, `[0-9]`
- Predefined classes: `[:alnum:]`, `[:alpha:]`, `[:digit:]`, `[:space:]`
- Alternation: `(pattern1|pattern2)`
- Grouping: `(pattern)`

**Negation Example (use boolean logic):**
```graphql
# Instead of not_like or not_ilike:
filter: {
  _not: { name: { like: "%test%" } }  # ✅ Does NOT contain "test"
}

# Instead of not_regex:
filter: {
  _not: { email: { regex: "@example\\.com$" } }  # ✅ Does NOT end with @example.com
}
```

### Numeric Fields (Int, Float, BigInt)
```graphql
age: {
  eq: 25                      # Equal to
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

### Date/Timestamp/Time Fields
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

### Interval Fields
```graphql
duration: {
  eq: "5 days"                # Equal to (quantity unit format)
  gt: "2 hours"               # Greater than
  gte: "30 minutes"           # Greater than or equal
  lt: "1 week"                # Less than
  lte: "3 months"             # Less than or equal
  is_null: false              # Is/is not null
}
```

### JSON Fields
```graphql
metadata: {
  eq: {"key": "value"}        # Equal to
  has: "key1"                 # Has key
  has_all: ["key1", "key2"]   # Has all keys
  contains: {"key": "value"}  # Contains (like PostgreSQL @>)
  is_null: false              # Is/is not null
}
```

### Geometry Fields
```graphql
location: {
  eq: "POINT(0 0)"            # Equal to (WKT or GeoJSON)
  intersects: "POLYGON(...)"  # Intersects
  contains: "POINT(0 0)"      # Contains
  is_null: false              # Is/is not null
}
```

### List/Array Fields ([String], [Int], etc.)
```graphql
tags: {
  eq: ["val1", "val2"]        # Exact match of array (strict equality)
  contains: ["val1", "val2"]  # Contains all specified values
  intersects: ["val1", "val2"]# Has any of specified values
  is_null: false              # Is/is not null
}
```

### Range Fields (IntRange, TimestampRange, BigIntRange)
```graphql
date_range: {
  eq: "[2024-01-01, 2024-12-31]"     # Equal to
  contains: "2024-06-15"             # Contains value
  intersects: "[2024-06-01, 2024-07-01]"  # Intersects range
  includes: "[2024-06-01, 2024-06-30]"    # Includes range
  upper: "2024-12-31"                # Upper bound equals
  lower: "2024-01-01"                # Lower bound equals
  upper_inclusive: true              # Upper bound included
  lower_inclusive: true              # Lower bound included
  upper_inf: false                   # Upper bound unbounded
  lower_inf: false                   # Lower bound unbounded
  is_null: false                     # Is/is not null
}
```

## List Filter Operators (Relations)

**⚠️ USE THESE FOR ONE-TO-MANY AND MANY-TO-MANY RELATIONS!**

- `any_of: {...}` - At least one related record matches condition
- `all_of: {...}` - ALL related records match condition
- `none_of: {...}` - NO related records match condition

**❌ NEVER use any_of/all_of/none_of for scalar fields!**
**✅ ONLY use for relation fields (one-to-many, many-to-many)**

**Examples:** See `hugr://docs/patterns` → "Relation Filters" section

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
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
  any                     # Any non-null value
  last                    # Last non-null value
}
```

### String Fields
```graphql
field_name {
  count                   # Count non-null values
  count(distinct: true)   # Count distinct values
  string_agg(separator: ", ")  # Concatenate with separator
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
  any                     # Any non-null value
  last                    # Last non-null value
}
```

### Boolean Fields
```graphql
field_name {
  count                   # Count non-null values
  bool_and                # Logical AND of all values
  bool_or                 # Logical OR of all values
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
  any                     # Any non-null value
  last                    # Last non-null value
}
```

### Date/Timestamp Fields
```graphql
field_name {
  count                   # Count non-null values
  min                     # Earliest date/time
  max                     # Latest date/time
  list                    # Array of all values
  list(distinct: true)    # Array of unique values
  any                     # Any non-null value
  last                    # Last non-null value
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

### Sort by Aggregations (bucket_aggregation)
```graphql
# ✅ CORRECT - sorting bucket_aggregation results
customers_bucket_aggregation(
  order_by: [
    { field: "aggregations.total.sum", direction: DESC }    # Sort by aggregated value
    { field: "aggregations._rows_count", direction: DESC }  # Sort by count
    { field: "key.country", direction: ASC }                # Sort by grouping key
  ]
) {
  key { country }
  aggregations {
    _rows_count
    total { sum }  # Must select fields used in order_by
  }
}
```

**⚠️ CRITICAL ORDER_BY STRUCTURE:**
```graphql
# ✅ CORRECT - use "aggregations." prefix
order_by: [
  { field: "aggregations.total.sum", direction: DESC }
]

# ❌ WRONG - don't use separate aggregations field
order_by: [
  { field: "total.sum", aggregations: true }  # NO! This doesn't exist!
]

# ❌ WRONG - don't use field without aggregations prefix
order_by: [
  { field: "total.sum", direction: DESC }  # NO! Missing "aggregations." prefix!
]
```

**Rules for bucket_aggregation order_by:**
1. Aggregation fields: use `aggregations.FIELD.FUNCTION` format
2. Key fields: use `key.FIELD` format
3. Must select fields in query that you're sorting by
4. Direction is REQUIRED (ASC or DESC)

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

**More examples:** See `hugr://docs/patterns` → "Relation Filters" section

## Key Rules

1. **Check operators first:** Use `schema-type_fields(type_name: "TypeName_filter_input")` to see available operators
2. **any_of/all_of/none_of:** ONLY for relations, NEVER for scalars
3. **in operator:** For multiple scalar values, use `in: [val1, val2]`
4. **Uppercase enums:** ASC/DESC, not asc/desc
5. **_rows_count:** Not `count` at aggregation root
6. **distinct:** Use `count(distinct: true)` or `distinct_on`

---

## ⚠️ Common Validation Errors & Fixes

### Error 1: Non-existent Filter Field

**Error:**
```
Field "description" is not defined by type "synthea_conditions_list_filter"
```

**Cause:** Trying to filter by field that doesn't exist in schema

**Fix:**
```graphql
# ❌ WRONG - assuming field exists
filter: {
  description: { like: "%diabetes%" }  # Field doesn't exist!
}

# ✅ CORRECT - discover fields first
# Use: schema-type_fields(type_name: "synthea_conditions")
# Then use actual field name (e.g., "condition_description" or "code")
filter: {
  code: { like: "E11%" }  # Use actual field name
}
```

**Prevention:** ALWAYS use `schema-type_fields` to discover available fields before building filters.

### Error 2: Non-existent String Operator

**Error:**
```
Field "not_ilike" is not defined by type "StringFilter". Did you mean "ilike"?
```

**Cause:** Using operator that doesn't exist (like `not_ilike`, `not_like`, `not_regex`)

**Fix:**
```graphql
# ❌ WRONG - not_ilike doesn't exist
filter: {
  name: { not_ilike: "%test%" }  # Operator doesn't exist!
}

# ✅ CORRECT - use boolean logic
filter: {
  _not: {
    name: { ilike: "%test%" }  # Wrap in _not
  }
}
```

**Available String operators:** `eq`, `in`, `like`, `ilike`, `regex`, `is_null` ONLY.

### Error 3: Wrong order_by Structure for Aggregations

**Error:**
```
Field "OrderByField.field" of required type "String!" was not provided
Field "aggregations" is not defined by type "OrderByField"
```

**Cause:** Using wrong structure for sorting bucket_aggregation

**Fix:**
```graphql
# ❌ WRONG - aggregations as separate field
order_by: [
  { field: "total.sum", aggregations: true }  # Wrong structure!
]

# ❌ WRONG - missing aggregations prefix
order_by: [
  { field: "total.sum", direction: DESC }  # Missing prefix!
]

# ✅ CORRECT - aggregations as part of field path
order_by: [
  { field: "aggregations.total.sum", direction: DESC }  # Correct!
]
```

**Rule:** For bucket_aggregation, use `aggregations.FIELD.FUNCTION` or `key.FIELD` in the field path.

### Error 4: Perl/PCRE Regex Features

**Error:**
```
REGEX: Invalid Input Error: invalid perl operator: (?!
```

**Cause:** Using Perl/PCRE regex syntax (lookahead, lookbehind, etc.) instead of POSIX ERE

**Fix:**
```graphql
# ❌ WRONG - Perl regex with negative lookahead
filter: {
  code: { regex: "^(?!test).*$" }  # (?! is Perl-specific, doesn't work!
}

# ✅ CORRECT - use POSIX ERE or different approach
filter: {
  # Option 1: Use negation with boolean logic
  _not: {
    code: { regex: "^test" }  # Negate the match
  }
}

# ✅ CORRECT - use character class negation
filter: {
  code: { regex: "^[^t].*$" }  # Starts with non-t character (POSIX ERE)
}
```

**Remember:** Use POSIX ERE only - no `(?!`, `(?=`, `(?<=`, `(?<!`, `(?:`, `*?`, `+?`, etc.

### Error 5: Using Relation Filters on Scalar Fields

**Error:**
```
Field "any_of" is not defined by type "StringFilter"
```

**Cause:** Using relation operators (any_of/all_of/none_of) on scalar fields

**Fix:**
```graphql
# ❌ WRONG - any_of on scalar field
filter: {
  status: { any_of: { eq: "active" } }  # status is String, not relation!
}

# ✅ CORRECT - use 'in' for multiple values
filter: {
  status: { in: ["active", "pending", "completed"] }
}

# ✅ CORRECT - any_of only for relations
filter: {
  orders: {  # orders is a relation (one-to-many)
    any_of: {
      status: { eq: "active" }
    }
  }
}
```

**Rule:** `any_of`/`all_of`/`none_of` are ONLY for relation fields, use `in` for scalar fields.

---

## 🔍 Debugging Checklist

When you get validation errors:

1. **Field doesn't exist?**
   - ✅ Use `schema-type_fields` to discover actual field names
   - ✅ Check spelling and case sensitivity
   - ✅ Verify field exists in this type (not confused with related type)

2. **Operator doesn't exist?**
   - ✅ Use `schema-type_fields(type_name: "TypeName_filter_input")` to see available operators
   - ✅ Check if field type matches (String vs Int vs relation)
   - ✅ For negation, use `_not: { field: { operator } }` instead of `not_operator`

3. **order_by error?**
   - ✅ For bucket_aggregation: use `aggregations.field.function` or `key.field`
   - ✅ For regular queries: use just `field` or `relation.field`
   - ✅ Always include `direction: ASC` or `direction: DESC`

4. **Regex error?**
   - ✅ Remove Perl/PCRE features: `(?!`, `(?=`, `(?:`, `*?`, `\p{}`
   - ✅ Use POSIX ERE only: `^`, `$`, `[]`, `*`, `+`, `?`, `{n,m}`, `|`, `()`
   - ✅ Test pattern is valid POSIX ERE syntax

5. **Query validation failed?**
   - ✅ ALWAYS validate with `data-validate_graphql_query` BEFORE execution
   - ✅ Read error message carefully - it tells you exactly what's wrong
   - ✅ Fix and re-validate until it passes
