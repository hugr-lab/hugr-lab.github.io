# Discovery Workflow - Lazy Schema Introspection

## Core Principle

**Never assume fixed names or structures.** Always use discovery tools to understand what's available before constructing queries.

## Discovery Process

### Phase 1: Discover Modules

**Goal:** Find what top-level modules exist

**Tool:** `discovery-search_modules`

**Patterns:**
```
# Find all modules
pattern: "*"

# Find specific domain
pattern: "sales*"
pattern: "*analytics*"

# Find nested modules
pattern: "crm.customers*"
```

**Example Response:**
```json
{
  "modules": [
    {
      "name": "northwind",
      "description": "Northwind trading database"
    },
    {
      "name": "analytics.sales",
      "description": "Sales analytics views"
    }
  ]
}
```

**When to Use:**
- Starting exploration of unknown system
- Finding domain-specific modules
- Understanding available data domains

---

### Phase 2: Discover Data Sources

**Goal:** Understand what databases/sources are connected

**Tool:** `discovery-search_data_sources`

**Example Response:**
```json
{
  "data_sources": [
    {
      "name": "northwind",
      "type": "postgres",
      "description": "Production PostgreSQL database"
    },
    {
      "name": "analytics",
      "type": "duckdb",
      "description": "Analytics data lake"
    }
  ]
}
```

**When to Use:**
- Understanding system architecture
- Identifying data source types for query optimization
- Cross-source join planning

---

### Phase 3: Discover Data Objects

**Goal:** Find tables and views in a module

**Tool:** `discovery-search_module_data_objects`

**Parameters:**
```
module_path: "northwind"           # Top-level module
module_path: "analytics.sales"     # Nested module
module_path: ""                    # Root level (if not a module)
```

**Example Response:**
```json
{
  "data_objects": [
    {
      "name": "customers",
      "type": "table",
      "description": "Customer records"
    },
    {
      "name": "orders",
      "type": "table",
      "description": "Order transactions"
    },
    {
      "name": "sales_by_region",
      "type": "view",
      "description": "Aggregated sales by region"
    }
  ]
}
```

**When to Use:**
- Exploring available data in a module
- Finding relevant tables/views for a task
- Understanding data object types (table vs view)

---

### Phase 4: Discover Functions

**Goal:** Find callable functions in a module

**Tool:** `discovery-search_module_functions`

**Parameters:**
```
module_path: "northwind"
module_path: "analytics.ml"
```

**Example Response:**
```json
{
  "functions": [
    {
      "name": "calculate_shipping_cost",
      "description": "Calculate shipping cost based on weight and distance",
      "arguments": "weight: Float!, distance: Float!"
    },
    {
      "name": "get_recommendations",
      "description": "Get product recommendations for customer",
      "arguments": "customer_id: Int!, limit: Int"
    }
  ]
}
```

**When to Use:**
- Finding available business logic functions
- Discovering data transformation utilities
- Exploring API endpoints (for HTTP data sources)

---

### Phase 5: Examine Type Structure

**Goal:** Understand fields and types of a data object

**Tool:** `schema-type_fields`

**Naming Convention:**
```
Data object: "customers"
Generated types:
  - customers                      (main type)
  - nw_customers                   (with prefix)
  - customers_filter              (filter input)
  - customers_aggregations        (aggregation type)
```

**Example Request:**
```
type_name: "nw_customers"
```

**Example Response:**
```json
{
  "fields": [
    {
      "name": "id",
      "type": "Int!",
      "description": "Customer ID"
    },
    {
      "name": "name",
      "type": "String!",
      "description": "Customer name"
    },
    {
      "name": "country",
      "type": "String",
      "description": "Country code"
    },
    {
      "name": "orders",
      "type": "[nw_orders!]!",
      "description": "Customer orders"
    },
    {
      "name": "orders_aggregation",
      "type": "nw_orders_aggregations!",
      "description": "Aggregated order statistics"
    }
  ]
}
```

**When to Use:**
- Before constructing queries
- Understanding available fields
- Identifying relations and aggregations
- Finding field types for filtering

---

### Phase 6: Validate Filter Options

**Goal:** Understand what filter operators are available for fields

**Tool:** `schema-type_fields`

**Pattern:**
```
1. Identify filter type: <object>_filter
2. Get filter fields: schema-type_fields(type_name="customers_filter")
3. Check field-specific filters: schema-type_fields(type_name="String_filter_input")
```

**Example for String Filter:**
```json
{
  "fields": [
    { "name": "eq", "type": "String" },
    { "name": "in", "type": "[String!]" },
    { "name": "like", "type": "String" },
    { "name": "ilike", "type": "String" },
    { "name": "regex", "type": "String" },
    { "name": "is_null", "type": "Boolean" }
  ]
}
```

**Example for Int Filter:**
```json
{
  "fields": [
    { "name": "eq", "type": "Int" },
    { "name": "in", "type": "[Int!]" },
    { "name": "gt", "type": "Int" },
    { "name": "gte", "type": "Int" },
    { "name": "lt", "type": "Int" },
    { "name": "lte", "type": "Int" },
    { "name": "is_null", "type": "Boolean" }
  ]
}
```

**When to Use:**
- Before applying filters
- Understanding available operators
- Validating filter syntax

---

### Phase 7: Explore Field Values

**Goal:** Understand data distribution and possible values

**Tool:** `discovery-data_object_field_values`

**Example Request:**
```
module_path: "northwind"
data_object: "customers"
field_name: "country"
limit: 20
```

**Example Response:**
```json
{
  "values": ["USA", "Canada", "UK", "Germany", "France", "Spain"],
  "count": 6
}
```

**When to Use:**
- Understanding categorical data
- Finding valid values for filtering
- Data quality assessment
- Building filter conditions

---

## Discovery Workflow Examples

### Example 1: Exploring Unknown System

**Task:** Find customer data

**Steps:**
```
1. discovery-search_modules(pattern="*")
   → Found: "northwind", "analytics"

2. discovery-search_module_data_objects(module_path="northwind")
   → Found: "customers", "orders", "products"

3. schema-type_fields(type_name="nw_customers")
   → Fields: id, name, email, country, orders

4. schema-type_fields(type_name="nw_customers_filter")
   → Filters: name, email, country, orders

5. discovery-data_object_field_values(
     module_path="northwind",
     data_object="customers",
     field_name="country"
   )
   → Countries: USA, Canada, UK, Germany

6. Construct query:
   query {
     northwind {
       customers(filter: { country: { eq: "USA" } }) {
         id
         name
         email
       }
     }
   }
```

---

### Example 2: Finding Aggregation Capabilities

**Task:** Get sales statistics by country

**Steps:**
```
1. discovery-search_module_data_objects(module_path="northwind")
   → Found: "orders"

2. schema-type_fields(type_name="nw_orders")
   → Found aggregation: "orders_aggregation", "orders_bucket_aggregation"

3. schema-type_fields(type_name="nw_orders_aggregations")
   → Fields: _rows_count, total { sum, avg, min, max }

4. schema-type_fields(type_name="nw_orders_bucket_aggregation_key")
   → Key fields: status, customer { country }

5. Construct query:
   query {
     northwind {
       orders_bucket_aggregation {
         key {
           customer { country }
         }
         aggregations {
           _rows_count
           total { sum avg }
         }
       }
     }
   }
```

---

### Example 3: Cross-Source Join Discovery

**Task:** Join PostgreSQL customers with MySQL user activity

**Steps:**
```
1. discovery-search_data_sources()
   → Found: postgres_db, mysql_db

2. discovery-search_module_data_objects(module_path="postgres_db")
   → Found: "customers" with "email" field

3. discovery-search_module_data_objects(module_path="mysql_db")
   → Found: "user_activity" with "user_email" field

4. schema-type_fields(type_name="postgres_customers")
   → Confirmed: "email" field exists
   → Found: "_join" field available

5. schema-type_fields(type_name="mysql_user_activity")
   → Confirmed: "user_email" field exists

6. Construct query:
   query {
     postgres_db {
       customers(limit: 10) {
         id
         email
         _join(fields: ["email"]) {
           mysql_db_user_activity(fields: ["user_email"]) {
             last_login
             page_views
           }
         }
       }
     }
   }
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Assuming Schema Structure
```
# BAD - Assuming "customers" exists
query {
  customers { id name }
}

# GOOD - Discover first
1. discovery-search_modules(pattern="*")
2. discovery-search_module_data_objects(...)
3. Construct query based on findings
```

### ❌ Guessing Filter Operators
```
# BAD - Assuming "equals" operator
filter: { name: { equals: "John" } }

# GOOD - Validate operators
1. schema-type_fields(type_name="customers_filter")
2. schema-type_fields(type_name="String_filter_input")
3. Use discovered operator: { name: { eq: "John" } }
```

### ❌ Ignoring Data Object Types
```
# BAD - Assuming table supports mutations
mutation {
  insert_sales_report(...)  # sales_report might be a view
}

# GOOD - Check type first
1. discovery-search_module_data_objects(...)
   → type: "view" (read-only, no mutations)
```

### ❌ Not Checking Relations
```
# BAD - Assuming relation name
customers {
  customer_orders { ... }  # Might be named "orders"
}

# GOOD - Discover relations
1. schema-type_fields(type_name="customers")
2. Find relation fields with type "[orders!]!"
```

---

## Best Practices

### 1. Start Broad, Refine Incrementally
```
modules → data_objects → fields → filters → values
```

### 2. Cache Discovery Results
Discovery results are usually stable, cache them for the session.

### 3. Use Pattern Matching Strategically
```
# Too broad (might return too much)
pattern: "*"

# Better (domain-specific)
pattern: "sales*"
pattern: "*customer*"
```

### 4. Validate Type Names
When moving from data object to type:
```
Data object: "customers"
Possible types:
  - "customers"               # No prefix
  - "nw_customers"           # With prefix
  - "northwind_customers"    # Module as prefix

Solution: Check both possibilities or discover module prefix
```

### 5. Always Check _join Availability
Before attempting dynamic joins:
```
1. schema-type_fields(type_name="customers")
2. Look for "_join" field
3. Validate join field types match
```

---

## Quick Reference: Discovery Decision Tree

```
START: What do I need to do?

├─ Don't know what data exists
│  └─> discovery-search_modules → discovery-search_module_data_objects
│
├─ Need to query specific data object
│  └─> schema-type_fields(object_type) → Validate fields exist
│
├─ Need to filter data
│  └─> schema-type_fields(object_filter) → Check operators
│
├─ Need to understand categorical data
│  └─> discovery-data_object_field_values → Get distinct values
│
├─ Need to aggregate data
│  └─> schema-type_fields(object_aggregations) → Check available aggregations
│
└─ Need to join data
   └─> schema-type_fields(object) → Confirm _join field exists
       → schema-type_fields(target_object) → Validate join field types
```

---

## Next Steps

- **[r-querying-basics.md](./r-querying-basics.md)** - Learn query construction
- **[p-lazy-discovery.md](./p-lazy-discovery.md)** - AI model guidance for discovery
- **[p-query-construction.md](./p-query-construction.md)** - Building efficient queries

## Related Documentation

- [GraphQL Introspection](https://graphql.org/learn/introspection/)
- [Hugr Schema Definition](https://hugr-lab.github.io/docs/engine-configuration/schema-definition)
