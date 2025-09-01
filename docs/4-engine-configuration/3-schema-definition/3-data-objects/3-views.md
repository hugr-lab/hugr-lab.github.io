---
title: Views
sidebar_position: 3
---

# Views

Views are virtual tables based on SQL queries. They provide a way to simplify complex queries, create derived datasets, or provide different perspectives on your data.

## Basic Views

Define a view using the `@view` directive:

```graphql
type active_customers @view(
  name: "active_customers"
  sql: """
    SELECT * FROM customers 
    WHERE deleted_at IS NULL 
    AND last_order_date > NOW() - INTERVAL '90 days'
  """
) {
  id: Int! @pk
  name: String!
  email: String!
  last_order_date: Timestamp
}
```

## Views from Existing Database Views

If a view already exists in the database, omit the SQL parameter:

```graphql
type customer_summary @view(name: "v_customer_summary") {
  customer_id: Int! @pk
  total_orders: Int!
  total_spent: Float!
  avg_order_value: Float!
}
```

## Complex Views with Joins

Create views that join multiple tables:

```graphql
type shipped_products_view @view(
  name: "shipped_products"
  sql: """
    SELECT 
      o.customer_id,
      o.order_date,
      od.product_id,
      od.quantity,
      od.unit_price,
      p.supplier_id,
      p.category_id
    FROM orders o
    INNER JOIN order_details od ON o.id = od.order_id
    INNER JOIN products p ON od.product_id = p.product_id
    WHERE o.shipped_date IS NOT NULL
  """
) {
  customer_id: Int!
  order_date: Timestamp
  product_id: Int!
  quantity: Int!
  unit_price: Float!
  supplier_id: Int!
  category_id: Int!
}
```

## Parameterized Views

Create views that accept runtime parameters using the `@args` directive:

```graphql
type top_customers @view(
  name: "top_customers"
  sql: """
    SELECT 
      customer_id, 
      SUM(amount) as total_spent
    FROM orders
    WHERE 
      status = 'completed' AND
      order_date BETWEEN 
        COALESCE([$from], [$requested] - INTERVAL '1 month') 
        AND COALESCE([$to], [$requested])
    GROUP BY customer_id
    ORDER BY total_spent DESC
    LIMIT COALESCE([$limit], 10)
  """
) @args(name: "top_customers_input", required: true) {
  customer_id: Int!
  total_spent: Float!
}

input top_customers_input {
  requested: Timestamp!
  from: Timestamp
  to: Timestamp
  limit: Int = 10
}
```

### Using Parameterized Views

```graphql
query {
  top_customers(args: {
    requested: "2024-01-01T00:00:00Z"
    from: "2023-01-01T00:00:00Z"
    to: "2023-12-31T23:59:59Z"
    limit: 20
  }) {
    customer_id
    total_spent
    customer {
      name
      email
    }
  }
}
```

## Views as SQL Functions

For database functions that return record sets:

```graphql
type weather_data @view(name: "get_weather_for_location") 
  @args(name: "weather_input", required: true) {
  location: String!
  temperature: Float!
  humidity: Float!
  recorded_at: Timestamp!
}

input weather_input {
  location_id: Int!
  date_from: Timestamp! 
  date_to: Timestamp!
  include_forecasts: Boolean @named(name: "with_forecast")
}
```

The `@named` directive specifies named parameters for SQL functions.

## Adding Relations to Views

Views can have foreign key relationships just like tables:

```graphql
type order_summary @view(name: "order_summary") {
  order_id: Int! @pk
  customer_id: Int! @field_references(
    references_name: "customers"
    field: "id"
    query: "customer"
    references_query: "order_summaries"
  )
  total_amount: Float!
  order_date: Timestamp
}
```

## Field Directives in Views

You can use field-level directives in view definitions just like in table definitions. Supported directives include: `@field_source`, `@sql`, `@field_references`, `@filter_required`, `@timescale_key`, `@pk`, `@unique`, `@geometry_info`, `@mesurement`, `@join`, and `@function_call`. These directives allow you to control field mapping, relationships, constraints, and additional metadata for fields within views.

## View Limitations

- Views are read-only by default (no mutations generated)
- Cannot have sequences or default values
- Performance depends on underlying query complexity
- Indexes should be created on base tables, not views

