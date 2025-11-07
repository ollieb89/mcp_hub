#!/usr/bin/env bash
#
# Memory Regression Detection Script
#
# Monitors MCP Hub memory usage and detects regressions against baseline.
#
# Usage:
#   ./scripts/memory-regression-check.sh
#   ./scripts/memory-regression-check.sh --baseline 350000  # Custom baseline in KB
#
# Exit Codes:
#   0 - No regression detected
#   1 - Regression detected
#   2 - Script error (Hub not running, etc.)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASELINE_FILE="baseline-memory.txt"
THRESHOLD=5  # 5% memory increase acceptable
MAX_MEMORY_KB=524288  # 512MB absolute maximum

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Get current memory usage
get_memory_usage() {
    # Get RSS memory in KB for bun process running mcp-hub
    local mem=$(ps aux | grep -E "[b]un.*mcp-hub|[b]un.*cli\.js" | awk '{sum+=$6} END {print sum}')

    if [ -z "$mem" ]; then
        log_error "MCP Hub process not found"
        log_info "Start it with: bun start"
        exit 2
    fi

    echo "$mem"
}

# Format memory size
format_memory() {
    local kb="$1"
    local mb=$(awk "BEGIN {printf \"%.2f\", $kb / 1024}")
    echo "${mb}MB (${kb}KB)"
}

# Main execution
main() {
    echo "=========================================="
    echo "  Memory Regression Check"
    echo "=========================================="
    echo ""

    # Get current memory usage
    log_info "Checking MCP Hub memory usage..."
    CURRENT_MEM=$(get_memory_usage)

    # Check if baseline exists or use command-line argument
    if [ "${1:-}" = "--baseline" ] && [ -n "${2:-}" ]; then
        BASELINE_MEM="$2"
        log_info "Using provided baseline: $(format_memory $BASELINE_MEM)"
    elif [ -f "$BASELINE_FILE" ]; then
        BASELINE_MEM=$(cat "$BASELINE_FILE")
        log_info "Using baseline from file: $(format_memory $BASELINE_MEM)"
    else
        log_warning "No baseline found - creating new baseline"
        echo "$CURRENT_MEM" > "$BASELINE_FILE"
        log_success "Baseline created: $(format_memory $CURRENT_MEM)"
        log_info "Run this script again to check for regressions"
        exit 0
    fi

    # Calculate memory increase
    MEM_INCREASE=$(awk "BEGIN {printf \"%.2f\", (($CURRENT_MEM - $BASELINE_MEM) / $BASELINE_MEM) * 100}")

    # Display comparison
    echo ""
    echo "Memory Usage Comparison:"
    echo "========================"
    printf "%-20s: %s\n" "Baseline" "$(format_memory $BASELINE_MEM)"
    printf "%-20s: %s\n" "Current" "$(format_memory $CURRENT_MEM)"
    printf "%-20s: %+.2f%%\n" "Change" "$MEM_INCREASE"
    echo ""

    # Check for regression
    REGRESSION_DETECTED=false

    # Check threshold
    if (( $(echo "$MEM_INCREASE > $THRESHOLD" | bc -l) )); then
        log_warning "⚠️  MEMORY REGRESSION: Usage increased by ${MEM_INCREASE}% (threshold: ${THRESHOLD}%)"
        REGRESSION_DETECTED=true
    else
        log_success "✓ Memory usage within threshold (${MEM_INCREASE}% change)"
    fi

    # Check absolute maximum
    if [ "$CURRENT_MEM" -gt "$MAX_MEMORY_KB" ]; then
        log_error "⚠️  CRITICAL: Memory usage exceeds absolute maximum of 512MB"
        REGRESSION_DETECTED=true
    else
        log_success "✓ Memory usage below 512MB limit"
    fi

    echo ""
    echo "=========================================="

    if [ "$REGRESSION_DETECTED" = false ]; then
        log_success "No memory regressions detected"
        echo "=========================================="
        exit 0
    else
        log_error "Memory regressions detected - investigation required"
        echo "=========================================="
        echo ""
        log_info "Troubleshooting steps:"
        echo "  1. Check for memory leaks: Use Bun profiler"
        echo "  2. Review session cleanup: Verify sessions are cleaned on disconnect"
        echo "  3. Monitor over time: Run endurance test to check for growth"
        echo "  4. Update baseline if intentional: echo $CURRENT_MEM > $BASELINE_FILE"
        exit 1
    fi
}

# Run main
main "$@"
