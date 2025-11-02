# Tool Filtering FAQ

Frequently asked questions about MCP Hub's tool filtering system.

## Table of Contents

- [General Questions](#general-questions)
- [Performance](#performance)
- [Configuration](#configuration)
- [LLM Categorization](#llm-categorization)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## General Questions

### What is tool filtering and why do I need it?

Tool filtering reduces the overwhelming number of tools exposed to AI clients like Claude Desktop. Without filtering, you might have 3000+ tools from 25 servers, which:

- Slows down Claude Desktop responses (more tokens to process)
- Increases API costs (larger context windows)
- Makes tool selection less accurate (too many choices)
- Overwhelms the AI with irrelevant tools

With filtering, you can reduce this to 50-200 relevant tools, improving speed, accuracy, and user experience.

**Example:**
- Without filtering: 3469 tools, 4-5 second responses
- With filtering: 89 tools, 1-2 second responses (~70% faster)

---

### When should I enable tool filtering?

Enable filtering if you experience any of these:

1. **Tool Count > 100**: You have more than 100 tools registered
2. **Slow Responses**: Claude Desktop takes 3+ seconds to respond
3. **Irrelevant Tool Calls**: AI frequently suggests wrong tools
4. **High API Costs**: Token usage is excessive
5. **Multiple Servers**: You have 5+ MCP servers configured

You can also use auto-enable thresholds to enable filtering automatically:

```json
{
  "toolFiltering": {
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

When total tools exceed 100, filtering auto-enables with the specified configuration.

---

### What happens to filtered tools?

Filtered tools are:
- **Still registered** with MCP Hub
- **Not exposed** to Claude Desktop or other clients
- **Fully functional** if called directly via API
- **Retrievable** for debugging and monitoring

You can see filtered tools via the API:

```bash
# Get all tools (including filtered)
curl http://localhost:37373/api/tools?includeFiltered=true

# Get filtering statistics
curl http://localhost:37373/api/filtering/stats
```

**Important:** Filtering is client-facing only. The underlying MCP servers still work normally.

---

### Can I filter tools differently for different clients?

Not currently. Tool filtering applies globally to all clients connected to MCP Hub.

**Workaround:** Run multiple MCP Hub instances with different configurations:

```bash
# Instance 1: Port 37373, minimal filtering (for power users)
MCP_CONFIG=mcp.minimal.json PORT=37373 npm start

# Instance 2: Port 37374, strict filtering (for regular users)
MCP_CONFIG=mcp.strict.json PORT=37374 npm start
```

Then configure different Claude Desktop profiles to connect to different ports.

**Future Enhancement:** Per-client filtering is planned for a future release.

---

### How does filtering affect server registration?

Filtering does **not** affect server registration. All servers start and register normally. Filtering only:

1. Intercepts tool registration
2. Checks each tool against filter rules
3. Decides whether to expose tool to clients
4. Tracks statistics for monitoring

**Performance Impact:**
- Server startup: <100ms overhead
- Tool registration: <10ms per tool
- Memory: ~2MB for 3000 tools
- No impact on server functionality

---

### Can I disable filtering temporarily?

Yes, you can disable filtering in several ways:

**Method 1: Configuration**
```json
{
  "toolFiltering": {
    "enabled": false
  }
}
```

**Method 2: Environment Variable**
```bash
DISABLE_TOOL_FILTERING=true npm start
```

**Method 3: API** (runtime toggle)
```bash
# Disable filtering
curl -X POST http://localhost:37373/api/filtering/disable

# Re-enable filtering
curl -X POST http://localhost:37373/api/filtering/enable
```

**Note:** Runtime toggling requires restarting clients (Claude Desktop) to pick up changes.

---

## Performance

### Does filtering slow down MCP Hub?

Filtering has **minimal performance impact**:

**Startup Overhead:**
- Without filtering: ~2000ms
- With filtering: ~2100ms (~100ms overhead)

**Tool Registration:**
- Without filtering: <1ms per tool
- With filtering: <10ms per tool (pattern matching)
- With LLM: <50ms per tool (background, non-blocking)

**Memory Usage:**
- Without filtering: ~50MB
- With filtering: ~52MB (~2MB for cache)
- With LLM: ~55MB (~3MB for cache + queue)

**Runtime Performance:**
- Category lookup: <5ms (cached)
- Server filtering: <2ms (map lookup)
- Hybrid mode: <10ms (both checks)

**Recommendation:** Performance impact is negligible (<5%) for typical usage.

---

### How does LLM categorization affect performance?

LLM categorization uses a **non-blocking architecture** to avoid performance impact:

**Architecture:**
1. Tool categorization requested
2. Check memory cache (instant, <1ms)
3. Try pattern matching (instant, <5ms)
4. Return default 'other' category immediately
5. Queue background LLM call (non-blocking)
6. LLM refines category asynchronously
7. Future requests use refined category

**Key Metrics:**
- **Initial response time:** <50ms (no blocking)
- **Background LLM call:** 200-1000ms (asynchronous)
- **Subsequent requests:** <5ms (cached)
- **Cache hit rate:** 99% after warmup

**Example Timeline:**
```
T+0ms:   shouldIncludeTool() called
T+5ms:   Pattern matching complete, return 'other'
T+50ms:  Client receives response (non-blocking)
T+500ms: Background LLM categorizes tool (async)
T+505ms: Category refined, cached persistently
```

**Result:** No perceptible impact on user experience.

---

### What is the cache hit rate and why does it matter?

**Cache Hit Rate** = percentage of categorizations that use cached results instead of calling LLM.

**Typical Rates:**
- First run: 0% (no cache yet)
- After warmup: 99% (only new tools call LLM)
- Steady state: 99.9% (rare new tools)

**Why It Matters:**
1. **Performance:** Cached lookups are <5ms vs 200-1000ms for LLM calls
2. **Cost:** Cached results are free, LLM calls cost ~$0.0001 each
3. **Reliability:** Cache works offline, LLM requires API access

**Monitoring:**
```bash
curl http://localhost:37373/api/filtering/stats | jq '.cacheStats'
```

**Expected Output:**
```json
{
  "categoryCache": {
    "size": 156,
    "hits": 9845,
    "misses": 156,
    "hitRate": 0.984
  }
}
```

**Optimization:** High cache hit rate (>90%) means filtering is cost-effective and performant.

---

### How much memory does filtering use?

**Memory Breakdown:**

| Component | Size (approx) |
|-----------|---------------|
| Base filtering service | 500KB |
| Category cache (1000 entries) | 1MB |
| LLM provider (if enabled) | 500KB |
| LLM queue (if enabled) | 500KB |
| Pattern matching rules | 200KB |
| **Total** | **~2-3MB** |

**Scaling:**
- 1000 tools: ~2MB
- 3000 tools: ~3MB
- 10000 tools: ~5MB

**Comparison:** Negligible compared to typical Node.js application (50-100MB).

**Monitoring:**
```bash
# Check memory usage
ps aux | grep mcp-hub | awk '{print $6/1024 "MB"}'

# Expected: ~50-60MB total (including Node.js runtime)
```

---

## Configuration

### What are the available filtering modes?

MCP Hub supports four filtering modes:

**1. Server-Based (Allowlist)**
```json
{
  "mode": "server-allowlist",
  "serverFilter": {
    "mode": "allowlist",
    "servers": ["filesystem", "github"]
  }
}
```
- **Use case:** You know exactly which servers you need
- **Pros:** Simple, explicit, predictable
- **Cons:** Doesn't scale with many servers

**2. Server-Based (Denylist)**
```json
{
  "mode": "server-denylist",
  "serverFilter": {
    "mode": "denylist",
    "servers": ["experimental", "testing"]
  }
}
```
- **Use case:** Block specific problematic servers
- **Pros:** Include most servers by default
- **Cons:** New servers auto-included (risky)

**3. Category-Based**
```json
{
  "mode": "category",
  "categoryFilter": {
    "categories": ["filesystem", "web", "search"]
  }
}
```
- **Use case:** Need tools across many servers
- **Pros:** Works across all servers automatically
- **Cons:** Requires accurate categorization

**4. Hybrid Mode**
```json
{
  "mode": "hybrid",
  "serverFilter": {
    "mode": "allowlist",
    "servers": ["github", "filesystem"]
  },
  "categoryFilter": {
    "categories": ["filesystem", "version-control"]
  }
}
```
- **Use case:** Fine-grained control
- **Pros:** Combines server and category filtering (OR logic)
- **Cons:** More complex to configure

**Recommendation:**
- Start with **server-allowlist** (simplest)
- Graduate to **category** (better UX)
- Use **hybrid** for advanced scenarios

---

### What categories are available?

MCP Hub supports these built-in categories:

| Category | Examples | Typical Tool Count |
|----------|----------|-------------------|
| `filesystem` | read, write, list, search files | 40-50 |
| `web` | HTTP requests, browser automation | 25-35 |
| `search` | Search engines, code search | 10-15 |
| `database` | SQL, NoSQL queries | 15-20 |
| `version-control` | Git, GitHub, GitLab | 20-30 |
| `docker` | Container, Kubernetes ops | 15-25 |
| `cloud` | AWS, GCP, Azure services | 30-40 |
| `development` | npm, pip, linters, compilers | 20-30 |
| `communication` | Slack, email, Discord | 10-15 |
| `monitoring` | Logs, metrics, traces | 10-15 |
| `security` | Auth, encryption, secrets | 10-15 |
| `data-processing` | ETL, transformations | 15-20 |
| `ai-ml` | Model training, inference | 10-15 |
| `other` | Uncategorized tools | Variable |

**Custom Categories:**

You can define custom categories via pattern mapping:

```json
{
  "categoryFilter": {
    "categories": ["filesystem", "custom"],
    "customMappings": {
      "company__*": "custom",
      "internal_*": "custom"
    }
  }
}
```

---

### How do I know which categories to use?

**Method 1: Analyze Current Usage**

```bash
# Review recent tool calls from logs
grep "Tool called" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# Output:
# 45 filesystem__read
# 28 github__create_pr
# 14 search__query
```

Map these to categories:
- `filesystem__*` → `filesystem`
- `github__*` → `version-control`
- `search__*` → `search`

**Method 2: Check Category Breakdown**

Enable filtering with all categories, then review breakdown:

```bash
curl http://localhost:37373/api/filtering/stats | jq '.categoryBreakdown'
```

**Output:**
```json
{
  "filesystem": 45,
  "version-control": 28,
  "web": 25,
  "search": 14,
  "development": 12,
  "other": 3200
}
```

**Interpretation:**
- Include: `filesystem`, `version-control`, `web`, `search`, `development` (127 tools)
- Exclude: `other` (3200 tools, mostly unused)

**Method 3: Iterative Refinement**

Start broad, then narrow:

```json
// Week 1: Start broad
{"categories": ["filesystem", "web", "search", "version-control", "development"]}

// Week 2: Remove unused (based on logs)
{"categories": ["filesystem", "web", "search", "version-control"]}

// Week 3: Fine-tune
{"categories": ["filesystem", "version-control", "search"]}
```

Monitor `exposedTools` count and adjust until you reach 50-200 tools.

---

### Can I override category mappings?

Yes, using **custom mappings**:

```json
{
  "categoryFilter": {
    "categories": ["filesystem", "custom"],
    "customMappings": {
      "github__admin_delete_repo": "admin",     // Exclude (admin not in categories)
      "filesystem__read": "filesystem",         // Force include (override)
      "mytool__*": "custom",                    // Pattern-based custom category
      "*__deploy": "deployment"                 // Suffix pattern
    }
  }
}
```

**Use Cases:**
1. **Exclude specific tools:** Map to category not in allowlist
2. **Include specific tools:** Map to category in allowlist
3. **Create custom categories:** Group organization-specific tools
4. **Override defaults:** Fix miscategorized tools

**Priority:**
1. Custom mappings (highest priority)
2. LLM categorization
3. Pattern matching
4. Default 'other' category

---

## LLM Categorization

### Is LLM categorization required?

**No**, LLM categorization is **optional**. Pattern matching alone works for 80-90% of tools.

**When to Enable LLM:**
- Tools with ambiguous names (e.g., `process`, `run`, `execute`)
- Custom/internal tools without clear patterns
- Multi-tenant environments with varied tools
- Need 10-20% accuracy improvement

**When to Skip LLM:**
- Pattern matching sufficient (check with testing)
- Want to minimize API costs
- Offline environments (no internet)
- Privacy/security concerns about sending tool names to external API

**Cost-Benefit Analysis:**

| Scenario | Pattern Matching | LLM Categorization |
|----------|------------------|-------------------|
| Cost | Free | ~$0.01 per 100 tools (one-time) |
| Accuracy | 80-90% | 95-99% |
| Speed | <5ms | <50ms (non-blocking) |
| Offline | ✅ Works | ❌ Requires internet |

**Recommendation:** Start without LLM, enable only if pattern matching insufficient.

---

### How much does LLM categorization cost?

**Per-Call Costs:**

| Provider | Model | Cost per Call | Cost per 100 Tools |
|----------|-------|---------------|-------------------|
| OpenAI | gpt-4o-mini | ~$0.0001 | ~$0.01 |
| OpenAI | gpt-4o | ~$0.001 | ~$0.10 |
| Anthropic | claude-3-haiku | ~$0.00015 | ~$0.015 |
| Anthropic | claude-3-sonnet | ~$0.0015 | ~$0.15 |

**Recommended:** Use `gpt-4o-mini` (best cost/performance ratio)

**Monthly Costs (Typical Usage):**

| Scenario | New Tools/Month | LLM Calls | Monthly Cost |
|----------|-----------------|-----------|--------------|
| Small team (5 users) | 10 | 10 | <$0.01 |
| Medium team (20 users) | 50 | 50 | ~$0.05 |
| Large org (100 users) | 200 | 200 | ~$0.20 |

**Key Cost Savers:**
1. **Persistent cache:** 99% cache hit rate after initial categorization
2. **Non-blocking:** Only categorizes on-demand
3. **Rate limiting:** Prevents accidental cost spikes
4. **Pattern matching first:** LLM only for edge cases

**Real-World Example:**
- 3469 tools total
- Pattern matching: 2800 tools (80%)
- LLM categorization: 669 tools (20%)
- First run cost: 669 × $0.0001 = **$0.067**
- Subsequent runs: **$0** (cached)

**Monitoring Costs:**
```bash
curl http://localhost:37373/api/filtering/stats | jq '.llmStats'
```

**Output:**
```json
{
  "totalCategorizations": 669,
  "cacheHits": 6021,
  "cacheMisses": 669,
  "estimatedCost": 0.067
}
```

---

### Which LLM provider should I use?

**Supported Providers:**

**1. OpenAI (Recommended)**
```json
{
  "llmProvider": {
    "provider": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "model": "gpt-4o-mini"
  }
}
```

**Pros:**
- Best cost/performance ratio
- Fast response times (~200ms)
- High accuracy (95%+)
- Widely available

**Cons:**
- Requires OpenAI account
- Sends data to external API

**2. Anthropic**
```json
{
  "llmProvider": {
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "model": "claude-3-haiku-20240307"
  }
}
```

**Pros:**
- Excellent accuracy (97%+)
- Strong privacy protections
- Good for sensitive tool names

**Cons:**
- Slightly more expensive
- Slower response times (~500ms)

**Recommendation:**
- **Default:** OpenAI gpt-4o-mini (best balance)
- **Privacy-focused:** Anthropic claude-3-haiku
- **Budget:** OpenAI gpt-4o-mini (cheapest)
- **Accuracy:** Anthropic claude-3-sonnet (most accurate, but expensive)

---

### How do I set up LLM categorization?

**Step 1: Get API Key**

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy key (starts with `sk-proj-...`)

**Anthropic:**
1. Go to https://console.anthropic.com/settings/keys
2. Create new API key
3. Copy key (starts with `sk-ant-...`)

**Step 2: Set Environment Variable**

```bash
# OpenAI
export OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"

# Or use .env file
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE" >> .env
```

**Step 3: Update Configuration**

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**Step 4: Restart MCP Hub**

```bash
npm restart
```

**Step 5: Verify Setup**

```bash
# Check LLM enabled
npm start 2>&1 | grep "LLM"
# Expected: "LLM categorization enabled: openai/gpt-4o-mini"

# Monitor LLM calls
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "LLM"
```

**Troubleshooting:**
```bash
# Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Should return list of models (not 401 Unauthorized)
```

---

### How does the LLM categorize tools?

The LLM receives a structured prompt with tool information:

**Input:**
```json
{
  "toolName": "github__create_pull_request",
  "description": "Creates a new pull request on GitHub",
  "parameters": {
    "title": "string",
    "body": "string",
    "base": "string",
    "head": "string"
  }
}
```

**Prompt:**
```
Categorize this tool into ONE of these categories:
- filesystem: File operations
- web: HTTP requests, browser
- search: Search engines
- database: Database queries
- version-control: Git, GitHub, GitLab
- docker: Containers, Kubernetes
- cloud: AWS, GCP, Azure
- development: npm, pip, compilers
- communication: Slack, email
- other: Uncategorized

Tool: github__create_pull_request
Description: Creates a new pull request on GitHub
Parameters: title, body, base, head

Category:
```

**Output:**
```
version-control
```

**Validation:**
- Must be one of the predefined categories
- Defaults to 'other' if invalid response
- Logged for debugging

**Caching:**
- Result saved to persistent cache
- Future requests use cached value
- No repeated LLM calls for same tool

---

### What data is sent to the LLM API?

**Data Sent:**
1. Tool name (e.g., `github__create_pull_request`)
2. Tool description (from MCP server)
3. Parameter names (not values)
4. Schema structure (not actual data)

**Data NOT Sent:**
- User credentials
- API keys
- Actual parameter values
- File contents
- Personal information
- Workspace paths

**Example Request:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "Categorize tools into predefined categories."
    },
    {
      "role": "user",
      "content": "Tool: github__create_pull_request\nDescription: Creates PR\nParameters: title, body, base, head\nCategory:"
    }
  ]
}
```

**Privacy Considerations:**
- Tool names may reveal your tech stack
- Descriptions may contain business logic hints
- No sensitive user data included
- No actual secrets or credentials

**Mitigation:**
- Use custom mappings for sensitive tools
- Disable LLM for internal/proprietary tools
- Review LLM provider's privacy policy

---


## Troubleshooting

For comprehensive troubleshooting guidance, see the dedicated [Tool Filtering Troubleshooting Guide](./TOOL_FILTERING_TROUBLESHOOTING.md).

**Common Questions:**
- [Why aren't my tools being filtered?](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-3-filtering-not-working)
- [Why are important tools missing?](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-2-missing-important-tools)
- [How do I debug filtering issues?](./TOOL_FILTERING_TROUBLESHOOTING.md#quick-diagnostics)
- [What if LLM categorization fails?](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-4-llm-categorization-errors)

---


### Can I use filtering with Docker?

Yes, filtering works with Docker deployments:

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

# Expose MCP Hub port
EXPOSE 37373

# Set environment variables
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV NODE_ENV=production

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  mcp-hub:
    build: .
    ports:
      - "37373:37373"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=info
    volumes:
      - ./mcp.json:/app/mcp.json
      - mcp-cache:/root/.local/state/mcp-hub
    restart: unless-stopped

volumes:
  mcp-cache:
```

**Run:**
```bash
# Set API key
export OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"

# Start container
docker-compose up -d

# Check filtering stats
curl http://localhost:37373/api/filtering/stats
```

---

### How do I test filtering before deploying?

**Test Environment Setup:**

**Step 1: Clone Configuration**
```bash
cp mcp.json mcp.test.json
```

**Step 2: Enable Test Mode**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem"]  // Start restrictive
    },
    "dryRun": true  // Test mode (doesn't actually filter)
  }
}
```

**Step 3: Run Tests**
```bash
# Start MCP Hub in test mode
MCP_CONFIG=mcp.test.json npm start

# Check what WOULD be filtered
curl http://localhost:37373/api/filtering/stats | jq '{
  mode,
  totalTools,
  exposedTools,
  wouldBeFiltered: .filteredTools
}'
```

**Step 4: Validate**
```bash
# Get list of tools that would be exposed
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort

# Verify critical tools present
curl http://localhost:37373/api/tools | \
  jq '.tools[].name' | grep -E "filesystem__read|github__create_pr"
```

**Step 5: Deploy**
```bash
# If satisfied, apply to production
cp mcp.test.json mcp.json

# Disable dry run
jq '.toolFiltering.dryRun = false' mcp.json > mcp.json.tmp
mv mcp.json.tmp mcp.json

# Restart
npm restart
```

---

### Can I filter tools programmatically via API?

Yes, MCP Hub provides runtime APIs for filtering:

**Enable/Disable Filtering:**
```bash
# Disable filtering
curl -X POST http://localhost:37373/api/filtering/disable

# Enable filtering
curl -X POST http://localhost:37373/api/filtering/enable
```

**Update Filter Configuration:**
```bash
# Update category filter
curl -X POST http://localhost:37373/api/filtering/config \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    }
  }'
```

**Get Current Configuration:**
```bash
curl http://localhost:37373/api/filtering/config
```

**Response:**
```json
{
  "enabled": true,
  "mode": "category",
  "categoryFilter": {
    "categories": ["filesystem", "web", "search"]
  }
}
```

**Note:** Runtime changes require clients (Claude Desktop) to reconnect.

---

### How do I migrate from server filtering to category filtering?

**Step-by-Step Migration:**

**Current Configuration (Server-based):**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github", "playwright"]
    }
  }
}
```

**Step 1: Analyze Current Tools**
```bash
# Get tools from allowed servers
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort > current-tools.txt

# Count by server
curl http://localhost:37373/api/filtering/stats | jq '.serverStats'
```

**Step 2: Map Servers to Categories**

| Server | Category |
|--------|----------|
| filesystem | filesystem |
| github | version-control |
| playwright | web |

**Step 3: Create Category Configuration**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web"]
    }
  }
}
```

**Step 4: Test in Parallel**
```bash
# Run test instance on different port
MCP_CONFIG=mcp.category.json PORT=37374 npm start &

# Compare tool counts
curl http://localhost:37373/api/filtering/stats | jq '.exposedTools'  # Old
curl http://localhost:37374/api/filtering/stats | jq '.exposedTools'  # New

# Get diff
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort > old-tools.txt
curl http://localhost:37374/api/tools | jq '.tools[].name' | sort > new-tools.txt
diff old-tools.txt new-tools.txt
```

**Step 5: Deploy**
```bash
# If satisfied, switch to category mode
cp mcp.category.json mcp.json
npm restart
```

**Rollback:**
```bash
# Restore server-based config
git checkout mcp.json
npm restart
```

---

## Additional Resources

- **User Guide:** [README.md](../README.md#tool-filtering)
- **Configuration Examples:** [tool-filtering-examples.md](tool-filtering-examples.md)
- **Integration Guide:** [TOOL_FILTERING_INTEGRATION.md](TOOL_FILTERING_INTEGRATION.md)
- **API Reference:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md#filtering-endpoints)
- **Test Suite:** [tests/tool-filtering-service.test.js](../tests/tool-filtering-service.test.js)

---

**Need More Help?**

- Open an issue: [GitHub Issues](https://github.com/your-org/mcp-hub/issues)
- Join Discord: [MCP Hub Community](https://discord.gg/mcp-hub)
- Read docs: [Full Documentation](https://docs.mcp-hub.dev)
