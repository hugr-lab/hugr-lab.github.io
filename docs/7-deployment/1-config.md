---
title: "Configuration"
sidebar_position: 1
---

# Configuration

Hugr can be configured using environment variables. This page describes all available configuration options for the hugr server.

## Server Configuration

### General Settings

- **`BIND`** - Network interface and port (default: `:15000`)
  ```bash
  BIND=":15000"
  ```

  If you want to bind only to localhost, use `127.0.0.1:15000` instead of `:15000`

- **`SERVICE_BIND`** - Metrics and health check endpoint (default: empty)
  ```bash
  SERVICE_BIND=":15001"
  ```

- **`ADMIN_UI`** - Enable GraphiQL interface (default: `true`)
  ```bash
  ADMIN_UI=true
  ```

  When disabled, the GraphiQL interface will not be available, but the GraphQL API will still function

- **`DEBUG`** - SQL query logging (default: `false`)
  ```bash
  DEBUG=false
  ```

- **`ALLOW_PARALLEL`** - Parallel query execution (default: `true`)
  ```bash
  ALLOW_PARALLEL=true
  ```

- **`MAX_PARALLEL_QUERIES`** - Query concurrency limit (default: `0`/unlimited)
  ```bash
  MAX_PARALLEL_QUERIES=10
  ```

- **`MAX_DEPTH`** - GraphQL hierarchy depth (default: `7`)
  ```bash
  MAX_DEPTH=7
  ```

### DuckDB Engine Configuration

- **`DB_HOME_DIRECTORY`** - Credential persistence path
  ```bash
  DB_HOME_DIRECTORY=/path/to/credentials
  ```

  This is where DuckDB stores credentials for remote data sources (e.g., S3, Azure, GCS). Typically left empty to use in-memory DuckDB

- **`DB_PATH`** - Management database file location
  ```bash
  DB_PATH=/path/to/management.db
  ```

- **`DB_MAX_OPEN_CONNS`** / **`DB_MAX_IDLE_CONNS`** - Connection pooling
  ```bash
  DB_MAX_OPEN_CONNS=10
  DB_MAX_IDLE_CONNS=5
  ```

- **`DB_ALLOWED_DIRECTORIES`** / **`DB_ALLOWED_PATHS`** - Filesystem restrictions
  ```bash
  DB_ALLOWED_DIRECTORIES=/data,/workspace
  DB_ALLOWED_PATHS=/data/file1.csv,/data/file2.parquet
  ```

- **`DB_MAX_MEMORY`** - Memory limit (default: 80% system RAM)
  ```bash
  DB_MAX_MEMORY=4GB
  ```

  Setting this too high may cause out-of-memory errors; too low will reduce query performance

- **`DB_TEMP_DIRECTORY`** - Temporary storage location
  ```bash
  DB_TEMP_DIRECTORY=/tmp/duckdb
  ```

- **`DB_WORKER_THREADS`** - Worker thread count (default: CPU cores)
  ```bash
  DB_WORKER_THREADS=4
  ```

- **`DB_PG_CONNECTION_LIMIT`** - PostgreSQL connections (default: `64`)
  ```bash
  DB_PG_CONNECTION_LIMIT=64
  ```

  Used for each PostgreSQL data source to pool connections to the concrete data source

- **`DB_PG_PAGES_PER_TASK`** - PostgreSQL pages per task for parallel scans (default: `0`)
  ```bash
  DB_PG_PAGES_PER_TASK=1000
  ```

- **`DB_ENABLE_LOGGING`** - Enable DuckDB internal logging (default: `false`)
  ```bash
  DB_ENABLE_LOGGING=true
  ```

### Schema Cache Configuration

- **`SCHEMA_CACHE_MAX_ENTRIES`** - Maximum number of compiled schema entries to cache (default: `0`/disabled)
  ```bash
  SCHEMA_CACHE_MAX_ENTRIES=100
  ```

- **`SCHEMA_CACHE_TTL`** - Time-to-live for cached schema entries (default: `0s`/no expiration)
  ```bash
  SCHEMA_CACHE_TTL=5m
  ```

### Core Database Configuration

The core database stores hugr metadata including data sources, catalogs, and schema definitions. Also stores roles and permissions, and managed API keys if enabled.

- **`CORE_DB_PATH`** - DuckDB file or PostgreSQL DSN
  ```bash
  # DuckDB file
  CORE_DB_PATH=/data/core.db

  # PostgreSQL connection
  CORE_DB_PATH=postgres://user:password@host:5432/database
  ```

  For cluster deployments, PostgreSQL is required; DuckDB can only be used in read-only mode

- **`CORE_DB_READONLY`** - Read-only mode flag
  ```bash
  CORE_DB_READONLY=false
  ```

#### S3 Storage Configuration

For DuckDB core database that is placed in S3 object storage:

- **`CORE_DB_S3_ENDPOINT`** - S3 endpoint for cloud storage
  ```bash
  CORE_DB_S3_ENDPOINT=https://s3.amazonaws.com
  ```

- **`CORE_DB_S3_REGION`** - AWS region
  ```bash
  CORE_DB_S3_REGION=us-east-1
  ```

- **`CORE_DB_S3_KEY`** / **`CORE_DB_S3_SECRET`** - AWS credentials
  ```bash
  CORE_DB_S3_KEY=AKIAIOSFODNN7EXAMPLE
  CORE_DB_S3_SECRET=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  ```

- **`CORE_DB_S3_USE_SSL`** - SSL enforcement
  ```bash
  CORE_DB_S3_USE_SSL=true
  ```

### MCP Configuration

- **`MCP_ENABLED`** - Enable the Model Context Protocol endpoint at `/mcp` (default: `false`)
  ```bash
  MCP_ENABLED=true
  ```

- **`EMBEDDER_URL`** - URL of an OpenAI-compatible embeddings API for semantic search in MCP
  ```bash
  EMBEDDER_URL=http://localhost:11434/v1/embeddings
  ```

- **`EMBEDDER_VECTOR_SIZE`** - Dimension of embedding vectors produced by the embedder
  ```bash
  EMBEDDER_VECTOR_SIZE=384
  ```

### CORS Settings

Configure Cross-Origin Resource Sharing (CORS) for web applications. Also required for embedding AdminUI (GraphiQL) provided by hugr nodes as iframe:

- **`CORS_ALLOWED_ORIGINS`** - Permitted domains (comma-separated)
  ```bash
  CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
  ```

- **`CORS_ALLOWED_METHODS`** - HTTP verbs (default: GET, POST, PUT, DELETE, OPTIONS)
  ```bash
  CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
  ```

- **`CORS_ALLOWED_HEADERS`** - Request headers
  ```bash
  CORS_ALLOWED_HEADERS=Content-Type,Authorization
  ```

### Authentication

- **`ALLOWED_ANONYMOUS`** - Anonymous access (default: `true`)
  ```bash
  ALLOWED_ANONYMOUS=true
  ```

- **`ANONYMOUS_ROLE`** - Default role (default: `"anonymous"`)
  ```bash
  ANONYMOUS_ROLE=anonymous
  ```

- **`SECRET_KEY`** - API authentication key
  ```bash
  SECRET_KEY=your-secret-key-here
  ```

- **`AUTH_CONFIG_FILE`** - Configuration file path (JSON/YAML)
  ```bash
  AUTH_CONFIG_FILE=/config/auth.yaml
  ```

- **`ALLOWED_MANAGED_API_KEYS`** - GraphQL API key management
  ```bash
  ALLOWED_MANAGED_API_KEYS=true
  ```

### Cache Configuration

See the [Caching](./2-caching.md) section for detailed cache configuration options.

### Cluster Configuration

- **`CLUSTER_ENABLED`** - Enable cluster mode (default: `false`)
  ```bash
  CLUSTER_ENABLED=true
  ```

- **`CLUSTER_ROLE`** - Node role: `management` or `worker` (default: empty/standalone)
  ```bash
  CLUSTER_ROLE=worker
  ```

- **`CLUSTER_NODE_NAME`** - Unique name for this node in the cluster
  ```bash
  CLUSTER_NODE_NAME=worker-1
  ```

- **`CLUSTER_NODE_URL`** - URL where this node is reachable by the management node
  ```bash
  CLUSTER_NODE_URL=http://worker-1:15000
  ```

- **`CLUSTER_SECRET`** - Shared secret for cluster authentication (must match across all nodes)
  ```bash
  CLUSTER_SECRET=your-cluster-secret
  ```

- **`CLUSTER_HEARTBEAT`** - Interval between heartbeat signals (default: `30s`)
  ```bash
  CLUSTER_HEARTBEAT=30s
  ```

- **`CLUSTER_GHOST_TTL`** - Time after which an unresponsive node is considered dead (default: `2m`)
  ```bash
  CLUSTER_GHOST_TTL=2m
  ```

- **`CLUSTER_POLL_INTERVAL`** - Interval for workers to poll schema version from management (default: `30s`)
  ```bash
  CLUSTER_POLL_INTERVAL=30s
  ```

See the [Clustered Deployment](./6-cluster.md) section for architecture details and deployment examples.

### OIDC Integration

For authentication with OpenID Connect providers:

- **`OIDC_ISSUER`** - Identity provider URL
  ```bash
  OIDC_ISSUER=https://accounts.google.com
  ```

- **`OIDC_CLIENT_ID`** - Application identifier
  ```bash
  OIDC_CLIENT_ID=your-client-id
  ```

- **`OIDC_TLS_INSECURE`** - Certificate verification bypass (not recommended for production)
  ```bash
  OIDC_TLS_INSECURE=false
  ```

- **`OIDC_COOKIE_NAME`** - Session cookie identifier
  ```bash
  OIDC_COOKIE_NAME=hugr_session
  ```

  Hugr uses this cookie name to extract the token if it is not provided in the Authorization header

- **`OIDC_USERNAME_CLAIM`** / **`OIDC_USERID_CLAIM`** / **`OIDC_ROLE_CLAIM`** - Token attributes
  ```bash
  OIDC_USERNAME_CLAIM=preferred_username
  OIDC_USERID_CLAIM=sub
  OIDC_ROLE_CLAIM=roles
  ```

## Configuration File Example

You can create a `.env` file to configure your hugr deployment:

```bash
# Server Configuration
BIND=:15000
ADMIN_UI=true
DEBUG=false
MAX_DEPTH=7

# Core Database
CORE_DB_PATH=/data/core.db

# MCP
MCP_ENABLED=true
EMBEDDER_URL=http://localhost:11434/v1/embeddings
EMBEDDER_VECTOR_SIZE=384

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Authentication
ALLOWED_ANONYMOUS=true
ANONYMOUS_ROLE=anonymous

# Cache (L1 - In-Memory)
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512

# Cache (L2 - Redis)
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis:6379
```

## Next Steps

- Learn about [Caching](./2-caching.md) configuration
- Explore [Container Deployment](./5-container.md) options
- Configure [Cluster Deployment](./6-cluster.md) for high availability
