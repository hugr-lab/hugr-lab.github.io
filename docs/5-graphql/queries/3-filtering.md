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
      eq: 50.0      # Equal to
      gt: 10.0      # Greater than
      gte: 10.0     # Greater than or equal
      lt: 100.0     # Less than
      lte: 100.0    # Less than or equal
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
      in: ["John", "Jane"]     # In list
      like: "John%"            # Pattern match (% wildcard)
      ilike: "john%"           # Case-insensitive pattern match
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
      eq: { "user_id": 123, "status": "active" }  # Exact match
      contains: { "user_id": 123 }                 # Contains key-value (like PostgreSQL @>)
      has: "transaction_id"                        # Has key
      has_all: ["user_id", "transaction_id"]       # Has all specified keys
      is_null: false                               # Is NULL / NOT NULL
    }
  }) {
    id
    metadata
  }
}
```

### Geometry Filters

Filter by spatial relationships between geometries:

```graphql
query {
  parcels(filter: {
    boundary: {
      eq: "POLYGON((0 0, 0 10, 10 10, 10 0, 0 0))"  # Exact geometry match (WKT)
      intersects: {
        type: "Polygon"
        coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]]
      }  # Intersects with geometry (GeoJSON)
      contains: "POINT(5 5)"                        # Contains geometry (WKT)
      is_null: false                                # Is NULL / NOT NULL
    }
  }) {
    id
    parcel_number
    boundary
  }
}
```

**Geometry input formats:**
- **WKT (Well-Known Text)**: `"POINT(1 2)"`, `"POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))"`
- **GeoJSON**: `{ "type": "Point", "coordinates": [1, 2] }`

**Spatial operators:**
- `eq`: Exact geometry match
- `intersects`: Geometries share any portion of space
- `contains`: First geometry completely contains second geometry
- `is_null`: Check for NULL geometry

#### Intersects Examples

Find parcels that intersect with a polygon:

```graphql
query {
  parcels(filter: {
    boundary: {
      intersects: "POLYGON((0 0, 0 100, 100 100, 100 0, 0 0))"
    }
  }) {
    id
    parcel_number
    area
  }
}
```

Find roads crossing a specific area (using GeoJSON):

```graphql
query {
  roads(filter: {
    geometry: {
      intersects: {
        type: "Polygon"
        coordinates: [
          [
            [-74.01, 40.70],
            [-74.01, 40.72],
            [-73.99, 40.72],
            [-73.99, 40.70],
            [-74.01, 40.70]
          ]
        ]
      }
    }
  }) {
    id
    name
    road_type
  }
}
```

#### Contains Examples

Find regions containing a specific point:

```graphql
query {
  regions(filter: {
    boundary: {
      contains: "POINT(-73.98 40.75)"
    }
  }) {
    id
    region_name
    area
  }
}
```

Find areas that contain a building footprint:

```graphql
query {
  zones(filter: {
    boundary: {
      contains: {
        type: "Polygon"
        coordinates: [
          [
            [-74.00, 40.71],
            [-74.00, 40.712],
            [-73.998, 40.712],
            [-73.998, 40.71],
            [-74.00, 40.71]
          ]
        ]
      }
    }
  }) {
    id
    zone_name
  }
}
```

#### Combining Geometry Filters

Combine spatial and attribute filters:

```graphql
query {
  buildings(filter: {
    _and: [
      {
        footprint: {
          intersects: "POLYGON((0 0, 0 100, 100 100, 100 0, 0 0))"
        }
      }
      { building_type: { eq: "residential" } }
      { height: { gte: 20 } }
    ]
  }) {
    id
    name
    building_type
    height
  }
}
```

**Note:** For more advanced spatial queries including distance-based filtering and spatial aggregations, see [Spatial Queries](./9-spatial.md).

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

**Important:** Filtering by related objects only works for relations defined with `@field_references` or `@references` directives (foreign key relationships). Predefined joins created with `@join` or `@table_function_call_join` directives cannot be used in filter conditions. To restrict records based on these joins, use the `inner: true` parameter instead.

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

### Vector Similarity Search

Vector fields support similarity search using vector embeddings. Similarity search is **not a filter** but a separate query argument that ranks results by vector distance.

**Note:** Vector fields can only be filtered with `is_null`. Use the `similarity` argument for semantic search.

```graphql
query {
  documents(
    similarity: {
      name: "embedding"              # Vector field name
      vector: [0.1, 0.2, 0.3, ...]  # Query vector
      distance: Cosine               # Distance metric
      limit: 10                      # Number of results
    }
  ) {
    id
    title
    content
    embedding
  }
}
```

#### Distance Metrics

- **`Cosine`** - Cosine similarity (most common for text embeddings)
- **`L2`** - Euclidean (L2) distance
- **`Inner`** - Inner product (dot product)

#### Basic Similarity Search

Find the 10 most similar documents:

```graphql
query SimilarDocuments {
  documents(
    similarity: {
      name: "embedding"
      vector: [0.15, 0.22, 0.18, 0.09, ...]  # 768-dimensional vector
      distance: Cosine
      limit: 10
    }
  ) {
    id
    title
    _embedding_distance(
      vector: [0.15, 0.22, 0.18, 0.09, ...]
      distance: Cosine
    )  # Distance from query vector
  }
}
```

#### Combining with Filters

Combine similarity search with attribute filters:

```graphql
query FilteredSimilarity {
  products(
    similarity: {
      name: "description_embedding"
      vector: [0.1, 0.2, 0.3, ...]
      distance: Cosine
      limit: 5
    }
    filter: {
      _and: [
        { category: { eq: "books" } }
        { in_stock: { eq: true } }
        { price: { lte: 50.0 } }
      ]
    }
  ) {
    id
    name
    description
    price
    category
    _description_embedding_distance(
      vector: [0.1, 0.2, 0.3, ...]
      distance: Cosine
    )
  }
}
```

**Execution order:**
1. Filter is applied first to reduce dataset
2. Similarity search ranks filtered results
3. Top N results (by `limit`) are returned

#### Text-to-Vector Search with @embeddings

If the data object has the `@embeddings` directive, you can search using text queries:

```graphql
query SearchByText {
  articles(
    similarity: {
      name: "content_embedding"
      vector: [...]  # Generated from text
      distance: Cosine
      limit: 10
    }
  ) {
    id
    title
    # Distance from query text
    _distance_query_to(query: "machine learning tutorial")
  }
}
```

#### Use Cases

**Semantic document search:**
```graphql
query {
  documents(
    similarity: {
      name: "embedding"
      vector: [...]  # Embedding of "artificial intelligence"
      distance: Cosine
      limit: 20
    }
  ) {
    id
    title
  }
}
```

**Image similarity:**
```graphql
query {
  images(
    similarity: {
      name: "image_embedding"
      vector: [...]  # Visual embedding
      distance: L2
      limit: 10
    }
  ) {
    id
    url
    description
  }
}
```

**Product recommendations:**
```graphql
query {
  products(
    similarity: {
      name: "feature_embedding"
      vector: [...]  # Product feature vector
      distance: Inner
      limit: 5
    }
    filter: {
      category: { eq: "electronics" }
    }
  ) {
    id
    name
    price
  }
}
```

**Performance tips:**
- Create vector indexes (HNSW for PostgreSQL, ANN for DuckDB)
- Use appropriate distance metric for your use case
- Apply filters to reduce search space
- Set reasonable `limit` values (10-100 typically)

For more on Vector type configuration, see [Data Types - Vector](../../4-engine-configuration/3-schema-definition/1-data-types.md#vector).

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
