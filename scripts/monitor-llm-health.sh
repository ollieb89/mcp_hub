#!/usr/bin/env bash
#
# LLM Health Monitoring Script
# Tracks API success rate, errors, and fallback activations
#
# Usage: ./scripts/monitor-llm-health.sh [time-window]
#
# Examples:
#   ./scripts/monitor-llm-health.sh "1 hour"
#   ./scripts/monitor-llm-health.sh "24 hours"
#   ./scripts/monitor-llm-health.sh "all"

set -euo pipefail

# Configuration
LOG_FILE="${LOG_FILE:-$HOME/.local/state/mcp-hub/logs/mcp-hub.log}"
TIME_WINDOW="${1:-1 hour}"

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

# Time filtering (if not "all")
if [ "$TIME_WINDOW" != "all" ]; then
    # For simplicity, use current date for "1 hour" filter
    # In production, could use more sophisticated time filtering
    TIME_FILTER=$(date +'%Y-%m-%d')
else
    TIME_FILTER=""
fi

# Count LLM events
if [ -n "$TIME_FILTER" ]; then
    TOTAL_CALLS=$(grep "$TIME_FILTER" "$LOG_FILE" | grep -c "analyzePrompt called" || echo "0")
    SUCCESSFUL=$(grep "$TIME_FILTER" "$LOG_FILE" | grep -c "LLM analysis completed" || echo "0")
    ERRORS=$(grep "$TIME_FILTER" "$LOG_FILE" | grep -c "LLM provider error" || echo "0")
    FALLBACKS=$(grep "$TIME_FILTER" "$LOG_FILE" | grep -c "Heuristic categorization" || echo "0")
else
    TOTAL_CALLS=$(grep -c "analyzePrompt called" "$LOG_FILE" || echo "0")
    SUCCESSFUL=$(grep -c "LLM analysis completed" "$LOG_FILE" || echo "0")
    ERRORS=$(grep -c "LLM provider error" "$LOG_FILE" || echo "0")
    FALLBACKS=$(grep -c "Heuristic categorization" "$LOG_FILE" || echo "0")
fi

# Calculate metrics
if [ "$TOTAL_CALLS" -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($SUCCESSFUL/$TOTAL_CALLS)*100}")
    FALLBACK_RATE=$(awk "BEGIN {printf \"%.2f\", ($FALLBACKS/$TOTAL_CALLS)*100}")
    ERROR_RATE=$(awk "BEGIN {printf \"%.2f\", ($ERRORS/$TOTAL_CALLS)*100}")
else
    SUCCESS_RATE="N/A"
    FALLBACK_RATE="N/A"
    ERROR_RATE="N/A"
fi

# Display report
echo "=========================================="
echo "  LLM Health Report ($TIME_WINDOW)"
echo "=========================================="
echo ""
echo "API Call Statistics:"
echo "  Total Calls:      $TOTAL_CALLS"
echo "  Successful:       $SUCCESSFUL"
echo "  Errors:           $ERRORS"
echo "  Fallback Used:    $FALLBACKS"
echo ""
echo "Performance Metrics:"
echo -e "  Success Rate:     ${SUCCESS_RATE}%"
echo -e "  Error Rate:       ${ERROR_RATE}%"
echo -e "  Fallback Rate:    ${FALLBACK_RATE}%"
echo ""

# Health status
if [ "$TOTAL_CALLS" -gt 10 ]; then
    if [ "$SUCCESS_RATE" != "N/A" ]; then
        if awk "BEGIN {exit !($SUCCESS_RATE >= 95)}"; then
            echo -e "${GREEN}Status: HEALTHY${NC} (Success rate >= 95%)"
        elif awk "BEGIN {exit !($SUCCESS_RATE >= 90)}"; then
            echo -e "${YELLOW}Status: WARNING${NC} (Success rate 90-95%)"
        else
            echo -e "${RED}Status: CRITICAL${NC} (Success rate < 90%)"
        fi
    else
        echo "Status: INSUFFICIENT DATA"
    fi
else
    echo "Status: INSUFFICIENT DATA (need >10 calls)"
fi
echo ""

# Recent errors
if [ "$ERRORS" -gt 0 ]; then
    echo "Recent Errors (last 5):"
    if [ -n "$TIME_FILTER" ]; then
        grep "$TIME_FILTER" "$LOG_FILE" | grep "LLM provider error" | tail -5 | \
            awk -F'message":"' '{print "  - " $2}' | awk -F'"' '{print $1}'
    else
        grep "LLM provider error" "$LOG_FILE" | tail -5 | \
            awk -F'message":"' '{print "  - " $2}' | awk -F'"' '{print $1}'
    fi
    echo ""
fi

# Recommendations
if [ "$TOTAL_CALLS" -gt 10 ] && [ "$SUCCESS_RATE" != "N/A" ]; then
    if awk "BEGIN {exit !($SUCCESS_RATE < 90)}"; then
        echo "⚠️  RECOMMENDATIONS:"
        echo "  - Check Gemini API status"
        echo "  - Verify GEMINI_API_KEY is valid"
        echo "  - Review error logs for patterns"
        echo "  - Consider increasing timeout"
        echo "  - Enable fallback if not already enabled"
    fi

    if awk "BEGIN {exit !($FALLBACK_RATE > 10)}"; then
        echo "⚠️  HIGH FALLBACK RATE:"
        echo "  - LLM responses may be invalid"
        echo "  - Check prompt formatting"
        echo "  - Verify model compatibility"
    fi
fi

echo "=========================================="
