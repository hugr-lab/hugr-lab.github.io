---
title: Field Transformations and Additional Fields
sidebar_position: 11
---

# Field Transformations and Additional Fields

Hugr automatically adds arguments and calculated fields to certain data types, enabling powerful data transformations and calculations directly in GraphQL queries.

## Timestamp Fields

### Generated Arguments

For `Timestamp` and `Date` fields in queries, Hugr adds transformation arguments:

#### Time Buckets

The `bucket` argument rounds timestamps to specified intervals:

```graphql
query {
  orders {
    # Round to the start of the day
    order_date(bucket: day)
    
    # Round to the start of the month
    created_at(bucket: month)
  }
}
```

Available bucket values:
- `minute` - Round to minute
- `hour` - Round to hour  
- `day` - Round to day
- `week` - Round to week
- `month` - Round to month
- `quarter` - Round to quarter
- `year` - Round to year

#### Custom Intervals

The `bucket_interval` argument (Timestamp only) rounds to custom intervals:

```graphql
query {
  sensor_data {
    # Round to 15-minute intervals
    timestamp(bucket_interval: "15 minutes")
    
    # Round to 2-hour intervals
    reading_time(bucket_interval: "2 hours")
  }
}
```

### Additional Calculated Fields

For each `Timestamp` or `Date` field, Hugr generates an additional field `_<fieldname>_part` for extracting date/time components:

```graphql
query {
  orders {
    created_at
    
    # Extract year
    year: _created_at_part(extract: year)
    
    # Extract month
    month: _created_at_part(extract: month)
    
    # Extract day of week (0-6, Sunday = 0)
    day_of_week: _created_at_part(extract: dow)
    
    # Extract epoch seconds
    epoch: _created_at_part(extract: epoch)
    
    # Extract hour and divide by 4 (for 6-hour blocks)
    six_hour_block: _created_at_part(extract: hour, extract_divide: 4)
  }
}
```

Available extract options:
- `epoch` - Unix timestamp (seconds since 1970-01-01)
- `minute` - Minute (0-59)
- `hour` - Hour (0-23)
- `day` - Day of month (1-31)
- `doy` - Day of year (1-366)
- `dow` - Day of week (0-6, Sunday = 0)
- `iso_dow` - ISO day of week (1-7, Monday = 1)
- `week` - Week of year
- `month` - Month (1-12)
- `quarter` - Quarter (1-4)
- `year` - Year
- `iso_year` - ISO year

The `extract_divide` parameter divides the extracted value, useful for creating time blocks.

### Using in Aggregations

Time transformations are particularly useful in aggregations:

```graphql
query {
  orders_bucket_aggregation {
    key {
      # Group by month
      order_month: order_date(bucket: month)
      
      # Also extract year and month separately
      year: _order_date_part(extract: year)
      month: _order_date_part(extract: month)
    }
    aggregations {
      _rows_count
      total {
        sum
      }
    }
  }
}
```

## JSON Fields

### Structure Extraction Argument

The `struct` argument on JSON fields allows extracting and typing specific parts of JSON data:

```graphql
query {
  events(
    # Define the expected structure
  ) {
    id
    # Extract specific fields from JSON
    metadata(struct: {
      user_id: "string"
      score: "float"
      tags: ["string"]
      location: {
        lat: "float"
        lon: "float"
      }
    })
  }
}
```

Supported type definitions in struct:
- `"string"` - Extract as String
- `"int"` - Extract as Int
- `"bigint"` - Extract as BigInt
- `"float"` - Extract as Float
- `"boolean"` - Extract as Boolean
- `"time"` - Extract as Timestamp
- `"json"` - Keep as JSON
- `["type"]` - Array of specified type
- `{ field: "type" }` - Nested object

### JSON Path in Aggregations

Path expressions allow you to target specific fields within JSON data. Path expressions use a dot (`.`) notation to navigate through the JSON structure. It's allowed to aggregate only by object and subobject fields, not nested arrays.

Aggregate specific paths within JSON fields:

```graphql
query {
  events_aggregation {
    # Count unique user IDs in metadata
    unique_users: metadata {
      count(path: "user_id")
    }
    
    # Sum scores
    total_score: metadata {
      sum(path: "score")
    }
    
  }
}
```

### JSON in Bucket Aggregations

Group by JSON field values:

```graphql
query {
  events_bucket_aggregation {
    key {
      # Group by category from JSON metadata
      category: metadata(struct: { category: "string" })
    }
    aggregations {
      _rows_count
      metadata {
        sum(path: "$.score")
        avg(path: "$.duration")
      }
    }
  }
}
```

## Geometry Fields

### Transformation Arguments

Geometry fields accept transformation arguments to modify the geometry:

```graphql
query {
  locations {
    id
    name
    
    # Get centroid of polygon
    center: area(transforms: [Centroid])
    
    # Buffer point by 100 meters
    coverage: location(
      transforms: [Buffer]
      buffer: 100
    )
    
    # Reproject and simplify
    display_geometry: boundary(
      transforms: [Transform, Simplify]
      from: 4326
      to: 3857
      simplify_factor: 0.01
    )
  }
}
```

Available transformations:
- `Transform` - Reproject between coordinate systems
- `Centroid` - Get center point
- `Buffer` - Create buffer around geometry
- `Simplify` - Simplify geometry
- `SimplifyTopology` - Simplify preserving topology
- `Envelope` - Get bounding box
- `ConvexHull` - Get convex hull
- `StartPoint` - Get start point (LineString)
- `EndPoint` - Get end point (LineString)
- `Reverse` - Reverse direction (LineString)
- `FlipCoordinates` - Swap x/y coordinates

### Additional Measurement Fields

For each `Geometry` field, Hugr generates a `_<fieldname>_measurement` field for calculations:

```graphql
query {
  parcels {
    id
    boundary
    
    # Calculate area in square meters
    area_m2: _boundary_measurement(type: AreaSpheroid)
    
    # Calculate perimeter in meters
    perimeter_m: _boundary_measurement(type: PerimeterSpheroid)
    
    # Calculate area after transforming to local projection
    local_area: _boundary_measurement(
      type: Area
      transform: true
      from: 4326
      to: 3857
    )
  }
  
  roads {
    id
    path
    
    # Calculate road length in meters
    length_m: _path_measurement(type: LengthSpheroid)
  }
}
```

Available measurement types:
- `Area` - Planar area
- `AreaSpheroid` - Area on Earth's surface (square meters)
- `Length` - Planar length
- `LengthSpheroid` - Length on Earth's surface (meters)
- `Perimeter` - Planar perimeter
- `PerimeterSpheroid` - Perimeter on Earth's surface (meters)

### Geometry in Aggregations

Aggregate geometric data:

```graphql
query {
  regions_aggregation {
    _rows_count
    
    # Aggregate geometries
    boundary {
      union      # Combine all boundaries
      extent     # Get overall bounding box
      intersection  # Get common area
    }
  }
}
```

### Spatial Operations in Queries

Use geometry transformations and measurements together:

```graphql
query {
  properties {
    id
    address
    
    # Original geometry
    plot
    
    # Buffered area for analysis
    influence_zone: plot(
      transforms: [Buffer]
      buffer: 50  # 50 meters for EPSG:4326
    )
    
    # Simplified for display
    display_plot: plot(
      transforms: [Simplify]
      simplify_factor: 0.001
    )
    
    # Measurements
    plot_area: _plot_measurement(type: AreaSpheroid)
    
    # Spatial relationships
    _spatial(field: "plot", type: INTERSECTS) {
      flood_zones(field: "boundary") {
        risk_level
        zone_name
      }
    }
  }
}
```

## Combining Transformations

Use multiple transformations together:

```graphql
query DailySalesAnalysis {
  sales_bucket_aggregation(
    filter: {
      # Filter by date range
      created_at: {
        gte: "2024-01-01"
        lte: "2024-12-31"
      }
    }
  ) {
    key {
      # Group by day
      sale_date: created_at(bucket: day)
      
      # Extract components for additional grouping
      year: _created_at_part(extract: year)
      month: _created_at_part(extract: month)
      day: _created_at_part(extract: day)
      
      # Group by store location (buffered)
      store {
        region
        location(transforms: [Buffer], buffer: 1000)
      }
      
      # Extract category from JSON metadata
      category: metadata(struct: { category: "string" })
    }
    aggregations {
      _rows_count
      
      # Sum amounts
      total_sales: amount {
        sum
      }
      
      # Aggregate JSON data
      metadata {
        avg(path: "$.customer_satisfaction")
        list(path: "$.tags", distinct: true)
      }
      
      # Calculate coverage area
      store {
        location {
          union  # Combined coverage of all stores
        }
      }
    }
  }
}
```

## Performance Considerations

### Timestamp Transformations

- Bucketing operations are performed in the database when possible
- Use consistent bucket sizes for better query performance
- Consider creating materialized views for frequently used time buckets

### JSON Operations

- Structure extraction happens during query execution
- Complex nested structures may impact performance
- Consider storing frequently accessed JSON paths as separate columns

### Geometry Transformations

- Transformations are applied in order specified
- Simplification should be done after reprojection for best results
- Buffer operations on geographic coordinates (EPSG:4326) interpret distance in meters
- Use appropriate projections for accurate area/length calculations

## Best Practices

1. **Time Series Data**: Use bucket arguments for time-based grouping rather than extracting parts and grouping manually
2. **JSON Data**: Define struct schemas for consistent typing and better performance
3. **Spatial Data**: Apply transformations in logical order (reproject → buffer → simplify)
4. **Aggregations**: Combine field transformations with aggregations for powerful analytics

## Examples by Use Case

### Time Series Analysis

```graphql
query TimeSeriesMetrics {
  metrics_bucket_aggregation {
    key {
      # 15-minute intervals
      time_bucket: timestamp(bucket_interval: "15 minutes")
      sensor_id
    }
    aggregations {
      _rows_count
      value {
        avg
        min
        max
      }
    }
  }
}
```

### Geospatial Analysis

```graphql
query SpatialCoverage {
  stores {
    id
    name
    
    # Service area (5km radius)
    service_area: location(
      transforms: [Buffer]
      buffer: 5000
    )
    
    # Service area size
    coverage_area_km2: _location_measurement(
      type: AreaSpheroid
    )
    
    # Customers within service area
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(field: "address_location") {
        id
        total_orders
      }
    }
  }
}
```

### JSON Analytics

```graphql
query ProductAnalytics {
  products {
    id
    name
    
    # Extract and type check analytics data
    analytics: metadata(struct: {
      views: "int"
      clicks: "int"
      conversions: "int"
      revenue: "float"
      tags: ["string"]
      demographics: {
        age_groups: ["string"]
        locations: ["string"]
      }
    })
  }
  
  # Aggregate analytics
  products_aggregation {
    metadata {
      sum(path: "$.revenue")
      avg(path: "$.conversions")
      list(path: "$.tags[*]", distinct: true)
    }
  }
}
```