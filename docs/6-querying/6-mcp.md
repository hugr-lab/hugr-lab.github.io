---
title: "MCP Integration"
sidebar_position: 6
description: Model Context Protocol (MCP) endpoint for AI assistant integration
keywords: [mcp, ai, llm, model-context-protocol, semantic-search, embeddings, mutations]
---

# MCP Integration

Hugr exposes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) endpoint that enables AI assistants to query and explore the data graph. The endpoint uses the Streamable HTTP transport and is available at `/mcp`.

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

## Authentication

When OIDC authentication is enabled, MCP clients need to authenticate to access the endpoint. Hugr provides a built-in stateless OAuth 2.1 proxy that handles this automatically.

### How It Works

1. The MCP client connects to `/mcp` and receives `401 Unauthorized`
2. The client discovers OAuth metadata at `/.well-known/oauth-authorization-server`
3. The client registers dynamically via `POST /oauth/register`
4. The client redirects the user to `/oauth/authorize` — Hugr proxies this to your OIDC provider
5. After login, the OIDC provider's tokens flow back through Hugr to the client
6. The client uses the token as `Authorization: Bearer <token>` on subsequent requests

Hugr acts as a stateless proxy — it does not issue its own tokens or store sessions. All transient state is encrypted into request parameters using `SECRET_KEY`. This works identically in standalone and cluster modes.

### Setup

1. Create a **confidential** OIDC client for MCP in your identity provider (e.g., Keycloak, EntraID, Auth0):
   - Enable **Authorization Code** flow
   - Set **redirect URI** to `https://your-hugr-instance.example.com/oauth/callback`
   - Note the **client ID** and **client secret**

2. Configure Hugr:
   ```bash
   MCP_ENABLED=true
   MCP_OAUTH_CLIENT_ID=hugr-mcp
   MCP_OAUTH_CLIENT_SECRET=your-mcp-client-secret
   OIDC_ISSUER=https://your-idp.example.com/realms/your-realm
   OIDC_CLIENT_ID=hugr
   SECRET_KEY=your-secret-key
   ALLOWED_ANONYMOUS=false
   ```

See [Configuration → MCP OAuth Proxy](/docs/deployment/config#mcp-oauth-proxy) for all available options.

### Local Development with Cloudflare Tunnel

For testing with Claude Desktop, which requires a publicly accessible HTTPS URL:

```bash
# Create a named tunnel (one-time)
cloudflared tunnel create hugr-dev
cloudflared tunnel route dns hugr-dev hugr-dev.yourdomain.com

# Run the tunnel
cloudflared tunnel run --url http://localhost:15004 hugr-dev
```

Register `https://hugr-dev.yourdomain.com/oauth/callback` as a redirect URI in your OIDC provider.

## Connecting Clients

### Claude Web (claude.ai)

Add the URL directly in Claude's MCP settings:

```
https://your-hugr-instance.example.com/mcp
```

### Claude Desktop

Claude Desktop uses stdio transport, so you need `mcp-remote` to bridge stdio to HTTP. Add this to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hugr": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-hugr-instance.example.com/mcp"
      ]
    }
  }
}
```

When OIDC authentication is enabled, `mcp-remote` automatically handles the OAuth flow — it discovers the authorization server, registers, and opens a browser for login.

### Cursor

In Cursor settings, add the URL under MCP servers:

```
https://your-hugr-instance.example.com/mcp
```

## Tools Reference

The MCP server exposes 14 tools organized into three categories.

Discovery and schema tools follow a **list / describe split**: a `search_*` / `type_fields` tool returns a lean candidate set (identity + classification + the handles to drill in), and the matching `describe_*` tool returns the full detail (arguments, descriptions, fields) for the specific items you name. This keeps result payloads small — call `describe_*` only for the few items you will actually use.

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

Search tables and views within a module — a lean candidate list. Each data object has four query fields: `<name>`, `<name>_by_pk`, `<name>_aggregation`, `<name>_bucket_aggregation`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | String | Yes | — | Module name to search within |
| `query` | String | Yes | — | Natural language query |
| `top_k` | Number | No | 5 | Number of results (1–50) |
| `min_score` | Number | No | 0.3 | Minimum relevance score (0–1) |
| `include_sub_modules` | Boolean | No | true | Include sub-module data objects |

**Returns:** `{ total, returned, items: [{ name, object_type, parameterized, has_geometry, module, catalog, description, fields_count, queries: [{ name, query_type, return_type }], score }] }`

- `object_type` — `table` or `view`.
- `parameterized` — `true` when the view takes query parameters (a parameterized view). Get the parameter names/types from `discovery-describe_data_objects`.
- `has_geometry` — the object has at least one geometry field.
- `catalog` — the data source the object belongs to.
- `queries[].return_type` — the GraphQL type the query returns; call `schema-type_fields` on it for the result fields.

:::tip
Use the **query field names** from the `queries` array to build GraphQL, not the type name; the `module` is required to nest the query. Aggregation and bucket aggregation are data object queries, not functions.
:::

#### `discovery-describe_data_objects`

Return the full record for **exact-name** data objects — the describe half of `discovery-search_module_data_objects`. Deterministic (no semantic scoring), **batched**: pass every type name you already know. Type names are globally unique, so no module hint is needed. Beyond the search shape, each query adds its `query_root` (the type hosting the query field) and, for a parameterized view, the `args` argument with its parameter fields.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `names` | [String] | Yes | — | Type names with the catalog prefix (e.g. `prefix_tablename`), as listed in the search result's `name`. |

**Returns:** `{ total, returned, items: [{ name, object_type, parameterized, has_geometry, module, catalog, description, fields_count, queries: [{ name, query_type, return_type, query_root, arguments: [{ name, type, required, fields }] }], score }] }`

The `arguments` carry only the parameterized-view `args` parameter (its `fields` are the view's parameters); the standard relation arguments (`filter`, `order_by`, `limit`, `offset`, `distinct_on`) are universal and omitted.

#### `discovery-search_module_functions`

Search custom functions in a module — a lean candidate list. Functions are separate from data objects — they are custom computed endpoints called via `query { function { module { func_name(args) { fields } } } }`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | String | Yes | — | Module name to search within |
| `query` | String | Yes | — | Natural language query |
| `top_k` | Number | No | 10 | Number of results (1–50) |
| `include_mutations` | Boolean | No | false | Include mutation functions |
| `include_sub_modules` | Boolean | No | true | Include sub-module functions |

**Returns:** `{ total, returned, items: [{ name, module, description, is_mutation, is_list, return_type, arguments_count, score }] }`

#### `discovery-describe_functions`

Return the full signature — arguments (name, type, required, description) plus the return type with its top fields — for **named functions** in a module. The describe half of `discovery-search_module_functions`. **Batched**; function names are not globally unique, so a `module` is required (sub-modules are searched too) and both query and mutation functions are matched.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `module` | String | Yes | — | Module the functions live in (sub-modules included) |
| `names` | [String] | Yes | — | Function field names, as listed in the search result's `name` |

**Returns:** `{ total, returned, items: [{ name, module, description, is_mutation, is_list, arguments: [{ name, type, required, description }], returns: { type_name, is_list, fields: [{ name, type }] } }] }`

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

List the fields of a type — a lean field list, no per-field argument trees. **Must call before building any query** — field names cannot be guessed.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name (e.g. `prefix_tablename`) |
| `relevance_query` | String | No | — | Rank fields by semantic relevance to this query |
| `limit` | Number | No | 50 | Max fields to return (1–200) |
| `offset` | Number | No | 0 | Pagination offset |
| `include_description` | Boolean | No | false | Include field descriptions |

**Returns:** `{ total, returned, items: [{ name, field_type, hugr_type, is_list, description, arguments_count, score }] }`

The `hugr_type` field indicates the kind of field:
- Empty string — scalar field
- `select` — relation to another type
- `aggregate` — aggregation of related records
- `bucket_agg` — bucket (GROUP BY) aggregation of related records
- `extra_field` — auto-generated field (e.g. timestamp part extraction)
- `function` — function field

`hugr_type` already classifies a field's argument profile, and `arguments_count` flags which fields take arguments — so the standard relation/aggregate arguments need no lookup. When you need the **exact** arguments of specific fields, call `schema-describe_fields`.

#### `schema-describe_fields`

Return the full detail — arguments (name, type, required, description) plus description — for **specific named fields** of a type. The describe half of `schema-type_fields`. Call this after `type_fields`, once you know which field(s) you will use and need their exact arguments: filter inputs, aggregation/bucket arguments, function parameters, or a parameterized view's query parameters. Scope to the few fields you actually need — this stays small even for the wide operator types (`_join`, `_spatial`).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name (e.g. `prefix_tablename`) |
| `fields` | [String] | Yes | — | Field names to describe (from `schema-type_fields` output) |

**Returns:** `{ total, returned, items: [{ name, field_type, hugr_type, is_list, description, arguments_count, arguments: [{ name, type, required, description }] }] }`

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

Tools for validating, executing, and mutating data via GraphQL.

#### `data-validate_graphql_query`

Validate a GraphQL query without executing it. Use before execution to catch errors early.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | GraphQL query |
| `variables` | Object | No | — | Query variables |

**Returns:** Validation result with any errors found.

#### `data-inline_graphql_result`

Execute a **read-only** GraphQL query and return the JSON result with an optional jq transform. This tool rejects mutation operations — use [`data-execute_mutation`](#data-execute_mutation) to modify data.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | GraphQL query |
| `variables` | Object | No | — | Query variables |
| `jq_transform` | String | No | — | JQ expression to apply to the result |
| `max_result_size` | Number | No | 1000 | Max result bytes (100–10000) |

If the result is truncated (`is_truncated: true`), increase `max_result_size` or use `jq_transform` to reduce output.

#### `data-execute_mutation`

Execute a GraphQL **mutation** — insert/update/delete a data object, or call a mutation function. Call this only when the user explicitly asks to create, update, or delete data. The operation runs with the **caller's permissions**; operations the user is not allowed to perform are rejected by the engine.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | GraphQL mutation (the operation must start with `mutation`) |
| `variables` | Object | No | — | Mutation variables (use for the data payload / filter) |
| `jq_transform` | String | No | — | JQ expression to apply to the result |
| `max_result_size` | Number | No | 1000 | Max result bytes (100–10000) |

Mutations mirror queries — modules are nested fields:

- **Insert** returns the new row (select its fields directly):
  ```graphql
  mutation { module { insert_<Object>(data: { field: value }) { id } } }
  ```
- **Update / delete** take a `filter` and return `OperationResult { affected_rows }`:
  ```graphql
  mutation { module { update_<Object>(filter: {...}, data: {...}) { affected_rows } } }
  mutation { module { delete_<Object>(filter: {...}) { affected_rows } } }
  ```
- **Mutation functions** are nested under `function`:
  ```graphql
  mutation { function { module { <mutation_func>(args) { ... } } } }
  ```

Resolve the exact `insert_`/`update_`/`delete_<Object>` field names, the data-input shape, and the `filter` shape from `discovery-describe_data_objects` / `schema-describe_fields` (or `discovery-describe_functions`) before calling.

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
4. **Inspect fields** — call `schema-type_fields` (a lean field list) with the type name (e.g. `prefix_tablename`) before building any query; then `schema-describe_fields` for the exact arguments of the specific fields you'll parameterise. (Likewise, reach for `discovery-describe_data_objects` / `discovery-describe_functions` when you need the full detail of a named object or function.)
5. **Explore values** — call `discovery-field_values` to understand data distribution and categories.
6. **Build query** — construct a single comprehensive GraphQL query combining objects, relations, aggregations, and filters with aliases.
7. **Validate** — call `data-validate_graphql_query` to catch errors before execution.
8. **Execute** — call `data-inline_graphql_result` with optional jq transforms.
9. **Present** — reshape results and present tables, charts, or insights.

:::note Mutations
The workflow above is read-only. To **modify** data, follow the same discovery and inspection steps, then call `data-execute_mutation` instead of `data-inline_graphql_result` (which rejects mutation operations). Mutations run with the caller's permissions.
:::

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
| type_fields            |  -> List fields; describe_fields for a field's args
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
