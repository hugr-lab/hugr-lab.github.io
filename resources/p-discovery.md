# Discovery Workflow

## Core Principle

**NEVER assume schema structure exists. ALWAYS discover first.**

Schema is dynamic - module names, data objects, fields, and types vary by deployment.

## Discovery Tools Usage

### 1. Find Modules
**Tool:** `discovery-search_modules`
**When:** Starting exploration, need to find domain-specific data
**Pattern strategy:**
- Broad: `pattern: "*"`
- Specific: `pattern: "sales*"` or `pattern: "*analytics*"`

### 2. Find Data Objects
**Tool:** `discovery-search_module_data_objects`
**When:** Found relevant module, need to see tables/views
**Input:** `module_path: "module_name"`
**Check response:** `type` field - "table" (CRUD) or "view" (read-only)

### 3. Examine Fields
**Tool:** `schema-type_fields`
**When:** Need to know available fields and their types
**Type naming:** Try `"object_name"`, `"prefix_object_name"` if first fails
**Look for:**
- Regular fields: `id`, `name`, etc.
- Relations: Array types like `[related_object!]!`
- Aggregations: `object_aggregation`, `object_bucket_aggregation`
- Special: `_join`, `_spatial`

### 4. Validate Filters
**Tool:** `schema-type_fields`
**When:** Before applying filters
**Check:** `object_filter` type, then field-specific filter types
**Example:** `String_filter_input` shows `eq`, `in`, `like`, `ilike`, `is_null`

### 5. Explore Values
**Tool:** `discovery-data_object_field_values`
**When:** Need to understand categorical data or valid values
**Input:** `module_path`, `data_object`, `field_name`

## Decision Tree

```
Task: Query data
├─ Don't know module
│  └─> discovery-search_modules
│
├─ Know module, need objects
│  └─> discovery-search_module_data_objects
│
├─ Know object, need fields
│  └─> schema-type_fields(type_name=object)
│
├─ Need to filter
│  └─> schema-type_fields(type_name=object_filter)
│     └─> schema-type_fields(type_name=field_type_filter_input)
│
└─ Need categorical values
   └─> discovery-data_object_field_values
```

## Common Mistakes

### ❌ Assuming Names
```
# Wrong
query { customers { ... } }

# Right
1. discovery-search_modules
2. discovery-search_module_data_objects
3. Build query with discovered names
```

### ❌ Guessing Operators
```
# Wrong
filter: { name: { equals: "value" } }

# Right
1. schema-type_fields(type_name="String_filter_input")
2. Use discovered: { eq: "value" }
```

### ❌ Ignoring Prefixes
```
# Wrong - assuming no prefix
schema-type_fields(type_name="customers")

# Right - try variations
1. Try "customers"
2. If fails, try "mod_customers" or check discovery results
```

### ❌ Not Checking Object Type
```
# Wrong - mutation on view
mutation { insert_view_object(...) }

# Right
1. discovery-search_module_data_objects
2. Check type: "view" or "table"
3. Only tables support mutations
```

## Workflow Examples

### Example 1: Simple Query
**Task:** Get active records

**Steps:**
1. `discovery-search_modules(pattern="*")` → Find relevant module
2. `discovery-search_module_data_objects(module_path="...")` → Find data object
3. `schema-type_fields(type_name="object")` → Confirm fields exist
4. `schema-type_fields(type_name="object_filter")` → Validate filter operators
5. Build query with discovered schema

### Example 2: Aggregation
**Task:** Group by category

**Steps:**
1. Discover module and object (steps 1-2 from Example 1)
2. `schema-type_fields(type_name="object")` → Look for `bucket_aggregation` field
3. `schema-type_fields(type_name="object_aggregations")` → Check available aggregations
4. Build bucket aggregation query

### Example 3: Cross-Source Join
**Task:** Join data from different sources

**Steps:**
1. `discovery-search_data_sources` → See available sources
2. For each source: discover objects and fields
3. Verify join fields exist and types match
4. Confirm `_join` field available
5. Build dynamic join query

## Validation Checklist

Before constructing query:
- [ ] Module name discovered (not assumed)
- [ ] Data object name discovered
- [ ] All field names verified
- [ ] Filter operators validated
- [ ] Relation names confirmed
- [ ] Type prefixes checked

## Response Pattern

When discovering schema, communicate:
```
Discovering schema...

1. Modules found: [list]
2. Selected module: [name]
3. Data objects: [list]
4. Selected object: [name] (table/view)
5. Available fields: [list]
6. Filter operators: [list for relevant fields]

Constructing query with discovered schema...
```

If not found:
```
Could not find [element].
Available options: [list what was found]
Please clarify or verify the request.
```

## Performance Notes

- Cache discovery results during session (schema rarely changes)
- Start with specific patterns when possible (`sales*` vs `*`)
- Only discover what's needed for current task
- Use field values discovery sparingly (can be slow on large datasets)
