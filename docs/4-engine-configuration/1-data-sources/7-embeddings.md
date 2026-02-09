---
sidebar_position: 8
title: "Embeddings and Semantic Search"
description: "Add embeddings models and perform semantic search queries."
---

`Embeddings` data source allows you to integrate vector embeddings models into your Hugr instance. This enables you to generate vector representations of text data and perform semantic search queries based on vector similarity.

The embeddings model should be accessible via a REST API endpoint that accepts POST requests with JSON payload containing the text to be embedded. The response should include the generated vector. The structure of the request and response should be the same as used by OpenAI embeddings API.

## Defining an Embeddings Data Source

To define an embeddings data source use GraphQL API to add a record to the `data_sources` table. The `type` of the data source should be set to `embeddings`. The `path` should contain the url of the embeddings model endpoint and it allows to pass additional parameters:

- model - model name, e.g. `text-embedding-3-small`
- api_key - API key for authentication, if required by the model provider
- timeout - request timeout in seconds (default is 10)
- api_key_header - custom header name for the API key (default is `Authorization`)

```graphql
mutation addEmbeddingsDataSource($data: data_sources_mut_input_data! = {}) {
  core {
    insert_data_sources(data: $data) {
      name
      description
      as_module
      disabled
      path
      prefix
      read_only
      self_defined
      type
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "openai_embeddings",
    "type": "embeddings",
    "path": "https://api.openai.com/v1/embeddings?model=text-embedding-3-small&api_key=YOUR_API_KEY",
    "prefix": "",
    "description": "OpenAI Embeddings Model",
  }
}
```

It allows you to get embeddings for text through the unified GraphQL API. 

```graphql
query {
    function {
        create_embedding(
            model: "openai_embeddings"
            input: "Hello, world!"
        )
    }
}
```

It also allows you to set up the model for the table or view, that contains the vector field. You should use the `@embeddings(model: "openai_embeddings", vector: "vec", distance: Cosine)` directive to specify the model for the vector field. The vector field should be of type `Vector`.

If it would be set up, you can use the `similarity` argument in the queries to perform semantic search based on vector similarity.

```graphql
type documents @table(name: "documents") 
    @embeddings(
        model: "openai_embeddings"
        vector: "vec"
        distance: Cosine
    ) {
  id: BigInt! @pk @default(sequence: "documents_id_seq")
  category: String!
  content: String!
  vec: Vector! @dim(len: 1536)
}
```

```graphql
query {
  documents(
    filter: { category: { eq: "news" } }
    semantic: {
      query: "Hugr is an open-source data platform"
      limit: 5
    }
  ) {
    id
    content
    vec
  }
}
```

It also allows you to perform mutations with vector fields. The vector will be generated automatically using the specified embeddings model.

```graphql
mutation {
  insert_documents(
    data: {
        category: "news"
        content: "Hugr is an open-source data platform"
    }
    summary: "Hugr is an open-source data platform that allows you to create GraphQL APIs over your databases."
  ) {
    id
    vec
  }
  update_documents(
    filter: { id: { eq: 1 } }
    data: { content: "Updated content" }
    summary: "Updated summary"
  ) {
    success
    message
    affected_rows
  }
}
```