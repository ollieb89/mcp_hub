#!/usr/bin/env bash
#
# Test hub__analyze_prompt Performance
#
# Usage:
#   ./scripts/test-analyze-prompt-performance.sh [OPTIONS]
#
# Options:
#   --iterations N       Number of test iterations (default: 10)
#   --port PORT         MCP Hub port (default: 7000)
#   --output FILE       Output file for metrics (default: llm-performance.jsonl)
#   --prompts FILE      File containing test prompts (default: use built-in prompts)
#

set -euo pipefail

# Configuration
ITERATIONS=${ITERATIONS:-10}
PORT=${PORT:-7000}
OUTPUT_FILE=${OUTPUT_FILE:-llm-performance.jsonl}
PROMPTS_FILE=${PROMPTS_FILE:-}

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Performance thresholds (from STAGING_DEPLOYMENT_GUIDE.md)
LLM_ANALYSIS_TARGET=1500  # ms
LLM_ANALYSIS_ACCEPTABLE=2000  # ms
TOOL_EXPOSURE_TARGET=300  # ms
TOOL_EXPOSURE_ACCEPTABLE=500  # ms
END_TO_END_TARGET=2500  # ms
END_TO_END_ACCEPTABLE=3000  # ms

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --iterations)
      ITERATIONS="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --prompts)
      PROMPTS_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Built-in test prompts
declare -a TEST_PROMPTS=(
  "Check my GitHub notifications"
  "List files in /tmp/mcp-staging"
  "Search for Python files in this directory"
  "Read the package.json file"
  "What tools are available for filesystem operations?"
  "Help me debug a git issue"
  "Show me Docker containers"
  "List all available MCP servers"
  "Write a test file to /tmp/mcp-staging"
  "Create a new directory for testing"
)

# Load prompts from file if provided
if [[ -n "$PROMPTS_FILE" && -f "$PROMPTS_FILE" ]]; then
  echo -e "${GREEN}Loading prompts from $PROMPTS_FILE${NC}"
  mapfile -t TEST_PROMPTS < "$PROMPTS_FILE"
fi

echo -e "${GREEN}Testing hub__analyze_prompt performance${NC}"
echo -e "${GREEN}Iterations: $ITERATIONS${NC}"
echo -e "${GREEN}Output file: $OUTPUT_FILE${NC}"
echo ""

# Function to call hub__analyze_prompt and measure performance
test_analyze_prompt() {
  local prompt="$1"
  local iteration=$2
  local timestamp=$(date -Iseconds)
  local start_time=$(date +%s%3N)

  # Create MCP request
  local request=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": $iteration,
  "method": "tools/call",
  "params": {
    "name": "hub__analyze_prompt",
    "arguments": {
      "prompt": "$prompt"
    }
  }
}
EOF
)

  # Call the tool
  local response=$(curl -s -X POST "http://localhost:$PORT/mcp" \
    -H "Content-Type: application/json" \
    -d "$request" 2>/dev/null || echo '{"error": "request_failed"}')

  local end_time=$(date +%s%3N)
  local duration=$((end_time - start_time))

  # Parse response
  local success=false
  local categories=""
  local confidence=0
  local message=""
  local error=""

  if echo "$response" | jq -e '.result' > /dev/null 2>&1; then
    success=true
    categories=$(echo "$response" | jq -r '.result.content[0].text' | jq -r '.categories | join(", ")' 2>/dev/null || echo "")
    confidence=$(echo "$response" | jq -r '.result.content[0].text' | jq -r '.confidence' 2>/dev/null || echo "0")
    message=$(echo "$response" | jq -r '.result.content[0].text' | jq -r '.message' 2>/dev/null || echo "")
  else
    error=$(echo "$response" | jq -r '.error.message' 2>/dev/null || echo "Unknown error")
  fi

  # Build metric
  local metric=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "iteration": $iteration,
  "prompt": "$prompt",
  "duration_ms": $duration,
  "success": $success,
  "categories": "$categories",
  "confidence": $confidence,
  "message": "$message",
  "error": "$error"
}
EOF
)

  # Append to output file
  echo "$metric" >> "$OUTPUT_FILE"

  # Display result
  local status_color=$GREEN
  if [[ $duration -gt $LLM_ANALYSIS_ACCEPTABLE ]]; then
    status_color=$RED
  elif [[ $duration -gt $LLM_ANALYSIS_TARGET ]]; then
    status_color=$YELLOW
  fi

  if [[ "$success" == "true" ]]; then
    echo -e "${status_color}[$iteration] ${duration}ms${NC} | Categories: $categories | Confidence: $confidence"
  else
    echo -e "${RED}[$iteration] FAILED${NC} | Error: $error"
  fi

  return 0
}

# Main test loop
echo "Running performance tests..."
echo ""

for i in $(seq 1 "$ITERATIONS"); do
  # Select prompt (cycle through available prompts)
  local prompt_index=$(( (i - 1) % ${#TEST_PROMPTS[@]} ))
  local prompt="${TEST_PROMPTS[$prompt_index]}"

  test_analyze_prompt "$prompt" "$i"

  # Small delay between requests
  sleep 0.5
done

echo ""
echo "========================================"
echo "Performance Test Summary"
echo "========================================"
echo ""

# Calculate statistics
if [[ -f "$OUTPUT_FILE" ]]; then
  local total_tests=$(jq -s 'length' "$OUTPUT_FILE")
  local successful_tests=$(jq -s 'map(select(.success == true)) | length' "$OUTPUT_FILE")
  local failed_tests=$((total_tests - successful_tests))

  local avg_duration=$(jq -s 'map(select(.success == true) | .duration_ms) | add / length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
  local max_duration=$(jq -s 'map(.duration_ms) | max' "$OUTPUT_FILE" 2>/dev/null || echo "0")
  local min_duration=$(jq -s 'map(.duration_ms) | min' "$OUTPUT_FILE" 2>/dev/null || echo "0")

  local target_met=$(jq -s "map(select(.success == true and .duration_ms <= $LLM_ANALYSIS_TARGET)) | length" "$OUTPUT_FILE")
  local acceptable_met=$(jq -s "map(select(.success == true and .duration_ms <= $LLM_ANALYSIS_ACCEPTABLE)) | length" "$OUTPUT_FILE")

  echo "Total tests: $total_tests"
  echo "Successful: $successful_tests"
  echo "Failed: $failed_tests"
  echo ""
  echo "LLM Analysis Duration:"
  echo "  Average: ${avg_duration}ms"
  echo "  Maximum: ${max_duration}ms"
  echo "  Minimum: ${min_duration}ms"
  echo ""
  echo "Performance Thresholds:"
  echo "  Met target (<${LLM_ANALYSIS_TARGET}ms): $target_met / $successful_tests"
  echo "  Met acceptable (<${LLM_ANALYSIS_ACCEPTABLE}ms): $acceptable_met / $successful_tests"
  echo ""

  # Overall status
  if [[ $acceptable_met -eq $successful_tests ]]; then
    echo -e "${GREEN}Status: ALL TESTS PASSED${NC}"
  elif [[ $target_met -ge $((successful_tests * 80 / 100)) ]]; then
    echo -e "${YELLOW}Status: ACCEPTABLE (80%+ meet target)${NC}"
  else
    echo -e "${RED}Status: ACTION REQUIRED (Performance below threshold)${NC}"
  fi
else
  echo "No metrics collected"
fi

echo ""
echo "Metrics file: $OUTPUT_FILE"
echo ""
