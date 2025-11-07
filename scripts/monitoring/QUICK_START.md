# MCP Hub Monitoring Quick Start Guide

Fast setup guide for monitoring the staging deployment.

## Prerequisites

- MCP Hub running on PID 453077, port 7000
- `jq` installed for JSON parsing
- `bc` installed for calculations
- Bash shell environment

## 5-Minute Setup

### 1. Verify Prerequisites

```bash
# Check MCP Hub is running
ps -p 453077

# Check required tools
which jq bc curl

# Check port listening
ss -tlnp | grep :7000
```

### 2. Make Scripts Executable

```bash
cd /home/ob/Development/Tools/mcp-hub
chmod +x scripts/monitoring/*.sh
```

### 3. Run Initial Validation

```bash
./scripts/monitoring/phase1-validation.sh
```

**Expected output**: "Status: ✓ PASS (system operational)"

### 4. Test Anomaly Detection

```bash
./scripts/monitoring/detect-anomalies.sh
```

**Expected output**: "Status: ✓ ALL CLEAR - No anomalies detected"

### 5. Start Continuous Monitoring (Optional)

```bash
# Run in background
nohup ./scripts/monitoring/phase2-continuous.sh > ~/.local/state/mcp-hub/monitoring/continuous.log 2>&1 &

# Note the PID
echo $! > ~/.local/state/mcp-hub/monitoring/continuous.pid
```

## Monitoring Commands Cheat Sheet

### Quick Health Check

```bash
# One-line health status
curl -s http://127.0.0.1:7000/api/health | jq '{status, state, activeClients, servers: [.servers[] | {name, status}]}'
```

### Check Resource Usage

```bash
# CPU and Memory
ps -p 453077 -o %cpu,%mem,etime --no-headers
```

### View Recent Errors

```bash
# Last 10 errors
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | [.time, .msg] | @tsv' | tail -10
```

### Monitor Logs in Real-Time

```bash
# Follow all logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '[.time, .level, .msg] | @tsv'

# Follow errors only
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | [.time, .msg] | @tsv'
```

### Check Server Connections

```bash
# Server status
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | {name, status, tools: .capabilities.tools | length}'
```

## 24-Hour Monitoring Protocol

### Hour 0: Initial Setup

```bash
# 1. Run validation
./scripts/monitoring/phase1-validation.sh

# 2. Start continuous monitoring
nohup ./scripts/monitoring/phase2-continuous.sh > ~/.local/state/mcp-hub/monitoring/continuous.log 2>&1 &

# 3. Schedule anomaly detection (cron)
crontab -e
# Add: */5 * * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/detect-anomalies.sh >> ~/.local/state/mcp-hub/monitoring/anomalies.log 2>&1
```

### Hours 1-23: Periodic Checks

**Every 4 hours**: Run validation script
```bash
./scripts/monitoring/phase1-validation.sh
```

**Every 2 hours**: Check anomaly log
```bash
tail -20 ~/.local/state/mcp-hub/monitoring/anomalies.log
```

**Once at end**: Generate daily summary
```bash
./scripts/monitoring/daily-summary.sh
```

### Hour 24: Analysis

```bash
# 1. Stop continuous monitoring
pkill -f phase2-continuous.sh

# 2. Generate summary
./scripts/monitoring/daily-summary.sh > ~/.local/state/mcp-hub/monitoring/24h-summary.txt

# 3. Review monitoring data
jq -r 'select(.type=="resource_alert" or .type=="error_alert")' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl

# 4. Calculate stability metrics
TOTAL_CHECKS=$(jq -s 'length' ~/.local/state/mcp-hub/monitoring/health_*.jsonl)
ALERT_CHECKS=$(jq -s '[.[] | select(.type | contains("alert"))] | length' ~/.local/state/mcp-hub/monitoring/health_*.jsonl)
echo "Success rate: $(echo "scale=2; ($TOTAL_CHECKS - $ALERT_CHECKS) / $TOTAL_CHECKS * 100" | bc)%"
```

## Common Scenarios

### Scenario 1: High Error Rate Detected

**Alert**: "Error spike detected (15 errors)"

**Actions**:
```bash
# 1. Check recent errors
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | [.time, .msg, .error.code] | @tsv'

# 2. Identify error patterns
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | .msg' | sort | uniq -c

# 3. Check affected component
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | {name, status, error}'

# 4. Review logs for specific server
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.server=="filesystem")'
```

### Scenario 2: Filesystem Server Disconnected

**Alert**: "Filesystem server not connected"

**Actions**:
```bash
# 1. Check server status
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | select(.name=="filesystem")'

# 2. Check reconnection attempts
grep -E 'filesystem.*reconnect' ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -10

# 3. Monitor for automatic recovery
watch -n 5 'curl -s http://127.0.0.1:7000/api/servers | jq ".servers[] | select(.name==\"filesystem\") | .status"'

# 4. If not recovering after 60s, restart MCP Hub (last resort)
# systemctl restart mcp-hub  # OR
# kill -HUP 453077
```

### Scenario 3: High Resource Usage

**Alert**: "High CPU usage: 8.5%"

**Actions**:
```bash
# 1. Check current usage
ps -p 453077 -o pid,%cpu,%mem,etime,cmd

# 2. Check active clients
curl -s http://127.0.0.1:7000/api/health | jq '.mcpEndpoint.activeClients'

# 3. Monitor for 5 minutes
for i in {1..5}; do
    sleep 60
    ps -p 453077 -o %cpu,%mem --no-headers
done

# 4. If sustained high usage, check for runaway operations
tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.msg | contains("slow") or contains("timeout"))'
```

### Scenario 4: Log File Growing Rapidly

**Alert**: "Large log file (75 MB)"

**Actions**:
```bash
# 1. Check log file size
ls -lh ~/.local/state/mcp-hub/logs/mcp-hub.log

# 2. Identify verbose components
tail -1000 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '.msg' | sort | uniq -c | sort -rn | head -10

# 3. Check for logging loops
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '.msg' | uniq -c | sort -rn | head -5

# 4. Rotate log file
mv ~/.local/state/mcp-hub/logs/mcp-hub.log ~/.local/state/mcp-hub/logs/mcp-hub.log.$(date +%Y%m%d_%H%M%S)
kill -HUP 453077  # Reopen log file
```

## Data Visualization (Optional)

### Plot CPU Usage Over Time

```bash
# Extract CPU data
jq -r 'select(.cpu) | [.timestamp, .cpu] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl > cpu_usage.tsv

# Use gnuplot (if installed)
gnuplot <<EOF
set terminal png size 1200,600
set output 'cpu_usage.png'
set datafile separator '\t'
set xdata time
set timefmt "%Y-%m-%dT%H:%M:%S"
set format x "%H:%M"
set xlabel "Time"
set ylabel "CPU %"
set title "CPU Usage Over Time"
plot 'cpu_usage.tsv' using 1:2 with lines title 'CPU'
EOF
```

### Generate Alert Timeline

```bash
# Extract alerts
jq -r 'select(.type | contains("alert")) | [.timestamp, .type, .count // .resource // ""] | @tsv' \
    ~/.local/state/mcp-hub/monitoring/health_*.jsonl > alerts.tsv

# View in terminal
column -t -s $'\t' alerts.tsv
```

## Stop Monitoring

### Stop Continuous Monitoring

```bash
# Find and kill process
pkill -f phase2-continuous.sh

# Or using saved PID
kill $(cat ~/.local/state/mcp-hub/monitoring/continuous.pid)
```

### Disable Cron Jobs

```bash
# Edit crontab
crontab -e

# Comment out or remove MCP Hub monitoring lines
# Save and exit
```

### Archive Monitoring Data

```bash
# Create archive
ARCHIVE_NAME="mcp-hub-monitoring-$(date +%Y%m%d).tar.gz"
tar -czf "$ARCHIVE_NAME" ~/.local/state/mcp-hub/monitoring/

# Move to archive location
mv "$ARCHIVE_NAME" ~/archives/

# Clean monitoring directory
rm -f ~/.local/state/mcp-hub/monitoring/health_*.jsonl
rm -f ~/.local/state/mcp-hub/monitoring/*.log
```

## Troubleshooting

### "Process not found" Error

**Cause**: MCP Hub process not running or PID changed

**Fix**:
```bash
# Find new PID
ps aux | grep "mcp-hub" | grep -v grep

# Update PID in scripts (edit scripts if needed)
# OR use environment variable
export MCP_HUB_PID=<new_pid>
```

### "jq: parse error" in Logs

**Cause**: Log file contains non-JSON lines

**Fix**:
```bash
# Check log file format
head -5 ~/.local/state/mcp-hub/logs/mcp-hub.log

# If mixed format, filter JSON only
grep -E '^\{' ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.'
```

### Scripts Not Executable

**Fix**:
```bash
chmod +x scripts/monitoring/*.sh
```

### Cannot Connect to Port 7000

**Fix**:
```bash
# Check if port is listening
ss -tlnp | grep :7000

# Check firewall
sudo ufw status | grep 7000

# Try localhost instead of 127.0.0.1
curl -s http://localhost:7000/api/health
```

## Success Indicators

After 24 hours of monitoring, you should see:

- ✓ Process uptime matches monitoring period
- ✓ CPU usage <1% average, <5% peak
- ✓ Memory usage <2% average, <5% peak
- ✓ Error count <10 total (excluding expected GitHub error)
- ✓ No unexpected server disconnections
- ✓ Active clients remain stable (0-2 normally)
- ✓ Log file size <50MB
- ✓ No resource exhaustion warnings

## Next Steps

After successful 24-hour monitoring:

1. Review `daily-summary.sh` output
2. Analyze monitoring data trends
3. Document any incidents or anomalies
4. Generate final health report
5. Archive monitoring data
6. Proceed with production deployment planning

## References

- [Full Monitoring Strategy](./INTEGRATION_MONITORING_STRATEGY.md)
- [Detailed Script Documentation](./README.md)
- [Troubleshooting Guide](../../claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md)
