---
slug: /docs/4-engine-configuration
title: Overview
sidebar_position: 1
---


The `hugr` engine is a complex logic system built on top of various technologies. The main tasks of the engine are to provide a unified interface for data access, manage data sources, and execute queries efficiently.


It contains the following main components:

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

- **General query engine settings**: Configure the overall behavior of the engine, access to the file system, query execution settings, memory limits, connection pooling, and other engine-wide settings.
- **Schema Definitions**: Define the structure of your data, including tables, views, and relationships between them.
- **Data Sources**: Manage connections to various databases and data stores, including authentication and access control.
- **Permissions**: Configure access control rules for roles and authentication methods.
- **Cache**: Set up caching strategies to improve query performance and reduce load on data sources.
- **Object Storage Access**: Configure access to object storage systems for storing and retrieving large datasets, files, or other binary data.

## General Query Engine Settings


The `hugr` engine provides a set of general settings that can be configured to control the behavior of the query engine. These settings are injected into the engine at startup and cannot be changed at runtime.
The settings are configured by environment variables, see [Environment Variables](../7-deployment/1-config.md).


For cluster configuration settings, see [Cluster Configuration](../7-deployment/6-cluster.md) for more details.

## Schema Definition


The schema definitions are GraphQL schema definition files that are grouped by logical data source types and domains. For example, you can have a schema definition for a PostgreSQL database, a MySQL database, and a DuckDB data source, each with its own set of tables and views. Or you can split them by domains, such as `sales`, `marketing`, etc. This allows you to organize your data in a way that makes sense for your application and use case.


The logical grouping of schema definitions is called **catalogs**. Each catalog can contain one or more schema definition files. You can define a number of catalogs for each data source, and some of them can be defined for several data sources. These shared catalogs can be used as dataset schema definitions, and data sources will be dataset providers. For example, you can have a few DuckDB files or groups of files that have the same schema definition, and you can use the same sets of queries to analyze them. This allows you to create a unified view of your data, regardless of where it is stored.


`hugr` is designed to make data accessible, whether it is stored in relational databases, data lakes, or provided by APIs. The main building blocks of the schema definitions are:

- **Data object**: Tables and views - represent the main entities in your data model, such as users, products, or orders.
- **Functions**: Custom logic that can be triggered by unified GraphQL API, such as models inference, transformations, business logic. Or provide access to the realtime data from the business systems.


Data objects can have relationships between them, such as one-to-many or many-to-many relationships. This allows you to model complex data structures and query them efficiently. Some function results can also be placed as data object fields, which allows you to create custom logic and aggregations using data from other sources.


Functions can be presented with their arguments as GraphQL queries and mutations, allowing you to execute them through the unified GraphQL API. Data objects, on the other hand, can be presented as GraphQL types with their fields and relationships and standardized queries and mutations for CRUD operations. This allows you to work with your data in a consistent way, regardless of where it is stored or how it is accessed.

The schema definitions syntax is based on the GraphQL schema definition language (SDL), which is a standard way to define GraphQL schemas. See the [Schema Definition Overview](./3-schema-definition/index.md) for more details on how to define your schema.


Functions and tables (their queries and mutations) can be organized into modules, which allows you to group related functionality together and manage it as a single unit. The modules are the fields of the root query and mutation GraphQL types, and can have their own sub-modules, which allows you to create a hierarchical structure of your schema definitions. This is useful for organizing your schema definitions and making them easier to maintain, especially in **data access management**.

## Data Sources


Data sources are the connections to various databases and data stores that the `hugr` engine can access. Each data source can be configured with its own connection settings and set of catalogs. Data sources can be used to access data from different databases, data lakes, or APIs. They can be combined to create a unified view of your data through a special type of data source—extensions.

To manage data sources, the `hugr` engine has the CoreDB system data source, which allows you to create, update, and delete data sources and catalogs. The CoreDB is a special data source that is used to manage the engine's configuration and metadata. It can be configured to work with DuckDB or PostgreSQL database as data backend.


hugr provides a set of system data sources, called runtime data sources, which are used to manage the hugr instance and access its functionality in the unified GraphQL API. If you are using `hugr` as an embedded engine in your service, you can add your own data sources to the runtime data sources, which will be available in the unified GraphQL API or can be used to extend the engine functionality.


All data sources are attached to the `DuckDB` in-process instance, making them available to work as if they are in one database.
The `engine` will transform the GraphQL queries and mutations into SQL queries and execute them in the DuckDB instance. This allows you to make cross-data source joins and aggregations, as well as use the full power of the DuckDB SQL engine to query your data.


Data sources can also be represented as modules in the GraphQL schema, which allows you to reuse the data processing logic in different data sources with the same catalogs.
To avoid naming conflicts, data sources can be configured with a prefix. The prefix will be added to each data source type and, if the data source is configured as not a module, to each query and mutation. This allows you to have multiple data sources with the same name, but with different prefixes, and use them in the same schema without conflicts.


Data sources are configured through the unified GraphQL API, which allows you to manage them in a consistent way across clustered environments.
Some data source types can have their own limitations and requirements, such as read-only access, data type support, and query capabilities. For example, the `DuckDB` data source supports a wide range of data types and query capabilities, while the `HTTP RESTful API` data source can provide only functions and views based on it.

Read more about the [Data Sources](./1-data-sources/index.md) and how to configure them.

## Permissions and authentication


The `hugr` engine provides a flexible permission system that allows you to control access to your data and functionality.


The CoreDB contains the `roles` and `permissions` tables, which allow you to define roles and permissions for them. `hugr` doesn't provide methods for user management, but it allows you to use a wide range of authentication methods, such as JWT, OAuth2, API keys, and OpenID Connect. The information about users and their roles is extracted from the authentication token or request headers and used to determine the access rights for the request.
This allows you to integrate the `hugr` engine with your existing authentication system and manage access to your data and functionality.


The CoreDB also contains API key management tables, which allow you to create and manage API keys for your applications and define their roles.
The engine can also provide anonymous access to the data with a predefined role.


Authentication methods are configured by environment variables and a special config file. It is allowed to use multiple authentication methods at the same time. For embedded use cases, it can be extended with custom authentication providers.

## Cache


The `hugr` engine provides a caching mechanism to improve query performance and reduce load on data sources. The cache can be configured to store query results, function results, and other data that is frequently accessed.
It supports a two-level cache architecture, which allows you to store data in memory and in a distributed backend—Redis or Memcached. The first-level cache can be limited by memory size and eviction time, while the second-level cache can be configured to store data for a specific time period or until it is invalidated.

## Object Storage Access


The `hugr` engine provides a way to access object storage systems, such as AWS S3, Google Cloud Storage, or Azure Blob Storage. This allows you to store and retrieve large datasets, files, or other binary data in a scalable and cost-effective way.


Currently, the `hugr` engine supports S3-compatible object storage systems. Native support for R2, Google Cloud Storage, and Azure Blob Storage is planned for future releases.


Object storage access is configured through the unified GraphQL API, which allows you to manage access to object storage systems in a consistent way across clustered environments. Object storage access can be used to store and retrieve files in data lake configurations.
