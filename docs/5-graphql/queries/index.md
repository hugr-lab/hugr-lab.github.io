---
title: "GraphQL Queries"
sidebar_position: 1
---

# GraphQL Queries

Hugr automatically generates a comprehensive GraphQL API from your schema definitions, providing powerful query capabilities for data access and manipulation. This section covers all aspects of querying data through the generated GraphQL API.

## What Gets Generated

For each data object (table or view) defined in your schema, Hugr automatically creates:

- **Basic queries** - Select multiple records with filtering, sorting, and pagination
- **Primary key queries** - Retrieve single records by primary key (`<object>_by_pk`)
- **Unique constraint queries** - Retrieve single records by unique fields (`<object>_by_<field>`)
- **Aggregation queries** - Single-row aggregations (`<object>_aggregation`)
- **Bucket aggregations** - Grouped aggregations (`<object>_bucket_aggregation`)
- **Relation fields** - Access related data through foreign keys
- **Function fields** - Execute functions with automatic argument mapping

## Query Organization

All queries are organized in a hierarchical module structure based on the `@module` directive:

```graphql
query {
  # Root level objects
  customers { id name }

  # Nested modules
  crm {
    analytics {
      top_customers { id total_spent }
    }
  }

  # Functions
  function {
    services {
      weather {
        current_weather(lat: 40.7, lon: -74.0) {
          temp
        }
      }
    }
  }
}
```

## Core Query Capabilities

### 1. Function Calls
Execute database functions, HTTP API calls, and custom business logic directly in queries.

[Learn about Function Calls →](./1-function-calls.md)

### 2. Basic Queries
Retrieve records by primary key or unique constraints with simple, direct queries.

[Learn about Basic Queries →](./2-basic-queries.md)

### 3. Filtering
Apply complex filters using boolean logic, relation filters, and nested conditions.

[Learn about Filtering →](./3-filtering.md)

### 4. Sorting & Pagination
Order results and implement pagination with limit/offset and distinct operations.

[Learn about Sorting & Pagination →](./4-sorting-pagination.md)

### 5. Relations
Query related data through foreign keys with nested queries and aggregations.

[Learn about Relations →](./5-relations.md)

### 6. Function Fields
Embed function calls as fields in data objects with automatic argument mapping.

[Learn about Function Fields →](./6-function-fields.md)

### 7. Aggregations
Perform single-row and grouped aggregations with support for nested aggregations.

[Learn about Aggregations →](./7-aggregations.md)

### 8. Dynamic Joins
Create ad-hoc joins at query time using the `_join` field, including cross-source joins.

[Learn about Dynamic Joins →](./8-dynamic-joins.md)

### 9. Spatial Queries
Query geographically related data using spatial relationships and operations.

[Learn about Spatial Queries →](./9-spatial.md)

### 10. H3 Hexagonal Clustering
Aggregate and cluster spatial data using the H3 hexagonal grid system for advanced geospatial analysis.

[Learn about H3 Clustering →](./10-h3-clustering.md)

### 11. Vector Similarity Search
Perform semantic search using vector embeddings with support for multiple distance metrics and hybrid search.

[Learn about Vector Search →](./11-vector-search.md)

## Query Arguments Reference

Most query types support these standard arguments:

| Argument | Type | Description |
|----------|------|-------------|
| `filter` | `<object>_filter` | Filter conditions for records |
| `order_by` | `[OrderByField]` | Sort order (can reference nested fields) |
| `limit` | `Int` | Maximum number of records to return |
| `offset` | `Int` | Number of records to skip |
| `distinct_on` | `[String]` | Fields to use for DISTINCT |
| `args` | `<input_type>` | Arguments for parameterized views |
| `inner` | `Boolean` | Use INNER join (excludes parent records without matches, default: false) |

### Nested Query Arguments

For relation fields (subqueries), additional arguments control post-join behavior:

| Argument | Type | Description |
|----------|------|-------------|
| `nested_order_by` | `[OrderByField]` | Sort order applied after join |
| `nested_limit` | `Int` | Limit applied after join |
| `nested_offset` | `Int` | Offset applied after join |

## Common Patterns

### Basic Data Retrieval
```graphql
query {
  customers(
    filter: { country: { eq: "USA" } }
    order_by: [{ field: "name", direction: ASC }]
    limit: 10
  ) {
    id
    name
    email
  }
}
```

### Data with Relations
```graphql
query {
  customers {
    id
    name
    orders(
      filter: { status: { eq: "pending" } }
      limit: 5
    ) {
      id
      total
    }
  }
}
```

### Aggregations
```graphql
query {
  orders_bucket_aggregation {
    key {
      status
    }
    aggregations {
      _rows_count
      total {
        sum
        avg
      }
    }
  }
}
```

### Function Calls
```graphql
query {
  function {
    weather {
      current_weather(lat: 40.7, lon: -74.0) {
        temp
        humidity
      }
    }
  }
}
```

## Performance Best Practices

1. **Use filters early** - Apply filters at the highest level possible to reduce data volume
2. **Limit nested queries** - Always use `limit` or `nested_limit` for one-to-many relations
3. **Leverage indexes** - Ensure indexes exist on filtered and sorted fields
4. **Aggregate when possible** - Use aggregation queries instead of fetching raw data
5. **Batch related data** - Use subqueries instead of separate queries to avoid N+1 problems

## Next Steps

Start with [Function Calls](./1-function-calls.md) to learn how to execute functions, or jump to [Basic Queries](./2-basic-queries.md) for fundamental data retrieval patterns.
