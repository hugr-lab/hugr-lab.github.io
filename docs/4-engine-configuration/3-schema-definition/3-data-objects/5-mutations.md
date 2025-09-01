---
title: Mutations
sidebar_position: 5
---

# Mutations

Hugr automatically generates mutation operations for tables (not views). These mutations handle data modifications with support for relationships, transactions, and returning affected data.

## Insert Mutations

Insert single or multiple records:

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "john@example.com"
    status: "active"
  }) {
    id
    name
    email
    created_at
  }
}
```

### Batch Inserts

Insert multiple records in a single mutation:

```graphql
mutation {
  insert_products(data: [
    { name: "Product A", price: 99.99 }
    { name: "Product B", price: 149.99 }
  ]) {
    id
    name
    price
  }
}
```

### Insert with Relations

Insert related records in a single transaction:

```graphql
mutation {
  insert_customers(data: {
    name: "Jane Smith"
    email: "jane@example.com"
    addresses: [
      {
        street: "123 Main St"
        city: "New York"
        type: "billing"
      }
      {
        street: "456 Oak Ave"
        city: "Boston"
        type: "shipping"
      }
    ]
    orders: [
      {
        order_date: "2024-01-15"
        status: "pending"
        order_details: [
          {
            product_id: 1
            quantity: 2
            unit_price: 50.00
          }
        ]
      }
    ]
  }) {
    id
    name
    addresses {
      id
      type
      city
    }
    orders {
      id
      status
      order_details {
        product_id
        quantity
      }
    }
  }
}
```

### Return Values

For tables with primary keys, the mutation returns the inserted record(s). Without primary keys, it returns an `OperationResult`:

```graphql
type OperationResult {
  affected_rows: Int!
  success: Boolean!
  message: String
  last_id: BigInt
}
```

## Update Mutations

Update records matching filter conditions:

```graphql
mutation {
  update_customers(
    filter: { id: { eq: 123 } }
    data: {
      email: "newemail@example.com"
      updated_at: "2024-01-15T10:00:00Z"
    }
  ) {
    affected_rows
    success
    message
  }
}
```

### Bulk Updates

Update multiple records:

```graphql
mutation {
  update_products(
    filter: { 
      category_id: { eq: 5 }
      status: { eq: "active" }
    }
    data: {
      discount_percentage: 15
      sale_ends_at: "2024-02-01T00:00:00Z"
    }
  ) {
    affected_rows
    success
  }
}
```

### Conditional Updates

Use complex filters for targeted updates:

```graphql
mutation {
  update_orders(
    filter: {
      _and: [
        { status: { eq: "pending" } }
        { created_at: { lt: "2024-01-01" } }
        { customer: { status: { eq: "active" } } }
      ]
    }
    data: {
      status: "cancelled"
      cancelled_reason: "Order expired"
    }
  ) {
    affected_rows
  }
}
```

## Delete Mutations

Delete records matching filter conditions:

```graphql
mutation {
  delete_customers(
    filter: { id: { eq: 123 } }
  ) {
    affected_rows
    success
    message
  }
}
```

### Bulk Deletes

Delete multiple records:

```graphql
mutation {
  delete_old_logs(
    filter: {
      created_at: { lt: "2023-01-01" }
    }
  ) {
    affected_rows
  }
}
```

### Soft Delete

For tables with soft delete enabled:

```graphql
mutation {
  delete_customers(
    filter: { id: { eq: 123 } }
  ) {
    affected_rows  # Record marked as deleted, not physically removed
  }
}
```

To query including soft-deleted records:

```graphql
query {
  customers @with_deleted {
    id
    name
    deleted_at
  }
}
```

## Input Types

### Insert Input Type

Generated for each table, includes all fields and relations:

```graphql
input customers_mut_input_data {
  # Direct fields
  name: String!
  email: String!
  status: String
  
  # Related records (one-to-one/many-to-one)
  profile: customer_profiles_mut_input_data
  
  # Related records (one-to-many)
  addresses: [customer_addresses_mut_input_data]
  orders: [orders_mut_input_data]
}
```

### Update Input Type

Contains only direct fields (no relations):

```graphql
input customers_mut_data {
  name: String
  email: String
  status: String
  updated_at: Timestamp
}
```

## Transaction Behavior

All mutations within a single GraphQL request execute in a transaction:

```graphql
mutation ComplexTransaction {
  # All operations succeed or fail together
  update_inventory: update_products(
    filter: { id: { eq: 100 } }
    data: { stock: 45 }
  ) {
    affected_rows
  }
  
  create_order: insert_orders(data: {
    customer_id: 50
    product_id: 100
    quantity: 5
  }) {
    id
  }
  
  update_customer: update_customers(
    filter: { id: { eq: 50 } }
    data: { last_order_date: "2024-01-15" }
  ) {
    affected_rows
  }
}
```

## Auto-Generated Values

### Sequences

For fields with sequences:

```graphql
type orders @table(name: "orders") {
  id: BigInt! @pk @default(sequence: "orders_id_seq")
  order_number: Int! @default(sequence: "order_number_seq")
}
```

The ID fields are auto-populated during insert.

### Default Values

Fields with default values are optional in mutations:

```graphql
type customers @table(name: "customers") {
  status: String! @default(value: "pending")
  created_at: Timestamp! @default(value: "NOW()")
}
```

## Error Handling

Mutations return errors in the standard GraphQL error format:

```json
{
  "errors": [
    {
      "message": "Unique constraint violation",
      "extensions": {
        "code": "UNIQUE_VIOLATION",
        "constraint": "customers_email_key"
      }
    }
  ]
}
```