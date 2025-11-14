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
- ✅ Relation filters instead of multiple queries

## 📚 Required Reading Before Analysis

**Read these resources/prompts first:**
1. **`hugr://docs/patterns`** - Anti-patterns, jq examples, validation workflow
2. **`hugr://docs/data-types`** - Aggregation functions, filter operators
3. **Use `discovery` prompt** - For schema discovery with relevance search
4. **Use `query-building` prompt** - For constructing validated queries

## Core Analysis Principles

1. **Server-side Aggregation** - GraphQL aggregations, NOT Python/Pandas
2. **Single Complex Queries** - One query with relation filters vs multiple queries
3. **jq for ALL Processing** - Transformations, calculations, reshaping
4. **MANDATORY Validation** - `data-validate_graphql_query` before execution
5. **Relation Filters** - Use subquery fields for filtering/grouping vs separate queries
6. **Dynamic Joins** - Use `_join` for ad-hoc joins vs two queries

## Iterative Analysis Process

Analysis is an **iterative cycle**, not a single query:

```
0. Overview → 1. Discovery → 2. Plan → 3. Execute → 4. Analyze → 5. Refine → Repeat
```

### Phase 0: Overview

**Understand requirements and initial discovery:**
- What metrics? (count, sum, average)
- What grouping? (time, category, dimension)
- What filters? (time range, status)
- Use `discovery-search_modules` to find modules
- Use `discovery-search_module_data_objects` to find data objects
- Use `discovery-search_module_functions` to find functions

### Phase 1: Discovery

**Use `discovery` prompt for schema understanding:**
```
Invoke MCP prompt: discovery
Task: "Find data objects related to [domain] with fields for [metrics/dimensions]"
```

**Discovery prompt will:**
- Search modules and data objects
- Check pagination (total vs returned)
- Use relevance search for specific fields
- Return summary of available schema

### Phase 2: Plan Query

**Use `query-building` prompt to construct query:**
```
Invoke MCP prompt: query-building
Task: "Build query for [analysis type] grouped by [dimensions] filtered by [conditions]"
```

**Before invoking, gather:**
- Use `schema-type_info` - Understand modules/objects/types
- Use `schema-type_fields` - Verify fields, filters, aggregations
- Use `discovery-data_object_field_values` - Explore field distributions
- Read `hugr://docs/patterns` for query patterns

**Query-building prompt will:**
- Verify all fields and operators exist
- Use correct module paths
- Build validated GraphQL query
- Create jq transform
- Validate with `data-validate_graphql_query`

### Phase 3: Execute

**Use query from query-building prompt:**
```
Tool: data-inline_graphql_result
Input: {
  query: "...",  # From query-building prompt
  jq_transform: "...",  # From query-building prompt
  max_result_size: 1000
}
```

**⚠️ MANDATORY:** Query must be validated first (query-building prompt does this)

### Phase 4: Analyze Results

- Examine jq-transformed results
- Identify patterns, outliers, trends
- Determine next questions

### Phase 5: Refine & Repeat

**Based on findings:**
- Adjust filters
- Drill down into segments
- Change grouping dimensions
- Add new data objects
- **Invoke `query-building` prompt again** for next iteration

## Multi-Object Queries (GraphQL Power!)

**Get data from multiple objects in ONE request:**

```graphql
query {
  module1 {
    # Overall stats
    customers_aggregation {
      _rows_count
    }

    # Recent activity
    orders(
      filter: { status: { eq: "pending" } }
      limit: 10
    ) {
      id
      total
      customer { name }
    }
  }

  module2 {
    # Trends
    sales_bucket_aggregation {
      key { month: created_at(bucket: month) }
      aggregations {
        _rows_count
        revenue { sum }
      }
    }
  }
}
```

**Then ONE jq transform for ALL results:**

```jq
{
  summary: {
    total_customers: .data.module1.customers_aggregation._rows_count,
    pending_orders: (.data.module1.orders | length)
  },
  monthly_revenue: (.data.module2.sales_bucket_aggregation | map({
    month: .key.month,
    revenue: .aggregations.revenue.sum
  }))
}
```

**Complete analysis in ONE request!** No Python needed.

## Analysis Type Selection

Choose based on requirements (see `hugr://docs/patterns` for detailed examples):

- **Overall Statistics** → `object_aggregation` (single-row)
- **Grouped Analysis** → `object_bucket_aggregation` (GROUP BY)
- **Time Series** → `bucket_aggregation` with time bucketing
- **Top N** → `bucket_aggregation` with `order_by` + `limit`
- **Multi-Dimensional OLAP** → `bucket_aggregation` with multiple key fields
- **Comparative** → Multiple aliased aggregations with filters
- **Spatial** → `_spatial` field with aggregations
- **Cross-Source** → `_join` field with aggregations

For detailed query patterns, **read `hugr://docs/patterns`**.

## Tool Selection by Analysis Stage

**Discovery:**
- `discovery-search_modules`
- `discovery-search_module_data_objects`
- `discovery-search_module_functions`
- **OR use `discovery` prompt** (recommended)

**Field Exploration:**
- `discovery-data_object_field_values` - Explore distributions
- `schema-type_fields` - Verify structure

**Query Building:**
- **Use `query-building` prompt** (recommended)
- OR manually: `schema-type_info`, `schema-type_fields`, `data-validate_graphql_query`

**Query Execution:**
- `data-inline_graphql_result` with jq transform

**Aggregation Functions:**
- **Read `hugr://docs/data-types`** for complete reference
- Common: `count`, `sum`, `avg`, `min`, `max`, `list`, `any`, `last`
- **ALWAYS verify** with `schema-type_fields` on `<object>_aggregations` type

## Chain Multiple Queries (When Iteration Needed)

**Iterative approach for complex analysis:**

```
Query 1: Get overall statistics (object_aggregation)
  ↓ Identify interesting segment
Query 2: Explore field values (discovery-data_object_field_values)
  ↓ Find key categories
Query 3: Group by dimension (object_bucket_aggregation)
  ↓ Discover outlier
Query 4: Investigate details (object with filter)
  ↓ Extract insights with jq
```

**Each iteration:**
1. Invoke appropriate prompt (`discovery` or `query-building`)
2. Execute query with `data-inline_graphql_result`
3. Analyze results
4. Form next question
5. Repeat

## Important Notes

**Row-Level Security:**
- Schema visibility depends on user role
- Results may be filtered by RLS policies
- Always introspect to see available data

**Size Limits:**
- `data-inline_graphql_result` has `max_result_size` parameter
- Use aggregations to summarize large datasets
- Apply jq transforms to reduce result size

**Performance:**
- Start with aggregations (small results)
- Use filters early
- Limit bucket results
- Read `hugr://docs/patterns` for optimization patterns

## 🚫 ABSOLUTE RULES for Output

### Rule 1: NO Files Unless Explicitly Requested

**❌ NEVER create automatically:**
- `.py`, `.sql`, `.md`, `.html`, `.csv`, `.xlsx` files

**✅ ONLY create when user EXPLICITLY says:**
- "Create a Python script..."
- "Generate a report file..."
- "Export to CSV..."

**Default: Everything in chat as plain text!**

### Rule 2: Be Concise - NO Multi-Page Reports

**❌ DON'T:**
- 15-page analysis reports
- Multi-file deliverables
- Verbose explanations

**✅ DO:**
- Key findings: 3-5 bullet points max
- Critical numbers/metrics
- Brief summary: 1-2 paragraphs max

**If user needs more → they will ask!**

### Rule 3: No Recommendations Unless Asked

**DO NOT provide recommendations/conclusions by default!**

Only if user explicitly asks:
- "What do you recommend?"
- "What should I do?"
- "Give me conclusions"

Otherwise: Present ONLY data and findings.

## Response Format

**Default: Concise Text in Chat**

✅ **GOOD Response:**
```
Analysis Results:

Total Patients: 1,247
- With comorbidities: 892 (71.5%)
- Top comorbidity: Hypertension (438, 49.1%)

Age Distribution:
- 0-18: 15% | 19-40: 28% | 41-65: 42% | 65+: 15%
```

❌ **BAD Response:**
```
I've prepared three files:
1. patient_analysis_report.md (~15 pages)
2. patient_analysis.py
3. graphql_queries.sql
```

## Analysis Workflow Summary

**For straightforward analysis:**
1. Invoke `discovery` prompt → Understand schema
2. Invoke `query-building` prompt → Build validated query
3. Execute with `data-inline_graphql_result`
4. Present concise results

**For complex/iterative analysis:**
1. Start with overview (aggregation)
2. Analyze → Form next question
3. Invoke `query-building` prompt for next iteration
4. Execute → Analyze → Repeat
5. Present concise summary of findings

**Remember:**
- Use MCP prompts (`discovery`, `query-building`)
- Read resources (`hugr://docs/patterns`, `hugr://docs/data-types`)
- NO Python/Pandas
- Validate queries (done by `query-building` prompt)
- Concise output

---

{{#if task}}
## Current Analysis Task

**Objective:** {{task}}

**Approach:**

**Step 1:** Invoke `discovery` prompt
- Task: "{{task}}"
- Let discovery prompt handle schema exploration

**Step 2:** Based on discovery results, invoke `query-building` prompt
- Task: "[Analysis type] grouped by [dimensions] filtered by [conditions]"
- Let query-building prompt construct and validate query

**Step 3:** Execute query from query-building prompt
- Tool: `data-inline_graphql_result`
- Use query and jq_transform from prompt

**Step 4:** Analyze results
- Identify patterns/insights
- Form next question if needed

**Step 5:** If iteration needed, repeat from Step 2 with refined question

**Remember:** This is iterative - each step may reveal new questions!
{{/if}}
