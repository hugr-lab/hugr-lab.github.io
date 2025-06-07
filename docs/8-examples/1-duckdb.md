---
sidebar_position: 1
title: "DuckDB: Healthcare - Providers Open Payments Data"
---

In this example, we will use DuckDB to query the Open Payments data from the Centers for Medicare & Medicaid Services (CMS). This dataset contains information about financial relationships between healthcare providers and pharmaceutical companies.

This is open government data, and you can find the original dataset on the [CMS website](https://www.cms.gov/openpayments).

You can find this example in the [hugr examples repository](https://github.com/hugr-lab/examples).

In this example, we will demonstrate how to set up a DuckDB database as Hugr data source and how is works the self describe feature.

## DuckDB as a dataset

You can also see that the DuckDB databases with same structure can be used as a dataset in Hugr. We can set up a number of DuckDB databases as data sources as modules, so that the all queries will have same signatures, and you can change only root module name to switch between different datasets.

## DuckDB file views

You can also use DuckDB to view the data in the files, that are stored in the object storage like S3 or GCS. The DuckDB can read the files from the object storage and you can use it as a data source in Hugr.

You can create views in the DuckDB database and use them as a dataset in `hugr` or you can define it in the catalog sources use `@view` directive with sql parameter to define it. It the last case you can use in memory DuckDB database to query the files without creating a physical DuckDB database file.

## Limitations

### DuckDB in cluster environment

The DuckDB doesn't support the write operations to the same database file from different processes at the same time. So, if you are using DuckDB in the cluster environment, you should set the data source read-only to `true`, because the DuckDB database file can be accessed by multiple users and it does not support writes to the same file from different process at the same time.

## DuckDB views

Currently, the DuckDB doesn't support materialized views, and querying across views can have side effects during the query optimization. So, it is recommended to use the DuckDB views only with relations that are not inside in the view base query.

### Self-defined data source

Self-defined data sources can have side effects and support auto-generated relationships only for the DuckDB data source, because it uses the DuckDB metadata queries to generate the schema. For other data sources, you need to define the relationships manually.

### Performance

The files like CSV are very slow to query, so it is recommended to load the data into the DuckDB database or parquet files to improve the performance. The DuckDB can read the parquet files directly from the object storage, so you can use it as a data source in Hugr.

## Example

import RemoteMarkdown from '@site/src/components/RemoteMarkdown';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="readme" label="Getting Started">
    <RemoteMarkdown 
      url="https://raw.githubusercontent.com/hugr-lab/examples/main/examples/open-payments/README.md"
      fallback="📄 Loading documentation..."
    />
  </TabItem>
  
  <TabItem value="schema" label="GraphQL Schema">
    <RemoteMarkdown 
      url="https://raw.githubusercontent.com/hugr-lab/examples/main/examples/open-payments/schema.graphql"
      fallback="📋 Loading schema..."
      transform={(content) => '```graphql\n' + content + '\n```'}
    />
  </TabItem>

  <TabItem value="extra schema" label="Extra schema with relationships">
    <RemoteMarkdown 
      url="https://raw.githubusercontent.com/hugr-lab/examples/main/examples/open-payments/extra.graphql"
      fallback="📋 Loading data..."
      transform={(content) => '```graphql\n' + content + '\n```'}
    />
  </TabItem>
</Tabs>
