---
title: "Cube & Hypertable Queries"
sidebar_position: 13
---

# Cube & Hypertable Queries

Hugr provides special table type directives for optimized analytical and time-series queries. The `@cube` directive enables OLAP-style pre-aggregation for analytical workloads, while `@hypertable` leverages TimescaleDB for efficient time-series data handling.

## Cube Queries

Tables marked with `@cube` are optimized for analytical queries with automatic pre-aggregation. Fields marked with `@measurement` are aggregated, while all other fields become dimensions for grouping.

### Schema Example

```graphql
type sales @table(name: "sales") @cube {
  id: BigInt! @pk

  # Dimensions (used for grouping)
  customer_id: Int!
  product_id: Int!
  store_id: Int!
  sale_date: Date!
  region: String!

  # Measurements (aggregated)
  quantity: Int! @measurement
  unit_price: Float! @measurement
  total_amount: Float! @measurement
  discount: Float! @measurement
}
```

### Basic Cube Queries

Query cubes using the `measurement_func` argument on measurement fields:

```graphql
query {
  sales {
    # Dimensions (grouped by)
    sale_date(bucket: month)
    region

    # Measurements with aggregation functions
    total_revenue: total_amount(measurement_func: SUM)
    total_quantity: quantity(measurement_func: SUM)
    avg_price: unit_price(measurement_func: AVG)
    max_discount: discount(measurement_func: MAX)
  }
}
```

Response:
```json
{
  "data": {
    "sales": [
      {
        "sale_date": "2024-01-01T00:00:00Z",
        "region": "North",
        "total_revenue": 125000.00,
        "total_quantity": 850,
        "avg_price": 147.06,
        "max_discount": 25.00
      },
      {
        "sale_date": "2024-01-01T00:00:00Z",
        "region": "South",
        "total_revenue": 98000.00,
        "total_quantity": 720,
        "avg_price": 136.11,
        "max_discount": 20.00
      }
    ]
  }
}
```

### Measurement Aggregation Functions

Available `measurement_func` values by field type:

#### Numeric Types (Int, BigInt, Float)

```graphql
query {
  sales {
    region

    # Sum of all values
    total: total_amount(measurement_func: SUM)

    # Average value
    average: total_amount(measurement_func: AVG)

    # Minimum value
    min_sale: total_amount(measurement_func: MIN)

    # Maximum value
    max_sale: total_amount(measurement_func: MAX)

    # Any non-null value
    sample: total_amount(measurement_func: ANY)
  }
}
```

#### Boolean Types

```graphql
type events @table(name: "events") @cube {
  event_id: BigInt! @pk
  category: String!
  is_successful: Boolean! @measurement
  has_error: Boolean! @measurement
}
```

Query:
```graphql
query {
  events {
    category

    # Logical OR of all values
    any_successful: is_successful(measurement_func: OR)

    # Logical AND of all values
    all_successful: is_successful(measurement_func: AND)

    # Any value
    sample_success: is_successful(measurement_func: ANY)
  }
}
```

#### Date and Timestamp Types

```graphql
type orders @table(name: "orders") @cube {
  id: BigInt! @pk
  customer_id: Int!
  first_order_date: Date! @measurement
  last_order_date: Date! @measurement
}
```

Query:
```graphql
query {
  orders {
    customer_id

    # Earliest date
    first_purchase: first_order_date(measurement_func: MIN)

    # Latest date
    last_purchase: last_order_date(measurement_func: MAX)

    # Any date value
    sample_date: first_order_date(measurement_func: ANY)
  }
}
```

### Dimensions and Automatic Grouping

All non-measurement fields automatically become dimensions for grouping:

```graphql
query {
  sales {
    # These fields define the grouping
    sale_date(bucket: quarter)
    region

    # Measurements are aggregated within each group
    total_amount(measurement_func: SUM)
    quantity(measurement_func: SUM)
  }
}
```

**Behavior:**
- Data is grouped by `sale_date` (by quarter) and `region`
- Measurements are aggregated within each group
- SQL equivalent: `GROUP BY DATE_TRUNC('quarter', sale_date), region`

### Relations in Cube Queries

When querying related data, foreign keys are automatically included in grouping:

```graphql
query {
  sales {
    # customer_id automatically included in GROUP BY
    customer {
      id
      name
      country
    }

    # product_id automatically included in GROUP BY
    product {
      id
      name
      category {
        name
      }
    }

    # Aggregated measurements
    total_revenue: total_amount(measurement_func: SUM)
    avg_quantity: quantity(measurement_func: AVG)
  }
}
```

**Important:** Including related objects adds their foreign keys to the GROUP BY clause, affecting aggregation granularity.

### Filtering Cube Data

Apply filters before aggregation:

```graphql
query {
  sales(
    filter: {
      sale_date: {
        gte: "2024-01-01"
        lt: "2024-04-01"
      }
      region: { eq: "North" }
      total_amount: { gte: 100 }
    }
  ) {
    sale_date(bucket: month)
    region
    total_amount(measurement_func: SUM)
    quantity(measurement_func: SUM)
  }
}
```

### Sorting Cube Results

Sort by dimensions or aggregated measurements:

```graphql
query {
  sales(
    order_by: [
      { field: "sale_date", direction: DESC }
      { field: "total_amount", direction: DESC }
    ]
  ) {
    sale_date(bucket: month)
    region
    total_amount(measurement_func: SUM)
  }
}
```

### Pagination with Cubes

Use `limit` and `offset` for pagination:

```graphql
query TopRegions($page: Int!) {
  sales(
    limit: 10
    offset: $page  # Calculate: $page * 10 before query
    order_by: [{ field: "total_amount", direction: DESC }]
  ) {
    region
    total_amount(measurement_func: SUM)
    quantity(measurement_func: SUM)
  }
}
```

### Mixed Measurements and Dimensions

Measurement fields without `measurement_func` become dimensions:

```graphql
query {
  sales {
    # Dimensions
    sale_date(bucket: month)
    region

    # Measurement used as dimension (distinct values)
    unit_price

    # Aggregated measurements
    total_revenue: total_amount(measurement_func: SUM)
    total_quantity: quantity(measurement_func: SUM)
  }
}
```

**Result:** Groups by `sale_date`, `region`, and `unit_price`, then aggregates measurements within each group.

### Cube Aggregations

Use standard aggregation queries with cubes. Measurement fields in aggregations can use `measurement_func` for double aggregation.

**Important:**
- With `measurement_func`: Applies double aggregation (cube aggregation → aggregation query)
- Without `measurement_func`: Measurement field becomes a dimension and is added to GROUP BY

#### Standard Aggregations

```graphql
query {
  sales_aggregation(
    filter: {
      sale_date: { gte: "2024-01-01" }
    }
  ) {
    _rows_count
    total_amount {
      sum
      avg
      min
      max
    }
    quantity {
      sum
      avg
    }
  }
}
```

#### Double Aggregation with measurement_func

When using `measurement_func` in cube aggregations, you perform double aggregation:

```graphql
query {
  sales_aggregation {
    _rows_count

    # Double aggregation:
    # 1. Cube pre-aggregates with SUM per group
    # 2. Aggregation query sums those sums
    total_amount(measurement_func: SUM) {
      sum    # Sum of sums
      avg    # Average of sums
      min    # Minimum sum
      max    # Maximum sum
    }

    # Average of averages
    unit_price(measurement_func: AVG) {
      avg
      min
      max
    }
  }
}
```

#### Measurement as Dimension (Without measurement_func)

When you query a measurement field without `measurement_func`, it becomes a dimension:

```graphql
query {
  sales_aggregation {
    # unit_price used as dimension - added to GROUP BY
    unit_price {
      list    # List of distinct unit prices
      count   # Count of distinct unit prices
    }

    # Other measurements aggregated within each unit_price group
    total_amount {
      sum
    }
    quantity {
      sum
    }
  }
}
```

**Result:** Groups by distinct `unit_price` values, then aggregates `total_amount` and `quantity` within each group.

#### Mixed: Dimensions and Double Aggregation

Combine both approaches:

```graphql
query {
  sales_aggregation(
    filter: {
      sale_date: { gte: "2024-01-01" }
    }
  ) {
    # Dimension field (regular aggregation)
    sale_date {
      min
      max
    }

    # Measurement as dimension (no measurement_func)
    unit_price {
      list
      count
    }

    # Measurement with double aggregation
    total_amount(measurement_func: SUM) {
      sum    # Sum of sums
      avg    # Average of sums
    }
  }
}
```

### Bucket Aggregations with Cubes

Group cubes by multiple dimensions:

```graphql
query {
  sales_bucket_aggregation {
    key {
      quarter: sale_date(bucket: quarter)
      region
      product {
        category {
          name
        }
      }
    }
    aggregations {
      _rows_count
      total_amount {
        sum
        avg
      }
      quantity {
        sum
      }
    }
  }
}
```

## Hypertable Queries

Tables marked with `@hypertable` leverage TimescaleDB for optimized time-series queries. These tables must have a timestamp field marked with `@timescale_key`.

### Schema Example

```graphql
type sensor_readings @table(name: "sensor_readings") @hypertable {
  sensor_id: Int! @pk
  timestamp: Timestamp! @pk @timescale_key
  temperature: Float!
  humidity: Float!
  pressure: Float!
  battery_level: Float!
}
```

### Basic Hypertable Queries

Query with time-based filtering:

```graphql
query {
  sensor_readings(
    filter: {
      timestamp: {
        gte: "2024-01-01T00:00:00Z"
        lt: "2024-01-02T00:00:00Z"
      }
      sensor_id: { eq: 123 }
    }
    order_by: [{ field: "timestamp", direction: ASC }]
    limit: 100
  ) {
    sensor_id
    timestamp
    temperature
    humidity
    pressure
  }
}
```

### Time Bucketing in Hypertables

Use the `bucket` argument on timestamp fields for time-series aggregation:

```graphql
query {
  sensor_readings_bucket_aggregation {
    key {
      # TimescaleDB time_bucket function
      hour: timestamp(bucket: hour)
      sensor_id
    }
    aggregations {
      _rows_count
      temperature {
        avg
        min
        max
      }
      humidity {
        avg
      }
      pressure {
        avg
      }
    }
  }
}
```

Response:
```json
{
  "data": {
    "sensor_readings_bucket_aggregation": [
      {
        "key": {
          "hour": "2024-01-15T00:00:00Z",
          "sensor_id": 123
        },
        "aggregations": {
          "_rows_count": 3600,
          "temperature": {
            "avg": 22.5,
            "min": 21.0,
            "max": 24.0
          },
          "humidity": {
            "avg": 45.2
          },
          "pressure": {
            "avg": 1013.25
          }
        }
      }
    ]
  }
}
```

### Custom Time Intervals

Use `bucket_interval` for custom time windows:

```graphql
query {
  sensor_readings_bucket_aggregation {
    key {
      # 15-minute intervals
      time_window: timestamp(bucket_interval: "15 minutes")
      sensor_id
    }
    aggregations {
      temperature {
        avg
        min
        max
      }
    }
  }
}
```

### Time-Range Queries

Efficiently query time ranges:

```graphql
query RecentReadings($sensorId: Int!, $hours: Int!) {
  sensor_readings(
    filter: {
      sensor_id: { eq: $sensorId }
      timestamp: {
        gte: "2024-01-15T00:00:00Z"  # Calculate: NOW() - $hours
      }
    }
    order_by: [{ field: "timestamp", direction: DESC }]
    limit: 1000
  ) {
    timestamp
    temperature
    humidity
  }
}
```

### Continuous Aggregates

Query materialized continuous aggregates:

```graphql
# Define continuous aggregate view
type hourly_sensor_stats @view(
  name: "hourly_sensor_stats"
) @hypertable {
  sensor_id: Int! @pk
  hour: Timestamp! @pk @timescale_key
  avg_temperature: Float!
  avg_humidity: Float!
  min_temperature: Float!
  max_temperature: Float!
  reading_count: Int!
}
```

Query the continuous aggregate:

```graphql
query {
  hourly_sensor_stats(
    filter: {
      hour: {
        gte: "2024-01-01T00:00:00Z"
        lt: "2024-02-01T00:00:00Z"
      }
    }
    order_by: [{ field: "hour", direction: ASC }]
  ) {
    hour
    sensor_id
    avg_temperature
    avg_humidity
    min_temperature
    max_temperature
    reading_count
  }
}
```

### Downsampling Time-Series Data

Aggregate high-frequency data into lower-frequency summaries:

```graphql
query {
  sensor_readings_bucket_aggregation(
    filter: {
      timestamp: {
        gte: "2024-01-01T00:00:00Z"
        lt: "2024-01-08T00:00:00Z"
      }
    }
  ) {
    key {
      # Downsample to daily
      day: timestamp(bucket: day)
      sensor_id
    }
    aggregations {
      _rows_count
      temperature {
        avg
        min
        max
        list
      }
      battery_level {
        min
        last
      }
    }
  }
}
```

### Gap Filling

Identify and handle gaps in time-series data:

```graphql
query {
  sensor_readings(
    filter: {
      sensor_id: { eq: 123 }
      timestamp: {
        gte: "2024-01-15T00:00:00Z"
        lt: "2024-01-16T00:00:00Z"
      }
    }
    order_by: [{ field: "timestamp", direction: ASC }]
  ) {
    timestamp
    temperature
    # Calculate time since previous reading in query
    _timestamp_part(extract: epoch)
  }
}
```

### Latest Values

Get the most recent reading per sensor:

```graphql
query {
  sensor_readings_bucket_aggregation {
    key {
      sensor_id
    }
    aggregations {
      timestamp {
        max
      }
      temperature {
        last
      }
      humidity {
        last
      }
      pressure {
        last
      }
    }
  }
}
```

### Filtering by Sensor Conditions

Filter time-series data by value thresholds:

```graphql
query HighTemperatureEvents {
  sensor_readings(
    filter: {
      timestamp: {
        gte: "2024-01-01T00:00:00Z"
      }
      temperature: { gt: 30.0 }
      _or: [
        { humidity: { gt: 80.0 } }
        { pressure: { lt: 1000.0 } }
      ]
    }
    order_by: [{ field: "timestamp", direction: DESC }]
    limit: 100
  ) {
    sensor_id
    timestamp
    temperature
    humidity
    pressure
  }
}
```

## Combined Cube + Hypertable

Use both directives for time-series analytical data:

```graphql
type sales_metrics @table(name: "sales_metrics")
  @cube
  @hypertable {

  id: BigInt! @pk

  # Time dimension (hypertable key)
  timestamp: Timestamp! @timescale_key

  # Other dimensions
  product_id: Int!
  region: String!
  channel: String!

  # Measurements (cube)
  revenue: Float! @measurement
  units_sold: Int! @measurement
  customers: Int! @measurement
  transactions: Int! @measurement
}
```

### Querying Combined Types

Query with both time bucketing and cube aggregation:

```graphql
query {
  sales_metrics {
    # Time bucketing (hypertable)
    hour: timestamp(bucket: hour)

    # Dimensions
    region
    channel

    # Aggregated measurements (cube)
    total_revenue: revenue(measurement_func: SUM)
    total_units: units_sold(measurement_func: SUM)
    unique_customers: customers(measurement_func: SUM)
    transaction_count: transactions(measurement_func: SUM)
  }
}
```

### Time-Series Analysis

Perform detailed time-series analysis:

```graphql
query {
  sales_metrics_bucket_aggregation(
    filter: {
      timestamp: {
        gte: "2024-01-01T00:00:00Z"
        lt: "2024-02-01T00:00:00Z"
      }
    }
  ) {
    key {
      # Daily time buckets
      day: timestamp(bucket: day)
      region
      channel
    }
    aggregations {
      _rows_count
      revenue {
        sum
        avg
        min
        max
      }
      units_sold {
        sum
      }
      customers {
        sum
      }
    }
  }
}
```

### Real-Time Dashboard Query

Query for real-time monitoring:

```graphql
query RealtimeDashboard {
  # Last hour performance
  recent: sales_metrics(
    filter: {
      timestamp: {
        gte: "2024-01-15T11:00:00Z"  # NOW() - 1 hour
      }
    }
  ) {
    timestamp(bucket_interval: "5 minutes")
    region
    revenue(measurement_func: SUM)
    units_sold(measurement_func: SUM)
  }

  # Current totals
  totals: sales_metrics_aggregation(
    filter: {
      timestamp: {
        gte: "2024-01-15T00:00:00Z"  # Start of day
      }
    }
  ) {
    _rows_count
    revenue {
      sum
      avg
    }
    customers {
      sum
    }
  }
}
```

## Performance Optimization

### Cube Performance Tips

1. **Select only needed dimensions:**

```graphql
# Good - Minimal dimensions
query {
  sales {
    region
    total_amount(measurement_func: SUM)
  }
}

# Avoid - Too many dimensions
query {
  sales {
    sale_date
    customer_id
    product_id
    store_id
    region
    total_amount(measurement_func: SUM)
  }
}
```

2. **Pre-aggregate with bucket aggregations:**

```graphql
# Efficient - Use bucket aggregation
query {
  sales_bucket_aggregation {
    key {
      month: sale_date(bucket: month)
      region
    }
    aggregations {
      total_amount { sum }
    }
  }
}
```

3. **Filter early:**

```graphql
query {
  sales(
    filter: {
      sale_date: { gte: "2024-01-01" }
      region: { in: ["North", "South"] }
    }
  ) {
    region
    total_amount(measurement_func: SUM)
  }
}
```

### Hypertable Performance Tips

1. **Always filter by time range:**

```graphql
# Good - Time range filter
query {
  sensor_readings(
    filter: {
      timestamp: {
        gte: "2024-01-15T00:00:00Z"
        lt: "2024-01-16T00:00:00Z"
      }
    }
  ) {
    timestamp
    temperature
  }
}
```

2. **Use continuous aggregates for frequent queries:**

```graphql
# Better - Query continuous aggregate
query {
  hourly_sensor_stats {
    hour
    avg_temperature
  }
}

# Instead of - Aggregating raw data repeatedly
query {
  sensor_readings_bucket_aggregation {
    key {
      hour: timestamp(bucket: hour)
    }
    aggregations {
      temperature { avg }
    }
  }
}
```

3. **Limit result sets:**

```graphql
query {
  sensor_readings(
    filter: {
      timestamp: { gte: "2024-01-15T00:00:00Z" }
    }
    order_by: [{ field: "timestamp", direction: DESC }]
    limit: 1000
  ) {
    timestamp
    temperature
  }
}
```

## Common Patterns

### Sales Analytics

```graphql
query SalesAnalytics {
  sales_bucket_aggregation(
    filter: {
      sale_date: {
        gte: "2024-01-01"
        lt: "2024-04-01"
      }
    }
  ) {
    key {
      quarter: sale_date(bucket: quarter)
      product {
        category {
          name
        }
      }
      region
    }
    aggregations {
      _rows_count
      total_amount {
        sum
        avg
      }
      quantity {
        sum
      }
    }
  }
}
```

### IoT Monitoring

```graphql
query SensorMonitoring {
  sensor_readings_bucket_aggregation(
    filter: {
      timestamp: {
        gte: "2024-01-15T00:00:00Z"
      }
      sensor_id: { in: [123, 456, 789] }
    }
  ) {
    key {
      hour: timestamp(bucket: hour)
      sensor_id
    }
    aggregations {
      temperature {
        avg
        min
        max
      }
      battery_level {
        min
        last
      }
    }
  }
}
```

### Financial Metrics

```graphql
query FinancialMetrics {
  transactions(
    filter: {
      timestamp: { gte: "2024-01-01T00:00:00Z" }
    }
  ) {
    day: timestamp(bucket: day)
    account_type
    total_volume: amount(measurement_func: SUM)
    transaction_count: _rows_count
    avg_transaction: amount(measurement_func: AVG)
  }
}
```

## Error Handling

### Planning Errors

Errors caught during query planning:

```graphql
query {
  sales {
    region
    # Invalid measurement function
    total: total_amount(measurement_func: INVALID)
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Invalid measurement_func 'INVALID'. Must be one of: SUM, AVG, MIN, MAX, ANY",
      "path": ["sales", "total_amount"],
      "extensions": {
        "code": "INVALID_ARGUMENT_VALUE"
      }
    }
  ]
}
```

### Execution Errors

Runtime errors during SQL execution:

```graphql
query {
  sensor_readings(
    filter: {
      timestamp: {
        gte: "invalid-timestamp"
      }
    }
  ) {
    timestamp
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Invalid timestamp format"
    }
  ]
}
```

## Next Steps

- Learn about [Generated Fields](./12-generated-fields.md) for timestamp transformations and measurements
- See [Aggregations](./7-aggregations.md) for standard aggregation patterns
- Check [Schema Definition - Special Types](/docs/engine-configuration/schema-definition/data-objects/special-types) for setup details
- Review [TimescaleDB Documentation](https://docs.timescale.com/) for hypertable features
