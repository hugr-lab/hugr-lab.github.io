---
title: "Clustered Deployment"
sidebar_position: 6
---

# Clustered Deployment

Hugr supports clustered deployment for high availability and scalability. In cluster mode, multiple work nodes are coordinated by a management node, providing load balancing across work nodes.

## Cluster Architecture

A hugr cluster consists of:

1. **Management Node** - Manages cluster operations, schema synchronization, data sources, object storage, and authentication settings via GraphQL API
2. **Work Nodes** - Handle GraphQL queries and mutations with load balancing
3. **Shared Core Database** - PostgreSQL or DuckDB (read-only) accessible by all nodes
4. **Distributed Cache** - Optional Redis/Memcached for shared L2 cache

### How Cluster Mode Works

- **Load Balancing**: GraphQL queries are distributed across work nodes by a load balancer (nginx/HAProxy)
- **Management Operations**: Schema updates, data source configuration, object storage, and authentication settings are managed through the management node's GraphQL API
- **Schema Synchronization**: The management node automatically synchronizes schemas, data sources, and object storage configurations across all work nodes
- **No Distributed Query Execution**: Each work node processes queries independently; there is no distributed query processing across nodes

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (nginx/HAProxy)│
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
     │ Work Node 1 │  │ Work Node 2 │  │ Work Node 3 │
     └──────┬──────┘  └─────┬──────┘  └─────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Management Node │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
     │  PostgreSQL │  │    Redis    │  │   MinIO    │
     │ (Core DB)   │  │   (Cache)   │  │ (Storage)  │
     └─────────────┘  └────────────┘  └────────────┘
```

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
```

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
  - **DuckDB** - Only in read-only mode (`CORE_DB_READONLY=true`), as DuckDB cannot handle concurrent writes from multiple processes to the same file
- **L2 cache** is strongly recommended for cluster deployments to cache role permissions

### Roles and Permissions in Cluster Mode

**Important**: Role and permission synchronization is **not** performed in cluster mode. However:

- All nodes can share a common core database (PostgreSQL or DuckDB in read-only mode)
- Role permissions are cached using the standard caching mechanism (L1/L2) with default TTL from cache configuration
- Authentication settings can be managed centrally through the management node's GraphQL API

## Docker Compose Cluster Deployment

### Basic Cluster Setup

Here's a basic cluster configuration with two work nodes:

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

### Management Node Operations

The management node provides centralized cluster management through its GraphQL API:

- **Schema Management**: Update and synchronize schemas across all work nodes
- **Data Source Configuration**: Add, update, or remove data sources
- **Object Storage**: Configure and manage connected object storage (S3, MinIO, etc.)
- **Authentication Settings**: Manage common authentication rules and configurations
- **Cluster Monitoring**: Monitor work node health and status

All management operations are performed via GraphQL mutations on the management node.

### Schema Synchronization

The management node automatically synchronizes changes across all work nodes:

1. Schema or data source changes are made via GraphQL mutation on the **management node**
2. Management node updates the shared core database
3. All work nodes are notified to reload their configurations
4. L2 cache is invalidated across the cluster to ensure consistency

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
