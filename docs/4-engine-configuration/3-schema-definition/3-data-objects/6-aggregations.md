---
title: Aggregations
sidebar_position: 6
---

# Aggregations

Hugr provides powerful aggregation capabilities for data analysis, including single-row aggregations and bucket (group-by) aggregations. These are automatically generated for all data objects.

## Single Row Aggregation

Aggregate all records into a single result:

```graphql
query {
  customers_aggregation {
    _rows_count
    age {
      avg
      min
      max
    }
    created_at {
      min
      max
    }
  }
}
```

### Available Aggregation Functions

**Numeric fields (Int, Float, BigInt):**
- `count` - Count of non-null values
- `sum` - Sum of values
- `avg` - Average value
- `min` - Minimum value
- `max` - Maximum value
- `stddev` - Standard deviation
- `variance` - Variance

**String fields:**
- `count` - Count of non-null values
- `min` - Alphabetically first value
- `max` - Alphabetically last value
- `string_agg(separator: String!)` - Concatenate with separator
- `list(distinct: Boolean)` - Array of values

**Boolean fields:**
- `count` - Count of non-null values
- `bool_and` - Logical AND of all values
- `bool_or` - Logical OR of all values

**Date/Timestamp fields:**
- `count` - Count of non-null values
- `min` - Earliest date/time
- `max` - Latest date/time

## Filtered Aggregation

Apply filters before aggregating:

```graphql
query {
  orders_aggregation(
    filter: {
      status: { eq: "completed" }
      order_date: { gte: "2024-01-01" }
    }
  ) {
    _rows_count
    total {
      sum
      avg
    }
  }
}
```

## Bucket Aggregation (GROUP BY)

Group records and aggregate each group:

```graphql
query {
  orders_bucket_aggregation {
    key {
      status
      customer {
        country
      }
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

### Sorting Bucket Results

Sort by aggregated values or keys:

```graphql
query {
  products_bucket_aggregation(
    order_by: [
      { field: "aggregations.sales.sum", direction: DESC }
    ]
  ) {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
      sales {
        sum
      }
    }
  }
}
```

### Time-Based Grouping

Group by time buckets:

```graphql
query {
  orders_bucket_aggregation {
    key {
      order_date(bucket: month)
      year: _order_date_part(extract: year)
      month: _order_date_part(extract: month)
    }
    aggregations {
      _rows_count
      revenue {
        sum
      }
    }
  }
}
```

Available time buckets:
- `minute`
- `hour`
- `day`
- `week`
- `month`
- `quarter`
- `year`

### Custom Intervals

Use custom time intervals:

```graphql
query {
  sensor_data_bucket_aggregation {
    key {
      timestamp(bucket_interval: "15 minutes")
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

## Nested Aggregations

Aggregate related data through relationships:

```graphql
query {
  customers_aggregation {
    _rows_count
    orders {
      _rows_count
      total {
        sum
        avg
      }
      order_details {
        quantity {
          sum
        }
      }
    }
  }
}
```

## Multiple Aggregations with Filters

Apply different filters to different aggregations:

```graphql
query {
  products_bucket_aggregation {
    key {
      category {
        name
      }
    }
    aggregations {
      _rows_count
    }
    in_stock: aggregations(
      filter: { stock_quantity: { gt: 0 } }
    ) {
      _rows_count
      stock_quantity {
        sum
      }
    }
    on_sale: aggregations(
      filter: { discount: { gt: 0 } }
    ) {
      _rows_count
      discount {
        avg
      }
    }
  }
}
```

## JSON Field Aggregation

Aggregate data within JSON fields:

```graphql
query {
  events_aggregation {
    metadata {
      count(path: "$.user_id")
      sum(path: "$.score")
      avg(path: "$.duration")
      list(path: "$.tags", distinct: true)
    }
  }
}
```

## Geometry Aggregation

Aggregate geometric data:

```graphql
query {
  locations_aggregation {
    _rows_count
    area {
      union  # Union of all geometries
      extent # Bounding box
    }
  }
}
```

## Sub-aggregations

For aggregated fields, apply additional aggregation functions:

```graphql
query {
  sales_bucket_aggregation {
    key {
      region
    }
    aggregations {
      stores {
        _rows_count
      }
      stores_aggregation {
        revenue {
          sum {
            sum  # Sum of sums
            avg  # Average of sums
            min  # Minimum sum
            max  # Maximum sum
          }
        }
      }
    }
  }
}
```

## Performance Considerations

### Limit Aggregated Data

Use filters and limits to reduce the dataset:

```graphql
query {
  large_table_aggregation(
    filter: { created_at: { gte: "2024-01-01" } }
    limit: 10000
  ) {
    _rows_count
    amount {
      sum
    }
  }
}
```

### Optimize GROUP BY

Limit the number of groups:

```graphql
query {
  orders_bucket_aggregation(
    limit: 100  # Return only top 100 groups
    order_by: [
      { field: "aggregations.total.sum", direction: DESC }
    ]
  ) {
    key {
      customer_id
    }
    aggregations {
      total {
        sum
      }
    }
  }
}
```

### Use Indexes

Ensure proper indexes exist for:
- Fields used in GROUP BY (key fields)
- Fields used in filters
- Fields used in ORDER BY