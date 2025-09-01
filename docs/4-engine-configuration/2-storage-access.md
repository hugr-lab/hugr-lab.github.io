---
sidebar_position: 3
title: "Object Storage Access Configuration"
---


The `hugr` engine supports access to files stored in object storage systems, such as Local S3 (MinIO), AWS S3, Google Cloud Storage, Cloudflare R2, or Azure Blob Storage. This allows you to work with large datasets, files, or other binary data directly from your queries and mutations.


To configure object storage access, you need to provide the necessary credentials and connection settings for the object storage system you are using. This can be done through the unified GraphQL API.


Once object storage access is configured, you can use the `hugr` engine to read and write files to the object storage system as part of your data processing workflows.


Currently, GraphQL mutations are implemented for S3-compatible object storages. Support for Azure Blob Storage and Azure Data Lake Storage is in development.


`hugr` allows you to use multiple object storages simultaneously; the credentials will apply by scope (path prefix).


You can use object storage to store schema definition files (catalog source type `uri` or `uriFile`), DuckDB database files (DuckDB data sources), and data files to create file views (CSV, Parquet, ESRI Shapefile, GeoPackage, JSON, GeoJSON, etc.)

## Register a new object storage


To allow access to a new object storage system, you need to provide the necessary credentials and URLs for the object storage system you are using. This can be done through the unified GraphQL API.


To register a new object storage in standalone mode, you can use the following mutation:

```graphql
mutation(
  $type: String!,
  $name: String!,
  $key: String!,
  $secret: String!,
  $region: String!,
  $endpoint: String!,
  $scope: String!,
  $use_ssl: Boolean!,
  $url_style: String!,
  $url_compatibility: Boolean,
  $kms_key_id: String,
  $account_id: String
){
  function {
    core {
      storage {
        register_object_storage(
          type: $type,
          name: $name,
          key: $key,
          secret: $secret,
          region: $region,
          endpoint: $endpoint,
          scope: $scope,
          use_ssl: $use_ssl,
          url_style: $url_style,
          url_compatibility: $url_compatibility,
          kms_key_id: $kms_key_id,
          account_id: $account_id
        ) {
          success
          message
        }
      }
    }
  }
}
```


To register a new object storage in cluster mode (it will propagate to all nodes), you can use the following mutation:

```graphql
mutation(
  $type: String!,
  $name: String!,
  $key: String!,
  $secret: String!,
  $region: String!,
  $endpoint: String!,
  $scope: String!,
  $use_ssl: Boolean!,
  $url_style: String!,
  $url_compatibility: Boolean,
  $kms_key_id: String,
  $account_id: String
){
  function {
    core {
      cluster {
        register_object_storage(
          type: $type,
          name: $name,
          key: $key,
          secret: $secret,
          region: $region,
          endpoint: $endpoint,
          scope: $scope,
          use_ssl: $use_ssl,
          url_style: $url_style,
          url_compatibility: $url_compatibility,
          kms_key_id: $kms_key_id,
          account_id: $account_id
        ) {
          success
          message
        }
      }
    }
  }
}
```


The scope should be provided as a path prefix, for example: `s3://my-bucket/prefix/`.

The parameter descriptions are in the table below:
| Name | Description | Applies to | Type | Default |
| --- | --- | --- | --- | --- |
| type | The type of the object storage (S3, GCS, R2) |  | STRING | - |
| name | The name of the object storage |  | STRING | - |
| scope | The scope of the object storage |  | STRING | - |
| endpoint | Specify a custom S3 endpoint | S3, GCS, R2 | STRING | s3.amazonaws.com for S3 |
| key | The ID of the key to use | S3, GCS, R2 | STRING | - |
| region | The region for which to authenticate (should match the region of the bucket to query) | S3, GCS, R2 | STRING | us-east-1 |
| secret | The secret of the key to use | S3, GCS, R2 | STRING | - |
| url_compatibility | Can help when URLs contain problematic characters | S3, GCS, R2 | BOOLEAN | true |
| url_style | Either vhost or path | S3, GCS, R2 | STRING | vhost for S3, path for R2 and GCS |
| use_ssl | Whether to use HTTPS or HTTP | S3, GCS, R2 | BOOLEAN | true |
| account_id | The R2 account ID to use for generating the endpoint URL | R2 | STRING | - |
| kms_key_id | AWS KMS (Key Management Service) key for Server Side Encryption S3 | S3 | STRING | - |

## Unregister an object storage


To unregister an object storage, you can use the following mutation:


In standalone mode:

```graphql
mutation(
  $name: String!
){
  function {
    core {
      storage {
        unregister_object_storage(
          name: $name
        ) {
          success
          message
        }
      }
    }
  }
}
```


In cluster mode (it will propagate to all nodes):

```graphql
mutation(
  $name: String!
){
  function {
    core {
      cluster {
        unregister_object_storage(
          name: $name
        ) {
          success
          message
        }
      }
    }
  }
}
```

## Registered Object Storage


To list all registered object storages, you can use the following query:

```graphql
query {
  function {
    core {
      storage {
        registered_object_storages {
          name
          type
          region
          endpoint
          scope
          use_ssl
          url_style
          url_compatibility
          kms_key_id
          account_id
        }
      }
    }
  }
}
```


In cluster mode:

```graphql
query {
  function {
    core {
      cluster {
        registered_object_storages {
          node
          name
          type
          region
          endpoint
          scope
          use_ssl
          url_style
          url_compatibility
          kms_key_id
          account_id
        }
      }
    }
  }
}
```

