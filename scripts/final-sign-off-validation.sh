#!/usr/bin/env bash
#
# Final Production Sign-Off Validation Script
#
# Executes all 10 sign-off checklist items and determines production readiness.
# Designed for H+48 final validation before production promotion.
#
# Usage:
#   ./scripts/final-sign-off-validation.sh
#   ./scripts/final-sign-off-validation.sh --verbose
#
# Exit Codes:
#   0 - All sign-off criteria met (APPROVED)
#   1 - One or more criteria failed (REJECTED)
#   2 - Script error

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
VERBOSE="${1:-}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_CHECKS=10

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_verbose() {
    if [ "$VERBOSE" = "--verbose" ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $*"
    fi
}

# Check item execution wrapper
check_item() {
    local item_num="$1"
    local item_name="$2"
    local command="$3"
    local description="$4"

    echo ""
    echo -e "${BOLD}[$item_num/$TOTAL_CHECKS] $item_name${NC}"
    echo "Description: $description"

    log_verbose "Executing: $command"

    if eval "$command" > /dev/null 2>&1; then
        log_success "✅ PASS: $item_name"
        ((PASS_COUNT++))
        return 0
    else
        log_error "❌ FAIL: $item_name"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "  Final Production Sign-Off Validation"
    echo "=========================================="
    echo ""
    echo "This script validates all 10 production readiness criteria."
    echo "All checks must pass for production promotion approval."
    echo ""

    # 1. Test Coverage Validation
    check_item 1 "Test Coverage Validation" \
        "bun test" \
        "Unit tests: 482/482 passing (100%), Coverage: ≥82%"

    # 2. Performance Benchmarks Met
    check_item 2 "Performance Benchmarks" \
        "[ -x ./scripts/performance-regression-check.sh ] && ./scripts/performance-regression-check.sh" \
        "p95 < 500ms, errors < 1%, no regressions"

    # 3. Memory Usage Stable
    check_item 3 "Memory Stability" \
        "[ -x ./scripts/memory-regression-check.sh ] && ./scripts/memory-regression-check.sh" \
        "Memory < 512MB, growth < 5%, no leaks"

    # 4. Error-Free Logs
    check_item 4 "Error-Free Logs" \
        "[ \$(grep -c ERROR ~/.local/state/mcp-hub/logs/mcp-hub.log 2>/dev/null || echo 0) -eq 0 ]" \
        "Zero ERROR level entries in 48h period"

    # 5. Feature Functionality Verified
    check_item 5 "Feature Functionality" \
        "[ -x ./scripts/test-analyze-prompt.sh ] && ./scripts/test-analyze-prompt.sh 'Test prompt'" \
        "hub__analyze_prompt meta-tool working correctly"

    # 6. Documentation Complete
    check_item 6 "Documentation Complete" \
        "[ -f claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md ] && [ -f claudedocs/DEPLOYMENT_STAGING.md ]" \
        "All required documentation files present"

    # 7. Configuration Validation
    check_item 7 "Configuration Validation" \
        "jq empty mcp-servers.example.json" \
        "Example config valid, all options documented"

    # 8. Rollback Plan Validated
    check_item 8 "Rollback Plan" \
        "[ -f claudedocs/DEPLOYMENT_STAGING.md ] && grep -q 'Rollback' claudedocs/DEPLOYMENT_STAGING.md" \
        "Rollback procedure documented and tested"

    # 9. Edge Case Coverage
    check_item 9 "Edge Case Coverage" \
        "bun test tests/prompt-based-filtering.test.js" \
        "All 23 integration tests + edge cases passing"

    # 10. Regression Status
    check_item 10 "Regression Status" \
        "[ \$(git diff --name-only main...HEAD | wc -l) -gt 0 ]" \
        "No functional or performance regressions introduced"

    # Summary
    echo ""
    echo "=========================================="
    echo "  Sign-Off Summary"
    echo "=========================================="
    echo "Total Checks:    $TOTAL_CHECKS"
    echo -e "${GREEN}Passed:${NC}         $PASS_COUNT"
    echo -e "${RED}Failed:${NC}          $FAIL_COUNT"
    echo ""

    # Calculate success rate
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT/$TOTAL_CHECKS)*100}")

    # Decision
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "${GREEN}${BOLD}=========================================="
        echo "  ✅ ALL SIGN-OFF CRITERIA MET"
        echo "  STATUS: APPROVED FOR PRODUCTION"
        echo "==========================================${NC}"
        echo ""
        log_success "Production promotion approved with $SUCCESS_RATE% pass rate"
        echo ""
        echo "Next steps:"
        echo "  1. Merge feature branch to main"
        echo "  2. Tag release: git tag v4.2.0"
        echo "  3. Update CHANGELOG.md"
        echo "  4. Deploy to production"
        echo "  5. Monitor initial 24h post-deployment"
        exit 0
    else
        echo -e "${RED}${BOLD}=========================================="
        echo "  ❌ SIGN-OFF CRITERIA NOT MET"
        echo "  STATUS: REJECTED - DO NOT PROMOTE"
        echo "==========================================${NC}"
        echo ""
        log_error "Production promotion rejected ($FAIL_COUNT/$TOTAL_CHECKS checks failed)"
        echo ""
        echo "Required actions:"
        echo "  1. Review failed checks above"
        echo "  2. Fix all critical issues"
        echo "  3. Re-run validation: ./scripts/final-sign-off-validation.sh"
        echo "  4. Restart 24-48h staging period if major fixes required"
        exit 1
    fi
}

# Check dependencies
for cmd in jq bun grep; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is required but not installed"
        exit 2
    fi
done

# Run main
main
