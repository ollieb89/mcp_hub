#!/usr/bin/env bash
#
# Performance Regression Detection Script
#
# Compares current load test results against baseline metrics
# to detect performance regressions during staging validation.
#
# Usage:
#   ./scripts/performance-regression-check.sh
#   ./scripts/performance-regression-check.sh --baseline custom-baseline.json
#
# Exit Codes:
#   0 - No regression detected
#   1 - Regression detected
#   2 - Script error (missing files, invalid JSON, etc.)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASELINE="${1:-baseline-pre-staging.json}"
CURRENT="test-results-current.json"
THRESHOLD_P95=10          # 10% p95 latency increase acceptable
THRESHOLD_ERROR_RATE=50   # 50% error rate increase acceptable
THRESHOLD_THROUGHPUT=-15  # 15% throughput decrease acceptable

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

# Check dependencies
check_dependencies() {
    for cmd in jq bc k6; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 2
        fi
    done
}

# Run current load test
run_load_test() {
    log_info "Running current load test..."

    if ! k6 run --quiet --out json="$CURRENT" tests/load/basic-mcp-endpoint.js > /dev/null 2>&1; then
        log_error "Load test execution failed"
        exit 2
    fi

    log_success "Load test completed"
}

# Extract metric from JSON
extract_metric() {
    local file="$1"
    local path="$2"

    if [ ! -f "$file" ]; then
        log_error "File not found: $file"
        exit 2
    fi

    jq -r "$path // 0" "$file" 2>/dev/null || echo "0"
}

# Calculate percentage change
calc_percentage_change() {
    local baseline="$1"
    local current="$2"

    if (( $(echo "$baseline == 0" | bc -l) )); then
        echo "0"
    else
        echo "scale=2; (($current - $baseline) / $baseline) * 100" | bc
    fi
}

# Check if regression exceeds threshold
check_threshold() {
    local metric_name="$1"
    local baseline_value="$2"
    local current_value="$3"
    local threshold="$4"
    local delta="$5"

    local regression=false

    # For throughput, negative delta is bad (decrease)
    if [[ "$metric_name" == *"throughput"* ]]; then
        if (( $(echo "$delta < $threshold" | bc -l) )); then
            log_warning "⚠️  REGRESSION DETECTED: $metric_name decreased by ${delta}% (threshold: ${threshold}%)"
            echo "   Baseline: $baseline_value | Current: $current_value"
            regression=true
        else
            log_success "✓ $metric_name: ${delta}% change (within threshold)"
        fi
    else
        # For latency and error rate, positive delta is bad (increase)
        if (( $(echo "$delta > $threshold" | bc -l) )); then
            log_warning "⚠️  REGRESSION DETECTED: $metric_name increased by ${delta}% (threshold: ${threshold}%)"
            echo "   Baseline: $baseline_value | Current: $current_value"
            regression=true
        else
            log_success "✓ $metric_name: ${delta}% change (within threshold)"
        fi
    fi

    $regression && return 1 || return 0
}

# Main execution
main() {
    echo "=========================================="
    echo "  Performance Regression Check"
    echo "=========================================="
    echo ""

    # Check dependencies
    check_dependencies

    # Verify baseline exists
    if [ ! -f "$BASELINE" ]; then
        log_error "Baseline file not found: $BASELINE"
        log_info "Create baseline with: bun run test:load:ci && mv test-results-load.json $BASELINE"
        exit 2
    fi

    # Run current load test
    run_load_test

    echo ""
    log_info "Extracting metrics..."
    echo ""

    # Extract p95 latency
    BASELINE_P95=$(extract_metric "$BASELINE" '.metrics.http_req_duration.values."p(95)"')
    CURRENT_P95=$(extract_metric "$CURRENT" '.metrics.http_req_duration.values."p(95)"')
    P95_DELTA=$(calc_percentage_change "$BASELINE_P95" "$CURRENT_P95")

    # Extract error rate
    BASELINE_ERR=$(extract_metric "$BASELINE" '.metrics.http_req_failed.values.rate')
    CURRENT_ERR=$(extract_metric "$CURRENT" '.metrics.http_req_failed.values.rate')
    ERR_DELTA=$(calc_percentage_change "$BASELINE_ERR" "$CURRENT_ERR")

    # Extract throughput
    BASELINE_THROUGHPUT=$(extract_metric "$BASELINE" '.metrics.http_reqs.values.rate')
    CURRENT_THROUGHPUT=$(extract_metric "$CURRENT" '.metrics.http_reqs.values.rate')
    THROUGHPUT_DELTA=$(calc_percentage_change "$BASELINE_THROUGHPUT" "$CURRENT_THROUGHPUT")

    # Display metrics comparison
    echo "Metric Comparison:"
    echo "=================="
    echo ""
    printf "%-20s | %-15s | %-15s | %-10s\n" "Metric" "Baseline" "Current" "Change"
    echo "------------------------------------------------------------------------"
    printf "%-20s | %-15s | %-15s | %+.2f%%\n" "p95 Latency" "${BASELINE_P95}ms" "${CURRENT_P95}ms" "$P95_DELTA"
    printf "%-20s | %-15s | %-15s | %+.2f%%\n" "Error Rate" "${BASELINE_ERR}" "${CURRENT_ERR}" "$ERR_DELTA"
    printf "%-20s | %-15s | %-15s | %+.2f%%\n" "Throughput" "${BASELINE_THROUGHPUT} req/s" "${CURRENT_THROUGHPUT} req/s" "$THROUGHPUT_DELTA"
    echo ""

    # Check for regressions
    REGRESSION_DETECTED=false

    check_threshold "p95 latency" "$BASELINE_P95" "$CURRENT_P95" "$THRESHOLD_P95" "$P95_DELTA" || REGRESSION_DETECTED=true
    check_threshold "error rate" "$BASELINE_ERR" "$CURRENT_ERR" "$THRESHOLD_ERROR_RATE" "$ERR_DELTA" || REGRESSION_DETECTED=true
    check_threshold "throughput" "$BASELINE_THROUGHPUT" "$CURRENT_THROUGHPUT" "$THRESHOLD_THROUGHPUT" "$THROUGHPUT_DELTA" || REGRESSION_DETECTED=true

    echo ""
    echo "=========================================="

    if [ "$REGRESSION_DETECTED" = false ]; then
        log_success "No performance regressions detected"
        echo "=========================================="
        exit 0
    else
        log_error "Performance regressions detected - review required"
        echo "=========================================="
        echo ""
        log_info "Next steps:"
        echo "  1. Review test results: $CURRENT"
        echo "  2. Check MCP Hub logs: tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log"
        echo "  3. Investigate performance bottlenecks"
        echo "  4. Re-run after fixes: ./scripts/performance-regression-check.sh"
        exit 1
    fi
}

# Run main
main
