# Discovery Workflow

## Core Principle

**NEVER assume schema exists. ALWAYS discover AND VERIFY first.**

Schema is dynamic - names, structures vary by deployment. What exists in one Hugr instance may not exist in another.

## ⚠️ CRITICAL: Always Verify Fields

After discovering objects, **MUST verify ALL fields** before using:

1. **Object fields** → `schema-type_fields(type_name: "ObjectName")`
2. **Filter fields** → `schema-type_fields(type_name: "ObjectName_filter")`
3. **Filter operators** → `schema-type_fields(type_name: "FieldType_filter_input")`
4. **Aggregations** → `schema-type_fields(type_name: "ObjectName_aggregations")`
5. **Enum values** → `schema-enum_values(type_name: "EnumTypeName")`

**Never assume:**
- Field names (even common ones like "id", "name")
- Filter operators (even "eq", "in")
- Aggregation functions (even "sum", "avg")
- Enum values (even "ASC", "DESC")

**Always introspect to confirm!**

## MCP Tools

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
- Can filter data before sampling values

### Schema Tools

**schema-type_fields**
- Input: Type name, optional pagination/ranking
- Returns: Fields with types, descriptions, arguments
- Use: **CRITICAL** - introspect all types for fields, filters, aggregations

**schema-type_info**
- Input: Type name
- Returns: Type metadata
- Use: Get type overview before detailed inspection

**schema-enum_values**
- Input: Enum type name
- Returns: Valid enum values
- Use: Understand enum options

### Query Execution Tools

**data-validate_graphql_query**
- Input: GraphQL query, optional variables, optional jq_transform
- Returns: true if query is valid, error if invalid
- Use: **Validate query correctness BEFORE execution**
- Checks: GraphQL syntax, field existence, type compatibility, jq compilability
- **Always validate complex queries and jq transforms before executing!**

**data-inline_graphql_result**
- Input: GraphQL query, optional variables, optional jq transform
- Returns: Query result as inline JSON (size-limited)
- Use: Execute queries directly after schema discovery
- Supports jq transforms for result processing

## Discovery Strategy

### Step 1: Find Modules
**Tool:** `discovery-search_modules`
**Input:** Natural language describing domain (e.g., "customer data", "sales")

### Step 2: Find Data Objects
**Tool:** `discovery-search_module_data_objects`
**Input:** Module name from Step 1, optional search query
**Check:** `type` field - "table" or "view"

### Step 3: Introspect Type Structure
**Tool:** `schema-type_fields`
**Input:** Type name (try object name, then with prefix if needed)
**Critical:** Look for:
- Regular fields and types
- Relation fields (array types)
- Aggregation fields (`_aggregation`, `_bucket_aggregation`)
- Special fields (`_join`, `_spatial`)
- Cube measurements (if `@cube` table)

### Step 4: Validate Filters
**Tool:** `schema-type_fields`
**Input:** `<object>_filter` type
**Check:** Available filter fields

Then check operators:
**Input:** Field-specific filter type (e.g., `String_filter_input`)
**Check:** Available operators

### Step 5: Check Aggregations
**Tool:** `schema-type_fields`
**Input:** `<object>_aggregations` type
**Check:** Available aggregation functions per field

For bucket aggregations:
**Input:** `<object>_bucket_aggregation_key` type
**Check:** Available grouping fields

### Step 6: Explore Values
**Tool:** `discovery-data_object_field_values`
**Input:** Data object name, field name
**Use:** Understand data distribution, get valid values

## Workflow Examples

### Example 1: Find and Query Data

**Task:** Query active records

**Steps:**
1. `discovery-search_modules` with query "main data"
   → Returns: ["main", "analytics"]

2. `discovery-search_module_data_objects` on "main"
   → Returns: [{name: "records", type: "table"}]

3. `schema-type_fields` on "records"
   → Fields: id, status, created_at, ...

4. `schema-type_fields` on "records_filter"
   → Has: status field

5. `schema-type_fields` on "String_filter_input" (or whatever status type filter is)
   → Operators: eq, in, like, ...

6. Build query with discovered schema

### Example 2: Aggregation Analysis

**Task:** Group by category, aggregate metrics

**Steps:**
1-2. Discover module and data object (as Example 1)

3. `schema-type_fields` on "data_object"
   → Look for `_bucket_aggregation` field

4. `schema-type_fields` on "data_object_aggregations"
   → See available aggregation functions per field

5. `schema-type_fields` on "data_object_bucket_aggregation_key"
   → See groupable fields

6. Build bucket aggregation query

### Example 3: Cube Table

**Task:** Query cube with measurements

**Steps:**
1-2. Discover module and cube table

3. `schema-type_fields` on cube type
   → Identify which fields accept `measurement_func` argument
   → These are `@measurement` fields

4. `schema-type_fields` on field types to see available `measurement_func` values

5. Build cube query with dimensions and measurements

## Common Mistakes

### ❌ Assuming Module Names
```
# Wrong
query { sales { ... } }

# Right
1. discovery-search_modules(query="sales")
2. Use discovered module name
```

### ❌ Assuming Type Names
```
# Wrong
schema-type_fields(type_name="customers")

# Right
1. Try "customers"
2. If fails, try with prefix
3. Check discovery response for hints
```

### ❌ Guessing Operators
```
# Wrong
filter: { name: { equals: "value" } }

# Right
1. schema-type_fields(type_name="String_filter_input")
2. Use discovered: { eq: "value" }
```

### ❌ Not Introspecting Aggregations
```
# Wrong - assuming functions exist
aggregations { field { sum avg min max } }

# Right
1. schema-type_fields(type_name="object_aggregations")
2. Use only available functions for each field
```

### ❌ Skipping Table Type Check
```
# Wrong - trying mutation on view
mutation { insert_view_object(...) }

# Right
1. discovery-search_module_data_objects
2. Check type: "view" or "table"
3. Only tables support mutations
```

## Validation Checklist

Before constructing query:
- [ ] Module name discovered
- [ ] Data object name discovered
- [ ] Type introspected with `schema-type_fields`
- [ ] Filter operators validated
- [ ] Aggregation functions checked
- [ ] Relation fields confirmed
- [ ] Arguments understood

## Critical: Always Introspect

**Don't rely on assumptions or documentation examples.**

Use `schema-type_fields` on:
- Object types - see fields, relations
- Filter types - see operators
- Aggregation types - see functions
- Key types - see groupable fields
- Input types - see mutation arguments

Schema varies by deployment. Introspection is the source of truth.

## Response Pattern

When discovering:
```
Discovering schema...

1. Searching modules: [query]
   Tool: discovery-search_modules
   Found: [list with descriptions]

2. Searching data objects in [module]
   Tool: discovery-search_module_data_objects
   Found: [name] (type: table/view, module: [path])

3. Verifying object fields
   Tool: schema-type_fields(type_name: "[ObjectName]")
   Available fields: [field: type, field: type, ...]
   Relations: [relation_field: [RelationType], ...]
   Special fields: _aggregation, _bucket_aggregation, _join, etc.

4. Verifying filter capabilities
   Tool: schema-type_fields(type_name: "[ObjectName]_filter")
   Filter fields: [list]

   Tool: schema-type_fields(type_name: "[FieldType]_filter_input")
   Operators for [field]: eq, in, gt, gte, lt, lte, like, ...

5. Verifying aggregation functions
   Tool: schema-type_fields(type_name: "[ObjectName]_aggregations")
   Available per field:
   - numeric_field: sum, avg, min, max, count
   - string_field: count, string_agg, list
   - _rows_count (always available)

6. Verifying enum values (if needed)
   Tool: schema-enum_values(type_name: "OrderDirection")
   Values: ASC, DESC

✓ Schema verified and ready to build query!

Query prerequisites confirmed:
- Module: [name]
- Object: [name] (type: [table/view])
- Fields: [verified list]
- Filters: [verified operators]
- Aggregations: [verified functions]
```

If not found:
```
Could not find [element].

What was searched:
- Tool: [tool name]
- Parameters: [params]
- Result: [empty/not found]

Available alternatives: [what was found]

Suggestion: [alternative approach or clarification needed]
```

After discovery, BEFORE building query:
```
✓ All fields verified via schema-type_fields
✓ Filter operators confirmed
✓ Aggregation functions confirmed
✓ Module structure identified

Ready to proceed to query building with verified schema.
```

---

{{#if task}}
## Current Task

**Objective:** {{task}}

**Instructions:**
1. Follow the discovery workflow above
2. Use MCP tools to find and introspect the schema
3. Report what you discover
4. Build the query only after confirming schema structure

Remember: NEVER assume schema - always discover first!
{{/if}}
