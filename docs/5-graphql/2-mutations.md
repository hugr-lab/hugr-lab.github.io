---
title: "Mutations: Create, Update, Delete"
sidebar_position: 3
---

# Mutations

Mutations in Hugr allow you to modify data through the GraphQL API. Hugr automatically generates mutation operations for all tables defined in your schema, providing create (insert), update, and delete functionality with full transaction support.

## Overview

Hugr mutations provide:

- **CRUD Operations**: Insert, update, and delete records
- **Transactional Integrity**: All mutations in a single request execute atomically
- **Relationship Support**: Insert nested related records in one operation
- **Flexible Filtering**: Update/delete multiple records with complex filters
- **Return Values**: Get back inserted/updated data or operation results
- **Cache Invalidation**: Automatic cache invalidation when data changes
- **Soft Delete Support**: Mark records as deleted without physical removal

## Insert Mutations

### Basic Insert

Insert a single record into a table:

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "john@example.com"
    phone: "+1-555-0123"
    status: "active"
  }) {
    id
    name
    email
    created_at
  }
}
```

Response:
```json
{
  "data": {
    "insert_customers": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Insert with Nested Relations

Insert a record with related data in a single transaction:

```graphql
mutation {
  insert_customers(data: {
    name: "Jane Smith"
    email: "jane@example.com"
    status: "active"

    # One-to-one or many-to-one relation
    profile: {
      bio: "Software engineer"
      avatar_url: "https://example.com/avatar.jpg"
    }

    # One-to-many relation
    addresses: [
      {
        street: "123 Main St"
        city: "New York"
        state: "NY"
        type: "billing"
      }
      {
        street: "456 Oak Ave"
        city: "Boston"
        state: "MA"
        type: "shipping"
      }
    ]

    # Deeply nested relations
    orders: [
      {
        order_date: "2024-01-15"
        status: "pending"
        order_details: [
          {
            product_id: 101
            quantity: 2
            unit_price: 50.00
          }
          {
            product_id: 102
            quantity: 1
            unit_price: 75.00
          }
        ]
      }
    ]
  }) {
    id
    name
    email
    profile {
      bio
    }
    addresses {
      id
      city
      type
    }
    orders {
      id
      status
      order_details {
        product_id
        quantity
        unit_price
      }
    }
  }
}
```

### Batch Insert

Insert multiple records at once:

```graphql
mutation {
  insert_products_batch(data: [
    {
      name: "Product A"
      sku: "PROD-A-001"
      price: 29.99
      category_id: 5
    }
    {
      name: "Product B"
      sku: "PROD-B-001"
      price: 39.99
      category_id: 5
    }
    {
      name: "Product C"
      sku: "PROD-C-001"
      price: 49.99
      category_id: 6
    }
  ]) {
    affected_rows
    success
    message
  }
}
```

## Update Mutations

### Basic Update

Update records matching a filter:

```graphql
mutation {
  update_customers(
    filter: { id: { eq: 123 } }
    data: {
      email: "newemail@example.com"
      phone: "+1-555-9999"
      updated_at: "2024-01-20T15:30:00Z"
    }
  ) {
    affected_rows
    success
    message
  }
}
```

Response:
```json
{
  "data": {
    "update_customers": {
      "affected_rows": 1,
      "success": true,
      "message": "Updated successfully"
    }
  }
}
```

### Bulk Updates

Update multiple records with a single mutation:

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
      on_sale: true
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
        { customer: {
            status: { eq: "active" }
            country: { eq: "USA" }
          }
        }
      ]
    }
    data: {
      status: "cancelled"
      cancelled_reason: "Order expired"
      cancelled_at: "2024-01-20T10:00:00Z"
    }
  ) {
    affected_rows
    message
  }
}
```

### Update with Relations Filter

Update based on related data:

```graphql
mutation {
  update_products(
    filter: {
      category: {
        name: { eq: "Electronics" }
        active: { eq: true }
      }
      supplier: {
        country: { in: ["USA", "Canada"] }
      }
      price: { gte: 100 }
    }
    data: {
      premium: true
      warranty_months: 24
    }
  ) {
    affected_rows
  }
}
```

## Delete Mutations

### Basic Delete

Delete records matching a filter:

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

### Bulk Delete

Delete multiple records:

```graphql
mutation {
  delete_logs(
    filter: {
      created_at: { lt: "2023-01-01" }
      level: { in: ["debug", "info"] }
    }
  ) {
    affected_rows
  }
}
```

### Conditional Delete

Delete with complex conditions:

```graphql
mutation {
  delete_sessions(
    filter: {
      _or: [
        { expires_at: { lt: "2024-01-20T00:00:00Z" } }
        {
          _and: [
            { last_activity: { lt: "2024-01-01" } }
            { user: { status: { eq: "inactive" } } }
          ]
        }
      ]
    }
  ) {
    affected_rows
    message
  }
}
```

### Soft Delete

For tables with soft delete enabled (using `@soft_delete` directive):

```graphql
mutation {
  delete_customers(
    filter: { id: { eq: 123 } }
  ) {
    affected_rows  # Record marked as deleted, not physically removed
  }
}
```

The record is not physically deleted but marked with a `deleted_at` timestamp. To query soft-deleted records, use the `@with_deleted` directive:

```graphql
query {
  customers @with_deleted {
    id
    name
    email
    deleted_at
  }
}
```

To permanently delete soft-deleted records:

```graphql
mutation {
  delete_customers(
    filter: {
      deleted_at: { is_null: false }
    }
    hard_delete: true
  ) {
    affected_rows
  }
}
```

## Return Values

### Insert Return Types

For tables with primary keys, insert mutations return the inserted record(s):

```graphql
mutation {
  insert_customers(data: { name: "Test User", email: "test@example.com" }) {
    id          # Auto-generated primary key
    name
    email
    created_at  # Auto-generated timestamp
  }
}
```

### Operation Result Type

For tables without primary keys, or for update/delete operations, mutations return `OperationResult`:

```graphql
type OperationResult {
  affected_rows: Int!    # Number of rows affected
  success: Boolean!      # Operation success status
  message: String        # Optional message (e.g., error details)
  last_id: BigInt        # Last inserted ID (for inserts with sequences)
}
```

Example:
```json
{
  "data": {
    "update_customers": {
      "affected_rows": 5,
      "success": true,
      "message": "Updated successfully"
    }
  }
}
```

## Transaction Behavior

All mutations within a single GraphQL request execute within a transaction. Either all operations succeed, or all are rolled back:

```graphql
mutation ComplexTransaction {
  # Step 1: Update inventory
  update_inventory: update_products(
    filter: { id: { eq: 100 } }
    data: { stock: 45 }
  ) {
    affected_rows
  }

  # Step 2: Create order
  create_order: insert_orders(data: {
    customer_id: 50
    product_id: 100
    quantity: 5
    total_amount: 250.00
  }) {
    id
    order_number
  }

  # Step 3: Update customer
  update_customer: update_customers(
    filter: { id: { eq: 50 } }
    data: {
      last_order_date: "2024-01-15"
      total_orders: { increment: 1 }
    }
  ) {
    affected_rows
  }

  # Step 4: Insert audit log
  create_audit: insert_audit_logs(data: {
    action: "order_created"
    entity_type: "order"
    user_id: 50
  }) {
    id
  }
}
```

If any operation fails, the entire transaction is rolled back, ensuring data consistency.

**Important:** All mutations in a transaction must operate on tables within the same data source. Cross-data-source transactions are not supported.

## Input Types

Hugr automatically generates input types for mutations:

### Insert Input Type

The insert input type (`<table>_mut_input_data`) includes:
- All direct fields
- Nested relations (one-to-one, many-to-one, one-to-many)

```graphql
input customers_mut_input_data {
  # Scalar fields
  name: String!
  email: String!
  phone: String
  status: String

  # One-to-one or many-to-one relations
  profile: customer_profiles_mut_input_data

  # One-to-many relations
  addresses: [customer_addresses_mut_input_data]
  orders: [orders_mut_input_data]
}
```

### Update Input Type

The update input type (`<table>_mut_data`) contains only direct fields (no relations):

```graphql
input customers_mut_data {
  name: String
  email: String
  phone: String
  status: String
  updated_at: Timestamp
}
```

Relations cannot be updated through update mutations. To modify relations, use separate insert/update/delete mutations for the related tables.

## Auto-Generated Values

### Sequences and Auto-Increment

Fields with sequences or auto-increment are automatically populated:

```graphql
type orders @table(name: "orders") {
  id: BigInt! @pk @default(sequence: "orders_id_seq")
  order_number: Int! @default(sequence: "order_number_seq")
  created_at: Timestamp! @default(insert_exp: "NOW()")
}
```

You don't need to provide these fields in insert mutations:

```graphql
mutation {
  insert_orders(data: {
    customer_id: 50
    total_amount: 100.00
    # id, order_number, and created_at are auto-generated
  }) {
    id           # Auto-generated
    order_number # Auto-generated
    created_at   # Auto-generated
  }
}
```

### Default Values

Fields with default values are optional in mutations:

```graphql
type customers @table(name: "customers") {
  status: String! @default(value: "pending")
  created_at: Timestamp! @default(insert_exp: "NOW()")
  updated_at: Timestamp! @default(
    insert_exp: "NOW()",
    update_exp: "NOW()"
  )
}
```

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "john@example.com"
    # status defaults to "pending"
    # created_at defaults to NOW()
    # updated_at defaults to NOW()
  }) {
    id
    status      # Will be "pending"
    created_at  # Will be current timestamp
  }
}
```

## Cache Invalidation

When using the `@cache` directive on data objects, Hugr automatically invalidates the cache when mutations are executed.

### Schema-Level Cache

If a data object is marked with `@cache` and `tags`:

```graphql
type customers @table(name: "customers")
  @cache(ttl: 300, tags: ["customers"]) {
  id: ID!
  name: String!
  email: String!
}
```

Any mutation on the `customers` table automatically invalidates all cached queries with the `customers` tag:

```graphql
mutation {
  # This mutation will invalidate all cached queries tagged with "customers"
  insert_customers(data: {
    name: "New Customer"
    email: "new@example.com"
  }) {
    id
    name
  }
}
```

### Manual Cache Invalidation

Use the `@invalidate_cache` directive to manually invalidate cache:

```graphql
mutation {
  # Update data and invalidate cache
  update_products(
    filter: { category_id: { eq: 5 } }
    data: { discount_percentage: 20 }
  ) @invalidate_cache {
    affected_rows
  }
}
```

### Selective Cache Invalidation

For complex scenarios, use tags to invalidate specific cached queries:

```graphql
mutation {
  insert_orders(data: {
    customer_id: 123
    total_amount: 500.00
  }) {
    id
  }

  # Invalidate customer-specific cache
  _invalidate_cache_by_tags: invalidate_cache(tags: ["customer_123", "orders"])
}
```

See [Cache Directives](../4-engine-configuration/6-cache.md) for more details.

## Semantic Search Integration

For data objects with embeddings configured for semantic search, use the `summary` parameter to generate vector representations:

```graphql
mutation {
  insert_documents(
    data: {
      title: "Introduction to GraphQL"
      content: "GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data."
      author_id: 10
    }
    summary: "GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data."
  ) {
    id
    title
  }
}
```

The `summary` parameter:
- Triggers embedding generation using the configured embedding model
- Stores the vector representation for semantic search
- Can be different from the content field (e.g., a concise summary)

### Update with Embeddings

When updating documents, provide the `summary` parameter to regenerate embeddings:

```graphql
mutation {
  update_documents(
    filter: { id: { eq: 1 } }
    data: {
      content: "Updated content about GraphQL and its benefits."
    }
    summary: "GraphQL query language benefits and use cases."
  ) {
    affected_rows
  }
}
```

See [Vector Search](./1-queries/11-vector-search.md) for more details on semantic search.

## Error Handling

### Constraint Violations

If a mutation violates database constraints (unique, foreign key, not null), Hugr returns an error:

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "existing@example.com"  # Duplicate email
  }) {
    id
  }
}
```

Response:
```json
{
  "errors": [
    {
      "message": "duplicate key value violates unique constraint \"customers_email_key\"",
      "path": ["insert_customers"],
      "extensions": {
        "code": "CONSTRAINT_VIOLATION"
      }
    }
  ]
}
```

### Validation Errors

Invalid input data returns validation errors:

```json
{
  "errors": [
    {
      "message": "Field 'email' is required but not provided",
      "path": ["insert_customers"],
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

### Transaction Failures

If any mutation in a transaction fails, all operations are rolled back:

```json
{
  "errors": [
    {
      "message": "Transaction rolled back due to constraint violation in update_inventory",
      "extensions": {
        "code": "TRANSACTION_FAILED"
      }
    }
  ]
}
```

## Filter Operators

Mutations support the same filter operators as queries. See [Filtering](./1-queries/3-filtering.md) for complete documentation.

Common operators:
- **Equality**: `eq`, `neq`
- **Comparison**: `gt`, `gte`, `lt`, `lte`
- **List**: `in`, `not_in`
- **Text**: `like`, `ilike`, `starts_with`, `ends_with`
- **Null checks**: `is_null`
- **Boolean logic**: `_and`, `_or`, `_not`
- **Relations**: Filter by related object fields

Example with multiple operators:

```graphql
mutation {
  delete_orders(
    filter: {
      _or: [
        { status: { in: ["cancelled", "expired"] } }
        {
          _and: [
            { created_at: { lt: "2023-01-01" } }
            { customer: {
                status: { eq: "inactive" }
                last_login: { lt: "2022-01-01" }
              }
            }
          ]
        }
      ]
    }
  ) {
    affected_rows
  }
}
```

## Best Practices

### Use Transactions for Related Operations

Always group related mutations in a single request to ensure atomicity:

```graphql
# Good: Atomic transaction
mutation {
  deduct_inventory: update_products(
    filter: { id: { eq: 100 } }
    data: { stock: { decrement: 5 } }
  ) {
    affected_rows
  }

  create_order: insert_orders(data: {
    product_id: 100
    quantity: 5
  }) {
    id
  }
}

# Bad: Separate requests (not atomic)
# Request 1
mutation { update_products(...) { affected_rows } }
# Request 2
mutation { insert_orders(...) { id } }
```

### Request Only Needed Fields

For insert mutations with large schemas, only request fields you need:

```graphql
mutation {
  insert_customers(data: { ... }) {
    id  # Only get the ID back
  }
}
```

### Use Batch Operations

For multiple inserts, use batch operations for better performance:

```graphql
# Good: Single batch operation
mutation {
  insert_products_batch(data: [
    { name: "Product 1", price: 10 }
    { name: "Product 2", price: 20 }
    { name: "Product 3", price: 30 }
  ]) {
    affected_rows
  }
}

# Avoid: Multiple single inserts
mutation {
  p1: insert_products(data: { name: "Product 1", price: 10 }) { id }
  p2: insert_products(data: { name: "Product 2", price: 20 }) { id }
  p3: insert_products(data: { name: "Product 3", price: 30 }) { id }
}
```

### Validate Input Data

Validate data on the client side before sending mutations to reduce errors:

```typescript
// Client-side validation
if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  throw new Error("Invalid email format");
}

// Then send mutation
const result = await client.mutate({
  mutation: INSERT_CUSTOMER,
  variables: { email }
});
```

### Handle Errors Gracefully

Always check for errors in mutation responses:

```typescript
const result = await client.mutate({
  mutation: INSERT_CUSTOMER,
  variables: { data }
});

if (result.errors) {
  // Handle specific error types
  result.errors.forEach(error => {
    if (error.extensions?.code === 'CONSTRAINT_VIOLATION') {
      // Handle constraint violation
    } else if (error.extensions?.code === 'BAD_USER_INPUT') {
      // Handle validation error
    }
  });
}
```

### Use Aliases for Multiple Mutations

When executing multiple mutations of the same type, use aliases:

```graphql
mutation {
  createCustomer1: insert_customers(data: { ... }) { id }
  createCustomer2: insert_customers(data: { ... }) { id }
  createCustomer3: insert_customers(data: { ... }) { id }
}
```

### Consider Cache Invalidation Strategy

Plan your cache invalidation strategy when using `@cache`:

```graphql
# Strategy 1: Let auto-invalidation work
type products @table(name: "products")
  @cache(ttl: 300, tags: ["products"]) {
  # ...
}

# Strategy 2: Manual selective invalidation
mutation {
  update_products(filter: { category_id: { eq: 5 } }, data: { ... }) {
    affected_rows
  }

  # Only invalidate category-specific cache
  _invalidate: invalidate_cache(tags: ["products_category_5"])
}
```

## See Also

- [Mutations Definition](../4-engine-configuration/3-schema-definition/3-data-objects/5-mutations.md) - Learn how to define mutations in schema
- [Filtering](./1-queries/3-filtering.md) - Complete guide to filter operators
- [Relations](./1-queries/5-relations.md) - Working with related data
- [Cache Directives](../4-engine-configuration/6-cache.md) - Cache management
- [Data Types](../4-engine-configuration/3-schema-definition/1-data-types.md) - Supported data types
- [Vector Search](./1-queries/11-vector-search.md) - Semantic search with embeddings
