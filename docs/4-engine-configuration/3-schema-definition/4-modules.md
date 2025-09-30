---
title: "Module Organization"
sidebar_position: 10
---

# Module Organization

Modules in Hugr provide a way to organize and namespace your data objects, functions, and operations within the GraphQL schema. By using modules, you can create a hierarchical structure that helps avoid naming conflicts and improves the clarity of your API.

## Defining Modules

Modules are defined using the `@module` directive on types, views, or functions. You can specify a module name to group related objects together.

```graphql
type customers @table(name: "customers") @module(name: "crm") {
  id: Int! @pk
  name: String!
  email: String!
  created_at: Timestamp
}
```

In this example, the `customers` table is placed in the `crm` module.  This means that all operations related to customers will be namespaced under the `crm` module, helping to avoid naming conflicts with other parts of the schema.

### Nested Modules

Modules can be nested to create a more complex hierarchy. For example, you might have a `sales` module that contains a `reports` submodule:

```graphql
type total_sales @view(name: "total_sales_view") @module(name: "sales.reports") {
  category: String
  year: Int
  total: Float
}
```

This structure allows you to organize your schema in a way that reflects the logical grouping of your data and operations.

## Querying with Modules

When querying data that is organized into modules, you will need to include the module names in your queries. For example, to query the `customers` table in the `crm` module, you would write:

```graphql
query {
  crm {
    customers {
      id
      name
      email
      created_at
    }
  }
}
```

Similarly, to query the `total_sales` view in the `sales.reports` module, you would write:

```graphql
query {
  sales {
    reports {
      total_sales {
        category
        year
        total
      }
    }
  }
}
```

## Mutations with Modules

Mutations are also namespaced according to their modules. For example, to insert a new customer in the `crm` module, you would write:

```graphql
mutation {
  crm {
    insert_customers(data: { name: "John Doe", email: "john.doe@example.com" }) {
      id
      name
      email
    }
  }
}
```

This structure helps to keep your mutations organized and prevents naming conflicts with other parts of the schema.

## Functions in Modules

Functions can also be organized into modules. When defining a function, you can use the `@module` directive to specify its module:

```graphql

extend type Function {
  get_customer_orders(customer_id: Int!): [order]
    @function(name: "get_customer_orders")
    @module(name: "crm")
}
```

This function can then be queried within the `crm` module:

```graphql
query {
  function {
    crm {
      get_customer_orders(customer_id: 1) {
        id
        total
      }
    }
  }
}
```

For example module `weather` for the function `current_weather` - the generated function query will be accessible under the `function.weather` namespace:

```graphql
query {
  function {
    weather {
      current_weather(lat: 40.7128, lon: -74.0060) {
        id
        name
        main {
          temp
          pressure
          humidity
        }
      }
    }
  }
}
```

## Data Sources as Modules

When connecting to multiple data sources, each data source can be treated as a top-level module. This means that all tables, views, and functions from a specific data source will be grouped under its corresponding module. For example, if you have a data source named `sales` that is marked `as_module: true`, all related objects will be accessible under the `sales` module:

```graphql
query {
  sales {
    crm {
      customers { ... }
      customers_by_pk(id: 1) { ... }
      customers_aggregation { ... }
      customers_bucket_aggregation { ... }
    }
  }
}
```

In this case, `sales` is the top-level module representing the data source, and `crm` is a submodule containing the `customers` table and its related operations.

You can also define data source as a nested module, for example `data_source_name.module_name`. 

```graphql
query {
  data_source_name {
    module_name {
      customers { ... }
      customers_by_pk(id: 1) { ... }
      customers_aggregation { ... }
      customers_bucket_aggregation { ... }
    }
  }
}
```

This structure allows for clear organization and easy access to data from multiple sources within a single GraphQL schema.