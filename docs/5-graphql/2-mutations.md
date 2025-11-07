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

Hugr supports automatic value generation for fields using the [`@default` directive](/docs/references/directives#default). This includes sequences, default values, and SQL expressions.

### Sequences and Auto-Increment

Fields with sequences or auto-increment are automatically populated using the `@default` directive with `sequence` parameter:

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

Fields with default values are optional in mutations. The `@default` directive supports several types of defaults:

- **Static values**: `@default(value: "pending")` - A constant value
- **Insert expressions**: `@default(insert_exp: "NOW()")` - SQL expression evaluated on insert
- **Update expressions**: `@default(update_exp: "NOW()")` - SQL expression evaluated on update

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

:::tip
Default expressions (`insert_exp` and `update_exp`) are executed as SQL expressions on the database side. See [Tables - Default Values](/docs/engine-configuration/schema-definition/data-objects/tables#default-values) for more details on supported expressions and [@default directive reference](/docs/references/directives#default) for all parameters.
:::

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

## Access Control and Permissions

Hugr provides role-based access control for mutations, allowing you to restrict who can perform insert, update, and delete operations. Access control is configured in the schema using the [`@auth` directive](../4-engine-configuration/5-access-control.md).

### Role-Based Permissions

Mutations can be restricted to specific roles:

```graphql
type customers @table(name: "customers")
  @auth(
    roles: {
      admin: { allow_insert: true, allow_update: true, allow_delete: true }
      manager: { allow_insert: true, allow_update: true, allow_delete: false }
      user: { allow_insert: false, allow_update: false, allow_delete: false }
    }
  ) {
  id: ID!
  name: String!
  email: String!
}
```

In this example:
- **admin** role: Can insert, update, and delete customers
- **manager** role: Can insert and update customers, but not delete
- **user** role: Read-only access (no mutations allowed)

If a user without proper permissions attempts a mutation, Hugr returns an authorization error.

### Role-Based Default Values

You can set different default values based on the user's role:

```graphql
type orders @table(name: "orders")
  @auth(
    roles: {
      admin: {
        allow_insert: true
        default_values: { status: "approved" }
      }
      user: {
        allow_insert: true
        default_values: { status: "pending" }
      }
    }
  ) {
  id: ID!
  status: String!
  customer_id: Int!
}
```

When an **admin** inserts an order without specifying status, it defaults to `"approved"`. When a **user** inserts an order, it defaults to `"pending"`.

### Mandatory Filters

Roles can have mandatory filters that automatically apply to update and delete mutations, restricting which records can be modified:

```graphql
type documents @table(name: "documents")
  @auth(
    roles: {
      admin: {
        allow_update: true
        allow_delete: true
      }
      user: {
        allow_update: true
        allow_delete: true
        filter: { owner_id: { eq: "$user_id" } }  # Can only modify own documents
      }
    }
  ) {
  id: ID!
  title: String!
  owner_id: Int!
  content: String!
}
```

When a **user** executes an update or delete mutation, the `filter: { owner_id: { eq: "$user_id" } }` is automatically applied, ensuring they can only modify their own documents. The `$user_id` variable is automatically populated from the authenticated user's context.

Example mutation as **user**:

```graphql
mutation {
  # User can only delete their own documents
  delete_documents(filter: { id: { eq: 123 } }) {
    affected_rows
  }
}
```

Even though the filter only specifies `id`, the mandatory filter `owner_id: { eq: "$user_id" }` is automatically added, so the actual executed filter becomes: `{ id: { eq: 123 }, owner_id: { eq: <current_user_id> } }`.

:::tip
See [Access Control](../4-engine-configuration/5-access-control.md) for complete documentation on role-based permissions, default values, mandatory filters, and authentication configuration.
:::

## Error Handling

### How Error Handling Works

Hugr transforms GraphQL mutations into SQL statements and executes them against the data source. Error handling works as follows:

**Schema Validation (by Hugr)**:
- **Type checking**: Field values must match declared types (String, Int, Boolean, etc.)
- **Required fields**: Non-nullable fields marked with `!` must be provided
- **Field existence**: Only fields defined in the schema can be used
- **Input structure**: Mutation input must match generated input types

**Database Errors (from data source)**:
- All other validation is delegated to the underlying database
- Constraint violations, foreign key errors, and business logic errors are returned directly from the database
- No additional validation layer is applied by Hugr

### Database Constraint Violations

When a mutation violates database constraints (unique, foreign key, not null, check constraints), Hugr returns the database error:

```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    email: "existing@example.com"  # Duplicate email (unique constraint)
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
      "path": ["insert_customers"]
    }
  ]
}
```

The error message comes directly from the database (PostgreSQL, MySQL, DuckDB, etc.) and reflects the database's error format.

### Schema Validation Errors

If the GraphQL mutation doesn't match the schema, Hugr returns a validation error before executing the query:

**Missing required field**:
```graphql
mutation {
  insert_customers(data: {
    name: "John Doe"
    # email is required (email: String!) but not provided
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
      "message": "Field 'email' of required type 'String!' was not provided",
      "path": ["insert_customers", "data"]
    }
  ]
}
```

**Type mismatch**:
```graphql
mutation {
  insert_products(data: {
    name: "Product"
    price: "not a number"  # price is Float!, not String
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
      "message": "Float cannot represent non numeric value: \"not a number\"",
      "path": ["insert_products", "data", "price"]
    }
  ]
}
```

### Transaction Failures

When multiple mutations are executed in a single request, they run within a transaction. If any mutation fails, the entire transaction is rolled back:

```graphql
mutation {
  # Step 1: Update inventory
  update_products(filter: { id: { eq: 100 } }, data: { stock: -5 }) {
    affected_rows
  }

  # Step 2: Create order (this will fail if step 1 fails)
  insert_orders(data: {
    product_id: 100
    quantity: 5
  }) {
    id
  }
}
```

If the first mutation fails (e.g., due to a check constraint on stock), the entire transaction rolls back:

```json
{
  "errors": [
    {
      "message": "new row for relation \"products\" violates check constraint \"products_stock_check\"",
      "path": ["update_products"]
    }
  ]
}
```

**Important**: The database transaction is atomic - either all mutations succeed or none do. This ensures data consistency across related operations.

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
- [Access Control](../4-engine-configuration/5-access-control.md) - Role-based permissions, default values, and mandatory filters
- [Tables - Default Values](../4-engine-configuration/3-schema-definition/3-data-objects/2-tables.md#default-values) - Default expressions and auto-generated values
- [@default Directive](../8-references/1-directives.md#default) - Complete reference for @default directive
- [Filtering](./1-queries/3-filtering.md) - Complete guide to filter operators
- [Relations](./1-queries/5-relations.md) - Working with related data
- [Cache Directives](../4-engine-configuration/6-cache.md) - Cache management
- [Data Types](../4-engine-configuration/3-schema-definition/1-data-types.md) - Supported data types
- [Vector Search](./1-queries/11-vector-search.md) - Semantic search with embeddings
