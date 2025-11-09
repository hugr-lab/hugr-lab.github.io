---
label: "Extension"
sidebar_position: 6
description: "Extensions are a special type of data source that allow you to extend existing data objects with cross-source subquery and function call fields."
---

# Extension Data Source

:::info
For a comprehensive guide on using extensions with detailed examples, cross-source queries, and best practices, see [Extensions & Cross-Source Subqueries](../4-extension.md).
:::

Extensions are a special type of data source that allow you to extend existing data objects with cross-source subquery and function call fields. They can be used to add additional functionality or to integrate with other systems.

Extensions can be defined using the same schema definition language (SDL) as other data sources, and can include fields that reference other data sources (joins) or function calls. This allows you to create complex queries that span multiple data sources and incorporate data from different systems. You can also define views based on complex SQL queries across attached data sources, using the full power of the DuckDB SQL engine.

Additionally, through extensions, you can add and modify descriptions for existing schema types and fields, including modules.

## Dependencies

Extensions depend on other data sources, which means they can reference fields from other data sources in their schema. This also means you can't load or reload dependent data sources without unloading the extension first. The `hugr` engine will control this and will not allow you to load or reload the extension if the dependent data sources are not loaded.

## Setting up an Extension

To set up an extension, you need to add a data source record to the `data_sources` table through the GraphQL API. The `type` of the data source should be set to `extension`.

The `path` should be empty, as the extension does not require a connection string. The `prefix` can be set and will be used for the defined view types and their queries (if `as_module` is false).

```graphql
mutation addExtensionDataSource($data: data_sources_mut_input_data! = {}) {
  core {
    insert_data_sources(data: $data) {
      name
      description
      as_module
      disabled
      path
      prefix
      read_only
      self_defined
      type
    }
  }
}
```

Variables:

```json
{
  "data": {
    "name": "ext_test",
    "type": "extension",
    "path": "",
    "prefix": "",
    "description": "Test extension",
    "read_only": false,
    "self_defined": false,
    "as_module": false,
    "disabled": false,
    "catalogs": [
        {
            "name": "ext_test",
            "description": "Test extension catalog",
            "type": "uri",
            "path": "/workspace/schemes/ext_test"
        }
    ]
  }
}
```
