---
title: Functions
sidebar_position: 3
description: Defining and using functions in Hugr schema
---

The many data sources can provide functions to return specific data or perform operations on the data. These functions can be used in queries and mutations to manipulate and retrieve data in a more flexible way.

For database sources it can be stored functions or SQL queries, that will execute in the context of the database.

For http data sources, it can be REST API calls that executes the special SQL function `http_data_source_request_scalar` in the inmemory DuckDB database context.

## Defining Functions

To define a function in the schema definition, you should extend the system type `Function` or `MutationFunction`, if you want to create a mutation function that will execute in a transaction. Add function definition as a type field and mark it with the `@function` directive.

```graphql
extend type Function {
  scalar_function(arg1: String!): String
    @function(name: "scalar_function")
  type_function(arg1: String!, arg2: Int!): function_result
    @function(name: "type_function")
  table_function(arg1: String!): [function_result]
    @function(name: "table_function")
}

type function_result {
  value: String
}
```

Functions can accept positional scalar arguments, and return scalars, structured types, or lists of them.
For PostgreSQL functions the returned structured type automaticaly casts from record to structured type and for functions that returns list of structured types, the database function should return a record set.

If the function returns the JSON (or JSONB in PostgreSQL), the `@function` directive must include the `json_cast` flag set to true to cast result from JSON to struct and `is_table` flag if it is a table function.

The `@function` directive defines how the function should be executed.

```graphql
# define function info (apply to the extended Function or MutationFunction type)
directive @function(
  """
  Name of the database function, if there is no existing function use the abstract name.
  """
  name: String!,
  """
  SQL query to use it as a function
  """
  sql: String,
  """
  Flag that indicates whether to skip null arguments if there is only one argument.
  """
  skip_null_arg: Boolean,
  """
  Flag that indicates whether to treat the function as a table function.
  """
  is_table: Boolean,
  """
  Flag that indicates whether to cast the result from JSON to struct.
  """
  json_cast: Boolean
) on FIELD_DEFINITION
```

You can also define functions as result of any valid SQL expression, that return a scalar, structured type, or a list of them.

The function arguments can be used in the SQL expression, you should refer to them by their names in brackets `[]`.

```graphql
extend type Function {
  "Current weather from OpenWeatherMap in raw format"
  current_weather(lat: Float!, lon: Float!): current_weather_response
    @function(
      name: "get_current_weather_raw"
      sql: "http_data_source_request_scalar([$catalog], '/data/2.5/weather', 'GET', '{}'::JSON, {lat: [lat], lon: [lon], units: 'metric'}::JSON, '{}'::JSON, '')"
      json_cast: true
    )
}
```

You can rename the fields of returned structure types and sets using `@field_source` directive.

```graphql
type current_weather_response {
  id: Int
  name: String
  base: String
  coord: coords
  dt: BigInt
  main: main_weather_info
  weather: [weather_conditions]
  clouds: clouds_info
  rain: perc_info
  snow: perc_info
  visibility: Int
  wind: wind_info
  common: sys_info @field_source(field: "sys")
}


type coords {
  lat: Float
  lon: Float
}

type clouds_info {
  all: Float
}

type perc_info {
  current: Float @field_source(field: "1h")
}

type wind_info {
  speed: Float
  deg: Float
  gust: Float
}

type main_weather_info {
  feels_like: Float
  grnd_level: Float
  humidity: Float
  pressure: Float
  sea_level: Float
  temp: Float
  temp_max: Float
  temp_min: Float
}

type weather_conditions {
  id: Int
  name: String @field_source(field: "main")
  icon: String
  description: String
}

type sys_info {
  sunrise: BigInt
  sunset: BigInt
  country: String
}
```

To make a call to the http API, you can use the `http_data_source_request_scalar` function in the SQL query. This function allows you to specify the HTTP method, headers, and body for the request, as well as any query parameters.

The `http_data_source_request_scalar` SQL function arguments:
- `catalog`: The name of http data source.
- `path`: The path of the HTTP API endpoint.
- `method`: The HTTP method to use (e.g., GET, POST).
- `headers`: The headers to include in the request.
- `query_params`: The query parameters for the request.
- `body`: The body of the request.
- `jq`: jq expression to transform the response.

You can use the special variable `[$catalog]` to refer to the data source context.

## Mutation function definition

```graphql
extend type MutationFunction {
  "Disable sensor"
  disable_sensor(id: ID!): operation_status
    @function(
      name: "disable_sensor"
      sql: "http_data_source_request_scalar([$catalog], '/api/sensors/disable', 'POST', '{}'::JSON, {id: [id]}::JSON, '{}'::JSON, '')"
    )
}
```

## Function Calls

The functions can be called directly in the GraphQL queries or it can be used as fields in the data objects if it was defined in the schema definition. It is possible to add function calls fields to the data objects from different sources and map their arguments through `extension` data source.

Direct calls:
All direct function calls set in the `function` field in `query_root` can be used in the queries.

```graphql
query {
  function {
    current_weather(lat: 40.7128, lon: -74.0060) {
      id
      name
      main {
        temp
        pressure
        humidity
      }
    }
  }
}
```

Or for mutations:
```graphql
mutation {
  function {
    disable_sensor(id: "sensor-1") {
      success
    }
  }
}
```

If `module` is set for the function it can be put in the `module` field `function` type.

```graphql
extend type Function {
  "Current weather from OpenWeatherMap in raw format"
  current_weather(lat: Float!, lon: Float!): current_weather_response
    @function(
      name: "get_current_weather_raw"
      sql: "http_data_source_request_scalar([$catalog], '/data/2.5/weather', 'GET', '{}'::JSON, {lat: [lat], lon: [lon], units: 'metric'}::JSON, '{}'::JSON, '')"
      json_cast: true
    )
    @module(name: "service.weather")
}
```

```graphql
query {
  function {
    services {
      weather {
        current_weather(lat: 40.7128, lon: -74.0060) {
          id
          name
          main {
            temp
            pressure
            humidity
          }
        }
      }
    }
  }
}
```

Function calls as fields:
```graphql
query {
  cities {
    id
    name
    country
    geom(transforms: [Centroid])
    current_weather: current_weather {
      main {
        temp
        pressure
        humidity
      }
    }
  }
}
```



