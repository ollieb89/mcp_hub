# Performance Monitoring Strategy - Staging Deployment

**Created**: 2025-11-07
**Deployment**: fix/analyze-prompt-tool-activation branch
**Purpose**: Continuous performance monitoring and regression detection for prompt-based filtering feature

---

## Overview

This document defines the performance monitoring strategy for the staging deployment, including:

1. Automated monitoring commands
2. Performance regression detection criteria
3. Alert thresholds and conditions
4. 24-48 hour continuous monitoring plan

---

## Automated Monitoring Commands

### 1. Process Monitoring (Real-time)

**Command**:
```bash
./scripts/monitor-staging-performance.sh --interval 60 --alert-threshold
```

**Purpose**: Monitor system resources, memory usage, and process health

**Metrics Collected**:
- Memory (RSS, VSZ)
- CPU usage
- Process uptime
- MCP server connection status

**Output**: `performance-metrics.jsonl`

**Alerts**:
- Memory > 200MB (WARNING)
- Memory > 300MB (CRITICAL)
- Process termination (CRITICAL)

### 2. LLM Performance Testing (On-demand)

**Command**:
```bash
./scripts/test-analyze-prompt-performance.sh --iterations 20
```

**Purpose**: Measure hub__analyze_prompt performance across multiple prompts

**Metrics Collected**:
- LLM analysis duration
- Category identification accuracy
- Confidence scores
- Success/failure rates

**Output**: `llm-performance.jsonl`

**Thresholds**:
- Target: <1.5s per analysis
- Acceptable: <2s per analysis
- Action required: >2s per analysis

### 3. Log Analysis (Continuous)

**Command**:
```bash
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -c 'select(.type == "error" or .type == "warn")'
```

**Purpose**: Real-time error and warning tracking

**Metrics**:
- Error count
- Error rate
- Warning patterns

**Alert Condition**: Error rate > 1%

### 4. API Health Checks (Periodic)

**Command**:
```bash
watch -n 60 'curl -s http://localhost:7000/health | jq -r ".data"'
```

**Purpose**: Verify API endpoint responsiveness

**Metrics**:
- Response time
- Server status
- Uptime

**Alert Condition**: Response time > 500ms or HTTP error

---

## Performance Regression Detection

### Detection Criteria

**Memory Regression**:
- **Trigger**: RSS growth >10% over 1-hour period
- **Severity**: Medium
- **Action**: Investigate memory leak potential

**LLM Analysis Regression**:
- **Trigger**: Average duration increases >20% compared to baseline
- **Severity**: High
- **Action**: Review Gemini API performance, check network latency

**Error Rate Regression**:
- **Trigger**: Error rate increases to >0.5%
- **Severity**: Critical
- **Action**: Immediate investigation, consider rollback

**Connection Stability Regression**:
- **Trigger**: MCP server disconnections >1 per hour
- **Severity**: High
- **Action**: Review transport stability, check configuration

### Baseline Comparison

**Baseline Metrics** (from PERFORMANCE_BASELINE_METRICS.md):
- Memory: 111.1 MB RSS
- Tool filtering: <1ms average
- Error rate: 0%
- Startup time: 1.857s

**Regression Detection Method**:
```bash
# Compare current metrics to baseline
jq -s '
  {
    baseline_rss_mb: .[0].rss_mb,
    current_rss_mb: .[1].rss_mb,
    regression_percent: ((.[1].rss_mb - .[0].rss_mb) / .[0].rss_mb * 100)
  }
' baseline-metrics.json current-metrics.json
```

**Alert Thresholds**:
- <5% change: Normal variation
- 5-10% change: Monitor closely
- 10-20% change: Investigation recommended
- >20% change: Action required

---

## Alert Conditions and Thresholds

### Critical Alerts (Immediate Action)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Memory Usage | >300MB RSS | Investigate memory leak, consider restart |
| Error Rate | >1% | Review logs, identify root cause |
| Process Crash | Process terminated | Restart service, analyze crash logs |
| LLM Analysis | >3s average | Check Gemini API status, network connectivity |
| API Unresponsive | 5 consecutive failures | Restart service, check port conflicts |

### Warning Alerts (Monitor Closely)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Memory Usage | >200MB RSS | Monitor growth trend, check for leaks |
| Error Rate | >0.1% | Review error patterns, non-critical issues |
| LLM Analysis | >2s average | Monitor API performance, consider optimization |
| Connection Drops | >1 per hour | Review transport stability, check logs |

### Info Alerts (Normal Operation)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Memory Usage | <200MB RSS | Normal operation |
| Error Rate | <0.1% | Acceptable operational errors |
| LLM Analysis | <1.5s average | Optimal performance |
| Uptime | >24 hours | Stable deployment |

---

## 24-48 Hour Continuous Monitoring Plan

### Phase 1: Initial Monitoring (0-6 hours)

**Objectives**:
- Establish performance baseline under real usage
- Capture LLM analysis metrics
- Verify system stability

**Actions**:
1. Start continuous process monitoring:
   ```bash
   ./scripts/monitor-staging-performance.sh --interval 60 > staging-monitor.log 2>&1 &
   echo $! > monitor.pid
   ```

2. Execute initial LLM performance test:
   ```bash
   ./scripts/test-analyze-prompt-performance.sh --iterations 50
   ```

3. Monitor logs in real-time:
   ```bash
   tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E 'analyze_prompt|error|warn'
   ```

**Expected Outcomes**:
- No critical alerts
- Memory stable <150MB
- LLM analysis <1.5s average
- Zero runtime errors

### Phase 2: Load Testing (6-12 hours)

**Objectives**:
- Test performance under simulated load
- Identify memory growth patterns
- Validate concurrent session handling

**Actions**:
1. Continue process monitoring (ongoing)

2. Execute concurrent LLM tests:
   ```bash
   for i in {1..5}; do
     ./scripts/test-analyze-prompt-performance.sh --iterations 20 &
   done
   wait
   ```

3. Analyze memory growth:
   ```bash
   jq -s 'map(.rss_mb) | {min: min, max: max, avg: (add/length), growth: (max - min)}' performance-metrics.jsonl
   ```

**Expected Outcomes**:
- Memory growth <50MB under load
- LLM analysis remains <2s
- No connection drops
- No error rate increase

### Phase 3: Stability Testing (12-24 hours)

**Objectives**:
- Verify long-term stability
- Detect memory leaks
- Monitor cache effectiveness

**Actions**:
1. Continue process monitoring (ongoing)

2. Periodic LLM tests (every 2 hours):
   ```bash
   crontab -e
   # Add: 0 */2 * * * cd /home/ob/Development/Tools/mcp-hub && ./scripts/test-analyze-prompt-performance.sh --iterations 10
   ```

3. Generate hourly performance reports:
   ```bash
   watch -n 3600 'jq -s "last" performance-metrics.jsonl | jq -r "{timestamp, rss_mb, cpu_percent, uptime}"'
   ```

**Expected Outcomes**:
- Memory stable (±10% variance)
- No uptime interruptions
- Consistent LLM performance
- Cache hit rate >50%

### Phase 4: Extended Monitoring (24-48 hours)

**Objectives**:
- Confirm production readiness
- Validate 24+ hour stability
- Final regression check

**Actions**:
1. Continue process monitoring (ongoing)

2. Execute comprehensive performance test:
   ```bash
   ./scripts/test-analyze-prompt-performance.sh --iterations 100
   ```

3. Generate final performance report:
   ```bash
   ./scripts/monitor-staging-performance.sh --duration 1 --generate-report
   ```

**Expected Outcomes**:
- Memory stable <200MB
- Zero critical errors
- LLM analysis <1.5s average
- System uptime 48+ hours

**Success Criteria**:
- All metrics within acceptable thresholds
- No performance regressions detected
- Zero critical alerts during monitoring period
- Ready for production deployment

---

## Data Collection and Analysis

### Metrics Storage

**Files**:
- `performance-metrics.jsonl` - Process metrics (60s interval)
- `llm-performance.jsonl` - LLM analysis metrics
- `performance-metrics.jsonl.logs` - Log analysis metrics

**Retention**: 7 days (for trend analysis)

### Analysis Commands

**Memory Trend Analysis**:
```bash
jq -s 'group_by(.timestamp[:10]) |
  map({date: .[0].timestamp[:10], avg_rss: (map(.rss_mb) | add / length)})' \
  performance-metrics.jsonl
```

**LLM Performance Statistics**:
```bash
jq -s '{
  total_tests: length,
  avg_duration: (map(.duration_ms) | add / length),
  p50: (map(.duration_ms) | sort | .[length/2]),
  p95: (map(.duration_ms) | sort | .[length*95/100]),
  p99: (map(.duration_ms) | sort | .[length*99/100])
}' llm-performance.jsonl
```

**Error Rate Calculation**:
```bash
jq -s '{
  total_entries: length,
  error_count: (map(select(.type == "error")) | length),
  error_rate_percent: ((map(select(.type == "error")) | length) / length * 100)
}' ~/.local/state/mcp-hub/logs/mcp-hub.log
```

---

## Reporting

### Daily Report Format

**Template**:
```
Performance Report: 2025-11-07
Deployment: fix/analyze-prompt-tool-activation
Uptime: XX hours XX minutes

System Resources:
- Memory (RSS): XXX.X MB (avg), XXX.X MB (max)
- CPU: X.X% (avg), X.X% (max)
- Status: [HEALTHY|WARNING|CRITICAL]

LLM Performance:
- Average duration: XXX ms
- P95 duration: XXX ms
- Tests executed: XXX
- Success rate: XX.X%
- Status: [OPTIMAL|ACCEPTABLE|ACTION REQUIRED]

Errors:
- Total errors: XX
- Error rate: X.X%
- Critical issues: XX
- Status: [CLEAN|REVIEW NEEDED|CRITICAL]

Recommendations:
- [Action items based on metrics]
```

### Automated Report Generation

**Command**:
```bash
./scripts/generate-performance-report.sh --date $(date -I) > reports/report-$(date -I).md
```

---

## Monitoring Quick Reference

### Start Monitoring
```bash
cd /home/ob/Development/Tools/mcp-hub
./scripts/monitor-staging-performance.sh --interval 60 --alert-threshold > staging-monitor.log 2>&1 &
echo $! > monitor.pid
```

### Check Current Status
```bash
tail -5 performance-metrics.jsonl | jq -r '{timestamp, rss_mb, cpu_percent, uptime}'
```

### Run Performance Test
```bash
./scripts/test-analyze-prompt-performance.sh --iterations 20
```

### Stop Monitoring
```bash
kill $(cat monitor.pid)
rm monitor.pid
```

### View Latest Metrics
```bash
jq -s 'last' performance-metrics.jsonl
```

---

## Next Steps

1. **Immediate**: Start 24-48h monitoring with automated scripts
2. **Day 1**: Execute Phase 1-2 testing, collect baseline metrics
3. **Day 2**: Execute Phase 3-4 testing, validate stability
4. **Post-Monitoring**: Generate final report, make production decision

**Decision Criteria**:
- ✅ All metrics within acceptable thresholds → Deploy to production
- ⚠️ Minor issues detected → Address and re-test
- ❌ Critical issues detected → Rollback and investigate
