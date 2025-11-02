# Tool Filtering Troubleshooting Guide

Comprehensive troubleshooting guide for MCP Hub's tool filtering system.

## Quick Diagnostics

### Verify Filtering Status

```bash
# Check if filtering is enabled
curl http://localhost:37373/api/filtering/stats | jq '.enabled'
# Expected: true

# Check current mode
curl http://localhost:37373/api/filtering/stats | jq '.mode'
# Expected: "server-allowlist", "category", or "hybrid"

# Get tool count breakdown
curl http://localhost:37373/api/filtering/stats | jq '{
  total: .totalTools,
  exposed: .exposedTools,
  filtered: .filteredTools,
  filterRate: .filterRate
}'
```

### Validate Configuration

```bash
# Validate JSON syntax
cat mcp.json | jq '.' > /dev/null && echo "✅ Valid" || echo "❌ Invalid"

# Check filtering config structure
cat mcp.json | jq '.toolFiltering'

# Verify server names match exactly (case-sensitive)
curl http://localhost:37373/api/servers | jq '.servers[].name'
cat mcp.json | jq '.toolFiltering.serverFilter.servers'
```

---

## Common Scenarios

### Scenario 1: Tools Still Overwhelming

**Symptoms:**
- Enabled filtering but tool count still > 200
- Claude Desktop still slow to respond
- Token usage still high

**Diagnostic:**
```bash
# Get detailed filtering statistics
curl http://localhost:37373/api/filtering/stats | jq '{
  mode: .mode,
  totalTools: .totalTools,
  exposedTools: .exposedTools,
  filteredTools: .filteredTools,
  filterRate: .filterRate,
  serverStats: .serverStats
}'
```

**Solution 1: Restrict Category List**
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

**Solution 2: Switch to Server Allowlist**
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

**Solution 3: Use Hybrid Mode for Fine Control**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    },
    "categoryFilter": {
      "categories": ["filesystem", "version-control"]
    }
  }
}
```

---

### Scenario 2: Missing Important Tools

**Symptoms:**
- Specific functionality not working
- "Tool not found" errors in Claude Desktop
- Workflows broken after enabling filtering

**Diagnostic:**
```bash
# Check if tool exists at all
curl http://localhost:37373/api/tools?includeFiltered=true | \
  jq '.tools[] | select(.name | contains("github"))'

# Check which server provides the tool
curl http://localhost:37373/api/tools?includeFiltered=true | \
  jq '.tools[] | select(.name == "github__create_pr") | {name, server, filtered}'

# Check server filtering stats
curl http://localhost:37373/api/filtering/stats | jq '.serverStats'
```

**Solution 1: Add Missing Server to Allowlist**
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

**Solution 2: Add Missing Category**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control"  // Add missing category
      ]
    }
  }
}
```

**Solution 3: Use Custom Mappings to Force Include**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": ["filesystem", "custom"],
      "customMappings": {
        "github__create_pr": "custom",  // Force include specific tool
        "github__list_repos": "custom"
      }
    }
  }
}
```

**Solution 4: Temporarily Disable Filtering for Debugging**
```json
{
  "toolFiltering": {
    "enabled": false  // Disable to verify tool exists
  }
}
```

---

### Scenario 3: Filtering Not Working

**Symptoms:**
- Configuration looks correct but filtering has no effect
- All tools still exposed to clients
- Filter statistics show 0 filtered tools

**Diagnostic:**
```bash
# Check 1: Filtering enabled
curl http://localhost:37373/api/filtering/stats | jq '.enabled'
# Must be true

# Check 2: Mode configured
curl http://localhost:37373/api/filtering/stats | jq '.mode'
# Must be one of: "server-allowlist", "server-denylist", "category", "hybrid"

# Check 3: Configuration valid
cat mcp.json | jq '.toolFiltering' || echo "Invalid JSON"

# Check 4: MCP Hub restarted after config changes
ps aux | grep "mcp-hub" | grep -v grep
```

**Solution 1: Verify Configuration Structure**

Ensure config follows correct structure:

```json
{
  "mcpServers": {
    "filesystem": { /* ... */ },
    "github": { /* ... */ }
  },
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",  // REQUIRED
    "serverFilter": {             // Required for server modes
      "mode": "allowlist",
      "servers": ["filesystem"]
    }
  }
}
```

**Solution 2: Restart MCP Hub**
```bash
# Stop MCP Hub
pkill -f mcp-hub

# Start with your config
npm start
# OR
MCP_CONFIG=path/to/mcp.json npm start
```

**Solution 3: Check Server Names Match Exactly**

Server names in configuration must match **exactly** (case-sensitive) with registered servers:

```bash
# Get actual server names
curl http://localhost:37373/api/servers | jq -r '.servers[].name' | sort

# Compare with config
cat mcp.json | jq -r '.toolFiltering.serverFilter.servers[]' | sort

# They must match EXACTLY
```

---

### Scenario 4: LLM Categorization Errors

**Symptoms:**
- "LLM categorization failed" errors in logs
- Tools categorized as "other" unexpectedly
- High latency with llmCategorization enabled

**Diagnostic:**
```bash
# Check LLM configuration
cat mcp.json | jq '.toolFiltering.llmCategorization'

# Verify API key set
echo $GEMINI_API_KEY  # Or OPENAI_API_KEY, ANTHROPIC_API_KEY

# Enable debug logging
DEBUG_TOOL_FILTERING=true npm start
```

**Solution 1: Verify API Key**
```bash
# Set API key in environment
export GEMINI_API_KEY=your_api_key_here

# Or in .env file
echo "GEMINI_API_KEY=your_api_key_here" >> .env
```

**Solution 2: Check Network Connectivity**
```bash
# Test Gemini API connectivity
curl -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'

# Should return JSON response, not error
```

**Solution 3: Disable LLM Categorization (Fallback)**
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": false  // Disable LLM, use pattern-based only
    },
    "categoryFilter": {
      "categories": ["filesystem", "web"],
      "customMappings": {
        // Manually map tools that LLM was categorizing
        "github__create_pr": "version-control",
        "github__list_repos": "version-control"
      }
    }
  }
}
```

**Solution 4: Switch LLM Provider**
```json
{
  "llmCategorization": {
    "enabled": true,
    "provider": "openai",  // Try different provider
    "apiKey": "${OPENAI_API_KEY}",
    "model": "gpt-4o-mini"
  }
}
```

---

### Scenario 5: High Performance Overhead

**Symptoms:**
- Slow tool list generation (>100ms)
- High CPU usage with filtering enabled
- Memory usage increasing over time

**Diagnostic:**
```bash
# Check filtering statistics including performance
curl http://localhost:37373/api/filtering/stats | jq '{
  totalChecked: .totalChecked,
  cacheHits: .cacheHits,
  cacheMisses: .cacheMisses,
  cacheHitRate: .cacheHitRate,
  llmInFlight: .llmInFlight
}'

# Monitor memory usage
while true; do
  curl -s http://localhost:37373/api/filtering/stats | \
    jq '.categoryCacheSize // 0'
  sleep 5
done
```

**Solution 1: Optimize Category Cache**
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": true,
      "cacheEnabled": true,
      "cacheTTL": 3600000  // 1 hour (reduce if memory is issue)
    }
  }
}
```

**Solution 2: Reduce LLM Concurrency**
```json
{
  "llmCategorization": {
    "enabled": true,
    "maxConcurrentRequests": 5  // Default is 10, reduce to 5
  }
}
```

**Solution 3: Use Pattern-Based Categorization Only**
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": false  // Disable for best performance
    },
    "categoryFilter": {
      "usePatternMatching": true,  // Fast, synchronous
      "categories": ["filesystem", "web"]
    }
  }
}
```

---

## Advanced Debugging

### Enable Debug Logging

Add debug logging to tool filtering service:

```bash
# Set environment variable
export DEBUG_TOOL_FILTERING=true

# Start MCP Hub
npm start

# Logs will show:
# - Every filtering decision
# - Cache hits/misses
# - LLM categorization requests
# - Performance metrics
```

### Inspect Filtering Logic

For developers debugging filtering logic:

```javascript
// src/utils/tool-filtering-service.js

shouldIncludeTool(toolName, serverName, toolDefinition = {}) {
  logger.debug('Filtering decision', {
    toolName,
    serverName,
    enabled: this.config.enabled,
    mode: this.config.mode
  });

  if (!this.config.enabled) {
    logger.debug('Filtering disabled, allowing all tools');
    return true;
  }

  const result = this._evaluateFilters(toolName, serverName, toolDefinition);

  logger.debug('Filtering result', {
    toolName,
    result,
    reason: result ? 'included' : 'filtered'
  });

  return result;
}
```

### Monitor Cache Performance

```javascript
// Get detailed cache statistics
const stats = filteringService.getStats();

console.log({
  categoryCache: {
    size: stats.categoryCacheSize,
    hits: stats.cacheHits,
    misses: stats.cacheMisses,
    hitRate: stats.cacheHitRate
  },
  performance: {
    totalChecked: stats.totalChecked,
    avgCheckTime: stats.totalChecked > 0
      ? stats.totalCheckTime / stats.totalChecked
      : 0
  }
});
```

### Memory Profiling

```bash
# Monitor heap usage
node --expose-gc --max-old-space-size=4096 dist/cli.js

# Enable memory profiling in code
if (process.env.PROFILE_MEMORY === 'true') {
  setInterval(() => {
    const usage = process.memoryUsage();
    logger.info('Memory usage', {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  }, 60000);  // Every minute
}
```

---

## Configuration Validation

### Validate Configuration Schema

```javascript
// src/utils/config.js - Add validation

function validateFilteringConfig(filteringConfig) {
  // Validate enabled flag
  if (typeof filteringConfig.enabled !== 'boolean') {
    throw new ConfigError(
      'toolFiltering.enabled must be a boolean',
      { enabled: filteringConfig.enabled }
    );
  }

  // Validate mode
  const validModes = ['server-allowlist', 'server-denylist', 'category', 'hybrid'];
  if (filteringConfig.enabled && !validModes.includes(filteringConfig.mode)) {
    throw new ConfigError(
      `toolFiltering.mode must be one of: ${validModes.join(', ')}`,
      { mode: filteringConfig.mode }
    );
  }

  // Validate server filter
  if (filteringConfig.mode.startsWith('server') || filteringConfig.mode === 'hybrid') {
    if (!filteringConfig.serverFilter || !Array.isArray(filteringConfig.serverFilter.servers)) {
      throw new ConfigError(
        'serverFilter.servers must be an array when using server-based filtering',
        { serverFilter: filteringConfig.serverFilter }
      );
    }
  }

  // Validate category filter
  if (filteringConfig.mode === 'category' || filteringConfig.mode === 'hybrid') {
    if (!filteringConfig.categoryFilter || !Array.isArray(filteringConfig.categoryFilter.categories)) {
      throw new ConfigError(
        'categoryFilter.categories must be an array when using category-based filtering',
        { categoryFilter: filteringConfig.categoryFilter }
      );
    }
  }

  return true;
}
```

### Test Configuration

```bash
# Test config without starting full server
node -e "
  const config = require('./dist/utils/config.js');
  const cfg = config.loadConfig('mcp.json');
  console.log('✅ Configuration valid');
  console.log(JSON.stringify(cfg.toolFiltering, null, 2));
"
```

---

## Common Error Messages

### "toolFiltering.enabled must be a boolean"

**Cause:** `enabled` field has wrong type

**Fix:**
```json
{
  "toolFiltering": {
    "enabled": true  // Must be true or false, not "true" or 1
  }
}
```

### "serverFilter.servers must be an array"

**Cause:** Server list is not an array

**Fix:**
```json
{
  "serverFilter": {
    "mode": "allowlist",
    "servers": ["filesystem"]  // Must be array, not "filesystem"
  }
}
```

### "LLM categorization failed: API key missing"

**Cause:** LLM API key not configured

**Fix:**
```bash
# Set API key
export GEMINI_API_KEY=your_api_key_here

# OR disable LLM categorization
{
  "llmCategorization": {
    "enabled": false
  }
}
```

### "Category cache size exceeded 10000 entries"

**Cause:** Memory leak or cache not expiring

**Fix:**
```json
{
  "llmCategorization": {
    "cacheTTL": 1800000,  // Reduce from 1 hour to 30 minutes
    "maxCacheSize": 5000   // Limit cache size
  }
}
```

---

## Getting Help

If you're still experiencing issues after trying these troubleshooting steps:

1. **Enable Debug Logging**: `DEBUG_TOOL_FILTERING=true npm start`
2. **Collect Diagnostics**:
   ```bash
   curl http://localhost:37373/api/filtering/stats > filtering-stats.json
   curl http://localhost:37373/api/servers > servers.json
   cat mcp.json | jq '.toolFiltering' > filtering-config.json
   ```
3. **Check Logs**: `tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log`
4. **Report Issue**: Create GitHub issue with diagnostics attached

---

**Last Updated**: 2025-11-02
**Related Documentation**:
- [Tool Filtering Examples](./tool-filtering-examples.md)
- [Tool Filtering FAQ](./tool-filtering-faq.md)
- [Tool Filtering Integration Guide](./TOOL_FILTERING_INTEGRATION.md)
