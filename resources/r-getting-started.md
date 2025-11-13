# Getting Started with Hugr MCP

## What is Hugr?

Hugr is an **Open Source Data Mesh platform** and high-performance **GraphQL backend** designed for:
- Accessing **distributed data sources** (PostgreSQL, MySQL, DuckDB, files, REST APIs)
- Analytics and geospatial processing
- Rapid backend development for applications and BI tools
- Unified GraphQL API across diverse data sources

## What is Hugr MCP?

The Hugr MCP (Model Context Protocol) server provides AI models with tools to:
- **Discover** schema through lazy introspection
- **Explore** modules, data objects, and functions incrementally
- **Query** data efficiently using GraphQL
- **Analyze** data with aggregations and transformations

## Key Concepts

### Modules
Hugr organizes queries and mutations in a **hierarchical module structure**:

```graphql
query {
  # Module: northwind
  northwind {
    customers { id name }
    orders { id total }
  }

  # Nested modules
  analytics {
    sales {
      top_customers { id revenue }
    }
  }
}
```

### Data Objects
Data objects are **tables** and **views** exposed through the GraphQL API:
- Tables support CRUD operations (queries and mutations)
- Views are read-only (queries only)
- Both support filtering, sorting, pagination, aggregations

### Relations
Data objects can have **relationships** defined through foreign keys:
- **One-to-one**: Customer → Address
- **One-to-many**: Customer → Orders
- **Many-to-many**: Products ↔ Categories

## MCP Tools Overview

The Hugr MCP server provides **8 essential tools** organized in two categories:

### Discovery Tools (5)

1. **discovery-search_modules**
   - Find modules by name pattern
   - Returns module names and descriptions

2. **discovery-search_data_sources**
   - List available data sources
   - Shows which databases/sources are connected

3. **discovery-search_module_data_objects**
   - List tables and views in a module
   - Shows data object types and descriptions

4. **discovery-search_module_functions**
   - List functions in a module
   - Shows function signatures and purposes

5. **discovery-data_object_field_values**
   - Get distinct values for a field
   - Useful for understanding data distribution

### Schema Tools (3)

1. **schema-type_info**
   - Get metadata about a GraphQL type
   - Shows kind (OBJECT, INPUT_OBJECT, etc.)

2. **schema-type_fields**
   - List all fields of a type
   - Shows field types, nullability, descriptions

3. **schema-enum_values**
   - Get possible values for enum types
   - Shows value descriptions

## Lazy Discovery Workflow

**Never assume schema structure** - always discover incrementally:

### Step 1: Find Modules
```
Use: discovery-search_modules
Example: pattern="*" or pattern="analytics*"
```

### Step 2: Explore Data Objects
```
Use: discovery-search_module_data_objects
Example: module_path="northwind"
```

### Step 3: Examine Field Structure
```
Use: schema-type_fields
Example: type_name="nw_customers"
```

### Step 4: Validate Filter Options
```
Use: schema-type_fields
Example: type_name="nw_customers_filter"
```

### Step 5: Query Data
```
Construct GraphQL query based on discovered schema
```

## Query Structure

### Basic Query
```graphql
query {
  northwind {
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
}
```

### With Relations
```graphql
query {
  northwind {
    customers(limit: 5) {
      id
      name
      orders(
        filter: { status: { eq: "pending" } }
        limit: 5
      ) {
        id
        total
        created_at
      }
    }
  }
}
```

### Aggregation
```graphql
query {
  northwind {
    orders_bucket_aggregation(
      filter: { status: { eq: "completed" } }
    ) {
      key {
        customer { country }
      }
      aggregations {
        _rows_count
        total { sum avg }
      }
    }
  }
}
```

## Common Patterns

### Pattern 1: Find What Data is Available
```
1. discovery-search_modules(pattern="*")
2. discovery-search_module_data_objects(module_path="<module>")
3. schema-type_fields(type_name="<object_name>")
```

### Pattern 2: Understand Filter Options
```
1. Identify object: e.g., "customers"
2. Get filter type: schema-type_fields(type_name="customers_filter")
3. Examine field filters: schema-type_fields(type_name="String_filter_input")
```

### Pattern 3: Build Efficient Aggregation
```
1. Find aggregation query: <object>_bucket_aggregation
2. Check available aggregations: schema-type_fields(type_name="<object>_aggregations")
3. Construct query with grouping keys and aggregations
```

## Best Practices

### 1. Always Discover First
❌ Don't assume: `query { customers { ... } }`
✅ Discover: Use `discovery-search_module_data_objects` first

### 2. Validate Before Filtering
❌ Don't guess: `filter: { status: { equals: "active" } }`
✅ Check schema: Use `schema-type_fields` to see available operators

### 3. Prefer Aggregations
❌ Avoid: Fetching 100k rows to count them
✅ Use: `<object>_aggregation { _rows_count }`

### 4. Apply Filters Early
❌ Poor: Fetch all data, filter in memory
✅ Good: Use GraphQL `filter` argument

### 5. Always Limit Results
❌ Dangerous: `customers { ... }` (might return millions)
✅ Safe: `customers(limit: 100) { ... }`

## Next Steps

- Read **[r-core-concepts.md](./r-core-concepts.md)** for deeper understanding
- See **[r-discovery-workflow.md](./r-discovery-workflow.md)** for detailed discovery strategies
- Check **[p-lazy-discovery.md](./p-lazy-discovery.md)** for AI model guidance

## Related Resources

- [Hugr Documentation](https://hugr-lab.github.io/docs/)
- [GraphQL Queries Guide](https://hugr-lab.github.io/docs/graphql)
- [Schema Definition](https://hugr-lab.github.io/docs/engine-configuration/schema-definition)
