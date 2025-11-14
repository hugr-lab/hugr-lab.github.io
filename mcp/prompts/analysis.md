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
7. **Query Accumulation** - Combine multiple queries into one request when possible

## 🎯 Query Accumulation Strategy (NEW!)

**Concept:** Instead of executing each query immediately, accumulate related queries and combine them into a single multi-object GraphQL request.

**Why accumulate:**
- ✅ Fewer network requests to server
- ✅ All data fetched in one operation
- ✅ Single unified jq transform for all results
- ✅ More efficient analysis workflow

**When to accumulate:**
1. **Multiple independent questions** - Each can be answered without previous results
2. **Schema already discovered** - Know what to query without exploratory queries
3. **Related analysis scope** - Questions about same domain/timeframe/filters
4. **Combinable results** - Can analyze all answers together

**When to execute immediately:**
1. **Need results to proceed** - Next question depends on current answer
2. **Exploratory query** - Sampling field values, understanding data distribution
3. **Single focused question** - Only one thing to analyze
4. **Results inform next steps** - Unknown what to query next until you see data

**Example scenario:**

❌ **Old approach (execute each immediately):**
```
Query 1: Get customer count → Execute → Wait → Analyze
Query 2: Get recent orders → Execute → Wait → Analyze
Query 3: Get revenue trends → Execute → Wait → Analyze
Total: 3 requests, 3 waits, 3 separate analyses
```

✅ **New approach (accumulate and combine):**
```
Query 1: Get customer count → ACCUMULATE (store internally)
Query 2: Get recent orders → ACCUMULATE (store internally)
Query 3: Get revenue trends → COMBINE all 3 queries
  → Build single multi-object request
  → Execute ONCE
  → Analyze all results together with unified jq transform
Total: 1 request, 1 wait, 1 comprehensive analysis
```

**How to decide:**

```
Start analysis → Break down into questions
  ↓
For each question: Can I answer without previous results?
  ↓
YES → ACCUMULATE query
NO → EXECUTE immediately (need results first)
  ↓
When accumulated 2-3+ queries OR need results
  ↓
COMBINE accumulated queries → Execute multi-object request
```

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

**⚠️ IF QUERY VALIDATION FAILS:**
Read `hugr://docs/data-types` section **"Common Validation Errors & Fixes"** to understand:
- Why field/operator doesn't exist
- Correct syntax for `order_by` in bucket_aggregation
- POSIX regex vs Perl regex
- When to use `in` vs `any_of`

**Common mistakes to avoid:**
- Using `not_ilike`, `not_like` (don't exist, use `_not: { field: { ilike } }`)
- Wrong aggregation sort: `{ field: "total.sum" }` → Should be `{ field: "aggregations.total.sum" }`
- Perl regex like `(?!` → Use POSIX ERE only
- Using `any_of` on scalars → Use `in` instead

**⚠️ NEW: Query Accumulation Strategy**

After planning query, **DECIDE: Execute now or accumulate?**

**Execute immediately if:**
- ✅ Need results to determine next steps
- ✅ Query is independent (can't be combined with others)
- ✅ This is exploratory query (field value sampling, etc.)

**Accumulate for combination if:**
- ✅ Multiple related questions can be answered together
- ✅ Queries target different objects in same/different modules
- ✅ All queries are ready to plan (schema discovered)
- ✅ Can apply single jq transform to combined results

**How to accumulate:**
1. Build query with `query-building` prompt → Get validated query
2. Store query internally (don't execute yet)
3. Continue to next analysis question/phase
4. Build next query with `query-building` prompt
5. **Combine queries:** Invoke `query-building` prompt with:
   ```
   Task: "Combine these queries into one multi-object request:

   Query 1: [first query from previous iteration]
   Query 2: [second query from current iteration]

   Create single GraphQL query with both + unified jq transform"
   ```
6. Execute combined query in Phase 3

**Example accumulation flow:**
```
Iteration 1: Plan query for customer count → ACCUMULATE
Iteration 2: Plan query for recent orders → ACCUMULATE
Iteration 3: Plan query for revenue by month → COMBINE ALL 3
  → Invoke query-building with all 3 queries
  → Execute single multi-object query
  → Apply unified jq transform
```

### Phase 3: Execute

**Decision point: Execute single or combined query?**

**If accumulated queries exist:**
```
Invoke MCP prompt: query-building
Task: "Combine these queries into single multi-object request:

[List all accumulated queries from previous iterations]

Create unified GraphQL query + single jq transform to extract all insights."
```

**If executing single query:**
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

**This is the RESULT of Query Accumulation strategy!**

When you accumulate multiple queries and combine them, you get a multi-object request:

**Get data from multiple objects in ONE request:**

```graphql
query {
  module1 {
    # Query 1 (accumulated): Overall stats
    customers_aggregation {
      _rows_count
    }

    # Query 2 (accumulated): Recent activity
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
    # Query 3 (accumulated): Trends
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

**How this was built using Query Accumulation:**
1. Question 1: "How many customers?" → Built query → ACCUMULATE
2. Question 2: "Show pending orders" → Built query → ACCUMULATE
3. Question 3: "Revenue trends?" → Built query → COMBINE ALL 3
4. Invoke `query-building` with: "Combine these 3 queries into one"
5. Execute combined query with unified jq transform
6. Get all answers at once!

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

## Iterative Analysis with Query Accumulation

**Two patterns for complex analysis:**

### Pattern A: Sequential Dependent Queries
Use when each query depends on previous results:

```
Query 1: Get overall statistics → EXECUTE
  ↓ Analyze results → Identify interesting segment
Query 2: Explore field values for that segment → EXECUTE
  ↓ Analyze results → Find key categories
Query 3: Group by discovered dimension → EXECUTE
  ↓ Analyze results → Discover outlier
Query 4: Investigate outlier details → EXECUTE
```

**Each iteration:**
1. Invoke `query-building` prompt → Get query
2. EXECUTE immediately (need results to proceed)
3. Analyze results
4. Form next question based on results
5. Repeat

### Pattern B: Parallel Independent Queries with Accumulation
Use when questions are independent:

```
Analysis has 5 questions, questions 1-3 are independent:

Query 1: Customer count → ACCUMULATE
Query 2: Recent orders → ACCUMULATE
Query 3: Revenue trends → ACCUMULATE
  ↓ COMBINE queries 1-3 → EXECUTE multi-object
  ↓ Analyze combined results → Discover pattern
Query 4: Drill into pattern → EXECUTE (depends on results)
  ↓ Analyze → Form next question
Query 5: Detail investigation → EXECUTE
```

**Each iteration:**
1. Identify which questions are independent
2. For independent questions:
   - Invoke `query-building` → Get query → ACCUMULATE
3. When accumulated enough (2-3+) OR need results:
   - Invoke `query-building` with all accumulated queries
   - EXECUTE combined query
4. Analyze results
5. Form dependent questions → Execute immediately
6. Repeat with new accumulation if more independent questions

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

**For straightforward single-question analysis:**
1. Invoke `discovery` prompt → Understand schema
2. Invoke `query-building` prompt → Build validated query
3. Execute with `data-inline_graphql_result`
4. Present concise results

**For complex multi-question analysis (NEW: with query accumulation):**
1. Invoke `discovery` prompt → Understand schema for all questions
2. For each question:
   - Invoke `query-building` prompt → Get validated query
   - **DECIDE:** Execute now OR accumulate?
   - If accumulate → Store query, continue to next question
3. When ready to execute accumulated queries:
   - Invoke `query-building` with ALL accumulated queries
   - Combine into single multi-object request
   - Execute with unified jq transform
4. Analyze combined results → Form new questions if needed
5. Repeat with new query accumulation
6. Present concise summary of findings

**Query Accumulation Decision:**
- **Execute immediately** if need results to proceed
- **Accumulate** if multiple independent questions can be answered together
- **Combine and execute** when accumulated enough or need results

**Remember:**
- Use MCP prompts (`discovery`, `query-building`)
- Read resources (`hugr://docs/patterns`, `hugr://docs/data-types`)
- NO Python/Pandas
- Validate queries (done by `query-building` prompt)
- Consider query accumulation for efficiency
- Concise output

---

{{if .task}}
## Current Analysis Task

**Objective:** {{.task}}

**Approach:**

**Step 1:** Invoke `discovery` prompt
- Task: "{{.task}}"
- Let discovery prompt handle schema exploration
- Identify ALL potential data objects needed for complete analysis

**Step 2:** Identify analysis questions
- Break down objective into specific questions
- Determine if questions are independent (can be answered in parallel)
- Plan which queries might be accumulated vs executed immediately

**Step 3:** For each question, invoke `query-building` prompt
- Task: "[Analysis type] grouped by [dimensions] filtered by [conditions]"
- Get validated query + jq transform
- **CRITICAL DECISION:** Execute now or accumulate?
  - ✅ Accumulate if: Multiple independent questions, all schema known
  - ✅ Execute if: Need results to determine next steps

**Step 4a:** If accumulating queries
- Store query internally (don't execute)
- Continue to next question (back to Step 3)
- When accumulated 2-3+ queries OR need results:
  - Invoke `query-building` with: "Combine these queries: [list all]"
  - Execute combined multi-object query
  - Process with unified jq transform

**Step 4b:** If executing immediately
- Tool: `data-inline_graphql_result`
- Use query and jq_transform from prompt

**Step 5:** Analyze results
- Identify patterns/insights
- Form next questions if needed
- Consider if new questions can be accumulated

**Step 6:** If iteration needed
- Repeat from Step 3 with new questions
- Consider combining with any pending accumulated queries

**Query Accumulation Example:**
```
Question 1: "How many customers?" → Build query → ACCUMULATE
Question 2: "Recent orders?" → Build query → ACCUMULATE
Question 3: "Revenue by month?" → Build query → COMBINE ALL 3
  → Execute single multi-object query
  → Get all answers at once
```

**Remember:**
- This is iterative - each step may reveal new questions
- Use query accumulation when possible for efficiency
- Don't accumulate if you need results to proceed
{{end}}
