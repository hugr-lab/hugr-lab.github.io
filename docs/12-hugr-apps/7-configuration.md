---
title: Configuration
sidebar_position: 8
description: Environment variables, AppInfo fields, client options, and server-side configuration.
---

# Configuration

## Client Options

Options passed to `RunApplication`:

```go
c.RunApplication(ctx, myApp,
    client.WithSecretKey("my-secret"),    // Auth token for hugr ↔ app communication
    client.WithStartupTimeout(500*time.Millisecond), // Delay before registering (default: 250ms)
)
```

### Client Constructor Options

```go
c := client.NewClient(url,
    client.WithTimeout(5*time.Minute),        // HTTP timeout (default: 5min)
    client.WithApiKey("key"),                  // API key for hugr auth
    client.WithUserRole("admin"),              // User role header
)
```

## AppInfo Fields

| Field | Required | Description |
|-------|----------|-------------|
| `Name` | Yes | Unique identifier. Becomes GraphQL module name |
| `Description` | No | Human-readable description |
| `Version` | Yes | Semantic version. Changes trigger migrations |
| `URI` | Yes | gRPC endpoint: `grpc://host:port` or `grpc+tls://host:port` |
| `DefaultSchema` | No | Schema name for top-level module (default: `"default"`) |

## Environment Variables (App)

| Variable | Description | Example |
|----------|-------------|---------|
| `HUGR_URL` | Hugr IPC endpoint | `http://localhost:15100/ipc` |
| `APP_SECRET` | Secret key for authentication | `my-secret-key` |
| `APP_PORT` | gRPC listen port | `50051` |
| `APP_HOST` | Hostname for URI registration | `my-app` |
| `APP_VERSION` | App version (if dynamic) | `2.0.0` |
| `PG_DSN` | PostgreSQL connection string | `postgres://user:pass@host/db` |

## Environment Variables (Hugr Server)

| Variable | Description | Default |
|----------|-------------|---------|
| `HUGR_APP_HEARTBEAT_INTERVAL` | Time between health checks | `30s` |
| `HUGR_APP_HEARTBEAT_TIMEOUT` | Timeout per health check | `10s` |
| `HUGR_APP_HEARTBEAT_RETRIES` | Failures before suspend | `3` |

## DSN Path Format

The app's connection path stored in hugr:

```
grpc://host:port?secret_key=TOKEN&version=1.0.0
```

| Parameter | Description |
|-----------|-------------|
| `secret_key` | Maps to Airport SECRET `auth_token` |
| `version` | App version for migration tracking |

## Reserved Names

Cannot be used as app names:

| Name | Reason |
|------|--------|
| `function` | GraphQL Function root type |
| `mutation_function` | GraphQL MutationFunction root type |
| `core` | System functions module |
| `_system` | Internal system use |
| Names starting with `_` | Reserved for internal types |

## DataSourceInfo.Path

Connection strings support environment variable substitution:

```
postgres://[$DB_USER]:[$DB_PASS]@[$DB_HOST]:5432/mydb
```

Variables in `[$VAR]` format are resolved from the hugr server's environment at provisioning time.
