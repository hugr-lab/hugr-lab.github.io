---
title: Relations and Foreign Keys
sidebar_position: 7
---

# Relations and Foreign Keys

Hugr supports defining relationships between data objects using foreign key constraints. These relationships enable filtering by related data, subqueries, and cascading operations without requiring database-level foreign keys.

## Field-Level Foreign Keys

Define a foreign key on a single field using `@field_references`:

```graphql
type orders @table(name: "orders") {
  id: Int! @pk
  customer_id: Int! @field_references(
    name: "orders_customer_fk"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer who placed the order"
    references_query: "orders"
    references_description: "Orders placed by this customer"
  )
  total: Float!
}
```

This generates:
- A `customer` field on `orders` to fetch the related customer
- An `orders` field on `customers` to fetch related orders
- Filter capabilities on both sides

## Object-Level Foreign Keys

For multi-field relationships, use `@references` at the object level:

```graphql
type order_details @table(name: "order_details")
  @references(
    name: "order_details_supplier_product_fk"
    references_name: "supplier_products"
    source_fields: ["supplier_id", "product_id"]
    references_fields: ["supplier_id", "product_id"]
    query: "supplier_product"
    references_query: "order_details"
  ) {
  id: Int! @pk
  order_id: Int!
  supplier_id: Int!
  product_id: Int!
  quantity: Int!
}
```

## Many-to-Many Relationships

Define junction tables with `is_m2m: true`:

```graphql
type product_categories @table(name: "product_categories", is_m2m: true) {
  product_id: Int! @pk @field_references(
    references_name: "products"
    field: "id"
    query: "product"
    references_query: "categories"
    references_description: "Categories for this product"
  )
  category_id: Int! @pk @field_references(
    references_name: "categories"
    field: "id"
    query: "category"
    references_query: "products"
    references_description: "Products in this category"
  )
}
```

This creates direct relationships between products and categories:

```graphql
query {
  products {
    id
    name
    categories {  # Direct access to categories
      id
      name
    }
  }
  
  categories {
    id
    name
    products {  # Direct access to products
      id
      name
    }
  }
}
```

## Using Relations in Queries

### Subqueries

Fetch related data in a single query:

```graphql
query {
  customers {
    id
    name
    orders(
      filter: { status: { eq: "pending" } }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 5
    ) {
      id
      total
      order_details {
        product {
          name
          price
        }
        quantity
      }
    }
  }
}
```

### Filtering by Relations

Filter parent records based on related data:

```graphql
query {
  # Customers with pending orders over $1000
  customers(filter: {
    orders: {
      any_of: {
        _and: [
          { status: { eq: "pending" } }
          { total: { gt: 1000 } }
        ]
      }
    }
  }) {
    id
    name
  }
}
```

### Aggregating Relations

Aggregate related data:

```graphql
query {
  customers {
    id
    name
    orders_aggregation {
      _rows_count
      total {
        sum
        avg
      }
    }
    # Filtered aggregation
    recent_orders: orders_aggregation(
      filter: { created_at: { gte: "2024-01-01" } }
    ) {
      _rows_count
      total {
        sum
      }
    }
  }
}
```

## Relation Options

### Inner Joins

Use `inner: true` to exclude records without relations:

```graphql
query {
  customers {
    id
    name
    orders(inner: true) {  # Only customers with orders
      id
      total
    }
  }
  order_details {
    id
    product(inner: true) {  # Only order details with products that are present in the orders with amount > 100
      name
      order_details_aggregation (inner: true, filter: { order: { amount: { gt: 100 } } } ) {
        quantity {
          sum
        }
      }
    }
    order(inner: true) {  # Only order details with valid orders
      id
      total
    }
  }
}
```

### Nested Pagination

Control pagination at relation level:

```graphql
query {
  customers(limit: 10) {
    id
    name
    orders(
      nested_limit: 5
      nested_offset: 0
      nested_order_by: [{ field: "created_at", direction: DESC }]
    ) {
      id
      created_at
    }
  }
}
```

## Cascading Operations

### Insert with Relations

Create related records in a single mutation:

```graphql
mutation {
  insert_customers(data: {
    name: "New Customer"
    email: "customer@example.com"
    orders: [
      {
        total: 150.00
        status: "pending"
        order_details: [
          {
            product_id: 1
            quantity: 2
            unit_price: 75.00
          }
        ]
      }
    ]
  }) {
    id
    orders {
      id
      order_details {
        id
      }
    }
  }
}
```

### Many-to-Many Insert

For M2M relationships, link existing records:

```graphql
mutation {
  insert_products(data: {
    name: "New Product"
    price: 99.99
    categories: [
      { id: 1 }  # Link to existing category
      { id: 2 }
    ]
  }) {
    id
    categories {
      id
      name
    }
  }
}
```

## Self-Referential Relations

Define hierarchical relationships:

```graphql
type employees @table(name: "employees") {
  id: Int! @pk
  name: String!
  manager_id: Int @field_references(
    references_name: "employees"
    field: "id"
    query: "manager"
    references_query: "subordinates"
    references_description: "Employees reporting to this manager"
  )
}
```

Query hierarchical data:

```graphql
query {
  employees {
    id
    name
    manager {
      id
      name
    }
    subordinates {
      id
      name
    }
  }
}
```

## Cross-Source Relations

Cross-source relations are not supported through `@field_references` or `@references` directives. To create relationships between different data sources, use the extension data source with `@join` or `@function_call` directives. See the [Joins and Spatial Joins](./8-joins.md) section for details.

## Performance Considerations

### N+1 Query Problem

Hugr optimizes relation queries to avoid N+1 problems by batching subqueries.

### Limiting Subquery Results

Always limit subquery results for large datasets:

```graphql
query {
  customers {
    id
    recent_orders: orders(
      filter: { created_at: { gte: "2024-01-01" } }
      limit: 10
    ) {
      id
    }
  }
}
```

### Index Requirements

Ensure indexes exist on:
- Foreign key fields
- Fields used in relation filters
- Fields used in relation sorting