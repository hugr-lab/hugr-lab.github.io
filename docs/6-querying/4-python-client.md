---
title: "Python Client (hugr-client)"
sidebar_position: 4
description: Python client for querying hugr — Arrow tables, pandas DataFrames, Perspective viewer, streaming
keywords: [python, client, pandas, geopandas, dataframe, jupyter, jupyterlab, jupyterhub, notebook, streaming, ipc, arrow, perspective, analytics]
---

# Python Client (hugr-client)

Python client for the Hugr Data Mesh platform. Query data via GraphQL, get results as Arrow tables, pandas DataFrames, or interactive Perspective viewers.

## Installation

```bash
pip install hugr-client
```

For interactive map visualizations (KeplerGL):

```bash
pip install hugr-client[viz]
```

## Quick Start

```python
from hugr import HugrClient

client = HugrClient()  # reads connection from ~/.hugr/connections.json
result = client.query("{ core { data_sources { name } } }")

# Interactive Perspective viewer in JupyterLab
result

# pandas DataFrame
df = result.df("data.core.data_sources")

# pyarrow Table (zero-copy, no pandas overhead)
table = result.parts["data.core.data_sources"].to_arrow()
```

## Connection

### From Connection Manager (recommended)

When using JupyterLab with [hugr-kernel](/docs/kernels/hugr-kernel), connections are managed via the connection manager UI. hugr-client reads the same `~/.hugr/connections.json`:

```python
# Default connection
client = HugrClient()

# Named connection
client = HugrClient.from_connection("production")

# With connection= parameter
client = HugrClient(connection="staging")
```

### From Environment Variables

```python
# Uses HUGR_URL, HUGR_API_KEY, HUGR_TOKEN env vars
client = HugrClient()
```

| Variable | Description |
|----------|-------------|
| `HUGR_URL` | Hugr server URL (e.g., `http://localhost:15000/ipc`) |
| `HUGR_API_KEY` | API key for authentication |
| `HUGR_TOKEN` | Bearer token for authentication |
| `HUGR_API_KEY_HEADER` | Custom API key header name (default: `X-Hugr-Api-Key`) |
| `HUGR_ROLE_HEADER` | Custom role header name (default: `X-Hugr-Role`) |
| `HUGR_CONFIG_PATH` | Custom path to connections.json |

### Explicit Parameters

```python
client = HugrClient(
    url="http://localhost:15000/ipc",
    api_key="sk-...",
    api_key_header="X-Custom-Key",  # optional custom header
    role="analyst",
)
```

**Priority:** explicit parameters > environment variables > connections.json

### Authentication

```python
# API Key
client = HugrClient(url="...", api_key="key", api_key_header="X-My-Key")

# Bearer Token
client = HugrClient(url="...", token="eyJ...")

# Role-based access
client = HugrClient(url="...", api_key="key", role="analyst")
```

When using connection manager, auth is configured in the UI — hugr-client reads credentials from `connections.json` automatically. If a token expires (401), the client re-reads the file and retries (connection service may have refreshed the token).

## Working with Results

### Multipart Responses

Hugr returns multipart responses — one query can produce multiple data parts:

```python
result = client.query("""
{
    devices { id name geom }
    drivers { id name }
}
""")

# Access individual parts
result.parts["data.devices"].df()
result.parts["data.drivers"].to_arrow()

# Display all parts (Perspective viewer in JupyterLab, HTML elsewhere)
result
```

### Data Access Methods

```python
part = result.parts["data.devices"]

# pyarrow Table (zero-copy, most efficient)
table = part.to_arrow()

# pandas DataFrame (fresh copy each call)
df = part.df()

# GeoDataFrame (with geometry decoding)
gdf = part.to_geo_dataframe("geom")

# Shortcuts on response object
df = result.df("data.devices")
gdf = result.gdf("data.devices", "geom")
record = result.record("data.device_by_pk")
```

### Perspective Viewer

In JupyterLab with [hugr-perspective-viewer](https://github.com/hugr-lab/duckdb-kernel) installed, results render as interactive Perspective tables with sorting, filtering, and map visualization:

```python
# Full response — tabs for each part
result

# Single part
result.parts["data.devices"]
```

This works by writing Arrow data to temporary spool files and emitting `application/vnd.hugr.result+json` MIME type — the same mechanism used by hugr-kernel and duckdb-kernel.

In VS Code or environments without Perspective, results fall back to HTML table display.

### Geometry Support

Geometry fields are automatically detected from server metadata. Supported formats: WKB, GeoJSON, H3Cell.

```python
# GeoDataFrame with CRS
gdf = result.gdf("data.devices", "geom")
print(gdf.crs)  # EPSG:4326

# Nested geometry (auto-flattens to target field)
gdf = result.gdf("data.drivers", "devices.geom")

# GeoJSON export
layers = result.geojson_layers()
```

When writing to spool files for Perspective viewer, WKB geometry is automatically converted to native GeoArrow format (same as Go kernels).

### Map Visualization

With `hugr-client[viz]`:

```python
result.explore_map()  # KeplerGL interactive map
```

## Streaming API

For large datasets, use WebSocket streaming to process data in batches without loading everything into memory:

```python
import asyncio
from hugr import connect_stream

async def main():
    client = connect_stream()  # reads from connections.json

    # Stream Arrow batches
    async with await client.stream("{ devices { id name geom } }") as stream:
        async for batch in stream.chunks():
            print(f"Batch: {batch.num_rows} rows")

    # Collect into DataFrame
    async with await client.stream("{ devices { id name } }") as stream:
        df = await stream.to_pandas()

    # Row-by-row processing
    async with await client.stream("{ devices { id status } }") as stream:
        async for row in stream.rows():
            if row["status"] == "active":
                print(row["id"])

asyncio.run(main())
```

### Stream Methods

| Method | Description |
|--------|-------------|
| `stream.chunks()` | Async generator of Arrow RecordBatch |
| `stream.rows()` | Async generator of dict rows |
| `stream.to_pandas()` | Collect all batches into DataFrame |
| `stream.count()` | Count total rows |
| `client.cancel_current_query()` | Cancel running query |

### Streaming with Authentication

```python
from hugr import connect_stream

# From connections.json
client = connect_stream()

# Explicit auth
client = connect_stream(
    url="http://localhost:15000/ipc",
    api_key="sk-...",
    api_key_header="X-Custom-Key",
)
```

### Using in Jupyter Notebooks

In JupyterLab, `await` works directly in cells:

```python
from hugr import connect_stream

client = connect_stream()

async with await client.stream("{ devices { id name } }") as stream:
    df = await stream.to_pandas()

df.head()
```

## ETL / Headless Usage

hugr-client works without Jupyter — no spool files, no display overhead, no Jupyter imports:

```python
from hugr import HugrClient

client = HugrClient()
result = client.query("{ data_source { id value } }")

# Pure data access — no side effects
table = result.to_arrow("data.data_source")  # pyarrow.Table
df = result.df("data.data_source")            # pandas.DataFrame
```

### Incremental ML Training

```python
from hugr import connect_stream
from sklearn.linear_model import SGDClassifier

async def train():
    client = connect_stream()
    model = SGDClassifier()

    async with await client.stream("{ training_data { features label } }") as stream:
        async for batch in stream.chunks():
            df = batch.to_pandas()
            model.partial_fit(df[["f1", "f2"]], df["label"], classes=[0, 1])

    return model
```

## JupyterLab/Hub Integration

### Analytics Hub

In [Analytics Hub](/docs/analytics-hub) (JupyterHub), hugr-client is pre-installed in the workspace container. Connection to Hugr is configured automatically — just create a client:

```python
from hugr import HugrClient

client = HugrClient()  # uses Hub-managed connection with OIDC token
result = client.query("{ ... }")
result  # Perspective viewer
```

Token refresh is handled automatically by the connection service.

### Standalone JupyterLab

```bash
pip install jupyterlab hugr-client hugr-perspective-viewer
```

Configure connection via the connection manager sidebar or environment variables.

## API Reference

### HugrClient

```python
HugrClient(
    url=None,              # Server URL (or from env/connections.json)
    api_key=None,          # API key
    api_key_header=None,   # Custom header name (default: X-Hugr-Api-Key)
    token=None,            # Bearer token
    role=None,             # User role
    connection=None,       # Connection name or dict from connections.json
)
```

| Method | Returns | Description |
|--------|---------|-------------|
| `query(query, variables)` | `HugrIPCResponse` | Execute GraphQL query |
| `from_connection(name)` | `HugrClient` | Create from connections.json |

### HugrIPCResponse

| Method | Returns | Description |
|--------|---------|-------------|
| `df(path)` | `DataFrame` | Part as pandas DataFrame |
| `gdf(path, field)` | `GeoDataFrame` | Part as GeoDataFrame |
| `to_arrow(path)` | `pa.Table` | Part as Arrow Table |
| `record(path)` | `dict` | Part as dictionary |
| `parts` | `dict` | All parts by path |
| `extensions()` | `dict` | Query extensions |
| `explore_map()` | `KeplerGl` | Map visualization (requires `[viz]`) |

### HugrIPCTable (individual part)

| Method | Returns | Description |
|--------|---------|-------------|
| `df()` | `DataFrame` | Fresh pandas DataFrame |
| `to_arrow()` | `pa.Table` | Zero-copy Arrow Table |
| `to_geo_dataframe(field)` | `GeoDataFrame` | With geometry decoding |
| `geojson_layers()` | `dict` | GeoJSON FeatureCollections |
| `explore_map()` | `KeplerGl` | Map visualization (requires `[viz]`) |

### Streaming

```python
connect_stream(
    url=None, api_key=None, api_key_header=None,
    token=None, role=None, max_frame_size=128*1024*1024,
)
```

| Method | Description |
|--------|-------------|
| `stream(query, variables)` | Create async data stream |
| `stream_data_object(obj, fields)` | Stream specific data object |
| `cancel_current_query()` | Cancel running query |
| `disconnect()` | Close WebSocket |

## Dependencies

**Required:** `requests`, `requests-toolbelt`, `pyarrow`, `pandas`, `numpy`, `geopandas`, `shapely`, `websockets`

**Optional (`[viz]`):** `keplergl`, `pydeck`, `folium`, `matplotlib`, `mapclassify`

## See Also

- [Hugr IPC Protocol](./3-hugr-ipc.md) — Arrow IPC multipart/mixed protocol
- [GraphQL API](./2-graphql.md) — GraphQL query reference
- [hugr-client Repository](https://github.com/hugr-lab/hugr-client) — Source code
- [Analytics Hub](/docs/analytics-hub) — JupyterHub workspace with pre-configured hugr-client
