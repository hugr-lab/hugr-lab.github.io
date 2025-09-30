---
title: Directives Reference
sidebar_position: 2
---

`hugr` uses custom GraphQL directives to define data source models. These directives allow you to specify additional metadata and behavior for your data sources, such as relationships between tables, subqueries, function calls, and more.

## List of Directives

| Directive | Description |
| --------- | ----------- |
| `@table` | Defines a table in the data source. |
| `@view` | Defines a view in the data source. |
| `@function` | Maps a field to a function call or a database function. |
| `@module` | Organizes queries and mutations into modules. |
| `@args` | Defines arguments for parameterized views. |
| `@named` | Marks an input field as a named argument for parameterized views. |
| `@pk` | Marks a field as a primary key. |
| `@unique` | Adds a unique constraint to fields. |
| `@sql` | Defines a SQL expression for a field. |
| `@default` | Sets a default value or sequence for a field. |
| `@field_source` | Maps a field to a database column. |
| `@geometry_info` | Adds geometry type and SRID information to a field. |
| `@filter_required` | Requires a field in query filters. |
| `@dim` | Set the dimension of the vector field. |
| `@hypertable` | Marks an object as a TimescaleDB hypertable. |
| `@timescale_key` | Marks a field as a TimescaleDB time key. |
| `@cube` | Marks an object as a cube for pre-aggregation. |
| `@measurement` | Marks a field as a measurement in a cube. |
| `@references` | Defines a foreign key at the object level. |
| `@field_references` | Defines a foreign key at the field level. |
| `@join` | Defines a join with another data object. |
| `@function_call` | Calls a function with arguments. |
| `@table_function_call_join` | Calls a table function with a join. |
| `@cache` | Enables caching for a field or object. |
| `@no_cache` | Disables caching for a field or query. |
| `@invalidate_cache` | Invalidates the cache for a field or query. |
| `@stats` | Returns execution statistics for a query. |
| `@with_deleted` | Includes soft-deleted records in results. |
| `@raw` | Returns data in raw format (e.g., WKB for geometry). |
| `@unnest` | Flattens subquery results (like a SQL JOIN). |
| `@no_pushdown` | Prevents pushdown of aggregation/join to the database. |
| `@system` | Marks a field or type as a system entity. |
| `@module_root` | Marks a type as a module root object. |
| `@original_name` | Stores the original name of an object or field. |
| `@filter_input` | Marks an object as a filter input. |
| `@filter_list_input` | Marks an object as a filter list input. |
| `@data_input` | Marks an object as a data input. |
| `@query` | Marks an object or field as a query. |
| `@mutation` | Marks an object or field as a mutation. |
| `@catalog` | Marks an object or field as a catalog. |
| `@aggregation` | Marks an object as an aggregation. |
| `@field_aggregation` | Marks a field or object as a field aggregation. |
| `@aggregation_query` | Marks a field as an aggregation query. |
| `@extra_field` | Marks a field as an extra field. |
| `@add_h3` | Defines H3 functions and parameters. |
| `@feature` | Marks query results as GIS features. |
| `@wfs` | Makes an object accessible via WFS. |
| `@wfs_field` | Makes a nested object field flat in the WFS response. |
| `@wfs_exclude` | Excludes a field from the WFS response. |


## Directive Reference

### @table


The `@table` directive is used to define a table in the data source. It can be applied to an object type to indicate that it corresponds to a table in the underlying database.
If the object is marked as a table, queries and mutations for CRUD operations will be generated automatically for that table.

This directive can be used for data tables in SQL-based data sources such as PostgreSQL, MySQL, DuckDB, and Ducklake.

```graphql
# Mark object as table in the datasource
directive @table(
  """
  Name of the table in the database
  """
  name: String!, 
  """
  Indicates if the table is a many-to-many relationship between two tables
  """
  is_m2m: Boolean = false, 
  """
  Apply soft delete to table
  """
  soft_delete: Boolean = false, 
  """
  Soft delete condition to check if record is deleted
  """
  soft_delete_cond: String, 
  """
  Soft delete update condition to update record as deleted
  """
  soft_delete_set: String
) on OBJECT
```

Example usage:

```graphql
# Customers table
type customers @table(
  name: "customers"
  soft_delete: true
  soft_delete_cond: "deleted_at IS NULL"
  soft_delete_set: "deleted_at = NOW()"
) {
  id: String! @pk @field_source(field: "customer_id")
  company_name: String!
  contact_name: String!
  contact_title: String
  address: String
  city: String
  region: String
  postal_code: String
  country: String
  phone: String
  fax: String
  deleted_at: Timestamp
}
```

### @view


The `@view` directive is used to define a view in the data source. It can be applied to an object type to indicate that it corresponds to a view in the underlying database.
If the object is marked as a view, queries for reading and aggregating data from that view will be generated automatically.

```graphql
# Mark object as view in the datasource
directive @view(
  """
  Name of the view in the database.
  """
  name: String!, 
  """
  SQL query to define the view if there is no existing view in the database
  """
  sql: String
) on OBJECT
```

Example usage:

```graphql
# Shipped products view
type shipped_products_view 
  @view(
    name: "shipped_products"
    sql: """
    SELECT 
      orders.customer_id,
      orders.employee_id,
      orders.order_date,
      orders.shipped_date,
      orders.ship_via,
      order_details.product_id,
      order_details.unit_price,
      order_details.quantity,
      order_details.discount,
      products.supplier_id,
      products.category_id
    FROM orders
        INNER JOIN order_details ON orders.order_id = order_details.order_id
        INNER JOIN products ON order_details.product_id = products.product_id
    WHERE orders.shipped_date IS NOT NULL
    """
  ) 
{
  customer_id: String! @field_references(
    name: "shipped_products_view_customer_id"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer"
    references_query: "shippedProducts"
    references_description: "Shipped products for this customer"
  )
  employee_id: Int! @field_references(
    name: "shipped_products_view_employee_id"
    references_name: "employees"
    field: "id"
    query: "employee"
    description: "Employee"
    references_query: "shippedProducts"
    references_description: "Shipped products handled by this employee"
  )
  order_date: Timestamp
  shipped_date: Timestamp
  ship_via: Int @field_references(
    name: "shipped_products_view_ship_via"
    references_name: "shippers"
    field: "id"
    query: "shipper"
    description: "Shipper"
    references_query: "shippedProducts"
    references_description: "Shipped products by this shipper"
  )
  product_id: Int! @field_references(
    name: "shipped_products_view_product_id"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product"
    references_query: "shippedProducts"
    references_description: "Shipped product details in this order"
  )
  unit_price: Float!
  quantity: Int!
  discount: Float!
  supplier_id: Int! @field_references(
    name: "shipped_products_view_supplier_id"
    references_name: "suppliers"
    field: "id"
    query: "supplier"
    description: "Supplier of the product in the order details view."
  )
  category_id: Int! @field_references(
    name: "shipped_products_view_category_id"
    references_name: "categories"
    field: "id"
    query: "category"
    description:
      "Category of the product in the order details view."
  )
  total: Float! @sql(exp: "round(([unit_price] * [quantity] * (1 - [discount]))*100)/100")
}
```

### @function


The `@function` directive is used to define a custom function in the data source. It can be applied to an object type to indicate that it corresponds to a function in the underlying database, or it can be used to execute a SQL query.

This directive can be used to describe both database functions and HTTP functions (for HTTP data sources).

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
  Flag that indicates whether to skip null arguments.
  """
  is_table: Boolean,
  """
  Flag that indicates whether to cast the result from JSON to struct.
  """
  json_cast: Boolean
) on FIELD_DEFINITION
```


If no SQL is provided, the SQL for the function call will be generated automatically based on the function name and arguments. In this case, arguments will be passed in the same order as defined in the field.

If SQL is provided, it is expected that the correct SQL query is defined. To use arguments, you can refer to them by their name in brackets (e.g., `[lat]`).

There is a special variable `$catalog` that can be used to refer to the current catalog (data source name).

Example usage:

```graphql
extend type Function {
  "Current weather from OpenWeatherMap in raw format"
  current_weather_raw(lat: Float!, lon: Float!): JSON
    @function(
      name: "get_current_weather_raw"
      sql: "http_data_source_request_scalar([$catalog], '/data/2.5/weather', 'GET', '{}'::JSON, {lat: [lat], lon: [lon], units: 'metric'}::JSON, '{}'::JSON, '')"
      json_cast: true
    )

  "Current weather from OpenWeatherMap in raw format"
  current_weather(lat: Float!, lon: Float!): current_weather_response
    @function(
      name: "get_current_weather"
      sql: "http_data_source_request_scalar([$catalog], '/data/2.5/weather', 'GET', '{}'::JSON, {lat: [lat], lon: [lon], units: 'metric'}::JSON, '{}'::JSON, '')"
      json_cast: true
    )
}

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

### @module


The `@module` directive is used to define a module in the schema. A module is a way to group queries and mutations together. This can be useful for organizing your schema and making it easier to manage.

```graphql
# Define module for data objects and functions
directive @module(name: String!) on OBJECT | FIELD_DEFINITION
```


Modules can have a hierarchy, allowing for nested modules. To define a nested module, simply use a dot (`.`) as a separator in the name, e.g., `module.nested.subnested`.

Example usage:

```graphql
type customers @table(name: "customers") 
@module(name: "crm.dictionary") {
  id: BigInt!
  name: String!
  email: String!
  age: Int!
}

extend type Function {
  "Get customer balance by ID"
  customer_balance(id: ID!): customers
    @function(
      name: "get_customer_balance"
      sql: "SELECT balances FROM customers WHERE id = [id]"
    )
    @module(name: "crm.dictionary")
}
```

### @args


The `@args` directive is used to define parameterized views in the schema. This allows you to create views that can accept arguments and return data based on those arguments.

This directive can only be applied to types that are marked with `@view`.

```graphql
# The arguments for the view directive defines input name to request data
directive @args(name: String!, required: Boolean = false) on OBJECT
```


It accepts the name of the defined input and a flag indicating whether it is required.

Example usage:

```graphql
type weather_on_date @view(
    name: "weather_on_date"
    sql: """
    SELECT * FROM iot.current_weather([$requested_time], [$requested_location])
    """
) @args(name: "input_weather_on_date", required: true) {
  device_id: BigInt @pk
  last_seen: Timestamp
  location: String
  weather: weather_conditions
}

input input_weather_on_date {
  requested_time: Timestamp!
  requested_location: String = "any"
}
```

### @named


The `@named` directive is applied to input fields that are used as arguments in parameterized views (see `@args`).
If the SQL for the view is not present, it is assumed that the parameterized view is a SQL function that returns a record set. In this case, arguments are passed as positional and named arguments, and the SQL is constructed at query time, applying positional arguments first, then named arguments.

```graphql
# The argument is named
directive @named(name: String) on INPUT_FIELD_DEFINITION 
```

Example usage:

```graphql
type current_weather @view(name: " iot.current_weather") 
@args(name: "input_current_weather", required: true) {
  device_id: BigInt @pk
  last_seen: Timestamp
  location: String
  weather: weather_conditions
}

input input_current_weather {
  requested_time: Timestamp!
  requested_location: String = "any" @named(name: "location")
}
```

### @pk


The `@pk` directive is used to define a primary key for a type. A primary key is a unique identifier for a record in a database table. This is important for ensuring data integrity and for efficiently querying and updating records. The `@pk` directive can be applied to multiple fields within a type.

The `@pk` directive should only be used with data objects (tables or views).

If the `@pk` directive is applied to data object fields, a query will be generated to retrieve a single record from the table or view using the primary key fields as arguments. This query will be named `<table>_<view>_by_pk`.

```graphql
# Define primary key for a table
directive @pk on FIELD_DEFINITION
```

Example usage:

```graphql
type customers @table(name: "customers") {
  id: BigInt! @pk
  name: String!
  email: String!
  age: Int!
}

type orders @table(name: "orders") {
  id: BigInt! @pk
  company_id: BigInt! @pk
  customer_id: BigInt!
  product_id: BigInt!
  quantity: Int!
  status: String!
}

```

### @unique


The `@unique` directive is used to define a unique constraint on data objects. This ensures that the values in the specified fields are unique across all records in the database table. The `@unique` directive can be applied multiple times within a type.

```graphql
# Add unique constraint to the object
directive @unique(fields: [String]!, query_suffix: String, skip_query: Boolean) repeatable on OBJECT
```


It accepts a list of field names to apply the unique constraint to, an optional query suffix to use in generated queries, and a flag to skip query generation for this constraint.

If a query suffix is not provided, it will be generated as `<field>_by_<field1>_<field2>`.

Example usage:

```graphql
type customers @table(name: "customers") @unique(fields: ["email"]) {
  id: BigInt! @pk
  name: String!
  email: String!
  age: Int!
}
```

### @sql


The `@sql` directive is used to define a SQL expression for calculating the value of a field. This allows you to create calculated fields whose values are derived from SQL queries.

Other field values from the table can be used in the SQL expression, but to avoid name collisions use `objects` alias - `objects.<field_name>`. If you need access to the data object fields (with `@field_source` and `@sql` directives), wrap them in square brackets `[]`.

```graphql
# sql for calculate field value, expression should be in sql format, all fields should placed in the []
directive @sql(exp: String!) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
```

Example usage:

```graphql
extend type providers {
  total_payments_amount: Float @sql(exp: "COALESCE([total_general_amount],0) + COALESCE([total_research_amount], 0)")
  last_payment_date: Timestamp @sql(exp: "to_timestamp([last_payment_date])")
}
```


This example assumes that the provider table was defined somewhere in the GraphQL schema definition files.

### @default


The `@default` directive allows you to define default values for fields in your GraphQL schema. For PostgreSQL and DuckDB tables, you can define a sequence name to auto-generate ID values. This will be used in the insert mutation.

```graphql
# default value for field, if field is not nullable, define sequences for the field
directive @default(
	"""
	Default value for the field
	"""
	value: any
	"""
	Sequence for the autogenerated identifier
	"""
	sequence: String
	"""
	Insert sql expressions for the field that returns inserted value. Can use values from input argument - [$<input field name>].
	"""
	insert_exp: String
	"""
	Update sql expressions for the field that returns updated value. Can use values from input argument - [$<input field name>] and current row values with prefix objects.<field_name>.
	"""
	update_exp: String
) on FIELD_DEFINITION
```

You can set the `insert_exp` and `update_exp` fields to define custom SQL expressions for inserting and updating the field values. In expressions you can use values from the input arguments and current row values. 
To reference the current row values, use the `objects` table alias. 
To reference the input arguments, use the `[$<input field name>]`.
You can also reference to the authentication variables:
- [$auth.user_id] - the ID of the authenticated user, string.
- [$auth.user_id_int] - the ID of the authenticated user casted to the integer, if it can be casted than 0.
- [$auth.user_name] - the username of the authenticated user, string.
- [$auth.role] - the role of the authenticated user, string.
- [$auth.auth_type] - the authentication type of the authenticated user, string.
- [$auth.provider] - the authentication provider of the authenticated user, string.

You can use these expression to pre-process input values before they will pass to the data source.

### @field_source


The `@field_source` directive is used to specify the name of the field in the database that corresponds to a field in your GraphQL schema. This is useful for mapping GraphQL fields to their underlying database columns, especially when the names differ.

```graphql
# field name in the database
directive @field_source(field: String!) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
```

Example usage:

```graphql
type customers {
  id: BigInt! @pk
  name: String! @field_source(field: "customer_name")
  email: String! @field_source(field: "customer_email")
  age: Int! @field_source(field: "customer_age")
}
```

### @geometry_info


The `@geometry_info` directive is used to specify geometric information for a field in your GraphQL schema. This is useful for mapping GraphQL fields to their underlying geometric data types in the database.

```graphql
# define additional info for the geometry field
directive @geometry_info(type: GeometryType, srid: Int) on FIELD_DEFINITION

enum GeometryType @system {
  POINT
  LINESTRING
  POLYGON
  MULTIPOINT
  MULTILINESTRING
  MULTIPOLYGON
  GEOMETRYCOLLECTION
}
```

Example usage:

```graphql
type locations {
  id: BigInt! @pk
  name: String!
  coordinates: Geometry @geometry_info(type: POINT, srid: 4326)
}
```


The `@geometry_info` directive is used to specify geometric information for a field in your GraphQL schema. This is useful for mapping GraphQL fields to their underlying geometric data types in the database.

### @filter_required


The `@filter_required` directive is used to specify that a field is required when filtering data in queries. This means that the field must be included in the filter arguments for the query to be valid.

```graphql
directive @filter_required on FIELD_DEFINITION 
```

Example usage:

```graphql
type orders {
  id: BigInt! @pk
  order_date: Timestamp! @filter_required
  name: String!
  price: Float!
  category: String!
}
```

### @dim

The `@dim` directive is used to specify the dimension of a vector field in your GraphQL schema. This is particularly useful when working with vector data types, such as those used for embeddings and similarity search.

```graphql
directive @dim(len: Int!) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION | ARGUMENT_DEFINITION
```

### @embeddings

The `@embeddings` directive is used to specify embedding generation parameters for a vector field in your GraphQL schema. 

```graphql
directive @embeddings(
	"The name of the data source type `embedding`"
	model: String!
	"The name of the field that contains embeddings vector"
	vector: String!
	"The distance metric to use for the vector search"
	distance: VectorDistanceType!
) on OBJECT

enum VectorDistanceType @system {
  "L2 distance"
  L2
  "Cosine similarity"
  Cosine
  "Inner product"
  Inner
}
```

The `model` argument specifies the name of the embedding data source that should be attached to the hugr engine configuration. The `vector` argument specifies the name of the field that contains the embeddings vector. The `distance` argument specifies the distance metric to use for the vector search.

Example usage:

```graphql
type documents @table(name: "documents") @embeddings(
  model: "text-embedding-3-small",
  vector: "embedding",
  distance: Cosine
) {
  id: BigInt! @pk
  category: String!
  content: String!
  embedding: Vector! @dim(len: 1536)
}
```

It allows you to perform semantic search queries on the `documents` table using the specified embedding model and distance metric.

```graphql
query {
  documents(
    filter: {category: {eq: "general"}}
    semantic: {
      query: "What is GraphQL?"
      limit: 5
    }
  ) {
    id
    content
    embedding
  }
}
```



### @hypertable and @timescale_key


The `@hypertable` directive is used to mark a data object (table or view) as a PostgreSQL TimescaleDB Hypertable or continuous aggregate view. This allows TimescaleDB to automatically partition the data by time, improving query performance for time-series data.
If the data object is marked as a hypertable, it is recommended to also mark the timestamp field with the `@timescale_key` directive to use TimescaleDB features effectively.

```graphql
"""
Mark data object (table, view, cube) as PostgreSQL TimescaleDB Hypertable
"""
directive @hypertable on OBJECT
"""
Mark timestamp field as a postgres timescale key in hypertable or continues aggregation view
"""
directive @timescale_key on FIELD_DEFINITION
```

Example usage:

```graphql
type sensor_data {
  sensor_id: BigInt! @pk
  temperature: Float! @pk @timescale_key
  humidity: Float!
}
```

### @cube and @measurement


The `@cube` directive is used to mark a data object (table or view) as a cube, which allows for pre-aggregation of data before it is selected based on the selection set.
If the data object is marked as a cube, it is recommended to also mark the fields that should be aggregated with the `@measurement` directive.

The `@measurement` directive is used to mark a field as a measurement in a cube. It adds an aggregation function argument to the field, allowing you to select the aggregation function that will be applied to the field during pre-aggregation. The available aggregation functions are defined in the corresponding measurement aggregation enums for the field's type.

```graphql
"""
Mark data object as cube, data will be pre aggregated before selected base on selection set
"""
directive @cube on OBJECT

"""
Mark field as measurement in cube.
If a field is marked as a measurement and the object is marked as a cube, an aggregation function parameter will be added to the field.
The aggregation function should return the same type as the field type.
"""
directive @measurement on FIELD_DEFINITION

enum IntMeasurementAggregation @system {
  SUM
  AVG
  MIN
  MAX
  ANY
}

enum BigIntMeasurementAggregation @system {
  SUM
  AVG
  MIN
  MAX
  ANY
}

enum FloatMeasurementAggregation @system {
  SUM
  AVG
  MIN
  MAX
  ANY
}

enum StringMeasurementAggregation @system {
  ANY
}

enum BooleanMeasurementAggregation @system {
  ANY
  OR
  AND
}

enum DateMeasurementAggregation @system {
  MIN
  MAX
  ANY
}

enum TimestampMeasurementAggregation @system {
  MIN
  MAX
  ANY
}

enum TimeMeasurementAggregation @system {
  MIN
  MAX
  ANY
}
```

Example usage:

```graphql
# cube definition
type sales @table(name: "sales") @cube {
  id: BigInt! @pk
  customer_id: BigInt @field_references(name: "customers", field: "id", query: "customer", references_query: "sales")
  product_id: BigInt @field_references(name: "products", field: "id", query: "product", references_query: "sales")
  order_date: Date
  quantity: Int! @measurement
  price: Float! @measurement
  amount: Float! @measurement
  created_at: Timestamp! @measurement
}
```

```graphql
# Querying the sales cube
query {
  sales {
    order_date(bucket: quarter)
    quantity(measurement_func: SUM)
    price(measurement_func: AVG)
    amount(measurement_func: SUM)
  }
}
```

This query will return the sales data aggregated by quarter for the `order_date`, and the total quantity, average price, and total amount for each quarter. If a field the measurement function is not specified the field will add to the grouping.

The cube data object is pre-aggregated before joining with other data objects, this means if you add to selection set fields from subquery, the references fields will be automatically included in the grouping and result set will be not aggregated by the subquery fields. You can think of it as a way to optimize query performance by reducing the amount of data that needs to be processed at query time or use it as classical OLAP cube.

```graphql
query {
  sales {
    customer {
      category_id
    }
    order_date(bucket: quarter)
    quantity(measurement_func: SUM)
    price(measurement_func: AVG)
    amount(measurement_func: SUM)
  }
}
```

This query will return the sales data aggregated by customer_id, quarter for the `order_date`, and the total quantity, average price, and total amount for each quarter.


### Foreign keys @references and @field_references


There are two directives for defining foreign keys in the schema: `@references`, which applies at the data object level, and `@field_references`, which applies at the field level if the reference is to a single field.

`hugr` foreign keys do not require existing constraints in the database and can be used to define relationships between data objects without modifying the underlying database schema.

Foreign keys allow you to extend generated queries with:

- Filtering by related object fields
- Subquery fields to select related data in a single query
- Aggregation and grouping by related object fields
- Subquery fields to select aggregated related data

```graphql
# define FK on the data object (view or table)
directive @references(
  """
  The name of foreign key relationship between data objects.
  """
  name: String
  """
  The name of related data object.
  """
  references_name: String!
  """
  The name of the fields in the data object to reference.
  """
  source_fields: [String!]!
  """
  The name of the fields in the related data object.
  """
  references_fields: [String!]!
  """
  The description of the subquery field, that will be added to the data object to be able to query related data.
  """
  description: String
  """
  The name of the subquery field, that will be added to the data object to be able to query related data.
  """
  query: String
  """
  The name of the query field, that will be added to the related data object to be able to query related data.
  """
  references_query: String
  """
  The description of the query field, that will be added to the related data object to be able to query related data.
  """
  references_description: String
  """
  Flag that indicates if the relationship is many-to-many.
  """
  is_m2m: Boolean
  """
  The name of the many-to-many relationship table.
  """
  m2m_name: String
) repeatable on OBJECT

# define FK on the data object field (view or table)
directive @field_references(
  """
  The name of the foreign key relationship between data objects.
  """
  name: String
  """
  The name of the related data object.
  """
  references_name: String!
  """
  The name of the field in the related data object.
  """
  field: String
  """
  The name of the query field, that will be added to the data object to be able to query related data.
  """
  query: String
  """
  The description of the query field, that will be added to the data object to be able to query related data.
  """
  description: String
  """
  The name of the query field, that will be added to the related data object to be able to query related data.
  """
  references_query: String
  """
  The description of the query field, that will be added to the related data object to be able to query related data.
  """
  references_description: String
) repeatable on FIELD_DEFINITION
```


Example usage:

The simplest way to define a foreign key relationship is by using the `@field_references` directive on the field that represents the foreign key.

```graphql
type customers @table(name: "customers") {
  id: BigInt! @pk
  name: String!
  email: String!
  phone: String
  address: String
  city: String
  state: String
  postal_code: String
  country: String
}

type employees @table(name: "employees") {
  id: BigInt! @pk
  first_name: String!
  last_name: String!
  email: String!
  phone: String
  hire_date: Timestamp
  job_title: String
  salary: Float
}

type shippers @table(name: "shippers") {
  id: BigInt! @pk
  name: String!
  phone: String
}

type orders @table(name: "orders") {
  id: BigInt! @pk
  customer_id: BigInt! @field_references(
    name: "orders_customer_id_fkey"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer who placed the order"
    references_query: "orders"
    references_description: "Orders placed by this customer"
  )
  employee_id: BigInt @field_references(
    name: "orders_employee_id_fkey"
    references_name: "employees"
    field: "id"
    query: "employee"
    description: "Employee who handled the order"
    references_query: "orders"
    references_description: "Orders handled by this employee"
  )
  order_date: Timestamp
  required_date: Timestamp
  shipped_date: Timestamp
  ship_via: BigInt @field_references(
    name: "orders_ship_via_fkey"
    references_name: "shippers"
    field: "id"
    query: "shipper"
    description: "Shipper for the order"
    references_query: "orders"
    references_description: "Orders shipped by this shipper"
  )
  freight: Float
  ship_name: String
  ship_address: String
  ship_city: String
  ship_region: String
  ship_postal_code: String
  ship_country: String
}
```


This allows you to query and filter by related data in a single query.

```graphql
query {
  # Filter orders for employees with salary greater than or equal to 1000
  orders (filter: { employee: { salary: { gte: 1000 } } }) {
    id
    customer {
      id
      name
    }
    employee {
      id
      first_name
      last_name
    }
    shipper {
      id
      name
    }
  }
  # Filter employees who have orders from customer with ID 1 and salary greater than or equal to 1000
  # and return order information
  employees (
    filter: {
      salary: { gte: 1000 }
      orders: { any_of: { customer: { id: { eq: 1 } } } }
    }
  ) {
    id
    first_name
    last_name
    orders {
      id
      order_date
      customer {
        id
        name
      }
      shipper {
        id
        name
      }
    }
  }
}
```


To set up a many-to-many relationship between products and categories, you need to define a join table that references both the products and categories tables.

```graphql
type categories @table(name: "categories") {
  id: BigInt! @pk
  name: String!
  description: String
}

type products @table(name: "products") {
  id: BigInt! @pk
  name: String!
  description: String
  price: Float!
}

# Many-to-Many relationship between products and categories
type product_categories @table(name: "product_categories", is_m2m: true) {
  category_id: BigInt! @field_references(
    name: "product_categories_category_id_fkey"
    references_name: "categories"
    field: "id"
    query: "category"
    description: "Category of the product"
    references_query: "product_categories"
    references_description: "Products in this category"
  )
  product_id: BigInt! @field_references(
    name: "product_categories_product_id_fkey"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product in this category"
    references_query: "product_categories"
    references_description: "Categories for this product"
  )
}
```


This allows you to query and filter by many-to-many relationships.

```graphql
query {
  products (filter: { categories: { any_of: { id: { eq: 1 } } } }) {
    id
    name
    categories {
      id
      name
    }
  }
  categories (filter: { products: { any_of: { id: { eq: 1 } } } }) {
    id
    name
    products {
      id
      name
    }
  }
}
```


Another way to define a foreign key relationship is by using the `@references` directive at the data object level. This can be used to specify the relationship between two data objects linked by multiple fields.

```graphql
type supplier_products @table(name: "supplier_products") {
  supplier_id: BigInt! @pk @field_references(
    name: "supplier_products_supplier_id_fkey"
    references_name: "suppliers"
    field: "id"
    query: "supplier"
    description: "Supplier of the product"
    references_query: "products"
    references_description: "Products supplied by this supplier"
  )
  product_id: BigInt! @pk @field_references(
    name: "supplier_products_product_id_fkey"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product supplied by the supplier"
    references_query: "suppliers"
    references_description: "Suppliers for this product"
  )
  price: Float!
}

type order_details @table(name: "order_details") 
@references(
  name: "order_details_supplier_products_fkey"
  references_name: "supplier_products"
  source_fields: [ "product_id", "supplier_id" ]
  references_fields: [ "product_id", "supplier_id" ]
  query: "supplier_product_info"
  description: "Supplier product associated with the order detail"
  references_query: "orders"
  references_description: "Order details for this supplier product"
) {
  id: BigInt! @pk @default(sequence: "order_details_id_seq")
  order_id: BigInt! @field_references(
    name: "order_details_order_id_fkey"
    references_name: "orders"
    field: "id"
    query: "order"
    description: "Order associated with the detail"
    references_query: "order_details"
    references_description: "Order details for this order"
  )
  product_id: BigInt! @field_references(
    name: "order_details_product_id_fkey"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product in the order"
    references_query: "order_details"
    references_description: "Orders containing this product"
  )
  supplier_id: BigInt! @field_references(
    name: "order_details_supplier_id_fkey"
    references_name: "suppliers"
    field: "id"
    query: "supplier"
    description: "Supplier of the product"
    references_query: "orders"
    references_description: "Order details for this supplier"
  )
  quantity: Int!
  price: Float!
  amount: Float!
}
```


Foreign key relationships can be used in insert mutations to automatically populate related fields.

```graphql
mutation {
  insert_orders(data: [
    {
      customer_id: 1
      employee_id: 2
      order_date: "2023-01-01"
      order_details: {
        data: [
          {
            product_id: 1
            supplier_id: 3
            quantity: 2
            price: 100
            amount: 200
          }
        ]
      }
    }
  ]) {
    returning {
      id
      customer_id
      order_date
      order_details {
        id
        product_id
        quantity
        price
        amount
      }
    }
  }
}
```


Foreign key relationships can also be defined for views, including parameterized views. This allows you to create more complex queries that involve multiple data objects and their relationships.

### @join


The `@join` directive allows you to define a field as the result of a join with another data object.
It can be used to create more complex queries that involve multiple data objects and their relationships.

You can extend existing data objects with new fields to join data objects from different data sources in the `extension` data source definition.

```graphql
# define field as join result from the other data object
directive @join(
  """
  The name of the joined data object in the schema
  """
  references_name: String
  """
  The field names in the source data object that is used to join by equals conditions
  """
  source_fields: [String!]
  """
  The field names in the joined data object that is used to join by equals conditions
  """
  references_fields: [String!]
  """
  The SQL for the join to indicate tables use source and dest names in field path, all fields path should in [source.field] or [dest.field] format
  This applies through AND with source and references fields
  """
  sql: String
) on FIELD_DEFINITION
```

Example usage:

```graphql
type areas @view(name: "locations") {
  name: String!
  category: String
  population: Int
  polygon: Geometry @geometry_info(type: MULTIPOLYGON srid: 4326)
}

extend type customers {
  primary_area_category: String
  working_area: Geometry @geometry_info(type: POLYGON srid: 4326)
  areas: [areas] @join(
    references_name: "areas",
    sql: "ST_Intersects([source.working_area], [dest.polygon])"
  )
  primary_areas: [areas] @join(
    references_name: "areas",
    source_fields: ["primary_area_category"],
    references_fields: ["category"],
    sql: "ST_Intersects([source.working_area], [dest.polygon])"
  )
}
```


This allows you to create more complex queries that involve multiple data objects and their relationships.

```graphql
query {
  customers {
    id
    name
    primary_area_category
    working_area
    areas (filter: { category: { in: ["Cities", "Towns"] } }) {
      id
      name
      category
    }
    areas_aggregation {
      _rows_count
      population {
        sum
      }
    }
    primary_areas {
      id
      name
      category
    }
  }
}
```

### @function_call


The `@function_call` directive allows you to define a field as the result of a function call.

You can extend existing data objects with new fields that represent function call results from different data sources in the `extension` data source definition.

```graphql
# function call
directive @function_call(
  """
  The name of the defined function
  """
	references_name: String!
  """
  The arguments map for the function: { <function_argument>: "<field_name>" }
  """
	args: JSON # argument map from field to function argument
  """
  The name of the module, you can skip it if function call is defined in not extension data source
  """
	module: String # module name for the function
) on FIELD_DEFINITION
```


The argument map can contain a subset of function arguments; any missing arguments will be added to the function call fields automatically.

Example usage:

```graphql
type sensor_state {
  code: Int
  status: String
}

extend type Functions {
  current_sensor_state(sensor_id: ID!, request_time: Timestamp!): sensor_state @function(
    name "get_current_sensor_state"
  )
}

type sensors @table(name: "sensors") {
  id: ID!
  name: String!
  location: Geometry
  state: sensor_state @function_call(
    references_name: "get_sensor_state",
    args: {
      sensor_id: "id"
    }
  )
}
```


You can then get the current sensor state by calling the function with the appropriate arguments.

```graphql
query {
  sensors {
    id
    name
    location
    state (request_time: "2025-08-25T12:00:00Z") {
      code
      status
    }
  }
}
```

### @table_function_call_join


The `@table_function_call_join` directive allows you to define a field as the result of a table function call and join it.
This combines the functionality of `@join` and `@function_call`, but with some limitations—you can aggregate a subquery or apply an additional filter.
If you need a more flexible approach, you can define a parameterized query instead.

```graphql
# table function call with join
directive @table_function_call_join(
  """
  The name of the defined function
  """
	references_name: String!
  """
  The arguments map for the function: { <function_argument>: "<field_name>" }
  """
	args: JSON # argument map from field to function argument
  """
  The source fields for the join
  """
	source_fields: [String!]
  """
  The references fields for the join
  """
	references_fields: [String!]
  """
  The SQL for the join to indicate tables use source and dest names in field path, all fields path should in [source.field] or [dest.field] format
  """
	sql: String
  """
  The name of the module, you can skip it, it will fill up automatically
  """
	module: String
) on FIELD_DEFINITION
```

Example usage:

```graphql
type sensor_value {
  sensor_id: ID
  event_time: Timestamp
  value: Float
  unit: String
}

extend type Functions {
  sensors_current_values(request_time: Timestamp!): [sensor_value]
    @function(
      name: "get_sensors_current_values"
    )
}

extend type sensors {
  current_values(request_time: Timestamp!): [sensor_value]
    @table_function_call_join(
      references_name: "sensors_current_values"
      source_fields: ["id"]
      references_fields: ["sensor_id"]
    )
}
```

This allows you to get the current values of all sensors at a specific point in time.

```graphql
query {
  sensors {
    id
    name
    location
    current_values(request_time: "2025-08-25T12:00:00Z") {
      sensor_id
      event_time
      value
      unit
    }
  }
}
```

### @cache, @no_cache and @invalidate_cache


The `@cache` directive allows you to cache the results of a query for a specified amount of time.

This directive can be applied to a data object in the schema definition files, allowing you to automatically cache query results for that data object. In this case, you should define `ttl` and `tags` to automatically invalidate the cache if the data object is mutated.

The `@cache` directive can also be used in queries to cache the results. If a key is not provided, it will be generated automatically as a hash of the query text, variables, and role name.

The `@no_cache` directive can be used to disable caching for a specific query.

The `@invalidate_cache` directive can be used to invalidate the cache for a specific query.

```graphql
directive @cache(
  """
  Time to live for the cache in seconds
  """
  ttl: Int
  """
  Cache key for the query
  """
  key: String
  """
  Cache key for the query
  """
  tags: [String!]
) on FIELD | OBJECT | FIELD_DEFINITION

directive @no_cache on FIELD
directive @invalidate_cache on FIELD
```

Example usage:

In the definition.

```graphql
type users @table(name: "users") @cache(ttl: 300, tags: ["users"]) {
  id: ID!
  name: String!
  email: String!
  age: Int!
}
```

At query time.

```graphql
query {
  users {
    id
    name
    email
    age
  }
  without_cache: users @no_cache {
    id
    name
    email
    age
  }
  # request data and invalidate cache
  inv: users @invalidate_cache {
    id
    name
    email
    age
  }

  customers(filter: {category: "electronics"}) @cache(ttl: 300, key: "customers_electronics", tags: ["customers"]) {
    id
    name
    email
    age
  }
}
```

## Query time directives


`hugr` provides several directives that can be used at query time to modify the behavior of a query.

### @stats


The `@stats` directive can be used to calculate execution statistics for a query. The statistics will be returned in the `extensions` field in the query results.

```graphql
"""
Calculate execution statistics for the query
Execution statistics are calculated for the query and returned in the extensions field
"""
directive @stats on FIELD | QUERY
```

### @with_deleted


The `@with_deleted` directive can be used to include deleted records in the query results, if the soft delete feature is enabled for the table.

```graphql
"""
Include deleted records in the query results
"""
directive @with_deleted on FIELD
```

### @raw


The `@raw` directive is used to retrieve data tables in raw format (for example, Geometry in WKB). It is used in the `hugr-ipc` protocol.

```graphql
directive @raw on FIELD
```

### @unnest


The `@unnest` directive is used to make more complex queries by flattening subquery results, especially for aggregations.
You should be very careful when using this directive, as it works the same way as a SQL JOIN and can multiply rows in the result set.

```graphql
"""
Mark do not aggregate subquery result
"""
directive @unnest on FIELD
```

Example usage:

```graphql
query {
  orders_bucket_aggregation{
    key {
      customers {
        country
      }
      order_details @unnest{
        product {
          name
        }
      }
    }
    aggregations {
      _rows_count
    }
  }
}
```


This query returns the total number of orders grouped by customer and product.

### @no_pushdown


This directive is used to instruct the planner not to push down aggregation and join operations to the source database.
It works only with subqueries across PostgreSQL data sources. By default, `hugr` tries to push down as much as possible to the PostgreSQL source database to reduce the number of records received from the data source.

In some scenarios, it may be beneficial to prevent pushdown and use the `DuckDB` engine for aggregation and joins.

```graphql
"""
Mark the subquery to do not pushdown to the database
It is used to prevent the subquery from being executed in the database and instead execute it in the duckdb.
"""
directive @no_pushdown on FIELD | FIELD_DEFINITION
```

Example usage:

```graphql
query {
  customers {
    name
    orders_aggregation {
      order_details_aggregation @no_pushdown{
        amount{
          sum{
            sum
          }
        }
      }
    }
  }
}
```

## System Directives


`hugr` uses the following system directives to modify the behavior of queries.

```graphql
"""
Mark the field as a system field
"""
directive @system on OBJECT | INTERFACE | UNION | INPUT_OBJECT | ENUM | FIELD_DEFINITION | SCALAR

 # This directive marks a type as a module root object, whose fields are queries, mutations, or functions.
 # This directive is generated by the compiler as well as for module types.
directive @module_root(name: String!, type: ModuleObjectType!) on OBJECT

 # The original name of the object in the catalog, before a prefix was added.
 # This directive is generated by the compiler to keep the original name of the object.
directive @original_name(name: String!) on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR | FIELD_DEFINITION


# generated directives
directive @filter_input(name: String!) on OBJECT | INPUT_OBJECT
directive @filter_list_input(name: String!) on OBJECT | INPUT_OBJECT
directive @data_input(name: String!) on OBJECT | INPUT_OBJECT

directive @query(name: String, type: QueryType) on OBJECT | FIELD_DEFINITION
directive @mutation(name: String, type: MutationType) on OBJECT | FIELD_DEFINITION
directive @catalog(name: String!, engine: String!) on OBJECT | FIELD_DEFINITION | INPUT_FIELD_DEFINITION
directive @aggregation(name: String!, is_bucket: Boolean, level: Int) on OBJECT
directive @field_aggregation(name: String!) on OBJECT | FIELD_DEFINITION
directive @aggregation_query(name: String!, is_bucket: Boolean) on FIELD_DEFINITION

directive @extra_field(name: String!, base_type: ExtraFieldBaseType!) on FIELD_DEFINITION

"""
This directive is used to define H3 functions and their parameters.
"""
directive @add_h3(
  field: String! 
  res: Int!
  transform_from: Int
  buffer: Float
  divide_values: Boolean
  simplify: Boolean = true
) on FIELD
```


## Experimental GIS Directives

```graphql
"""
Mark query results as GIS features.
It is used in:
- the geojson endpoint to return features in the GeoJSON format
- the OpenAPI schema to define the feature type for saved collections
- the WFS endpoint to return features in the WFS format
"""
directive @feature(
  "name of the feature type (collection name), used for feature collection"
  name: String!
  "description of the feature type"
  description: String
  "name of the geometry field, used for feature geometry"
  geometry: String!
  "name of the feature id field, used for feature id"
  id: String
  "geometry type of the feature, used for feature geometry type"
  geometry_type: GeometryType
  "if not set, the geometry will be treated as WGS84 (SRID)"
  geometry_srid: Int
  "jq transformation that returns the feature properties"
  properties: String
  "property feature definition in OpenAPI format"
  definition: JSON
  "variables definition for the feature properties in OpenAPI format"
  variables: JSON
  "support pagination"
  pagination: Boolean = false
  "if true, the bbox will be written to the feature"
  write_bbox: Boolean = false
  "meta query name, used for feature collection extent and count"
  summary: String
  "bbox data extent path, used for collection extent"
  extent_path: String
  "matched features count path, used for collection count"
  count_path: String
) on FIELD

"Directive that makes the data object accessible via WFS (Web Feature Service 1.2)"
directive @wfs(
  "name of the feature type (collection name), used for feature collection"
  name: String!
  "description of the feature type"
  description: String
  "name of the geometry field, used for feature geometry"
  geometry: String
  "read-only mode, if true, the WFS service will not allow to modify the data"
  read_only: Boolean = false
)  repeatable on OBJECT

"Make a nested object field (type) flat in the WFS response."
directive @wfs_field(
  "name of the field in the WFS response, if not set, the field name will be used"
  name: String
  "description of the field in the WFS response"
  description: String
  "if true, the nested field will be flatted in the WFS response, else it will be returned as a stringified JSON"
  flatted: Boolean
  "separator used to flatten the field in the WFS response"
    flatted_sep: String
) on FIELD_DEFINITION

"Exclude field from WFS response, it will not be returned in the WFS response."
directive @wfs_exclude on FIELD_DEFINITION
```