# Advanced Features - Spatial, Vector, JQ

## Spatial Queries (_spatial)

For geometry fields, use `_spatial` for geographic joins and queries.

### Basic Spatial Join

```graphql
cities {
  id
  name
  boundary  # Geometry field

  # Find locations within city boundaries
  _spatial(field: "boundary", type: CONTAINS) {
    locations(field: "point") {
      id
      name
      point
    }
  }
}
```

### Spatial Join Types

**CONTAINS** - Parent geometry contains child
```graphql
_spatial(field: "boundary", type: CONTAINS) {
  points(field: "location") { ... }
}
```

**INTERSECTS** - Geometries overlap
```graphql
_spatial(field: "boundary", type: INTERSECTS) {
  roads(field: "line") { ... }
}
```

**DWITHIN** - Within distance (buffer)
```graphql
_spatial(field: "location", type: DWITHIN, buffer: 5000) {
  nearby_stores(field: "location") {
    id
    name
  }
}
```

**TOUCHES** - Geometries touch boundaries
```graphql
_spatial(field: "boundary", type: TOUCHES) {
  adjacent_regions(field: "boundary") { ... }
}
```

**WITHIN** - Child geometry within parent
```graphql
_spatial(field: "point", type: WITHIN) {
  regions(field: "boundary") { ... }
}
```

---

### Spatial Aggregations

```graphql
cities {
  id
  name
  _spatial(field: "boundary", type: CONTAINS) {
    locations_aggregation(field: "point") {
      _rows_count
    }

    locations_bucket_aggregation(field: "point") {
      key {
        location_type
      }
      aggregations {
        _rows_count
      }
    }
  }
}
```

---

### Geometry Filters

Filter by spatial relationships:

```graphql
parcels(filter: {
  boundary: {
    intersects: {
      type: "Polygon"
      coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]]
    }
  }
}) {
  id
  parcel_number
}
```

**Geometry input formats:**
- **WKT**: `"POINT(1 2)"`, `"POLYGON((...))"`
- **GeoJSON**: `{ "type": "Point", "coordinates": [1, 2] }`

---

### Distance-Based Queries

Find features within distance:

```graphql
stores {
  id
  name
  location

  # Stores within 5km
  _spatial(field: "location", type: DWITHIN, buffer: 5000) {
    nearby_competitors(field: "location") {
      id
      name
      # Calculate actual distance
      _distance
    }
  }
}
```

---

## Vector Search (Semantic Similarity)

For vector embedding fields, use `similarity` argument for semantic search.

### Basic Vector Search

```graphql
documents(
  similarity: {
    name: "embedding"           # Vector field name
    vector: [0.1, 0.2, 0.3, ...]  # Query vector
    distance: Cosine            # Distance metric
    limit: 10                   # Top K results
  }
) {
  id
  title
  content
}
```

### Distance Metrics

**Cosine** - Cosine distance (best for normalized vectors)
```graphql
similarity: {
  name: "embedding"
  vector: [...]
  distance: Cosine
  limit: 10
}
```

**L2** - Euclidean distance
```graphql
similarity: {
  name: "embedding"
  vector: [...]
  distance: L2
  limit: 10
}
```

**InnerProduct** - Inner product (for dot product similarity)
```graphql
similarity: {
  name: "embedding"
  vector: [...]
  distance: InnerProduct
  limit: 10
}
```

---

### Get Calculated Distance

```graphql
documents(
  similarity: {
    name: "embedding"
    vector: [...]
    distance: Cosine
    limit: 10
  }
) {
  id
  title
  _distance  # Calculated distance value
}
```

---

### Combining Vector Search with Filters

```graphql
documents(
  similarity: {
    name: "embedding"
    vector: [...]
    distance: Cosine
    limit: 10
  }
  filter: {
    _and: [
      { published: { eq: true } }
      { language: { eq: "en" } }
      { created_at: { gte: "2024-01-01" } }
    ]
  }
) {
  id
  title
  language
  _distance
}
```

**Execution order:**
1. Filters are applied first
2. Vector search on filtered results
3. Top K results returned

---

### Text-to-Vector Search (with @embeddings)

If using embedding data source:

```graphql
documents(
  similarity: {
    name: "embedding"
    text: "search query text"  # Auto-converted to vector
    distance: Cosine
    limit: 10
  }
) {
  id
  title
  _distance
}
```

---

### Vector Search Use Cases

**1. Semantic Document Search**
```graphql
documents(
  similarity: {
    name: "content_embedding"
    text: "machine learning algorithms"
    distance: Cosine
    limit: 20
  }
  filter: { category: { eq: "technology" } }
) {
  id
  title
  summary
  _distance
}
```

**2. Product Recommendations**
```graphql
products {
  id
  name
  # Similar products
  _join(fields: ["id"]) {
    similar: products(
      similarity: {
        name: "feature_vector"
        vector: $product_vector
        distance: Cosine
        limit: 5
      }
      filter: {
        id: { ne: $product_id }  # Exclude self
        in_stock: { eq: true }
      }
    ) {
      id
      name
      price
      _distance
    }
  }
}
```

**3. Duplicate Detection**
```graphql
articles(
  similarity: {
    name: "embedding"
    vector: $article_vector
    distance: L2
    limit: 5
  }
  filter: {
    id: { ne: $article_id }
    _distance: { lt: 0.1 }  # Very similar
  }
) {
  id
  title
  _distance
}
```

---

## JQ Transformations

Transform query results server-side using JQ expressions.

### Basic JQ Query

```graphql
query {
  jq(
    expression: ".customers | map({name, email})"
    query: """
      query {
        customers(limit: 10) {
          name
          email
          country
        }
      }
    """
  )
}
```

**Result in `extensions` field:**
```json
{
  "data": { ... },
  "extensions": {
    "jq": [
      { "name": "John", "email": "john@example.com" },
      { "name": "Jane", "email": "jane@example.com" }
    ]
  }
}
```

---

### Access GraphQL Variables in JQ

Use `$var_name` to access GraphQL variables:

```graphql
query GetData($min_price: Float!) {
  jq(
    expression: ".products | map(select(.price >= $min_price))"
    query: """
      query {
        products {
          name
          price
        }
      }
    """
  )
}
```

Variables: `{ "min_price": 100 }`

---

### Nested GraphQL Queries from JQ

Use `queryHugr()` function to execute nested queries:

```graphql
query {
  jq(
    expression: """
      .customers | map({
        name,
        email,
        recent_orders: (
          queryHugr("query { orders(filter: {customer_id: {eq: \\(.id)}}, limit: 5) { id total } }").orders
        )
      })
    """
    query: """
      query {
        customers(limit: 10) {
          id
          name
          email
        }
      }
    """
  )
}
```

---

### Data Reshaping

```graphql
jq(
  expression: """
    .orders
    | group_by(.customer.country)
    | map({
        country: .[0].customer.country,
        total_orders: length,
        total_revenue: map(.total) | add
      })
  """
  query: """
    query {
      orders {
        total
        customer { country }
      }
    }
  """
)
```

---

### Complex Transformations

```graphql
jq(
  expression: """
    {
      summary: {
        total_customers: .customers | length,
        total_revenue: .orders | map(.total) | add,
        avg_order_value: (.orders | map(.total) | add) / (.orders | length)
      },
      top_customers: (
        .customers
        | map({
            name,
            email,
            order_count: .orders_aggregation._rows_count,
            total_spent: .orders_aggregation.total.sum
          })
        | sort_by(-.total_spent)
        | .[0:10]
      )
    }
  """
  query: """
    query {
      customers {
        name
        email
        orders_aggregation {
          _rows_count
          total { sum }
        }
      }
      orders {
        total
      }
    }
  """
)
```

---

### JQ with Caching

Add `@cache` directive for caching:

```graphql
query {
  jq(
    expression: ".products | map({name, price})"
    query: """
      query @cache(ttl: 3600) {
        products {
          name
          price
        }
      }
    """
  )
}
```

---

## H3 Clustering (Hexagonal Spatial Indexing)

Aggregate spatial data using Uber's H3 hexagonal grid system.

### Basic H3 Aggregation

```graphql
locations_bucket_aggregation {
  key {
    h3_cell: location(h3_resolution: 7)  # Resolution 7 (~5km hexagons)
  }
  aggregations {
    _rows_count
  }
}
```

**H3 Resolutions:**
- 0: ~1000km edge
- 4: ~45km edge
- 7: ~5km edge
- 9: ~500m edge
- 12: ~10m edge
- 15: ~0.5m edge

---

### Multi-Resolution H3

```graphql
locations_bucket_aggregation {
  key {
    h3_coarse: location(h3_resolution: 4)
    h3_fine: location(h3_resolution: 9)
  }
  aggregations {
    _rows_count
    value { avg }
  }
}
```

---

### H3 with Filters

```graphql
sensor_readings_bucket_aggregation(
  filter: {
    timestamp: { gte: "2024-01-01" }
    value: { is_null: false }
  }
) {
  key {
    h3_cell: location(h3_resolution: 8)
    hour: timestamp(bucket: hour)
  }
  aggregations {
    value {
      avg
      min
      max
    }
  }
}
```

---

## TimescaleDB / Hypertables

For time-series data stored in TimescaleDB hypertables:

### Time Bucket Queries

```graphql
sensor_data_bucket_aggregation {
  key {
    time_bucket: timestamp(bucket_interval: "5 minutes")
    sensor_id
  }
  aggregations {
    temperature { avg min max }
    humidity { avg }
  }
}
```

### Continuous Aggregates

Query pre-computed aggregations:

```graphql
hourly_stats {
  bucket_time
  sensor_id
  avg_temperature
  max_temperature
  min_temperature
}
```

---

## OLAP Cubes

For OLAP cube queries:

```graphql
sales_cube_bucket_aggregation {
  key {
    year: sale_date(bucket: year)
    quarter: sale_date(bucket: quarter)
    region
    product_category
  }
  aggregations {
    revenue { sum }
    quantity { sum }
    orders { _rows_count }
  }
}
```

---

## Performance Tips

### Spatial Queries

1. **Use spatial indexes** (GIST for PostGIS)
2. **Limit buffer sizes** for DWITHIN
3. **Simplify geometries** when possible
4. **Use bounding box filters** before complex spatial operations

### Vector Search

1. **Create vector indexes** (HNSW or IVFFlat for pgvector)
2. **Normalize vectors** for cosine distance
3. **Use appropriate distance metric** for your embeddings
4. **Combine with filters** to reduce search space

### JQ Transformations

1. **Transform server-side** to reduce network traffic
2. **Cache transformed results** when possible
3. **Avoid complex transformations** on large datasets
4. **Use aggregations** instead of JQ when possible

---

## Next Steps

- **[p-data-analysis.md](./p-data-analysis.md)** - AI guidance for advanced analytics
- **[p-performance-optimization.md](./p-performance-optimization.md)** - Performance best practices

## Related Documentation

- [Spatial Queries](https://hugr-lab.github.io/docs/graphql/queries/spatial)
- [Vector Search](https://hugr-lab.github.io/docs/graphql/queries/vector-search)
- [JQ Transformations](https://hugr-lab.github.io/docs/graphql/jq-transformations)
- [H3 Clustering](https://hugr-lab.github.io/docs/graphql/queries/h3-clustering)
