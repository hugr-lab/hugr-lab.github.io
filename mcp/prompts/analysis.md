# Data Analysis

## 🚫 ABSOLUTE RULE: NO PYTHON/PANDAS/DUCKDB!

**NEVER suggest or use:**
- ❌ Python scripts for data fetching
- ❌ Pandas for aggregations
- ❌ DuckDB for analysis
- ❌ Multiple query loops
- ❌ Client-side data processing

**ALWAYS use:**
- ✅ GraphQL aggregations (`_bucket_aggregation`, `_aggregation`)
- ✅ Server-side jq transforms
- ✅ Single complex queries with nested filters
- ✅ `max_result_size` for large results

### ❌ WRONG: Python/Pandas/DuckDB
```python
# DON'T DO THIS!
results = []
for i in range(10):
    query = f"query {{ objects(limit: 100, offset: {i*100}) {{ data }} }}"
    results.append(execute(query))

import pandas as pd
df = pd.DataFrame(results)
df.groupby('category').agg({'value': 'sum'})

# OR THIS:
import duckdb
duckdb.query("SELECT category, SUM(value) FROM data GROUP BY category")
```

### ✅ CORRECT: GraphQL Aggregation + jq
```graphql
query {
  module {  # ← Use module from discovery!
    objects_bucket_aggregation {
      key { category }
      aggregations {
        _rows_count
        value { sum avg min max }
      }
    }
  }
}
```

With jq transform:
```jq
.data.module.objects_bucket_aggregation | map({
  category: .key.category,
  count: .aggregations._rows_count,
  total: .aggregations.value.sum,
  average: .aggregations.value.avg
})
```

**Validate with data-validate_graphql_query before executing!**

## ⚠️ CRITICAL: Check Search Results for Completeness

When discovering schema for analysis, **ALWAYS verify you have all relevant fields:**

```json
Result format: { "total": 50, "returned": 20, "items": [...] }
```

**If `returned` < `total`** → More fields/objects available!

- Use `relevance_query` to search for analysis-relevant fields (e.g., "metrics", "totals", "counts")
- Use pagination if you need to see all available fields
- Don't miss important aggregation functions or measurement fields

**Example:**
```
# Search for metrics fields in a large type
schema-type_fields(
  type_name: "sales_aggregations",
  relevance_query: "revenue profit margin",
  top_k: 15
)
```

## Analysis Principles

**READ `hugr://docs/patterns` first for:**
- 🚫 Anti-Patterns (two queries, Python, etc.)
- ✅ jq Transformations (with functions and examples)
- ⚠️ Validation workflow (mandatory!)

**Core principles:**

1. **Server-side Aggregation** - Use GraphQL aggregations, NOT Python/Pandas
2. **Single Complex Queries** - One query with relation filters, NOT two queries
3. **jq for ALL Processing** - Transformations, calculations, analysis - all in jq
4. **Validate First** - ALWAYS use data-validate_graphql_query before executing
5. **Use _join** - For ad-hoc joins instead of two queries

## Iterative Analysis Process

Data analysis is an **iterative cycle**, not a single query:

```
1. Discover → 2. Query → 3. Analyze Results → 4. Refine → Repeat
```

### Cycle Steps

**1. Discovery Phase**
- Use `discovery-search_modules` to find relevant modules
- Use `discovery-search_module_data_objects` to find data objects
- Use `schema-type_fields` to understand structure
- Use `discovery-data_object_field_values` to explore field distributions

**2. Query Execution Phase**
- ✅ **ALWAYS** validate with `data-validate_graphql_query` first (MANDATORY!)
- Build jq transform for data processing
- Execute with `data-inline_graphql_result` + jq_transform
- ❌ NEVER use Python/Pandas for processing

**3. Analysis Phase**
- Examine results
- Identify patterns, outliers, trends
- Determine next questions

**4. Refinement Phase**
- Adjust filters based on findings
- Drill down into specific segments
- Add dimensions or change grouping
- Repeat cycle

### Multi-Object Queries (GraphQL Power!)

**Get data from multiple objects in ONE request:**

```graphql
query {
  module {
    # Count records
    customers_aggregation {
      _rows_count
    }

    # Get recent activity
    orders(
      filter: { status: { eq: "pending" } }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 10
    ) {
      id
      total
      customer { name }
    }

    # Revenue by month
    revenue_bucket_aggregation {
      key {
        month: created_at(bucket: month)
      }
      aggregations {
        total { sum }
        _rows_count
      }
    }

    # Product stats
    products_aggregation(
      filter: { in_stock: { eq: true } }
    ) {
      _rows_count
      price { avg min max }
    }
  }
}
```

Then use **single jq transform** to analyze ALL results:

```jq
{
  summary: {
    total_customers: .data.module.customers_aggregation._rows_count,
    pending_orders: (.data.module.orders | length),
    products_in_stock: .data.module.products_aggregation._rows_count,
    avg_product_price: .data.module.products_aggregation.price.avg
  },
  recent_orders: (.data.module.orders | map({
    id,
    total,
    customer: .customer.name
  })),
  monthly_revenue: (.data.module.revenue_bucket_aggregation | map({
    month: .key.month,
    revenue: .aggregations.total.sum,
    count: .aggregations._rows_count
  }))
}
```

**MANDATORY:** ALWAYS validate with `data-validate_graphql_query` first!

```
# Step 1: VALIDATE
Tool: data-validate_graphql_query
Input: {
  query: "...",
  jq_transform: "{ summary: {...}, recent_orders: [...], monthly_revenue: [...] }"
}
Result: true ✓

# Step 2: EXECUTE (only after validation passes!)
Tool: data-inline_graphql_result
Input: { query: "...", jq_transform: "..." }
```

**Result:** Complete analysis in ONE request + ONE jq transform. No Python needed!

### Chain Multiple Queries

For complex analysis requiring iteration, chain queries:

```
Query 1: Get overall statistics
  ↓ Identify interesting segment
Query 2: Drill down into segment
  ↓ Find key dimension
Query 3: Group by dimension
  ↓ Discover outlier
Query 4: Investigate outlier details
```

**Example Chain:**
1. `object_aggregation` → Find total count and date range
2. `discovery-data_object_field_values` → Explore categorical field distribution
3. `object_bucket_aggregation` → Group by top categories
4. `object(filter: {category: {eq: "interesting"}})` → Get sample records
5. `data-inline_graphql_result` with jq → Extract specific insights

### Using Tools in Analysis

**Execute Queries:**
```
Tool: data-inline_graphql_result
Input: {
  query: "query { object_aggregation { _rows_count } }",
  jq_transform: ".data.object_aggregation._rows_count",
  max_result_size: 1000
}
```

**Explore Field Values:**
```
Tool: discovery-data_object_field_values
Input: {
  object_name: "customers",
  field_name: "status",
  limit: 20,
  calculate_stats: true,
  filter: { created_at: { gte: "2024-01-01" } }
}
Returns: {
  distinct: 5,
  values: ["active", "pending", "inactive", ...]
}
```

**Transform Results:**
Use jq to extract insights:
- `.data.object_aggregation._rows_count` - Extract count
- `.data.object_bucket_aggregation | map({key: .key.category, count: .aggregations._rows_count})` - Reshape
- `.data.object | map(.field)` - Extract field values
- `.data | to_entries | map({module: .key, count: .value._rows_count})` - Cross-module summary

### Iterative Example

**Task:** Understand customer distribution and behavior

**Iteration 1 - Overview:**
```graphql
query {
  customers_aggregation {
    _rows_count
    created_at { min max }
    total_purchases { sum avg }
  }
}
```
Result: 10,000 customers, created 2020-2024, avg 5 purchases

**Iteration 2 - Explore Status Field:**
```
Tool: discovery-data_object_field_values
Input: { object_name: "customers", field_name: "status" }
```
Result: ["active" (7000), "inactive" (2500), "suspended" (500)]

**Iteration 3 - Compare Segments:**
```graphql
query {
  customers_bucket_aggregation {
    key { status }
    aggregations {
      _rows_count
      total_purchases { avg sum }
      last_purchase_date { max }
    }
  }
}
```
Result: Active users avg 12 purchases, inactive avg 2

**Iteration 4 - Time Trend:**
```graphql
query {
  customers_bucket_aggregation(
    filter: { status: { eq: "active" } }
  ) {
    key {
      month: created_at(bucket: month)
    }
    aggregations {
      _rows_count
    }
  }
}
```
Result: Growth pattern identified, spike in Q3 2023

**Iteration 5 - Investigate Spike:**
```graphql
query {
  customers(
    filter: {
      created_at: { gte: "2023-07-01", lt: "2023-10-01" }
    }
    limit: 100
  ) {
    id
    source
    referral_code
  }
}
```
Use jq: `.data.customers | group_by(.source) | map({source: .[0].source, count: length})`

### Important Notes

**Row-Level Security:**
- Schema visibility depends on user role
- Some fields/objects may be hidden
- Always introspect to see available data
- Results may be filtered by RLS policies

**Size Limits:**
- `data-inline_graphql_result` has max_result_size
- Large results will be truncated
- Use aggregations to summarize before inlining
- Apply jq transforms to reduce result size

**Performance:**
- Start with aggregations (small results)
- Use `discovery-data_object_field_values` for field sampling
- Fetch raw data only when necessary
- Always apply filters and limits

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

**Iterative approach** - Each step may lead to new questions:

1. **Understand Requirements**
   - What metrics? (count, sum, average)
   - What grouping? (by time, category, dimension)
   - What filters? (time range, status)
   - What period? (daily, monthly, quarterly)

2. **Discover Schema**
   - Find module and data object
   - Use `discovery-data_object_field_values` to explore key fields
   - Use `schema-type_fields` to verify aggregation capabilities
   - Check grouping field types

3. **Start with Overview**
   - Execute `object_aggregation` for overall statistics
   - Use `data-inline_graphql_result` with jq to extract key numbers
   - Identify interesting patterns or segments

4. **Drill Down**
   - Based on overview, form specific questions
   - Use `object_bucket_aggregation` to group by dimensions
   - Apply filters to focus on interesting segments
   - Use `discovery-data_object_field_values` to explore field distributions

5. **Investigate Details**
   - Fetch sample records if needed
   - Cross-reference with related data objects
   - Use jq transforms to extract insights

6. **Iterate**
   - Refine filters based on findings
   - Add or change dimensions
   - Execute next query in the chain
   - Repeat until question is answered

### Tool Selection by Stage

**Discovery:** `discovery-search_modules`, `discovery-search_module_data_objects`
**Field Exploration:** `discovery-data_object_field_values`, `schema-type_fields`
**Overview:** `data-inline_graphql_result` with `object_aggregation`
**Grouping:** `data-inline_graphql_result` with `object_bucket_aggregation`
**Details:** `data-inline_graphql_result` with `object(filter, limit)`
**Transform:** Use jq_transform parameter to extract/reshape results

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
Analysis strategy:
- Approach: [Multi-object query / Iterative chain / Field exploration]
- Why: [Justification for approach]

Query plan:
- Type: [Multi-object/Aggregation/Bucket/Field Values]
- Objects: [List objects to query in single request]
- Metrics: [_rows_count, sum, avg, etc.]
- Grouping: [dimensions if bucket aggregation]
- Filters: [conditions]
- jq transform: [HOW to extract and reshape data]

[GraphQL Query with multiple objects if applicable]

jq transform:
[jq script to analyze results - NO Python!]

Expected insights: [what this will reveal]
Next iteration: [if needed, what to investigate based on results]
```

**For multi-object analysis:**
```
Single query retrieving:
1. customers_aggregation → total count
2. orders (filtered + sorted) → recent activity
3. revenue_bucket_aggregation → trends
4. products_aggregation → inventory stats

jq transform analyzes ALL results to produce:
- Summary statistics
- Trend identification
- Key insights
- Recommendations for next iteration (if needed)

✓ No Python needed - pure GraphQL + jq!
```

**For iterative analysis:**
```
Iteration 1: Multi-object overview
- Tool: data-inline_graphql_result
- Query: [Multi-object GraphQL]
- jq: [Transform to summary]
- Result: [summary]
- Finding: [key insight]

Iteration 2: Drill down (if needed)
- Based on: [previous finding]
- Tool: discovery-data_object_field_values OR bucket_aggregation
- jq: [Extract specific dimension]
- Result: [summary]
- Finding: [key insight]

Iteration 3: Detail investigation (if needed)
- Query: [Focused data query]
- jq: [Extract samples/outliers]
- Result: [specific records]
- Conclusion: [final insight]
```


## Response Format

**Default: Text Response in Chat**

- Provide analysis results as **plain text directly in the conversation**
- No MD/HTML files unless explicitly requested
- Keep token usage reasonable - focus on key insights

**Structure:**
```
Analysis Results:

[Present data insights concisely]

Key Findings:
- [Finding 1]
- [Finding 2]
- [Finding 3]

[End here unless recommendations explicitly requested]
```

**Only if user asks:**
- Recommendations/conclusions
- Interactive HTML reports
- Markdown files
- Detailed reports

**Remember:** User can always ask for more detail or different format after seeing initial results.

## Recommendations and Conclusions

**DO NOT provide recommendations or conclusions by default!**

Only include if user explicitly asks:
- "What do you recommend?"
- "Give me conclusions"
- "What should I do next?"

Otherwise, just present the data and findings.

---

{{#if task}}
## Current Analysis Task

**Objective:** {{task}}

**Instructions:**
Follow the iterative analysis process:

**Iteration 1:** Start with discovery
- Use discovery tools to find relevant data
- Use discovery-data_object_field_values to explore fields

**Iteration 2:** Overview
- Execute object_aggregation for overall statistics
- Use data-inline_graphql_result with jq to extract insights

**Iteration 3+:** Drill down
- Based on findings, form specific questions
- Use bucket aggregations to group by dimensions
- Apply filters to focus on interesting segments
- Chain multiple queries as needed

**Remember:** This is an iterative cycle - analyze results and refine your approach!
{{/if}}
