---
title: "Go Client"
sidebar_position: 8
description: Go client for querying hugr — Arrow record readers, subscriptions, connection pooling, user impersonation.
keywords: [go, golang, client, arrow, subscription, streaming, ipc, websocket, impersonation, asuser]
---

# Go Client

Go client for the Hugr Data Mesh platform. Execute GraphQL queries and subscriptions with results delivered as Apache Arrow record readers over the IPC protocol.

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
        client.WithApiKey("your-api-key"),
    )

    resp, err := c.Query(context.Background(),
        `{ core { data_sources { name type } } }`, nil,
    )
    if err != nil {
        log.Fatal(err)
    }
    defer resp.Close()
    fmt.Println(resp.Data)
}
```

## Client Options

### Authentication

```go
c := client.NewClient(url,
    client.WithSecretKeyAuth("admin-secret-key"), // x-hugr-secret-key (enables impersonation)
    // OR
    client.WithApiKey("your-api-key"),             // x-hugr-api-key
    // OR
    client.WithToken("jwt-or-oidc-token"),         // Authorization: Bearer ...
)
```

| Option | Header | Description |
|--------|--------|-------------|
| `WithSecretKeyAuth(key)` | `x-hugr-secret-key` | Admin secret key. Enables [impersonation](#impersonation-asuser) |
| `WithApiKey(key)` | `x-hugr-api-key` | Standard API key |
| `WithApiKeyCustomHeader(key, h)` | custom | API key with custom header name |
| `WithToken(token)` | `Authorization: Bearer` | JWT or OIDC bearer token |
| `WithUserRole(role)` | `x-hugr-role` | Set user role |
| `WithUserInfo(id, name)` | `x-hugr-user-id`, `x-hugr-name` | Set user identity |

### Connection & Data

| Option | Description |
|--------|-------------|
| `WithTimeout(d)` | HTTP request timeout (default: 5 minutes) |
| `WithSubscriptionPool(max, idle)` | WebSocket pool for subscriptions (default: 1/1) |
| `WithTimezone(tz)` | Set timezone header (auto-detected by default) |
| `WithArrowStructFlatten()` | Flatten Arrow struct fields in responses |
| `WithTransport(rt)` | Custom `http.RoundTripper` |

## Queries

The `Query` method executes a GraphQL query and returns a `*types.Response`.

```go
resp, err := c.Query(ctx, `
    query($limit: Int!) {
        devices(limit: $limit) { id name status }
    }
`, map[string]any{"limit": 100})
if err != nil {
    log.Fatal(err)
}
defer resp.Close()

// Scan into struct
var devices []Device
err = resp.ScanData("devices", &devices)
```

### Validate Without Executing

```go
err := c.ValidateQuery(ctx, query, vars)
```

### JQ Transform

```go
result, err := c.QueryJSON(ctx, types.JQRequest{
    Query: types.Request{Query: graphqlQuery},
    JQ:    ".devices[] | {id, name}",
})
```

## Subscriptions

Subscriptions use WebSocket connections via the `hugr-ipc-ws` protocol with Apache Arrow IPC binary frames.

### Connection Pool

When `WithSubscriptionPool` is configured, subscriptions share a pool of WebSocket connections. Ideal for many concurrent subscriptions.

```go
c := client.NewClient(url,
    client.WithApiKey("key"),
    client.WithSubscriptionPool(10, 5), // max 10 connections, 5 idle
)

sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: "5s") {
            devices { id status }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}

for event := range sub.Events {
    fmt.Printf("Path: %s\n", event.Path)
    for event.Reader.Next() {
        batch := event.Reader.RecordBatch()
        fmt.Printf("  %d rows\n", batch.NumRows())
    }
    event.Reader.Release()
}
```

### Subscription Events

Each `SubscriptionEvent` contains:

| Field | Type | Description |
|-------|------|-------------|
| `Path` | `string` | Data path (e.g., `devices`) |
| `Reader` | `arrow.RecordReader` | Arrow record reader for this path's data |

For multi-path subscriptions, events arrive interleaved — one event per path per tick.

### Dedicated Connections

For long-running subscriptions or full WebSocket lifecycle control:

```go
conn, err := c.NewSubscriptionConn(ctx)
if err != nil {
    log.Fatal(err)
}
defer conn.Close()

sub, err := conn.Subscribe(ctx, query, nil)
```

A dedicated connection supports multiple concurrent subscriptions and is not returned to the pool.

### Multi-Path Subscription

```go
sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: "5s") {
            devices { id status }
            alerts { id severity message }
        }
    }
`, nil)
if err != nil {
    log.Fatal(err)
}

for event := range sub.Events {
    switch event.Path {
    case "devices":
        // handle device updates
    case "alerts":
        // handle alert updates
    }
    event.Reader.Release()
}
```

### Cancel & Cleanup

```go
sub.Cancel()              // cancel one subscription
c.CloseSubscriptions()    // close all pooled connections
```

## Impersonation (AsUser)

Admin clients authenticated via `WithSecretKeyAuth` can execute queries and subscriptions **on behalf of any user with any role**. The impersonated user's role permissions, field access rules, and row-level security filters are fully enforced.

This is essential for backend applications that serve multiple users through a single admin connection.

### Setup

```go
import (
    "github.com/hugr-lab/query-engine/client"
    "github.com/hugr-lab/query-engine/types"
)

c := client.NewClient("http://localhost:15000/ipc",
    client.WithSecretKeyAuth("admin-secret-key"),
)

// Optional: verify admin status at startup
if err := c.VerifyAdmin(ctx); err != nil {
    log.Fatal("not admin:", err)
}
```

### Query as User

```go
ctx := types.AsUser(ctx, "user-123", "John Doe", "viewer")
resp, err := c.Query(ctx, `{ devices { id name } }`, nil)
// Response contains only data the "viewer" role is allowed to see
```

### Subscribe as User

```go
ctx := types.AsUser(ctx, "user-456", "Jane Smith", "editor")
sub, err := c.Subscribe(ctx, `
    subscription {
        query(interval: "5s") {
            devices { id status }
        }
    }
`, nil)
// Events are filtered by "editor" role permissions
```

Multiple subscriptions for different users can coexist on the same pooled WebSocket connection — each subscription independently enforces its user's permissions.

### How It Works

| Protocol | Mechanism |
|----------|-----------|
| **HTTP queries** | `AsUser` sets `x-hugr-role`, `x-hugr-user-id`, `x-hugr-user-name` headers per request. The server's ApiKeyProvider reads them when authenticated via secret key |
| **IPC subscriptions** | `AsUser` adds `user_id`, `user_name`, `role` fields to the subscribe message. The server applies identity override per-subscription |
| **Engine (programmatic)** | `AsUser` in context triggers `ApplyImpersonationCtx` which verifies admin and overrides identity + reloads permissions |

### Introspect Identity

```go
ctx := types.AsUser(ctx, "user-123", "John", "viewer")
resp, _ := c.Query(ctx, `{
    function { core { auth { me {
        user_id
        role
        auth_type
        impersonated_by_user_id
        impersonated_by_user_name
    } } } }
}`, nil)
// Returns:
//   user_id: "user-123"
//   role: "viewer"
//   auth_type: "impersonation"
//   impersonated_by_user_id: "api"
//   impersonated_by_user_name: "api"
```

### Security

| Auth Method | Can Impersonate? | Behavior |
|-------------|-----------------|----------|
| `WithSecretKeyAuth` | **Yes** | Override headers applied, permissions reloaded for target role |
| `WithApiKey` | No | Override headers ignored by other API key providers |
| `WithToken` (JWT/OIDC) | No | Override headers ignored by JWT/OIDC providers |
| Anonymous | No | Override headers ignored; IPC identity fields rejected |

- **Row-level security**: `[$auth.user_id]` resolves to the impersonated user's ID, not the admin's.
- **Audit trail**: `auth_type` is set to `"impersonation"` and `impersonated_by_*` fields track the original admin identity.
- **Permission evaluation**: The target role's full permission set (field access, filters, disabled/hidden) is loaded and enforced.

## Data Source Management

```go
// Register
err := c.RegisterDataSource(ctx, types.DataSource{
    Name: "my_source", Type: "postgres", URI: "postgresql://...",
})

// Load / Unload
err = c.LoadDataSource(ctx, "my_source")
err = c.UnloadDataSource(ctx, "my_source")
err = c.UnloadDataSource(ctx, "my_source", types.WithHardUnload())

// Status & Schema
status, err := c.DataSourceStatus(ctx, "my_source")
sdl, err := c.DescribeDataSource(ctx, "my_source", true)
```

## See Also

- [WebSocket Subscription Protocols](/docs/querying/websocket-subscriptions) — wire protocols for graphql-ws and Arrow IPC
- [Subscriptions](/docs/graphql/subscriptions) — GraphQL subscription types and modes
- [Authentication](/docs/deployment/auth) — auth providers and secret key configuration
- [Access Control](/docs/engine-configuration/access-control) — roles, permissions, row-level security
- [Python Client](/docs/querying/python-client) — Python client with streaming support
