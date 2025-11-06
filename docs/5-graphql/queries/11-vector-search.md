---
title: "Vector Similarity Search"
sidebar_position: 11
---

# Vector Similarity Search

Hugr provides built-in support for vector similarity search, enabling semantic search capabilities for text, images, and other data types represented as embeddings. Vector search ranks results by similarity distance rather than exact matching, making it ideal for recommendation systems, semantic search, and AI-powered applications.

## What is Vector Search?

Vector similarity search finds the nearest neighbors to a query vector in high-dimensional space. Unlike traditional filters that match exact values, vector search:

- **Ranks by similarity** - Results are ordered by distance from the query vector
- **Supports semantic search** - Find conceptually similar items, not just keyword matches
- **Uses embeddings** - Represents complex data (text, images, audio) as numerical vectors
- **Scales efficiently** - Uses specialized indexes (HNSW, IVF) for fast search

## Vector Type Support

Hugr supports `Vector` type for PostgreSQL (with `pgvector` extension) and DuckDB (with `vss` extension).

```graphql
type documents @table(name: "documents") {
  id: Int! @pk
  title: String!
  content: String!
  embedding: Vector @dim(len: 768)  # 768-dimensional vector
}
```

The `@dim` directive specifies vector dimensionality (checked during mutations and queries).

## Basic Similarity Search

Use the `similarity` argument to find similar items:

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
  }
}
```

**Parameters:**
- `name` (required) - The vector field name
- `vector` (required) - Query vector as array of floats
- `distance` (required) - Distance metric: `Cosine`, `L2`, or `Inner`
- `limit` (required) - Maximum number of results to return

**Vector input formats:**
- JSON array: `[0.1, 0.2, 0.3]`
- String (PostgreSQL format): `"[0.1,0.2,0.3]"`

## Distance Metrics

Choose the appropriate distance metric for your use case:

### Cosine Similarity

**Best for:** Text embeddings, normalized vectors

Measures angle between vectors (ignores magnitude). Range: [-1, 1] where 1 is identical.

```graphql
query {
  articles(
    similarity: {
      name: "content_embedding"
      vector: [...]
      distance: Cosine
      limit: 20
    }
  ) {
    id
    title
  }
}
```

### Euclidean Distance (L2)

**Best for:** Image embeddings, unnormalized vectors

Measures straight-line distance. Smaller values = more similar.

```graphql
query {
  images(
    similarity: {
      name: "visual_embedding"
      vector: [...]
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

### Inner Product

**Best for:** Collaborative filtering, recommendation systems

Measures vector dot product. Higher values = more similar.

```graphql
query {
  products(
    similarity: {
      name: "user_preference_vector"
      vector: [...]
      distance: Inner
      limit: 5
    }
  ) {
    id
    name
    price
  }
}
```

## Calculated Distance Fields

Access the distance value for each result using calculated fields:

```graphql
query {
  documents(
    similarity: {
      name: "embedding"
      vector: [0.15, 0.22, 0.18, ...]
      distance: Cosine
      limit: 10
    }
  ) {
    id
    title
    # Get distance from query vector
    _embedding_distance(
      vector: [0.15, 0.22, 0.18, ...]
      distance: Cosine
    )
  }
}
```

**Generated field pattern:** `_<field_name>_distance(vector: Vector!, distance: VectorDistanceType!): Float`

This field is automatically generated for each vector field and can be used to:
- Display similarity scores to users
- Debug search results
- Implement custom ranking logic

## Sorting by Distance with Limit

While `similarity` argument handles ranking internally, you can also sort by distance explicitly:

```graphql
query {
  documents {
    id
    title
    distance: _embedding_distance(
      vector: [0.1, 0.2, 0.3, ...]
      distance: Cosine
    )
  }
}
```

**Note:** For performance, always use the `similarity` argument with `limit` instead of sorting all results. The `similarity` argument uses vector indexes efficiently.

## Combining with Filters

Apply filters **before** similarity search to reduce the search space:

```graphql
query {
  products(
    # Similarity search
    similarity: {
      name: "description_embedding"
      vector: [0.1, 0.2, 0.3, ...]
      distance: Cosine
      limit: 5
    }
    # Filter first
    filter: {
      _and: [
        { category: { eq: "electronics" } }
        { in_stock: { eq: true } }
        { price: { lte: 500.0 } }
        { rating: { gte: 4.0 } }
      ]
    }
  ) {
    id
    name
    description
    price
    rating
    similarity_score: _description_embedding_distance(
      vector: [0.1, 0.2, 0.3, ...]
      distance: Cosine
    )
  }
}
```

**Execution order:**
1. **Filter** applied first (reduces dataset)
2. **Similarity search** on filtered results
3. **Top N** results returned (by `limit`)

This approach significantly improves performance by searching only relevant items.

## Multi-Field Vector Search

Search across multiple vector fields:

```graphql
query {
  products {
    id
    name
    # Search by title embedding
    title_similarity: _title_embedding_distance(
      vector: [...]  # Title query vector
      distance: Cosine
    )
    # Search by description embedding
    description_similarity: _description_embedding_distance(
      vector: [...]  # Description query vector
      distance: Cosine
    )
  }
}
```

You can implement custom ranking by combining multiple similarity scores.

## Text-to-Vector Search with @embeddings

If your data object has the `@embeddings` directive, Hugr can generate embeddings from text queries:

```graphql
type articles @table(name: "articles") @embeddings(
  provider: "openai"
  model: "text-embedding-3-small"
) {
  id: Int! @pk
  title: String!
  content: String!
  content_embedding: Vector @dim(len: 1536)
}
```

Use the generated `_distance_query_to` field:

```graphql
query {
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
    # Distance from text query
    relevance: _distance_query_to(query: "machine learning tutorials")
  }
}
```

The `_distance_query_to` field:
- Accepts a text `query` parameter
- Automatically generates embedding using configured provider
- Returns distance from the text query

## Vector Search in Relations

Use vector search in nested queries:

```graphql
query {
  users {
    id
    name
    # Find similar articles for each user
    recommended_articles: articles(
      similarity: {
        name: "content_embedding"
        vector: [...]  # User preference vector
        distance: Cosine
        limit: 5
      }
    ) {
      id
      title
      relevance: _content_embedding_distance(
        vector: [...]
        distance: Cosine
      )
    }
  }
}
```

## Vector Search with Aggregations

Combine vector search with aggregations:

```graphql
query {
  # Find similar products
  similar_products: products(
    similarity: {
      name: "feature_embedding"
      vector: [...]
      distance: Cosine
      limit: 100
    }
  ) {
    id
    name
    category
  }

  # Aggregate by category
  similar_by_category: products_bucket_aggregation(
    similarity: {
      name: "feature_embedding"
      vector: [...]
      distance: Cosine
      limit: 100
    }
  ) {
    key {
      category
    }
    aggregations {
      _rows_count
      price { avg }
    }
  }
}
```

## Hybrid Search (Vector + Full-Text)

Combine vector search with text search:

```graphql
query HybridSearch {
  documents(
    # Vector similarity
    similarity: {
      name: "embedding"
      vector: [...]
      distance: Cosine
      limit: 50
    }
    # Text filter
    filter: {
      _or: [
        { title: { ilike: "%machine learning%" } }
        { content: { ilike: "%neural networks%" } }
      ]
    }
  ) {
    id
    title
    semantic_score: _embedding_distance(
      vector: [...]
      distance: Cosine
    )
  }
}
```

This finds documents that are both semantically similar AND contain specific keywords.

## Performance Optimization

### 1. Create Vector Indexes

**PostgreSQL (pgvector):**
```sql
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

**DuckDB (vss):**
```sql
CREATE INDEX idx_embeddings ON documents USING HNSW (embedding);
```

### 2. Choose Appropriate Limits

```graphql
# Good - Reasonable limit
similarity: { limit: 10 }

# Good - Moderate limit
similarity: { limit: 50 }

# Avoid - Too large
similarity: { limit: 1000 }
```

Larger limits require more computation. Use 10-100 for most use cases.

### 3. Apply Filters First

```graphql
query {
  products(
    # Filter first (reduces search space)
    filter: {
      category: { eq: "electronics" }
      in_stock: { eq: true }
    }
    # Then search
    similarity: {
      name: "embedding"
      vector: [...]
      distance: Cosine
      limit: 10
    }
  ) {
    id
    name
  }
}
```

### 4. Use Appropriate Distance Metric

- **Cosine** - For normalized embeddings (most text models)
- **L2** - For unnormalized embeddings (images)
- **Inner** - For recommendation systems

### 5. Batch Queries

Search multiple vectors in parallel:

```graphql
query {
  query1: documents(similarity: { name: "embedding", vector: [...], distance: Cosine, limit: 10 }) { id }
  query2: documents(similarity: { name: "embedding", vector: [...], distance: Cosine, limit: 10 }) { id }
  query3: documents(similarity: { name: "embedding", vector: [...], distance: Cosine, limit: 10 }) { id }
}
```

## Common Use Cases

### Semantic Document Search

```graphql
query SemanticSearch {
  documents(
    similarity: {
      name: "content_embedding"
      vector: [...]  # Embedding of "artificial intelligence applications"
      distance: Cosine
      limit: 20
    }
    filter: {
      published: { eq: true }
      language: { eq: "en" }
    }
  ) {
    id
    title
    summary
    relevance: _content_embedding_distance(
      vector: [...]
      distance: Cosine
    )
  }
}
```

### Image Similarity

```graphql
query SimilarImages {
  images(
    similarity: {
      name: "visual_embedding"
      vector: [...]  # Image embedding from CNN
      distance: L2
      limit: 12
    }
    filter: {
      format: { in: ["jpg", "png"] }
      width: { gte: 800 }
    }
  ) {
    id
    url
    width
    height
    distance: _visual_embedding_distance(
      vector: [...]
      distance: L2
    )
  }
}
```

### Product Recommendations

```graphql
query ProductRecommendations {
  products(
    similarity: {
      name: "feature_embedding"
      vector: [...]  # User preference vector
      distance: Inner
      limit: 10
    }
    filter: {
      in_stock: { eq: true }
      price: { lte: 100.0 }
    }
  ) {
    id
    name
    description
    price
    match_score: _feature_embedding_distance(
      vector: [...]
      distance: Inner
    )
  }
}
```

### Question Answering

```graphql
query FindAnswer {
  knowledge_base(
    similarity: {
      name: "question_embedding"
      vector: [...]  # Embedding of user's question
      distance: Cosine
      limit: 5
    }
  ) {
    id
    question
    answer
    confidence: _question_embedding_distance(
      vector: [...]
      distance: Cosine
    )
  }
}
```

### Duplicate Detection

```graphql
query FindDuplicates {
  documents(
    similarity: {
      name: "content_embedding"
      vector: [...]  # Embedding of document to check
      distance: Cosine
      limit: 10
    }
    filter: {
      id: { ne: 123 }  # Exclude the document itself
    }
  ) {
    id
    title
    similarity: _content_embedding_distance(
      vector: [...]
      distance: Cosine
    )
  }
}
```

## Vector Filtering Limitations

**Important:** Vector fields support only `is_null` filter:

```graphql
query {
  documents(
    filter: {
      embedding: { is_null: false }
    }
  ) {
    id
    title
  }
}
```

You **cannot** filter by vector values directly. Use `similarity` argument for vector-based queries.

## Next Steps

- Learn about [Data Types - Vector](../../4-engine-configuration/3-schema-definition/1-data-types.md#vector) for vector configuration
- See [Filtering](./3-filtering.md) for combining vector search with attribute filters
- Check [Aggregations](./7-aggregations.md) for aggregating search results
- Explore [Basic Queries](./2-basic-queries.md) for general query patterns
