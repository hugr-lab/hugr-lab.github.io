---
title: Special Table Types
sidebar_position: 10
---

# Special Table Types

Hugr provides special table type annotations for optimized handling of specific data patterns like OLAP cubes and time-series data.

## Cubes with @cube

The `@cube` directive enables OLAP-style pre-aggregation for analytical queries:

```graphql
type sales @table(name: "sales") @cube {
  id: BigInt! @pk
  
  # Dimension fields (used for grouping)
  customer_id: Int!
  product_id: Int!
  store_id: Int!
  sale_date: Date!
  
  # Measurement fields (aggregated)
  quantity: Int! @measurement
  unit_price: Float! @measurement
  total_amount: Float! @measurement
  discount: Float! @measurement
}
```

### Querying Cubes

When querying cubes, specify aggregation functions for measurements:

```graphql
query {
  sales {
    # Dimensions (grouped by)
    sale_date(bucket: month)
    customer {
      country
    }
    product {
      category {
        name
      }
    }
    
    # Measurements (aggregated)
    quantity(measurement_func: SUM)
    total_amount(measurement_func: SUM)
    unit_price(measurement_func: AVG)
    discount(measurement_func: AVG)
  }
}
```

### Measurement Aggregation Functions

Available functions by type:

**Numeric (Int, BigInt, Float):**
- `SUM` - Total sum
- `AVG` - Average value
- `MIN` - Minimum value
- `MAX` - Maximum value
- `ANY` - Any value (for dimensions)

**Boolean:**
- `ANY` - Any value
- `OR` - Logical OR
- `AND` - Logical AND

**Date/Timestamp:**
- `MIN` - Earliest date
- `MAX` - Latest date
- `ANY` - Any value

### Cube Behavior

1. **Pre-aggregation**: Data is grouped before joins
2. **Automatic dimensions**: Non-measurement fields become group-by dimensions
3. **Subquery impact**: Adding related fields automatically includes foreign keys in grouping

Example with automatic dimension inclusion:

```graphql
query {
  sales {
    # customer_id automatically included in GROUP BY
    customer {
      name
      country
    }
    
    # Aggregations
    total_amount(measurement_func: SUM)
    quantity(measurement_func: SUM)
  }
}
```

### Mixed Queries

Combine measurements with and without aggregation:

```graphql
query {
  sales {
    # Dimensions
    sale_date(bucket: quarter)
    store_id
    
    # Aggregated measurement
    total_revenue: total_amount(measurement_func: SUM)
    
    # Non-aggregated (becomes dimension)
    unit_price
    
    # Count of records
    _rows_count
  }
}
```

## TimescaleDB Hypertables

For PostgreSQL with TimescaleDB, optimize time-series data:

```graphql
type sensor_readings @table(name: "sensor_readings") @hypertable {
  sensor_id: Int! @pk
  timestamp: Timestamp! @pk @timescale_key
  temperature: Float!
  humidity: Float!
  pressure: Float!
}
```

### Time-Series Queries

Leverage TimescaleDB functions:

```graphql
query {
  sensor_readings_bucket_aggregation {
    key {
      # TimescaleDB time_bucket function
      timestamp(bucket: hour)
      sensor_id
    }
    aggregations {
      temperature {
        avg
        min
        max
      }
      humidity {
        avg
      }
    }
  }
}
```

### Continuous Aggregates

Define views on hypertables:

```graphql
type hourly_sensor_stats @view(
  name: "hourly_sensor_stats"
) @hypertable {
  sensor_id: Int! @pk
  hour: Timestamp! @pk @timescale_key
  avg_temperature: Float!
  avg_humidity: Float!
  min_temperature: Float!
  max_temperature: Float!
}
```

## Combining Special Types

Use cubes with time-series data:

```graphql
type sales_metrics @table(name: "sales_metrics") 
  @cube 
  @hypertable {
  
  # Time dimension
  timestamp: Timestamp! @timescale_key
  
  # Other dimensions
  product_id: Int!
  region: String!
  
  # Measurements
  revenue: Float! @measurement
  units_sold: Int! @measurement
  customers: Int! @measurement
}
```

Query with time-series optimization:

```graphql
query {
  sales_metrics {
    # Time bucket using TimescaleDB
    timestamp(bucket: day)
    
    # Dimension
    region
    
    # Aggregated measurements
    revenue(measurement_func: SUM)
    units_sold(measurement_func: SUM)
    customers(measurement_func: COUNT)
  }
}
```

## Performance Benefits

### Cube Benefits

1. **Reduced computation**: Pre-aggregation before joins
2. **Optimized grouping**: Automatic dimension detection
3. **Memory efficiency**: Less data transferred

### Hypertable Benefits

1. **Automatic partitioning**: By time dimension
2. **Faster queries**: Optimized for time-range queries
3. **Data compression**: Automatic old data compression
4. **Continuous aggregates**: Materialized time-based views

## Best Practices

### When to Use @cube

Use for tables that are:
- Frequently aggregated
- Have clear dimensions vs measurements
- Used in analytical/reporting queries
- Large fact tables in star/snowflake schemas

### When to Use @hypertable

Use for tables that:
- Have time-series data
- Are partitioned by time
- Need efficient time-range queries
- Require automatic data retention policies

### Combining with Other Features

Cubes and hypertables work with all other Hugr features:

```graphql
type sales @table(name: "sales") 
  @cube 
  @cache(ttl: 300, tags: ["sales"]) {
  
  id: BigInt! @pk
  store_id: Int! @field_references(
    references_name: "stores"
    field: "id"
    query: "store"
  )
  sale_date: Date!
  amount: Float! @measurement
}
```

Query with relations:

```graphql
query {
  sales {
    sale_date(bucket: month)
    store {
      region
      country
    }
    amount(measurement_func: SUM)
  }
}
```

## Limitations

### Cube Limitations

- Pre-aggregation happens before joins
- Cannot mix aggregated and non-aggregated measurements
- All non-measurement fields become dimensions

### Hypertable Limitations

- Requires PostgreSQL with TimescaleDB
- Primary key must include time column
- Some constraints not supported on distributed hypertables