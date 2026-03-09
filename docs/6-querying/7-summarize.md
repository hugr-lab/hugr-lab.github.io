---
title: "Schema Summarization"
sidebar_position: 7
description: AI-powered schema documentation generator using LLM
keywords: [summarize, schema, llm, ai, documentation, hugr-tools]
---

# Schema Summarization

## Overview

The `summarize` command is an AI-powered schema documentation generator, part of the `hugr-tools` CLI. It connects to a running hugr instance via GraphQL, reads schema metadata (types, fields, functions, modules, and data sources), and uses a large language model (LLM) to generate human-readable descriptions for every entity in the schema.

Generated summaries are written back to the hugr instance and become available through the GraphQL API, making schema exploration easier for end users and AI assistants alike.

## Installation

### Download from GitHub Releases

Pre-built binaries are available on the [GitHub Releases](https://github.com/hugr-lab/query-engine/releases) page. Download the appropriate binary for your platform.

You can also use the install script:

```bash
curl -sSL https://raw.githubusercontent.com/hugr-lab/query-engine/main/install-hugr-tools.sh | bash
```

### Build from Source

```bash
CGO_CFLAGS="-O1 -g" go build -tags=duckdb_arrow ./cmd/hugr-tools
```

## Usage

Run the `summarize` subcommand against a running hugr instance:

```bash
hugr-tools summarize --api-key <LLM_API_KEY> [flags]
```

### Full Pipeline (default)

When no entity-specific flags are provided, the tool runs the complete 4-phase pipeline and processes all unsummarized entities:

```bash
hugr-tools summarize --api-key $OPENAI_API_KEY
```

### Single Entity

You can summarize a single entity by specifying one of the following flags:

```bash
# Summarize a single type (table or view)
hugr-tools summarize --type <type_name> --api-key $OPENAI_API_KEY

# Summarize a single function (format: type_name.field_name)
hugr-tools summarize --function <type_name.field_name> --api-key $OPENAI_API_KEY

# Summarize a single module
hugr-tools summarize --module <module_name> --api-key $OPENAI_API_KEY

# Summarize a single data source
hugr-tools summarize --source <source_name> --api-key $OPENAI_API_KEY
```

### Filtering by Catalog

Use `--catalog` to limit summarization to a specific catalog:

```bash
hugr-tools summarize --catalog my_catalog --api-key $OPENAI_API_KEY
```

### Hugr Endpoint

By default, the tool connects to `http://localhost:15000/ipc`. Use `--url` to specify a different endpoint:

```bash
hugr-tools summarize --url http://hugr.example.com/ipc --api-key $OPENAI_API_KEY
```

## LLM Providers

The tool supports multiple LLM providers via the `--provider` flag:

| Provider | Description | Default Model |
|----------|-------------|---------------|
| `openai` | OpenAI API (default) | `gpt-4o-mini` |
| `anthropic` | Anthropic API | — |
| `custom` | Any OpenAI-compatible endpoint (requires `--base-url`) | — |

### Examples

```bash
# OpenAI (default)
hugr-tools summarize --provider openai --model gpt-4o --api-key $OPENAI_API_KEY

# Anthropic
hugr-tools summarize --provider anthropic --model claude-sonnet-4-20250514 --api-key $ANTHROPIC_API_KEY

# Custom OpenAI-compatible endpoint (e.g., local Ollama, vLLM)
hugr-tools summarize --provider custom \
  --base-url http://localhost:11434/v1 \
  --model llama3 \
  --api-key unused
```

## Pipeline Phases

When running the full pipeline (no single-entity flags), summarization proceeds in four sequential phases:

1. **Data Objects** — Tables and views, including their fields, extra fields, relations, function calls, filters, and arguments.
2. **Functions** — All function types (function, mutation_function, table_function, table_function_join), including parameters and return types.
3. **Data Sources** — Data source descriptions generated from their contained types and functions.
4. **Modules** — Module-level summaries generated from the types, functions, and sources they contain.

Each phase processes only entities that have not yet been summarized, making it safe to re-run the command incrementally.

## Additional Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--max-connections` | `5` | Number of concurrent LLM requests |
| `--llm-timeout` | `60s` | Per-request timeout for LLM calls |
| `--retries` | `3` | Maximum retry attempts when LLM response parsing fails |
| `--secret` | — | API key for hugr authentication |
| `--secret-header` | `x-api-key` | Header name for the hugr API key |
| `--timeout` | `30s` | HTTP request timeout for hugr GraphQL calls |

## Environment Variables

All key flags can be configured via environment variables:

| Variable | Corresponding Flag | Description |
|----------|-------------------|-------------|
| `SUMMARIZE_PROVIDER` | `--provider` | LLM provider (`openai`, `anthropic`, `custom`) |
| `SUMMARIZE_MODEL` | `--model` | LLM model name |
| `SUMMARIZE_BASE_URL` | `--base-url` | Custom LLM API base URL |
| `SUMMARIZE_API_KEY` | `--api-key` | LLM API key |
| `HUGR_URL` | `--url` | Hugr GraphQL endpoint |
| `HUGR_SECRET` | `--secret` | Hugr API key for authentication |
| `HUGR_SECRET_HEADER` | `--secret-header` | Hugr API key header name |

Flag values take precedence over environment variables when both are set.
