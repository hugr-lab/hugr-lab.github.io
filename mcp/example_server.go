package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// Embed files for production deployment
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

// SetupResources registers all resources from resources/reference.json
func SetupResources(srv *server.MCPServer, resourcesPath string) error {
	// Read resources metadata
	refData, err := os.ReadFile(filepath.Join(resourcesPath, "reference.json"))
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
			content, err := os.ReadFile(filepath.Join(resourcesPath, filename))
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

// SetupPrompts registers all prompts from prompts/reference.json
func SetupPrompts(srv *server.MCPServer, promptsPath string) error {
	// Read prompts metadata
	refData, err := os.ReadFile(filepath.Join(promptsPath, "reference.json"))
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
			// Read template
			template, err := os.ReadFile(filepath.Join(promptsPath, filename))
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

// NewHugrMCPServer creates a new Hugr MCP server with resources and prompts
func NewHugrMCPServer(mcpPath string) (*server.MCPServer, error) {
	// Create server with capabilities
	srv := server.NewMCPServer(
		"hugr-mcp-server",
		"1.0.0",
		server.WithResourceCapabilities(false, true), // subscribe=false, listChanged=true
		server.WithPromptCapabilities(true),          // listChanged=true
		server.WithResourceRecovery(),                // recover from panics
	)

	// Setup resources
	resourcesPath := filepath.Join(mcpPath, "resources")
	if err := SetupResources(srv, resourcesPath); err != nil {
		return nil, fmt.Errorf("failed to setup resources: %w", err)
	}

	// Setup prompts
	promptsPath := filepath.Join(mcpPath, "prompts")
	if err := SetupPrompts(srv, promptsPath); err != nil {
		return nil, fmt.Errorf("failed to setup prompts: %w", err)
	}

	return srv, nil
}

// Example usage
func main() {
	// Path to mcp directory
	mcpPath := "./mcp"

	// Create server
	srv, err := NewHugrMCPServer(mcpPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create server: %v\n", err)
		os.Exit(1)
	}

	// Start server (example with stdio transport)
	// You can also use SSE or WebSocket transports
	ctx := context.Background()

	// For stdio transport:
	// transport := server.NewStdioServerTransport()
	// if err := srv.Serve(ctx, transport); err != nil {
	//     fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
	//     os.Exit(1)
	// }

	fmt.Println("Hugr MCP Server configured successfully!")
	fmt.Printf("Resources: 4\n")
	fmt.Printf("Prompts: 3\n")
	fmt.Println("\nServer ready to start with transport (stdio/sse/websocket)")
}
