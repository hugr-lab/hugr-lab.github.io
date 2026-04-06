---
sidebar_position: 12
title: "Redis"
description: "Redis key-value store data source for caching, counters, and shared state."
---

# Redis Data Source

Redis data sources provide key-value store operations accessible via the [`core.store`](#usage) runtime module. Use cases include caching, counters, rate limiting, session storage, and shared state across cluster nodes.

## Registration

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "redis"
      type: "redis"
      prefix: "redis"
      path: "redis://:${secret:REDIS_PASSWORD}@redis-host:6379/0"
    }) { name }
  }
}
```

## Path Format

Standard Redis URL: `redis://[user:password@]host:port/db`

Supports `${secret:ENV_VAR}` syntax for credentials via `ApplyEnvVars`.

### Examples

```bash
# Local Redis, no auth
redis://localhost:6379/0

# With password
redis://:mypassword@redis-host:6379/0

# With env var
redis://:${secret:REDIS_PASSWORD}@redis-host:6379/0

# Non-default database
redis://redis-host:6379/3
```

## Usage

Redis sources are accessed through the `core.store` module:

### Read Operations

```graphql
# Get a value (returns null if key doesn't exist)
{ function { core { store {
  get(store: "redis", key: "session:abc123")
} } } }

# List keys matching a pattern
{ function { core { store {
  keys(store: "redis", pattern: "user:*")
} } } }
```

### Write Operations

```graphql
# Set a value with optional TTL (seconds)
mutation { function { core { store {
  set(store: "redis", key: "session:abc", value: "{\"user\":\"alice\"}", ttl: 3600) {
    success message
  }
} } } }

# Delete a key
mutation { function { core { store {
  del(store: "redis", key: "session:abc") { success }
} } } }

# Atomic increment (creates key with value 1 if not exists)
mutation { function { core { store {
  incr(store: "redis", key: "page:views")
} } } }

# Set TTL on an existing key
mutation { function { core { store {
  expire(store: "redis", key: "session:abc", ttl: 300) { success }
} } } }
```

## Operations Reference

| Operation | Type | Returns | Description |
|-----------|------|---------|-------------|
| `get` | query | `String` (nullable) | Get value by key |
| `keys` | query | `[String]` | List keys matching glob pattern |
| `set` | mutation | `OperationResult` | Set key-value with optional TTL |
| `del` | mutation | `OperationResult` | Delete a key |
| `incr` | mutation | `BigInt` | Atomic increment, returns new value |
| `expire` | mutation | `OperationResult` | Set TTL on existing key |

## Use with Rate Limiting

Redis is used as a shared counter backend for [LLM rate limiting](/docs/engine-configuration/data-sources/llm#rate-limiting):

```bash
# LLM source with Redis-backed rate limits
https://api.openai.com/v1/chat/completions?model=gpt-4o&api_key=...&rpm=100&tpm=100000&rate_store=redis
```

## See Also

- [LLM Sources](/docs/engine-configuration/data-sources/llm) — AI model providers with rate limiting
- [AI Models Module](/docs/ai-models) — `core.models` API reference
