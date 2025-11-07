# Staging Deployment Guide: Analyze Prompt Feature

**Date**: 2025-11-07
**Feature**: LLM-based prompt analysis and tool categorization
**Status**: Ready for staging deployment

---

## Overview

This guide documents the staging deployment process for the analyze_prompt feature. Staging deployment validates the feature with real LLM providers before production release.

## Prerequisites

✅ **All Met** (as of 2025-11-07):
- Phase 1: Core implementation complete (6/6 tasks)
- Phase 2: Bug fixes complete (3/3 tasks)
- Phase 3: Testing infrastructure complete (3/3 tasks)
- Phase 4: Documentation complete (2/2 tasks)
- Automated tests: 482/482 passing (100%)
- Coverage: 82.94% branches (exceeds 80% standard)
- Validation script: 10/10 tests passing
- Configuration documentation: Complete
- Troubleshooting guide: Complete

## Staging Environment

### Configuration

**Staging Config File**: `mcp-servers.staging.json`

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
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/mcp-staging"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Environment Variables

**Required**:
```bash
export GEMINI_API_KEY="your-staging-gemini-key"
export GITHUB_PERSONAL_ACCESS_TOKEN="your-staging-github-token"
```

**Optional** (for debugging):
```bash
export DEBUG_TOOL_FILTERING=true
export ENABLE_PINO_LOGGER=true
```

## Deployment Steps

### 1. Create Staging Branch

```bash
# Ensure main branch is up to date
git checkout main
git pull origin main

# Create staging branch from current feature branch
git checkout fix/analyze-prompt-tool-activation
git checkout -b staging
git push origin staging
```

### 2. Configure Staging Environment

```bash
# Copy staging configuration
cp mcp-servers.staging.json mcp-servers.json

# Verify configuration
cat mcp-servers.json | jq '.toolFiltering'

# Set environment variables
export GEMINI_API_KEY="staging-key-here"
export GITHUB_PERSONAL_ACCESS_TOKEN="staging-github-token-here"
export DEBUG_TOOL_FILTERING=true

# Verify environment variables
echo "GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
echo "GITHUB_TOKEN: ${GITHUB_PERSONAL_ACCESS_TOKEN:0:10}..."
```

### 3. Deploy Application

```bash
# Stop any running instances
pkill -f "bun.*server.js" || true

# Pull latest staging code
git checkout staging
git pull origin staging

# Install dependencies
bun install

# Start with debug logging
DEBUG_TOOL_FILTERING=true bun start > staging.log 2>&1 &

# Wait for startup
sleep 5

# Verify running
curl http://localhost:7000/health
```

### 4. Run Smoke Tests

```bash
# Health check
curl -f http://localhost:7000/health || echo "Health check failed"

# Verify prompt-based mode enabled
jq '.toolFiltering.mode' mcp-servers.json | grep -q "prompt-based" || echo "Prompt-based mode not enabled"

# Verify LLM provider configured
jq '.toolFiltering.llmCategorization.enabled' mcp-servers.json | grep -q "true" || echo "LLM categorization not enabled"

# Run validation script
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# Verify exit code
if [ $? -eq 0 ]; then
    echo "✓ Validation script passed"
else
    echo "✗ Validation script failed"
    exit 1
fi
```

### 5. Run Integration Tests

```bash
# Run full test suite
bun test tests/prompt-based-filtering.test.js

# Expected: 23/23 tests passing

# Run with coverage
bun run test:coverage

# Expected: ≥80% branch coverage (currently 82.94%)
```

### 6. Run Load Tests

```bash
# Basic load test
bun run test:load

# Verify performance benchmarks:
# - LLM analysis: <2 seconds
# - Tool exposure update: <500ms
# - End-to-end flow: <3 seconds

# Check for errors in load test output
grep -i "error\|fail" tests/load/results/*.json
```

## Validation Period (24-48 hours)

### Day 1: Initial Validation

**Hour 0-4: Immediate Monitoring**
```bash
# Monitor logs in real-time
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "analyze_prompt|LLM|Tool exposure"

# Check for errors
grep -i "error" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20

# Monitor performance
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -10
```

**Hour 4-8: Functional Testing**
```bash
# Test various prompt types
./scripts/test-analyze-prompt.sh "Check my GitHub issues"
./scripts/test-analyze-prompt.sh "List files in current directory"
./scripts/test-analyze-prompt.sh "Show me recent commits"

# Verify different categories identified
grep "categories" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20
```

**Hour 8-24: Stability Testing**
```bash
# Run overnight load test
K6_DURATION=8h bun run test:load:soak &

# Monitor memory usage
while true; do
    ps aux | grep "bun.*server.js" | grep -v grep
    sleep 300  # Check every 5 minutes
done
```

### Day 2: Extended Validation

**Hour 24-36: Edge Case Testing**
```bash
# Test empty prompts
./scripts/test-analyze-prompt.sh ""

# Test very long prompts
./scripts/test-analyze-prompt.sh "$(cat claudedocs/TESTING_ANALYZE_PROMPT.md)"

# Test special characters
./scripts/test-analyze-prompt.sh "Test prompt with 'quotes' and \"escapes\" and \$variables"

# Test non-English prompts (if applicable)
./scripts/test-analyze-prompt.sh "Vérifier mes notifications GitHub"
```

**Hour 36-48: Performance Regression Testing**
```bash
# Run comprehensive performance tests
bun run test:load
bun run test:load:stress
bun run test:load:spike

# Compare against baseline metrics
# Expected: No degradation in performance
```

## Monitoring and Metrics

### Key Metrics to Track

**Performance Metrics**:
```bash
# LLM analysis time
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $NF}' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'

# Tool exposure update time
grep "Tool exposure updated" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $NF}' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'
```

**Error Metrics**:
```bash
# Count errors by type
grep -i "error" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $5}' | \
  sort | uniq -c | sort -rn

# LLM provider errors
grep "LLM provider error" ~/.local/state/mcp-hub/logs/mcp-hub.log | wc -l
```

**Usage Metrics**:
```bash
# Analyze prompt calls
grep "hub__analyze_prompt called" ~/.local/state/mcp-hub/logs/mcp-hub.log | wc -l

# Unique categories identified
grep "categories:" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk -F'categories:' '{print $2}' | \
  sort | uniq -c | sort -rn
```

### Performance Benchmarks

| Metric | Target | Acceptable | Action Required |
|--------|--------|------------|-----------------|
| LLM Analysis Time | <1.5s | <2s | >2s |
| Tool Exposure Update | <300ms | <500ms | >500ms |
| End-to-End Flow | <2.5s | <3s | >3s |
| Error Rate | <0.1% | <1% | >1% |
| Memory Usage | <200MB | <300MB | >300MB |

## Rollback Procedures

### Quick Rollback (Emergency)

```bash
# Stop staging instance
pkill -f "bun.*server.js"

# Revert to main branch
git checkout main
git pull origin main

# Use production config
cp mcp-servers.json.backup mcp-servers.json

# Restart with production config
bun start > production.log 2>&1 &

# Verify health
curl http://localhost:7000/health
```

### Gradual Rollback (Planned)

```bash
# Disable prompt-based filtering via config
jq '.toolFiltering.mode = "static"' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json

# Restart with updated config (no code changes)
pkill -f "bun.*server.js"
bun start > rollback.log 2>&1 &

# Verify static filtering works
./scripts/test-analyze-prompt.sh --validate-static-mode
```

## Success Criteria

### Must Pass (Blocking)

- ✅ All smoke tests pass
- ✅ Integration tests: 23/23 passing
- ✅ No critical errors in logs (24h period)
- ✅ Performance benchmarks met (all metrics in target/acceptable range)
- ✅ LLM provider responds successfully (>99% success rate)

### Should Pass (Important)

- ✅ Load tests pass without errors
- ✅ Memory usage stable (<300MB over 24h)
- ✅ No memory leaks detected
- ✅ Session isolation verified (multiple clients tested)
- ✅ Tool exposure updates correctly (verified via logs)

### Nice to Have (Optional)

- ⚪ Overnight soak test completes successfully
- ⚪ Edge case tests pass
- ⚪ Non-English prompt testing
- ⚪ Cross-browser testing (if web UI used)

## Troubleshooting

### Common Issues

**Issue: LLM Analysis Timeout**
```bash
# Check LLM provider connectivity
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'

# Solution: Increase timeout or switch provider
jq '.toolFiltering.llmCategorization.timeout = 5000' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json
```

**Issue: Tools Not Updating**
```bash
# Verify session state
grep "Tool exposure updated" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -5

# Solution: Check filterToolsBySessionCategories() is called
DEBUG_TOOL_FILTERING=true bun start
```

**Issue: High Memory Usage**
```bash
# Check for memory leaks
node --inspect bun start &
# Use Chrome DevTools to analyze heap snapshots

# Solution: Restart periodically or fix leak
```

See `claudedocs/TROUBLESHOOTING_ANALYZE_PROMPT.md` for complete troubleshooting guide.

## Post-Deployment Checklist

### Immediate (Day 0)

- [ ] Staging branch created and deployed
- [ ] Configuration applied successfully
- [ ] Environment variables set securely
- [ ] Health check passes
- [ ] Smoke tests pass (5/5)
- [ ] Integration tests pass (23/23)
- [ ] No critical errors in initial logs

### Day 1

- [ ] Functional testing complete (various prompt types)
- [ ] Performance metrics within targets
- [ ] Error rate <1%
- [ ] Memory usage stable
- [ ] Load tests pass

### Day 2

- [ ] Extended validation complete (48h)
- [ ] Edge case testing complete
- [ ] Performance regression tests pass
- [ ] No degradation in key metrics
- [ ] Overnight soak test passes
- [ ] Rollback procedure tested (dry run)

### Sign-Off

- [ ] All must-pass criteria met
- [ ] All should-pass criteria met
- [ ] No unresolved critical issues
- [ ] Metrics documented and archived
- [ ] Lessons learned documented
- [ ] Ready for production deployment (TASK-021)

---

**Deployment Lead**: [Your Name]
**Sign-Off Date**: [YYYY-MM-DD]
**Production Target**: After 24-48h validation + sign-off
