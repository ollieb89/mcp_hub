#!/usr/bin/env bash
#
# Staging Smoke Tests for Analyze Prompt Feature
#
# Quick validation suite to verify staging deployment health
# Exit codes: 0 = success, 1 = failure
#
# Usage:
#   ./scripts/staging-smoke-tests.sh
#   ./scripts/staging-smoke-tests.sh --verbose

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HUB_URL="${HUB_URL:-http://localhost:7000}"
CONFIG_FILE="${CONFIG_FILE:-mcp-servers.json}"
VERBOSE="${1:-}"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=10

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_pass() {
    ((TESTS_PASSED++))
    log_info "✓ $1"
}

test_fail() {
    ((TESTS_FAILED++))
    log_error "✗ $1"
    if [ "$VERBOSE" = "--verbose" ]; then
        echo "  Details: $2"
    fi
}

# Test 1: Hub Health Check
test_hub_health() {
    echo ""
    echo "Test 1/10: Hub Health Check"

    if curl -sf "${HUB_URL}/health" > /dev/null 2>&1; then
        test_pass "Hub is responding at ${HUB_URL}"
    else
        test_fail "Hub health check failed" "Hub not responding at ${HUB_URL}"
        return 1
    fi
}

# Test 2: Configuration File Exists
test_config_exists() {
    echo ""
    echo "Test 2/10: Configuration File Exists"

    if [ -f "${CONFIG_FILE}" ]; then
        test_pass "Configuration file exists: ${CONFIG_FILE}"
    else
        test_fail "Configuration file not found" "${CONFIG_FILE} does not exist"
        return 1
    fi
}

# Test 3: Prompt-Based Mode Enabled
test_prompt_mode_enabled() {
    echo ""
    echo "Test 3/10: Prompt-Based Mode Enabled"

    MODE=$(jq -r '.toolFiltering.mode' "${CONFIG_FILE}" 2>/dev/null || echo "")

    if [ "$MODE" = "prompt-based" ]; then
        test_pass "Prompt-based mode enabled"
    else
        test_fail "Prompt-based mode not enabled" "Mode is: ${MODE:-undefined}"
        return 1
    fi
}

# Test 4: LLM Provider Configured
test_llm_provider() {
    echo ""
    echo "Test 4/10: LLM Provider Configured"

    ENABLED=$(jq -r '.toolFiltering.llmCategorization.enabled' "${CONFIG_FILE}" 2>/dev/null || echo "false")
    PROVIDER=$(jq -r '.toolFiltering.llmCategorization.provider' "${CONFIG_FILE}" 2>/dev/null || echo "")

    if [ "$ENABLED" = "true" ] && [ -n "$PROVIDER" ]; then
        test_pass "LLM provider configured: ${PROVIDER}"
    else
        test_fail "LLM provider not configured" "Enabled: ${ENABLED}, Provider: ${PROVIDER:-undefined}"
        return 1
    fi
}

# Test 5: API Key Set
test_api_key() {
    echo ""
    echo "Test 5/10: API Key Environment Variable"

    PROVIDER=$(jq -r '.toolFiltering.llmCategorization.provider' "${CONFIG_FILE}" 2>/dev/null || echo "")

    case "$PROVIDER" in
        "gemini")
            if [ -n "${GEMINI_API_KEY:-}" ]; then
                test_pass "GEMINI_API_KEY is set"
            else
                test_fail "GEMINI_API_KEY not set" "Required for Gemini provider"
                return 1
            fi
            ;;
        "openai")
            if [ -n "${OPENAI_API_KEY:-}" ]; then
                test_pass "OPENAI_API_KEY is set"
            else
                test_fail "OPENAI_API_KEY not set" "Required for OpenAI provider"
                return 1
            fi
            ;;
        "anthropic")
            if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
                test_pass "ANTHROPIC_API_KEY is set"
            else
                test_fail "ANTHROPIC_API_KEY not set" "Required for Anthropic provider"
                return 1
            fi
            ;;
        *)
            test_fail "Unknown provider" "Provider: ${PROVIDER:-undefined}"
            return 1
            ;;
    esac
}

# Test 6: Session Isolation Enabled
test_session_isolation() {
    echo ""
    echo "Test 6/10: Session Isolation Configuration"

    ISOLATION=$(jq -r '.toolFiltering.promptBasedFiltering.sessionIsolation' "${CONFIG_FILE}" 2>/dev/null || echo "false")

    if [ "$ISOLATION" = "true" ]; then
        test_pass "Session isolation enabled"
    else
        log_warning "Session isolation disabled (acceptable but not recommended)"
        test_pass "Session isolation configuration checked"
    fi
}

# Test 7: Default Exposure Configuration
test_default_exposure() {
    echo ""
    echo "Test 7/10: Default Exposure Configuration"

    EXPOSURE=$(jq -r '.toolFiltering.promptBasedFiltering.defaultExposure' "${CONFIG_FILE}" 2>/dev/null || echo "")

    case "$EXPOSURE" in
        "zero"|"meta-only"|"minimal"|"all")
            test_pass "Valid default exposure: ${EXPOSURE}"
            ;;
        *)
            test_fail "Invalid default exposure" "Exposure: ${EXPOSURE:-undefined}"
            return 1
            ;;
    esac
}

# Test 8: Validation Script Exists
test_validation_script() {
    echo ""
    echo "Test 8/10: Validation Script Exists"

    if [ -f "./scripts/test-analyze-prompt.sh" ]; then
        test_pass "Validation script exists"
    else
        test_fail "Validation script not found" "./scripts/test-analyze-prompt.sh does not exist"
        return 1
    fi
}

# Test 9: Test Suite Available
test_suite_available() {
    echo ""
    echo "Test 9/10: Test Suite Available"

    if [ -f "./tests/prompt-based-filtering.test.js" ]; then
        test_pass "Test suite available"
    else
        test_fail "Test suite not found" "./tests/prompt-based-filtering.test.js does not exist"
        return 1
    fi
}

# Test 10: Log Directory Writable
test_log_directory() {
    echo ""
    echo "Test 10/10: Log Directory Writable"

    LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mcp-hub/logs"

    if [ -d "$LOG_DIR" ] && [ -w "$LOG_DIR" ]; then
        test_pass "Log directory writable: ${LOG_DIR}"
    elif mkdir -p "$LOG_DIR" 2>/dev/null; then
        test_pass "Log directory created: ${LOG_DIR}"
    else
        test_fail "Log directory not writable" "${LOG_DIR}"
        return 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "  Staging Smoke Tests - Analyze Prompt"
    echo "========================================="
    echo ""
    echo "Hub URL: ${HUB_URL}"
    echo "Config: ${CONFIG_FILE}"
    echo ""

    # Run all tests (continue on failure to get complete picture)
    test_hub_health || true
    test_config_exists || true
    test_prompt_mode_enabled || true
    test_llm_provider || true
    test_api_key || true
    test_session_isolation || true
    test_default_exposure || true
    test_validation_script || true
    test_suite_available || true
    test_log_directory || true

    # Summary
    echo ""
    echo "========================================="
    echo "  Test Summary"
    echo "========================================="
    echo "Total Tests: ${TOTAL_TESTS}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All smoke tests passed!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Run integration tests: bun test tests/prompt-based-filtering.test.js"
        echo "  2. Run validation script: ./scripts/test-analyze-prompt.sh \"Test prompt\""
        echo "  3. Run load tests: bun run test:load"
        echo "  4. Monitor logs: tail -f ${XDG_STATE_HOME:-$HOME/.local/state}/mcp-hub/logs/mcp-hub.log"
        return 0
    else
        echo -e "${RED}✗ ${TESTS_FAILED} test(s) failed${NC}"
        echo ""
        echo "See staging deployment guide for troubleshooting:"
        echo "  claudedocs/STAGING_DEPLOYMENT_GUIDE.md"
        return 1
    fi
}

# Run main
main
