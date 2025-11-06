---
title: "H3 Hexagonal Clustering"
sidebar_position: 10
---

# H3 Hexagonal Clustering

Hugr supports spatial clustering and aggregation using the **H3 hexagonal grid system**. H3 is a geospatial indexing system developed by Uber that represents geographic locations as hierarchical hexagonal grids, making it ideal for spatial analysis, visualization, and machine learning applications.

## What is H3?

H3 divides the Earth's surface into hexagonal cells at different resolutions:
- **Resolution 0-2**: Large areas (countries, regions)
- **Resolution 3-5**: Cities, districts
- **Resolution 6-8**: Neighborhoods, blocks
- **Resolution 9-11**: Buildings, streets
- **Resolution 12-15**: Very fine-grained (meters)

Hexagons have advantages over square grids:
- Uniform neighbor distance
- Better representation of circular areas
- Reduced edge effects

## Basic H3 Query

Use the `h3()` query to aggregate spatial data into H3 hexagons:

```graphql
query BasicH3 {
  h3(resolution: 6) {
    cell              # H3 cell ID (hexadecimal string)
    resolution        # Resolution level (0-15)
    data {
      # Your aggregations here
    }
  }
}
```

## Aggregating Spatial Data

### Single Row Aggregation

Aggregate all records within each H3 cell:

```graphql
query H3Aggregation {
  h3(resolution: 7) {
    cell
    resolution
    data {
      # Count buildings in each hexagon
      buildings: buildings_aggregation(
        field: "location"  # Geometry field
        inner: true        # Only cells with data
      ) {
        _rows_count
        area {
          sum
          avg
        }
      }
    }
  }
}
```

**Parameters:**
- `field`: The geometry field to use for spatial aggregation
- `inner: true`: Only return H3 cells that contain data (excludes empty cells)
- `divide_values: false`: Keep original values (default: true distributes values proportionally)

### Bucket Aggregation

Group data within each H3 cell:

```graphql
query H3BucketAggregation {
  h3(resolution: 8) {
    cell
    resolution
    data {
      # Group buildings by type within each hexagon
      buildings: buildings_bucket_aggregation(
        field: "geometry"
        inner: true
      ) {
        key {
          building_type
        }
        aggregations {
          _rows_count
          area { sum }
          height { avg }
        }
      }
    }
  }
}
```

## Practical Examples

### Incident Clustering

Cluster incidents by type and analyze severity:

```graphql
query IncidentClustering {
  h3(resolution: 7) {
    cell
    resolution
    data {
      # All incidents
      all_incidents: incidents_aggregation(
        field: "location"
        inner: true
      ) {
        _rows_count
        severity {
          avg
          max
        }
      }

      # Group by incident type
      by_type: incidents_bucket_aggregation(
        field: "location"
        inner: true
      ) {
        key {
          incident_type
        }
        aggregations {
          _rows_count
          severity { avg max }
          response_time { avg }
        }
      }
    }
  }
}
```

### Store Density Analysis

Analyze store distribution and revenue:

```graphql
query StoreDensity {
  h3(resolution: 6) {
    cell
    resolution
    data {
      stores: stores_aggregation(
        field: "location"
        inner: true
      ) {
        _rows_count
        revenue {
          sum
          avg
        }
      }

      # Group by store category
      by_category: stores_bucket_aggregation(
        field: "location"
        inner: true
      ) {
        key {
          category
        }
        aggregations {
          _rows_count
          revenue { sum }
        }
      }
    }
  }
}
```

## Value Distribution

### distribution_by

Distribute values proportionally across H3 cells based on a denominator:

```graphql
query PopulationDistribution {
  h3(resolution: 8) {
    cell
    resolution
    data {
      # Population from administrative boundaries
      population: admin_boundaries_aggregation(
        field: "boundary"
        filter: { admin_level: { eq: 6 } }
        divide_values: false  # Keep original totals
        inner: true
      ) {
        population { sum }
      }

      # Residential building area (denominator)
      buildings: buildings_aggregation(
        field: "geometry"
        filter: { building_class: { eq: "residential" } }
      ) {
        area { sum }
      }
    }

    # Distribute population proportionally by building area
    pop_distributed: distribution_by(
      numerator: "data.population.population.sum"
      denominator: "data.buildings.area.sum"
    ) {
      value          # Distributed population value
      ratio          # Proportion of total
      numerator      # Original population
      denominator    # Building area in this cell
      denominator_total  # Total building area across all cells
    }
  }
}
```

**Formula:**
```
value = numerator * (denominator / denominator_total)
```

**Use cases:**
- Distribute population by residential building area
- Distribute sales by store locations
- Distribute emissions by industrial zones

### distribution_by_bucket

Distribute values across buckets within each H3 cell:

```graphql
query PopulationByBuildingType {
  h3(resolution: 8) {
    cell
    resolution
    data {
      # Population (numerator)
      population: admin_boundaries_aggregation(
        field: "boundary"
        filter: { admin_level: { eq: 6 } }
        divide_values: false
        inner: true
      ) {
        population { sum }
      }

      # Building area by type (denominator buckets)
      buildings_by_type: buildings_bucket_aggregation(
        field: "geometry"
        filter: { building_class: { eq: "residential" } }
      ) {
        key {
          building_type
        }
        aggregations {
          area { sum }
        }
      }
    }

    # Distribute population by building type
    pop_by_type: distribution_by_bucket(
      numerator: "data.population.population.sum"
      denominator_key: "data.buildings_by_type.key"
      denominator: "data.buildings_by_type.aggregations.area.sum"
    ) {
      denominator_key  # Building type
      value            # Population for this building type
      ratio            # Proportion
    }
  }
}
```

**Use cases:**
- Distribute population by building type
- Distribute revenue by product category
- Distribute traffic by road type

## Multi-Source Integration

Combine data from multiple sources in H3 aggregation:

```graphql
query MultiSourceH3 {
  h3(resolution: 7) {
    cell
    resolution
    data {
      # OSM buildings
      osm_buildings: osm_buildings_aggregation(
        field: "geometry"
        filter: { building_class: { eq: "residential" } }
      ) {
        _rows_count
        area { sum }
      }

      # Population data (joined)
      population: admin_boundaries_aggregation(
        field: "boundary"
        divide_values: false
        inner: true
      ) {
        pop_data: _join(fields: ["admin_code"]) {
          census_data(fields: ["code"]) {
            population { sum }
          }
        }
      }

      # Calculate density
      density: distribution_by(
        numerator: "data.population.pop_data.census_data.population.sum"
        denominator: "data.osm_buildings.area.sum"
      ) {
        value  # Population per square meter
      }
    }
  }
}
```

## Filtering H3 Results

### Filter Source Data

Apply filters before H3 aggregation:

```graphql
query FilteredH3 {
  h3(resolution: 6) {
    cell
    data {
      # Only high-severity incidents
      critical_incidents: incidents_aggregation(
        field: "location"
        filter: {
          severity: { gte: 7 }
          status: { eq: "active" }
        }
        inner: true
      ) {
        _rows_count
      }
    }
  }
}
```

### Filter by Time

Time-based H3 analysis:

```graphql
query TimeBasedH3 {
  h3(resolution: 8) {
    cell
    data {
      # Recent orders
      recent_orders: orders_aggregation(
        field: "delivery_location"
        filter: {
          created_at: { gte: "2024-01-01" }
        }
        inner: true
      ) {
        _rows_count
        total { sum avg }
      }

      # Group by delivery time
      by_time: orders_bucket_aggregation(
        field: "delivery_location"
        filter: {
          created_at: { gte: "2024-01-01" }
        }
        inner: true
      ) {
        key {
          delivery_time_bucket: created_at(bucket: hour)
        }
        aggregations {
          _rows_count
        }
      }
    }
  }
}
```

## Performance Considerations

### 1. Choose Appropriate Resolution

```graphql
# Too fine - may generate millions of cells
h3(resolution: 12) { ... }  # Avoid for large areas

# Good - balanced for city-level analysis
h3(resolution: 7) { ... }   # Recommended

# Too coarse - may lose detail
h3(resolution: 3) { ... }   # Only for continental analysis
```

**Guidelines:**
- **Resolution 5-7**: City-wide analysis
- **Resolution 8-9**: Neighborhood analysis
- **Resolution 10-12**: Street-level analysis

### 2. Use inner: true

Exclude empty cells to reduce result size:

```graphql
query {
  h3(resolution: 7) {
    cell
    data {
      buildings: buildings_aggregation(
        field: "location"
        inner: true  # Only cells with buildings
      ) {
        _rows_count
      }
    }
  }
}
```

### 3. Apply Filters Early

Filter data before H3 aggregation:

```graphql
query {
  h3(resolution: 8) {
    cell
    data {
      # Filter first, then aggregate
      stores: stores_aggregation(
        field: "location"
        filter: {
          revenue: { gte: 100000 }
          status: { eq: "active" }
        }
        inner: true
      ) {
        _rows_count
        revenue { sum }
      }
    }
  }
}
```

### 4. Limit Data Sources

Don't aggregate too many sources in one query:

```graphql
# Avoid - too many aggregations
h3(resolution: 9) {
  data {
    source1: ...
    source2: ...
    source3: ...
    source4: ...
    source5: ...
  }
}

# Better - aggregate 2-3 related sources
h3(resolution: 9) {
  data {
    buildings: ...
    population: ...
  }
}
```

## Common Use Cases

### 1. Heatmap Generation

```graphql
query HeatmapData {
  h3(resolution: 8) {
    cell
    data {
      events: events_aggregation(
        field: "location"
        filter: {
          created_at: { gte: "2024-01-01" }
        }
        inner: true
      ) {
        _rows_count
      }
    }
  }
}
```

### 2. Coverage Analysis

```graphql
query CoverageAnalysis {
  h3(resolution: 7) {
    cell
    data {
      stores: stores_aggregation(
        field: "location"
        inner: true
      ) {
        _rows_count
      }

      customers: customers_aggregation(
        field: "address_location"
        inner: true
      ) {
        _rows_count
      }
    }
  }
}
```

### 3. Resource Allocation

```graphql
query ResourceAllocation {
  h3(resolution: 6) {
    cell
    data {
      demand: service_requests_aggregation(
        field: "location"
        inner: true
      ) {
        _rows_count
        priority { avg }
      }

      supply: service_centers_aggregation(
        field: "location"
        inner: true
      ) {
        _rows_count
        capacity { sum }
      }
    }
  }
}
```

### 4. Geospatial Machine Learning

```graphql
query MLFeatures {
  h3(resolution: 8) {
    cell
    resolution
    data {
      # Population features
      population: admin_boundaries_aggregation(
        field: "boundary"
        divide_values: false
        inner: true
      ) {
        pop: _join(fields: ["code"]) {
          census(fields: ["admin_code"]) {
            population { sum }
            income { avg }
          }
        }
      }

      # POI features
      restaurants: pois_aggregation(
        field: "location"
        filter: { category: { eq: "restaurant" } }
      ) {
        _rows_count
        rating { avg }
      }

      # Building features
      buildings: buildings_aggregation(
        field: "geometry"
      ) {
        _rows_count
        area { sum avg }
        height { avg }
      }

      # Distribution
      pop_distributed: distribution_by(
        numerator: "data.population.pop.census.population.sum"
        denominator: "data.buildings.area.sum"
      ) {
        value
      }
    }
  }
}
```

## Next Steps

- See [H3 Spatial Example](../../9-examples/6-h3-spatial.md) for a complete real-world example
- Learn about [Spatial Queries](./9-spatial.md) for other spatial operations
- Check [Aggregations](./7-aggregations.md) for more aggregation techniques
- Explore [Dynamic Joins](./8-dynamic-joins.md) for multi-source data integration
