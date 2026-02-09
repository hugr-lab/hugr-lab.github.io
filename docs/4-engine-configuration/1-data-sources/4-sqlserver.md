---
sidebar_position: 5
title: SQL Server / Azure SQL
description: SQL Server and Azure SQL data source configuration in the Hugr engine. Includes SQL Server authentication (mssql:// protocol) and Azure EntraID service principal authentication (azure:// protocol) for Fabric Warehouse and Analytical Endpoints.
---


The SQL Server data source allows you to connect to Microsoft SQL Server databases, Azure Fabric Warehouse, and Azure SQL Analytical Endpoints. It supports two authentication methods: SQL Server authentication (`mssql://` protocol) and Azure EntraID service principal authentication (`azure://` protocol). Both methods use the `mssql` data source type.


The SQL Server data source is a powerful feature of the Hugr engine, allowing you to integrate enterprise SQL Server databases and Azure cloud data warehouses into your data mesh platform through a unified GraphQL API.

## Technical details


The SQL Server data source is an attached database in the DuckDB computation engine used by the `hugr` query engine. The connection is provided by the [DuckDB MSSQL extension](https://duckdb.org/docs/extensions/mssql.html), which uses the TDS (Tabular Data Stream) protocol to communicate with SQL Server and Azure SQL databases.

## Setting up SQL Server data source (SQL Server authentication)

To set up a SQL Server data source with SQL Server authentication, you need to add a data source record to the `data_sources` table through the GraphQL API.

The `path` should contain an MSSQL connection string using the `mssql://` protocol.

### Connection string format

| Component | Description | Example |
|-----------|-------------|---------|
| `mssql://` | Protocol identifier | `mssql://` |
| `user` | SQL Server login username | `sa` |
| `'password'` | Password (use single quotes if it contains special characters) | `'YourStrong@Passw0rd'` |
| `host` | Server hostname or IP address | `mssql-server` |
| `port` | TCP port number (default: 1433) | `1433` |
| `database` | Target database name | `AdventureWorksLT` |

Full format: `mssql://user:'password'@host:port/database`

The path can also contain environment variables: `mssql://[$DB_USER]:'[$DB_PASSWORD]'@[$DB_HOST]:1433/[$DB_NAME]`. When the data source is being attached to the Hugr engine, the environment variables will be replaced with the actual values.

```graphql
mutation addSQLServerDataSet($data: data_sources_mut_input_data! = {}) {
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

Variables:

```json
{
  "data": {
    "name": "adventureworks",
    "type": "mssql",
    "connection_string": "mssql://sa:'YourStrong@Passw0rd'@mssql:1433/AdventureWorksLT",
    "prefix": "aw",
    "description": "Adventure Works sample database",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false,
    "catalogs": [
      {
        "name": "adventureworks",
        "description": "Adventure Works schema",
        "path": "s3://my-bucket/adventureworks-schema/",
        "type": "uri"
      }
    ]
  }
}
```

## Setting up Azure SQL data source (EntraID authentication)

To connect to Azure Fabric Warehouse or Azure SQL Analytical Endpoints, use the `azure://` protocol with Azure EntraID service principal authentication.

### Connection string format

| Component | Description | Example |
|-----------|-------------|---------|
| `azure://` | Protocol identifier for Azure EntraID auth | `azure://` |
| `host` | Azure SQL server hostname | `your-server.database.fabric.microsoft.com` |
| `warehouse` | Fabric Warehouse or database name | `my-warehouse` |
| `tenant_id` | Azure AD tenant ID | `"00000000-0000-0000-0000-000000000000"` |
| `client_id` | Service principal application (client) ID | `"11111111-1111-1111-1111-111111111111"` |
| `client_secret` | Service principal client secret | `"your-client-secret"` |

Full format: `azure://<host>/<warehouse>?tenant_id="<tenant_id>"&client_id="<client_id>"&client_secret="<client_secret>"`

The data source type is still `mssql`, as Fabric Warehouse and Azure SQL use the TDS (Tabular Data Stream) protocol.

You can use environment variables to store sensitive credentials: `azure://<host>/<warehouse>?tenant_id="[$AZURE_TENANT_ID]"&client_id="[$AZURE_CLIENT_ID]"&client_secret="[$AZURE_CLIENT_SECRET]"`.

```graphql
mutation addAzureDataSet($data: data_sources_mut_input_data! = {}) {
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

Variables:

```json
{
  "data": {
    "name": "azure_wh",
    "type": "mssql",
    "connection_string": "azure://<azure-wh-host>/<azure-wh-name>?tenant_id=\"<tenant_id>\"&client_id=\"<client_id>\"&client_secret=\"<client_secret>\"",
    "prefix": "az",
    "description": "Azure Fabric Warehouse with sample data",
    "read_only": false,
    "self_defined": false,
    "as_module": true,
    "disabled": false,
    "catalogs": [
      {
        "name": "azure_wh",
        "description": "Fabric Warehouse schema",
        "type": "uri",
        "path": "s3://my-bucket/azure-schema/"
      }
    ]
  }
}
```

## Schema definition


As a database source, the SQL Server data source can be marked as `read_only` or `self_defined`. The `read_only` flag means that the data source is read-only and its data cannot be modified. The `self_defined` flag means that the data source is self-defined and the GraphQL schema definition will be generated based on the tables and views metadata.

You can also add multiple catalogs to the SQL Server data source. All data source catalogs will be merged into one catalog, along with the self-defined generated definitions.

The auto-generated schema (when `self_defined` is set to `true`) can be retrieved with the following function call after the data source is added and attached to the Hugr engine:

```graphql
query schema{
  function{
    core{
      describe_data_source_schema(name: "adventureworks", self: true)
    }
  }
}
```

It will return the schema definition as a GraphQL string, which you can use to create the catalog file for the data source.

## Data type mapping

The following table shows how SQL Server data types are mapped to DuckDB and hugr GraphQL types when the data source is attached:

| SQL Server Type | DuckDB Type | Hugr GraphQL Type | Notes |
|-----------------|-------------|-------------------|-------|
| `TINYINT` | `UTINYINT` | `Int` | Unsigned 8-bit integer |
| `SMALLINT` | `SMALLINT` | `Int` | 16-bit integer |
| `INT` | `INTEGER` | `Int` | 32-bit integer |
| `BIGINT` | `BIGINT` | `BigInt` | 64-bit integer |
| `BIT` | `BOOLEAN` | `Boolean` | Boolean |
| `REAL` | `FLOAT` | `Float` | 32-bit floating point |
| `FLOAT` | `DOUBLE` | `Float` | 64-bit floating point |
| `DECIMAL(p,s)` / `NUMERIC(p,s)` | `DECIMAL(p,s)` | `Float` | Exact numeric |
| `MONEY` | `DECIMAL(19,4)` | `Float` | Currency |
| `SMALLMONEY` | `DECIMAL(10,4)` | `Float` | Currency |
| `CHAR(n)` / `NCHAR(n)` | `VARCHAR` | `String` | Fixed-length string |
| `VARCHAR(n)` / `NVARCHAR(n)` | `VARCHAR` | `String` | Variable-length string |
| `VARCHAR(MAX)` / `NVARCHAR(MAX)` | `VARCHAR` | `String` | Large text |
| `DATE` | `DATE` | `Date` | Date only |
| `TIME` | `TIME` | `Time` | Time only |
| `DATETIME` / `DATETIME2` | `TIMESTAMP` | `DateTime` | Date and time |
| `SMALLDATETIME` | `TIMESTAMP` | `DateTime` | Date and time (minute precision) |
| `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE` | `DateTime` | Date and time with timezone |
| `BINARY(n)` / `VARBINARY(n)` | `BLOB` | `String` | Binary data (base64 encoded) |
| `VARBINARY(MAX)` | `BLOB` | `String` | Large binary data (base64 encoded) |
| `UNIQUEIDENTIFIER` | `UUID` | `String` | Globally unique identifier |

### Unsupported data types

The following SQL Server data types are **not supported** and columns using them will be skipped:

- `XML`
- `SQL_VARIANT`
- `IMAGE` (deprecated; use `VARBINARY(MAX)` instead)
- `TEXT` / `NTEXT` (deprecated; use `VARCHAR(MAX)` / `NVARCHAR(MAX)` instead)
- `TIMESTAMP` / `ROWVERSION` (binary counter, not a datetime type)
- User-defined types (UDT): `GEOGRAPHY`, `GEOMETRY`, `HIERARCHYID`

## Limitations


The SQL Server data source has the following limitations:

- **Limited query push-down**: The engine supports filter push-down and column projection for SQL Server databases. However, joins, aggregations, sorting, and pagination are processed in the DuckDB computation engine.
- **Auto-generated schema**: The auto-generated schema (when `self_defined` is set to `true`) supports only tables and views. Functions are not supported. All views are generated as tables, so data mutation operations will also be generated for them. Relationships are not generated automatically — you can define them manually in the catalog files.
- **DML batch limits**:
  - `INSERT`: Maximum 1000 rows per statement, 8 MB maximum SQL statement size.
  - `UPDATE` / `DELETE`: Approximately 2100 parameter limit per statement.
- **Unsupported data types**: See the [unsupported data types](#unsupported-data-types) section above for SQL Server types that cannot be mapped.

In practice, we do not recommend using the SQL Server data source with `self_defined` set to `true` for production usage, but it can be useful for schema development.

## Examples

- SQL Server data source example with the Adventure Works database: [SQL Server: Adventure Works](../../9-examples/7-mssql.mdx)
- Azure Fabric Warehouse example with star schema: [Azure: Fabric Warehouse](../../9-examples/8-fabric-warehouse.mdx)
