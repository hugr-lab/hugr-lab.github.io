---
title: "Function Fields"
sidebar_position: 6
---

# Function Fields

Hugr allows you to embed function calls as fields within data objects using the `@function_call` and `@table_function_call_join` directives. This enables dynamic computations, external API calls, and custom business logic to be executed row-by-row as part of your queries.

## Basic Function Fields

### Scalar Function Fields

Add a function that returns a single value:

```graphql
# Schema definition
extend type Function {
  calculate_shipping_cost(
    weight: Float!
    distance: Float!
  ): Float @function(name: "calc_shipping")
}

extend type orders {
  shipping_cost: Float @function_call(
    references_name: "calculate_shipping_cost"
    args: {
      weight: "total_weight"
      distance: "shipping_distance"
    }
  )
}
```

Query the function field:

```graphql
query {
  orders {
    id
    total_weight
    shipping_distance
    shipping_cost  # Automatically calculated per order
  }
}
```

Result:
```json
{
  "data": {
    "orders": [
      {
        "id": 1,
        "total_weight": 5.5,
        "shipping_distance": 150.0,
        "shipping_cost": 12.50
      }
    ]
  }
}
```

### Object-Returning Function Fields

Functions that return structured types:

```graphql
# Schema definition
extend type Function {
  get_customer_tier(
    total_spent: Float!
    order_count: Int!
  ): CustomerTier @function(name: "calculate_tier")
}

type CustomerTier {
  level: String!
  discount_rate: Float!
  benefits: [String!]
}

extend type customers {
  tier: CustomerTier @function_call(
    references_name: "get_customer_tier"
    args: {
      total_spent: "lifetime_value"
      order_count: "order_count"
    }
  )
}
```

Query:
```graphql
query {
  customers {
    id
    name
    lifetime_value
    order_count
    tier {
      level
      discount_rate
      benefits
    }
  }
}
```

## Argument Mapping

### Full Argument Mapping

Map all function arguments from object fields:

```graphql
extend type Function {
  validate_address(
    street: String!
    city: String!
    postal_code: String!
    country: String!
  ): Boolean @function(name: "address_validator")
}

extend type customers {
  is_address_valid: Boolean @function_call(
    references_name: "validate_address"
    args: {
      street: "address_street"
      city: "address_city"
      postal_code: "postal_code"
      country: "country"
    }
  )
}
```

### Partial Argument Mapping

Map some arguments from fields, others provided at query time:

```graphql
extend type Function {
  convert_price(
    amount: Float!
    from_currency: String!
    to_currency: String!
  ): Float @function(name: "currency_converter")
}

extend type products {
  price_converted: Float @function_call(
    references_name: "convert_price"
    args: {
      amount: "price"
      from_currency: "currency"
      # to_currency will be a query argument
    }
  )
}
```

Query with additional arguments:

```graphql
query {
  products {
    id
    name
    price
    currency
    # Specify to_currency at query time
    price_converted(to_currency: "EUR")
  }
}
```

### No Argument Mapping

All arguments provided at query time:

```graphql
extend type Function {
  get_weather(lat: Float!, lon: Float!): WeatherData
    @function(name: "fetch_weather")
}

extend type locations {
  weather: WeatherData @function_call(
    references_name: "get_weather"
    # No args mapping - all provided at query time
  )
}
```

Query:
```graphql
query {
  locations {
    id
    name
    # Provide all arguments
    weather(lat: 40.7, lon: -74.0) {
      temperature
      conditions
    }
  }
}
```

## Table Function Fields

Functions that return multiple rows:

### Basic Table Functions

```graphql
extend type Function {
  get_recommendations(
    customer_id: Int!
    limit: Int = 10
  ): [Product] @function(
    name: "product_recommendations"
    is_table: true
  )
}

extend type customers {
  recommendations: [Product] @function_call(
    references_name: "get_recommendations"
    args: {
      customer_id: "id"
    }
  )
}
```

Query:
```graphql
query {
  customers {
    id
    name
    # Get recommendations for each customer
    recommendations(limit: 5) {
      id
      name
      price
    }
  }
}
```

### Filtering Table Function Results

```graphql
query {
  customers {
    id
    # Filter recommendations
    affordable_recommendations: recommendations(
      limit: 10
      filter: { price: { lte: 100 } }
    ) {
      id
      name
      price
    }
  }
}
```

### Sorting Table Function Results

```graphql
query {
  customers {
    id
    # Sort by relevance score
    recommendations(
      limit: 10
      order_by: [{ field: "score", direction: DESC }]
    ) {
      id
      name
      score
    }
  }
}
```

## Table Function with Join

Use `@table_function_call_join` to combine function results with join conditions. The `args` parameter maps function arguments to object fields—unmapped arguments become field parameters in queries.

```graphql
# Function definition
extend type Function {
  get_sensor_readings(
    sensor_id: Int!
    from_time: Timestamp!
    to_time: Timestamp!
  ): [SensorReading] @function(
    name: "fetch_readings"
    is_table: true
  )
}

# Field definition
extend type sensors {
  readings: [SensorReading] @table_function_call_join(
    references_name: "get_sensor_readings"
    args: {
      sensor_id: "id"  # Maps sensor_id to sensors.id field
      # from_time and to_time not mapped - become query parameters
    }
    source_fields: ["id"]
    references_fields: ["sensor_id"]
  )
}
```

**Result:** The `readings` field requires `from_time` and `to_time` parameters:

```graphql
query {
  sensors {
    id
    name
    # from_time and to_time are required query parameters
    readings(
      from_time: "2024-01-01T00:00:00Z"
      to_time: "2024-01-31T23:59:59Z"
    ) {
      timestamp
      value
      unit
    }
  }
}
```

### Limitations

**Important:** Fields created with `@table_function_call_join` do not support:
- `filter`, `order_by`, `limit`, `offset`, `distinct_on`
- `inner` parameter
- Aggregations (`_aggregation`, `_bucket_aggregation`)

The directive provides basic data retrieval with argument mapping and join conditions only.

### Alternative: Use Parameterized Views

For advanced filtering, sorting, and aggregation, define a parameterized view instead:

```graphql
# Define parameterized view calling the function
type sensor_readings_view @view(
  name: "sensor_readings_by_period"
  sql: "SELECT * FROM get_sensor_readings([sensor_id], [from_time], [to_time])"
) @args(name: "sensor_readings_args", required: true) {
  sensor_id: Int! @pk
  timestamp: Timestamp! @pk
  value: Float!
  unit: String!
}

input sensor_readings_args {
  sensor_id: Int!
  from_time: Timestamp!
  to_time: Timestamp!
}

# Create relation to parameterized view
extend type sensors {
  readings: [sensor_readings_view] @join(
    references_name: "sensor_readings_view"
    source_fields: ["id"]
    references_fields: ["sensor_id"]
  )
}
```

Now you get full query capabilities:

```graphql
query {
  sensors {
    id
    name
    # Filter anomalous readings
    anomalies: readings(
      args: {
        sensor_id: 123
        from_time: "2024-01-01T00:00:00Z"
        to_time: "2024-01-31T23:59:59Z"
      }
      filter: {
        _or: [
          { value: { gt: 100 } }
          { value: { lt: 0 } }
        ]
      }
      order_by: [{ field: "timestamp", direction: DESC }]
      limit: 50
    ) {
      timestamp
      value
    }
  }
}
```

## HTTP API Function Fields

Call external APIs as function fields:

```graphql
# Schema definition
extend type Function {
  get_geocode(
    address: String!
  ): GeoLocation @function(
    name: "geocode_address"
    sql: """
      http_data_source_request_scalar(
        '[$catalog]',
        '/geocode',
        'GET',
        '{\"Authorization\": \"Bearer token\"}'::JSON,
        {address: [address]}::JSON,
        '{}'::JSON,
        ''
      )
    """
    json_cast: true
  )
}

type GeoLocation {
  latitude: Float
  longitude: Float
  accuracy: String
}

extend type addresses {
  geocoded: GeoLocation @function_call(
    references_name: "get_geocode"
    args: {
      address: "full_address"
    }
  )
}
```

Query:
```graphql
query {
  addresses {
    id
    full_address
    geocoded {
      latitude
      longitude
      accuracy
    }
  }
}
```

## Cross-Source Function Fields

Call functions from different data sources:

```graphql
# In extension data source
extend type postgres_orders {
  # Call function from MySQL data source
  loyalty_points: Int @function_call(
    references_name: "calculate_points"
    module: "mysql.loyalty"
    args: {
      order_total: "total"
      customer_id: "customer_id"
    }
  )

  # Call HTTP API function
  tracking_info: TrackingInfo @function_call(
    references_name: "get_tracking"
    module: "shipping_api"
    args: {
      tracking_number: "tracking_number"
    }
  )
}
```

## Aggregating Function Results

### Aggregating Table Functions

```graphql
query {
  customers {
    id
    name
    # Aggregate recommendations
    recommendations_aggregation(limit: 100) {
      _rows_count
      price {
        avg
        min
        max
      }
    }
  }
}
```

### Bucket Aggregation on Functions

```graphql
query {
  customers {
    id
    # Group recommendations by category
    recommendations_bucket_aggregation(limit: 100) {
      key {
        category {
          name
        }
      }
      aggregations {
        _rows_count
        price {
          avg
        }
      }
    }
  }
}
```

## Conditional Function Execution

### Skip NULL Arguments

```graphql
extend type Function {
  geocode(address: String): Geometry
    @function(
      name: "geocode_address"
      skip_null_arg: true  # Don't pass NULL to SQL function
    )
}

extend type customers {
  location: Geometry @function_call(
    references_name: "geocode"
    args: {
      address: "full_address"
    }
  )
}
```

When `skip_null_arg: true`:
- The function will be called even if `full_address` is NULL
- But NULL won't be passed as an argument to the SQL function
- Useful for optional parameters that the function can handle internally

## Chained Function Calls

Combine multiple function fields:

```graphql
extend type orders {
  # First: calculate base discount
  base_discount: Float @function_call(
    references_name: "calc_base_discount"
    args: { total: "total" }
  )

  # Second: apply loyalty bonus using base_discount
  final_discount: Float @function_call(
    references_name: "apply_loyalty"
    args: {
      customer_id: "customer_id"
      base_discount: "base_discount"
    }
  )

  # Third: calculate final total
  discounted_total: Float @function_call(
    references_name: "apply_discount"
    args: {
      total: "total"
      discount: "final_discount"
    }
  )
}
```

Query:
```graphql
query {
  orders {
    id
    total
    base_discount
    final_discount
    discounted_total
  }
}
```

## Field Aliases with Functions

Rename function fields in responses:

```graphql
query {
  products {
    id
    name
    price
    # Multiple conversions with aliases
    price_eur: price_converted(to_currency: "EUR")
    price_gbp: price_converted(to_currency: "GBP")
    price_jpy: price_converted(to_currency: "JPY")
  }
}
```

## Fragments with Function Fields

```graphql
fragment ProductWithPrices on products {
  id
  name
  price
  currency
  price_usd: price_converted(to_currency: "USD")
  price_eur: price_converted(to_currency: "EUR")
}

query {
  products {
    ...ProductWithPrices
  }

  top_products: products(
    order_by: [{ field: "sales", direction: DESC }]
    limit: 10
  ) {
    ...ProductWithPrices
  }
}
```

## Performance Considerations

### 1. Batch Function Execution

When possible, create functions that can process multiple rows:

```graphql
# Less efficient - called once per product
extend type products {
  stock_status: String @function_call(
    references_name: "check_stock"
    args: { product_id: "id" }
  )
}

# More efficient - use parameterized view
type stock_status_view @view(
  name: "stock_statuses"
  sql: "SELECT * FROM check_all_stock()"
) {
  product_id: Int!
  status: String!
}

extend type products {
  stock_status: stock_status_view @join(
    references_name: "stock_status_view"
    source_fields: ["id"]
    references_fields: ["product_id"]
  )
}
```

### 2. Limit Table Function Results

Always limit results from table functions:

```graphql
query {
  customers {
    id
    # Always use limit
    recommendations(limit: 10) {
      id
    }
  }
}
```

### 3. Cache Expensive Functions

Use caching for expensive function calls:

```graphql
query {
  products {
    id
    # Cache for 5 minutes
    ml_recommendations: recommendations @cache(ttl: 300) {
      id
      name
    }
  }
}
```

### 4. Filter Before Function Calls

Reduce the number of function executions:

```graphql
# Good - Filter first, then call function
query {
  products(
    filter: { active: { eq: true } }
    limit: 20
  ) {
    id
    recommendations(limit: 5) {
      id
    }
  }
}

# Avoid - Function called for all products
query {
  products {
    id
    recommendations(limit: 5) {
      id
    }
  }
}
```

## Common Patterns

### Enriching Data with External APIs

```graphql
query {
  customers {
    id
    name
    email
    # Enrich with credit score
    credit_info: credit_check {
      score
      rating
      updated_at
    }
  }
}
```

### Dynamic Calculations

```graphql
query {
  orders {
    id
    subtotal
    # Calculate taxes dynamically
    tax_amount: calculate_tax(jurisdiction: "NY")
    # Calculate shipping
    shipping_cost
    # Final total
    total: final_total(jurisdiction: "NY")
  }
}
```

### Personalized Content

```graphql
query GetPersonalizedProducts($userId: Int!) {
  customers_by_pk(id: $userId) {
    id
    name
    # Personalized recommendations
    recommendations(limit: 20) {
      id
      name
      price
      relevance_score
    }
  }
}
```

### Real-Time Data

```graphql
query {
  sensors {
    id
    name
    # Latest readings from external system
    current_reading {
      timestamp
      value
      status
    }
  }
}
```

## Error Handling

Function field errors are categorized into two types:

### Planning Errors (SQL Generation)

Validation errors caught during query planning, with specific error paths:

**Invalid argument types:**
```graphql
query {
  products {
    id
    price_converted(to_currency: 123)  # Wrong type, expects String
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Argument 'to_currency' expects type String, got Int",
      "path": ["products", "price_converted"],
      "extensions": {
        "code": "INVALID_ARGUMENT_TYPE"
      }
    }
  ]
}
```

**Invalid field names in sorting/aggregations:**
```graphql
query {
  products(
    order_by: [{ field: "non_existent_field", direction: ASC }]
  ) {
    id
    name
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Field 'non_existent_field' does not exist in type 'products'",
      "path": ["products"]
    }
  ]
}
```

### SQL Execution Errors

Runtime errors during SQL execution, reported at query level:

```graphql
query {
  products {
    id
    price_converted(to_currency: "INVALID")  # Invalid at runtime
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Invalid currency code: INVALID"
    }
  ]
}
```

## Next Steps

- Learn about [Aggregations](./7-aggregations.md) for grouping and computing statistics
- See [Dynamic Joins](./8-dynamic-joins.md) for ad-hoc query-time joins
- Check [Function Calls](./1-function-calls.md) for direct function invocation
- Review [Schema Definition - Function Calls](/docs/engine-configuration/schema-definition/data-objects/function-calls) for setup details
