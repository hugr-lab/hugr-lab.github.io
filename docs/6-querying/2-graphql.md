---
title: "GraphQL API"
sidebar_position: 2
description: GraphQL API endpoint for querying and mutating data
keywords: [graphql, api, query, mutation, introspection, authentication]
---

# GraphQL API

The GraphQL API is the primary interface for querying and mutating data in hugr. It provides a standardized GraphQL endpoint that accepts queries in the standard GraphQL format over HTTP.

## Overview

The GraphQL API endpoint provides:
- **Standard GraphQL Protocol**: Full compliance with the GraphQL specification
- **Flexible Queries**: Read operations with filtering, sorting, pagination, and relationships
- **Mutations**: Create, update, and delete operations with transaction support
- **Introspection**: Full schema introspection for tools and clients
- **Authentication**: Integrated with hugr's authentication system (API keys, JWT, OIDC, anonymous)
- **Access Control**: Role-based permissions applied automatically

## Endpoint Details

**Path**: `/query`

**Methods**: `GET`, `POST`

**Content-Type**: `application/json`

## Request Format

### POST Requests (Recommended)

POST requests are the standard way to send GraphQL queries. They support all GraphQL features including variables and operation names.

#### Headers

```
Content-Type: application/json
```

Optional authentication:
```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "query": "<graphql_query>",
  "variables": {
    "var1": "value1",
    "var2": "value2"
  },
  "operationName": "<operation_name>"
}
```

**Fields**:
- **query** (string, required): GraphQL query or mutation text
- **variables** (object, optional): Variables used in the query
- **operationName** (string, optional): Name of the operation to execute (for documents with multiple operations)

#### Example

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "query": "query GetUsers($limit: Int!) { users(limit: $limit) { id name email } }",
    "variables": {
      "limit": 10
    },
    "operationName": "GetUsers"
  }'
```

### GET Requests

GET requests support simple queries without variables. They are useful for bookmarking, caching, and simple integrations.

#### Query Parameters

- **query** (required): URL-encoded GraphQL query
- **variables** (optional): URL-encoded JSON object with variables
- **operationName** (optional): Operation name

#### Example

```bash
curl -X GET "http://localhost:8080/query?query=%7B%20users%20%7B%20id%20name%20email%20%7D%20%7D"
```

With variables:
```bash
curl -X GET "http://localhost:8080/query?query=query%20GetUser(%24id%3A%20Int!)%20%7B%20users(filter%3A%20%7Bid%3A%20%7Beq%3A%20%24id%7D%7D)%20%7B%20id%20name%20%7D%20%7D&variables=%7B%22id%22%3A%201%7D"
```

**Note**: GET requests have URL length limitations. Use POST for complex queries.

## Response Format

### Success Response

**HTTP Status**: `200 OK`

**Body**:
```json
{
  "data": {
    "users": [
      {"id": 1, "name": "Alice", "email": "alice@example.com"},
      {"id": 2, "name": "Bob", "email": "bob@example.com"}
    ]
  },
  "extensions": {}
}
```

The response follows the standard GraphQL response format:
- **data**: Query results (null if errors occurred)
- **extensions**: Additional metadata (e.g., JQ transformation results, execution time)
- **errors** (optional): Array of errors if any occurred

### Partial Error Response

GraphQL can return partial data even when some fields have errors:

**HTTP Status**: `200 OK`

**Body**:
```json
{
  "data": {
    "users": [
      {"id": 1, "name": "Alice", "email": null}
    ]
  },
  "errors": [
    {
      "message": "Field 'email' access denied",
      "locations": [{"line": 1, "column": 20}],
      "path": ["users", 0, "email"]
    }
  ]
}
```

### Error Response

When the query cannot be executed at all:

**HTTP Status**: `200 OK` (GraphQL convention), `400 Bad Request`, or `401 Unauthorized`

**Body**:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Cannot query field 'invalid_field' on type 'User'",
      "locations": [{"line": 1, "column": 15}]
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Request processed (may contain GraphQL errors) |
| `400 Bad Request` | Malformed GraphQL query or invalid JSON |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Access denied by authorization rules |
| `500 Internal Server Error` | Server-side error during query execution |

## Authentication

The GraphQL API integrates with hugr's authentication system. All authentication methods are supported:

### API Key Authentication

Include the API key in the Authorization header:

```bash
curl -X POST http://localhost:8080/query \
  -H "Authorization: Bearer service_key_abc123" \
  -H "X-API-Username: api_service" \
  -H "X-API-User-ID: svc_001" \
  -d '{"query": "{ users { id name } }"}'
```

See [Authentication Setup](/docs/deployment/auth) for API key configuration.

### JWT/OIDC Authentication

Include the JWT token:

```bash
curl -X POST http://localhost:8080/query \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{"query": "{ users { id name } }"}'
```

### Cookie Authentication

For web applications, tokens can be passed via cookies:

```bash
curl -X POST http://localhost:8080/query \
  -H "Cookie: hugr_session=eyJhbGciOiJIUzI1NiIs..." \
  -d '{"query": "{ users { id name } }"}'
```

The cookie name is configured with the `OIDC_COOKIE_NAME` environment variable (default: `hugr_session`).

### Anonymous Access

If anonymous access is enabled, requests without authentication are assigned the anonymous role:

```bash
curl -X POST http://localhost:8080/query \
  -d '{"query": "{ public_data { id name } }"}'
```

Anonymous users only see data permitted for the anonymous role (configured with `@hide` directive).

## GraphQL Introspection

The GraphQL API supports full introspection, allowing tools and clients to discover the schema dynamically.

### Full Schema Introspection

```graphql
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
      fields {
        name
        description
        type {
          name
          kind
        }
      }
    }
  }
}
```

### Type Introspection

Query specific types:

```graphql
query TypeIntrospection {
  __type(name: "User") {
    name
    kind
    description
    fields {
      name
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
}
```

### Role-Based Schema Visibility

Introspection results respect access control rules:
- **Anonymous users**: Only see types and fields marked as visible for the anonymous role (without `@hide` directive or with `@hide(roles: ["anonymous"])`)
- **Authenticated users**: See types and fields permitted for their assigned role

This ensures that the schema exposed to clients matches their actual access permissions.

## Examples

### Simple Query

Fetch users:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users { id name email } }"
  }'
```

### Query with Filtering

Filter by condition:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users(filter: { status: { eq: \"active\" } }) { id name email } }"
  }'
```

### Query with Variables

Use variables for dynamic queries:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetUser($userId: Int!) { users(filter: { id: { eq: $userId } }) { id name email } }",
    "variables": {
      "userId": 123
    }
  }'
```

### Query with Relationships

Fetch related data:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users { id name orders { id total created_at } } }"
  }'
```

### Mutation

Create a new record:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "query": "mutation CreateUser($data: UsersInput!) { users { insert(data: $data) { id name email } } }",
    "variables": {
      "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "status": "active"
      }
    }
  }'
```

### Batch Mutation

Insert multiple records:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "query": "mutation CreateUsers($users: [UsersInput!]!) { users { insert_batch(data: $users) { id name } } }",
    "variables": {
      "users": [
        {"name": "Alice", "email": "alice@example.com"},
        {"name": "Bob", "email": "bob@example.com"}
      ]
    }
  }'
```

### Aggregation Query

Calculate statistics:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users_aggregation { _rows_count created_at { min max } } }"
  }'
```

### Spatial Query

Query geospatial data:

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ locations(filter: { geometry: { st_within: { type: \"Polygon\", coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] } } }) { id name geometry } }"
  }'
```

## CORS Configuration

For web applications making requests from browsers, configure CORS:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

See [Configuration](/docs/deployment/config#cors-settings) for details.

## Performance Considerations

### 1. Query Complexity

Control query depth to prevent excessive nesting:

```bash
MAX_DEPTH=7  # Default maximum query depth
```

### 2. Parallel Execution

Enable parallel query execution for better performance:

```bash
ALLOW_PARALLEL=true
MAX_PARALLEL_QUERIES=10  # 0 for unlimited
```

### 3. Connection Pooling

Configure database connection pools:

```bash
DB_MAX_OPEN_CONNS=10
DB_MAX_IDLE_CONNS=5
DB_PG_CONNECTION_LIMIT=64  # For PostgreSQL sources
```

### 4. Caching

Use GraphQL directives or HTTP caching:

```graphql
query GetStaticData {
  reference_data @cache(ttl: 3600) {
    id
    name
  }
}
```

See [Cache Directives](/docs/engine-configuration/cache) for more details.

## Best Practices

### 1. Use POST for Complex Queries

GET requests have URL length limitations. Always use POST for:
- Queries with variables
- Mutations
- Complex nested queries
- Queries with large filter conditions

### 2. Leverage Variables

Use variables instead of string interpolation:

```graphql
# Good: Use variables
query GetUser($id: Int!) {
  users(filter: { id: { eq: $id } }) {
    id name
  }
}

# Avoid: String interpolation (security risk)
query {
  users(filter: { id: { eq: 123 } }) {
    id name
  }
}
```

### 3. Request Only Needed Fields

Avoid over-fetching:

```graphql
# Good: Specific fields
{ users { id name } }

# Avoid: Fetching unnecessary data
{ users { id name email phone address city country created_at updated_at } }
```

### 4. Use Filtering at Database Level

Apply filters in GraphQL, not in application code:

```graphql
# Good: Filter in GraphQL
{ users(filter: { status: { eq: "active" } }) { id name } }

# Avoid: Fetch all and filter in code
{ users { id name status } }
```

### 5. Handle Errors Gracefully

Always check for errors in the response:

```javascript
const response = await fetch('/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '...' })
});

const result = await response.json();

if (result.errors) {
  console.error('GraphQL errors:', result.errors);
  // Handle errors
}

if (result.data) {
  // Use data
}
```

### 6. Use Operation Names

Name your queries for better debugging:

```graphql
query GetUserOrders($userId: Int!) {
  users(filter: { id: { eq: $userId } }) {
    id
    name
    orders {
      id
      total
    }
  }
}
```

### 7. Enable Persistent Queries

For production, consider using persisted queries to:
- Reduce payload size
- Improve security (only allow pre-approved queries)
- Enable better caching

## Security Considerations

### 1. Always Use HTTPS in Production

Encrypt all traffic:

```nginx
server {
  listen 443 ssl;
  server_name api.example.com;

  location /query {
    proxy_pass http://hugr:8080;
  }
}
```

### 2. Implement Rate Limiting

Prevent abuse with rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=graphql:10m rate=10r/s;

location /query {
  limit_req zone=graphql burst=20;
  proxy_pass http://hugr:8080;
}
```

### 3. Validate Input

Use GraphQL variables and types to validate input:

```graphql
query GetUser($id: Int!) {  # Type validation
  users(filter: { id: { eq: $id } }) {
    id
    name
  }
}
```

### 4. Configure Access Control

Use role-based permissions to restrict access:

```graphql
type users @module(name: "app")
  @table(name: "users")
  @hide(roles: ["anonymous"]) {
  id: Int! @pk
  name: String!
  email: String! @hide(roles: ["viewer"])
}
```

See [Access Control](/docs/engine-configuration/access-control) for details.

### 5. Monitor Query Complexity

Enable query depth limits:

```bash
MAX_DEPTH=7
```

### 6. Sanitize Sensitive Data

Remove sensitive fields from responses using permissions or transformations.

## Troubleshooting

### Connection Refused

**Error**: `Connection refused` or `ECONNREFUSED`

**Solutions**:
1. Check hugr is running: `curl http://localhost:8080/query`
2. Verify the port: Check `BIND` environment variable
3. Check network configuration

### Authentication Failed

**Error**: `401 Unauthorized`

**Solutions**:
1. Verify token is not expired
2. Check Authorization header format: `Bearer <token>`
3. Confirm authentication is configured correctly
4. Test with anonymous access (if enabled)

### Permission Denied

**Error**: `403 Forbidden` or field returns `null`

**Solutions**:
1. Check user role: Verify JWT claims or API key role
2. Review access control rules
3. Check `@hide` directives on types/fields
4. Test with admin role to isolate permission issues

### Invalid Query Syntax

**Error**: `Cannot query field 'X' on type 'Y'`

**Solutions**:
1. Use introspection to check available fields
2. Verify field names match schema
3. Check for typos in query

### Query Timeout

**Error**: Request times out

**Solutions**:
1. Add `limit` to reduce result size
2. Optimize filters and indexes
3. Check database performance
4. Consider pagination for large datasets

### CORS Errors (Browser)

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
1. Configure CORS environment variables
2. Check `CORS_ALLOWED_ORIGINS` includes your domain
3. Verify `CORS_ALLOWED_METHODS` includes POST
4. Ensure `CORS_ALLOWED_HEADERS` includes `Content-Type` and `Authorization`

## GraphQL Clients

The GraphQL API works with any standard GraphQL client:

### JavaScript/TypeScript

**Apollo Client**:
```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:8080/query',
  cache: new InMemoryCache(),
  headers: {
    authorization: 'Bearer your-token'
  }
});

const { data } = await client.query({
  query: gql`{ users { id name } }`
});
```

**urql**:
```javascript
import { createClient } from 'urql';

const client = createClient({
  url: 'http://localhost:8080/query',
  fetchOptions: {
    headers: {
      authorization: 'Bearer your-token'
    }
  }
});
```

**graphql-request**:
```javascript
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('http://localhost:8080/query', {
  headers: {
    authorization: 'Bearer your-token'
  }
});

const data = await client.request(`{ users { id name } }`);
```

### Python

**hugr-client** (Recommended):
```python
from hugr_client import HugrClient

client = HugrClient(
    url='http://localhost:8080',
    token='your-token'
)

df = client.query('{ users { id name email } }')
```

See [Python Client](/docs/querying/python-client) for more details.

**gql**:
```python
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport

transport = RequestsHTTPTransport(
    url='http://localhost:8080/query',
    headers={'authorization': 'Bearer your-token'}
)

client = Client(transport=transport)

query = gql('{ users { id name } }')
result = client.execute(query)
```

### cURL

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"query": "{ users { id name } }"}'
```

## See Also

### Documentation
- [Admin UI](/docs/querying/admin-ui) - GraphiQL interface for the GraphQL API
- [JQ Query Endpoint](/docs/querying/jq-endpoint) - REST endpoint with JQ transformations
- [Python Client](/docs/querying/python-client) - Python library for hugr
- [Hugr IPC](/docs/querying/hugr-ipc) - Efficient binary protocol for analytics
- [Authentication Setup](/docs/deployment/auth) - Configure authentication methods
- [Access Control](/docs/engine-configuration/access-control) - Role-based permissions
- [Cache Directives](/docs/engine-configuration/cache) - Query result caching

### GraphQL Resources
- [GraphQL Specification](https://spec.graphql.org/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [GraphQL Clients](https://graphql.org/code/#graphql-clients)
