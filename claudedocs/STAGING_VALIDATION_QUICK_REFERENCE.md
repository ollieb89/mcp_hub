# Staging Validation Quick Reference

Fast reference guide for executing the 24-48 hour staging validation strategy.

## Table of Contents
- [Day 1 (0-24h) Execution](#day-1-0-24h-execution)
- [Day 2 (24-48h) Execution](#day-2-24-48h-execution)
- [Critical Commands](#critical-commands)
- [Monitoring Dashboard](#monitoring-dashboard)
- [Troubleshooting](#troubleshooting)

---

## Day 1 (0-24h) Execution

### Hour 0-4: Immediate Validation

```bash
# Terminal 1: Start MCP Hub
cd /home/ob/Development/Tools/mcp-hub
bun start

# Terminal 2: Run immediate validation sequence
# (Run each command sequentially)

# H+0: Smoke tests (30s)
./scripts/staging-smoke-tests.sh

# H+0.5: Integration tests (2min)
bun test tests/prompt-based-filtering.test.js

# H+1: E2E validation (5min)
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
./scripts/test-analyze-prompt.sh "Read config.json and create PR"
./scripts/test-analyze-prompt.sh "List Docker containers"

# H+2: Load test (8min)
bun run test:load

# H+4: Log analysis
tail -n 1000 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep ERROR
# Expected: No ERROR entries
```

### Hour 0-4: Automated Monitoring

```bash
# Terminal 3: Real-time error monitoring
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep --color=always -E 'ERROR|WARN|hub__analyze_prompt'

# Terminal 4: Memory monitoring (every 1min)
watch -n 60 'ps aux | grep "bun.*mcp-hub" | awk "{print \$2, \$4, \$6}"'

# Terminal 5: Health checks (every 5min)
watch -n 300 'curl -sf http://localhost:7000/health || echo "HEALTH CHECK FAILED"'
```

### Hour 4-8: Functional Testing

```bash
# Test various prompt types
./scripts/test-analyze-prompt.sh "GitHub create issue"           # github category
./scripts/test-analyze-prompt.sh "Read package.json"             # filesystem category
./scripts/test-analyze-prompt.sh "Docker ps and logs"            # docker category
./scripts/test-analyze-prompt.sh "Git commit and push"           # git category
./scripts/test-analyze-prompt.sh "Read file and create PR"       # multi-category
./scripts/test-analyze-prompt.sh "Help with deployment"          # ambiguous prompt
./scripts/test-analyze-prompt.sh "$(printf 'word %.0s' {1..100})" # long prompt
```

### Hour 8-24: Stability Testing

```bash
# H+8: Stress test (15min)
bun run test:load:stress

# H+10: LLM spike test (3min)
bun run test:load:spike

# H+12: Capture memory baseline
ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt

# H+16: Start overnight endurance test (8h)
k6 run --vus 10 --duration 8h tests/load/basic-mcp-endpoint.js > endurance-test.log 2>&1 &

# H+16: Start overnight monitoring script
screen -dmS overnight-monitor bash -c './scripts/overnight-monitor.sh'
```

### Overnight Monitoring Script

```bash
#!/usr/bin/env bash
# scripts/overnight-monitor.sh

while true; do
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    MEMORY=$(ps aux | grep "bun.*mcp-hub" | awk '{print $6}')
    ERRORS=$(tail -n 100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -c ERROR)

    echo "$TIMESTAMP | Memory: ${MEMORY}KB | Errors (last 100): $ERRORS" >> staging-overnight-monitor.log

    # Alert if issues detected
    if [ "$MEMORY" -gt 614400 ] || [ "$ERRORS" -gt 0 ]; then
        echo "ALERT: $TIMESTAMP | Memory: ${MEMORY}KB | Errors: $ERRORS" >> staging-alerts.log
    fi

    sleep 600  # Every 10 minutes
done
```

### Hour 24: Day 1 Checkpoint

```bash
# Run comprehensive Day 1 checkpoint
./scripts/day1-checkpoint.sh

# Expected output:
# ✅ DAY 1 CHECKPOINT: GO FOR DAY 2
# All 5 categories passed

# Review overnight monitoring
cat staging-overnight-monitor.log
cat staging-alerts.log  # Should be empty or minimal
```

**GO/NO-GO Decision**:
- ✅ **GO**: All categories passed → Continue to Day 2
- ❌ **NO-GO**: Any failures → Investigate, fix, restart 24h period

---

## Day 2 (24-48h) Execution

### Hour 24-32: Edge Case & Regression Testing

```bash
# H+24: Run complete test suite (5min)
bun test

# H+26: Edge case tests (manual or scripted)
# Test various edge cases documented in strategy

# H+28: Malformed input testing
# SQL injection, XSS, Unicode edge cases

# H+32: Full regression suite with coverage
bun run test:coverage

# Expected: 482/482 tests passing, 82%+ coverage
```

### Hour 32-40: Performance Regression Testing

```bash
# H+32: Capture baseline (if not done pre-staging)
bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json

# H+32: Run performance regression check
./scripts/performance-regression-check.sh

# Expected: No regressions detected

# H+34: Stress test comparison
bun run test:load:stress > stress-test-current.log 2>&1
# Compare with historical results

# H+36: LLM spike test comparison
bun run test:load:spike > spike-test-current.log 2>&1

# H+38: Memory regression check
./scripts/memory-regression-check.sh

# Expected: Memory growth < 5%

# H+40: Performance checkpoint
echo "Performance Checkpoint:"
echo "- Load test: $(jq '.metrics.http_req_duration.values."p(95)"' test-results-current.json)ms p95"
echo "- Error rate: $(jq '.metrics.http_req_failed.values.rate' test-results-current.json)"
echo "- Memory: $(ps aux | grep bun | awk '{print $6}')KB"
```

### Hour 40-48: Final Validation

```bash
# H+40: Full test suite (final run)
bun test

# H+42: Load test (final run)
bun run test:load

# H+44: Complete log analysis
LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"
echo "Error analysis (48h period):"
echo "- ERROR count: $(grep -c ERROR "$LOG_FILE")"
echo "- WARN count: $(grep -c WARN "$LOG_FILE")"
echo "- Crashes: $(grep -c "uncaught exception" "$LOG_FILE")"

# H+46: Run final sign-off validation
./scripts/final-sign-off-validation.sh --verbose

# Expected: ✅ ALL SIGN-OFF CRITERIA MET - APPROVED FOR PRODUCTION

# H+48: Production promotion decision
# If all checks pass, proceed with production deployment
```

---

## Critical Commands

### Quick Health Check
```bash
# One-liner health check
curl -sf http://localhost:7000/health && echo "✅ Hub running" || echo "❌ Hub down"
```

### Quick Memory Check
```bash
# Current memory usage
ps aux | grep "bun.*mcp-hub" | awk '{print $6}' | awk '{sum+=$1} END {printf "%.2f MB\n", sum/1024}'
```

### Quick Error Check
```bash
# Recent errors (last 100 lines)
tail -n 100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep ERROR | wc -l
```

### Quick Test Status
```bash
# Run tests and show summary only
bun test 2>&1 | grep -E "passing|failing"
```

### Create Baseline Metrics
```bash
# Before staging deployment, capture baselines
bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json

ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt

bun test > baseline-test-results.txt 2>&1
```

### Compare Against Baseline
```bash
# Performance comparison
./scripts/performance-regression-check.sh

# Memory comparison
./scripts/memory-regression-check.sh

# Test suite comparison
bun test > current-test-results.txt 2>&1
diff <(grep -E '✓|✗' baseline-test-results.txt) \
     <(grep -E '✓|✗' current-test-results.txt)
```

---

## Monitoring Dashboard

### One-Command Dashboard
```bash
#!/usr/bin/env bash
# scripts/staging-dashboard.sh

clear
while true; do
    echo "=========================================="
    echo "  MCP Hub Staging Dashboard"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""

    # Health
    echo "HEALTH:"
    curl -sf http://localhost:7000/health > /dev/null && echo "  ✅ Hub running" || echo "  ❌ Hub down"
    echo ""

    # Memory
    echo "MEMORY:"
    MEM=$(ps aux | grep "bun.*mcp-hub" | awk '{sum+=$6} END {print sum}')
    MEM_MB=$(awk "BEGIN {printf \"%.2f\", $MEM/1024}")
    echo "  Current: ${MEM_MB}MB"
    echo "  Limit:   512MB"
    [ "$MEM" -lt 524288 ] && echo "  ✅ Within limit" || echo "  ⚠️  Exceeds limit"
    echo ""

    # Errors (last 10min)
    echo "RECENT ERRORS (last 10min):"
    ERR_COUNT=$(grep "$(date -d '10 minutes ago' '+%Y-%m-%d %H:%M')" ~/.local/state/mcp-hub/logs/mcp-hub.log 2>/dev/null | grep -c ERROR || echo 0)
    echo "  Count: $ERR_COUNT"
    [ "$ERR_COUNT" -eq 0 ] && echo "  ✅ No errors" || echo "  ⚠️  Errors detected"
    echo ""

    # Uptime
    echo "UPTIME:"
    UPTIME=$(ps -p $(pgrep -f "bun.*mcp-hub") -o etime= 2>/dev/null || echo "N/A")
    echo "  Process: $UPTIME"
    echo ""

    sleep 60
done
```

**Usage**:
```bash
./scripts/staging-dashboard.sh
```

---

## Troubleshooting

### Common Issues

#### Hub Not Responding
```bash
# Check if running
pgrep -f "bun.*mcp-hub" || echo "Not running"

# Check port
lsof -i :7000

# Restart
pkill -f "bun.*mcp-hub"
bun start
```

#### High Memory Usage
```bash
# Check memory
ps aux | grep "bun.*mcp-hub" | awk '{print $6}'

# Check for memory leaks
# Run endurance test and monitor over time
k6 run --vus 10 --duration 30m tests/load/basic-mcp-endpoint.js &
watch -n 60 'ps aux | grep bun | awk "{print \$6}"'
```

#### Test Failures
```bash
# Run specific test file
bun test tests/prompt-based-filtering.test.js

# Run with verbose output
bun test --reporter=verbose

# Check coverage
bun run test:coverage
```

#### Performance Degradation
```bash
# Run load test
bun run test:load

# Check for slow requests
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "took"

# Check Gemini API performance
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "LLM"
```

#### LLM Integration Issues
```bash
# Verify API key
echo $GEMINI_API_KEY

# Test LLM categorization
./scripts/test-analyze-prompt.sh "Test prompt"

# Check for API errors
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i "gemini\|llm"
```

---

## Quick Validation Checklist

### Pre-Staging Checklist
- [ ] Baseline metrics captured (`baseline-pre-staging.json`, `baseline-memory.txt`)
- [ ] All tests passing (482/482)
- [ ] Configuration valid (`mcp-servers.json`)
- [ ] Documentation complete
- [ ] Feature branch clean

### Day 1 Checkpoint (H+24)
- [ ] Smoke tests: 10/10 passing
- [ ] Integration tests: 23/23 passing
- [ ] Load test: p95 < 500ms
- [ ] Memory: < 512MB
- [ ] Logs: Zero ERROR entries
- [ ] **Decision**: GO / NO-GO for Day 2

### Day 2 Checkpoint (H+48)
- [ ] Full test suite: 482/482 passing
- [ ] Performance: No regressions
- [ ] Memory: No regressions
- [ ] Edge cases: All scenarios tested
- [ ] Documentation: Complete
- [ ] Rollback: Validated
- [ ] **Decision**: APPROVE / REJECT for production

---

## Key Metrics Reference

| Metric | Threshold | Command |
|--------|-----------|---------|
| p95 Latency | < 500ms | `jq '.metrics.http_req_duration.values."p(95)"' test-results-load.json` |
| Error Rate | < 1% | `jq '.metrics.http_req_failed.values.rate' test-results-load.json` |
| Memory Usage | < 512MB | `ps aux \| grep bun \| awk '{print $6}' \| awk '{printf "%.0f\n", $1/1024}'` |
| Test Pass Rate | 100% | `bun test 2>&1 \| grep -oP '\d+(?= passing)'` |
| Log Errors | 0 | `grep -c ERROR ~/.local/state/mcp-hub/logs/mcp-hub.log` |

---

## Timeline Summary

```
H+0   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Smoke + Integration
H+2   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Load Test
H+4   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Log Analysis
H+8   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Stress + Spike
H+16  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Endurance Start
H+24  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ DAY 1 CHECKPOINT ⚠️
H+32  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Regression Suite
H+40  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Final Validation
H+48  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ FINAL SIGN-OFF ✅
```

---

## Production Promotion

### Upon APPROVED Sign-Off
```bash
# 1. Merge feature branch
git checkout main
git merge fix/analyze-prompt-tool-activation

# 2. Tag release
git tag v4.2.0
git push origin main --tags

# 3. Update CHANGELOG
# Add v4.2.0 entry with feature description

# 4. Deploy to production
# Follow production deployment guide

# 5. Monitor initial 24h
# Heightened monitoring post-deployment
```

### Upon REJECTED Sign-Off
```bash
# 1. Document failures
# Create failure analysis report

# 2. Fix critical issues
# Address all P0/P1 issues identified

# 3. Restart validation
# Begin new 24-48h staging period

# 4. Update stakeholders
# Communicate delay and resolution plan
```

---

## Contact & Support

**For Issues**:
- Review: `claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md`
- Logs: `~/.local/state/mcp-hub/logs/mcp-hub.log`
- Documentation: `claudedocs/STAGING_VALIDATION_STRATEGY.md`

**Success Indicator**: 10/10 sign-off items ✅ → Production ready
