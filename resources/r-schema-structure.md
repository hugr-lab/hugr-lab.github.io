# Schema Structure

## Type System

### Scalar Types
- GraphQL: `String`, `Int`, `Float`, `Boolean`, `ID`
- Hugr-specific: `Timestamp`, `JSON`, `Geometry`, `Vector`

### Type Naming Patterns
Data object may have prefix based on module/data source:
```
Data object: "customers"
Possible types:
  - "customers"           # No prefix
  - "mod_customers"       # With module prefix
  - "ds_customers"        # With data source prefix
```

**Always discover actual type names - never assume.**

### Generated Types
For data object `customers`:
- `customers` - Main type with fields
- `customers_filter` - Filter input type
- `customers_aggregations` - Aggregation result type
- `customers_mut_input_data` - Insert input (tables only)
- `customers_mut_data` - Update input (tables only)

## Filter System

### Filter Input Structure
Each field type has specific operators:

**String:**
- `eq`, `in` - Exact match
- `like`, `ilike` - Pattern match (%, _)
- `regex` - Regular expression
- `is_null` - NULL check

**Numeric (Int, Float):**
- `eq`, `in` - Exact/list match
- `gt`, `gte`, `lt`, `lte` - Comparisons
- `is_null` - NULL check

**Boolean:**
- `eq`, `is_null`

**Timestamp:**
- `eq`, `gt`, `gte`, `lt`, `lte`, `is_null`

**JSON:**
- `eq`, `contains`, `has`, `has_all`, `is_null`

**Geometry:**
- `eq`, `intersects`, `contains`, `is_null`

### Boolean Logic
- `_and: [...]` - All conditions must match
- `_or: [...]` - Any condition must match
- `_not: {...}` - Negate condition

Multiple fields at same level = implicit AND.

### Relation Filters
**For one-to-one/many-to-one:**
```graphql
filter: {
  related_object: {
    field: { operator: value }
  }
}
```

**For one-to-many/many-to-many:**
```graphql
filter: {
  related_objects: {
    any_of: { ... }   # At least one matches
    all_of: { ... }   # All match
    none_of: { ... }  # None match
  }
}
```

## Aggregation System

### Aggregation Functions by Type

**Numeric:** `count`, `sum`, `avg`, `min`, `max`, `list`, `any`, `last`
**String:** `count`, `string_agg`, `list`, `any`, `last`
**Boolean:** `count`, `bool_and`, `bool_or`
**Timestamp:** `count`, `min`, `max`

### Time Bucketing
```graphql
key {
  date_field(bucket: day)    # day, week, month, quarter, year
  date_field(bucket_interval: "15 minutes")
}
```

### Time Parts
```graphql
key {
  _field_part(extract: year)   # year, quarter, month, day, hour
}
```

## Special Fields

### Dynamic Joins (_join)
Every data object has `_join` field:
```graphql
_join(fields: ["field1", "field2"]) {
  other_object(fields: ["match_field1", "match_field2"]) {
    ...
  }
}
```

### Spatial Joins (_spatial)
For geometry fields:
```graphql
_spatial(field: "geometry_field", type: CONTAINS) {
  other_object(field: "point_field") {
    ...
  }
}
```

Types: `CONTAINS`, `INTERSECTS`, `DWITHIN`, `TOUCHES`, `WITHIN`

### Vector Search
Use `similarity` argument (not filter):
```graphql
data_object(
  similarity: {
    name: "vector_field"
    vector: [0.1, 0.2, ...]
    distance: Cosine    # Cosine, L2, InnerProduct
    limit: 10
  }
) { ... }
```

## Discovery Strategy

1. Find modules → `discovery-search_modules`
2. Find objects → `discovery-search_module_data_objects`
3. Examine fields → `schema-type_fields`
4. Check filters → `schema-type_fields` on filter type
5. Get values → `discovery-data_object_field_values`
