---
title: Data Types
sidebar_position: 2
description: Understanding the data types supported by Hugr
---

Hugr supports the following scalar data types:

```graphql
# Base GraphQL Scalar Types
scalar String
scalar Int
scalar Float
scalar Boolean

# Additional Hugr Scalar Types
scalar BigInt
scalar Timestamp
scalar Date
scalar Time
scalar Interval 
scalar Geometry 
scalar JSON 
scalar H3Cell

# Range Types that can be used only for PostgreSQL data sources
scalar IntRange 
scalar TimestampRange
scalar BigIntRange

scalar any
```

These types can be used:
- as parameters and arguments in functions
- as column types in tables and views
- as input argument fields in parameterized views
Hugr automatically generates queries and mutations for tables and views based on the defined field data types. The available filter operations, aggregation functions, and calculated fields depend on these data types. Hugr also supports subaggregations for aggregated subquery fields.

For certain fields in the generated queries, arguments can be provided to transform the data. Additionally, Hugr may include extra calculated fields according to the defined data types.

## String

The `String` type is used to represent textual data.
Input values must be Unicode.

### Filter operations

- `eq` - Checks if the string is equal to a specified value.
- `in` - Checks if the string is in a specified list of values.
- `like` - Checks if the string matches a specified pattern (as wildcard `%`).
- `ilike` - Checks if the string matches a specified pattern (case-insensitive).
- `regex` - Checks if the string matches a specified regular expression.
- `is_null` - Checks if the string is null.

### Aggregation functions

- `count` - Calculates the number of non-null unique values
- `string_agg` - Concatenates strings with a separator; separator and distinct can be specified
- `list` - Returns a list of values; distinct can be specified
- `any` - Returns any non-null value
- `last` - Returns the last non-null value

### Subaggregation functions

- `count` - Calculates the number of non-null unique values
- `string_agg` - Concatenates the aggregated array of strings with the same separator as specified for the aggregation function

## Boolean

The `Boolean` type is used to represent true/false values. Input values must be either `true` or `false`.

### Filter operations

- `eq` - Checks if the boolean is equal to a specified value.
- `is_null` - Checks if the boolean is null.

### Aggregation functions

- `count` - Calculates the number of non-null unique values
- `bool_and` - Returns true if all non-null values are true
- `bool_or` - Returns true if any non-null value is true
- `list(distinct: Boolean = false): [Boolean!]` - Returns a list of values; distinct can be specified
- `any` - Returns any non-null value
- `last` - Returns the last non-null value

### Subaggregation functions

- `count` - Calculates the number of non-null unique values
- `bool_and` - Returns true if all non-null values are true
- `bool_or` - Returns true if any non-null value is true

## Numbers - Int, BigInt and Float

The `Int`, `BigInt`, and `Float` types are used to represent numeric values. Input values must be valid numbers with `.` as the decimal separator.

### Filter operations

- `eq` - Checks if the number is equal to a specified value.
- `gt` - Checks if the number is greater than a specified value.
- `gte` - Checks if the number is greater than or equal to a specified value.
- `lt` - Checks if the number is less than a specified value.
- `lte` - Checks if the number is less than or equal to a specified value.
- `in` - Checks if the number is in a specified list of values.
- `is_null` - Checks if the number is null.

### Aggregation functions

- `count` - Calculates the number of non-null unique values
- `sum` - Calculates the sum of non-null values
- `avg` - Calculates the average of non-null values
- `min` - Finds the minimum non-null value
- `max` - Finds the maximum non-null value
- `list(distinct: Boolean = false)` - Returns a list of values; distinct can be specified
- `any` - Returns any non-null value
- `last` - Returns the last non-null value

### Subaggregation functions

- `count` - Calculates the number of non-null unique values
- `sum` - Calculates the sum of non-null values
- `avg` - Calculates the average of non-null values
- `min` - Finds the minimum non-null value
- `max` - Finds the maximum non-null value

## DateTime types - Date, Time, TimeStamp

The `DateTime` types are used to represent date and time values.
Date values must be in the format `YYYY-MM-DD`.
Time values must be in the format `HH:MM:SS`.
Timestamp values can be in the format `YYYY-MM-DDTHH:MM:SSZ07:00` or as UnixTime (`BigInt`).

### Generated arguments

For the `Date` and `Timestamp` fields, the `bucket` argument will be generated. If the `bucket` argument is present, it will be used to transform the data into the specified time bucket. The following values are accepted:
- minute
- hour
- day
- week
- month
- quarter
- year

For the `Timestamp` fields, the `bucket_interval` argument will be generated; it accepts Interval values. If the `bucket_interval` argument is present, it will be used to transform the data into the specified time interval.
For example, `bucket_interval: "15 minutes"`:
- "2025-08-25T12:03:00Z02:00" -> "2025-08-25T12:00:00Z02:00"
- "2025-08-25T12:16:00Z02:00" -> "2025-08-25T12:15:00Z02:00"

### Calculated fields

For each `Date` and `Timestamp` table or view field, a new field will be generated with the name: `_<field_name>_part`, type `BigInt`, and the following parameters:
- `extract` - The part of the date or timestamp to extract. Possible values are: epoch, minute, hour, day, doy, dow, iso_dow, week, month, year, iso_year, quarter.
- `extract_divide` - The divider for the extracted part.

### Filters

- `eq` - Checks if the value is equal to a specified value.
- `gt` - Checks if the value is greater than a specified value.
- `gte` - Checks if the value is greater than or equal to a specified value.
- `lt` - Checks if the value is less than a specified value.
- `lte` - Checks if the value is less than or equal to a specified value.
- `is_null` - Checks if the value is null.

### Aggregation functions

- `count` - calculate the number of non-null unique values
- `min` - find the minimum non-null value
- `max` - find the maximum non-null value
- `list(distinct: Boolean = false)` - return a list of values, distinct can be specified
- `any` - return any non-null value
- `last` - return the last non-null value

### Subaggregation functions

- `count` - calculate the number of non-null unique values
- `min` - find the minimum non-null value
- `max` - find the maximum non-null value

## Interval

The `Interval` type is used to represent a time duration. Interval types can only be used in filter operations.
Input values must be in the format `quantity unit`, where `quantity` is a number and `unit` is one of the following: microseconds, milliseconds, seconds, minutes, hours, days, weeks, months, quarters, years. For example: `5 days 12 hours`, `2 hours`, `30 minutes`.

### Filter operations

- `eq` - Checks if the value is equal to a specified value.
- `gt` - Checks if the value is greater than a specified value.
- `gte` - Checks if the value is greater than or equal to a specified value.
- `lt` - Checks if the value is less than a specified value.
- `lte` - Checks if the value is less than or equal to a specified value.
- `is_null` - Checks if the value is null.

## Range types

The range types represent PostgreSQL range types. The following range data types are supported:

- `int4range` - Represents a range of 4-byte integers (`IntRange`).
- `int8range` - Represents a range of 8-byte integers (`BigIntRange`).
- `tsrange` - Represents a range of timestamps (`TimestampRange`).
- `tstzrange` - Represents a range of timestamp with time zone (`TimestampRange`).

Range types can only be used in filtering operations.
Input values must be a string in the format `"[lower, upper]"`, where `lower` and `upper` are the bounds of the range. The bounds can be inclusive or exclusive, denoted by `[` or `(` for the lower bound and `]` or `)` for the upper bound. For example: `"[1, 10]"`, `"(1, 10]"`, `"[2023-01-01T00:00:00Z, 2023-12-31T00:00:00Z]"`.

### Filter operations

- `eq` - Checks if the value is equal to a specified value.
- `contains` - Checks if the range contains a specified value.
- `intersects` - Checks if the range intersects with another range.
- `includes` - Checks if the range includes another range.
- `is_null` - Checks if the range is null.
- `upper` - Checks if the upper bound of the range is equal to a specified value.
- `lower` - Checks if the lower bound of the range is equal to a specified value.
- `upper_inclusive` - Checks if the upper bound of the range is included (`(1,2]`).
- `lower_inclusive` - Checks if the lower bound of the range is included (`[1,2)`).
- `upper_inf` - Checks if the upper bound of the range is unbounded (`(1,∞)`).
- `lower_inf` - Checks if the lower bound of the range is unbounded (`(-∞,2)`).

## JSON

The `JSON` type is used to represent JSON objects (for PostgreSQL JSONB). It can be used in various ways, including aggregation by a specified path.

Input values should be in the format of a standard JSON object: `{"key": "value"}`

### Generated arguments

For `JSON` table or view fields, the `struct` argument will be generated. This argument accepts a JSON object that defines the data structure, to extract only the necessary fields from the JSON field.
For example:
```json
{"field1": "string", "field2": {"subfield": "int", "subfield2": ["float"]}}
```

The following data types are accepted:
- `string` - GraphQL `String`
- `int` - GraphQL `Int`
- `bigint` - GraphQL `BigInt`
- `float` - GraphQL `Float`
- `boolean` - GraphQL `Boolean`
- `time` - GraphQL `Timestamp`
- `json` - GraphQL `JSON`
- `h3String` - GraphQL `String`

### Filters

- `eq` - Checks if the value is equal to a specified value.
- `has` - Checks if the JSON object has a specified key.
- `has_all` - Checks if the JSON object has all specified keys.
- `contains` - Checks if the JSON object contains a specified JSON value (works the same way as the operator `@>` in PostgreSQL).
- `is_null` - Checks if the JSON object is null.

### Aggregation functions

- `count(path: String)` - calculate the number of non-null unique values
- `list(path: String, distinct: Boolean = false)` - return a list of values, distinct can be specified
- `any(path: String)` - return any non-null value
- `last(path: String)` - return the last non-null value
- `sum(path: String!)` - calculate the sum of non-null values
- `avg(path: String!)` - calculate the average of non-null values
- `min(path: String!)` - calculate the minimum of non-null values
- `max(path: String!)` - calculate the maximum of non-null values
- `string_agg(path: String!, sep: String!, distinct: Boolean = false)` - concatenate non-null values into a string
- `bool_and(path: String!)` - calculate the boolean AND of non-null values
- `bool_or(path: String!)` - calculate the boolean OR of non-null values

### Subaggregation functions

- `count(path: String)` - calculate the number of non-null unique values
- `sum(path: String!)` - calculate the sum of non-null values
- `avg(path: String!)` - calculate the average of non-null values
- `min(path: String!)` - calculate the minimum of non-null values
- `max(path: String!)` - calculate the maximum of non-null values
- `string_agg(path: String!, sep: String!, distinct: Boolean = false)` - concatenate non-null values into a string
- `bool_and(path: String!)` - calculate the boolean AND of non-null values
- `bool_or(path: String!)` - calculate the boolean OR of non-null values

## Geometry

The `Geometry` type is used to represent geometric shapes and can be used in various ways, including filtering and aggregation.
The input values for `Geometry` can be:
- object - A GeoJSON object representing the geometry
- string - A WKT (Well-Known Text) or WKB (Well-Known Binary) representation of the geometry

### Generated arguments

The following arguments are generated for `Geometry` fields:
- `transforms: [GeometryTransform]` - a list of transformations to apply to the geometry
- `from: Int` - the SRID to transform from
- `to: Int` - the SRID to transform to
- `buffer: Float` - the buffer distance to apply to the geometry
- `simplify_factor: Float` - the factor by which to simplify the geometry

The valid types of transformation:
- `Transform` - reproject geometry to a different coordinate reference system (CRS); uses `from` SRID and `to` SRID
- `Centroid` - calculate the centroid of the geometry
- `Buffer` - create a buffer around the geometry; if geometry is in the EPSG:4326 CRS, the distance is in meters
- `Simplify` - simplify the geometry; uses `simplify_factor` to determine the level of simplification
- `SimplifyTopology` - simplify the geometry while preserving topology; uses `simplify_factor` to determine the level of simplification
- `StartPoint` - get the start point of the geometry (for LineString)
- `EndPoint` - get the end point of the geometry (for LineString)
- `Reverse` - reverse the geometry (for LineString)
- `FlipCoordinates` - flip the coordinates of the geometry.
- `ConvexHull` - get the convex hull of the geometry.
- `Envelope` - get the envelope of the geometry.

### Calculated fields

For each `Geometry` table or view field, a new field will be generated with the name: `_<field_name>_measurement`, type `Float`, and the following parameters:
- `type: GeometryMeasurementTypes` - The type of measurement
- `transform: Boolean = False` - Whether to apply the transformations before calculating the measurement
- `from: Int` - The SRID to transform from
- `to: Int` - The SRID to transform to

The following types of measurements are valid:
- `Area` - The area of the geometry
- `AreaSpheroid` - The area of the geometry on a spheroid in square meters
- `Length` - The length of the geometry
- `LengthSpheroid` - The length of the geometry on a spheroid in meters
- `Perimeter` - The perimeter of the geometry
- `PerimeterSpheroid` - The perimeter of the geometry on a spheroid in meters

## Filter operations

- `eq` - Checks if the value is equal to a specified value.
- `intersects` - Checks if the geometry intersects with another geometry.
- `contains` - Checks if the geometry contains another geometry.
- `is_null` - Checks if the geometry is null.

### Aggregation functions

- `count`: Calculates the number of non-null unique values.
- `list(distinct: Boolean = false)`: Returns a list of values, distinct can be specified.
- `any`: Returns any non-null value.
- `last`: Returns the last non-null value.
- `intersection`: Returns the intersection of geometries.
- `union`: Returns the union of geometries.
- `extent`: Returns the extent of geometries.

### Subaggregation functions

- `count`: Calculates the number of non-null unique values.
- `intersection`: Returns the intersection of geometries.
- `union`: Returns the union of geometries.
- `extent`: Returns the extent of geometries.

## List types

Data types can be GraphQL list types, which are denoted by square brackets `[]`. For example: `[String!]`, `[Int!]`, `[Float!]`, etc. List types can be used to represent arrays of values.

List types cannot be aggregated, but can be filtered.
Only the following list data types can be filtered: `[String]`, `[Int]`, `[Float]`, `[Boolean]`, `[Date]`, `[Timestamp]`, `[Interval]`

### Filter operations

- `eq` - Checks if the list contains a specific value.
- `contains` - Checks if the list contains another list.
- `intersects` - Checks if the list intersects with another list.
- `is_null` - Checks if the list is null.

