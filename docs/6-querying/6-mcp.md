---
title: "MCP Integration"
sidebar_position: 6
description: Model Context Protocol (MCP) endpoint for AI assistant integration
keywords: [mcp, ai, llm, model-context-protocol, semantic-search, embeddings, mutations]
---

# MCP Integration

Hugr exposes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) endpoint that enables AI assistants to query and explore the data graph. The endpoint uses the Streamable HTTP transport and is available at `/mcp`.

Through MCP, AI clients can explore the catalog, inspect schemas, validate queries, and execute GraphQL — all through structured tool calls rather than free-form prompting.

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

When an embedder is configured, schema descriptions are indexed as vectors and [`catalog-search`](#catalog-search) ranks results by semantic relevance. Without one the endpoint still works: search falls back to substring matching and says so, returning `lexical: true` in the result. The tool is a thin adapter over the engine's [`_search`](/docs/querying/graphql#searching-the-model-_search) meta query, which is also callable directly over GraphQL.

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

The MCP server exposes 12 tools in two families plus the data tools.

**`catalog-*` is the logical model** — the modules, data sources, tables, views and functions this deployment actually holds, under their curated names and descriptions. Use it when you are looking for data.

**`schema-*` is the generated GraphQL schema** — filter inputs, aggregation types, mutation inputs, module root types. Use it when you are writing the query, or when you are holding a bare type name from an error message and need to know what it is.

Both families follow a **list / describe split**: a list or search call returns a lean candidate set, and a describe call returns the full detail for the specific items you name. Every list is paginated with the same envelope — `{ items, total, limit, offset, has_more }`, default `limit` 50, maximum 200 — and `total` counts only what the caller is permitted to see.

### Catalog Tools

#### `catalog-search`

Find things by **meaning** when you know what you want but not what this deployment calls it. Searches modules, data sources, data objects, functions **and fields** at once.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | String | Yes | — | Natural-language description of the data you are looking for |
| `kinds` | [String] | No | all | Restrict to `module`, `data_source`, `data_object`, `function`, `field` |
| `field_kinds` | [String] | No | all | For field hits: `column`, `relation`, `extra` |
| `module` | String | No | — | Restrict to this module's subtree. A field hit is scoped by the module of the data object that owns it |
| `limit` | Number | No | 50 | Page size (1–200) |
| `offset` | Number | No | 0 | Hits to skip |
| `min_score` | Number | No | 0 | Drop hits below this score (0–1) |

**Returns:** `{ items: [{ kind, name, module, data_source, description, score, object, field_kind, hugr_type, ref_object, next_call }], limit, offset, has_more, filtered_out, lexical, lexical_reason }`

- `next_call` — the exact tool to run next for that hit.
- `filtered_out` — candidates dropped because the caller may not see them. Non-zero distinguishes "nothing matches" from "nothing you may see matches".
- `lexical` — `true` when there is no vector index and ranking fell back to substring matching; `lexical_reason` says why. Lexical scoring requires **every** word of the query to appear somewhere, so a multi-word query narrows rather than widens — prefer exact terms when this is set. Field hits are ranked on this path too.
- Field hits carry `object` (the data object the field belongs to) and `field_kind`. A `relation` field is a **path**: `ref_object` names the object it navigates to.

#### `catalog-list`

Enumerate what exists — the complete map rather than the relevant few.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `kind` | String | Yes | — | `module`, `data_source`, `data_object` or `function` |
| `module` | String | No | `""` (all) | Restrict to this module's subtree, sub-modules included. Rejected for `kind: data_source` — a source contributes to several modules rather than belonging to one |
| `prefix` | String | No | — | Case-insensitive name prefix filter |
| `limit` | Number | No | 50 | Page size (1–200) |
| `offset` | Number | No | 0 | Items to skip |

**Returns:** `{ items: [{ kind, name, type, module, data_source, description, ... }], total, limit, offset, has_more }`

Per kind, each item adds:

- `module` — a **flat** list of dotted paths (`sales`, `sales.reports`; `""` is the root), with `data_objects`, `functions` and `submodules` counts. The dots are GraphQL nesting: `query { sales { reports { … } } }`.
- `data_source` — `read_only`, `as_module`, `is_extension` and `modules` (the modules the source contributes to). `read_only: null` means the catalog storage does not record it — **not** that mutations are allowed.
- `data_object` — `name` is the GraphQL **type** name, `module` is where to nest the query.
- `function` — `type` is `FUNCTION` (query), `MUTATION` or `SUBSCRIPTION`.

#### `catalog-describe`

Describe exact names you already have — this is where you learn how to **call** them. Batched: pass every name you care about in one call.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `kind` | String | Yes | — | `module`, `data_source`, `data_object` or `function` |
| `names` | [String] | Yes | — | Exact names, copied verbatim from a previous result |
| `module` | String | No | — | Owning module — **required** for `kind: "function"`, whose identity is (module, name) |
| `relations_limit` | Number | No | 50 | Relations per described object (1–200) |
| `relations_offset` | Number | No | 0 | Relations to skip, per described object |

**Returns:** `{ items: [{ kind, name, description, long_description, module, data_source, … }], not_found }`

For a data object the record carries:

- `queries[]` — **the query field names to write in GraphQL**, each with `type` (`SELECT`, `SELECT_ONE`, `AGGREGATION`, `BUCKET_AGGREGATION`), `root_type_name` and `args`. An object may have several `SELECT_ONE` queries — one per primary or unique key; the arguments say which.
- `primary_key`, `properties` (`is_cube`, `is_m2m`, `is_hypertable`, `soft_delete`, `has_vectors`), and `args` for a parameterized view.
- `relations[]` — `direction` (`FORWARD` / `BACK`), `kind` (`FK` / `M2M` / `JOIN`) and `field_name`, the field on this object that traverses the edge. Paginated via `relations_total` / `relations_has_more`.
- `fields_count` — the fields themselves come from [`catalog-object_fields`](#catalog-object_fields).

For a function: `args`, `returns` and `is_table` (true when it returns a row set you select fields from).

:::tip
An object's **type** name and its **query** name differ: the type carries the data source prefix (`shop_orders`), the query does not (`orders`, inside module `shop`). Copy from `queries[]` verbatim. Aggregations are data object queries, not functions.
:::

Names that do not exist and names the caller may not see both come back in `not_found` — the tool cannot tell you which.

#### `catalog-object_fields`

List the fields of a **data object** — what you can actually select.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `object` | String | Yes | — | The data object's GraphQL type name |
| `relevance_query` | String | No | — | Rank fields by relevance to this description instead of schema order |
| `prefix` | String | No | — | Case-insensitive name prefix filter |
| `include_description` | Boolean | No | true | Include field descriptions |
| `limit` | Number | No | 50 | Page size (1–200) |
| `offset` | Number | No | 0 | Fields to skip |

**Returns:** `{ items: [{ name, type, field_kind, ref_object, is_pk, args_count, description }], total, limit, offset, has_more }`

`field_kind` says what each field **is**, and they are not all columns:

- `column` — a stored value.
- `extra` — computed (timestamp part extraction, geometry measurement, vector distance, JSON struct extraction). These usually take arguments.
- `relation` — a **path**; `ref_object` names the object it leads to, so selecting the field is how you traverse there.

`args_count` flags fields that take arguments — call [`schema-field_args`](#schema-field_args) for the few you will parameterise. Fields marked `@exclude_mcp` by the operator are never listed.

:::tip
On a wide table (100+ columns) the default page is a head, not an inventory. Either pass `relevance_query` to rank by meaning, or paginate until `has_more` is false — never conclude that a field is missing from one bare call.
:::

### Schema Tools

#### `schema-describe_types`

Identify bare **type** names — the ones that turn up in an error message, in a field's type, or in an argument like `shop_orders_filter`. Batched.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `names` | [String] | Yes | — | Type names, copied verbatim |

**Returns:** `{ items: [{ name, kind, description, fields_count, input_fields_count, enum_values_count, logical_kind, module, derived_from, role, next_call }], not_found }`

This is also the router between the two families:

- The name is a data object → `logical_kind: "data_object"` and `next_call` points at `catalog-describe`.
- The name was **generated** from one (a filter, an aggregation, an insert/update input) → `derived_from` names the base object and `role` says what the type is for, so you learn which object you are actually filtering.
- The name is a module root type (`_module_<mod>_query` and friends) → `logical_kind: "module_root"`.

#### `schema-type_fields`

List the members of **any** generated type — a filter input, an aggregation, a mutation input, a module root. For a data object use [`catalog-object_fields`](#catalog-object_fields) instead, which also ranks by meaning.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name (not a module name) |
| `prefix` | String | No | — | Case-insensitive name prefix filter |
| `include_description` | Boolean | No | true | Include descriptions |
| `limit` | Number | No | 50 | Page size (1–200) |
| `offset` | Number | No | 0 | Members to skip |

**Returns:** `{ items: [{ name, type, args_count, description }], total, limit, offset, has_more }`

Returns fields for an `OBJECT` and input fields for an `INPUT_OBJECT` — the same question either way.

#### `schema-field_args`

Return the **argument trees** of the few named fields of a type.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Full type name |
| `fields` | [String] | Yes | — | Field names, copied from a field listing |

**Returns:** `{ type_name, items: [{ field, args: [{ name, type, description }] }], not_found }`

Kept separate from the field lists on purpose: a field's own line is about ten tokens, its argument tree one to two orders of magnitude more — a relation field carries a whole filter input for the far object plus `order_by` / `limit` / `offset`, and `_join` carries the widest argument set in the schema. Name only the fields you will actually parameterise.

#### `schema-enum_values`

Return the values of a GraphQL enum. Call before writing one into a query — invalid values fail validation.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type_name` | String | Yes | — | Enum type name |
| `limit` | Number | No | 50 | Page size (1–200) |
| `offset` | Number | No | 0 | Values to skip |

**Returns:** `{ items: [{ name, description, deprecated }], total, limit, offset, has_more }`

Common built-in enums:
- `OrderDirection` — `ASC`, `DESC`
- `TimeExtract` — `year`, `month`, `day`, `hour`, `dow`, `week`, `quarter`, `epoch`
- `TimeBucket` — `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

### Data Tools

Tools for exploring values and for validating, executing, and mutating data via GraphQL.

#### `data-field_values`

Show what is actually **in** a field: its most common values with row counts, and optionally min/max/avg. Use before writing a filter, so you match values that exist instead of guessing their spelling or range.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `object_name` | String | Yes | — | Data object type name (e.g. `prefix_tablename`) |
| `field_name` | String | Yes | — | Field to summarise |
| `limit` | Number | No | 10 | Distinct values to return (1–100) |
| `calculate_stats` | Boolean | No | false | Also compute min/max/avg where the type allows |
| `filter` | Object | No | — | Scope the summary, same shape as the object's query filter |

**Returns:** `{ object, field, values: [{ value, rows }], stats }`

Unlike the catalog and schema tools, this one **runs a query** over the data under the caller's permissions — it is not schema introspection.

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

Before calling, resolve the pieces: [`catalog-describe`](#catalog-describe) names the object and its module, [`schema-type_fields`](#schema-type_fields) on the module's mutation root type gives the exact `insert_`/`update_`/`delete_<Object>` field, and `schema-type_fields` on the data input and filter types gives their shape ([`schema-describe_types`](#schema-describe_types) identifies a type name you do not recognise).

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

The MCP tools are designed around a **lazy stepwise introspection** pattern. Rather than loading the entire schema up front, the AI assistant progressively discovers only what it needs. One rule spans the two families: **`catalog-*` when you are looking for data, `schema-*` when you are writing the query.**

1. **Parse user intent** — identify entities, metrics, filters, and time ranges.
2. **Find what you need** — call `catalog-search` with a natural-language description; it ranks modules, data objects, functions and fields together, and each hit carries a `next_call`. Use `catalog-list` instead when you want the complete map rather than the relevant few.
3. **Learn how to call it** — call `catalog-describe` with the exact names. For a data object this is where `queries[]` comes from: the query field names to write, plus the primary key, parameterized-view arguments and relations.
4. **Get the columns** — call `catalog-object_fields` with the type name (e.g. `prefix_tablename`). Pass `relevance_query` on a wide table; call `schema-field_args` for the exact arguments of the few fields you will parameterise.
5. **Explore values** — call `data-field_values` to understand data distribution and categories.
6. **Build query** — construct a single comprehensive GraphQL query combining objects, relations, aggregations, and filters with aliases.
7. **Validate** — call `data-validate_graphql_query` to catch errors before execution.
8. **Execute** — call `data-inline_graphql_result` with optional jq transforms.
9. **Present** — reshape results and present tables, charts, or insights.

Holding a bare **type** name instead — from an error, from a field's type, from an argument like `shop_orders_filter`? Start at `schema-describe_types`: it says what the name is and routes you back to the right family.

:::note Mutations
The workflow above is read-only. To **modify** data, follow the same exploration and inspection steps, then call `data-execute_mutation` instead of `data-inline_graphql_result` (which rejects mutation operations). Mutations run with the caller's permissions.
:::

```
User question
    |
    v
+------------------------+
| catalog-search         |  -> What is relevant? (modules, objects,
+----------+-------------+     functions, FIELDS — ranked by meaning)
           |                   catalog-list for the complete map
           v
+------------------------+
| catalog-describe       |  -> How do I call it? (queries[], relations)
+----------+-------------+
           |
           v
+------------------------+
| catalog-object_fields  |  -> Which columns? (schema-field_args for
+----------+-------------+     a field's arguments)
           |
           v
+------------------------+
| data-field_values      |  -> Understand data distribution
+----------+-------------+
           |
           v
+------------------------+
| data-validate_graphql_query |  -> Check query before running
+----------+-------------+
           |
           v
+------------------------+
| data-inline_graphql_result  |  -> Execute and get results
+------------------------+
```

## Schema Descriptions and Embeddings

Hugr maintains descriptions for all schema entities (types, fields, modules, catalogs) in its core database. These descriptions power the semantic search behind `catalog-search`.

### How Descriptions Work

- Each type, field, module, and catalog can have a **short description** and a **long description**.
- Descriptions can come from the GraphQL schema definitions (doc strings) or be updated manually.
- When an embedder service is configured, descriptions are converted to vector embeddings and stored alongside the schema metadata.
- `catalog-search` uses these embeddings to rank results by semantic relevance to the user's natural language query, then filters the ranked candidates down to what the caller is permitted to see.

### What Gets Indexed

Embeddings are computed for the entities the search actually offers: **data sources, modules, data objects, functions**, and **every field of a data object** — including relation and generated fields, since a relation is often the best answer to "where do I get the customer's name".

Not indexed: types that are not data objects (function result types, input types) and their fields, and anything marked [`@exclude_mcp`](/docs/references/directives). A field excluded that way is never embedded, never returned by search, and never listed by `catalog-object_fields`.

### AI Summarization

Hugr can generate the missing descriptions with an AI summarizer. Generated text lands in the same **curation overlay** as a hand-written one and is never overwritten by a data-source reload, so summarizing is a one-off cost per entity. Which entities still need a pass is tracked by the summarizer itself — the engine stores only the text and its embedding.

## Manual Schema Updates

Descriptions are curated through the `core.catalog` mutation functions. An **empty** description clears the curation and lets the schema's own doc string show through again. When an embedder is configured, the vector is recomputed on every write — there is no separate reindex step to remember.

### Update Descriptions

```graphql
# A data object (table / view / cube)
mutation {
  function { core { catalog {
    annotate_data_object(
      name: "prefix_tablename"
      description: "Short description"
      long_description: "Detailed description of the object and its purpose"
    ) { success message }
  } } }
}

# A field — including a relation navigation field
mutation {
  function { core { catalog {
    annotate_field(
      type_name: "prefix_tablename"
      name: "field_name"
      description: "Short description"
      long_description: "Detailed description of the field"
    ) { success message }
  } } }
}

# A module
mutation {
  function { core { catalog {
    annotate_module(
      name: "module_name"
      description: "Short description"
      long_description: "Detailed description of the module"
    ) { success message }
  } } }
}

# A data source
mutation {
  function { core { catalog {
    annotate_data_source(
      name: "data_source_name"
      description: "Short description"
      long_description: "Detailed description of the data source"
    ) { success message }
  } } }
}
```

Curating a **logical** entity this way also improves everything the engine derives from it — its filter, aggregation and mutation-input fields. Types and fields that exist only in the generated GraphQL surface have their own `annotate_gql_type` / `annotate_gql_field` / `annotate_gql_argument` functions; the full list is in the [system reference](/docs/references/system-reference#curation-functions).

### Recompute Embeddings

Only needed after an embedder model change — ordinary writes embed as they go:

```graphql
mutation {
  function { core { catalog {
    reindex_embeddings(name: "", batch_size: 50) {
      success message
    }
  } } }
}
```
