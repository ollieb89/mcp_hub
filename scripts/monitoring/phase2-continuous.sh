#!/bin/bash
# Phase 2: Continuous Monitoring Script
# Monitors system health at regular intervals

set -e

LOG_DIR="$HOME/.local/state/mcp-hub/monitoring"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HEALTH_LOG="$LOG_DIR/health_${TIMESTAMP}.jsonl"

echo "=== Phase 2: Continuous Monitoring Started ==="
echo "Logging to: $HEALTH_LOG"
echo "Monitoring PID: $$"
echo "Press Ctrl+C to stop"

# Cleanup handler
cleanup() {
    echo -e "\n=== Monitoring Stopped ==="
    echo "Log file: $HEALTH_LOG"
    echo "Total records: $(wc -l < "$HEALTH_LOG")"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Initialize monitoring
ITERATION=0

while true; do
    CURRENT_TIME=$(date -Iseconds)
    ITERATION=$((ITERATION + 1))

    # System metrics
    if ps -p 453077 > /dev/null 2>&1; then
        SYSTEM_METRICS=$(ps -p 453077 -o %cpu,%mem,etime --no-headers)
        CPU=$(echo "$SYSTEM_METRICS" | awk '{print $1}')
        MEM=$(echo "$SYSTEM_METRICS" | awk '{print $2}')
        UPTIME=$(echo "$SYSTEM_METRICS" | awk '{print $3}')
    else
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"critical_error\",\"message\":\"Process 453077 not found\"}" >> "$HEALTH_LOG"
        echo "CRITICAL: Process not running!"
        exit 1
    fi

    # Full health check every 30 minutes (iterations 0, 6, 12, ...)
    if [ $((ITERATION % 6)) -eq 0 ]; then
        echo -n "[$CURRENT_TIME] Full health check... "
        HEALTH_CHECK=$(curl -s http://127.0.0.1:7000/api/health 2>/dev/null || echo '{"error":"API unavailable"}')
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"full_health\",\"cpu\":$CPU,\"mem\":$MEM,\"uptime\":\"$UPTIME\",\"data\":$HEALTH_CHECK}" >> "$HEALTH_LOG"
        echo "Done"
    else
        # Light check every 5 minutes
        echo -n "[$CURRENT_TIME] Light check... "
        SERVER_STATUS=$(curl -s http://127.0.0.1:7000/api/servers 2>/dev/null | jq -c '[.servers[] | {name, status}]' || echo '[]')
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"light_check\",\"cpu\":$CPU,\"mem\":$MEM,\"uptime\":\"$UPTIME\",\"servers\":$SERVER_STATUS}" >> "$HEALTH_LOG"
        echo "Done (CPU: ${CPU}%, Mem: ${MEM}%)"
    fi

    # Error monitoring
    ERROR_COUNT=$(tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error")' 2>/dev/null | wc -l)
    if [ "$ERROR_COUNT" -gt 5 ]; then
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"error_alert\",\"count\":$ERROR_COUNT}" >> "$HEALTH_LOG"
        echo "⚠ WARNING: High error rate detected ($ERROR_COUNT errors in last 50 log entries)"
    fi

    # Resource alerts
    CPU_HIGH=$(echo "$CPU > 5.0" | bc -l)
    MEM_HIGH=$(echo "$MEM > 5.0" | bc -l)

    if [ "$CPU_HIGH" -eq 1 ]; then
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"resource_alert\",\"resource\":\"cpu\",\"value\":$CPU}" >> "$HEALTH_LOG"
        echo "⚠ WARNING: High CPU usage: ${CPU}%"
    fi

    if [ "$MEM_HIGH" -eq 1 ]; then
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"resource_alert\",\"resource\":\"memory\",\"value\":$MEM}" >> "$HEALTH_LOG"
        echo "⚠ WARNING: High memory usage: ${MEM}%"
    fi

    # Sleep for 5 minutes
    sleep 300
done
