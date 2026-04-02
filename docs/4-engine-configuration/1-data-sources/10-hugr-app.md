---
title: Hugr App
sidebar_position: 10
---

# Hugr App Data Source

The `hugr-app` data source type connects hugr to external applications via the **DuckDB Airport extension** (Arrow Flight gRPC protocol).

Unlike other data sources, hugr-app sources are **self-registering** — the application connects to hugr and registers itself. You don't need to manually configure them.

## How It Works

1. The app starts a gRPC server (Airport protocol)
2. The app calls hugr's API to register as a data source
3. Hugr attaches via `ATTACH ... (TYPE AIRPORT)`
4. Hugr reads the app's catalog (functions, tables) and compiles into GraphQL
5. Heartbeat monitor detects crashes and auto-recovers

## Configuration

Hugr-app sources are registered automatically by the application. The stored configuration in CoreDB:

| Field | Value |
|-------|-------|
| `type` | `hugr-app` |
| `path` | `grpc://host:port?secret_key=TOKEN&version=X.Y.Z` |
| `as_module` | `true` |
| `self_defined` | `true` |

## Server-Side Settings

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `HUGR_APP_HEARTBEAT_INTERVAL` | Health check interval | `30s` |
| `HUGR_APP_HEARTBEAT_TIMEOUT` | Per-check timeout | `10s` |
| `HUGR_APP_HEARTBEAT_RETRIES` | Failures before suspend | `3` |

## Building Apps

See the [Hugr Apps](/docs/hugr-apps) section for the complete developer guide.
