# Hugr MCP Server Resources & Prompts

Complete implementation package for [Hugr](https://github.com/hugr-lab/hugr) Model Context Protocol (MCP) server.

## 📁 Directory Structure

```
mcp/
├── README.md              # This file
├── index.md               # Detailed implementation guide
├── example_server.go      # Complete Go implementation example
├── resources/             # Static reference documentation
│   ├── reference.json     # Resource metadata (5 resources)
│   ├── ai-instructions.md # ⭐ AI assistant guide (9.2KB)
│   ├── overview.md        # Hugr architecture (3.4KB)
│   ├── data-types.md      # Operators, functions, errors (16.8KB)
│   ├── schema-structure.md# Type system (5.9KB)
│   └── query-patterns.md  # GraphQL patterns (10.7KB)
└── prompts/               # Interactive workflow templates
    ├── reference.json     # Prompt metadata (4 prompts)
    ├── start.md           # ⭐ Auto-routing (4.9KB)
    ├── discovery.md       # Schema discovery (13.3KB)
    ├── query-building.md  # Query construction (10.7KB)
    └── analysis.md        # Iterative analysis (16.1KB)
```

**Total size:** ~91KB

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
| `hugr://ai/instructions` | **AI Instructions** ⭐ | **How to work with Hugr MCP** (for AI assistants) | 9.2KB |
| `hugr://docs/overview` | Hugr Overview | Architecture, modules, RLS | 3.4KB |
| `hugr://docs/data-types` | Data Types | Filter operators, aggregations, errors | 16.8KB |
| `hugr://docs/schema` | Schema Structure | Types, introspection, filters | 5.9KB |
| `hugr://docs/patterns` | Query Patterns | GraphQL examples, anti-patterns | 10.7KB |

**⭐ Special Resource: `hugr://ai/instructions`**

This resource teaches AI assistants:
- **When** to use Hugr MCP (automatic trigger detection)
- **How** to work with prompts (decision tree, routing)
- **What** workflow to follow (read overview → use start prompt → follow instructions)

AI models should read this resource first when user asks about data.

### Usage in Claude

```
Read resource hugr://docs/overview
```

## 🎯 Prompts (Workflow Templates)

Prompts guide LLMs through **specific tasks** with optional parameters.

### Available Prompts

| Name | Description | Arguments | Size |
|------|-------------|-----------|------|
| **`start`** ⭐ | **Router - auto-classifies & routes to specialized prompts** | `task` (optional) | 4.9KB |
| `discovery` | Schema discovery workflow | `task` (optional) | 13.3KB |
| `query-building` | Query construction guide | `task` (optional) | 10.9KB |
| `analysis` | Iterative analysis workflow | `task` (optional) | 17.6KB |

**⭐ Main Entry Point: `start` prompt**

The `start` prompt automatically:
1. Analyzes user's request
2. Classifies task type (analysis / discovery / query-building)
3. Routes to appropriate specialized prompt

AI assistants should use `start` prompt for any data-related request.

### Usage in Claude

**Recommended: Use start prompt** (auto-routing):
```
User: "Show me top customers by revenue"
Assistant: [Invokes start prompt with task]
→ start classifies → routes to analysis → completes task
```

**Direct prompt usage** (when you know which one):
```
/discovery task="find all tables related to orders"
/query-building task="get top 10 products by revenue"
/analysis task="analyze customer distribution by region"
```

**Without parameters** (get full guide):
```
/start
/discovery
/query-building
/analysis
```

## 🔧 Implementation Details

### Template Rendering

Prompts use **Go text/template** syntax:

```markdown
{{if .task}}
## Current Task

**Objective:** {{.task}}

**Instructions:**
...
{{end}}
```

The `renderTemplate()` function in `example_server.go`:
- Uses Go's `text/template` package
- Replaces `{{.variable}}` with value from arguments
- Shows/hides `{{if .variable}}...{{end}}` blocks based on value
- Access arguments with dot prefix: `.task`, `.module`, etc.

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

### 1. Automatic Routing (Recommended)

```
User: "Show me top products by revenue last month"

Claude Desktop:
1. Sees data-related request
2. Reads hugr://ai/instructions
3. Learns to use start prompt
4. Invokes start(task: "Show me top products by revenue last month")
5. start analyzes → routes to analysis prompt
6. analysis guides through full workflow
7. User gets results
```

### 2. Data Analysis

```
User: "Analyze customer churn trends"

Claude:
→ Invokes start prompt
→ Routes to analysis prompt
→ Completes iterative analysis workflow
```

### 3. Schema Discovery

```
User: "What customer data is available?"

Claude:
→ Invokes start prompt
→ Routes to discovery prompt
→ Uses MCP tools to introspect schema
→ Reports available tables and fields
```

### 4. Query Building

```
User: "Build a query for active users with purchases > $1000"

Claude:
→ Invokes start prompt
→ Routes to query-building prompt
→ Constructs validated GraphQL query
→ Returns ready-to-use query
```

### 5. Reference Lookup

```
User: "How does module hierarchy work?"

Claude:
→ Reads hugr://docs/overview
→ Explains architecture
```

## 🤖 AI Assistant Integration

### How Claude Desktop Uses This

1. **MCP Server provides:**
   - Resources (documentation)
   - Prompts (workflow templates)
   - Tools (schema introspection, query execution)

2. **Claude Desktop discovers:**
   - Lists resources → sees `hugr://ai/instructions` with ⭐ marker
   - Lists prompts → sees `start` prompt as main entry point

3. **User asks data question:**
   - Claude reads `hugr://ai/instructions`
   - Learns when/how to use Hugr MCP
   - Invokes `start` prompt
   - Follows specialized prompt instructions

4. **Result:**
   - User gets insights without knowing MCP details
   - No manual prompt selection needed
   - Automatic schema discovery
   - Validated queries
   - Professional analysis

### Configuration Tips

**Make `ai-instructions` discoverable:**
- Put it first in `resources/reference.json`
- Use ⭐ marker in description
- Mention "START HERE" or "READ FIRST"

**Make `start` prompt obvious:**
- Put it first in `prompts/reference.json`
- Use "Main entry point" in description
- Reference it in other resources

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

- **Resources:** 5 files, ~46KB
  - ai-instructions.md (9.2KB) - AI assistant guide ⭐
  - overview.md (3.4KB) - Architecture
  - data-types.md (16.8KB) - Operators, functions & error reference
  - schema-structure.md (5.9KB) - Type system
  - query-patterns.md (10.7KB) - Patterns & anti-patterns
- **Prompts:** 4 files, ~45KB
  - start.md (4.9KB) - Auto-routing ⭐
  - discovery.md (13.3KB) - Schema discovery
  - query-building.md (10.7KB) - Query construction
  - analysis.md (16.1KB) - Iterative analysis
- **Total:** ~91KB (compact for comprehensive MCP package)
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
