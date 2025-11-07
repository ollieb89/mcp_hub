#!/bin/bash
# Anomaly Detection Script
# Detects unusual patterns in system behavior

set -e

echo "=== Anomaly Detection ==="
echo "Timestamp: $(date -Iseconds)"

LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"
ALERT_COUNT=0

# 1. Error spike detection (>10 errors in last 100 log entries)
echo -e "\n--- Error Spike Detection ---"
ERROR_SPIKE=$(tail -100 "$LOG_FILE" 2>/dev/null | jq -r 'select(.level=="error")' | wc -l)
echo "Recent error count: $ERROR_SPIKE (threshold: >10)"

if [ "$ERROR_SPIKE" -gt 10 ]; then
    echo "🚨 ALERT: Error spike detected ($ERROR_SPIKE errors)"
    ALERT_COUNT=$((ALERT_COUNT + 1))

    # Show last 5 errors
    echo "Last 5 errors:"
    tail -100 "$LOG_FILE" | jq -r 'select(.level=="error") | [.time, .msg] | @tsv' | tail -5
else
    echo "✓ No error spike"
fi

# 2. Connection flapping detection
echo -e "\n--- Connection Flapping Detection ---"
DISCONNECT_COUNT=$(tail -200 "$LOG_FILE" 2>/dev/null | jq -r 'select(.msg | contains("disconnect") or contains("Disconnect"))' | wc -l)
RECONNECT_COUNT=$(tail -200 "$LOG_FILE" 2>/dev/null | jq -r 'select(.msg | contains("reconnect") or contains("Reconnect"))' | wc -l)

echo "Disconnect events: $DISCONNECT_COUNT"
echo "Reconnect events: $RECONNECT_COUNT"
echo "Threshold: >3 cycles"

if [ "$DISCONNECT_COUNT" -gt 3 ] && [ "$RECONNECT_COUNT" -gt 3 ]; then
    echo "🚨 ALERT: Connection flapping detected"
    ALERT_COUNT=$((ALERT_COUNT + 1))
else
    echo "✓ Connection stable"
fi

# 3. Resource usage monitoring
echo -e "\n--- Resource Usage Monitoring ---"
if ps -p 453077 > /dev/null 2>&1; then
    CURRENT_CPU=$(ps -p 453077 -o %cpu --no-headers | xargs)
    CURRENT_MEM=$(ps -p 453077 -o %mem --no-headers | xargs)

    echo "Current CPU: ${CURRENT_CPU}% (warning: >5%)"
    echo "Current Memory: ${CURRENT_MEM}% (warning: >5%)"

    CPU_HIGH=$(echo "$CURRENT_CPU > 5.0" | bc -l)
    MEM_HIGH=$(echo "$CURRENT_MEM > 5.0" | bc -l)

    if [ "$CPU_HIGH" -eq 1 ]; then
        echo "⚠ WARNING: High CPU usage"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    else
        echo "✓ CPU usage normal"
    fi

    if [ "$MEM_HIGH" -eq 1 ]; then
        echo "⚠ WARNING: High memory usage"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    else
        echo "✓ Memory usage normal"
    fi
else
    echo "🚨 CRITICAL: Process 453077 not found"
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# 4. Client connection monitoring
echo -e "\n--- Client Connection Monitoring ---"
if HEALTH_DATA=$(curl -s http://127.0.0.1:7000/api/health 2>/dev/null); then
    ACTIVE_CLIENTS=$(echo "$HEALTH_DATA" | jq -r '.mcpEndpoint.activeClients // 0')
    echo "Active clients: $ACTIVE_CLIENTS (warning: >5)"

    if [ "$ACTIVE_CLIENTS" -gt 5 ]; then
        echo "⚠ WARNING: Unusual client count"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    else
        echo "✓ Client count normal"
    fi
else
    echo "⚠ WARNING: Cannot reach health endpoint"
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# 5. Server status monitoring
echo -e "\n--- Server Status Monitoring ---"
if SERVER_DATA=$(curl -s http://127.0.0.1:7000/api/servers 2>/dev/null); then
    FS_STATUS=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="filesystem") | .status')
    echo "Filesystem server: $FS_STATUS"

    if [ "$FS_STATUS" != "connected" ]; then
        echo "🚨 ALERT: Filesystem server not connected"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    else
        echo "✓ Filesystem server healthy"
    fi
else
    echo "⚠ WARNING: Cannot reach servers endpoint"
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# 6. Log file growth monitoring
echo -e "\n--- Log File Growth Monitoring ---"
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null)
    LOG_SIZE_MB=$(echo "scale=2; $LOG_SIZE / 1048576" | bc)
    echo "Current log size: ${LOG_SIZE_MB} MB"

    # Warning if log file >50MB
    LOG_LARGE=$(echo "$LOG_SIZE_MB > 50.0" | bc -l)
    if [ "$LOG_LARGE" -eq 1 ]; then
        echo "⚠ WARNING: Large log file (consider rotation)"
        ALERT_COUNT=$((ALERT_COUNT + 1))
    else
        echo "✓ Log file size acceptable"
    fi
else
    echo "⚠ WARNING: Log file not found"
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# Summary
echo -e "\n=== Anomaly Detection Summary ==="
echo "Total alerts: $ALERT_COUNT"

if [ "$ALERT_COUNT" -eq 0 ]; then
    echo "Status: ✓ ALL CLEAR - No anomalies detected"
    exit 0
elif [ "$ALERT_COUNT" -le 2 ]; then
    echo "Status: ⚠ WARNING - Minor anomalies detected"
    exit 1
else
    echo "Status: 🚨 CRITICAL - Multiple anomalies detected"
    exit 2
fi
