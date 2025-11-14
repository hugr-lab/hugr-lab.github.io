# Claude Skills for Hugr

This directory contains Claude Desktop skills for working with Hugr data.

## What are Skills?

Skills are reusable prompt templates that guide Claude through specific workflows. They provide:
- Context about the domain
- Workflow instructions
- Best practices
- Example usage

## Available Skills

### `hugr` - Hugr Data Assistant

**Purpose:** Work with Hugr unified GraphQL API - explore schemas, build queries, analyze data.

**Usage in Claude Desktop:**
```
# Invoke skill
/hugr

# Invoke with task
/hugr "Show me top products by revenue"
```

**Features:**
- Auto-routing to appropriate MCP prompts
- Lazy schema introspection
- GraphQL query building
- Data analysis with jq transformations

**Workflow:**
1. User makes a request
2. Skill analyzes task type
3. Uses MCP server (discovery/query-building/analysis)
4. Returns structured results

**Requirements:**
- Hugr MCP server configured in Claude Desktop
- Access to Hugr instance

## How Skills Work

**Skill file structure:**
```markdown
# Skill Name

Description and context...

## How It Works
Workflow explanation...

## Your Task
{{if .task}}
Task-specific instructions...
{{else}}
General guidance...
{{end}}
```

**Template variables:**
- `{{if .task}}...{{end}}` - Conditional content
- `{{.task}}` - User's request/task
- Other variables as defined

**Claude Desktop integration:**
1. Place skill files in `.claude/skills/`
2. Invoke with `/skill-name` or `/skill-name "task description"`
3. Claude loads skill context and follows workflow

## Skill vs MCP Prompts

**Skills** (this directory):
- User-facing interface
- Simplified workflow
- Can invoke MCP prompts
- Lives in project repository

**MCP Prompts** (`/mcp/prompts/`):
- Server-provided workflows
- Detailed task-specific guidance
- Uses MCP tools
- Served by MCP server

**Relationship:**
```
User → /hugr skill → MCP server → start/discovery/query-building/analysis prompts
```

## Creating Custom Skills

1. Create `.claude/skills/your-skill.md`
2. Add skill documentation:
   - Purpose and context
   - Workflow explanation
   - Task handling
   - Examples

3. Use template syntax:
```markdown
{{if .task}}
**Task:** {{.task}}
Working on it...
{{else}}
Ready to help!
{{end}}
```

4. Test in Claude Desktop:
```
/your-skill "test task"
```

## Best Practices

**Keep skills focused:**
- One skill per domain/workflow
- Clear purpose and scope
- Concise documentation

**Use template variables:**
- `{{.task}}` - Main task/request
- `{{if .variable}}` - Conditional sections
- Custom variables as needed

**Integrate with MCP:**
- Reference MCP resources
- Invoke MCP prompts when appropriate
- Use MCP tools for data access

**Be user-friendly:**
- Natural language instructions
- Clear examples
- Helpful error messages

## Examples

**Basic skill invocation:**
```
/hugr
```

**Skill with task:**
```
/hugr "Find all customers with orders > $1000"
```

**Skill in conversation:**
```
User: "Can you help me analyze our sales data?"
Claude: [Loads hugr skill context]
         "Sure! What would you like to analyze?"
User: "Revenue by region"
Claude: [Uses MCP discovery → builds query → analyzes]
```

## Links

- [Hugr MCP Documentation](../mcp/README.md)
- [Claude Desktop Skills Docs](https://docs.anthropic.com/claude/docs)
- [MCP Specification](https://modelcontextprotocol.io)

## Contributing

To improve skills:
1. Edit markdown files in `.claude/skills/`
2. Test in Claude Desktop
3. Submit PR with examples

Keep skills concise and user-focused!
