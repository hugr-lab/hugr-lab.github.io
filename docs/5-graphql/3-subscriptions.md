---
title: Subscriptions
sidebar_position: 3
description: Real-time data streaming via GraphQL subscriptions — query streaming, LLM completions, and Redis Pub/Sub.
keywords: [subscription, streaming, real-time, websocket, llm, redis, pubsub, graphql]
---

# Subscriptions

Subscription is a GraphQL root type for real-time data streaming. The engine supports two modes: **query streaming** (periodic re-execution of any query) and **native subscriptions** (source-specific push events such as LLM token streaming and Redis Pub/Sub).

## Query Streaming

Any data object available in `query` can be streamed via `subscription`. The engine re-executes the query and pushes results to the client over a WebSocket connection.

```graphql
subscription {
  query(interval: 5, count: 10) {
    devices {
      id
      name
      status
    }
  }
}
```

| Argument | Type | Description |
|----------|------|-------------|
| `interval` | `Int` | Seconds between re-executions. `0` or omitted = one-shot (execute once, then complete) |
| `count` | `Int` | Maximum number of executions. `0` or omitted = unlimited |

### One-Shot Query

Without `interval` and `count`, the subscription executes the query once and completes. This is useful for streaming large result sets without holding the full result in memory.

```graphql
subscription {
  query {
    large_dataset {
      id
      value
    }
  }
}
```

### Periodic Re-Execution

Stream updated results every 10 seconds, up to 60 times:

```graphql
subscription {
  query(interval: 10, count: 60) {
    sensor_readings {
      sensor_id
      temperature
      timestamp
    }
  }
}
```

### Multi-Path Subscriptions

A single subscription can include multiple data objects. The engine executes them in parallel and interleaves results — each data object is delivered as a separate path in the response.

```graphql
subscription {
  query(interval: 5) {
    devices { id name status }
    alerts { id device_id severity message }
  }
}
```

The client receives separate events for `data.devices` and `data.alerts` paths within each tick.

## Native Subscriptions

Some runtime modules provide native subscription types that push events as they occur, rather than polling.

### LLM Streaming (`core.models`)

Stream LLM completion tokens as they are generated:

```graphql
subscription {
  core {
    models {
      completion(model: "my_llm", prompt: "Explain GraphQL in detail") {
        content
        finish_reason
        latency_ms
      }
    }
  }
}
```

Each event delivers a chunk of the completion. The subscription completes when the model finishes generating.

### Redis Pub/Sub (`core.store`)

Subscribe to Redis Pub/Sub channels:

```graphql
subscription {
  core {
    store {
      subscribe(store: "redis", channel: "events") {
        channel
        message
      }
    }
  }
}
```

Messages are pushed as they arrive on the channel. The subscription stays open until the client disconnects.

## Module Hierarchy

Subscriptions follow the same module hierarchy as Query and Mutation. Runtime modules with `AsModule: true` are nested under their module path:

```graphql
subscription {
  # Query streaming at root level
  query(interval: 5) {
    my_source { id value }
  }

  # Native subscriptions under module path
  core {
    models {
      completion(model: "my_llm", prompt: "Hello") {
        content
      }
    }
  }
}
```

## Compiler Behavior

The compiler auto-generates the `Subscription` root type based on registered data sources and runtime modules:

- All data objects available in `Query` are also available under `subscription { query { ... } }`
- Runtime modules that implement subscription handlers register their types under the module path
- `@catalog` and `@subscription` directives are added automatically during compilation

## Acknowledgment

For native subscriptions that require ordered delivery, the engine supports source-specific acknowledgment mutations. The exact mechanism depends on the subscription source — consult the relevant data source documentation.

## See Also

- [WebSocket Subscription Protocols](/docs/querying/websocket-subscriptions) — wire protocols for graphql-ws and Arrow IPC
- [Go Client](/docs/querying/go-client) — Go client with subscription support
- [Python Client](/docs/querying/python-client) — Python streaming API
