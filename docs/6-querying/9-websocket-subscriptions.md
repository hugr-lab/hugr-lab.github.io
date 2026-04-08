---
title: "WebSocket Subscription Protocols"
sidebar_position: 9
description: WebSocket protocols for GraphQL subscriptions — graphql-ws (JSON) and IPC (Arrow binary).
keywords: [websocket, protocol, graphql-ws, ipc, arrow, binary, subscription, streaming]
---

# WebSocket Subscription Protocols

Hugr supports two WebSocket protocols for subscriptions: **graphql-ws** (JSON-based) and **IPC** (Arrow binary). Both support multiple concurrent subscriptions per connection.

| Protocol | Endpoint | Format | Use Case |
|----------|----------|--------|----------|
| graphql-ws | `/subscribe` | JSON | Browser clients, standard GraphQL tooling |
| IPC | `/ipc` | Arrow binary | High-performance clients (Go, Python), large datasets |

## graphql-ws Protocol

The `/subscribe` endpoint implements the [graphql-ws](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md) protocol — the standard WebSocket sub-protocol for GraphQL.

### Connection Lifecycle

```
Client                          Server
  |--- connection_init ----------->|
  |<-- connection_ack -------------|
  |--- subscribe {id, query} ----->|
  |<-- next {id, payload} --------|  (repeated)
  |<-- complete {id} -------------|
```

### 1. Initialize Connection

```json
{"type": "connection_init", "payload": {"X-Hugr-Api-Key": "sk-..."}}
```

The server responds with:

```json
{"type": "connection_ack"}
```

Authentication headers can be passed in the `payload` of `connection_init`.

### 2. Subscribe

```json
{
  "id": "1",
  "type": "subscribe",
  "payload": {
    "query": "subscription { query(interval: 5) { devices { id status } } }"
  }
}
```

### 3. Receive Data

The server sends `next` messages with row data:

```json
{
  "id": "1",
  "type": "next",
  "payload": {
    "data": {
      "devices": [
        {"id": 1, "status": "active"},
        {"id": 2, "status": "idle"}
      ]
    }
  }
}
```

### 4. Completion

When the subscription ends (count exhausted or one-shot):

```json
{"id": "1", "type": "complete"}
```

The client can also send `complete` to cancel a subscription.

### Multiple Subscriptions

Each subscription has a unique `id`. Multiple subscriptions can run concurrently on the same connection:

```json
{"id": "sub-devices", "type": "subscribe", "payload": {"query": "subscription { query(interval: 5) { devices { id } } }"}}
{"id": "sub-alerts", "type": "subscribe", "payload": {"query": "subscription { query(interval: 10) { alerts { id } } }"}}
```

### JavaScript Example

Using the [graphql-ws](https://www.npmjs.com/package/graphql-ws) npm package:

```javascript
import { createClient } from "graphql-ws";

const client = createClient({
  url: "ws://localhost:15000/subscribe",
  connectionParams: {
    "X-Hugr-Api-Key": "sk-...",
  },
});

// One-shot subscription
const unsubscribe = client.subscribe(
  {
    query: `subscription {
      query {
        devices { id name status }
      }
    }`,
  },
  {
    next(value) {
      console.log("Data:", value.data);
    },
    error(err) {
      console.error("Error:", err);
    },
    complete() {
      console.log("Done");
    },
  }
);

// Cancel
// unsubscribe();
```

## IPC Protocol (Arrow Binary)

The `/ipc` endpoint uses a custom binary protocol optimized for high-throughput data delivery. Results are encoded as Apache Arrow IPC streams, avoiding JSON serialization overhead.

### Connection Lifecycle

```
Client                                Server
  |--- subscribe {id, query} -------->|
  |<-- [binary: Arrow schema] --------|
  |<-- [binary: Arrow record batch] --|  (repeated)
  |<-- [text: part_complete] ---------|
  |<-- [text: subscription_complete] -|
```

### Subscribe

Send a JSON text frame:

```json
{
  "type": "subscribe",
  "subscription_id": "sub-1",
  "payload": {
    "query": "subscription { query(interval: 5) { devices { id status } } }"
  }
}
```

### Binary Frames

The server sends Arrow IPC data as binary WebSocket frames. Each binary frame contains either an Arrow schema or a record batch.

Arrow schema metadata carries routing information:

| Metadata Key | Description |
|--------------|-------------|
| `subscription_id` | Matches the subscription that produced this data |
| `path` | Data path (e.g., `data.devices`) |

The client uses these metadata fields to route binary frames to the correct reader.

### Reader per Path

For each unique `(subscription_id, path)` pair, the client constructs a single Arrow record reader. This reader spans all ticks of the subscription — new record batches are appended as they arrive. The reader closes when a `subscription_complete` text frame is received for that subscription.

### Text Frames

Control messages are sent as JSON text frames:

**Part complete** — signals the end of one tick for a specific path:

```json
{
  "type": "part_complete",
  "subscription_id": "sub-1",
  "path": "data.devices"
}
```

**Subscription complete** — signals the subscription has ended:

```json
{
  "type": "subscription_complete",
  "subscription_id": "sub-1"
}
```

### Unsubscribe

Send a text frame to cancel a subscription:

```json
{
  "type": "unsubscribe",
  "subscription_id": "sub-1"
}
```

### Multiple Subscriptions

Multiple subscriptions can run concurrently on a single IPC connection. Each subscription is identified by its `subscription_id`, and binary frames are routed using the schema metadata.

```json
{"type": "subscribe", "subscription_id": "sub-devices", "payload": {"query": "subscription { query(interval: 5) { devices { id } } }"}}
{"type": "subscribe", "subscription_id": "sub-alerts", "payload": {"query": "subscription { query(interval: 10) { alerts { id } } }"}}
```

## Protocol Comparison

| Feature | graphql-ws | IPC |
|---------|-----------|-----|
| Data format | JSON | Arrow binary |
| Serialization overhead | Higher (JSON encode/decode) | Minimal (zero-copy capable) |
| Browser support | Native | Requires Arrow JS |
| Multiple subscriptions | By `id` | By `subscription_id` |
| Completion signal | `complete` message | `subscription_complete` text frame |
| Best for | Web apps, debugging, small payloads | Analytics, large datasets, Go/Python clients |

## See Also

- [Subscriptions](/docs/graphql/subscriptions) — GraphQL subscription types and modes
- [Go Client](/docs/querying/go-client) — Go client with built-in IPC protocol support
- [Python Client](/docs/querying/python-client) — Python streaming via IPC
- [Hugr IPC Protocol](/docs/querying/hugr-ipc) — Arrow IPC multipart/mixed protocol for queries
