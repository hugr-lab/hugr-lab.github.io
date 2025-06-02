---
sidebar_position: 3
---

# Get Started

To try out `hugr`, you can use the get started example provided in the [examples repository](https://github.com/hugr-lab/examples) on GitHub.

## Prerequisites

Before you start, ensure you have the following prerequisites:

- Docker installed on your machine.
- Docker Compose installed on your machine.
- You should be familiar with GraphQL and have basic knowledge of how to work with GraphQL APIs.
- A basic understanding of how to work with databases, specifically PostgreSQL, as the example uses a PostgreSQL database.

## Quick Start

Clone the repository:

```bash
git clone git@github.com:hugr-lab/examples.git
```

Navigate to the cloned `hugr` example directory:

```bash
cd examples
```

Start the examples entire environment using docker-compose:

```bash
sh scripts/start.sh
```

This will start the `hugr` server and all the necessary services. You can access the `hugr` GraphQL API at `http://localhost:18000/graphql`.

You can change configuration settings by modifying the example.env file or create a new `.env` file in the `examples` directory.

## Create an example database

To create the example database, you can use the provided `get-started/setup.sh` script. This script will create a new database with the sample data.
The example database is a PostgreSQL Northwind database, which is a sample database used for demonstration purposes (see [README](https://github.com/hugr-lab/examples/blob/main/get-started/README.md)).
You can run the script with the following command:

```bash
cd get-started
sh /setup.sh
```

## Basic Configuration

After the example database is created, you can add this database as a data source in `hugr`.
The hugr data sources are added through GraphQL mutations. For the data source should be defined one or more catalogs, that contains the schema definitions for the data source. The catalogs are defined in the `hugr` configuration file, which is located in the `get-started/schema/` GraphQL files.

Open browser and go to `http://localhost:18000/admin` (port can be changed through .env). You will see the hugr admin UI (GraphiQL).
Create a new data source with the following mutation:

```graphql
mutation addNorthwindDataSet($data: data_sources_mut_input_data! = {}) {
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
      catalogs {
        name
        description
        path
        type
      }
    }
  }
}
```

Add variables:

```json
{
  "data": {
    "name": "northwind",
    "type": "postgres",
    "prefix": "nw",
    "description": "The Northwind database example",
    "read_only": false,
    "as_module": true,
    "path": "postgres://hugr:hugr_password@postgres:5432/northwind",
    "catalogs": [
      {
        "name": "northwind",
        "type": "uri",
        "description": "Northwind database schema",
        "path": "/workspace/get-started/schema"
      }
    ]
  }
}
```

Here we add a new data source named `northwind`, which is a PostgreSQL database. The `path` field contains the connection string to the database, and the `catalogs` field contains the path to the schema definitions.
We define the data source as a module (`as_module: true`), which means that all queries, mutations and functions will be placed in general GraphQL schema inside the separate object and attached in field with the name of the data source (in this case `northwind`) in base schema fields (`query`, `mutation`, `function`).

After it you can load the data source manually by running the following mutation:

```graphql
mutation loadNorthwindDataSource {
  function {
    core {
      load_data_source(name: "northwind") {
        success
        message
      }
    }
  }
}
```

By default, the data source is loaded automatically when the `hugr` server starts. However, you can also load or reload (if the schema definitions was changed) it manually using the above mutation.

After the data source is loaded, you can explore see the generated GraphQL queries, mutations and functions in the `hugr` admin UI (GraphiQL) at `http://localhost:18000/admin`. The following query will return the query and mutation types of the generated schema:

```graphql
{
  __schema {
    queryType {
      ...type_def
    }
    mutationType{
      ...type_def
    }
  }
}

fragment type_def on __Type {
  kind
  name
  fields {
    name
    description
    type {
      name
      description
      ofType {
        name
        description
      }
    }
  }
}
```

It returns the schema definition for the query and mutation types, including the fields and their types. You can use this query to explore the schema and see what queries and mutations are available.

```json
{
  "data": {
    "__schema": {
      "mutationType": {
        "fields": [
          {
            "description": "The root query object of the module core",
            "name": "core",
            "type": {
              "description": "The root query object of the module core",
              "name": "core_mutation",
              "ofType": null
            }
          },
          {
            "description": "The root query object of the module northwind",
            "name": "northwind",
            "type": {
              "description": "The root query object of the module northwind",
              "name": "northwind_mutation",
              "ofType": null
            }
          },
          {
            "description": "Functions",
            "name": "function",
            "type": {
              "description": "The root function mutation object of the module",
              "name": "MutationFunction",
              "ofType": null
            }
          }
        ],
        "kind": "OBJECT",
        "name": "Mutation"
      },
      "queryType": {
        "fields": [
          {
            "description": "The root query object of the module core",
            "name": "core",
            "type": {
              "description": "The root query object of the module core",
              "name": "core_query",
              "ofType": null
            }
          },
          {
            "description": "Performs jq query on result set\nResults will be placed in 'extension' field by field or alias name",
            "name": "jq",
            "type": {
              "description": "",
              "name": "Query",
              "ofType": null
            }
          },
          {
            "description": "The root query object of the module northwind",
            "name": "northwind",
            "type": {
              "description": "The root query object of the module northwind",
              "name": "northwind_query",
              "ofType": null
            }
          },
          {
            "description": "Functions",
            "name": "function",
            "type": {
              "description": "The root function object of the module",
              "name": "Function",
              "ofType": null
            }
          }
        ],
        "kind": "OBJECT",
        "name": "Query"
      }
    }
  }
}
```

If you add the data source as not a module (i.e. `as_module: false`), the queries, mutations and functions will be added to the root base schema directly. But to avoid name conflicts with other data sources, it is recommended to set the prefix for the data source (i.e. `prefix: "nw"`). In this case, the queries, mutations and functions will be added to the root base schema with the prefix `nw_`, for example `nw_customers`, `nw_orders`, etc.

## Your First Schema

This example uses the Northwind database, which contains a variety of tables such as `customers`, `orders`, `products`, etc. You can explore the schema definitions in the `get-started/schema` directory.

You can create schema definitions by yourself or use the provided schema definitions in the `get-started/schema` directory. The schema definitions are written in GraphQL SDL (Schema Definition Language) and can be used to define the structure of your data.

To create your first schema, create the new GraphQL file in the `get-started/schema` directory, for example `my_northwind_schema.graphql`. You can define your schema using the GraphQL SDL syntax. Open the file and add the following content

### Customers tables schema

```graphql
# Customers
type customers @table(name: "customers") {
  id: String! @pk @field_source(field: "customer_id")
  company_name: String!
  contact_name: String!
  contact_title: String
  address: String
  city: String
  region: String
  postal_code: String
  country: String
  phone: String
  fax: String
}

# Customers Demo
type customers_types @table(name: "customer_demographics") {
  id: String! @pk @field_source(field: "customer_type_id")
  description: String! @field_source(field: "customer_desc")
}

# Customers Linked Types
type customers_linked_types @table(name: "customer_customer_demo", is_m2m: true) {
  customer_id: String! @pk @field_references(
    name: "customers_linked_types_customer_id"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer"
    references_query: "types"
    references_description: "Linked customer types"
  )
  type_id: String! @pk @field_source(field: "customer_type_id")
    @field_references(
      name: "customers_linked_types_type_id"
      references_name: "customers_types"
      field: "id"
      query: "type"
      description: "Customer type"
      references_query: "customers"
      references_description: "Linked customers"
    )
}
```

Here we describe the `customers` table (directive `@table`), which contains information about customers. We will use id in GraphQL schema as the primary key instead `customer_id` (directives `@pk` and `@field_source` are used for this purpose).

Than we describe the `customer_types` table (base on `customer_demographics` database table), which contains information about customer types. We will use id in GraphQL schema as the primary key instead `customer_type_id`.

Finally, we describe the `customer_customer_demo` table, which is a many-to-many relationship between customers and customer types. We use the `@field_references` directive to define the relationship between the tables, as well as `REFERENCES` SQL clause for the field at table creation. Arguments for the `@field_references` directive:

- `name`: the name of the relation in the GraphQL schema
- `references_name`: the name of the referenced data object in the GraphQL schema
- `field`: the field in the referencing table that references to the current field
- `query`: the name of the query field that will be added to this table in the GraphQL schema
- `description`: a description for the query field
- `references_query`: the name of the query field that will be added to the referenced table in the GraphQL schema
- `references_description`: a description for the query field in the referenced table

You can add relations between tables by many fields using the `@references` directive for the table type. (See details in the [Query Engine Configuration/Schema Definition](/docs/category/schema-definitions) guide).

If we load this schema, we will see generated queries and mutations for the `customers` table, as well as for the `customers_types` and `customers_linked_types` tables. For each table the following queries and mutations will be generated in the module `northwind`:

- query `customers_by_pk`: query to get a customer by id (primary key), with required argument `id`
- query `customers`: query to get all customers, with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`
- query `customers_aggregation`: query to get aggregated data for customers with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`
- query `customers_bucket_aggregation`: query to get bucket aggregated data for customers with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`
- mutation `insert_customers`: mutation to insert a new customer,with required argument `data` of type `nw_customers_mut_input_data!`
- mutation `update_customers`: mutation to update an existing customer, with required argument `data` of type `nw_customers_mut_data!` and optional argument `filter` to filter the customers to update
- mutation `delete_customers`: mutation to delete a customer, with optional argument `filter` to filter the customers to delete.

To filter the data, you can use the `filter` argument in the queries. For example, to get all customers from the USA, you can use the following query:

```graphql
query MyQuery {
  northwind {
    customers(filter: {country: {eq: "Germany"}}) {
      country
      city
      company_name
    }
  }
}
```

You can also use the `distinct_on` argument to get distinct values for a field, and the `order_by` argument to order the results by a field. For example, to get all customers from the USA ordered by city, you can use the following query:

```graphql
query MyQuery {
  northwind {
    customers(order_by: [
      {field: "country", direction: ASC}
    ]) {
      country
      city
      company_name
    }
  }
}
```

The filter input object generated for the `customers` table will contain all fields of the table, so you can filter by any field. The `eq` operator is used to filter by equality, but you can also use other operators like `ne`, `gt`, `lt`, etc, it depends on the field type. As well to the `filter` will be added references objects based on the `@field_references` directive references type (many-to-many, one-to-many, many-to-one).

As well the subquery fields will be added to the `customers` table type, so you can get the linked customer types for each customer, all subqueries will be added with their filter, distinct, order_by, limit, offset arguments.

The input data for the `insert_customers` mutation will contain all fields of the `customers` table, so you can insert a new customer with field values. As well the input data type also contains the references objects based on the `@field_references` directive references type, so you can insert a new customer with linked customer types, that will be created at the same time as the customer. For m2m relations, the input data will contain a field for the linked objects (customers types), and if they will be passed in the `insert_customers` mutation, they will be created and linked to the customer. If you want to link existing customer types, you should run separate `insert_customers_linked_types` mutation with the customer id and customer type id.

Aggregation query will include `_rows_count` field and fields for each field of the `customers` table with aggregation functions like `sum`, `avg`, `min`, `max`, etc, based on field types. For example, to get the number of customers and list of distinct countries, you can use the following query:

```graphql
query aggCustomers {
  northwind{
    customers_aggregation{
      _rows_count
      country{
        list(distinct: true)
      }
    }
  }
}
```

Bucket aggregation query allows you to group the data by a field and get aggregated data for each group. For example, to get the number of customers grouped by country, you can use the following query:

```graphql
query bucketAggCustomers {
  northwind{
    customers_bucket_aggregation{
      key{
        country
      }
      aggregations{
        _rows_count 
      }
    }
  }
}
```

You can add filter to each aggregation query, for example, to get the number of all customers and customers, thats names contains 'am' by countries, you can use the following query:

```graphql
query bucketAggCustomers {
  northwind {
    customers_bucket_aggregation (order_by: [
      {field: "am._rows_count"}
    ]){
      key {
        country
      }
      aggregations {
        _rows_count
      }
      am: aggregations(
        filter: {contact_name: {ilike: "%am%"}}
      ) {
        _rows_count
      }
    }
  }
}
```

### Employees tables schema

Let's add the `employees` table schema, which contains information about employees:

```graphql
# Employees
type employees @table(name: "employees") {
  id: Int! @pk @field_source(field: "employee_id")
  last_name: String!
  first_name: String!
  title: String
  title_of_courtesy: String
  birth_date: String
  hire_date: String
  address: String
  city: String
  region: String
  postal_code: String
  country: String
  home_phone: String
  extension: String
  photo: String
  notes: String
  reports_to: Int @field_references(
    name: "employees_reports_to"
    references_name: "employees"
    field: "id"
    query: "reportsTo"
    description: "Reports to employee"
    references_query: "employees"
    references_description: "Employees reporting to this employee"
  )
}

# Regions
type regions @table(name: "regions") {
  id: Int! @pk @field_source(field: "region_id")
  description: String!
}

# Territories
type territories @table(name: "territories") {
  id: Int! @pk @field_source(field: "territory_id")
  name: String!
  region_id: Int! @field_references(
    name: "territories_region_id"
    references_name: "regions"
    field: "id"
    query: "region"
    description: "Region"
    references_query: "territories"
    references_description: "Territories in this region"
  )
}

# Employee territories
type employee_territories @table(name: "employee_territories", is_m2m: true) {
  employee_id: Int! @pk @field_references(
    name: "employee_territories_employee_id"
    references_name: "employees"
    field: "id"
    query: "employee"
    description: "Employee"
    references_query: "territories"
    references_description: "Territories assigned to this employee"
  )
  territory_id: Int! @pk @field_source(field: "territory_id")
    @field_references(
      name: "employee_territories_territory_id"
      references_name: "territories"
      field: "id"
      query: "territory"
      description: "Territory"
      references_query: "employees"
      references_description: "Employees assigned to this territory"
    )
}
```

### Products tables schema

```graphql
# Suppliers
type suppliers @table(name: "suppliers") {
  id: Int! @pk @field_source(field: "supplier_id")
  company_name: String!
  contact_name: String
  contact_title: String
  address: String
  city: String
  region: String
  postal_code: String
  country: String
  phone: String
  fax: String
}

# Products categories
type categories @table(name: "categories") {
  id: Int! @pk @field_source(field: "category_id")
  name: String! @field_source(field: "category_name")
  description: String
  picture: String
}

# Products
type products @table(name: "products") {
  id: Int! @pk @field_source(field: "product_id")
  name: String! @field_source(field: "product_name")
  supplier_id: Int! @field_references(
    name: "products_supplier_id"
    references_name: "suppliers"
    field: "id"
    query: "supplier"
    description: "Supplier"
    references_query: "products"
    references_description: "Supplied products"
  )
  category_id: Int! @field_references(
    name: "products_category_id"
    references_name: "categories"
    field: "id"
    query: "category"
    description: "Category"
    references_query: "products"
    references_description: "Products"
  )
  quantity_per_unit: String
  unit_price: Float
  units_in_stock: Int
  units_on_order: Int
  reorder_level: Int
  discontinued: Boolean!
}
```

### Orders tables schema

```graphql
# Shippers
type shippers @table(name: "shippers") {
  id: Int! @pk @field_source(field: "shipper_id")
  company_name: String!
  phone: String
}

# Orders
type orders @table(name: "orders") {
  id: Int! @pk @field_source(field: "order_id")
  customer_id: String! @field_references(
    name: "orders_customer_id"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer"
    references_query: "orders"
    references_description: "Orders placed by this customer"
  )
  employee_id: Int! @field_references(
    name: "orders_employee_id"
    references_name: "employees"
    field: "id"
    query: "employee"
    description: "Employee"
    references_query: "orders"
    references_description: "Orders handled by this employee"
  )
  order_date: Timestamp
  required_date: Timestamp
  shipped_date: Timestamp
  ship_via: Int @field_references(
    name: "orders_ship_via"
    references_name: "shippers"
    field: "id"
    query: "shipper"
    description: "Shipper"
    references_query: "orders"
    references_description: "Orders shipped by this shipper"
  )
  freight: Float
  ship_name: String
  ship_address: String
  ship_city: String
  ship_region: String
  ship_postal_code: String
  ship_country: String
}

# Order details
type order_details @table(name: "order_details") {
  order_id: Int! @pk @field_references(
    name: "order_details_order_id"
    references_name: "orders"
    field: "id"
    query: "order"
    description: "Order"
    references_query: "details"
    references_description: "Details of this order"
  )
  product_id: Int! @pk @field_references(
    name: "order_details_product_id"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product"
    references_query: "orders"
    references_description: "Details of this product in the order"
  )
  unit_price: Float!
  quantity: Int!
  discount: Float!
  # Calculated total amount of ordered product
  total: Float! @sql(exp: "round(([unit_price] * [quantity] * (1 - [discount]))*100)/100")
}
```

Here we describe the order_details table, which contains information about the products in the order. We use the `@field_references` directive to define the relationship between the tables, as well as `REFERENCES` SQL clause for the field at table creation. The `total` field is calculated using the SQL expression, which calculates the total amount of ordered product based on the unit price, quantity and discount.

### Create orders view

We can define a view for the tables using the `@view` directive. For example, we can create a view that contains information about the orders, customers, employees, and products in the order:

```graphql
# Shipped products view
type shipped_products_view 
  @view(
    name: "shipped_products"
    sql: """
    SELECT 
      orders.customer_id,
      orders.employee_id,
      orders.order_date,
      orders.shipped_date,
      orders.ship_via,
      order_details.product_id,
      order_details.unit_price,
      order_details.quantity,
      order_details.discount,
      products.supplier_id,
      products.category_id
    FROM orders
        INNER JOIN order_details ON orders.order_id = order_details.order_id
        INNER JOIN products ON order_details.product_id = products.product_id
    WHERE orders.shipped_date IS NOT NULL
    """
  ) 
{
  customer_id: String! @field_references(
    name: "shipped_products_view_customer_id"
    references_name: "customers"
    field: "id"
    query: "customer"
    description: "Customer"
    references_query: "shippedProducts"
    references_description: "Shipped products for this customer"
  )
  employee_id: Int! @field_references(
    name: "shipped_products_view_employee_id"
    references_name: "employees"
    field: "id"
    query: "employee"
    description: "Employee"
    references_query: "shippedProducts"
    references_description: "Shipped products handled by this employee"
  )
  order_date: Timestamp
  shipped_date: Timestamp
  ship_via: Int @field_references(
    name: "shipped_products_view_ship_via"
    references_name: "shippers"
    field: "id"
    query: "shipper"
    description: "Shipper"
    references_query: "shippedProducts"
    references_description: "Shipped products by this shipper"
  )
  product_id: Int! @field_references(
    name: "shipped_products_view_product_id"
    references_name: "products"
    field: "id"
    query: "product"
    description: "Product"
    references_query: "shippedProducts"
    references_description: "Shipped product details in this order"
  )
  unit_price: Float!
  quantity: Int!
  discount: Float!
  supplier_id: Int! @field_references(
    name: "shipped_products_view_supplier_id"
    references_name: "suppliers"
    field: "id"
    query: "supplier"
    description: "Supplier of the product in the order details view."
  )
  category_id: Int! @field_references(
    name: "shipped_products_view_category_id"
    references_name: "categories"
    field: "id"
    query: "category"
    description:
      "Category of the product in the order details view."
  )
  total: Float! @sql(exp: "round(([unit_price] * [quantity] * (1 - [discount]))*100)/100")
}
```

You can query it:

```graphql
query shippedAgg {
  northwind{
    shipped_products_view_bucket_aggregation{
      key{
        category{
          name
        }
        customer{
          company_name
        }
      }
      aggregations{
        _rows_count
        total{
          sum
        }
        quantity{
          sum
        }
      }
    }
  }
}
```

This query will return the number of shipped products grouped by category and customer, as well as the total amount and quantity of shipped products for each group.

By the view will be generated the following queries in the module `northwind`:

- query `shipped_products_view`: query to get all shipped products, with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`
- query `shipped_products_view_aggregation`: query to get aggregated data for shipped products with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`
- query `shipped_products_view_bucket_aggregation`: query to get bucket aggregated data for shipped products with optional arguments `filter`, `distinct_on`, `order_by`, `limit`, and `offset`

As well this queries will be added to the references objects in the `customers`, `employees`, `products`, `shippers` and `categories` tables, so you can get the shipped products for each customer, employee, product, shipper and category.

The views supports `parameterization`, so you can use the `@args` directive to define the input type that will use as parameters for the view. The input parameters can be used in the SQL query of the view by name, for example: `[$requested_time]`.

## Some example queries

You can use the following queries to explore the data in the Northwind database:

### Get the list of customers with their sum of orders from the Northwind database

```graphql
{
  northwind {
    customers {
      id
      company_name
      orders_aggregation{
        details{
          total{
            sum
          }
        }
      }
    }
  }
}
```

### Get the total amount and products count by category and shipper

```graphql
{
  northwind {
    order_details_bucket_aggregation(
      order_by:[
        {field: "aggregations.total.sum", direction: DESC}
      ]
    ){
      key{
        product{
          category{
            name
          }
        }
        order{
          shipper{
            company_name
          }
        }
      }
      aggregations{
        total{
          sum
        }
        quantity{
          sum
        }
      }
    } 
  }
}
```

### Get the total shipped products (amount) by years and months

```graphql
{
  northwind {
    orders_bucket_aggregation(
      filter: {
        shipped_date: {
          is_null: false
        }
      }
      order_by: [
        {field: "key.year", direction: DESC}
        {field: "key.month", direction: DESC}
      ]
    ){
      key{
        year: _shipped_date_part(extract: year)
        month:_shipped_date_part(extract: month)
      }
      aggregations{
        _rows_count
        details{
          total{
            sum
          }
        }
      }
    }
  }
}
```

### Get the total shipped products (amount) by month bucket and in the orders were shipped by suppliers from Finland and France

```graphql
{
  northwind {
    orders_bucket_aggregation(
      filter: {
        shipped_date: {
          is_null: false
        }
        details: {
          any_of: {
            product:{
              supplier:{
                country: {in: ["Finland", "France"]}
              }
            }
          }
        }
      }
      order_by: [
        {field: "key.bucket", direction: DESC}
      ]
    ){
      key{
        bucket: shipped_date(bucket: month)
      }
      aggregations{
        _rows_count
        details{
          total{
            sum
          }
        }
      }
    }
  }
}
```

### Get the total shipped products (amount) by month bucket and shipped by suppliers from Finland and France

```graphql
{
  northwind {
    orders_bucket_aggregation(
      filter: {
        shipped_date: {
          is_null: false
        }
      }
      order_by: [
        {field: "key.bucket", direction: DESC}
      ]
    ){
      key{
        bucket: shipped_date(bucket: month)
      }
      aggregations{
        _rows_count
        details(
          filter:{
            product:{
              supplier:{
                country: {in: ["Finland", "France"]}
              }
            }
          }
        ){
          total{
            sum
          }
        }
      }
    }
  }
}
```

## Advanced features

The `hugr` supports a lot of advanced features, such as:

- **Joins**: You can define joins between tables using the `@join` directive. The joins can be defined as many-to-many, one-to-many, or many-to-one relationships. The joins will be added to the GraphQL schema as subqueries, so you can query the related data in a single query.
- **Geometry types**: You can use the scalar type `geometry` to represent geometric fields (Postgis for PostgreSQL, and spatial for DuckDB). The `Geometry` fields has their own filter operators and aggregation functions.
- **Json types**: You can use the scalar type `JSON` to represent JSON fields (PostgreSQL `jsonb`, DuckDB `json`). it will allow you to store and query JSON data in the database. The `JSON` fields has their own filter operators and aggregation functions.
- **Nested types**: You can define fields that contains nested objects or arrays of objects. The nested objects can be defined as normal GraphQL types and will be accessible to query, aggregate and filter. (For PostgreSQL it should be defined as `jsonb`, for DuckDB as `struct`).
- **Functions**: You can define custom functions in the schema, which can be used to perform complex operations on the data. The functions can be defined using the `@function` directive and can be used in the queries and mutations.
- **Query time joins**: Each data object contains a `_join` field, which can be used to join the data with other data objects. The `_join` field can be used to join the data with other data objects in the same data source or in other data sources.
- **Spatial queries**: Each data object that has `Geometry` fields, contains a `_spatial` field. The spatial queries can be used to filter the data by distance, intersection, containment, etc.
- **JQ transformations**: You can use the `jq` query language to transform the query results. The `jq` query can be used in the `jq` query field, which will return the transformed data in the `extension` field.
- **HTTP data sources**: You can define HTTP data sources, that will allow you to query data from external APIs. The API could be secured with JWT or API key, and the data can be transformed using the `jq` query language.
- **Extensions**: You can extend the general schema data types, to add cross data sources subqueries (joins) and function calls.
- **Field-level permissions**: You can define permissions for each field in the view, so you can control who can access the data.
- **Caching**: You can enable caching for the view, so you can improve performance by reducing the number of database queries.

## Next steps

You can continue with the [GraphQL Operations: Queries & Mutations](/docs/5-graphql) guide to learn more about how to interact with your data using GraphQL.
