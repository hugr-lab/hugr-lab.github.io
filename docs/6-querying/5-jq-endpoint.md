---
title: "JQ Query Endpoint"
sidebar_position: 5
description: REST API endpoint for executing GraphQL queries with JQ transformations
keywords: [jq, rest, api, endpoint, transformations, caching]
---

# JQ Query Endpoint

The `/jq-query` REST endpoint provides a powerful way to execute GraphQL queries with server-side JQ transformations. Unlike the built-in `jq()` GraphQL query, this endpoint returns the transformation result directly as the HTTP response and provides access to the complete GraphQL response (including errors) within JQ expressions.

## Overview

The `/jq-query` endpoint is designed for scenarios where you need:
- Direct transformation results without GraphQL envelope
- Access to GraphQL errors in JQ expressions
- HTTP-based caching control via headers
- Standalone data processing pipelines
- Integration with non-GraphQL clients

## Endpoint Details

**Method**: `POST`

**URL**: `/jq-query`

**Content-Type**: `application/json`

## Request Format

### Headers

#### Required Headers

```
Content-Type: application/json
```

#### Optional Authentication

```
Authorization: Bearer <token>
```

Use when your hugr instance requires authentication.

#### Optional Caching Headers

When hugr has caching configured (see [Caching Configuration](../7-deployment/2-caching.md)), you can control caching behavior:

```
X-Hugr-Cache: <ttl_seconds or duration>
X-Hugr-Cache-Key: <custom_cache_key>
X-Hugr-Cache-Tags: <tag1,tag2,tag3>
X-Hugr-Cache-Invalidate: <true|false>
```

**Caching Headers Reference**:

| Header | Type | Description |
|--------|------|-------------|
| `X-Hugr-Cache` | String | Cache TTL (time-to-live). Accepts seconds (e.g., `300`) or duration format (e.g., `5m`, `1h`, `30s`). |
| `X-Hugr-Cache-Key` | String | Custom cache key. If omitted, computed as hash of request body. User's role is automatically appended. |
| `X-Hugr-Cache-Tags` | String | Comma-separated list of tags for grouped cache invalidation (e.g., `users,analytics,reports`). |
| `X-Hugr-Cache-Invalidate` | Boolean | When `true`, invalidates existing cache entry and re-executes query. |

**Cache Key Format**: `<custom_key or hash(request_body)>:<user_role>`

### Request Body

```json
{
  "jq": "<jq_expression>",
  "query": {
    "query": "<graphql_query>",
    "variables": {
      "var1": "value1",
      "var2": "value2"
    },
    "operationName": "<operation_name>"
  }
}
```

**Fields**:
- **jq** (string, required): JQ expression to apply to the GraphQL response
- **query** (object, required): GraphQL query details
  - **query** (string, required): GraphQL query text
  - **variables** (object, optional): Query variables
  - **operationName** (string, optional): Operation name for named queries

### JQ Input

The JQ expression receives the **complete GraphQL response**, including:
- `data` - Query results
- `extensions` - Extensions object
- `errors` - GraphQL errors (if any)

This is different from the built-in `jq()` query, which only receives the `data` field.

## Response Format

### Success Response

**HTTP Status**: `200 OK`

**Body**: The result of the JQ transformation (direct output, no GraphQL envelope)

```json
<jq_transformation_result>
```

The response format depends on your JQ expression:
- Array if JQ returns an array
- Object if JQ returns an object
- Primitive value if JQ returns a string/number/boolean

### Error Response

**HTTP Status**: `400 Bad Request`, `401 Unauthorized`, or `500 Internal Server Error`

**Body**:
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Successful transformation |
| `400 Bad Request` | Invalid JQ expression or GraphQL query syntax |
| `401 Unauthorized` | Missing or invalid authentication |
| `500 Internal Server Error` | Server-side error during processing |

## Examples

### Basic Query

Execute a simple GraphQL query and transform the result:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.users | map({id, name})",
    "query": {
      "query": "{ users { id name email created_at } }"
    }
  }'
```

**Response**:
```json
[
  {"id": 1, "name": "Alice"},
  {"id": 2, "name": "Bob"},
  {"id": 3, "name": "Charlie"}
]
```

### Query with Variables

Use GraphQL variables and access them in JQ:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.users | map(select(.country == $country))",
    "query": {
      "query": "query($country: String!) { users { id name country } }",
      "variables": {
        "country": "USA"
      }
    }
  }'
```

**Response**:
```json
[
  {"id": 1, "name": "Alice", "country": "USA"},
  {"id": 5, "name": "David", "country": "USA"}
]
```

### Error Handling

Handle GraphQL errors gracefully in JQ:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": "if .errors then {error: \"Query failed\", details: .errors} else .data.users end",
    "query": {
      "query": "{ users { id name invalid_field } }"
    }
  }'
```

**Response** (when query has errors):
```json
{
  "error": "Query failed",
  "details": [
    {
      "message": "Cannot query field 'invalid_field' on type 'User'",
      "locations": [{"line": 1, "column": 20}]
    }
  ]
}
```

### With Authentication

Include Bearer token for authenticated requests:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "jq": ".data.orders | map({id, total, customer: .customer.name})",
    "query": {
      "query": "{ orders { id total customer { name } } }"
    }
  }'
```

### Caching with TTL

Cache results for 5 minutes:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 5m" \
  -H "X-Hugr-Cache-Tags: users,analytics" \
  -d '{
    "jq": ".data.users_aggregation",
    "query": {
      "query": "{ users_aggregation { _rows_count total_revenue { sum } } }"
    }
  }'
```

**First request**: Executes query, caches result for 5 minutes
**Subsequent requests** (within 5 min): Returns cached result instantly

### Custom Cache Key

Use meaningful cache keys for dashboard queries:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 300" \
  -H "X-Hugr-Cache-Key: dashboard:daily-stats:2024-01-15" \
  -H "X-Hugr-Cache-Tags: dashboard,analytics,daily" \
  -d '{
    "jq": ".data | {users: .users_aggregation._rows_count, orders: .orders_aggregation._rows_count, revenue: .orders_aggregation.total.sum}",
    "query": {
      "query": "{ users_aggregation { _rows_count } orders_aggregation { _rows_count total { sum } } }"
    }
  }'
```

**Cache Key**: `dashboard:daily-stats:2024-01-15:<user_role>`
**TTL**: 300 seconds (5 minutes)

### Cache Invalidation

Force cache refresh when underlying data changes:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 1h" \
  -H "X-Hugr-Cache-Key: product-catalog" \
  -H "X-Hugr-Cache-Invalidate: true" \
  -d '{
    "jq": ".data.products | group_by(.category)",
    "query": {
      "query": "{ products { id name category price } }"
    }
  }'
```

This request:
1. Invalidates cache for key `product-catalog:<role>`
2. Executes the query
3. Caches new result with 1-hour TTL

### Complex Transformation

Transform nested data into flat structure:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.customers | map(.orders[] | {customer_id: .customer_id, customer_name: .customer_name, order_id: .id, order_total: .total}) | flatten",
    "query": {
      "query": "{ customers { id name as customer_name orders { id customer_id: id total } } }"
    }
  }'
```

### Aggregation and Grouping

Group and aggregate data:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 10m" \
  -d '{
    "jq": ".data.orders | group_by(.status) | map({status: .[0].status, count: length, total: map(.amount) | add, avg: (map(.amount) | add / length)})",
    "query": {
      "query": "{ orders { id status amount } }"
    }
  }'
```

**Response**:
```json
[
  {
    "status": "completed",
    "count": 150,
    "total": 45000,
    "avg": 300
  },
  {
    "status": "pending",
    "count": 25,
    "total": 7500,
    "avg": 300
  },
  {
    "status": "cancelled",
    "count": 10,
    "total": 2000,
    "avg": 200
  }
]
```

## Use Cases

### Data Export Pipelines

Transform GraphQL data into formats required by external systems:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.orders | map({order_id: .id, customer: .customer.email, items: (.items | map(.product.name) | join(\", \")), total: .total})",
    "query": {
      "query": "{ orders { id total customer { email } items { product { name } } } }"
    }
  }' > orders_export.json
```

### Dashboard Data Feed

Prepare data for BI dashboards with caching:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 15m" \
  -H "X-Hugr-Cache-Key: dashboard:sales-overview" \
  -d '{
    "jq": "{summary: {total_orders: .data.orders_aggregation._rows_count, total_revenue: .data.orders_aggregation.total.sum, avg_order_value: (.data.orders_aggregation.total.sum / .data.orders_aggregation._rows_count)}, by_status: (.data.status_breakdown.key | map({status: .status, count: .aggregations._rows_count}))}",
    "query": {
      "query": "{ orders_aggregation { _rows_count total { sum } } status_breakdown: orders_bucket_aggregation { key { status } aggregations { _rows_count } } }"
    }
  }'
```

### Webhook Data Transformation

Transform data before sending to webhooks:

```bash
# Get transformed data
DATA=$(curl -s -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.new_orders | map({id, customer_email: .customer.email, total})",
    "query": {
      "query": "{ new_orders: orders(filter: {status: {eq: \"new\"}}) { id total customer { email } } }"
    }
  }')

# Send to webhook
curl -X POST https://example.com/webhook \
  -H "Content-Type: application/json" \
  -d "$DATA"
```

### Report Generation

Generate structured reports:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -H "X-Hugr-Cache: 1h" \
  -d '{
    "jq": "{report_date: now | strftime(\"%Y-%m-%d\"), metrics: {total_users: .data.users_aggregation._rows_count, active_users: .data.active_users._rows_count, conversion_rate: ((.data.orders_aggregation._rows_count / .data.users_aggregation._rows_count) * 100 | floor)}}",
    "query": {
      "query": "{ users_aggregation { _rows_count } active_users: users_aggregation(filter: {last_login: {gte: \"2024-01-01\"}}) { _rows_count } orders_aggregation { _rows_count } }"
    }
  }'
```

## Comparison with Built-in jq() Query

| Feature | Built-in jq() | /jq-query Endpoint |
|---------|---------------|-------------------|
| **JQ Input** | Only `data` field | Complete GraphQL response (`data`, `extensions`, `errors`) |
| **Response Format** | GraphQL response with `extensions.jq` | Direct JQ result as HTTP response |
| **Original Data** | In `data` field | Not preserved (unless included in JQ) |
| **Error Access** | Not available to JQ | Available in `.errors` field |
| **Caching** | Via `@cache` directive | Via HTTP headers (`X-Hugr-Cache-*`) |
| **Use Case** | Inline transformations in GraphQL | Standalone transformations, data pipelines |
| **Client Integration** | GraphQL clients | Any HTTP client (curl, fetch, axios) |
| **Chaining** | Easy (nested jq queries) | Manual (multiple requests) |

## Best Practices

### 1. Use Appropriate Cache TTL

Choose cache duration based on data volatility:

```bash
# Real-time data: short TTL
X-Hugr-Cache: 30s

# Semi-static data: medium TTL
X-Hugr-Cache: 5m

# Static/reference data: long TTL
X-Hugr-Cache: 1h
```

### 2. Tag Related Queries

Use tags for easier cache management:

```bash
# Tag by feature area
X-Hugr-Cache-Tags: dashboard,sales,analytics

# Invalidate all dashboard queries later
# (implementation depends on cache backend)
```

### 3. Meaningful Cache Keys

Use descriptive keys for better observability:

```bash
# Good: Descriptive
X-Hugr-Cache-Key: report:monthly-sales:2024-01

# Less optimal: Auto-generated
# (omit header to use request body hash)
```

### 4. Handle Errors in JQ

Always check for GraphQL errors:

```bash
"jq": "if .errors then {error: .errors[0].message} else .data.users end"
```

### 5. Filter in GraphQL, Not JQ

Apply filters in GraphQL for better performance:

```bash
# Good: Filter in GraphQL
{
  "jq": ".data.users | map({id, name})",
  "query": {
    "query": "{ users(filter: {active: {eq: true}}) { id name } }"
  }
}

# Less efficient: Filter in JQ
{
  "jq": ".data.users | map(select(.active == true)) | map({id, name})",
  "query": {
    "query": "{ users { id name active } }"
  }
}
```

### 6. Limit Data Volume

Use GraphQL `limit` to reduce processing:

```bash
{
  "query": {
    "query": "{ users(limit: 100) { id name } }"
  }
}
```

### 7. Invalidate Cache on Data Changes

Force refresh when source data changes:

```bash
# After updating products
curl -X POST http://localhost:8080/jq-query \
  -H "X-Hugr-Cache: 1h" \
  -H "X-Hugr-Cache-Key: product-catalog" \
  -H "X-Hugr-Cache-Invalidate: true" \
  -d '{...}'
```

## Security Considerations

### Authentication

Always use authentication for production:

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}'
```

### Access Control

JQ transformations respect the same access control as GraphQL queries. Users can only access data they're authorized to see.

### Sensitive Data

Remove sensitive fields in JQ expressions:

```bash
"jq": ".data.users | map({id, name} | del(.ssn, .password))"
```

### Rate Limiting

Implement rate limiting on the /jq-query endpoint to prevent abuse.

## Troubleshooting

### Invalid JQ Expression

**Error**: `400 Bad Request - "Invalid JQ expression"`

**Solution**: Test your JQ expression using the [jq command-line tool](https://jqlang.github.io/jq/) or [jqplay.org](https://jqplay.org/)

### Cache Not Working

**Issue**: Cache headers ignored

**Checklist**:
1. Verify caching is configured: [Caching Configuration](../7-deployment/2-caching.md)
2. Check `CACHE_L1_ENABLED` or `CACHE_L2_ENABLED` is `true`
3. Ensure valid TTL format (e.g., `5m`, `300`)

### Empty Response

**Issue**: Endpoint returns empty result

**Debug**:
```bash
# Check the full GraphQL response
"jq": "."

# Then narrow down
"jq": ".data"
```

### Timeout Errors

**Issue**: Request times out

**Solutions**:
- Add `limit` to GraphQL query
- Filter data in GraphQL, not JQ
- Reduce query complexity
- Consider pagination

## See Also

### Documentation
- [JQ Transformations](../5-graphql/4-jq-transformations.md) - Complete JQ transformations guide
- [Caching Configuration](../7-deployment/2-caching.md) - Configure L1/L2 cache
- [GraphQL Queries](../5-graphql/1-queries/index.md) - GraphQL query documentation
- [Official JQ Manual](https://jqlang.github.io/jq/manual/) - JQ language reference

### Examples
- [JQ Transformation Examples](../9-examples/jq-transformations.mdx) - Practical examples
- [HTTP Data Sources](../4-engine-configuration/1-data-sources/4-http.md) - JQ in HTTP functions

### Tools
- [JQ Play](https://jqplay.org/) - Online JQ playground
- [JQ Cookbook](https://github.com/stedolan/jq/wiki/Cookbook) - Common patterns
