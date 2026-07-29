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

The set of functions is fixed per scalar type — a field offers exactly what its
type declares, and nothing else. `_rows_count` is not a field function: it is a
member of the aggregation object itself and counts rows (`COUNT(*)`).

:::warning `count` counts DISTINCT values

`count` on a field compiles to `COUNT(DISTINCT field)`, and it takes no
arguments — there is no `count(distinct: ...)`. For the plain number of rows
use `_rows_count`. The `distinct` argument exists only on `list` and
`string_agg`.

:::

| Field type | Functions |
|------------|-----------|
| `Int`, `BigInt`, `Float` | `count`, `sum`, `avg`, `min`, `max`, `list(distinct: Boolean = false)`, `any`, `last` |
| `String` | `count`, `string_agg(sep: String!, distinct: Boolean = false)`, `list(distinct: Boolean = false)`, `any`, `last` |
| `Boolean` | `count`, `bool_and`, `bool_or`, `list(distinct: Boolean = false)`, `any`, `last` |
| `Date`, `DateTime`, `Timestamp` | `count`, `min`, `max`, `list(distinct: Boolean = false)`, `any`, `last` |
| `Geometry` | `count`, `list(distinct: Boolean = false)`, `any`, `last`, `intersection`, `union`, `extent` |
| `JSON` | see [JSON Field Aggregation](#json-field-aggregation) |

`any` returns an arbitrary value from the group, `last` the value of the last
row in the group. There is no `stddev`, no `variance` and no `first`.

Note that `String` has **no** `min` / `max`, and the date-like types have no
`sum` / `avg` — the aggregation object simply does not declare those fields, so
asking for them is a validation error, not an empty result.

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

Available time buckets (`TimeBucket` enum): `minute`, `hour`, `day`, `week`,
`month`, `quarter`, `year`.

`bucket` is available on `Timestamp`, `DateTime` and `Date` fields. On a `Date`
field the truncated value stays a `Date` — sub-day buckets (`minute`, `hour`)
are meaningless there and truncate to the day.

The companion `_<field>_part(extract: ...)` extra field extracts a part as a
`BigInt` instead of truncating; its `TimeExtract` enum is wider than
`TimeBucket` (`epoch`, `doy`, `dow`, `iso_dow`, …), and `extract_divide: Int`
divides the extracted value.

### Custom Intervals

Use custom time intervals. `bucket_interval` is declared on `Timestamp` and
`DateTime` fields only — a `Date` field takes `bucket` alone:

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

A `JSON` field carries every function, each taking a JSON path:

| Function | Path argument |
|----------|---------------|
| `count`, `list`, `any`, `last` | `path: String` — optional; without it the whole value is aggregated |
| `sum`, `avg`, `min`, `max` (return `Float`) | `path: String!` |
| `string_agg(sep: String!, distinct: Boolean = false)` | `path: String!` |
| `bool_and`, `bool_or` | `path: String!` |

The path is a **dotted key path** relative to the field
(`"user_id"`, `"details.category"`) — not a JSONPath expression, so no leading
`$.`.

Aggregate data within JSON fields:

```graphql
query {
  events_aggregation {
    metadata {
      count(path: "user_id")
      sum(path: "score")
      avg(path: "duration")
      list(path: "tags", distinct: true)
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

For aggregated fields, apply additional aggregation functions. The sub-level is
narrower than the top level — it exposes only the functions that make sense over
an already-aggregated value:

| Field type | Sub-aggregation functions |
|------------|---------------------------|
| `Int`, `BigInt`, `Float` | `count`, `sum`, `avg`, `min`, `max` |
| `String` | `count`, `string_agg` |
| `Boolean` | `count`, `bool_and`, `bool_or` |
| `Date`, `DateTime`, `Timestamp` | `count`, `min`, `max` |
| `Geometry` | `count`, `intersection`, `union`, `extent` |

`count` always sub-aggregates as a `BigIntAggregation`, so `count { sum }` (the
total of the per-group distinct counts) is available for every type.

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