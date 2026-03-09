---
title: "MCP Integration"
sidebar_position: 6
description: Model Context Protocol (MCP) endpoint for AI assistant integration
keywords: [mcp, ai, llm, model-context-protocol, semantic-search, embeddings]
---

# MCP Integration

Hugr exposes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) endpoint that enables AI assistants to query and explore the data graph. The endpoint uses SSE (Server-Sent Events) transport and is available at `/mcp`.

Through MCP, AI clients can discover modules, inspect schemas, validate queries, and execute GraphQL — all through structured tool calls rather than free-form prompting.

## Enabling MCP

Set the following environment variable to enable the MCP endpoint:

```bash
MCP_ENABLED=true
```

### Optional: Semantic Search

For embedding-based semantic search across schema descriptions, configure an embedder service:

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_ENABLED` | Enable the MCP endpoint | `false` |
| `EMBEDDER_URL` | URL of the embedding service (e.g. an OpenAI-compatible endpoint) | — |
| `EMBEDDER_VECTOR_SIZE` | Embedding vector dimensions (must match the model output) | — |

When an embedder is configured, all schema descriptions are indexed as vectors, and discovery tools rank results by semantic relevance.

## Connecting Clients

### Claude Web (claude.ai)

Add the SSE URL directly in Claude's MCP settings:

```
https://your-hugr-instance.example.com/mcp
```

### Claude Desktop

Claude Desktop uses stdio transport, so you need the `@anthropic-ai/mcp-proxy` package to bridge stdio to SSE. Add this to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hugr": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-proxy",
        "--transport",
        "streamable-http",
        "https://your-hugr-instance.example.com/mcp"
      ]
    }
  }
}
```

### Cursor

In Cursor settings, add the SSE URL under MCP servers:

```
https://your-hugr-instance.example.com/mcp
```

## Tools Reference

The MCP server exposes 10 tools organized into three categories.

### Discovery Tools

Tools for finding modules, data objects, functions, and data sources via natural-language semantic search.

#### `discovery-search_modules`

Search modules by natural language. Returns top-K modules ranked by semantic relevance. Use as the **first step** to find which module contains the data you need.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | Natural language search query |
| `top_k` | Number | No | 5 | Number of results (1–50) |
| `min_score` | Number | No | 0.3 | Minimum relevance score (0–1) |

**Returns:** `{ total, returned, items: [{ name, description, score }] }`

#### `discovery-search_module_data_objects`

Search tables and views within a module. Returns the type name (for schema introspection) and query field names (for GraphQL queries). Each data object has four query fields: `<name>`, `<name>_by_pk`, `<name>_aggregation`, `<name>_bucket_aggregation`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | String | Yes | — | Module name to search within |
| `query` | String | Yes | — | Natural language query |
| `top_k` | Number | No | 5 | Number of results (1–50) |
| `min_score` | Number | No | 0.3 | Minimum relevance score (0–1) |
| `include_sub_modules` | Boolean | No | true | Include sub-module data objects |

**Returns:** `{ total, returned, items: [{ name, module, description, object_type, score, queries, fields }] }`

:::tip
Use the **query field names** from the `queries` array to build GraphQL, not the type name. Aggregation and bucket aggregation are data object queries, not functions.
:::

#### `discovery-search_module_functions`

Search custom functions in a module. Functions are separate from data objects — they are custom computed endpoints called via `query { function { module { func_name(args) { fields } } } }`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | String | Yes | — | Module name to search within |
| `query` | String | Yes | — | Natural language query |
| `top_k` | Number | No | 10 | Number of results (1–50) |
| `include_mutations` | Boolean | No | false | Include mutation functions |
| `include_sub_modules` | Boolean | No | true | Include sub-module functions |

**Returns:** `{ total, returned, items: [{ name, module, description, is_mutation, is_list, score, arguments, returns }] }`

#### `discovery-search_data_sources`

Search data sources by natural language. Returns sources with their type (`duckdb`, `postgres`, `http`) and read-only status.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | Natural language search query |
| `top_k` | Number | No | 5 | Number of results (1–50) |
| `min_score` | Number | No | 0.3 | Minimum relevance score (0–1) |

**Returns:** `{ total, returned, items: [{ name, description, type, read_only, as_module, score }] }`

#### `discovery-field_values`

Return top distinct values and optional statistics for a scalar field. Use to understand data distribution before building filters.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `object_name` | String | Yes | — | Data object type name (e.g. `prefix_tablename`) |
| `field_name` | String | Yes | — | Field name to analyze |
| `limit` | Number | No | 10 | Number of top values (1–100) |
| `calculate_stats` | Boolean | No | false | Include min/max/avg/distinct_count (numeric/timestamp only) |
| `filter` | Object | No | — | Optional filter to narrow data before aggregation |

**Returns:** `{ stats: { min, max, avg, distinct_count }, values: [{ value, count }] }`

### Schema Tools

Tools for inspecting types, fields, and enums in the GraphQL schema.

#### `schema-type_info`

Return high-level metadata for a type: kind, module, catalog, field count, geometry/argument presence.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name (e.g. `prefix_tablename`) |
| `with_description` | Boolean | No | true | Include short description |
| `with_long_description` | Boolean | No | false | Include long description |

**Returns:** `{ name, kind, module, hugr_type, catalog, fields_total, has_geometry_field, has_field_with_arguments, description, long_description }`

#### `schema-type_fields`

Return fields of a type. **Must call before building any query** — field names cannot be guessed.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name (e.g. `prefix_tablename`) |
| `relevance_query` | String | No | — | Rank fields by semantic relevance to this query |
| `limit` | Number | No | 50 | Max fields to return (1–200) |
| `offset` | Number | No | 0 | Pagination offset |
| `include_description` | Boolean | No | false | Include field descriptions |
| `include_arguments` | Boolean | No | false | Include argument details for fields with arguments |

**Returns:** `{ total, returned, items: [{ name, field_type, hugr_type, is_list, description, arguments_count, arguments, score }] }`

The `hugr_type` field indicates the kind of field:
- Empty string — scalar field
- `select` — relation to another type
- `aggregate` — aggregation of related records
- `bucket_agg` — bucket (GROUP BY) aggregation of related records
- `extra_field` — auto-generated field (e.g. timestamp part extraction)
- `function` — function field

#### `schema-enum_values`

Return enum values for a GraphQL enum type.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Enum type name |

**Returns:** `{ name, description, values: [{ name, description }] }`

Common built-in enums:
- `OrderDirection` — `ASC`, `DESC`
- `TimeExtract` — `year`, `month`, `day`, `hour`, `dow`, `week`, `quarter`, `epoch`
- `TimeBucket` — `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

### Data Tools

Tools for validating and executing GraphQL queries.

#### `data-validate_graphql_query`

Validate a GraphQL query without executing it. Use before execution to catch errors early.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | GraphQL query |
| `variables` | Object | No | — | Query variables |

**Returns:** Validation result with any errors found.

#### `data-inline_graphql_result`

Execute a GraphQL query and return the JSON result with an optional jq transform.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | GraphQL query |
| `variables` | Object | No | — | Query variables |
| `jq_transform` | String | No | — | JQ expression to apply to the result |
| `max_result_size` | Number | No | 1000 | Max result bytes (100–5000) |

If the result is truncated (`is_truncated: true`), increase `max_result_size` or use `jq_transform` to reduce output.

## Resources

The MCP server provides four embedded markdown resources that clients can read for reference:

| URI | Name | Description |
|-----|------|-------------|
| `hugr://overview` | Overview | Overview reference for the Hugr query engine |
| `hugr://query-patterns` | Query Patterns | Common query patterns and examples |
| `hugr://filter-guide` | Filter Guide | Filter operators and syntax reference |
| `hugr://aggregations` | Aggregations | Aggregation and bucket aggregation guide |

Clients can read these resources to understand query syntax without consuming tool calls.

## Prompts

The MCP server provides four prompt templates that guide the AI assistant through different workflows:

| Prompt | Description |
|--------|-------------|
| `start` | Sets up schema exploration context. Use at the beginning of a conversation to load tool workflow, query syntax rules, and key conventions. |
| `analyze` | Guides through data analysis: exploration, aggregation queries, and presenting findings with tables and insights. |
| `query` | Guides through building a specific GraphQL query: schema discovery, field inspection, and step-by-step construction with validation. |
| `dashboard` | Generates a React component with KPIs, breakdowns, time trends, and rankings for visual reporting. |

## Workflow

The MCP tools are designed around a **lazy stepwise introspection** pattern. Rather than loading the entire schema up front, the AI assistant progressively discovers only what it needs:

1. **Parse user intent** — identify entities, metrics, filters, and time ranges.
2. **Find modules** — call `discovery-search_modules` with a natural language query.
3. **Find data objects** — call `discovery-search_module_data_objects` within the relevant module.
4. **Inspect fields** — call `schema-type_fields` with the type name (e.g. `prefix_tablename`) before building any query.
5. **Explore values** — call `discovery-field_values` to understand data distribution and categories.
6. **Build query** — construct a single comprehensive GraphQL query combining objects, relations, aggregations, and filters with aliases.
7. **Validate** — call `data-validate_graphql_query` to catch errors before execution.
8. **Execute** — call `data-inline_graphql_result` with optional jq transforms.
9. **Present** — reshape results and present tables, charts, or insights.

```
User question
    |
    v
+------------------------+
| search_modules         |  -> Find relevant module(s)
+----------+-------------+
           |
           v
+------------------------+
| search_data_objects    |  -> Find tables/views in module
+----------+-------------+
           |
           v
+------------------------+
| type_fields            |  -> Get field names and types
+----------+-------------+
           |
           v
+------------------------+
| field_values           |  -> Understand data distribution
+----------+-------------+
           |
           v
+------------------------+
| validate_graphql       |  -> Check query before running
+----------+-------------+
           |
           v
+------------------------+
| inline_graphql         |  -> Execute and get results
+------------------------+
```

## Schema Descriptions and Embeddings

Hugr maintains descriptions for all schema entities (types, fields, modules, catalogs) in its core database. These descriptions power the semantic search used by discovery tools.

### How Descriptions Work

- Each type, field, module, and catalog can have a **short description** and a **long description**.
- Descriptions can come from the GraphQL schema definitions (doc strings) or be updated manually.
- When an embedder service is configured, descriptions are converted to vector embeddings and stored alongside the schema metadata.
- Discovery tools use these embeddings to rank results by semantic relevance to the user's natural language query.

### AI Summarization

Hugr can automatically generate descriptions using AI summarization:

- The `is_summarized` flag tracks whether an entity has been processed by the summarizer.
- Use `_schema_reset_summarized` to re-trigger summarization for specific entities or all entities.
- After updating descriptions, call `_schema_reindex` to recompute embeddings.

## Manual Schema Updates

You can update schema descriptions through GraphQL mutations. These mutations are available as `MutationFunction` fields:

### Update Descriptions

```graphql
# Update a type description
mutation {
  mutation_function {
    _schema_update_type_desc(
      name: "prefix_tablename"
      description: "Short description"
      long_description: "Detailed description of the type and its purpose"
    ) { success message }
  }
}

# Update a field description
mutation {
  mutation_function {
    _schema_update_field_desc(
      type_name: "prefix_tablename"
      name: "field_name"
      description: "Short description"
      long_description: "Detailed description of the field"
    ) { success message }
  }
}

# Update a module description
mutation {
  mutation_function {
    _schema_update_module_desc(
      name: "module_name"
      description: "Short description"
      long_description: "Detailed description of the module"
    ) { success message }
  }
}

# Update a catalog description
mutation {
  mutation_function {
    _schema_update_catalog_desc(
      name: "catalog_name"
      description: "Short description"
      long_description: "Detailed description of the catalog"
    ) { success message }
  }
}
```

### Re-process Descriptions and Embeddings

```graphql
# Reset summarized flag so AI re-processes entities
# scope: "all", "catalog", or "type"
mutation {
  mutation_function {
    _schema_reset_summarized(name: "", scope: "all") {
      success message
    }
  }
}

# Recompute embeddings (empty name = all entities)
mutation {
  mutation_function {
    _schema_reindex(name: "", batch_size: 50) {
      success message
    }
  }
}
```
