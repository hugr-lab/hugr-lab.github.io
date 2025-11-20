package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// Embed all MCP files into the binary
//go:embed resources/*.md resources/*.json prompts/*.md prompts/*.json
var mcpFS embed.FS

// ResourceMeta represents metadata for a resource
type ResourceMeta struct {
	Filename    string `json:"filename"`
	Name        string `json:"name"`
	Description string `json:"description"`
	URI         string `json:"uri"`
}

// PromptArgument represents a prompt argument definition
type PromptArgument struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
}

// PromptMeta represents metadata for a prompt
type PromptMeta struct {
	Filename    string           `json:"filename"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Arguments   []PromptArgument `json:"arguments"`
}

// SetupEmbeddedResources registers all resources from embedded files
func SetupEmbeddedResources(srv *server.MCPServer) error {
	// Read embedded resources metadata
	refData, err := mcpFS.ReadFile("resources/reference.json")
	if err != nil {
		return fmt.Errorf("failed to read resources/reference.json: %w", err)
	}

	var resourceMeta []ResourceMeta
	if err := json.Unmarshal(refData, &resourceMeta); err != nil {
		return fmt.Errorf("failed to parse resources/reference.json: %w", err)
	}

	// Register each resource
	for _, meta := range resourceMeta {
		filename := meta.Filename // capture for closure

		resource := mcp.NewResource(
			meta.URI,
			meta.Name,
			mcp.WithResourceDescription(meta.Description),
			mcp.WithMIMEType("text/markdown"),
		)

		srv.AddResource(resource, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			// Read from embedded FS
			content, err := mcpFS.ReadFile("resources/" + filename)
			if err != nil {
				return nil, fmt.Errorf("failed to read %s: %w", filename, err)
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

	return nil
}

// SetupEmbeddedPrompts registers all prompts from embedded files
func SetupEmbeddedPrompts(srv *server.MCPServer) error {
	// Read embedded prompts metadata
	refData, err := mcpFS.ReadFile("prompts/reference.json")
	if err != nil {
		return fmt.Errorf("failed to read prompts/reference.json: %w", err)
	}

	var promptMeta []PromptMeta
	if err := json.Unmarshal(refData, &promptMeta); err != nil {
		return fmt.Errorf("failed to parse prompts/reference.json: %w", err)
	}

	// Register each prompt
	for _, meta := range promptMeta {
		filename := meta.Filename       // capture for closure
		description := meta.Description // capture for closure

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
			// Read template from embedded FS
			template, err := mcpFS.ReadFile("prompts/" + filename)
			if err != nil {
				return nil, fmt.Errorf("failed to read %s: %w", filename, err)
			}

			// Render template with arguments
			rendered := renderTemplate(string(template), request.Params.Arguments)

			return &mcp.GetPromptResult{
				Description: description,
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

	return nil
}

// renderTemplate renders a Handlebars-style template with arguments
// Supports: {{variable}} and {{#if variable}}...{{/if}}
func renderTemplate(template string, args map[string]any) string {
	result := template

	// Process each argument
	for key, value := range args {
		valueStr := fmt.Sprint(value)

		// Check if value is non-empty
		hasValue := value != nil && valueStr != ""

		if hasValue {
			// Remove {{#if key}} and {{/if}} markers
			result = strings.ReplaceAll(result, "{{#if "+key+"}}", "")
			result = strings.ReplaceAll(result, "{{/if}}", "")

			// Replace {{key}} with value
			result = strings.ReplaceAll(result, "{{"+key+"}}", valueStr)
		} else {
			// Remove entire {{#if key}}...{{/if}} block
			re := regexp.MustCompile(`(?s)\{\{#if ` + regexp.QuoteMeta(key) + `\}\}.*?\{\{/if\}\}`)
			result = re.ReplaceAllString(result, "")
		}
	}

	return result
}

// NewEmbeddedHugrMCPServer creates a Hugr MCP server with embedded resources
func NewEmbeddedHugrMCPServer() (*server.MCPServer, error) {
	// Create server with capabilities
	srv := server.NewMCPServer(
		"hugr-mcp-server",
		"1.0.0",
		server.WithResourceCapabilities(false, true), // subscribe=false, listChanged=true
		server.WithPromptCapabilities(true),          // listChanged=true
		server.WithResourceRecovery(),                // recover from panics
	)

	// Setup embedded resources
	if err := SetupEmbeddedResources(srv); err != nil {
		return nil, fmt.Errorf("failed to setup resources: %w", err)
	}

	// Setup embedded prompts
	if err := SetupEmbeddedPrompts(srv); err != nil {
		return nil, fmt.Errorf("failed to setup prompts: %w", err)
	}

	return srv, nil
}

// Example usage with embedded files
func main() {
	// Create server with embedded resources/prompts
	srv, err := NewEmbeddedHugrMCPServer()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create server: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()

	// For stdio transport (Claude Desktop):
	// transport := server.NewStdioServerTransport()
	// if err := srv.Serve(ctx, transport); err != nil {
	//     fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
	//     os.Exit(1)
	// }

	// For SSE transport (web):
	// transport := server.NewSSEServerTransport("localhost:3000")
	// if err := srv.Serve(ctx, transport); err != nil {
	//     fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
	//     os.Exit(1)
	// }

	fmt.Println("Hugr MCP Server (embedded) configured successfully!")
	fmt.Println("All resources and prompts are embedded in the binary.")
	fmt.Printf("Resources: 4 (embedded)\n")
	fmt.Printf("Prompts: 3 (embedded)\n")
	fmt.Println("\nBuild with: go build -o hugr-mcp-server")
	fmt.Println("Binary will be self-contained with no external dependencies.")
}
