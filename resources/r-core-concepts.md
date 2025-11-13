# Core Concepts of Hugr

## Architecture Overview

Hugr consists of several key components:

1. **Data Sources** - Physical databases or APIs (PostgreSQL, MySQL, DuckDB, REST APIs, files)
2. **Catalog Sources** - Schema definition files (stored in filesystem or S3)
3. **GraphQL Schema** - Auto-generated unified API from schema definitions
4. **Modules** - Hierarchical organization of queries, mutations, and functions

## Schema Organization

### Hierarchical Modules

Modules organize the GraphQL API into logical namespaces:

```graphql
query {
  # Top-level module
  northwind {
    customers { id }
    orders { id }
  }

  # Nested modules
  analytics {
    sales {
      top_customers { revenue }
    }
    inventory {
      stock_levels { quantity }
    }
  }

  # Functions namespace
  function {
    weather {
      get_forecast(city: "NYC") { temp }
    }
  }
}
```

**Key Points:**
- Modules can be nested to any depth
- Each data source can be its own module (`as_module: true`)
- Functions are always in the `function` namespace
- Mutations follow the same module structure

### Module Path Format

When using discovery tools, module paths use dot notation:
- `"northwind"` - top-level module
- `"analytics.sales"` - nested module
- `""` - root level (if data source is not a module)

## Data Objects

### Tables vs Views

**Tables** (`@table` directive):
- Support full CRUD operations
- Can have primary keys and unique constraints
- Support mutations (insert, update, delete)
- Generated queries: `<name>`, `<name>_by_pk`, `<name>_by_<unique_field>`

**Views** (`@view` directive):
- Read-only queries
- Can be parameterized with arguments
- Often represent complex joins or aggregations
- Generated queries: `<name>` (with optional `args`)

### Generated Queries per Data Object

For a data object named `customers`, Hugr auto-generates:

1. **Data Queries**
   - `customers` - list query with filter, sort, pagination
   - `customers_by_pk(id: ...)` - single record by primary key
   - `customers_by_<field>` - single record by unique constraint

2. **Aggregation Queries**
   - `customers_aggregation` - single-row aggregation
   - `customers_bucket_aggregation` - grouped aggregation

3. **Mutation Queries** (tables only)
   - `insert_customers(data: ...)` - create records
   - `update_customers(data: ..., filter: ...)` - update records
   - `delete_customers(filter: ...)` - delete records

## Data Types

### Scalar Types

**Built-in GraphQL scalars:**
- `String`, `Int`, `Float`, `Boolean`, `ID`

**Hugr-specific scalars:**
- `Timestamp` - Date and time values
- `JSON` - JSON/JSONB data (PostgreSQL jsonb, DuckDB json)
- `Geometry` - Spatial data (PostGIS, DuckDB spatial)
- `Vector` - Vector embeddings (pgvector)

### Complex Types

**Nested Objects:**
```graphql
type customer_profile {
  preferences: UserPreferences  # Nested object
  settings: AccountSettings     # Nested object
}
```

**Arrays:**
```graphql
type product {
  tags: [String!]!              # Array of strings
  images: [ProductImage!]!      # Array of objects
}
```

## Query Arguments

### Standard Arguments

All data queries accept these arguments:

**filter** - Filter records
```graphql
customers(filter: { country: { eq: "USA" } })
```

**order_by** - Sort results
```graphql
customers(order_by: [{ field: "name", direction: ASC }])
```

**limit** - Limit number of results
```graphql
customers(limit: 10)
```

**offset** - Skip records (pagination)
```graphql
customers(offset: 20, limit: 10)
```

**distinct_on** - Get distinct values
```graphql
customers(distinct_on: ["country"])
```

**args** - View parameters (for parameterized views)
```graphql
sales_by_period(args: { start_date: "2024-01-01", end_date: "2024-12-31" })
```

### Nested Query Arguments

For subqueries and relations, additional arguments are available:

**nested_order_by** - Sort after join
```graphql
customers {
  orders(nested_order_by: [{ field: "total", direction: DESC }])
}
```

**nested_limit** - Limit per parent
```graphql
customers {
  orders(nested_limit: 5)  # 5 orders per customer
}
```

**nested_offset** - Offset per parent
```graphql
customers {
  orders(nested_offset: 10, nested_limit: 5)
}
```

**inner** - Use INNER JOIN instead of LEFT JOIN
```graphql
customers {
  orders(inner: true)  # Only customers with orders
}
```

## Filter Input Types

### Filter Structure

For each data object, Hugr generates a filter input type:

```
customers          → customers_filter
orders             → orders_filter
products           → products_filter
```

### Field-Level Filters

Each field type has specific operators:

**String fields:**
```graphql
{ name: { eq: "John", ilike: "%smith%", regex: "^[A-Z]" } }
```

**Numeric fields:**
```graphql
{ price: { gt: 10.0, lte: 100.0, in: [10, 20, 30] } }
```

**Boolean fields:**
```graphql
{ active: { eq: true } }
```

**Timestamp fields:**
```graphql
{ created_at: { gte: "2024-01-01", lt: "2024-02-01" } }
```

**JSON fields:**
```graphql
{ metadata: { contains: { "key": "value" }, has: "field_name" } }
```

**Geometry fields:**
```graphql
{ location: { intersects: "POINT(1 2)", contains: {...} } }
```

### Boolean Logic

**_and** - All conditions must match
```graphql
filter: {
  _and: [
    { status: { eq: "active" } }
    { price: { gt: 100 } }
  ]
}
```

**_or** - Any condition must match
```graphql
filter: {
  _or: [
    { country: { eq: "USA" } }
    { country: { eq: "Canada" } }
  ]
}
```

**_not** - Negate condition
```graphql
filter: {
  _not: { status: { eq: "deleted" } }
}
```

### Relation Filters

**One-to-one/many-to-one:**
```graphql
orders(filter: {
  customer: {
    country: { eq: "USA" }
  }
})
```

**One-to-many/many-to-many:**
```graphql
customers(filter: {
  orders: {
    any_of: { status: { eq: "pending" } }  # At least one pending order
  }
})
```

```graphql
customers(filter: {
  orders: {
    all_of: { status: { eq: "completed" } }  # All orders completed
  }
})
```

```graphql
customers(filter: {
  orders: {
    none_of: { status: { eq: "cancelled" } }  # No cancelled orders
  }
})
```

## Relations and Foreign Keys

### Defining Relations

Relations are defined in schema using directives:

**@field_references** - Single-field foreign key
```graphql
type orders @table(name: "orders") {
  customer_id: Int! @field_references(
    references_name: "customers"
    field: "id"
    query: "customer"
    references_query: "orders"
  )
}
```

**@references** - Multi-field foreign key
```graphql
type order_details @table(name: "order_details")
  @references(
    references_name: "products"
    source_fields: ["product_id", "warehouse_id"]
    references_fields: ["id", "warehouse_id"]
    query: "product"
  )
```

**Many-to-many** - Junction table with `is_m2m: true`
```graphql
type product_categories @table(name: "product_categories", is_m2m: true) {
  product_id: Int! @pk @field_references(...)
  category_id: Int! @pk @field_references(...)
}
```

### Using Relations in Queries

**Fetch related data:**
```graphql
customers {
  id
  name
  orders {  # Related orders
    id
    total
  }
}
```

**Filter by related data:**
```graphql
customers(filter: {
  orders: {
    any_of: { total: { gt: 1000 } }
  }
}) {
  id
  name
}
```

**Aggregate related data:**
```graphql
customers {
  id
  name
  orders_aggregation {
    _rows_count
    total { sum avg }
  }
}
```

## Dynamic Joins (_join)

Every data object has a special `_join` field for query-time joins:

### Basic Join
```graphql
customers {
  id
  _join(fields: ["id"]) {
    orders(fields: ["customer_id"]) {
      id
      total
    }
  }
}
```

### Cross-Source Join
```graphql
postgres_customers {
  id
  _join(fields: ["email"]) {
    mysql_users(fields: ["email"]) {
      preferences
    }
  }
}
```

### Join with Aggregation
```graphql
customers {
  id
  _join(fields: ["id"]) {
    orders_aggregation(fields: ["customer_id"]) {
      _rows_count
      total { sum }
    }
  }
}
```

## Aggregations

### Single-Row Aggregation

Aggregate all matching records:

```graphql
orders_aggregation(filter: { status: { eq: "completed" } }) {
  _rows_count
  total { sum avg min max }
}
```

### Bucket Aggregation (GROUP BY)

Group records and aggregate each group:

```graphql
orders_bucket_aggregation {
  key {
    status
    customer { country }
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

### Available Aggregation Functions

**Numeric:** `count`, `sum`, `avg`, `min`, `max`, `list`, `any`, `last`
**String:** `count`, `string_agg`, `list`, `any`, `last`
**Boolean:** `count`, `bool_and`, `bool_or`
**Timestamp:** `count`, `min`, `max`

## Special Features

### Spatial Queries (_spatial)

For geometry fields, use `_spatial` for geographic joins:

```graphql
cities {
  id
  boundary
  _spatial(field: "boundary", type: CONTAINS) {
    locations(field: "point") {
      id
      name
    }
  }
}
```

### Vector Search

For vector fields, use `similarity` argument:

```graphql
documents(
  similarity: {
    name: "embedding"
    vector: [0.1, 0.2, ...]
    distance: Cosine
    limit: 10
  }
) {
  id
  title
}
```

### JQ Transformations

Transform query results server-side:

```graphql
query {
  jq(
    expression: ".customers | map({name, total: .orders_aggregation.total.sum})"
    query: "{ customers { name orders_aggregation { total { sum } } } }"
  )
}
```

## Next Steps

- **[r-discovery-workflow.md](./r-discovery-workflow.md)** - Learn discovery strategies
- **[r-querying-basics.md](./r-querying-basics.md)** - Master filtering and sorting
- **[r-aggregations.md](./r-aggregations.md)** - Deep dive into aggregations

## Related Documentation

- [Schema Definition](https://hugr-lab.github.io/docs/engine-configuration/schema-definition)
- [GraphQL Queries](https://hugr-lab.github.io/docs/graphql/queries)
- [Data Types](https://hugr-lab.github.io/docs/engine-configuration/schema-definition/data-types)
