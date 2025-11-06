---
title: "JQ Transformations"
sidebar_position: 4
description: Server-side JQ transformations for GraphQL query results in hugr
keywords: [jq, transformations, server-side, graphql, data processing]
---

# JQ Transformations

Hugr supports powerful server-side JQ transformations to transform GraphQL query results before they are returned to the client. This enables flexible data processing, restructuring, filtering, and enrichment without requiring client-side logic.

## Overview

### What are JQ Transformations in Hugr?

JQ transformations in hugr allow you to apply [jq](https://jqlang.github.io/jq/) expressions to GraphQL query results on the server side. JQ is a lightweight and flexible command-line JSON processor that provides a rich set of filters and transformations.

### Why Use JQ Transformations?

Server-side transformations offer several advantages:

- **Reduce Network Traffic**: Transform and filter data on the server before sending it to clients
- **Simplify Client Logic**: Offload complex data transformations from client applications
- **Consistent Processing**: Apply the same transformations across multiple clients
- **Data Enrichment**: Combine data from multiple sources using nested queries
- **Flexible Output Formats**: Adapt data structure to match different client requirements

### Benefits of Server-Side Transformations

1. **Performance**: Process data closer to the source, reducing bandwidth usage
2. **Security**: Hide sensitive fields or apply business logic before data leaves the server
3. **Flexibility**: Change data structure without modifying the underlying schema
4. **Composability**: Chain multiple transformations for complex data processing
5. **Integration**: Easily integrate with external APIs and combine results

## Transformation Methods

Hugr provides two ways to apply JQ transformations:

### 1. Built-in GraphQL `jq()` Query

The built-in `jq()` query allows you to transform GraphQL results inline within your GraphQL queries.

**Key characteristics**:
- JQ receives only the `data` field from the GraphQL response
- Transformation results are returned in the `extensions` section
- Supports hierarchical transformations through chaining
- Best for inline transformations within complex queries

### 2. REST Endpoint `/jq-query`

A dedicated REST endpoint for executing GraphQL queries with JQ transformation.

**Key characteristics**:
- JQ receives the complete GraphQL response (including `data`, `extensions`, and `errors`)
- Transformation result is returned directly as the HTTP response
- Best for standalone queries with transformations
- Easier error handling and debugging

## Built-in GraphQL jq() Query

### Syntax

The `jq()` query is defined as a system query in hugr:

```graphql
type Query @system {
  jq(
    query: String!
    include_origin: Boolean = false
  ): Query @system
}
```

### Parameters

- **query** (String!, required): The JQ expression to apply to the GraphQL result
- **include_origin** (Boolean, default: false): When true, includes the original result alongside the transformation

### Basic Transformation Examples

#### Example 1: Simple Field Extraction

Extract specific fields from a complex result:

```graphql
query {
  jq(query: ".users | map({id, name})") {
    users {
      id
      name
      email
      created_at
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": {
      "users": [
        {"id": 1, "name": "Alice", "email": "alice@example.com", "created_at": "2024-01-01"},
        {"id": 2, "name": "Bob", "email": "bob@example.com", "created_at": "2024-01-02"}
      ]
    }
  },
  "extensions": {
    "jq": {
      "jq": [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"}
      ]
    }
  }
}
```

#### Example 2: Filtering Arrays

Filter results based on conditions:

```graphql
query {
  jq(query: ".orders | map(select(.status == \"completed\"))") {
    orders {
      id
      status
      total
    }
  }
}
```

#### Example 3: Data Restructuring

Transform nested structures into flat format:

```graphql
query {
  jq(query: ".customers | map({customer_name: .name, order_count: .orders | length})") {
    customers {
      id
      name
      orders {
        id
        total
      }
    }
  }
}
```

### Working with include_origin

The `include_origin` parameter controls whether the original query results are included in the `data` section within the `jq` query response:

- **include_origin: true** (default): Original query results are included in `data.jq.<field>`
- **include_origin: false**: The `data.jq` section is cleared/empty

#### Example with include_origin: true (default)

```graphql
query {
  jq(query: ".users | length", include_origin: true) {
    users {
      id
      name
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": {
      "users": [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"}
      ]
    }
  },
  "extensions": {
    "jq": {
      "jq": 2
    }
  }
}
```

#### Example with include_origin: false

```graphql
query {
  jq(query: ".users | length", include_origin: false) {
    users {
      id
      name
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": {}
  },
  "extensions": {
    "jq": {
      "jq": 2
    }
  }
}
```

### Using Aliases

You can use GraphQL aliases to name your jq transformations. The transformation result will be available at `extensions.jq.<alias>`:

```graphql
query {
  userCount: jq(query: ".users | length") {
    users {
      id
      name
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "userCount": {
      "users": [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"}
      ]
    }
  },
  "extensions": {
    "jq": {
      "userCount": 2
    }
  }
}
```

For transformations returning a single object (not an array), the result will be an object:

```graphql
query {
  stats: jq(query: "{total: .users | length, active: .users | map(select(.active)) | length}") {
    users {
      id
      name
      active
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "stats": {
      "users": [
        {"id": 1, "name": "Alice", "active": true},
        {"id": 2, "name": "Bob", "active": false}
      ]
    }
  },
  "extensions": {
    "jq": {
      "stats": {
        "total": 2,
        "active": 1
      }
    }
  }
}
```

### Where Results are Located

- **Original query results**: In `data.jq.<field>` (or `data.<alias>.<field>` when using aliases) when `include_origin: true`
- **Original query results**: Empty `data.jq` (or `data.<alias>`) when `include_origin: false`
- **Transformation result**: Always in `extensions.jq.jq` (or `extensions.jq.<alias>` when using aliases)
- **Result format**: Array or object depending on the JQ expression output

### Hierarchical Transformations

You can chain multiple `jq()` queries for complex, multi-step transformations:

```graphql
query {
  jq(query: ".result | group_by(.category)") {
    result: jq(query: ".products | map({id, name, category, price})") {
      products {
        id
        name
        category
        price
        description
      }
    }
  }
}
```

This example:
1. First transforms products to extract only specific fields
2. Then groups the results by category

## REST Endpoint /jq-query

### Request Format

**Endpoint**: `POST /jq-query`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <token>  # if authentication is required
```

**Request Body**:
```json
{
  "jq": "<jq_expression>",
  "query": {
    "query": "<graphql_query>",
    "variables": {
      "var1": "value1"
    },
    "operationName": "MyQuery"
  }
}
```

### Response Format

**Success Response**:
The JQ transformation result is returned directly as the HTTP response body.

```json
{
  // JQ transformation result
}
```

**Error Response**:
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- **200 OK**: Successful transformation
- **400 Bad Request**: Invalid JQ expression or GraphQL query
- **401 Unauthorized**: Missing or invalid authentication
- **500 Internal Server Error**: Server-side error during processing

### curl Usage Examples

#### Example 1: Basic Transformation

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.users | map({id, name})",
    "query": {
      "query": "{ users { id name email } }"
    }
  }'
```

#### Example 2: With Variables

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

#### Example 3: Error Handling

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": "if .errors then {error: .errors} else .data end",
    "query": {
      "query": "{ users { id name } }"
    }
  }'
```

### Differences from Built-in jq()

| Feature | Built-in jq() | /jq-query Endpoint |
|---------|---------------|-------------------|
| **JQ Input** | Only `data` field | Complete GraphQL response |
| **Result Location** | In `extensions.jq` | Direct HTTP response |
| **Original Data** | In `data` field | Not preserved (unless in JQ) |
| **Error Access** | Not available to JQ | Available in `.errors` |
| **Use Case** | Inline transformations | Standalone transformations |
| **Chaining** | Easy (nested jq queries) | Manual (multiple requests) |

## Working with Variables

### Passing Variables in GraphQL

Variables are defined in the GraphQL query and passed separately:

```graphql
query GetUsersByCountry($country: String!, $minAge: Int!) {
  users(filter: { country: { eq: $country }, age: { gte: $minAge } }) {
    id
    name
    age
    country
  }
}
```

**Variables**:
```json
{
  "country": "USA",
  "minAge": 18
}
```

### Using Variables in JQ Expressions

Variables from GraphQL queries are accessible in JQ expressions using the `$var_name` syntax:

#### Example 1: Filter Using Variable

```graphql
query {
  jq(query: ".users | map(select(.age >= $minAge))") {
    users {
      id
      name
      age
    }
  }
}
```

With variables:
```json
{
  "minAge": 21
}
```

#### Example 2: Dynamic Field Selection

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.products | map(select(.category == $category))",
    "query": {
      "query": "query($category: String!) { products { id name category price } }",
      "variables": {
        "category": "electronics"
      }
    }
  }'
```

#### Example 3: Conditional Transformation

```graphql
query {
  jq(query: "if $includeDetails then .users else .users | map({id, name}) end") {
    users {
      id
      name
      email
      phone
    }
  }
}
```

Variables:
```json
{
  "includeDetails": false
}
```

### Variable Scope

- Variables are available in **all JQ expressions** within the query
- Variable names must match GraphQL variable names (without the `$` in GraphQL, with `$` in JQ)
- Variables maintain their types (strings, numbers, booleans, objects, arrays)

## queryHugr() Function (JQ-only)

:::warning Important
`queryHugr()` is a **special function available ONLY inside JQ expressions**. It is **NOT a GraphQL query or function**. You cannot call it directly from GraphQL - only from within JQ transformations.
:::

### Description

The `queryHugr()` function allows you to execute GraphQL queries from within JQ transformations. This enables powerful data enrichment and cross-source aggregation scenarios.

### Syntax

```jq
queryHugr(graphql_query_text)
queryHugr(graphql_query_text, variables_object)
```

**Parameters**:
- **graphql_query_text** (string): The GraphQL query to execute
- **variables_object** (object, optional): Variables to pass to the GraphQL query

**Returns**: The GraphQL query result (the complete response including `data`, `extensions`, and `errors`)

### Basic Examples

#### Example 1: Enrich Data with Additional Query

```graphql
query {
  jq(query: ".users | map(. + {order_count: (queryHugr(\"{ orders(filter: {user_id: {eq: \" + (.id | tostring) + \"}}) { id } }\").data.orders | length)})") {
    users {
      id
      name
    }
  }
}
```

This enriches each user with their order count by executing a separate query for each user.

#### Example 2: Combining Data from Multiple Sources

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": "{users: .data.users, total_orders: queryHugr(\"{orders_aggregation { _rows_count }}\").data.orders_aggregation._rows_count}",
    "query": {
      "query": "{ users { id name } }"
    }
  }'
```

This combines user data with a global order count from a separate aggregation query.

### Using with Variables

#### Example 3: Query with Variables

```graphql
query {
  jq(query: ".products | map(. + {reviews: queryHugr(\"query($pid: Int!) { reviews(filter: {product_id: {eq: $pid}}) { rating comment } }\", {pid: .id}).data.reviews})") {
    products {
      id
      name
    }
  }
}
```

This enriches each product with its reviews using a parameterized query.

### Use Cases

#### 1. Data Enrichment

Add related data from other tables or sources:

```jq
.customers | map(
  . + {
    recent_orders: queryHugr(
      "query($cid: Int!) { orders(filter: {customer_id: {eq: $cid}}, limit: 5, order_by: [{field: \"created_at\", direction: DESC}]) { id total created_at } }",
      {cid: .id}
    ).data.orders
  }
)
```

#### 2. Cross-Source Aggregation

Combine data from different data sources:

```jq
{
  database_stats: queryHugr("{ users_aggregation { _rows_count } }").data.users_aggregation,
  api_stats: queryHugr("{ function { external_api { stats { total_count } } } }").data.function.external_api.stats
}
```

#### 3. Conditional Data Loading

Load additional data based on conditions:

```jq
.orders | map(
  if .status == "pending" then
    . + {customer_details: queryHugr("query($id: Int!) { customers_by_pk(id: $id) { name email phone } }", {id: .customer_id}).data.customers_by_pk}
  else
    .
  end
)
```

#### 4. Recursive Hierarchies

Build hierarchical structures:

```jq
.categories | map(
  . + {
    products: queryHugr(
      "query($cat: String!) { products(filter: {category: {eq: $cat}}) { id name price } }",
      {cat: .name}
    ).data.products
  }
)
```

### How It Differs from Regular GraphQL Queries

| Aspect | Regular GraphQL | queryHugr() in JQ |
|--------|----------------|-------------------|
| **Context** | Client request | JQ transformation |
| **Execution** | Single query plan | Dynamic, per-item execution |
| **Variables** | Query-level | Can use JQ variables and data |
| **Performance** | Optimized by query planner | May execute multiple queries |
| **Use Case** | Primary data fetching | Data enrichment, aggregation |

### Performance Considerations

:::caution Performance Warning
`queryHugr()` executes a separate GraphQL query for each invocation. Using it inside `map()` or loops can result in many queries (N+1 problem).

**Best Practices**:
- Use for small datasets or when necessary
- Consider pre-joining data in the main query when possible
- Cache results when appropriate
- Use aggregation queries to minimize the number of calls
:::

## Practical Examples

### Example 1: Filtering and Transforming Arrays

**Scenario**: Get only active products with price above $100, showing only essential fields.

```graphql
query {
  jq(query: ".products | map(select(.active == true and .price > 100)) | map({id, name, price})") {
    products {
      id
      name
      price
      active
      description
      category
    }
  }
}
```

### Example 2: Grouping and Aggregation

**Scenario**: Group orders by status and calculate totals.

```graphql
query {
  jq(query: ".orders | group_by(.status) | map({status: .[0].status, count: length, total: map(.amount) | add})") {
    orders {
      id
      status
      amount
    }
  }
}
```

### Example 3: Modifying Response Structure

**Scenario**: Convert nested structure to flat format for easier consumption.

**Original Structure**:
```json
{
  "customers": [
    {
      "id": 1,
      "name": "Alice",
      "orders": [
        {"id": 101, "total": 50},
        {"id": 102, "total": 75}
      ]
    }
  ]
}
```

**Query**:
```graphql
query {
  jq(query: ".customers | map(.orders[] | {customer_id: .id, customer_name: .name, order_id: .id, order_total: .total}) | flatten") {
    customers {
      id
      name
      orders {
        id
        total
      }
    }
  }
}
```

**Result**:
```json
[
  {"customer_id": 1, "customer_name": "Alice", "order_id": 101, "order_total": 50},
  {"customer_id": 1, "customer_name": "Alice", "order_id": 102, "order_total": 75}
]
```

### Example 4: Combining Data from Multiple Queries

**Scenario**: Combine user data with their total spending from a separate aggregation.

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.users | map(. + {total_spent: queryHugr(\"query($uid: Int!) { orders(filter: {user_id: {eq: $uid}}) { total } }\", {uid: .id}).data.orders | map(.total) | add})",
    "query": {
      "query": "{ users { id name email } }"
    }
  }'
```

### Example 5: Conditional Logic

**Scenario**: Apply different transformations based on field values.

```graphql
query {
  jq(query: ".products | map(if .stock > 0 then {id, name, status: \"available\", price} else {id, name, status: \"out_of_stock\"} end)") {
    products {
      id
      name
      price
      stock
    }
  }
}
```

### Example 6: Working with Nullable Values

**Scenario**: Handle null values gracefully in transformations.

```graphql
query {
  jq(query: ".users | map({id, name, email: (.email // \"no-email@example.com\"), phone: (.phone // \"N/A\")})") {
    users {
      id
      name
      email
      phone
    }
  }
}
```

### Example 7: Complex Transformation for BI Dashboard

**Scenario**: Prepare data for a dashboard showing sales by region with trend indicators.

```bash
curl -X POST http://localhost:8080/jq-query \
  -H "Content-Type: application/json" \
  -d '{
    "jq": ".data.sales | group_by(.region) | map({region: .[0].region, total_sales: map(.amount) | add, avg_sale: (map(.amount) | add / length), order_count: length, trend: (if (map(.amount) | add) > $threshold then \"up\" else \"down\" end)})",
    "query": {
      "query": "query($threshold: Float!) { sales { region amount } }",
      "variables": {
        "threshold": 10000
      }
    }
  }'
```

## Best Practices

### When to Use jq() vs /jq-query

**Use Built-in `jq()` when**:
- You need inline transformations within complex queries
- You want to chain multiple transformations hierarchically
- You need both original and transformed data
- Working with GraphQL tools that expect standard responses

**Use `/jq-query` endpoint when**:
- You need access to GraphQL errors in JQ
- You want the transformation result as the direct response
- Building standalone data processing pipelines
- Easier debugging and testing of transformations

### Performance Considerations

1. **Filter Early**: Apply filters in GraphQL queries before JQ transformation
   ```graphql
   # Good: Filter in GraphQL
   query {
     jq(query: ".users | map({id, name})") {
       users(filter: {active: {eq: true}}) {
         id
         name
       }
     }
   }

   # Less efficient: Filter in JQ
   query {
     jq(query: ".users | map(select(.active == true)) | map({id, name})") {
       users {
         id
         name
         active
       }
     }
   }
   ```

2. **Limit Data Volume**: Use GraphQL `limit` to reduce data processed by JQ
   ```graphql
   query {
     jq(query: ".users | map({id, name})") {
       users(limit: 100) {
         id
         name
       }
     }
   }
   ```

3. **Minimize queryHugr() Calls**: Each call executes a separate query
   ```jq
   # Avoid in loops
   .users | map(. + {orders: queryHugr("...")})  # N queries

   # Better: Use GraphQL relations
   query {
     users {
       id
       orders { id }
     }
   }
   ```

4. **Cache Transformations**: For repeated transformations, consider caching results

### Debugging JQ Expressions

1. **Test Incrementally**: Build complex expressions step by step
   ```jq
   # Start simple
   .users

   # Add filtering
   .users | map(select(.active))

   # Add transformation
   .users | map(select(.active)) | map({id, name})
   ```

2. **Use include_origin**: Compare original and transformed data
   ```graphql
   query {
     jq(query: "...", include_origin: true) {
       ...
     }
   }
   ```

3. **Test with jq CLI**: Test expressions using the `jq` command-line tool
   ```bash
   echo '{"users": [{"id": 1, "name": "Alice"}]}' | jq '.users | map({id, name})'
   ```

4. **Handle Errors**: Check for null values and edge cases
   ```jq
   .users | map(if . then {id, name} else empty end)
   ```

### Error Handling

1. **Validate Input**: Check for expected structure
   ```jq
   if .data.users then .data.users | map({id, name}) else [] end
   ```

2. **Provide Defaults**: Use `//` operator for null coalescing
   ```jq
   .users | map({id, name: (.name // "Unknown")})
   ```

3. **Catch Errors in /jq-query**: Handle GraphQL errors
   ```jq
   if .errors then
     {error: "GraphQL query failed", details: .errors}
   else
     .data.users
   end
   ```

### Security Considerations

1. **Sanitize Sensitive Data**: Remove sensitive fields before returning
   ```jq
   .users | map({id, name, email} | del(.email))
   ```

2. **Validate Variables**: Ensure variables are properly escaped in dynamic queries

3. **Limit Transformation Complexity**: Set timeouts for JQ execution to prevent DoS

4. **Access Control**: JQ transformations respect the same access control as GraphQL queries

## See Also

### Documentation
- [Official JQ Documentation](https://jqlang.github.io/jq/) - Complete JQ language reference
- [JQ Manual](https://jqlang.github.io/jq/manual/) - JQ functions and operators
- [GraphQL Queries](./1-queries/index.md) - hugr GraphQL query documentation
- [Function Calls](./1-queries/1-function-calls.md) - HTTP function JQ parameters

### Related Topics
- [REST API /jq-query Endpoint](../6-querying/5-jq-endpoint.md) - Detailed endpoint documentation
- [HTTP Data Sources](../4-engine-configuration/1-data-sources/4-http.md) - JQ in HTTP functions
- [Overview - Result Transformation](../1-overview.md#5-advanced-features) - Platform capabilities

### Examples
- [JQ Transformation Examples](../9-examples/jq-transformations.mdx) - Practical use cases
- [HTTP Data Source Examples](../4-engine-configuration/1-data-sources/4-http.md) - JQ with external APIs

### External Resources
- [JQ Play](https://jqplay.org/) - Online JQ playground for testing expressions
- [JQ Cookbook](https://github.com/stedolan/jq/wiki/Cookbook) - Common JQ patterns
