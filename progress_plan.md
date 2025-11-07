# Hugr Documentation Improvement Plan

> This document contains the plan for improving the hugr project documentation. For each section, files to be created or updated are specified along with detailed prompts for implementation.

---

## 📋 Completion Status

- [ ] New Sections
  - [x] JQ Transformations ✅ **COMPLETED** (2025-11-07)
  - [x] GraphQL Extensions ✅ **COMPLETED** (2025-11-07)
  - [ ] Python Client (hugr-client)
  - [ ] Hugr IPC Protocol
  - [x] REST API endpoint /jq-query ✅ **COMPLETED** (2025-11-07)
- [ ] Enhancement of Existing Sections
  - [x] Update Overview ✅ **COMPLETED** (2025-11-07)
  - [ ] Cache Directives Documentation (@cache, @no_cache, @invalidate_cache)
  - [ ] Update examples
  - [ ] Expand reference sections
- [ ] New Examples
  - [ ] JQ transformation examples
  - [ ] Python client examples

---

## 🆕 New Documentation Sections

### 1. JQ Transformations in GraphQL Queries

**File:** `docs/5-graphql/4-jq-transformations.md`

**Status:** ✅ **COMPLETED** (2025-11-06)

**Description:** Documentation on using JQ transformations to transform GraphQL query results on the server side.

**Implementation Prompt:**

```
Create comprehensive documentation for JQ transformations in the hugr GraphQL API.

CONTEXT:
Hugr supports JQ transformations of GraphQL query results on the server in two ways:

1. Built-in GraphQL jq() query:
   - Definition: type Query @system { jq(query: String!, include_origin: Boolean = false): Query @system }
   - Transformation results are returned in the extensions section of the response
   - JQ receives the object from the data field of the GraphQL result
   - Hierarchical transformations can be performed using a chain of jq operations

2. REST endpoint /jq-query:
   - POST request to /jq-query
   - Request body format: {jq: string, query: {query: string, variables: object, operationName: string}}
   - JQ receives the complete GraphQL response including data, extensions, and errors fields
   - Transformation result is returned directly as HTTP response

JQ FEATURES in hugr:
1. Access to GraphQL query variables inside JQ: use $var_name where var_name is the variable name from the GraphQL query
2. Special queryHugr() function available ONLY inside JQ expressions to execute GraphQL queries:
   - IMPORTANT: queryHugr() is NOT a standalone GraphQL function, it's a special JQ function
   - queryHugr(graphql_query_text) - one argument with query text
   - queryHugr(graphql_query_text, variables_object) - two arguments: query and variables
   - Allows data enrichment and cross-source aggregation within JQ transformations

DOCUMENT STRUCTURE:
1. Overview
   - What are JQ transformations in hugr
   - Why they are needed
   - Benefits of server-side transformations

2. Built-in GraphQL jq() Query
   - Syntax and parameters
   - Basic transformation examples
   - Working with include_origin
   - Where results are located (extensions)
   - Hierarchical transformations

3. REST endpoint /jq-query
   - Request format
   - Response format
   - curl usage examples
   - Differences from built-in jq()

4. Working with Variables
   - How to pass variables in GraphQL
   - How to use them in JQ ($var_name)
   - Examples

5. queryHugr() Function (JQ-only)
   - IMPORTANT: This is a special function available ONLY inside JQ expressions
   - Description and syntax
   - Examples of nested query execution within JQ
   - Using with variables
   - Use cases (data enrichment, aggregation from different sources)
   - How it differs from regular GraphQL queries

6. Practical Examples
   - Filtering and transforming arrays
   - Grouping and aggregation
   - Modifying response structure
   - Combining data from multiple queries via queryHugr
   - Conditional logic

7. Best Practices
   - When to use jq() vs /jq-query
   - Performance considerations
   - Debugging JQ expressions
   - Error handling

8. See Also
   - Links to official JQ documentation
   - Examples in the examples section
   - GraphQL queries documentation

FORMAT:
- Markdown with GitHub Flavored Markdown syntax
- Use code blocks with language specification (graphql, json, bash, jq)
- Add frontmatter with title, sidebar_position: 4
- Examples should be complete and working
- Include example requests and expected responses
```

**Information Sources:**
- User-provided information about JQ API
- Official JQ documentation: https://jqlang.github.io/jq/
- Existing examples in docs/4-engine-configuration/1-data-sources/4-http.md (lines 255-257, OAuth customization)

---

### 2. Python Client (hugr-client)

**File:** `docs/6-querying/4-python-client.md`

**Status:** ❌ Not created

**Description:** Documentation on using the hugr-client Python library to work with the hugr API.

**Implementation Prompt:**

```
Create comprehensive documentation for the hugr-client Python library.

CONTEXT:
hugr-client is a Python library for working with the hugr GraphQL API and Hugr IPC protocol.

KEY INFORMATION:
- Repository: https://github.com/hugr-lab/hugr-client
- Installation: pip install hugr-client
- Arrow IPC protocol support for efficient data transfer
- Returns results as pandas.DataFrame and geopandas.GeoDataFrame
- Integration with ML and analytics pipelines

DOCUMENT STRUCTURE:
1. Overview
   - What is hugr-client
   - Why it's needed
   - Key features

2. Installation
   - Installation via pip
   - Dependencies
   - Python version requirements

3. Quick Start
   - Connecting to hugr server
   - Simple query
   - Getting data as DataFrame

4. Core Features
   - Executing GraphQL queries
   - Working with variables
   - Getting results in different formats:
     * JSON
     * pandas.DataFrame
     * geopandas.GeoDataFrame
   - Working with Hugr IPC protocol

5. Working with Geospatial Data
   - Querying spatial data
   - Converting to GeoDataFrame
   - Visualization examples

6. ML Pipeline Integration
   - Loading data for model training
   - Examples with scikit-learn
   - Examples with pandas

7. Performance and Optimization
   - Arrow IPC vs JSON
   - Batch requests
   - Caching

8. Authentication
   - Bearer tokens
   - OAuth2
   - Configuration examples

9. Code Examples
   - Complete working examples
   - Jupyter notebook integration
   - Working with large datasets

10. API Reference
    - Main classes and methods
    - Configuration parameters

11. Troubleshooting
    - Common errors
    - Debugging

12. See Also
    - Hugr IPC protocol
    - GraphQL API documentation
    - Examples

SOURCES:
- Study README and examples in repository https://github.com/hugr-lab/hugr-client
- Study client code to understand the API
- Hugr IPC specification: https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md

FORMAT:
- Markdown with GitHub Flavored Markdown syntax
- Use code blocks with python language
- Add frontmatter with title, sidebar_position: 4
- Examples should be complete and runnable
- Include installation and environment setup examples
```

**Information Sources:**
- Repository https://github.com/hugr-lab/hugr-client
- docs/1-overview.md (lines 220-221) - client mention
- Hugr IPC specification: https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md

**Note:** Need access to hugr-client repository to get up-to-date API information.

---

### 3. Hugr IPC Protocol (Enhancement)

**File:** `docs/6-querying/3-hugr-ipc.md`

**Status:** ⚠️ Exists but nearly empty (only header)

**Description:** Documentation for the Hugr multipart IPC protocol for efficient data transfer.

**Implementation Prompt:**

```
Enhance the documentation for the Hugr IPC protocol.

CONTEXT:
Hugr IPC is a custom HTTP Multipart protocol for efficient transfer of large data volumes between the hugr server and clients, especially for analytics and ML pipelines.

KEY INFORMATION:
- Uses HTTP Multipart for streaming large datasets
- Apache Arrow format support
- Python-compatible output (pandas.DataFrame, geopandas.GeoDataFrame)
- Integration with analytics and ML pipelines
- Specification: https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md

DOCUMENT STRUCTURE:
1. Overview
   - What is Hugr IPC
   - Why a separate protocol is needed
   - Advantages over JSON GraphQL API
   - When to use it

2. Protocol Architecture
   - HTTP Multipart format
   - Apache Arrow data format
   - Request structure
   - Response structure

3. Request Format
   - HTTP method and headers
   - Content-Type
   - Multipart boundaries
   - Request body

4. Response Format
   - Multipart response structure
   - Arrow IPC stream format
   - Metadata
   - Data schema

5. Data Types
   - Mapping GraphQL types to Arrow types
   - Geometry support (GeoJSON, WKB)
   - Nullable vs Non-nullable
   - Lists and nested structures

6. Using with Clients
   - Python client (hugr-client)
   - Other Arrow-compatible clients
   - Direct HTTP requests

7. Examples
   - curl requests
   - Python examples
   - Streaming data processing

8. Performance
   - Comparison with JSON
   - Benchmark results
   - Best practices for large datasets

9. Limitations and Known Issues

10. See Also
    - Protocol specification
    - Python client documentation
    - Apache Arrow documentation

SOURCES:
- Read and extract information from https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md
- docs/1-overview.md (lines 211-221) - protocol description

FORMAT:
- Markdown with GitHub Flavored Markdown syntax
- Request/response format diagrams
- Code blocks for examples (bash, python, json)
- Add frontmatter with title, sidebar_position: 3
```

**Information Sources:**
- Specification: https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md
- docs/1-overview.md (lines 211-221)
- query-engine repository

---

### 4. REST API Endpoint /jq-query

**File:** `docs/6-querying/5-jq-endpoint.md`

**Status:** ✅ **COMPLETED** (2025-11-07)

**Description:** Documentation for the REST endpoint /jq-query for executing GraphQL queries with JQ transformation.

**Implementation Prompt:**

```
Create documentation for the REST endpoint /jq-query.

CONTEXT:
Hugr provides a special REST endpoint /jq-query for executing GraphQL queries with subsequent JQ transformation of the result.

KEY INFORMATION:
- Endpoint: POST /jq-query
- Request format (Go struct):
  type JQRequest struct {
    JQ    string        `json:"jq"`      // JQ expression for transformation
    Query types.Request `json:"query"`   // GraphQL query
  }

  type Request struct {
    Query         string                 `json:"query"`
    Variables     map[string]interface{} `json:"variables"`
    OperationName string                 `json:"operationName,omitempty"`
  }

- JQ receives the complete GraphQL response (including data, extensions, errors)
- JQ transformation result is returned as HTTP response

DIFFERENCES from built-in jq() query:
- /jq-query: JQ receives entire GraphQL response (data + extensions + errors)
- jq(): JQ receives only data, result in extensions

DOCUMENT STRUCTURE:
1. Overview
   - Endpoint description
   - Use cases
   - Differences from built-in jq()

2. Request Format
   - HTTP method and headers
   - Content-Type: application/json
   - JSON body structure
   - Parameters

3. Response Format
   - Success response
   - Error handling
   - HTTP status codes

4. Usage Examples
   - curl requests
   - Simple transformations
   - Complex transformations
   - Working with GraphQL errors

5. Authentication
   - Bearer tokens
   - Headers

6. Variable Access
   - Using $var_name from GraphQL variables in JQ expressions

7. Using queryHugr() inside JQ
   - IMPORTANT: queryHugr() is available only inside JQ expressions
   - Executing nested GraphQL queries from within JQ transformation
   - Examples with single and multiple queries
   - Data enrichment use cases

8. Best Practices
   - When to use /jq-query vs built-in jq()
   - Optimization
   - Error handling

9. See Also
   - JQ transformations documentation
   - GraphQL API
   - Examples

FORMAT:
- Markdown
- Code blocks: bash, json, jq
- Frontmatter with title, sidebar_position: 5
- Complete working examples with curl
```

**Information Sources:**
- User-provided information about request structure
- Existing JQ documentation

---

## 🔄 Enhancement of Existing Sections

### 5. Update Function Calls Section - Add JQ Information for HTTP Functions

**File:** `docs/5-graphql/1-queries/1-function-calls.md`

**Status:** ⚠️ Needs enhancement

**Description:** Add information about the `jq` parameter in HTTP functions for API response transformation.

**Enhancement Prompt:**

```
Enhance the "HTTP Function Parameters" section in docs/5-graphql/1-queries/1-function-calls.md with information about the jq parameter.

CONTEXT:
In the http_data_source_request_scalar() function, the last parameter is a jq expression for transforming HTTP API responses.

UPDATE:
In the "HTTP Function Parameters" section (line 246), update the jq parameter description:

jq - JQ expression for transforming HTTP API response. Applied to JSON response from API before returning result. Allows:
  - Extracting needed fields from complex JSON structures
  - Transforming data format
  - Filtering arrays
  - Computing aggregates

Examples:
1. Extracting array from nested structure: '.data.items'
2. Filtering: '.items[] | select(.active == true)'
3. Transforming structure: '.items[] | {id: .id, name: .name}'

ADD new subsection after "HTTP Function Parameters":

## JQ Transformation in HTTP Functions

HTTP functions support JQ transformations on API responses using the last parameter of http_data_source_request_scalar().

### Basic Transformation

[Examples with code and explanation]

### Advanced Use Cases

[Examples of complex transformations]

FORMAT:
- Maintain existing document style
- Add concrete examples with code
```

**Information Sources:**
- docs/5-graphql/1-queries/1-function-calls.md (lines 246-258)
- docs/4-engine-configuration/1-data-sources/4-http.md (jq usage examples)

---

### 6. Update HTTP Data Source Section

**File:** `docs/4-engine-configuration/1-data-sources/4-http.md`

**Status:** ⚠️ Needs enhancement

**Description:** Expand the section on JQ transformations in HTTP functions.

**Enhancement Prompt:**

```
Enhance docs/4-engine-configuration/1-data-sources/4-http.md with a section on JQ transformations.

CONTEXT:
HTTP data sources in hugr support JQ transformations for processing REST API responses.

ADD new section before "Add Function Views" (line 268):

## JQ Transformations in HTTP Responses

Hugr supports JQ transformations for processing HTTP API responses directly in function definitions.

[Detailed description with examples]

INCLUDE:
1. How to use JQ in http_data_source_request_scalar()
2. Transformation examples:
   - Extracting data from nested structures
   - Renaming fields
   - Filtering arrays
   - Data type conversion
3. Practical examples based on existing device examples in the document

FORMAT:
- Maintain existing style
- Use GraphQL code blocks
- Add API response examples before and after transformation
```

**Information Sources:**
- docs/4-engine-configuration/1-data-sources/4-http.md (lines 276-358 contain examples with jq)

---

### 7. Update Overview with JQ Information

**File:** `docs/1-overview.md`

**Status:** ✅ **COMPLETED** (2025-11-07)

**Description:** Add JQ transformations to the "Advanced Features" section.

**Enhancement Prompt:**

```
Enhance the "Advanced Features - Result Transformation" section in docs/1-overview.md.

CURRENT TEXT (lines 93-97):
**Result Transformation**:

- Server-side jq transformations
- Customize JSON output formats per client requirements
- Aggregate, flatten, or nest results as needed

EXPAND TO:

**Result Transformation**:

- Server-side JQ transformations for flexible data processing
- Two transformation methods:
  - Built-in jq() GraphQL query for inline transformations
  - REST endpoint /jq-query for complex processing pipelines
- Access GraphQL variables in JQ expressions
- Execute nested GraphQL queries from within JQ using special queryHugr() function
- Customize JSON output formats per client requirements
- Aggregate, flatten, or nest results as needed
- Transform HTTP API responses in data source functions

FORMAT:
- Maintain existing style and formatting
```

**Information Sources:**
- docs/1-overview.md (lines 93-97)
- User-provided information about JQ API

---

### 8. Cache Directives Documentation

**File:** `docs/4-engine-configuration/6-cache.md`

**Status:** ⚠️ Nearly empty (only header)

**Description:** Comprehensive documentation for cache-related GraphQL directives: @cache, @no_cache, and @invalidate_cache.

**Implementation Prompt:**

```
Create comprehensive documentation for cache directives in hugr.

CONTEXT:
Hugr provides three cache-related directives to control query result caching:
- @cache - enables caching for fields or objects
- @no_cache - disables caching for specific queries
- @invalidate_cache - invalidates cache for specific queries

These directives work with hugr's two-level caching system (L1 in-memory and L2 distributed).

DOCUMENT STRUCTURE:

1. Overview
   - What are cache directives
   - When to use them
   - How they integrate with L1/L2 cache system
   - Benefits of directive-based caching

2. @cache Directive
   - Syntax and parameters (ttl, key, tags)
   - Usage in schema definitions (automatic caching)
   - Usage at query time (manual caching)
   - Cache key generation
   - TTL (time-to-live) configuration
   - Cache tags for invalidation

3. @no_cache Directive
   - Syntax
   - When to use
   - Examples of bypassing cache
   - Use cases (real-time data, user-specific data)

4. @invalidate_cache Directive
   - Syntax
   - How it works
   - Use cases (data mutations, forced refresh)
   - Examples

5. Schema-level Caching
   - Applying @cache to object types
   - Automatic cache invalidation on mutations
   - Tags-based invalidation
   - Examples with CRUD operations

6. Query-time Caching
   - Applying @cache to specific queries
   - Custom cache keys
   - Dynamic TTL
   - Combining with filters and variables

7. Cache Key Generation
   - Automatic key generation (hash of query + variables + role)
   - Custom keys with key parameter
   - Role-based cache isolation
   - Best practices for key naming

8. Cache Tags and Invalidation
   - Using tags for grouped invalidation
   - Automatic invalidation on mutations
   - Manual invalidation with @invalidate_cache
   - Tag naming conventions

9. Practical Examples
   - Example 1: Cache static reference data
   - Example 2: Cache expensive aggregations
   - Example 3: Per-user cache isolation
   - Example 4: Invalidate cache on data change
   - Example 5: Mixed caching strategies
   - Example 6: Cache with @cache in queryHugr()
   - Example 7: Bypass cache for real-time data

10. Integration with Caching Infrastructure
    - How directives interact with L1/L2 cache
    - Cache configuration requirements
    - Link to deployment caching configuration

11. Best Practices
    - When to use schema-level vs query-time caching
    - Choosing appropriate TTL values
    - Tag organization strategies
    - Cache key design
    - Avoiding cache stampede
    - Memory considerations

12. Performance Considerations
    - Cache hit ratio optimization
    - Impact on query performance
    - Cache warming strategies
    - Monitoring cache effectiveness

13. Common Patterns
    - Caching read-heavy queries
    - Cache-aside pattern
    - Write-through caching
    - Time-based invalidation
    - Event-based invalidation

14. Troubleshooting
    - Cache not working
    - Stale data issues
    - Cache key collisions
    - Memory pressure

15. See Also
    - Link to Caching Configuration (deployment)
    - Link to Directives Reference
    - Link to JQ Transformations (@cache in queryHugr)

FORMAT:
- Markdown with GitHub Flavored Markdown syntax
- Use code blocks with graphql language
- Add frontmatter with title: "Cache", sidebar_position: 7
- Examples should be complete and working
- Include both schema definitions and query examples
```

**Information Sources:**
- docs/8-references/1-directives.md (lines 1506-1583) - @cache, @no_cache, @invalidate_cache reference
- docs/7-deployment/2-caching.md - L1/L2 cache infrastructure
- docs/5-graphql/4-jq-transformations.md - @cache usage in queryHugr()

---

## 📚 New Examples

### 9. Example: JQ Transformations

**File:** `docs/9-examples/jq-transformations.mdx`

**Status:** ❌ Not created

**Description:** Practical examples of using JQ transformations in various scenarios.

**Implementation Prompt:**

```
Create a document with practical examples of using JQ transformations in hugr.

STRUCTURE:
1. Introduction
   - Brief description of examples

2. Example 1: Filtering and Transforming Data
   - Source GraphQL query
   - JQ transformation
   - Result

3. Example 2: Aggregating Data from Different Sources
   - Using queryHugr() function inside JQ
   - Combining results from multiple queries within a single JQ transformation

4. Example 3: Changing Response Structure for Client
   - Nested to flat structure
   - Flat to nested structure

5. Example 4: Conditional Logic
   - Select and conditional expressions
   - Working with nullable values

6. Example 5: Using /jq-query Endpoint
   - curl example
   - Error handling

7. Example 6: Working with Variables
   - Passing GraphQL variables
   - Using in JQ

8. Example 7: Complex Transformation for BI Dashboard
   - Real-world use case
   - Multi-step processing

FORMAT:
- MDX format for interactivity
- Use tabs for different languages/formats
- Include links to documentation
- Each example should be complete and runnable
```

---

### 9. Example: Python Client Usage

**File:** `docs/9-examples/python-client-usage.mdx`

**Status:** ❌ Not created

**Description:** Practical examples of using hugr-client in various scenarios.

**Implementation Prompt:**

```
Create a document with practical examples of using the hugr-client Python library.

STRUCTURE:
1. Setup and Installation
   - pip install
   - Connection configuration

2. Example 1: Simple Data Query
   - Executing GraphQL query
   - Getting DataFrame

3. Example 2: Working with Geospatial Data
   - Querying spatial data
   - Getting GeoDataFrame
   - Map visualization

4. Example 3: ML Pipeline
   - Loading data for training
   - Feature engineering with pandas
   - Training sklearn model

5. Example 4: Batch Operations
   - Multiple queries
   - Pagination
   - Processing large datasets

6. Example 5: Jupyter Notebook Integration
   - Interactive analysis
   - Visualization
   - Exporting results

7. Example 6: Authentication
   - OAuth2
   - Bearer tokens

8. Example 7: Performance Optimization
   - Arrow IPC vs JSON
   - Caching
   - Parallel requests

FORMAT:
- MDX with interactive elements
- Python code blocks
- Include execution output where appropriate
- Jupyter notebook snippets
```

**Information Sources:**
- Repository https://github.com/hugr-lab/hugr-client
- Examples from client repository

---

## 📖 Reference Sections

### 10. Complete Directives Reference

**File:** `docs/8-references/1-directives.md`

**Status:** ⚠️ Needs completeness check

**Description:** Verify that all directives are documented.

**Verification Prompt:**

```
Verify that all hugr directives are documented in docs/8-references/1-directives.md.

SOURCES FOR VERIFICATION:
- Study code in https://github.com/hugr-lab/query-engine
- Search for all directive uses in existing docs
- Grep for pattern @[a-z_]+ in examples

ADD if missing:
- @system - system types and fields
- @jq - if such directive exists
- Any other undocumented directives

FORMAT:
- Alphabetical order
- For each directive: name, description, parameters, usage examples
- Links to sections with detailed descriptions
```

---

### 11. API Reference - GraphQL Operations

**File:** `docs/8-references/2-graphql-operations.md`

**Status:** ❌ Not created

**Description:** Reference guide for all available GraphQL operations in hugr.

**Implementation Prompt:**

```
Create a reference document for all GraphQL operations in hugr.

STRUCTURE:
1. System Queries
   - jq()
   - Other system queries

2. Core Queries
   - Working with data sources
   - Working with catalogs
   - Working with roles

3. Function Queries
   - http_data_source_request_scalar()
   - Other built-in functions

4. Special JQ Functions
   - queryHugr() - available ONLY inside JQ expressions (not a GraphQL function)

5. Mutations
   - CRUD operations
   - System mutations

6. Types
   - System types
   - Data types

FORMAT:
- Reference style (like API documentation)
- For each operation: signature, parameters, return type, examples
- Alphabetical order within sections
```

---

## 🔗 Update Cross-References

### 12. Update Links Between Documents

**Files:** All documents in docs/

**Status:** ⚠️ After creating new sections

**Prompt:**

```
After creating new documentation sections, update cross-references:

1. Add links to JQ documentation:
   - From docs/5-graphql/1-queries/1-function-calls.md
   - From docs/4-engine-configuration/1-data-sources/4-http.md
   - From docs/1-overview.md

2. Add links to Python client:
   - From docs/6-querying/3-hugr-ipc.md
   - From docs/1-overview.md
   - From docs/3-get-started.md (add Python section)

3. Update navigation (sidebar):
   - Check sidebar_position in all new files
   - Ensure numbering is sequential

4. Add "See also" sections where appropriate

FORMAT:
- Relative links format [Text](../path/to/doc.md)
- Anchors for sections within documents
```

---

## 📝 Additional Tasks

### 13. Update Getting Started

**File:** `docs/3-get-started.md`

**Status:** ⚠️ Needs enhancement

**Description:** Add information about Python client and JQ to quick start.

**Prompt:**

```
Enhance docs/3-get-started.md with sections:

1. Python Quick Start
   - Installing hugr-client
   - First query from Python
   - Getting DataFrame

2. Using JQ Transformations
   - Simple JQ transformation example
   - When it's useful

FORMAT:
- Brief examples (this is getting started)
- Links to detailed documentation
- Maintain existing document style
```

---

### 14. Create Troubleshooting Guide

**File:** `docs/10-troubleshooting/index.md`

**Status:** ❌ Not created

**Description:** Guide for solving common problems.

**Prompt:**

```
Create a troubleshooting guide for hugr.

STRUCTURE:
1. Installation Issues
2. Connection Issues
3. GraphQL Query Errors
4. JQ Transformation Errors
5. Performance Issues
6. Authentication Issues
7. Data Source Configuration Issues
8. Python Client Issues

For each problem:
- Description of symptoms
- Possible causes
- Solution
- Examples

FORMAT:
- Q&A style
- Code examples where needed
- Links to corresponding documentation sections
```

---

## 🎯 Implementation Priorities

### High Priority (do first):
1. ✅ **JQ Transformations** (docs/5-graphql/4-jq-transformations.md) - main missing functionality
2. ✅ **REST endpoint /jq-query** (docs/6-querying/5-jq-endpoint.md) - part of JQ functionality
3. ✅ **Update Overview** - add JQ to advanced features
4. **Cache Directives Documentation** (docs/4-engine-configuration/6-cache.md) - @cache, @no_cache, @invalidate_cache directives

### Medium Priority:
5. **Python Client** (docs/6-querying/4-python-client.md) - important for users
6. **Hugr IPC Protocol** (enhance docs/6-querying/3-hugr-ipc.md)
7. **Update Function Calls** - add JQ information
8. **Update HTTP Data Source** - expand JQ section

### Low Priority (can be done later):
9. JQ transformation examples
10. Python client examples
11. API Reference
12. Troubleshooting guide
13. Update Getting Started

---

## 📂 New Files Structure

```
docs/
├── 5-graphql/
│   ├── 4-jq-transformations.md          [NEW]
│   └── 1-queries/
│       └── 1-function-calls.md          [UPDATE]
├── 6-querying/
│   ├── 3-hugr-ipc.md                    [ENHANCE]
│   ├── 4-python-client.md               [NEW]
│   └── 5-jq-endpoint.md                 [NEW]
├── 4-engine-configuration/
│   ├── 6-cache.md                       [ENHANCE]
│   └── 1-data-sources/
│       └── 4-http.md                    [UPDATE]
├── 8-references/
│   ├── 1-directives.md                  [CHECK]
│   └── 2-graphql-operations.md          [NEW]
├── 9-examples/
│   ├── jq-transformations.mdx           [NEW]
│   └── python-client-usage.mdx          [NEW]
├── 10-troubleshooting/
│   └── index.md                         [NEW]
├── 1-overview.md                        [UPDATE]
└── 3-get-started.md                     [UPDATE]
```

---

## 🔍 Information Sources

### Hugr Repositories:
- **Query Engine**: https://github.com/hugr-lab/query-engine
  - Hugr IPC specification: hugr-ipc.md
  - Source code for understanding directives and API

- **Hugr Server**: https://github.com/hugr-lab/hugr
  - cmd/server - server
  - cmd/management - management node

- **Python Client**: https://github.com/hugr-lab/hugr-client
  - README and examples
  - API documentation

- **Docker Images**: https://github.com/hugr-lab/docker
  - K8s charts
  - Deployment examples

### External Sources:
- **JQ Documentation**: https://jqlang.github.io/jq/
- **Apache Arrow**: https://arrow.apache.org/
- **GraphQL**: https://graphql.org/
- **DuckDB**: https://duckdb.org/

### Current Documentation:
- All files in docs/ for understanding style and structure
- Existing examples for consistency

---

## ✅ Checklist Before Completion

After creating/updating each document, check:

- [ ] Frontmatter is correct (title, sidebar_position, keywords, description)
- [ ] All code blocks have language specification
- [ ] Examples are complete and runnable
- [ ] Links to related sections exist
- [ ] "See also" sections added
- [ ] Spelling checked
- [ ] Style matches rest of documentation
- [ ] All technical terms used consistently
- [ ] Examples added for all main concepts

---

## 📞 Questions for Clarification

1. **Python Client**:
   - Need access to hugr-client repository for up-to-date API information
   - Are there examples in the client repository?
   - Which Python versions are supported?

2. **JQ Functionality**:
   - Are there limitations on JQ expression complexity?
   - Is there a timeout for JQ transformations?
   - Which JQ functions are supported (all standard or subset)?
   - queryHugr() - confirmed as JQ-only function (not a GraphQL query)
   - Are there other special functions available inside JQ?

3. **Hugr IPC**:
   - Is the specification in query-engine/hugr-ipc.md up to date?
   - Are there changes not reflected in the specification?

4. **Examples**:
   - Are there preferences for use cases in examples?
   - Are there real projects using hugr that can be used as examples?

5. **Other Sections**:
   - Is CLI tools documentation needed?
   - Is documentation on migrations and versioning needed?
   - Is extension development documentation needed?

---

## 💡 Next Steps

1. Get answers to questions above
2. Start with high-priority tasks:
   - JQ transformations documentation
   - REST endpoint /jq-query
   - Update overview
3. Get access/information about hugr-client repository
4. Create examples and verify they work
5. Update cross-references
6. Final consistency check

---

**Last Updated:** 2025-11-06

**Plan Author:** Claude (based on analysis of existing documentation and user requirements)
