---
title: "Caching"
sidebar_position: 2
---

# Caching

Hugr provides a two-level caching system to improve query performance and reduce database load. The caching system consists of an in-memory L1 cache and an optional distributed L2 cache backed by Redis or Memcached.

## Cache Architecture

The hugr caching system is designed with two levels:

1. **L1 Cache (In-Memory)** - Fast local cache stored in the application memory
2. **L2 Cache (Distributed)** - Shared cache across multiple hugr instances using Redis or Memcached

This two-level approach provides:
- Fast response times with L1 cache hits
- Shared cache state across multiple instances with L2 cache
- Reduced database load for frequently accessed queries
- Improved scalability in clustered deployments

## Cache Configuration

### General Cache Settings

- **`CACHE_TTL`** - Time-to-live for cached items (applies to both L1 and L2)
  ```bash
  CACHE_TTL=5m
  ```

  This setting affects how long query results remain cached before requiring re-execution

### L1 Cache (In-Memory)

The L1 cache is a local in-memory cache that provides fast access to frequently used query results.

- **`CACHE_L1_ENABLED`** - Enable/disable L1 cache (default: `false`)
  ```bash
  CACHE_L1_ENABLED=true
  ```

- **`CACHE_L1_MAX_SIZE`** - Maximum memory allocation in MB (default: `512`)
  ```bash
  CACHE_L1_MAX_SIZE=1024
  ```

- **`CACHE_L1_CLEAN_TIME`** - Interval for cleaning expired entries (default: `10m`)
  ```bash
  CACHE_L1_CLEAN_TIME=10m
  ```

- **`CACHE_L1_EVICTION_TIME`** - Time before entries are eligible for eviction (default: `30m`)
  ```bash
  CACHE_L1_EVICTION_TIME=30m
  ```

### L2 Cache (Distributed)

The L2 cache is an external distributed cache that can be shared across multiple hugr instances. This is particularly useful in clustered deployments.

- **`CACHE_L2_ENABLED`** - Enable/disable L2 cache (default: `false`)
  ```bash
  CACHE_L2_ENABLED=true
  ```

- **`CACHE_L2_BACKEND`** - Cache backend type: `redis` or `memcached`
  ```bash
  CACHE_L2_BACKEND=redis
  ```

  Redis is recommended for production deployments due to its reliability and feature set

- **`CACHE_L2_ADDRESSES`** - Comma-separated list of cache server addresses
  ```bash
  # Single server
  CACHE_L2_ADDRESSES=redis:6379

  # Multiple servers for high availability
  CACHE_L2_ADDRESSES=redis1:6379,redis2:6379,redis3:6379
  ```

#### Redis-Specific Configuration

When using Redis as the L2 cache backend, you can configure authentication and database selection:

- **`CACHE_L2_DATABASE`** - Redis database number (default: `0`)
  ```bash
  CACHE_L2_DATABASE=0
  ```

- **`CACHE_L2_USERNAME`** - Redis username (for Redis 6+ ACL)
  ```bash
  CACHE_L2_USERNAME=hugr
  ```

- **`CACHE_L2_PASSWORD`** - Redis password
  ```bash
  CACHE_L2_PASSWORD=your-redis-password
  ```

## Configuration Examples

### Single Instance with L1 Cache Only

For a single hugr instance, you can use L1 cache for improved performance:

```bash
# Enable L1 cache
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512
CACHE_TTL=5m

# L2 cache disabled
CACHE_L2_ENABLED=false
```

### Clustered Deployment with Redis

For clustered deployments, use both L1 and L2 caches for optimal performance:

```bash
# L1 Cache (local)
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512

# L2 Cache (shared Redis)
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis:6379
CACHE_L2_PASSWORD=your-redis-password

# Cache TTL
CACHE_TTL=10m
```

### Using Memcached

If you prefer Memcached over Redis:

```bash
# L1 Cache
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512

# L2 Cache (Memcached)
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=memcached
CACHE_L2_ADDRESSES=memcached:11211

# Cache TTL
CACHE_TTL=5m
```

### High Availability Redis Cluster

For production deployments with Redis cluster:

```bash
# L1 Cache
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=1024

# L2 Cache (Redis Cluster)
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis-node-1:6379,redis-node-2:6379,redis-node-3:6379
CACHE_L2_USERNAME=hugr
CACHE_L2_PASSWORD=your-redis-password
CACHE_L2_DATABASE=0

# Cache TTL
CACHE_TTL=15m
```

## Docker Compose Example with Redis

Here's a complete example using Docker Compose with Redis cache:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/server:latest
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

      # Cache TTL
      - CACHE_TTL=10m
    volumes:
      - ./data:/data
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Docker Compose Example with Memcached

Alternative example using Memcached:

```yaml
version: '3.8'

services:
  hugr:
    image: ghcr.io/hugr-lab/server:latest
    ports:
      - "15000:15000"
    environment:
      - BIND=:15000
      - ADMIN_UI=true
      - CORE_DB_PATH=/data/core.db

      # L1 Cache
      - CACHE_L1_ENABLED=true
      - CACHE_L1_MAX_SIZE=512

      # L2 Cache (Memcached)
      - CACHE_L2_ENABLED=true
      - CACHE_L2_BACKEND=memcached
      - CACHE_L2_ADDRESSES=memcached:11211

      # Cache TTL
      - CACHE_TTL=10m
    volumes:
      - ./data:/data
    depends_on:
      - memcached

  memcached:
    image: memcached:1.6-alpine
    ports:
      - "11211:11211"
    command: memcached -m 256
```

## Cache Behavior

### Cache Key Generation

Hugr automatically generates cache keys based on:
- Query structure
- Query parameters
- User context (when authentication is enabled)
- Data source configuration

If the cache key is not explicitly provided, the user role is also included in the key generation

### Cache Invalidation

Cache entries are invalidated when:
- TTL expires
- Data source schema is reloaded
- Manual cache clear is triggered (via GraphQL mutation)
- The `@invalidate_cache` directive is used (see [Directive Reference](/docs/8-references/1-directives.md) for cache directive explanations)

### Cache Warming

For frequently accessed queries, you can implement cache warming strategies:
1. Execute common queries after server startup
2. Use scheduled jobs to refresh cache entries before TTL expiration
3. Pre-load critical data during deployment

## Performance Considerations

### L1 Cache Sizing

- **Small deployments**: 256-512 MB
- **Medium deployments**: 512-1024 MB
- **Large deployments**: 1024-2048 MB

Monitor memory usage and adjust based on:
- Available system memory
- Query result sizes
- Cache hit ratio

### L2 Cache Backend Selection

**Redis** is recommended when:
- You need data persistence
- You want to use Redis Cluster for high availability
- You need advanced features (transactions, pub/sub)

**Memcached** is recommended when:
- You need simple key-value caching
- You want slightly better performance for simple operations
- You don't need persistence

### TTL Tuning

Choose TTL based on your data update frequency:
- **Frequently updated data**: 1-5 minutes
- **Moderately updated data**: 5-15 minutes
- **Rarely updated data**: 15-60 minutes

## Monitoring Cache Performance

Monitor these metrics to optimize cache configuration:

1. **Cache Hit Ratio** - Percentage of requests served from cache
2. **Cache Memory Usage** - Current L1 cache memory consumption
3. **L2 Connection Status** - Redis/Memcached connectivity
4. **Average Response Time** - Compare cached vs non-cached queries

You can query cache statistics through the hugr admin UI or monitoring endpoints (if `SERVICE_BIND` is configured).

## Troubleshooting

### Cache Not Working

1. Verify `CACHE_L1_ENABLED` or `CACHE_L2_ENABLED` is set to `true`
2. Check cache server connectivity (for L2 cache)
3. Verify authentication credentials for Redis/Memcached
4. Review logs for cache-related errors

### High Memory Usage

1. Reduce `CACHE_L1_MAX_SIZE`
2. Decrease `CACHE_TTL`
3. Adjust `CACHE_L1_EVICTION_TIME` for more aggressive eviction

### Cache Inconsistency

1. Reduce `CACHE_TTL` for frequently updated data
2. Implement cache invalidation on data mutations
3. Use L2 cache to maintain consistency across instances

## Next Steps

- Learn about [Container Deployment](./5-container.md) with caching enabled
- Configure [Cluster Deployment](./6-cluster.md) with shared L2 cache
- Review [Configuration](./1-config.md) for complete environment variable reference
