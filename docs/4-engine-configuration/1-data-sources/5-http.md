---
label: HTTP RESTful API
sidebar_position: 6
keywords:
  - HTTP
  - REST
  - API
  - Data Source
  - GraphQL
description: "Learn how to configure HTTP RESTful APIs as data sources in the `hugr` GraphQL engine to enable integration with external services."
---

# HTTP RESTful API

The `hugr` GraphQL engine supports HTTP RESTful APIs as data sources, allowing you to integrate external services into your GraphQL schema. This is particularly useful for fetching data from third-party APIs or microservices.

## Set up HTTP RESTful API Data Source

To configure an HTTP RESTful API as a data source in the `hugr` engine, create a data source record in the `data_sources` table using the GraphQL API. The `path` should contain the base URL of the API. You can also specify additional parameters to configure security, provide an OpenAPI specification, and set other options.

```graphql
mutation addHttpDataSource($data: data_sources_mut_input_data! = {}) {
  core {
    insert_data_sources(data: $data) {
      name
      description
      as_module
      disabled
      path
      prefix
      read_only
      self_defined
      type
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "http_api",
    "type": "http",
    "path": "https://api.example.com",
    "prefix": "api",
    "description": "My HTTP RESTful API data source",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false
  }
}
```

## Perform HTTP Requests

The `hugr` engine supports the `http` data source type for HTTP REST APIs. Internally, HTTP data sources use the DuckDB backend to fetch data via the special SQL function `http_data_source_request_scalar`. This function allows you to make HTTP requests and retrieve data in a structured format for use in your GraphQL queries. To add HTTP RESTful APIs to the unified GraphQL schema, define `hugr` functions as `http_data_source_request_scalar` calls.

This function is also accessible through the `hugr` GraphQL API, allowing you to query external REST APIs directly in your GraphQL queries:

```graphql
query getCurrentWeather{
  function{
    core{
      http_data_source_request_scalar(
        source: "owm"
        path: "/data/2.5/weather"
        method: "GET"
        headers: {},
        parameters: {
          lat: 35.6895
          lon: 139.6917
        },
        body: {},
        jq: ""
      )
    }
  }
}
```

To add API calls as functions to the GraphQL schema, define catalogs for the data source with the function definitions, or add an OpenAPI specification and mark the data source as `self_defined`. The `hugr` engine will automatically generate the GraphQL schema based on the OpenAPI specification or the function definitions in the catalogs.

## Path and Parameters

The `path` should contain the base URL of the API. You can also specify additional parameters such as headers, query parameters, and request body. The `hugr` engine uses these parameters to make HTTP requests to the API. The path should look like `https://api.example.com/v1/resource?params=param_value`.

The URL without parameters is used as the base URL for API calls, while parameters are provided separately. Below is a full list of parameters that can be used to configure the HTTP data source:

| Parameter         | Type     | Description                                           | Example                                  |
|-------------------|----------|-------------------------------------------------------|------------------------------------------|
| `x-hugr-security` | JSON     | The string encoded JSON object that defines security settings for the data source. See the full list of object fields below. | `{"schema_name": "owm", "type": "http", "scheme": "basic", "username": "user", "password": "pass"}`                             |
| `x-hugr-spec-uri` | String   | The URL to the OpenAPI specification for the API. This is used to generate the GraphQL schema for the API. | `https://api.example.com/openapi.json`   |
| `x-hugr-spec-path` | String   | The path to the OpenAPI specification file. This can be a local file. | `/workspace/owm/spec.yaml`           |

## Security Settings

Security settings configure authentication and authorization for the HTTP data source. The `x-hugr-security` parameter should contain a JSON object with the following fields:

| Field            | Type   | Description                                                                 |
|------------------|--------|-----------------------------------------------------------------------------|
| `schema_name`    | String | The name of the security schema in the OpenAPI specification                |
| `type`           | String | The type of the security scheme, e.g., `http`, `oauth2`, `apiKey`.          |
| `scheme`         | String | The scheme name, used when the type field is `http`. Should be `basic`.     |
| `name`           | String | The name of the security scheme, used when the type field is `apiKey`.      |
| `in`             | String | The location of the API key, `header` or `query`.                           |
| `api_key`        | String | The API key value, used when the type field is `apiKey`.                    |
| `username`       | String | The username for basic authentication, used when the type is `http` or `oauth2`. |
| `password`       | String | The password for basic authentication, used when the type is `http` or `oauth2`. |
| `client_id`      | String | The client ID for OAuth2 authentication, used when the type is `oauth2`.   |
| `client_secret`  | String | The client secret for OAuth2 authentication, used when the type is `oauth2`. |
| `flow_name`      | String | The name of the OAuth2 flow, used when the type is `oauth2`. The flow will search in the `flows` field or in the OpenAPI specification security schema (defined by `name` =`schema_name` and `type` = `oauth2`). |
| `flows`          | Object | The OAuth2 flows object, used when the type is `oauth2`. This should be an OpenAPI3 OAuthFlows object. If the OpenAPI specification is provided, the flows from the OpenAPI specification from the selected security schema name will be used. |
| `timeout`        | Duration | The timeout for HTTP requests, used to limit the time spent on each request. Default is 30 seconds. |

The `hugr` engine supports the following flow types for the `oauth2` security scheme:

- `clientCredentials`
- `password`

## OAuth2 Customization

Many HTTP APIs use token authentication that is not fully compatible with the OAuth2 specification. The `hugr` engine supports customization of the token and refresh token requests.

You can customize the `oauth2` flow as shown in the following example:

```yaml
openapi: 3.1.0
info:
  title: Test Server
  version: 1.0.0
servers:
  - url: http://localhost:8080
    description: Local server
components:
  securitySchemes:
    oauth2_custom:
      type: oauth2
      description: Custom OAuth 2.0 flow
      flows:
        password:
          tokenUrl: /custom_login
          x-hugr-token-transform:
            method: POST
            request_body: "{login: $username, password: $password}"
            response_body: "{access_token: .accessToken, refresh_token: .refreshToken, token_type: \"bearer\", expires_in: 3600}"
          refreshUrl: /custom_refresh
          x-hugr-refresh-transform:
            method: POST
            request_body: "{refreshToken: .refresh_token}"
            response_body: "{access_token: .accessToken, refresh_token: .refreshToken, token_type: \"bearer\", expires_in: 3600}"
          scopes:
            read: Read access
            write: Write access
    oauth2:
      type: oauth2
      description: OAuth 2.0
      flows:
        password:
          tokenUrl: /token_with_refresh
          scopes:
            read: Read access
            write: Write access
        clientCredentials:
          tokenUrl: /token_with_refresh
          scopes:
            read: Read access
            write: Write access
```

To customize the OAuth2 flow, you can use the `x-hugr-token-transform` and `x-hugr-refresh-transform` fields to define request and response body jq transformations. These transformations allow you to adapt the request and response formats to match the requirements of the API you are integrating with. In these jq transformations, you can also use the following variables from the security settings:

- `$username` - the username from the security settings
- `$type` - the type of the security scheme, e.g. `http`, `oauth2`, `apiKey`
- `$schema_name` - the name of the security schema in the OpenAPI specification
- `$flow` - the name of the OAuth2 flow, used to select the flow from the `flows` field or from the OpenAPI specification security schema
- `$scheme` - the scheme name, used when the type field is `http`. Should be `basic`.
- `$api_key_name` - the name of the API key, used when the type field is `apiKey`
- `$api_key_in` - the location of the API key, `header` or `query`, used when the type field is `apiKey`
- `$api_key` - the API key value, used when the type field is `apiKey`
- `$username` - the username for basic authentication, used when the type is `http` or `oauth2`
- `$password` - the password for basic authentication, used when the type is `http` or `oauth2`
- `$client_id` - the client ID for OAuth2 authentication, used when the type is `oauth2`
- `$client_secret` - the client secret for OAuth2 authentication, used when the type is `oauth2`

The original request or response body is used as jq input, and the output is used as the new request or response body. This allows you to transform the request and response bodies to match the requirements of the API you are integrating with.

## Self-Describing APIs

The `hugr` engine supports self-describing APIs, allowing you to define the API schema using an OpenAPI specification. Use the `x-hugr-spec-uri` or `x-hugr-spec-path` parameters to specify the OpenAPI specification for the API. The `hugr` engine will use this specification to generate the GraphQL schema for the API.

### Format

The OpenAPI specification can be provided in either JSON or YAML format. The `hugr` engine will automatically detect the format based on the file extension or the content type of the response.

### Schema Generation

The `hugr` engine will generate the GraphQL schema based on the OpenAPI specification. For each endpoint and method, a `hugr` function will be generated, which can be used to query the API. In addition to functions, the required GraphQL types will be generated based on the OpenAPI specification.

The GraphQL specification has strict requirements for schema definition names. The `hugr` engine automatically converts OpenAPI specification names to valid GraphQL names by removing special characters (such as spaces, dashes, and other non-alphanumeric or non-English characters). Invalid characters are replaced with `X`. Nested OpenAPI schema objects include the parent name as a prefix, ensuring unique names in the GraphQL schema. The `hugr` engine generates the GraphQL schema, including types and fields, based on the OpenAPI specification.

The `hugr` engine also allows you to specify your own field name and type transformations. For this purpose, special OpenAPI extension fields can be used:

| Field                | Type   | Description                                                                 |
|----------------------|--------|-----------------------------------------------------------------------------|
| `x-hugr-field-name`  | String | The name of the field in the GraphQL schema. This can be used to override the default name generated from the OpenAPI specification. |
| `x-hugr-field-type`  | Object | The type of the field in the GraphQL schema. This can be used to override the default type generated from the OpenAPI specification. |
| `x-hugr-field-type.transform`  | String | The transformation name to apply to the field values. Currently implemented: `FromUnixTime`, `StringAsGeoJson`. |
| `x-hugr-field-type.geometry_info`  | Object | The geometry information for the field in the GraphQL schema. This can be used to override the default geometry information. |
| `x-hugr-field-type.geometry_info.geometry_type`  | String | The type of the geometry, e.g. `Point`, `LineString`, `Polygon`. |
| `x-hugr-field-type.geometry_info.srid`  | Integer | The SRID of the geometry, e.g. `4326` for WGS 84. |

Example of the OpenAPI specification with the `x-hugr-field-name` and `x-hugr-field-type` fields:

```yaml
openapi: 3.1.0
info:
  title: OpenWeatherMap
  version: 0.0.1
servers:
  - url: https://api.openweathermap.org
    description: OpenWeatherMap
components:
  securitySchemes:
    owm:
      type: apiKey
      description: API key authentication
      in: query
      name: appid
  schemas:
    current_weather:
      type: object
        dt:
          type: integer
          x-hugr-type:
            type: Timestamp
            transform: "FromUnixTime"
        rain:
          $ref: "#/components/schemas/perc_info"
        snow:
          $ref: "#/components/schemas/perc_info"
        sys:
          type: object
          x-hugr-name: "common"
          properties:
            sunrise:
              type: integer
              x-hugr-type:
                type: Timestamp
                transform: "FromUnixTime"
            sunset:
              type: integer
              x-hugr-type:
                type: Timestamp
                transform: "FromUnixTime"
    perc_info:
      type: object
      properties:
        1h:
          type: number
          x-hugr-name: current
```

In this example, the `dt` field is converted to the `Timestamp` type using the `FromUnixTime` transformation. The `sys` object is renamed to `common`. The `sys.sunrise` and `sys.sunset` fields are also converted to the `Timestamp` type using the `FromUnixTime` transformation. The `1h` field in the `perc_info` object is renamed to `current`.

## Add Function Views

The GraphQL schema generated by `hugr` includes types and functions based on the OpenAPI specification. However, you can also define your own functions to extend the schema with additional functionality or to create custom parameterized views of external data. Technically, the `http` data source is a memory DuckDB data source, so you can define functions in the same way as for the DuckDB data source. The `hugr` engine will automatically generate the GraphQL schema based on the defined functions.

You can add additional catalog sources that contain view definitions, as shown in the example below:

```graphql
type devices_view @view(name: "devices_view",
        sql: """
            SELECT data.*
            FROM (
                (SELECT UNNEST(json_transform(http_data_source_request_scalar(
                    '[$catalog]', '/devices', 'POST', '{}'::JSON, '{}'::JSON, '{}'::JSON, 
                    '.items[] | {id: .id, name: .name, number: .number, address: .address, is_managed: .isManaged, coordinates: .coordinates}'
                )::JSON, '[{"address": "VARCHAR", "coordinates": "VARCHAR", "id":"VARCHAR", "is_managed": "BOOLEAN", "name": "VARCHAR", "number": "VARCHAR"}]')) AS data) 
            )
        """
    ) 
    @module(name: "iot") {
    id: String
    name: String
    number: String
    address: String
    is_managed: Boolean
    geom: Geometry @field_source(field: "coordinates") @geometry_info(srid: 4326, type: POINT) @sql(exp: "ST_GeomFromGeoJSON(geom)")
    telemetry: devices_telemetry_view @join(references_name: "devices_telemetry_view", source_fields: ["id"], references_fields: ["id"])
}

type devices_telemetry_view @view(name: "devices_telemetry_view" 
    sql: """
        WITH devices AS (
            SELECT LIST(data.id) AS ids
            FROM (SELECT UNNEST(json_transform(http_data_source_request_scalar('[$catalog]', '/devices', 'POST', '{}'::JSON, '{}'::JSON, '{}'::JSON, '. | .items[] | {id: .id, is_managed: .isManaged}')::JSON, '[{"id":"VARCHAR", "is_managed": "BOOLEAN"}]')) AS data) 
            WHERE data.is_managed
        ), telemetry_response AS (
            SELECT http_data_source_request_scalar('[$catalog]', '/devices/telemetry', 'POST', '{}'::JSON, '{}'::JSON, {deviceIds: devices.ids}::JSON, 
                '.devicesTelemetry[] | {id: .id, dateTimeEvent: .dateTimeEvent, stateTypeId: .stateTypeId, controlTypeId: .controlTypeId, errors: .errors}')::JSON AS response
            FROM devices
        )
        SELECT data.*
        FROM (
            SELECT UNNEST(json_transform(telemetry_response.response, 
                '[{"id": "VARCHAR", "dateTimeEvent": "VARCHAR", "stateTypeId": "INTEGER", "controlTypeId": "INTEGER", "errors": "JSON"}]'
            )) AS data
            FROM telemetry_response 
        )
    """
) @module(name: "iot") {
    id: String
    eventTime: Timestamp @sql(exp: "try_cast(dateTimeEvent AS TIMESTAMP)")
    stateTypeId: Int @field_references(field: "id", references_name: "status_types_view", query: "state", references_query: "devices_telemetry")
    controlTypeId: Int @field_references(field: "id", references_name: "control_types_view", query: "control", references_query: "devices_telemetry")
    errors: JSON
}


type status_types_view @view(name: "status_types_view",
        sql: """
            FROM (VALUES
                (1,'Managed'),
                (2,'Monitoring'),
                (3,'No connection'),
                (4,'Error'),
                (5,'Unmonitored'),
            ) as data(id,name)
        """
    )
    @module(name: "iot") {
    id: Int! @pk
    name: String
}

type control_types_view @view(name: "control_types_view",
        sql: """
            FROM (VALUES
                (1, 'unknown'),
                (2, 'manual control'),
                (3, 'automatic control'),
                (4, 'remote control'),
                (5, 'local control')
            ) as data(id,name)
        """
    ) 
    @module(name: "iot") {
    id: Int @pk
    name: String
}
```

This example defines two views: `devices_view` and `devices_telemetry_view`. The `devices_view` fetches data from the `/devices` endpoint and transforms it into a structured format. The `devices_telemetry_view` fetches telemetry data for the devices and joins it with the `devices_view` based on the device ID.  
After defining these views, you can use them in your GraphQL queries to fetch, aggregate, or join data with other data objects.

## Extend Data Objects with Function Calls

Once the data source is configured and the functions are defined, you can use them in your GraphQL queries to fetch data from the external API. You can also extend data objects from other data sources with function call fields, allowing you to perform calls with table values as parameters, as shown in the example below.

```graphql
{
  dicts{
    common{
      dictionary_types{
        id
        name
        test_get{
          name
          value
        }  
      }
      dictionary_types_aggregation{
        test_get{
          name{
            count
          }
          value{
            sum
          }
        }
      }
    }
  }
}
```

## Examples

You can find examples of using HTTP RESTful APIs as data sources in the `hugr` examples repository. Notable examples include:

- [OpenWeatherMap Example](../../9-examples/4-rest-owm.mdx) – demonstrates how to use the OpenWeatherMap API to fetch current weather data, using API key authentication.
