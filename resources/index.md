# Hugr MCP Resources Index

This directory contains resources and prompts for the Hugr MCP (Model Context Protocol) server, designed to enable AI models to efficiently work with Hugr Data Mesh through lazy schema introspection and intelligent query construction.

## Overview

The Hugr MCP server provides tools for:
- **Lazy Schema Introspection**: Discover modules, data objects, and schema incrementally
- **Dynamic Query Construction**: Build efficient GraphQL queries based on discovered schema
- **Performance Optimization**: Leverage aggregations, filtering, and join strategies

## Resources (r-)

Resources provide reference documentation for understanding Hugr concepts and capabilities:

1. **[r-getting-started.md](./r-getting-started.md)** - Quick introduction to Hugr and MCP tools
2. **[r-core-concepts.md](./r-core-concepts.md)** - Core concepts: modules, data objects, schema organization
3. **[r-discovery-workflow.md](./r-discovery-workflow.md)** - Best practices for lazy schema discovery
4. **[r-querying-basics.md](./r-querying-basics.md)** - Filtering, sorting, pagination fundamentals
5. **[r-aggregations.md](./r-aggregations.md)** - Single-row and bucket aggregations
6. **[r-relations-joins.md](./r-relations-joins.md)** - Foreign keys, relations, and dynamic joins
7. **[r-advanced-features.md](./r-advanced-features.md)** - Spatial queries, vector search, JQ transformations

## Prompts (p-)

Prompts guide the model on how to use MCP tools effectively for specific tasks:

1. **[p-lazy-discovery.md](./p-lazy-discovery.md)** - How to discover schema incrementally without assumptions
2. **[p-query-construction.md](./p-query-construction.md)** - Building efficient queries from requirements
3. **[p-performance-optimization.md](./p-performance-optimization.md)** - Performance best practices and optimization
4. **[p-data-analysis.md](./p-data-analysis.md)** - Analyzing data with aggregations and transformations

## Usage Pattern

The typical workflow when using Hugr MCP is:

1. **Discover** → Use discovery tools to explore available modules and data objects
2. **Validate** → Use schema tools to verify field types and filter options
3. **Query** → Construct optimized GraphQL queries based on requirements
4. **Transform** → Apply JQ transformations if needed for data reshaping

## Key Principles

- **Never assume names** - Always discover before querying
- **Lazy introspection** - Start broad, refine incrementally
- **Validate fields** - Check schema before filtering
- **Prefer aggregations** - Use aggregations over large raw queries
- **Performance first** - Apply filters early, limit results

## MCP Tools Reference

The Hugr MCP server provides these discovery and schema tools:

### Discovery Tools
- `discovery-search_modules` - Search for modules by name pattern
- `discovery-search_data_sources` - Find available data sources
- `discovery-search_module_data_objects` - List data objects in a module
- `discovery-search_module_functions` - List functions in a module
- `discovery-data_object_field_values` - Get distinct values for a field

### Schema Tools
- `schema-type_info` - Get information about a GraphQL type
- `schema-type_fields` - List fields for a type with metadata
- `schema-enum_values` - Get enum values and descriptions

## Related Documentation

For detailed Hugr documentation, visit:
- [Hugr Documentation](https://hugr-lab.github.io/docs/)
- [GitHub Repository](https://github.com/hugr-lab/hugr)
- [MCP Server Repository](https://github.com/hugr-lab/mcp)
