#!/usr/bin/env bash
#
# Automated Validation Script for hub__analyze_prompt Feature
#
# This script performs comprehensive end-to-end testing of the analyze_prompt
# workflow with support for manual testing and CI/CD integration.
#
# Usage:
#   ./scripts/test-analyze-prompt.sh [options] [prompt]
#
# Options:
#   --ci              Run in CI mode (non-interactive, JSON output)
#   --verbose         Enable verbose output
#   --no-cleanup      Skip cleanup on exit
#   --timeout <secs>  Set timeout for operations (default: 30)
#   --help            Show this help message
#
# Examples:
#   ./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
#   ./scripts/test-analyze-prompt.sh --verbose "Read config.json and commit it"
#   ./scripts/test-analyze-prompt.sh --ci "Create a new file"
#
# Exit Codes:
#   0 - All tests passed
#   1 - Hub not running or configuration error
#   2 - Test execution failed
#   3 - Validation failed
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
HUB_URL="${HUB_URL:-http://localhost:7000}"
SESSION_ID="test-$(date +%s)"
CI_MODE=false
VERBOSE=false
NO_CLEANUP=false
TIMEOUT=30
PROMPT=""

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --ci)
                CI_MODE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --no-cleanup)
                NO_CLEANUP=true
                shift
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --help)
                grep '^#' "$0" | sed 's/^# \?//'
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                exit 1
                ;;
            *)
                PROMPT="$1"
                shift
                ;;
        esac
    done

    # Set default prompt if not provided
    PROMPT="${PROMPT:-Check my GitHub notifications}"
}

# CI mode output helpers
ci_output() {
    if [ "$CI_MODE" = true ]; then
        echo "$@"
    fi
}

# Test results tracking
declare -a TEST_RESULTS
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

record_test() {
    local test_name="$1"
    local result="$2"
    local details="${3:-}"

    TEST_COUNT=$((TEST_COUNT + 1))

    if [ "$result" = "PASS" ]; then
        PASSED_COUNT=$((PASSED_COUNT + 1))
        TEST_RESULTS+=("✓ $test_name")
    else
        FAILED_COUNT=$((FAILED_COUNT + 1))
        TEST_RESULTS+=("✗ $test_name: $details")
    fi

    if [ "$CI_MODE" = true ]; then
        ci_output "{\"test\": \"$test_name\", \"result\": \"$result\", \"details\": \"$details\"}"
    fi
}

# Helper functions
log_info() {
    if [ "$CI_MODE" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $*"
    fi
}

log_success() {
    if [ "$CI_MODE" = false ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $*"
    fi
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_warning() {
    if [ "$CI_MODE" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $*"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$CI_MODE" = false ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $*"
    fi
}

check_hub_running() {
    log_info "Checking if MCP Hub is running..."
    log_verbose "Connecting to ${HUB_URL}/health"

    if timeout "$TIMEOUT" curl -sf "${HUB_URL}/health" > /dev/null 2>&1; then
        log_success "MCP Hub is running"
        record_test "Hub Health Check" "PASS"
        return 0
    else
        log_error "MCP Hub is not running at ${HUB_URL}"
        log_info "Start it with: bun start"
        record_test "Hub Health Check" "FAIL" "Hub not responding"
        exit 1
    fi
}

check_configuration() {
    log_info "Checking configuration..."

    # Check if prompt-based filtering is enabled
    if [ ! -f "mcp-servers.json" ]; then
        log_error "mcp-servers.json not found"
        record_test "Configuration File Check" "FAIL" "mcp-servers.json not found"
        exit 1
    fi

    log_verbose "Reading mcp-servers.json"
    record_test "Configuration File Check" "PASS"

    # Verify prompt-based mode
    MODE=$(jq -r '.toolFiltering.mode // "not-set"' mcp-servers.json)
    log_verbose "Filtering mode: ${MODE}"

    if [ "$MODE" != "prompt-based" ]; then
        log_warning "Filtering mode is '${MODE}', expected 'prompt-based'"
        log_info "Edit mcp-servers.json to enable prompt-based filtering"
        record_test "Prompt-Based Mode Check" "FAIL" "Mode is '${MODE}', not 'prompt-based'"
    else
        log_success "Prompt-based filtering enabled"
        record_test "Prompt-Based Mode Check" "PASS"
    fi

    # Verify LLM provider
    LLM_ENABLED=$(jq -r '.toolFiltering.llmCategorization.enabled // false' mcp-servers.json)
    if [ "$LLM_ENABLED" != "true" ]; then
        log_error "LLM categorization not enabled"
        record_test "LLM Provider Check" "FAIL" "LLM categorization disabled"
        exit 1
    fi

    PROVIDER=$(jq -r '.toolFiltering.llmCategorization.provider // "none"' mcp-servers.json)
    log_success "LLM provider: ${PROVIDER}"
    log_verbose "Provider: ${PROVIDER}"
    record_test "LLM Provider Check" "PASS"
}

establish_connection() {
    log_info "Establishing MCP connection..."
    log_verbose "Starting SSE connection to ${HUB_URL}/mcp"

    # Start SSE connection in background
    curl -N "${HUB_URL}/mcp" > /tmp/mcp-sse-${SESSION_ID}.log 2>&1 &
    SSE_PID=$!

    # Wait for connection
    sleep 2

    if ! kill -0 $SSE_PID 2>/dev/null; then
        log_error "Failed to establish SSE connection"
        record_test "SSE Connection" "FAIL" "Connection process died"
        exit 1
    fi

    log_success "SSE connection established (PID: ${SSE_PID})"
    log_verbose "SSE process running with PID: ${SSE_PID}"
    record_test "SSE Connection" "PASS"
    echo $SSE_PID
}

list_initial_tools() {
    log_info "Listing initial tools..."
    log_verbose "Sending tools/list request (session: ${SESSION_ID})"

    RESPONSE=$(timeout "$TIMEOUT" curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        }')

    # Check for errors
    ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
    if [ -n "$ERROR" ]; then
        log_error "Failed to list tools: $ERROR"
        log_verbose "$RESPONSE" | jq '.'
        record_test "Initial Tools List" "FAIL" "API error: $ERROR"
        return 1
    fi

    # Extract tool names
    TOOLS=$(echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "")
    TOOL_COUNT=$(echo "$TOOLS" | grep -c . || echo "0")

    log_success "Initial tool count: ${TOOL_COUNT}"
    log_verbose "Tools: $(echo "$TOOLS" | tr '\n' ', ' | sed 's/,$//')"
    record_test "Initial Tools List" "PASS"

    # Check for meta-tool
    if echo "$TOOLS" | grep -q "hub__analyze_prompt"; then
        log_success "✓ hub__analyze_prompt is available"
        record_test "Meta-Tool Registration" "PASS"
    else
        log_error "✗ hub__analyze_prompt NOT found in tool list"
        log_info "Available tools:"
        echo "$TOOLS" | sed 's/^/  - /'
        record_test "Meta-Tool Registration" "FAIL" "hub__analyze_prompt not found"
        return 1
    fi

    echo "$TOOL_COUNT"
}

call_analyze_prompt() {
    log_info "Calling hub__analyze_prompt with prompt:"
    log_info "  \"${PROMPT}\""
    log_verbose "Making MCP tool call (session: ${SESSION_ID})"

    START_TIME=$(date +%s%3N)

    RESPONSE=$(timeout "$TIMEOUT" curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 2,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"hub__analyze_prompt\",
                \"arguments\": {
                    \"prompt\": \"${PROMPT}\"
                }
            }
        }")

    END_TIME=$(date +%s%3N)
    DURATION=$((END_TIME - START_TIME))

    # Check for errors
    ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
    if [ -n "$ERROR" ]; then
        log_error "Meta-tool call failed: $ERROR"
        log_verbose "$RESPONSE" | jq '.'
        record_test "Analyze Prompt Call" "FAIL" "API error: $ERROR"
        return 1
    fi

    # Parse result
    RESULT=$(echo "$RESPONSE" | jq -r '.result.content[0].text' 2>/dev/null || echo "")

    if [ -z "$RESULT" ]; then
        log_error "Empty result from meta-tool"
        log_verbose "$RESPONSE" | jq '.'
        record_test "Analyze Prompt Call" "FAIL" "Empty response"
        return 1
    fi

    log_success "Analysis completed in ${DURATION}ms"
    log_verbose "Response time: ${DURATION}ms"
    record_test "Analyze Prompt Call" "PASS"

    # Parse analysis JSON
    CATEGORIES=$(echo "$RESULT" | jq -r '.categories[]' 2>/dev/null || echo "")
    CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence' 2>/dev/null || echo "0")
    REASONING=$(echo "$RESULT" | jq -r '.reasoning' 2>/dev/null || echo "")

    log_info "Analysis Results:"
    echo -e "${BLUE}  Categories:${NC} $(echo "$CATEGORIES" | tr '\n' ', ' | sed 's/,$//')"
    echo -e "${BLUE}  Confidence:${NC} ${CONFIDENCE}"
    echo -e "${BLUE}  Reasoning:${NC} ${REASONING}"

    # Validate result format
    if [ -n "$CATEGORIES" ] && [ "$(echo "$CONFIDENCE" | grep -E '^[0-9]+(\.[0-9]+)?$')" ]; then
        record_test "Result Format Validation" "PASS"
    else
        record_test "Result Format Validation" "FAIL" "Invalid categories or confidence"
    fi

    echo "$CATEGORIES"
}

verify_tool_exposure() {
    local EXPECTED_CATEGORIES="$1"

    log_info "Verifying tool exposure..."
    log_verbose "Waiting for notification processing (1s)"

    # Wait for notification processing
    sleep 1

    # List tools again
    RESPONSE=$(timeout "$TIMEOUT" curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/list"
        }')

    TOOLS=$(echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "")
    NEW_TOOL_COUNT=$(echo "$TOOLS" | grep -c . || echo "0")

    log_success "Updated tool count: ${NEW_TOOL_COUNT}"
    log_verbose "Tools after exposure: $(echo "$TOOLS" | wc -l)"
    record_test "Tools List After Analysis" "PASS"

    # Verify expected categories are exposed
    local ALL_FOUND=true
    local FOUND_COUNT=0
    local EXPECTED_COUNT=$(echo "$EXPECTED_CATEGORIES" | wc -w)

    for CATEGORY in $EXPECTED_CATEGORIES; do
        if echo "$TOOLS" | grep -q "^${CATEGORY}__"; then
            log_success "✓ ${CATEGORY} tools exposed"
            FOUND_COUNT=$((FOUND_COUNT + 1))
        else
            log_error "✗ ${CATEGORY} tools NOT found"
            ALL_FOUND=false
        fi
    done

    # Verify meta-tools still available
    if echo "$TOOLS" | grep -q "hub__analyze_prompt"; then
        log_success "✓ Meta-tools still available"
        record_test "Meta-Tools Persistence" "PASS"
    else
        log_warning "✗ Meta-tools removed (unexpected)"
        record_test "Meta-Tools Persistence" "FAIL" "Meta-tools not found after exposure"
    fi

    # Record category exposure test
    if [ "$ALL_FOUND" = true ]; then
        record_test "Category Tool Exposure" "PASS" "${FOUND_COUNT}/${EXPECTED_COUNT} categories exposed"
        return 0
    else
        record_test "Category Tool Exposure" "FAIL" "Only ${FOUND_COUNT}/${EXPECTED_COUNT} categories found"
        log_info "Available tools:"
        echo "$TOOLS" | sed 's/^/  - /'
        return 1
    fi
}

print_summary() {
    if [ "$CI_MODE" = true ]; then
        # CI mode: JSON output
        cat <<EOF
{
  "total": $TEST_COUNT,
  "passed": $PASSED_COUNT,
  "failed": $FAILED_COUNT,
  "success_rate": $(awk "BEGIN {printf \"%.2f\", ($PASSED_COUNT/$TEST_COUNT)*100}"),
  "exit_code": $((FAILED_COUNT > 0 ? 3 : 0))
}
EOF
    else
        # Interactive mode: Human-readable summary
        echo ""
        echo "=========================================="
        echo "  Test Summary"
        echo "=========================================="
        echo -e "Total Tests:   ${TEST_COUNT}"
        echo -e "${GREEN}Passed:${NC}       ${PASSED_COUNT}"
        echo -e "${RED}Failed:${NC}        ${FAILED_COUNT}"
        echo -e "Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED_COUNT/$TEST_COUNT)*100}")%"
        echo ""

        if [ ${#TEST_RESULTS[@]} -gt 0 ]; then
            echo "Test Results:"
            for result in "${TEST_RESULTS[@]}"; do
                echo "  $result"
            done
        fi

        echo "=========================================="
    fi
}

cleanup() {
    if [ "$NO_CLEANUP" = true ]; then
        log_info "Skipping cleanup (--no-cleanup flag)"
        return
    fi

    log_info "Cleaning up..."

    # Kill SSE connection
    if [ -n "${SSE_PID:-}" ] && kill -0 $SSE_PID 2>/dev/null; then
        kill $SSE_PID 2>/dev/null || true
        log_success "Closed SSE connection"
    fi

    # Remove temp log
    rm -f /tmp/mcp-sse-${SESSION_ID}.log
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"

    if [ "$CI_MODE" = false ]; then
        echo "=========================================="
        echo "  hub__analyze_prompt Test Script"
        echo "=========================================="
        echo ""
    fi

    # Register cleanup handler
    trap cleanup EXIT

    # Pre-flight checks
    check_hub_running
    check_configuration

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Test workflow
    log_info "Starting test workflow..."

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Step 1: Establish connection
    SSE_PID=$(establish_connection)

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Step 2: List initial tools
    INITIAL_COUNT=$(list_initial_tools)

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Step 3: Call analyze_prompt
    CATEGORIES=$(call_analyze_prompt)

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Step 4: Verify tool exposure
    verify_tool_exposure "$CATEGORIES"

    if [ "$CI_MODE" = false ]; then
        echo ""
    fi

    # Print summary
    print_summary

    # Exit with appropriate code
    if [ $FAILED_COUNT -gt 0 ]; then
        if [ "$CI_MODE" = false ]; then
            echo ""
            echo "=========================================="
            log_error "SOME TESTS FAILED (${FAILED_COUNT}/${TEST_COUNT})"
            echo "=========================================="
            log_info "Check logs: tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log"
        fi
        exit 3
    else
        if [ "$CI_MODE" = false ]; then
            echo ""
            echo "=========================================="
            log_success "ALL TESTS PASSED (${TEST_COUNT}/${TEST_COUNT})"
            echo "=========================================="
        fi
        exit 0
    fi
}

# Check dependencies
for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is required but not installed"
        exit 1
    fi
done

# Run main with all arguments
main "$@"
