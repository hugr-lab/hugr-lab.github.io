# Data Analysis

## Analysis Principle

**Analyze server-side** - Use database aggregations, not application-side processing.

## Analysis Type Selection

Based on user requirements:

**Overall Statistics** → Single-row aggregation
```graphql
object_aggregation(filter) {
  _rows_count
  field { sum avg min max }
}
```

**Grouped Analysis** → Bucket aggregation
```graphql
object_bucket_aggregation {
  key { group_fields }
  aggregations { metrics }
}
```

**Time Series** → Bucket aggregation with time bucketing
```graphql
key {
  date_field(bucket: day)
}
```

**Multi-Dimensional** → Bucket aggregation with multiple key fields
```graphql
key {
  dimension1
  dimension2
  dimension3
}
```

## Common Analysis Patterns

### Summary Statistics
```graphql
object_aggregation(
  filter: {
    date_field: { gte: "2024-01-01" }
    status: { eq: "completed" }
  }
) {
  _rows_count
  amount {
    sum
    avg
    min
    max
  }
  date_field {
    min
    max
  }
}
```

### Categorical Distribution
```graphql
object_bucket_aggregation {
  key {
    category_field
  }
  aggregations {
    _rows_count
    metric { sum avg }
  }
}
```

### Time Trend Analysis
```graphql
object_bucket_aggregation(
  filter: { date_field: { gte: "2024-01-01" } }
  order_by: [{ field: "key.date", direction: ASC }]
) {
  key {
    date: date_field(bucket: day)  # or week, month, quarter
  }
  aggregations {
    _rows_count
    metric { sum avg }
  }
}
```

### Top N Analysis
```graphql
object_bucket_aggregation(
  order_by: [{ field: "aggregations.metric.sum", direction: DESC }]
  limit: 10
) {
  key {
    entity_field
  }
  aggregations {
    metric { sum }
  }
}
```

### Multi-Dimensional OLAP
```graphql
object_bucket_aggregation {
  key {
    dimension1
    dimension2
    related_object {
      dimension3
    }
    time: date_field(bucket: quarter)
  }
  aggregations {
    _rows_count
    metric1 { sum }
    metric2 { avg }
  }
}
```

### Comparative Analysis
```graphql
object_bucket_aggregation {
  key { category }

  # All records
  all: aggregations {
    _rows_count
  }

  # Segment 1
  segment1: aggregations(
    filter: { field: { eq: "value1" } }
  ) {
    _rows_count
    metric { sum }
  }

  # Segment 2
  segment2: aggregations(
    filter: { field: { eq: "value2" } }
  ) {
    _rows_count
    metric { sum }
  }
}
```

### Cohort Analysis
```graphql
object_bucket_aggregation {
  key {
    cohort_month: created_at(bucket: month)
  }
  aggregations {
    _rows_count

    # Metrics per cohort
    related_aggregation {
      metric { sum avg }
    }
  }
}
```

### Funnel Analysis
```graphql
query {
  stage1: object_aggregation {
    _rows_count
  }

  stage2: object_aggregation(
    filter: { status: { eq: "stage2" } }
  ) {
    _rows_count
  }

  stage3: object_aggregation(
    filter: { status: { eq: "stage3" } }
  ) {
    _rows_count
  }
}
```

## Advanced Analysis

### Spatial Analysis
```graphql
regions {
  id
  name

  _spatial(field: "boundary", type: CONTAINS) {
    points_aggregation(field: "location") {
      _rows_count
    }

    points_bucket_aggregation(field: "location") {
      key { type_field }
      aggregations { _rows_count }
    }
  }
}
```

### H3 Hexagonal Clustering
Root-level query for spatial clustering:
```graphql
h3(resolution: 7) {
  cell
  resolution
  data {
    object_aggregation(
      field: "geometry_field"
      inner: true
    ) {
      _rows_count
      metric { sum avg }
    }
  }
}
```

### Cross-Source Analysis
```graphql
source_a_object {
  id
  dimension

  _join(fields: ["id"]) {
    source_b_bucket_aggregation(fields: ["entity_id"]) {
      key { category }
      aggregations {
        _rows_count
        metric { sum }
      }
    }
  }
}
```

## Time Bucketing Reference

**Buckets:**
- `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`

**Custom intervals:**
```graphql
timestamp_field(bucket_interval: "15 minutes")
timestamp_field(bucket_interval: "6 hours")
```

**Time parts:**
```graphql
_field_part(extract: year)
_field_part(extract: quarter)
_field_part(extract: month)
_field_part(extract: day)
_field_part(extract: hour)
```

## Aggregation Functions Reference

**Note:** These are common functions. **Always use `schema-type_fields` on `<object>_aggregations` type** to see exact available functions for each field.

**Numeric:** `count`, `sum`, `avg`, `min`, `max`, `list`, `any`, `last`
**String:** `count`, `string_agg`, `list`, `any`, `last`
**Boolean:** `count`, `bool_and`, `bool_or`
**Timestamp:** `count`, `min`, `max`

For Cube tables with `@measurement` fields, use `measurement_func`:
- Numeric: `SUM`, `AVG`, `MIN`, `MAX`, `ANY`
- Boolean: `OR`, `AND`, `ANY`
- Timestamp: `MIN`, `MAX`, `ANY`

## Analysis Workflow

1. **Understand Requirements**
   - What metrics? (count, sum, average)
   - What grouping? (by time, category, dimension)
   - What filters? (time range, status)
   - What period? (daily, monthly, quarterly)

2. **Discover Schema**
   - Find data object
   - Verify aggregation fields available
   - Check grouping field types

3. **Choose Pattern**
   - Select from patterns above
   - Adapt to specific requirements

4. **Apply Filters**
   - Time range
   - Status/category filters
   - Value thresholds

5. **Optimize**
   - Filter before aggregating
   - Limit bucket results
   - Use appropriate time buckets

## Performance Guidelines

### Filter Before Aggregating
```graphql
# ✅ Good
object_aggregation(
  filter: { date: { gte: "2024-01-01" } }
) { ... }

# ❌ Bad
object_aggregation { ... }  # All data
```

### Limit Bucket Results
```graphql
# ✅ Good - Top 10
object_bucket_aggregation(
  order_by: [{ field: "aggregations.metric.sum", direction: DESC }]
  limit: 10
) { ... }

# ❌ Bad - Unlimited
object_bucket_aggregation { ... }
```

### Choose Appropriate Granularity
- Daily: Last 30-90 days
- Weekly: Last 3-12 months
- Monthly: Last 1-3 years
- Quarterly/Yearly: Multi-year analysis

### Minimize Dimensions
Start with 1-2 grouping dimensions, add more only if needed:
- 1 dimension: Simple distribution
- 2 dimensions: Cross-tabulation
- 3+ dimensions: OLAP cube (larger result set)

### Select Only Needed Aggregations
```graphql
# ✅ Good - only needed functions
aggregations {
  _rows_count
  revenue { sum }
}

# ❌ Bad - unnecessary functions
aggregations {
  _rows_count
  revenue { sum avg min max }
  quantity { sum avg min max }
  ...
}
```

## Common Mistakes

### Fetching Data to Aggregate
```graphql
# ❌ Wrong
object(limit: 10000) {
  id
  value
}
# Then aggregate in application

# ✅ Right
object_aggregation {
  _rows_count
  value { sum }
}
```

### Unbounded Bucket Aggregation
```graphql
# ❌ Dangerous
object_bucket_aggregation {
  key { high_cardinality_field }
  ...
}

# ✅ Safe
object_bucket_aggregation(
  limit: 100
) { ... }
```

### Wrong Time Granularity
```graphql
# ❌ Too granular for large period
bucket: minute  # For 1 year of data

# ✅ Appropriate
bucket: day  # For 1 year
bucket: month  # For multi-year
```

## Response Template

When performing analysis:

```
Analysis approach:
- Type: [Overall/Grouped/Time Series/Multi-Dimensional]
- Metrics: [count, sum, avg, etc.]
- Grouping: [dimensions]
- Filters: [conditions]
- Period: [time range]

[GraphQL Query]

Expected output: [description]
```
