# Staging Validation Quick Start Guide

**TL;DR**: Run these commands to validate the analyze_prompt feature is working correctly in staging.

---

## Prerequisites

- MCP Hub running on localhost:7000
- Staging configuration active (prompt-based filtering with Gemini)
- GEMINI_API_KEY environment variable set

---

## Quick Validation (5 minutes)

### 1. Health Check
```bash
# Verify Hub is running
curl http://localhost:7000/health

# Check LLM initialization
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "LLM categorization initialized"
```

Expected output:
```json
{"type":"info","message":"LLM categorization initialized: gemini (gemini-2.5-flash)"}
```

---

### 2. Functional Test
```bash
# Run basic validation (tests meta-tool, analysis, tool exposure)
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
```

Expected output:
```
✓ Hub Health Check
✓ Meta-Tool Registration
✓ Analyze Prompt Call
✓ Category Tool Exposure
✓ Meta-Tools Persistence
ALL TESTS PASSED (10/10)
```

---

### 3. Health Metrics
```bash
# Check API success rate and performance
./scripts/monitor-llm-health.sh "all"
./scripts/monitor-llm-latency.sh
```

Expected:
- Success rate: >95%
- Average latency: <1500ms
- No errors

---

## Comprehensive Validation (30 minutes)

### 1. Accuracy Testing
```bash
# Test category identification accuracy
./scripts/validate-llm-accuracy.sh --verbose
```

Expected: All 6 test cases pass (100%)

---

### 2. Edge Cases
```bash
# Empty prompt
./scripts/test-analyze-prompt.sh ""

# Special characters
./scripts/test-analyze-prompt.sh "Test with 'quotes' and \$variables"

# Long prompt
./scripts/test-analyze-prompt.sh "$(head -c 1000 /dev/urandom | base64)"
```

Expected: All handled gracefully, no errors

---

### 3. Session Isolation
```bash
# Create test script
cat > /tmp/test-session-isolation.sh << 'EOF'
#!/bin/bash
HUB_URL="http://localhost:7000"
SESSION_1="s1-$(date +%s)"
SESSION_2="s2-$(date +%s)"

curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hub__analyze_prompt","arguments":{"prompt":"Check GitHub"}}}' > /dev/null

sleep 2

TOOLS_1=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | jq '.result.tools[].name' | grep -c "github" || echo "0")

TOOLS_2=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_2}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name' | grep -c "github" || echo "0")

echo "Session 1: $TOOLS_1 github tools (expect >0)"
echo "Session 2: $TOOLS_2 github tools (expect 0)"

[ "$TOOLS_1" -gt 0 ] && [ "$TOOLS_2" -eq 0 ] && echo "✓ Isolation verified" || echo "✗ Isolation FAILED"
EOF

chmod +x /tmp/test-session-isolation.sh
/tmp/test-session-isolation.sh
```

Expected: Sessions isolated, Session 2 has no github tools

---

### 4. Concurrent Requests
```bash
# Run 10 concurrent requests
for i in {1..10}; do
    ./scripts/test-analyze-prompt.sh "Test $i" &
done
wait

# Check for errors
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i error
```

Expected: All requests succeed, no errors

---

## Continuous Monitoring (24-48 hours)

### Terminal 1: Real-Time Logs
```bash
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "analyzePrompt|LLM|error"
```

### Terminal 2: Periodic Health Checks
```bash
# Every 15 minutes
watch -n 900 './scripts/monitor-llm-health.sh "1 hour"'
```

### Terminal 3: Latency Monitoring
```bash
# Every 30 minutes
watch -n 1800 './scripts/monitor-llm-latency.sh'
```

---

## Load Testing

### Basic Load Test
```bash
bun run test:load
```

Expected:
- All requests successful
- Average response time <3s
- No errors

### Spike Test (LLM-focused)
```bash
bun run test:load:spike
```

Expected:
- System handles traffic spikes
- LLM queue prevents overload
- Graceful degradation if needed

---

## Troubleshooting

### Issue: Hub Not Running
```bash
# Start Hub
bun start

# Verify health
curl http://localhost:7000/health
```

### Issue: LLM Not Initialized
```bash
# Check environment variable
echo "GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."

# Check configuration
jq '.toolFiltering.llmCategorization' mcp-servers.json

# Restart Hub
pkill -f "bun.*server.js"
bun start
```

### Issue: Low Success Rate
```bash
# Check recent errors
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i error

# Check Gemini API status
curl https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

### Issue: High Latency
```bash
# Check network latency
time curl https://generativelanguage.googleapis.com/v1/models

# Check system resources
top -p $(pgrep -f "bun.*server.js")
```

---

## Success Criteria Checklist

**Must Pass** (before production):
- [ ] Health check passes
- [ ] Basic validation: 10/10 tests
- [ ] Accuracy validation: >90% pass rate
- [ ] Session isolation verified
- [ ] No errors in 24h period
- [ ] Success rate >95%
- [ ] Average latency <1500ms

**Should Pass**:
- [ ] Edge cases handled
- [ ] Concurrent requests work
- [ ] Load tests pass
- [ ] Memory stable <300MB

---

## Next Steps

After 48-hour validation period:

1. **Generate Report**:
```bash
# Collect all metrics
./scripts/monitor-llm-health.sh "all" > final-health-report.txt
./scripts/monitor-llm-latency.sh > final-latency-report.txt
./scripts/validate-llm-accuracy.sh > final-accuracy-report.txt
```

2. **Review Checklist**:
- See `claudedocs/STAGING_TEST_EXECUTION_PLAN.md` Section 4.1

3. **Make Decision**:
- APPROVED → Production deployment (TASK-021)
- NEEDS REVISION → Fix issues, re-validate
- REJECTED → Rollback, investigate root cause

---

## Emergency Rollback

If critical issues detected:

```bash
# Quick rollback: Disable LLM
jq '.toolFiltering.llmCategorization.enabled = false' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json
pkill -f "bun.*server.js"
bun start

# OR full rollback: Static mode
jq '.toolFiltering.mode = "static"' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json
pkill -f "bun.*server.js"
bun start
```

---

## Resources

- **Detailed Monitoring**: `claudedocs/LLM_MONITORING_STRATEGY.md`
- **Test Execution Plan**: `claudedocs/STAGING_TEST_EXECUTION_PLAN.md`
- **Troubleshooting**: `claudedocs/TROUBLESHOOTING_ANALYZE_PROMPT.md`
- **User Guide**: `claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md`
