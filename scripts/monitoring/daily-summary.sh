#!/bin/bash
# Daily Summary Report Generator
# Aggregates monitoring data and generates summary report

set -e

echo "=== MCP Hub Daily Summary Report ==="
echo "Generated: $(date -Iseconds)"
echo ""

MONITORING_DIR="$HOME/.local/state/mcp-hub/monitoring"
LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"

# 1. System Status
echo "## System Status"
echo ""

if ps -p 453077 > /dev/null 2>&1; then
    UPTIME=$(ps -p 453077 -o etime --no-headers | xargs)
    CPU=$(ps -p 453077 -o %cpu --no-headers | xargs)
    MEM=$(ps -p 453077 -o %mem --no-headers | xargs)

    echo "Process Status: ✓ Running"
    echo "Uptime: $UPTIME"
    echo "Current CPU: ${CPU}%"
    echo "Current Memory: ${MEM}%"
else
    echo "Process Status: ✗ Not Running"
    echo ""
    exit 1
fi

echo ""

# 2. Server Connections
echo "## Server Connections"
echo ""

if SERVER_DATA=$(curl -s http://127.0.0.1:7000/api/servers 2>/dev/null); then
    echo "$SERVER_DATA" | jq -r '.servers[] | "- \(.name): \(.status) (\(.capabilities.tools | length) tools)"'
else
    echo "⚠ Unable to fetch server data"
fi

echo ""

# 3. Activity Summary (last 24 hours)
echo "## Activity Summary (Last 24 Hours)"
echo ""

# Count log entries by level
if [ -f "$LOG_FILE" ]; then
    echo "Log Statistics:"
    tail -10000 "$LOG_FILE" 2>/dev/null | jq -r '.level' | sort | uniq -c | awk '{print "  " $2 ": " $1}'
else
    echo "⚠ Log file not found"
fi

echo ""

# 4. Resource Usage Trends
echo "## Resource Usage Trends"
echo ""

if ls "$MONITORING_DIR"/health_*.jsonl >/dev/null 2>&1; then
    echo "From continuous monitoring data:"

    # CPU stats
    AVG_CPU=$(jq -r 'select(.type=="light_check" or .type=="full_health") | .cpu' "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | \
        awk '{sum+=$1; count++} END {if(count>0) printf "%.2f", sum/count; else print "N/A"}')
    MAX_CPU=$(jq -r 'select(.type=="light_check" or .type=="full_health") | .cpu' "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | \
        sort -n | tail -1)

    echo "  CPU - Average: ${AVG_CPU}%, Peak: ${MAX_CPU}%"

    # Memory stats
    AVG_MEM=$(jq -r 'select(.type=="light_check" or .type=="full_health") | .mem' "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | \
        awk '{sum+=$1; count++} END {if(count>0) printf "%.2f", sum/count; else print "N/A"}')
    MAX_MEM=$(jq -r 'select(.type=="light_check" or .type=="full_health") | .mem' "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | \
        sort -n | tail -1)

    echo "  Memory - Average: ${AVG_MEM}%, Peak: ${MAX_MEM}%"
else
    echo "⚠ No continuous monitoring data available"
fi

echo ""

# 5. Incidents and Alerts
echo "## Incidents and Alerts"
echo ""

if ls "$MONITORING_DIR"/health_*.jsonl >/dev/null 2>&1; then
    ALERT_COUNT=$(jq -r 'select(.type=="error_alert" or .type=="resource_alert")' "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | wc -l)
    echo "Total alerts recorded: $ALERT_COUNT"

    if [ "$ALERT_COUNT" -gt 0 ]; then
        echo ""
        echo "Recent alerts:"
        jq -r 'select(.type=="error_alert" or .type=="resource_alert") | [.timestamp, .type, .message // .count // .resource] | @tsv' \
            "$MONITORING_DIR"/health_*.jsonl 2>/dev/null | tail -10 | awk '{print "  - " $0}'
    fi
else
    echo "⚠ No monitoring data available"
fi

echo ""

# 6. Health Score
echo "## Health Score"
echo ""

# Calculate health score based on multiple factors
HEALTH_SCORE=100

# Deduct for errors (max -20)
ERROR_COUNT=$(tail -1000 "$LOG_FILE" 2>/dev/null | jq -r 'select(.level=="error")' | wc -l)
ERROR_PENALTY=$(echo "scale=0; ($ERROR_COUNT / 10) * 2" | bc)
[ "$ERROR_PENALTY" -gt 20 ] && ERROR_PENALTY=20
HEALTH_SCORE=$((HEALTH_SCORE - ERROR_PENALTY))

# Deduct for high resource usage (max -30)
if [ "$CPU" != "" ]; then
    CPU_HIGH=$(echo "$CPU > 5.0" | bc -l)
    [ "$CPU_HIGH" -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi

if [ "$MEM" != "" ]; then
    MEM_HIGH=$(echo "$MEM > 5.0" | bc -l)
    [ "$MEM_HIGH" -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi

# Deduct for disconnected servers (max -30)
if [ "$SERVER_DATA" != "" ]; then
    DISCONNECTED=$(echo "$SERVER_DATA" | jq -r '[.servers[] | select(.status != "connected" and .status != "connecting")] | length')
    HEALTH_SCORE=$((HEALTH_SCORE - DISCONNECTED * 30))
fi

# Deduct for alerts (max -20)
if [ "$ALERT_COUNT" != "" ] && [ "$ALERT_COUNT" -gt 0 ]; then
    ALERT_PENALTY=$(echo "scale=0; ($ALERT_COUNT / 5) * 10" | bc)
    [ "$ALERT_PENALTY" -gt 20 ] && ALERT_PENALTY=20
    HEALTH_SCORE=$((HEALTH_SCORE - ALERT_PENALTY))
fi

# Ensure score doesn't go below 0
[ "$HEALTH_SCORE" -lt 0 ] && HEALTH_SCORE=0

echo "Overall Health Score: $HEALTH_SCORE/100"

if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo "Status: ✓ EXCELLENT"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    echo "Status: ✓ GOOD"
elif [ "$HEALTH_SCORE" -ge 50 ]; then
    echo "Status: ⚠ FAIR"
else
    echo "Status: 🚨 POOR"
fi

echo ""

# 7. Recommendations
echo "## Recommendations"
echo ""

if [ "$ERROR_COUNT" -gt 20 ]; then
    echo "- Investigate error spike (${ERROR_COUNT} errors in last 1000 log entries)"
fi

if [ "$CPU_HIGH" -eq 1 ] 2>/dev/null; then
    echo "- Monitor CPU usage (currently ${CPU}%)"
fi

if [ "$MEM_HIGH" -eq 1 ] 2>/dev/null; then
    echo "- Monitor memory usage (currently ${MEM}%)"
fi

if [ "$DISCONNECTED" -gt 0 ] 2>/dev/null; then
    echo "- Check disconnected servers (${DISCONNECTED} servers not connected)"
fi

if [ "$ALERT_COUNT" -gt 10 ]; then
    echo "- Review alert patterns (${ALERT_COUNT} alerts in monitoring data)"
fi

# Check log file size
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null)
    LOG_SIZE_MB=$(echo "scale=0; $LOG_SIZE / 1048576" | bc)
    if [ "$LOG_SIZE_MB" -gt 50 ]; then
        echo "- Consider log rotation (current size: ${LOG_SIZE_MB} MB)"
    fi
fi

# If no recommendations
if [ "$ERROR_COUNT" -le 20 ] && [ "$CPU_HIGH" -ne 1 ] 2>/dev/null && [ "$MEM_HIGH" -ne 1 ] 2>/dev/null && \
   [ "$DISCONNECTED" -eq 0 ] 2>/dev/null && [ "$ALERT_COUNT" -le 10 ] && [ "$LOG_SIZE_MB" -le 50 ] 2>/dev/null; then
    echo "- No issues detected. System running optimally."
fi

echo ""
echo "=== End of Daily Summary ==="
