#!/usr/bin/env bash
#
# LLM Latency Monitoring Script
# Tracks response times and identifies performance issues
#
# Usage: ./scripts/monitor-llm-latency.sh

set -euo pipefail

# Configuration
LOG_FILE="${LOG_FILE:-$HOME/.local/state/mcp-hub/logs/mcp-hub.log}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}Error: Log file not found at $LOG_FILE${NC}"
    exit 1
fi

# Extract all latencies (in milliseconds)
LATENCIES=$(grep "LLM analysis completed" "$LOG_FILE" | grep -oP 'took \K[0-9]+' | sort -n)

if [ -z "$LATENCIES" ]; then
    echo "No LLM latency data found in logs"
    exit 0
fi

# Calculate statistics
TOTAL=$(echo "$LATENCIES" | wc -l)
AVG=$(echo "$LATENCIES" | awk '{sum+=$1} END {printf "%.0f", sum/NR}')
MIN=$(echo "$LATENCIES" | head -1)
MAX=$(echo "$LATENCIES" | tail -1)

# Calculate percentiles
P50=$(echo "$LATENCIES" | awk -v total="$TOTAL" 'NR==int(total*0.50)+1 {print; exit}')
P75=$(echo "$LATENCIES" | awk -v total="$TOTAL" 'NR==int(total*0.75)+1 {print; exit}')
P90=$(echo "$LATENCIES" | awk -v total="$TOTAL" 'NR==int(total*0.90)+1 {print; exit}')
P95=$(echo "$LATENCIES" | awk -v total="$TOTAL" 'NR==int(total*0.95)+1 {print; exit}')
P99=$(echo "$LATENCIES" | awk -v total="$TOTAL" 'NR==int(total*0.99)+1 {print; exit}')

# Display report
echo "=========================================="
echo "  LLM Latency Report"
echo "=========================================="
echo ""
echo "Sample Size:      $TOTAL requests"
echo ""
echo "Latency Statistics:"
echo "  Minimum:        ${MIN}ms"
echo "  Average:        ${AVG}ms"
echo "  Maximum:        ${MAX}ms"
echo ""
echo "Percentiles:"
echo "  P50 (median):   ${P50}ms"
echo "  P75:            ${P75}ms"
echo "  P90:            ${P90}ms"
echo "  P95:            ${P95}ms"
echo "  P99:            ${P99}ms"
echo ""

# Performance assessment
echo "Performance Assessment:"
if awk "BEGIN {exit !($AVG <= 1000)}"; then
    echo -e "  Average: ${GREEN}EXCELLENT${NC} (<= 1000ms)"
elif awk "BEGIN {exit !($AVG <= 1500)}"; then
    echo -e "  Average: ${GREEN}GOOD${NC} (<= 1500ms)"
elif awk "BEGIN {exit !($AVG <= 2000)}"; then
    echo -e "  Average: ${YELLOW}ACCEPTABLE${NC} (<= 2000ms)"
else
    echo -e "  Average: ${RED}POOR${NC} (> 2000ms)"
fi

if awk "BEGIN {exit !($P95 <= 1500)}"; then
    echo -e "  P95:     ${GREEN}EXCELLENT${NC} (<= 1500ms)"
elif awk "BEGIN {exit !($P95 <= 2000)}"; then
    echo -e "  P95:     ${GREEN}GOOD${NC} (<= 2000ms)"
elif awk "BEGIN {exit !($P95 <= 3000)}"; then
    echo -e "  P95:     ${YELLOW}ACCEPTABLE${NC} (<= 3000ms)"
else
    echo -e "  P95:     ${RED}POOR${NC} (> 3000ms)"
fi

if awk "BEGIN {exit !($P99 <= 2000)}"; then
    echo -e "  P99:     ${GREEN}EXCELLENT${NC} (<= 2000ms)"
elif awk "BEGIN {exit !($P99 <= 3000)}"; then
    echo -e "  P99:     ${GREEN}GOOD${NC} (<= 3000ms)"
elif awk "BEGIN {exit !($P99 <= 5000)}"; then
    echo -e "  P99:     ${YELLOW}ACCEPTABLE${NC} (<= 5000ms)"
else
    echo -e "  P99:     ${RED}POOR${NC} (> 5000ms)"
fi
echo ""

# Slow requests
SLOW_COUNT=$(echo "$LATENCIES" | awk '$1 > 2000 {count++} END {print count+0}')
if [ "$SLOW_COUNT" -gt 0 ]; then
    SLOW_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($SLOW_COUNT/$TOTAL)*100}")
    echo -e "${YELLOW}Slow Requests (>2000ms):${NC} $SLOW_COUNT ($SLOW_PERCENT%)"
    echo ""
fi

# Recommendations
if awk "BEGIN {exit !($AVG > 2000)}"; then
    echo "⚠️  RECOMMENDATIONS:"
    echo "  - Check network latency to Gemini API"
    echo "  - Consider using a faster model"
    echo "  - Verify no rate limiting in effect"
    echo "  - Check for system resource constraints"
fi

if awk "BEGIN {exit !($P99 > 5000)}"; then
    echo "⚠️  HIGH P99 LATENCY:"
    echo "  - Some requests experiencing significant delays"
    echo "  - Consider implementing timeout"
    echo "  - Review slow request patterns"
fi

echo "=========================================="
