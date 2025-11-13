# Prompt: Lazy Schema Discovery

## Core Directive

**NEVER assume schema structure, names, or types exist. ALWAYS discover before querying.**

---

## Discovery Principles

### 1. Dynamic Resolution
Schema names and structures are **not fixed**. What works in one Hugr instance may not work in another:
- Module names vary by deployment
- Data object names may have prefixes
- Field names depend on schema definitions
- Relations may or may not exist

**Rule:** Discover schema dynamically using MCP tools, never hardcode assumptions.

---

### 2. Lazy Introspection
Start broad and refine incrementally:

```
Modules → Data Objects → Fields → Filters → Values
```

Only discover what you need for the current task.

---

### 3. Verify Before Use
Always validate before constructing queries:
- Check type names exist
- Verify field names
- Confirm filter operators
- Validate relation names

---

## Discovery Workflow

### Step 1: Discover Available Modules

**When:** Starting exploration or looking for domain-specific data

**Tool:** `discovery-search_modules`

**Pattern Strategy:**
```
# Broad discovery
pattern: "*"

# Domain-specific
pattern: "sales*"
pattern: "*analytics*"
pattern: "*customer*"

# Nested modules
pattern: "crm.contacts*"
```

**Example:**
```
Tool: discovery-search_modules
Input: { pattern: "*" }
Output: ["northwind", "analytics", "crm"]

Next: Explore relevant module
```

---

### Step 2: Discover Data Objects

**When:** Found relevant module, need to understand available tables/views

**Tool:** `discovery-search_module_data_objects`

**Input:**
```json
{
  "module_path": "northwind"
}
```

**Check Response:**
- `name` - Data object identifier
- `type` - "table" (CRUD) or "view" (read-only)
- `description` - Purpose of the object

**Example:**
```
Tool: discovery-search_module_data_objects
Input: { module_path: "northwind" }
Output: [
  { name: "customers", type: "table" },
  { name: "orders", type: "table" },
  { name: "sales_summary", type: "view" }
]

Next: Examine fields of relevant object
```

---

### Step 3: Examine Type Structure

**When:** Need to understand fields, types, and available operations

**Tool:** `schema-type_fields`

**Type Naming Patterns:**
```
Data object: "customers"
Possible types:
  - "customers"               # No prefix
  - "nw_customers"           # Module prefix
  - "northwind_customers"    # Full module prefix
```

**Strategy:** Try common patterns or check module prefix from discovery

**Input:**
```json
{
  "type_name": "nw_customers"
}
```

**Check Response Fields:**
- Regular fields: `id`, `name`, `email`, etc.
- Relation fields: `orders`, `addresses` (type is array)
- Aggregation fields: `orders_aggregation`, `orders_bucket_aggregation`
- Special fields: `_join`, `_spatial` (if applicable)

**Example:**
```
Tool: schema-type_fields
Input: { type_name: "nw_customers" }
Output: [
  { name: "id", type: "Int!" },
  { name: "name", type: "String!" },
  { name: "country", type: "String" },
  { name: "orders", type: "[nw_orders!]!" },
  { name: "orders_aggregation", type: "nw_orders_aggregations!" }
]

Next: Check filter options or construct query
```

---

### Step 4: Validate Filter Options

**When:** Need to filter data, want to know available operators

**Tool:** `schema-type_fields`

**Input:**
```json
{
  "type_name": "nw_customers_filter"
}
```

**Common Filter Type Suffixes:**
```
Object type: "customers"
Filter type: "customers_filter"

Field type: "String"
Filter type: "String_filter_input"
```

**Check Response:** Available operators per field

**Example:**
```
Tool: schema-type_fields
Input: { type_name: "String_filter_input" }
Output: [
  { name: "eq", type: "String" },
  { name: "in", type: "[String!]" },
  { name: "like", type: "String" },
  { name: "ilike", type: "String" },
  { name: "is_null", type: "Boolean" }
]

Next: Construct filter with valid operators
```

---

### Step 5: Explore Field Values

**When:** Need to understand categorical data or valid filter values

**Tool:** `discovery-data_object_field_values`

**Input:**
```json
{
  "module_path": "northwind",
  "data_object": "customers",
  "field_name": "country",
  "limit": 20
}
```

**Example:**
```
Tool: discovery-data_object_field_values
Input: { module_path: "northwind", data_object: "customers", field_name: "country" }
Output: { values: ["USA", "Canada", "UK", "Germany"], count: 4 }

Next: Use discovered values in filter
```

---

## Decision Tree

Use this decision tree to choose the right discovery approach:

```
Q: What do I need to do?

├─ Don't know what data exists
│  └─> discovery-search_modules(pattern="*")
│     └─> discovery-search_module_data_objects(module_path=...)
│
├─ Know module, need object details
│  └─> discovery-search_module_data_objects(module_path=...)
│     └─> schema-type_fields(type_name=...)
│
├─ Need to filter data
│  └─> schema-type_fields(type_name="<object>_filter")
│     └─> schema-type_fields(type_name="<field_type>_filter_input")
│
├─ Need to understand categorical values
│  └─> discovery-data_object_field_values(...)
│
├─ Need to aggregate data
│  └─> schema-type_fields(type_name="<object>_aggregations")
│
└─ Need to join data
   └─> schema-type_fields(type_name="<object>")
       └─> Check for "_join" or relation fields
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Assuming Names

```
# WRONG - Assuming "customers" exists
query { customers { id name } }

# RIGHT - Discover first
1. discovery-search_modules(pattern="*")
2. discovery-search_module_data_objects(module_path="...")
3. Construct query based on findings
```

### ❌ Mistake 2: Guessing Operators

```
# WRONG - Guessing operator name
filter: { name: { equals: "John" } }

# RIGHT - Validate operators
1. schema-type_fields(type_name="String_filter_input")
2. Use discovered operator: { eq: "John" }
```

### ❌ Mistake 3: Ignoring Type Prefixes

```
# WRONG - Assuming no prefix
schema-type_fields(type_name="customers")

# RIGHT - Try common patterns
1. Try: "customers"
2. If fails, try: "nw_customers"
3. Or check module information for prefix
```

### ❌ Mistake 4: Not Checking Object Type

```
# WRONG - Trying mutation on view
mutation { insert_sales_summary(...) }

# RIGHT - Check type first
1. discovery-search_module_data_objects(...)
2. Check type: "view" or "table"
3. Only tables support mutations
```

---

## Best Practices

### 1. Cache Discovery Results
Discovery results are usually stable for a session:
```
1. Discover modules once
2. Cache module structure
3. Reuse for subsequent queries
```

### 2. Start Broad, Narrow Down
```
Pattern: "*" → "sales*" → "sales.reports*"
```

### 3. Validate Critical Fields
Before constructing complex queries:
```
1. Verify all field names exist
2. Check filter operators
3. Confirm relation names
4. Validate aggregation availability
```

### 4. Document Assumptions
When you discover schema:
```
# Found: Module "northwind" has:
#   - Data object "nw_customers" (table)
#   - Fields: id (Int!), name (String!), country (String)
#   - Relations: orders (one-to-many)
#   - Prefix: "nw"
```

### 5. Handle Discovery Failures Gracefully
```
1. Try discovery tool
2. If type not found, try alternative naming
3. If still failing, ask user for clarification
4. Never proceed with guessed names
```

---

## Response Templates

### When User Asks to Query Data

**Template:**
```
I'll help you query [data type]. First, let me discover the available schema.

1. Searching for relevant modules...
   [Use discovery-search_modules]

2. Found module: [module_name]
   Examining data objects...
   [Use discovery-search_module_data_objects]

3. Found data object: [object_name]
   Checking field structure...
   [Use schema-type_fields]

4. [If filtering] Validating filter options...
   [Use schema-type_fields for filter type]

5. [If needed] Examining field values...
   [Use discovery-data_object_field_values]

Now I can construct the query:
[Show GraphQL query]
```

### When Schema Element Not Found

**Template:**
```
I couldn't find [element] in the schema. Let me verify:

1. Checked modules: [list]
2. Checked data objects in [module]: [list]
3. Checked fields in [object]: [list]

Could you clarify:
- Is the data in a different module?
- Might it have a different name?
- Should I search with a different pattern?
```

---

## Integration with Query Construction

After discovery, transition to query construction:

```
Discovery Phase:
1. ✅ Found module: "northwind"
2. ✅ Found object: "nw_customers"
3. ✅ Fields: id, name, country, orders
4. ✅ Filter operators: eq, in, ilike
5. ✅ Country values: ["USA", "Canada", "UK"]

Query Construction Phase:
Now building query with discovered schema...
[Proceed to p-query-construction.md]
```

---

## Next Steps

After completing discovery:
- **[p-query-construction.md](./p-query-construction.md)** - Build efficient queries
- **[p-data-analysis.md](./p-data-analysis.md)** - Analyze discovered data
- **[r-core-concepts.md](./r-core-concepts.md)** - Understand schema concepts

## Related Resources

- **[r-discovery-workflow.md](./r-discovery-workflow.md)** - Detailed discovery examples
- **[r-getting-started.md](./r-getting-started.md)** - MCP tools overview
