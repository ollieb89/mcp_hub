# Tool Filtering Configuration Examples

Comprehensive configuration examples and migration guide for MCP Hub's tool filtering system.

## Table of Contents

- [Common Use Cases](#common-use-cases)
- [Migration Guide](#migration-guide)
- [Troubleshooting Scenarios](#troubleshooting-scenarios)
- [Performance Tuning](#performance-tuning)
- [Advanced Patterns](#advanced-patterns)

## Common Use Cases

### Use Case 1: Web Developer Workflow

**Scenario:** Frontend developer using React with browser testing
**Tool Count:** 3469 → 18 tools (~99.5% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "playwright", "web-browser"]
    }
  }
}
```

**Expected Tools:**
- `filesystem__read`, `filesystem__write`, `filesystem__list`
- `playwright__navigate`, `playwright__screenshot`, `playwright__click`
- `web-browser__fetch`, `web-browser__render`

**Validation:**
```bash
# Check tool count
curl http://localhost:37373/api/filtering/stats | jq '.exposedTools'
# Expected: 18

# List available tools
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort
```

---

### Use Case 2: Category-Based Filtering (Better UX)

**Scenario:** Full-stack developer needing filesystem, web, and search capabilities across all servers
**Tool Count:** 3469 → 89 tools (~97% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    }
  }
}
```

**Available Categories:**
- `filesystem`: File operations (read, write, list, search)
- `web`: HTTP requests, browser automation, API calls
- `search`: Search engines, code search, documentation search
- `database`: Database queries and operations
- `version-control`: Git, GitHub, GitLab operations
- `docker`: Container and Kubernetes operations
- `cloud`: AWS, GCP, Azure services
- `development`: npm, pip, compilers, linters
- `communication`: Slack, email, Discord

**Benefits:**
- Works across all servers automatically
- No need to know server names
- New servers automatically filtered by category
- More intuitive than server allowlists

**Validation:**
```bash
# Check category breakdown
curl http://localhost:37373/api/filtering/stats | jq '.categoryBreakdown'

# Expected output:
# {
#   "filesystem": 45,
#   "web": 28,
#   "search": 14,
#   "development": 12
# }
```

---

### Use Case 3: Data Analyst Setup

**Scenario:** Analyst working with data processing and visualization
**Tool Count:** 3469 → 35 tools (~99% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "database", "search"]
    }
  }
}
```

**Expected Tools:**
- Filesystem: CSV reading, data export
- Database: SQL queries, data extraction
- Search: Document search, data discovery

---

### Use Case 4: DevOps Engineer

**Scenario:** Infrastructure management with Kubernetes and Docker
**Tool Count:** 3469 → 42 tools (~98.8% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["kubernetes", "docker", "filesystem", "github"]
    },
    "categoryFilter": {
      "categories": ["docker", "cloud", "version-control", "filesystem"]
    }
  }
}
```

**Why Hybrid?**
- Server allowlist ensures only DevOps servers (k8s, docker)
- Category filter further refines tools within those servers
- OR logic: tool passes if it matches EITHER filter
- Fine-grained control without complexity

**Validation:**
```bash
# Verify hybrid mode active
curl http://localhost:37373/api/filtering/stats | jq '.mode'
# Expected: "hybrid"

# Check server distribution
curl http://localhost:37373/api/filtering/stats | jq '.serverStats'
```

---

### Use Case 5: Custom Category Mappings

**Scenario:** Organization-specific tools need custom categorization
**Tool Count:** Variable based on custom patterns

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "custom", "internal"],
      "customMappings": {
        "company__*": "internal",
        "mytool__*": "custom",
        "acme_*": "internal"
      }
    }
  }
}
```

**Pattern Syntax:**
- `*` - Wildcard matching any characters
- `tool__*` - Matches `tool__read`, `tool__write`, etc.
- `*_api` - Matches `github_api`, `slack_api`, etc.

**Benefits:**
- Pattern-based categorization
- Override default categories
- Organization-specific workflows

---

### Use Case 6: LLM-Enhanced Categorization

**Scenario:** Complex tools with ambiguous names need intelligent categorization
**Tool Count:** Same as category mode, but with 10-20% better accuracy

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**How It Works:**
1. Pattern matching tries first (synchronous, <5ms)
2. If pattern fails, LLM categorizes in background (non-blocking)
3. Results cached persistently (99% cache hit rate)
4. Default to 'other' category on LLM failure

**Cost Analysis:**
- First categorization: ~$0.01 per 100 tools
- Subsequent runs: $0 (cached)
- Cache hit rate: 99% after initial run
- Total monthly cost: <$0.50 for typical usage

**When to Use:**
- Tools with ambiguous names (e.g., `process`, `run`, `execute`)
- Custom/internal tools without clear patterns
- Multi-tenant environments with varied tools
- When accuracy is critical

**Environment Setup:**
```bash
# Set API key via environment variable
export OPENAI_API_KEY="sk-proj-..."

# Or use .env file
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Verify API key loaded
npm start 2>&1 | grep "LLM categorization enabled"
```

---

## Migration Guide

### Phase 1: Assessment (15 minutes)

**Step 1:** Check current tool count
```bash
# Start MCP Hub without filtering
npm start

# Get total tool count
curl http://localhost:37373/api/tools | jq '.tools | length'
# Example output: 3469
```

**Step 2:** Identify active servers
```bash
# List connected servers
curl http://localhost:37373/api/servers | jq '.servers[].name'

# Example output:
# "filesystem"
# "github"
# "playwright"
# "web-browser"
# ... (25 servers total)
```

**Step 3:** Determine filtering strategy

| Situation | Recommended Mode | Reason |
|-----------|------------------|--------|
| Using 2-5 specific servers | `server-allowlist` | Simplest, most effective |
| Need tools across many servers | `category` | Better UX, automatic |
| Complex multi-server workflows | `hybrid` | Fine-grained control |
| Tools > 100, servers > 10 | `category` with LLM | Scalable, accurate |

---

### Phase 2: Server Allowlist (30 minutes)

**Step 1:** Create minimal config
```bash
# Backup existing config
cp mcp.json mcp.json.backup

# Edit config
nano mcp.json
```

**Step 2:** Add server filtering
```json
{
  "mcpServers": {
    "filesystem": { "command": "...", "args": [...] },
    "github": { "command": "...", "args": [...] },
    "playwright": { "command": "...", "args": [...] }
  },
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    }
  }
}
```

**Step 3:** Restart and validate
```bash
# Restart MCP Hub
npm restart

# Verify filtering active
curl http://localhost:37373/api/filtering/stats | jq '{enabled, mode, exposedTools}'

# Expected output:
# {
#   "enabled": true,
#   "mode": "server-allowlist",
#   "exposedTools": 25
# }
```

**Step 4:** Test in Claude Desktop
```bash
# Open Claude Desktop
# Try file operations: "List files in current directory"
# Should work (filesystem allowed)

# Try browser automation: "Navigate to google.com"
# Should fail or prompt for server (playwright not allowed)
```

**Rollback if needed:**
```bash
# Restore original config
cp mcp.json.backup mcp.json
npm restart
```

---

### Phase 3: Category-Based Filtering (45 minutes)

**Step 1:** Analyze current tool usage
```bash
# Review tool calls from logs
grep "Tool called" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# Example output:
# 45 filesystem__read
# 28 github__create_pr
# 14 web-browser__fetch
# 12 search__query
```

**Step 2:** Map tools to categories

| Tool Pattern | Category |
|--------------|----------|
| `*__read`, `*__write`, `*__list` | `filesystem` |
| `github__*`, `git__*` | `version-control` |
| `playwright__*`, `web-browser__*` | `web` |
| `search__*`, `*__search` | `search` |
| `docker__*`, `kubernetes__*` | `docker` |

**Step 3:** Update configuration
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web",
        "search"
      ]
    }
  }
}
```

**Step 4:** Incremental refinement
```bash
# Restart MCP Hub
npm restart

# Check category breakdown
curl http://localhost:37373/api/filtering/stats | jq '.categoryBreakdown'

# If too many tools, remove categories
# If too few tools, add categories

# Common additions:
# - "development" (npm, pip, linters)
# - "database" (SQL, NoSQL queries)
# - "communication" (Slack, email)
```

**Step 5:** Test workflows
```bash
# Test each category:
# 1. Filesystem: "Read package.json"
# 2. Version Control: "Show git status"
# 3. Web: "Fetch https://example.com"
# 4. Search: "Search for 'authentication' in docs"

# Missing functionality? Add category and restart
```

---

### Phase 4: Hybrid Mode (60 minutes)

**Step 1:** Identify use case

Hybrid mode is best when:
- You need specific servers (e.g., GitHub, filesystem)
- But also want category filtering within those servers
- Example: "Only GitHub and filesystem, but only web and version-control tools"

**Step 2:** Configure hybrid
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["github", "filesystem", "playwright"]
    },
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web"]
    }
  }
}
```

**Step 3:** Understand OR logic

Tool is **included** if:
- Server matches allowlist **OR**
- Category matches category list

Examples:
- `github__create_pr`: Passes (GitHub allowed + version-control category)
- `filesystem__read`: Passes (filesystem allowed + filesystem category)
- `slack__send_message`: Fails (Slack not allowed + communication not in categories)

**Step 4:** Optimize for your workflow
```bash
# Check which tools are included
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort

# Adjust serverFilter or categoryFilter to fine-tune

# Too many tools? Restrict server allowlist
# Too few tools? Add categories
```

---

### Phase 5: Production Optimization (30 minutes)

**Step 1:** Enable auto-threshold
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Behavior:**
- Filtering starts disabled
- When total tools > 100, automatically enables
- Uses specified mode and configuration

**Step 2:** Add LLM categorization (optional)
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**Step 3:** Monitor effectiveness
```bash
# Create monitoring script
cat > monitor-filtering.sh << 'EOF'
#!/bin/bash
echo "=== Tool Filtering Statistics ==="
curl -s http://localhost:37373/api/filtering/stats | jq '{
  enabled,
  mode,
  totalTools,
  exposedTools,
  filterRate: (.filteredTools / .totalTools * 100 | floor)
}'
EOF

chmod +x monitor-filtering.sh
./monitor-filtering.sh
```

**Expected output:**
```json
{
  "enabled": true,
  "mode": "category",
  "totalTools": 3469,
  "exposedTools": 89,
  "filterRate": 97
}
```

---

## Troubleshooting Scenarios

### Scenario 1: Tools Still Overwhelming

**Symptoms:**
- Enabled filtering but tool count still > 200
- Claude Desktop still slow to respond
- Token usage still high

**Diagnostic:**
```bash
# 1. Verify filtering enabled
curl http://localhost:37373/api/filtering/stats | jq '.enabled'
# Expected: true

# 2. Check current mode
curl http://localhost:37373/api/filtering/stats | jq '.mode'

# 3. Get tool count breakdown
curl http://localhost:37373/api/filtering/stats | jq '{
  total: .totalTools,
  exposed: .exposedTools,
  filtered: .filteredTools
}'
```

**Solution 1: Restrict category list**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]  // Reduced from 8 to 2
    }
  }
}
```

**Solution 2: Switch to server allowlist**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem"]  // Only essential server
    }
  }
}
```

**Solution 3: Verify server names match**
```bash
# List actual server names
curl http://localhost:37373/api/servers | jq '.servers[].name'

# Compare with config
cat mcp.json | jq '.toolFiltering.serverFilter.servers'

# Server names must match EXACTLY (case-sensitive)
```

---

### Scenario 2: Missing Important Tools

**Symptoms:**
- Specific functionality not working
- "Tool not found" errors in Claude Desktop
- Workflows broken after enabling filtering

**Diagnostic:**
```bash
# 1. Check if tool exists
curl http://localhost:37373/api/tools | jq '.tools[] | select(.name | contains("github"))'

# 2. Verify tool's server
curl http://localhost:37373/api/tools | jq '.tools[] | select(.name == "github__create_pr") | .server'

# 3. Check filtering stats
curl http://localhost:37373/api/filtering/stats | jq '.serverStats'
```

**Solution 1: Add missing server**
```json
{
  "toolFiltering": {
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]  // Add "github"
    }
  }
}
```

**Solution 2: Add missing category**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "version-control"  // Add this for GitHub tools
      ]
    }
  }
}
```

**Solution 3: Use custom mappings**
```json
{
  "toolFiltering": {
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "custom"],
      "customMappings": {
        "github__create_pr": "custom",  // Force include specific tool
        "github__review_code": "custom"
      }
    }
  }
}
```

---

### Scenario 3: LLM Categorization Not Working

**Symptoms:**
- LLM-related errors in logs
- API key errors
- Categorization falls back to 'other'

**Diagnostic:**
```bash
# 1. Check LLM configuration
cat mcp.json | jq '.toolFiltering.llmProvider'

# 2. Verify API key set
echo $OPENAI_API_KEY

# 3. Check logs for LLM errors
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i llm

# 4. Test API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solution 1: Fix API key**
```bash
# Set API key in environment
export OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"

# Or add to .env file
echo "OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE" >> .env

# Restart MCP Hub
npm restart
```

**Solution 2: Update model name**
```json
{
  "toolFiltering": {
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"  // Cost-effective model
    }
  }
}
```

**Solution 3: Disable LLM categorization**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    }
    // Remove llmProvider section entirely
  }
}
```

**Solution 4: Check rate limiting**
```bash
# Monitor LLM API calls
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "LLM"

# If rate limited, reduce concurrency in logs:
# "Too Many Requests" or "Rate limit exceeded"

# Wait 60 seconds and retry
sleep 60
npm restart
```

---

### Scenario 4: Performance Degradation

**Symptoms:**
- Slow tool registration
- High memory usage
- Increased startup time

**Diagnostic:**
```bash
# 1. Check filtering overhead
npm start 2>&1 | grep "Tool filtering"

# Expected: "Tool filtering initialized in <100ms"

# 2. Check memory usage
curl http://localhost:37373/api/filtering/stats | jq '.memory'

# 3. Monitor cache sizes
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i cache
```

**Solution 1: Disable LLM if not needed**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    }
    // Remove llmProvider - saves memory and API calls
  }
}
```

**Solution 2: Reduce cache TTL**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    },
    "categoryCacheTTL": 1800000  // 30 minutes (default: 1 hour)
  }
}
```

**Solution 3: Optimize pattern matching**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": ["filesystem"],
      "customMappings": {
        // Avoid complex patterns
        "fs__*": "filesystem",  // Good: simple wildcard
        // "*__read__*": "filesystem"  // Bad: multiple wildcards
      }
    }
  }
}
```

---

### Scenario 5: Configuration Not Reloading

**Symptoms:**
- Changes to mcp.json not taking effect
- Old filtering rules still active
- Restart doesn't apply new config

**Diagnostic:**
```bash
# 1. Verify config file syntax
cat mcp.json | jq '.' > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# 2. Check config loaded
npm start 2>&1 | grep "Configuration loaded"

# 3. Verify no config cache
rm -rf ~/.cache/mcp-hub/config*  # Clear any cached config
```

**Solution 1: Hard restart**
```bash
# Kill all node processes
pkill -f "mcp-hub"

# Clear cache
rm -rf ~/.cache/mcp-hub

# Restart
npm start
```

**Solution 2: Fix JSON syntax**
```bash
# Validate JSON
cat mcp.json | jq '.'

# Common errors:
# - Missing comma between properties
# - Trailing comma in last property
# - Unclosed brackets/braces
```

**Solution 3: Check file permissions**
```bash
# Ensure mcp.json is readable
chmod 644 mcp.json

# Verify ownership
ls -l mcp.json
```

---

## Performance Tuning

### Optimization 1: Cache Configuration

**Scenario:** Minimize LLM API calls and memory usage

**Configuration:**
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
    },
    "cache": {
      "enabled": true,
      "ttl": 3600000,  // 1 hour
      "maxSize": 1000   // Max 1000 cached entries
    }
  }
}
```

**Benefits:**
- 99% cache hit rate after warmup
- <5ms category lookup (cached)
- Minimal API costs (only new tools)

**Monitoring:**
```bash
# Check cache effectiveness
curl http://localhost:37373/api/filtering/stats | jq '.cacheStats'

# Expected output:
# {
#   "categoryCache": {
#     "size": 156,
#     "hits": 9845,
#     "misses": 156,
#     "hitRate": 0.984
#   }
# }
```

---

### Optimization 2: LLM Rate Limiting

**Scenario:** Prevent API rate limit errors and reduce costs

**Configuration:**
```json
{
  "toolFiltering": {
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini",
      "rateLimit": {
        "maxConcurrent": 5,      // Max 5 parallel calls
        "requestsPerSecond": 10   // Max 10 calls/second
      }
    }
  }
}
```

**Benefits:**
- Prevents "429 Too Many Requests" errors
- Spreads API calls over time
- Maintains <50ms response time

**Cost Analysis:**
```bash
# Calculate monthly cost
curl http://localhost:37373/api/filtering/stats | jq '
  .llmStats | {
    totalCalls: .totalCategorizations,
    costPerCall: 0.0001,  # gpt-4o-mini cost
    monthlyCost: (.totalCategorizations * 0.0001)
  }'

# Expected: <$0.50/month with caching
```

---

### Optimization 3: Auto-Enable Thresholds

**Scenario:** Dynamic filtering based on tool count

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "autoEnableServerThreshold": 10,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Behavior:**
- Filtering disabled by default (no overhead)
- Auto-enables when:
  - Total tools > 100 **OR**
  - Active servers > 10
- No restart needed (automatic)

**Monitoring:**
```bash
# Check if auto-enabled
curl http://localhost:37373/api/filtering/stats | jq '{
  enabled,
  autoEnabled: .autoEnabled,
  totalTools,
  threshold: 100
}'
```

---

### Optimization 4: Hybrid Mode Fine-Tuning

**Scenario:** Balance specificity and flexibility

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",    // Always include
        "github",        // Always include
        "playwright"     // Always include
      ]
    },
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web"
      ]
    }
  }
}
```

**OR Logic Optimization:**
- Tools from allowed servers: **Always included** (even if category doesn't match)
- Tools from other servers: **Included only if category matches**

**Example:**
- `filesystem__admin_delete`: Included (filesystem server allowed)
- `github__create_pr`: Included (GitHub server + version-control category)
- `slack__send_message`: Excluded (Slack not allowed, communication not in categories)

**Performance:**
- Overhead: <10ms per tool
- Memory: ~2MB for 3000 tools
- Startup impact: <100ms

---

### Optimization 5: Pattern Matching Strategies

**Scenario:** Fast categorization without LLM

**Efficient Patterns:**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": ["filesystem", "custom"],
      "customMappings": {
        // GOOD: Simple prefix wildcards (fast)
        "fs__*": "filesystem",
        "git__*": "version-control",
        
        // GOOD: Simple suffix wildcards
        "*__read": "filesystem",
        "*__write": "filesystem",
        
        // AVOID: Multiple wildcards (slower)
        // "*__admin__*": "admin",
        
        // AVOID: Complex patterns (use LLM instead)
        // "*_api_*_v2": "api"
      }
    }
  }
}
```

**Performance Comparison:**

| Pattern Type | Avg Latency | Use Case |
|--------------|-------------|----------|
| Exact match | <1ms | Known tool names |
| Prefix wildcard | <2ms | Server-prefixed tools |
| Suffix wildcard | <3ms | Action-suffixed tools |
| Multiple wildcards | <10ms | Complex patterns |
| LLM categorization | <50ms (background) | Ambiguous tools |

**Recommendation:**
1. Use exact matches for critical tools
2. Use simple wildcards for patterns
3. Enable LLM for edge cases only

---

## Advanced Patterns

### Pattern 1: Per-Environment Configuration

**Scenario:** Different filtering for dev, staging, production

**Directory Structure:**
```
mcp-configs/
  ├── mcp.dev.json
  ├── mcp.staging.json
  └── mcp.prod.json
```

**mcp.dev.json** (Development - all tools):
```json
{
  "toolFiltering": {
    "enabled": false  // No filtering in development
  }
}
```

**mcp.staging.json** (Staging - moderate filtering):
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web",
        "search",
        "development"
      ]
    }
  }
}
```

**mcp.prod.json** (Production - strict filtering):
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    }
  }
}
```

**Usage:**
```bash
# Development
MCP_CONFIG=mcp.dev.json npm start

# Staging
MCP_CONFIG=mcp.staging.json npm start

# Production
MCP_CONFIG=mcp.prod.json npm start
```

---

### Pattern 2: Team-Based Filtering

**Scenario:** Different tool sets for different teams

**Frontend Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "version-control",
        "development"
      ]
    }
  }
}
```

**Backend Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "database",
        "version-control",
        "cloud",
        "development"
      ]
    }
  }
}
```

**DevOps Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["kubernetes", "docker", "github", "filesystem"]
    },
    "categoryFilter": {
      "categories": [
        "docker",
        "cloud",
        "version-control",
        "filesystem"
      ]
    }
  }
}
```

---

### Pattern 3: Gradual Rollout

**Scenario:** Test filtering with subset of users before full rollout

**Week 1: Pilot Users (5 users)**
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

**Metrics to Track:**
- Tool count reduction
- User satisfaction (surveys)
- Error rates
- Performance impact

**Week 2: Expand to Team (20 users)**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web", "search"]
    }
  }
}
```

**Week 3: Company-Wide Rollout**
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web", "search"]
    }
  }
}
```

**Rollback Plan:**
```bash
# Immediate rollback
cp mcp.json.backup mcp.json
npm restart

# Gradual rollback
# Disable filtering but keep config
jq '.toolFiltering.enabled = false' mcp.json > mcp.json.tmp
mv mcp.json.tmp mcp.json
npm restart
```

---

### Pattern 4: Monitoring and Alerting

**Setup Monitoring:**
```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash

# Get stats
STATS=$(curl -s http://localhost:37373/api/filtering/stats)

# Extract metrics
ENABLED=$(echo $STATS | jq -r '.enabled')
EXPOSED=$(echo $STATS | jq -r '.exposedTools')
FILTER_RATE=$(echo $STATS | jq -r '.filterRate')

# Alert if tool count too high
if [ "$EXPOSED" -gt 200 ]; then
  echo "ALERT: Tool count too high: $EXPOSED"
  # Send Slack notification, email, etc.
fi

# Alert if filtering disabled
if [ "$ENABLED" != "true" ]; then
  echo "WARNING: Tool filtering disabled"
fi

# Log metrics
echo "$(date): enabled=$ENABLED, exposed=$EXPOSED, filterRate=$FILTER_RATE" >> filtering-metrics.log
EOF

chmod +x monitor.sh

# Run hourly
crontab -e
# Add: 0 * * * * /path/to/monitor.sh
```

---

## Additional Resources

- **User Guide:** [README.md](../README.md#tool-filtering)
- **Developer Guide:** [TOOL_FILTERING_INTEGRATION.md](TOOL_FILTERING_INTEGRATION.md)
- **FAQ:** [TOOL_FILTERING_FAQ.md](TOOL_FILTERING_FAQ.md)
- **API Reference:** [TOOL_FILTERING_INTEGRATION.md#api-reference](TOOL_FILTERING_INTEGRATION.md#api-reference)
- **Test Suite:** [tests/tool-filtering-service.test.js](../tests/tool-filtering-service.test.js)
