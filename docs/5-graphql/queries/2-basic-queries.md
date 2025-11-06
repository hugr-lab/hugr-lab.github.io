---
title: "Basic Queries"
sidebar_position: 2
---

# Basic Queries

Hugr automatically generates optimized query types for retrieving single records by primary keys and unique constraints. These queries provide the fastest way to fetch individual records when you know their identifying values.

## Query by Primary Key

For every data object with a `@pk` directive, Hugr generates a `<object>_by_pk` query that retrieves a single record:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    email
    phone
    created_at
  }
}
```

Response:
```json
{
  "data": {
    "customers_by_pk": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Composite Primary Keys

For tables with multiple primary key fields, all key fields are required:

```graphql
# Schema definition
type order_details @table(name: "order_details") {
  order_id: Int! @pk
  product_id: Int! @pk
  quantity: Int!
  unit_price: Float!
}
```

Query with composite key:
```graphql
query {
  order_details_by_pk(order_id: 100, product_id: 50) {
    order_id
    product_id
    quantity
    unit_price
    total: amount  # Calculated field
  }
}
```

### Non-Existent Records

If no record matches the primary key, the query returns `null`:

```graphql
query {
  customers_by_pk(id: 99999) {
    id
    name
  }
}
```

Response:
```json
{
  "data": {
    "customers_by_pk": null
  }
}
```

## Query by Unique Constraint

For each `@unique` directive on a data object, Hugr generates a query named `<object>_by_<field>`:

```graphql
# Schema definition
type customers @table(name: "customers")
  @unique(fields: ["email"]) {
  id: Int! @pk
  name: String!
  email: String!
  phone: String
}
```

Query by unique email:
```graphql
query {
  customers_by_email(email: "john@example.com") {
    id
    name
    email
    phone
  }
}
```

### Multiple Field Unique Constraints

For unique constraints on multiple fields:

```graphql
# Schema definition
type products @table(name: "products")
  @unique(fields: ["sku", "supplier_id"], query_suffix: "sku_supplier") {
  id: Int! @pk
  sku: String!
  supplier_id: Int!
  name: String!
  price: Float!
}
```

Query by multiple unique fields:
```graphql
query {
  products_by_sku_supplier(sku: "PROD-123", supplier_id: 5) {
    id
    name
    price
  }
}
```

### Multiple Unique Constraints

A data object can have multiple unique constraints, each generating its own query:

```graphql
type users @table(name: "users")
  @unique(fields: ["email"])
  @unique(fields: ["username"]) {
  id: Int! @pk
  email: String!
  username: String!
  name: String!
}
```

This generates two queries:
```graphql
query {
  # Query by email
  user_by_email: users_by_email(email: "john@example.com") {
    id
    username
    name
  }

  # Query by username
  user_by_username: users_by_username(username: "johndoe") {
    id
    email
    name
  }
}
```

## Fetching Related Data

Primary key and unique constraint queries support selecting related data:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    email

    # Related orders
    orders(
      filter: { status: { eq: "pending" } }
      order_by: [{ field: "created_at", direction: DESC }]
      limit: 5
    ) {
      id
      status
      total
      created_at
    }

    # Aggregated order statistics
    orders_aggregation {
      _rows_count
      total {
        sum
        avg
      }
    }
  }
}
```

## Selecting Nested Objects

Include nested object fields and calculated fields:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    email

    # Nested object field
    address {
      street
      city
      state
      postal_code
      country
    }

    # Calculated field
    full_address

    # Function call field
    credit_score(as_of_date: "2024-03-01")
  }
}
```

## Using Variables

Use GraphQL variables for dynamic queries:

```graphql
query GetCustomer($customerId: Int!) {
  customers_by_pk(id: $customerId) {
    id
    name
    email
    created_at
  }
}
```

Variables:
```json
{
  "customerId": 123
}
```

With unique constraints:
```graphql
query GetCustomerByEmail($email: String!) {
  customers_by_email(email: $email) {
    id
    name
    phone
  }
}
```

Variables:
```json
{
  "email": "john@example.com"
}
```

## Parameterized Views

For parameterized views (with `@args` directive), pass required arguments:

```graphql
# Schema definition
type monthly_sales @view(
  name: "monthly_sales_view"
  sql: "SELECT * FROM get_monthly_sales([year], [month])"
) @args(name: "monthly_sales_args", required: true) {
  product_id: Int! @pk
  product_name: String!
  total_sales: Float!
  units_sold: Int!
}

input monthly_sales_args {
  year: Int!
  month: Int!
}
```

Query with args:
```graphql
query {
  monthly_sales_by_pk(
    product_id: 456
    args: { year: 2024, month: 3 }
  ) {
    product_id
    product_name
    total_sales
    units_sold
  }
}
```

## Soft Deleted Records

For tables with soft delete enabled, deleted records are excluded by default:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    deleted_at  # Will be NULL if not deleted
  }
}
```

To include soft deleted records, use the `@with_deleted` directive:

```graphql
query {
  customers_by_pk(id: 123) @with_deleted {
    id
    name
    deleted_at
  }
}
```

## Fragments for Reusability

Use fragments to define reusable selection sets:

```graphql
fragment CustomerBasicInfo on customers {
  id
  name
  email
  phone
}

fragment CustomerWithOrders on customers {
  ...CustomerBasicInfo
  orders(limit: 5) {
    id
    total
    status
  }
}

query {
  customer1: customers_by_pk(id: 123) {
    ...CustomerWithOrders
  }

  customer2: customers_by_email(email: "jane@example.com") {
    ...CustomerBasicInfo
  }
}
```

## Multiple Queries in One Request

Fetch multiple records with aliases:

```graphql
query {
  customer1: customers_by_pk(id: 123) {
    id
    name
    email
  }

  customer2: customers_by_pk(id: 456) {
    id
    name
    email
  }

  customer3: customers_by_email(email: "admin@example.com") {
    id
    name
  }

  product: products_by_pk(id: 789) {
    id
    name
    price
  }
}
```

## Field Selection

### Selecting Specific Fields

Always select only the fields you need:

```graphql
# Good - Select only needed fields
query {
  customers_by_pk(id: 123) {
    id
    name
    email
  }
}

# Avoid - Selecting unnecessary fields
query {
  customers_by_pk(id: 123) {
    id
    name
    email
    phone
    fax
    address
    city
    state
    postal_code
    country
    region
    created_at
    updated_at
    notes
  }
}
```

### Field Aliases

Rename fields in the response:

```graphql
query {
  customers_by_pk(id: 123) {
    customerId: id
    customerName: name
    emailAddress: email
    registrationDate: created_at
  }
}
```

Response:
```json
{
  "data": {
    "customers_by_pk": {
      "customerId": 123,
      "customerName": "John Doe",
      "emailAddress": "john@example.com",
      "registrationDate": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Performance Considerations

### 1. Use Appropriate Indexes

Ensure indexes exist on:
- Primary key fields (usually automatic)
- Unique constraint fields
- Foreign key fields when selecting relations

### 2. Limit Related Data

When fetching relations, always use `limit`:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    orders(limit: 10) {  # Limit to prevent large responses
      id
      total
    }
  }
}
```

### 3. Select Only Required Fields

Avoid selecting large fields unless necessary:

```graphql
# Avoid selecting large JSON or text fields
query {
  customers_by_pk(id: 123) {
    id
    name
    # Skip: large_metadata, detailed_notes, etc.
  }
}
```

### 4. Use Aggregations Instead

When you only need counts or statistics:

```graphql
query {
  customers_by_pk(id: 123) {
    id
    name
    # Instead of: orders { id }
    # Use aggregation:
    orders_aggregation {
      _rows_count
    }
  }
}
```

## Common Patterns

### Check if Record Exists

```graphql
query CheckExists($id: Int!) {
  customers_by_pk(id: $id) {
    id
  }
}
```

If result is `null`, record doesn't exist.

### Get Record with Specific Relations

```graphql
query GetCustomerWithActiveOrders($id: Int!) {
  customers_by_pk(id: $id) {
    id
    name
    email
    active_orders: orders(
      filter: { status: { in: ["pending", "processing"] } }
    ) {
      id
      status
      total
    }
  }
}
```

### Fetch Multiple Related Records

```graphql
query GetOrderDetails($orderId: Int!) {
  orders_by_pk(id: $orderId) {
    id
    status
    total
    customer {
      id
      name
      email
    }
    items: order_details {
      product {
        id
        name
      }
      quantity
      unit_price
    }
    shipper {
      name
      phone
    }
  }
}
```

## Error Handling

Handle cases where records might not exist:

```typescript
const query = `
  query GetCustomer($id: Int!) {
    customers_by_pk(id: $id) {
      id
      name
      email
    }
  }
`;

const result = await client.query(query, { id: 123 });

if (result.data.customers_by_pk === null) {
  console.error('Customer not found');
} else {
  console.log('Customer:', result.data.customers_by_pk);
}
```

## Next Steps

- Learn about [Filtering](./3-filtering.md) for complex queries with multiple conditions
- See [Relations](./5-relations.md) for working with related data
- Check [Aggregations](./7-aggregations.md) for computing statistics
