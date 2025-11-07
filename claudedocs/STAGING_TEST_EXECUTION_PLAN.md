# Staging Test Execution Plan
## LLM-Based Prompt Analysis Feature

**Date**: 2025-11-07
**Feature Branch**: fix/analyze-prompt-tool-activation
**Deployment Status**: Staging deployed, monitoring phase

---

## Executive Summary

The analyze_prompt feature with LLM-based categorization has been successfully deployed to staging. Initial deployment logs show:

✅ **Successful Initialization**:
- LLM categorization initialized with Gemini (gemini-2.5-flash)
- Meta-tool `hub__analyze_prompt` registered successfully
- 5 cached tool categories loaded
- No initialization errors

This plan outlines systematic testing and monitoring procedures for the 24-48 hour validation period before production deployment.

---

## Phase 1: Immediate Validation (0-4 hours)

### 1.1 Baseline Health Check

**Objective**: Establish baseline metrics and verify system is operational

**Actions**:
```bash
# 1. Verify Hub is running
curl http://localhost:7000/health

# 2. Check LLM initialization status
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "LLM|meta-tool"

# 3. Run basic validation
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# 4. Establish health baseline
./scripts/monitor-llm-health.sh "all"

# 5. Establish latency baseline
./scripts/monitor-llm-latency.sh
```

**Expected Results**:
- Hub responds to health check
- LLM categorization initialized
- Meta-tool registered
- Basic validation passes (10/10 tests)
- No errors in logs

**Success Criteria**: All checks pass, baseline metrics established

---

### 1.2 Functional Validation

**Objective**: Verify core functionality works as designed

**Test Suite**: `./scripts/validate-llm-accuracy.sh`

**Test Cases** (6 high/medium priority):

| ID | Prompt | Expected | Min Confidence | Status |
|----|--------|----------|----------------|--------|
| T1 | "Check my GitHub notifications" | github | 0.9 | ⏳ |
| T2 | "List files in current directory" | filesystem | 0.9 | ⏳ |
| T3 | "Read config.json and commit it" | filesystem | 0.85 | ⏳ |
| T4 | "Deploy Docker container to AWS" | docker | 0.85 | ⏳ |
| T5 | "Search for Python files and run tests" | filesystem | 0.85 | ⏳ |
| T6 | "What can you do?" | meta | 0.95 | ⏳ |

**Execution**:
```bash
# Run full accuracy validation
./scripts/validate-llm-accuracy.sh --verbose > validation-results-$(date +%Y%m%d-%H%M%S).log

# Check results
cat validation-results-*.log | grep -E "PASS|FAIL|Success Rate"
```

**Success Criteria**:
- All 6 tests pass (100%)
- Minimum 90% overall success rate
- Confidence thresholds met

---

### 1.3 Tool Exposure Verification

**Objective**: Verify tool exposure updates correctly after analysis

**Test Script**: `./scripts/test-analyze-prompt.sh`

**Test Scenarios**:

1. **GitHub Category**:
```bash
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
# Expected: github tools exposed, notification sent
```

2. **Filesystem Category**:
```bash
./scripts/test-analyze-prompt.sh "List all files in /tmp"
# Expected: filesystem tools exposed
```

3. **Multi-Category**:
```bash
./scripts/test-analyze-prompt.sh "Read config.json and commit it to git"
# Expected: filesystem + git tools exposed
```

**Validation Checklist**:
- [ ] tools/list shows only meta-tools initially
- [ ] hub__analyze_prompt executes successfully
- [ ] Correct categories identified
- [ ] tools/list_changed notification sent
- [ ] Correct tools exposed after analysis
- [ ] Meta-tools remain available

---

### 1.4 Edge Case Testing

**Objective**: Verify graceful handling of edge cases

**Test Cases**:

1. **Empty Prompt**:
```bash
./scripts/test-analyze-prompt.sh ""
# Expected: meta category, low confidence, no errors
```

2. **Special Characters**:
```bash
./scripts/test-analyze-prompt.sh "Test with 'quotes' and \$variables"
# Expected: Proper escaping, valid response
```

3. **Long Prompt** (>1000 chars):
```bash
# Generate long prompt
LONG_PROMPT=$(head -c 1000 /dev/urandom | base64)
./scripts/test-analyze-prompt.sh "$LONG_PROMPT"
# Expected: Graceful handling, fallback if needed
```

4. **Unicode and Emoji**:
```bash
./scripts/test-analyze-prompt.sh "🔍 Search GitHub for 🐍 Python"
# Expected: Proper Unicode handling
```

**Success Criteria**: All edge cases handled without errors

---

## Phase 2: Extended Monitoring (4-24 hours)

### 2.1 Continuous Health Monitoring

**Setup Real-Time Monitor**:
```bash
# Terminal 1: Real-time log monitoring
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "analyzePrompt|LLM|error"

# Terminal 2: Health checks every 15 minutes
watch -n 900 './scripts/monitor-llm-health.sh "1 hour"'

# Terminal 3: Latency monitoring every 30 minutes
watch -n 1800 './scripts/monitor-llm-latency.sh'
```

**Metrics to Track**:
- API success rate (target: >95%)
- Average latency (target: <1500ms)
- Error count (target: 0)
- Fallback rate (target: <5%)

**Alert Thresholds**:
- Success rate drops below 90% → Investigate immediately
- Average latency exceeds 2000ms → Check performance
- >3 consecutive errors → Consider rollback

---

### 2.2 Session Isolation Testing

**Objective**: Verify per-client session isolation

**Test Script**:
```bash
#!/bin/bash
# scripts/test-session-isolation.sh

HUB_URL="http://localhost:7000"
SESSION_1="client-1-$(date +%s)"
SESSION_2="client-2-$(date +%s)"

# Session 1: Analyze GitHub prompt
echo "Session 1: Exposing github tools..."
curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hub__analyze_prompt","arguments":{"prompt":"Check GitHub"}}}' \
    > /dev/null

sleep 2

# Session 1: Count github tools
TOOLS_1=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | \
    jq '.result.tools[].name' | grep -c "github" || echo "0")

# Session 2: Count github tools (should be 0)
TOOLS_2=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_2}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
    jq '.result.tools[].name' | grep -c "github" || echo "0")

echo "Session 1 github tools: $TOOLS_1 (should be >0)"
echo "Session 2 github tools: $TOOLS_2 (should be 0)"

if [ "$TOOLS_1" -gt 0 ] && [ "$TOOLS_2" -eq 0 ]; then
    echo "✓ Session isolation verified"
    exit 0
else
    echo "✗ Session isolation FAILED"
    exit 1
fi
```

**Execution**:
```bash
chmod +x scripts/test-session-isolation.sh
./scripts/test-session-isolation.sh
```

**Success Criteria**: Sessions have independent tool exposure

---

### 2.3 Concurrent Request Testing

**Objective**: Verify system handles concurrent requests correctly

**Test Script**:
```bash
#!/bin/bash
# Run 10 concurrent analyze_prompt calls

for i in {1..10}; do
    (
        SESSION="concurrent-$i"
        ./scripts/test-analyze-prompt.sh "Test request $i" --ci
        echo "Request $i completed"
    ) &
done

wait

# Check for errors
ERROR_COUNT=$(grep -c "error\|FAIL" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -50)

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✓ Concurrent requests handled successfully"
else
    echo "✗ Errors detected: $ERROR_COUNT"
fi
```

**Success Criteria**:
- All 10 requests complete successfully
- No race conditions or errors
- Queue handles concurrency properly

---

### 2.4 Non-English Prompt Testing

**Objective**: Verify multilingual support (Gemini capability)

**Test Cases**:
```bash
# French
./scripts/test-analyze-prompt.sh "Vérifier mes notifications GitHub"

# Spanish
./scripts/test-analyze-prompt.sh "Listar archivos en directorio actual"

# German
./scripts/test-analyze-prompt.sh "Docker Container auf AWS deployen"

# Japanese
./scripts/test-analyze-prompt.sh "GitHubの通知を確認してください"
```

**Success Criteria**:
- Categories identified correctly
- Confidence may be slightly lower (>0.7)
- No errors or crashes

---

## Phase 3: Performance Validation (24-48 hours)

### 3.1 Load Testing

**Objective**: Verify no performance degradation under load

**Test Scripts**:

1. **Basic Load Test** (existing):
```bash
bun run test:load
# Expected: All requests successful, <3s end-to-end
```

2. **Spike Test** (LLM-focused):
```bash
bun run test:load:spike
# Expected: System handles traffic spikes gracefully
```

3. **Stress Test**:
```bash
bun run test:load:stress
# Expected: Identify breaking point, graceful degradation
```

**Performance Benchmarks**:
| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| LLM Analysis | <1.5s | <2s | >2s |
| Tool Exposure | <300ms | <500ms | >500ms |
| End-to-End | <2.5s | <3s | >3s |
| Error Rate | <0.1% | <1% | >1% |

---

### 3.2 Memory Leak Detection

**Objective**: Ensure no memory leaks over extended period

**Test Procedure**:
```bash
#!/bin/bash
# Monitor memory usage over 1 hour

echo "Baseline memory usage:"
ps aux | grep "bun.*server.js" | awk '{print $6 " KB"}'

# Run sustained load
K6_DURATION=1h bun run test:load &
K6_PID=$!

# Monitor every 5 minutes
for i in {1..12}; do
    sleep 300
    MEMORY=$(ps aux | grep "bun.*server.js" | grep -v grep | awk '{print $6}')
    echo "$(date +%H:%M:%S): Memory = ${MEMORY}KB"
done

kill $K6_PID
```

**Success Criteria**:
- Memory usage stable (<300MB)
- No exponential growth
- Gradual increase acceptable (caching)

---

### 3.3 Overnight Stability Test

**Objective**: Verify system stability over extended period

**Test Setup**:
```bash
# Start overnight monitoring (8+ hours)
nohup watch -n 300 './scripts/monitor-llm-health.sh "1 hour" >> overnight-health-$(date +%Y%m%d).log' &

# Run sustained load
K6_DURATION=8h bun run test:load:soak &

# Check in morning
tail -100 overnight-health-*.log
grep -E "CRITICAL|ERROR" overnight-health-*.log
```

**Success Criteria**:
- No crashes or restarts
- Health metrics remain stable
- No sustained errors

---

## Phase 4: Production Readiness Assessment (48 hours)

### 4.1 Final Validation Checklist

**Must-Pass Criteria** (Blocking):
- [ ] LLM API success rate >95%
- [ ] Average latency <1500ms
- [ ] No critical errors in 24h period
- [ ] Functional validation: 100% pass rate
- [ ] Tool exposure verified correct
- [ ] Session isolation verified
- [ ] All edge cases handled gracefully

**Should-Pass Criteria** (Important):
- [ ] Fallback rate <5%
- [ ] P95 latency <2000ms
- [ ] Memory usage stable <300MB
- [ ] No memory leaks detected
- [ ] Cost within free tier (<1M tokens/day)
- [ ] Concurrent requests handled correctly

**Nice-to-Have Criteria** (Optional):
- [ ] Non-English prompts work (>70% confidence)
- [ ] Load tests pass without degradation
- [ ] Overnight stability test passes
- [ ] Automated monitoring operational

---

### 4.2 Metrics Summary Report

**Template**:
```markdown
# Staging Validation Report - analyze_prompt Feature

**Date**: [YYYY-MM-DD]
**Validation Period**: 48 hours
**Decision**: APPROVED / NEEDS REVISION / REJECTED

## Summary Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| API Success Rate | >95% | XX% | ✓/✗ |
| Average Latency | <1500ms | XXms | ✓/✗ |
| P95 Latency | <2000ms | XXms | ✓/✗ |
| Error Count | 0 | XX | ✓/✗ |
| Fallback Rate | <5% | XX% | ✓/✗ |
| Memory Usage | <300MB | XXMB | ✓/✗ |

## Test Results

### Functional Validation
- Total Tests: XX
- Passed: XX (XX%)
- Failed: XX
- Details: [link to validation-results.log]

### Tool Exposure
- [✓/✗] Meta-tools registered
- [✓/✗] Category identification correct
- [✓/✗] Tool updates sent
- [✓/✗] Session isolation verified

### Performance
- Load Test: [PASS/FAIL]
- Stress Test: [PASS/FAIL]
- Memory Leak: [DETECTED/NONE]
- Stability: [STABLE/UNSTABLE]

## Issues Discovered

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| - | - | - | - |

## Recommendations

### For Production Deployment
- [ ] Recommendation 1
- [ ] Recommendation 2

### For Monitoring
- [ ] Set up alerting for success rate <90%
- [ ] Monitor cost daily
- [ ] Track latency trends

## Sign-Off

- Deployment Lead: [Name]
- Date: [YYYY-MM-DD]
- Approved for Production: [YES/NO]
```

---

## Execution Timeline

### Day 0 (Hours 0-4): Immediate Validation
- ✅ Health checks
- ⏳ Functional validation
- ⏳ Tool exposure verification
- ⏳ Edge case testing

### Day 1 (Hours 4-24): Extended Monitoring
- ⏳ Continuous health monitoring
- ⏳ Session isolation testing
- ⏳ Concurrent request testing
- ⏳ Non-English testing

### Day 2 (Hours 24-48): Performance Validation
- ⏳ Load testing
- ⏳ Memory leak detection
- ⏳ Overnight stability test

### Day 2-3 (Hour 48+): Production Decision
- ⏳ Final validation checklist
- ⏳ Metrics summary report
- ⏳ Sign-off for production

---

## Contact and Escalation

**Deployment Lead**: [Your Name]
**Monitoring Start**: 2025-11-07 22:05 UTC
**Expected Sign-Off**: 2025-11-09 22:00 UTC

**Escalation Criteria**:
- Success rate <90% for >1 hour → Investigate
- Success rate <80% for >30 min → Rollback consideration
- Critical errors (>5 consecutive) → Immediate rollback
- Memory leak detected → Investigate, potential rollback

**Rollback Procedure**: See `claudedocs/LLM_MONITORING_STRATEGY.md` Section 7

---

## Appendix: Quick Commands

```bash
# Daily health check
./scripts/monitor-llm-health.sh "all"

# Check latency
./scripts/monitor-llm-latency.sh

# Validate accuracy
./scripts/validate-llm-accuracy.sh

# Basic functional test
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# View recent errors
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i error

# Check LLM initialization
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "LLM|meta-tool"
```
