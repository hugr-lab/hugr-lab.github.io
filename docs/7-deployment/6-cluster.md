---
title: "Clustered Deployment"
sidebar_position: 6
---

# Clustered Deployment

Hugr supports clustered deployment for horizontal scaling and high availability. In cluster mode, multiple hugr nodes share a PostgreSQL Core Database and coordinate schema changes via a management node.

## Overview

Hugr uses a **single binary** architecture. Every node in the cluster runs the same `ghcr.io/hugr-lab/server` (or `ghcr.io/hugr-lab/automigrate`) image. The role of each node is determined by the `CLUSTER_ROLE` environment variable:

| `CLUSTER_ROLE` | Behavior |
|---|---|
| `management` | Full query node **plus** cluster coordinator. Compiles schemas, broadcasts changes to workers, cleans up ghost nodes. |
| `worker` | Full query node. Forwards cluster mutations to management, polls `schema_version` for missed broadcasts, syncs DuckDB secrets from management on startup. |
| _(empty / unset)_ | Standalone mode (no cluster). This is the default. |

**Key points:**

- The management node is a full query engine node — it serves GraphQL queries and the Admin UI just like workers do.
- There is no distributed query execution. Each node processes queries independently against its own DuckDB instance. Horizontal scaling is achieved by adding more nodes behind a load balancer.
- All cluster mutations (load/unload/reload sources, register/unregister storage, invalidate cache) can be sent to **any** node. Workers automatically forward them to the management node.
- `CLUSTER_ENABLED=true` must be set on all cluster nodes.

## Architecture

```mermaid
graph TB
    Client([Clients])
    LB[nginx / HAProxy / Traefik<br/>Load Balancer]

    subgraph Cluster
        MN["Management Node<br/>(CLUSTER_ROLE=management)<br/>ghcr.io/hugr-lab/automigrate"]
        W1["Worker 1<br/>(CLUSTER_ROLE=worker)<br/>ghcr.io/hugr-lab/server"]
        W2["Worker 2<br/>(CLUSTER_ROLE=worker)<br/>ghcr.io/hugr-lab/server"]
    end

    PG[(PostgreSQL<br/>Core DB)]
    DS[(Data Sources<br/>Parquet / PG / ...)]
    RD[(Redis<br/>L2 Cache)]

    Client --> LB
    LB --> MN
    LB --> W1
    LB --> W2

    MN -- "broadcast<br/>(GraphQL/IPC)" --> W1
    MN -- "broadcast<br/>(GraphQL/IPC)" --> W2
    W1 -. "forward mutations" .-> MN
    W2 -. "forward mutations" .-> MN

    MN --> PG
    W1 --> PG
    W2 --> PG

    MN --> DS
    W1 --> DS
    W2 --> DS

    W1 --> RD
    W2 --> RD

    style LB fill:#e1f5ff
    style MN fill:#fff9c4
    style W1 fill:#c8e6c9
    style W2 fill:#c8e6c9
    style PG fill:#f8bbd0
    style DS fill:#f8bbd0
    style RD fill:#f8bbd0
```

**Communication flows:**

- **Client to nodes** — standard HTTP/GraphQL through the load balancer. All nodes (including management) serve the GraphQL API and Admin UI.
- **Worker to management** — when a worker receives a cluster mutation, it looks up the management node's URL from the `_cluster_nodes` table and forwards the mutation via GraphQL over HTTP.
- **Management to workers** — after executing a cluster mutation locally, the management node broadcasts the corresponding internal handler to all active workers in parallel via GraphQL over HTTP. Workers authenticate broadcasts using the shared `CLUSTER_SECRET`.

## Node Registration

Every node registers itself in the `_cluster_nodes` table in PostgreSQL on startup. The table schema:

| Column | Type | Description |
|---|---|---|
| `name` | `String!` (PK) | Unique node identifier (`CLUSTER_NODE_NAME`) |
| `url` | `String!` | IPC endpoint URL (`CLUSTER_NODE_URL`) |
| `role` | `String!` | `management` or `worker` |
| `version` | `String` | Binary version from Go build info |
| `started_at` | `Timestamp` | When the node started |
| `last_heartbeat` | `Timestamp` | Last heartbeat timestamp |
| `error` | `String` | Last error message (null = healthy) |

### Heartbeat Mechanism

Each node sends a heartbeat (updates `last_heartbeat`) at the interval defined by `CLUSTER_HEARTBEAT` (default: 30s).

The **management node** also runs a ghost cleanup pass on each heartbeat tick: any node whose `last_heartbeat` is older than `CLUSTER_GHOST_TTL` (default: 2m) is deleted from `_cluster_nodes`. This prevents stale entries from accumulating when workers crash or are scaled down.

:::note
Node registration is deferred until the first heartbeat tick (not during `Attach`) because the query engine's planner is not yet initialized at attach time.
:::

## Schema Synchronization

Schema consistency across nodes is maintained through two complementary mechanisms:

### Push — Management Broadcasts

When a schema change occurs on the management node (via `load_source`, `unload_source`, `reload_source`), the management node:

1. Executes the operation locally (compile + attach/detach).
2. The catalog manager automatically increments `schema_version` in `_schema_settings`.
3. Broadcasts the corresponding `handle_source_load` or `handle_source_unload` internal mutation to all active workers in parallel.

Workers receiving the broadcast attach or detach the data source without recompilation — schema compilation is the management node's responsibility.

### Pull — Workers Poll `schema_version`

Workers periodically poll `schema_version` from the Core Database at `CLUSTER_POLL_INTERVAL` (default: 30s). If the version has changed since the last check, the worker:

1. Invalidates all cached catalogs.
2. **Reconciles** loaded sources: compares the `_schema_catalogs` table with locally attached sources, loading any missing and unloading any extra.

This pull mechanism ensures recovery from missed broadcasts (e.g., due to transient network issues or a worker restarting after a broadcast was sent).

## DuckDB Secrets Sync

DuckDB secrets (S3/object storage credentials) are registered on the management node and stored in DuckDB's persistent secret storage. Workers sync secrets from management in two situations:

1. **On startup** — immediately after the first successful node registration, the worker queries the management node's `core.meta.secrets` endpoint and creates each secret locally using `CREATE OR REPLACE PERSISTENT SECRET`.
2. **On broadcast** — when the management node registers or unregisters a storage secret, it broadcasts `handle_secret_sync` to all workers, triggering the same sync process.

## CRUD vs Lifecycle Operations

Hugr distinguishes between two categories of data source operations:

### Database CRUD (Core Module)

These mutations modify the `_data_sources` table in the Core Database. They do **not** compile or attach anything at runtime:

- `insert_data_sources` — add a new data source record
- `update_data_sources` — modify an existing record
- `delete_data_sources` — remove a record

Access path: `mutation { core { insert_data_sources(...) { ... } } }`

### Runtime Lifecycle (Cluster Module)

These mutations compile, attach, or detach data sources across the cluster. They operate on sources that already exist in the database:

- `load_source` — compile and attach a data source on all nodes
- `unload_source` — detach a data source from all nodes (does not delete the DB record)
- `reload_source` — unload + load (useful after updating a source's configuration)

Access path: `mutation { function { core { cluster { load_source(name: "...") { ... } } } } }`

**Typical workflow:**

1. Use `insert_data_sources` to create a data source record.
2. Use `load_source` to compile and attach it cluster-wide.
3. If you change the source config with `update_data_sources`, use `reload_source` to apply changes.
4. Use `unload_source` to detach without deleting.
5. Use `delete_data_sources` to permanently remove.

## Cluster Mutations

All cluster mutations are available via the `core.cluster` module. On workers, they are automatically forwarded to the management node. All return `OperationResult` with `success` and `message` fields.

### `load_source`

Compile and attach a data source across the cluster.

```graphql
mutation {
  function {
    core {
      cluster {
        load_source(name: "my-source") {
          success
          message
        }
      }
    }
  }
}
```

**Management behavior:** compiles the source locally, then broadcasts `handle_source_load` to all workers.

### `unload_source`

Detach a data source from all nodes without deleting its database record.

```graphql
mutation {
  function {
    core {
      cluster {
        unload_source(name: "my-source") {
          success
          message
        }
      }
    }
  }
}
```

### `reload_source`

Unload and re-load a data source across the cluster. Use this after modifying a source's configuration.

```graphql
mutation {
  function {
    core {
      cluster {
        reload_source(name: "my-source") {
          success
          message
        }
      }
    }
  }
}
```

### `register_storage`

Register an S3-compatible object storage secret across the cluster.

```graphql
mutation {
  function {
    core {
      cluster {
        register_storage(
          type: "s3"
          name: "my-bucket"
          scope: "bucket-name"
          key: "access-key-id"
          secret: "secret-access-key"
          region: "us-east-1"
          endpoint: "https://s3.amazonaws.com"
          use_ssl: true
          url_style: "vhost"
        ) {
          success
          message
        }
      }
    }
  }
}
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | `String!` | Storage type (e.g., `"s3"`) |
| `name` | `String!` | Unique secret name |
| `scope` | `String!` | Bucket name or sub-path |
| `key` | `String!` | Access key ID |
| `secret` | `String!` | Secret access key |
| `region` | `String` | AWS region (optional) |
| `endpoint` | `String!` | Storage endpoint URL |
| `use_ssl` | `Boolean!` | Use HTTPS (default: `true`) |
| `url_style` | `String!` | `"path"` or `"vhost"` |

### `unregister_storage`

Remove an object storage secret from all nodes.

```graphql
mutation {
  function {
    core {
      cluster {
        unregister_storage(name: "my-bucket") {
          success
          message
        }
      }
    }
  }
}
```

### `invalidate_cache`

Invalidate the schema cache across the cluster. Optionally scope to a specific catalog.

```graphql
mutation {
  function {
    core {
      cluster {
        invalidate_cache(catalog: "optional-catalog-name") {
          success
          message
        }
      }
    }
  }
}
```

If `catalog` is omitted (null), all caches are invalidated.

## Query Functions

The cluster module also provides query functions:

```graphql
query {
  function {
    core {
      cluster {
        # Current schema version counter
        schema_version

        # This node's cluster role
        my_role

        # Management node IPC URL
        management_url
      }
    }
  }
}
```

Registered nodes can be queried directly from the `_cluster_nodes` table:

```graphql
query {
  core {
    cluster {
      nodes {
        name
        url
        role
        version
        started_at
        last_heartbeat
        error
      }
    }
  }
}
```

## Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `CLUSTER_ENABLED` | `bool` | `false` | Enable cluster mode |
| `CLUSTER_ROLE` | `string` | `""` | Node role: `"management"` or `"worker"` |
| `CLUSTER_NODE_NAME` | `string` | _(required)_ | Unique node identifier |
| `CLUSTER_NODE_URL` | `string` | _(required)_ | This node's IPC endpoint URL (must be reachable by other nodes) |
| `CLUSTER_SECRET` | `string` | `""` | Shared secret for inter-node authentication. Must be identical on all nodes. |
| `CLUSTER_HEARTBEAT` | `duration` | `30s` | Heartbeat interval |
| `CLUSTER_GHOST_TTL` | `duration` | `2m` | Time after which a node with no heartbeat is removed (management only) |
| `CLUSTER_POLL_INTERVAL` | `duration` | `30s` | Schema version polling interval (worker only) |

:::caution
`CLUSTER_SECRET` must be the same on all nodes. Workers use it to authenticate requests from the management node, and vice versa.
:::

## Docker Compose Example

Below is a production-ready cluster configuration with nginx, a management node (using `automigrate` for automatic Core DB migrations), two workers, and PostgreSQL.

### `docker-compose.yaml`

```yaml
services:
  core-db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: hugr
      POSTGRES_PASSWORD: hugr
      POSTGRES_DB: hugr
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hugr"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  management:
    image: ghcr.io/hugr-lab/automigrate:latest
    depends_on:
      core-db:
        condition: service_healthy
    environment:
      BIND: ":15000"
      SERVICE_BIND: ":13000"
      CORE_DB_PATH: "postgres://hugr:hugr@core-db:5432/hugr"

      CLUSTER_ENABLED: "true"
      CLUSTER_ROLE: "management"
      CLUSTER_NODE_NAME: "management"
      CLUSTER_NODE_URL: "http://management:15000/ipc"
      CLUSTER_SECRET: "${CLUSTER_SECRET:-change-me}"
      CLUSTER_HEARTBEAT: "30s"
      CLUSTER_GHOST_TTL: "2m"

      ALLOWED_ANONYMOUS: "${ALLOWED_ANONYMOUS:-true}"
      ANONYMOUS_ROLE: "${ANONYMOUS_ROLE:-admin}"

      DB_HOME_DIRECTORY: "/db-home"
    volumes:
      - management-db-home:/db-home
      - shared-data:/data
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:13000/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  node1:
    image: ghcr.io/hugr-lab/server:latest
    depends_on:
      core-db:
        condition: service_healthy
      redis:
        condition: service_healthy
      management:
        condition: service_healthy
    environment:
      BIND: ":15000"
      SERVICE_BIND: ":13000"
      CORE_DB_PATH: "postgres://hugr:hugr@core-db:5432/hugr"

      CLUSTER_ENABLED: "true"
      CLUSTER_ROLE: "worker"
      CLUSTER_NODE_NAME: "node1"
      CLUSTER_NODE_URL: "http://node1:15000/ipc"
      CLUSTER_SECRET: "${CLUSTER_SECRET:-change-me}"
      CLUSTER_POLL_INTERVAL: "30s"

      ALLOWED_ANONYMOUS: "${ALLOWED_ANONYMOUS:-true}"
      ANONYMOUS_ROLE: "${ANONYMOUS_ROLE:-admin}"

      DB_HOME_DIRECTORY: "/db-home"

      CACHE_L1_ENABLED: "true"
      CACHE_L1_MAX_SIZE: "256"
      CACHE_L2_ENABLED: "true"
      CACHE_L2_BACKEND: "redis"
      CACHE_L2_ADDRESSES: "redis:6379"
    volumes:
      - node1-db-home:/db-home
      - shared-data:/data
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:13000/health"]
      interval: 10s

  node2:
    image: ghcr.io/hugr-lab/server:latest
    depends_on:
      core-db:
        condition: service_healthy
      redis:
        condition: service_healthy
      management:
        condition: service_healthy
    environment:
      BIND: ":15000"
      SERVICE_BIND: ":13000"
      CORE_DB_PATH: "postgres://hugr:hugr@core-db:5432/hugr"

      CLUSTER_ENABLED: "true"
      CLUSTER_ROLE: "worker"
      CLUSTER_NODE_NAME: "node2"
      CLUSTER_NODE_URL: "http://node2:15000/ipc"
      CLUSTER_SECRET: "${CLUSTER_SECRET:-change-me}"
      CLUSTER_POLL_INTERVAL: "30s"

      ALLOWED_ANONYMOUS: "${ALLOWED_ANONYMOUS:-true}"
      ANONYMOUS_ROLE: "${ANONYMOUS_ROLE:-admin}"

      DB_HOME_DIRECTORY: "/db-home"

      CACHE_L1_ENABLED: "true"
      CACHE_L1_MAX_SIZE: "256"
      CACHE_L2_ENABLED: "true"
      CACHE_L2_BACKEND: "redis"
      CACHE_L2_ADDRESSES: "redis:6379"
    volumes:
      - node2-db-home:/db-home
      - shared-data:/data
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:13000/health"]
      interval: 10s

  nginx:
    image: nginx:alpine
    ports:
      - "15000:15000"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - management
      - node1
      - node2

volumes:
  postgres-data:
  management-db-home:
  node1-db-home:
  node2-db-home:
  shared-data:
```

### `nginx.conf`

```nginx
upstream hugr-cluster {
    server management:15000;
    server node1:15000;
    server node2:15000;
}

server {
    listen 15000;

    location / {
        proxy_pass http://hugr-cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket support (for subscriptions)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Note that the management node is included in the nginx upstream. Because the management node is a full query node, it can serve client traffic alongside workers.

## Kubernetes Overview

For Kubernetes deployments, the recommended approach is:

1. **Management node** — a single-replica Deployment (or StatefulSet) with `CLUSTER_ROLE=management`, using the `automigrate` image.
2. **Worker nodes** — a multi-replica Deployment with `CLUSTER_ROLE=worker`. Use `metadata.name` (via the downward API) as `CLUSTER_NODE_NAME` for automatic unique naming.
3. **PostgreSQL** — a StatefulSet or managed database service for the shared Core DB.
4. **Redis** — for L2 cache (optional but recommended).
5. **Ingress** — routes external traffic to both management and worker services.

Set `CLUSTER_NODE_URL` using the pod's hostname and a headless Service so the management node can reach each worker for broadcasts.

Templates and examples are available in the [hugr-lab/docker](https://github.com/hugr-lab/docker) repository under `k8s/cluster/`.

## Migration from the Old Cluster Architecture

Previous versions of hugr used a **separate management binary** (`ghcr.io/hugr-lab/management`) that ran on a different port (14000) and communicated with workers via gRPC. The management node did **not** serve GraphQL in the old architecture.

If you are migrating from that setup, note these changes:

| Aspect | Old Architecture | New Architecture |
|---|---|---|
| Management binary | `ghcr.io/hugr-lab/management` (separate) | Same binary as workers (`ghcr.io/hugr-lab/server` or `automigrate`) |
| Management port | 14000 (gRPC) | Same port as workers (default 15000, HTTP/GraphQL) |
| Role selection | Separate binaries | `CLUSTER_ROLE` env var |
| GraphQL on management | Not available | Fully available |
| Worker config | `CLUSTER_MANAGEMENT_URL` pointing to management | `CLUSTER_NODE_URL` pointing to self; management discovered via `_cluster_nodes` table |
| Communication protocol | gRPC | GraphQL over HTTP (IPC endpoint) |
| Health checks | `TIMEOUT` / `CHECK` env vars | `CLUSTER_HEARTBEAT` / `CLUSTER_GHOST_TTL` |
| Auth distribution | Management pushed auth config to workers | Each node reads auth config independently; share the same env vars or config file |

**Migration steps:**

1. Replace `ghcr.io/hugr-lab/management` with `ghcr.io/hugr-lab/automigrate` (or `server`) and set `CLUSTER_ROLE=management`.
2. Replace `CLUSTER_MANAGEMENT_URL` on workers with `CLUSTER_NODE_URL` (pointing to the worker's own address).
3. Set `CLUSTER_ENABLED=true` on all nodes.
4. Replace `TIMEOUT` and `CHECK` with `CLUSTER_HEARTBEAT` and `CLUSTER_GHOST_TTL`.
5. Ensure `CLUSTER_SECRET` and `CLUSTER_NODE_NAME` are set on every node.
6. Add the management node to your load balancer upstream (it now serves GraphQL).
7. Set authentication env vars (`ALLOWED_ANONYMOUS`, `SECRET_KEY`, etc.) on **all** nodes, not just management.

## Next Steps

- Review [Configuration](./1-config.md) for all environment variables
- Configure [Caching](./2-caching.md) for optimal cluster performance (L2 cache is recommended)
- Set up [Authentication](./4-auth.md) for cluster security
