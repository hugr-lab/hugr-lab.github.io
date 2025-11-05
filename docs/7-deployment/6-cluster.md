---
title: "Clustered Deployment"
sidebar_position: 6
---

# Clustered Deployment

Hugr supports clustered deployment for high availability and scalability. In cluster mode, multiple work nodes are coordinated by a management node, providing load balancing across work nodes.

## Cluster Architecture

A hugr cluster consists of:

1. **Management Node** - Manages cluster operations, schema synchronization, data sources, object storage, and authentication settings. The management node runs on port 14000 by default and uses gRPC for communication with work nodes
2. **Work Nodes** - Handle GraphQL queries and mutations with load balancing
3. **Shared Core Database** - PostgreSQL or DuckDB (read-only) accessible by all nodes
4. **Distributed Cache** - Optional Redis/Memcached for shared L2 cache

### How Cluster Mode Works

- **Load Balancing**: GraphQL queries are distributed across work nodes by a load balancer (nginx/HAProxy/Traefik)
- **GraphQL API**: Work nodes provide the GraphQL API (including AdminUI). The management node does NOT expose GraphQL endpoints
- **Cluster Operations**: When a work node receives a cluster operation request (via `core.cluster` module), it communicates with the management node to execute the operation
- **Schema Synchronization**: The management node automatically synchronizes schemas, data sources, and object storage configurations across all work nodes
- **No Distributed Query Execution**: Each work node processes queries independently; there is no distributed query processing across nodes. This means horizontal scaling is achieved by adding more work nodes behind a load balancer

```
                         ┌─────────────────┐
                         │  Load Balancer  │
                         │(nginx/HAProxy/  │
                         │    Traefik)     │
                         └────────┬────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
          ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
          │ Work Node 1 │  │ Work Node 2 │  │ Work Node 3 │
          │  (GraphQL)  │  │  (GraphQL)  │  │  (GraphQL)  │
          └──┬───────┬──┘  └──┬───────┬──┘  └──┬───────┬──┘
             │       │        │       │        │       │
             │   ┌───┴────────┴───┬───┴────────┴───┐   │
             │   │  HTTP (bidir)  │  HTTP (bidir)  │   │
             │   ▼                ▼                ▼   │
             │   ┌────────────────────────────────┐   │
             │   │      Management Node (HTTP)    │   │
             │   │  (coordinates work nodes via   │   │
             │   │   bidirectional HTTP calls)    │   │
             │   └────────────────────────────────┘   │
             │                                         │
         ┌───┴─────────┬──────────┬──────────┬────────┴────┐
         │             │          │          │             │
    ┌────▼────┐   ┌───▼─────┐ ┌──▼──────┐ ┌▼────────┐ ┌───▼──────┐
    │PostgreSQL│   │  Redis  │ │  MinIO  │ │  Data   │ │ OIDC IdP │
    │(Core DB) │   │ (Cache) │ │(Storage)│ │ Sources │ │(optional)│
    └──────────┘   └─────────┘ └─────────┘ └─────────┘ └──────────┘
```

**Architecture Notes:**
- Work nodes communicate directly with core database (PostgreSQL), Redis, MinIO, and data sources
- Work nodes and management node communicate via **bidirectional HTTP**:
  - When a work node receives a `core.cluster` GraphQL query, it makes an HTTP request to the management node
  - The management node then makes HTTP requests to all work nodes to coordinate cluster operations
- The management node performs operations across all nodes in the cluster and collects information about their configurations
- You can add an OIDC Identity Provider (IdP) to the architecture that work nodes communicate with for authentication

## Cluster Configuration

### Management Node Configuration

The management node requires the following environment variables:

```bash
# Management node binding
BIND=:14000

# Cluster authentication (shared with work nodes)
CLUSTER_SECRET=your-cluster-secret

# Node communication timeout
TIMEOUT=30s

# Node health check interval
CHECK=1m

# Authentication settings (distributed to work nodes)
ALLOWED_ANONYMOUS=true
ANONYMOUS_ROLE=anonymous
SECRET_KEY=your-secret-key
AUTH_CONFIG_FILE=/config/auth.yaml

# OIDC Integration (optional)
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=your-client-id
OIDC_COOKIE_NAME=hugr_session
OIDC_USERNAME_CLAIM=preferred_username
OIDC_USERID_CLAIM=sub
OIDC_ROLE_CLAIM=roles
```

For detailed authentication setup instructions, see the [Authentication Setup](./4-auth.md).

**Authentication Distribution**: The management node distributes these authentication settings to all work nodes when they connect. Work nodes automatically receive and apply the configuration, ensuring consistent authentication across the cluster.

### Work Node Configuration

Each work node needs to know about the management node:

```bash
# Work node binding
BIND=:15000

# Cluster configuration
CLUSTER_SECRET=your-cluster-secret
CLUSTER_MANAGEMENT_URL=http://management:14000
CLUSTER_NODE_NAME=worker-1
CLUSTER_NODE_URL=http://worker-1:15000
CLUSTER_TIMEOUT=5s

# Core database (shared)
CORE_DB_PATH=postgres://hugr:password@postgres:5432/hugr_core

# Distributed cache (L2)
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis:6379
CACHE_L2_PASSWORD=redis_password
```

### Important Configuration Notes

- **`CLUSTER_SECRET`** must be identical across all nodes for secure communication
- **`CLUSTER_NODE_NAME`** must be unique for each work node
- **`CLUSTER_NODE_URL`** should be accessible by the management node
- **`CORE_DB_PATH`** must point to a shared database:
  - **PostgreSQL** (recommended) - Full read/write support
  - **DuckDB** - Only in read-only mode (`CORE_DB_READONLY=true`), as DuckDB cannot handle concurrent writes from multiple processes to the same file. DuckDB cannot be used for the core database in write mode for cluster deployments due to its single-writer limitation
- **L2 cache** is strongly recommended for cluster deployments to cache role permissions

### Roles and Permissions in Cluster Mode

**Important**: Role and permission synchronization is **not** performed in cluster mode. However:

- All nodes can share a common core database (PostgreSQL or DuckDB in read-only mode)
- Role permissions are cached using the standard caching mechanism (L1/L2) with default TTL from cache configuration
- Authentication settings are configured on the management node (via environment variables) and automatically distributed to work nodes

## Docker Compose Cluster Deployment

### Basic Cluster Setup

Here's a basic cluster configuration with two work nodes.

**Note**: Access the cluster GraphQL API through work nodes (ports 15001, 15002), not the management node. The management node (port 14000) does not provide GraphQL endpoints.

```yaml
version: '3.8'

services:
  management:
    image: ghcr.io/hugr-lab/management:latest
    ports:
      - "14000:14000"
    environment:
      - BIND=:14000
      - CLUSTER_SECRET=cluster-secret-key
      - TIMEOUT=30s
      - CHECK=1m
    restart: unless-stopped

  worker-1:
    image: ghcr.io/hugr-lab/server:latest
    ports:
      - "15001:15000"
    environment:
      # Server Config
      - BIND=:15000
      - ADMIN_UI=true

      # Cluster Config
      - CLUSTER_SECRET=cluster-secret-key
      - CLUSTER_MANAGEMENT_URL=http://management:14000
      - CLUSTER_NODE_NAME=worker-1
      - CLUSTER_NODE_URL=http://worker-1:15000
      - CLUSTER_TIMEOUT=5s

      # Core Database
      - CORE_DB_PATH=postgres://hugr:password@postgres:5432/hugr_core

      # Cache
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password
    volumes:
      - ./workspace:/workspace
    depends_on:
      - management
      - postgres
      - redis
    restart: unless-stopped

  worker-2:
    image: ghcr.io/hugr-lab/server:latest
    ports:
      - "15002:15000"
    environment:
      # Server Config
      - BIND=:15000
      - ADMIN_UI=true

      # Cluster Config
      - CLUSTER_SECRET=cluster-secret-key
      - CLUSTER_MANAGEMENT_URL=http://management:14000
      - CLUSTER_NODE_NAME=worker-2
      - CLUSTER_NODE_URL=http://worker-2:15000
      - CLUSTER_TIMEOUT=5s

      # Core Database
      - CORE_DB_PATH=postgres://hugr:password@postgres:5432/hugr_core

      # Cache
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password
    volumes:
      - ./workspace:/workspace
    depends_on:
      - management
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hugr_core
      - POSTGRES_USER=hugr
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Cluster with Load Balancer (NGINX)

Add NGINX as a load balancer:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - worker-1
      - worker-2
    restart: unless-stopped

  management:
    image: ghcr.io/hugr-lab/management:latest
    ports:
      - "14000:14000"
    environment:
      - BIND=:14000
      - CLUSTER_SECRET=cluster-secret-key
      - TIMEOUT=30s
      - CHECK=1m
    restart: unless-stopped

  worker-1:
    image: ghcr.io/hugr-lab/server:latest
    environment:
      - BIND=:15000
      - ADMIN_UI=false
      - CLUSTER_SECRET=cluster-secret-key
      - CLUSTER_MANAGEMENT_URL=http://management:14000
      - CLUSTER_NODE_NAME=worker-1
      - CLUSTER_NODE_URL=http://worker-1:15000
      - CLUSTER_TIMEOUT=5s
      - CORE_DB_PATH=postgres://hugr:password@postgres:5432/hugr_core
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password
    volumes:
      - ./workspace:/workspace
    depends_on:
      - management
      - postgres
      - redis
    restart: unless-stopped

  worker-2:
    image: ghcr.io/hugr-lab/server:latest
    environment:
      - BIND=:15000
      - ADMIN_UI=false
      - CLUSTER_SECRET=cluster-secret-key
      - CLUSTER_MANAGEMENT_URL=http://management:14000
      - CLUSTER_NODE_NAME=worker-2
      - CLUSTER_NODE_URL=http://worker-2:15000
      - CLUSTER_TIMEOUT=5s
      - CORE_DB_PATH=postgres://hugr:password@postgres:5432/hugr_core
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password
    volumes:
      - ./workspace:/workspace
    depends_on:
      - management
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hugr_core
      - POSTGRES_USER=hugr
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream hugr_cluster {
        least_conn;
        server worker-1:15000 max_fails=3 fail_timeout=30s;
        server worker-2:15000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://hugr_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
}
```

## Kubernetes Deployment

For Kubernetes deployments, the [hugr-lab/docker](https://github.com/hugr-lab/docker) repository provides templates in the `k8s/cluster` directory.

### Basic Kubernetes Architecture

A Kubernetes deployment typically includes:

1. **Management Node Deployment** - Single replica StatefulSet
2. **Worker Node Deployment** - Multi-replica StatefulSet or Deployment
3. **PostgreSQL StatefulSet** - Persistent core database
4. **Redis Deployment** - Distributed cache
5. **Services** - For internal communication
6. **Ingress** - For external access

### Management Node Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hugr-management
  labels:
    app: hugr-management
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hugr-management
  template:
    metadata:
      labels:
        app: hugr-management
    spec:
      containers:
      - name: management
        image: ghcr.io/hugr-lab/management:latest
        ports:
        - containerPort: 14000
          name: management
        env:
        - name: BIND
          value: ":14000"
        - name: CLUSTER_SECRET
          valueFrom:
            secretKeyRef:
              name: hugr-cluster-secret
              key: cluster-secret
        - name: TIMEOUT
          value: "30s"
        - name: CHECK
          value: "1m"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: hugr-management
spec:
  selector:
    app: hugr-management
  ports:
  - port: 14000
    targetPort: 14000
    name: management
```

### Worker Node Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hugr-worker
  labels:
    app: hugr-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hugr-worker
  template:
    metadata:
      labels:
        app: hugr-worker
    spec:
      containers:
      - name: worker
        image: ghcr.io/hugr-lab/server:latest
        ports:
        - containerPort: 15000
          name: http
        env:
        - name: BIND
          value: ":15000"
        - name: ADMIN_UI
          value: "false"
        - name: CLUSTER_SECRET
          valueFrom:
            secretKeyRef:
              name: hugr-cluster-secret
              key: cluster-secret
        - name: CLUSTER_MANAGEMENT_URL
          value: "http://hugr-management:14000"
        - name: CLUSTER_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: CLUSTER_NODE_URL
          value: "http://$(HOSTNAME).hugr-worker:15000"
        - name: CLUSTER_TIMEOUT
          value: "5s"
        - name: CORE_DB_PATH
          valueFrom:
            secretKeyRef:
              name: hugr-db-secret
              key: connection-string
        - name: CACHE_L1_ENABLED
          value: "true"
        - name: CACHE_L1_MAX_SIZE
          value: "512"
        - name: CACHE_L2_ENABLED
          value: "true"
        - name: CACHE_L2_BACKEND
          value: "redis"
        - name: CACHE_L2_ADDRESSES
          value: "redis:6379"
        - name: CACHE_L2_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /admin
            port: 15000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /admin
            port: 15000
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: hugr-workspace
---
apiVersion: v1
kind: Service
metadata:
  name: hugr-worker
spec:
  selector:
    app: hugr-worker
  ports:
  - port: 15000
    targetPort: 15000
    name: http
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: hugr-worker-headless
spec:
  clusterIP: None
  selector:
    app: hugr-worker
  ports:
  - port: 15000
    targetPort: 15000
    name: http
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hugr-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: hugr.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hugr-worker
            port:
              number: 15000
  tls:
  - hosts:
    - hugr.example.com
    secretName: hugr-tls-secret
```

### Secrets

Create the required secrets:

```bash
# Cluster secret
kubectl create secret generic hugr-cluster-secret \
  --from-literal=cluster-secret='your-cluster-secret-key'

# Database connection
kubectl create secret generic hugr-db-secret \
  --from-literal=connection-string='postgres://hugr:password@postgres:5432/hugr_core'

# Redis password
kubectl create secret generic redis-secret \
  --from-literal=password='redis-password'
```

## Scaling Work Nodes

### Docker Compose

Scale work nodes dynamically:

```bash
# Scale to 5 worker nodes
docker-compose up -d --scale worker=5

# Scale down to 2 worker nodes
docker-compose up -d --scale worker=2
```

### Kubernetes

```bash
# Scale deployment
kubectl scale deployment hugr-worker --replicas=5

# Auto-scaling with HPA
kubectl autoscale deployment hugr-worker \
  --cpu-percent=70 \
  --min=3 \
  --max=10
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hugr-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hugr-worker
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cluster Management

### Cluster Management Operations

In cluster mode, the hugr GraphQL schema is extended with the `core.cluster` module, which provides:

- **Schema Management**: Load/unload data source catalogs across all work nodes
- **Data Source Configuration**: Add, update, or remove data sources (via core module)
- **Object Storage**: Register and manage S3/MinIO storage across the cluster
- **Cluster Monitoring**: Monitor work node health and status

**Note**: Authentication settings are configured via environment variables or configuration files on the management node, not through GraphQL API. The management node automatically distributes these settings to work nodes when they connect.

### GraphQL API for Cluster Management

**Important**: The management node does NOT provide a GraphQL API. All cluster management operations are performed through the **work nodes** GraphQL API.

When you execute a query or mutation in the `core.cluster` module:
1. You send the GraphQL request to a **work node** (via standard endpoint `http://work-node:15000/graphql` or AdminUI at `http://work-node:15000/admin`)
2. The work node receives the request
3. The work node automatically communicates with the management node to perform the cluster operation
4. The work node returns the result

**Access cluster operations** through any work node's GraphQL interface or AdminUI.

All cluster-specific operations are available in the `core.cluster` module with different access paths depending on the operation type.

#### Query Operations

The `core.cluster` module provides query operations through two approaches:

**1. Direct View Access** - `query { core { cluster { ... } } }`

Views can be queried directly without the `function` wrapper:

**Get registered cluster nodes (view):**

```graphql
query {
  core {
    cluster {
      cluster_nodes {
        name
        version
        url
        ready
        last_seen
        error
      }
    }
  }
}
```

**Get registered object storages (view):**

```graphql
query {
  core {
    cluster {
      registered_storages {
        node
        name
        type
        scope
        Parameters
      }
    }
  }
}
```

**2. Function Access** - `query { function { core { cluster { ... } } } }`

The same data can also be accessed through functions:

**Get registered cluster nodes (function):**

```graphql
query {
  function {
    core {
      cluster {
        nodes {
          name
          version
          url
          ready
          last_seen
          error
        }
      }
    }
  }
}
```

Returns: `[cluster_nodes]` - same as view

**Get registered object storages (function):**

```graphql
query {
  function {
    core {
      cluster {
        storages {
          node
          name
          type
          scope
          Parameters
        }
      }
    }
  }
}
```

Returns: `[registered_storages]` - same as view

**Get data source status (function only):**

```graphql
query {
  function {
    core {
      cluster {
        data_source_status(name: "your-datasource-name") {
          node
          status
          error
        }
      }
    }
  }
}
```

Returns: `[cluster_data_source_status]` - data source status on each node

**Note**: `cluster_nodes` and `registered_storages` can be accessed both as views (direct) and through functions. `data_source_status` is only available as a function.

**List data sources (core module):**

```graphql
query {
  core {
    data_sources {
      name
      type
      description
      prefix
      path
      disabled
      catalogs {
        name
        type
        path
      }
    }
  }
}
```

#### Mutation Operations

All mutation operations are functions and use the path: `mutation { function { core { cluster { ... } } } }`

#### Data Source Management

**Load or reload a data source catalog:**

```graphql
mutation {
  function {
    core {
      cluster {
        load_data_source(name: "your-datasource-name") {
          success
          message
        }
      }
    }
  }
}
```

This operation loads or reloads the data source catalog across all cluster nodes.

**Unload a data source catalog:**

```graphql
mutation {
  function {
    core {
      cluster {
        unload_data_source(name: "your-datasource-name") {
          success
          message
        }
      }
    }
  }
}
```

This operation unloads the data source catalog from all cluster nodes without deleting the data source configuration.

**Add a new data source (core module):**

```graphql
mutation addDataSource($data: data_sources_mut_input_data!) {
  core {
    insert_data_sources(data: $data) {
      name
      type
      description
      path
      catalogs {
        name
        type
        path
      }
    }
  }
}
```

With variables:

```json
{
  "data": {
    "name": "analytics",
    "type": "postgres",
    "prefix": "an",
    "description": "Analytics database",
    "read_only": false,
    "as_module": true,
    "path": "postgres://user:password@postgres:5432/analytics",
    "catalogs": [
      {
        "name": "analytics_schema",
        "type": "uri",
        "description": "Analytics schema definitions",
        "path": "/workspace/analytics/schema"
      }
    ]
  }
}
```

After adding a data source, use `load_data_source` to load it across the cluster.

**Update a data source (core module):**

```graphql
mutation updateDataSource($name: String!, $data: data_sources_mut_data!) {
  core {
    update_data_sources(filter: {name: {eq: $name}}, data: $data) {
      name
      description
      path
      disabled
    }
  }
}
```

**Delete a data source (core module):**

```graphql
mutation deleteDataSource($name: String!) {
  core {
    delete_data_sources(filter: {name: {eq: $name}}) {
      name
    }
  }
}
```

#### Object Storage Management

**Register a new S3/MinIO object storage:**

```graphql
mutation {
  function {
    core {
      cluster {
        register_object_storage(
          type: "s3"
          name: "minio-storage"
          scope: "my-bucket"
          key: "minioadmin"
          secret: "minioadmin"
          region: "us-east-1"
          endpoint: "http://minio:9000"
          use_ssl: false
          url_style: "path"
          url_compatibility: false
        ) {
          success
          message
        }
      }
    }
  }
}
```

**Register object storage with variables:**

```graphql
mutation RegisterStorage(
  $type: String!
  $name: String!
  $scope: String!
  $key: String!
  $secret: String!
  $endpoint: String!
  $region: String
  $use_ssl: Boolean
  $url_style: String!
) {
  function {
    core {
      cluster {
        register_object_storage(
          type: $type
          name: $name
          scope: $scope
          key: $key
          secret: $secret
          endpoint: $endpoint
          region: $region
          use_ssl: $use_ssl
          url_style: $url_style
        ) {
          success
          message
        }
      }
    }
  }
}
```

With variables:

```json
{
  "type": "s3",
  "name": "minio-storage",
  "scope": "my-bucket",
  "key": "minioadmin",
  "secret": "minioadmin",
  "endpoint": "http://minio:9000",
  "region": "us-east-1",
  "use_ssl": false,
  "url_style": "path"
}
```

**Parameters:**
- `type`: Type of object storage (e.g., "s3")
- `name`: Unique name for the storage
- `scope`: Bucket name or bucket sub-path
- `key`: Access key ID (AWS or S3-compatible)
- `secret`: Secret access key
- `region`: AWS region (optional)
- `endpoint`: Storage endpoint URL
- `use_ssl`: Whether to use HTTPS (default: true)
- `url_style`: S3 URL style ("path" or "vhost")
- `url_compatibility`: URL compatibility mode (optional)
- `kms_key_id`: AWS KMS key for server-side encryption (optional)
- `account_id`: Cloudflare R2 account ID (optional)

**Unregister object storage:**

```graphql
mutation {
  function {
    core {
      cluster {
        unregister_object_storage(name: "minio-storage") {
          success
          message
        }
      }
    }
  }
}
```

**List registered storages (query):**

See the query operation `storages` above for listing registered object storages across the cluster.

#### Authentication Configuration in Cluster Mode

**Important**: Authentication settings in cluster mode are **not** managed via GraphQL API. Instead:

1. **Configuration on Management Node**: Authentication settings are configured on the management node via environment variables or configuration file (same as single-server deployment)
2. **Automatic Distribution**: When a work node starts, it automatically receives authentication settings from the management node
3. **Centralized Management**: All work nodes use the same authentication configuration distributed by the management node

**Configure authentication on the management node** using environment variables:

```bash
# Management Node Environment Variables
ALLOWED_ANONYMOUS=false
ANONYMOUS_ROLE=guest
SECRET_KEY=your-secret-key
AUTH_CONFIG_FILE=/config/auth.yaml

# OIDC Configuration (optional)
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=your-client-id
OIDC_COOKIE_NAME=hugr_session
```

Or via configuration file (`/config/auth.yaml`):

```yaml
authentication:
  allowed_anonymous: false
  anonymous_role: guest
  secret_key: your-secret-key

  # OIDC settings
  oidc:
    issuer: https://accounts.google.com
    client_id: your-client-id
    cookie_name: hugr_session
```

Work nodes automatically receive and apply these settings when they connect to the management node. See [Configuration](./1-config.md) for complete authentication options.

#### Complete GraphQL API Reference

**Summary of Cluster Operations:**

All cluster operations are accessed via work nodes through the `core.cluster` module.

**Query Operations - Views** (direct access):
- Path: `query { core { cluster { ... } } }`
- `cluster_nodes` - Get registered cluster nodes (view)
- `registered_storages` - Get registered object storages (view)

**Query Operations - Functions**:
- Path: `query { function { core { cluster { ... } } } }`
- `nodes` - Get registered cluster nodes (returns `[cluster_nodes]`)
- `storages` - Get registered object storages (returns `[registered_storages]`)
- `data_source_status(name)` - Get data source status across nodes (returns `[cluster_data_source_status]`)

**Mutation Operations** (via `function.core.cluster`):
- Path: `mutation { function { core { cluster { ... } } } }`
- `load_data_source(name)` - Load/reload data source catalog across cluster
- `unload_data_source(name)` - Unload data source catalog from cluster
- `register_object_storage(...)` - Register new S3/object storage across cluster
- `unregister_object_storage(name)` - Unregister object storage from cluster

**Core Module Operations** (data source CRUD):
- `core.data_sources` - List data sources
- `core.insert_data_sources` - Add new data source
- `core.update_data_sources` - Update data source
- `core.delete_data_sources` - Delete data source

**Access Patterns:**
- **Views (direct)**: `query { core { cluster { cluster_nodes, registered_storages } } }`
- **Query Functions**: `query { function { core { cluster { nodes, storages, data_source_status } } } }`
- **Mutation Functions**: `mutation { function { core { cluster { load_data_source, ... } } } }`

**Note**: Cluster nodes and storages can be queried in two ways - directly as views or through functions. Both return the same data. Using direct view access is more efficient as it bypasses the function wrapper layer.

**Workflow**:
1. Execute GraphQL requests through any work node's endpoint or AdminUI
2. For cluster operations (`core.cluster`), the work node automatically communicates with the management node
3. After modifying data sources via core module operations, use `load_data_source` or `unload_data_source` to apply changes across the cluster

### Schema Synchronization

The management node automatically synchronizes changes across all work nodes:

1. Schema or data source changes are made via GraphQL mutation through a **work node** (using `core.cluster` operations)
2. The work node communicates with the management node
3. Management node updates the shared core database
4. All work nodes are notified to reload their configurations
5. L2 cache is invalidated across the cluster to ensure consistency

### Node Health Monitoring

The management node periodically checks work node health:

- **Health Check Interval**: Configured via `CHECK` environment variable
- **Timeout**: Configured via `TIMEOUT` environment variable
- **Failure Handling**: Unhealthy nodes are temporarily removed from the cluster

### Adding/Removing Nodes

#### Docker Compose

Add new work nodes to `docker-compose.yml` and restart:

```bash
docker-compose up -d worker-3
```

Remove nodes:

```bash
docker-compose stop worker-3
docker-compose rm -f worker-3
```

#### Kubernetes

Scale the deployment:

```bash
kubectl scale deployment hugr-worker --replicas=5
```

## Minikube Development Setup

For local Kubernetes development with Minikube, see the example configuration in the [hugr-lab/docker](https://github.com/hugr-lab/docker) repository at `examples/minikube-cluster.md`.

Basic Minikube setup:

```bash
# Start Minikube
minikube start --cpus=4 --memory=8192

# Enable ingress
minikube addons enable ingress

# Apply configurations
kubectl apply -f k8s/cluster/

# Access the service
minikube service hugr-worker --url
```

## High Availability Considerations

### Database High Availability

For the shared core database:

**PostgreSQL (Recommended for Production)**:
- Use PostgreSQL with replication (streaming or logical)
- Configure automatic failover with tools like Patroni or Stolon
- Ensure proper backup and recovery procedures
- Full read/write support for all cluster operations

**DuckDB (Development/Read-Only)**:
- Can only be used in read-only mode (`CORE_DB_READONLY=true`)
- DuckDB does not support concurrent writes from multiple processes to the same file
- Suitable for read-only cluster deployments or development environments
- Prepare the database file before starting the cluster

### Cache High Availability

- Use Redis Sentinel for automatic failover
- Or Redis Cluster for distributed setup
- Configure connection retry logic in work nodes

### Storage High Availability

- Use replicated storage for persistent volumes
- Consider S3-compatible storage for core database
- Implement regular backup strategies

### Load Balancing

- Use multiple load balancer instances
- Configure health checks on all work nodes
- Implement session affinity if needed (though hugr is stateless)

## Monitoring and Observability

### Metrics to Monitor

1. **Work Node Metrics**:
   - Request rate and latency
   - Query execution time
   - Cache hit ratio
   - Memory and CPU usage

2. **Management Node Metrics**:
   - Active work nodes count
   - Schema synchronization events
   - Node health check failures

3. **Infrastructure Metrics**:
   - Database connection pool usage
   - Redis memory usage
   - Network latency between nodes

### Logging

Configure centralized logging for all cluster components:

```yaml
logging:
  driver: "fluentd"
  options:
    fluentd-address: "localhost:24224"
    tag: "hugr.{{.Name}}"
```

## Troubleshooting

### Work Node Not Connecting to Management

1. Verify `CLUSTER_MANAGEMENT_URL` is accessible
2. Check `CLUSTER_SECRET` matches on both nodes
3. Review network policies in Kubernetes
4. Check management node logs

### Schema Not Synchronizing

1. Verify core database is accessible by all nodes
2. Check `CORE_DB_PATH` configuration
3. Ensure L2 cache is working properly
4. Review management node logs for sync events

### Uneven Load Distribution

1. Check load balancer configuration
2. Verify all work nodes are healthy
3. Review resource limits and actual usage
4. Consider adjusting load balancing algorithm

### Split Brain Scenarios

- Ensure proper network segmentation
- Configure appropriate timeouts
- Use health checks at multiple levels
- Implement proper failure detection

## Best Practices

1. **Always use PostgreSQL** for the core database in production clusters (DuckDB only supports read-only mode)
2. **Enable L2 cache** to cache role permissions and improve performance across nodes
3. **Use separate management node** - don't combine management and work node roles
4. **Configure proper resource limits** to prevent node starvation
5. **Implement comprehensive monitoring** for all cluster components
6. **Use secrets management** for sensitive configuration (cluster secrets, database credentials)
7. **Regular backup** of core database and configuration
8. **Test failover scenarios** before production deployment
9. **Manage cluster operations through management node** - use its GraphQL API for schema updates, data source configuration, and authentication settings
10. **Cache role permissions** - configure appropriate TTL for permission caching to balance security and performance

## Example Repositories

For complete examples and templates:

- **Docker Repository**: [https://github.com/hugr-lab/docker](https://github.com/hugr-lab/docker)
  - `compose/example.cluster.docker-compose.yml` - Cluster with Docker Compose
  - `k8s/cluster/` - Kubernetes templates
  - `examples/minikube-cluster.md` - Minikube development setup

## Next Steps

- Review [Configuration](./1-config.md) for detailed environment variables
- Configure [Caching](./2-caching.md) for optimal cluster performance
- Set up [Authentication](./4-auth.md) for cluster security
- Implement monitoring and alerting for production clusters
