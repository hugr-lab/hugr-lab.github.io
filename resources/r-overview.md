# Hugr Overview

## What is Hugr

Hugr is a GraphQL backend that provides unified API access to distributed data sources:
- Databases: PostgreSQL, MySQL, DuckDB
- Files: Parquet, CSV, JSON, GeoParquet
- APIs: REST endpoints
- Cloud storage: S3-compatible

## Key Concepts

### Modules
Hierarchical organization of GraphQL queries and mutations:
```graphql
query {
  module_name {
    data_object { fields }

    nested_module {
      other_object { fields }
    }
  }
}
```

### Data Objects
Tables and views exposed through GraphQL:
- **Tables** - Support CRUD (queries + mutations)
- **Views** - Read-only queries, can be parameterized

### Auto-Generated Queries
For each data object `customers`:
- `customers` - List with filter, sort, limit
- `customers_by_pk(id)` - Single record by primary key
- `customers_aggregation` - Single-row aggregation
- `customers_bucket_aggregation` - Grouped aggregation (GROUP BY)
- `insert_customers` - Create (tables only)
- `update_customers` - Update (tables only)
- `delete_customers` - Delete (tables only)

### Relations
- One-to-one/Many-to-one: Direct field access
- One-to-many/Many-to-many: List fields with filters
- Dynamic joins: `_join` field for ad-hoc joins

## Query Arguments

**Standard arguments:**
- `filter` - Filter conditions
- `order_by` - Sort results
- `limit` / `offset` - Pagination
- `distinct_on` - Unique values

**Nested arguments:**
- `nested_limit` / `nested_offset` - Per-parent pagination
- `nested_order_by` - Post-join sorting
- `inner` - INNER vs LEFT join

**Aggregation arguments:**
- Same as standard, plus grouping in `key { ... }`

## Core Principle

**Never assume schema structure** - always use MCP discovery tools to find:
- Available modules
- Data objects in modules
- Fields and their types
- Filter operators
- Relations
