# ML Tool Filtering Migration Guide

**Version**: 1.0 (Sprint 2 → Sprint 3)
**Date**: November 16, 2025
**Status**: Production Ready

## Table of Contents

1. [Overview](#overview)
2. [What's New in Sprint 3](#whats-new-in-sprint-3)
3. [Backward Compatibility](#backward-compatibility)
4. [Migration Paths](#migration-paths)
5. [Configuration Changes](#configuration-changes)
6. [Upgrade Procedures](#upgrade-procedures)
7. [Testing & Validation](#testing--validation)
8. [Rollback Procedures](#rollback-procedures)
9. [FAQ](#faq)

---

## Overview

This guide covers migrating from **Sprint 2 (Category-Based Filtering)** to **Sprint 3 (LLM-Enhanced Filtering)** in the MCP Hub ML Tool Filtering system.

### Migration Impact Summary

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| **Existing Configurations** | Fully compatible | 🟢 Low |
| **Heuristic Categorization** | Enhanced with LLM | 🟢 Low |
| **Performance** | Async LLM calls | 🟢 Low |
| **Dependencies** | Optional LLM providers | 🟢 Low |
| **Database/Cache** | Cache schema extension | 🟢 Low |

**Summary**: Sprint 3 is a **100% backward-compatible enhancement**. Existing deployments continue working without changes. LLM integration is optional and additive.

### Who Should Migrate?

**✅ Recommended For**:
- Users wanting improved categorization accuracy (85% → 95%+)
- Deployments with complex/ambiguous tool names
- Organizations with LLM provider access
- Environments requiring semantic understanding

**⏸️ Can Skip**:
- Small deployments (<10 servers, <100 tools)
- Users satisfied with heuristic accuracy
- Environments without LLM provider access
- Air-gapped/offline deployments

---

## What's New in Sprint 3

### 1. LLM-Based Categorization

**Before (Sprint 2) - Heuristic Matching**:
```javascript
// Pattern-based categorization
if (toolName.includes('github') || toolName.includes('git')) {
  return 'version-control';
}
```

**After (Sprint 3) - LLM Analysis**:
```javascript
// Semantic understanding
const category = await llmClient.categorize(
  'github__search_repositories',
  'Search for repositories on GitHub',
  validCategories
);
// Returns: { category: 'version-control', confidence: 0.98 }
```

### 2. Prompt-Based Dynamic Tool Exposure

**New Feature**: Meta-tool `hub__analyze_prompt` enables context-aware tool exposure:

```bash
# User request: "Check my GitHub notifications"
# 1. Client calls hub__analyze_prompt with user prompt
# 2. LLM analyzes intent → identifies "github" category
# 3. Hub exposes only GitHub tools dynamically
# 4. Result: 3,469 → 15 tools (99.6% reduction)
```

### 3. Enhanced Performance & Reliability

**New Capabilities**:
- ✅ 5-second API timeout enforcement
- ✅ Exponential backoff retry (3 attempts)
- ✅ Circuit breaker pattern (5-failure threshold)
- ✅ Graceful fallback to heuristics
- ✅ Comprehensive monitoring metrics

### 4. Persistent LLM Cache

**Cache Entry Structure**:
```json
{
  "github__search_repositories": {
    "category": "version-control",
    "confidence": 0.98,
    "source": "llm",
    "timestamp": 1700000000,
    "ttl": 86400
  }
}
```

**Benefits**:
- Cache hit rate: >90% after warmup
- Reduced API costs
- Faster categorization (<5ms cached)

---

## Backward Compatibility

### 100% Compatible Upgrade

**Sprint 3 maintains full backward compatibility**:

1. ✅ **Existing configurations work unchanged**
2. ✅ **Heuristic categorization still available**
3. ✅ **No breaking API changes**
4. ✅ **Cache files automatically migrated**
5. ✅ **Graceful degradation if LLM unavailable**

### What Doesn't Change

**Unchanged Interfaces**:
```javascript
// API remains identical
GET /api/filtering/stats
GET /api/filtering/config
POST /api/filtering/config

// Internal methods unchanged
shouldIncludeTool(toolName, serverName, toolDefinition)
getToolCategory(toolName, serverName, toolDefinition)
getStats()
```

**Unchanged Behavior**:
- Server-based filtering (Sprint 1)
- Category-based filtering (Sprint 2)
- Configuration schema (extended, not changed)
- Non-blocking architecture (maintained)

### Automatic Fallback

**LLM Disabled/Unavailable**:
```javascript
// Configuration without LLM
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    }
    // No llmCategorization section
  }
}

// Result: Sprint 2 behavior (heuristic categorization)
```

---

## Migration Paths

### Path 1: Minimal Upgrade (No LLM)

**Use Case**: Keep existing behavior, get Sprint 3 infrastructure improvements

**Steps**:
1. Update MCP Hub to latest version
2. No configuration changes needed
3. Restart MCP Hub

**Outcome**:
- ✅ Enhanced error handling
- ✅ Circuit breaker protection
- ✅ Improved monitoring
- ➖ No LLM categorization (heuristic only)

**Configuration**: No changes required

---

### Path 2: Add LLM with Existing Category Filter

**Use Case**: Enhance accuracy while keeping category restrictions

**Steps**:
1. Update MCP Hub
2. Add LLM configuration to existing config
3. Restart MCP Hub

**Example Configuration**:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",  // Keep existing mode
    "categoryFilter": {
      "categories": ["filesystem", "web", "version-control"]
    },
    "llmCategorization": {  // NEW: Add LLM enhancement
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  }
}
```

**Outcome**:
- ✅ LLM categorization for ambiguous tools
- ✅ Heuristic fallback if LLM fails
- ✅ Category filter still enforced
- ✅ Improved accuracy (85% → 95%+)

---

### Path 3: Enable Prompt-Based Filtering

**Use Case**: Maximum token reduction through dynamic exposure

**Steps**:
1. Update MCP Hub
2. Change mode to `prompt-based`
3. Configure LLM provider
4. Restart MCP Hub

**Example Configuration**:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",  // NEW MODE
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "sessionIsolation": true,
      "enableMetaTools": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  }
}
```

**Outcome**:
- ✅ Zero-default tool exposure
- ✅ Context-aware dynamic exposure
- ✅ 70-90% token reduction
- ✅ Per-client isolation

---

### Path 4: Full Sprint 3 Feature Set

**Use Case**: Maximum accuracy, performance, and monitoring

**Steps**:
1. Update MCP Hub
2. Configure LLM provider (with retry/circuit breaker)
3. Enable prompt-based filtering
4. Configure monitoring alerts
5. Restart MCP Hub

**Example Configuration**:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "model": "gpt-4o-mini",
      "apiKey": "${OPENAI_API_KEY}",
      "retryConfig": {
        "maxRetries": 3,
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 5
      },
      "circuitBreaker": {
        "enabled": true,
        "failureThreshold": 5,
        "resetTimeout": 30000
      },
      "cacheTTL": 86400  // 1 day
    }
  }
}
```

**Outcome**:
- ✅ Maximum accuracy (95%+)
- ✅ Robust error handling
- ✅ Comprehensive monitoring
- ✅ Production-ready deployment

---

## Configuration Changes

### New Configuration Options

**LLM Provider Section** (Optional):
```json
{
  "llmCategorization": {
    "enabled": true,                 // Enable/disable LLM
    "provider": "openai",            // "openai" | "anthropic" | "gemini"
    "model": "gpt-4o-mini",          // Provider-specific model
    "apiKey": "${OPENAI_API_KEY}",  // Environment variable reference

    // Retry configuration
    "retryConfig": {
      "maxRetries": 3,               // Number of retry attempts
      "initialDelay": 1000,          // First retry delay (ms)
      "maxDelay": 30000,             // Maximum retry delay (ms)
      "backoffMultiplier": 5         // Exponential backoff factor
    },

    // Circuit breaker
    "circuitBreaker": {
      "enabled": true,               // Enable circuit breaker
      "failureThreshold": 5,         // Failures before opening
      "resetTimeout": 30000          // Time before retry (ms)
    },

    // Cache configuration
    "cacheTTL": 86400,               // Cache entry lifetime (seconds)
    "cachePrewarm": true             // Prewarm cache on startup
  }
}
```

**Prompt-Based Filtering Section** (Optional):
```json
{
  "promptBasedFiltering": {
    "enabled": true,                 // Enable prompt-based mode
    "defaultExposure": "meta-only",  // "zero" | "meta-only" | "minimal" | "all"
    "sessionIsolation": true,        // Per-client tool exposure
    "enableMetaTools": true          // Include hub__analyze_prompt
  }
}
```

### Configuration Validation

**Validate Before Restart**:
```bash
# Dry-run validation
bun start --validate-config

# Check for syntax errors
cat config/mcp-hub.json | jq empty

# Expected output: (nothing = valid JSON)
```

### Environment Variables

**New Required Variables** (if using LLM):
```bash
# .env file
OPENAI_API_KEY=sk-proj-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
# OR
GEMINI_API_KEY=AIza...
```

**Validation**:
```bash
# Check environment variable set
echo $OPENAI_API_KEY
# Should output: sk-proj-...

# Verify not hardcoded in config
grep -i "api.*key" config/mcp-hub.json | grep -v "\${.*}"
# Should return empty (no hardcoded keys)
```

---

## Upgrade Procedures

### Pre-Upgrade Checklist

- [ ] **Backup current configuration**
  ```bash
  cp config/mcp-hub.json config/mcp-hub.json.backup.$(date +%Y%m%d)
  ```

- [ ] **Backup cache files**
  ```bash
  cp ~/.cache/mcp-hub/llm-categorization-cache.json \
     ~/.cache/mcp-hub/cache-backup-$(date +%Y%m%d).json
  ```

- [ ] **Review current stats**
  ```bash
  curl -s http://localhost:7000/api/filtering/stats | jq > stats-pre-upgrade.json
  ```

- [ ] **Check current version**
  ```bash
  mcp-hub --version
  # Or check package.json
  grep version package.json
  ```

- [ ] **Review release notes**
  ```bash
  cat CHANGELOG.md | grep -A 20 "Sprint 3"
  ```

### Upgrade Procedure

**Step 1: Stop MCP Hub**
```bash
# Graceful shutdown
kill -SIGTERM $(cat /var/run/mcp-hub.pid)

# Or systemd
sudo systemctl stop mcp-hub

# Verify stopped
ps aux | grep mcp-hub
# Should return empty
```

**Step 2: Update Code**
```bash
# Pull latest version
git pull origin main

# Or download release
wget https://github.com/your-org/mcp-hub/releases/download/v1.x.x/mcp-hub-v1.x.x.tar.gz
tar -xzf mcp-hub-v1.x.x.tar.gz

# Install dependencies
bun install
```

**Step 3: Update Configuration** (Optional)
```bash
# Add LLM configuration if desired
nano config/mcp-hub.json

# Add environment variables
echo "GEMINI_API_KEY=your-key-here" >> .env

# Set secure permissions
chmod 600 .env
```

**Step 4: Validate Configuration**
```bash
# Syntax check
bun start --validate-config

# Expected output:
# ✅ Configuration valid
# ✅ LLM provider configured: gemini
# ✅ Prompt-based filtering: enabled
```

**Step 5: Start MCP Hub**
```bash
# Start with logging
bun start 2>&1 | tee upgrade.log

# Or systemd
sudo systemctl start mcp-hub
sudo systemctl status mcp-hub
```

**Step 6: Verify Operation**
```bash
# Check health
curl http://localhost:7000/api/health

# Check filtering stats
curl http://localhost:7000/api/filtering/stats | jq

# Verify LLM working (if enabled)
curl http://localhost:7000/api/filtering/stats | \
  jq '.llm.successfulCalls'
# Should be > 0 after some usage
```

### Post-Upgrade Validation

**Functional Tests**:
```bash
# 1. Test tool filtering
curl http://localhost:7000/api/tools | jq '.tools | length'

# 2. Test LLM categorization (if enabled)
curl http://localhost:7000/api/filtering/stats | \
  jq '.llm.successRate'
# Should be > 0.95

# 3. Test cache hit rate
curl http://localhost:7000/api/filtering/stats | \
  jq '.llmCache.hitRate'
# Should increase over time

# 4. Test prompt-based filtering (if enabled)
# Call hub__analyze_prompt via your MCP client
```

**Performance Tests**:
```bash
# Run load test
bun run test:load

# Check latency
curl http://localhost:7000/api/filtering/stats | \
  jq '.llm.averageLatency'
# Should be < 2000ms
```

**Regression Tests**:
```bash
# Run full test suite
bun test

# Expected: 561/561 tests passing
```

### Upgrade Timeline

**Recommended Schedule**:
- **Development**: Immediate (no downtime risk)
- **Staging**: 1 week after code freeze
- **Production**: 2 weeks after staging validation

**Maintenance Window**:
- **Estimated downtime**: 2-5 minutes
- **Recommended window**: Off-peak hours
- **Rollback time**: 1-2 minutes if needed

---

## Testing & Validation

### Development Testing

**Unit Tests**:
```bash
# Run LLM provider tests
bun test tests/task-3-1-llm-provider-configuration.test.js

# Run integration tests
bun test tests/task-3-7-integration-testing.test.js

# Run monitoring tests
bun test tests/task-3-8-monitoring-observability.test.js
```

**Integration Testing**:
```bash
# Start MCP Hub in test mode
NODE_ENV=test bun start

# Run E2E tests
bun test:integration

# Test LLM providers (requires API keys)
OPENAI_API_KEY=sk-test-... bun test tests/llm-provider.test.js
```

### Staging Validation

**Smoke Tests**:
```bash
# 1. Health check
curl http://staging.example.com:7000/api/health
# Expected: { "status": "ok" }

# 2. Filtering stats
curl http://staging.example.com:7000/api/filtering/stats
# Verify all metrics populated

# 3. Tool list
curl http://staging.example.com:7000/api/tools | jq '.tools | length'
# Verify reasonable tool count

# 4. LLM functionality (if enabled)
curl http://staging.example.com:7000/api/filtering/stats | \
  jq '.llm.successRate'
# Should be > 0.90
```

**Performance Baseline**:
```bash
# Measure sync latency
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s \
    http://staging.example.com:7000/api/tools
done | awk '{ sum += $1 } END { print sum/NR * 1000 "ms" }'
# Should be < 10ms
```

### Production Validation

**Canary Deployment**:
```bash
# Deploy to 10% of production instances first
# Monitor for 24 hours
# Gradually increase to 50%, then 100%
```

**Monitoring Checklist**:
- [ ] Success rate > 95%
- [ ] P95 latency < 2000ms
- [ ] Cache hit rate > 80%
- [ ] Error rate < 1%
- [ ] No memory leaks
- [ ] No circuit breaker trips

---

## Rollback Procedures

### When to Rollback

**Critical Issues**:
- Success rate < 80%
- P95 latency > 5000ms
- Memory leak detected
- Circuit breaker repeatedly tripping
- Security vulnerability discovered

**Warning Signs**:
- Increased error logs
- Client complaints
- Elevated API costs
- Unexpected behavior

### Rollback Procedure

**Step 1: Stop Current Version**
```bash
sudo systemctl stop mcp-hub
```

**Step 2: Restore Previous Version**
```bash
# Restore code
git checkout tags/v1.x.x  # Previous stable version

# Restore configuration
cp config/mcp-hub.json.backup.20251115 config/mcp-hub.json

# Restore cache (optional)
cp ~/.cache/mcp-hub/cache-backup-20251115.json \
   ~/.cache/mcp-hub/llm-categorization-cache.json
```

**Step 3: Restart**
```bash
sudo systemctl start mcp-hub
sudo systemctl status mcp-hub
```

**Step 4: Verify**
```bash
# Check version
mcp-hub --version

# Check functionality
curl http://localhost:7000/api/filtering/stats | jq
```

**Step 5: Incident Report**
```markdown
# Rollback Incident Report

**Date**: YYYY-MM-DD HH:MM UTC
**Trigger**: [reason for rollback]
**Impact**: [user/system impact]
**Resolution**: Rolled back to v1.x.x
**Root Cause**: [technical analysis]
**Prevention**: [action items]
```

---

## FAQ

### General Questions

**Q: Is Sprint 3 a breaking change?**
A: No. Sprint 3 is 100% backward compatible. Existing configurations continue working unchanged.

**Q: Do I need to migrate?**
A: No. Migration is optional. Sprint 3 is an enhancement, not a replacement. Migrate only if you want improved accuracy or new features.

**Q: What happens if I don't configure LLM?**
A: MCP Hub falls back to Sprint 2 heuristic categorization. All features work normally without LLM.

### LLM Configuration

**Q: Which LLM provider should I choose?**
A:
- **Best performance**: OpenAI GPT-4o-mini
- **Best privacy**: Anthropic Claude 3.5 Haiku
- **Lowest cost**: Gemini 2.5 Flash

**Q: How much does LLM categorization cost?**
A: Typical costs with 1,000 tools and 90% cache hit rate:
- **OpenAI**: ~$0.50/month
- **Anthropic**: ~$1.00/month
- **Gemini**: ~$0.10/month (or free tier)

**Q: What happens if LLM API is down?**
A: Circuit breaker trips after 5 failures → automatic fallback to heuristic categorization. Tool filtering continues working.

### Performance

**Q: Does Sprint 3 slow down tool filtering?**
A: No. LLM calls are async and cached:
- **Sync path**: Still <10ms (heuristic categorization)
- **Async LLM**: Runs in background, updates cache
- **Cached results**: <5ms (cache lookup)

**Q: How long until cache warms up?**
A: With 1,000 tools and 5 concurrent LLM requests:
- **First run**: ~3-5 minutes (200 API calls)
- **After warmup**: 90%+ cache hit rate
- **Subsequent runs**: <5ms average

### Troubleshooting

**Q: LLM categorization not working?**
A: Check these steps:
```bash
# 1. Verify API key set
echo $OPENAI_API_KEY

# 2. Check LLM enabled in config
jq '.toolFiltering.llmCategorization.enabled' config/mcp-hub.json

# 3. Check circuit breaker state
curl http://localhost:7000/api/filtering/stats | \
  jq '.llm.circuitBreakerState'

# 4. Check error logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep LLM
```

**Q: Cache not persisting?**
A: Verify cache directory permissions:
```bash
ls -la ~/.cache/mcp-hub/
# Should be: drwx------ (700)

ls -la ~/.cache/mcp-hub/llm-categorization-cache.json
# Should be: -rw------- (600)
```

**Q: High API costs?**
A: Check cache efficiency:
```bash
curl http://localhost:7000/api/filtering/stats | \
  jq '{hitRate: .llmCache.hitRate, size: .llmCache.size}'

# If hitRate < 0.80, investigate:
# - Cache TTL too short?
# - Cache file not persisting?
# - Too many unique tools?
```

### Migration Issues

**Q: Configuration validation failing?**
A: Common issues:
```bash
# Check JSON syntax
cat config/mcp-hub.json | jq empty

# Verify environment variables referenced
grep '\${.*}' config/mcp-hub.json

# Ensure those variables are set
env | grep API_KEY
```

**Q: Tests failing after upgrade?**
A: Run diagnostic:
```bash
# Full test suite
bun test

# If failures, check:
# 1. Node/Bun version
bun --version  # Should be >= 1.0.0

# 2. Dependencies updated
bun install

# 3. Test data valid
bun test --reporter=verbose
```

---

## Additional Resources

### Documentation
- [Security Guide](./ML_TOOL_FILTERING_SECURITY_GUIDE.md)
- [Sprint 3 Roadmap](../SPRINT_3_ROADMAP.md)
- [Comprehensive Dashboard](../ML_TOOL_FILTERING_COMPREHENSIVE_DASHBOARD.md)

### Support
- GitHub Issues: https://github.com/your-org/mcp-hub/issues
- Documentation: https://mcp-hub.docs.example.com
- Community: https://discord.gg/mcp-hub

---

**Last Updated**: November 16, 2025
**Version**: 1.0 (Sprint 2 → Sprint 3)
**Maintained By**: MCP Hub Development Team
