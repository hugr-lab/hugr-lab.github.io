---
sidebar_position: 10
title: Join Us
description: Technology stack and contribution guide for hugr contributors
---

## Join Our Community

Welcome to the **hugr project**! We are building an open-source Data Mesh platform and high-performance GraphQL backend, and we welcome contributions from developers around the world.

Whether you're interested in database internals, distributed systems, analytics, or GraphQL, there's a place for you in our community.

## Technology Stack

The hugr ecosystem uses a diverse set of modern technologies. Here's what we work with:

### Core Technologies

#### Go (Golang) - Primary Language

Go is the **primary language** for hugr development. We use it for:

- **Query Engine**: Core engine implementation at [hugr-lab/query-engine](https://github.com/hugr-lab/query-engine)
- **Server**: HTTP server and GraphQL API at [hugr-lab/hugr](https://github.com/hugr-lab/hugr)
- **Data Source Connectors**: Native database drivers and integrations
- **Cluster Management**: Multi-node coordination and synchronization

**What you need:**
- Strong Go programming skills
- Understanding of concurrent programming and goroutines
- Experience with database connectivity and query optimization
- Knowledge of HTTP servers and API development

#### SQL - Deep Expertise Required

SQL is at the heart of hugr's data processing:

- **Query Transformation**: Converting GraphQL to optimized SQL
- **Cross-source Joins**: Complex query planning and execution
- **Aggregations**: Advanced analytical queries
- **Performance Optimization**: Index strategies, query plans, and execution optimization

**What you need:**
- Deep understanding of SQL (not just basic SELECT/INSERT)
- Experience with query optimization and execution plans
- Knowledge of database internals and indexing strategies
- Understanding of OLAP workloads and analytical queries

#### DuckDB and C++

DuckDB is our core analytical engine:

- **Engine Integration**: DuckDB embedded in Go via CGO
- **Extensions**: Building custom DuckDB extensions in C++
- **Performance Tuning**: Optimizing analytical queries
- **Format Support**: Working with Parquet, Arrow, and other analytical formats

**What you need:**
- C++ programming skills (for DuckDB extensions)
- Understanding of CGO for Go-C++ integration
- Knowledge of columnar databases and analytical workloads
- Experience with vectorized query execution (bonus)

### Analytics and Machine Learning

#### Python - Analytics and ML

Python is the primary tool for data analytics and machine learning in the hugr ecosystem:

- **Data Analysis**: Working with hugr data using pandas and GeoPandas
- **ML Pipelines**: Building machine learning models on top of hugr data
- **Client Library**: Python client at [hugr-lab/hugr-client](https://github.com/hugr-lab/hugr-client)
- **Integration**: Arrow IPC protocol for efficient data transfer

**What you need:**
- Python programming with pandas/GeoPandas experience
- Understanding of ML workflows and data pipelines
- Knowledge of Arrow format and data serialization
- Experience with data visualization and Jupyter notebooks

#### MCP Tools - Talk to Data

We are actively developing Model Context Protocol (MCP) tools for natural language data interaction:

- **MCP Server Development**: Building fundamental tools for "talk to data" capabilities
- **Natural Language Queries**: Enabling conversational access to data through LLMs
- **Data Discovery**: Using AI to help users explore and understand their data
- **Query Generation**: Converting natural language questions into optimized queries
- **Prompt Engineering**: Creating effective prompts for data interaction tasks

**What you need:**
- Understanding of LLM capabilities and limitations
- Experience with prompt engineering and model APIs
- Knowledge of RAG (Retrieval-Augmented Generation) patterns
- Interest in natural language interfaces for data
- Understanding of data query patterns and SQL

### Geospatial Analytics

#### Spatial Data Processing

hugr has native support for spatial analytics:

- **PostGIS Integration**: Working with spatial databases
- **Spatial Types**: Geometry, Geography, and spatial indexes
- **Spatial Operations**: Joins, aggregations, and transformations on spatial data
- **H3 Clustering**: Hexagonal hierarchical spatial indexing

**What you need:**
- Understanding of GIS concepts and spatial data types
- Experience with PostGIS or similar spatial databases
- Knowledge of spatial indexing and query optimization
- Interest in geospatial analytics and visualization

### Data Engineering

#### DBT (Data Build Tool)

We use DBT for data transformation workflows:

- **Data Modeling**: Building analytical models on top of hugr
- **Testing**: Data quality checks and validation
- **Documentation**: Automated data catalog generation
- **Orchestration**: Integration with data pipelines

**What you need:**
- Experience with DBT and data modeling
- Understanding of dimensional modeling and data warehousing
- SQL proficiency for transformations
- Knowledge of data quality and testing practices

### Big Data Integration

#### Spark Integration (Scala/Java)

For integration with Apache Spark:

- **Spark Connectors**: Building data source connectors for Spark
- **Data Transfer**: Efficient data exchange between hugr and Spark
- **Distributed Processing**: Leveraging Spark for large-scale transformations
- **Integration Patterns**: Best practices for Spark-hugr workflows

**What you need:**
- Scala or Java programming skills
- Experience with Apache Spark and distributed computing
- Understanding of data partitioning and parallel processing
- Knowledge of data formats (Parquet, Arrow, Iceberg)

## How to Contribute

### Getting Started

1. **Explore the Repositories**
   - [hugr-lab/hugr](https://github.com/hugr-lab/hugr) - Main server implementation
   - [hugr-lab/query-engine](https://github.com/hugr-lab/query-engine) - Core Go engine
   - [hugr-lab/hugr-client](https://github.com/hugr-lab/hugr-client) - Python client library
   - [hugr-lab/docker](https://github.com/hugr-lab/docker) - Docker images and Kubernetes charts

2. **Check Open Issues**
   - Look for issues tagged with `good first issue` or `help wanted`
   - Read existing discussions to understand current development priorities
   - Ask questions if you're unsure about something

3. **Set Up Your Development Environment**
   - Install Go (latest stable version)
   - Install DuckDB dependencies
   - Set up your preferred IDE (VS Code, GoLand, etc.)
   - Clone the repositories you want to work on

4. **Start Contributing**
   - Fix bugs, add features, improve documentation
   - Write tests for your changes
   - Follow the project's coding standards
   - Submit pull requests with clear descriptions

### Areas Where We Need Help

- **Core Engine Development**: Query optimization, new data source connectors
- **Documentation**: Improving guides, adding examples, translations
- **Testing**: Unit tests, integration tests, performance benchmarks
- **Client Libraries**: Improving Python client, creating clients for other languages
- **MCP Tools**: Developing tools for LLM integration
- **Examples**: Real-world use cases and tutorials
- **Infrastructure**: Docker images, Kubernetes deployment, CI/CD

### Community

Join our community:

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Pull Requests**: Submit your contributions

We value all contributions, whether it's code, documentation, bug reports, or community support. Every contribution helps make hugr better!

## Hugr Ecosystem Repositories

The hugr project consists of multiple repositories, each serving a specific purpose in the ecosystem:

### Core Repositories

#### [hugr-lab/hugr](https://github.com/hugr-lab/hugr)
**Language**: Go | **License**: MIT

The main Hugr service repository containing the HTTP server implementation. This is the primary entry point for running hugr as a standalone service.

#### [hugr-lab/query-engine](https://github.com/hugr-lab/query-engine)
**Language**: Go | **License**: MIT

The core query engine implementation. This is a reusable Go package that powers hugr's GraphQL query processing, data source management, and query transformation logic. Can be embedded in custom applications.

### Client Libraries

#### [hugr-lab/hugr-client](https://github.com/hugr-lab/hugr-client)
**Language**: Python | **License**: MIT

Python client library for hugr. Provides a convenient interface for querying hugr via the Arrow IPC protocol, with support for pandas DataFrames and GeoPandas GeoDataFrames.

### Infrastructure & Deployment

#### [hugr-lab/docker](https://github.com/hugr-lab/docker)
**Language**: Dockerfile | **License**: MIT

Docker images and Kubernetes charts for deploying hugr. Includes configurations for both single-node and multi-node cluster deployments with load balancing and caching.

### Tools & Extensions

#### [hugr-lab/mcp](https://github.com/hugr-lab/mcp)
**Language**: Go | **License**: MIT

Model Context Protocol (MCP) service for hugr. Provides fundamental tools for "talk to data" - enabling natural language interaction with your data through LLM integration.

### Examples & Learning

#### [hugr-lab/examples](https://github.com/hugr-lab/examples)
**Language**: Shell | **License**: MIT

Collection of example projects and tutorials demonstrating various hugr use cases, integrations, and best practices.

#### [hugr-lab/osm_dbt](https://github.com/hugr-lab/osm_dbt)
**Language**: Shell | **License**: MIT

OpenStreetMap universal DuckDB loader. Demonstrates how to work with geospatial data, DBT transformations, and spatial analytics in hugr.

### Documentation

#### [hugr-lab/hugr-lab.github.io](https://github.com/hugr-lab/hugr-lab.github.io)
**Language**: CSS (Docusaurus) | **License**: MIT

This documentation website source code. Built with Docusaurus and contains all user guides, API references, and tutorials.

#### [hugr-lab/docs](https://github.com/hugr-lab/docs)
**License**: MIT

Additional documentation and design documents for the hugr project.

---

**All repositories are open source and licensed under MIT**, making them free to use for both commercial and non-commercial purposes. We welcome contributions to any of these repositories!

## Contact

If you have questions or want to discuss contribution opportunities:

- Open a discussion on GitHub: [hugr-lab/hugr/discussions](https://github.com/hugr-lab/hugr/discussions)
- Report issues: [hugr-lab/hugr/issues](https://github.com/hugr-lab/hugr/issues)
- Check our documentation: [https://hugr-lab.github.io](https://hugr-lab.github.io)

We look forward to working with you!
