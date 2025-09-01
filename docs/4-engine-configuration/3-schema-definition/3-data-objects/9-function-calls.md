---
title: Function Calls
sidebar_position: 9
---

# Function Calls

Hugr allows you to extend data objects with function call fields, enabling dynamic computations, external API calls, and custom business logic directly within your GraphQL queries.

## Basic Function Calls

Add a function result as a field using `@function_call`:


```graphql
# Define the function
extend type Function {
  calculate_discount(
    customer_id: Int!
    order_total: Float!
  ): Float @function(name: "calculate_customer_discount")
}

# Add as field to orders
extend type orders {
  discount: Float @function_call(
    references_name: "calculate_discount"
    args: {
      customer_id: "customer_id"
      order_total: "total"
    }
  )
}
```

Query the function result:

```graphql
query {
  orders {
    id
    total
    discount  # Automatically calculated
  }
}
```

Note: The `@sql` directive is used in the schema definition to create calculated fields, not in queries.

## Partial Argument Mapping

Map some arguments from fields, others from query:

```graphql
extend type products {
  price_in_currency: Float @function_call(
    references_name: "convert_price"
    args: {
      amount: "price"  # From product.price field
      # currency parameter will be added to query
    }
  )
}
```

Query with additional arguments:

```graphql
query {
  products {
    id
    price
    price_in_currency(currency: "EUR")
  }
}
```

## Table Function Calls

Call functions that return multiple rows:

```graphql
extend type Function {
  get_recommendations(
    product_id: Int!
    limit: Int = 5
  ): [recommended_product] @function(
    name: "get_product_recommendations"
    is_table: true
  )
}

extend type products {
  recommendations: [recommended_product] @function_call(
    references_name: "get_recommendations"
    args: {
      product_id: "id"
    }
  )
}
```

## Table Function with Join

The `@table_function_call_join` directive combines function results with join conditions. This allows basic data retrieval with argument mapping and join operations:

```graphql
extend type sensors {
  readings: [sensor_reading] @table_function_call_join(
    references_name: "get_sensor_readings"
    args: {
      sensor_id: "id"
    }
    source_fields: ["id"]
    references_fields: ["sensor_id"]
  )
}
```

Note: For advanced filtering, sorting, and aggregation of function results, consider using parameterized views instead.

## HTTP API Function Calls

Call external APIs as functions:

```graphql
extend type Function {
  get_weather(
    lat: Float!
    lon: Float!
  ): weather_data @function(
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

extend type locations {
  current_weather: weather_data @function_call(
    references_name: "get_weather"
    args: {
      lat: "latitude"
      lon: "longitude"
    }
  )
}
```

## Cross-Source Function Calls

Call functions from different data sources in extensions:

```graphql
# In extension data source
extend type postgres_customers {
  # Call MySQL function
  credit_score: Float @function_call(
    references_name: "calculate_credit_score"
    module: "mysql"
    args: {
      customer_id: "id"
    }
  )
  
  # Call HTTP API function
  social_profile: social_data @function_call(
    references_name: "get_social_profile"
    module: "social_api"
    args: {
      email: "email"
    }
  )
}
```

## Conditional Function Calls

Functions can handle null values:

```graphql
extend type Function {
  geocode_address(
    address: String
  ): Geometry @function(
    name: "geocode"
    skip_null_arg: true  # Don't call if address is null
  )
}

extend type customers {
  location: Geometry @function_call(
    references_name: "geocode_address"
    args: {
      address: "full_address"
    }
  )
}
```

## Function Calls in Aggregations

When using function calls that return arrays, you can aggregate the results:

```graphql
extend type products {
  reviews: [review] @function_call(
    references_name: "get_product_reviews"
    args: { product_id: "id" }
  )
}
```

Query with aggregation:

```graphql
query {
  products {
    id
    name
    reviews_aggregation {
      _rows_count
      rating {
        avg
        count
      }
    }
  }
}
```

## Chained Function Calls

Combine multiple function calls:

```graphql
extend type orders {
  # First function: calculate base discount
  base_discount: Float @function_call(
    references_name: "calculate_base_discount"
    args: { order_id: "id" }
  )
  
  # Second function: apply loyalty bonus
  final_discount: Float @function_call(
    references_name: "apply_loyalty_bonus"
    args: {
      customer_id: "customer_id"
      base_discount: "base_discount"
    }
  )
}
```

## Performance Considerations

### Efficient Function Execution

For best performance when calling functions for multiple rows:

1. **Use set-returning functions**: Create functions that return multiple rows at once
2. **Create parameterized views**: Define views with the function call that can be joined with the main table
3. **Leverage joins**: Use `@join` with a view containing the function results

Example with parameterized view:

```graphql
type product_recommendations_view @view(
  name: "product_recommendations"
  sql: """
    SELECT * FROM get_all_recommendations([$category_id])
  """
) @args(name: "recommendations_args") {
  product_id: Int!
  recommended_product_id: Int!
  score: Float!
}

input recommendations_args {
  category_id: Int!
}
```

### Limiting Function Executions

Control function execution with filters:

```graphql
query {
  products(
    filter: { status: { eq: "active" } }
    limit: 10
  ) {
    id
    # Function only called for filtered results
    recommendations {
      id
      name
    }
  }
}
```