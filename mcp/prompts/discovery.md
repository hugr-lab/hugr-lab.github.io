# Discovery Workflow

## Core Principle

**Lazy Introspection** - Discover incrementally, only what's needed at each step.

1. Start with high-level search
2. Drill down progressively
3. Stop when you have enough information
4. Don't introspect everything upfront

**NEVER assume schema exists. ALWAYS discover AND VERIFY as needed.**

Schema is dynamic - names, structures vary by deployment. What exists in one Hugr instance may not exist in another.

## MCP Tools Reference

### Discovery Tools

**discovery-search_modules**
- Input: Natural language query (e.g., "sales analytics")
- Returns: Ranked list of matching modules
- Use: Find relevant modules by description

**discovery-search_data_sources**
- Input: Search query
- Returns: Available data sources
- Use: Understand system architecture

**discovery-search_module_data_objects**
- Input: Module name, search query
- Returns: Data objects with types (table/view)
- Use: Find tables and views in module

**discovery-search_module_functions**
- Input: Module name, search query, optional sub-modules/mutations flags
- Returns: Functions with signatures and return types
- Use: Discover custom functions and mutations

**discovery-data_object_field_values**
- Input: Data object name, field name, optional filters
- Returns: Distinct values list, optional statistics (min/max/avg/count)
- Use: Understand data distribution, validate field values, get categorical options

### Schema Tools

**schema-type_fields**
- Input: Type name, optional pagination/ranking/relevance_query
- Returns: Fields with types, descriptions, arguments
- Use: **CRITICAL** - introspect types for fields, filters, aggregations
- **Use relevance_query to find specific fields instead of fetching all!**

**schema-type_info**
- Input: Type name
- Returns: Type metadata
- Use: Get type overview before detailed inspection

**schema-enum_values**
- Input: Enum type name
- Returns: Valid enum values
- Use: Understand enum options

### Query Execution Tools

**data-validate_graphql_query** (MANDATORY!)
- Input: GraphQL query, optional variables, optional jq_transform
- Returns: true if query is valid, error if invalid
- Use: **REQUIRED validation before EVERY query execution!**
- **🚫 NEVER execute a query without validating first!**

**data-inline_graphql_result**
- Input: GraphQL query, optional variables, optional jq_transform
- Returns: Query result as inline JSON (size-limited)
- Use: Execute queries ONLY after validation passes
- **✅ ALWAYS include jq_transform for data processing - NO Python!**

**Workflow:**
```
1. Build query + jq transform
2. ✅ Validate with data-validate_graphql_query
3. If valid → Execute with data-inline_graphql_result
4. If invalid → Fix errors and repeat step 2
```

## ⚠️ CRITICAL: Working with Search Results and Pagination

All discovery and introspection tools return results in this format:
```json
{
  "total": 50,      // Total items matching criteria
  "returned": 20,   // Items returned in THIS response
  "items": [...]    // The actual items
}
```

**ALWAYS check `total` vs `returned`:**

1. **If `returned` < `total`** → More results available!
   - For `schema-type_fields`: Use `offset` and `limit` parameters to get remaining items
   - For discovery tools: Increase `top_k` parameter (max 50) or refine `query` to get more relevant results

2. **Use search parameters to find relevant items:**
   - `schema-type_fields`: Use `relevance_query` parameter for natural-language search
   - All discovery tools: Use `query` parameter to search by description/name
   - Example: Instead of fetching all 200 fields, search for relevant ones with `relevance_query: "customer address"`

3. **Prefer relevance search over pagination:**
   ```
   # ❌ Bad: Fetch all 200 fields with pagination
   schema-type_fields(type_name: "orders", limit: 100, offset: 0)
   schema-type_fields(type_name: "orders", limit: 100, offset: 100)

   # ✅ Good: Search for relevant fields
   schema-type_fields(type_name: "orders", relevance_query: "customer information", top_k: 10)
   ```

**Key Parameters:**
- `schema-type_fields`: `limit`, `offset`, `relevance_query`, `top_k`
- `discovery-search_*`: `top_k` (default 5, max 50), `query`, `min_score`

## Lazy Introspection Strategy

### Step 1: Find Data Object
**Goal:** Locate the table/view you need

**1.1 Search for module:**
```
discovery-search_modules(query: "sales data")
→ Returns: [{name: "sales", description: "..."}, ...]
```

**1.2 Search for data object in module:**
```
discovery-search_module_data_objects(module_name: "sales", query: "orders")
→ Returns: [{name: "orders", module: "sales", type: "table"}, ...]
```

**Result:** Object name: `orders`, Module: `sales`, Type: `table`

**✅ If found:** Proceed to Step 2
**❌ If NOT found:** Proceed to Step 1.3

---

**1.3 If object not found - check module type fields:**

Sometimes data is accessible through module fields, not as data objects.

```
# Module itself has a GraphQL type - introspect it
schema-type_fields(type_name: "sales")  # or sales_Query
→ Returns: List of query fields available on this module

# Example result:
{
  "items": [
    {name: "orders", type: "[orders]", args: [{name: "filter", ...}]},
    {name: "customers", type: "[customers]", args: [...]},
    {name: "revenue_report", type: "RevenueReport", args: [...]}
  ]
}
```

**This tells you:**
- What queries are available on this module
- What types they return
- What arguments they accept

**Result:** Found query field on module that returns the data you need

---

### Step 2: Introspect Object Type (Lazy!)

**Goal:** Understand object structure - BUT only introspect what you need

**2.1 If you need specific fields - use relevance search:**
```
# ❌ Don't fetch all 200 fields
schema-type_fields(type_name: "orders", limit: 200)

# ✅ Search for what you need
schema-type_fields(
  type_name: "orders",
  relevance_query: "customer shipping address",
  top_k: 10
)
→ Returns: Only fields related to customer/shipping/address
```

**2.2 If you need overview - check type info first:**
```
schema-type_info(type_name: "orders")
→ Returns: Type metadata, description, total field count
```

**2.3 Then fetch relevant fields:**
```
schema-type_fields(type_name: "orders", limit: 20)
→ Returns: First 20 fields with types and arguments
```

**Look for:**
- **Scalar fields:** Regular columns (id, name, total, created_at)
- **Relation fields:** Foreign keys returning other objects (customer, items)
- **Aggregation fields:** `_aggregation`, `_bucket_aggregation`
- **Special fields:** `_join`, `_spatial`
- **Function fields:** Fields with arguments (may be computed functions)

**Result:** You now know:
- Field names and types
- Which fields are relations
- Which fields have arguments (important!)
- Available aggregation fields

**✅ If this is enough:** Proceed to build query
**🔍 If need to drill deeper:** Proceed to Step 3

---

### Step 3: Introspect Arguments and Related Types (Conditional)

**Only do this step if:**
- You need to filter/aggregate (→ check filter/aggregation types)
- You need to query relations (→ check related object types)
- You found function fields with args (→ check argument types)

**3.1 Check query arguments (filter, order_by, limit):**

If the object query accepts arguments, you can introspect them:

```
# Check what arguments the query accepts
schema-type_fields(type_name: "Query", relevance_query: "orders")
# or
schema-type_fields(type_name: "sales_Query", relevance_query: "orders")

→ Look for orders field and its arguments:
  {
    name: "orders",
    args: [
      {name: "filter", type: "orders_list_filter"},
      {name: "order_by", type: "[OrderByField!]"},
      {name: "limit", type: "Int"},
      ...
    ]
  }
```

Now you know what arguments are available!

**3.2 If you need filtering - check filter type:**

**Use relevance search for specific filters:**
```
# Find filter fields related to customer
schema-type_fields(
  type_name: "orders_list_filter",
  relevance_query: "customer status",
  top_k: 10
)
→ Returns: status, customer_id, customer (relation filter), etc.
```

**3.3 If you need aggregation - check aggregation type:**

```
schema-type_fields(type_name: "orders_aggregations", top_k: 20)
→ Returns: Available aggregation functions per field
```

**3.4 Check related object type (only if needed):**

If you found a relation field `customer: customers` and need to query it:

```
schema-type_fields(
  type_name: "customers",
  relevance_query: "address contact",
  top_k: 10
)
→ Returns: Fields on customer object
```

**Result:** You now know:
- What arguments the query accepts
- What filters are available
- What aggregations you can perform
- What fields exist on related objects

**✅ If this is enough:** Proceed to build query
**🔍 If need specific operators:** Proceed to Step 4

---

### Step 4: Drill Into Field Types (Only When Needed)

**Only do this step if you need to know:**
- What operators a filter field supports
- What values an enum accepts
- What nested fields exist on a complex type

**4.1 Check filter operators for specific field type:**

```
# What operators does String field support?
schema-type_fields(type_name: "String_filter_input")
→ Returns: eq, in, like, ilike, regex, is_null

# What operators does Int field support?
schema-type_fields(type_name: "Int_filter_input")
→ Returns: eq, in, gt, gte, lt, lte, is_null
```

**4.2 Check enum values:**

```
schema-enum_values(type_name: "OrderDirection")
→ Returns: ASC, DESC
```

**4.3 For function fields - check signature:**

If you found a function field with arguments:

```
# Example: price_converted field with arguments
schema-type_fields(type_name: "products", relevance_query: "price_converted")
→ Returns:
  {
    name: "price_converted",
    type: "Float",
    args: [{name: "to_currency", type: "String!", ...}]
  }
```

Now you know exactly what arguments to provide!

**Result:** You have complete information to build the query correctly

---

### Step 5: Explore Data Values (Optional)

**Only if you need to:**
- Understand what values exist in the data
- Get valid options for a categorical field
- Validate filter values

```
discovery-data_object_field_values(
  data_object_name: "orders",
  field_name: "status"
)
→ Returns: ["pending", "processing", "completed", "cancelled"]
```

**Use with filters:**
```
discovery-data_object_field_values(
  data_object_name: "orders",
  field_name: "total",
  filters: {status: {eq: "completed"}},
  get_stats: true
)
→ Returns: min, max, avg, count for completed orders
```

---

## Function Discovery (Separate Workflow)

**When to use:** User asks to call a function, not query a table

**Step 1: Find function:**
```
discovery-search_module_functions(
  module_name: "analytics",
  query: "recommendations",
  include_sub_modules: true
)
→ Returns:
  [{
    name: "get_recommendations",
    module: "analytics.ml",
    return_type: "[Product]",
    is_table: true
  }]
```

**Step 2: Check function signature:**
```
schema-type_fields(type_name: "Function", relevance_query: "get_recommendations")
→ Returns:
  {
    name: "get_recommendations",
    type: "[Product]",
    args: [
      {name: "customer_id", type: "Int!"},
      {name: "limit", type: "Int"}
    ]
  }
```

**Step 3: Build function call:**
```graphql
query {
  function {
    analytics {           # From module path
      ml {                # Sub-module
        get_recommendations(
          customer_id: 123
          limit: 10
        ) {
          id
          name
          price
        }
      }
    }
  }
}
```

**For table functions:** Can use filter, order_by, limit, aggregation (like regular data objects)

**For mutation functions:** Use `only_mutations: true` in search, call via `mutation { function { ... } }`

---

## Lazy Introspection Decision Tree

```
User asks to query "orders"
  ↓
Step 1: Find object
  ├─ discovery-search_modules(query: "orders")
  └─ discovery-search_module_data_objects(module: "...", query: "orders")
  ↓
  Found?
  ├─ YES → Continue to Step 2
  └─ NO → Check module type fields
       └─ schema-type_fields(type_name: "ModuleName")
       └─ Found query field? YES → Use that
  ↓
Step 2: Introspect object (lazy!)
  └─ Need specific fields?
      ├─ YES → schema-type_fields(type: "orders", relevance_query: "...", top_k: 10)
      └─ NO → schema-type_fields(type: "orders", limit: 20)
  ↓
  Enough info to build query?
  ├─ YES → Build query, STOP here
  └─ NO → Continue to Step 3
  ↓
Step 3: Check arguments and relations (conditional)
  └─ Need filtering?
      └─ schema-type_fields(type: "orders_list_filter", relevance_query: "...")
  └─ Need aggregation?
      └─ schema-type_fields(type: "orders_aggregations")
  └─ Need to query relation?
      └─ schema-type_fields(type: "RelatedObjectType", relevance_query: "...")
  ↓
  Enough info to build query?
  ├─ YES → Build query, STOP here
  └─ NO → Continue to Step 4
  ↓
Step 4: Drill into field types (only if needed)
  └─ Need operator details?
      └─ schema-type_fields(type: "String_filter_input")
  └─ Need enum values?
      └─ schema-enum_values(type: "EnumName")
  └─ Need function argument details?
      └─ Check args from Step 2/3 results
  ↓
  Build query
```

**Key principle:** STOP introspecting as soon as you have enough information!

---

## Common Patterns

### Pattern 1: Simple Query (Minimal Introspection)

**User:** "Show me all orders"

**Discovery:**
1. Find module + object → `sales.orders`
2. Introspect object → `id, total, status, created_at, ...`
3. **STOP** - enough to build query!

**Query:**
```graphql
query {
  sales {
    orders {
      id
      total
      status
      created_at
    }
  }
}
```

**Introspection calls:** 2 (module search + object introspection)

---

### Pattern 2: Filtered Query (Conditional Introspection)

**User:** "Show me completed orders"

**Discovery:**
1. Find module + object → `sales.orders`
2. Introspect object → has `status` field
3. **Need filtering** → Introspect `orders_list_filter`
4. Check `status` filter → has `eq` operator
5. **STOP** - enough to build query!

**Query:**
```graphql
query {
  sales {
    orders(filter: { status: { eq: "completed" } }) {
      id
      total
    }
  }
}
```

**Introspection calls:** 3 (module + object + filter)

---

### Pattern 3: Relation Query (Drill Down)

**User:** "Show me orders with customer name"

**Discovery:**
1. Find module + object → `sales.orders`
2. Introspect object → has `customer` relation field
3. **Need customer fields** → Introspect `customers` type
4. **STOP** - enough to build query!

**Query:**
```graphql
query {
  sales {
    orders {
      id
      total
      customer {
        id
        name
      }
    }
  }
}
```

**Introspection calls:** 3 (module + orders + customers)

---

### Pattern 4: Aggregation Query

**User:** "What's the total revenue by status?"

**Discovery:**
1. Find module + object → `sales.orders`
2. Introspect object → has `_bucket_aggregation` field
3. **Need aggregation details** → Introspect `orders_bucket_aggregation_key` (for grouping)
4. **Need aggregation functions** → Introspect `orders_aggregations` (for sum/avg)
5. **STOP** - enough to build query!

**Query:**
```graphql
query {
  sales {
    orders_bucket_aggregation {
      key {
        status
      }
      aggregations {
        _rows_count
        total {
          sum
        }
      }
    }
  }
}
```

**Introspection calls:** 4 (module + object + key + aggregations)

---

## Validation Before Query Building

**Before constructing query, confirm:**
- [ ] Module name discovered (from discovery results)
- [ ] Data object name discovered
- [ ] Object type introspected (at least basic fields)
- [ ] If filtering: filter type introspected
- [ ] If aggregating: aggregation type introspected
- [ ] If querying relations: related types introspected

**Don't introspect:**
- ❌ Filter operators unless you're unsure which to use
- ❌ All possible fields unless user needs comprehensive list
- ❌ Related types unless query includes them
- ❌ Enum values unless validating against them

---

## Response Pattern

**When discovering (be concise):**

```
Discovering schema...

1. Module: sales
   - Found via discovery-search_modules

2. Data object: orders (table)
   - Found via discovery-search_module_data_objects
   - Module path: sales

3. Key fields (from schema-type_fields):
   - id: Int
   - total: Float
   - status: String
   - created_at: Timestamp
   - customer: customers (relation)

4. Filter available: status.eq
   - From orders_list_filter type

✓ Ready to build query
```

**If not found:**

```
Could not find "orders" data object.

Searched:
- discovery-search_module_data_objects(module: "sales", query: "orders")
- Result: No matches

Checking module type fields:
- schema-type_fields(type_name: "sales")
- Available queries: customers, revenue_summary, daily_stats

Suggestion: Did you mean "revenue_summary"?
```

**After discovery, before query:**

```
✓ Schema verified:
  - Module: sales
  - Object: orders (table)
  - Filter: status.eq available
  - Fields confirmed

Proceeding to build query...
```

---

## 🚫 Output Rules

**NO Files Unless Explicitly Requested:**
- ❌ NO `.py`, `.sql`, `.md`, `.html` files
- ✅ Everything in chat as plain text

**Be Concise:**
- Report discovered schema in 3-5 key points
- Don't dump entire field lists
- User will ask for detail if needed

**No Recommendations by Default:**
- ❌ Don't suggest what to query
- ✅ Just report what was found

---

## Critical: Lazy = Efficient

**The goal is NOT to introspect everything.**

The goal is to introspect **just enough** to answer the user's question.

- Simple query → 2-3 introspection calls
- Complex query → 4-5 introspection calls
- Very complex query → 6+ introspection calls

**Use relevance_query to find specific fields instead of paginating through hundreds!**

---

{{if .task}}
## Current Task

**Objective:** {{.task}}

**Instructions:**
1. Follow the lazy introspection workflow above
2. Start broad, drill down as needed
3. Stop when you have enough information
4. Use relevance_query to find specific fields efficiently
5. Report what you discover concisely
6. Build the query only after confirming schema structure

Remember: NEVER assume schema - discover incrementally!
{{end}}
