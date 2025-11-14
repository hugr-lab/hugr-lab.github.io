# Claude Desktop Setup for Hugr MCP

Quick guide to set up Hugr MCP server with Claude Desktop including skills.

## 📦 Download

Choose one of the archives:
- **hugr-mcp-claude-desktop.tar.gz** (48KB) - For Linux/Mac
- **hugr-mcp-claude-desktop.zip** (60KB) - For Windows

## 📥 Installation

### Step 1: Extract Archive

**Linux/Mac:**
```bash
tar -xzf hugr-mcp-claude-desktop.tar.gz
cd mcp
```

**Windows:**
```powershell
Expand-Archive hugr-mcp-claude-desktop.zip
cd mcp
```

### Step 2: Build MCP Server

You'll need Go installed. Then:

```bash
go build -o hugr-mcp-server example_server.go
```

This creates `hugr-mcp-server` executable.

### Step 3: Configure Claude Desktop

**Find config file location:**

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**Add Hugr MCP server:**

```json
{
  "mcpServers": {
    "hugr": {
      "command": "/absolute/path/to/hugr-mcp-server",
      "args": [],
      "env": {
        "HUGR_URL": "http://your-hugr-instance:3000/graphql"
      }
    }
  }
}
```

**Replace:**
- `/absolute/path/to/hugr-mcp-server` - Full path to built executable
- `http://your-hugr-instance:3000/graphql` - Your Hugr GraphQL endpoint

### Step 4: Copy Skills to Claude Desktop

**Copy `.claude` directory to your home:**

**macOS/Linux:**
```bash
cp -r .claude ~/
```

**Windows:**
```powershell
Copy-Item -Recurse .claude $env:USERPROFILE\.claude
```

**Or** place it in your project directory where you'll work with Hugr data.

### Step 5: Restart Claude Desktop

Close and reopen Claude Desktop app.

## ✅ Verify Installation

### Check MCP Server

In Claude Desktop, type:
```
What MCP servers are available?
```

You should see "hugr" in the list.

### Check Resources

```
List available resources
```

You should see:
- `hugr://ai/instructions`
- `hugr://docs/overview`
- `hugr://docs/filters`
- `hugr://docs/aggregations`
- And more...

### Check Prompts

```
What prompts are available?
```

You should see:
- `start` - Auto-routing
- `discovery` - Schema discovery
- `query-building` - Query construction
- `analysis` - Data analysis

### Check Skills

```
/hugr
```

Should load the Hugr Data Assistant skill.

## 🎯 Usage

### Using Skills (Recommended)

**General help:**
```
/hugr
```

**With specific task:**
```
/hugr "What data is available?"
/hugr "Show me orders from last month"
/hugr "Calculate revenue by product category"
```

### Using Prompts Directly

**Auto-routing (recommended):**
```
Please analyze customer churn trends
```

Claude will automatically use the `start` prompt and route to appropriate workflow.

**Specific prompts:**
```
Use discovery prompt to find all sales-related tables
Use query-building to create a query for top 10 customers
Use analysis to examine order distribution by region
```

### Using Resources

**Read documentation:**
```
Read hugr://docs/overview
Read hugr://docs/filters
Read hugr://docs/aggregations
```

## 📂 What's Included

**Archive contents:**

```
mcp/
├── .claude/               # Claude Desktop skills
│   ├── README.md          # Skills documentation
│   └── skills/
│       └── hugr.md        # Hugr Data Assistant
├── resources/             # MCP resources (7 files, ~73KB)
│   ├── ai-instructions.md # AI guide
│   ├── overview.md        # Architecture
│   ├── filter-guide.md    # Filters
│   ├── aggregations.md    # Aggregations
│   ├── data-types.md      # Types & operators
│   ├── schema-structure.md# Schema
│   ├── query-patterns.md  # Patterns
│   └── reference.json     # Metadata
├── prompts/               # MCP prompts (4 files, ~45KB)
│   ├── start.md           # Auto-router
│   ├── discovery.md       # Schema discovery
│   ├── query-building.md  # Query construction
│   ├── analysis.md        # Data analysis
│   └── reference.json     # Metadata
├── example_server.go      # Go implementation
├── README.md              # Full documentation
└── index.md               # Implementation guide
```

**Total size:** ~202KB uncompressed, ~48KB compressed

## 🔧 Customization

### Add Custom Skills

1. Create `.claude/skills/your-skill.md`
2. Add skill documentation with `{{if .task}}` templates
3. Use in Claude Desktop: `/your-skill "task"`

### Add Custom Resources

1. Create `resources/your-resource.md`
2. Add entry to `resources/reference.json`
3. Rebuild server
4. Access as `hugr://docs/your-resource`

### Add Custom Prompts

1. Create `prompts/your-prompt.md`
2. Add entry to `prompts/reference.json` with arguments
3. Rebuild server
4. Use in Claude Desktop

## 🐛 Troubleshooting

### Server Not Showing

- Check config file path is correct
- Verify executable path is absolute
- Check executable has permissions: `chmod +x hugr-mcp-server`
- Check Claude Desktop logs

### Skills Not Working

- Verify `.claude` directory is in home or project directory
- Check file permissions
- Restart Claude Desktop

### Connection Errors

- Verify `HUGR_URL` is correct
- Check Hugr instance is running
- Test connection: `curl $HUGR_URL`

### Resource Not Found

- Check resource URI spelling: `hugr://docs/overview` (not `hugr://overview`)
- Verify server loaded resources correctly
- Check server logs

## 📖 Documentation

- **Full MCP docs:** See `README.md`
- **Implementation guide:** See `index.md`
- **Skills guide:** See `.claude/README.md`
- **Online docs:** https://github.com/hugr-lab/hugr

## 🔗 Links

- [Hugr](https://github.com/hugr-lab/hugr)
- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)

## 💡 Tips

**Best Practices:**
- Start with `/hugr` skill for user-friendly interface
- Use `start` prompt for automatic routing
- Always introspect schema before building queries
- Read resources when you need reference information

**Common Workflows:**

1. **Explore schema:**
   ```
   /hugr "What tables are available?"
   ```

2. **Build query:**
   ```
   /hugr "Get active customers with orders > $1000"
   ```

3. **Analyze data:**
   ```
   /hugr "What's the revenue trend by month?"
   ```

4. **Complex analysis:**
   ```
   /hugr "Find customer segments by purchase behavior"
   ```

**Remember:** Claude will automatically discover schema, build queries, and analyze results using MCP tools!
