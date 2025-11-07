#!/usr/bin/env bash
#
# Test Script for hub__analyze_prompt Feature
#
# Usage:
#   ./scripts/test-analyze-prompt.sh [prompt]
#
# Examples:
#   ./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
#   ./scripts/test-analyze-prompt.sh "Read config.json and commit it"
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HUB_URL="${HUB_URL:-http://localhost:7000}"
SESSION_ID="test-$(date +%s)"
PROMPT="${1:-Check my GitHub notifications}"

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

check_hub_running() {
    log_info "Checking if MCP Hub is running..."
    if ! curl -sf "${HUB_URL}/health" > /dev/null 2>&1; then
        log_error "MCP Hub is not running at ${HUB_URL}"
        log_info "Start it with: bun start"
        exit 1
    fi
    log_success "MCP Hub is running"
}

check_configuration() {
    log_info "Checking configuration..."

    # Check if prompt-based filtering is enabled
    if [ ! -f "mcp-servers.json" ]; then
        log_error "mcp-servers.json not found"
        exit 1
    fi

    # Verify prompt-based mode
    MODE=$(jq -r '.toolFiltering.mode // "not-set"' mcp-servers.json)
    if [ "$MODE" != "prompt-based" ]; then
        log_warning "Filtering mode is '${MODE}', expected 'prompt-based'"
        log_info "Edit mcp-servers.json to enable prompt-based filtering"
    else
        log_success "Prompt-based filtering enabled"
    fi

    # Verify LLM provider
    LLM_ENABLED=$(jq -r '.toolFiltering.llmCategorization.enabled // false' mcp-servers.json)
    if [ "$LLM_ENABLED" != "true" ]; then
        log_error "LLM categorization not enabled"
        exit 1
    fi

    PROVIDER=$(jq -r '.toolFiltering.llmCategorization.provider // "none"' mcp-servers.json)
    log_success "LLM provider: ${PROVIDER}"
}

establish_connection() {
    log_info "Establishing MCP connection..."

    # Start SSE connection in background
    curl -N "${HUB_URL}/mcp" > /tmp/mcp-sse-${SESSION_ID}.log 2>&1 &
    SSE_PID=$!

    # Wait for connection
    sleep 2

    if ! kill -0 $SSE_PID 2>/dev/null; then
        log_error "Failed to establish SSE connection"
        exit 1
    fi

    log_success "SSE connection established (PID: ${SSE_PID})"
    echo $SSE_PID
}

list_initial_tools() {
    log_info "Listing initial tools..."

    RESPONSE=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
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
        echo "$RESPONSE" | jq '.'
        return 1
    fi

    # Extract tool names
    TOOLS=$(echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "")
    TOOL_COUNT=$(echo "$TOOLS" | grep -c . || echo "0")

    log_success "Initial tool count: ${TOOL_COUNT}"

    # Check for meta-tool
    if echo "$TOOLS" | grep -q "hub__analyze_prompt"; then
        log_success "✓ hub__analyze_prompt is available"
    else
        log_error "✗ hub__analyze_prompt NOT found in tool list"
        log_info "Available tools:"
        echo "$TOOLS" | sed 's/^/  - /'
        return 1
    fi

    echo "$TOOL_COUNT"
}

call_analyze_prompt() {
    log_info "Calling hub__analyze_prompt with prompt:"
    log_info "  \"${PROMPT}\""

    START_TIME=$(date +%s%3N)

    RESPONSE=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
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
        echo "$RESPONSE" | jq '.'
        return 1
    fi

    # Parse result
    RESULT=$(echo "$RESPONSE" | jq -r '.result.content[0].text' 2>/dev/null || echo "")

    if [ -z "$RESULT" ]; then
        log_error "Empty result from meta-tool"
        echo "$RESPONSE" | jq '.'
        return 1
    fi

    log_success "Analysis completed in ${DURATION}ms"

    # Parse analysis JSON
    CATEGORIES=$(echo "$RESULT" | jq -r '.categories[]' 2>/dev/null || echo "")
    CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence' 2>/dev/null || echo "0")
    REASONING=$(echo "$RESULT" | jq -r '.reasoning' 2>/dev/null || echo "")

    log_info "Analysis Results:"
    echo -e "${BLUE}  Categories:${NC} $(echo "$CATEGORIES" | tr '\n' ', ' | sed 's/,$//')"
    echo -e "${BLUE}  Confidence:${NC} ${CONFIDENCE}"
    echo -e "${BLUE}  Reasoning:${NC} ${REASONING}"

    echo "$CATEGORIES"
}

verify_tool_exposure() {
    local EXPECTED_CATEGORIES="$1"

    log_info "Verifying tool exposure..."

    # Wait for notification processing
    sleep 1

    # List tools again
    RESPONSE=$(curl -s -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/list"
        }')

    TOOLS=$(echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "")
    NEW_TOOL_COUNT=$(echo "$TOOLS" | grep -c . || echo "0")

    log_success "Updated tool count: ${NEW_TOOL_COUNT}"

    # Verify expected categories are exposed
    local ALL_FOUND=true
    for CATEGORY in $EXPECTED_CATEGORIES; do
        if echo "$TOOLS" | grep -q "^${CATEGORY}__"; then
            log_success "✓ ${CATEGORY} tools exposed"
        else
            log_error "✗ ${CATEGORY} tools NOT found"
            ALL_FOUND=false
        fi
    done

    # Verify meta-tools still available
    if echo "$TOOLS" | grep -q "hub__analyze_prompt"; then
        log_success "✓ Meta-tools still available"
    else
        log_warning "✗ Meta-tools removed (unexpected)"
    fi

    if [ "$ALL_FOUND" = true ]; then
        return 0
    else
        log_info "Available tools:"
        echo "$TOOLS" | sed 's/^/  - /'
        return 1
    fi
}

cleanup() {
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
    echo "=========================================="
    echo "  hub__analyze_prompt Test Script"
    echo "=========================================="
    echo ""

    # Register cleanup handler
    trap cleanup EXIT

    # Pre-flight checks
    check_hub_running
    check_configuration
    echo ""

    # Test workflow
    log_info "Starting test workflow..."
    echo ""

    # Step 1: Establish connection
    SSE_PID=$(establish_connection)
    echo ""

    # Step 2: List initial tools
    INITIAL_COUNT=$(list_initial_tools)
    echo ""

    # Step 3: Call analyze_prompt
    CATEGORIES=$(call_analyze_prompt)
    echo ""

    # Step 4: Verify tool exposure
    if verify_tool_exposure "$CATEGORIES"; then
        echo ""
        echo "=========================================="
        log_success "ALL TESTS PASSED"
        echo "=========================================="
        exit 0
    else
        echo ""
        echo "=========================================="
        log_error "SOME TESTS FAILED"
        echo "=========================================="
        log_info "Check logs: tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log"
        exit 1
    fi
}

# Check dependencies
for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is required but not installed"
        exit 1
    fi
done

# Run main
main
