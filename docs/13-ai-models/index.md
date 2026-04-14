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
| `thought_signature` | `String` | Gemini 2.5+: thought signature for tool call verification (see [Tool Call Round-trip](#tool-call-round-trip)) |

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

### Tool Call Round-trip

To execute tool calls and send results back to the model, build a multi-turn message history:

1. **Get tool calls** from the initial `chat_completion` response (both `tool_calls` and `thought_signature` fields)
2. **Build the assistant message** including `tool_calls` and `thought_signature` (Gemini requires this for verification)
3. **Add tool result messages** with `role: "tool"` and `tool_call_id` matching the tool call `id`
4. **Send the full history** back to `chat_completion`

```graphql
# Step 1: Initial request → model returns tool_calls + thought_signature
{
  function { core { models { chat_completion(
    model: "gemini"
    messages: ["{\"role\":\"user\",\"content\":\"What is the weather in Tokyo?\"}"]
    tools: ["{\"name\":\"get_weather\",\"description\":\"Get weather\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}},\"required\":[\"city\"]}}"]
    max_tokens: 200
  ) {
    content finish_reason tool_calls thought_signature
  } } } }
}

# Step 2: Send tool results back (include thought_signature in the assistant message)
{
  function { core { models { chat_completion(
    model: "gemini"
    messages: [
      "{\"role\":\"user\",\"content\":\"What is the weather in Tokyo?\"}",
      "{\"role\":\"assistant\",\"tool_calls\":[{\"id\":\"abc\",\"name\":\"get_weather\",\"arguments\":{\"city\":\"Tokyo\"}}],\"thought_signature\":\"...\"}",
      "{\"role\":\"tool\",\"tool_call_id\":\"abc\",\"content\":\"{\\\"temperature\\\":22,\\\"condition\\\":\\\"sunny\\\"}\"}"
    ]
    tools: ["{\"name\":\"get_weather\",\"description\":\"Get weather\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}},\"required\":[\"city\"]}}"]
    max_tokens: 200
  ) {
    content finish_reason
  } } } }
}
```

:::info Gemini Thought Signatures
Gemini 2.5+ returns a `thought_signature` alongside tool calls. This signature **must** be included in the assistant message when sending tool results back — omitting it causes a 400 error. For OpenAI and Anthropic, `thought_signature` is empty and can be omitted.
:::

## Streaming Completions

Streaming completions deliver tokens incrementally via GraphQL subscriptions, allowing clients to display partial results as they arrive.

### Subscription Query

```graphql
subscription {
  core {
    models {
      completion(
        model: "my_llm"
        prompt: "Explain GraphQL in detail"
        max_tokens: 2048
        thinking_budget: 1024
      ) {
        type
        content
        model
        finish_reason
        tool_calls
        prompt_tokens
        completion_tokens
      }
    }
  }
}
```

The `chat_completion` function also supports streaming with the same event structure, including tool calling:

```graphql
subscription {
  core {
    models {
      chat_completion(
        model: "claude"
        messages: [
          "{\"role\":\"user\",\"content\":\"What is the weather in London?\"}"
        ]
        tools: ["{\"name\":\"get_weather\",\"description\":\"Get weather\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}}}}"]
        max_tokens: 1024
      ) {
        type
        content
        finish_reason
        tool_calls
        thought_signature
      }
    }
  }
}
```

### Event Types

Each streamed event has a `type` field indicating what it contains:

| Event Type | Description |
|------------|-------------|
| `content_delta` | Regular generated tokens (the main text output) |
| `reasoning` | Thinking/chain-of-thought tokens (when thinking is enabled) |
| `tool_use` | Tool call request from the model |
| `finish` | Final event with usage statistics (`prompt_tokens`, `completion_tokens`, `tool_calls`, `thought_signature`) |
| `error` | Error during generation |

### Thinking Budget

The `thinking_budget` parameter controls extended thinking (chain-of-thought) output:

- Set in the data source URL as the maximum allowed value (e.g., `thinking_budget=4096`)
- Set per-request via the `thinking_budget` argument (capped at the source-level maximum)
- Set to `0` or omit to disable thinking

When enabled, the model emits `reasoning` events containing its chain-of-thought before producing `content_delta` events with the final answer.

### Provider Support

| Provider | Thinking Support | Details |
|----------|-----------------|---------|
| OpenAI | `reasoning_content` field | Reasoning tokens returned in `reasoning_content`; available on o-series models |
| Anthropic | `thinking_delta` events | Requires `thinking_budget` to be set; uses `thinking` content blocks |
| Gemini | `thought` field | Requires `thinking_budget` and `includeThoughts` enabled; uses `thought` flag on parts |

## See Also

- [LLM Data Sources](/docs/engine-configuration/data-sources/llm) — registering LLM providers
- [Embeddings Data Source](/docs/engine-configuration/data-sources/embeddings) — vector embedding setup
- [Semantic Search](/docs/graphql/queries/vector-search) — using embeddings in queries
