# LLM-Based Prompt Analysis Monitoring Strategy

**Feature**: hub__analyze_prompt with Gemini LLM provider
**Date**: 2025-11-07
**Status**: Staging deployment monitoring

---

## Deployment Status

### Current Configuration
- **LLM Provider**: Gemini (gemini-2.5-flash)
- **Filtering Mode**: prompt-based
- **Default Exposure**: meta-only
- **Session Isolation**: enabled
- **Fallback**: Heuristic categorization enabled
- **Confidence Threshold**: 0.7

### Deployment Evidence (from staging log)
```
Line 52: LLM categorization initialized: gemini (gemini-2.5-flash)
Line 53: Loaded 5 cached tool categories from tool-categories-llm.json
Line 28: Registered meta-tool: hub__analyze_prompt
```

**Status**: ✅ LLM categorization successfully initialized

---

## 1. LLM Health Monitoring

### 1.1 API Success Rate

**Objective**: Track Gemini API call success rate and identify failure patterns

**Metrics to Track**:
- Total LLM API calls
- Successful responses
- Failed responses (by error type)
- Fallback activations (heuristic categorization)
- Success rate percentage

**Log Patterns to Monitor**:
```bash
# LLM API calls
grep "analyzePrompt called" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Successful LLM responses
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log

# LLM errors
grep -E "LLM provider error|API.*error|rate limit" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Fallback activations
grep "Heuristic categorization used" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Success Criteria**:
- API success rate: >95% (target), >90% (acceptable)
- Fallback rate: <5% (target), <10% (acceptable)
- No sustained API failures (>5 consecutive failures)

**Monitoring Script**:
```bash
#!/bin/bash
# scripts/monitor-llm-health.sh

LOG_FILE=~/.local/state/mcp-hub/logs/mcp-hub.log
TIME_WINDOW="1 hour"

# Count LLM events
TOTAL_CALLS=$(grep -c "analyzePrompt called" "$LOG_FILE")
SUCCESSFUL=$(grep -c "LLM analysis completed" "$LOG_FILE")
ERRORS=$(grep -c "LLM provider error" "$LOG_FILE")
FALLBACKS=$(grep -c "Heuristic categorization" "$LOG_FILE")

# Calculate metrics
if [ "$TOTAL_CALLS" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($SUCCESSFUL/$TOTAL_CALLS)*100}")
    FALLBACK_RATE=$(awk "BEGIN {printf \"%.2f\", ($FALLBACKS/$TOTAL_CALLS)*100}")
else
    SUCCESS_RATE="N/A"
    FALLBACK_RATE="N/A"
fi

echo "=== LLM Health Report ($TIME_WINDOW) ==="
echo "Total API Calls:    $TOTAL_CALLS"
echo "Successful:         $SUCCESSFUL"
echo "Errors:             $ERRORS"
echo "Fallback Used:      $FALLBACKS"
echo "Success Rate:       ${SUCCESS_RATE}%"
echo "Fallback Rate:      ${FALLBACK_RATE}%"
echo ""

# Alert on low success rate
if [ "$TOTAL_CALLS" -gt 10 ]; then
    if awk "BEGIN {exit !($SUCCESS_RATE < 90)}"; then
        echo "⚠️  WARNING: Success rate below 90%"
    fi
fi
```

### 1.2 API Latency Tracking

**Objective**: Monitor LLM response times and identify performance degradation

**Metrics to Track**:
- Average response time
- P50, P95, P99 latency percentiles
- Timeout occurrences
- Performance trends over time

**Log Patterns**:
```bash
# Extract latency data
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  grep -oP 'took \K[0-9]+ms' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'

# Find slow requests (>2000ms)
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  grep -E "took [2-9][0-9]{3}ms|took [0-9]{5,}ms"
```

**Performance Targets**:
| Metric | Target | Acceptable | Action Required |
|--------|--------|------------|-----------------|
| Average | <1000ms | <1500ms | >2000ms |
| P95 | <1500ms | <2000ms | >3000ms |
| P99 | <2000ms | <3000ms | >5000ms |
| Timeouts | 0 | <1% | >1% |

**Monitoring Script**:
```bash
#!/bin/bash
# scripts/monitor-llm-latency.sh

LOG_FILE=~/.local/state/mcp-hub/logs/mcp-hub.log

# Extract all latencies
LATENCIES=$(grep "LLM analysis completed" "$LOG_FILE" | grep -oP 'took \K[0-9]+' | sort -n)

if [ -z "$LATENCIES" ]; then
    echo "No LLM latency data found"
    exit 0
fi

# Calculate statistics
TOTAL=$(echo "$LATENCIES" | wc -l)
AVG=$(echo "$LATENCIES" | awk '{sum+=$1} END {print sum/NR}')
P50=$(echo "$LATENCIES" | awk -v p=50 'BEGIN{i=int(NR*p/100)} NR==i{print}')
P95=$(echo "$LATENCIES" | awk -v p=95 'BEGIN{i=int(NR*p/100)} NR==i{print}')
P99=$(echo "$LATENCIES" | awk -v p=99 'BEGIN{i=int(NR*p/100)} NR==i{print}')
MAX=$(echo "$LATENCIES" | tail -1)

echo "=== LLM Latency Report ==="
echo "Sample Size:  $TOTAL requests"
echo "Average:      ${AVG}ms"
echo "P50:          ${P50}ms"
echo "P95:          ${P95}ms"
echo "P99:          ${P99}ms"
echo "Max:          ${MAX}ms"
echo ""

# Alert on high latency
if awk "BEGIN {exit !($AVG > 2000)}"; then
    echo "⚠️  WARNING: Average latency above 2000ms"
fi
```

### 1.3 Cost Tracking

**Objective**: Monitor Gemini API usage and estimated costs

**Metrics to Track**:
- Total API calls per hour/day
- Estimated token usage (prompt + completion)
- Estimated cost (based on Gemini pricing)
- Cost per analysis

**Gemini Pricing** (gemini-2.5-flash):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Free tier: First 1M tokens/day

**Estimation**:
```bash
# Typical prompt analysis request
Prompt tokens: ~400 (system prompt + user request + categories)
Completion tokens: ~100 (JSON response)
Total per request: ~500 tokens

# Daily cost estimation (100 requests/day)
100 requests * 500 tokens = 50,000 tokens/day
Input cost: 50,000 * 0.4 * $0.075 / 1M = ~$0.0015
Output cost: 50,000 * 0.1 * $0.30 / 1M = ~$0.0015
Total: ~$0.003/day = ~$0.09/month

# Well within free tier (1M tokens/day)
```

**Monitoring Script**:
```bash
#!/bin/bash
# scripts/monitor-llm-cost.sh

LOG_FILE=~/.local/state/mcp-hub/logs/mcp-hub.log

# Count API calls
HOURLY=$(grep "analyzePrompt called" "$LOG_FILE" | \
  grep "$(date +'%Y-%m-%d')T$(date +'%H')" | wc -l)

DAILY=$(grep "analyzePrompt called" "$LOG_FILE" | \
  grep "$(date +'%Y-%m-%d')" | wc -l)

# Estimate tokens (500 per request)
TOKENS_HOURLY=$((HOURLY * 500))
TOKENS_DAILY=$((DAILY * 500))

# Estimate cost (gemini-2.5-flash pricing)
COST_DAILY=$(awk "BEGIN {printf \"%.4f\", $TOKENS_DAILY * 0.00000020}")

echo "=== LLM Cost Tracking ==="
echo "API Calls (last hour): $HOURLY"
echo "API Calls (today):     $DAILY"
echo "Est. Tokens (today):   $TOKENS_DAILY"
echo "Est. Cost (today):     \$${COST_DAILY}"
echo ""
echo "Free Tier Limit: 1,000,000 tokens/day"
echo "Usage: $(awk "BEGIN {printf \"%.2f\", ($TOKENS_DAILY/1000000)*100}")%"
```

---

## 2. Functional Validation

### 2.1 Category Identification Accuracy

**Objective**: Validate LLM correctly identifies tool categories from prompts

**Test Cases**:

| Test ID | Prompt | Expected Categories | Confidence | Priority |
|---------|--------|---------------------|------------|----------|
| T1 | "Check my GitHub notifications" | github | >0.9 | High |
| T2 | "List files in current directory" | filesystem | >0.9 | High |
| T3 | "Read config.json and commit it" | filesystem, git | >0.85 | High |
| T4 | "Deploy Docker container to AWS" | docker, cloud | >0.85 | Medium |
| T5 | "Search for Python files and run tests" | filesystem, python | >0.85 | Medium |
| T6 | "What can you do?" | meta | >0.95 | Low |
| T7 | "" (empty prompt) | meta | <0.5 | Edge |
| T8 | Very long prompt (>1000 chars) | Any | >0.5 | Edge |
| T9 | "Vérifie mes notifications GitHub" (French) | github | >0.7 | Edge |
| T10 | "Test $VAR with 'quotes'" | Any | >0.5 | Edge |

**Validation Script**:
```bash
#!/bin/bash
# scripts/validate-llm-accuracy.sh

HUB_URL="${HUB_URL:-http://localhost:7000}"
SESSION_ID="validation-$(date +%s)"

test_prompt() {
    local prompt="$1"
    local expected="$2"
    local min_confidence="$3"

    echo "Testing: \"$prompt\""

    RESPONSE=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 1,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"hub__analyze_prompt\",
                \"arguments\": {\"prompt\": \"$prompt\"}
            }
        }")

    RESULT=$(echo "$RESPONSE" | jq -r '.result.content[0].text')
    CATEGORIES=$(echo "$RESULT" | jq -r '.categories[]' | tr '\n' ',' | sed 's/,$//')
    CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence')

    echo "  Result: categories=[$CATEGORIES], confidence=$CONFIDENCE"

    # Validate expected categories present
    for cat in $(echo "$expected" | tr ',' ' '); do
        if echo "$CATEGORIES" | grep -q "$cat"; then
            echo "  ✓ Category '$cat' found"
        else
            echo "  ✗ Category '$cat' MISSING"
            return 1
        fi
    done

    # Validate confidence threshold
    if awk "BEGIN {exit !($CONFIDENCE >= $min_confidence)}"; then
        echo "  ✓ Confidence meets threshold ($CONFIDENCE >= $min_confidence)"
    else
        echo "  ✗ Confidence below threshold ($CONFIDENCE < $min_confidence)"
        return 1
    fi

    echo ""
    return 0
}

echo "=== LLM Accuracy Validation ==="
echo ""

# Run test cases
PASSED=0
FAILED=0

# T1
test_prompt "Check my GitHub notifications" "github" "0.9" && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))

# T2
test_prompt "List files in current directory" "filesystem" "0.9" && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))

# T3
test_prompt "Read config.json and commit it" "filesystem,git" "0.85" && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))

# Summary
TOTAL=$((PASSED + FAILED))
echo "=== Summary ==="
echo "Passed: $PASSED/$TOTAL"
echo "Failed: $FAILED/$TOTAL"
echo "Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
```

### 2.2 Tool Exposure Verification

**Objective**: Verify tool exposure updates correctly after prompt analysis

**Test Flow**:
1. Initialize session with meta-only exposure
2. Call hub__analyze_prompt
3. Verify tools/list_changed notification sent
4. Verify correct tools exposed for identified categories
5. Verify meta-tools remain available

**Validation Script** (already exists):
```bash
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
```

Expected output:
- ✓ Hub Health Check
- ✓ Meta-Tool Registration
- ✓ Analyze Prompt Call
- ✓ Category Tool Exposure (github tools exposed)
- ✓ Meta-Tools Persistence

---

## 3. Edge Case Testing

### 3.1 Empty and Malformed Prompts

**Test Cases**:
```bash
# Empty prompt
./scripts/test-analyze-prompt.sh ""

# Very long prompt (>2000 characters)
./scripts/test-analyze-prompt.sh "$(head -c 2000 /dev/urandom | base64)"

# Special characters
./scripts/test-analyze-prompt.sh "Test with 'quotes' and \"escapes\" and \$variables"

# Unicode and emoji
./scripts/test-analyze-prompt.sh "🔍 Search GitHub for 🐍 Python repos"

# SQL injection attempt
./scripts/test-analyze-prompt.sh "'; DROP TABLE tools; --"
```

**Expected Behavior**:
- Empty prompt → meta category, low confidence, no errors
- Long prompt → Graceful handling, potential truncation, fallback if needed
- Special chars → Proper escaping, correct categorization
- Unicode → Proper handling (Gemini supports Unicode)
- Injection → Sanitized, no security issues

### 3.2 Non-English Prompts

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

**Expected Behavior**:
- Gemini is multilingual, should handle non-English prompts
- Category identification should work across languages
- Confidence may be slightly lower for non-English

### 3.3 Concurrent Requests

**Test Case**: Multiple simultaneous analyze_prompt calls

```bash
# Run 10 concurrent requests
for i in {1..10}; do
    ./scripts/test-analyze-prompt.sh "Request $i" &
done
wait

# Check for race conditions or errors
grep -E "error|Error|ERROR" ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20
```

**Expected Behavior**:
- No race conditions
- No errors
- All requests complete successfully
- Queue handles concurrency properly (5 concurrent limit)

---

## 4. Session Isolation Verification

**Objective**: Verify each client session has independent tool exposure

**Test Procedure**:
```bash
#!/bin/bash
# scripts/test-session-isolation.sh

HUB_URL="${HUB_URL:-http://localhost:7000}"
SESSION_1="client-1-$(date +%s)"
SESSION_2="client-2-$(date +%s)"

# Session 1: Analyze GitHub prompt
echo "Session 1: Analyzing GitHub prompt..."
curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hub__analyze_prompt","arguments":{"prompt":"Check GitHub"}}}' \
    > /dev/null

sleep 1

# Session 1: List tools (should have github tools)
TOOLS_1=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_1}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | \
    jq -r '.result.tools[].name' | grep -c "github")

# Session 2: List tools (should NOT have github tools)
TOOLS_2=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_2}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
    jq -r '.result.tools[].name' | grep -c "github" || echo "0")

echo "=== Session Isolation Test ==="
echo "Session 1 GitHub tools: $TOOLS_1"
echo "Session 2 GitHub tools: $TOOLS_2"

if [ "$TOOLS_1" -gt 0 ] && [ "$TOOLS_2" -eq 0 ]; then
    echo "✓ Session isolation verified"
    exit 0
else
    echo "✗ Session isolation FAILED"
    exit 1
fi
```

---

## 5. Performance Regression Testing

### 5.1 Load Test with LLM Filtering

**Objective**: Ensure LLM filtering doesn't degrade overall system performance

**Load Test Script** (already exists):
```bash
bun run test:load:spike
```

**Performance Baselines** (from STAGING_DEPLOYMENT_GUIDE.md):
| Metric | Target | Acceptable | Action Required |
|--------|--------|------------|-----------------|
| LLM Analysis Time | <1.5s | <2s | >2s |
| Tool Exposure Update | <300ms | <500ms | >500ms |
| End-to-End Flow | <2.5s | <3s | >3s |

**Verification**:
```bash
# Extract performance metrics from k6 output
k6 run tests/load/spike-test-llm.js | tee spike-results.txt

# Check for errors
grep -i "error" spike-results.txt

# Verify response times
grep "http_req_duration" spike-results.txt
```

### 5.2 Memory Leak Detection

**Objective**: Ensure LLM client and filtering service don't leak memory

**Test Procedure**:
```bash
# Baseline memory usage
ps aux | grep "bun.*server.js" | awk '{print $6}'

# Run sustained load (1 hour)
K6_DURATION=1h bun run test:load &
K6_PID=$!

# Monitor memory every 5 minutes
for i in {1..12}; do
    sleep 300
    MEMORY=$(ps aux | grep "bun.*server.js" | awk '{print $6}')
    echo "$(date): Memory usage: ${MEMORY}KB"
done

kill $K6_PID
```

**Expected Behavior**:
- Memory usage stable or slowly increasing (caching)
- No exponential growth
- Memory < 300MB after 1 hour

---

## 6. Automated Monitoring Dashboard

### 6.1 Real-Time Monitoring

**Script**: `scripts/monitor-llm-realtime.sh`

```bash
#!/bin/bash
# Real-time LLM monitoring dashboard

LOG_FILE=~/.local/state/mcp-hub/logs/mcp-hub.log

watch -n 5 '
echo "=== LLM Real-Time Monitor ==="
echo ""
echo "Last 5 LLM Calls:"
grep "analyzePrompt called" '"$LOG_FILE"' | tail -5 | \
  awk -F"\"prompt\":\"" "{print \$2}" | \
  awk -F"\"" "{print \"  - \" \$1}"
echo ""
echo "Recent Errors:"
grep -i "error" '"$LOG_FILE"' | tail -3 | cut -c1-100
echo ""
echo "Performance (last 10 calls):"
grep "LLM analysis completed" '"$LOG_FILE"' | tail -10 | \
  grep -oP "took \K[0-9]+ms" | \
  awk "{sum+=\$1; count++} END {print \"  Avg: \" sum/count \"ms\"}"
'
```

### 6.2 Daily Health Report

**Cron Job**: Run daily health check

```bash
# Add to crontab
0 9 * * * /home/ob/Development/Tools/mcp-hub/scripts/daily-llm-report.sh | mail -s "MCP Hub LLM Health" admin@example.com
```

**Script**: `scripts/daily-llm-report.sh`

```bash
#!/bin/bash
# Generate daily LLM health report

LOG_FILE=~/.local/state/mcp-hub/logs/mcp-hub.log
TODAY=$(date +'%Y-%m-%d')

echo "=== MCP Hub LLM Daily Health Report ==="
echo "Date: $TODAY"
echo ""

# Success rate
TOTAL=$(grep "$TODAY" "$LOG_FILE" | grep -c "analyzePrompt called")
SUCCESS=$(grep "$TODAY" "$LOG_FILE" | grep -c "LLM analysis completed")
ERRORS=$(grep "$TODAY" "$LOG_FILE" | grep -c "LLM provider error")

if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($SUCCESS/$TOTAL)*100}")
    echo "API Calls: $TOTAL"
    echo "Success: $SUCCESS ($SUCCESS_RATE%)"
    echo "Errors: $ERRORS"
else
    echo "No LLM API calls today"
fi

echo ""

# Performance
echo "Performance Summary:"
grep "$TODAY" "$LOG_FILE" | grep "LLM analysis completed" | \
  grep -oP "took \K[0-9]+" | \
  awk '{
    sum+=$1; count++;
    if(min=="" || $1<min) min=$1;
    if($1>max) max=$1;
  } END {
    print "  Average: " sum/count "ms"
    print "  Min: " min "ms"
    print "  Max: " max "ms"
  }'

echo ""

# Errors
ERROR_COUNT=$(grep "$TODAY" "$LOG_FILE" | grep -c "error")
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "⚠️  Errors Detected: $ERROR_COUNT"
    echo "Recent errors:"
    grep "$TODAY" "$LOG_FILE" | grep "error" | tail -5 | cut -c1-150
fi
```

---

## 7. Rollback Procedures

### 7.1 Quick Rollback (Disable LLM)

If LLM provider fails completely:

```bash
# Option 1: Disable LLM, keep prompt-based with heuristic only
jq '.toolFiltering.llmCategorization.enabled = false' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json

# Restart
pkill -f "bun.*server.js"
bun start
```

### 7.2 Full Rollback (Revert to Static Mode)

If prompt-based filtering causes issues:

```bash
# Revert to static mode
jq '.toolFiltering.mode = "static"' mcp-servers.json > mcp-servers.json.tmp
mv mcp-servers.json.tmp mcp-servers.json

# Restart
pkill -f "bun.*server.js"
bun start
```

### 7.3 Emergency Rollback (Production Restore)

```bash
# Restore from backup
cp mcp-servers.json.backup mcp-servers.json

# Or pull production config
git checkout main -- mcp-servers.json

# Restart
pkill -f "bun.*server.js"
bun start
```

---

## 8. Success Criteria Summary

### Must-Pass (Blocking)
- [ ] LLM API success rate >95%
- [ ] Average latency <1500ms
- [ ] No critical errors in 24h
- [ ] Category identification accuracy >90% (on standard test cases)
- [ ] Tool exposure updates correctly
- [ ] Session isolation verified
- [ ] All edge cases handled gracefully

### Should-Pass (Important)
- [ ] Fallback rate <5%
- [ ] P95 latency <2000ms
- [ ] Memory usage stable <300MB
- [ ] No memory leaks detected
- [ ] Cost within free tier limits
- [ ] Concurrent requests handled correctly

### Nice-to-Have
- [ ] Non-English prompt support verified
- [ ] Load test passes without degradation
- [ ] Automated monitoring running
- [ ] Daily health reports generated

---

## Next Steps

1. **Immediate (First 4 hours)**:
   - Run monitoring scripts to establish baselines
   - Execute functional validation test suite
   - Verify edge case handling

2. **Day 1 (24 hours)**:
   - Monitor LLM health metrics
   - Run load tests
   - Test session isolation
   - Check for memory leaks

3. **Day 2 (48 hours)**:
   - Extended validation period
   - Performance regression testing
   - Generate comprehensive health report
   - Make production deployment decision

4. **Production Deployment** (if successful):
   - Document lessons learned
   - Set up automated monitoring
   - Configure alerts for failures
   - Plan gradual rollout strategy
