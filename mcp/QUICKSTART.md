# Quick Start: Making Claude Use Hugr MCP Automatically

**For End Users:** How to configure Claude Desktop to automatically use Hugr MCP for data queries.

---

## 🎯 Goal

Make Claude automatically:
1. Detect when you ask about data
2. Read instructions on how to use Hugr
3. Use the right prompts
4. Give you data insights

**Without you having to tell Claude what to do!**

---

## ✅ What You Need

1. **Hugr MCP Server** running and configured in Claude Desktop
2. **This MCP package** (ai-instructions.md + start.md + other prompts/resources)

---

## 🚀 How It Works

### The Magic Files

This MCP package includes two special files that teach Claude how to work with Hugr:

1. **`resources/ai-instructions.md`**
   - URI: `hugr://ai/instructions`
   - Teaches Claude WHEN and HOW to use Hugr MCP
   - Listed FIRST in resources (with ⭐ marker)

2. **`prompts/start.md`**
   - Auto-routing prompt
   - Analyzes your question
   - Calls the right specialized prompt
   - Listed FIRST in prompts (with ⭐ marker)

### What Happens When You Ask About Data

```
You: "Show me top products by revenue last month"

Claude Desktop (automatically):
1. Lists available MCP resources
2. Sees "hugr://ai/instructions" with ⭐ START HERE ⭐
3. Reads it → learns:
   - When to use Hugr (data questions)
   - How to start (read overview, use start prompt)
   - What workflow to follow
4. Reads hugr://docs/overview
5. Invokes start prompt with your question
6. start prompt analyzes → routes to analysis prompt
7. analysis prompt guides through full workflow
8. You get your answer!
```

---

## 🔧 Configuration Checklist

### 1. MCP Server Configuration

Your `claude_desktop_config.json` should have:

```json
{
  "mcpServers": {
    "hugr": {
      "command": "/path/to/hugr-mcp-server",
      "args": []
    }
  }
}
```

### 2. Resource Order (Important!)

In `mcp/resources/reference.json`, make sure `ai-instructions.md` is **FIRST**:

```json
{
  "ai-instructions.md": {
    "name": "AI Assistant Instructions",
    "description": "⭐ START HERE ⭐ Complete guide for AI assistants...",
    "uri": "hugr://ai/instructions"
  },
  ...
}
```

### 3. Prompt Order (Important!)

In `mcp/prompts/reference.json`, make sure `start.md` is **FIRST**:

```json
{
  "start.md": {
    "name": "start",
    "description": "Main entry point - automatically routes user requests...",
    ...
  },
  ...
}
```

### 4. Use Clear Markers

Both files use ⭐ markers and "START HERE" / "Main entry point" to signal importance to Claude.

---

## 💬 Testing

### Test 1: First Data Question

```
You: "How many users do we have?"

Expected: Claude should automatically:
- Read ai-instructions
- Read overview
- Invoke start prompt
- Complete the task
```

### Test 2: Complex Analysis

```
You: "Analyze customer churn over the last 6 months"

Expected: Claude should:
- Use start prompt
- Route to analysis prompt
- Discover schema
- Build queries
- Analyze data
- Present insights
```

### Test 3: Schema Questions

```
You: "What customer data is available?"

Expected: Claude should:
- Use start prompt
- Route to discovery prompt
- Introspect schema
- Report findings
```

---

## 🐛 Troubleshooting

### Problem: Claude doesn't use Hugr automatically

**Check:**
- [ ] MCP server is running (`ps aux | grep hugr-mcp`)
- [ ] Claude Desktop sees MCP server (restart Claude Desktop)
- [ ] `ai-instructions.md` is first in resources/reference.json
- [ ] `start.md` is first in prompts/reference.json
- [ ] Descriptions have ⭐ markers

### Problem: Claude reads instructions but doesn't follow them

**Try:**
- Make the description more explicit: "⭐ READ THIS FIRST ⭐"
- Ensure overview.md has "Use start prompt" instruction
- Check if Claude is seeing updated files (restart MCP server)

### Problem: Claude uses wrong prompt

**This is OK!** The start prompt should catch this, but if Claude goes directly to a specialized prompt:
- It might have correctly identified the task type
- Specialized prompts will still work
- Only an issue if completely wrong prompt used

### Problem: Claude asks which prompt to use

**Solution:**
Tell Claude once: "When I ask about data, read `hugr://ai/instructions` first"

After that, it should remember for the conversation.

---

## 🎨 Customization

### Make It More Obvious

**In ai-instructions.md description:**
```json
"description": "🚨 AI: READ THIS FIRST! 🚨 Automatic detection of data queries..."
```

**In start.md description:**
```json
"description": "🎯 MAIN ENTRY POINT 🎯 Always use this prompt for data requests..."
```

### Add Examples to Descriptions

```json
"description": "⭐ START HERE ⭐ Guide for AI assistants. Auto-detects: 'show me X', 'how many X', 'analyze X'..."
```

This helps Claude pattern-match user queries.

---

## 📊 Success Metrics

**You'll know it's working when:**

✅ You ask about data → Claude starts working immediately
✅ No need to type `/start` or prompt names manually
✅ Claude uses appropriate specialized prompts
✅ Consistent workflow (discover → query → analyze)
✅ No Python scripts or unnecessary files created

---

## 🎓 Teaching Claude (First Time)

If this is your first time using Hugr MCP with Claude, you can "prime" it:

**You:**
```
I've set up Hugr MCP server. When I ask questions about data:
1. Read hugr://ai/instructions first
2. Follow the instructions there

Got it?
```

**Claude:**
```
Yes! I'll read the ai-instructions resource when you ask about data,
which will teach me when and how to use Hugr MCP properly.
```

After this one-time setup, Claude should remember for future conversations.

---

## 🔗 Related Documentation

- **README.md** - Full MCP package documentation (for developers)
- **ai-instructions.md** - The actual instructions Claude reads (for AI)
- **overview.md** - Hugr architecture (for understanding)
- **start.md** - Auto-routing prompt (for task classification)

---

## 💡 Pro Tips

### Tip 1: Natural Language Works
Just ask normally:
- "Show me sales"
- "How many customers?"
- "Analyze revenue trends"

No need for technical language!

### Tip 2: Complex Questions Work Too
Claude will break them down:
- "Compare Q1 vs Q2 revenue by region"
- "Find churned customers and analyze why"
- "What are the top 3 factors affecting conversion?"

### Tip 3: Let Claude Drive
Trust the workflow:
- Claude will discover schema
- Claude will build queries
- Claude will validate them
- Claude will iterate if needed

### Tip 4: Mid-Conversation Questions
You can ask follow-ups:
```
You: "Show me top customers"
Claude: [shows results]
You: "Now show their purchases"
Claude: [automatically continues with Hugr]
```

---

## ✨ Summary

**Three files make the magic happen:**

1. **ai-instructions.md** - Teaches Claude when/how to use Hugr
2. **start.md** - Routes requests to right prompts
3. **overview.md** - Explains Hugr architecture

**You just need to:**
- Configure MCP server ✓
- Put files in right order ✓
- Ask your questions ✓

**Claude handles:**
- Detecting data queries
- Reading instructions
- Using right prompts
- Completing workflow
- Giving you answers

**Result: Seamless data analysis experience! 🎉**
