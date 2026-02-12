# Hugr MCP Server Resources & Prompts

This directory contains resources and prompts for the Hugr Model Context Protocol (MCP) server.

## Structure

```
mcp/
├── index.md              # This file
├── resources/            # Static reference documentation
│   ├── reference.json    # Resource metadata (filename, name, description, URI)
│   ├── index.md          # Documentation index and navigation
│   ├── r-overview.md     # Architecture and core concepts
│   ├── r-schema-structure.md  # Type system and introspection
│   └── r-query-patterns.md    # Common GraphQL patterns
└── prompts/              # Interactive workflow templates
    ├── reference.json    # Prompt metadata (filename, name, description, arguments)
    ├── discovery.md      # Schema discovery workflow template
    ├── query-building.md # Query construction guide template
    └── analysis.md       # Iterative analysis workflow template
```

## Resources (Static Documentation)

Resources are **read-only reference materials** that provide context to LLMs.

### Available Resources

Load `resources/reference.json` to get:
- `filename` - File to read
- `name` - Resource display name
- `description` - What this resource contains
- `uri` - URI for MCP resource registration

### Usage in mcp-go

```go
// Load resource metadata
type ResourceMeta struct {
    Filename    string `json:"filename"`
    Name        string `json:"name"`
    Description string `json:"description"`
    URI         string `json:"uri"`
}

resourceMeta := []ResourceMeta{}
json.Unmarshal(resourcesReferenceJSON, &resourceMeta)

// Register each resource
for _, meta := range resourceMeta {
    filename := meta.Filename
    resource := mcp.NewResource(
        meta.URI,
        meta.Name,
        mcp.WithResourceDescription(meta.Description),
        mcp.WithMIMEType("text/markdown"),
    )

    srv.AddResource(resource, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
        content, err := os.ReadFile(filepath.Join(resourcesPath, filename))
        if err != nil {
            return nil, err
        }

        return []mcp.ResourceContents{
            mcp.TextResourceContents{
                URI:      request.Params.URI,
                MIMEType: "text/markdown",
                Text:     string(content),
            },
        }, nil
    })
}
```

## Prompts (Interactive Templates)

Prompts are **parametrized workflow instructions** that guide LLMs through specific tasks.

### Template Syntax

Prompts use Handlebars-style placeholders:

```handlebars
{{#if task}}
## Current Task

**Objective:** {{task}}

**Instructions:**
...
{{/if}}
```

### Available Prompts

Load `prompts/reference.json` to get:
- `filename` - Template file to read
- `name` - Prompt name (for MCP registration)
- `description` - What this prompt does
- `arguments` - Array of argument definitions
  - `name` - Argument name
  - `description` - What this argument is for
  - `required` - Boolean (all are `false` - optional)

### Usage in mcp-go

```go
// Load prompt metadata
type PromptArgument struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Required    bool   `json:"required"`
}

type PromptMeta struct {
    Filename    string           `json:"filename"`
    Name        string           `json:"name"`
    Description string           `json:"description"`
    Arguments   []PromptArgument `json:"arguments"`
}

promptMeta := []PromptMeta{}
json.Unmarshal(promptsReferenceJSON, &promptMeta)

// Register each prompt
for _, meta := range promptMeta {
    filename := meta.Filename

    // Build prompt definition
    promptOpts := []mcp.PromptOption{
        mcp.WithPromptDescription(meta.Description),
    }

    for _, arg := range meta.Arguments {
        argOpts := []mcp.PromptArgumentOption{
            mcp.ArgumentDescription(arg.Description),
        }
        if arg.Required {
            argOpts = append(argOpts, mcp.RequiredArgument())
        }
        promptOpts = append(promptOpts, mcp.WithArgument(arg.Name, argOpts...))
    }

    prompt := mcp.NewPrompt(meta.Name, promptOpts...)

    srv.AddPrompt(prompt, func(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
        // Read template
        template, err := os.ReadFile(filepath.Join(promptsPath, filename))
        if err != nil {
            return nil, err
        }

        // Render template with arguments
        rendered := renderTemplate(string(template), request.Params.Arguments)

        return &mcp.GetPromptResult{
            Description: meta.Description,
            Messages: []mcp.PromptMessage{
                {
                    Role: mcp.RoleUser,
                    Content: mcp.TextContent{
                        Type: "text",
                        Text: rendered,
                    },
                },
            },
        }, nil
    })
}
```

### Template Rendering

Simple Handlebars-style template renderer:

```go
func renderTemplate(template string, args map[string]any) string {
    result := template

    // Handle {{#if task}}...{{/if}}
    for key, value := range args {
        if value != nil && value != "" {
            // Remove {{#if key}} and {{/if}}
            result = strings.ReplaceAll(result, "{{#if "+key+"}}", "")
            result = strings.ReplaceAll(result, "{{/if}}", "")

            // Replace {{key}} with value
            result = strings.ReplaceAll(result, "{{"+key+"}}", fmt.Sprint(value))
        } else {
            // Remove entire {{#if key}}...{{/if}} block
            re := regexp.MustCompile(`(?s)\{\{#if ` + key + `\}\}.*?\{\{/if\}\}`)
            result = re.ReplaceAllString(result, "")
        }
    }

    return result
}
```

## Use Cases

### 1. Data Analysis
```
User: /analysis task="analyze customer distribution by region"
```
→ Returns analysis.md with task context

### 2. Query Building
```
User: /query-building task="get top 10 products by revenue"
```
→ Returns query-building.md with task context

### 3. Schema Discovery
```
User: /discovery task="find all order-related tables"
```
→ Returns discovery.md with task context

### 4. Reference Documentation
```
User: Read resource hugr://docs/overview
```
→ Returns r-overview.md as static content

## Server Capabilities

Enable these capabilities when creating the server:

```go
srv := server.NewMCPServer(
    "hugr-mcp-server",
    "1.0.0",
    server.WithResourceCapabilities(false, true), // subscribe=false, listChanged=true
    server.WithPromptCapabilities(true),          // listChanged=true
)
```

## File Sizes

- **Resources:** ~12KB total (small reference docs)
- **Prompts:** ~28KB total (detailed workflow guides)
- **Total:** ~40KB (well within MCP limits)

All prompts are optional - can be called without arguments for full guides or with `task` argument for specific objectives.

## Embed Support

For production deployment, use `//go:embed` to bundle files:

```go
//go:embed resources/*.md resources/*.json prompts/*.md prompts/*.json
var mcpFS embed.FS

// Read files
content, err := mcpFS.ReadFile("resources/r-overview.md")
```

This eliminates external file dependencies.
