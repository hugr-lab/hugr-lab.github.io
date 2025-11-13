# Prompt: Data Analysis with Hugr

## Core Directive

**Use Hugr's aggregation and transformation capabilities to analyze data efficiently on the server side.**

---

## Analysis Principles

### 1. Analyze Server-Side
Perform aggregations in the database, not in the application:
```
❌ Fetch all data → Aggregate in application
✅ Use aggregation queries → Get results directly
```

### 2. Use Appropriate Aggregation Type
- **Single-row aggregation** - Overall statistics
- **Bucket aggregation** - Grouped analysis
- **Nested aggregations** - Multi-level analysis

### 3. Leverage Filters
Filter before aggregating to focus analysis:
```graphql
orders_aggregation(
  filter: { created_at: { gte: "2024-01-01" } }
) { ... }
```

---

## Analysis Workflow

### Step 1: Understand Analysis Requirements

Parse user's analytical needs:
- What metrics are needed? (count, sum, average, min, max)
- What groupings are required? (by time, category, region)
- What filters should apply?
- What time period?
- What dimensions matter?

**Example User Request:**
> "Analyze sales by region and product category for Q1 2024"

**Parsed Requirements:**
- Metric: Sales (sum)
- Grouping: Region, Product Category
- Filter: Q1 2024
- Type: Bucket aggregation

---

### Step 2: Discover Aggregation Capabilities

Use discovery to find:

```
1. Identify data object
   └─> discovery-search_module_data_objects

2. Check aggregation availability
   └─> schema-type_fields(type_name="object_name")
   └─> Look for: object_aggregation, object_bucket_aggregation

3. Examine aggregation fields
   └─> schema-type_fields(type_name="object_aggregations")

4. Check grouping options
   └─> schema-type_fields(type_name="object_bucket_aggregation_key")
```

---

### Step 3: Choose Analysis Pattern

Based on requirements, select pattern:

**Pattern A: Overall Statistics**
```graphql
<object>_aggregation(filter: ...) {
  _rows_count
  field { sum avg min max }
}
```

**Pattern B: Grouped Analysis**
```graphql
<object>_bucket_aggregation(filter: ...) {
  key { grouping_fields }
  aggregations { metrics }
}
```

**Pattern C: Time Series**
```graphql
<object>_bucket_aggregation {
  key {
    time_bucket: timestamp(bucket: day)
  }
  aggregations { metrics }
}
```

**Pattern D: Multi-Dimensional**
```graphql
<object>_bucket_aggregation {
  key {
    dimension1
    dimension2
    dimension3
  }
  aggregations { metrics }
}
```

---

## Common Analysis Patterns

### Pattern 1: Summary Statistics

**Use Case:** Get overall totals and averages

**Example:**
```graphql
query {
  orders_aggregation(
    filter: {
      created_at: { gte: "2024-01-01" }
      status: { eq: "completed" }
    }
  ) {
    _rows_count
    total {
      sum
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

**When to Use:**
- Dashboard summary cards
- Overall KPIs
- Total counts and sums

---

### Pattern 2: Time Series Analysis

**Use Case:** Analyze trends over time

**Daily Analysis:**
```graphql
orders_bucket_aggregation(
  filter: { created_at: { gte: "2024-01-01" } }
  order_by: [{ field: "key.date", direction: ASC }]
) {
  key {
    date: created_at(bucket: day)
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

**Monthly Analysis:**
```graphql
orders_bucket_aggregation {
  key {
    month: created_at(bucket: month)
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

**Time Parts:**
```graphql
orders_bucket_aggregation {
  key {
    year: _created_at_part(extract: year)
    quarter: _created_at_part(extract: quarter)
    month: _created_at_part(extract: month)
  }
  aggregations {
    total { sum }
  }
}
```

**When to Use:**
- Trend analysis
- Seasonal patterns
- Time-based charts

---

### Pattern 3: Categorical Analysis

**Use Case:** Analyze by categories or groups

**Simple Grouping:**
```graphql
orders_bucket_aggregation {
  key {
    status
  }
  aggregations {
    _rows_count
    total { sum avg }
  }
}
```

**Nested Grouping:**
```graphql
orders_bucket_aggregation {
  key {
    customer {
      country
      segment
    }
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

**When to Use:**
- Distribution analysis
- Category comparisons
- Segmentation analysis

---

### Pattern 4: Top N Analysis

**Use Case:** Find top performers

**Top Customers by Revenue:**
```graphql
orders_bucket_aggregation(
  order_by: [
    { field: "aggregations.total.sum", direction: DESC }
  ]
  limit: 10
) {
  key {
    customer {
      id
      name
    }
  }
  aggregations {
    _rows_count
    total { sum }
  }
}
```

**Top Products by Quantity:**
```graphql
order_details_bucket_aggregation(
  order_by: [
    { field: "aggregations.quantity.sum", direction: DESC }
  ]
  limit: 20
) {
  key {
    product {
      id
      name
    }
  }
  aggregations {
    quantity { sum }
    unit_price { avg }
  }
}
```

**When to Use:**
- Ranking lists
- Performance leaders
- Pareto analysis (80/20)

---

### Pattern 5: Multi-Dimensional Analysis

**Use Case:** Analyze across multiple dimensions

**Sales by Region, Category, and Time:**
```graphql
sales_bucket_aggregation {
  key {
    region
    product { category }
    quarter: sale_date(bucket: quarter)
  }
  aggregations {
    _rows_count
    amount { sum }
    quantity { sum }
  }
}
```

**When to Use:**
- Complex business analysis
- OLAP-style queries
- Cross-tabulation

---

### Pattern 6: Comparative Analysis

**Use Case:** Compare different segments

**Multiple Filtered Aggregations:**
```graphql
products_bucket_aggregation {
  key {
    category { name }
  }

  # All products
  all: aggregations {
    _rows_count
    price { avg }
  }

  # In stock
  in_stock: aggregations(
    filter: { in_stock: { eq: true } }
  ) {
    _rows_count
  }

  # On sale
  on_sale: aggregations(
    filter: { discount: { gt: 0 } }
  ) {
    _rows_count
    discount { avg }
  }

  # Premium (price > 100)
  premium: aggregations(
    filter: { price: { gt: 100 } }
  ) {
    _rows_count
    price { avg }
  }
}
```

**When to Use:**
- A/B comparison
- Segment comparison
- Conditional analysis

---

### Pattern 7: Cohort Analysis

**Use Case:** Analyze customer/user cohorts

**Customer Cohorts by Registration Month:**
```graphql
customers_bucket_aggregation {
  key {
    registration_month: created_at(bucket: month)
  }
  aggregations {
    _rows_count

    # Orders statistics per cohort
    orders_aggregation {
      _rows_count
      total { sum avg }
    }
  }
}
```

**When to Use:**
- Customer retention analysis
- Cohort behavior tracking
- Lifecycle analysis

---

### Pattern 8: Funnel Analysis

**Use Case:** Analyze conversion funnels

**Order Status Funnel:**
```graphql
query {
  # Stage 1: All orders
  all: orders_aggregation {
    _rows_count
  }

  # Stage 2: Paid orders
  paid: orders_aggregation(
    filter: { payment_status: { eq: "paid" } }
  ) {
    _rows_count
  }

  # Stage 3: Shipped orders
  shipped: orders_aggregation(
    filter: { shipping_status: { eq: "shipped" } }
  ) {
    _rows_count
  }

  # Stage 4: Completed orders
  completed: orders_aggregation(
    filter: { status: { eq: "completed" } }
  ) {
    _rows_count
  }
}
```

**When to Use:**
- Conversion tracking
- Drop-off analysis
- Process optimization

---

### Pattern 9: Spatial Analysis

**Use Case:** Geographic analysis

**Businesses by Region:**
```graphql
regions {
  id
  name
  boundary

  # Count businesses in each region
  _spatial(field: "boundary", type: CONTAINS) {
    businesses_aggregation(field: "location") {
      _rows_count
    }

    # Group by business type
    businesses_bucket_aggregation(field: "location") {
      key {
        business_type
      }
      aggregations {
        _rows_count
      }
    }
  }
}
```

**H3 Hexagon Clustering:**
```graphql
events_bucket_aggregation {
  key {
    h3_cell: location(h3_resolution: 7)
  }
  aggregations {
    _rows_count
    value { avg }
  }
}
```

**When to Use:**
- Geographic distribution
- Location-based patterns
- Spatial clustering

---

### Pattern 10: Cross-Source Analysis

**Use Case:** Analyze data from multiple sources

**Join and Aggregate:**
```graphql
postgres_customers {
  id
  segment

  # Join with MySQL analytics
  _join(fields: ["id"]) {
    mysql_analytics_bucket_aggregation(fields: ["customer_id"]) {
      key {
        event_type
      }
      aggregations {
        _rows_count
      }
    }
  }
}
```

**When to Use:**
- Cross-system analysis
- Data enrichment
- Unified reporting

---

## JQ Transformations for Analysis

### Reshaping Aggregation Results

**Input:**
```graphql
orders_bucket_aggregation {
  key { status }
  aggregations { _rows_count total { sum } }
}
```

**JQ Transform:**
```graphql
jq(
  expression: """
    .orders_bucket_aggregation
    | map({
        status: .key.status,
        count: .aggregations._rows_count,
        revenue: .aggregations.total.sum
      })
  """
  query: "{ orders_bucket_aggregation { ... } }"
)
```

---

### Calculating Derived Metrics

**Calculate Percentages:**
```graphql
jq(
  expression: """
    {
      total: (.orders_aggregation._rows_count),
      by_status: (
        .orders_bucket_aggregation
        | map({
            status: .key.status,
            count: .aggregations._rows_count,
            percentage: (
              (.aggregations._rows_count / $total) * 100 | round
            )
          })
      )
    }
  """
  query: """
    {
      orders_aggregation { _rows_count }
      orders_bucket_aggregation {
        key { status }
        aggregations { _rows_count }
      }
    }
  """
)
```

---

### Complex Business Logic

**Customer Segmentation:**
```graphql
jq(
  expression: """
    .customers
    | map({
        id,
        name,
        segment: (
          if .orders_aggregation.total.sum > 10000 then "premium"
          elif .orders_aggregation.total.sum > 5000 then "standard"
          else "basic"
          end
        ),
        total_spent: .orders_aggregation.total.sum,
        order_count: .orders_aggregation._rows_count
      })
    | group_by(.segment)
    | map({
        segment: .[0].segment,
        customer_count: length,
        total_revenue: (map(.total_spent) | add)
      })
  """
  query: """
    {
      customers {
        id
        name
        orders_aggregation {
          _rows_count
          total { sum }
        }
      }
    }
  """
)
```

---

## Analysis Checklist

Before executing analysis:

- [ ] Filters defined (time range, status, etc.)
- [ ] Grouping dimensions identified
- [ ] Metrics selected (count, sum, avg, etc.)
- [ ] Sort order determined
- [ ] Result limit set (for bucket aggregations)
- [ ] Nested aggregations needed?
- [ ] JQ transformation required?

---

## Response Template

When performing data analysis:

```markdown
**Analysis Plan:**

Requirement: [user's analytical need]

**Approach:**
- Aggregation Type: [single-row / bucket / nested]
- Grouping: [dimensions]
- Metrics: [count / sum / avg / etc.]
- Filters: [filter conditions]
- Time Period: [date range]

**Query:**
```graphql
[analysis query]
```

**Expected Output:**
[Description of results structure]

**Interpretation:**
[How to interpret the results]
```

---

## Performance Tips for Analysis

1. **Filter Before Aggregating**
   - Apply time range filters
   - Filter out irrelevant data
   - Use status/category filters

2. **Limit Bucket Results**
   - Use `limit` for top N analysis
   - Sort by relevant metric

3. **Use Appropriate Time Buckets**
   - Day: For recent trends (last 30-90 days)
   - Week: For medium-term trends
   - Month: For long-term trends
   - Quarter/Year: For strategic analysis

4. **Minimize Grouping Dimensions**
   - More dimensions = more result rows
   - Start with 1-2 dimensions
   - Add more only if needed

5. **Select Only Needed Aggregations**
   - Don't request all functions if not needed
   - Focus on relevant metrics

---

## Next Steps

- **[r-aggregations.md](./r-aggregations.md)** - Detailed aggregation reference
- **[r-advanced-features.md](./r-advanced-features.md)** - Advanced analysis features

## Related Resources

- **[r-querying-basics.md](./r-querying-basics.md)** - Query fundamentals
- **[p-query-construction.md](./p-query-construction.md)** - Building queries
- **[p-performance-optimization.md](./p-performance-optimization.md)** - Optimization strategies
