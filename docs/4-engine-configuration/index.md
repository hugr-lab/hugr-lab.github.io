---
slug: /docs/4-engine-configuration
title: Overview
sidebar_position: 1
---

The `hugr` engine is a complex logic system, built on top of various technologies. The main tasks of the engine are to provide a unified interface for data access, manage data sources, and execute queries efficiently.

It contains following main components:

1. Core engine
2. Datasource management service
3. Catalog service
4. Schema definition compiler
5. Query planner and executor
6. Permission service
7. Cache service

Some of these components can be configured and extended through the GraphQL API, allowing you to customize the behavior of the engine to suit your needs.

## Configuration Overview

The configuration of the `hugr` engine is divided into several sections, each responsible for a specific aspect of the engine's functionality:

- **General query engine settings**: Configure the overall behavior of the engine access to the file system, query execution settings, memory limits, connection pooling, and other engine-wide settings.
- **Schema Definitions**: Define the structure of your data, including tables, views, and relationships between them.
- **Data Sources**: Manage connections to various databases and data stores, including authentication and access control.
- **Permissions**: Configure access control rules for roles and authentication methods.
- **Cache**: Set up caching strategies to improve query performance and reduce load on data sources.
- **Object Storage Access**: Configure access to object storage systems for storing and retrieving large datasets, files, or other binary data.

## General Query Engine Settings

The `hugr` engine provides a set of general settings that can be configured to control the behavior of the query engine. These settings injected into the engine at startup and can not be changed at runtime.
The settings are configured by environment variables, see [Environment Variables](../7-deployment/1-config.md).

As well as the cluster configuration settings, see [Cluster Configuration](../7-deployment/6-cluster.md) for more details.

## Schema Definition

The schema definitions are GraphQL schema definition files that grouped by logical data source types and domains. For example, you can have a schema definition for a PostgreSQL database, a MySQL database, and a DuckDB data source, each with its own set of tables and views. Or you can split them by domains also, such as `sales`, `marketing`, etc. This allows you to organize your data in a way that makes sense for your application and use case.

The logical grouping of schema definitions are called **catalogs**. Each catalog can contain one or more schema definitions files. You can define a number of catalogs for each data source and some of them can be defined for several data sources. This shared catalogs can be used as datasets schema definitions and datasources will be a dataset providers. For example, you can have few duckdb files or groups of files, which have the same schema definition, and you can use the same sets of queries to analyze them. This allows you to create a unified view of your data, regardless of where it is stored.

The `hugr` is designed to make the data accessible, that is stored in relational databases and data lakes, as well as provided by APIs. The main buildings blocks of the schema definitions are:

- **Data object**: Tables and views - represent the main entities in your data model, such as users, products, or orders.
- **Functions**: Custom logic that can be triggered by unified GraphQL API, such as models inference, transformations, business logic. Or provide access to the realtime data from the business systems.

Data objects can have relationships between them, such as one-to-many or many-to-many relationships. This allows you to model complex data structures and query them efficiently. As well the some functions results can be placed as data object fields, which allows you to create custom logic and aggregations using data from other sources.

Functions can be presented with their arguments as GraphQL queries and mutations, allowing you to execute them through the unified GraphQL API. Data objects on the other hand, can presented as GraphQL types with their fields and relationships and standardized queries and mutations for CRUD operations. This allows you to work with your data in a consistent way, regardless of where it is stored or how it is accessed.

The schema definitions syntax is based on the GraphQL schema definition language (SDL), which is a standard way to define GraphQL schemas. See the [Schema Definition Overview](./3-schema-definition/1-overview.md) for more details on how to define your schema.

Functions and tables (their queries and mutations) can be organized into modules, which allows you to group related functionality together and manage it as a single unit. The modules are the fields of root query and mutation GraphQL types, and can have their own sub-modules, which allows you to create a hierarchical structure of your schema definitions. This is useful for organizing your schema definitions and making them easier to maintain, especially in **data access management**.

## Data Sources

Data sources are the connections to various databases and data stores that the `hugr` engine can access. Each data source can be configured with its own connection settings and set of catalogs. The data sources can be used to access data from different databases, data lakes, or APIs. It can be combined to create a unified view of your data through the special type of data source - extensions.

To manage data sources, the `hugr` engine has the CoreDB system data source, which allows you to create, update, and delete data sources and catalogs. The CoreDB is a special data source that is used to manage the engine's configuration and metadata. It can be configured to work with DuckDB or PostgreSQL database as data backend.

The hugr provide a set of system data sources, called runtime data sources, which are used to manage hugr instance and access their functionality in the unified GraphQL API. If you are using the `hugr` as embedded engine in your service, you can add your own data sources to the runtime data sources, which will be available in the unified GraphQL API or can be used to extend the engine functionality.

All data sources attached to the `DuckDB` in-process instance, and make it available to work as they are in one data base.
The `engine` will transform the GraphQL queries and mutations to the SQL queries and execute them in the DuckDB instance. This allows you to make cross-data source joins and aggregations, as well as to use the full power of the DuckDB SQL engine to query your data.

The data sources can be also represented as modules in the GraphQL schema, which allows you to reuse the data processing logic in the different data sources with same catalogs.
To avoid naming conflicts, the data sources can be configured with a prefix. Prefix will be added to each data source type and, if the data source is configured as not module, to each query and mutation. This allows you to have multiple data sources with the same name, but with different prefixes, and use them in the same schema without conflicts.

Data sources are configured through the unified GraphQL API, which allows you to manage them in a consistent way across in the clustered environments.
Some data source types can have their own limitations and requirements, such as read-only access, data types support, and query capabilities. For example, the `DuckDB` data source supports a wide range of data types and query capabilities, while the `HTTP RESTFul API` data source can provide only functions and on it based views.

Read more about the [Data Sources](./1-data-sources/index.md) and how to configure them.

## Permissions and authentication

The `hugr` engine provides a flexible permission system that allows you to control access to your data and functionality.

The CoreDB contains the `roles` and `permissions` tables, which allow you to define roles and permissions for them. The `hugr` doesn't provide methods for user management, but it allows you to use a wide range of authentication methods, such as JWT, OAuth2, API keys, OpenID Connect. The info about users and their roles extracted from the authentication token or request headers, and used to determine the access rights for the request.
This allows you to integrate the `hugr` engine with your existing authentication system and manage access to your data and functionality.

The CoreDB also contains API keys management tables, which allow you to create and manage API keys for your applications, define their roles.
The Engine also can provide anonymous access to the data with a predefined role.

Authentication methods configured by environment variables and special config file, it is allowed to use multiple authentication methods at the same time. For embedded use cases it can be extended with custom authentication providers.

## Cache

The `hugr` engine provides a caching mechanism to improve query performance and reduce load on data sources. The cache can be configured to store query results, function results, and other data that is frequently accessed.
It supports the two-level cache architecture, which allows you to store data in memory and in a distributed backend - Redis or Memcached. The first level cache can be limited by the memory size and eviction time, while the second level cache can be configured to store data for a specific time period or until it is invalidated.

## Object Storage Access

The `hugr` engine provides a way to access object storage systems, such as AWS S3, Google Cloud Storage, or Azure Blob Storage. This allows you to store and retrieve large datasets, files, or other binary data in a scalable and cost-effective way.

Currently, the `hugr` engine supports S3 compatible object storage systems, native support for R2, Google Cloud Storage, and Azure Blob Storage is planned for future releases.

The object storage access is configured through the unified GraphQL API, which allows you to manage access to the object storage systems in a consistent way across clustered environments. The object storage access can be used to store and retrieve files in data lakes configurations.
