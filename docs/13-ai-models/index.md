---
title: AI Models
sidebar_position: 1
description: Generate embeddings and LLM completions via the core.models runtime module.
keywords: [ai, llm, embeddings, openai, anthropic, gemini, completion, tool-calling]
---

# AI Models (`core.models`)

The `core.models` runtime module provides a unified GraphQL interface for AI model operations — text embeddings and LLM completions — across multiple providers.

## Quick Start

### 1. Register a Model

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "my_llm"
      type: "llm-openai"
      prefix: "my_llm"
      path: "http://localhost:1234/v1/chat/completions?model=gemma-4&timeout=120s"
    }) { name }
  }
}
```

### 2. Generate Text

```graphql
{
  function {
    core {
      models {
        completion(model: "my_llm", prompt: "Explain GraphQL in one sentence") {
          content
          latency_ms
        }
      }
    }
  }
}
```

## Functions

### `embedding`

Generate a single embedding vector.

```graphql
embedding(model: String!, input: String!): embedding_result
```

| Field | Type | Description |
|-------|------|-------------|
| `vector` | `Vector` | Embedding vector |
| `token_count` | `Int` | Tokens consumed |

### `embeddings`

Generate multiple embedding vectors in batch.

```graphql
embeddings(model: String!, input: String!): embeddings_result
```

Input is a JSON array of strings. Returns vectors and total token count.

### `completion`

Simple text completion.

```graphql
completion(
  model: String!
  prompt: String!
  max_tokens: Int
  temperature: Float
): llm_result
```

### `chat_completion`

Multi-turn chat with optional tool calling.

```graphql
chat_completion(
  model: String!
  messages: [String!]!
  tools: [String!]
  tool_choice: String
  max_tokens: Int
  temperature: Float
): llm_result
```

**Messages**: Each element is a JSON string with `role` and `content` fields:

```graphql
messages: [
  "{\"role\":\"system\",\"content\":\"You are a helpful assistant.\"}",
  "{\"role\":\"user\",\"content\":\"What is the weather?\"}"
]
```

**Tools**: Each element is a JSON string with `name`, `description`, and `parameters` (JSON Schema):

```graphql
tools: [
  "{\"name\":\"get_weather\",\"description\":\"Get weather\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}}}}"
]
```

**Tool choice**: `"auto"` (model decides), `"none"` (no tools), or a specific tool name.

### `model_sources`

List all registered AI model data sources.

```graphql
model_sources: [model_source_info]
```

Returns `name`, `type` (llm/embedding), `provider`, and `model` for each registered source.

## Response: `llm_result`

Normalized across all providers:

| Field | Type | Description |
|-------|------|-------------|
| `content` | `String` | Generated text |
| `model` | `String` | Model that responded |
| `finish_reason` | `String` | `stop`, `tool_use`, or `length` |
| `prompt_tokens` | `Int` | Input tokens |
| `completion_tokens` | `Int` | Output tokens |
| `total_tokens` | `Int` | Total tokens |
| `provider` | `String` | `openai`, `anthropic`, or `gemini` |
| `latency_ms` | `Int` | Request latency in milliseconds |
| `tool_calls` | `String` | JSON: `[{"id":"...","name":"...","arguments":{...}}]` |

## Supported Providers

| Type | Provider | Covers |
|------|----------|--------|
| `llm-openai` | OpenAI-compatible | OpenAI, Ollama, LM Studio, vLLM, Mistral, Qwen, Azure OpenAI |
| `llm-anthropic` | Anthropic | Claude models |
| `llm-gemini` | Google Gemini | Gemini models |
| `embedding` | OpenAI-compatible | Any OpenAI-compatible embedding endpoint |

All LLM providers support the same `completion`, `chat_completion`, and tool calling interface. Provider-specific API differences (auth headers, request format, response format) are handled transparently.

## Tool Calling

Tool calls are normalized across all providers into a unified format:

```json
[{"id": "call_123", "name": "get_weather", "arguments": {"city": "London"}}]
```

- **OpenAI**: `tool_calls[].function.arguments` (string) → parsed to object
- **Anthropic**: `content[].input` (object) → used as-is
- **Gemini**: `parts[].functionCall.args` (object) → used as-is

## See Also

- [LLM Data Sources](/docs/engine-configuration/data-sources/llm) — registering LLM providers
- [Embeddings Data Source](/docs/engine-configuration/data-sources/embeddings) — vector embedding setup
- [Semantic Search](/docs/graphql/queries/vector-search) — using embeddings in queries
