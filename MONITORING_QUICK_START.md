# MCP Hub Monitoring - Quick Start

**Status:** Production-Ready
**Last Updated:** 2025-11-16

## Quick Commands

### Check System Health
```bash
# Process status
ps aux | grep bun | grep start

# API health check
curl -s http://127.0.0.1:7000/api/health | jq '.state, .activeClients, (.servers | length)'

# Resource usage
ps -p $(pgrep -f "bun start") -o pid,pcpu,pmem,vsz,rss,etime --no-headers
```

### Run Monitoring
```bash
# Real-time dashboard (Ctrl+C to exit)
bash scripts/monitor-production.sh

# Performance baseline (60 seconds)
bash scripts/measure-performance.sh

# Alert check
bash scripts/check-alerts.sh

# Anomaly detection
bash scripts/monitoring/detect-anomalies.sh
```

### Setup Automation
```bash
# Install monitoring cron jobs
bash scripts/setup-monitoring-automation.sh
```

### View Logs
```bash
# Application logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log

# Monitoring logs
tail -f ~/.local/state/mcp-hub/monitoring/continuous.log

# Daily summaries
ls -lt ~/.local/state/mcp-hub/monitoring/daily-summary-*.md
```

## Current Baseline (2025-11-16)

```
Process:       Running (PID 350541, 8h uptime)
API Response:  7.3ms (excellent)
Servers:       23/26 connected (88.5%)
Memory:        81 MB (0.5% of system)
CPU:           0.6% (very low)
Tools:         362 available
```

## Alert Thresholds

**Critical** (Immediate response):
- Process not running
- Success rate <90%
- Circuit breaker open

**Warning** (4 hour response):
- Success rate <95%
- P95 latency >2000ms
- Cache hit rate <80%
- Memory >500 MB

## Documentation

- **Baseline Report:** `claudedocs/PRODUCTION_PERFORMANCE_BASELINE.md`
- **Setup Guide:** `claudedocs/MONITORING_SETUP_GUIDE.md`
- **Day 3 Report:** `claudedocs/DAY_3_MONITORING_REPORT.md`

## Known Issues

1. **Serena server disconnected** - MCP error -32000 (investigate)
2. **LLM parsing errors** - Null safety checks needed
3. **Hardcoded PID in scripts** - Low priority, false alerts only

## Next Steps

1. Optional: Install automated monitoring cron jobs
2. Monitor for first LLM requests (to establish real baselines)
3. Investigate serena disconnection within 48 hours
4. Fix LLM parsing errors within 1 week
