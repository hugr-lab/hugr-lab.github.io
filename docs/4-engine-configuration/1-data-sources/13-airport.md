---
sidebar_position: 13
title: "Airport"
description: "Attach remote DuckDB catalogs via the Airport extension (Arrow Flight gRPC)."
---

# Airport Data Source

Airport data sources allow you to attach remote DuckDB catalogs via the [DuckDB Airport extension](https://github.com/duckdb/duckdb-airport-extension) using Arrow Flight gRPC. This enables querying tables and calling functions served by any Airport-compatible endpoint.

## Registration

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "remote_db"
      type: "airport"
      prefix: "remote"
      as_module: true
      path: "grpc+tls://airport.example.com:9000/my_database?auth_token=${secret:AIRPORT_TOKEN}"
    }) { name }
  }
}
```

## Path Format

```
<protocol>://<host>[:<port>]/<database>[?auth_token=<token>]
```

| Component | Required | Description |
|-----------|----------|-------------|
| `protocol` | yes | `grpc` (plaintext) or `grpc+tls` (TLS encrypted) |
| `host` | yes | Airport server address |
| `port` | no | Server port |
| `database` | yes | Name of the remote database to attach |
| `auth_token` | no | Authentication token. Supports `${secret:ENV_VAR}` syntax |

### Examples

```bash
# Plaintext gRPC, no auth
grpc://localhost:9000/my_database

# TLS with auth token
grpc+tls://airport.example.com:9000/analytics?auth_token=${secret:AIRPORT_TOKEN}

# TLS, default port
grpc+tls://airport.example.com/warehouse
```

## How It Works

When an Airport data source is attached, hugr:

1. Parses the DSN to extract protocol, host, port, database name, and optional auth token
2. Creates a DuckDB secret with the auth token (if provided)
3. Executes `ATTACH '<database>' AS <name> (TYPE AIRPORT, LOCATION '<location>')` on the embedded DuckDB engine

The remote catalog's tables and functions become available through the hugr GraphQL schema, just like any other relational data source.

## Schema Definition

Airport data sources support both:

- **Self-defined schema** (`self_defined: true`) — automatically discovers tables and views from the remote catalog
- **Catalog-based schema** — use GraphQL SDL files to define the schema manually, like any other data source

## See Also

- [DuckDB Airport Extension](https://github.com/duckdb/duckdb-airport-extension) — upstream extension documentation
- [Hugr App](/docs/engine-configuration/data-sources/hugr-app) — pluggable applications that use Airport internally for communication
