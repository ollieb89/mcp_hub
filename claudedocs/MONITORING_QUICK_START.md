# Performance Monitoring Quick Start

**Last Updated**: 2025-11-07
**Deployment**: Staging (PID 453077, Port 7000)
**Status**: Ready for 24-48h monitoring

---

## Immediate Actions (Run Now)

### 1. Start Continuous Monitoring

```bash
cd /home/ob/Development/Tools/mcp-hub

# Start process monitoring (runs every 60 seconds)
./scripts/monitor-staging-performance.sh \
  --interval 60 \
  --pid 453077 \
  --alert-threshold \
  > staging-monitor.log 2>&1 &

# Save PID for later management
echo $! > monitor.pid

# Verify it started
tail -f staging-monitor.log
```

**Expected Output**:
```
Auto-detected staging process: PID 453077
Monitoring continuously (Ctrl+C to stop)
Output file: performance-metrics.jsonl
Monitoring interval: 60s

Starting performance monitoring...

[2025-11-07T22:XX:XX+00:00] RSS: 111MB | CPU: 0.4% | Uptime: 00:XX | Servers: 1/2
```

### 2. Run Initial LLM Performance Test

```bash
# Execute 20 iterations with built-in test prompts
./scripts/test-analyze-prompt-performance.sh --iterations 20

# Wait for completion (~30 seconds)
```

**Expected Output**:
```
Testing hub__analyze_prompt performance
Iterations: 20
Output file: llm-performance.jsonl

Running performance tests...

[1] 1234ms | Categories: github | Confidence: 0.95
[2] 1156ms | Categories: filesystem | Confidence: 0.98
...
[20] 1289ms | Categories: filesystem | Confidence: 0.97

========================================
Performance Test Summary
========================================

Total tests: 20
Successful: 20
Failed: 0

LLM Analysis Duration:
  Average: 1245ms
  Maximum: 1567ms
  Minimum: 1023ms

Performance Thresholds:
  Met target (<1500ms): 18 / 20
  Met acceptable (<2000ms): 20 / 20

Status: ALL TESTS PASSED
```

### 3. Monitor Logs in Real-time

```bash
# Open separate terminal window
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  jq -c 'select(.type == "error" or .type == "warn" or (.message | contains("analyze_prompt")))'
```

**Expected**: Minimal output (only errors, warnings, or analyze_prompt events)

---

## Status Checks (Run Periodically)

### Check Process Health

```bash
# View latest metrics (last 5 samples)
tail -5 performance-metrics.jsonl | jq -r '{timestamp, rss_mb, cpu_percent, uptime}'
```

**Example Output**:
```json
{
  "timestamp": "2025-11-07T22:30:00+00:00",
  "rss_mb": 112,
  "cpu_percent": 0.5,
  "uptime": "25:00"
}
```

### Check LLM Performance

```bash
# View latest LLM test results
jq -s 'last(.[])' llm-performance.jsonl
```

**Example Output**:
```json
{
  "timestamp": "2025-11-07T22:15:00+00:00",
  "iteration": 20,
  "prompt": "Check my GitHub notifications",
  "duration_ms": 1289,
  "success": true,
  "categories": "github",
  "confidence": 0.97
}
```

### Check for Alerts

```bash
# Search monitoring log for alerts
grep -E "WARNING|CRITICAL" staging-monitor.log
```

**Expected**: Empty output (no alerts)

---

## Monitoring Dashboard (Terminal)

### One-line Status Display

```bash
# Run in separate terminal for live status
watch -n 5 'echo "=== MCP Hub Staging Status ===" && \
  echo "Process: $(ps -p 453077 -o etime,rss --no-headers | awk "{print \"Uptime:\", \$1, \"| Memory:\", \$2/1024, \"MB\"}")" && \
  echo "Latest Metric: $(jq -s "last" performance-metrics.jsonl | jq -r "{rss_mb, cpu_percent}")" && \
  echo "Errors (last hour): $(grep -c "\"type\":\"error\"" ~/.local/state/mcp-hub/logs/mcp-hub.log)"'
```

**Example Output** (updates every 5 seconds):
```
=== MCP Hub Staging Status ===
Process: Uptime: 30:00 | Memory: 113.5 MB
Latest Metric: {"rss_mb":114,"cpu_percent":0.6}
Errors (last hour): 0
```

---

## Stop Monitoring

### Graceful Shutdown

```bash
# Stop the monitoring script
kill $(cat monitor.pid)
rm monitor.pid

# Generate final summary
./scripts/monitor-staging-performance.sh --generate-summary
```

---

## Troubleshooting

### Monitoring Script Not Running

**Check**:
```bash
ps aux | grep monitor-staging-performance
```

**If not running**:
```bash
# Restart with explicit PID
./scripts/monitor-staging-performance.sh --pid 453077 --interval 60 > staging-monitor.log 2>&1 &
echo $! > monitor.pid
```

### Performance Test Failing

**Check staging process**:
```bash
ps -p 453077
```

**Check port availability**:
```bash
curl -s http://localhost:7000/health || echo "Service unavailable"
```

**Check logs for errors**:
```bash
tail -20 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -c 'select(.type == "error")'
```

### High Memory Usage

**Current memory**:
```bash
ps -p 453077 -o rss --no-headers | awk '{print $1/1024 " MB"}'
```

**If >300MB**:
1. Check for memory leak in logs
2. Consider restarting staging process
3. Review memory growth trend in metrics

**Memory trend analysis**:
```bash
jq -s 'map(.rss_mb) | {min: min, max: max, growth: (max - min)}' performance-metrics.jsonl
```

---

## Next Steps After 24-48h

### Generate Final Report

```bash
# Stop monitoring
kill $(cat monitor.pid)

# Generate comprehensive report
cat > reports/staging-performance-$(date -I).md <<EOF
# Staging Performance Report
**Date**: $(date -I)
**Duration**: $(jq -s 'length * 60 / 60' performance-metrics.jsonl) hours

## Memory Statistics
$(jq -s '{avg_mb: (map(.rss_mb) | add / length), max_mb: (map(.rss_mb) | max), min_mb: (map(.rss_mb) | min)}' performance-metrics.jsonl)

## LLM Performance
$(jq -s '{avg_ms: (map(.duration_ms) | add / length), max_ms: (map(.duration_ms) | max), success_rate: (map(select(.success)) | length / length * 100)}' llm-performance.jsonl)

## Errors
$(grep -c '"type":"error"' ~/.local/state/mcp-hub/logs/mcp-hub.log) total errors
EOF

cat reports/staging-performance-$(date -I).md
```

### Decision Criteria

**Deploy to Production** if:
- ✅ Memory stable <200MB average
- ✅ LLM analysis <1.5s average
- ✅ Error rate <0.1%
- ✅ No critical alerts during monitoring period
- ✅ Uptime 24+ hours without restart

**Investigate Further** if:
- ⚠️ Memory 200-300MB
- ⚠️ LLM analysis 1.5-2s average
- ⚠️ Error rate 0.1-1%
- ⚠️ Minor alerts occurred

**Rollback** if:
- ❌ Memory >300MB
- ❌ LLM analysis >2s average
- ❌ Error rate >1%
- ❌ Critical alerts or process crashes

---

## Files Generated

- `performance-metrics.jsonl` - Process metrics (60s interval)
- `llm-performance.jsonl` - LLM analysis metrics
- `performance-metrics.jsonl.logs` - Log analysis metrics
- `staging-monitor.log` - Monitoring script output
- `monitor.pid` - Monitoring process ID

**Location**: `/home/ob/Development/Tools/mcp-hub/`

**Retention**: Keep for 7 days for trend analysis

---

## Reference Documents

- **Baseline Metrics**: `claudedocs/PERFORMANCE_BASELINE_METRICS.md`
- **Monitoring Strategy**: `claudedocs/PERFORMANCE_MONITORING_STRATEGY.md`
- **Staging Deployment Guide**: `claudedocs/STAGING_DEPLOYMENT_GUIDE.md`

---

## Quick Command Reference

```bash
# Start monitoring
./scripts/monitor-staging-performance.sh --interval 60 --pid 453077 > staging-monitor.log 2>&1 &
echo $! > monitor.pid

# Run performance test
./scripts/test-analyze-prompt-performance.sh --iterations 20

# Check status
tail -5 performance-metrics.jsonl | jq -r '{timestamp, rss_mb, cpu_percent}'

# View alerts
grep -E "WARNING|CRITICAL" staging-monitor.log

# Stop monitoring
kill $(cat monitor.pid)
```
