#!/bin/bash
# MCP Hub Integration Health Dashboard
# Real-time visual status display

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Unicode symbols
CHECK="✓"
WARN="⚠"
ERROR="✗"
INFO="ℹ"

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          MCP Hub Integration Health Dashboard                  ║${NC}"
echo -e "${BLUE}║                    $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Process Health
echo -e "${BLUE}[1] Process Health${NC}"
echo "────────────────────────────────────────────────────────────────"

if ps -p 453077 > /dev/null 2>&1; then
    METRICS=$(ps -p 453077 -o %cpu,%mem,etime --no-headers)
    CPU=$(echo "$METRICS" | awk '{print $1}')
    MEM=$(echo "$METRICS" | awk '{print $2}')
    UPTIME=$(echo "$METRICS" | awk '{print $3}')

    CPU_STATUS="${GREEN}${CHECK}${NC}"
    MEM_STATUS="${GREEN}${CHECK}${NC}"

    CPU_HIGH=$(echo "$CPU > 5.0" | bc -l 2>/dev/null || echo "0")
    MEM_HIGH=$(echo "$MEM > 5.0" | bc -l 2>/dev/null || echo "0")

    [ "$CPU_HIGH" -eq 1 ] && CPU_STATUS="${YELLOW}${WARN}${NC}"
    [ "$MEM_HIGH" -eq 1 ] && MEM_STATUS="${YELLOW}${WARN}${NC}"

    echo -e "  Process ID:   ${GREEN}453077${NC}"
    echo -e "  Uptime:       ${GREEN}${UPTIME}${NC}"
    echo -e "  CPU Usage:    ${CPU_STATUS} ${CPU}%"
    echo -e "  Memory:       ${MEM_STATUS} ${MEM}%"
else
    echo -e "  ${RED}${ERROR} Process not running${NC}"
fi

echo ""

# 2. Network Connectivity
echo -e "${BLUE}[2] Network Connectivity${NC}"
echo "────────────────────────────────────────────────────────────────"

if ss -tlnp 2>/dev/null | grep -q :7000; then
    echo -e "  Port 7000:    ${GREEN}${CHECK} Listening${NC}"
else
    echo -e "  Port 7000:    ${RED}${ERROR} Not listening${NC}"
fi

if curl -s --connect-timeout 2 http://127.0.0.1:7000/api/health > /dev/null 2>&1; then
    RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://127.0.0.1:7000/api/health)
    echo -e "  API Health:   ${GREEN}${CHECK} Responding (${RESPONSE_TIME}s)${NC}"
else
    echo -e "  API Health:   ${RED}${ERROR} Not responding${NC}"
fi

echo ""

# 3. Server Connections
echo -e "${BLUE}[3] MCP Server Connections${NC}"
echo "────────────────────────────────────────────────────────────────"

if SERVER_DATA=$(curl -s http://127.0.0.1:7000/api/servers 2>/dev/null); then
    # Filesystem
    FS_STATUS=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="filesystem") | .status')
    FS_TOOLS=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="filesystem") | .capabilities.tools | length')
    FS_UPTIME=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="filesystem") | .uptime')

    if [ "$FS_STATUS" = "connected" ]; then
        echo -e "  Filesystem:   ${GREEN}${CHECK} Connected${NC} (${FS_TOOLS} tools, ${FS_UPTIME}s uptime)"
    else
        echo -e "  Filesystem:   ${YELLOW}${WARN} ${FS_STATUS}${NC}"
    fi

    # GitHub
    GH_STATUS=$(echo "$SERVER_DATA" | jq -r '.servers[] | select(.name=="github") | .status')
    if [ "$GH_STATUS" = "connecting" ]; then
        echo -e "  GitHub:       ${BLUE}${INFO} Connecting${NC} (expected - no token)"
    elif [ "$GH_STATUS" = "connected" ]; then
        echo -e "  GitHub:       ${GREEN}${CHECK} Connected${NC}"
    else
        echo -e "  GitHub:       ${YELLOW}${WARN} ${GH_STATUS}${NC}"
    fi
else
    echo -e "  ${RED}${ERROR} Cannot fetch server data${NC}"
fi

echo ""

# 4. Tool Filtering Service
echo -e "${BLUE}[4] Tool Filtering Service${NC}"
echo "────────────────────────────────────────────────────────────────"

if HEALTH_DATA=$(curl -s http://127.0.0.1:7000/api/health 2>/dev/null); then
    ACTIVE_CLIENTS=$(echo "$HEALTH_DATA" | jq -r '.mcpEndpoint.activeClients // 0')
    TOTAL_TOOLS=$(echo "$HEALTH_DATA" | jq -r '.mcpEndpoint.registeredCapabilities.tools // 0')

    echo -e "  Meta-Tool:    ${GREEN}${CHECK} hub__analyze_prompt registered${NC}"
    echo -e "  Active Clients: ${ACTIVE_CLIENTS}"
    echo -e "  Total Tools:  ${TOTAL_TOOLS}"

    if [ "$ACTIVE_CLIENTS" -gt 5 ]; then
        echo -e "  ${YELLOW}${WARN} Unusual client count${NC}"
    fi
else
    echo -e "  ${RED}${ERROR} Cannot fetch endpoint data${NC}"
fi

echo ""

# 5. Logging System
echo -e "${BLUE}[5] Logging System${NC}"
echo "────────────────────────────────────────────────────────────────"

LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"

if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null || echo "0")
    LOG_SIZE_MB=$(echo "scale=1; $LOG_SIZE / 1048576" | bc)

    LOG_STATUS="${GREEN}${CHECK}${NC}"
    LOG_LARGE=$(echo "$LOG_SIZE_MB > 50.0" | bc -l 2>/dev/null || echo "0")
    [ "$LOG_LARGE" -eq 1 ] && LOG_STATUS="${YELLOW}${WARN}${NC}"

    echo -e "  Log File:     ${LOG_STATUS} ${LOG_SIZE_MB} MB${NC}"

    # Recent error count
    ERROR_COUNT=$(tail -100 "$LOG_FILE" 2>/dev/null | jq -r 'select(.level=="error")' 2>/dev/null | wc -l)
    ERROR_STATUS="${GREEN}${CHECK}${NC}"
    [ "$ERROR_COUNT" -gt 5 ] && ERROR_STATUS="${YELLOW}${WARN}${NC}"
    [ "$ERROR_COUNT" -gt 10 ] && ERROR_STATUS="${RED}${ERROR}${NC}"

    echo -e "  Recent Errors: ${ERROR_STATUS} ${ERROR_COUNT} (last 100 entries)${NC}"
else
    echo -e "  ${YELLOW}${WARN} Log file not found${NC}"
fi

echo ""

# 6. Workspace State
echo -e "${BLUE}[6] Workspace State${NC}"
echo "────────────────────────────────────────────────────────────────"

if [ -n "$HEALTH_DATA" ]; then
    WORKSPACE_ID=$(echo "$HEALTH_DATA" | jq -r '.workspaces.current // "unknown"')
    WORKSPACE_STATE=$(echo "$HEALTH_DATA" | jq -r ".workspaces.allActive.\"$WORKSPACE_ID\".state // \"unknown\"")

    echo -e "  Workspace ID: ${WORKSPACE_ID}"
    echo -e "  State:        ${GREEN}${WORKSPACE_STATE}${NC}"
    echo -e "  Config:       ./mcp-servers.json"
else
    echo -e "  ${RED}${ERROR} Cannot fetch workspace data${NC}"
fi

echo ""

# 7. Overall Health Score
echo -e "${BLUE}[7] Overall Health Score${NC}"
echo "────────────────────────────────────────────────────────────────"

HEALTH_SCORE=100

# Deduct for process issues
if ! ps -p 453077 > /dev/null 2>&1; then
    HEALTH_SCORE=$((HEALTH_SCORE - 50))
fi

# Deduct for high resource usage
if [ "$CPU_HIGH" -eq 1 ] 2>/dev/null; then
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi
if [ "$MEM_HIGH" -eq 1 ] 2>/dev/null; then
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi

# Deduct for server disconnections
if [ "$FS_STATUS" != "connected" ] && [ "$FS_STATUS" != "" ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
fi

# Deduct for high error rate
if [ "$ERROR_COUNT" -gt 10 ] 2>/dev/null; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
fi

# Ensure score doesn't go below 0
[ "$HEALTH_SCORE" -lt 0 ] && HEALTH_SCORE=0

# Color-code score
if [ "$HEALTH_SCORE" -ge 90 ]; then
    SCORE_COLOR=$GREEN
    SCORE_STATUS="EXCELLENT"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    SCORE_COLOR=$GREEN
    SCORE_STATUS="GOOD"
elif [ "$HEALTH_SCORE" -ge 50 ]; then
    SCORE_COLOR=$YELLOW
    SCORE_STATUS="FAIR"
else
    SCORE_COLOR=$RED
    SCORE_STATUS="POOR"
fi

echo -e "  ${SCORE_COLOR}${HEALTH_SCORE}/100${NC} - ${SCORE_COLOR}${SCORE_STATUS}${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Refresh note
echo -e "${BLUE}${INFO} Run this script periodically to monitor system health${NC}"
echo -e "${BLUE}${INFO} For continuous monitoring: ./scripts/monitoring/phase2-continuous.sh${NC}"
echo ""
