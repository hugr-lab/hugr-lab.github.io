---
title: "Go Client"
sidebar_position: 8
description: Go client for querying hugr — Arrow record readers, subscriptions, connection pooling.
keywords: [go, golang, client, arrow, subscription, streaming, ipc, websocket]
---

# Go Client

Go client for the Hugr Data Mesh platform. Execute GraphQL queries and subscriptions with results delivered as Apache Arrow record readers.

## Installation

```bash
go get github.com/hugr-lab/query-engine/client
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/hugr-lab/query-engine/client"
)

func main() {
    c := client.NewClient("http://localhost:15000/ipc",
        client.WithApiKey("sk-..."),
    )

    resp, err := c.Query(context.Background(),
        `{ core { data_sources { name type } } }`,
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    for _, part := range resp.Parts {
        fmt.Printf("Path: %s, Rows: %d\n", part.Path, part.Reader.NumRows())
    }
}
```

## Client Options

```go
c := client.NewClient(url,
    client.WithApiKey("sk-..."),
    client.WithTimeout(30 * time.Second),
    client.WithSubscriptionPool(10, 5),
)
```

| Option | Description |
|--------|-------------|
| `WithApiKey(key)` | API key sent via `X-Hugr-Api-Key` header |
| `WithTimeout(d)` | HTTP request timeout |
| `WithSubscriptionPool(max, idle)` | WebSocket connection pool for subscriptions |

## Queries

The `Query` method executes a GraphQL query and returns a `*types.Response` containing one or more Arrow parts.

```go
resp, err := c.Query(ctx, query, variables)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | GraphQL query string |
| `variables` | `map[string]any` | Query variables (`nil` if none) |

The response contains `Parts` — each part has a `Path` (e.g., `data.devices`) and a `Reader` (`arrow.RecordReader`).

```go
resp, err := c.Query(ctx, `
    query($limit: Int!) {
        devices(limit: $limit) { id name status }
    }
`, map[string]any{"limit": 100})
if err != nil {
    log.Fatal(err)
}

for _, part := range resp.Parts {
    reader := part.Reader
    defer reader.Release()
    for reader.Next() {
        rec := reader.Record()
        fmt.Printf("%s: %d rows\n", part.Path, rec.NumRows())
    }
}
```

## Subscriptions

### Connection Pool

When `WithSubscriptionPool` is configured, subscriptions share a pool of WebSocket connections. This is suitable for many short-lived or concurrent subscriptions.

```go
c := client.NewClient(url,
    client.WithSubscriptionPool(10, 5), // max 10 connections, 5 idle
)

sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: 5) {
            devices { id status }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}
defer sub.Close()

for event := range sub.Events() {
    fmt.Printf("Path: %s\n", event.Path)
    reader := event.Reader
    for reader.Next() {
        rec := reader.Record()
        fmt.Printf("  %d rows\n", rec.NumRows())
    }
    reader.Release()
}
```

### Subscription Events

Each `SubscriptionEvent` contains:

| Field | Type | Description |
|-------|------|-------------|
| `Path` | `string` | Data path (e.g., `data.devices`) |
| `Reader` | `arrow.RecordReader` | Arrow record reader for this path's data |

For multi-path subscriptions, events arrive interleaved — one event per path per tick.

### Dedicated Connections

For long-running subscriptions or when you need full control over the WebSocket lifecycle, use a dedicated connection:

```go
conn, err := c.NewSubscriptionConn(ctx)
if err != nil {
    log.Fatal(err)
}
defer conn.Close()

sub, err := conn.Subscribe(ctx, `
    subscription {
        core {
            models {
                completion(model: "my_llm", prompt: "Explain GraphQL") {
                    content
                    finish_reason
                }
            }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}

for event := range sub.Events() {
    fmt.Printf("[%s] data received\n", event.Path)
}
```

A dedicated connection supports multiple concurrent subscriptions and is not returned to the pool.

### Periodic Subscription

```go
sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: 10, count: 60) {
            sensor_readings { sensor_id temperature }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}
defer sub.Close()

for event := range sub.Events() {
    reader := event.Reader
    for reader.Next() {
        rec := reader.Record()
        // process each tick's data
    }
    reader.Release()
}
```

### Multi-Path Subscription

```go
sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: 5) {
            devices { id status }
            alerts { id severity message }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}
defer sub.Close()

for event := range sub.Events() {
    switch event.Path {
    case "data.devices":
        // handle device updates
    case "data.alerts":
        // handle alert updates
    }
    event.Reader.Release()
}
```

## Cleanup

Close all pooled subscription connections when the client is no longer needed:

```go
c.CloseSubscriptions()
```

This drains the connection pool and closes all idle WebSocket connections. Active subscriptions are cancelled.

## See Also

- [WebSocket Subscription Protocols](/docs/querying/websocket-subscriptions) — wire protocols for graphql-ws and Arrow IPC
- [Subscriptions](/docs/graphql/subscriptions) — GraphQL subscription types and modes
- [Python Client](/docs/querying/python-client) — Python client with streaming support
