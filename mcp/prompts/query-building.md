# Query Building

## ⚠️ CRITICAL: Read These Resources First

**BEFORE building ANY query:**

1. **`hugr://docs/filters`** - MUST READ for filtering:
   - Filter object vs scalar fields
   - Boolean logic (_and/_or/_not at OBJECT level only)
   - Scalar operators by type (what exists, what doesn't)
   - Relation operators (any_of/all_of/none_of)
   - Common mistakes (contains, _some, _not on scalars)

2. **`hugr://docs/patterns`** - Query patterns and anti-patterns:
   - Decision Tree for query type selection
   - Relation filter examples (deep nesting)
   - jq transformations
   - Anti-patterns (two queries, Python, etc.)

3. **`hugr://docs/data-types`** - Operator reference:
   - Quick reference by type
   - Aggregation functions
   - Error documentation

## ⚠️ CRITICAL: Check Search Results for Completeness

When using introspection tools, **ALWAYS check if you received all results:**

```json
Result format: { "total": 50, "returned": 20, "items": [...] }
```

**If `returned` < `total`** → You're missing results!

- Use pagination (`offset`/`limit`) to get remaining items
- Or use search (`relevance_query`) to find specific fields
- See `discovery` prompt for detailed examples

**Don't assume a field doesn't exist just because it's not in the first 20 results!**

## Construction Workflow

### Step 1: Get Module Path from Discovery

**Discovery returns `module` field - ALWAYS USE IT!**

```
Example: discovery-search_module_data_objects returns:
{
  name: "orders",
  module: "sales.analytics",  ← Use this full path!
  type: "table"
}

Build query with full module nesting:
query {
  sales {           ← From module path
    analytics {     ← From module path
      orders { ... }
    }
  }
}
```

### Step 2: Verify ALL Fields and Operators

**CRITICAL: Check EVERY field and operator before using!**

```
1. Verify object fields:
   schema-type_fields(type_name: "orders")
   → Check field exists and get its exact type

2. For SCALAR field filters - CHECK OPERATORS:
   schema-type_fields(type_name: "String_filter_input")
   → Use ONLY what exists: eq, in, like, ilike, regex, is_null
   → ❌ NEVER use any_of for scalar fields!

   See hugr://docs/data-types for complete operator reference.

3. For RELATION field filters:
   schema-type_fields(type_name: "orders_filter")
   → Check if relation field exists and its type
   → Many-to-one: direct access to related object fields
   → One-to-many: any_of/all_of/none_of

   See hugr://docs/patterns Decision Tree for relation filter guidance.

4. For aggregations:
   schema-type_fields(type_name: "orders_aggregations")
   → Get exact available functions per field

   See hugr://docs/data-types Aggregation Functions section.

5. For enums:
   schema-enum_values(type_name: "OrderDirection")
   → Confirm values (ASC/DESC uppercase!)
```

### Step 3: Choose Query Type and Build

**Read `hugr://docs/patterns` Decision Tree to choose:**

- **Need to filter by related data?** → Use Relation Filters (PRIORITY #1)
- **Need to join unrelated objects?** → Use `_join`
- **Need unique values?** → Use `distinct_on`
- **Need grouped analysis?** → Use `_bucket_aggregation`
- **Need overall stats?** → Use `_aggregation`

**❌ NEVER do:** Two queries - see Anti-Patterns in `hugr://docs/patterns`
**✅ ALWAYS do:** One complex query with relation filters or `_join`

**Examples in `hugr://docs/patterns`:**
- Relation Filters section
- Dynamic Joins (_join) section
- distinct_on Patterns section
- Multi-object queries section

### Step 3.5: Working with Functions

**Functions can be:**
1. **Direct function calls** - via `query { function { ... } }` or `mutation { function { ... } }`
2. **Function fields** - embedded in data objects

#### A. Direct Function Calls

**After discovering functions with `discovery-search_module_functions`:**

1. **Verify signature:**
   ```
   schema-type_fields(type_name: "Function")
   → Find function with parameters and return type
   ```

2. **Build query with module path:**
   ```graphql
   query {
     function {
       analytics {           # Module from discovery
         get_recommendations(
           customer_id: 123
           limit: 10
         ) {
           id
           name
           score
         }
       }
     }
   }
   ```

3. **If table function (returns array):**
   - Can use `filter`, `order_by`, `limit`, `offset`
   - Can aggregate: `<function>_aggregation`, `<function>_bucket_aggregation`

   ```graphql
   query {
     function {
       analytics {
         get_recommendations(customer_id: 123) {
           filter: { price: { lte: 100 } }
           order_by: [{ field: "score", direction: DESC }]
           limit: 5
         }
       }
     }
   }
   ```

4. **Mutation functions:**
   ```graphql
   mutation {
     function {
       orders {
         place_order(
           customer_id: 123
           items: "{\"product_id\": 456, \"quantity\": 2}"
         ) {
           order_id
           status
         }
       }
     }
   }
   ```

#### B. Function Fields on Data Objects

**Discovered via `schema-type_fields` on data object type:**

1. **No query arguments - calculated automatically:**
   ```graphql
   query {
     orders {
       id
       total
       shipping_cost  # Function field - auto-calculated
     }
   }
   ```

2. **With query arguments:**
   ```graphql
   query {
     products {
       id
       price
       currency
       # Function field with argument
       price_converted(to_currency: "EUR")
     }
   }
   ```

3. **Table function fields (return arrays):**
   ```graphql
   query {
     customers {
       id
       name
       # Table function field
       recommendations(limit: 10) {
         filter: { price: { lte: 100 } }
         order_by: [{ field: "score", direction: DESC }]
       }
     }
   }
   ```

4. **Can aggregate function fields:**
   ```graphql
   query {
     customers {
       id
       # Aggregate table function field
       recommendations_aggregation(limit: 100) {
         _rows_count
         price {
           avg
           min
           max
         }
       }
     }
   }
   ```

**Verification checklist for functions:**
- [ ] Checked function signature with `schema-type_fields`
- [ ] Verified all parameter types and names
- [ ] Used correct module path from discovery
- [ ] If table function - can use filter/order_by/limit
- [ ] If function field - checked if requires query arguments

### Step 4: VALIDATE Query (MANDATORY!)

**🚫 NEVER execute without validating first!**

**Use data-validate_graphql_query - REQUIRED, not optional!**

```
Tool: data-validate_graphql_query
Input: {
  query: "query { module { data_object(filter: {...}) { fields } } }",
  variables: {},
  jq_transform: ".data.module.data_object | map({id, name})"
}

Returns: true ✓
  OR
Error: "Field 'field_name' not found on type 'ObjectType'"
  OR
Error: "jq compile error: syntax error"
```

**Validates BOTH GraphQL query AND jq transform!**

**Workflow:**
```
1. Build query + jq transform
2. ✅ VALIDATE with data-validate_graphql_query
3. If passes → Execute with data-inline_graphql_result (Step 5)
4. If fails → Fix errors and go back to step 2
```

**⚠️ IF VALIDATION FAILS:**

Read `hugr://docs/data-types` → section **"Common Validation Errors & Fixes"**

Covers all common errors with real examples and solutions.

### Step 5: Execute Query and Process with jq

**Execute with jq transform for data processing:**

```
Tool: data-inline_graphql_result
Input: {
  query: "query { module { objects { id name } } }",
  jq_transform: ".data.module.objects | map({id, name})"
}
```

**For jq transformation examples, see `hugr://docs/patterns` jq section:**
- Basic transformations
- Filtering and selection
- Calculations and formulas
- Grouping and aggregation
- Statistics
- Complex transformations

**❌ NEVER use Python/Pandas for data processing!**
**✅ ALWAYS use jq - it runs on the server!**

## Construction Principles

1. **Verify Fields** - ALWAYS use `schema-type_fields` before using ANY field
2. **Read Decision Tree** - Follow `hugr://docs/patterns` Decision Tree
3. **Complex First** - Build complete query with relation filters vs multiple queries
4. **Module Structure** - Wrap in correct module hierarchy from discovery
5. **Check Data Types** - Read `hugr://docs/data-types` for operators/functions
6. **MANDATORY Validation** - Use `data-validate_graphql_query` before execution
7. **Always Limit** - Protect against large result sets
8. **jq Processing** - Use jq transforms, NOT Python

## Query Type Selection

**See `hugr://docs/patterns` for detailed examples of each type:**

**Data Query** - List records with filter/sort/limit
**Primary Key Query** - Single record by PK (`object_by_pk`)
**Single Aggregation** - Overall stats (`object_aggregation`)
**Bucket Aggregation** - Grouped analysis (`object_bucket_aggregation`)
**Multi-Object Query** - Multiple objects in ONE request
**Relation Query** - Nested subqueries with filters
**Dynamic Join** - Ad-hoc joins with `_join`
**Spatial Query** - Geometry-based filtering with `_spatial`

## Filter Construction

**For complete filter syntax, see `hugr://docs/patterns` Relation Filters section.**

### Scalar Fields
```graphql
filter: {
  field: { eq: "value" }  # ← Check operators with schema-type_fields
}
```

**Available operators depend on field type - see `hugr://docs/data-types`**

### Relation Fields

**See `hugr://docs/patterns` for detailed relation filter examples.**

```graphql
# Many-to-one (direct access)
filter: {
  customer: { country: { eq: "USA" } }
}

# One-to-many (use any_of/all_of/none_of)
filter: {
  orders: {
    any_of: { status: { eq: "pending" } }
  }
}
```

## Sorting and Pagination

**For detailed sorting/pagination patterns, see official docs:**
- `docs/5-graphql/1-queries/4-sorting-pagination.md`

**Key points:**
- `order_by: [{ field: "name", direction: ASC }]` (UPPERCASE!)
- `limit`/`offset` for root-level pagination
- `nested_limit`/`nested_offset` for subquery pagination
- Sorted fields must be selected in query

## Building Aggregations

**For complete aggregation patterns, see `hugr://docs/patterns`:**
- Single-row aggregation section
- Bucket aggregation section
- Time-based aggregation section

**Always verify available functions:**
```
schema-type_fields(type_name: "object_aggregations")
```

**See `hugr://docs/data-types` for aggregation functions by type.**

## Verification Checklist

Before executing query:

**Field Verification:**
- [ ] Used `schema-type_fields` for object type
- [ ] Verified ALL fields exist
- [ ] Checked filter operators with `schema-type_fields(type_name: "FieldType_filter_input")`
- [ ] Confirmed aggregation functions with `schema-type_fields(type_name: "object_aggregations")`
- [ ] Verified enum values (ASC/DESC, etc.) with `schema-enum_values`

**Query Structure:**
- [ ] Wrapped in correct module hierarchy from discovery
- [ ] Used `_rows_count` (not `count`) for row counts
- [ ] Used uppercase `ASC`/`DESC` for sorting
- [ ] Applied `limit` to all queries (except `_by_pk`)
- [ ] Used `nested_limit` for nested queries
- [ ] Followed Decision Tree from `hugr://docs/patterns`

**Validation:**
- [ ] Validated with `data-validate_graphql_query` first (MANDATORY!)
- [ ] If using jq transform, validated jq syntax
- [ ] Fixed any validation errors before execution

**Performance:**
- [ ] Filters at highest level possible
- [ ] Used aggregation instead of fetching all data when appropriate
- [ ] Used efficient operators (eq, in) over patterns (like, regex)
- [ ] Selected only necessary fields

## Anti-Patterns to Avoid

**See `hugr://docs/patterns` Anti-Patterns section for complete list and examples.**

**Most common mistakes:**
- ❌ Two queries instead of relation filters
- ❌ Python/Pandas instead of jq
- ❌ Assuming field names without verification
- ❌ Using `any_of` on scalar fields
- ❌ Forgetting module structure
- ❌ Skipping validation
- ❌ Using lowercase `asc`/`desc`
- ❌ Using `count` instead of `_rows_count`

## Response Template

When building query:

```
Schema Verification:
1. schema-type_fields(type_name: "ObjectType") ✓
   Key fields: [list verified fields]

2. Filter operators verified ✓
   [field]: [available operators from schema-type_fields]

3. Module path: [from discovery]
   Object type: [table/view]

Query Strategy:
- Type: [Data/Aggregation/Bucket/Multi-Object]
- Follows: hugr://docs/patterns Decision Tree
- Validation: MANDATORY before execution

[GraphQL Query]

Validation:
Tool: data-validate_graphql_query
Status: [Validating... / ✓ Valid / ✗ Error: ...]

[If valid] Next: Execute with data-inline_graphql_result
[If error] Fixing: [error description and fix]
```

## 🚫 Output Rules

**NO Files Unless Explicitly Requested:**
- ❌ NO `.py`, `.sql`, `.md`, `.html` files
- ❌ NO "demonstration scripts" or "example queries"
- ✅ Everything in chat as plain text

**Be Concise:**
- Show query + brief explanation
- If fails, show error + fix
- User will ask for detail if needed

**No Unsolicited Advice:**
- ❌ Don't give performance tips (unless asked)
- ❌ Don't suggest alternatives (unless asked)

## Response Format

✅ **GOOD:**
```
Query validated ✓

query {
  module {
    orders(filter: {customer: {country: {eq: "USA"}}}) {
      id total customer { name }
    }
  }
}

Using relation filter to filter by customer's country.
```

❌ **BAD:**
```
I've created three files:
1. query_examples.sql
2. graphql_demo.py
3. performance_guide.md
```

---

{{if .task}}
## Current Task

**Query Requirement:** {{.task}}

**Instructions:**
1. Read `hugr://docs/patterns` Decision Tree
2. Use `schema-type_fields` to verify all fields/operators
3. Build query following patterns from resources
4. VALIDATE with `data-validate_graphql_query` (MANDATORY!)
5. Execute only after validation passes

**Resources:**
- `hugr://docs/patterns` - Query patterns and anti-patterns
- `hugr://docs/data-types` - Filter operators and aggregation functions
- `hugr://docs/schema` - Type system understanding
{{end}}
