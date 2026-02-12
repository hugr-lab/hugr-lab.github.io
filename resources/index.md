# Hugr MCP Resources

Resources and prompts for AI models to work with Hugr Data Mesh through MCP.

## Resources (r-*)

Reference documentation for understanding Hugr:

- **r-overview.md** - Hugr overview and core concepts
- **r-schema-structure.md** - Schema type system, filters, aggregations
- **r-query-patterns.md** - Query patterns and best practices

## Prompts (p-*)

Instructions for AI models on specific workflows:

- **p-discovery.md** - How to discover schema using MCP tools
- **p-query-building.md** - How to build efficient GraphQL queries
- **p-analysis.md** - How to perform data analysis

## Usage

1. **Discovery** - Use `p-discovery.md` when exploring unknown schema
2. **Query Building** - Use `p-query-building.md` when constructing queries
3. **Analysis** - Use `p-analysis.md` when performing data analysis
4. **Reference** - Consult `r-*` files for concepts and patterns

## MCP Tools

Hugr MCP server provides 9 tools:

**Discovery:**
- `discovery-search_modules` - Find modules by natural language query
- `discovery-search_data_sources` - Find data sources by query
- `discovery-search_module_data_objects` - Find tables/views in module
- `discovery-search_module_functions` - Find functions/mutations in module
- `discovery-data_object_field_values` - Get field value statistics and distribution

**Schema:**
- `schema-type_info` - Get type metadata
- `schema-type_fields` - List type fields with introspection
- `schema-enum_values` - Get enum values

**Execution:**
- `data-inline_graphql_result` - Execute GraphQL query and return inline result

## Key Principles

1. **Never assume** - Always discover schema structure
2. **Lazy introspection** - Start broad, refine incrementally
3. **Validate first** - Check types and fields before querying
4. **Performance matters** - Always use limits, filter early
5. **Server-side analysis** - Use aggregations instead of fetching all data
