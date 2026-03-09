---
sidebar-position: 11
title: Roadmap
---

The future plans for this project include:

- **Enhanced Documentation**: Continuously improve and expand the documentation to cover more use cases and provide better examples.
- Open source the airport-go package to allow community usage, contributions, and improvements. The package helps developers to build DuckDB airport extensions compatible service in Go.
- Implement the Hugr compatibility layer to DuckDB airport extensions data sources. Create the example how to ingest data from/to Hugr through DBT using DuckDB airport extensions.
- Implement DuckLake data source type in the Hugr, allowing users to make Lakehouse solutions with Hugr. Implement the time travel feature for the DuckLake data source in Hugr. Implement schema evolution feature through DuckDB airport extensions in Hugr.
- Create an example how to use Grafana with Hugr using GrapQL API.
- Implement the new HugrUI for Hugr to improve user experience and provide better management capabilities.
- Extend cookie based OIDC authentication support to embed Hugr into other applications.
- Implement the data ingestion tool (separate service) that will use Kafka and Airport protocol (arrow flight) to ingest data from various sources into DuckDB airport extensions.
- Create more examples and tutorials to help users get started with Hugr (including Spark and DBT ETL/ELT examples).
- Implement custom Spark connector to read/write data from/to Hugr through airport protocol.
- Improve cluster management capabilities — auto-scaling and failover mechanisms.
- Use standard Go templates for parameterized SQL in the schema compiler.
- Refactor query engine:
  - Planner improvements to optimize query execution plans.
  - OGC operations support (WFS) for geospatial data handling.
  - Using precompiled schemas as catalog sources for production deployments.
- Explore integration with other data processing frameworks and tools to expand Hugr's ecosystem.

### Completed

- ~~Make the MCP production ready~~ — MCP is now built into hugr with 10 tools, resources, and prompts for AI-assisted data exploration.
- ~~Implement a CLI to compile Hugr schemas and manage Hugr instances~~ — `hugr-tools` CLI with AI-powered schema summarization.
- ~~Move Hugr schema compiler to a separate package and refactor it~~ — Rule-based compiler with incremental compilation, extension dependency tracking, and improved validation.
- ~~Improve cluster management capabilities — heartbeat monitoring~~ — Single-binary cluster with push/pull schema sync, heartbeat, and ghost node detection.

Stable Releases:
- Aim to achieve stable releases for Hugr with regular updates and bug fixes.
- Focus on performance optimizations and security enhancements.
