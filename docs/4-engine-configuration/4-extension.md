---
title: "Extensions & Cross-Source Subqueries"
sidebar_position: 5
description: Comprehensive guide to using extensions for cross-source data integration in Hugr
keywords: [extensions, cross-source, joins, function calls, dependencies, data integration]
---

# Extensions & Cross-Source Subqueries

Extensions are a powerful feature in Hugr that enable you to extend existing data objects with cross-source subquery and function call fields. They allow seamless integration of data from multiple sources, creating a unified GraphQL API that spans different databases and systems.

## Overview

Extensions enable powerful cross-data-source capabilities:

- **Cross-source joins**: Add join fields that reference tables from other data sources
- **Cross-source function calls**: Call functions from different data sources as fields
- **Custom SQL views**: Create views combining data from multiple sources using DuckDB SQL
- **Schema documentation**: Add or update descriptions for existing types and fields
- **Type prefixes**: Reference types from different sources using their prefixes
- **Dependency tracking**: Define dependencies between extensions and data sources

## Key Concepts

### Extension Data Source

An extension is a special type of data source that:
- Doesn't require a connection string (path is empty)
- Depends on one or more other data sources
- Extends existing types from those sources
- Can define custom SQL views across sources

### Type Prefixes

When working with multiple data sources, each data source can have a **prefix** defined in the `data_sources` table (in the `core` module). This prefix is used to namespace types and avoid naming conflicts.

**Example**:
- **Data source "postgres_main"** with prefix `"pg"` → types like `pg_users`, `pg_orders`
- **Data source "mysql_analytics"** with prefix `"mysql"` → types like `mysql_sessions`, `mysql_events`

The prefix is set in the data source configuration and prepended to all table/view names from that source.

### Dependencies

Extensions must declare their dependencies on other data sources using the `@dependency` directive. This ensures proper loading order and prevents referencing unavailable types.

**Important**: The `@dependency` directive requires the **data source name** from the `data_sources` table (the `name` field), not the module name.

```graphql
extend type pg_users @dependency(name: "postgres_db") @dependency(name: "analytics") {
  # Depends on both "postgres_db" (for pg_users) and "analytics" (for referenced types)
}
```

**You must declare dependencies for ALL data sources involved**:
1. The data source containing the type you're extending (e.g., `postgres_db` for `pg_users`)
2. All data sources containing types you reference (e.g., `analytics` for `mysql_user_sessions`)

**Example**: If extending `pg_users` from data source `postgres_db` with data from `analytics`:
```graphql
extend type pg_users
  @dependency(name: "postgres_db")  # Source of the extended type
  @dependency(name: "analytics")    # Source of referenced types
{
  sessions: [mysql_user_sessions] @join(...)
}
```

## Setting Up an Extension

### 1. Create Extension Data Source

Add an extension data source record through the GraphQL API:

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "ext_cross_source"
      type: "extension"
      path: ""
      prefix: ""
      description: "Cross-source data integration extension"
      read_only: false
      self_defined: false
      as_module: false
      disabled: false
      catalogs: [
        {
          name: "ext_cross_source"
          description: "Extension schema catalog"
          type: "uri"
          path: "/workspace/schemes/ext_cross_source"
        }
      ]
    }) {
      name
    }
  }
}
```

**Key parameters**:
- `type: "extension"` - marks this as an extension data source
- `path: ""` - no connection string needed
- `prefix: ""` - optional prefix for view types defined in extension
- `catalogs` - defines where the extension schema files are located

### 2. Create Extension Schema

Create a GraphQL schema file in the catalog path (e.g., `/workspace/schemes/ext_cross_source/schema.graphql`):

```graphql
# Extend existing types with cross-source fields
extend type pg_customers @dependency(name: "analytics") {
  # Add fields here
}

# Define custom views
type custom_view @view(...) {
  # View fields
}
```

### 3. Load the Extension

After creating the schema, load the extension through the Hugr admin UI or API. The extension will validate dependencies and extend the GraphQL schema.

## Extending Types with Cross-Source Joins

Use the `@join` directive to add fields that reference data from other sources.

### Basic Cross-Source Join

```graphql
# Extend PostgreSQL users table with data from MySQL analytics
extend type pg_users
  @dependency(name: "postgres_db")  # Data source containing pg_users
  @dependency(name: "analytics")    # Data source containing mysql_user_sessions
{
  # Add sessions from MySQL analytics database
  sessions: [mysql_user_sessions]
    @join(
      references_name: "mysql_user_sessions"
      source_fields: ["email"]
      references_fields: ["user_email"]
    )
}
```

**Explanation**:
- `pg_users` - type from PostgreSQL (prefix `pg`, data source `postgres_db`)
- `mysql_user_sessions` - type from MySQL (prefix `mysql`, data source `analytics`)
- `@dependency(name: "postgres_db")` - declares dependency on source of extended type
- `@dependency(name: "analytics")` - declares dependency on source of referenced types
- Join condition: `pg_users.email = mysql_user_sessions.user_email`

**Query example**:
```graphql
query {
  postgres_db {
    pg_users {
      id
      email
      name
      # Sessions from MySQL
      sessions {
        session_id
        start_time
        duration
      }
    }
  }
}
```

### Multiple Cross-Source Joins

Extend a type with fields from multiple sources:

```graphql
extend type pg_orders
  @dependency(name: "postgres_db")  # Data source containing pg_orders
  @dependency(name: "warehouse")    # Data source containing duckdb_inventory
  @dependency(name: "crm")          # Data source containing crm_customer_interactions
{
  # Inventory data from DuckDB warehouse
  inventory_items: [duckdb_inventory]
    @join(
      references_name: "duckdb_inventory"
      source_fields: ["product_id"]
      references_fields: ["product_id"]
    )

  # Customer relationship data from CRM system
  crm_interactions: [crm_customer_interactions]
    @join(
      references_name: "crm_customer_interactions"
      source_fields: ["customer_id"]
      references_fields: ["customer_id"]
    )
}
```

**Query example**:
```graphql
query {
  postgres_db {
    pg_orders(limit: 10) {
      id
      customer_id
      product_id
      # From DuckDB warehouse
      inventory_items {
        warehouse_location
        stock_quantity
      }
      # From CRM system
      crm_interactions {
        interaction_type
        interaction_date
        notes
      }
    }
  }
}
```

## Extending Types with Cross-Source Function Calls

Use the `@function_call` directive to add fields that call functions from other data sources. When calling functions from different modules, you must specify the `module` parameter.

### Basic Function Call

```graphql
# Extend orders with shipping cost calculation from external API
extend type pg_orders
  @dependency(name: "postgres_db")  # Data source containing pg_orders
  @dependency(name: "shipping_api") # Data source containing calculate_shipping function
{
  # Calculate shipping cost using function from HTTP data source
  shipping_cost: Float
    @function_call(
      references_name: "calculate_shipping"
      module: "shipping_api"
      args: {
        weight: "total_weight"
        destination: "shipping_address"
      }
    )
}
```

**Explanation**:
- `module: "shipping_api"` - specifies which data source module contains the function
- `references_name: "calculate_shipping"` - function name
- `args` - maps order fields to function parameters

**Query example**:
```graphql
query {
  postgres_db {
    pg_orders {
      id
      total_weight
      shipping_address
      # Calculated by external function
      shipping_cost
    }
  }
}
```

### Table Function Call with Join

For functions that return arrays of data that need to be joined:

```graphql
extend type pg_products
  @dependency(name: "postgres_db")          # Data source containing pg_products
  @dependency(name: "recommendation_engine") # Data source containing the function
{
  # Get recommendations from ML service
  related_products: [recommendation_result]
    @table_function_call_join(
      references_name: "get_product_recommendations"
      module: "recommendation_engine"
      args: {
        product_id: "id"
        category: "category_name"
      }
      source_fields: ["id"]
      references_fields: ["source_product_id"]
    )
}
```

**Explanation**:
- Function returns array of recommendations
- Results are joined: `pg_products.id = recommendation_result.source_product_id`
- Function is called with `product_id` and `category` parameters

**Query example**:
```graphql
query {
  postgres_db {
    pg_products(limit: 5) {
      id
      name
      category_name
      # Recommendations from ML engine
      related_products {
        recommended_product_id
        similarity_score
        reason
      }
    }
  }
}
```

## Creating Custom Views Across Data Sources

Extensions can define SQL views that combine data from multiple sources using the full power of DuckDB SQL. Dependencies must be declared for all data sources used in the view.

### Cross-Source SQL View

```graphql
# View combining PostgreSQL orders with MySQL customer data
type order_customer_summary
  @view(
    name: "order_customer_summary"
    sql: """
      SELECT
        o.id as order_id,
        o.total,
        o.order_date,
        c.customer_id,
        c.name as customer_name,
        c.lifetime_value
      FROM postgres_db.public.orders o
      INNER JOIN analytics.customers c ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
    """
  )
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
{
  order_id: Int!
  total: Float!
  order_date: Timestamp!
  customer_id: Int!
  customer_name: String!
  lifetime_value: Float
}
```

**Explanation**:
- SQL uses DuckDB's unified query context
- **Full table names**: `data_source_name.schema.table_name` format
  - `postgres_db.public.orders` - orders table from postgres_db data source, public schema
  - `analytics.customers` - customers table from analytics data source (default schema)
- Can join tables from different sources using full names
- Dependencies declared for both data sources
- Schema name can be omitted if using the default schema
- View appears as a queryable type in the schema

**Query example**:
```graphql
query {
  order_customer_summary(
    filter: { lifetime_value: { gte: 10000 } }
    order_by: [{ field: "total", direction: DESC }]
  ) {
    order_id
    total
    customer_name
    lifetime_value
  }
}
```

### Parameterized Cross-Source View

```graphql
type regional_sales_summary
  @view(
    name: "regional_sales_summary"
    sql: """
      SELECT
        r.region_id,
        r.region_name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total) as total_sales,
        AVG(o.total) as avg_order_value
      FROM postgres_db.public.regions r
      LEFT JOIN postgres_db.public.orders o ON o.region_id = r.region_id
      WHERE r.country = [$country]
        AND o.order_date >= [$start_date]
        AND o.order_date <= [$end_date]
      GROUP BY r.region_id, r.region_name
    """
  )
  @dependency(name: "postgres_db")
  @args(name: "sales_filters")
{
  region_id: Int!
  region_name: String!
  order_count: Int!
  total_sales: Float!
  avg_order_value: Float!
}

input sales_filters {
  country: String!
  start_date: Date!
  end_date: Date!
}
```

**Query example**:
```graphql
query {
  regional_sales_summary(
    args: {
      country: "USA"
      start_date: "2024-01-01"
      end_date: "2024-12-31"
    }
  ) {
    region_name
    order_count
    total_sales
    avg_order_value
  }
}
```

### Advanced DuckDB Features in Views

Extensions can leverage the full power of DuckDB's analytical functions and features in SQL views.

#### Using DuckDB Analytical Functions

```graphql
type product_sales_analysis
  @view(
    name: "product_sales_analysis"
    sql: """
      SELECT
        p.product_id,
        p.name,
        SUM(s.quantity) as total_quantity,
        SUM(s.revenue) as total_revenue,
        AVG(s.revenue) as avg_revenue,
        -- Window functions
        ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(s.revenue) DESC) as rank_in_category,
        -- Percentile functions
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.revenue) as median_revenue,
        -- String aggregation
        STRING_AGG(DISTINCT s.customer_id::VARCHAR, ', ') as customer_ids
      FROM postgres_db.public.products p
      LEFT JOIN analytics.sales s ON p.product_id = s.product_id
      GROUP BY p.product_id, p.name, p.category
    """
  )
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
{
  product_id: Int!
  name: String!
  total_quantity: Int!
  total_revenue: Float!
  avg_revenue: Float!
  rank_in_category: Int!
  median_revenue: Float
  customer_ids: String
}
```

#### Using http_data_source_request_scalar() for HTTP Data Sources

For HTTP data sources, use Hugr's `http_data_source_request_scalar()` function to make API calls within DuckDB views:

```graphql
type weather_enriched_locations
  @view(
    name: "weather_enriched_locations"
    sql: """
      SELECT
        l.location_id,
        l.city,
        l.latitude,
        l.longitude,
        -- Call HTTP API using http_data_source_request_scalar
        (
          http_data_source_request_scalar(
            'weather_api',              -- Data source name
            '/weather/current',         -- API endpoint path
            'GET',                      -- HTTP method
            '{}'::JSON,                 -- Request body (empty for GET)
            json_object(                -- Query parameters
              'lat', l.latitude,
              'lon', l.longitude
            ),
            '{}'::JSON,                 -- Headers
            ''                          -- Additional options
          )::JSON
        )->>'temperature' as current_temp,
        (
          http_data_source_request_scalar(
            'weather_api',
            '/weather/current',
            'GET',
            '{}'::JSON,
            json_object('lat', l.latitude, 'lon', l.longitude),
            '{}'::JSON,
            ''
          )::JSON
        )->>'humidity' as current_humidity
      FROM postgres_db.public.locations l
    """
  )
  @dependency(name: "postgres_db")
  @dependency(name: "weather_api")
{
  location_id: Int!
  city: String!
  latitude: Float!
  longitude: Float!
  current_temp: String
  current_humidity: String
}
```

**Function signature**:
```sql
http_data_source_request_scalar(
  data_source_name VARCHAR,  -- Name from data_sources table
  path VARCHAR,              -- API endpoint path
  method VARCHAR,            -- HTTP method (GET, POST, etc.)
  body JSON,                 -- Request body
  params JSON,               -- Query parameters
  headers JSON,              -- HTTP headers
  options VARCHAR            -- Additional options
) RETURNS VARCHAR
```

**Explanation**:
- `http_data_source_request_scalar()` - makes HTTP requests to configured data sources
- Returns response as VARCHAR, cast to JSON for parsing
- Use `->` and `->>` operators to extract JSON fields
- `json_object()` constructs query parameters from table columns
- Useful for enriching database data with external API data

#### Complex Analytical Queries

```graphql
type customer_cohort_analysis
  @view(
    name: "customer_cohort_analysis"
    sql: """
      WITH first_purchase AS (
        SELECT
          customer_id,
          MIN(order_date) as cohort_date,
          DATE_TRUNC('month', MIN(order_date)) as cohort_month
        FROM postgres_db.public.orders
        GROUP BY customer_id
      ),
      customer_orders AS (
        SELECT
          o.customer_id,
          o.order_date,
          o.total,
          fp.cohort_month,
          DATEDIFF('month', fp.cohort_date, o.order_date) as months_since_first
        FROM postgres_db.public.orders o
        INNER JOIN first_purchase fp ON o.customer_id = fp.customer_id
      )
      SELECT
        cohort_month,
        months_since_first,
        COUNT(DISTINCT customer_id) as active_customers,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value,
        -- Retention calculation
        COUNT(DISTINCT customer_id) * 100.0 /
          FIRST_VALUE(COUNT(DISTINCT customer_id)) OVER (
            PARTITION BY cohort_month
            ORDER BY months_since_first
          ) as retention_rate
      FROM customer_orders
      GROUP BY cohort_month, months_since_first
      ORDER BY cohort_month, months_since_first
    """
  )
  @dependency(name: "postgres_db")
{
  cohort_month: Date!
  months_since_first: Int!
  active_customers: Int!
  total_revenue: Float!
  avg_order_value: Float!
  retention_rate: Float!
}
```

**Available DuckDB features**:
- Window functions (ROW_NUMBER, RANK, LAG, LEAD, etc.)
- CTEs (Common Table Expressions)
- Aggregation functions (percentiles, statistical functions)
- Date/time functions (DATE_TRUNC, DATEDIFF, etc.)
- String functions (STRING_AGG, CONCAT, etc.)
- Array and JSON functions
- Geospatial functions (when spatial extension is enabled)

## Adding Documentation to Schema Types and Fields

Extensions allow you to add or modify descriptions (documentation) for existing types and fields from other data sources.

### Documenting Existing Types

```graphql
# Add documentation to existing PostgreSQL tables
"Customer accounts in the system"
extend type pg_customers @dependency(name: "postgres_db") {
  "Unique customer identifier"
  id: Int!

  "Customer email address for notifications"
  email: String!

  "Current account status (active, suspended, closed)"
  status: String!

  "Customer lifetime value in USD"
  lifetime_value: Float
}
```

### Documenting Modules

```graphql
# Add description to a module's query type
"Analytics queries provide access to business intelligence and reporting data from the MySQL analytics database.
Includes customer behavior analysis, sales metrics, and user engagement statistics."
extend type _module_analytics_query @dependency(name: "analytics") {
  _stub: String
}
```

**Explanation**:
- Module query types follow pattern: `_module_<module_name>_query`
- Descriptions appear in GraphQL schema documentation
- Helps developers understand what data and operations are available

### Complete Documentation Example

```graphql
# Document medical data module
"Synthetic medical records database generated using Synthea.
Contains realistic patient health records, encounters, medications, and clinical observations
for the California region. Used for testing and development of healthcare applications."
extend type _module_medical_data_query @dependency(name: "medical_data") {
  _stub: String
}

"Patient demographic and identity information"
extend type medical_patients @dependency(name: "medical_data") {
  "Unique patient identifier (UUID format)"
  id: String!

  "Patient's date of birth"
  birthdate: Date!

  "Patient's current city of residence"
  city: String

  "Geographic coordinates of patient's address"
  geom: Geometry @geometry_info(type: POINT, srid: 4326)
}
```

## Using Dynamic Joins (_join) for Cross-Source Queries

The `_join` field is available on all data objects and provides a powerful way to perform ad-hoc joins across data sources at query time, without pre-defining relationships in the schema.

### Cross-Source Dynamic Join

```graphql
query {
  postgres_db {
    pg_customers {
      id
      email
      # Join with analytics data from MySQL at query time
      _join(fields: ["email"]) {
        mysql_user_behavior(fields: ["user_email"]) {
          page_views
          session_count
          last_visit
        }
      }
    }
  }
}
```

**Explanation**:
- Dynamic join: `pg_customers.email = mysql_user_behavior.user_email`
- No pre-defined relationship needed in schema
- Join happens at query time across different databases
- Hugr uses DuckDB to execute the cross-source join

### Using inner Argument

Control join type to filter parent records:

```graphql
query {
  postgres_db {
    pg_products {
      id
      name
      # Only products that have warehouse inventory
      _join(fields: ["sku"]) {
        duckdb_warehouse_inventory(
          fields: ["product_sku"]
          inner: true  # INNER JOIN - excludes products without inventory
        ) {
          warehouse_location
          quantity
        }
      }
    }
  }
}
```

**Explanation**:
- `inner: true` - only returns products that exist in warehouse inventory
- `inner: false` (default) - returns all products, even without inventory (LEFT JOIN)
- Useful for filtering data based on existence in related sources

### Multiple Source Aggregation

```graphql
query {
  postgres_db {
    pg_customers(limit: 100) {
      id
      name
      # Aggregate orders from PostgreSQL
      _join(fields: ["id"]) {
        pg_orders_aggregation(fields: ["customer_id"]) {
          _rows_count
          total { sum avg }
        }
      }
      # Aggregate sessions from MySQL
      _join(fields: ["email"]) {
        mysql_sessions_aggregation(fields: ["user_email"]) {
          _rows_count
          duration { sum avg }
        }
      }
    }
  }
}
```

**Use case**: Get customer statistics from multiple sources in a single query.

### Cross-Source Aggregation Types

When using extensions with cross-source joins, it's important to understand how GraphQL types behave:

**Filter Input Types** (`_filter` argument):
- ✅ **Do NOT change** - remain specific to each data source
- Use the original filter types for each source
- Example: `pg_orders` uses `pg_orders_filter`, `mysql_sessions` uses `mysql_sessions_filter`

**Aggregation Types** (`_aggregation` and bucket aggregations):
- ✅ **DO change** - become cross-source aware
- Can aggregate over fields from joined sources
- Enable grouping and aggregation across multiple data sources

**Example - Aggregating with Joined Data**:

```graphql
query {
  postgres_db {
    pg_customers_bucket_aggregation {
      key {
        country
        # Can group by joined data from analytics source
        _join(fields: ["email"]) {
          mysql_user_behavior(fields: ["user_email"]) {
            user_segment  # Field from analytics source
          }
        }
      }
      aggregations {
        _rows_count
        # Can aggregate original fields
        lifetime_value { sum avg }
        # Can aggregate joined data
        _join(fields: ["id"]) {
          pg_orders_aggregation(fields: ["customer_id"]) {
            total { sum avg }
          }
        }
      }
    }
  }
}
```

**This enables**:
- Group customers by country AND user segment from analytics
- Aggregate both customer lifetime value AND order totals
- Create cross-source analytical queries

**Filter vs Aggregation behavior**:
```graphql
query {
  postgres_db {
    pg_customers(
      # ❌ Filter remains source-specific
      filter: { country: { eq: "USA" } }  # Only pg_customers fields
    ) {
      id
      # ✅ Aggregations can include joined sources
      _join(fields: ["id"]) {
        pg_orders_aggregation(fields: ["customer_id"]) {
          _rows_count
          total { sum }
        }
      }
    }
  }
}
```

## Using Spatial Queries (_spatial) Across Sources

The `_spatial` field enables geographic queries across different data sources.

### Cross-Source Spatial Join

```graphql
query {
  postgres_db {
    pg_stores {
      id
      name
      location
      # Find customers from MySQL within 5km
      _spatial(field: "location", type: DWITHIN, buffer: 5000) {
        mysql_customers(field: "address_location") {
          customer_id
          name
          distance
        }
      }
    }
  }
}
```

**Explanation**:
- Spatial relationship: customers within 5km of store
- Works across different databases (PostgreSQL and MySQL)
- DuckDB's spatial extension handles the geographic calculation

### Spatial Join with Filter and Inner

```graphql
query {
  duckdb_delivery_zones {
    zone_id
    zone_name
    boundary
    # Only zones with active orders from PostgreSQL
    _spatial(field: "boundary", type: CONTAINS) {
      pg_orders(
        field: "delivery_location"
        filter: { status: { in: ["pending", "processing"] } }
        inner: true  # Only zones containing active orders
      ) {
        order_id
        status
        delivery_location
      }
    }
  }
}
```

**Explanation**:
- Spatial containment check: orders within zone boundaries
- Filter applied: only active orders
- `inner: true` - excludes zones without matching orders
- Combines spatial and attribute filters for precise results

## Complete Extension Example

Here's a complete example showing multiple cross-source integration techniques:

**Extension Schema** (`/workspace/schemes/ext_cross_source/schema.graphql`):

```graphql
# Extend PostgreSQL customers with cross-source data
extend type pg_customers
  @dependency(name: "postgres_db")   # Source of pg_customers
  @dependency(name: "analytics")     # Source of mysql_user_behavior
  @dependency(name: "warehouse")     # Source of warehouse data
  @dependency(name: "shipping_api")  # Source of shipping functions
{
  # Join: MySQL analytics data
  behavior_metrics: [mysql_user_behavior]
    @join(
      references_name: "mysql_user_behavior"
      source_fields: ["email"]
      references_fields: ["user_email"]
    )

  # Function call: Calculate shipping eligibility
  shipping_eligible: Boolean
    @function_call(
      references_name: "check_shipping_eligibility"
      module: "shipping_api"
      args: {
        customer_id: "id"
        country: "country"
      }
    )
}

# Extend PostgreSQL orders
extend type pg_orders
  @dependency(name: "postgres_db")  # Source of pg_orders
  @dependency(name: "warehouse")    # Source of duckdb_inventory
{
  # Join: Warehouse inventory
  warehouse_status: [duckdb_inventory]
    @join(
      references_name: "duckdb_inventory"
      source_fields: ["product_id"]
      references_fields: ["product_id"]
    )
}

# Cross-source view
type customer_order_analytics
  @view(
    name: "customer_order_analytics"
    sql: """
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.email,
        COUNT(o.id) as total_orders,
        SUM(o.total) as total_spent,
        AVG(b.session_count) as avg_sessions
      FROM postgres_db.public.customers c
      LEFT JOIN postgres_db.public.orders o ON c.id = o.customer_id
      LEFT JOIN analytics.user_behavior b ON c.email = b.user_email
      GROUP BY c.id, c.name, c.email
    """
  )
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
{
  customer_id: Int!
  customer_name: String!
  email: String!
  total_orders: Int!
  total_spent: Float!
  avg_sessions: Float
}

# Add documentation
"Customer analytics combining order history and behavioral data"
extend type _module_analytics_query @dependency(name: "analytics") {
  _stub: String
}
```

**Query Example**:

```graphql
query CustomerAnalytics {
  # Query the cross-source view
  customer_order_analytics(
    filter: { total_orders: { gte: 5 } }
    order_by: [{ field: "total_spent", direction: DESC }]
    limit: 10
  ) {
    customer_name
    email
    total_orders
    total_spent
    avg_sessions
  }

  # Query extended types
  postgres_db {
    pg_customers(limit: 5) {
      id
      name
      email

      # Cross-source join field
      behavior_metrics {
        page_views
        session_count
      }

      # Cross-source function call
      shipping_eligible

      # Dynamic join with analytics
      _join(fields: ["id"]) {
        mysql_loyalty_points(fields: ["customer_id"]) {
          points_balance
          tier_level
        }
      }
    }
  }
}
```

## Best Practices

### 1. Always Declare Dependencies

```graphql
# Good - All dependencies declared
extend type pg_users
  @dependency(name: "postgres_db")  # Source of pg_users
  @dependency(name: "analytics")    # Source of mysql_sessions
{
  sessions: [mysql_sessions] @join(...)
}

# Bad - Missing dependencies
extend type pg_users {
  sessions: [mysql_sessions] @join(...)  # Will fail!
}

# Bad - Missing source dependency
extend type pg_users @dependency(name: "analytics") {
  sessions: [mysql_sessions] @join(...)  # Missing postgres_db dependency!
}
```

**Why**: Hugr uses dependencies to:
- Validate type references
- Determine loading order
- Track data source relationships

### 2. Use Descriptive Prefixes

```json
{
  "name": "postgres_main",
  "prefix": "pg",  // Clear and concise
  "as_module": true
}
```

**Why**:
- Makes type origins clear in queries
- Prevents naming conflicts
- Improves schema readability

### 3. Document Your Extensions

```graphql
"Enhanced customer data with analytics and CRM integration"
extend type pg_customers
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
{
  "Customer engagement score from analytics engine"
  engagement_score: Float @function_call(...)
}
```

**Why**:
- Helps developers understand extended fields
- Appears in GraphQL schema introspection
- Makes API self-documenting

### 4. Filter Cross-Source Joins

```graphql
query {
  pg_customers {
    id
    _join(fields: ["email"]) {
      mysql_sessions(
        fields: ["user_email"]
        filter: { session_date: { gte: "2024-01-01" } }  # Filter to reduce data
      ) {
        id
      }
    }
  }
}
```

**Why**:
- Reduces data transfer between sources
- Improves query performance
- Limits memory usage

### 5. Use inner for Required Relationships

```graphql
query {
  pg_orders {
    id
    _join(fields: ["customer_id"]) {
      pg_customers(
        fields: ["id"]
        inner: true  # Only orders with valid customers
      ) {
        name
      }
    }
  }
}
```

**Why**:
- Filters out orphaned records
- Ensures data integrity in results
- Makes query intent clear

### 6. Optimize SQL Views

```graphql
type optimized_summary
  @view(
    sql: """
      SELECT
        -- Only select needed columns
        o.id, o.total, c.name
      FROM postgres_db.public.orders o
      INNER JOIN analytics.customers c ON o.customer_id = c.id
      WHERE o.status = 'completed'  -- Filter early
      LIMIT 10000  -- Prevent massive result sets
    """
  )
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
{
  id: Int!
  total: Float!
  name: String!
}
```

**Why**:
- Reduces data processed by DuckDB
- Improves query execution time
- Prevents memory issues

### 7. Test Extensions Incrementally

1. Start with simple extensions (single join)
2. Test each dependency separately
3. Gradually add complexity
4. Monitor performance at each step

## Common Patterns

### Pattern 1: Data Enrichment

Extend operational data with analytics:

```graphql
extend type pg_products
  @dependency(name: "postgres_db")  # Source of pg_products
  @dependency(name: "analytics")    # Source of analytics functions and reviews
{
  sales_velocity: Float @function_call(
    references_name: "calculate_sales_velocity"
    module: "analytics"
    args: { product_id: "id" }
  )

  customer_reviews: [mysql_reviews] @join(
    references_name: "mysql_reviews"
    source_fields: ["id"]
    references_fields: ["product_id"]
  )
}
```

### Pattern 2: Unified Reporting

Create views combining multiple sources:

```graphql
type unified_customer_360
  @view(sql: """
    SELECT
      c.id,
      c.name,
      COUNT(DISTINCT o.id) as order_count,
      SUM(s.page_views) as total_page_views,
      MAX(i.last_interaction) as last_interaction
    FROM postgres_db.public.customers c
    LEFT JOIN postgres_db.public.orders o ON c.id = o.customer_id
    LEFT JOIN analytics.sessions s ON c.email = s.user_email
    LEFT JOIN crm.interactions i ON c.id = i.customer_id
    GROUP BY c.id, c.name
  """)
  @dependency(name: "postgres_db")
  @dependency(name: "analytics")
  @dependency(name: "crm")
{
  id: Int!
  name: String!
  order_count: Int!
  total_page_views: Int
  last_interaction: Timestamp
}
```

### Pattern 3: Federated Aggregation

Aggregate data across sources:

```graphql
query {
  postgres_db {
    pg_products {
      id
      name
      # Sales from PostgreSQL
      _join(fields: ["id"]) {
        pg_sales_aggregation(fields: ["product_id"]) {
          total_revenue: revenue { sum }
        }
      }
      # Reviews from MySQL
      _join(fields: ["id"]) {
        mysql_reviews_aggregation(fields: ["product_id"]) {
          avg_rating: rating { avg }
          review_count: _rows_count
        }
      }
    }
  }
}
```

## Troubleshooting

### Error: "Dependency not loaded"

**Cause**: Referenced data source is not loaded or disabled.

**Solution**:
1. Check data source status in admin UI
2. Ensure dependent source is loaded before extension
3. Verify dependency names match exactly

### Error: "Type not found"

**Cause**: Incorrect type name or missing prefix.

**Solution**:
1. Verify type prefix matches data source configuration
2. Check type exists in referenced data source
3. Ensure dependency is declared

### Error: "Circular dependency detected"

**Cause**: Two or more extensions depend on each other.

**Solution**:
1. Review extension dependencies
2. Reorganize schemas to eliminate circular references
3. Consider merging related extensions

### Performance Issues

**Symptoms**: Slow cross-source queries.

**Solutions**:
1. Add filters to reduce data volume
2. Use aggregations instead of fetching all records
3. Create indexed views for common queries
4. Consider materializing frequently-used cross-source data

## See Also

- [Data Sources](/docs/engine-configuration/data-sources/) - Overview of all data source types
- [Extension Data Source](/docs/engine-configuration/data-sources/extension) - Extension setup guide
- [Dynamic Joins (_join)](/docs/graphql/queries/dynamic-joins) - Detailed documentation on dynamic joins
- [Spatial Queries (_spatial)](/docs/graphql/queries/spatial) - Spatial query documentation
- [Joins and Relations](/docs/engine-configuration/schema-definition/data-objects/joins) - Schema-level join definitions
- [Function Calls](/docs/engine-configuration/schema-definition/data-objects/function-calls) - Function call field documentation
- [Views](/docs/engine-configuration/schema-definition/data-objects/views) - SQL view documentation
- [Modules](/docs/engine-configuration/schema-definition/modules) - Module organization
