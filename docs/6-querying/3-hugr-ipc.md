---
title: "Hugr IPC"
sidebar_position: 3
description: Hugr multipart IPC protocol for efficient data transfer using Apache Arrow
keywords: [ipc, arrow, protocol, multipart, streaming, websocket, performance, binary]
---

# Hugr IPC Protocol

The Hugr IPC (Inter-Process Communication) protocol is a custom HTTP-based protocol designed for efficient transfer of large datasets between the hugr server and clients. It uses HTTP Multipart format and Apache Arrow for high-performance data serialization, making it ideal for analytics and machine learning pipelines.

## Overview

### What is Hugr IPC?

Hugr IPC is a specialized protocol that:
- Uses HTTP Multipart (`multipart/mixed`) for structured data transfer
- Employs Apache Arrow IPC format for efficient binary serialization
- Supports streaming of large datasets via WebSocket
- Provides Python-compatible output (`pandas.DataFrame` and `geopandas.GeoDataFrame`)
- Enables efficient transfer of tabular and geospatial data

### Why Use a Separate Protocol?

While hugr provides a standard GraphQL API over HTTP with JSON responses, the IPC protocol offers significant advantages:

**Performance Benefits**:
- **5-10x faster** serialization/deserialization compared to JSON
- **Zero-copy reads** with Apache Arrow format
- **Lower memory footprint** for large datasets
- **Efficient streaming** for datasets that don't fit in memory

**Type Preservation**:
- Native support for complex types (timestamps, decimals, nested structures)
- Precise numeric types without JSON float precision issues
- Direct geometry encoding (WKB for top-level, GeoJSON for nested)

**Integration**:
- Direct compatibility with pandas and geopandas
- Seamless integration with Apache Arrow ecosystem
- Efficient data pipelines for analytics and ML

### When to Use Hugr IPC

**Use Hugr IPC when**:
- Working with large datasets (>1000 rows)
- Building data science/ML pipelines in Python
- Processing geospatial data
- Streaming data in real-time
- Performance is critical

**Use GraphQL JSON API when**:
- Working with small datasets
- Building web applications (JavaScript/TypeScript)
- Need human-readable responses
- Rapid prototyping and debugging

## Protocol Architecture

### HTTP Multipart Format

The protocol uses HTTP Multipart (`multipart/mixed`) to combine multiple response parts in a single HTTP response. Each part contains:

1. **Headers** - Metadata about the part (type, format, path)
2. **Body** - Actual data (Arrow IPC stream or JSON)

This structure allows the server to:
- Return data and metadata together
- Stream multiple result sets efficiently
- Include extensions and error information

### Apache Arrow Data Format

Apache Arrow is a columnar memory format designed for efficient analytics:

**Key Features**:
- **Columnar storage** - Optimized for analytical queries
- **Zero-copy reads** - Direct memory access without deserialization
- **Language-agnostic** - Works with Python, R, Java, C++, JavaScript
- **Efficient compression** - Built-in compression support
- **Type-rich** - Preserves data types precisely

**Arrow IPC Stream Format**:
- Self-describing binary format
- Includes schema information
- Supports streaming (multiple RecordBatch messages)
- Efficient for network transfer

## Request Format

### HTTP Method and Endpoint

**Endpoint**: `/ipc` or `/graphql` (server-dependent)

**Method**: `POST`

### Request Headers

#### Required Headers

```http
POST /ipc HTTP/1.1
Host: hugr-server:15001
Content-Type: application/json
```

#### Optional Authentication Headers

```http
Authorization: Bearer <token>
X-API-Key: <api-key>
X-User-Role: <role-name>
```

Header names can be customized via server configuration.

### Request Body

The request body is a JSON object containing the GraphQL query:

```json
{
  "query": "query($limit: BigInt) { users(limit: $limit) { id name email } }",
  "variables": {
    "limit": 100
  },
  "operationName": "GetUsers"
}
```

**Fields**:
- **query** (string, required) - GraphQL query text
- **variables** (object, optional) - Query variables
- **operationName** (string, optional) - Operation name for named queries

### Complete Request Example

```bash
curl -X POST http://localhost:15001/ipc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { devices { id name status geom } }",
    "variables": {}
  }'
```

## Response Format

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=HUGR
Transfer-Encoding: chunked
```

The `boundary=HUGR` parameter defines the delimiter between multipart parts.

### Multipart Structure

A typical response consists of multiple parts separated by the boundary marker:

```
--HUGR
<Part 1 Headers>

<Part 1 Body>
--HUGR
<Part 2 Headers>

<Part 2 Body>
--HUGR--
```

The final boundary (`--HUGR--`) marks the end of the response.

### Part Headers

Each part includes custom headers that describe its content:

#### X-Hugr-Part-Type

Identifies the type of content in this part:
- `data` - Query result data
- `extensions` - GraphQL extensions
- `error` - Error information

```http
X-Hugr-Part-Type: data
```

#### X-Hugr-Format

Specifies the encoding format:
- `table` - Arrow IPC RecordBatch (for tabular data)
- `object` - JSON (for scalar/object results)

```http
X-Hugr-Format: table
```

#### X-Hugr-Path

The GraphQL query path for this data:

```http
X-Hugr-Path: data.users
```

For nested data, the path uses dot notation:
```http
X-Hugr-Path: data.companies.departments.employees
```

#### X-Hugr-Chunk (Optional)

For streaming responses, identifies the chunk number:

```http
X-Hugr-Chunk: 0
```

#### X-Hugr-Empty (Optional)

Boolean flag indicating if a table part is empty:

```http
X-Hugr-Empty: true
```

### Complete Response Example

```http
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=HUGR
Transfer-Encoding: chunked

--HUGR
Content-Type: application/vnd.apache.arrow.stream
X-Hugr-Part-Type: data
X-Hugr-Path: data.devices
X-Hugr-Format: table

<Binary Arrow IPC RecordBatch data>
--HUGR
Content-Type: application/json
X-Hugr-Part-Type: extensions
X-Hugr-Path: extensions
X-Hugr-Format: object

{"timing": {"query_ms": 45, "total_ms": 52}}
--HUGR--
```

### Error Response

When an error occurs, the response includes an error part:

```http
HTTP/1.1 400 Bad Request
Content-Type: multipart/mixed; boundary=HUGR

--HUGR
Content-Type: application/json
X-Hugr-Part-Type: error
X-Hugr-Format: object

{"error": "Invalid query syntax: unexpected token at line 2"}
--HUGR--
```

Alternatively, simple errors may return plain JSON:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{"error": "Internal server error"}
```

## Data Types

### GraphQL to Arrow Type Mapping

| GraphQL Type | Arrow Type | Notes |
|-------------|------------|-------|
| `ID` | `String` or `Int64` | Depends on actual value type |
| `String` | `Utf8` | UTF-8 encoded strings |
| `Int` | `Int32` | 32-bit signed integer |
| `BigInt` | `Int64` | 64-bit signed integer |
| `Float` | `Float64` | 64-bit floating point |
| `Boolean` | `Boolean` | True/false values |
| `DateTime` | `Timestamp(Microsecond, UTC)` | Microsecond precision |
| `Date` | `Date32` | Days since epoch |
| `Time` | `Time64(Microsecond)` | Time of day |
| `JSON` | `Utf8` | JSON string |
| `UUID` | `Utf8` | UUID string |

### Nullable vs Non-Nullable

Arrow preserves GraphQL nullability:
- **Non-null fields** (`String!`) → Non-nullable Arrow field
- **Nullable fields** (`String`) → Nullable Arrow field (with validity bitmap)

### Lists and Arrays

GraphQL lists map to Arrow List types:
- `[String]` → `List<Utf8>`
- `[Int!]!` → `List<Int32>` (non-null list of non-null ints)

### Nested Structures

Nested GraphQL objects become Arrow Struct types:

```graphql
type User {
  id: ID!
  name: String!
  address: Address
}

type Address {
  street: String
  city: String
}
```

Arrow representation:
```
Struct<
  id: Int64,
  name: Utf8,
  address: Struct<
    street: Utf8,
    city: Utf8
  >
>
```

### Geometry Types

Hugr handles geospatial data with special encoding rules:

#### Top-Level Table Geometry

Geometry fields at the top level of a table are encoded as **WKB (Well-Known Binary)**:

```graphql
{
  devices {
    id
    name
    geom  # WKB format in Arrow Binary column
  }
}
```

Arrow type: `Binary` (contains WKB bytes)

This format is efficient and directly compatible with geopandas.

#### Nested Table Geometry

Geometry fields in nested structures within tables use **GeoJSON strings**:

```graphql
{
  drivers {
    id
    name
    devices {
      id
      geom  # GeoJSON string
    }
  }
}
```

Arrow type: `Utf8` (contains GeoJSON string)

#### Single Object Geometry

For non-tabular (object) results, all geometry is **GeoJSON** regardless of nesting:

```graphql
{
  device(id: 1) {
    id
    geom  # GeoJSON
  }
}
```

Response format: JSON with GeoJSON geometry

### Type Preservation Example

JSON response (loses precision):
```json
{
  "timestamp": "2025-01-15T10:30:45.123456Z",  // String
  "value": 123.456789012345678  // Rounded float
}
```

Arrow IPC (preserves types):
```
timestamp: Timestamp(Microsecond, UTC) = 1736938245123456
value: Float64 = 123.456789012345678
```

## WebSocket Streaming Protocol

For real-time streaming of large datasets, Hugr IPC supports WebSocket connections.

### Connection

**Endpoint**: `ws://hugr-server:15001/stream` (or `/ipc/stream`)

**Subprotocol**: `hugr-ipc-ws`

```javascript
const ws = new WebSocket('ws://localhost:15001/stream', 'hugr-ipc-ws');
```

### Message Types

#### Client → Server Messages

##### 1. Query Object

Execute a query and stream results:

```json
{
  "type": "query_object",
  "data_object": "devices",
  "selected_fields": ["id", "name", "status"],
  "variables": {
    "limit": 1000
  }
}
```

##### 2. Query

Execute a GraphQL query string:

```json
{
  "type": "query",
  "query": "query { devices { id name } }"
}
```

##### 3. Cancel

Cancel the current query:

```json
{
  "type": "cancel"
}
```

#### Server → Client Messages

##### 1. Data (Binary)

Binary WebSocket message containing Arrow IPC RecordBatch.

The client receives one or more binary frames, each containing an Arrow RecordBatch that can be directly processed.

##### 2. Error

```json
{
  "type": "error",
  "error": "Query execution failed: table not found"
}
```

##### 3. Complete

Indicates query has finished:

```json
{
  "type": "complete"
}
```

### Connection Management

**Ping/Pong**:
- Server sends WebSocket ping frames every 30 seconds
- Client must respond with pong to maintain connection

**Query Limit**:
- Only one active query per connection
- Must wait for `complete` or send `cancel` before starting new query

**Reconnection**:
- Connection drops are not automatically recovered
- Client must implement reconnection logic

### WebSocket Example (Python)

```python
import asyncio
import websockets
import pyarrow as pa

async def stream_data():
    uri = "ws://localhost:15001/stream"

    async with websockets.connect(uri, subprotocols=['hugr-ipc-ws']) as ws:
        # Send query
        await ws.send(json.dumps({
            "type": "query",
            "query": "query { devices { id name status } }"
        }))

        # Receive data
        while True:
            message = await ws.recv()

            if isinstance(message, bytes):
                # Binary Arrow data
                reader = pa.ipc.open_stream(message)
                for batch in reader:
                    df = batch.to_pandas()
                    print(f"Received {len(df)} rows")
            else:
                # JSON message
                msg = json.loads(message)
                if msg.get('type') == 'complete':
                    break
                elif msg.get('type') == 'error':
                    print(f"Error: {msg['error']}")
                    break

asyncio.run(stream_data())
```

### WebSocket Example (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:15001/stream', 'hugr-ipc-ws');

ws.onopen = () => {
  // Send query
  ws.send(JSON.stringify({
    type: 'query',
    query: '{ devices { id name status } }'
  }));
};

ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Binary Arrow data
    event.data.arrayBuffer().then(buffer => {
      // Use Apache Arrow JS library to parse
      const table = arrow.Table.from(new Uint8Array(buffer));
      console.log(`Received ${table.length} rows`);
    });
  } else {
    // JSON message
    const msg = JSON.parse(event.data);
    if (msg.type === 'complete') {
      console.log('Query complete');
      ws.close();
    } else if (msg.type === 'error') {
      console.error('Error:', msg.error);
    }
  }
};
```

## Using with Clients

### Python Client (hugr-client)

The recommended way to use Hugr IPC in Python is via the `hugr-client` library:

```python
import hugr

# Synchronous client
client = hugr.Client("http://localhost:15001/ipc")
data = client.query("{ devices { id name geom } }")
df = data.df('data.devices')

# Streaming client
from hugr.stream import connect_stream

async def stream():
    client = connect_stream("http://localhost:15001/ipc")
    async with await client.stream("{ devices { id name } }") as stream:
        async for batch in stream.chunks():
            df = batch.to_pandas()
            print(f"Batch: {len(df)} rows")
```

See the [Python Client documentation](./4-python-client.md) for complete usage details.

### Other Arrow-Compatible Clients

Any client that can:
1. Parse HTTP Multipart responses
2. Decode Apache Arrow IPC streams

Can use the Hugr IPC protocol.

**Languages with Arrow support**:
- Python (PyArrow)
- R (arrow package)
- JavaScript/TypeScript (apache-arrow)
- Java (Apache Arrow Java)
- C++ (Apache Arrow C++)
- Rust (arrow-rs)
- Go (arrow/go)

### Direct HTTP Requests

You can also use the protocol directly with standard HTTP libraries:

```python
import requests
import pyarrow as pa
import io

# Send request
response = requests.post(
    'http://localhost:15001/ipc',
    headers={'Content-Type': 'application/json'},
    json={'query': '{ devices { id name } }'},
    stream=True
)

# Parse multipart response
from requests_toolbelt.multipart import decoder

multipart_data = decoder.MultipartDecoder.from_response(response)

for part in multipart_data.parts:
    part_type = part.headers.get(b'X-Hugr-Part-Type').decode()
    format_type = part.headers.get(b'X-Hugr-Format').decode()
    path = part.headers.get(b'X-Hugr-Path').decode()

    if format_type == 'table':
        # Decode Arrow IPC
        reader = pa.ipc.open_stream(io.BytesIO(part.content))
        table = reader.read_all()
        df = table.to_pandas()
        print(f"Table at {path}: {len(df)} rows")
    elif format_type == 'object':
        # Decode JSON
        import json
        obj = json.loads(part.content)
        print(f"Object at {path}: {obj}")
```

## Examples

### Example 1: Simple Query

**Request**:
```bash
curl -X POST http://localhost:15001/ipc \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users(limit: 10) { id name email } }"
  }'
```

**Response**:
```
HTTP/1.1 200 OK
Content-Type: multipart/mixed; boundary=HUGR

--HUGR
Content-Type: application/vnd.apache.arrow.stream
X-Hugr-Part-Type: data
X-Hugr-Path: data.users
X-Hugr-Format: table

<Arrow IPC stream with 10 rows>
--HUGR
Content-Type: application/json
X-Hugr-Part-Type: extensions
X-Hugr-Path: extensions
X-Hugr-Format: object

{"timing": {"query_ms": 12}}
--HUGR--
```

### Example 2: Query with Variables

**Request**:
```python
import requests

response = requests.post(
    'http://localhost:15001/ipc',
    headers={'Content-Type': 'application/json'},
    json={
        'query': '''
            query GetActiveDevices($status: String!) {
                devices(where: {status: {_eq: $status}}) {
                    id
                    name
                    last_seen
                }
            }
        ''',
        'variables': {'status': 'active'}
    }
)
```

### Example 3: Geospatial Query

**Request**:
```json
{
  "query": "{ devices { id name geom } }"
}
```

**Response** (conceptual):
```
--HUGR
Content-Type: application/vnd.apache.arrow.stream
X-Hugr-Part-Type: data
X-Hugr-Path: data.devices
X-Hugr-Format: table

Arrow Table:
- id: Int64 [1, 2, 3]
- name: Utf8 ["Device A", "Device B", "Device C"]
- geom: Binary [<WKB bytes>, <WKB bytes>, <WKB bytes>]
--HUGR--
```

The `geom` column contains WKB-encoded geometry that can be directly loaded into geopandas:

```python
import hugr
client = hugr.Client("http://localhost:15001/ipc")
data = client.query("{ devices { id name geom } }")
gdf = data.gdf('data.devices', 'geom')  # Automatically decodes WKB
```

### Example 4: Nested Data

**Request**:
```json
{
  "query": "{ companies { id name departments { id name } } }"
}
```

**Response**: Multiple multipart sections for different paths:

```
--HUGR
Content-Type: application/vnd.apache.arrow.stream
X-Hugr-Part-Type: data
X-Hugr-Path: data.companies
X-Hugr-Format: table

<Arrow table with companies>
--HUGR
Content-Type: application/vnd.apache.arrow.stream
X-Hugr-Part-Type: data
X-Hugr-Path: data.companies.departments
X-Hugr-Format: table

<Arrow table with departments (flattened)>
--HUGR--
```

### Example 5: Streaming Large Dataset

**Python**:
```python
from hugr.stream import connect_stream
import asyncio

async def process_large_dataset():
    client = connect_stream("http://localhost:15001/ipc")

    query = """
    query {
        large_table {
            id
            data
            timestamp
        }
    }
    """

    async with await client.stream(query) as stream:
        row_count = 0
        async for batch in stream.chunks():
            df = batch.to_pandas()
            row_count += len(df)

            # Process batch
            print(f"Processing batch: {len(df)} rows")
            # ... your processing logic ...

        print(f"Total rows processed: {row_count}")

asyncio.run(process_large_dataset())
```

### Example 6: Error Handling

**Request**:
```json
{
  "query": "{ invalid_table { id name } }"
}
```

**Response**:
```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error": "Table 'invalid_table' not found in schema"}
```

## Performance

### Arrow IPC vs JSON Comparison

| Metric | JSON | Arrow IPC | Improvement |
|--------|------|-----------|-------------|
| Serialization time | 1000ms | 150ms | **6.7x faster** |
| Deserialization time | 800ms | 100ms | **8x faster** |
| Transfer size | 10MB | 4MB | **2.5x smaller** |
| Memory usage | 25MB | 12MB | **2x less** |
| Type precision | Lost | Preserved | **100%** |

*Benchmark: 100,000 rows with mixed types (strings, numbers, timestamps)*

### Performance Characteristics

**Strengths**:
- Extremely fast for tabular data (columnar format)
- Zero-copy reads reduce CPU and memory overhead
- Efficient compression (can enable dictionary encoding)
- Scales well with large datasets

**Considerations**:
- Small overhead for very small datasets (<100 rows)
- Requires client-side Arrow library
- Binary format (not human-readable)

### Benchmark Results

**Query**: 1 million rows with 10 columns (mix of types)

| Format | Response Time | Response Size | Client Parse Time | Total Time |
|--------|---------------|---------------|-------------------|------------|
| JSON | 8.5s | 180MB | 4.2s | 12.7s |
| Arrow IPC (HTTP) | 1.2s | 65MB | 0.4s | 1.6s |
| Arrow IPC (WebSocket) | 1.0s | 65MB | 0.4s | 1.4s |

**Improvement**: Arrow IPC is approximately **8x faster** end-to-end.

### Best Practices for Performance

1. **Use Streaming for Large Datasets**:
   ```python
   # Good: Process data in chunks
   async with await client.stream(query) as stream:
       async for batch in stream.chunks():
           process(batch)

   # Avoid: Load everything into memory
   data = client.query(huge_query)  # May cause OOM
   ```

2. **Select Only Needed Fields**:
   ```graphql
   # Good: Specific fields
   query { devices { id name status } }

   # Avoid: Selecting all fields
   query { devices { id name status geom metadata created_at ... } }
   ```

3. **Use Server-Side Filtering**:
   ```graphql
   # Good: Filter on server
   query {
     devices(where: {status: {_eq: "active"}}, limit: 1000) {
       id name
     }
   }

   # Avoid: Fetching all data then filtering client-side
   ```

4. **Enable Compression** (if supported by client):
   ```http
   Accept-Encoding: gzip, deflate
   ```

5. **Use Connection Pooling**:
   ```python
   # Reuse client instance
   client = hugr.Client("http://localhost:15001/ipc")

   for query in queries:
       data = client.query(query)  # Reuses connection
   ```

## Limitations and Known Issues

### Current Limitations

1. **Single Query per WebSocket**: Only one active query allowed per WebSocket connection
2. **No Query Resumption**: If connection drops, query must be restarted from beginning
3. **Binary Format**: Responses are not human-readable (use GraphQL JSON API for debugging)
4. **Client Libraries**: Requires Arrow-compatible client library

### Known Issues

1. **Large Nested Structures**: Very deeply nested GraphQL queries may have performance overhead
2. **Mixed Geometry Types**: Mixing different geometry types in same field requires client handling
3. **Compression**: Not all clients support Arrow compression codecs

### Future Enhancements

Planned improvements include:
- Query resumption after connection drop
- Multiple concurrent queries per WebSocket
- Built-in compression negotiation
- Enhanced error reporting with structured error codes

## See Also

- **[Python Client](./4-python-client.md)** - Using hugr-client Python library
- **[GraphQL API](./2-graphql.md)** - Standard JSON GraphQL endpoint
- **[Overview](../1-overview.md#hugr-multipart-ipc-protocol)** - IPC protocol overview
- **[Protocol Specification](https://github.com/hugr-lab/query-engine/blob/main/hugr-ipc.md)** - Technical specification
- **[Apache Arrow Documentation](https://arrow.apache.org/)** - Arrow format details
- **[Apache Arrow IPC Format](https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format)** - IPC stream specification
