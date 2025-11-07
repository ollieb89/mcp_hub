# MCP Hub Monitoring Scripts

Automated monitoring and health check scripts for validating integration health during staging deployment.

## Overview

These scripts implement the monitoring strategy defined in `claudedocs/INTEGRATION_MONITORING_STRATEGY.md` and provide automated validation of all system integration points.

## Available Scripts

### 1. phase1-validation.sh

**Purpose**: Initial validation of all integration points

**Usage**:
```bash
./scripts/monitoring/phase1-validation.sh
```

**What it checks**:
- Process health (PID, CPU, memory, uptime)
- Network connectivity (port 7000 listening)
- API health endpoint
- Server connection status
- MCP endpoint state and tool registration
- Recent errors in logs
- Log level distribution
- Workspace cache state
- Resource usage thresholds

**Success criteria**:
- Exit code 0 if all checks pass
- Exit code 1 if critical checks fail

**Run frequency**: On-demand, or every 15 minutes via cron

### 2. phase2-continuous.sh

**Purpose**: Continuous monitoring with configurable intervals

**Usage**:
```bash
./scripts/monitoring/phase2-continuous.sh
```

**What it monitors**:
- System metrics every 5 minutes (CPU, memory, uptime)
- Full health check every 30 minutes
- Error rate monitoring (continuous)
- Resource usage alerts (CPU >5%, Memory >5%)
- Process availability

**Output**: JSON Lines format to `~/.local/state/mcp-hub/monitoring/health_TIMESTAMP.jsonl`

**Monitoring types**:
- `light_check`: CPU, memory, server status (every 5 min)
- `full_health`: Complete health endpoint data (every 30 min)
- `error_alert`: High error rate detected
- `resource_alert`: Resource threshold exceeded

**Stop**: Press Ctrl+C (handles cleanup gracefully)

### 3. detect-anomalies.sh

**Purpose**: Detect unusual patterns and alert on potential issues

**Usage**:
```bash
./scripts/monitoring/detect-anomalies.sh
```

**What it detects**:
- Error spikes (>10 errors in last 100 log entries)
- Connection flapping (>3 disconnect/reconnect cycles)
- High resource usage (CPU >5%, Memory >5%)
- Unusual client count (>5 concurrent clients)
- Server disconnections
- Large log files (>50MB)

**Exit codes**:
- 0: All clear (no anomalies)
- 1: Warning (1-2 minor anomalies)
- 2: Critical (3+ anomalies)

**Run frequency**: Every 5 minutes via cron

### 4. daily-summary.sh

**Purpose**: Generate comprehensive daily health report

**Usage**:
```bash
./scripts/monitoring/daily-summary.sh
```

**Report includes**:
- System status (uptime, current resource usage)
- Server connection summary
- Activity summary (last 24 hours)
- Resource usage trends (from monitoring data)
- Incidents and alerts
- Overall health score (0-100)
- Recommendations based on findings

**Health score calculation**:
- Base: 100 points
- Deduct for errors (max -20)
- Deduct for high resource usage (max -30)
- Deduct for disconnected servers (max -30)
- Deduct for alerts (max -20)

**Run frequency**: Daily at 8 AM via cron

## Setup Instructions

### 1. Ensure Scripts are Executable

```bash
chmod +x scripts/monitoring/*.sh
```

### 2. Test Scripts Manually

```bash
# Phase 1 validation
./scripts/monitoring/phase1-validation.sh

# Anomaly detection
./scripts/monitoring/detect-anomalies.sh

# Daily summary
./scripts/monitoring/daily-summary.sh
```

### 3. Set Up Automated Monitoring (Optional)

Add to crontab for automated execution:

```bash
crontab -e
```

Add these lines:

```cron
# Phase 1 validation every 15 minutes
*/15 * * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/phase1-validation.sh >> ~/.local/state/mcp-hub/monitoring/validation.log 2>&1

# Anomaly detection every 5 minutes
*/5 * * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/detect-anomalies.sh >> ~/.local/state/mcp-hub/monitoring/anomalies.log 2>&1

# Daily summary at 8 AM
0 8 * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/daily-summary.sh >> ~/.local/state/mcp-hub/monitoring/daily-summary.log 2>&1
```

### 4. Start Continuous Monitoring

For 24-48 hour stability testing:

```bash
# Run in background
nohup ./scripts/monitoring/phase2-continuous.sh > ~/.local/state/mcp-hub/monitoring/continuous.log 2>&1 &

# Check monitoring PID
ps aux | grep phase2-continuous

# Stop monitoring
pkill -f phase2-continuous.sh
```

## Monitoring Data Locations

### Log Files

```
~/.local/state/mcp-hub/logs/mcp-hub.log          # Main application log
~/.local/state/mcp-hub/monitoring/health_*.jsonl # Continuous monitoring data
~/.local/state/mcp-hub/monitoring/validation.log # Phase 1 validation output
~/.local/state/mcp-hub/monitoring/anomalies.log  # Anomaly detection output
~/.local/state/mcp-hub/monitoring/daily-summary.log # Daily summary reports
~/.local/state/mcp-hub/monitoring/continuous.log # Continuous monitoring output
```

### Monitoring Data Format

**health_*.jsonl** (JSON Lines format):

```json
{"timestamp":"2025-11-07T21:00:00Z","type":"light_check","cpu":0.4,"mem":0.7,"uptime":"10:55","servers":[{"name":"filesystem","status":"connected"}]}
{"timestamp":"2025-11-07T21:30:00Z","type":"full_health","cpu":0.5,"mem":0.8,"uptime":"11:25","data":{...}}
{"timestamp":"2025-11-07T21:35:00Z","type":"error_alert","count":12}
{"timestamp":"2025-11-07T21:40:00Z","type":"resource_alert","resource":"cpu","value":6.2}
```

## Analysis Queries

### Extract Resource Usage Trends

```bash
# CPU usage over time
jq -r 'select(.type=="light_check" or .type=="full_health") | [.timestamp, .cpu] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl

# Memory usage over time
jq -r 'select(.type=="light_check" or .type=="full_health") | [.timestamp, .mem] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl
```

### Count Alert Types

```bash
# All alerts
jq -r 'select(.type | contains("alert"))' ~/.local/state/mcp-hub/monitoring/health_*.jsonl | wc -l

# By alert type
jq -r 'select(.type | contains("alert")) | .type' ~/.local/state/mcp-hub/monitoring/health_*.jsonl | sort | uniq -c
```

### Find Anomaly Windows

```bash
# High CPU periods
jq -r 'select(.cpu > 5.0) | [.timestamp, .cpu] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl

# Error spike periods
jq -r 'select(.type=="error_alert") | [.timestamp, .count] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl
```

### Server Status History

```bash
# Filesystem server status over time
jq -r 'select(.type=="full_health") | [.timestamp, .data.servers[0].status] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl
```

## Integration with Monitoring Strategy

These scripts implement the monitoring phases defined in `INTEGRATION_MONITORING_STRATEGY.md`:

- **Phase 1 (Hours 0-2)**: Use `phase1-validation.sh` for initial validation
- **Phase 2 (Hours 2-24)**: Use `phase2-continuous.sh` for continuous monitoring
- **Phase 3 (Hours 24-36)**: Manual stress testing (see strategy document)
- **Phase 4 (Hours 36-48)**: Use `daily-summary.sh` for stability analysis

## Alert Thresholds

### Resource Usage

- **CPU**: Warning at 5%, Critical at 10%
- **Memory**: Warning at 5%, Critical at 10%
- **Active Clients**: Warning at 5, Critical at 10

### Error Rates

- **Error Spike**: Warning at 10 errors per 100 log entries
- **Connection Flapping**: Warning at 3+ disconnect/reconnect cycles

### Log Management

- **Log File Size**: Warning at 50MB, Critical at 100MB

## Troubleshooting

### Script Fails with "jq: parse error"

**Cause**: Log file contains non-JSON lines or malformed JSON

**Solution**:
```bash
# Check log file format
tail -10 ~/.local/state/mcp-hub/logs/mcp-hub.log

# Validate JSON format
tail -10 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.'
```

### Script Fails with "Process not found"

**Cause**: MCP Hub process not running or PID changed

**Solution**:
```bash
# Find current PID
ps aux | grep "mcp-hub"

# Update hardcoded PID in scripts if needed
# OR restart MCP Hub with known PID
```

### Health Endpoint Returns Error

**Cause**: MCP Hub not responding or internal error

**Solution**:
```bash
# Check process status
ps -p 453077

# Check port listening
ss -tlnp | grep :7000

# Check recent logs
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error")'
```

### Monitoring Data Directory Full

**Cause**: Long-running continuous monitoring without cleanup

**Solution**:
```bash
# Check monitoring directory size
du -sh ~/.local/state/mcp-hub/monitoring/

# Clean old monitoring files (keep last 7 days)
find ~/.local/state/mcp-hub/monitoring/ -name "health_*.jsonl" -mtime +7 -delete

# Or compress old files
find ~/.local/state/mcp-hub/monitoring/ -name "health_*.jsonl" -mtime +7 -exec gzip {} \;
```

## Best Practices

1. **Run Phase 1 validation** before starting long-term monitoring
2. **Monitor continuously** during critical stability testing periods
3. **Review anomaly logs** daily for early issue detection
4. **Archive monitoring data** after completing validation
5. **Set up alerts** for critical thresholds (email, Slack, etc.)
6. **Rotate logs** to prevent disk space exhaustion
7. **Test scripts** in development before production use

## Exit Codes

All scripts follow standard exit code conventions:

- `0`: Success (all checks passed)
- `1`: Warning (non-critical issues detected)
- `2`: Critical (critical issues detected, immediate attention needed)

## Future Enhancements

Potential improvements for monitoring scripts:

- [ ] Add email/Slack notifications for alerts
- [ ] Implement Prometheus metrics export
- [ ] Add Grafana dashboard integration
- [ ] Create web UI for real-time monitoring
- [ ] Add predictive anomaly detection (ML-based)
- [ ] Implement automatic remediation for common issues
- [ ] Add performance profiling and bottleneck detection
- [ ] Create mobile-friendly monitoring dashboard

## References

- [Integration Monitoring Strategy](../../claudedocs/INTEGRATION_MONITORING_STRATEGY.md)
- [Troubleshooting Guide](../../claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md)
- [Deployment Documentation](../../claudedocs/DEPLOYMENT.md)

## Support

For questions or issues with monitoring scripts:

1. Check this README for troubleshooting steps
2. Review the monitoring strategy document
3. Check application logs for errors
4. Create an issue in the GitHub repository
