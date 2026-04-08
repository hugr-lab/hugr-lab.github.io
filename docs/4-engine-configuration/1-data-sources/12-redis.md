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

### Pub/Sub Operations

```graphql
# Publish a message to a channel
mutation { function { core { store {
  publish(store: "redis", channel: "notifications", message: "hello world") {
    success message
  }
} } } }

# Configure keyspace notification events (default: KEA = all events)
mutation { function { core { store {
  configure_keyspace_events(store: "redis", events: "KEA") {
    success message
  }
} } } }
```

### Subscriptions

```graphql
# Subscribe to messages on a Pub/Sub channel
subscription { core { store {
  subscribe(store: "redis", channel: "notifications") {
    channel
    message
  }
} } }

# Watch for keyspace events matching a pattern
subscription { core { store {
  watch(store: "redis", pattern: "__keyevent@0__:*") {
    key
    event
  }
} } }
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
| `publish` | mutation | `OperationResult` | Publish message to a Pub/Sub channel |
| `configure_keyspace_events` | mutation | `OperationResult` | Configure Redis keyspace notifications |
| `subscribe` | subscription | `store_message` | Subscribe to a Pub/Sub channel |
| `watch` | subscription | `store_key_event` | Watch keyspace events by pattern |

## Use with Rate Limiting

Redis is used as a shared counter backend for [LLM rate limiting](/docs/engine-configuration/data-sources/llm#rate-limiting):

```bash
# LLM source with Redis-backed rate limits
https://api.openai.com/v1/chat/completions?model=gpt-4o&api_key=...&rpm=100&tpm=100000&rate_store=redis
```

## Pub/Sub

Redis sources support Pub/Sub messaging and keyspace event notifications via GraphQL subscriptions and mutations.

### Operations

| Operation | Type | Description |
|-----------|------|-------------|
| `subscribe` | subscription | Subscribe to messages on a channel |
| `watch` | subscription | Watch keyspace events matching a pattern |
| `publish` | mutation | Publish a message to a channel |
| `configure_keyspace_events` | mutation | Enable Redis keyspace notifications (sets `notify-keyspace-events` config) |

### Keyspace Notifications

To use `watch`, Redis keyspace notifications must be enabled. Use the `configure_keyspace_events` mutation:

```graphql
mutation { function { core { store {
  configure_keyspace_events(store: "redis", events: "KEA") {
    success message
  }
} } } }
```

This sets the Redis `notify-keyspace-events` configuration. Common values: `KEA` (all events), `Kg` (generic key commands), `Ks` (string commands).

See [Pub/Sub Subscriptions](/docs/key-value-store#pubsub-subscriptions) in the Key-Value Store documentation for subscription query examples.

## See Also

- [Key-Value Store Module](/docs/key-value-store) — full `core.store` API reference
- [LLM Sources](/docs/engine-configuration/data-sources/llm) — AI model providers with rate limiting
- [AI Models Module](/docs/ai-models) — `core.models` API reference
