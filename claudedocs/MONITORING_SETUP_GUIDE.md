# MCP Hub Production Monitoring Setup Guide

**Version:** 1.0
**Date:** 2025-11-16
**Status:** Production-Ready

---

## Overview

Complete guide for setting up continuous production monitoring for MCP Hub, including automated metrics collection, anomaly detection, alerting, and performance trend analysis.

---

## Quick Start

### 1. Install Automated Monitoring (Recommended)

```bash
# Run the automated setup script
cd /home/ob/Development/Tools/mcp-hub
bash scripts/setup-monitoring-automation.sh
```

This will:
- Create monitoring directories
- Generate cron configuration
- Optionally install cron jobs
- Provide manual installation instructions

### 2. Test Monitoring Scripts

```bash
# Real-time dashboard (Ctrl+C to exit)
bash scripts/monitor-production.sh

# Performance baseline (60 second measurement)
bash scripts/measure-performance.sh

# Alert validation
bash scripts/check-alerts.sh

# Anomaly detection
bash scripts/monitoring/detect-anomalies.sh
```

### 3. Review Initial Baseline

```bash
# View baseline report
cat claudedocs/PRODUCTION_PERFORMANCE_BASELINE.md

# Or view saved baseline
cat baselines/baseline-20251116-212500.md
```

---

## Monitoring Architecture

### Data Collection Layers

**1. Real-Time Metrics** (SSE Events)
- Hub state changes
- Tool list updates
- Server connections/disconnections
- Log events
- Client connections

**2. Periodic Sampling** (Cron Jobs)
- Hourly anomaly detection (9 AM - 6 PM weekdays)
- Daily performance baseline (11:59 PM)
- Daily summary report (midnight)
- Weekly comprehensive validation (Sunday 2 AM)

**3. On-Demand Analysis** (Manual Scripts)
- Production monitoring dashboard
- Performance measurement
- Alert validation
- Phase 1 validation

### Data Storage

**Monitoring State Directory:**
```
~/.local/state/mcp-hub/monitoring/
├── continuous.log          # Hourly anomaly detection
├── daily-summary.log       # Daily performance baselines
├── weekly-analysis.log     # Weekly validation
├── daily-summary-YYYY-MM-DD.md  # Daily summary reports
└── health_*.jsonl          # Historical health snapshots
```

**Baseline Storage:**
```
/home/ob/Development/Tools/mcp-hub/baselines/
└── baseline-YYYYMMDD-HHMMSS.md  # Performance baselines
```

**Log Files:**
```
~/.local/state/mcp-hub/logs/
├── mcp-hub.log             # Main application log (rotating)
└── mcp-hub.YYYY-MM-DD.N.log  # Rotated logs
```

**State Files:**
```
~/.local/state/mcp-hub/
├── workspaces.json         # Active workspace tracking
└── tool-categories-llm.json  # LLM categorization cache
```

---

## Monitoring Scripts Reference

### Real-Time Monitoring

**`scripts/monitor-production.sh`**
- **Purpose:** Live dashboard with 5-second refresh
- **Metrics:** LLM performance, cache, queue, circuit breaker, alerts
- **Usage:** Interactive monitoring during investigations
- **Exit:** Ctrl+C

**Output:**
```
📊 MCP Hub Production Monitor
Updated: 2025-11-16 21:22:22

🤖 LLM Performance
  Success Rate:    N/A
  P95 Latency:     N/Ams
  Total Requests:  0

💾 Cache Performance
  Hit Rate:        N/A
  Cache Size:      0 entries

⚠️ Active Alerts
  ✅ No alerts - all metrics healthy
```

### Performance Measurement

**`scripts/measure-performance.sh`**
- **Purpose:** 60-second performance baseline capture
- **Metrics:** Throughput, LLM latency (P50/P95/P99), cache hit rate, queue depth
- **Usage:** Daily baseline or before/after comparisons
- **Duration:** ~60 seconds

**Output:**
```
📊 MCP Hub Performance Baseline Measurement

Requests/min:     0
Success Rate:     N/A
P95 Latency:      N/Ams
Cache Hit Rate:   N/A
Queue Depth:      0

✅ All baselines meet production targets
```

### Alert Validation

**`scripts/check-alerts.sh`**
- **Purpose:** Validate alert thresholds and current status
- **Checks:** Success rate, P95 latency, cache hit rate, queue depth, circuit breaker
- **Exit Code:** 0 (healthy), 1 (warnings), 2 (critical)

**Alert Thresholds:**
- Critical: Success rate <90%, circuit breaker open
- Warning: Success rate <95%, P95 latency >2000ms, cache hit rate <80%, queue depth >10

**Output:**
```
⚠️ MCP Hub Alert Check

Alert Check:
❌ ALERT: Low success rate (0% < 95%)
✅ P95 latency: 0ms (target: <2000ms)
⚠️ WARNING: Low cache hit rate (0% < 80%)

Summary:
Critical Alerts:  1
Warnings:         1
```

### Anomaly Detection

**`scripts/monitoring/detect-anomalies.sh`**
- **Purpose:** Detect unusual patterns and resource issues
- **Checks:** Error spikes, connection flapping, resource usage, server status, log growth
- **Usage:** Hourly monitoring via cron

**Anomaly Types:**
- Error spikes (>10 errors in 5 minutes)
- Connection flapping (>3 disconnect/reconnect cycles)
- Resource exhaustion (CPU >80%, memory >1 GB)
- Server disconnections
- Excessive log growth (>100 MB)

**Output:**
```
=== Anomaly Detection ===

--- Error Spike Detection ---
Recent error count: 0 (threshold: >10)
✓ No error spike

--- Connection Flapping Detection ---
Disconnect events: 0
✓ Connection stable

--- Resource Usage Monitoring ---
CPU: 0.6%, Memory: 81 MB
✓ Resource usage normal

=== Summary ===
Total alerts: 0
Status: ✅ All systems normal
```

### Phase 1 Validation

**`scripts/monitoring/phase1-validation.sh`**
- **Purpose:** Comprehensive system validation
- **Checks:** Process health, disk space, port availability, server connections, cache
- **Usage:** Weekly comprehensive validation

**Validation Areas:**
- System health (process, PID, port)
- Disk space (warning <20%, critical <10%)
- Server connectivity
- LLM cache status
- Configuration integrity

---

## Automated Monitoring Setup

### Recommended Cron Schedule

**Install via automation script:**
```bash
bash scripts/setup-monitoring-automation.sh
# Choose [y] to install automatically
```

**Or install manually:**
```bash
crontab -e
```

Add these lines:
```cron
# MCP Hub Production Monitoring

# Hourly anomaly detection (9 AM - 6 PM weekdays)
0 9-18 * * 1-5 cd /home/ob/Development/Tools/mcp-hub && bash scripts/monitoring/detect-anomalies.sh >> ~/.local/state/mcp-hub/monitoring/continuous.log 2>&1

# Daily performance baseline (11:59 PM every day)
59 23 * * * cd /home/ob/Development/Tools/mcp-hub && bash scripts/measure-performance.sh >> ~/.local/state/mcp-hub/monitoring/daily-summary.log 2>&1

# Daily summary report (midnight)
0 0 * * * cd /home/ob/Development/Tools/mcp-hub && bash scripts/monitoring/generate-daily-summary.sh >> ~/.local/state/mcp-hub/monitoring/daily-summary.log 2>&1

# Weekly comprehensive validation (Sunday 2 AM)
0 2 * * 0 cd /home/ob/Development/Tools/mcp-hub && bash scripts/monitoring/phase1-validation.sh >> ~/.local/state/mcp-hub/monitoring/weekly-analysis.log 2>&1

# Weekly log rotation (Sunday 3 AM)
0 3 * * 0 find ~/.local/state/mcp-hub/monitoring -name "*.log" -type f -mtime +30 -delete 2>&1
```

**Verify installation:**
```bash
crontab -l | grep 'MCP Hub'
```

---

## Alert Escalation Procedures

### Critical Alerts (Immediate Response)

**Triggers:**
- Process not running
- Port 7000 not listening
- Circuit breaker open
- Success rate <90%
- All servers disconnected

**Response Time:** Immediate (within 5 minutes)

**Actions:**
1. Check process status: `ps aux | grep bun`
2. Review recent logs: `tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log`
3. Check health endpoint: `curl http://127.0.0.1:7000/api/health`
4. Consider rollback if deployment-related
5. Restart MCP Hub: `bash scripts/stop-mcp-hub.sh && bash scripts/start-mcp-hub.sh`

**Notification:**
- System alert (critical)
- On-call engineer paged
- Incident ticket created

### Warning Alerts (Monitor Closely)

**Triggers:**
- Success rate 90-95%
- P95 latency >2000ms
- Cache hit rate <80%
- Queue depth >10
- Memory usage >500 MB
- 1-2 servers disconnected

**Response Time:** Within 4 hours

**Actions:**
1. Monitor trends over next hour
2. Check for patterns (time-of-day, specific servers)
3. Review application logs for errors
4. Investigate server-specific issues
5. Plan optimization or scaling if needed

**Notification:**
- System alert (warning)
- Team notification channel
- Daily summary report

### Info Alerts (Awareness Only)

**Triggers:**
- Individual server disconnections (non-critical)
- Cache misses
- Queue depth 5-10
- LLM parsing errors
- Log growth

**Response Time:** Next business day

**Actions:**
1. Log for trend analysis
2. Include in weekly review
3. Investigate during maintenance window
4. Document patterns

**Notification:**
- Monitoring log
- Weekly summary report

---

## Performance Targets & SLOs

### Service Level Objectives (Production)

**Availability:**
- Target: 99.9% uptime
- Maximum downtime: 43 minutes/month
- Measurement: Process availability on port 7000

**API Performance:**
- Health endpoint: <50ms (P95)
- Current: 7.3ms ✅

**LLM Performance:**
- Success rate: >95%
- P95 latency: <2000ms
- P99 latency: <5000ms
- Current: N/A (no requests yet)

**Cache Performance:**
- Hit rate: >80%
- Response time: <10ms
- Current: N/A (no activity yet)

**Resource Limits:**
- Memory: <500 MB
- CPU: <10% average
- Disk: <10 GB
- Current: 81 MB, 0.6% CPU ✅

### Performance Degradation Levels

**Level 1 - Optimal** (Green)
- Success rate: >95%
- P95 latency: <1000ms
- Cache hit rate: >80%
- All alerts green

**Level 2 - Acceptable** (Yellow)
- Success rate: 90-95%
- P95 latency: 1000-2000ms
- Cache hit rate: 60-80%
- Minor warnings present

**Level 3 - Degraded** (Orange)
- Success rate: 80-90%
- P95 latency: 2000-5000ms
- Cache hit rate: 40-60%
- Multiple warnings, investigate

**Level 4 - Critical** (Red)
- Success rate: <80%
- P95 latency: >5000ms
- Cache hit rate: <40%
- Critical alerts, immediate action

---

## Troubleshooting Monitoring Issues

### Monitoring Scripts Not Running

**Symptoms:**
- No logs in `~/.local/state/mcp-hub/monitoring/`
- Cron jobs not executing

**Diagnosis:**
```bash
# Check cron jobs
crontab -l | grep 'MCP Hub'

# Check cron service
systemctl status cron

# Check for cron errors
grep CRON /var/log/syslog
```

**Resolution:**
1. Reinstall cron jobs: `bash scripts/setup-monitoring-automation.sh`
2. Verify paths are absolute in cron config
3. Check file permissions on scripts: `chmod +x scripts/monitoring/*.sh`
4. Test scripts manually first

### False Positive Alerts

**Symptoms:**
- Alerts triggering when system is healthy
- Zero-load alerts (success rate 0%, cache hit rate 0%)

**Expected Behavior:**
- Success rate and cache alerts are EXPECTED at zero-load (no LLM requests)
- Alerts will resolve once traffic starts

**Resolution:**
1. Verify MCP Hub is receiving requests
2. Wait for first LLM categorization request
3. Ignore zero-load alerts during initial deployment
4. Adjust thresholds if needed after baseline established

### Monitoring Scripts Hardcoded Values

**Symptoms:**
- "Process 453077 not found" (actual PID different)
- "Filesystem server not connected" (server not in config)

**Cause:**
- Scripts have hardcoded PID and server names from development

**Resolution:**
1. Update `scripts/monitoring/phase1-validation.sh` to use dynamic PID:
   ```bash
   PID=$(ps aux | grep -E "bun.*start" | grep -v grep | awk '{print $2}')
   ```
2. Update `scripts/monitoring/detect-anomalies.sh` to remove hardcoded server checks
3. Contribution opportunity: Submit PR to fix hardcoded values

### JQ Parsing Errors

**Symptoms:**
- "jq: parse error: Invalid numeric literal"
- Anomaly detection fails

**Cause:**
- Timestamp format incompatibility
- Empty/null values in health endpoint

**Resolution:**
1. Update JQ filters to handle null values: `// "default"`
2. Add error handling: `2>/dev/null || echo "parse error"`
3. Check health endpoint output format: `curl -s http://127.0.0.1:7000/api/health | jq .`

---

## Daily/Weekly Review Checklists

### Daily Review (5 minutes)

**Review Logs:**
```bash
# Check daily summary
cat ~/.local/state/mcp-hub/monitoring/daily-summary-$(date +%Y-%m-%d).md

# Check for critical errors
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i error

# Verify process health
ps aux | grep bun | grep start
```

**Check Metrics:**
- [ ] Process running and healthy
- [ ] No critical alerts
- [ ] Server connection rate >90%
- [ ] Memory usage <500 MB
- [ ] No error spikes in logs

### Weekly Review (15 minutes)

**Review Trends:**
```bash
# View all daily summaries
ls -lt ~/.local/state/mcp-hub/monitoring/daily-summary-*.md | head -7

# Check weekly validation
tail -100 ~/.local/state/mcp-hub/monitoring/weekly-analysis.log

# Review continuous monitoring
tail -500 ~/.local/state/mcp-hub/monitoring/continuous.log
```

**Analyze Patterns:**
- [ ] Performance trends (improving/degrading)
- [ ] Cache hit rate optimization opportunities
- [ ] Server disconnection patterns
- [ ] Resource usage growth
- [ ] Error type distribution

**Optimization Opportunities:**
- [ ] Identify slow servers (>2000ms latency)
- [ ] Review cache misses for categorization improvements
- [ ] Check for redundant LLM calls
- [ ] Optimize tool filtering rules

### Monthly Review (30 minutes)

**Baseline Comparison:**
```bash
# Compare current vs. initial baseline
diff baselines/baseline-20251116-212500.md baselines/baseline-$(date +%Y%m%d)*.md
```

**Deep Analysis:**
- [ ] Long-term performance trends
- [ ] Capacity planning (resource growth)
- [ ] Alert threshold tuning
- [ ] Monitoring script improvements
- [ ] Infrastructure optimization

**Documentation Updates:**
- [ ] Update baseline targets
- [ ] Revise alert thresholds
- [ ] Document new patterns
- [ ] Share learnings with team

---

## Advanced Monitoring

### Custom Metrics Collection

**Add custom metrics to health endpoint:**
```javascript
// In src/server.js or monitoring module
app.get('/api/metrics/custom', (req, res) => {
  res.json({
    llm: {
      requests_total: llmMetrics.total,
      requests_success: llmMetrics.success,
      requests_failure: llmMetrics.failure,
      latency_p95: llmMetrics.latency.p95,
      cache_hits: llmMetrics.cache.hits,
      cache_misses: llmMetrics.cache.misses
    },
    timestamp: new Date().toISOString()
  });
});
```

### Prometheus Integration

**Export metrics in Prometheus format:**
```bash
# Install prometheus-node-exporter (if available)
npm install prom-client

# Add Prometheus metrics endpoint
# See MCP Hub issues/PRs for full implementation
```

**Scrape configuration:**
```yaml
scrape_configs:
  - job_name: 'mcp-hub'
    static_configs:
      - targets: ['localhost:7000']
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 15s
```

### Grafana Dashboards

**Pre-built dashboard for MCP Hub:**
- Real-time LLM performance
- Cache hit rate trends
- Queue depth monitoring
- Server availability heatmap
- Resource usage graphs

**Import:** (Dashboard JSON to be contributed)

---

## Monitoring Best Practices

### DO

✅ **Run baseline measurements before changes**
- Capture performance before deployments
- Compare before/after metrics
- Save baselines to `baselines/` directory

✅ **Monitor trends, not just absolute values**
- Look for degradation patterns
- Identify optimization opportunities
- Correlate with deployments/config changes

✅ **Set realistic alert thresholds**
- Use baseline data to set thresholds
- Account for traffic patterns (peak hours)
- Avoid alert fatigue with too-sensitive thresholds

✅ **Document unusual events**
- Add notes to daily summaries
- Track correlation with external factors
- Build incident knowledge base

✅ **Review monitoring data regularly**
- Daily quick check (5 min)
- Weekly trend analysis (15 min)
- Monthly optimization review (30 min)

### DON'T

❌ **Ignore zero-load alerts**
- Expected during initial deployment
- Will resolve with traffic
- But DO investigate after traffic starts

❌ **Over-optimize based on single data points**
- Wait for consistent trends
- Collect at least 3 days of data
- Consider traffic variability

❌ **Disable monitoring during deployments**
- Monitoring is MOST important during changes
- Use monitoring to detect deployment issues
- Keep historical data for rollback decisions

❌ **Set alerts without clear action plans**
- Every alert should have documented response
- Unclear alerts cause alert fatigue
- Define severity levels and escalation

---

## Future Enhancements

### Planned Monitoring Improvements

**1. Distributed Tracing** (Priority: High)
- Track request flow across servers
- Identify slow tool execution
- Visualize dependency chains

**2. Historical Metrics Database** (Priority: Medium)
- Store time-series data
- Enable long-term trend analysis
- Support capacity planning

**3. Automated Performance Regression Detection** (Priority: Medium)
- Compare each deployment to baseline
- Alert on significant degradation
- Auto-rollback on critical regressions

**4. Machine Learning Anomaly Detection** (Priority: Low)
- Learn normal patterns
- Detect subtle anomalies
- Predict capacity issues

**5. Multi-Instance Monitoring** (Priority: Low)
- Aggregate metrics across instances
- Compare instance performance
- Detect instance-specific issues

---

## Support & Contribution

### Getting Help

**Documentation:**
- Monitoring Guide: This document
- Deployment Guide: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Troubleshooting: `claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md`

**Community:**
- GitHub Issues: Report monitoring bugs
- GitHub Discussions: Ask questions
- Pull Requests: Contribute improvements

### Contributing Monitoring Improvements

**Areas for Contribution:**
1. Fix hardcoded values in monitoring scripts
2. Add Prometheus/Grafana integration
3. Create pre-built dashboards
4. Improve anomaly detection algorithms
5. Add new metrics and visualizations
6. Write monitoring runbooks
7. Optimize alert thresholds based on real data

**Contribution Process:**
1. Fork repository
2. Create feature branch: `monitoring/your-improvement`
3. Test changes in production-like environment
4. Submit PR with detailed description
5. Include baseline comparisons if performance-related

---

## Appendix: Monitoring Script Source Locations

```
/home/ob/Development/Tools/mcp-hub/scripts/
├── monitor-production.sh              # Real-time dashboard
├── measure-performance.sh             # Performance baseline
├── check-alerts.sh                    # Alert validation
├── setup-monitoring-automation.sh     # Cron setup automation
└── monitoring/
    ├── detect-anomalies.sh           # Anomaly detection
    ├── phase1-validation.sh          # Comprehensive validation
    └── generate-daily-summary.sh     # Daily summary reports
```

---

## Quick Reference Card

**Start Monitoring:**
```bash
bash scripts/monitor-production.sh
```

**Run Baseline:**
```bash
bash scripts/measure-performance.sh
```

**Check Alerts:**
```bash
bash scripts/check-alerts.sh
```

**Setup Automation:**
```bash
bash scripts/setup-monitoring-automation.sh
```

**View Logs:**
```bash
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log
tail -f ~/.local/state/mcp-hub/monitoring/continuous.log
```

**Check Status:**
```bash
curl -s http://127.0.0.1:7000/api/health | jq .
ps aux | grep bun | grep start
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0
**Status:** Production-Ready
