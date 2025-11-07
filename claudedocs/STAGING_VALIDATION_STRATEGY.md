# Staging Validation Strategy - 24-48 Hour Testing Period

Comprehensive testing and validation strategy for the `hub__analyze_prompt` feature staging deployment, ensuring production readiness through systematic validation.

## Table of Contents
1. [Overview](#overview)
2. [Scheduled Test Execution Timeline](#scheduled-test-execution-timeline)
3. [Edge Case Test Matrix](#edge-case-test-matrix)
4. [Regression Detection Strategy](#regression-detection-strategy)
5. [Checkpoint Validation Criteria](#checkpoint-validation-criteria)
6. [Final Sign-Off Checklist](#final-sign-off-checklist)
7. [Appendix: Test Execution Commands](#appendix-test-execution-commands)

---

## Overview

### Validation Scope
- **Feature**: Prompt-based tool filtering with `hub__analyze_prompt` meta-tool
- **Duration**: 24-48 hours staged validation
- **Goal**: Zero critical defects, performance within baseline, stable memory usage
- **Exit Criteria**: 10/10 sign-off checklist items passed

### Test Asset Inventory

| Asset | Type | Coverage | Status |
|-------|------|----------|--------|
| `scripts/staging-smoke-tests.sh` | Smoke Tests | 10 configuration & health checks | ✅ All Passed |
| `tests/prompt-based-filtering.test.js` | Integration Tests | 23 functional scenarios | ✅ All Passed |
| `scripts/test-analyze-prompt.sh` | E2E Validation | End-to-end workflow | ✅ Validated |
| `tests/load/basic-mcp-endpoint.js` | Load Test | Normal operational load | 📦 Ready |
| `tests/load/stress-test.js` | Stress Test | System breaking point | 📦 Ready |
| `tests/load/spike-test-llm.js` | Spike Test | LLM filtering burst load | 📦 Ready |

---

## 1. Scheduled Test Execution Timeline

### Day 1 (0-24h): Intensive Monitoring

#### Hour 0-4: Immediate Validation Phase
**Focus**: Immediate error detection and functional verification

| Time | Test Type | Command | Expected Duration | Success Criteria |
|------|-----------|---------|-------------------|------------------|
| H+0 | Smoke Tests | `./scripts/staging-smoke-tests.sh` | 30s | 10/10 tests pass |
| H+0.5 | Integration Suite | `bun test tests/prompt-based-filtering.test.js` | 2min | 23/23 tests pass |
| H+1 | E2E Validation (10 prompts) | See [E2E Test Script](#e2e-test-script) | 5min | 10/10 scenarios pass |
| H+2 | Basic Load Test | `bun run test:load` | 8min | p95 < 500ms, errors < 1% |
| H+4 | Log Analysis Checkpoint | `tail -n 1000 ~/.local/state/mcp-hub/logs/mcp-hub.log \| grep ERROR` | 2min | Zero ERROR entries |

**Automated Monitoring** (Continuous H0-H4):
```bash
# Terminal 1: Real-time error monitoring
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep --color=always -E 'ERROR|WARN|hub__analyze_prompt'

# Terminal 2: Memory monitoring
watch -n 60 'ps aux | grep "bun.*mcp-hub" | awk "{print \$2, \$4, \$6}"'

# Terminal 3: Health checks (every 5 min)
watch -n 300 'curl -sf http://localhost:7000/health || echo "HEALTH CHECK FAILED"'
```

#### Hour 4-8: Functional Diversity Testing
**Focus**: Various prompt types and edge cases

| Time | Test Category | Test Count | Scenarios |
|------|---------------|------------|-----------|
| H+4 | Standard Prompts | 20 | GitHub, filesystem, docker, git operations |
| H+5 | Multi-Category Prompts | 10 | "Read config.json and create PR" |
| H+6 | Ambiguous Prompts | 10 | "Help me with deployment" |
| H+7 | Long Prompts (>500 chars) | 5 | Complex multi-step descriptions |
| H+8 | Session Isolation | 5 | 3 parallel sessions with different categories |

**Test Execution Script**: See [Functional Diversity Test Script](#functional-diversity-test-script)

#### Hour 8-24: Stability & Overnight Monitoring
**Focus**: Extended stability and performance consistency

| Time | Test Type | Command | Expected Duration | Success Criteria |
|------|-----------|---------|-------------------|------------------|
| H+8 | Stress Test | `bun run test:load:stress` | 15min | p95 < 2s, errors < 10% |
| H+10 | LLM Spike Test | `bun run test:load:spike` | 3min | p95 < 3s, errors < 5% |
| H+12 | Memory Baseline Capture | `ps aux \| grep bun` | 1min | Memory usage recorded |
| H+16 | Overnight Endurance Start | `k6 run --vus 10 --duration 8h tests/load/basic-mcp-endpoint.js` | 8h | p95 < 500ms stable |
| H+24 | Day 1 Checkpoint | See [Day 1 Checkpoint](#day-1-checkpoint) | 15min | All criteria met |

**Automated Overnight Monitoring** (H8-H24):
```bash
#!/usr/bin/env bash
# overnight-monitor.sh - Run in screen/tmux session

while true; do
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    MEMORY=$(ps aux | grep "bun.*mcp-hub" | awk '{print $6}')
    ERRORS=$(tail -n 100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -c ERROR)

    echo "$TIMESTAMP | Memory: ${MEMORY}KB | Errors (last 100 lines): $ERRORS" >> staging-overnight-monitor.log

    # Alert if memory > 600MB or errors > 0
    if [ "$MEMORY" -gt 614400 ] || [ "$ERRORS" -gt 0 ]; then
        echo "ALERT: $TIMESTAMP | Memory: ${MEMORY}KB | Errors: $ERRORS" >> staging-alerts.log
    fi

    sleep 600  # Every 10 minutes
done
```

### Day 2 (24-48h): Extended Validation

#### Hour 24-32: Edge Case & Regression Testing
**Focus**: Advanced scenarios and regression detection

| Time | Test Category | Test Count | Scenarios |
|------|---------------|------------|-----------|
| H+24 | Error Conditions | 10 | Invalid prompts, LLM failures, network errors |
| H+26 | Rate Limit Testing | 5 | Gemini API rate limit simulation |
| H+28 | Malformed Input | 10 | SQL injection, XSS, Unicode edge cases |
| H+30 | Category Persistence | 5 | Verify exposed categories persist across requests |
| H+32 | Regression Suite | ALL | Run complete test suite (482 tests) |

**Regression Test Command**:
```bash
# Full regression suite with coverage
bun run test:coverage

# Expected Results:
# - 482/482 tests passing (100%)
# - Coverage: >82% branches
# - No new failures introduced
```

#### Hour 32-40: Performance Regression Testing
**Focus**: Performance baseline validation

| Time | Test Type | Baseline Comparison | Acceptance Threshold |
|------|-----------|---------------------|----------------------|
| H+32 | Basic Load Test | Compare against baseline-metrics.json | p95 within 10% of baseline |
| H+34 | Stress Test | Historical stress test results | Breaking point within 15% |
| H+36 | LLM Spike Test | Initial spike test results | Latency within 20% (external API variance) |
| H+38 | Memory Regression | H+12 baseline memory | Memory growth < 5% |
| H+40 | Performance Checkpoint | Aggregate all metrics | All tests within thresholds |

**Performance Comparison Script**: See [Performance Regression Script](#performance-regression-script)

#### Hour 40-48: Final Validation & Sign-Off
**Focus**: Comprehensive validation and production readiness

| Time | Validation Step | Duration | Success Criteria |
|------|----------------|----------|------------------|
| H+40 | Full Test Suite | 5min | 482/482 passing |
| H+42 | Load Test (Final) | 8min | p95 < 500ms |
| H+44 | Log Analysis (Complete) | 10min | Zero critical errors in 48h |
| H+46 | Final Sign-Off Checklist | 15min | 10/10 items checked |
| H+48 | Production Promotion Decision | - | GO/NO-GO decision |

---

## 2. Edge Case Test Matrix

### Category 1: Input Validation Edge Cases

| Test ID | Scenario | Input | Expected Behavior | Validation |
|---------|----------|-------|-------------------|------------|
| EC-01 | Empty prompt | `""` | Error: prompt required | `error` field present |
| EC-02 | Whitespace-only prompt | `"   "` | Error: invalid prompt | `error` field present |
| EC-03 | Very long prompt (10KB) | 10,000 char prompt | Truncation or processing | Success or graceful error |
| EC-04 | Unicode characters | `"検索 GitHub リポジトリ"` | Categorization success | Categories returned |
| EC-05 | Special characters | `"<script>alert('xss')</script>"` | Sanitized processing | No code execution |
| EC-06 | SQL injection attempt | `"'; DROP TABLE tools; --"` | Safe processing | No database impact |
| EC-07 | Null/undefined prompt | `null` | Error: prompt required | `error` field present |
| EC-08 | Array instead of string | `["test", "prompt"]` | Type error | `error` field present |
| EC-09 | Numeric prompt | `12345` | Type coercion or error | Defined behavior |
| EC-10 | Multi-line prompt with newlines | `"Line 1\nLine 2\nLine 3"` | Normal processing | Categories returned |

**Execution Script**:
```bash
#!/usr/bin/env bash
# test-edge-cases-input.sh

BASE_URL="http://localhost:7000"
SESSION_ID="edge-case-$(date +%s)"

test_edge_case() {
    local test_id="$1"
    local prompt="$2"
    local expected="$3"

    echo "Testing $test_id: $expected"

    RESPONSE=$(curl -s -X POST "${BASE_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 1,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"hub__analyze_prompt\",
                \"arguments\": {
                    \"prompt\": ${prompt}
                }
            }
        }")

    # Validate response
    if echo "$RESPONSE" | jq -e '.error or .result.content[0].text | fromjson | .error' > /dev/null; then
        echo "✓ $test_id: Expected error behavior"
    elif echo "$RESPONSE" | jq -e '.result.content[0].text | fromjson | .categories' > /dev/null; then
        echo "✓ $test_id: Successful categorization"
    else
        echo "✗ $test_id: Unexpected response format"
    fi
}

# Run tests
test_edge_case "EC-01" '""' "Error: prompt required"
test_edge_case "EC-02" '"   "' "Error: invalid prompt"
test_edge_case "EC-04" '"検索 GitHub リポジトリ"' "Unicode handling"
test_edge_case "EC-05" '"<script>alert(\"xss\")</script>"' "XSS prevention"
# Add remaining tests...
```

### Category 2: LLM Provider Edge Cases

| Test ID | Scenario | Setup | Expected Behavior | Validation |
|---------|----------|-------|-------------------|------------|
| EC-20 | LLM API timeout | Mock 10s timeout | Fallback to heuristic | Categories via fallback |
| EC-21 | LLM rate limit (429) | Simulate rate limit | Graceful error or retry | Error message or fallback |
| EC-22 | Invalid API key | Wrong `GEMINI_API_KEY` | Error message | Suggests config check |
| EC-23 | Malformed LLM response | Mock invalid JSON | Fallback categorization | Heuristic categories |
| EC-24 | LLM returns empty categories | Mock `[]` response | Fallback to heuristic | Non-empty categories |
| EC-25 | LLM confidence = 0 | Mock low confidence | Warning + fallback | `confidence` < threshold |
| EC-26 | LLM service unavailable (503) | Mock service down | Graceful degradation | Fallback categories |
| EC-27 | Network error during LLM call | Disconnect network briefly | Error handling | Error or fallback |
| EC-28 | Concurrent LLM calls (100) | Spike test scenario | Rate limiting or queuing | No crashes |
| EC-29 | LLM provider switch (Gemini→OpenAI) | Change config mid-session | New provider used | Correct provider in logs |

**Execution Approach**:
```bash
# Use mock server or environment manipulation
# Example: LLM API timeout simulation
export GEMINI_API_KEY="invalid-key-for-testing"
./scripts/test-analyze-prompt.sh "Test prompt"
# Expected: Fallback categorization with error logged
```

### Category 3: Session & Concurrency Edge Cases

| Test ID | Scenario | Setup | Expected Behavior | Validation |
|---------|----------|-------|-------------------|------------|
| EC-40 | 100 concurrent sessions | Spawn 100 parallel clients | Session isolation maintained | Each session independent |
| EC-41 | Session without initialization | Skip `initializeClientSession()` | Graceful fallback to all tools | Backward compatibility |
| EC-42 | Rapid session creation/destruction | Create/delete 50 sessions/sec | No memory leaks | Memory stable |
| EC-43 | Session ID collision | Reuse same session ID | Session state preserved | Correct state per ID |
| EC-44 | Very long session (24h+) | Keep session active 24h | No stale data | Fresh tool lists |
| EC-45 | Interleaved analyze_prompt calls | 5 rapid calls in 1 session | Additive category exposure | All categories accumulated |
| EC-46 | Session cleanup on disconnect | Close SSE connection | Session data removed | No orphaned sessions |
| EC-47 | Cross-session category pollution | Session A exposes github, Session B checks | Session B unaffected | Zero cross-pollution |
| EC-48 | Session revival after timeout | Session idle 1h, then request | Session still valid or recreated | Graceful handling |
| EC-49 | Concurrent category updates | 10 threads update same session | Race condition handling | Consistent final state |

**Concurrent Session Test**:
```bash
#!/usr/bin/env bash
# test-concurrent-sessions.sh

for i in {1..100}; do
    SESSION_ID="concurrent-test-$i"

    (
        curl -s -X POST "http://localhost:7000/mcp/messages?sessionId=${SESSION_ID}" \
            -H "Content-Type: application/json" \
            -d '{
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "hub__analyze_prompt",
                    "arguments": {"prompt": "Test prompt '$i'"}
                }
            }' > /dev/null 2>&1 &
    )
done

wait
echo "All 100 concurrent sessions completed"
```

### Category 4: Category & Tool Exposure Edge Cases

| Test ID | Scenario | Setup | Expected Behavior | Validation |
|---------|----------|-------|-------------------|------------|
| EC-60 | Expose non-existent category | `["invalid-category"]` | Graceful handling | No crash, empty tools |
| EC-61 | Expose "all" category | `["all"]` | All tools exposed | Full tool list |
| EC-62 | Duplicate category exposure | `["github", "github"]` | Deduplication | Single github exposure |
| EC-63 | Case sensitivity in categories | `["GitHub", "github"]` | Normalized handling | Consistent behavior |
| EC-64 | 50+ category exposure | Expose all available categories | Performance acceptable | p95 < 1s |
| EC-65 | Additive mode accumulation | Expose 10 categories additively | All accumulated | 10+ meta categories |
| EC-66 | Replace mode clears previous | Expose github, then filesystem (replace) | Only filesystem + meta | No github tools |
| EC-67 | Meta-tool persistence | Expose categories, verify meta | Meta always present | `hub__analyze_prompt` exists |
| EC-68 | Category exposure after sync | `syncCapabilities()` called | Exposed categories preserved | No reset |
| EC-69 | Zero categories exposed initially | `defaultExposure: "zero"` | No tools except after analyze | Empty initial list |

---

## 3. Regression Detection Strategy

### 3.1 Performance Regression Detection

**Baseline Establishment** (Pre-Staging):
```bash
# Capture baseline metrics before staging deployment
bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json

# Capture memory baseline
ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt
```

**Regression Comparison** (Post-Staging):
```bash
#!/usr/bin/env bash
# performance-regression-check.sh

BASELINE="baseline-pre-staging.json"
CURRENT="test-results-current.json"

# Run current load test
bun run test:load:ci
mv test-results-load.json "$CURRENT"

# Extract key metrics
BASELINE_P95=$(jq '.metrics.http_req_duration.values.p95' "$BASELINE")
CURRENT_P95=$(jq '.metrics.http_req_duration.values.p95' "$CURRENT")

BASELINE_ERR=$(jq '.metrics.http_req_failed.values.rate' "$BASELINE")
CURRENT_ERR=$(jq '.metrics.http_req_failed.values.rate' "$CURRENT")

# Calculate regression percentage
P95_DELTA=$(awk "BEGIN {printf \"%.2f\", (($CURRENT_P95 - $BASELINE_P95) / $BASELINE_P95) * 100}")
ERR_DELTA=$(awk "BEGIN {printf \"%.2f\", (($CURRENT_ERR - $BASELINE_ERR) / $BASELINE_ERR) * 100}")

# Regression thresholds
P95_THRESHOLD=10  # 10% degradation acceptable
ERR_THRESHOLD=50  # 50% error rate increase acceptable

# Check for regressions
REGRESSION_DETECTED=false

if (( $(echo "$P95_DELTA > $P95_THRESHOLD" | bc -l) )); then
    echo "⚠️  PERFORMANCE REGRESSION: p95 latency increased by ${P95_DELTA}% (threshold: ${P95_THRESHOLD}%)"
    REGRESSION_DETECTED=true
fi

if (( $(echo "$ERR_DELTA > $ERR_THRESHOLD" | bc -l) )); then
    echo "⚠️  ERROR RATE REGRESSION: Error rate increased by ${ERR_DELTA}% (threshold: ${ERR_THRESHOLD}%)"
    REGRESSION_DETECTED=true
fi

if [ "$REGRESSION_DETECTED" = false ]; then
    echo "✅ No performance regressions detected"
    exit 0
else
    echo "❌ Performance regression detected - review required"
    exit 1
fi
```

### 3.2 Functional Regression Detection

**Test Suite Comparison**:
```bash
#!/usr/bin/env bash
# functional-regression-check.sh

# Run full test suite before staging
bun test > baseline-test-results.txt 2>&1

# ... deploy to staging ...

# Run full test suite in staging
bun test > staging-test-results.txt 2>&1

# Compare results
BASELINE_PASS=$(grep -oP '\d+(?= passing)' baseline-test-results.txt)
STAGING_PASS=$(grep -oP '\d+(?= passing)' staging-test-results.txt)

if [ "$STAGING_PASS" -lt "$BASELINE_PASS" ]; then
    echo "❌ FUNCTIONAL REGRESSION: Passed tests decreased from $BASELINE_PASS to $STAGING_PASS"

    # Show which tests failed
    diff <(grep -E '✓|✗' baseline-test-results.txt) \
         <(grep -E '✓|✗' staging-test-results.txt)

    exit 1
else
    echo "✅ No functional regressions detected ($STAGING_PASS/$BASELINE_PASS tests passing)"
    exit 0
fi
```

### 3.3 Memory Regression Detection

**Memory Monitoring**:
```bash
#!/usr/bin/env bash
# memory-regression-check.sh

BASELINE_MEM=$(cat baseline-memory.txt)  # KB
CURRENT_MEM=$(ps aux | grep "bun.*mcp-hub" | awk '{print $6}')  # KB

MEM_INCREASE=$(awk "BEGIN {printf \"%.2f\", (($CURRENT_MEM - $BASELINE_MEM) / $BASELINE_MEM) * 100}")

MEM_THRESHOLD=5  # 5% memory increase acceptable

if (( $(echo "$MEM_INCREASE > $MEM_THRESHOLD" | bc -l) )); then
    echo "⚠️  MEMORY REGRESSION: Memory usage increased by ${MEM_INCREASE}% (threshold: ${MEM_THRESHOLD}%)"
    echo "Baseline: ${BASELINE_MEM}KB | Current: ${CURRENT_MEM}KB"
    exit 1
else
    echo "✅ No memory regression detected (Increase: ${MEM_INCREASE}%)"
    exit 0
fi
```

### 3.4 Regression Test Schedule

| Time | Regression Type | Script | Frequency | Alert Threshold |
|------|----------------|--------|-----------|-----------------|
| Every 4h | Performance | `performance-regression-check.sh` | 6x/day | p95 +10% |
| H+8, H+24, H+48 | Functional | `functional-regression-check.sh` | 3x/period | Any test failure |
| Every 2h | Memory | `memory-regression-check.sh` | 12x/day | Memory +5% |
| H+24, H+48 | Coverage | `bun run test:coverage` | 2x/period | Coverage -2% |

---

## 4. Checkpoint Validation Criteria

### Day 1 Checkpoint (H+24)

**Validation Checklist**:

✅ **1. Functional Stability**
- [ ] All integration tests passing (23/23)
- [ ] E2E validation suite passing (100%)
- [ ] Zero critical errors in logs (ERROR level)
- [ ] No unexpected warnings (>10 WARN entries)

✅ **2. Performance Baseline**
- [ ] p95 latency within 10% of baseline
- [ ] Error rate < 1%
- [ ] Throughput ≥ 100 req/s
- [ ] LLM categorization p95 < 3s

✅ **3. Memory Stability**
- [ ] Memory usage < 512MB
- [ ] No memory growth over 8h endurance test
- [ ] No memory leaks detected
- [ ] RSS memory stable (±5% variance)

✅ **4. Edge Case Coverage**
- [ ] 30/30 edge case tests passing
- [ ] All input validation scenarios handled
- [ ] LLM failure scenarios gracefully handled
- [ ] Session isolation verified

✅ **5. Regression Status**
- [ ] No performance regressions detected
- [ ] No functional regressions introduced
- [ ] No memory regressions observed
- [ ] Code coverage maintained (≥82%)

**Day 1 Checkpoint Command**:
```bash
#!/usr/bin/env bash
# day1-checkpoint.sh

echo "=========================================="
echo "  Day 1 Checkpoint Validation (H+24)"
echo "=========================================="

# 1. Functional Stability
echo "1. Functional Stability Check..."
bun test tests/prompt-based-filtering.test.js && echo "✅ Integration tests passing" || echo "❌ Integration tests failed"

# 2. Performance Baseline
echo "2. Performance Baseline Check..."
./performance-regression-check.sh

# 3. Memory Stability
echo "3. Memory Stability Check..."
./memory-regression-check.sh

# 4. Edge Case Coverage
echo "4. Edge Case Coverage Check..."
./test-edge-cases-input.sh

# 5. Regression Status
echo "5. Regression Status Check..."
./functional-regression-check.sh

echo "=========================================="
echo "  Day 1 Checkpoint Complete"
echo "=========================================="
```

**GO/NO-GO Decision**:
- **GO**: All 5 checklist items passed → Proceed to Day 2
- **NO-GO**: Any critical failure → Investigate, fix, restart 24h period

---

## 5. Final Sign-Off Checklist

### Pre-Production Sign-Off Criteria (H+48)

**Complete checklist required for production promotion**:

#### 1. ✅ Test Coverage Validation
- [ ] **Unit Tests**: 482/482 tests passing (100% pass rate)
- [ ] **Integration Tests**: 23/23 prompt-based filtering tests passing
- [ ] **E2E Tests**: 100+ end-to-end scenarios validated
- [ ] **Edge Cases**: All 30+ edge case tests passing
- [ ] **Code Coverage**: ≥82% branch coverage maintained

**Validation Command**:
```bash
bun run test:coverage
# Expected: 482 tests passing, 82%+ branch coverage
```

#### 2. ✅ Performance Benchmarks Met
- [ ] **Basic Load Test**: p95 < 500ms, errors < 1%
- [ ] **Stress Test**: System handles 300+ concurrent users
- [ ] **Spike Test**: LLM filtering p95 < 3s, errors < 5%
- [ ] **Throughput**: ≥100 req/s sustained
- [ ] **No Performance Regressions**: Within 10% of baseline

**Validation Command**:
```bash
bun run test:load:ci
./performance-regression-check.sh
```

#### 3. ✅ Memory Usage Stable
- [ ] **Peak Memory**: < 512MB under load
- [ ] **Memory Growth**: < 5% over 48h period
- [ ] **No Memory Leaks**: Endurance test shows flat memory profile
- [ ] **RSS Stability**: ±5% variance over 24h
- [ ] **Cleanup Verified**: Session cleanup removes all data

**Validation Command**:
```bash
ps aux | grep "bun.*mcp-hub" | awk '{print $6}'  # Should be < 512MB
./memory-regression-check.sh
```

#### 4. ✅ Error-Free Logs
- [ ] **Zero Critical Errors**: No ERROR level entries in 48h
- [ ] **Warnings Acceptable**: < 20 WARN entries total
- [ ] **No Crashes**: Zero unexpected restarts
- [ ] **No Stack Traces**: No uncaught exceptions logged
- [ ] **Graceful Degradation**: All failures handled properly

**Validation Command**:
```bash
# Check for errors
grep -c ERROR ~/.local/state/mcp-hub/logs/mcp-hub.log
# Expected: 0

# Check warnings
grep -c WARN ~/.local/state/mcp-hub/logs/mcp-hub.log
# Expected: < 20
```

#### 5. ✅ Feature Functionality Verified
- [ ] **Meta-Tool Registration**: `hub__analyze_prompt` always available
- [ ] **LLM Categorization**: 100+ successful categorizations
- [ ] **Session Isolation**: Verified across 50+ concurrent sessions
- [ ] **Category Exposure**: Dynamic exposure working correctly
- [ ] **Fallback Behavior**: Heuristic fallback works when LLM fails

**Validation Command**:
```bash
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
# Expected: Successful categorization with categories=['github']
```

#### 6. ✅ Cross-Browser/Client Compatibility
- [ ] **Claude Desktop**: Tested and working
- [ ] **Cline**: Tested and working
- [ ] **Continue**: Tested and working (if applicable)
- [ ] **Custom Clients**: Any additional clients tested
- [ ] **API Compatibility**: MCP protocol compliance verified

**Validation Approach**:
Manual testing with each MCP client, documenting successful workflows.

#### 7. ✅ Documentation Complete
- [ ] **User Guide**: `PROMPT_BASED_FILTERING_QUICK_START.md` complete
- [ ] **Deployment Guide**: `DEPLOYMENT_STAGING.md` complete
- [ ] **Troubleshooting Guide**: `TROUBLESHOOTING_MCP_CONNECTION.md` updated
- [ ] **CLAUDE.md**: Updated with prompt-based filtering section
- [ ] **CHANGELOG.md**: Feature documented in v4.2.0 entry

**Validation Command**:
```bash
ls -1 claudedocs/*.md | wc -l  # Should include all required docs
```

#### 8. ✅ Configuration Validation
- [ ] **Example Config**: `mcp-servers.example.json` updated
- [ ] **Config Schema**: All new options documented
- [ ] **Environment Variables**: `GEMINI_API_KEY` handling verified
- [ ] **Defaults Sensible**: `defaultExposure: "meta-only"` works well
- [ ] **Migration Path**: Existing configs still work (backward compat)

**Validation Command**:
```bash
# Verify example config is valid
jq empty mcp-servers.example.json && echo "✅ Valid JSON"
```

#### 9. ✅ Rollback Plan Validated
- [ ] **Git Branch Clean**: Feature branch ready for merge
- [ ] **Rollback Script**: Documented in deployment guide
- [ ] **Rollback Tested**: Reverting to v4.1.x works
- [ ] **Data Migration**: No schema changes requiring migration
- [ ] **Backward Compatibility**: Clients without feature still work

**Validation Approach**:
```bash
# Test rollback scenario
git stash
git checkout v4.1.2
bun start  # Should work without errors
git checkout fix/analyze-prompt-tool-activation  # Return to staging
```

#### 10. ✅ Stakeholder Sign-Off
- [ ] **Development Lead**: Feature complete and tested
- [ ] **QA Engineer**: All test scenarios passed
- [ ] **Product Owner**: Feature meets requirements
- [ ] **Security Review**: No security concerns (if applicable)
- [ ] **Production Owner**: Ready for deployment

**Sign-Off Document**:
Create `SIGN_OFF_APPROVAL.md` with:
```markdown
# Production Sign-Off Approval

**Feature**: Prompt-Based Tool Filtering with hub__analyze_prompt
**Version**: 4.2.0
**Date**: 2025-11-XX

## Approvals

- [x] **Development Lead**: @username - APPROVED
- [x] **QA Engineer**: @username - APPROVED
- [x] **Product Owner**: @username - APPROVED

## Validation Summary
- Test Pass Rate: 482/482 (100%)
- Performance: p95 = XXXms (< 500ms threshold)
- Memory: XXX MB (< 512MB threshold)
- Errors: 0 critical errors in 48h

## Production Promotion Decision
**Status**: ✅ APPROVED FOR PRODUCTION

**Deployment Date**: 2025-11-XX
**Deployment Window**: Off-peak hours (02:00-04:00 UTC)
```

### Final Sign-Off Execution

**Complete Sign-Off Validation**:
```bash
#!/usr/bin/env bash
# final-sign-off-validation.sh

echo "=========================================="
echo "  Final Production Sign-Off Validation"
echo "=========================================="

PASS_COUNT=0
FAIL_COUNT=0

check_item() {
    local item="$1"
    local command="$2"

    echo ""
    echo "Checking: $item"

    if eval "$command"; then
        echo "✅ PASS: $item"
        ((PASS_COUNT++))
    else
        echo "❌ FAIL: $item"
        ((FAIL_COUNT++))
    fi
}

# Run all 10 checklist items
check_item "1. Test Coverage" "bun test > /dev/null 2>&1"
check_item "2. Performance Benchmarks" "./performance-regression-check.sh > /dev/null 2>&1"
check_item "3. Memory Stability" "./memory-regression-check.sh > /dev/null 2>&1"
check_item "4. Error-Free Logs" "[ \$(grep -c ERROR ~/.local/state/mcp-hub/logs/mcp-hub.log) -eq 0 ]"
check_item "5. Feature Functionality" "./scripts/test-analyze-prompt.sh 'Test' > /dev/null 2>&1"
check_item "6. Documentation" "[ -f claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md ]"
check_item "7. Configuration" "jq empty mcp-servers.example.json > /dev/null 2>&1"
check_item "8. Rollback Plan" "[ -f claudedocs/DEPLOYMENT_STAGING.md ]"
check_item "9. Edge Cases" "./test-edge-cases-input.sh > /dev/null 2>&1"
check_item "10. Regression Status" "./functional-regression-check.sh > /dev/null 2>&1"

echo ""
echo "=========================================="
echo "  Sign-Off Summary"
echo "=========================================="
echo "Total Checks: 10"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ ALL SIGN-OFF CRITERIA MET - APPROVED FOR PRODUCTION"
    exit 0
else
    echo "❌ SIGN-OFF CRITERIA NOT MET - DO NOT PROMOTE TO PRODUCTION"
    exit 1
fi
```

---

## Appendix: Test Execution Commands

### E2E Test Script
```bash
#!/usr/bin/env bash
# e2e-test-10-scenarios.sh

declare -a PROMPTS=(
    "Check my GitHub notifications"
    "Read config.json and create a pull request"
    "List all files in the current directory"
    "Search Docker containers and logs"
    "Help me deploy to production"
    "Analyze memory usage and optimize"
    "Create a Python virtual environment"
    "Connect to PostgreSQL database"
    "Monitor web server performance"
    "Collaborate on code review"
)

PASS=0
FAIL=0

for i in "${!PROMPTS[@]}"; do
    PROMPT="${PROMPTS[$i]}"
    echo "Test $((i+1))/10: $PROMPT"

    if ./scripts/test-analyze-prompt.sh "$PROMPT" > /dev/null 2>&1; then
        echo "✅ PASS"
        ((PASS++))
    else
        echo "❌ FAIL"
        ((FAIL++))
    fi
done

echo ""
echo "E2E Test Results: $PASS/$((PASS+FAIL)) passed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

### Functional Diversity Test Script
```bash
#!/usr/bin/env bash
# functional-diversity-tests.sh

BASE_URL="http://localhost:7000"

# Standard prompts (20)
STANDARD_PROMPTS=(
    "Create a GitHub PR"
    "Read README.md"
    "Start Docker container"
    "Git commit changes"
    # ... 16 more
)

# Multi-category prompts (10)
MULTI_PROMPTS=(
    "Read config and create PR"
    "Search files and commit to git"
    # ... 8 more
)

# Ambiguous prompts (10)
AMBIGUOUS_PROMPTS=(
    "Help with deployment"
    "Fix the build"
    # ... 8 more
)

# Long prompts (5)
LONG_PROMPTS=(
    "$(printf 'word %.0s' {1..100})"
    # ... 4 more
)

# Execute all test categories
for category in STANDARD MULTI AMBIGUOUS LONG; do
    echo "Testing $category prompts..."
    # Test execution logic
done
```

### Performance Regression Script
```bash
#!/usr/bin/env bash
# performance-regression-detailed.sh

# Run load test and capture results
bun run test:load:ci
mv test-results-load.json current-load-test.json

# Extract all key metrics
jq '{
    p50: .metrics.http_req_duration.values.p50,
    p95: .metrics.http_req_duration.values.p95,
    p99: .metrics.http_req_duration.values.p99,
    error_rate: .metrics.http_req_failed.values.rate,
    throughput: .metrics.http_reqs.values.rate,
    checks_pass_rate: .metrics.checks.values.rate
}' current-load-test.json > current-metrics.json

# Compare against baseline
# (Comparison logic as shown in Regression Detection Strategy)
```

---

## Validation Success Criteria

### Critical Success Factors
1. **Zero Production-Blocking Issues**: No P0/P1 bugs discovered
2. **Performance Within Baseline**: All metrics within acceptable thresholds
3. **Stability Proven**: 48h uptime without crashes or memory leaks
4. **Documentation Complete**: All guides and troubleshooting docs ready
5. **Rollback Validated**: Confirmed ability to revert if needed

### Decision Matrix

| Criteria | Weight | Pass Threshold | Current Status |
|----------|--------|----------------|----------------|
| Test Pass Rate | 25% | 100% | 482/482 ✅ |
| Performance | 20% | p95 < 500ms | TBD |
| Memory Stability | 15% | < 512MB | TBD |
| Error-Free Logs | 15% | 0 errors | TBD |
| Edge Case Coverage | 10% | All passing | TBD |
| Documentation | 10% | Complete | ✅ |
| Stakeholder Approval | 5% | All signed | TBD |

**Production Promotion**: Requires ≥95% weighted score

---

## Post-Staging Actions

### Upon Successful Sign-Off
1. **Merge Feature Branch**: `git merge fix/analyze-prompt-tool-activation`
2. **Tag Release**: `git tag v4.2.0`
3. **Update CHANGELOG**: Document all changes
4. **Publish NPM Package**: `npm publish`
5. **Deploy to Production**: Follow production deployment guide
6. **Monitor Initial 24h**: Heightened monitoring post-deployment
7. **Close Related Issues**: Link PR to TASK-020, TASK-021

### Upon Sign-Off Failure
1. **Document Failures**: Create detailed failure analysis
2. **Prioritize Fixes**: Categorize by severity (P0-P4)
3. **Fix Critical Issues**: Address all P0/P1 issues
4. **Restart Validation**: Begin new 24-48h staging period
5. **Update Stakeholders**: Communicate delay and reasons

---

## Summary

This validation strategy provides:
- **Scheduled Testing**: Automated tests every 2-4 hours over 48h
- **Comprehensive Coverage**: 482 unit tests + 23 integration + 30+ edge cases + 3 load tests
- **Regression Detection**: Automated comparison against performance/functional baselines
- **Clear Checkpoints**: Day 1 (H+24) and Final (H+48) validation gates
- **Production Readiness**: 10-point sign-off checklist with objective criteria
- **Risk Mitigation**: Validated rollback plan and backward compatibility

**Execution Ownership**: QA Engineer (primary), Development Lead (support)

**Timeline**: 48 hours minimum, extendable if critical issues discovered

**Success Indicator**: 10/10 sign-off checklist items approved → Production promotion
