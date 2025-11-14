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

All organized in hierarchical modules accessed through single GraphQL schema.

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
