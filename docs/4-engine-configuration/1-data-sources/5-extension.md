---
label: "Extension"
sidebar_position: 6
description: "Extensions are special type of data source that allows you to extend existing data objects with cross-source subquery and function call fields."
---

# Extensions & Cross-Source Subqueries

Extensions are a special type of data source that allows you to extend existing data objects with cross-source subquery and function call fields. They can be used to add additional functionality or to integrate with other systems.

Extensions can be defined using the same schema definition language (SDL) as other data sources, and can include fields that reference other data sources (joins) or function calls. This allows you to create complex queries that span multiple data sources and incorporate data from different systems. As well you can define a views that can be based on the complex SQL queries across attached databases using all power of the DuckDB SQL engine.

## Dependencies

Extensions depend on other data sources, which means that they can reference fields from other data sources in their schema. This means that you can't load or reload depended data sources without unloading the extension first. The `hugr` engine will control it and will not allow to load or reload the extension if the depended data sources are not loaded.

## Setting up an Extension

To set up an extension, you need to add a data source record to the `data_sources` table through the GraphQL API. The `type` of the data source should be set to `extension`.

The `path` should be empty, as the extension does not require a connection string. The `prefix` can be set it will be use for the defined views types and their queries (if `as_module` is false).

```graphql
```
