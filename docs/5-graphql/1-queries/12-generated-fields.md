---
title: "Generated Fields & Transformations"
sidebar_position: 12
---

# Generated Fields & Transformations

Hugr automatically generates special fields and arguments for certain data types, enabling powerful data transformations, extractions, and measurements directly in your GraphQL queries. This document covers the usage of generated fields for Timestamp, JSON, and Geometry types.

## Timestamp Field Transformations

For `Date` and `Timestamp` fields, Hugr generates both transformation arguments and calculated fields to work with temporal data.

### Bucketing with `bucket` Argument

Transform timestamps into time buckets for grouping and analysis:

```graphql
query {
  events {
    id
    # Group by hour
    created_at(bucket: hour)
    # Group by day
    order_date(bucket: day)
    # Group by month
    signup_date(bucket: month)
  }
}
```

**Available bucket values:**
- `minute` - Round down to the minute
- `hour` - Round down to the hour
- `day` - Round down to the day
- `week` - Round down to the week
- `month` - Round down to the month
- `quarter` - Round down to the quarter
- `year` - Round down to the year

#### Example: Sales by Month

```graphql
query {
  orders {
    id
    total
    # Bucket by month for time series
    order_month: created_at(bucket: month)
  }
}
```

Response:
```json
{
  "data": {
    "orders": [
      {
        "id": 1,
        "total": 150.00,
        "order_month": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "total": 200.00,
        "order_month": "2024-01-01T00:00:00Z"
      },
      {
        "id": 3,
        "total": 175.00,
        "order_month": "2024-02-01T00:00:00Z"
      }
    ]
  }
}
```

### Custom Intervals with `bucket_interval`

For `Timestamp` fields, use custom time intervals:

```graphql
query {
  sensor_readings {
    id
    value
    # Bucket into 15-minute intervals
    reading_time: timestamp(bucket_interval: "15 minutes")
    # Bucket into 5-minute intervals
    sample_time: timestamp(bucket_interval: "5 minutes")
  }
}
```

**How it works:**
- `"2024-01-15T12:03:00Z"` with `bucket_interval: "15 minutes"` → `"2024-01-15T12:00:00Z"`
- `"2024-01-15T12:16:00Z"` with `bucket_interval: "15 minutes"` → `"2024-01-15T12:15:00Z"`

### Extracting Date Parts with `_<field>_part`

Extract specific components from dates and timestamps:

```graphql
query {
  orders {
    id
    created_at
    # Extract year
    year: _created_at_part(extract: year)
    # Extract month
    month: _created_at_part(extract: month)
    # Extract day of week (0 = Sunday)
    day_of_week: _created_at_part(extract: dow)
    # Extract hour
    hour: _created_at_part(extract: hour)
    # Extract Unix timestamp
    unix_time: _created_at_part(extract: epoch)
  }
}
```

**Available extract values:**
- `epoch` - Unix timestamp (seconds since 1970-01-01)
- `minute` - Minute (0-59)
- `hour` - Hour (0-23)
- `day` - Day of month (1-31)
- `doy` - Day of year (1-366)
- `dow` - Day of week (0 = Sunday, 6 = Saturday)
- `iso_dow` - ISO day of week (1 = Monday, 7 = Sunday)
- `week` - Week number
- `month` - Month (1-12)
- `year` - Year
- `iso_year` - ISO year
- `quarter` - Quarter (1-4)

#### Using `extract_divide` for Custom Units

Divide extracted values for custom grouping:

```graphql
query {
  events {
    id
    timestamp
    # Get 6-hour blocks (0, 6, 12, 18)
    time_block: _timestamp_part(
      extract: hour
      extract_divide: 6
    )
    # Get 5-minute intervals
    minute_block: _timestamp_part(
      extract: minute
      extract_divide: 5
    )
  }
}
```

### Timestamp Fields in Aggregations

Use bucketing and extracted parts in aggregations:

```graphql
query {
  orders_aggregation {
    total {
      sum
    }
    # Extract year for filtering
    _created_at_part(extract: year) {
      avg
      min
      max
    }
  }
}
```

### Timestamp Fields in Grouping

Group by time buckets or extracted parts:

```graphql
query {
  orders_bucket_aggregation {
    key {
      # Group by month
      order_month: created_at(bucket: month)
      # Group by day of week
      day_of_week: _created_at_part(extract: iso_dow)
      # Group by hour
      hour: _created_at_part(extract: hour)
    }
    aggregations {
      _rows_count
      total {
        sum
        avg
      }
    }
  }
}
```

#### Example: Orders by Day of Week

```graphql
query {
  orders_bucket_aggregation {
    key {
      day: _created_at_part(extract: iso_dow)
    }
    aggregations {
      _rows_count
      revenue: total { sum }
    }
  }
}
```

Response:
```json
{
  "data": {
    "orders_bucket_aggregation": [
      {
        "key": { "day": 1 },
        "aggregations": {
          "_rows_count": 45,
          "revenue": { "sum": 5670.00 }
        }
      },
      {
        "key": { "day": 2 },
        "aggregations": {
          "_rows_count": 52,
          "revenue": { "sum": 6230.00 }
        }
      }
    ]
  }
}
```

## JSON Field Transformations

For `JSON` fields, Hugr generates the `struct` argument to extract specific fields and define their types.

### Extracting Fields with `struct`

Define the structure to extract only needed fields. The field remains JSON but is trimmed to the specified structure:

```graphql
query {
  events {
    id
    # Extract specific fields from JSON
    # Field remains JSON, trimmed to structure
    metadata(struct: {
      user_id: "int"
      action: "string"
      timestamp: "time"
      details: {
        ip_address: "string"
        user_agent: "string"
      }
    })
  }
}
```

**Available type mappings:**
- `string` → GraphQL `String`
- `int` → GraphQL `Int`
- `bigint` → GraphQL `BigInt`
- `float` → GraphQL `Float`
- `boolean` → GraphQL `Boolean`
- `time` → GraphQL `Timestamp`
- `json` → GraphQL `JSON`
- `h3String` → GraphQL `String`

### Arrays in JSON Structure

Extract arrays from JSON:

```graphql
query {
  products {
    id
    # Struct with arrays - field remains JSON
    metadata(struct: {
      tags: ["string"]
      prices: ["float"]
      dimensions: {
        measurements: ["float"]
      }
    })
  }
}
```

### JSON Path in Aggregations

Use path notation to aggregate values within JSON fields:

```graphql
query {
  events_aggregation {
    # Count events
    _rows_count

    # Aggregate by JSON path (use dot notation)
    metadata {
      # Count user_id field
      count(path: "user_id")
      # Sum numeric values
      sum(path: "details.amount")
      avg(path: "details.amount")
      # Min/max for numbers
      min(path: "details.score")
      max(path: "details.score")
      # String aggregation
      string_agg(path: "details.category", separator: ", ")
      # Boolean aggregation
      bool_and(path: "is_valid")
      bool_or(path: "is_active")
      # List aggregation
      list(path: "tags", distinct: true)
      # Get any value
      any(path: "source")
      # Get last value
      last(path: "status")
    }
  }
}
```

**Important:** Use dot notation (`field.subfield`) for paths, not bracket notation (`$.field`).

### JSON Fields in Grouping

Group by extracted JSON fields:

```graphql
query {
  events_bucket_aggregation {
    key {
      # Group by extracted JSON field (remains JSON)
      user_segment: metadata(struct: {
        segment: "string"
      })
      # Group by nested field (remains JSON)
      country: metadata(struct: {
        location: {
          country: "string"
        }
      })
    }
    aggregations {
      _rows_count
      metadata {
        sum(path: "revenue")
        avg(path: "session_duration")
      }
    }
  }
}
```

## Geometry Field Transformations

For `Geometry` fields, Hugr generates transformation arguments and measurement fields for spatial analysis.

### Transforming Geometries

Apply transformations to geometry fields in queries:

```graphql
query {
  parcels {
    id
    # Original geometry
    boundary

    # Transform to different SRID
    boundary_transformed: boundary(
      transforms: [Transform]
      from: 4326
      to: 3857
    )

    # Get centroid
    center: boundary(transforms: [Centroid])

    # Create buffer (in meters for EPSG:4326)
    buffer_zone: boundary(
      transforms: [Buffer]
      buffer: 100.0
    )

    # Simplify geometry
    simplified: boundary(
      transforms: [Simplify]
      simplify_factor: 0.001
    )

    # Chain transformations
    processed: boundary(
      transforms: [Transform, Buffer, Simplify]
      from: 4326
      to: 3857
      buffer: 50.0
      simplify_factor: 0.01
    )
  }
}
```

**Available transformations:**
- `Transform` - Reproject to different CRS (requires `from` and `to` SRID)
- `Centroid` - Calculate geometric center
- `Buffer` - Create buffer zone (use `buffer` parameter)
- `Simplify` - Simplify geometry (use `simplify_factor`)
- `SimplifyTopology` - Simplify preserving topology (use `simplify_factor`)
- `StartPoint` - Get start point (for LineString)
- `EndPoint` - Get end point (for LineString)
- `Reverse` - Reverse geometry direction (for LineString)
- `FlipCoordinates` - Swap X and Y coordinates
- `ConvexHull` - Get convex hull
- `Envelope` - Get bounding box

#### Example: Finding Nearby Features

```graphql
query {
  stores {
    id
    name
    location
    # Create 1km buffer for proximity search
    service_area: location(
      transforms: [Buffer]
      buffer: 1000.0
    )
  }
}
```

### Measuring Geometries with `_<field>_measurement`

Calculate area, length, and perimeter:

```graphql
query {
  parcels {
    id
    boundary

    # Calculate area (in CRS units)
    area: _boundary_measurement(type: Area)

    # Calculate area on spheroid (square meters)
    area_m2: _boundary_measurement(type: AreaSpheroid)

    # Calculate perimeter
    perimeter: _boundary_measurement(type: Perimeter)

    # Calculate perimeter on spheroid (meters)
    perimeter_m: _boundary_measurement(type: PerimeterSpheroid)
  }
}
```

For LineString geometries:

```graphql
query {
  roads {
    id
    geometry

    # Calculate length
    length: _geometry_measurement(type: Length)

    # Calculate length on spheroid (meters)
    length_m: _geometry_measurement(type: LengthSpheroid)
  }
}
```

**Available measurement types:**
- `Area` - Area in CRS units
- `AreaSpheroid` - Area in square meters (spheroid calculation)
- `Length` - Length in CRS units
- `LengthSpheroid` - Length in meters (spheroid calculation)
- `Perimeter` - Perimeter in CRS units
- `PerimeterSpheroid` - Perimeter in meters (spheroid calculation)

### Measurements with Transformation

Transform geometry before measuring:

```graphql
query {
  parcels {
    id
    # Transform to projected CRS before measuring
    area_accurate: _boundary_measurement(
      type: Area
      transform: true
      from: 4326
      to: 3857
    )
  }
}
```

### Geometry Fields in Aggregations

Aggregate geometric measurements:

```graphql
query {
  parcels_aggregation {
    # Aggregate measurements
    _boundary_measurement(type: AreaSpheroid) {
      sum
      avg
      min
      max
    }

    # Geometric aggregations
    boundary {
      # Count geometries
      count
      # Union all geometries
      union
      # Find intersection
      intersection
      # Get extent (bounding box)
      extent
      # Get any geometry
      any
      # Get last geometry
      last
      # List all geometries
      list(distinct: true)
    }
  }
}
```

### Geometry Fields in Grouping

Group by transformed geometries or use in spatial grouping:

```graphql
query {
  stores_bucket_aggregation {
    key {
      # Group by region using centroid
      region_center: location(transforms: [Centroid])
    }
    aggregations {
      _rows_count
      revenue { sum }
    }
  }
}
```

#### Example: Buildings by Size Category

```graphql
query {
  buildings_bucket_aggregation {
    key {
      # Extract area for grouping logic
      area_value: _footprint_measurement(type: AreaSpheroid)
    }
    aggregations {
      _rows_count
      _footprint_measurement(type: AreaSpheroid) {
        sum
        avg
      }
    }
  }
}
```

## Combining Generated Fields

Use multiple generated fields together for complex analysis:

```graphql
query {
  transactions_bucket_aggregation {
    key {
      # Time bucketing
      month: created_at(bucket: month)
      hour_block: _created_at_part(extract: hour, extract_divide: 6)

      # JSON extraction (remains JSON)
      user_tier: metadata(struct: {
        tier: "string"
      })

      # Spatial grouping with transformation
      region_center: location(transforms: [Centroid])
    }
    aggregations {
      _rows_count
      amount {
        sum
        avg
      }
      metadata {
        avg(path: "score")
      }
      _location_measurement(type: AreaSpheroid) {
        sum
      }
    }
  }
}
```

## Performance Considerations

### 1. Limit Transformations

Apply transformations only when needed:

```graphql
# Good - Transform only necessary fields
query {
  parcels(limit: 100) {
    id
    area: _boundary_measurement(type: AreaSpheroid)
  }
}

# Avoid - Transforming large geometries unnecessarily
query {
  parcels {
    id
    boundary
    simplified: boundary(transforms: [Simplify], simplify_factor: 0.001)
    buffered: boundary(transforms: [Buffer], buffer: 100)
    centroid: boundary(transforms: [Centroid])
  }
}
```

### 2. Use Appropriate Measurement Types

Choose the right measurement type for your use case:

```graphql
# For display purposes - faster
query {
  parcels {
    id
    area: _boundary_measurement(type: Area)
  }
}

# For accurate real-world measurements - slower but accurate
query {
  parcels {
    id
    area_m2: _boundary_measurement(type: AreaSpheroid)
  }
}
```

### 3. Extract JSON Fields Selectively

Only extract fields you need:

```graphql
# Good - Extract only needed fields
query {
  events {
    id
    # Field remains JSON, trimmed to structure
    user_id: metadata(struct: { user_id: "int" })
  }
}

# Avoid - Extracting entire large JSON
query {
  events {
    id
    metadata  # Returns entire JSON
  }
}
```

### 4. Bucket Before Aggregating

Use time bucketing for efficient aggregations:

```graphql
query {
  events_bucket_aggregation {
    key {
      # Bucket first for efficient grouping
      day: created_at(bucket: day)
    }
    aggregations {
      _rows_count
    }
  }
}
```

## Common Patterns

### Time Series Analysis

```graphql
query {
  orders_bucket_aggregation {
    key {
      date: created_at(bucket: day)
      hour: _created_at_part(extract: hour)
    }
    aggregations {
      _rows_count
      revenue: total { sum }
      avg_order: total { avg }
    }
  }
}
```

### Geospatial Analytics

```graphql
query {
  stores {
    id
    name
    location
    coverage: location(transforms: [Buffer], buffer: 5000)
    area_km2: _location_measurement(
      type: AreaSpheroid
      transform: true
    )
  }
}
```

### JSON Data Extraction

```graphql
query {
  events_bucket_aggregation {
    key {
      # JSON field remains JSON, trimmed to structure
      category: metadata(struct: {
        category: "string"
      })
    }
    aggregations {
      _rows_count
      metadata {
        sum(path: "amount")
        avg(path: "duration")
        list(path: "tags", distinct: true)
      }
    }
  }
}
```

## Error Handling

### Planning Errors (SQL Generation)

Errors caught during query planning include specific paths:

```graphql
query {
  events {
    id
    # Invalid extract value
    bad_part: _created_at_part(extract: invalid)
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Invalid extract value 'invalid'. Must be one of: epoch, minute, hour, day, doy, dow, iso_dow, week, month, year, iso_year, quarter",
      "path": ["events", "_created_at_part"],
      "extensions": {
        "code": "INVALID_ARGUMENT_VALUE"
      }
    }
  ]
}
```

### Execution Errors (SQL Runtime)

Runtime errors during SQL execution:

```graphql
query {
  parcels {
    id
    # SRID transformation error at runtime
    transformed: boundary(
      transforms: [Transform]
      from: 4326
      to: 99999  # Invalid SRID
    )
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "SRID 99999 not found in spatial_ref_sys table"
    }
  ]
}
```

## Next Steps

- Learn about [Function Calls](./1-function-calls.md) for executing custom functions
- See [Aggregations](./7-aggregations.md) for grouping and computing statistics
- Check [Spatial Queries](./9-spatial.md) for geographic relationships
- Review [Data Types](/docs/engine-configuration/schema-definition/data-types) for detailed type specifications
