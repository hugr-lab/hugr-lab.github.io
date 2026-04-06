---
title: Key-Value Store
sidebar_position: 1
description: Key-value store operations via the core.store runtime module.
keywords: [redis, store, cache, key-value, counter, rate-limiting, ttl]
---

# Key-Value Store (`core.store`)

The `core.store` runtime module provides a unified GraphQL interface for key-value store operations on registered store data sources (e.g., Redis).

Use cases: caching, counters, rate limiting, session storage, feature flags, and shared state across cluster nodes.

## Quick Start

### 1. Register a Store

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

### 2. Load the Data Source

```graphql
mutation {
  function {
    core {
      load_data_source(name: "redis") { success message }
    }
  }
}
```

### 3. Use It

```graphql
# Write
mutation {
  function {
    core {
      store {
        set(store: "redis", key: "greeting", value: "hello world", ttl: 3600) {
          success
        }
      }
    }
  }
}

# Read
{
  function {
    core {
      store {
        get(store: "redis", key: "greeting")
      }
    }
  }
}
```

## Query Functions

### `get`

Get a value by key. Returns `null` if the key does not exist.

```graphql
get(store: String!, key: String!): String
```

### `keys`

List keys matching a glob pattern.

```graphql
keys(store: String!, pattern: String!): [String]
```

Pattern examples: `user:*`, `session:abc*`, `ratelimit:*`.

## Mutation Functions

### `set`

Set a key-value pair with optional TTL (time-to-live) in seconds.

```graphql
set(store: String!, key: String!, value: String!, ttl: Int): OperationResult
```

| Argument | Required | Description |
|----------|----------|-------------|
| `store` | yes | Name of the registered store data source |
| `key` | yes | Key to set |
| `value` | yes | Value to store |
| `ttl` | no | Time-to-live in seconds. `0` or `null` = no expiry |

### `del`

Delete a key.

```graphql
del(store: String!, key: String!): OperationResult
```

### `incr`

Atomically increment an integer value. Creates the key with value `1` if it does not exist.

```graphql
incr(store: String!, key: String!): BigInt
```

Returns the new value after incrementing.

### `expire`

Set a TTL on an existing key.

```graphql
expire(store: String!, key: String!, ttl: Int!): OperationResult
```

## Examples

### Counter

```graphql
# Increment a page view counter
mutation {
  function { core { store {
    incr(store: "redis", key: "page:views:/home")
  } } }
}
```

### Session Storage

```graphql
# Store a session with 1-hour TTL
mutation {
  function { core { store {
    set(
      store: "redis"
      key: "session:abc123"
      value: "{\"user\":\"alice\",\"role\":\"admin\"}"
      ttl: 3600
    ) { success }
  } } }
}

# Retrieve the session
{
  function { core { store {
    get(store: "redis", key: "session:abc123")
  } } }
}
```

### Key Discovery

```graphql
# List all session keys
{
  function { core { store {
    keys(store: "redis", pattern: "session:*")
  } } }
}
```

## Supported Backends

| Type | Backend | Description |
|------|---------|-------------|
| `redis` | [Redis](/docs/engine-configuration/data-sources/redis) | Redis 6.0+ via go-redis |

The `StoreSource` interface is backend-agnostic. Additional backends may be added in the future.

## See Also

- [Redis Data Source](/docs/engine-configuration/data-sources/redis) — connection setup and URL format
- [LLM Rate Limiting](/docs/engine-configuration/data-sources/llm#rate-limiting) — using Redis for shared rate limit counters
