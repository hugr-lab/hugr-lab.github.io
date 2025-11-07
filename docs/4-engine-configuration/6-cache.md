---
title: "Cache Directives and Functions"
sidebar_position: 7
description: Control caching behavior with @cache, @no_cache, @invalidate_cache directives and core.cache.invalidate() function
keywords: [cache, caching, "@cache", "@no_cache", "@invalidate_cache", core.cache, invalidate, performance, ttl, tags]
---

# Cache Directives and Functions

Hugr provides three GraphQL directives to control query result caching: `@cache`, `@no_cache`, and `@invalidate_cache`. Additionally, the `core.cache.invalidate()` function enables programmatic cache invalidation. These features work seamlessly with hugr's [two-level caching system](/docs/deployment/caching) (L1 in-memory and L2 distributed) to optimize query performance and reduce database load.

## Cache Control Methods

Hugr offers multiple ways to control caching behavior:

1. **[@cache directive](#cache-directive)** - Enable caching for queries or schema types
2. **[@no_cache directive](#no_cache-directive)** - Disable caching for specific queries
3. **[@invalidate_cache directive](#invalidate_cache-directive)** - Invalidate cache during query execution
4. **[core.cache.invalidate() function](#programmatic-cache-invalidation)** - Programmatically invalidate cache by tags

## Overview

### What are Cache Directives?

Cache directives and functions allow you to:
- Enable automatic caching of query results with `@cache`
- Disable caching for specific queries that require real-time data with `@no_cache`
- Invalidate cached data when mutations occur with `@invalidate_cache` directive or `core.cache.invalidate()` function
- Programmatically invalidate cache by tags using `core.cache.invalidate(tags: [...])`

### When to Use Cache Directives

Use cache directives when you need to:
- **Improve Performance**: Cache expensive queries (aggregations, joins, complex transformations)
- **Reduce Database Load**: Avoid repeated execution of identical queries
- **Optimize Costs**: Minimize queries to external APIs or databases
- **Control Freshness**: Ensure real-time data is never cached with `@no_cache`
- **Maintain Consistency**: Invalidate cache when data changes with `@invalidate_cache`

### How They Work with L1/L2 Cache System

Cache directives integrate with hugr's two-level caching:

1. **L1 Cache (In-Memory)**: Fast local cache for quick access
2. **L2 Cache (Distributed)**: Shared cache across multiple hugr instances (Redis/Memcached)

When a query with `@cache` is executed:
1. Hugr checks L1 cache first (fastest)
2. If not found, checks L2 cache (fast)
3. If not found, executes the query and stores result in both caches
4. Subsequent requests serve from cache until TTL expires

### Benefits of Directive-Based Caching

- **Declarative**: Specify caching behavior directly in schemas or queries
- **Flexible**: Apply to entire types or individual queries
- **Fine-Grained Control**: Custom TTL, keys, and tags per query
- **Automatic Invalidation**: Tag-based cache invalidation on mutations
- **Role-Aware**: Automatic cache isolation per user role

## @cache Directive

The `@cache` directive enables caching for fields, objects, or entire queries.

### Syntax

```graphql
directive @cache(
  """
  Time to live for the cache in seconds
  """
  ttl: Int
  """
  Cache key for the query (optional)
  """
  key: String
  """
  Cache tags for grouped invalidation (optional)
  """
  tags: [String!]
) on FIELD | OBJECT | FIELD_DEFINITION
```

### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `ttl` | Int | Time-to-live in seconds. How long the cached result remains valid. | No (uses global `CACHE_TTL`) |
| `key` | String | Custom cache key. If not provided, auto-generated from query hash. | No |
| `tags` | [String!] | Tags for grouped cache invalidation. Useful for invalidating related queries. | No |

### Usage in Schema Definitions

Apply `@cache` to object types for automatic caching of all queries for that type:

```graphql
type users @table(name: "users") @cache(ttl: 300, tags: ["users"]) {
  id: ID!
  name: String!
  email: String!
  age: Int!
}

type products @table(name: "products") @cache(ttl: 600, tags: ["products"]) {
  id: ID!
  name: String!
  price: Float!
  category: String!
}
```

**Benefits**:
- All queries for `users` are automatically cached for 5 minutes
- All queries for `products` are cached for 10 minutes
- Tagged for easy invalidation when data changes

### Usage at Query Time

Apply `@cache` to specific queries for manual control:

```graphql
query {
  # Cached query with custom TTL
  topProducts: products(
    filter: { category: "electronics" }
    order: { price: DESC }
    limit: 10
  ) @cache(ttl: 300, key: "top_electronics", tags: ["products"]) {
    id
    name
    price
  }

  # Another cached query with different parameters
  budgetProducts: products(
    filter: { price: { lt: 100 } }
  ) @cache(ttl: 600, tags: ["products", "budget"]) {
    id
    name
    price
  }
}
```

### Cache Key Generation

#### Automatic Key Generation

If `key` parameter is not provided, hugr automatically generates a cache key based on:
- Query text structure
- Query variables
- User role/permissions (when authentication is enabled)
- Data source configuration

This ensures that:
- Different queries get different cache entries
- Same query with different variables gets different cache entries
- Different users (roles) don't share cache entries (unless explicitly keyed)

**Example**:
```graphql
query GetUser($userId: ID!) {
  user(filter: { id: $userId }) @cache(ttl: 300) {
    id
    name
    email
  }
}
```

This query will have different cache entries for:
- `userId = 1` and `userId = 2` (different variables)
- Admin role and User role (different permissions)

#### Custom Cache Keys

Use the `key` parameter for explicit cache control:

```graphql
query {
  # All users share this cache entry regardless of role
  globalStats: statistics_aggregation
    @cache(ttl: 600, key: "global_stats") {
    total_users
    total_orders
    revenue
  }

  # Per-category cache entries
  electronics: products(filter: { category: "electronics" })
    @cache(ttl: 300, key: "products:electronics") {
    id
    name
  }
}
```

**When to use custom keys**:
- Shared cache across all users/roles
- Predictable key names for manual invalidation
- Cache entries that should be independent of query structure

### TTL (Time-To-Live) Configuration

TTL determines how long cached results remain valid before re-execution.

```graphql
# Short TTL for frequently changing data
query RealtimeOrders {
  recentOrders: orders(
    filter: { created_at: { gte: "2024-01-01" } }
    order: { created_at: DESC }
  ) @cache(ttl: 60) {  # 1 minute
    id
    status
    total
  }
}

# Medium TTL for moderately changing data
query ProductCatalog {
  products @cache(ttl: 300) {  # 5 minutes
    id
    name
    price
  }
}

# Long TTL for rarely changing data
query Categories {
  categories @cache(ttl: 3600) {  # 1 hour
    id
    name
  }
}
```

**TTL Guidelines**:
- Real-time data: 30-60 seconds
- Frequently updated: 1-5 minutes
- Moderately updated: 5-15 minutes
- Rarely updated: 15-60 minutes
- Static reference data: 1-24 hours

### Cache Tags for Invalidation

Tags enable grouped cache invalidation. When data changes, invalidate all queries with a specific tag.

```graphql
type orders @table(name: "orders") @cache(ttl: 300, tags: ["orders"]) {
  id: ID!
  customer_id: Int!
  total: Float!
  status: String!
}

query {
  # All these queries share the "orders" tag
  allOrders: orders @cache(ttl: 300, tags: ["orders"]) {
    id
    total
  }

  pendingOrders: orders(
    filter: { status: "pending" }
  ) @cache(ttl: 300, tags: ["orders", "pending"]) {
    id
    total
  }

  completedOrders: orders(
    filter: { status: "completed" }
  ) @cache(ttl: 300, tags: ["orders", "completed"]) {
    id
    total
  }
}
```

When an order is created or updated, you can invalidate all queries tagged with `"orders"` to ensure consistency.

## @no_cache Directive

The `@no_cache` directive disables caching for specific queries, ensuring fresh data on every request.

### Syntax

```graphql
directive @no_cache on FIELD
```

### When to Use

Use `@no_cache` when you need:
- Real-time data that must never be cached
- User-specific data that shouldn't be shared
- Debugging queries during development
- One-time queries that won't be repeated

### Examples

#### Bypass Cache for Real-Time Data

```graphql
query {
  # Cached for performance
  products @cache(ttl: 300) {
    id
    name
    price
  }

  # Real-time inventory - never cached
  inventory: products @no_cache {
    id
    stock_quantity
    last_updated
  }
}
```

#### User-Specific Data

```graphql
query GetUserDashboard($userId: ID!) {
  # Static data - cached
  categories @cache(ttl: 600) {
    id
    name
  }

  # User-specific data - not cached to ensure freshness
  user(filter: { id: $userId }) @no_cache {
    id
    name
    recent_activity {
      timestamp
      action
    }
  }
}
```

#### Override Schema-Level Caching

Even if a type has `@cache` in its schema definition, you can bypass it at query time:

```graphql
# Schema has @cache
type users @table(name: "users") @cache(ttl: 300) {
  id: ID!
  name: String!
  email: String!
}

# Query bypasses schema-level cache
query {
  # Uses schema cache
  allUsers: users {
    id
    name
  }

  # Bypasses cache
  currentUser: users @no_cache {
    id
    name
    email
  }
}
```

## @invalidate_cache Directive

The `@invalidate_cache` directive invalidates cached entries before executing the query, ensuring you get fresh data.

### Syntax

```graphql
directive @invalidate_cache on FIELD
```

### How It Works

When `@invalidate_cache` is used:
1. Cache entries for matching queries are removed
2. The query is executed against the data source
3. New results are cached (if `@cache` is also present)

### Use Cases

#### Force Cache Refresh

```graphql
query {
  # Regular cached query
  products @cache(ttl: 300) {
    id
    name
    price
  }

  # Force refresh - invalidate and re-cache
  refreshedProducts: products @invalidate_cache @cache(ttl: 300) {
    id
    name
    price
  }
}
```

#### After Data Mutations

After creating, updating, or deleting data, invalidate related caches:

```graphql
mutation CreateProduct($input: ProductInput!) {
  createProduct(input: $input) {
    id
    name
    price
  }
}

# Then immediately query with invalidation
query {
  # Get fresh product list
  products @invalidate_cache @cache(ttl: 300, tags: ["products"]) {
    id
    name
    price
  }
}
```

#### Debugging and Development

During development, use `@invalidate_cache` to ensure you're seeing current data:

```graphql
query DebugQuery {
  # Always get fresh data during debugging
  testData: users @invalidate_cache {
    id
    name
    email
  }
}
```

### Combining with Tags

Invalidate by tags for grouped cache clearing:

```graphql
query {
  # Invalidate all queries tagged with "orders"
  orders @invalidate_cache @cache(ttl: 300, tags: ["orders"]) {
    id
    total
    status
  }

  # Also affects other queries with the same tag
  orderStats: orders_aggregation @invalidate_cache @cache(ttl: 300, tags: ["orders"]) {
    _rows_count
    total_revenue { sum }
  }
}
```

## Schema-Level Caching

Apply `@cache` to object types in your schema for automatic caching behavior.

### Automatic Caching on Queries

```graphql
# Schema definition
type products @table(name: "products") @cache(ttl: 300, tags: ["products"]) {
  id: ID!
  name: String!
  price: Float!
  category: String!
}

# All queries automatically cached
query {
  # Automatically cached for 5 minutes
  products {
    id
    name
    price
  }

  # Also automatically cached
  electronics: products(filter: { category: "electronics" }) {
    id
    name
  }
}
```

### Automatic Cache Invalidation on Mutations

When mutations affect cached types, hugr can automatically invalidate related caches using tags:

```graphql
# Schema with cache tags
type orders @table(name: "orders") @cache(ttl: 300, tags: ["orders"]) {
  id: ID!
  customer_id: Int!
  total: Float!
}

# Mutation automatically invalidates "orders" tag
mutation CreateOrder($input: OrderInput!) {
  createOrder(input: $input) {
    id
    total
  }
}

# Subsequent queries get fresh data
query {
  orders @cache(ttl: 300, tags: ["orders"]) {
    id
    total
  }
}
```

### Tags-Based Invalidation

Use tags to group related queries for coordinated invalidation:

```graphql
# Multiple types with shared tags
type orders @table(name: "orders") @cache(ttl: 300, tags: ["orders", "sales"]) {
  id: ID!
  total: Float!
}

type order_items @table(name: "order_items") @cache(ttl: 300, tags: ["orders", "sales"]) {
  id: ID!
  order_id: Int!
  product_id: Int!
  quantity: Int!
}

# When orders change, both types' caches are invalidated
mutation UpdateOrder($id: ID!, $input: OrderInput!) {
  updateOrder(id: $id, input: $input) {
    id
    total
  }
}
```

## Query-Time Caching

Apply `@cache` to specific queries for fine-grained control beyond schema-level defaults.

### Custom Cache Keys

```graphql
query DashboardStats {
  # Shared cache across all users
  globalStats: statistics_aggregation
    @cache(ttl: 600, key: "dashboard:global_stats") {
    total_users
    total_orders
  }

  # Per-category cache
  categoryStats: products_bucket_aggregation(
    filter: { category: "electronics" }
  ) @cache(ttl: 300, key: "dashboard:category:electronics") {
    key { category }
    aggregations {
      _rows_count
      avg_price { avg }
    }
  }
}
```

### Dynamic TTL Based on Data

Adjust TTL based on data characteristics:

```graphql
query {
  # Frequently changing data - short TTL
  activeOrders: orders(
    filter: { status: "pending" }
  ) @cache(ttl: 60) {
    id
    status
  }

  # Historical data - long TTL
  historicalOrders: orders(
    filter: { created_at: { lt: "2023-01-01" } }
  ) @cache(ttl: 86400) {  # 24 hours
    id
    total
  }
}
```

### Combining with Filters and Variables

```graphql
query FilteredProducts($category: String!, $minPrice: Float!) {
  products(
    filter: {
      category: $category,
      price: { gte: $minPrice }
    }
  ) @cache(ttl: 300, tags: ["products", $category]) {
    id
    name
    price
  }
}

# Each variable combination creates a separate cache entry
# { category: "electronics", minPrice: 100 } - separate entry
# { category: "books", minPrice: 20 } - separate entry
```

## Cache Key Generation

Understanding how cache keys are generated helps you optimize caching behavior.

### Automatic Key Generation

When `key` parameter is not specified, hugr generates keys using:

```
hash(query_text + variables + role_name + data_source_config)
```

**Components**:
1. **Query Text**: The GraphQL query structure
2. **Variables**: Query variable values
3. **Role Name**: User's role/permissions (if auth enabled)
4. **Data Source Config**: Data source connection details

**Example**:

```graphql
query GetProducts($category: String!) {
  products(filter: { category: $category }) @cache(ttl: 300) {
    id
    name
    price
  }
}
```

This generates different keys for:
- Different `$category` values
- Different user roles
- Different data source configurations

### Custom Keys with key Parameter

Use explicit keys for predictable caching:

```graphql
query {
  # Explicit key - same for all users
  stats: statistics_aggregation
    @cache(ttl: 600, key: "global:stats:2024") {
    total_users
    total_revenue
  }

  # Pattern-based keys
  categoryProducts: products(filter: { category: "electronics" })
    @cache(ttl: 300, key: "products:category:electronics") {
    id
    name
  }
}
```

### Role-Based Cache Isolation

By default, cache entries are isolated by user role to prevent data leakage:

```graphql
query {
  # Admin sees all orders, User sees only their orders
  # Different cache entries per role
  orders @cache(ttl: 300) {
    id
    customer_id
    total
  }
}
```

To share cache across roles, use explicit `key`:

```graphql
query {
  # Same cache entry for all roles
  publicStats: statistics_aggregation
    @cache(ttl: 600, key: "public:stats") {
    total_products
    total_categories
  }
}
```

### Best Practices for Key Naming

1. **Use Hierarchical Structure**:
   ```
   namespace:entity:identifier
   products:category:electronics
   orders:user:12345
   stats:global:daily
   ```

2. **Include Version Numbers** for schema changes:
   ```
   products:v2:electronics
   api:v1:stats
   ```

3. **Be Specific** to avoid collisions:
   ```
   ❌ products
   ✅ products:list:active
   ```

4. **Use Consistent Naming**:
   ```
   products:category:{category}
   orders:status:{status}
   users:role:{role}
   ```

## Cache Tags and Invalidation

Tags enable efficient grouped cache invalidation.

### Using Tags for Grouped Invalidation

```graphql
# Schema with tags
type orders @table(name: "orders") @cache(ttl: 300, tags: ["orders"]) {
  id: ID!
  total: Float!
}

type order_items @table(name: "order_items") @cache(ttl: 300, tags: ["order_items", "orders"]) {
  id: ID!
  order_id: Int!
  product_id: Int!
}

# Query with multiple tags
query {
  orderDetails: orders @cache(ttl: 300, tags: ["orders", "reports"]) {
    id
    total
    items {
      id
      product_id
    }
  }
}
```

### Automatic Invalidation on Mutations

When a mutation affects data, hugr automatically invalidates caches with matching tags:

```graphql
# Mutation
mutation CreateOrder($input: OrderInput!) {
  createOrder(input: $input) {
    id
    total
  }
}

# All queries tagged with "orders" are invalidated:
# - orders @cache(tags: ["orders"])
# - orderDetails @cache(tags: ["orders", "reports"])
# - orderStats @cache(tags: ["orders", "stats"])
```

### Manual Invalidation with @invalidate_cache

Use the `@invalidate_cache` directive to invalidate cache during query execution:

```graphql
query {
  # Invalidate specific tag
  orders @invalidate_cache @cache(ttl: 300, tags: ["orders"]) {
    id
    total
  }
}
```

### Programmatic Cache Invalidation

For manual cache invalidation outside of queries, use the `core.cache.invalidate()` function. This is useful for:
- Invalidating cache from mutations or scripts
- Scheduled cache cleanup
- Administrative operations
- Event-driven invalidation

#### Function Definition

```graphql
extend type Function {
  invalidate(
    tags: [String!]
  ): OperationResult @function(name: "invalidate_cache", skip_null_arg: true) @module(name: "core.cache")
}

type OperationResult @system {
  success: Boolean
  affected_rows: BigInt
  last_id: BigInt
  message: String
}
```

#### Syntax

```graphql
query {
  function {
    core {
      cache {
        invalidate(tags: ["tag1", "tag2"]) {
          success
        }
      }
    }
  }
}
```

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `tags` | [String!] | Array of cache tags to invalidate. All cache entries with these tags will be removed. | Yes |

#### Return Value

Returns `OperationResult` with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | `true` if invalidation succeeded, `false` otherwise |
| `affected_rows` | BigInt | Number of cache entries invalidated (may be null) |
| `last_id` | BigInt | Not applicable for cache operations (typically null) |
| `message` | String | Optional message with additional information about the operation |

#### Examples

**Example 1: Invalidate Single Tag**

```graphql
mutation UpdateProducts($input: ProductInput!) {
  updateProduct(input: $input) {
    id
    name
  }

  # Invalidate all product-related caches
  invalidateCache: function {
    core {
      cache {
        invalidate(tags: ["products"]) {
          success
          affected_rows
          message
        }
      }
    }
  }
}
```

**Example 2: Invalidate Multiple Tags**

```graphql
mutation UpdateOrder($id: ID!, $input: OrderInput!) {
  updateOrder(id: $id, input: $input) {
    id
    total
  }

  # Invalidate multiple related caches
  invalidateCache: function {
    core {
      cache {
        invalidate(tags: ["orders", "sales", "analytics"]) {
          success
        }
      }
    }
  }
}
```

**Example 3: Administrative Cache Clear**

```graphql
mutation ClearDashboardCache {
  clearCache: function {
    core {
      cache {
        invalidate(tags: ["dashboard", "reports", "stats"]) {
          success
        }
      }
    }
  }
}
```

**Example 4: Scheduled Cache Refresh**

```graphql
# Can be executed by cron job or scheduler
query RefreshAnalyticsCache {
  # First, invalidate old cache
  invalidate: function {
    core {
      cache {
        invalidate(tags: ["analytics"]) {
          success
        }
      }
    }
  }

  # Then, fetch fresh data (will be cached)
  analytics: orders_aggregation @cache(ttl: 3600, tags: ["analytics"]) {
    _rows_count
    total_revenue { sum }
  }
}
```

**Example 5: Event-Driven Invalidation**

```graphql
mutation OnDataImport($status: String!) {
  # After successful data import
  logImport(status: $status) {
    success
  }

  # Invalidate all related caches
  invalidateCache: function @include(if: $status == "success") {
    core {
      cache {
        invalidate(tags: ["products", "categories", "inventory"]) {
          success
        }
      }
    }
  }
}
```

#### When to Use

**Use `core.cache.invalidate()` when**:
- You need to invalidate cache from mutations
- Performing administrative cache management
- Implementing scheduled cache refresh
- Handling event-driven invalidation
- Cache cleanup is independent of data queries

**Use `@invalidate_cache` directive when**:
- Invalidation is tied to a specific query
- You want to invalidate and immediately re-fetch data
- Invalidation is part of query logic

#### Best Practices

1. **Invalidate Specific Tags**: Only invalidate tags related to changed data
   ```graphql
   # ❌ Too broad
   invalidate(tags: ["all"])

   # ✅ Specific
   invalidate(tags: ["products:electronics"])
   ```

2. **Combine with Mutations**: Invalidate cache after data changes
   ```graphql
   mutation {
     updateProduct(id: 1, input: {...}) { id }
     function { core { cache { invalidate(tags: ["products"]) { success } } } }
   }
   ```

3. **Check Success Status**: Verify invalidation succeeded and review affected entries
   ```graphql
   mutation {
     result: function {
       core {
         cache {
           invalidate(tags: ["orders"]) {
             success
             affected_rows
             message
           }
         }
       }
     }
   }
   # Check result.function.core.cache.invalidate.success
   # Optionally log result.function.core.cache.invalidate.affected_rows
   ```

4. **Use Hierarchical Tags**: Invalidate at different levels
   ```graphql
   # Invalidate all orders
   invalidate(tags: ["orders"])

   # Invalidate only pending orders
   invalidate(tags: ["orders:pending"])
   ```

#### Integration Example

Complete example showing cache invalidation in a typical workflow:

```graphql
mutation CompleteProductUpdate {
  # 1. Update product data
  updateProduct(id: 123, input: {
    name: "New Product Name"
    price: 99.99
  }) {
    id
    name
    price
  }

  # 2. Invalidate related caches
  invalidateProductCache: function {
    core {
      cache {
        invalidate(tags: ["products", "catalog"]) {
          success
        }
      }
    }
  }

  # 3. Invalidate analytics cache
  invalidateAnalyticsCache: function {
    core {
      cache {
        invalidate(tags: ["analytics", "reports"]) {
          success
        }
      }
    }
  }
}

# Then fetch fresh data
query GetUpdatedProduct {
  product(filter: { id: 123 }) @cache(ttl: 300, tags: ["products"]) {
    id
    name
    price
  }
}
```

### Tag Naming Conventions

Establish consistent tag naming for better organization:

1. **Entity-Based Tags**:
   ```
   ["users"]
   ["products"]
   ["orders"]
   ```

2. **Hierarchical Tags**:
   ```
   ["orders", "orders:pending"]
   ["products", "products:electronics"]
   ```

3. **Feature-Based Tags**:
   ```
   ["dashboard"]
   ["reports"]
   ["analytics"]
   ```

4. **Cross-Cutting Tags**:
   ```
   ["sales"]  # orders + order_items + payments
   ["inventory"]  # products + stock + warehouses
   ```

## Practical Examples

### Example 1: Cache Static Reference Data

Cache rarely-changing reference data with long TTL:

```graphql
# Schema
type categories @table(name: "categories") @cache(ttl: 3600, tags: ["categories"]) {
  id: ID!
  name: String!
  description: String!
}

type countries @table(name: "countries") @cache(ttl: 86400, tags: ["countries"]) {
  id: ID!
  code: String!
  name: String!
}

# Query
query ReferenceData {
  categories @cache(ttl: 3600) {
    id
    name
  }

  countries @cache(ttl: 86400) {
    id
    code
    name
  }
}
```

### Example 2: Cache Expensive Aggregations

Cache complex aggregation queries to reduce database load:

```graphql
query SalesAnalytics {
  # Expensive aggregation - cache for 10 minutes
  salesByCategory: orders_bucket_aggregation(
    filter: { created_at: { gte: "2024-01-01" } }
  ) @cache(ttl: 600, key: "analytics:sales:by_category:2024", tags: ["analytics"]) {
    key { category }
    aggregations {
      total_revenue { sum }
      avg_order_value { avg }
      _rows_count
    }
  }

  # Another expensive query
  topCustomers: customers_aggregation(
    order: { total_spent: DESC }
    limit: 100
  ) @cache(ttl: 600, key: "analytics:top_customers", tags: ["analytics"]) {
    id
    name
    total_spent
    order_count
  }
}
```

### Example 3: Per-User Cache Isolation

Automatically isolated cache entries per user role:

```graphql
query UserDashboard($userId: ID!) {
  # Admin sees all users, regular user sees only themselves
  # Automatic cache isolation by role
  user(filter: { id: $userId }) @cache(ttl: 300) {
    id
    name
    email
    orders {
      id
      total
    }
  }

  # Global stats - shared across all roles
  globalStats: statistics_aggregation
    @cache(ttl: 600, key: "dashboard:global") {
    total_users
    total_orders
  }
}
```

### Example 4: Invalidate Cache on Data Change

Ensure fresh data after mutations using `core.cache.invalidate()`:

```graphql
# Update product price and invalidate cache
mutation UpdateProductPrice($id: ID!, $price: Float!) {
  # 1. Update the data
  updateProduct(id: $id, input: { price: $price }) {
    id
    price
  }

  # 2. Invalidate related caches programmatically
  invalidateCache: function {
    core {
      cache {
        invalidate(tags: ["products", "catalog"]) {
          success
        }
      }
    }
  }
}

# Subsequent queries will get fresh data
query {
  products @cache(ttl: 300, tags: ["products"]) {
    id
    name
    price
  }
}
```

**Alternative: Using @invalidate_cache directive**

```graphql
# Fetch updated products with directive
query {
  products @invalidate_cache @cache(ttl: 300, tags: ["products"]) {
    id
    name
    price
  }
}
```

### Example 5: Mixed Caching Strategies

Combine different caching approaches in a single query:

```graphql
query Dashboard {
  # Long TTL for static data
  categories @cache(ttl: 3600) {
    id
    name
  }

  # Medium TTL for product catalog
  products @cache(ttl: 300, tags: ["products"]) {
    id
    name
    price
  }

  # Short TTL for real-time data
  activeOrders: orders(
    filter: { status: "pending" }
  ) @cache(ttl: 60, tags: ["orders"]) {
    id
    customer_id
    total
  }

  # No cache for user-specific data
  currentUser: users @no_cache {
    id
    name
    recent_activity
  }
}
```

### Example 6: Cache with @cache in queryHugr()

When using JQ transformations, cache nested queries within `queryHugr()`:

```graphql
query {
  enrichedCustomers: jq(query: "
    # Cache the aggregation query
    queryHugr(\"
      query {
        customer_stats: customers_bucket_aggregation @cache(ttl: 600, tags: [\\\"stats\\\"]) {
          key { tier }
          aggregations {
            _rows_count
            total_spent { sum avg }
          }
        }
      }
    \").data.customer_stats as $stats |

    # Enrich each customer with cached tier stats
    .customers | map(
      . as $customer |
      . + {
        tier_stats: ($stats | map(select(.key.tier == $customer.tier)) | .[0])
      }
    )
  ", include_origin: false) {
    customers {
      id
      name
      tier
    }
  }
}
```

**Benefits**:
- The aggregation query executes only once (cached)
- All customer records share the same cached stats
- Significant performance improvement for large datasets

See [JQ Transformations - Caching queryHugr() Results](/docs/graphql/jq-transformations#caching-queryhugr-results) for more details.

### Example 7: Bypass Cache for Real-Time Data

Mix cached and real-time data in the same query:

```graphql
query ProductInventory {
  # Cached product details
  products @cache(ttl: 300) {
    id
    name
    price
    category
  }

  # Real-time inventory - never cached
  inventory: products @no_cache {
    id
    stock_quantity
    warehouse_location
    last_updated
  }
}
```

### Example 8: Caching Role Permissions

Cache role permissions for improved authentication and authorization performance. This is a critical use case where caching significantly reduces database load for permission checks.

#### How Hugr Caches Role Permissions

Hugr automatically caches role permissions using a specific cache key pattern and tag:

```graphql
query ($role: String!, $cacheKey: String) {
  core {
    info: roles_by_pk(name: $role) @cache(key: $cacheKey, tags: ["$role_permissions"]) {
      name
      disabled
      permissions {
        type_name
        field_name
        hidden
        disabled
        filter
        data
      }
    }
  }
}
```

**Cache Key Format**: `RolePermissions:{role_name}`
**Cache Tag**: `$role_permissions`

#### Querying Role Permissions with Cache

```graphql
query GetRolePermissions($roleName: String!) {
  core {
    roleInfo: roles_by_pk(name: $roleName)
      @cache(
        key: "RolePermissions:admin",  # Or dynamically: concat("RolePermissions:", $roleName)
        tags: ["$role_permissions"]
      ) {
      name
      disabled
      permissions {
        type_name
        field_name
        hidden
        disabled
        filter
        data
      }
    }
  }
}
```

**Benefits**:
- Permissions are cached per role
- Reduces database queries for authorization checks
- Improves API response times
- Scales well with multiple concurrent users

#### Invalidating Role Permissions Cache

When role permissions change, invalidate the cache to ensure users get updated permissions:

**Method 1: Invalidate All Role Permissions (Recommended)**

```graphql
mutation UpdateRolePermissions($roleName: String!, $permissions: [PermissionInput!]!) {
  # Update role permissions
  updateRole(name: $roleName, permissions: $permissions) {
    name
    permissions {
      type_name
      field_name
    }
  }

  # Invalidate all role permissions cache
  invalidatePermissions: function {
    core {
      cache {
        invalidate(tags: ["$role_permissions"]) {
          success
          affected_rows
          message
        }
      }
    }
  }
}
```

**Method 2: Invalidate Specific Role**

```graphql
query RefreshRolePermissions($roleName: String!) {
  core {
    # Invalidate and re-fetch specific role
    roleInfo: roles_by_pk(name: $roleName)
      @invalidate_cache
      @cache(
        key: "RolePermissions:admin",
        tags: ["$role_permissions"]
      ) {
      name
      permissions {
        type_name
        field_name
      }
    }
  }
}
```

**Method 3: Programmatic Invalidation by Tag**

```graphql
mutation ClearAllRolePermissionsCache {
  clearCache: function {
    core {
      cache {
        invalidate(tags: ["$role_permissions"]) {
          success
          affected_rows
          message
        }
      }
    }
  }
}
```

#### Complete Workflow Example

```graphql
# 1. Create or update role
mutation UpdateAdminRole {
  updateRole(
    name: "admin",
    permissions: [
      { type_name: "users", field_name: "*", disabled: false },
      { type_name: "orders", field_name: "*", disabled: false }
    ]
  ) {
    name
    permissions {
      type_name
      field_name
    }
  }

  # 2. Invalidate role permissions cache
  invalidatePermissions: function {
    core {
      cache {
        invalidate(tags: ["$role_permissions"]) {
          success
          affected_rows
          message
        }
      }
    }
  }
}

# 3. Next request will fetch fresh permissions from database
query GetAdminPermissions {
  core {
    admin: roles_by_pk(name: "admin")
      @cache(
        key: "RolePermissions:admin",
        tags: ["$role_permissions"],
        ttl: 3600  # Cache for 1 hour
      ) {
      name
      disabled
      permissions {
        type_name
        field_name
        hidden
        disabled
        filter
        data
      }
    }
  }
}
```

#### Best Practices for Permission Caching

1. **Use Consistent Cache Keys**
   - Always use format: `RolePermissions:{role_name}`
   - Ensures predictable cache behavior
   - Easy to debug and monitor

2. **Long TTL for Permissions**
   - Permissions change infrequently
   - Use TTL of 1-24 hours
   - Rely on manual invalidation after updates

3. **Always Invalidate After Changes**
   - Invalidate cache immediately after role updates
   - Use `$role_permissions` tag to clear all roles
   - Consider security implications of stale permissions

4. **Monitor Cache Effectiveness**
   - Track `affected_rows` to see how many entries were cleared
   - Monitor permission check latency
   - Alert on failed invalidations

5. **Graceful Fallback**
   - If cache invalidation fails, consider forcing refresh
   - Log failures for security auditing
   - Have monitoring for stale permissions

#### Security Considerations

**⚠️ Important**: Stale permission cache can lead to security issues:

- **Always invalidate** after permission changes
- **Verify invalidation success** in mutations
- **Use short TTLs** for highly sensitive roles
- **Consider real-time invalidation** for critical permissions

```graphql
mutation UpdateCriticalPermissions($roleName: String!) {
  updateRole(name: $roleName, permissions: [...]) {
    name
  }

  # Verify invalidation succeeded
  invalidateResult: function {
    core {
      cache {
        invalidate(tags: ["$role_permissions"]) {
          success
          message
        }
      }
    }
  }
}

# Check: invalidateResult.function.core.cache.invalidate.success === true
```

#### Performance Impact

**Without Caching**:
- Permission check on every request
- 50-100ms database query per request
- High database load

**With Caching**:
- Permission check from cache (1-5ms)
- Reduced database load by 90%+
- Better response times for users
- Scales to thousands of concurrent users

## Integration with Caching Infrastructure

Cache directives seamlessly integrate with hugr's [caching infrastructure](/docs/deployment/caching).

### How Directives Interact with L1/L2 Cache

When you use `@cache`, the behavior depends on your cache configuration:

**With Both L1 and L2 Enabled** (two-tier caching):

1. **First Request**:
   - Check L1 cache (in-memory)
   - If miss, check L2 cache (Redis/Memcached)
   - If miss, execute query
   - Store result in both L1 and L2 caches

2. **Subsequent Requests**:
   - Serve from L1 cache (fastest)
   - If L1 expires, serve from L2 cache
   - If both expire, re-execute query

**With L1 Only** (in-memory caching):
   - Cache stored only in Hugr server memory
   - Fast access, but not shared across multiple Hugr instances
   - Cache lost on server restart

**With L2 Only** (direct distributed caching):
   - Cache goes directly to Redis/Memcached
   - Shared across all Hugr instances
   - Survives server restarts
   - Slightly higher latency than L1, but still much faster than database

### Cache Configuration Requirements

To use cache directives, enable at least one cache level in your deployment. You can use L1, L2, or both:

**Option 1: L1 Only (In-Memory)**
```bash
# In-memory cache only
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512  # MB
CACHE_TTL=5m
```

**Option 2: L2 Only (Distributed)**
```bash
# Direct distributed cache without L1
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis:6379
CACHE_TTL=5m
```

**Option 3: Both L1 and L2 (Recommended for Production)**
```bash
# Two-tier caching for optimal performance
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=512  # MB
CACHE_L2_ENABLED=true
CACHE_L2_BACKEND=redis
CACHE_L2_ADDRESSES=redis:6379
CACHE_TTL=5m
```

:::tip Configuration Choice
- **L1 only**: Best for single-instance deployments
- **L2 only**: Best when you need cache sharing but want to minimize Hugr server memory usage
- **Both**: Best for high-traffic production with multiple Hugr instances
:::

See [Caching Configuration](/docs/deployment/caching) for full setup details.

### Link to Deployment Caching Configuration

For detailed information on:
- L1 cache configuration (`CACHE_L1_*`)
- L2 cache configuration (`CACHE_L2_*`)
- Redis and Memcached setup
- Docker Compose examples
- Performance tuning

See the [Deployment - Caching](/docs/deployment/caching) guide.

## Best Practices

### When to Use Schema-Level vs Query-Time Caching

**Use Schema-Level Caching** when:
- Most queries for a type should be cached
- Consistent TTL across all queries
- Automatic cache invalidation on mutations

```graphql
type products @table(name: "products") @cache(ttl: 300, tags: ["products"]) {
  id: ID!
  name: String!
}
```

**Use Query-Time Caching** when:
- Different queries need different TTLs
- Only specific queries should be cached
- Need custom cache keys

```graphql
query {
  expensive: products_aggregation @cache(ttl: 600, key: "expensive_query") {
    # ...
  }

  cheap: products @cache(ttl: 60) {
    # ...
  }
}
```

### Choosing Appropriate TTL Values

| Data Characteristics | Recommended TTL | Example |
|---------------------|----------------|---------|
| Real-time, constantly changing | 30-60 seconds | Stock prices, live scores |
| Frequently updated | 1-5 minutes | Social media feeds, news |
| Moderately updated | 5-15 minutes | Product listings, inventory |
| Rarely updated | 15-60 minutes | User profiles, categories |
| Static reference data | 1-24 hours | Countries, currencies, settings |

### Tag Organization Strategies

1. **Entity-Based**: Tag by data entity
   ```graphql
   tags: ["users"]
   tags: ["products"]
   ```

2. **Feature-Based**: Tag by feature area
   ```graphql
   tags: ["dashboard"]
   tags: ["analytics"]
   ```

3. **Hierarchical**: Use nested tags
   ```graphql
   tags: ["orders", "orders:pending"]
   tags: ["products", "products:electronics"]
   ```

4. **Cross-Cutting**: Tag related entities
   ```graphql
   tags: ["sales"]  # orders + payments + invoices
   ```

### Cache Key Design

1. **Use Predictable Patterns**:
   ```
   {entity}:{operation}:{identifier}
   products:list:electronics
   orders:detail:12345
   ```

2. **Include Version** for schema changes:
   ```
   products:v2:list
   ```

3. **Avoid Dynamic Parts** unless necessary:
   ```
   ❌ products:list:2024-01-15-14-30-22  # timestamp changes too often
   ✅ products:list:2024-01-15  # stable daily cache
   ```

### Avoiding Cache Stampede

When cache expires, avoid multiple simultaneous queries:

1. **Stagger TTLs**:
   ```graphql
   products @cache(ttl: 300)  # 5 min
   categories @cache(ttl: 310)  # 5 min 10 sec
   brands @cache(ttl: 320)  # 5 min 20 sec
   ```

2. **Use Longer TTLs** with explicit invalidation:
   ```graphql
   products @cache(ttl: 3600, tags: ["products"])  # 1 hour
   # Invalidate on mutations instead of waiting for TTL
   ```

### Memory Considerations

1. **Monitor Cache Size**: Track L1 cache memory usage
2. **Adjust `CACHE_L1_MAX_SIZE`** based on available memory
3. **Use Appropriate TTLs**: Don't cache more than necessary
4. **Consider Result Size**: Large results consume more memory

```graphql
# Large result set - shorter TTL
allProducts: products @cache(ttl: 60) {
  # ...all fields...
}

# Small result set - longer TTL
productCount: products_aggregation @cache(ttl: 600) {
  _rows_count
}
```

## Performance Considerations

### Cache Hit Ratio Optimization

Monitor and optimize your cache hit ratio:

1. **Identify Hot Queries**: Cache frequently-executed queries
2. **Adjust TTLs**: Balance freshness vs hit ratio
3. **Use Custom Keys**: Share cache across similar queries

```graphql
# Before: Each user's query creates separate cache entry
query UserProducts($userId: ID!) {
  products(filter: { user_id: $userId }) @cache(ttl: 300) {
    id
    name
  }
}

# After: All users share the same product list
query AllProducts {
  products @cache(ttl: 300, key: "products:list") {
    id
    name
  }
}
```

### Impact on Query Performance

**Cache Hit** (fastest):
```
Query → L1 Cache → Response
Time: 1-5ms
```

**L1 Miss, L2 Hit** (fast):
```
Query → L1 Miss → L2 Cache → Response
Time: 5-20ms
```

**Cache Miss** (slower):
```
Query → L1 Miss → L2 Miss → Database → Response → Cache
Time: 50-500ms+ (depends on query complexity)
```

### Cache Warming Strategies

Pre-populate cache to improve initial performance:

1. **Post-Deployment Warming**:
   ```graphql
   # Execute critical queries after deployment
   query WarmCache {
     categories @cache(ttl: 3600) { id name }
     products @cache(ttl: 600) { id name price }
     popularProducts: products(filter: { views: { gte: 1000 } }) @cache(ttl: 300) { id name }
   }
   ```

2. **Scheduled Refresh**:
   ```bash
   # Cron job to refresh cache before TTL expiration
   */4 * * * * curl -X POST https://api.example.com/graphql \
     -d '{"query": "query { products @cache(ttl: 300) { id name } }"}'
   ```

3. **Pre-Load Critical Data**:
   ```graphql
   # On server startup, execute important queries
   query PreloadCache {
     globalStats @cache(ttl: 600, key: "global:stats") { total_users total_orders }
     categories @cache(ttl: 3600) { id name }
   }
   ```

### Monitoring Cache Effectiveness

Track these metrics:

1. **Cache Hit Ratio**: `(cache_hits / total_requests) * 100`
   - Target: &gt;70% for frequently-accessed data

2. **Average Response Time**:
   - Cached: &lt;10ms
   - Uncached: &gt;50ms

3. **Cache Memory Usage**:
   - Monitor L1 cache size
   - Alert if approaching `CACHE_L1_MAX_SIZE`

4. **Cache Evictions**:
   - Frequent evictions may indicate insufficient cache size

## Common Patterns

### Pattern 1: Caching Read-Heavy Queries

For queries that are frequently read but rarely updated:

```graphql
type products @table(name: "products") @cache(ttl: 600, tags: ["products"]) {
  id: ID!
  name: String!
  price: Float!
}

query ProductCatalog {
  products @cache(ttl: 600, tags: ["products"]) {
    id
    name
    price
    category
  }
}

# On product update, invalidate cache
mutation UpdateProduct($id: ID!, $input: ProductInput!) {
  updateProduct(id: $id, input: $input) {
    id
    name
    price
  }
}

query RefreshProducts {
  products @invalidate_cache @cache(ttl: 600, tags: ["products"]) {
    id
    name
    price
  }
}
```

### Pattern 2: Cache-Aside Pattern

Manually control when to use cache vs fresh data:

```graphql
query Dashboard($useCache: Boolean!) {
  # Use cache when useCache = true
  stats: statistics_aggregation @cache(ttl: 300) @skip(if: !$useCache) {
    total_users
    total_orders
  }

  # Skip cache when useCache = false
  freshStats: statistics_aggregation @no_cache @include(if: !$useCache) {
    total_users
    total_orders
  }
}
```

### Pattern 3: Write-Through Caching

Update cache immediately after mutations:

```graphql
mutation CreateProduct($input: ProductInput!) {
  createProduct(input: $input) {
    id
    name
    price
  }
}

# Immediately update cache with new data
query {
  products @invalidate_cache @cache(ttl: 600, tags: ["products"]) {
    id
    name
    price
  }
}
```

### Pattern 4: Time-Based Invalidation

Different invalidation strategies based on time:

```graphql
query {
  # Short TTL - expires quickly
  recentOrders: orders(
    filter: { created_at: { gte: "2024-01-01" } }
  ) @cache(ttl: 60) {
    id
    total
  }

  # Long TTL - historical data rarely changes
  historicalOrders: orders(
    filter: { created_at: { lt: "2023-01-01" } }
  ) @cache(ttl: 86400) {
    id
    total
  }
}
```

### Pattern 5: Event-Based Invalidation

Invalidate cache when specific events occur:

```graphql
# Event: New order created
mutation CreateOrder($input: OrderInput!) {
  createOrder(input: $input) {
    id
    total
  }
}

# Invalidate all order-related caches
query {
  orders @invalidate_cache @cache(ttl: 300, tags: ["orders"]) {
    id
    total
  }

  orderStats @invalidate_cache @cache(ttl: 300, tags: ["orders", "stats"]) {
    _rows_count
    total_revenue { sum }
  }
}
```

## Troubleshooting

### Cache Not Working

**Symptoms**: Queries are not cached, always hitting the database

**Possible Causes**:

1. **Caching not enabled**:
   ```bash
   # Check configuration - at least one must be enabled
   CACHE_L1_ENABLED=true  # For in-memory cache
   # OR
   CACHE_L2_ENABLED=true  # For distributed cache
   # OR both for two-tier caching
   ```

2. **Directive missing or incorrect**:
   ```graphql
   # ❌ No directive
   query { products { id name } }

   # ✅ With directive
   query { products @cache(ttl: 300) { id name } }
   ```

3. **TTL too short**:
   ```graphql
   # If TTL is too short, cache expires immediately
   products @cache(ttl: 1) { id }  # ❌ Only 1 second

   products @cache(ttl: 300) { id }  # ✅ 5 minutes
   ```

4. **Cache key collision**:
   ```graphql
   # Different queries with same custom key
   products @cache(key: "products") { id name }
   products @cache(key: "products") { id price }  # ❌ Same key!

   # Use unique keys
   products @cache(key: "products:basic") { id name }
   products @cache(key: "products:full") { id price }
   ```

### Stale Data Issues

**Symptoms**: Cache returns outdated data after mutations

**Solutions**:

1. **Use `@invalidate_cache`** after mutations:
   ```graphql
   mutation UpdateProduct($id: ID!, $input: ProductInput!) {
     updateProduct(id: $id, input: $input) {
       id
       price
     }
   }

   # Invalidate after mutation
   query {
     products @invalidate_cache @cache(ttl: 300, tags: ["products"]) {
       id
       price
     }
   }
   ```

2. **Reduce TTL** for frequently-updated data:
   ```graphql
   # Before
   products @cache(ttl: 3600) { id price }  # ❌ 1 hour is too long

   # After
   products @cache(ttl: 60) { id price }  # ✅ 1 minute
   ```

3. **Use tags** for automatic invalidation:
   ```graphql
   type products @table(name: "products") @cache(ttl: 300, tags: ["products"]) {
     id: ID!
     price: Float!
   }

   # Mutations automatically invalidate "products" tag
   ```

### Cache Key Collisions

**Symptoms**: Different queries return the same cached results

**Cause**: Custom keys are not unique enough

**Solution**: Use more specific keys:

```graphql
# ❌ Collision risk
query A { products(filter: { category: "electronics" }) @cache(key: "products") { id } }
query B { products(filter: { category: "books" }) @cache(key: "products") { id } }

# ✅ Unique keys
query A { products(filter: { category: "electronics" }) @cache(key: "products:electronics") { id } }
query B { products(filter: { category: "books" }) @cache(key: "products:books") { id } }

# ✅ Or use auto-generated keys (no key parameter)
query A { products(filter: { category: "electronics" }) @cache(ttl: 300) { id } }
query B { products(filter: { category: "books" }) @cache(ttl: 300) { id } }
```

### Memory Pressure

**Symptoms**: High memory usage, frequent evictions, OOM errors

**Solutions**:

1. **Increase `CACHE_L1_MAX_SIZE`**:
   ```bash
   # Before
   CACHE_L1_MAX_SIZE=512  # MB

   # After
   CACHE_L1_MAX_SIZE=1024  # MB
   ```

2. **Reduce TTLs** to expire entries faster:
   ```graphql
   # Before
   products @cache(ttl: 3600) { ... }

   # After
   products @cache(ttl: 300) { ... }
   ```

3. **Cache only necessary data**:
   ```graphql
   # ❌ Caching large result sets
   query { products @cache(ttl: 600) { id name description long_text images } }

   # ✅ Cache only needed fields
   query { products @cache(ttl: 600) { id name } }
   ```

4. **Use L2 cache** (Redis/Memcached) for larger datasets:
   ```bash
   CACHE_L2_ENABLED=true
   CACHE_L2_BACKEND=redis
   CACHE_L2_ADDRESSES=redis:6379
   ```

5. **Adjust eviction settings**:
   ```bash
   CACHE_L1_EVICTION_TIME=15m  # Reduce from 30m
   CACHE_L1_CLEAN_TIME=5m  # More frequent cleanup
   ```

## See Also

- **[Deployment - Caching Configuration](/docs/deployment/caching)**: L1/L2 cache setup, Redis/Memcached configuration
- **[Directives Reference](/docs/references/directives)**: Complete directive reference including `@cache`, `@no_cache`, `@invalidate_cache`
- **[JQ Transformations - Caching queryHugr()](/docs/graphql/jq-transformations#caching-queryhugr-results)**: Using `@cache` in nested queries within JQ expressions
- **[Function Calls](/docs/graphql/queries/function-calls)**: Information about `core.cache.invalidate()` and other built-in functions
- **[GraphQL Queries](/docs/graphql/queries)**: General information about querying in hugr

---

**Next Steps**:

1. Enable caching in your deployment - see [Caching Configuration](/docs/deployment/caching)
2. Add `@cache` to your most expensive queries
3. Monitor cache hit ratio and adjust TTLs
4. Use tags for organized cache invalidation
5. Implement cache warming for critical queries
