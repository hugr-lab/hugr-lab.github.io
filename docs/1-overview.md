---
sidebar_position: 1
title: Overview
description: Overview of the hugr platform, its features, architecture, and use cases.
---

## Introduction

Let's discover **hugr** in less than 5 minutes.

**hugr** is an **Open Source Data Mesh platform** and high-performance **GraphQL backend** designed for accessing **distributed data sources**, analytics, geospatial processing, and **rapid backend development** for applications and BI tools. The platform offers a **unified GraphQL API** across diverse sources and focuses on scalable, modular big data processing.

### What is hugr?

hugr combines the power of modern data architecture patterns with the flexibility of GraphQL to create a comprehensive solution for:

- **Data Mesh Architecture**: Enabling decentralized data ownership while maintaining unified access
- **Rapid API Development**: Quickly creating GraphQL APIs over existing data sources
- **Analytics & BI**: Optimized for OLAP workloads and large-scale analytical queries
- **Geospatial Processing**: Native support for spatial data types and operations
- **Application Backends**: Serving as a universal data access layer for applications

### Project Status

- **License**: MIT
- **Open Source**: Free for commercial and non-commercial use
- **Repository**: [hugr-lab/hugr](https://github.com/hugr-lab/hugr)
- **Core Engine**: [hugr-lab/query-engine](https://github.com/hugr-lab/query-engine)
- **Docker Images**: [hugr-lab/docker](https://github.com/r/hugr-lab/docker)
- **Documentation**: [docs](https://hugr-lab.github.io/docs/)

## Key Features

### 1. Unified GraphQL API

hugr provides rapid creation of GraphQL APIs over multiple data sources, similar to data mapping systems. It supports:

- CRUD operations with full transaction support
- Complex aggregations, joins, and filtering
- Cross-source queries and relationships
- Real-time data access for applications and BI tools

### 2. Independent and Declarative Schema Management

Schemas are defined using GraphQL SDL with extended directives, offering:

- **Modular Design**: Schema modules can be reused across different sources
- **Relationship Support**: Define joins, aggregations, and filtering declaratively
- **Accessibility**: Data engineers can work without deep GraphQL specialization
- **Hierarchical Organization**: Logical API structure through directive-based modules

### 3. Supported Data Sources

**Relational Databases**, native connectors:

- DuckDB - used as the core query engine and supports attaching DuckDB databases as sources,
- PostgreSQL (with PostGIS, TimescaleDB). Hugr supports filters, sorting, limits, aggregations and in source joins pushing down to the PostgreSQL databases.

**Files**:

Through DuckDB hugr provides access to various file formats and storage systems:

- Parquet, Apache Iceberg, Delta Lake, CSV, JSON
- Hive-style partitioning
- Stored locally or in cloud object storage (S3-compatible)

**Services**:

- REST APIs (HTTP). Supports outbound requests authentication with OpenAPI flows: http Basic, ApiKey (in headers or parameters), OAuth2 (client credentials, password).
- Arrow Flight (in development)

**Planned**:

- MySQL (through DuckDB with out joins pushing down)
- SQLite (through DuckDB with out joins pushing down)
- ClickHouse

### 4. Analytics and Geospatial Support

hugr is optimized for analytical workloads:

- **OLAP Operations**: Key-based aggregation, including referenced and joined data
- **Spatial Analytics**: Native spatial types and cross-source spatial joins and aggregations
- **Large Dataset Processing**: Efficient handling of big data through DuckDB
- **Arrow IPC**: Custom protocol for efficient data transfer and put it into Python environments

### 5. Advanced Features

**Result Transformation**:

- Server-side jq transformations
- Customize JSON output formats per client requirements
- Aggregate, flatten, or nest results as needed

**Security & Access Control**:

- OAuth2 and OpenID Connect integration
- Field-level and row-level security
- Role-based permissions with predefined filters
- Mutation auto-fill for user/role context

**Performance & Scalability**:

- Two-level caching (in-memory and external via Redis/Memcached)
- Cluster mode with load balancing
- Horizontal scaling capabilities

## Usage Overview

hugr serves multiple use cases across different domains:

### Data Access Backend for Applications

- Universal GraphQL layer over existing data sources
- Centralized schema and access control management
- Minimal integration effort for data-first applications

### Embedded Query Engine

- Reusable Go package for custom services
- Query compiler and execution engine
- Integration of custom Go functions as data sources

### Data Mesh Platforms

- Federated access through a single API
- Decentralized data ownership model
- Domain-specific modeling and scaling

### Analytics & MLOps Integration

- OLAP and spatial analytics support
- Export to Arrow IPC and Python (Pandas/GeoDataFrame)
- ETL/ELT and ML pipeline result integration
- Continuous data lifecycle: Ingestion → Processing → ML → API Access

## Architecture

hugr's architecture is built around several core components:

### DuckDB Analytical Engine

hugr uses [DuckDB](https://duckdb.org/) as its primary analytical engine, providing:

- **High Performance**: Optimized for analytical queries
- **Format Flexibility**: Support for multiple data formats and sources
- **In-Process Execution**: Efficient memory usage and processing
- **Go Integration**: Seamless integration via [go-duckdb](https://github.com/marcboeker/go-duckdb)

### Core DB

The core database that is used by query engine to store and retrieve:

- **Catalog sources**: Source of catalog files logical grouped by data source type and domains
- **Data sources**: Registered data sources with their connection parameters and Catalogs
- **Roles**: User roles with permissions (access control policies)

The core database can be DuckDB (file or memory) or PostgreSQL, depending on the deployment configuration. It is used to store metadata about data sources, schemas, and access control policies.

CoreDB can be configured as read-only - it defines by configuration parameters or always for a DuckDB file, that is stored in the S3 bucket.

### Go Core Engine

The core logic is implemented in the open-source Go package [hugr-lab/query-engine](https://github.com/hugr-lab/query-engine), handling:

- Data source management and abstraction
- GraphQL schema compilation and validation
- Query transformation from GraphQL to source-specific operations
- Caching layer management
- Access control enforcement
- HTTP GraphQL request processing via `http.Handler` interface

### Hugr server

The `server` server is a lightweight HTTP server, written in Go, that:

- Serves the GraphQL API
- Handles schema management and introspection
- Manages data source connections
- Provides a web interface for schema exploration and query testing (GraphiQL)
- Supports configuration via environment variables

[hugr-lab/hugr](https://github.com/hugr-lab/hugr/cmd/server) repository contains the server implementation, which can be run as a standalone binary or as a Docker container.

### Hugr cluster management

The `management` component manages multi-node deployments, providing:

- **Cluster Coordination**: Synchronization of attached data sources and S3 storage access configuration
- **Node health monitoring**: Monitoring and management of cluster nodes
- **Core DB migration**: Core database schema migrations for cluster-wide consistency

[hugr-lab/hugr](https://github.com/hugr-lab/hugr/cmd/management) repository contains the management node implementation, which can be run as a standalone binary or as a Docker container.

### Schema & Access Separation

hugr maintains clean separation between:

- **Data Schema Logic**: Defined in GraphQL SDL with custom directives
- **Access Control Policies**: Role-based permissions, visibility rules, and security filters

This separation enables flexible security models without coupling data structure to access patterns.

### Hugr multipart IPC Protocol

hugr implements a custom HTTP Multipart IPC protocol for efficient data transfer between the server and clients, particularly for large datasets. Key features include:

- Efficient streaming of large datasets
- Python-compatible output (`pandas.DataFrame` and `GeoDataFrame`)
- Direct integration with analytics and ML pipelines
- Specification available at: [hugr-ipc.md](https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md)

The Python client library `hugr-client` provides a convenient interface for working with the Arrow IPC protocol, allowing users to easily query data and process results in Python environments.
[hugr-lab/docker](https://github.com/hugr-lab/hugr-client) repository contains the client implementation, which can be installed via pip.

## 1.5. Scalability & Clustering

hugr is designed for enterprise-scale deployments:

### Multi-Node Operation

- **Source Synchronization**: Consistent data access across cluster nodes
- **Load Balancing**: Distribute query load across multiple instances
- **Fault Tolerance**: Resilient to individual node failures

### Horizontal Scaling

- **Stateless Design**: Nodes can be added or removed dynamically
- **Shared Configuration**: Centralized schema and access control management
- **Performance Optimization**: Caching and query optimization across the cluster

### Caching Strategy

Two-level caching architecture:

- **In-Memory Cache**: Fast access to frequently requested data
- **External Cache**: Redis or Memcached for shared cache across cluster nodes

[hugr-lab/docker](https://github.com/hugr-lab/docker) contains Docker images for both the `server` server and `management` management components, allowing easy deployment in containerized environments.
It also provides **k8s chart templates** to deploy hugr in Kubernetes clusters, including support for multi-node setups with load balancing and caching.

This comprehensive architecture makes hugr suitable for both small-scale applications and large enterprise data platforms, providing the flexibility to grow with your data needs while maintaining high performance and reliability.
