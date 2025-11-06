---
title: "Function Calls"
sidebar_position: 1
---

# Function Calls

Hugr allows you to execute functions directly in GraphQL queries. Functions can be database stored procedures, SQL expressions, HTTP API calls, or custom computations. All functions are exposed through the `function` field in queries and `function` field in mutations.

## Defining Functions

Functions are defined in schema using the `@function` directive on extended `Function` or `MutationFunction` types:

```graphql
extend type Function {
  # Database function
  calculate_discount(
    customer_id: Int!
    order_total: Float!
  ): Float @function(name: "calculate_customer_discount")

  # SQL expression
  convert_currency(
    amount: Float!
    from_currency: String!
    to_currency: String!
  ): Float @function(
    name: "convert_currency"
    sql: "SELECT [amount] * get_exchange_rate([from_currency], [to_currency])"
  )

  # HTTP API call
  get_weather(lat: Float!, lon: Float!): WeatherData @function(
    name: "fetch_weather"
    sql: """
      http_data_source_request_scalar(
        '[$catalog]',
        '/weather',
        'GET',
        '{}'::JSON,
        {lat: [lat], lon: [lon]}::JSON,
        '{}'::JSON,
        ''
      )
    """
    json_cast: true
  )
}
```

See [Schema Definition - Functions](/docs/engine-configuration/schema-definition/function) for detailed function definition syntax.

## Basic Function Calls

### Scalar Functions

Functions that return a single scalar value:

```graphql
query {
  function {
    calculate_discount(customer_id: 123, order_total: 500.0)
  }
}
```

Response:
```json
{
  "data": {
    "function": {
      "calculate_discount": 50.0
    }
  }
}
```

### Object-Returning Functions

Functions that return structured types:

```graphql
query {
  function {
    get_customer_stats(customer_id: 123) {
      total_orders
      total_spent
      average_order_value
      last_order_date
    }
  }
}
```

Response:
```json
{
  "data": {
    "function": {
      "get_customer_stats": {
        "total_orders": 15,
        "total_spent": 1500.50,
        "average_order_value": 100.03,
        "last_order_date": "2024-03-15T10:30:00Z"
      }
    }
  }
}
```

### Table Functions

Functions that return multiple rows:

```graphql
query {
  function {
    get_recommendations(product_id: 456, limit: 5) {
      product_id
      product_name
      score
      reason
    }
  }
}
```

Response:
```json
{
  "data": {
    "function": {
      "get_recommendations": [
        {
          "product_id": 789,
          "product_name": "Similar Product A",
          "score": 0.95,
          "reason": "frequently bought together"
        },
        {
          "product_id": 101,
          "product_name": "Similar Product B",
          "score": 0.87,
          "reason": "same category"
        }
      ]
    }
  }
}
```

## Functions in Modules

When functions are defined with `@module` directive, they are nested in the module hierarchy:

```graphql
extend type Function {
  current_weather(lat: Float!, lon: Float!): WeatherData
    @function(name: "get_weather")
    @module(name: "services.weather")
}
```

Query the function through its module path:

```graphql
query {
  function {
    services {
      weather {
        current_weather(lat: 40.7128, lon: -74.0060) {
          temperature
          humidity
          conditions
        }
      }
    }
  }
}
```

## HTTP API Functions

Call external REST APIs as functions. HTTP API functions must be defined within an HTTP data source configuration.

### Defining HTTP Functions

HTTP functions use the special `http_data_source_request_scalar` function available in HTTP data sources:

```graphql
# In HTTP data source schema definition
extend type Function {
  search_places(
    query: String!
    location: String!
  ): [Place] @function(
    name: "places_search"
    sql: """
      http_data_source_request_scalar(
        [$catalog],
        '/places/search',
        'GET',
        '{\"Authorization\": \"Bearer token\"}'::JSON,
        {q: [query], location: [location]}::JSON,
        '{}'::JSON,
        ''
      )
    """
    json_cast: true
    is_table: true
  )
  @module(name: "external.places")
}

type Place {
  name: String!
  address: String
  rating: Float
  price_level: Int
}
```

**Important**: The `[$catalog]` variable automatically resolves to the current HTTP data source name. HTTP functions can only be defined within HTTP data source configurations where the base URL, authentication, and other HTTP settings are configured.

### Calling HTTP Functions

```graphql
query {
  function {
    external {
      places {
        search_places(query: "restaurants", location: "New York") {
          name
          address
          rating
          price_level
        }
      }
    }
  }
}
```

### HTTP Function Parameters

The `http_data_source_request_scalar` function signature:

```
http_data_source_request_scalar(
  catalog,           -- Data source name (use [$catalog] for current source)
  path,             -- API endpoint path
  method,           -- HTTP method: 'GET', 'POST', 'PUT', 'DELETE'
  headers,          -- Request headers as JSON object
  query_params,     -- URL query parameters as JSON object
  body,             -- Request body as JSON object
  jq                -- Optional jq expression to transform response
)
```

See [HTTP Data Source Configuration](/docs/engine-configuration/data-sources/http) for details on configuring HTTP data sources.

## Mutation Functions

Define functions that modify data:

```graphql
extend type MutationFunction {
  place_order(
    customer_id: Int!
    items: JSON!
  ): OrderResult @function(name: "create_order")

  cancel_order(order_id: Int!): Boolean @function(
    name: "cancel_order"
    sql: "SELECT cancel_order_transaction([order_id])"
  )
}
```

Call mutation functions:

```graphql
mutation {
  function {
    place_order(
      customer_id: 123
      items: "{\"product_id\": 456, \"quantity\": 2}"
    ) {
      order_id
      status
      total_amount
    }
  }
}
```

## Parameterized Queries with Variables

Use GraphQL variables for dynamic function calls:

```graphql
query GetWeather($latitude: Float!, $longitude: Float!) {
  function {
    services {
      weather {
        current_weather(lat: $latitude, lon: $longitude) {
          temperature
          conditions
        }
      }
    }
  }
}
```

Variables:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

## Combining Multiple Function Calls

Execute multiple functions in a single query:

```graphql
query {
  function {
    # Customer statistics
    customer_stats: get_customer_stats(customer_id: 123) {
      total_orders
      total_spent
    }

    # Product recommendations
    recommendations: get_recommendations(
      customer_id: 123
      limit: 5
    ) {
      product_id
      product_name
      score
    }

    # External API call
    services {
      weather {
        current_weather(lat: 40.7, lon: -74.0) {
          temperature
        }
      }
    }
  }
}
```

## Function Return Types

Functions can return:

### 1. Scalars
```graphql
extend type Function {
  random_number: Float @function(name: "random")
}

query {
  function {
    random_number
  }
}
```

### 2. Custom Types
```graphql
type Statistics {
  mean: Float
  median: Float
  std_dev: Float
}

extend type Function {
  calculate_stats(values: [Float!]!): Statistics
    @function(name: "stats")
}

query {
  function {
    calculate_stats(values: [1.0, 2.0, 3.0, 4.0, 5.0]) {
      mean
      median
      std_dev
    }
  }
}
```

### 3. Arrays
```graphql
extend type Function {
  get_top_products(limit: Int!): [Product]
    @function(name: "top_products", is_table: true)
}

query {
  function {
    get_top_products(limit: 10) {
      id
      name
      sales
    }
  }
}
```

## Handling NULL Arguments

Control how NULL arguments are handled:

```graphql
extend type Function {
  geocode_address(address: String): Geometry
    @function(
      name: "geocode"
      skip_null_arg: true  # Don't pass NULL to SQL function
    )
}
```

When `skip_null_arg: true`:
- The function **will be called** even if the argument is NULL
- But the NULL value **won't be passed** to the SQL function
- Useful for functions that can handle missing optional parameters

Without `skip_null_arg`, NULL arguments are passed as NULL to the function.

## JSON Casting

For functions returning JSON that should be cast to structured types:

```graphql
extend type Function {
  get_config(): Configuration
    @function(
      name: "get_system_config"
      json_cast: true  # Cast JSON to Configuration type
    )
}
```

## Error Handling

Function errors occur during SQL execution in the underlying data source. Since GraphQL queries are converted to SQL and executed in the database, errors are reported at the query level.

**Error reporting:**
- **Most errors** - Reported for the entire query (from the SQL execution)
- **Planning errors** - In rare cases, errors during SQL generation may include specific query paths

```graphql
query {
  function {
    divide(a: 10, b: 0)  # Division by zero in database
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "division by zero"
    }
  ]
}
```

**Note:** Unlike traditional GraphQL resolvers that execute per-field, Hugr converts your entire query to SQL and executes it in the database (DuckDB). Errors reflect SQL execution failures rather than field-level resolver errors.

## Performance Considerations

### 1. Use Table Functions Efficiently

For functions called multiple times, prefer table functions that return multiple rows:

```graphql
# Instead of multiple calls
query {
  function {
    product1: get_price(product_id: 1)
    product2: get_price(product_id: 2)
    product3: get_price(product_id: 3)
  }
}

# Use table function
query {
  function {
    get_prices(product_ids: [1, 2, 3]) {
      product_id
      price
    }
  }
}
```

### 2. Cache Function Results

Use caching for expensive function calls:

```graphql
query {
  function {
    expensive_calculation(input: 123) @cache(ttl: 300) {
      result
    }
  }
}
```

### 3. Limit Result Sets

Always limit table function results:

```graphql
query {
  function {
    search_products(query: "laptop", limit: 20) {
      id
      name
      price
    }
  }
}
```

## Best Practices

1. **Use meaningful names** - Function names should clearly describe their purpose
2. **Validate inputs** - Implement validation in the function, not in the client
3. **Return structured data** - Prefer structured types over JSON when possible
4. **Document return types** - Always define explicit return types in schema
5. **Handle errors gracefully** - Return meaningful error messages
6. **Consider performance** - Optimize database functions and API calls
7. **Use modules** - Organize functions logically using the `@module` directive

## Next Steps

- Learn about [Basic Queries](./2-basic-queries.md) for retrieving data by primary keys and unique constraints
- See [Function Fields](./6-function-fields.md) to embed function calls as fields in data objects
- Check [Schema Definition - Functions](/docs/engine-configuration/schema-definition/function) for detailed function configuration
