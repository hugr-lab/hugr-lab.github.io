---
title: "GraphQL Extensions"
sidebar_position: 3
description: Understanding GraphQL Extensions in Hugr - JQ transformations and performance statistics
keywords: [graphql, extensions, jq, stats, performance, metrics]
---

# GraphQL Extensions

GraphQL Extensions in Hugr provide a standardized way to return additional metadata, transformation results, and performance metrics alongside query responses. Extensions appear in the `extensions` field of the GraphQL response and complement the main `data` field.

## Overview

### What are GraphQL Extensions?

GraphQL Extensions are additional data returned in the response that don't fit into the standard `data` field. In Hugr, extensions are used to return:
- **JQ transformation results**: Results of server-side data transformations
- **Performance statistics**: Query execution metrics and timings
- **Metadata**: Additional information about query execution

### Extension Format

Extensions always follow a hierarchical structure that mirrors the query structure:

```json
{
  "data": {
    // Main query results
  },
  "extensions": {
    "node_name": {
      "extension_type": {
        // Extension data
      }
    }
  }
}
```

The extension hierarchy matches the query node hierarchy, with nested nodes appearing under a `children` property.

## Extension Types

Hugr implements two types of GraphQL extensions:

### 1. JQ Extension

The `jq` extension contains results of JQ transformations applied to query results. It appears when using the `jq()` query or the `/jq-query` endpoint.

**Key characteristics**:
- Returns transformed data according to JQ expression
- Located in `extensions.<query_name>.jq`
- Can be combined with other extensions
- See [JQ Transformations](/docs/graphql/jq-transformations) for detailed documentation

### 2. Stats Extension

The `stats` extension returns performance metrics for query execution. It is activated by applying the `@stats` directive to queries, fields, or mutations.

**Key characteristics**:
- Provides detailed timing information
- Can be applied at query level or field level
- Supports hierarchical statistics
- Useful for performance optimization and monitoring

## Stats Extension

### Using the @stats Directive

The `@stats` directive can be applied to:
- **Entire query**: Get overall query execution time
- **Specific fields**: Get per-field execution metrics
- **Multiple fields**: Track multiple fields independently

#### Syntax

```graphql
query @stats {
  # Query execution stats
}

query {
  field @stats {
    # Field execution stats
  }
}
```

### Stats Metrics

The stats extension provides the following metrics:

| Metric | Description | Level |
|--------|-------------|-------|
| `compile_time` | Time spent compiling the query | Field |
| `exec_time` | Time spent executing the query | Field |
| `node_time` | Total time for the node (including compilation and execution) | Field |
| `planning_time` | Time spent planning the query execution | Field |
| `total_time` | Total query execution time | Query |
| `name` | Name of the field or query | All |

### Examples

#### Example 1: Single Field Stats

Apply `@stats` to a single field to get its execution metrics:

```graphql
query {
  op2023 {
    providers_aggregation @stats {
      _rows_count
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "op2023": {
      "providers_aggregation": {
        "_rows_count": 628012
      }
    }
  },
  "extensions": {
    "op2023": {
      "children": {
        "providers_aggregation": {
          "stats": {
            "compile_time": "212.791µs",
            "exec_time": "1.96875ms",
            "name": "providers_aggregation",
            "node_time": "2.181541ms",
            "planning_time": "180.291µs"
          }
        }
      }
    }
  }
}
```

**Stats breakdown**:
- **compile_time**: 212.791µs - time to compile the query
- **exec_time**: 1.96875ms - actual query execution time
- **node_time**: 2.181541ms - total time (compile + plan + exec)
- **planning_time**: 180.291µs - time to plan query execution

#### Example 2: Multiple Field Stats

Track statistics for multiple fields:

```graphql
query {
  op2023 {
    providers_aggregation @stats {
      _rows_count
    }
    general_payments_aggregation @stats {
      _rows_count
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "op2023": {
      "general_payments_aggregation": {
        "_rows_count": 14607336
      },
      "providers_aggregation": {
        "_rows_count": 628012
      }
    }
  },
  "extensions": {
    "op2023": {
      "children": {
        "general_payments_aggregation": {
          "stats": {
            "compile_time": "212.084µs",
            "exec_time": "2.185083ms",
            "name": "general_payments_aggregation",
            "node_time": "2.397167ms",
            "planning_time": "177.625µs"
          }
        },
        "providers_aggregation": {
          "stats": {
            "compile_time": "195.875µs",
            "exec_time": "2.19775ms",
            "name": "providers_aggregation",
            "node_time": "2.393625ms",
            "planning_time": "162.5µs"
          }
        }
      }
    }
  }
}
```

This allows you to compare performance between different fields and identify bottlenecks.

#### Example 3: Query-Level Stats

Apply `@stats` to the entire query to get overall execution time:

```graphql
query @stats {
  op2023 {
    providers_aggregation {
      _rows_count
    }
    general_payments_aggregation {
      _rows_count
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "op2023": {
      "general_payments_aggregation": {
        "_rows_count": 14607336
      },
      "providers_aggregation": {
        "_rows_count": 628012
      }
    }
  },
  "extensions": {
    "children": {},
    "stats": {
      "name": "",
      "total_time": "2.216625ms"
    }
  }
}
```

**Note**: Query-level stats appear at the root of `extensions` and only include `total_time` and `name` (empty for anonymous queries).

#### Example 4: Field with Top-Level Query

Apply stats to a specific field inside a query with top-level stats:

```graphql
query {
  h3(resolution: 6) @stats {
    cell_id
    geometry
  }
}
```

**Response**:
```json
{
  "data": {
    "h3": [
      {
        "cell_id": "862ba107fffffff",
        "geometry": "..."
      }
    ]
  },
  "extensions": {
    "h3": {
      "stats": {
        "compile_time": "1.471792ms",
        "exec_time": "21.653323208s",
        "name": "h3",
        "node_time": "21.654795s",
        "planning_time": "1.017042ms"
      }
    }
  }
}
```

This example shows a long-running query (21.6 seconds) with detailed timing breakdown.

## Combining JQ and Stats Extensions

You can combine JQ transformations with stats collection to both transform data and measure performance.

### Example 1: JQ with Field Stats

```graphql
query {
  jq(query: ".op2023.providers_aggregation") {
    op2023 {
      providers_aggregation @stats {
        _rows_count
      }
      general_payments_aggregation {
        _rows_count
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": {
      "op2023": {
        "providers_aggregation": {
          "_rows_count": 628012
        },
        "general_payments_aggregation": {
          "_rows_count": 14607336
        }
      }
    }
  },
  "extensions": {
    "jq": {
      "children": {
        "op2023": {
          "children": {
            "providers_aggregation": {
              "stats": {
                "compile_time": "195.875µs",
                "exec_time": "2.19775ms",
                "name": "providers_aggregation",
                "node_time": "2.393625ms",
                "planning_time": "162.5µs"
              }
            }
          }
        }
      },
      "jq": {
        "_rows_count": 628012
      }
    }
  }
}
```

**Extension structure**:
- `extensions.jq.jq`: Contains the JQ transformation result
- `extensions.jq.children.op2023.children.providers_aggregation.stats`: Contains field stats

### Example 2: Multiple JQ with Stats

```graphql
query {
  jq(query: ".op2023.providers_aggregation") {
    op2023 {
      providers_aggregation {
        _rows_count
      }
      general_payments_aggregation {
        _rows_count
      }
    }
  }
  payments: jq(query: ".op2023.general_payments_aggregation") {
    op2023 {
      general_payments_aggregation @stats {
        _rows_count
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": null,
    "payments": null
  },
  "extensions": {
    "jq": {
      "jq": {
        "_rows_count": 628012
      }
    },
    "payments": {
      "children": {
        "op2023": {
          "children": {
            "general_payments_aggregation": {
              "stats": {
                "compile_time": "194.417µs",
                "exec_time": "2.013292ms",
                "name": "general_payments_aggregation",
                "node_time": "2.207709ms",
                "planning_time": "159.125µs"
              }
            }
          }
        }
      },
      "jq": {
        "_rows_count": 14607336
      }
    }
  }
}
```

Each JQ query has its own extension section with both `jq` transformation results and `stats` (if applied).

### Example 3: Query-Level Stats with JQ

```graphql
query @stats {
  jq(query: ".op2023.providers_aggregation") {
    op2023 {
      providers_aggregation {
        _rows_count
      }
      general_payments_aggregation {
        _rows_count
      }
    }
  }
  payments: jq(query: ".op2023.general_payments_aggregation") {
    op2023 {
      general_payments_aggregation @stats {
        _rows_count
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": null,
    "payments": null
  },
  "extensions": {
    "children": {
      "jq": {
        "jq": {
          "_rows_count": 628012
        }
      },
      "payments": {
        "children": {
          "op2023": {
            "children": {
              "general_payments_aggregation": {
                "stats": {
                  "compile_time": "194.417µs",
                  "exec_time": "2.013292ms",
                  "name": "general_payments_aggregation",
                  "node_time": "2.207709ms",
                  "planning_time": "159.125µs"
                }
              }
            }
          }
        },
        "jq": {
          "_rows_count": 14607336
        }
      }
    },
    "stats": {
      "name": "",
      "total_time": "2.731416ms"
    }
  }
}
```

**Extension structure**:
- `extensions.stats`: Query-level total execution time
- `extensions.children.jq`: JQ transformation results
- `extensions.children.payments.children...stats`: Field-level stats
- `extensions.children.payments.jq`: JQ transformation results

### Example 4: JQ with @stats on JQ Query

Apply `@stats` to the `jq()` query itself to measure JQ transformation performance:

```graphql
query {
  jq(query: ".op2023.providers_aggregation") @stats {
    op2023 {
      providers_aggregation {
        _rows_count
      }
      general_payments_aggregation {
        _rows_count
      }
    }
  }
  payments: jq(query: ".op2023.general_payments_aggregation") {
    op2023 {
      general_payments_aggregation @stats {
        _rows_count
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": null,
    "payments": null
  },
  "extensions": {
    "jq": {
      "jq": {
        "_rows_count": 628012
      },
      "stats": {
        "compiler_time": "59.042µs",
        "data_request_time": "2.46025ms",
        "execution_time": "9.083µs",
        "node_time": "2.464583ms",
        "runs": 1,
        "serialization_time": "46.125µs",
        "transformed": 1
      }
    },
    "payments": {
      "children": {
        "op2023": {
          "children": {
            "general_payments_aggregation": {
              "stats": {
                "compile_time": "194.5µs",
                "exec_time": "2.031958ms",
                "name": "general_payments_aggregation",
                "node_time": "2.226458ms",
                "planning_time": "163.292µs"
              }
            }
          }
        }
      },
      "jq": {
        "_rows_count": 14607336
      }
    }
  }
}
```

**JQ-specific stats**:
- `compiler_time`: Time to compile JQ expression
- `data_request_time`: Time to fetch data for transformation
- `execution_time`: Time to execute JQ transformation
- `serialization_time`: Time to serialize result
- `runs`: Number of times JQ expression was executed
- `transformed`: Number of items transformed

### Example 5: Nested Stats with JQ

```graphql
query {
  jq(query: ".op2023.providers_aggregation") @stats {
    op2023 {
      providers_aggregation @stats {
        _rows_count
      }
      general_payments_aggregation {
        _rows_count
      }
    }
  }
  payments: jq(query: ".op2023.general_payments_aggregation") {
    op2023 {
      general_payments_aggregation @stats {
        _rows_count
      }
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "jq": null,
    "payments": null
  },
  "extensions": {
    "jq": {
      "children": {
        "op2023": {
          "children": {
            "providers_aggregation": {
              "stats": {
                "compile_time": "107.458µs",
                "exec_time": "1.455209ms",
                "name": "providers_aggregation",
                "node_time": "1.562667ms",
                "planning_time": "88.292µs"
              }
            }
          }
        }
      },
      "jq": {
        "_rows_count": 628012
      },
      "stats": {
        "compiler_time": "50.958µs",
        "data_request_time": "1.736125ms",
        "execution_time": "12.583µs",
        "node_time": "1.740625ms",
        "runs": 1,
        "serialization_time": "36.917µs",
        "transformed": 1
      }
    },
    "payments": {
      "children": {
        "op2023": {
          "children": {
            "general_payments_aggregation": {
              "stats": {
                "compile_time": "115.583µs",
                "exec_time": "1.650875ms",
                "name": "general_payments_aggregation",
                "node_time": "1.766458ms",
                "planning_time": "95.958µs"
              }
            }
          }
        }
      },
      "jq": {
        "_rows_count": 14607336
      }
    }
  }
}
```

This example shows:
- JQ transformation stats at `extensions.jq.stats`
- Field execution stats at `extensions.jq.children.op2023.children.providers_aggregation.stats`
- JQ transformation result at `extensions.jq.jq`

## Extension Hierarchy

Extensions follow a hierarchical structure that mirrors the query structure:

```
extensions
├── <query_name>
│   ├── stats (if @stats applied to query)
│   ├── jq (if jq() query)
│   └── children
│       └── <field_name>
│           ├── stats (if @stats applied to field)
│           └── children
│               └── <nested_field>
│                   └── stats
└── stats (if @stats applied to anonymous query)
```

### Hierarchy Rules

1. **Root level**: Query-level stats (for queries with `@stats`)
2. **Query name level**: JQ results and query-specific data
3. **Children**: Nested fields and their stats
4. **Recursive**: Structure repeats for nested fields

## Use Cases

### 1. Performance Monitoring

Track query execution time to identify slow queries:

```graphql
query @stats {
  users {
    id
    orders @stats {
      id
      total
    }
  }
}
```

Use the stats to:
- Identify slow fields
- Optimize query structure
- Monitor query performance over time
- Set up alerts for slow queries

### 2. Data Transformation with Metrics

Transform data while tracking performance:

```graphql
query {
  transformed: jq(query: ".users | map({id, name})") @stats {
    users {
      id
      name
      email
      created_at
    }
  }
}
```

Benefits:
- Measure transformation overhead
- Compare transformation vs query time
- Optimize JQ expressions

### 3. A/B Testing Query Performance

Compare performance of different query approaches:

```graphql
query @stats {
  approach_a: users(limit: 100) @stats {
    id
    name
  }
  approach_b: users_optimized(limit: 100) @stats {
    id
    name
  }
}
```

Use stats to determine which approach is faster.

### 4. Debugging Slow Queries

Add `@stats` to different levels to identify bottlenecks:

```graphql
query {
  catalog @stats {
    products @stats {
      id
      name
      reviews @stats {
        rating
      }
    }
  }
}
```

Check which field contributes most to total execution time.

## Best Practices

### 1. Use Stats Selectively

Apply `@stats` only when needed:
- **Development**: Add to all fields to identify bottlenecks
- **Production**: Add only to critical queries or when debugging
- **Monitoring**: Use query-level stats for overview

```graphql
# Development - detailed stats
query {
  catalog @stats {
    products @stats {
      id
    }
  }
}

# Production - minimal overhead
query @stats {
  catalog {
    products {
      id
    }
  }
}
```

### 2. Combine with Logging

Log extension stats for analysis:

```javascript
const response = await fetchGraphQL(query);
if (response.extensions?.stats) {
  logger.info('Query performance', {
    query: queryName,
    totalTime: response.extensions.stats.total_time
  });
}
```

### 3. Set Performance Budgets

Use stats to enforce performance budgets:

```javascript
const MAX_QUERY_TIME_MS = 100;

if (parseTime(response.extensions.stats.total_time) > MAX_QUERY_TIME_MS) {
  logger.warn('Query exceeded performance budget', {
    query: queryName,
    time: response.extensions.stats.total_time,
    budget: MAX_QUERY_TIME_MS
  });
}
```

### 4. Monitor JQ Transformation Performance

When using JQ transformations, track their impact:

```graphql
query {
  jq(query: "complex transformation") @stats {
    large_dataset {
      # many fields
    }
  }
}
```

Check `compiler_time`, `execution_time`, and `serialization_time` to ensure JQ isn't causing bottlenecks.

### 5. Use Hierarchical Stats Wisely

Apply stats at different levels based on needs:

```graphql
# Check if entire query is slow
query @stats { ... }

# Identify which field is slow
query {
  field1 @stats { ... }
  field2 @stats { ... }
}

# Drill down into nested fields
query {
  parent {
    child @stats { ... }
  }
}
```

## Performance Impact

### Stats Overhead

The `@stats` directive has minimal performance overhead:
- **Query-level stats**: ~0.01ms overhead
- **Field-level stats**: ~0.01ms per field
- **Total impact**: Typically <1% of query execution time

### When to Avoid Stats

Avoid excessive use of `@stats` in:
- **High-frequency queries**: Where every microsecond matters
- **Large fan-out queries**: With hundreds of fields
- **Production hot paths**: Unless actively debugging

Use query-level stats for general monitoring and field-level stats only when drilling into specific issues.

## Troubleshooting

### Stats Not Appearing

**Problem**: Extensions don't contain stats even though `@stats` is applied.

**Solutions**:
1. Check that the query executed successfully (no GraphQL errors)
2. Verify `@stats` syntax is correct
3. Ensure hugr version supports `@stats` directive
4. Check server logs for errors

### Unexpected Timing Values

**Problem**: Stats show unexpectedly high or low values.

**Explanations**:
- **High `compile_time`**: Complex query or first-time query compilation (not cached)
- **High `exec_time`**: Large dataset, slow data source, or unoptimized query
- **High `node_time` vs `exec_time`**: Overhead from planning, compilation, or serialization
- **Low values**: Results may be cached

### Hierarchical Stats Missing

**Problem**: Expected nested stats in `children` don't appear.

**Solutions**:
1. Ensure `@stats` is applied to the specific field
2. Check that the field actually executed (not null/skipped)
3. Verify query structure matches expected hierarchy

## See Also

### Documentation
- [JQ Transformations](/docs/graphql/jq-transformations) - Detailed JQ transformation documentation
- [REST API /jq-query Endpoint](/docs/querying/jq-endpoint) - JQ endpoint with extensions
- [GraphQL Directives Reference](/docs/references/directives) - All available directives
- [GraphQL Queries](/docs/graphql/queries) - Query documentation

### Related Topics
- [Performance Optimization](/docs/deployment/config#performance) - General performance tips
- [Monitoring](/docs/deployment/config#monitoring) - Setting up monitoring
- [Caching](/docs/deployment/caching) - Cache configuration for better performance
