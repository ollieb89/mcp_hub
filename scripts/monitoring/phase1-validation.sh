#!/bin/bash
# Phase 1: Initial Validation Script
# Validates all integration points are functioning correctly

set -e

echo "=== Phase 1: Initial Validation ==="
echo "Timestamp: $(date -Iseconds)"

# 1. System Health
echo -e "\n--- System Health ---"
if ps -p 453077 > /dev/null 2>&1; then
    ps -p 453077 -o pid,ppid,cmd,%cpu,%mem,etime --no-headers
    echo "✓ Process is running"
else
    echo "✗ ERROR: Process 453077 not found"
    exit 1
fi

if ss -tlnp 2>/dev/null | grep -q :7000; then
    echo "✓ Port 7000 is listening"
else
    echo "✗ ERROR: Port 7000 not listening"
    exit 1
fi

# 2. API Health
echo -e "\n--- API Health ---"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://127.0.0.1:7000/api/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_JSON=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Health endpoint responding (HTTP $HTTP_CODE)"
    echo "$HEALTH_JSON" | jq '{status, state, activeClients, servers: [.servers[] | {name, status, uptime}]}'
else
    echo "✗ ERROR: Health endpoint returned HTTP $HTTP_CODE"
    exit 1
fi

# 3. Server Connections
echo -e "\n--- Server Connections ---"
SERVER_DATA=$(curl -s http://127.0.0.1:7000/api/servers)
echo "$SERVER_DATA" | jq '.servers[] | {name, status, tools: .capabilities.tools | length}'

# Validate filesystem server
FS_STATUS=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="filesystem") | .status')
if [ "$FS_STATUS" = "connected" ]; then
    echo "✓ Filesystem server connected"
else
    echo "⚠ WARNING: Filesystem server status: $FS_STATUS"
fi

# 4. MCP Endpoint State
echo -e "\n--- MCP Endpoint State ---"
echo "$HEALTH_JSON" | jq '.mcpEndpoint'

TOTAL_TOOLS=$(echo "$HEALTH_JSON" | jq -r '.mcpEndpoint.registeredCapabilities.tools')
if [ "$TOTAL_TOOLS" -ge 14 ]; then
    echo "✓ Tool registration healthy ($TOTAL_TOOLS tools)"
else
    echo "⚠ WARNING: Low tool count: $TOTAL_TOOLS"
fi

# 5. Recent Errors
echo -e "\n--- Recent Errors (last 10) ---"
ERROR_COUNT=$(tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error")' | wc -l)
echo "Error count (last 100 log entries): $ERROR_COUNT"

if [ "$ERROR_COUNT" -le 1 ]; then
    echo "✓ Error rate acceptable (≤1 expected for GitHub)"
else
    echo "⚠ WARNING: High error count"
    tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | [.time, .msg] | @tsv' | tail -10
fi

# 6. Log Level Distribution
echo -e "\n--- Log Level Distribution (last 100 entries) ---"
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '.level' | sort | uniq -c

# 7. Workspace Cache
echo -e "\n--- Workspace Cache ---"
echo "$HEALTH_JSON" | jq '.workspaces'

# 8. Resource Usage Summary
echo -e "\n--- Resource Usage Summary ---"
CPU=$(ps -p 453077 -o %cpu --no-headers | xargs)
MEM=$(ps -p 453077 -o %mem --no-headers | xargs)
echo "CPU: ${CPU}% (threshold: <1% normal, <5% peak)"
echo "Memory: ${MEM}% (threshold: <2% normal, <5% peak)"

# Performance thresholds
CPU_OK=$(echo "$CPU < 5.0" | bc -l)
MEM_OK=$(echo "$MEM < 5.0" | bc -l)

if [ "$CPU_OK" -eq 1 ] && [ "$MEM_OK" -eq 1 ]; then
    echo "✓ Resource usage within acceptable limits"
else
    echo "⚠ WARNING: Resource usage elevated"
fi

# 9. Overall Status
echo -e "\n=== Phase 1 Validation Complete ==="
echo "Status: ✓ PASS (system operational)"
echo "Timestamp: $(date -Iseconds)"
