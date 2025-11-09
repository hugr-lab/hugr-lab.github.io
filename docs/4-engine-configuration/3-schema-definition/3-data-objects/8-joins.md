---
title: Joins and Spatial Joins
sidebar_position: 8
---

# Joins and Spatial Joins

:::tip Cross-Source Joins
For extending types with joins across different data sources, see [Extensions & Cross-Source Subqueries](/docs/engine-configuration/extension#extending-types-with-cross-source-joins).
:::

Beyond foreign key relationships, Hugr provides flexible join capabilities including custom joins, query-time joins, and spatial joins for geographic data.

## Custom Joins with @join

Define custom join conditions beyond simple foreign keys:

```graphql
type customers @table(name: "customers") {
  id: Int! @pk
  name: String!
  location: Geometry @geometry_info(type: POINT, srid: 4326)
  
  # Join with service areas based on location
  service_areas: [service_areas] @join(
    references_name: "service_areas"
    sql: "ST_Within([source.location], [dest.boundary])"
  )
}
```

### Complex Join Conditions

Combine multiple conditions:

```graphql
extend type orders {
  similar_orders: [orders] @join(
    references_name: "orders"
    source_fields: ["customer_id"]
    references_fields: ["customer_id"]
    sql: """
      [source.id] != [dest.id] AND
      ABS([source.total] - [dest.total]) < 50 AND
      [dest.created_at] BETWEEN 
        [source.created_at] - INTERVAL '7 days' 
        AND [source.created_at] + INTERVAL '7 days'
    """
  )
}
```

## Query-Time Joins

Every data object includes a `_join` field for dynamic joins:

```graphql
query {
  customers {
    id
    name
    
    # Join with orders at query time
    _join(fields: ["id"]) {
      orders(fields: ["customer_id"]) {
        id
        total
      }
    }
  }
}
```

### Cross-Source Query-Time Joins

Join data from different sources:

```graphql
query {
  postgres_customers {
    id
    name
    
    _join(fields: ["email"]) {
      mysql_users(fields: ["email"]) {
        last_login
        preferences
      }
    }
  }
}
```

### Aggregating Query-Time Joins

Aggregate joined data:

```graphql
query {
  products {
    id
    name
    
    _join(fields: ["id"]) {
      reviews_aggregation(fields: ["product_id"]) {
        _rows_count
        rating {
          avg
        }
      }
    }
  }
}
```

Aggregate data with joined results:

```graphql
query {
  products_aggregation {
    _join(fields: ["id"]) {
      reviews(fields: ["product_id"]) {
        _rows_count
        rating {
          avg
        }
      }
    }
  }
}
```

## Spatial Joins

For data objects with geometry fields, use `_spatial` for geographic joins:

```graphql
query {
  stores {
    id
    name
    location
    
    # Find customers within 5km
    _spatial(
      field: "location"
      type: DWITHIN
      buffer: 5000
    ) {
      customers(field: "address_location") {
        id
        name
      }
    }
  }
}
```

### Spatial Join Types

Available spatial operations:

| Type | Description |
|------|-------------|
| `INTERSECTS` | Geometries share any portion of space |
| `WITHIN` | Geometry is completely inside reference |
| `CONTAINS` | Reference is completely inside geometry |
| `DISJOINT` | Geometries don't share any space |
| `DWITHIN` | Within specified distance (uses buffer) |

### Complex Spatial Queries

Combine spatial joins with filters:

```graphql
query {
  delivery_zones {
    id
    name
    boundary
    
    # Active orders within zone
    _spatial(field: "boundary", type: CONTAINS) {
      orders(
        field: "delivery_location"
        filter: { status: { in: ["pending", "processing"] } }
      ) {
        id
        customer {
          name
        }
        delivery_location
      }
      
      # Aggregate orders by status
      orders_bucket_aggregation(field: "delivery_location") {
        key {
          status
        }
        aggregations {
          _rows_count
          total {
            sum
          }
        }
      }
    }
  }
}
```

### Spatial Joins with Buffer

Find related objects within a distance:

```graphql
query {
  incidents {
    id
    type
    location
    
    # Hospitals within 10km
    _spatial(
      field: "location"
      type: DWITHIN
      buffer: 10000  # meters
    ) {
      hospitals(field: "location") {
        id
        name
        emergency_capacity
      }
    }
  }
}
```

## Using @unnest with Joins

Flatten joined results for aggregation:

```graphql
query {
  orders_bucket_aggregation {
    key {
      customer {
        country
      }
      # Flatten product details
      order_details @unnest {
        product {
          category {
            name
          }
        }
      }
    }
    aggregations {
      _rows_count
      order_details {
        quantity {
          sum
        }
      }
    }
  }
}
```

**Warning**: `@unnest` multiplies rows like SQL JOIN - use carefully!

## Performance Optimization

### Pushdown Control

Prevent join pushdown to database when needed:

```graphql
query {
  customers {
    id
    orders @no_pushdown {
      id
      total
    }
  }
}
```

### Join Indexes

Ensure indexes on:
- Join condition fields
- Spatial columns (using spatial indexes)
- Fields used in complex SQL conditions

### Limiting Join Results

Always limit joined data for performance:

```graphql
query {
  regions {
    id
    name
    
    _spatial(field: "boundary", type: CONTAINS) {
      locations(
        field: "point"
        limit: 100  # Limit spatial join results
        order_by: [{ field: "population", direction: DESC }]
      ) {
        id
        name
        population
      }
    }
  }
}
```

## Cross-Source Joins in Extensions

Define joins between different data sources:

```graphql
# In extension data source
extend type postgres_orders {
  # Join with MySQL customer data
  mysql_customer: mysql_customers @join(
    references_name: "mysql_customers"
    source_fields: ["customer_email"]
    references_fields: ["email"]
  )
  
  # Join with DuckDB analytics
  analytics: duckdb_order_analytics @join(
    references_name: "duckdb_order_analytics"
    source_fields: ["id"]
    references_fields: ["order_id"]
  )
}
```

## Combining Join Types

Use multiple join types together:

```graphql
query {
  stores {
    id
    name
    location
    
    # Regular join
    inventory {
      product_id
      quantity
    }
    
    # Aggregation on joined data
    inventory_aggregation {
      _rows_count
      quantity {
        sum
      }
    }
    
    # Spatial join
    _spatial(field: "location", type: DWITHIN, buffer: 1000) {
      competitors(field: "location") {
        name
      }
    }
    
    # Query-time join
    _join(fields: ["id"]) {
      reviews(fields: ["store_id"]) {
        rating
        comment
      }
      # Aggregation on query-time join
      reviews_aggregation(fields: ["store_id"]) {
        _rows_count
        rating {
          avg
        }
      }
    }
  }
}
```

Use joined data in aggregations:

```graphql
query {
  stores_bucket_aggregation {
    key {
      customer {
        country
      }
      # Flatten product details
      order_details @unnest {
        product {
          category {
            name
          }
        }
      }
    }
    aggregations {
      _rows_count
      _spatial(field: "location", type: DWITHIN, buffer: 1000) {
        competitors(field: "location") {
          name{
            list(distinct: true)
          }
        }
      }
    }
  }
}
```
