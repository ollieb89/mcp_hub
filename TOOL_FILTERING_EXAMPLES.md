# Tool Filtering Configuration Examples

Real-world configuration examples with before/after metrics, rationale, and common pitfalls.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Beginner Examples](#beginner-examples)
- [Intermediate Examples](#intermediate-examples)
- [Advanced Examples](#advanced-examples)
- [Use Case Patterns](#use-case-patterns)
- [Common Mistakes](#common-mistakes)
- [Progressive Migration](#progressive-migration)

## Quick Reference

| Use Case | Mode | Expected Tools | Token Reduction | Complexity |
|----------|------|----------------|-----------------|------------|
| Frontend Development | server-allowlist | 10-20 | 75-85% | Beginner |
| Backend API Development | server-allowlist | 15-25 | 70-80% | Beginner |
| Full-Stack Development | category | 30-50 | 60-70% | Intermediate |
| DevOps/Infrastructure | server-allowlist | 20-30 | 70-80% | Intermediate |
| Data Analysis | category | 25-40 | 65-75% | Intermediate |
| Multi-Team Workspace | hybrid | 40-80 | 50-65% | Advanced |
| Enterprise Security | hybrid | 50-100 | 40-60% | Advanced |

## Beginner Examples

### Example 1: Frontend React Development

**Scenario:** React developer building web applications with browser testing
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Tools for filesystem, browser automation, and web search

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",
        "playwright",
        "web-browser"
      ]
    }
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "web-browser": {
      "url": "https://mcp-web-browser.example.com/mcp"
    }
  }
}
```

**Results:**
- **After filtering:** 18 tools | ~8k tokens
- **Token reduction:** 84% (44k tokens freed)
- **Tools available:**
  - `filesystem__read`, `filesystem__write`, `filesystem__search`
  - `playwright__navigate`, `playwright__screenshot`, `playwright__click`
  - `web-browser__fetch`, `web-browser__search`

**Rationale:**
- Filesystem: Code editing and project navigation
- Playwright: Component testing and visual validation
- Web-browser: Research and documentation lookup

**Common workflow validated:**
1. ✅ Read component files
2. ✅ Edit React components
3. ✅ Test in browser with Playwright
4. ✅ Research documentation

---

### Example 2: Backend API Development (Node.js)

**Scenario:** Backend engineer developing REST APIs and database integration
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Filesystem, database, code analysis, and testing tools

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",
        "postgres",
        "github",
        "sequentialthinking"
      ]
    }
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${env:DATABASE_URL}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "sequentialthinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Results:**
- **After filtering:** 24 tools | ~12k tokens
- **Token reduction:** 77% (40k tokens freed)
- **Tools available:**
  - `filesystem__*`: Code and config management
  - `postgres__query`, `postgres__analyze_schema`
  - `github__create_pr`, `github__review_code`
  - `sequentialthinking__structured_analysis`

**Rationale:**
- Filesystem: API code, models, controllers
- Postgres: Database queries and schema analysis
- GitHub: Code review and PR management
- Sequential Thinking: Complex debugging and architecture analysis

**Common workflow validated:**
1. ✅ Read/edit API endpoints
2. ✅ Query database for testing
3. ✅ Analyze schema changes
4. ✅ Create PRs for code review
5. ✅ Debug complex request flows

---

### Example 3: Python Data Science

**Scenario:** Data scientist working with Jupyter notebooks and datasets
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Filesystem, data analysis, and visualization tools

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",
        "jupyter",
        "sqlite"
      ]
    }
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data", "/notebooks"]
    },
    "jupyter": {
      "command": "python",
      "args": ["-m", "mcp_jupyter"],
      "env": {
        "JUPYTER_TOKEN": "${env:JUPYTER_TOKEN}"
      }
    },
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "/data/analysis.db"]
    }
  }
}
```

**Results:**
- **After filtering:** 16 tools | ~7k tokens
- **Token reduction:** 87% (45k tokens freed)
- **Tools available:**
  - `filesystem__read`, `filesystem__write` (datasets, notebooks)
  - `jupyter__execute_cell`, `jupyter__create_notebook`
  - `sqlite__query`, `sqlite__analyze`

**Rationale:**
- Filesystem: Dataset access and notebook management
- Jupyter: Interactive analysis and visualization
- SQLite: Structured data analysis

---

## Intermediate Examples

### Example 4: Full-Stack Development (Category Mode)

**Scenario:** Full-stack team working on web application with frontend, backend, and database
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Tools grouped by functional category, not server

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "code",
        "data"
      ],
      "customMappings": {
        "myCustomServer__analytics": "data",
        "myCustomServer__deploy": "code"
      }
    }
  }
}
```

**Results:**
- **After filtering:** 42 tools | ~18k tokens
- **Token reduction:** 65% (34k tokens freed)
- **Tools available by category:**
  - **filesystem** (12 tools): File operations across all servers
  - **web** (15 tools): HTTP, browsers, APIs
  - **code** (8 tools): Git, testing, linting
  - **data** (7 tools): Databases, caching, analytics

**Rationale:**
- Category mode allows tools from ANY server matching the category
- More flexible than server-allowlist for diverse toolsets
- Custom mappings handle project-specific servers

**Common workflow validated:**
1. ✅ Edit frontend and backend code (filesystem)
2. ✅ Test APIs and browser interactions (web)
3. ✅ Run tests and create PRs (code)
4. ✅ Query databases and analytics (data)

---

### Example 5: DevOps/Infrastructure

**Scenario:** DevOps engineer managing cloud infrastructure and deployments
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Infrastructure tools with denylist for development servers

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "denylist",
      "servers": [
        "jupyter",
        "playwright",
        "figma",
        "slack-bot"
      ]
    }
  },
  "mcpServers": {
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/infra"] },
    "kubernetes": { "command": "kubectl-mcp-server" },
    "terraform": { "command": "terraform-mcp-server" },
    "docker": { "command": "docker-mcp-server" },
    "aws": { "command": "aws-mcp-server", "env": { "AWS_PROFILE": "${env:AWS_PROFILE}" } },
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
    "sequentialthinking": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"] }
  }
}
```

**Results:**
- **After filtering:** 28 tools | ~14k tokens
- **Token reduction:** 73% (38k tokens freed)
- **Tools available:**
  - Infrastructure: kubectl, terraform, docker, aws-cli
  - Code: github, filesystem
  - Analysis: sequential-thinking

**Rationale:**
- Denylist approach: Include all servers EXCEPT non-infrastructure tools
- Maintains access to diverse infrastructure tooling
- Blocks development tools (Jupyter, Playwright, design tools)

---

### Example 6: Multi-Language Monorepo

**Scenario:** Large monorepo with TypeScript frontend, Python backend, Go services
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Language-specific tools plus common utilities

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "code",
        "web"
      ],
      "customMappings": {
        "typescript-server__*": "code",
        "python-lsp__*": "code",
        "gopls__*": "code",
        "nx__*": "code"
      }
    }
  }
}
```

**Results:**
- **After filtering:** 38 tools | ~16k tokens
- **Token reduction:** 69% (36k tokens freed)
- **Tools available:**
  - Multi-language LSP servers (TypeScript, Python, Go)
  - Monorepo tooling (Nx, Turborepo)
  - Shared filesystem and web utilities

**Rationale:**
- Category filtering handles diverse language tooling
- Custom mappings ensure language servers are categorized correctly
- Scales across team specializations

---

## Advanced Examples

### Example 7: Hybrid Mode - Enterprise Security Team

**Scenario:** Security team needs specific security tools plus selective access to application servers
**Baseline:** 3,247 tools from 27 servers | ~52k tokens
**Target:** Security tools (server-based) + code analysis tools (category-based)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "security-scanner",
        "secret-detector",
        "dependency-checker",
        "github"
      ]
    },
    "categoryFilter": {
      "categories": [
        "filesystem",
        "code"
      ]
    }
  }
}
```

**Results:**
- **After filtering:** 52 tools | ~22k tokens
- **Token reduction:** 58% (30k tokens freed)
- **Tools available:**
  - Security servers: ALL tools from security-scanner, secret-detector, etc.
  - Code category: Tools from ANY server matching "code" category
  - Filesystem category: File operations across all servers

**How Hybrid Works:**
Tool is included if **EITHER** condition is true:
1. Tool's server is in allowlist (security tools)
2. Tool's category is in category filter (code analysis from any server)

**Rationale:**
- Server filter: Ensure ALL security tools available
- Category filter: Access code analysis across multiple servers
- Hybrid: Maximum flexibility for cross-functional team

---

### Example 8: Auto-Enable with Threshold

**Scenario:** Small team that grows to need filtering as servers increase
**Baseline:** Start with 5 servers (80 tools), grows to 25 servers (3,247 tools)
**Target:** Automatically enable filtering when tool count exceeds 100

```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "code"
      ]
    }
  }
}
```

**Behavior:**
- **With 5 servers (80 tools):** Filtering disabled, all 80 tools available
- **With 25 servers (3,247 tools):** Filtering auto-enables, reduces to ~40 tools
- **Log message:** `"Tool filtering auto-enabled: 3247 tools → 40 tools (threshold: 100)"`

**Results:**
- **Dynamic activation:** No manual intervention required
- **Graceful scaling:** Handles team growth automatically
- **Monitoring:** Check status at `/api/filtering/stats`

**Rationale:**
- Start simple when small
- Automatically optimize as complexity grows
- No manual configuration updates needed

---

### Example 9: LLM-Enhanced Categorization (Advanced)

**Scenario:** Custom internal tools need intelligent categorization
**Baseline:** 3,247 tools + 50 custom internal tools without standard categories
**Target:** Use LLM to categorize custom tools automatically

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "custom-analytics"
      ],
      "customMappings": {
        "internal-server__user_analytics": "custom-analytics",
        "internal-server__report_generator": "custom-analytics"
      }
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**Results:**
- **Known tools:** Categorized via DEFAULT_CATEGORIES mapping
- **Unknown tools:** LLM categorizes in background (non-blocking)
- **Custom tools:** Manual mappings take precedence

**LLM Categorization Flow:**
1. Tool encountered: `internal-server__mystery_tool`
2. Check DEFAULT_CATEGORIES: Not found
3. Check customMappings: Not found
4. **Synchronous return:** Category "other" (allows tool immediately)
5. **Background LLM call:** Analyze tool description → category "data"
6. **Cache update:** Future calls use "data" category
7. **Rate limiting:** Max 5 concurrent LLM calls (prevents API overload)

**Performance:**
- Initial call: <10ms (immediate default response)
- Background categorization: 200-500ms (async, non-blocking)
- Subsequent calls: <1ms (cached)

**Cost Management:**
- ~$0.0001 per tool categorization (gpt-4o-mini)
- One-time cost per unique tool
- Results cached in memory (persists across requests)

---

## Use Case Patterns

### Pattern: Development Environment per Developer

**Problem:** Each developer has different server preferences
**Solution:** Per-developer configuration files

```bash
# Developer 1: Frontend specialist
cp mcp-frontend.json ~/.config/mcp-hub/mcp.json

# Developer 2: Backend specialist
cp mcp-backend.json ~/.config/mcp-hub/mcp.json

# Developer 3: Full-stack
cp mcp-fullstack.json ~/.config/mcp-hub/mcp.json
```

---

### Pattern: Context Switching with Profiles

**Problem:** Need different tool sets for different projects
**Solution:** Multiple config files with explicit loading

```bash
# Working on frontend
mcp-hub --config configs/frontend.json

# Switching to infrastructure work
mcp-hub --config configs/devops.json

# Security audit
mcp-hub --config configs/security.json
```

---

### Pattern: Team Standardization

**Problem:** Ensure all team members have consistent tooling
**Solution:** Committed configuration with documentation

```
project-root/
├── .mcp-hub/
│   ├── mcp.json          # Team standard configuration
│   ├── README.md         # Why each server is included
│   └── examples/
│       ├── frontend.json
│       ├── backend.json
│       └── fullstack.json
└── package.json
```

---

## Common Mistakes

### Mistake 1: Server Names Don't Match

❌ **Wrong:**
```json
{
  "serverFilter": {
    "servers": ["file-system", "git-hub"]  // Incorrect names
  },
  "mcpServers": {
    "filesystem": { ... },   // Actual name
    "github": { ... }        // Actual name
  }
}
```

✅ **Correct:**
```json
{
  "serverFilter": {
    "servers": ["filesystem", "github"]  // Match mcpServers keys exactly
  },
  "mcpServers": {
    "filesystem": { ... },
    "github": { ... }
  }
}
```

**How to verify:**
```bash
# Check actual server names
npm start 2>&1 | grep "Connected to server"
# Output: "Connected to server: filesystem"
# Output: "Connected to server: github"
```

---

### Mistake 2: Forgetting to Restart

❌ **Wrong workflow:**
```bash
vim mcp.json          # Edit configuration
# Continue working... configuration not loaded!
```

✅ **Correct workflow:**
```bash
vim mcp.json          # Edit configuration
npm restart           # ALWAYS restart to apply changes
curl localhost:3000/api/filtering/stats  # Verify changes
```

---

### Mistake 3: Too Aggressive Filtering

❌ **Problem:**
```json
{
  "serverFilter": {
    "servers": ["filesystem"]  // ONLY 3 tools available
  }
}
```

**Result:** Workflows break because essential tools missing

✅ **Solution: Start broader, iterate to narrow**
```json
{
  "serverFilter": {
    "servers": ["filesystem", "github", "web-browser"]  // 15-20 tools
  }
}
```

**Then test workflows:**
```bash
# Test: Can I complete my normal tasks?
# ✅ Edit files
# ✅ Create PRs
# ✅ Research docs
# ❌ Run tests (missing playwright)

# Iterate: Add playwright
```

---

### Mistake 4: Mixing Modes Incorrectly

❌ **Wrong:**
```json
{
  "mode": "server-allowlist",
  "categoryFilter": {  // Ignored! Wrong mode!
    "categories": ["filesystem"]
  }
}
```

**Result:** Category filter has no effect in server-allowlist mode

✅ **Correct:**
```json
{
  "mode": "category",  // Must be 'category' or 'hybrid'
  "categoryFilter": {
    "categories": ["filesystem"]
  }
}
```

---

### Mistake 5: Not Monitoring Impact

❌ **Deploying filtering without validation:**
```bash
vim mcp.json  # Add filtering
npm restart
# Hope it works!
```

✅ **Correct: Monitor and validate**
```bash
# Before filtering
curl localhost:3000/api/filtering/stats | jq '.totalTools'
# Output: 3247

# Apply filtering
vim mcp.json
npm restart

# After filtering - verify reduction
curl localhost:3000/api/filtering/stats | jq
# Output:
# {
#   "enabled": true,
#   "mode": "server-allowlist",
#   "totalTools": 18,
#   "allowedTools": 18,
#   "filteredTools": 3229,
#   "tokenReduction": "~84%"
# }

# Test critical workflows
# 1. Edit file
# 2. Run tests
# 3. Create PR
# 4. Deploy
```

---

## Progressive Migration

### Phase 1: Baseline (Week 1)

**Goal:** Understand current state, no changes

```bash
# 1. Measure current token usage
curl localhost:3000/api/filtering/stats

# 2. Document current workflows
cat > workflows.md <<EOF
## Daily Workflows
- [ ] Edit frontend components
- [ ] Run unit tests
- [ ] Create GitHub PRs
- [ ] Deploy to staging
EOF

# 3. Identify most-used servers
npm start 2>&1 | grep "Connected to server" | sort | uniq -c | sort -rn
```

**Output:** Baseline metrics and workflow documentation

---

### Phase 2: Experiment (Week 2)

**Goal:** Test filtering with rollback plan

```bash
# 1. Backup configuration
cp mcp.json mcp.json.backup

# 2. Start with conservative filtering (top 5 servers)
cat > mcp.json <<EOF
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github", "playwright", "web-browser", "sequentialthinking"]
    }
  }
}
EOF

# 3. Restart and test
npm restart
curl localhost:3000/api/filtering/stats

# 4. Test ALL documented workflows
bash test-workflows.sh

# 5. Rollback if needed
if [ $? -ne 0 ]; then
  mv mcp.json.backup mcp.json
  npm restart
fi
```

---

### Phase 3: Optimize (Week 3-4)

**Goal:** Fine-tune for optimal token reduction

```bash
# Iterative refinement
# Try 1: 5 servers → 18 tools (75% reduction) ✅
# Try 2: 4 servers → 15 tools (80% reduction) ✅
# Try 3: 3 servers → 12 tools (85% reduction) ❌ Missing playwright for tests

# Settle on optimal configuration
cat > mcp.json <<EOF
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github", "playwright", "web-browser"]
    }
  }
}
EOF

# Final validation
npm restart
curl localhost:3000/api/filtering/stats
# Result: 15 tools, 80% reduction, all workflows passing
```

---

## Monitoring Commands

### Get Current Statistics
```bash
curl http://localhost:3000/api/filtering/stats | jq
```

### Watch for Changes
```bash
watch -n 5 'curl -s http://localhost:3000/api/filtering/stats | jq'
```

### Check Filtering Logs
```bash
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i "filtering"
```

### Validate Configuration
```bash
# Test configuration without restarting
cat mcp.json | jq '.toolFiltering'

# Validate JSON syntax
jq empty mcp.json && echo "Valid JSON" || echo "Invalid JSON"
```

---

## Best Practices Summary

1. ✅ **Start Simple**: Begin with server-allowlist mode, 3-5 servers
2. ✅ **Measure First**: Get baseline metrics before filtering
3. ✅ **Test Workflows**: Validate critical tasks after changes
4. ✅ **Monitor Impact**: Use `/api/filtering/stats` endpoint
5. ✅ **Iterate Gradually**: Add/remove servers one at a time
6. ✅ **Document Decisions**: Comment why each server is included
7. ✅ **Backup Configs**: Always keep `mcp.json.backup`
8. ✅ **Target 15-25 tools**: Optimal range for LLM performance
9. ✅ **Use Auto-Enable**: Let filtering activate automatically as you scale
10. ✅ **Version Control**: Commit team configurations to git

---

## Getting Help

### Debugging Checklist

```bash
# 1. Is filtering enabled?
curl localhost:3000/api/filtering/stats | jq '.enabled'

# 2. Are server names correct?
npm start 2>&1 | grep "Connected to server"

# 3. Did configuration load?
tail -n 50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "Tool filtering"

# 4. What tools are available?
curl localhost:3000/api/tools | jq '.tools[].name' | wc -l

# 5. Test specific tool
curl localhost:3000/api/tools | jq '.tools[] | select(.name | contains("filesystem__read"))'
```

### Common Issues

**Issue:** "Tool not found" errors
**Solution:** Check server name in allowlist matches `mcpServers` key exactly

**Issue:** Token count didn't decrease
**Solution:** Verify filtering enabled and restart MCP Hub

**Issue:** Workflows breaking after filtering
**Solution:** Add missing servers incrementally, test after each addition

**Issue:** Auto-enable not triggering
**Solution:** Check `autoEnableThreshold` value and current tool count

---

## Additional Resources

- **Main Documentation:** [README.md](README.md#tool-filtering)
- **Architecture Guide:** [Sprint4_Documentation_Architecture.md](claudedocs/Sprint4_Documentation_Architecture.md)
- **Quick Reference:** [Sprint4_Quick_Reference.md](claudedocs/Sprint4_Quick_Reference.md)
- **REST API:** `GET /api/filtering/stats`
- **Configuration Schema:** [src/utils/config.js](src/utils/config.js)
- **Test Coverage:** [tests/tool-filtering-service.test.js](tests/tool-filtering-service.test.js)
