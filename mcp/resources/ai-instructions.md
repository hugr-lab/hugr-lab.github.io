# Instructions for AI Assistants

**TARGET AUDIENCE:** AI models (Claude, ChatGPT, etc.) working with Hugr through MCP.

---

## 🎯 When to Use Hugr MCP

**Automatically use Hugr MCP when user asks about:**
- Data analysis, insights, reports, trends
- Database queries or GraphQL
- Business intelligence, metrics, KPIs
- Information from databases/data sources
- "Show me...", "What is...", "How many...", "Analyze..."

**Examples triggering Hugr usage:**
- "What were sales last month?"
- "Show me top customers"
- "Analyze user behavior"
- "How many active orders?"
- "Get product inventory"

---

## 🚀 Quick Start Workflow

### Step 1: First Request About Data
**ALWAYS start by reading this resource:**
```
hugr://docs/overview
```

This gives you architecture understanding and tells you about available prompts.

### Step 2: Use the Router Prompt
**For ANY data-related request, invoke:**
```
start prompt with task="[user's request]"
```

The `start` prompt will:
1. Analyze the request type
2. Route to appropriate specialized prompt:
   - `analysis` - For data questions/insights
   - `discovery` - For schema exploration
   - `query-building` - For query construction

### Step 3: Let Specialized Prompts Work
The specialized prompts will guide you through:
- Schema discovery (using MCP tools)
- Query construction (with validation)
- Data analysis (iterative refinement)

**You don't need to know which prompt to use - the `start` prompt figures it out!**

---

## 📋 Complete Decision Tree

```
User mentions data/database/analytics?
    │
    ├─ First time in conversation?
    │  │
    │  ├─ YES → Read hugr://docs/overview first
    │  │       Then invoke start prompt
    │  │
    │  └─ NO → Already read overview?
    │           │
    │           ├─ YES → Invoke start prompt directly
    │           └─ NO → Read overview first
    │
    └─ Not about data?
       → Don't use Hugr MCP
```

---

## 🎨 Usage Patterns

### Pattern 1: Simple Data Question
```
User: "How many users registered last week?"

Assistant actions:
1. Read hugr://docs/overview (if not done yet)
2. Invoke start prompt:
   - task: "How many users registered last week?"
3. Follow specialized prompt instructions
```

### Pattern 2: Complex Analysis
```
User: "Analyze customer churn and identify risk factors"

Assistant actions:
1. Read hugr://docs/overview (if not done yet)
2. Invoke start prompt:
   - task: "Analyze customer churn and identify risk factors"
3. start routes to analysis prompt
4. analysis prompt guides through:
   - Schema discovery
   - Multiple queries
   - Iterative refinement
```

### Pattern 3: Schema Exploration
```
User: "What customer data is available?"

Assistant actions:
1. Read hugr://docs/overview (if not done yet)
2. Invoke start prompt:
   - task: "What customer data is available?"
3. start routes to discovery prompt
4. discovery prompt uses MCP tools to introspect schema
```

### Pattern 4: Query Building
```
User: "Build a query for top 10 products by revenue"

Assistant actions:
1. Read hugr://docs/overview (if not done yet)
2. Invoke start prompt:
   - task: "Build a query for top 10 products by revenue"
3. start routes to query-building prompt
4. query-building prompt constructs validated query
```

---

## 🔧 Direct Prompt Usage (Advanced)

**Only use direct prompts if you're certain of the task type:**

### When to use `analysis` directly:
- User asks for insights, trends, reports
- Multi-step data analysis needed
- Example: "Compare Q1 vs Q2 revenue"

### When to use `discovery` directly:
- User asks about available data/schema
- Need to find tables/fields
- Example: "What fields does customers table have?"

### When to use `query-building` directly:
- User explicitly wants a query
- Technical query construction
- Example: "Write GraphQL query for active users"

**BUT: When in doubt, use `start` prompt - it will route correctly!**

---

## 📚 Resource Reading Strategy

### Always Read First:
1. **`hugr://docs/overview`** - Architecture, how Hugr works
   - Read at start of ANY Hugr-related conversation

### Read When Needed:
2. **`hugr://docs/patterns`** - Query patterns, anti-patterns, decision tree
   - Referenced by prompts, read when building queries

3. **`hugr://docs/data-types`** - Filter operators, aggregation functions
   - Referenced by prompts, read when constructing filters

4. **`hugr://docs/schema`** - Type system details
   - Read for advanced schema understanding

**Note:** Specialized prompts will tell you which resources to read - you don't need to memorize this!

---

## ⚠️ Critical Rules

### DO:
✅ **Read `hugr://docs/overview` first** (at conversation start)
✅ **Use `start` prompt** for any data request (it routes automatically)
✅ **Follow specialized prompt instructions** (they know what to do)
✅ **Use MCP tools** for schema discovery (never assume)
✅ **Validate queries** before execution (prompts enforce this)

### DON'T:
❌ **Assume schema structure** - always discover first
❌ **Use Python/Pandas** - use GraphQL + jq transforms
❌ **Skip overview resource** - you need architecture context
❌ **Guess which prompt to use** - let `start` prompt route
❌ **Create files** - work inline with MCP tools

---

## 🎓 Learning Path

### First Hugr Request Ever:
1. User asks about data
2. **You:** Read `hugr://docs/overview`
3. **You:** Invoke `start` prompt with task
4. **start:** Routes to appropriate specialized prompt
5. **Specialized prompt:** Guides you step-by-step
6. **You:** Follow instructions, use MCP tools, deliver results

### Subsequent Requests (Same Conversation):
1. User asks another data question
2. **You:** Already read overview ✓
3. **You:** Invoke `start` prompt with new task
4. **start:** Routes to appropriate specialized prompt
5. Continue working...

### Becoming Proficient:
After several conversations, you'll recognize patterns:
- "Show me X" → analysis prompt
- "What tables..." → discovery prompt
- "Build query for X" → query-building prompt

**But `start` prompt is always safe to use!**

---

## 🔄 Conversation Flow Example

```
User: "I need to analyze our sales data"

You:
1. Recognize data-related request
2. Read hugr://docs/overview
3. Understand Hugr provides unified GraphQL API
4. See instruction: "Use start prompt"
5. Invoke start(task: "analyze our sales data")

start prompt:
1. Analyzes: "analyze" + "sales data" = data analysis task
2. Routes to: analysis prompt

analysis prompt:
1. Shows you iterative workflow
2. Phase 1: Discovery - tells you to use discovery tools
3. Phase 2: Query - tells you to build validated queries
4. Phase 3: Execute - get results
5. Phase 4: Analyze - interpret data
6. Phase 5: Refine - iterate if needed

You:
1. Follow analysis prompt instructions
2. Use MCP schema discovery tools
3. Build GraphQL queries (validated)
4. Execute queries
5. Analyze results with jq
6. Present insights to user
```

---

## 💡 Pro Tips

### Tip 1: Start Simple
First Hugr request? Just do:
1. Read overview
2. Use start prompt
3. Follow instructions

### Tip 2: Trust the Prompts
Specialized prompts are detailed and comprehensive. They will:
- Tell you which MCP tools to use
- Show you query patterns
- Guide you through validation
- Prevent common mistakes

### Tip 3: Reference Resources
Prompts reference resources with `hugr://docs/*` URIs. Read them when needed.

### Tip 4: No Files!
Work entirely through MCP:
- Schema discovery via MCP tools
- Query execution via MCP tools
- Data transforms via jq (server-side)
- NO Python scripts, NO CSV exports

### Tip 5: When Stuck
If you're unsure what to do:
1. Re-read the specialized prompt (it has detailed instructions)
2. Check referenced resources
3. Use discovery tools to explore schema
4. Start with simple queries, then refine

---

## 🎯 Success Criteria

**You're using Hugr correctly when:**
- ✅ You read overview at conversation start
- ✅ You invoke start prompt for data requests
- ✅ You use MCP tools (not assumptions)
- ✅ You validate queries before execution
- ✅ You use GraphQL + jq (not Python)
- ✅ You work inline (no files created)
- ✅ You follow specialized prompt instructions

**Red flags (you're doing it wrong):**
- ❌ Creating Python/SQL files
- ❌ Assuming table/field names
- ❌ Skipping query validation
- ❌ Not reading overview
- ❌ Trying to solve tasks without prompts
- ❌ Using pandas/dataframes

---

## 🚦 Quick Reference Card

| User Request Type | Your Action |
|------------------|-------------|
| First data request | 1. Read `hugr://docs/overview`<br>2. Invoke `start` prompt |
| Subsequent requests | Invoke `start` prompt |
| "How many..." | Invoke `start` → routes to `analysis` |
| "What tables..." | Invoke `start` → routes to `discovery` |
| "Build query..." | Invoke `start` → routes to `query-building` |
| Unsure? | Invoke `start` (it will figure it out) |

---

## 📞 Summary

**Three simple steps to work with Hugr:**

1️⃣ **Read overview** (first time only)
   ```
   hugr://docs/overview
   ```

2️⃣ **Use start prompt** (for any data request)
   ```
   start(task: "[user's question]")
   ```

3️⃣ **Follow instructions** (from specialized prompts)
   - Use MCP tools
   - Build validated queries
   - Work inline (no files)

**That's it! The prompts handle the rest.**
