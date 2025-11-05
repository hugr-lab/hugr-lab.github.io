---
title: "Containerized Deployment"
sidebar_position: 5
---

# Containerized Deployment

Hugr is distributed as Docker containers hosted in the GitHub Container Registry. This page describes how to deploy hugr using Docker and Docker Compose.

## Container Images

Hugr provides three official Docker images:

### 1. Automigrate Image (Recommended for Single-Node Deployments)
**Image**: `ghcr.io/hugr-lab/automigrate`

Hugr server with automatic database schema migration for the core database. This image automatically applies schema updates on startup, making updates transparent and seamless. The automigrate image includes the same functionality as the server image, plus automatic schema migration on startup.

**Use this image for**:
- Single-node (non-clustered) deployments
- Development environments
- Production deployments without clustering

```bash
docker pull ghcr.io/hugr-lab/automigrate:latest
```

### 2. Server Image (For Cluster Work Nodes)
**Image**: `ghcr.io/hugr-lab/server`

The main hugr server that provides the GraphQL API and admin interface. This is the base server image without automatic migrations.

**Use this image for**:
- Work nodes in clustered deployments
- Custom migration workflows

```bash
docker pull ghcr.io/hugr-lab/server:latest
```

### 3. Management Image (For Cluster Management Node)
**Image**: `ghcr.io/hugr-lab/management`

Management node for cluster mode deployments. This node coordinates schema synchronization, data source configuration, object storage, and authentication settings across multiple work nodes. The management node does not provide a GraphQL API; all queries must go through work nodes. The management node also applies core database migrations at startup if the core database is not in read-only mode.

**Use this image for**:
- Management node in clustered deployments only

```bash
docker pull ghcr.io/hugr-lab/management:latest
```

## Quick Start with Docker

### Basic Deployment (Recommended)

Run a basic hugr server with local storage using the **automigrate** image:

```bash
docker run -d \
  --name hugr \
  -p 15000:15000 \
  -v $(pwd)/data:/data \
  -e CORE_DB_PATH=/data/core.db \
  -e ADMIN_UI=true \
  ghcr.io/hugr-lab/automigrate:latest
```

The `automigrate` image ensures that database schema migrations are automatically applied on startup, making updates seamless.

Access the admin interface at `http://localhost:15000/admin`

### With Environment File

Create a `.env` file:

```bash
BIND=:15000
ADMIN_UI=true
DEBUG=false
CORE_DB_PATH=/data/core.db
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512
```

Run with environment file:

```bash
docker run -d \
  --name hugr \
  -p 15000:15000 \
  -v $(pwd)/data:/data \
  --env-file .env \
  ghcr.io/hugr-lab/automigrate:latest
```

## Docker Compose Deployment

Docker Compose provides a convenient way to manage multi-container deployments. The [hugr-lab/docker](https://github.com/hugr-lab/docker) repository contains several example configurations.

### Basic Deployment

Create a `docker-compose.yml` file using the **automigrate** image for automatic schema migrations:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/automigrate:latest
    ports:
      - "15000:15000"
    environment:
      - BIND=:15000
      - ADMIN_UI=true
      - CORE_DB_PATH=/data/core.db
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
    volumes:
      - ./data:/data
      - ./workspace:/workspace
    restart: unless-stopped
```

Start the service:

```bash
docker-compose up -d
```

### Deployment with PostgreSQL

Use PostgreSQL as the core database for production deployments with the **automigrate** image:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/automigrate:latest
    ports:
      - "15000:15000"
    environment:
      - BIND=:15000
      - ADMIN_UI=true
      - CORE_DB_PATH=postgres://hugr:hugr_password@postgres:5432/hugr_core
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512
    volumes:
      - ./workspace:/workspace
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hugr_core
      - POSTGRES_USER=hugr
      - POSTGRES_PASSWORD=hugr_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deployment with Caching (Redis)

Add Redis for distributed caching with the **automigrate** image:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/automigrate:latest
    ports:
      - "15000:15000"
    environment:
      - BIND=:15000
      - ADMIN_UI=true
      - CORE_DB_PATH=/data/core.db

      # L1 Cache
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512

      # L2 Cache (Redis)
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password

      - CACHE_TTL=10m
    volumes:
      - ./data:/data
      - ./workspace:/workspace
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Deployment with S3 Storage (MinIO)

Use S3-compatible storage for the core database with the **automigrate** image:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/automigrate:latest
    ports:
      - "15000:15000"
    environment:
      - BIND=:15000
      - ADMIN_UI=true
      - CORE_DB_PATH=s3://hugr-bucket/core.db

      # S3 Configuration (MinIO)
      - CORE_DB_S3_ENDPOINT=http://minio:9000
      - CORE_DB_S3_REGION=us-east-1
      - CORE_DB_S3_KEY=minioadmin
      - CORE_DB_S3_SECRET=minioadmin
      - CORE_DB_S3_USE_SSL=false

      # DuckDB S3 Access
      - DB_ALLOWED_PATHS=s3://hugr-bucket/*
    volumes:
      - ./workspace:/workspace
    depends_on:
      - minio
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data
    restart: unless-stopped

volumes:
  minio_data:
```

### Complete Production Setup

A comprehensive production-ready setup with all components:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/automigrate:latest
    ports:
      - "15000:15000"
      - "15001:15001"
    environment:
      # Server Configuration
      - BIND=:15000
      - SERVICE_BIND=:15001
      - ADMIN_UI=true
      - DEBUG=false
      - MAX_DEPTH=7
      - ALLOW_PARALLEL=true
      - MAX_PARALLEL_QUERIES=20

      # Core Database (PostgreSQL)
      - CORE_DB_PATH=postgres://hugr:hugr_password@postgres:5432/hugr_core

      # DuckDB Configuration
      - DB_ALLOWED_DIRECTORIES=/workspace
      - DB_MAX_MEMORY=8GB
      - DB_WORKER_THREADS=4

      # L1 Cache
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=1024

      # L2 Cache (Redis)
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=redis
      - CACHE_L2_ADDRESSES=redis:6379
      - CACHE_L2_PASSWORD=redis_password
      - CACHE_TTL=10m

      # CORS
      - CORS_ALLOWED_ORIGINS=https://app.example.com

      # Authentication
      - ALLOWED_ANONYMOUS=false
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - ./workspace:/workspace
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:15001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hugr_core
      - POSTGRES_USER=hugr
      - POSTGRES_PASSWORD=hugr_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hugr"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

## Building Custom Images

If you need to customize the Docker images, you can build them from source. Clone the [hugr-lab/docker](https://github.com/hugr-lab/docker) repository:

```bash
git clone https://github.com/hugr-lab/docker.git
cd docker
```

### Build Server Image

```bash
docker build -t ghcr.io/hugr-lab/server:latest -f server.dockerfile .
```

### Build Automigrate Image

```bash
docker build -t ghcr.io/hugr-lab/automigrate:latest -f automigrate.dockerfile .
```

### Build Management Image

```bash
docker build -t ghcr.io/hugr-lab/management:latest -f management.dockerfile .
```

### Using Docker Compose Build

The repository includes a `docker-compose.yml` file for building:

```bash
docker-compose -f example.build.docker-compose.yml build
```

## Image Selection Guide

Choose the right image based on your deployment scenario:

| Deployment Scenario | Recommended Image | Notes |
|---------------------|-------------------|-------|
| Single-node production | `automigrate` | Automatic migrations on startup |
| Development environment | `automigrate` | Simplifies schema updates |
| Cluster work nodes | `server` | No automatic migrations needed |
| Cluster management node | `management` | Manages cluster operations |

## Kubernetes Deployment

For Kubernetes deployments, see the [Cluster Deployment](./6-cluster.md) guide which includes Kubernetes manifests and configuration details.

The [hugr-lab/docker](https://github.com/hugr-lab/docker) repository contains Kubernetes templates in the `k8s/cluster` directory.

## Volume Mounts

### Required Volumes

- **`/data`** - Core database and local DuckDB files
- **`/workspace`** - Schema definitions and data source catalogs

**Note**: Volume mounting is not strictly required, but provides several benefits:
- **Easy editing**: Mount `/workspace` to edit data source schema definition files from the host
- **Database access**: If using DuckDB for core database, mount `/data` directory and set the corresponding `CORE_DB_PATH` to access the database file
- **Persistent secrets**: Mount a persistent volume to `DB_HOME_DIRECTORY` to make secrets storage independent and avoid losing credentials when the container is removed

### Optional Volumes

- **`/tmp`** - Temporary files (configure with `DB_TEMP_DIRECTORY`)
- **`/credentials`** - Stored credentials (configure with `DB_HOME_DIRECTORY`)

Example with all volumes:

```yaml
volumes:
  - ./data:/data
  - ./workspace:/workspace
  - ./tmp:/tmp
  - ./credentials:/credentials
```

## Networking

### Ports

- **15000** - Main GraphQL API and admin interface (default)
- **15001** - Metrics and health check endpoint (optional, configure with `SERVICE_BIND`)

### Network Configuration

For multi-container deployments, create a custom network:

```yaml
services:
  hugr:
    # ... service config ...
    networks:
      - hugr-network

  postgres:
    # ... service config ...
    networks:
      - hugr-network

networks:
  hugr-network:
    driver: bridge
```

## Health Checks

Configure health checks for monitoring and orchestration:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:15000/admin"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

For the service endpoint (when `SERVICE_BIND` is configured):

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:15001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Resource Limits

Configure resource limits to prevent container resource exhaustion:

```yaml
services:
  hugr:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
```

## Logging

Configure logging drivers for centralized log management:

```yaml
services:
  hugr:
    # ... other config ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

For structured logging with external systems:

```yaml
logging:
  driver: "syslog"
  options:
    syslog-address: "tcp://logserver:514"
    tag: "hugr"
```

## Offline Deployment

For environments without internet access, you can save and load images:

### Save Images

```bash
# Pull images
docker pull ghcr.io/hugr-lab/server:latest
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Save to tar files
docker save ghcr.io/hugr-lab/server:latest -o hugr-server.tar
docker save postgres:15-alpine -o postgres.tar
docker save redis:7-alpine -o redis.tar
```

### Load Images

```bash
docker load -i hugr-server.tar
docker load -i postgres.tar
docker load -i redis.tar
```

## Troubleshooting

### Container Won't Start

1. Check container logs:
   ```bash
   docker logs hugr
   ```

2. Verify environment variables:
   ```bash
   docker exec hugr env
   ```

3. Check volume permissions:
   ```bash
   docker exec hugr ls -la /data
   ```

### Connection Issues

1. Verify port bindings:
   ```bash
   docker ps
   ```

2. Test network connectivity:
   ```bash
   docker exec hugr ping postgres
   ```

3. Check firewall rules on the host

### Performance Issues

1. Monitor resource usage:
   ```bash
   docker stats hugr
   ```

2. Review DuckDB memory settings (`DB_MAX_MEMORY`)
3. Adjust cache configuration
4. Consider scaling to cluster mode

## Example Repositories

For more examples and templates, visit:

- **Docker Repository**: [https://github.com/hugr-lab/docker](https://github.com/hugr-lab/docker)
  - `compose/` - Docker Compose examples
  - `k8s/` - Kubernetes templates
  - Example configurations for various deployment scenarios

## Next Steps

- Learn about [Cluster Deployment](./6-cluster.md) for high availability
- Review [Configuration](./1-config.md) for detailed environment variables
- Configure [Caching](./2-caching.md) for improved performance
- Explore [Authentication](./4-auth.md) for securing your deployment
