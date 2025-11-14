# Hugr MCP Server Resources & Prompts

Complete implementation package for [Hugr](https://github.com/hugr-lab/hugr) Model Context Protocol (MCP) server.

## 📁 Directory Structure

```
mcp/
├── README.md              # This file
├── index.md               # Detailed implementation guide
├── example_server.go      # Complete Go implementation example
├── resources/             # Static reference documentation
│   ├── reference.json     # Resource metadata (4 resources)
│   ├── index.md           # Documentation index
│   ├── r-overview.md      # Hugr architecture (2.9KB)
│   ├── r-schema-structure.md  # Type system (5.3KB)
│   └── r-query-patterns.md    # GraphQL patterns (3.9KB)
└── prompts/               # Interactive workflow templates
    ├── reference.json     # Prompt metadata (3 prompts)
    ├── discovery.md       # Schema discovery (7.4KB)
    ├── query-building.md  # Query construction (6.5KB)
    └── analysis.md        # Iterative analysis (14.2KB)
```

**Total size:** ~40KB

## 🚀 Quick Start

### 1. Install Dependencies

```bash
go get github.com/mark3labs/mcp-go
```

### 2. Use Example Server

```go
package main

import (
    "context"
    "os"

    // Import the example (or copy example_server.go to your project)
)

func main() {
    // Create server
    srv, err := NewHugrMCPServer("./mcp")
    if err != nil {
        panic(err)
    }

    // Start with stdio transport (for Claude Desktop)
    ctx := context.Background()
    transport := server.NewStdioServerTransport()

    if err := srv.Serve(ctx, transport); err != nil {
        os.Exit(1)
    }
}
```

### 3. Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hugr": {
      "command": "/path/to/your/hugr-mcp-server",
      "args": []
    }
  }
}
```

## 📚 Resources (Static Documentation)

Resources provide **reference material** for LLMs to understand Hugr.

### Available Resources

| URI | Name | Description | Size |
|-----|------|-------------|------|
| `hugr://docs/index` | Documentation Index | Navigation guide | 1.9KB |
| `hugr://docs/overview` | Hugr Overview | Architecture, modules, RLS | 2.9KB |
| `hugr://docs/schema` | Schema Structure | Types, introspection, filters | 5.3KB |
| `hugr://docs/patterns` | Query Patterns | GraphQL examples | 3.9KB |

### Usage in Claude

```
Read resource hugr://docs/overview
```

## 🎯 Prompts (Workflow Templates)

Prompts guide LLMs through **specific tasks** with optional parameters.

### Available Prompts

| Name | Description | Arguments | Size |
|------|-------------|-----------|------|
| `discovery` | Schema discovery workflow | `task` (optional) | 7.4KB |
| `query-building` | Query construction guide | `task` (optional) | 6.5KB |
| `analysis` | Iterative analysis workflow | `task` (optional) | 14.2KB |

### Usage in Claude

**Without parameters** (full guide):
```
/discovery
```

**With task parameter**:
```
/discovery task="find all tables related to orders"
/query-building task="get top 10 products by revenue"
/analysis task="analyze customer distribution by region"
```

## 🔧 Implementation Details

### Template Rendering

Prompts use Handlebars-style syntax:

```markdown
{{#if task}}
## Current Task

**Objective:** {{task}}

**Instructions:**
...
{{/if}}
```

The `renderTemplate()` function in `example_server.go`:
- Replaces `{{variable}}` with value
- Shows/hides `{{#if variable}}...{{/if}}` blocks based on value

### Metadata Files

**resources/reference.json:**
```json
[
  {
    "filename": "r-overview.md",
    "name": "Hugr Overview",
    "description": "Architecture overview...",
    "uri": "hugr://docs/overview"
  }
]
```

**prompts/reference.json:**
```json
[
  {
    "filename": "discovery.md",
    "name": "discovery",
    "description": "Schema discovery workflow...",
    "arguments": [
      {
        "name": "task",
        "description": "Discovery objective...",
        "required": false
      }
    ]
  }
]
```

### Automatic Registration

The example server reads JSON metadata and automatically registers all resources and prompts:

```go
// Load and register resources
SetupResources(srv, "./mcp/resources")

// Load and register prompts
SetupPrompts(srv, "./mcp/prompts")
```

## 📦 Production Deployment

### Option 1: Embed Files

```go
import _ "embed"

//go:embed resources/*.md resources/*.json prompts/*.md prompts/*.json
var mcpFS embed.FS

// Read files from embedded FS
content, err := mcpFS.ReadFile("resources/r-overview.md")
```

### Option 2: Bundle Directory

Include entire `mcp/` directory with your binary and use relative paths.

## 🎨 Customization

### Add New Resource

1. Create `resources/my-resource.md`
2. Add entry to `resources/reference.json`:
```json
{
  "filename": "my-resource.md",
  "name": "My Resource",
  "description": "Description here",
  "uri": "hugr://docs/my-resource"
}
```
3. Restart server (auto-registered)

### Add New Prompt

1. Create `prompts/my-prompt.md` with template
2. Add entry to `prompts/reference.json`:
```json
{
  "filename": "my-prompt.md",
  "name": "my-prompt",
  "description": "Description here",
  "arguments": [
    {
      "name": "param1",
      "description": "Parameter description",
      "required": false
    }
  ]
}
```
3. Restart server (auto-registered)

## 📖 Use Cases

### 1. Data Analysis

```
User: /analysis task="analyze sales trends over the last year"
```

Model receives:
- Full analysis workflow guide
- Specific task context
- Iterative process instructions

### 2. Query Building

```
User: /query-building task="get active customers with purchases > $1000"
```

Model receives:
- Query construction guidelines
- Performance optimization tips
- Specific requirement to implement

### 3. Schema Discovery

```
User: /discovery task="find all tables in sales module"
```

Model receives:
- Discovery workflow steps
- MCP tools documentation
- Specific discovery objective

### 4. Reference Lookup

```
User: What's the module hierarchy structure in Hugr?
Assistant: Let me check the documentation...
[Reads hugr://docs/overview]
```

## 🔍 Testing

### Test Resources

```bash
# List all resources
curl http://localhost:3000/mcp/resources/list

# Read specific resource
curl http://localhost:3000/mcp/resources/read?uri=hugr://docs/overview
```

### Test Prompts

```bash
# List all prompts
curl http://localhost:3000/mcp/prompts/list

# Get prompt without arguments
curl http://localhost:3000/mcp/prompts/get?name=discovery

# Get prompt with arguments
curl http://localhost:3000/mcp/prompts/get?name=discovery&task=find%20orders
```

## 📊 Statistics

- **Resources:** 4 files, ~12KB
- **Prompts:** 3 files, ~28KB
- **Total:** ~40KB (ideal for MCP)
- **Languages:** Markdown (docs), JSON (metadata), Go (implementation)

## 🔗 Links

- [Hugr Documentation](https://github.com/hugr-lab/hugr)
- [MCP Specification](https://modelcontextprotocol.io)
- [mcp-go Library](https://github.com/mark3labs/mcp-go)
- [Implementation Guide](./index.md)

## 📝 License

Same as Hugr project.

## 🤝 Contributing

To add or improve resources/prompts:

1. Edit markdown files in `resources/` or `prompts/`
2. Update corresponding `reference.json`
3. Test with example server
4. Submit PR

Keep resources concise and prompts focused on specific workflows!
