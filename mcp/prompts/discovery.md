# Discovery Workflow

## Goal

**Gather structured schema information** - fields, arguments, input types for query building.

**Output format:** Compact GraphQL-like structure showing:
- Query field in module (orders, orders_aggregation, orders_by_pk, function path)
- Query arguments with nested structure
- Object fields with types
- Relation fields with their structure
- Filter inputs with available fields (nested via dot notation)

**NOT your job:** Build actual queries
**YOUR job:** Collect schema structure for query builder

---

## Core Principle: Lazy Introspection

1. Find query field in module
2. Check query arguments (filter, order_by, etc.)
3. Introspect object fields
4. For relations → introspect related types (if needed)
5. For filter inputs → show available fields (nested)
6. **Stop when structure is clear**

Use `relevance_query` to find specific fields instead of fetching all.

---

## MCP Tools

**Discovery:**
- `discovery-search_modules` - Find modules
- `discovery-search_module_data_objects` - Find tables/views
- `discovery-search_module_functions` - Find functions
- `discovery-data_object_field_values` - Get field values

**Schema:**
- `schema-type_fields(type_name, relevance_query, top_k)` - Introspect type
- `schema-type_info` - Type overview
- `schema-enum_values` - Enum values

---

## Introspection Steps

### Step 1: Find Query Field in Module

**1.1 Search module:**
```
discovery-search_modules(query: "sales")
```

**1.2 Search data object:**
```
discovery-search_module_data_objects(module_name: "sales", query: "orders")
→ Result: name="orders", module="sales", type="table"
```

**1.3 If NOT found - check module type:**
```
schema-type_fields(type_name: "sales")
→ Shows available query fields on module
```

**Result needed:**
- Module name: `sales`
- Query field name: `orders` (or `orders_aggregation`, `orders_by_pk`)
- Type: `table`/`view`

---

### Step 2: Check Query Arguments

```
schema-type_fields(type_name: "sales", relevance_query: "orders")
→ Find the orders field and its arguments
```

**Look for arguments:**
- `filter` - what type? (e.g., `orders_filter` for top-level, `orders_list_filter` for relations)
- `order_by` - what type?
- `limit`, `offset` - pagination
- `distinct_on` - unique values
- Other custom arguments

**⚠️ Filter type naming:**
- Top-level query: `orders_filter`
- Relation filter (o2m): `orders_list_filter` (used in `customers_filter { orders: orders_list_filter }`)

**Result needed:**
```
Query field: orders
Arguments:
  - filter: orders_filter (top-level)
  - order_by: [OrderByField]
  - limit: Int
  - offset: Int
```

---

### Step 3: Introspect Object Fields

```
schema-type_fields(type_name: "orders", top_k: 30)
# or
schema-type_fields(type_name: "orders", relevance_query: "customer product", top_k: 15)
```

**Categorize fields:**
- **Scalar:** id, total, status, created_at
- **Relations:** customer (→ customers), items (→ [order_items])
- **Aggregations:** orders_aggregation, orders_bucket_aggregation
- **Special:** _join, _spatial
- **Functions:** fields with arguments

**For each relation field - note:**
- Field name
- Return type (single object or array)
- Whether it has arguments (filter, inner, etc.)

**Result needed:**
```
Fields:
  Scalar:
    - id: Int
    - total: Float
    - status: String
    - created_at: Timestamp

  Relations:
    - customer: customers (m2o - single object)
    - items: [order_items] (o2m - array)

  Aggregations:
    - orders_aggregation
    - orders_bucket_aggregation
```

---

### Step 4: Introspect Filter Arguments (Nested Structure)

**4.1 Check filter type (top-level):**
```
schema-type_fields(type_name: "orders_filter", top_k: 20)
```

**4.2 For each filter field - check nested structure:**

**Scalar fields:**
```
status: String_filter_input
→ schema-type_fields(type_name: "String_filter_input")
→ Result: eq, in, like, ilike, regex, is_null
```

**Relation fields (filter through relations):**

For **many-to-one** (customer):
```
customer: customers_filter
→ schema-type_fields(type_name: "customers_filter", relevance_query: "name country", top_k: 10)
→ Result: name, email, country, ...
```

For **one-to-many** (items):
```
items: orders_items_list_filter
→ Uses list filter type (any_of, all_of, none_of)
→ schema-type_fields(type_name: "orders_items_list_filter")
```

**Result needed (nested via dot notation):**
```
filter: orders_filter (top-level)
  Scalar filters:
    - status: String_filter_input
      → eq, in, like, ilike, regex, is_null
    - total: Float_filter_input
      → eq, in, gt, gte, lt, lte, is_null
    - created_at: Timestamp_filter_input
      → eq, gt, gte, lt, lte, is_null

  Relation filters:
    - customer: customers_filter (m2o - direct access)
      → name: String_filter_input (eq, like, ...)
      → country: String_filter_input
      → email: String_filter_input

    - items: order_items_list_filter (o2m - list operators)
      → any_of, all_of, none_of

  Boolean logic:
    - _and: [orders_filter]
    - _or: [orders_filter]
    - _not: orders_filter
```

---

### Step 5: Introspect Related Objects (If Needed)

**Only if query needs relation fields:**

```
schema-type_fields(type_name: "customers", relevance_query: "name address", top_k: 15)
```

**Result needed:**
```
customer: customers
  Fields:
    - id: Int
    - name: String
    - email: String
    - country: String
    - address: String
    - orders: [orders] (back-relation)
    - orders_aggregation
```

---

### Step 6: Check Aggregation Types (If Needed)

**For aggregation queries:**

```
schema-type_fields(type_name: "orders_aggregations", top_k: 20)
```

**Result needed:**
```
orders_aggregation
  Functions by field:
    - total: sum, avg, min, max, count
    - status: count
    - created_at: min, max, count
    - _rows_count: (always available)
```

**For bucket aggregation:**
```
schema-type_fields(type_name: "orders_bucket_aggregation_key")
```

**Result needed:**
```
orders_bucket_aggregation
  Grouping fields (key):
    - status
    - customer { id, name, country }
    - created_at (supports bucket argument)
```

---

### Step 7: Function Discovery

**If calling a function:**

```
discovery-search_module_functions(module_name: "analytics", query: "recommendations")
→ Result: name, module path, return_type, is_table

schema-type_fields(type_name: "Function", relevance_query: "recommendations")
→ Result: arguments, return type
```

**Result needed:**
```
Function: get_recommendations
Module path: analytics.ml
Arguments:
  - customer_id: Int!
  - limit: Int
Returns: [Product]
Is table function: true (supports filter, order_by, limit)
```

---

## Output Format: Compact Schema Structure

**Example output for simple query:**

```
✓ Schema structure for query

Module: sales
Query field: orders
Type: table

Arguments:
  - filter: orders_filter
  - order_by: [OrderByField]
  - limit: Int
  - offset: Int

Fields (15 total, showing relevant):
  - id: Int
  - total: Float
  - status: String
  - created_at: Timestamp
  - customer: customers (relation, m2o)
  - items: [order_items] (relation, o2m)

Aggregations:
  - orders_aggregation
  - orders_bucket_aggregation

Ready for query building.
```

**Example output with filter details:**

```
✓ Schema structure with filters

Module: sales
Query: orders(filter: ..., limit: ...)

filter: orders_filter
  status: String_filter_input
    → eq, in, like, ilike, regex, is_null

  total: Float_filter_input
    → eq, in, gt, gte, lt, lte, is_null

  customer: customers_filter (m2o - nested)
    → name: String_filter_input
    → country: String_filter_input
    → vip: Boolean_filter_input

  items: order_items_list_filter (o2m - list operators)
    → any_of, all_of, none_of
    → Nested: quantity, price, product

  _and/_or/_not: boolean logic available

Fields:
  - id, total, status, created_at
  - customer: customers
  - items: [order_items]

Ready for query building.
```

**Example output with relation structure:**

```
✓ Schema structure with relations

Module: sales
Query: orders

Fields:
  Scalars: id, total, status, created_at

  Relations:
    customer: customers (m2o)
      └─ id, name, email, country, address
      └─ orders_aggregation available

    items: [order_items] (o2m)
      └─ id, quantity, price, product_id
      └─ product: products (nested relation)
      └─ items_aggregation available

Filters available:
  - Direct: status, total, created_at
  - Through customer (m2o): customer.name, customer.country
  - Through items (o2m): items.any_of { ... }

Ready for query building.
```

**Example: customers query with orders list filter (o2m):**

```
✓ Schema structure for customers with orders filter

Module: sales
Query field: customers
Type: table

Arguments:
  - filter: customers_filter

filter: customers_filter
  name: String_filter_input
    → eq, in, like, ilike

  country: String_filter_input
    → eq, in

  orders: orders_list_filter (o2m - filter by related orders)
    → any_of, all_of, none_of
    → Nested: status, total, created_at
    → Example: orders.any_of { status.eq("completed"), total.gte(1000) }

Fields:
  - id, name, email, country
  - orders: [orders] (o2m relation)

Ready for query building.
```

**Example output for aggregation:**

```
✓ Schema structure for aggregation

Module: sales
Query: orders_bucket_aggregation

Grouping (key):
  - status: String
  - customer: { id, name, country }
  - created_at (supports bucket: day/week/month/year)

Aggregations:
  - _rows_count
  - total: sum, avg, min, max, count
  - created_at: min, max

Sorting:
  - order_by with paths:
    → key.status
    → key.customer.country
    → aggregations.total.sum
    → aggregations._rows_count

Ready for query building.
```

**Example output for function:**

```
✓ Function schema

Module path: analytics → ml
Function: get_recommendations
Call: query { function { analytics { ml { get_recommendations(...) } } } }

Arguments:
  - customer_id: Int! (required)
  - limit: Int (optional)

Returns: [Product]
  Fields: id, name, price, score

Table function: yes
  → Supports filter, order_by, limit
  → Has _aggregation variants

Ready for query building.
```

---

## When to Drill Deeper

**Minimal (2-3 calls):**
- Module + object found
- Basic fields known
- → Simple SELECT query

**Medium (3-5 calls):**
- + Filter type checked
- + Key scalar operators known
- → Filtered query

**Deep (5-8 calls):**
- + Relation types checked
- + Nested filter structure
- + Related object fields
- → Complex query with joins/filters

**Stop when:**
- Structure is clear
- Query builder can construct query
- Can reference resources for details

---

## Key Resources for Query Builder

After discovery hands off, query builder reads:
- `hugr://docs/overview` - Field types, concepts
- `hugr://docs/filters` - Filter construction, boolean logic
- `hugr://docs/aggregations` - Aggregation patterns
- `hugr://docs/data-types` - Operators, errors
- `hugr://docs/patterns` - Query patterns, examples

**Discovery provides:** Structure (fields, arguments, types)
**Resources provide:** How to use them (syntax, patterns, operators)
**Query builder:** Combines both → valid GraphQL

---

## Efficiency Tips

1. **Use relevance_query:**
   ```
   schema-type_fields(type: "orders", relevance_query: "customer shipping", top_k: 10)
   ```

2. **Check returned vs total:**
   ```json
   {"total": 50, "returned": 20}
   ```
   If more needed → refine query or paginate

3. **Drill selectively:**
   - Don't check all filter operators
   - Don't fetch all relation fields
   - Only what query needs

4. **Show structure compactly:**
   - Tree format for nested inputs
   - Dot notation for paths
   - Group by category

---

## Common Scenarios

**Scenario 1: "Show me orders"**
→ Find orders query field
→ Introspect fields (id, total, status, ...)
→ STOP (2 calls)

**Scenario 2: "Show completed orders"**
→ Find orders query field + arguments
→ Check orders_list_filter → status field
→ STOP (3 calls)

**Scenario 3: "Orders with customer name and country"**
→ Find orders query field
→ Check fields → customer relation
→ Introspect customers → name, country fields
→ STOP (4 calls)

**Scenario 4: "Total revenue by status"**
→ Find orders_bucket_aggregation
→ Check key (grouping) → status available
→ Check aggregations → total.sum available
→ STOP (4 calls)

**Scenario 5: "Get recommendations for customer"**
→ Search functions → get_recommendations
→ Check signature → arguments, return type
→ Check if table function → yes
→ STOP (3 calls)

---

{{if .task}}
## Current Task

**Objective:** {{.task}}

**Your job:**
1. Find query field in module
2. Gather arguments structure
3. Introspect fields (scalar, relations, aggregations)
4. For filters: show nested structure via dot notation
5. For relations: show related object fields
6. Output compact GraphQL-like structure

**Format:** Tree/hierarchy showing fields, arguments, nested inputs

Start discovery now!
{{end}}
