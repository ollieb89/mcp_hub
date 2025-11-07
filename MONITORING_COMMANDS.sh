#!/bin/bash
#
# Quick Monitoring Commands for MCP Hub Staging Validation
# Source this file: source MONITORING_COMMANDS.sh
# Or run directly: ./MONITORING_COMMANDS.sh <command>
#

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function hub-dashboard() {
    echo -e "${BLUE}Running visual dashboard...${NC}"
    ./scripts/monitoring/dashboard.sh
}

function hub-anomalies() {
    echo -e "${BLUE}Checking for anomalies...${NC}"
    ./scripts/monitoring/detect-anomalies.sh
}

function hub-health() {
    echo -e "${BLUE}Running health validation...${NC}"
    ./scripts/monitoring/phase1-validation.sh
}

function hub-summary() {
    echo -e "${BLUE}Generating daily summary...${NC}"
    ./scripts/monitoring/daily-summary.sh
}

function hub-logs() {
    echo -e "${BLUE}Tailing application logs (Ctrl+C to exit)...${NC}"
    tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "analyze_prompt|LLM|error|Tool exposure|hub__"
}

function hub-monitor-logs() {
    echo -e "${BLUE}Viewing continuous monitoring log (Ctrl+C to exit)...${NC}"
    tail -f ~/.local/state/mcp-hub/monitoring/continuous.log
}

function hub-health-data() {
    echo -e "${BLUE}Last 5 health check entries:${NC}"
    tail -5 ~/.local/state/mcp-hub/monitoring/health_*.jsonl 2>/dev/null | jq -r '{timestamp, cpu: .cpu_percent, memory: .rss_mb, uptime}'
}

function hub-status() {
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           MCP Hub Staging Status                         ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check if server is running
    if ps -p 453077 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Server running (PID 453077)"
        UPTIME=$(ps -p 453077 -o etime= | tr -d ' ')
        echo -e "  Uptime: $UPTIME"
    else
        echo -e "${YELLOW}⚠${NC} Server not running (PID 453077)"
    fi

    # Check if monitoring is running
    if ps -p 489638 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Monitoring active (PID 489638)"
    else
        echo -e "${YELLOW}⚠${NC} Monitoring not running (PID 489638)"
    fi

    # Check recent errors
    RECENT_ERRORS=$(grep -c '"type":"error"' ~/.local/state/mcp-hub/logs/mcp-hub.log 2>/dev/null | tail -100)
    if [ "$RECENT_ERRORS" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} No recent errors (last 100 log entries)"
    else
        echo -e "${YELLOW}⚠${NC} $RECENT_ERRORS errors in last 100 entries"
    fi

    echo ""
    echo -e "${BLUE}Quick commands:${NC}"
    echo "  hub-dashboard     - Visual health dashboard"
    echo "  hub-anomalies     - Check for anomalies"
    echo "  hub-health        - Full health validation"
    echo "  hub-logs          - Watch application logs"
    echo "  hub-status        - This status summary"
}

function hub-checkpoint() {
    echo -e "${BLUE}Running Day 1 checkpoint validation...${NC}"
    ./scripts/day1-checkpoint.sh
}

function hub-test-llm() {
    PROMPT="${1:-List files in /tmp}"
    echo -e "${BLUE}Testing LLM with prompt: \"$PROMPT\"${NC}"
    ./scripts/test-analyze-prompt.sh "$PROMPT"
}

function hub-smoke-tests() {
    echo -e "${BLUE}Running smoke tests...${NC}"
    ./scripts/staging-smoke-tests.sh
}

function hub-integration-tests() {
    echo -e "${BLUE}Running integration tests...${NC}"
    bun test tests/prompt-based-filtering.test.js
}

function hub-help() {
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           MCP Hub Monitoring Commands                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Monitoring:${NC}"
    echo "  hub-status            - Show current status summary"
    echo "  hub-dashboard         - Visual health dashboard (real-time)"
    echo "  hub-anomalies         - Check for anomalies"
    echo "  hub-health            - Full health validation"
    echo "  hub-summary           - Generate daily summary report"
    echo ""
    echo -e "${BLUE}Logs:${NC}"
    echo "  hub-logs              - Watch application logs (filtered)"
    echo "  hub-monitor-logs      - View continuous monitoring log"
    echo "  hub-health-data       - Show last 5 health check entries"
    echo ""
    echo -e "${BLUE}Testing:${NC}"
    echo "  hub-test-llm [prompt] - Test LLM prompt analysis"
    echo "  hub-smoke-tests       - Run all smoke tests"
    echo "  hub-integration-tests - Run integration test suite"
    echo ""
    echo -e "${BLUE}Checkpoints:${NC}"
    echo "  hub-checkpoint        - Run Day 1 checkpoint validation"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  source MONITORING_COMMANDS.sh  - Load commands into shell"
    echo "  ./MONITORING_COMMANDS.sh help  - Show this help"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  hub-status"
    echo "  hub-dashboard"
    echo "  hub-test-llm \"Check my GitHub notifications\""
    echo ""
}

# If script is executed (not sourced), run the command
if [ "${BASH_SOURCE[0]}" -eq "${0}" ]; then
    case "${1:-help}" in
        status)
            hub-status
            ;;
        dashboard)
            hub-dashboard
            ;;
        anomalies)
            hub-anomalies
            ;;
        health)
            hub-health
            ;;
        summary)
            hub-summary
            ;;
        logs)
            hub-logs
            ;;
        monitor-logs)
            hub-monitor-logs
            ;;
        health-data)
            hub-health-data
            ;;
        checkpoint)
            hub-checkpoint
            ;;
        test-llm)
            hub-test-llm "${2:-List files in /tmp}"
            ;;
        smoke-tests)
            hub-smoke-tests
            ;;
        integration-tests)
            hub-integration-tests
            ;;
        help|*)
            hub-help
            ;;
    esac
else
    # Script is being sourced, show help
    echo -e "${GREEN}✓ MCP Hub monitoring commands loaded!${NC}"
    echo ""
    hub-help
fi
