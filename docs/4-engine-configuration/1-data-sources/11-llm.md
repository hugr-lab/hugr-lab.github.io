---
sidebar_position: 11
title: "LLM (AI Models)"
description: "Connect LLM providers (OpenAI, Anthropic, Gemini) for text generation and tool calling via GraphQL."
---

# LLM Data Sources

LLM data sources connect hugr to AI model providers for text generation and chat completion. Three provider types are supported, each implementing the same unified GraphQL interface via the [`core.models`](/docs/ai-models) runtime module.

## Provider Types

### `llm-openai` — OpenAI-Compatible

Covers: OpenAI, Azure OpenAI, Ollama, LM Studio, vLLM, Mistral, Qwen, LiteLLM, and any OpenAI-compatible endpoint.

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "my_llm"
      type: "llm-openai"
      prefix: "my_llm"
      path: "http://localhost:1234/v1/chat/completions?model=gemma-4&max_tokens=4096&timeout=120s"
    }) { name }
  }
}
```

### `llm-anthropic` — Anthropic

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "claude"
      type: "llm-anthropic"
      prefix: "claude"
      path: "https://api.anthropic.com/v1/messages?model=claude-sonnet-4-20250514&api_key=${secret:ANTHROPIC_KEY}&max_tokens=4096"
    }) { name }
  }
}
```

### `llm-gemini` — Google Gemini

```graphql
mutation {
  core {
    insert_data_sources(data: {
      name: "gemini"
      type: "llm-gemini"
      prefix: "gemini"
      path: "https://generativelanguage.googleapis.com/v1beta?model=gemini-2.5-flash&api_key=${secret:GEMINI_KEY}"
    }) { name }
  }
}
```

## Path Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `model` | yes | — | Model identifier (e.g., `gpt-4o`, `claude-sonnet-4-20250514`, `gemini-2.5-flash`) |
| `api_key` | no | — | API key. Supports `${secret:ENV_VAR}` syntax |
| `api_key_header` | no | `Authorization: Bearer` | Custom auth header (OpenAI only) |
| `max_tokens` | no | `4096` | Default max tokens per request |
| `timeout` | no | `60s` | Request timeout |
| `rpm` | no | — | Max requests per minute (0 = unlimited) |
| `tpm` | no | — | Max tokens per minute (0 = unlimited) |
| `rate_store` | no | — | Name of a `redis` data source for shared rate limit counters. If unset, counters are in-memory per-node |

## Configuration Examples

```bash
# OpenAI cloud
https://api.openai.com/v1/chat/completions?model=gpt-4o&api_key=${secret:OPENAI_API_KEY}

# Ollama local
http://localhost:11434/v1/chat/completions?model=mistral&timeout=120s

# LM Studio local
http://localhost:1234/v1/chat/completions?model=gemma-4&timeout=120s

# Azure OpenAI
https://myorg.openai.azure.com/openai/deployments/gpt4/chat/completions?model=gpt-4o&api_key=${secret:AZURE_KEY}&api_key_header=api-key

# vLLM / any OpenAI-compatible
http://gpu-server:8000/v1/chat/completions?model=llama3-70b&timeout=180s
```

## Usage

LLM sources are accessed through the [`core.models`](/docs/ai-models) module:

```graphql
# Simple completion
{ function { core { models {
  completion(model: "my_llm", prompt: "Explain GraphQL", max_tokens: 200) {
    content finish_reason prompt_tokens completion_tokens latency_ms
  }
} } } }

# Chat with tool calling
{ function { core { models {
  chat_completion(
    model: "claude",
    messages: [
      "{\"role\":\"system\",\"content\":\"You are a helpful assistant.\"}",
      "{\"role\":\"user\",\"content\":\"What is the weather?\"}"
    ],
    tools: ["{\"name\":\"get_weather\",\"description\":\"Get weather\",\"parameters\":{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}}}}"],
    max_tokens: 200
  ) {
    content finish_reason tool_calls
  }
} } } }
```

## Response Normalization

All providers return the same `llm_result` structure:

| Field | Description |
|-------|-------------|
| `content` | Generated text |
| `model` | Model that responded |
| `finish_reason` | `stop`, `tool_use`, or `length` |
| `prompt_tokens` | Input token count |
| `completion_tokens` | Output token count |
| `total_tokens` | Total tokens |
| `provider` | `openai`, `anthropic`, or `gemini` |
| `latency_ms` | Request latency |
| `tool_calls` | JSON string: `[{"id":"...","name":"...","arguments":{...}}]` |

## Rate Limiting

LLM sources support per-minute rate limits for both requests and tokens. Limits are enforced before making API calls.

### In-Memory (Single Node)

```bash
# Limit to 100 requests/min and 100k tokens/min
http://api.openai.com/v1/chat/completions?model=gpt-4o&api_key=${secret:OPENAI_KEY}&rpm=100&tpm=100000
```

Counters are per-node only. Suitable for single-node deployments.

### Shared (Redis)

For multi-node clusters, use a Redis data source for shared counters:

```bash
# First, register a Redis data source
# Then reference it in the LLM path:
http://api.openai.com/v1/chat/completions?model=gpt-4o&api_key=${secret:OPENAI_KEY}&rpm=100&tpm=100000&rate_store=redis
```

Redis keys auto-expire after 2 minutes. Key format: `ratelimit:{source_name}:rpm:{minute_window}`.

When rate limits are exceeded, requests return an error: `rate limit exceeded: N requests per minute exceeded for source_name`.

## See Also

- [AI Models Module](/docs/ai-models) — full `core.models` API reference
- [Embeddings](/docs/engine-configuration/data-sources/embeddings) — vector embedding sources
- [Redis](/docs/engine-configuration/data-sources/redis) — Redis data source for key-value storage and shared counters
