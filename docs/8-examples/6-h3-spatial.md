---
title: H3 Spatial Example
sidebar_position: 6
description: "Learn how to create geoembeddings using H3 hexagons with Hugr."
---

HUgr can help you to create geoembeddings from your data based on the H3 DSG. H3 is a geospatial indexing system that allows you to represent geographic locations as hexagonal grids. This can be useful for various applications, such as spatial analysis, mapping, and data visualization.

Hugr provides a special type of data query called `h3` that allows you to aggregate you data into h3 hexagons. The `h3` query can be used to create geoembeddings from your data by aggregating it into H3 hexagons based on the spatial fields in your data tables and views.

## Data source

We will use the OpenStreetMap (OSM) data for Baden-Württemberg, Germany, and Population data from the [German Federal Statistical Office (Destatis)](https://www.zensus2022.de/static/Zensus_Veroeffentlichung/Regionaltabelle_Bevoelkerung.xlsx) as our data sources.

### Create a OSM data source

To create a data source for the OSM data you can use the existing [OSM dbt project](https://github.com/hugr-lab/osm-dbt) as a starting point or following by the Example (./5-duckdb-spatial.mdx) to create a DuckDB database with the OSM data.

Additionally, we should extend the OSM data source to add calculated field for the county code (osm tag `de:amtlicher_gemeindeschluesselz`) in osm_administrative_boundaries table. This will allow us to join the OSM data with the population data later.

We will add additional catalog file `osm_extension.graphql` to the OSM data source with the following content:

```graphql
extend type osm_administrative_boundaries {
  de_code: String @sql(
    exp: "(tags->>'de:amtlicher_gemeindeschluessel')"
  )
}
```

And now we can add this file as a catalog source for the OSM BW:

```graphql
mutation addOsmExtend{
  core{
    insert_catalog_sources(data:{
      name: "osm_extend_de_code"
      description: "Add de code to the osm admin boundaries"
      type: "uriFile"
      path: "~/workspace/examples/h3/osm_extend.graphql"
    }){
      name
      path
      type
    }
    insert_catalogs(data:{
      data_source_name: "osm.bw"
      catalog_name: "osm_extend_de_code"
    }) {
      success
      affected_rows
    }
  }
}
```

Than you can reload the OSM BW data source to apply the changes:

```graphql
mutation reloadOsmDataSource {
  function{
    reload_data_source(
      name: "osm.bw"
    ) {
      success
      message
    }
  }
}
```


### Create a Population data source

To create a data source for the population data, we will use the [Destatis Zensus 2022](https://www.zensus2022.de/static/Zensus_Veroeffentlichung/Regionaltabelle_Bevoelkerung.xlsx) Excel file. We can convert this file to a DuckDB table using the `hugr` engine.

To do this follow the steps:

1. Download the Excel file and place it in your workspace, e.g. `~/workspace/examples/h3/population.xlsx`.
2. Save the worksheet `Regionaltabelle_Bevoelkerung` as a csv file, e.g. `examples/h3/population.csv`.
3. To create a duckdb file with the population data, you can run following bash script:

```bash
#!/bin/bash
duckdb examples/h3/zensus.duckdb -c "CREATE TABLE population AS SELECT * FROM read_csv_auto('examples/h3/population.csv');"
```

4. Now we can create a DuckDB data source for the population data:

```graphql
mutation addZensusDataSource {
  core {
    insert_data_sources(data: {
      name: "zensus",
      type: "duckdb",
      prefix: "zensus",
      description: "Zensus 2022 population data",
      path: "/workspace/examples/h3/zensus.duckdb"
      as_module: true,
      read_only: true,
      self_defined: true,
    }) {
      success
      affected_rows
    }
  }
}
```

5. Load the data source:

```graphql
mutation loadZensusDataSource {
  core {
    load_data_source(name: "zensus") {
      success
      message
    }
  }
}
```

## Join OSM and Population data

Now you are able to join the OSM data with the population data using the `de_code` field we added to the OSM data source. You can use the following query to get the population data for each OSM administrative boundary:

```graphql
query debw{
  osm{
    bw{
      osm_administrative_boundaries(filter: {admin_level: {eq: 6}}){
        osm_id
        name
        de_code
        _join(fields:["de_code"]){
          zensus_population(fields: ["db_RS"]){
            db_RS
            Name
            EWZ
          }
        }
      }
    }
  }
}
```

This query will return the OSM administrative boundaries for admin level 7 (Landkreis) for Baden-Württemberg with the population data from the Zensus 2022. The `de_code` field is used to join the OSM data with the population data.

## Split population data into H3 hexagons distributed by sum of residential building areas

```graphql
query deOSMByH3 {
  h3(resolution: 6) @stats{
    cell
    resolution
    data{
      lk: osm_bw_osm_administrative_boundaries_aggregation(
        field: "geom"
        filter:{admin_level: {eq:6}},
        divide_values:false
        inner: true
      ){
        pop: _join(fields: ["de_code"]) {
          zensus_population(fields: ["db_RS"]){
            EWZ{
              sum
            }
          }
        }
      }
      houses: osm_bw_osm_buildings_aggregation(
        field: "geom"
        filter: {building_class: {eq:"residential"}}
      ){
        _rows_count
        area_sqm{
          sum
        }
      }
    }
  }
}
```

This query will return the H3 hexagons in Baden-Württemberg with the population data from the Zensus 2022 and the residential building areas from the OSM data. The `h3` query is used to aggregate the OSM data into H3 hexagons based on the spatial fields in the OSM data tables.

Let's extend the query to calculate the population density in each H3 hexagon:

```graphql
query deOSMByH3 {
  h3(resolution: 6) @stats{
    cell
    resolution
    data{
      lk: osm_bw_osm_administrative_boundaries_aggregation(
        field: "geom"
        filter:{admin_level: {eq:6}},
        divide_values:false
        inner: true
      ){
        pop: _join(fields: ["de_code"]) {
          zensus_population(fields: ["db_RS"]){
            EWZ{
              sum
            }
          }
        }
      }
      houses: osm_bw_osm_buildings_aggregation(
        field: "geom"
        filter: {building_class: {eq:"residential"}}
      ){
        _rows_count
        area_sqm{
          sum
        }
      }
    }
    pop: distribution_by(
      numerator: "data.lk.pop.zensus_population.EWZ.sum"
      denominator: "data.houses.area_sqm.sum"
    ){
      value
      ratio
      numerator
      denominator
      denominator_total
    }
  }
}
```

This query will return the H3 hexagons in Baden-Württemberg with the population density calculated as the ratio of the population to the residential building area. The `distribution_by` field is used to calculate the population density in each H3 hexagon by the following formula:

`value = numerator * denominator / sum(denominator)`

Where `numerator` is the population data and `denominator` is the residential building area in each H3 hexagon. For the population data aggregation we have used the `inner: true`, that means that the sum of denominator will be calculated only for the H3 hexagons that have population data.

As well you can calculate the population density by buckets, to do this you can use the `distribution_by_bucket` field:

```graphql
query deOSMByH3 {
  h3(resolution: 6) @stats{
    cell
    resolution
    data{
      lk: osm_bw_osm_administrative_boundaries_aggregation(
        field: "geom"
        filter:{admin_level: {eq:6}},
        divide_values:false
        inner: true
      ){
        pop: _join(fields: ["de_code"]) {
          zensus_population(fields: ["db_RS"]){
            EWZ{
              sum
            }
          }
        }
      }
      houses_bucket: osm_bw_osm_buildings_bucket_aggregation(
        field: "geom"
        filter: {building_class: {eq:"residential"}}
      ){
        key{
          building_type
        }
        aggregations{
          _rows_count
          area_sqm{
            sum
          }
        }
      }
    }
    pop_by_bucket: distribution_by_bucket(
      numerator: "data.lk.pop.zensus_population.EWZ.sum"
      denominator_key: "data.houses_bucket.key"
      denominator: "data.houses_bucket.aggregations.area_sqm.sum"
    ){
      denominator_key
      value
      ratio
    }
  }
}
```

This query will return the H3 hexagons in Baden-Württemberg with the population density calculated by buckets based on the residential building area. The `distribution_by_bucket` field is used to calculate the population density in each H3 hexagon by the same formula, but denominator points to the bucket aggregation of the residential building area. The `denominator_key` is used to select key field in the base aggregation.

As well numerator can point to the bucket aggregation, so you can calculate the distribution by bucket for the numerator as well.

## Conclusion

In this example, we have shown how to use the `hugr` engine to create geoembeddings from your data based on the H3 DSG. We have used the OSM data for Baden-Württemberg and the population data from the Zensus 2022 to create H3 hexagons with population density calculated by residential building areas. The `h3` query allows you to aggregate your data into H3 hexagons based on the spatial fields in your data tables and views, making it easy to create geoembeddings for various applications.

You can apply this approach to any spatial data you have, as long as you can define the spatial fields in your data tables and views. The `hugr` engine provides a powerful way to work with spatial data and create geoembeddings that can be used for various applications, such as spatial analysis, mapping, data visualization and **Machine Learning**.
