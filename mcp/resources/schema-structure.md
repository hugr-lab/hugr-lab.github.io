# Schema Structure

## Type System

### Scalar Types
- GraphQL: `String`, `Int`, `Float`, `Boolean`, `ID`
- Hugr: `Timestamp`, `JSON`, `Geometry`, `Vector`

### Type Naming
Data objects may have prefixes:
```
Data object: "customers"
Possible types:
  - "customers"           # No prefix
  - "mod_customers"       # Module prefix
  - "ds_customers"        # Data source prefix
```

**Always use `schema-type_fields` to discover actual type names.**

### Generated Types
For data object `customers`:
- `customers` - Main type
- `customers_filter` - Filter input
- `customers_aggregations` - Aggregation result
- `customers_bucket_aggregation_key` - Grouping key

**Use `schema-type_fields` to introspect each type.**

## Introspection Strategy

**Critical:** Always use `schema-type_fields` to understand:
- Available fields on data objects
- Filter operators for each field type
- Aggregation functions available
- Arguments required for queries
- Input types for mutations
- Relation fields and their types

Example:
```
1. schema-type_fields(type_name="customers")
   → See: fields, relations, aggregations, _join

2. schema-type_fields(type_name="customers_filter")
   → See: filterable fields

3. schema-type_fields(type_name="String_filter_input")
   → See: operators (eq, in, like, etc.)

4. schema-type_fields(type_name="customers_aggregations")
   → See: available aggregation functions per field
```

### Result Pagination and Search

All introspection tools return: `{total, returned, items}`

**Always check `total` vs `returned`:**
- If `returned` < `total` → More results available
- Use `limit`/`offset` for pagination
- Use `relevance_query` for semantic search

**Examples:**
```
# Pagination: Get all fields
schema-type_fields(type_name: "orders", limit: 50, offset: 0)
schema-type_fields(type_name: "orders", limit: 50, offset: 50)

# Search: Find specific fields
schema-type_fields(
  type_name: "orders",
  relevance_query: "customer shipping",
  top_k: 10
)
```

**Key: Don't assume field doesn't exist - check `total` first!**

## Filter System

### Filter Operators by Type

**String:** `eq`, `in`, `like`, `ilike`, `regex`, `is_null`
**Numeric:** `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `is_null`
**Boolean:** `eq`, `is_null`
**Timestamp:** `eq`, `gt`, `gte`, `lt`, `lte`, `is_null`
**JSON:** `eq`, `contains`, `has`, `has_all`, `is_null`
**Geometry:** `eq`, `intersects`, `contains`, `is_null`

**Note:** Use `schema-type_fields` on filter types to see exact available operators.

### Boolean Logic
- `_and: [...]` - All match
- `_or: [...]` - Any match
- `_not: {...}` - Negate

### Relation Filters

**One-to-one/Many-to-one:**
```graphql
filter: {
  related_object: {
    field: { operator: value }
  }
}
```

**One-to-many/Many-to-many:**
```graphql
filter: {
  related_objects: {
    any_of: { ... }   # At least one matches
    all_of: { ... }   # All match
    none_of: { ... }  # None match
  }
}
```

**Important:** Can also aggregate and group by related data - use `schema-type_fields` on aggregation types to see relation aggregation fields.

## Aggregation System

### Functions by Type

**Numeric:** `count`, `sum`, `avg`, `min`, `max`, `list`, `any`, `last`
**String:** `count`, `string_agg`, `list`, `any`, `last`
**Boolean:** `count`, `bool_and`, `bool_or`
**Timestamp:** `count`, `min`, `max`

**Note:** These are common functions. Use `schema-type_fields` on `<object>_aggregations` type to see exact available functions for each field.

### Aggregating Relations

Can aggregate through relations:
```graphql
customers {
  orders_aggregation {
    _rows_count
    total { sum }
  }
}
```

Can group by relations:
```graphql
orders_bucket_aggregation {
  key {
    customer {
      country
    }
  }
  aggregations { ... }
}
```

### Time Operations
```graphql
# Bucketing
timestamp_field(bucket: day|week|month|quarter|year)
timestamp_field(bucket_interval: "15 minutes")

# Parts
_field_part(extract: year|quarter|month|day|hour)
```

## Special Features

### Cube Tables (`@cube`)

Fields marked `@measurement` are aggregated, others are dimensions.

```graphql
# Query cube with measurement functions
cube_table {
  dimension_field        # Group by
  measurement_field(measurement_func: SUM)  # Aggregate
}
```

Available `measurement_func`:
- Numeric: `SUM`, `AVG`, `MIN`, `MAX`, `ANY`
- Boolean: `OR`, `AND`, `ANY`
- Timestamp: `MIN`, `MAX`, `ANY`

**Use `schema-type_fields` on cube type to see which fields are measurements.**

### Dynamic Joins (_join)

Every data object has `_join` field:
```graphql
_join(fields: ["field1"]) {
  other_object(fields: ["match_field"]) { ... }
}
```

Cross-source capable. Join fields must have matching types.

### Spatial Joins (_spatial)

For geometry fields:
```graphql
_spatial(field: "geometry", type: CONTAINS|INTERSECTS|DWITHIN|TOUCHES|WITHIN) {
  other_object(field: "point") { ... }
}
```

### H3 Clustering

Root-level query for hexagonal spatial aggregation:
```graphql
h3(resolution: 7) {
  cell
  resolution
  data {
    object_aggregation(field: "geometry", inner: true) {
      _rows_count
    }
  }
}
```

### Semantic Search

Use `similarity` argument with text (not vector):
```graphql
data_object(
  similarity: {
    name: "vector_field"
    text: "search query"     # Text, not embeddings
    distance: Cosine
    limit: 10
  }
  filter: { ... }
) {
  id
  title
  _distance
}
```

Distance metrics: `Cosine`, `L2`, `InnerProduct`

## Discovery Workflow

1. Find modules → `discovery-search_modules`
2. Find objects → `discovery-search_module_data_objects`
3. **Introspect fields** → `schema-type_fields` on object type
4. **Check filters** → `schema-type_fields` on filter type
5. **Check aggregations** → `schema-type_fields` on aggregations type
6. Get values → `discovery-data_object_field_values`

**Key:** Step 3-5 (introspection) is critical for understanding exact schema structure.
