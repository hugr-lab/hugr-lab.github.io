# Hugr Overview

## How to Work with Hugr

**IMPORTANT:** When user asks questions about data or requests work with Hugr:

1. **Use the `start` prompt** - It will automatically route to the right specialized prompt
2. **Or invoke directly:**
   - `analysis` - For data questions and insights
   - `discovery` - For schema exploration
   - `query-building` - For query construction

**The `start` prompt is your entry point** - it analyzes the request and routes to the appropriate workflow.

---

## Architecture

Hugr provides unified GraphQL API across:
- **Data Sources** - PostgreSQL, MySQL, DuckDB, Files, REST APIs
- **Modules** - Hierarchical organization (can be nested)
- **Data Objects** - Tables and views
  - **Tables** - Full CRUD support
  - **Views** - Read-only, can be parameterized
- **Functions** - Custom business logic and computations
  - **Query Functions** - via `query { function { ... } }`
  - **Mutation Functions** - via `mutation { function { ... } }`

All organized in hierarchical modules accessed through single GraphQL schema.

### Types of Fields in Data Objects

Data objects contain different field types. **ALWAYS use `schema-type_fields` to discover exact field types!**

#### 1. Scalar Fields
Database columns with primitive types: String, Int, Float, Boolean, Timestamp, UUID, Geometry, etc.

```graphql
query {
  products {
    id          # Int
    name        # String
    price       # Float
    active      # Boolean
    created_at  # Timestamp
  }
}
```

#### 2. JSON Fields
Store and query structured data with path expressions:

```graphql
# Query JSON field
query {
  events {
    metadata  # JSON - returns full object
  }
}

# Filter by JSON path
events(filter: {
  metadata: { path: "$.user.role", eq: "admin" }
})

# Aggregate JSON values
events_aggregation {
  metadata {
    sum(path: "$.amount")
    list(path: "$.tags", distinct: true)
  }
}
```

#### 3. Nested Object Fields
Custom types embedded in data:

```graphql
query {
  customers {
    id
    name
    address {      # Nested object
      street
      city
      country
    }
  }
}
```

#### 4. Subquery Fields (Relations)
Foreign key relationships returning related objects:

**Many-to-one** (single object):
```graphql
orders {
  customer { id name }  # Returns single customer
}
```

**One-to-many** (array):
```graphql
customers {
  orders(              # Returns array of orders
    filter: { status: { eq: "pending" } }
    limit: 10
  ) { id total }
}
```

**Many-to-many** (through junction):
```graphql
products {
  categories { id name }  # Returns array
}
```

#### 5. Aggregation Fields
Statistics on relation fields:

```graphql
customers {
  # Single row aggregation
  orders_aggregation {
    _rows_count
    total { sum avg }
  }

  # Bucket aggregation (GROUP BY)
  orders_bucket_aggregation {
    key { status }
    aggregations {
      _rows_count
      total { sum }
    }
  }
}
```

#### 6. Function Call Fields
Execute functions per row:

```graphql
orders {
  shipping_cost  # Scalar function - returns single value
  tier {         # Object-returning function - returns object
    level
  }
  recommendations(limit: 5) {  # Table function - returns ARRAY of objects
    filter: { price: { lte: 100 } }
  }
  price_converted(to_currency: "EUR")  # With query arguments
}
```

**Function types:**
- **Scalar** - Returns single value (Int, String, etc.)
- **Object** - Returns single object with fields
- **Table** - Returns array of objects (can filter/sort/aggregate)

#### 7. Dynamic Fields
Ad-hoc queries:

```graphql
# _join - query-time joins
customers {
  _join(fields: ["email"]) {
    external_data(fields: ["user_email"]) {
      points
    }
  }
}

# _spatial - spatial joins
stores {
  _spatial(field: "location", type: DWITHIN, buffer: 5000) {
    customers(field: "address") { id }
  }
}
```

**Example object with all field types:**
```graphql
query {
  orders {
    # Regular fields
    id
    total
    created_at

    # Many-to-one relation
    customer {
      id
      name
    }

    # One-to-many relation
    order_items {
      product { name }
      quantity
    }

    # Aggregation on relation
    order_items_aggregation {
      _rows_count
      quantity { sum }
    }

    # Dynamic join
    _join(fields: ["customer_id"]) {
      loyalty_points(fields: ["customer_id"]) {
        points
      }
    }

    # Function field (if defined)
    shipping_cost  # Calculated per order
  }
}
```

### Module Hierarchy

Modules can be nested to organize schema logically:
- Root module: `core`
- Sub-module: `core.sales`
- Nested: `core.sales.analytics`

**In GraphQL queries:**
```graphql
# Root module data object
query {
  customers { id name }
}

# Sub-module data object
query {
  sales {
    orders { id total }
  }
}

# Nested module
query {
  sales {
    analytics {
      revenue_summary { metric value }
    }
  }
}
```

Each level of nesting reflects the module hierarchy in the GraphQL structure.

## Core Concepts

### Auto-Generated Queries

For each data object (e.g., `customers`):
- `customers` - List with filter, sort, pagination
- `customers_by_pk(id)` - Single by primary key
- `customers_aggregation` - Overall statistics
- `customers_bucket_aggregation` - Grouped analysis (GROUP BY)
- Mutations (tables only): `insert_`, `update_`, `delete_`

### Query Arguments

**Standard:**
- `filter` - Conditions
- `order_by` - Sorting
- `limit` / `offset` - Pagination
- `distinct_on` - Unique values

**Nested (for relations):**
- `nested_limit` / `nested_offset` - Per-parent limit
- `nested_order_by` - Sort after join
- `inner` - INNER vs LEFT join

### Relations

- **Predefined** - Foreign keys or joins defined in schema
  - One-to-one/Many-to-one: Direct field
  - One-to-many/Many-to-many: List fields with subqueries
- **Dynamic** - `_join` field for ad-hoc joins (cross-source capable)

### Special Table Types

**Cube (`@cube`):**
- OLAP-optimized pre-aggregation
- Fields with `@measurement` are aggregated
- Other fields are dimensions (for grouping)
- Query with `field(measurement_func: SUM|AVG|MIN|MAX|ANY)`

**Hypertable (`@hypertable`):**
- TimescaleDB time-series optimization
- Timestamp field with `@timescale_key`
- Efficient time bucketing

## Discovery Principle

**Never assume** - Always use MCP tools to discover:
- Available modules
- Data objects in modules
- Field names and types
- Filter operators
- Aggregation capabilities
- Relations structure

Schema is dynamic and varies by deployment.

## Row-Level Security

Some schema elements may be hidden based on user role:
- **Fields** - May not appear in introspection if user lacks permission
- **Queries** - Data objects may be filtered or hidden
- **Mutations** - May be restricted based on role
- **Functions** - Custom functions may be role-specific

**Always introspect** to see what's actually available for the current user, rather than assuming schema structure.

---

## 📚 Resource Guide

For detailed information, read these MCP resources:

**Fundamentals:**
- `hugr://docs/filters` - Filter construction, boolean logic, relations, inner
- `hugr://docs/aggregations` - Single row, bucket, nested, time-based
- `hugr://docs/data-types` - Operator reference, aggregation functions, errors

**Reference:**
- `hugr://docs/schema` - Type system, introspection, special table types
- `hugr://docs/patterns` - Query patterns, anti-patterns, jq transformations

**Functions:**
- Direct calls: `query { function { <name>(...) } }`
- As fields: Embedded in data objects (e.g., `order.shipping_cost`)
- Types: Scalar, object-returning, table functions
- Use cases: Calculations, API calls, business logic

**Always use MCP discovery tools** to explore schema, not documentation alone!
