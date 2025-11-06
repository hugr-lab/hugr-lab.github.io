---
title: "Filtering"
sidebar_position: 3
---

# Filtering

Hugr provides powerful filtering capabilities for querying data with complex conditions. Filters can be applied to scalar fields, relations, nested objects, and combined using boolean logic.

## Basic Filters

### Scalar Field Filters

Filter by simple field comparisons:

```graphql
query {
  customers(filter: { country: { eq: "USA" } }) {
    id
    name
    country
  }
}
```

### Multiple Conditions (Implicit AND)

Multiple filters at the same level are combined with AND:

```graphql
query {
  products(filter: {
    price: { gte: 10.0 }
    category: { eq: "electronics" }
    in_stock: { eq: true }
  }) {
    id
    name
    price
    category
  }
}
```

Equivalent to SQL:
```sql
WHERE price >= 10.0 AND category = 'electronics' AND in_stock = true
```

## Filter Operators by Type

### Numeric Filters (Int, Float, BigInt)

```graphql
query {
  products(filter: {
    price: {
      gt: 10.0      # Greater than
      gte: 10.0     # Greater than or equal
      lt: 100.0     # Less than
      lte: 100.0    # Less than or equal
      eq: 50.0      # Equal to
      ne: 75.0      # Not equal to
      in: [10.0, 20.0, 30.0]  # In list
      is_null: false  # Is NULL / NOT NULL
    }
  }) {
    id
    name
    price
  }
}
```

### String Filters

```graphql
query {
  customers(filter: {
    name: {
      eq: "John Doe"           # Exact match
      ne: "Admin"              # Not equal
      like: "John%"            # Pattern match (% wildcard)
      ilike: "john%"           # Case-insensitive pattern match
      in: ["John", "Jane"]     # In list
      regex: "^[A-Z][a-z]+"    # Regular expression
      is_null: false           # Is NULL / NOT NULL
    }
  }) {
    id
    name
  }
}
```

Pattern examples:
- `"John%"` - Starts with "John"
- `"%Doe"` - Ends with "Doe"
- `"%John%"` - Contains "John"
- `"J_hn"` - Matches "John", "Jahn" (single character wildcard)

### Boolean Filters

```graphql
query {
  products(filter: {
    in_stock: { eq: true }
    is_featured: { is_null: false }
  }) {
    id
    name
    in_stock
  }
}
```

### Date and Timestamp Filters

```graphql
query {
  orders(filter: {
    created_at: {
      gte: "2024-01-01T00:00:00Z"  # After or equal
      lt: "2024-02-01T00:00:00Z"   # Before
    }
    shipped_date: {
      is_null: false  # Has been shipped
    }
  }) {
    id
    created_at
    shipped_date
  }
}
```

### JSON/JSONB Filters

Filter by JSON field values:

```graphql
query {
  events(filter: {
    metadata: {
      contains: { "user_id": 123 }           # Contains key-value
      has_key: "transaction_id"              # Has key
      path_exists: "$.user.preferences"      # JSON path exists
    }
  }) {
    id
    metadata
  }
}
```

## Boolean Logic

### AND Conditions

Combine multiple conditions that must all be true:

```graphql
query {
  orders(filter: {
    _and: [
      { status: { eq: "completed" } }
      { total: { gte: 100.0 } }
      { created_at: { gte: "2024-01-01" } }
    ]
  }) {
    id
    status
    total
  }
}
```

### OR Conditions

Match any of the specified conditions:

```graphql
query {
  customers(filter: {
    _or: [
      { country: { eq: "USA" } }
      { country: { eq: "Canada" } }
      { vip_status: { eq: true } }
    ]
  }) {
    id
    name
    country
  }
}
```

### NOT Conditions

Negate a filter condition:

```graphql
query {
  products(filter: {
    _not: {
      category: { in: ["discontinued", "archived"] }
    }
  }) {
    id
    name
    category
  }
}
```

### Complex Boolean Logic

Combine AND, OR, and NOT:

```graphql
query {
  orders(filter: {
    _and: [
      {
        _or: [
          { status: { eq: "pending" } }
          { status: { eq: "processing" } }
        ]
      }
      {
        _or: [
          { priority: { eq: "high" } }
          { total: { gte: 1000.0 } }
        ]
      }
      {
        _not: {
          customer: {
            status: { eq: "suspended" }
          }
        }
      }
    ]
  }) {
    id
    status
    priority
    total
  }
}
```

Equivalent to SQL:
```sql
WHERE (status = 'pending' OR status = 'processing')
  AND (priority = 'high' OR total >= 1000.0)
  AND NOT (customer.status = 'suspended')
```

## Filtering by Related Objects

### One-to-One Relations

Filter by fields in related objects:

```graphql
query {
  orders(filter: {
    customer: {
      country: { eq: "USA" }
      vip_status: { eq: true }
    }
  }) {
    id
    customer {
      name
      country
    }
  }
}
```

### Nested Relation Filters

Filter through multiple relation levels:

```graphql
query {
  orders(filter: {
    customer: {
      address: {
        city: { eq: "New York" }
      }
      category: {
        name: { ilike: "%premium%" }
      }
    }
  }) {
    id
    customer {
      name
      address {
        city
      }
    }
  }
}
```

### Deep Relation Filters

Filter up to 4 levels deep:

```graphql
query {
  order_details(filter: {
    order: {
      customer: {
        category: {
          description: { ilike: "%enterprise%" }
        }
      }
    }
  }) {
    id
    order {
      customer {
        name
        category {
          description
        }
      }
    }
  }
}
```

## Filtering by List Relations

For one-to-many and many-to-many relations, use list operators:

### any_of - At Least One Matches

```graphql
query {
  customers(filter: {
    orders: {
      any_of: {
        status: { eq: "pending" }
      }
    }
  }) {
    id
    name
    orders(filter: { status: { eq: "pending" } }) {
      id
      status
    }
  }
}
```

Finds customers who have **at least one** pending order.

### all_of - All Must Match

```graphql
query {
  customers(filter: {
    orders: {
      all_of: {
        status: { eq: "completed" }
      }
    }
  }) {
    id
    name
  }
}
```

Finds customers where **all** their orders are completed.

### none_of - None Can Match

```graphql
query {
  customers(filter: {
    orders: {
      none_of: {
        status: { eq: "cancelled" }
      }
    }
  }) {
    id
    name
  }
}
```

Finds customers with **no** cancelled orders.

### Complex List Filters

Combine multiple conditions:

```graphql
query {
  products(filter: {
    categories: {
      any_of: {
        _and: [
          { name: { ilike: "%electronics%" } }
          { active: { eq: true } }
        ]
      }
    }
  }) {
    id
    name
    categories {
      name
    }
  }
}
```

### Nested List Filters

Filter through nested list relations:

```graphql
query {
  customers(filter: {
    orders: {
      any_of: {
        order_details: {
          any_of: {
            product: {
              category: { eq: "electronics" }
            }
            quantity: { gte: 5 }
          }
        }
      }
    }
  }) {
    id
    name
  }
}
```

Finds customers who ordered 5+ units of electronics.

## Filtering Nested Objects

For fields with nested object types:

```graphql
# Schema with nested object
type customer_profile {
  preferences: UserPreferences  # Nested object
  settings: AccountSettings     # Nested object
}

type UserPreferences {
  theme: String
  language: String
  notifications_enabled: Boolean
}
```

Filter by nested object fields:

```graphql
query {
  customer_profiles(filter: {
    preferences: {
      theme: { eq: "dark" }
      notifications_enabled: { eq: true }
    }
  }) {
    id
    preferences {
      theme
      notifications_enabled
    }
  }
}
```

### Deep Nested Object Filters

```graphql
query {
  customers(filter: {
    profile: {
      settings: {
        privacy: {
          share_email: { eq: false }
        }
      }
    }
  }) {
    id
    name
  }
}
```

## Filtering with NULL Values

### Finding NULL Values

```graphql
query {
  customers(filter: {
    phone: { is_null: true }
  }) {
    id
    name
    phone
  }
}
```

### Finding Non-NULL Values

```graphql
query {
  customers(filter: {
    phone: { is_null: false }
  }) {
    id
    name
    phone
  }
}
```

### NULL in Relations

```graphql
query {
  orders(filter: {
    shipped_date: { is_null: true }
    customer: { is_null: false }
  }) {
    id
    status
  }
}
```

## Array and Vector Filters

### Array Contains

```graphql
query {
  products(filter: {
    tags: {
      contains: ["featured", "sale"]  # Contains all specified values
    }
  }) {
    id
    name
    tags
  }
}
```

### Array Intersects

```graphql
query {
  products(filter: {
    tags: {
      intersects: ["featured", "new"]  # Has any of specified values
    }
  }) {
    id
    name
    tags
  }
}
```

### Array Equality

```graphql
query {
  products(filter: {
    tags: {
      eq: ["sale", "clearance"]  # Exact match of array
    }
  }) {
    id
    name
    tags
  }
}
```

### Vector Similarity

For vector fields, use semantic or similarity search instead of filters. See [Basic Queries - Similarity Search](./2-basic-queries.md#similarity-search).

## Filter Reuse with Variables

Define reusable filters using variables:

```graphql
query GetActiveCustomers($countryFilter: customers_filter!) {
  customers(filter: $countryFilter) {
    id
    name
    country
  }
}
```

Variables:
```json
{
  "countryFilter": {
    "_and": [
      { "country": { "in": ["USA", "Canada"] } },
      { "status": { "eq": "active" } }
    ]
  }
}
```

## Required Filters

Some fields may require filters using `@filter_required`:

```graphql
# Schema definition
type time_series_data @table(name: "time_series") {
  timestamp: Timestamp! @filter_required
  sensor_id: Int!
  value: Float!
}
```

Queries must include the required filter:

```graphql
# Valid
query {
  time_series_data(filter: {
    timestamp: { gte: "2024-01-01", lt: "2024-02-01" }
  }) {
    timestamp
    sensor_id
    value
  }
}

# Invalid - will return error
query {
  time_series_data {
    timestamp
    value
  }
}
```

## Performance Optimization

### 1. Filter Early

Apply filters at the highest level to reduce data volume:

```graphql
# Good - Filter at top level
query {
  customers(filter: { country: { eq: "USA" } }) {
    id
    orders {
      id
    }
  }
}

# Less efficient - Filter after join
query {
  customers {
    id
    orders(filter: { customer: { country: { eq: "USA" } } }) {
      id
    }
  }
}
```

### 2. Use Indexes

Ensure database indexes exist on:
- Frequently filtered fields
- Foreign key fields used in relation filters
- Fields used in ORDER BY

### 3. Combine Filters Efficiently

```graphql
# Good - Single filter with multiple conditions
query {
  orders(filter: {
    _and: [
      { status: { in: ["pending", "processing"] } }
      { total: { gte: 100 } }
    ]
  }) {
    id
  }
}

# Avoid - Separate queries
query {
  pending: orders(filter: { status: { eq: "pending" } }) { id }
  processing: orders(filter: { status: { eq: "processing" } }) { id }
}
```

### 4. Use IN Instead of Multiple OR

```graphql
# Good
query {
  customers(filter: {
    country: { in: ["USA", "Canada", "Mexico"] }
  }) {
    id
  }
}

# Avoid
query {
  customers(filter: {
    _or: [
      { country: { eq: "USA" } }
      { country: { eq: "Canada" } }
      { country: { eq: "Mexico" } }
    ]
  }) {
    id
  }
}
```

## Common Filter Patterns

### Date Ranges

```graphql
query OrdersThisMonth {
  orders(filter: {
    created_at: {
      gte: "2024-03-01T00:00:00Z"
      lt: "2024-04-01T00:00:00Z"
    }
  }) {
    id
    created_at
  }
}
```

### Search by Name

```graphql
query SearchCustomers($query: String!) {
  customers(filter: {
    _or: [
      { name: { ilike: $query } }
      { email: { ilike: $query } }
      { phone: { like: $query } }
    ]
  }) {
    id
    name
    email
  }
}
```

Variables:
```json
{
  "query": "%john%"
}
```

### Active Records Only

```graphql
query {
  products(filter: {
    _and: [
      { deleted_at: { is_null: true } }
      { active: { eq: true } }
      { in_stock: { eq: true } }
    ]
  }) {
    id
    name
  }
}
```

### Exclude Specific Values

```graphql
query {
  orders(filter: {
    status: {
      _not: { in: ["cancelled", "refunded"] }
    }
  }) {
    id
    status
  }
}
```

## Next Steps

- Learn about [Sorting & Pagination](./4-sorting-pagination.md) to order and paginate filtered results
- See [Relations](./5-relations.md) for advanced filtering with related data
- Check [Aggregations](./7-aggregations.md) for filtering aggregated data
