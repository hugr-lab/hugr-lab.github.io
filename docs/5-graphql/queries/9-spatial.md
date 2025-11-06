---
title: "Spatial Queries (_spatial)"
sidebar_position: 9
---

# Spatial Queries (_spatial)

Hugr provides built-in support for spatial queries through the `_spatial` field, available on all data objects with geometry fields. This enables powerful geographic queries like finding nearby locations, identifying intersections, and performing spatial aggregations.

## Basic Spatial Queries

### Finding Intersecting Features

Find all features that intersect with a geometry:

```graphql
query {
  regions {
    id
    name
    boundary
    # Find roads that intersect this region
    _spatial(field: "boundary", type: INTERSECTS) {
      roads(field: "geometry") {
        id
        name
        road_type
      }
    }
  }
}
```

### Within a Distance

Find features within a specified distance:

```graphql
query {
  stores {
    id
    name
    location
    # Find customers within 5km
    _spatial(
      field: "location"
      type: DWITHIN
      buffer: 5000  # meters
    ) {
      customers(field: "address_location") {
        id
        name
        email
      }
    }
  }
}
```

## Spatial Relationship Types

### INTERSECTS

Geometries share any portion of space:

```graphql
query {
  parcels {
    id
    parcel_number
    boundary
    # Parcels intersected by roads
    _spatial(field: "boundary", type: INTERSECTS) {
      roads(field: "geometry") {
        id
        name
      }
    }
  }
}
```

Use cases:
- Finding roads crossing a region
- Identifying overlapping zones
- Detecting spatial conflicts

### WITHIN

Geometry is completely inside the reference:

```graphql
query {
  cities {
    id
    name
    boundary
    # Buildings completely within city
    _spatial(field: "boundary", type: WITHIN) {
      buildings(field: "footprint") {
        id
        address
        building_type
      }
    }
  }
}
```

Use cases:
- Finding points of interest within a boundary
- Listing features inside a zone
- Containment analysis

### CONTAINS

Reference geometry completely contains the target:

```graphql
query {
  administrative_zones {
    id
    zone_name
    boundary
    # Zones that contain this point
    _spatial(field: "boundary", type: CONTAINS) {
      service_areas(field: "coverage_area") {
        id
        service_type
      }
    }
  }
}
```

Use cases:
- Finding enclosing boundaries
- Service area coverage
- Jurisdiction determination

### DISJOINT

Geometries don't share any space:

```graphql
query {
  protected_areas {
    id
    name
    boundary
    # Development zones not overlapping protected areas
    _spatial(field: "boundary", type: DISJOINT) {
      development_zones(field: "boundary") {
        id
        zone_name
      }
    }
  }
}
```

Use cases:
- Finding non-overlapping regions
- Exclusion zones
- Conflict detection

### DWITHIN

Within a specified distance (requires buffer parameter):

```graphql
query {
  incidents {
    id
    incident_type
    location
    # Hospitals within 10km
    _spatial(
      field: "location"
      type: DWITHIN
      buffer: 10000  # 10km in meters
    ) {
      hospitals(field: "location") {
        id
        name
        emergency_capacity
        distance_meters
      }
    }
  }
}
```

Use cases:
- Proximity search
- Catchment analysis
- Service accessibility

## Filtering Spatial Results

### Apply Filters to Spatial Queries

Combine spatial and attribute filters:

```graphql
query {
  delivery_zones {
    id
    name
    boundary
    # Active orders within zone
    _spatial(field: "boundary", type: CONTAINS) {
      orders(
        field: "delivery_location"
        filter: {
          _and: [
            { status: { in: ["pending", "processing"] } }
            { priority: { eq: "high" } }
          ]
        }
      ) {
        id
        customer {
          name
        }
        delivery_location
        priority
      }
    }
  }
}
```

### Filter Before Spatial Join

The `filter` argument applies **before** spatial filtering:

```graphql
query {
  areas {
    id
    name
    boundary
    _spatial(field: "boundary", type: INTERSECTS) {
      # Filter roads first, then apply spatial filter
      roads(
        field: "geometry"
        filter: {
          road_type: { eq: "highway" }
        }
      ) {
        id
        name
        road_type
      }
    }
  }
}
```

### Filter by Nested Relations

```graphql
query {
  cities {
    id
    name
    boundary
    _spatial(field: "boundary", type: CONTAINS) {
      businesses(
        field: "location"
        filter: {
          category: {
            name: { eq: "Restaurant" }
          }
          rating: { gte: 4.0 }
        }
      ) {
        id
        name
        rating
      }
    }
  }
}
```

## Sorting Spatial Results

### order_by for Pre-Spatial Sorting

Sort **before** spatial filtering:

```graphql
query {
  stores {
    id
    name
    location
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(
        field: "address_location"
        order_by: [{ field: "name", direction: ASC }]
      ) {
        id
        name
      }
    }
  }
}
```

### nested_order_by for Post-Spatial Sorting

Sort **after** spatial filtering:

```graphql
query {
  stores {
    id
    name
    location
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(
        field: "address_location"
        nested_order_by: [{ field: "distance", direction: ASC }]
        nested_limit: 10
      ) {
        id
        name
        distance
      }
    }
  }
}
```

### Sort by Distance

```graphql
query {
  incident_locations {
    id
    location
    _spatial(field: "location", type: DWITHIN, buffer: 20000) {
      fire_stations(
        field: "location"
        nested_order_by: [{ field: "distance_meters", direction: ASC }]
        nested_limit: 3  # Get 3 nearest stations
      ) {
        id
        name
        distance_meters
      }
    }
  }
}
```

## Pagination for Spatial Results

### Limit Spatial Results

```graphql
query {
  cities {
    id
    name
    boundary
    # Limit results
    _spatial(field: "boundary", type: CONTAINS) {
      points_of_interest(
        field: "location"
        limit: 100
      ) {
        id
        name
      }
    }
  }
}
```

### nested_limit and nested_offset

Control pagination per parent:

```graphql
query {
  cities(limit: 5) {
    id
    name
    boundary
    # Get 20 POIs per city
    _spatial(field: "boundary", type: CONTAINS) {
      points_of_interest(
        field: "location"
        nested_order_by: [{ field: "rating", direction: DESC }]
        nested_limit: 20
        nested_offset: 0
      ) {
        id
        name
        rating
      }
    }
  }
}
```

## Using inner with Spatial Queries

By default, spatial queries use LEFT JOIN, returning all parent records even if no spatially related records are found. Use `inner: true` to include only records that have spatial matches.

### LEFT JOIN (default)

```graphql
query {
  stores {
    id
    name
    location
    # All stores, even those without nearby customers
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(field: "address_location") {
        id
        name
      }
    }
  }
}
```

**Result:**
- All stores are returned
- Stores without nearby customers have empty spatial results

### INNER JOIN

```graphql
query {
  stores {
    id
    name
    location
    # Only stores with nearby customers
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(
        field: "address_location"
        inner: true
      ) {
        id
        name
      }
    }
  }
}
```

**Result:**
- Only stores that have customers within 5km are returned
- Stores without nearby customers are excluded from results

### With Filters

```graphql
query {
  delivery_zones {
    id
    name
    boundary
    # Only zones with active orders inside
    _spatial(field: "boundary", type: CONTAINS) {
      orders(
        field: "delivery_location"
        filter: { status: { in: ["pending", "processing"] } }
        inner: true
      ) {
        id
        status
      }
    }
  }
}
```

Returns only delivery zones that contain active orders.

### Finding Coverage Gaps

Use `inner: false` (default) to find records without spatial matches:

```graphql
query {
  # Find areas without service coverage
  residential_areas {
    id
    name
    boundary
    _spatial(field: "boundary", type: INTERSECTS) {
      service_zones(field: "coverage_area") {
        id
      }
    }
  }
}
```

Filter client-side for areas where `service_zones` is empty.

## Aggregating Spatial Results

### Count Spatial Matches

```graphql
query {
  cities {
    id
    name
    boundary
    # Count buildings in city
    _spatial(field: "boundary", type: CONTAINS) {
      buildings_aggregation(field: "footprint") {
        _rows_count
      }
    }
  }
}
```

### Aggregate Attributes

```graphql
query {
  regions {
    id
    name
    area
    boundary
    # Aggregate population of contained cities
    _spatial(field: "boundary", type: CONTAINS) {
      cities_aggregation(field: "boundary") {
        _rows_count
        population {
          sum
          avg
        }
        area {
          sum
        }
      }
    }
  }
}
```

### Filtered Spatial Aggregation

```graphql
query {
  service_areas {
    id
    name
    coverage_area
    _spatial(field: "coverage_area", type: CONTAINS) {
      # Aggregate only residential buildings
      buildings_aggregation(
        field: "footprint"
        filter: {
          building_type: { eq: "residential" }
        }
      ) {
        _rows_count
        floor_area {
          sum
        }
      }
    }
  }
}
```

### Bucket Aggregation with Spatial

Group spatially related data:

```graphql
query {
  districts {
    id
    name
    boundary
    _spatial(field: "boundary", type: CONTAINS) {
      # Group businesses by type
      businesses_bucket_aggregation(field: "location") {
        key {
          business_type
        }
        aggregations {
          _rows_count
          revenue {
            sum
            avg
          }
        }
      }
    }
  }
}
```

### Complex Bucket Aggregations

```graphql
query {
  delivery_zones {
    id
    zone_name
    boundary
    _spatial(field: "boundary", type: CONTAINS) {
      orders_bucket_aggregation(
        field: "delivery_location"
        order_by: [
          { field: "aggregations.total.sum", direction: DESC }
        ]
      ) {
        key {
          status
          created_at(bucket: day)
        }
        aggregations {
          _rows_count
          total {
            sum
            avg
          }
        }
      }
    }
  }
}
```

## Using Spatial in Aggregation Queries

### Spatial in Single Row Aggregation

```graphql
query {
  cities_aggregation {
    _rows_count
    population { sum }
    # Aggregate spatially related POIs
    _spatial(field: "boundary", type: CONTAINS) {
      points_of_interest_aggregation(field: "location") {
        _rows_count
      }
    }
  }
}
```

### Spatial in Bucket Aggregation

```graphql
query {
  cities_bucket_aggregation {
    key {
      country
      state
    }
    aggregations {
      _rows_count
      population { sum avg }
      # Spatial aggregation per group
      _spatial(field: "boundary", type: CONTAINS) {
        businesses_aggregation(field: "location") {
          _rows_count
        }
        businesses_bucket_aggregation(field: "location") {
          key {
            business_type
          }
          aggregations {
            _rows_count
          }
        }
      }
    }
  }
}
```

### Using _spatial in Grouping Keys

You can use `_spatial` in bucket aggregation keys to group by fields from spatially related data:

```graphql
query {
  stores_bucket_aggregation {
    key {
      # Group by region from spatially related cities
      _spatial(field: "location", type: WITHIN) {
        cities(field: "boundary") {
          region
          name
        }
      }
    }
    aggregations {
      _rows_count
      revenue { sum avg }
    }
  }
}
```

This groups stores by the city region they are located in, using spatial containment.

**Practical example** - Orders by delivery zone:

```graphql
query {
  orders_bucket_aggregation {
    key {
      status
      # Group by delivery zone using spatial relationship
      delivery_zone: _spatial(field: "delivery_location", type: WITHIN) {
        zones(field: "boundary") {
          zone_id
          zone_name
          priority_level
        }
      }
    }
    aggregations {
      _rows_count
      total { sum avg }
      delivery_time { avg }
    }
  }
}
```

This creates grouping by order status and delivery zone, enabling analysis like "average delivery time by zone and status".

**Multi-dimensional spatial grouping**:

```graphql
query {
  events_bucket_aggregation {
    key {
      event_type
      # Spatial grouping by neighborhood
      neighborhood: _spatial(field: "location", type: WITHIN) {
        neighborhoods(field: "boundary") {
          name
          district
        }
      }
      # Spatial grouping by service area
      service_area: _spatial(field: "location", type: WITHIN) {
        service_areas(field: "coverage") {
          area_code
          service_level
        }
      }
    }
    aggregations {
      _rows_count
      participants { sum avg }
    }
  }
}
```

This enables complex spatial analysis grouping events by type, neighborhood district, and service area.

## Combining Spatial with Dynamic Joins

Use both `_spatial` and `_join`:

```graphql
query {
  stores {
    id
    name
    location
    # Spatial: nearby customers
    _spatial(field: "location", type: DWITHIN, buffer: 5000) {
      customers(field: "address_location") {
        id
        name
        # Dynamic join: get their orders
        _join(fields: ["id"]) {
          orders(fields: ["customer_id"]) {
            id
            total
          }
        }
      }
    }
  }
}
```

## Multi-Level Spatial Queries

### Nested Spatial Relationships

```graphql
query {
  countries {
    id
    name
    boundary
    # Cities in country
    _spatial(field: "boundary", type: CONTAINS) {
      cities(field: "boundary") {
        id
        name
        # Buildings in each city
        _spatial(field: "boundary", type: CONTAINS) {
          buildings(field: "footprint") {
            id
            address
          }
        }
      }
    }
  }
}
```

## Distance Calculations

Some databases provide distance in results:

```graphql
query {
  my_location {
    location
    _spatial(field: "location", type: DWITHIN, buffer: 10000) {
      stores(
        field: "location"
        nested_order_by: [{ field: "_distance", direction: ASC }]
      ) {
        id
        name
        _distance  # Distance in meters (if supported)
      }
    }
  }
}
```

## Geometry Transformations

Query with geometry transformations:

```graphql
query {
  points {
    id
    location
    # Buffer the point and find intersecting polygons
    location(transform: Buffer, buffer_distance: 1000)
    _spatial(
      field: "location"
      type: INTERSECTS
    ) {
      zones(field: "boundary") {
        id
        zone_name
      }
    }
  }
}
```

## Performance Considerations

### 1. Use Spatial Indexes

Ensure spatial indexes exist on geometry columns:

```sql
-- PostgreSQL/PostGIS example
CREATE INDEX idx_stores_location ON stores USING GIST(location);
CREATE INDEX idx_customers_location ON customers USING GIST(address_location);
```

### 2. Limit Results

Always limit spatial query results:

```graphql
# Good
query {
  cities {
    id
    _spatial(field: "boundary", type: CONTAINS) {
      buildings(
        field: "footprint"
        limit: 1000
      ) {
        id
      }
    }
  }
}

# Avoid - May return millions of features
query {
  cities {
    id
    _spatial(field: "boundary", type: CONTAINS) {
      buildings(field: "footprint") {
        id
      }
    }
  }
}
```

### 3. Filter Before Spatial Operations

```graphql
# Better - Filter first
query {
  cities(filter: { population: { gte: 100000 } }) {
    id
    _spatial(field: "boundary", type: CONTAINS) {
      buildings(field: "footprint") {
        id
      }
    }
  }
}
```

### 4. Use Appropriate CRS/SRID

Ensure consistent spatial reference systems:

```graphql
# Define in schema
type locations @table(name: "locations") {
  id: Int! @pk
  name: String!
  geom: Geometry @geometry_info(type: POINT, srid: 4326)
}
```

### 5. Use Aggregations for Large Datasets

```graphql
# Better - Aggregate instead of fetching all
query {
  cities {
    id
    _spatial(field: "boundary", type: CONTAINS) {
      buildings_aggregation(field: "footprint") {
        _rows_count
      }
    }
  }
}
```

### 6. Optimize Buffer Distances

Use appropriate buffer sizes:

```graphql
# Good - Reasonable buffer
_spatial(field: "location", type: DWITHIN, buffer: 5000)  # 5km

# Avoid - Excessive buffer
_spatial(field: "location", type: DWITHIN, buffer: 1000000)  # 1000km
```

## Common Patterns

### Find Nearest Features

```graphql
query FindNearest($lat: Float!, $lon: Float!) {
  # Create a point query
  points: spatial_query(
    geometry: { type: "Point", coordinates: [$lon, $lat] }
  ) {
    _spatial(field: "geometry", type: DWITHIN, buffer: 50000) {
      stores(
        field: "location"
        nested_order_by: [{ field: "_distance", direction: ASC }]
        nested_limit: 5
      ) {
        id
        name
        _distance
      }
    }
  }
}
```

### Service Area Analysis

```graphql
query ServiceCoverage {
  service_providers {
    id
    name
    service_area
    _spatial(field: "service_area", type: CONTAINS) {
      # Count covered population
      census_blocks_aggregation(field: "boundary") {
        _rows_count
        population { sum }
      }
      # Breakdown by demographics
      census_blocks_bucket_aggregation(field: "boundary") {
        key {
          demographic_category
        }
        aggregations {
          population { sum }
        }
      }
    }
  }
}
```

### Spatial Join for Enrichment

```graphql
query EnrichAddresses {
  addresses {
    id
    street_address
    location
    # Find containing zone
    _spatial(field: "location", type: WITHIN) {
      administrative_zones(field: "boundary", limit: 1) {
        zone_code
        zone_name
        jurisdiction
      }
    }
    # Find nearby amenities
    _spatial(field: "location", type: DWITHIN, buffer: 500) {
      amenities(
        field: "location"
        filter: {
          amenity_type: { in: ["school", "hospital", "park"] }
        }
      ) {
        amenity_type
        name
      }
    }
  }
}
```

### H3 Hexagonal Clustering

For spatial clustering and aggregation, Hugr supports the **H3 hexagonal grid system**. H3 divides geographic areas into hexagonal cells at different resolutions, enabling powerful spatial analysis and visualization.

See [H3 Hexagonal Clustering](./10-h3-clustering.md) for detailed documentation on:
- H3 resolution levels and use cases
- Spatial aggregation with `h3()` query
- Value distribution with `distribution_by` and `distribution_by_bucket`
- Multi-source data integration
- Performance optimization
- Real-world examples (heatmaps, coverage analysis, ML features)

## Error Handling

Spatial query errors are categorized into two types:

### Planning Errors (SQL Generation)

Validation errors caught during query planning, with specific error paths:

**Invalid field names:**
```graphql
query {
  parcels {
    id
    _spatial(field: "non_existent_field", type: INTERSECTS) {
      roads(field: "geometry") {
        id
      }
    }
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Field 'non_existent_field' does not exist in type 'parcels'",
      "path": ["parcels", "_spatial"]
    }
  ]
}
```

**Invalid field types:**
```graphql
query {
  parcels {
    id
    _spatial(field: "name", type: INTERSECTS) {  # 'name' is String, not Geometry
      roads(field: "geometry") {
        id
      }
    }
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Field 'name' is not a Geometry type",
      "path": ["parcels", "_spatial"]
    }
  ]
}
```

### SQL Execution Errors

Runtime errors during SQL execution, reported at query level:

**Invalid geometry:**
```graphql
query {
  parcels {
    id
    invalid_boundary  # Self-intersecting polygon
    _spatial(field: "invalid_boundary", type: INTERSECTS) {
      roads(field: "geometry") {
        id
      }
    }
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "Invalid geometry: self-intersection"
    }
  ]
}
```

**SRID mismatch:**
```graphql
query {
  parcels {
    _spatial(field: "location_4326", type: INTERSECTS) {
      zones(field: "boundary_3857") {  # Different SRID!
        id
      }
    }
  }
}
```

Response:
```json
{
  "data": null,
  "errors": [
    {
      "message": "SRID mismatch: 4326 vs 3857"
    }
  ]
}
```

**Solutions:**
- **Planning errors** - Fix field names and ensure fields are Geometry type
- **Execution errors** - Validate geometries and ensure matching SRIDs using `transforms` argument

## Next Steps

- Review [Aggregations](./7-aggregations.md) for detailed aggregation patterns
- See [Dynamic Joins](./8-dynamic-joins.md) for combining spatial with dynamic joins
- Check [Schema Definition - Data Objects](/docs/engine-configuration/schema-definition/data-objects/overview) for geometry field configuration
