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

Hugr provides role-based access control (RBAC) for mutations through the `role_permissions` table in the `core` module. You can restrict who can perform insert, update, and delete operations, apply mandatory filters, and enforce default values.

:::tip
Access control is managed through the GraphQL API by inserting/updating records in the `core.roles` and `core.role_permissions` tables. Mutations are accessed through the `core` mutation type (the mutation type for the `core` module). See [Access Control](../4-engine-configuration/5-access-control.md) for complete documentation.
:::

### How Mutation Permissions Work

Permissions are configured in the `role_permissions` table with the following key fields:

- **role**: The role name (e.g., "user", "admin", "editor")
- **type_name**: The mutation name (e.g., "insert_articles", "update_users", "delete_orders") or "Mutation" for all mutations
- **field_name**: The field name or `"*"` for all fields
- **disabled**: When `true`, blocks access completely
- **filter**: Mandatory filter automatically applied to update/delete mutations (row-level security)
- **data**: Default values automatically injected into insert/update mutations

### Restricting Mutations by Role

**Example: Block all mutations for readonly role**

```graphql
mutation {
  core {  # Mutation type for the core module
    insert_role_permissions(data: {  # Mutation field
      role: "readonly"
      type_name: "Mutation"
      field_name: "*"
      disabled: true
    }) {
      role
      type_name
    }
  }
}
```

This blocks all mutations for users with the `readonly` role.

**Example: Allow specific mutations only**

```graphql
mutation {
  core {  # Mutation type for the core module
    # Block all mutations
    blockAll: insert_role_permissions(data: {
      role: "contributor"
      type_name: "Mutation"
      field_name: "*"
      disabled: true
    }) {
      role
    }

    # But allow insert_articles
    allowInsert: insert_role_permissions(data: {
      role: "contributor"
      type_name: "Mutation"
      field_name: "insert_articles"
      disabled: false
    }) {
      role
    }
  }
}
```

Due to permission priority (exact match wins over wildcard), the `contributor` role can only execute `insert_articles` mutations.

### Enforcing Default Values

Use the `data` field to automatically inject values into mutations that cannot be overridden by the user:

**Example: Auto-set author on article creation**

```graphql
mutation {
  core {  # Mutation type for the core module
    insert_role_permissions(data: {
      role: "editor"
      type_name: "insert_articles"
      field_name: "*"
      data: {
        author_id: "[$auth.user_id]"
        status: "draft"
        created_by: "[$auth.user_name]"
      }
    }) {
      role
      type_name
    }
  }
}
```

When an `editor` inserts an article, these values are automatically set:
- `author_id` is set to the authenticated user's ID
- `status` is always set to `"draft"`
- `created_by` is set to the user's name

**Authentication variables** like `[$auth.user_id]` and `[$auth.user_name]` are dynamically replaced with the authenticated user's information.

### Row-Level Security with Filters

Use the `filter` field to restrict which rows can be modified by update and delete mutations:

**Example: Users can only modify their own documents**

```graphql
mutation {
  core {  # Mutation type for the core module
    # Restrict update_documents
    update: insert_role_permissions(data: {
      role: "user"
      type_name: "update_documents"
      field_name: "*"
      filter: {
        owner_id: { eq: "[$auth.user_id]" }
      }
    }) {
      role
    }

    # Restrict delete_documents
    delete: insert_role_permissions(data: {
      role: "user"
      type_name: "delete_documents"
      field_name: "*"
      filter: {
        owner_id: { eq: "[$auth.user_id]" }
      }
    }) {
      role
    }
  }
}
```

When a `user` executes an update or delete:

```graphql
mutation {
  # User's mutation
  delete_documents(filter: { id: { eq: 123 } }) {
    affected_rows
  }
}
```

The mandatory filter is automatically merged, so the actual filter becomes:
```json
{
  "id": { "eq": 123 },
  "owner_id": { "eq": "<current_user_id>" }
}
```

This ensures users can only modify their own documents, even if they try to specify different IDs.

### Complete Example: Multi-Tenant Application

```graphql
mutation {
  core {  # Mutation type for the core module
    insert_roles(data: {
      name: "tenant_user"
      description: "User within a tenant organization"
      permissions: [
        # Users can only see their tenant's customers
        {
          type_name: "customers"
          field_name: "*"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
        # Auto-set tenant_id on insert
        {
          type_name: "insert_customers"
          field_name: "*"
          data: {
            tenant_id: "[$auth.tenant_id]"
          }
        }
        # Can only update own tenant's customers
        {
          type_name: "update_customers"
          field_name: "*"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
        # Can only delete own tenant's customers
        {
          type_name: "delete_customers"
          field_name: "*"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
      ]
    }) {
      name
      permissions {
        type_name
        filter
        data
      }
    }
  }
}
```

### Authentication Variables

Available variables for use in `filter` and `data` fields:

| Variable | Description | Example |
|----------|-------------|---------|
| `[$auth.user_id]` | User ID (string) | "12345" |
| `[$auth.user_id_int]` | User ID (integer) | 12345 |
| `[$auth.user_name]` | Username | "john.doe" |
| `[$auth.role]` | User's role | "editor" |
| `[$auth.auth_type]` | Authentication type | "jwt", "apikey" |

You can also reference custom JWT claims like `[$auth.tenant_id]`, `[$auth.department_id]`, etc.

### Permission Priority

When multiple permissions match, Hugr uses the **most specific** one:

1. **Exact match**: `(type_name: "insert_users", field_name: "email")`
2. **Type with wildcard field**: `(type_name: "insert_users", field_name: "*")`
3. **Wildcard type with exact field**: `(type_name: "*", field_name: "email")`
4. **Both wildcards**: `(type_name: "*", field_name: "*")`
5. **No match**: Allowed by default

This allows you to create broad rules with specific exceptions.

### See Also

- [Access Control](../4-engine-configuration/5-access-control.md) - Complete RBAC documentation
- [Authentication Setup](../7-deployment/4-auth.md) - Configure authentication
- [Filtering](./1-queries/3-filtering.md) - Filter syntax for row-level security

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

### Error Types

Errors from mutations fall into two categories:

1. **Schema Validation Errors** - Caught by Hugr before executing the query:
   - Type mismatches (e.g., passing string when Float! is expected)
   - Missing required fields
   - Unknown fields not in schema
   - Invalid input structure

2. **Database Errors** - Returned directly from the database:
   - Constraint violations (unique, foreign key, not null, check)
   - Permission/access errors
   - Database-specific validation errors

The error message format and content depends on the underlying database (PostgreSQL, MySQL, DuckDB, etc.).

### Transaction Behavior

When multiple mutations are executed in a single request, they run within a database transaction. If any mutation fails, the entire transaction is rolled back automatically. This ensures data consistency across related operations.

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
