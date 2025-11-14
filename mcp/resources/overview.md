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

**⚠️ Some scalar types auto-generate additional fields:**
- **Timestamp/Date:** time part extraction (`_<field>_part`), bucketing (`bucket: month`)
- **Geometry:** transformations, measurements (`_<field>_measurement`)
- **Vector:** distance calculation (`_<field>_distance`), semantic search (`similarity` argument)
  - If `@embeddings` directive: `_distance_to_query(query: String!)` for text-to-vector search
  - Sort by semantic similarity using `order_by: [{ field: "_<vector_field>_distance", direction: ASC }]`
- **JSON:** struct argument for field extraction

**List/Array types** (`[String]`, `[Int]`, etc.) - support filtering only (`eq`, `contains`, `intersects`), NOT aggregation.

**These vary by database type, extensions, and configuration.**

**→ ALWAYS use `schema-type_fields` to discover actual available fields and arguments!**

#### 2. JSON Fields
Store and query structured data. Support path expressions for filtering and aggregation.

**Can:** Extract nested values, filter by JSON path, aggregate JSON fields.

**→ Use `schema-type_fields` to see JSON field capabilities in your schema!**

#### 3. Nested Object Fields
Custom GraphQL types embedded in data. Query nested fields directly.

**→ Use `schema-type_fields` on the object type to see nested structure!**

#### 4. Subquery Fields (Relations)
Foreign key relationships returning related objects.

**Types:**
- **Many-to-one:** Returns single object (e.g., `order.customer`)
- **One-to-many:** Returns array (e.g., `customer.orders`)
- **Many-to-many:** Returns array through junction table

**Support:** Filtering, sorting, pagination on related data.

**→ Use `schema-type_fields` to discover relations and their types!**

#### 5. Aggregation Fields
Computed statistics on relation fields.

**Types:**
- `<relation>_aggregation` - Overall statistics
- `<relation>_bucket_aggregation` - Grouped statistics (GROUP BY)

**→ See `hugr://docs/aggregations` for details. Use `schema-type_fields` to discover available aggregation functions!**

#### 6. Function Call Fields
Execute functions per row - embedded in data objects.

**Types:**
- **Scalar functions** - Return single value
- **Object-returning functions** - Return structured object
- **Table functions** - Return array of objects (can filter/sort/aggregate)

**⚠️ CRITICAL: Function fields can have arguments!**

Arguments can be:
- **Mapped from row data** (auto-filled)
- **Required at query time** (must provide)
- **Optional** (have defaults)

**→ ALWAYS use `schema-type_fields` to check field signature and discover arguments!**

#### 7. Dynamic Fields
Ad-hoc query capabilities:
- **_join** - Query-time joins (when no predefined relation exists)
- **_spatial** - Spatial joins for geographic data

**→ See `hugr://docs/filters` and `hugr://docs/patterns` for usage!**

---

## ⚠️ MANDATORY: Introspection Before Queries

**NEVER assume schema - ALWAYS introspect first!**

### Discovery Workflow:

**1. Find data object:**
```
discovery-search_module_data_objects(module_name: "...", query: "...")
→ Returns: name, module, type
```

**2. Introspect ALL fields:**
```
schema-type_fields(type_name: "object_name")
→ For EACH field check:
  - Field name (exact spelling)
  - Field type (scalar, relation, function, nested object, etc.)
  - Arguments (if any) - CRITICAL for function fields!
  - Required vs optional (Type! vs Type)
  - Return type
```

**3. For function fields - check signature:**
```
schema-type_fields shows: price_converted(to_currency: String!): Float
                          ↑ field name  ↑ argument       ↑ return type
```

**4. For filter operators:**
```
schema-type_fields(type_name: "object_filter")
schema-type_fields(type_name: "ScalarType_filter_input")
→ See EXACT available operators
```

**5. Build query using discovered information**

### Why Introspection is Mandatory:

Schema varies by:
- Deployment configuration
- Database type (PostgreSQL, MySQL, DuckDB)
- Extensions (PostGIS, TimescaleDB, etc.)
- User permissions (RLS)
- Schema version

**Auto-generated fields** (timestamps, geometry) vary by database and extensions.
**Function field arguments** vary by function definition.
**Relations** vary by schema configuration.

**→ Use discovery tools + `schema-type_fields` for EVERY query!**

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
