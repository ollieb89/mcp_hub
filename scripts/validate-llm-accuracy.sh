#!/usr/bin/env bash
#
# LLM Accuracy Validation Script
# Tests category identification accuracy with known test cases
#
# Usage: ./scripts/validate-llm-accuracy.sh [--verbose]

set -euo pipefail

# Configuration
HUB_URL="${HUB_URL:-http://localhost:7000}"
SESSION_ID="validation-$(date +%s)"
VERBOSE=false

# Parse arguments
if [ "${1:-}" = "--verbose" ]; then
    VERBOSE=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Helper function to test a prompt
test_prompt() {
    local test_id="$1"
    local prompt="$2"
    local expected="$3"
    local min_confidence="$4"
    local priority="$5"

    echo -e "${BLUE}[$test_id]${NC} Testing: \"$prompt\""

    # Call analyze_prompt
    RESPONSE=$(curl -sf -X POST "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 1,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"hub__analyze_prompt\",
                \"arguments\": {\"prompt\": $(echo "$prompt" | jq -Rs .)}
            }
        }" 2>/dev/null || echo "{\"error\":\"API call failed\"}")

    # Check for API errors
    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR=$(echo "$RESPONSE" | jq -r '.error.message // .error')
        echo -e "  ${RED}✗ API Error: $ERROR${NC}"
        FAILED=$((FAILED+1))
        echo ""
        return 1
    fi

    # Extract result
    RESULT=$(echo "$RESPONSE" | jq -r '.result.content[0].text' 2>/dev/null || echo "{}")

    if [ "$RESULT" = "{}" ] || [ -z "$RESULT" ]; then
        echo -e "  ${RED}✗ Empty response${NC}"
        FAILED=$((FAILED+1))
        echo ""
        return 1
    fi

    CATEGORIES=$(echo "$RESULT" | jq -r '.categories[]' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence' 2>/dev/null || echo "0")
    REASONING=$(echo "$RESULT" | jq -r '.reasoning' 2>/dev/null || echo "")

    if [ "$VERBOSE" = true ]; then
        echo "  Categories: [$CATEGORIES]"
        echo "  Confidence: $CONFIDENCE"
        echo "  Reasoning: $REASONING"
    fi

    # Validate expected categories present
    local all_found=true
    for cat in $(echo "$expected" | tr ',' ' '); do
        if echo "$CATEGORIES" | grep -q "$cat"; then
            if [ "$VERBOSE" = true ]; then
                echo -e "  ${GREEN}✓${NC} Category '$cat' found"
            fi
        else
            echo -e "  ${RED}✗ Category '$cat' MISSING${NC}"
            all_found=false
        fi
    done

    # Validate confidence threshold
    local confidence_ok=false
    if [ "$CONFIDENCE" != "0" ] && [ "$CONFIDENCE" != "null" ]; then
        if awk "BEGIN {exit !($CONFIDENCE >= $min_confidence)}"; then
            confidence_ok=true
            if [ "$VERBOSE" = true ]; then
                echo -e "  ${GREEN}✓${NC} Confidence meets threshold ($CONFIDENCE >= $min_confidence)"
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} Confidence below threshold ($CONFIDENCE < $min_confidence)"
        fi
    else
        echo -e "  ${RED}✗ Invalid confidence value${NC}"
    fi

    # Overall result
    if [ "$all_found" = true ] && [ "$confidence_ok" = true ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (Priority: $priority)"
        PASSED=$((PASSED+1))
        echo ""
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} (Priority: $priority)"
        FAILED=$((FAILED+1))
        echo ""
        return 1
    fi
}

# Main test suite
echo "=========================================="
echo "  LLM Accuracy Validation"
echo "=========================================="
echo ""

# Check if Hub is running
if ! curl -sf "${HUB_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: MCP Hub not running at ${HUB_URL}${NC}"
    echo "Start with: bun start"
    exit 1
fi

echo "Running test cases..."
echo ""

# High Priority Tests
test_prompt "T1" "Check my GitHub notifications" "github" "0.9" "High"
test_prompt "T2" "List files in current directory" "filesystem" "0.9" "High"
test_prompt "T3" "Read config.json and commit it" "filesystem" "0.85" "High"

# Medium Priority Tests
test_prompt "T4" "Deploy Docker container to AWS" "docker" "0.85" "Medium"
test_prompt "T5" "Search for Python files and run tests" "filesystem" "0.85" "Medium"
test_prompt "T6" "What can you do?" "meta" "0.95" "Medium"

# Edge Cases (optional, may have lower confidence)
if [ "$VERBOSE" = true ]; then
    echo "Edge Case Tests:"
    echo ""
    test_prompt "T7" "" "meta" "0.3" "Edge" || true
    test_prompt "T8" "Test with 'quotes' and \$variables" "any" "0.5" "Edge" || true
fi

# Summary
TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")

echo "=========================================="
echo "  Validation Summary"
echo "=========================================="
echo "Total Tests:   $TOTAL"
echo -e "${GREEN}Passed:${NC}        $PASSED"
echo -e "${RED}Failed:${NC}         $FAILED"
echo "Success Rate:  ${SUCCESS_RATE}%"
echo ""

# Final assessment
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
elif awk "BEGIN {exit !($SUCCESS_RATE >= 90)}"; then
    echo -e "${YELLOW}⚠ MOSTLY PASSING${NC} (>= 90%)"
    exit 0
else
    echo -e "${RED}✗ VALIDATION FAILED${NC} (< 90%)"
    exit 1
fi
