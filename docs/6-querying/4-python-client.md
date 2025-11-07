---
title: "Python Client (hugr-client)"
sidebar_position: 4
description: Python client for querying hugr and processing results in data science pipelines
keywords: [python, client, pandas, geopandas, dataframe, jupyter, jupyterlab, jupyterhub, notebook, streaming, ipc, arrow, ml, machine-learning, analytics]
---

# Python Client (hugr-client)

The `hugr-client` is a Python library that provides a convenient interface for working with the hugr GraphQL API and Hugr IPC protocol. It enables seamless integration with data science workflows by converting GraphQL query results into pandas DataFrames and geopandas GeoDataFrames.

## Overview

### What is hugr-client?

`hugr-client` is a Python package that:
- Executes GraphQL queries against hugr server
- Converts results to pandas DataFrames and geopandas GeoDataFrames
- Provides efficient data transfer using Apache Arrow IPC protocol
- Supports both synchronous and asynchronous streaming APIs
- Integrates seamlessly with Jupyter environments (Jupyter Notebook, JupyterLab, JupyterHub)
- Enables interactive geospatial data visualization

### Why Use hugr-client?

- **Pythonic API**: Work with hugr data using familiar pandas and geopandas interfaces
- **Performance**: Arrow IPC format provides efficient transfer of large datasets
- **Jupyter Integration**: Built-in support for interactive notebooks and map visualization
- **Streaming**: Process large datasets without loading everything into memory
- **ML Pipelines**: Direct integration with scikit-learn, PyTorch, TensorFlow, and other ML frameworks
- **Geospatial**: First-class support for geographic data with automatic geometry handling

### Key Features

- Query data from multiple sources through unified GraphQL interface
- Convert nested GraphQL responses to flat DataFrames
- Automatic geometry field extraction and conversion to GeoDataFrame
- Interactive map exploration in Jupyter environments using keplergl, pydeck, and folium
- Asynchronous streaming via WebSocket for large datasets
- Flexible authentication (API keys, tokens, role-based access)
- Environment variable configuration for connection parameters

## Installation

### Requirements

- Python 3.8 or higher
- pip or uv package manager

### Install via pip

```bash
pip install hugr-client
```

### Install via uv

```bash
uv pip install hugr-client
```

### Dependencies

The client automatically installs the following dependencies:

**Core dependencies**:
- `requests` - HTTP client
- `pyarrow` - Apache Arrow for efficient data transfer
- `pandas` - DataFrame operations
- `numpy` - Numerical computing

**Geospatial dependencies**:
- `geopandas` - Geographic DataFrames
- `shapely` - Geometric operations
- `mapclassify` - Choropleth classification

**Visualization dependencies** (for Jupyter):
- `keplergl` - Interactive geospatial visualization
- `pydeck` - Deck.gl integration for Python
- `folium` - Leaflet maps in Python
- `matplotlib` - Static plotting

**Streaming dependencies**:
- `websockets` - WebSocket client for streaming
- `requests_toolbelt` - HTTP multipart support

## Quick Start

### Connecting to hugr Server

```python
import hugr

# Create client instance
client = hugr.Client("http://localhost:15001/ipc")

# Execute a GraphQL query
data = client.query("""
    {
        devices {
            id
            name
            status
            last_seen {
                time
                value
            }
        }
    }
""")

# Convert to pandas DataFrame
df = data.df('data.devices')
print(df.head())
```

### Environment-Based Connection

You can also use environment variables for configuration:

```bash
export HUGR_URL="http://localhost:15001/ipc"
export HUGR_API_KEY="your-api-key"
export HUGR_TOKEN="your-bearer-token"
```

```python
import hugr

# Uses HUGR_URL and authentication from environment
data = hugr.query("{ devices { id name status } }")
df = data.df('data.devices')
```

### Getting Data as DataFrame

```python
# Query with nested structure
data = client.query("""
    {
        users {
            id
            name
            email
            orders {
                id
                total
                created_at
            }
        }
    }
""")

# Get users DataFrame
users_df = data.df('data.users')

# Get nested orders (flattens the structure)
orders_df = data.df('data.users.orders')
```

## Core Features

### Executing GraphQL Queries

```python
import hugr

client = hugr.Client("http://your-hugr-server:15001/ipc")

# Simple query
query = """
{
    devices {
        id
        name
        status
    }
}
"""

result = client.query(query)
```

### Working with Variables

```python
# Query with variables
query = """
query GetDevicesByStatus($status: String!) {
    devices(where: {status: {_eq: $status}}) {
        id
        name
        last_seen {
            time
            value
        }
    }
}
"""

variables = {"status": "active"}
data = client.query(query, variables=variables)
df = data.df('data.devices')
```

### Getting Results in Different Formats

#### JSON (Dictionary)

```python
data = client.query("{ devices { id name } }")

# Get as dictionary
record = data.record('data.devices')
print(record)
# [{'id': 1, 'name': 'Device 1'}, {'id': 2, 'name': 'Device 2'}]
```

#### pandas DataFrame

```python
# Get as pandas DataFrame
df = data.df('data.devices')
print(type(df))  # <class 'pandas.core.frame.DataFrame'>
```

#### geopandas GeoDataFrame

```python
# Get as GeoDataFrame with geometry column
gdf = data.gdf('data.devices', 'geom')
print(type(gdf))  # <class 'geopandas.geodataframe.GeoDataFrame'>

# For nested geometry fields
gdf = data.gdf('data.drivers', 'devices.geom')
```

### Navigating Nested Data

The client uses dot notation to navigate nested GraphQL responses:

```python
data = client.query("""
{
    companies {
        id
        name
        departments {
            id
            name
            employees {
                id
                name
                email
            }
        }
    }
}
""")

# Get companies
companies_df = data.df('data.companies')

# Get all departments (flattened)
departments_df = data.df('data.companies.departments')

# Get all employees (flattened)
employees_df = data.df('data.companies.departments.employees')
```

## Working with Geospatial Data

### Querying Spatial Data

```python
import hugr

client = hugr.Client("http://localhost:15001/ipc")

# Query devices with geometry
query = """
{
    devices {
        id
        name
        status
        geom
        location {
            lat
            lon
        }
    }
}
"""

data = client.query(query)
```

### Converting to GeoDataFrame

```python
# Convert to GeoDataFrame with geometry
gdf = data.gdf('data.devices', 'geom')

# Now you can use geopandas operations
print(gdf.crs)  # Coordinate reference system
print(gdf.geometry.type)
print(gdf.total_bounds)

# Spatial operations
buffered = gdf.buffer(100)
within_area = gdf[gdf.within(some_polygon)]
```

### Map Visualization Examples

#### Interactive Map Exploration

```python
# Explore data on an interactive map
data.explore_map()

# This opens an interactive map visualization in Jupyter
# using keplergl, pydeck, or folium depending on what's available
```

#### Using Folium for Custom Maps

```python
import folium

gdf = data.gdf('data.devices', 'geom')

# Create base map
m = folium.Map(location=[gdf.geometry.y.mean(), gdf.geometry.x.mean()],
               zoom_start=10)

# Add markers
for idx, row in gdf.iterrows():
    folium.Marker(
        location=[row.geometry.y, row.geometry.x],
        popup=f"{row['name']}<br>Status: {row['status']}",
        icon=folium.Icon(color='green' if row['status'] == 'active' else 'red')
    ).add_to(m)

# Display in Jupyter
m
```

#### Using Pydeck for 3D Visualization

```python
import pydeck as pdk

gdf = data.gdf('data.devices', 'geom')

# Create layer
layer = pdk.Layer(
    'ScatterplotLayer',
    gdf,
    get_position='[geom.x, geom.y]',
    get_color='[200, 30, 0, 160]',
    get_radius=100,
)

# Create viewport
view_state = pdk.ViewState(
    latitude=gdf.geometry.y.mean(),
    longitude=gdf.geometry.x.mean(),
    zoom=11,
    pitch=50,
)

# Render
r = pdk.Deck(layers=[layer], initial_view_state=view_state)
r.show()
```

#### Using Kepler.gl for Advanced Visualization

```python
from keplergl import KeplerGl

gdf = data.gdf('data.devices', 'geom')

# Create Kepler map
map_1 = KeplerGl(height=600)

# Add data
map_1.add_data(data=gdf, name='devices')

# Display
map_1
```

## JupyterLab/Hub Integration

### Setting Up in JupyterLab

hugr-client works seamlessly in JupyterLab, providing interactive data exploration and visualization capabilities.

#### Installation in JupyterLab Environment

```bash
# If using JupyterLab in a virtual environment
pip install jupyterlab hugr-client

# For map visualizations, also install
pip install keplergl pydeck folium ipywidgets

# Enable JupyterLab extensions (if needed)
jupyter labextension install @jupyter-widgets/jupyterlab-manager
jupyter labextension install keplergl-jupyter
```

#### Starting JupyterLab

```bash
jupyter lab
```

### JupyterHub Configuration

For JupyterHub deployments, you can configure hugr-client for all users:

#### Server-Side Installation

```bash
# In your JupyterHub environment
pip install hugr-client
```

#### User Environment Configuration

Create a startup script at `~/.ipython/profile_default/startup/00-hugr.py`:

```python
import os

# Configure default hugr connection
os.environ['HUGR_URL'] = 'http://hugr-server.internal:15001/ipc'
os.environ['HUGR_API_KEY_HEADER'] = 'X-API-Key'
os.environ['HUGR_ROLE_HEADER'] = 'X-User-Role'

# Per-user authentication can be set in notebook cells
```

#### System-Wide JupyterHub Configuration

In your JupyterHub configuration (`jupyterhub_config.py`):

```python
c.Spawner.environment = {
    'HUGR_URL': 'http://hugr-server.internal:15001/ipc',
    'HUGR_API_KEY_HEADER': 'X-API-Key',
}
```

### Interactive Analysis Workflow

Here's a typical workflow in JupyterLab:

```python
# Cell 1: Setup
import hugr
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
from keplergl import KeplerGl

# Configure pandas display
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', 100)

# Cell 2: Connect and query
client = hugr.Client("http://localhost:15001/ipc")

query = """
{
    devices {
        id
        name
        status
        geom
        last_seen {
            time
            value
        }
    }
}
"""

data = client.query(query)
df = data.df('data.devices')

# Cell 3: Exploratory analysis
df.info()
df.describe()
df['status'].value_counts()

# Cell 4: Data visualization
status_counts = df['status'].value_counts()
status_counts.plot(kind='bar', title='Device Status Distribution')
plt.ylabel('Count')
plt.show()

# Cell 5: Geospatial visualization
gdf = data.gdf('data.devices', 'geom')
map_1 = KeplerGl(height=600)
map_1.add_data(data=gdf, name='devices')
map_1

# Cell 6: Time series analysis
last_seen_df = data.df('data.devices.last_seen')
last_seen_df['time'] = pd.to_datetime(last_seen_df['time'])
last_seen_df.set_index('time')['value'].plot(figsize=(12, 6))
plt.title('Device Readings Over Time')
plt.ylabel('Value')
plt.show()
```

### Sharing Notebooks

JupyterLab notebooks using hugr-client can be easily shared:

```python
# At the top of your notebook, document the environment setup:

"""
# Setup Instructions

1. Install dependencies:
   pip install hugr-client pandas geopandas matplotlib keplergl

2. Configure environment:
   export HUGR_URL="http://your-hugr-server:15001/ipc"
   export HUGR_API_KEY="your-api-key"

3. Run notebook:
   jupyter notebook analysis.ipynb
"""
```

### Tips for JupyterLab Users

1. **Use Auto-reload for Development**:
```python
%load_ext autoreload
%autoreload 2
```

2. **Display Large DataFrames**:
```python
# Use pagination for large results
from IPython.display import display
display(df.head(50))
```

3. **Export Visualizations**:
```python
# Save maps as HTML
map_1.save_to_html(file_name='devices_map.html')
```

4. **Cache Query Results**:
```python
# Cache expensive queries
import pickle

# First run
data = client.query(expensive_query)
with open('cached_data.pkl', 'wb') as f:
    pickle.dump(data, f)

# Subsequent runs
with open('cached_data.pkl', 'rb') as f:
    data = pickle.load(f)
```

## Streaming API

For large datasets, use the streaming API to process data without loading everything into memory.

### Batch Processing

```python
import asyncio
from hugr.stream import connect_stream

async def main():
    client = connect_stream("http://localhost:15001/ipc")

    query = """
    query {
        devices {
            id
            name
            geom
            readings {
                time
                value
            }
        }
    }
    """

    async with await client.stream(query) as stream:
        async for batch in stream.chunks():
            # Process each batch as pandas DataFrame
            df = batch.to_pandas()
            print(f"Processing batch with {len(df)} rows")
            # Your processing logic here

asyncio.run(main())
```

### Row-by-Row Processing

```python
async def process_rows():
    client = connect_stream("http://localhost:15001/ipc")

    query = "query { devices { id name status } }"

    async with await client.stream(query) as stream:
        async for row in stream.rows():
            if row.get("status") == "active":
                print(f"Active device: {row['name']}")

asyncio.run(process_rows())
```

### Collecting All Data

```python
async def collect_data():
    client = connect_stream("http://localhost:15001/ipc")

    query = "query { devices { id name } }"

    async with await client.stream(query) as stream:
        # Collect all data into single DataFrame
        df = await stream.to_pandas()
        return df

df = asyncio.run(collect_data())
```

### Query Cancellation

```python
async def process_with_limit():
    client = connect_stream("http://localhost:15001/ipc")

    query = "query { large_dataset { id data } }"

    async with await client.stream(query) as stream:
        count = 0
        async for batch in stream.chunks():
            count += batch.num_rows

            if count > 10000:
                # Cancel query when we have enough data
                await client.cancel_current_query()
                break

asyncio.run(process_with_limit())
```

### Streaming in JupyterLab

```python
# For use in Jupyter notebooks
import nest_asyncio
nest_asyncio.apply()

# Now you can use await directly in cells
from hugr.stream import connect_stream

client = connect_stream("http://localhost:15001/ipc")
query = "query { devices { id name } }"

async with await client.stream(query) as stream:
    df = await stream.to_pandas()

df.head()
```

## Machine Learning Pipeline Integration

### Loading Data for Model Training

```python
import hugr
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# Query training data
client = hugr.Client("http://localhost:15001/ipc")

query = """
{
    sensor_data {
        temperature
        humidity
        pressure
        device_status
    }
}
"""

data = client.query(query)
df = data.df('data.sensor_data')

# Prepare features and target
X = df[['temperature', 'humidity', 'pressure']]
y = df['device_status']

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Model accuracy: {accuracy:.2f}")
```

### Feature Engineering with Pandas

```python
import hugr
import pandas as pd
import numpy as np

client = hugr.Client("http://localhost:15001/ipc")

# Query raw data
query = """
{
    devices {
        id
        readings {
            time
            value
            sensor_type
        }
    }
}
"""

data = client.query(query)
readings_df = data.df('data.devices.readings')

# Feature engineering
readings_df['time'] = pd.to_datetime(readings_df['time'])
readings_df['hour'] = readings_df['time'].dt.hour
readings_df['day_of_week'] = readings_df['time'].dt.dayofweek

# Pivot sensor types to columns
features = readings_df.pivot_table(
    index=['device_id', 'time'],
    columns='sensor_type',
    values='value',
    aggfunc='mean'
).reset_index()

# Rolling averages
features['temp_rolling_mean'] = features['temperature'].rolling(window=10).mean()
features['temp_rolling_std'] = features['temperature'].rolling(window=10).std()

# Use features for ML training
```

### Incremental Learning with Streaming

```python
import asyncio
from hugr.stream import connect_stream
from sklearn.linear_model import SGDClassifier
import numpy as np

async def incremental_training():
    client = connect_stream("http://localhost:15001/ipc")

    # Initialize incremental learner
    model = SGDClassifier(loss='log_loss', random_state=42)

    query = """
    query {
        training_data {
            feature1
            feature2
            feature3
            label
        }
    }
    """

    async with await client.stream(query) as stream:
        async for batch in stream.chunks():
            df = batch.to_pandas()

            X = df[['feature1', 'feature2', 'feature3']].values
            y = df['label'].values

            # Partial fit on batch
            model.partial_fit(X, y, classes=np.unique(y))

            print(f"Trained on batch of {len(df)} samples")

    return model

model = asyncio.run(incremental_training())
```

## Authentication

### Using API Keys

```python
import hugr

# Method 1: Pass api_key parameter
client = hugr.Client(
    "http://localhost:15001/ipc",
    api_key="your-api-key-here"
)

# Method 2: Use environment variable
# export HUGR_API_KEY="your-api-key-here"
client = hugr.Client("http://localhost:15001/ipc")
```

### Using Bearer Tokens

```python
import hugr

# Method 1: Pass token parameter
client = hugr.Client(
    "http://localhost:15001/ipc",
    token="your-bearer-token"
)

# Method 2: Use environment variable
# export HUGR_TOKEN="your-bearer-token"
client = hugr.Client("http://localhost:15001/ipc")
```

### Role-Based Access

```python
import hugr

# Specify role when user has multiple roles
client = hugr.Client(
    "http://localhost:15001/ipc",
    api_key="your-api-key",
    role="analyst"  # or "admin", "viewer", etc.
)

# Environment variable approach
# export HUGR_ROLE="analyst"
client = hugr.Client("http://localhost:15001/ipc")
```

### Custom Header Names

```python
import os

# Configure custom header names
os.environ['HUGR_API_KEY_HEADER'] = 'X-Custom-API-Key'
os.environ['HUGR_ROLE_HEADER'] = 'X-Custom-Role'

client = hugr.Client(
    "http://localhost:15001/ipc",
    api_key="your-key"
)
```

### OAuth2 Integration

```python
import hugr
import requests

# Obtain OAuth2 token
oauth_response = requests.post(
    "https://auth.example.com/token",
    data={
        "grant_type": "client_credentials",
        "client_id": "your-client-id",
        "client_secret": "your-client-secret"
    }
)

access_token = oauth_response.json()['access_token']

# Use token with hugr client
client = hugr.Client(
    "http://localhost:15001/ipc",
    token=access_token
)
```

## Performance and Optimization

### Arrow IPC vs JSON

The hugr-client uses Apache Arrow IPC format by default, which provides significant performance benefits:

```python
import time
import hugr

client = hugr.Client("http://localhost:15001/ipc")

query = "{ large_dataset { id data } }"

# Arrow IPC (default) - Fast
start = time.time()
data = client.query(query)
df = data.df('data.large_dataset')
arrow_time = time.time() - start
print(f"Arrow IPC: {arrow_time:.2f}s, {len(df)} rows")

# Arrow IPC is typically 5-10x faster than JSON for large datasets
# and uses significantly less memory
```

**Benefits of Arrow IPC**:
- **Speed**: 5-10x faster serialization/deserialization
- **Memory**: Zero-copy reads, lower memory footprint
- **Type Preservation**: Native support for complex types (timestamps, decimals, nested structures)
- **Streaming**: Efficient batch processing for large datasets

### Pagination for Large Queries

```python
import hugr

client = hugr.Client("http://localhost:15001/ipc")

def paginated_query(limit=1000):
    offset = 0
    all_data = []

    while True:
        query = f"""
        query {{
            devices(limit: {limit}, offset: {offset}) {{
                id
                name
                status
            }}
        }}
        """

        data = client.query(query)
        df = data.df('data.devices')

        if len(df) == 0:
            break

        all_data.append(df)
        offset += limit

    return pd.concat(all_data, ignore_index=True)

all_devices = paginated_query()
```

### Client-Side Caching

```python
import hugr
from functools import lru_cache

client = hugr.Client("http://localhost:15001/ipc")

@lru_cache(maxsize=128)
def cached_query(query_string):
    """Cache query results in memory"""
    return client.query(query_string)

# First call - executes query
data1 = cached_query("{ devices { id name } }")

# Second call - returns cached result
data2 = cached_query("{ devices { id name } }")
```

### Server-Side Caching with @cache Directive

```python
import hugr

client = hugr.Client("http://localhost:15001/ipc")

# Use @cache directive in query for server-side caching
query = """
query {
    expensive_aggregation @cache(ttl: 3600, tags: ["analytics"]) {
        total_count
        average_value
        grouped_stats {
            category
            count
        }
    }
}
"""

data = client.query(query)
df = data.df('data.expensive_aggregation')

# Subsequent calls within 1 hour (3600 seconds) will use cached results
```

### Parallel Requests

```python
import hugr
from concurrent.futures import ThreadPoolExecutor
import pandas as pd

client = hugr.Client("http://localhost:15001/ipc")

def query_dataset(dataset_name):
    query = f"{{ {dataset_name} {{ id value }} }}"
    data = client.query(query)
    return data.df(f'data.{dataset_name}')

# Execute multiple queries in parallel
datasets = ['devices', 'sensors', 'readings', 'alerts']

with ThreadPoolExecutor(max_workers=4) as executor:
    results = executor.map(query_dataset, datasets)

devices_df, sensors_df, readings_df, alerts_df = results
```

## API Reference

### Client Class

#### `hugr.Client(url, api_key=None, token=None, role=None)`

Create a synchronous client instance.

**Parameters**:
- `url` (str): Hugr IPC endpoint URL (e.g., "http://localhost:15001/ipc")
- `api_key` (str, optional): API key for authentication
- `token` (str, optional): Bearer token for authentication
- `role` (str, optional): User role when multiple roles are available

**Returns**: Client instance

**Example**:
```python
client = hugr.Client("http://localhost:15001/ipc", api_key="key123")
```

#### `client.query(query, variables=None)`

Execute a GraphQL query.

**Parameters**:
- `query` (str): GraphQL query string
- `variables` (dict, optional): Query variables

**Returns**: QueryResult object

**Example**:
```python
data = client.query("{ devices { id name } }")
```

### QueryResult Class

#### `result.df(path)`

Convert query result to pandas DataFrame.

**Parameters**:
- `path` (str): Dot-notation path to data (e.g., "data.devices")

**Returns**: pandas.DataFrame

**Example**:
```python
df = data.df('data.devices')
```

#### `result.gdf(path, geom_field)`

Convert query result to geopandas GeoDataFrame.

**Parameters**:
- `path` (str): Dot-notation path to data
- `geom_field` (str): Name of geometry field (can be nested, e.g., "devices.geom")

**Returns**: geopandas.GeoDataFrame

**Example**:
```python
gdf = data.gdf('data.devices', 'geom')
```

#### `result.record(path)`

Get query result as Python dictionary.

**Parameters**:
- `path` (str): Dot-notation path to data

**Returns**: dict or list of dicts

**Example**:
```python
records = data.record('data.devices')
```

#### `result.explore_map()`

Open interactive map visualization in Jupyter environment.

**Returns**: Map widget

**Example**:
```python
data.explore_map()
```

### Streaming Client

#### `hugr.stream.connect_stream(url, api_key=None, token=None, role=None)`

Create an async streaming client.

**Parameters**: Same as `hugr.Client`

**Returns**: Async client instance

**Example**:
```python
from hugr.stream import connect_stream
client = connect_stream("http://localhost:15001/ipc")
```

#### `await client.stream(query, variables=None)`

Create a data stream for the query.

**Parameters**: Same as `client.query()`

**Returns**: Async context manager for stream

**Example**:
```python
async with await client.stream(query) as stream:
    async for batch in stream.chunks():
        df = batch.to_pandas()
```

#### Stream Methods

- `stream.chunks()` - Iterate over Arrow RecordBatch objects
- `stream.rows()` - Iterate over individual rows as dicts
- `stream.to_pandas()` - Collect all data into DataFrame
- `client.cancel_current_query()` - Cancel the running query

### Module Functions

#### `hugr.query(query, variables=None)`

Execute query using default connection from environment.

**Environment Variables**:
- `HUGR_URL` - Server URL (required)
- `HUGR_API_KEY` - API key
- `HUGR_TOKEN` - Bearer token
- `HUGR_ROLE` - User role
- `HUGR_API_KEY_HEADER` - Custom API key header name
- `HUGR_ROLE_HEADER` - Custom role header name

**Example**:
```python
import hugr
data = hugr.query("{ devices { id name } }")
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to hugr server

```python
# ConnectionError or timeout
```

**Solutions**:
1. Verify server URL is correct
2. Check server is running: `curl http://localhost:15001/health`
3. Check network connectivity
4. Verify firewall rules

### Authentication Errors

**Problem**: 401 Unauthorized

```python
# requests.exceptions.HTTPError: 401 Client Error
```

**Solutions**:
1. Verify API key or token is correct
2. Check authentication method (API key vs token)
3. Verify custom header names if configured
4. Check role permissions

### Query Errors

**Problem**: GraphQL query fails

```python
# GraphQL error in response
```

**Solutions**:
1. Validate GraphQL syntax
2. Check field names match schema
3. Verify variables format
4. Check access permissions for fields

### DataFrame Conversion Issues

**Problem**: Cannot convert to DataFrame

```python
# KeyError or TypeError when calling df()
```

**Solutions**:
1. Verify path is correct (check with `.record()` first)
2. Ensure query returned data
3. Check for null/None values
4. Use nested path for nested structures

### Geometry Field Issues

**Problem**: Geometry not recognized

```python
# ValueError: geometry column not found
```

**Solutions**:
1. Verify geometry field name
2. Check geometry field contains valid GeoJSON or WKT
3. Use correct path for nested geometry fields
4. Install required dependencies: `pip install geopandas shapely`

### Memory Issues with Large Datasets

**Problem**: Out of memory error

```python
# MemoryError
```

**Solutions**:
1. Use streaming API instead of synchronous client
2. Process data in batches with `stream.chunks()`
3. Add pagination to queries (limit/offset)
4. Use server-side filtering to reduce data size

### Jupyter Integration Issues

**Problem**: Visualizations don't display

**Solutions**:
1. Install widget extensions: `jupyter labextension install @jupyter-widgets/jupyterlab-manager`
2. Enable extensions: `jupyter nbextension enable --py widgetsnbextension`
3. Restart JupyterLab/Notebook kernel
4. Update ipywidgets: `pip install --upgrade ipywidgets`

### Async/Await in Jupyter

**Problem**: Cannot use await in notebook cells

```python
# SyntaxError: 'await' outside async function
```

**Solution**:
```python
# Install nest_asyncio
import nest_asyncio
nest_asyncio.apply()

# Now await works in notebook cells
```

## Best Practices

### 1. Use Environment Variables for Configuration

```python
# Good - use environment variables
import hugr
client = hugr.Client(os.getenv('HUGR_URL'))

# Avoid - hardcoding credentials
client = hugr.Client("http://server", api_key="hardcoded-key")  # Bad
```

### 2. Query Only Needed Fields

```python
# Good - specific fields
query = "{ devices { id name status } }"

# Avoid - querying unnecessary data
query = "{ devices { id name status created_at updated_at metadata } }"
```

### 3. Use Streaming for Large Datasets

```python
# Good - streaming for large data
from hugr.stream import connect_stream
async with await client.stream(query) as stream:
    async for batch in stream.chunks():
        process(batch)

# Avoid - loading large datasets at once
data = client.query(large_query)  # May cause memory issues
```

### 4. Leverage Server-Side Caching

```python
# Good - cache expensive queries
query = """
query {
    analytics @cache(ttl: 3600, tags: ["reports"]) {
        total_count
        aggregated_stats
    }
}
"""
```

### 5. Handle Errors Gracefully

```python
import hugr

try:
    client = hugr.Client("http://localhost:15001/ipc", api_key="key")
    data = client.query("{ devices { id name } }")
    df = data.df('data.devices')
except ConnectionError:
    print("Cannot connect to server")
except Exception as e:
    print(f"Query failed: {e}")
```

### 6. Use Type Hints

```python
from typing import Optional
import pandas as pd
import hugr

def query_devices(client: hugr.Client, status: Optional[str] = None) -> pd.DataFrame:
    query = """
    query GetDevices($status: String) {
        devices(where: {status: {_eq: $status}}) {
            id
            name
            status
        }
    }
    """
    data = client.query(query, variables={"status": status})
    return data.df('data.devices')
```

### 7. Document Your Notebooks

```python
# At the top of Jupyter notebooks:

"""
# Device Analytics Notebook

## Purpose
Analyze device telemetry data and identify anomalies

## Dependencies
- hugr-client >= 0.1.1
- pandas >= 1.3.0
- matplotlib >= 3.4.0

## Setup
export HUGR_URL="http://hugr-server:15001/ipc"
export HUGR_API_KEY="your-api-key"
"""
```

## See Also

- [Hugr IPC Protocol](./3-hugr-ipc.md) - Technical details of the Arrow IPC protocol
- [GraphQL API](./2-graphql.md) - GraphQL query reference
- [JQ Query Endpoint](./5-jq-endpoint.md) - Server-side data transformations
- [Caching Configuration](/docs/deployment/caching) - Server-side caching setup
- [hugr-client Repository](https://github.com/hugr-lab/hugr-client) - Source code and examples
- [Apache Arrow Documentation](https://arrow.apache.org/) - Arrow format details
- [pandas Documentation](https://pandas.pydata.org/) - DataFrame operations
- [geopandas Documentation](https://geopandas.org/) - Geospatial operations
