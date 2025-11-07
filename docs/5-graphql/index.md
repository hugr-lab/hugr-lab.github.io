---
slug: /docs/5-graphql
title: GraphQL API
sidebar_position: 1
description: Comprehensive GraphQL API for querying, mutating, and transforming data in hugr
keywords: [graphql, api, queries, mutations, operations, jq, transformations]
---

# GraphQL API

Hugr provides a powerful, automatically generated GraphQL API that exposes your database schema as a type-safe, flexible interface for data access and manipulation. The API is built on modern GraphQL best practices and includes advanced features for real-world applications.

## Overview

The hugr GraphQL API automatically generates a comprehensive interface from your schema definitions, providing:

- **Auto-Generated Schema**: Complete GraphQL schema generated from your database tables, views, and functions
- **Type-Safe Operations**: Strong typing for queries, mutations, and responses
- **Advanced Querying**: Filtering, sorting, pagination, aggregations, and nested queries
- **Relationship Navigation**: Automatic support for foreign key relationships and joins
- **Function Integration**: Direct execution of database functions and custom business logic
- **Server-Side Transformations**: JQ-based data transformations before returning results
- **Spatial & Vector Search**: Built-in support for geospatial and semantic search operations
- **Real-Time Capabilities**: Subscription support for live data updates
- **Role-Based Access**: Fine-grained permissions based on user roles

## API Sections

### 1. Queries

The Queries section covers all aspects of data retrieval through the GraphQL API:

- **Function Calls**: Execute database functions and HTTP API calls
- **Basic Queries**: Retrieve records by primary key or unique constraints
- **Filtering**: Apply complex filters with boolean logic and nested conditions
- **Sorting & Pagination**: Order results and implement pagination strategies
- **Relations**: Query related data through foreign keys
- **Function Fields**: Embed function calls as fields in data objects
- **Aggregations**: Perform single-row and grouped aggregations
- **Dynamic Joins**: Create ad-hoc joins at query time
- **Spatial Queries**: Query geographically related data
- **H3 Clustering**: Aggregate spatial data using hexagonal grids
- **Vector Search**: Perform semantic search using vector embeddings
- **Generated Fields**: Use automatically generated transformation fields
- **Cube & Hypertable**: Query OLAP cubes and time-series data

[Explore Queries Documentation →](./1-queries/)

### 2. Mutations

Mutations allow you to modify data through create, update, and delete operations:

- **CRUD Operations**: Insert, update, and delete records
- **Transactional Integrity**: All mutations execute atomically
- **Relationship Support**: Insert nested related records in one operation
- **Flexible Filtering**: Update/delete multiple records with complex filters
- **Return Values**: Get back inserted/updated data
- **Cache Invalidation**: Automatic cache invalidation on data changes
- **Soft Delete Support**: Mark records as deleted without physical removal

[Learn about Mutations →](./2-mutations.md)

### 3. GraphQL Extensions

Extensions provide additional data alongside query responses:

- **JQ Transformation Results**: Results of server-side data transformations
- **Performance Statistics**: Query execution metrics and timings
- **Hierarchical Structure**: Extensions mirror the query structure
- **Debugging Information**: Detailed execution information for optimization

[Understanding Extensions →](./3-extensions.md)

### 4. JQ Transformations

Server-side JQ transformations enable flexible data processing:

- **Reduce Network Traffic**: Transform and filter data before sending to clients
- **Simplify Client Logic**: Offload complex transformations from client applications
- **Data Enrichment**: Combine data from multiple sources
- **Flexible Output**: Adapt data structure to match different requirements
- **Security**: Hide sensitive fields before data leaves the server

[JQ Transformations Guide →](./4-jq-transformations.md)

## Key Features

### Auto-Generated Schema

For each data object (table or view) in your schema, hugr automatically creates:

- **Basic queries**: Select multiple records with filtering and pagination
- **Primary key queries**: Retrieve single records by primary key (`<object>_by_pk`)
- **Unique constraint queries**: Retrieve records by unique fields (`<object>_by_<field>`)
- **Aggregation queries**: Single-row aggregations (`<object>_aggregation`)
- **Bucket aggregations**: Grouped aggregations (`<object>_bucket_aggregation`)
- **Mutation operations**: Insert, update, and delete operations
- **Relation fields**: Access related data through foreign keys

### Module Organization

Queries and mutations are organized in a hierarchical module structure using the `@module` directive:

```graphql
query {
  # Root level objects
  customers { id name }

  # Nested modules
  crm {
    analytics {
      top_customers { id total_spent }
      top_customers_aggregation { _rows_count }
    }
  }

  # Function calls in modules
  function {
    services {
      weather {
        current_weather(lat: 40.7, lon: -74.0) {
          temp humidity
        }
      }
    }
  }
}
```

### Advanced Capabilities

**Spatial Operations**: Built-in support for PostGIS spatial queries, including distance calculations, containment checks, and geometric operations.

**Vector Similarity**: Native pgvector integration for semantic search and similarity queries using various distance metrics (cosine, L2, inner product).

**Time-Series**: Optimized queries for TimescaleDB hypertables with time-based bucketing and measurement aggregations.

**OLAP Cubes**: Native support for OLAP cube queries with multi-dimensional aggregations.

**Dynamic Joins**: Create joins at query time without predefined relationships, including cross-source joins.

## Getting Started

### Basic Query Example

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
    orders(filter: { status: { eq: "pending" } }) {
      id
      total
      created_at
    }
  }
}
```

### Mutation Example

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "john@example.com"
    status: "active"
  }) {
    id
    name
    created_at
  }
}
```

### Aggregation Example

```graphql
query {
  orders_bucket_aggregation(
    filter: { created_at: { gte: "2024-01-01" } }
  ) {
    key {
      status
    }
    aggregations {
      _rows_count
      total { sum avg }
    }
  }
}
```

### JQ Transformation Example

```graphql
query {
  jq(
    expression: ".customers | map({name, email, order_count: (.orders | length)})"
    query: """
      query {
        customers {
          name
          email
          orders { id }
        }
      }
    """
  )
}
```

## API Endpoints

The GraphQL API is available at the following endpoints:

- **`/query`**: Standard GraphQL endpoint for queries and mutations
- **`/jq-query`**: GraphQL endpoint with JQ transformation support
- **`/admin`**: GraphiQL-based Admin UI for interactive exploration

See [Admin UI Documentation](../6-querying/1-admin-ui.md) for details on the interactive interface.

## Authentication & Authorization

The GraphQL API respects all authentication rules configured for the hugr instance:

- **Role-Based Access**: Field visibility and access based on user roles
- **Fine-Grained Permissions**: Control access at the type and field level
- **Hidden Fields**: Fields marked as `hidden: true` are not shown in introspection
- **Disabled Fields**: Fields marked as `disabled: true` are completely inaccessible
- **Anonymous Access**: Optional support for public, unauthenticated access

See [Access Control Documentation](../engine-configuration/access-control.md) for configuration details.

## Performance Best Practices

1. **Use filters early**: Apply filters at the highest level to reduce data volume
2. **Limit nested queries**: Always use `limit` or `nested_limit` for one-to-many relations
3. **Leverage indexes**: Ensure indexes exist on filtered and sorted fields
4. **Aggregate when possible**: Use aggregation queries instead of fetching raw data
5. **Batch related data**: Use nested queries to avoid N+1 problems
6. **Use JQ transformations**: Reduce network traffic by transforming data server-side

## Error Handling

The GraphQL API follows standard GraphQL error conventions:

- **Syntax Errors**: Invalid GraphQL syntax returns detailed error messages
- **Validation Errors**: Type mismatches and missing required fields
- **Authorization Errors**: Insufficient permissions for requested data
- **Execution Errors**: Database or function execution failures

All errors include:
- Error message
- Error locations in the query
- Error path in the response structure
- Additional error extensions for debugging

## Next Steps

Ready to start using the GraphQL API?

1. **New to GraphQL?** Start with [Basic Queries](./1-queries/2-basic-queries.md) to learn fundamental data retrieval patterns
2. **Need advanced features?** Explore [Filtering](./1-queries/3-filtering.md) and [Aggregations](./1-queries/7-aggregations.md)
3. **Working with spatial data?** Check out [Spatial Queries](./1-queries/9-spatial.md) and [H3 Clustering](./1-queries/10-h3-clustering.md)
4. **Building search features?** Learn about [Vector Search](./1-queries/11-vector-search.md)
5. **Need to modify data?** Review [Mutations](./2-mutations.md) for create, update, and delete operations
6. **Want to transform data?** Explore [JQ Transformations](./4-jq-transformations.md)

## External Resources

- [GraphQL Official Documentation](https://graphql.org/learn/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [JQ Manual](https://jqlang.github.io/jq/manual/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)