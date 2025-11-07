# TASK-016: Create Automated Validation Script

## Status
- **Current**: TODO
- **Assigned**: Frontend Developer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 3 - Testing Infrastructure

## Description
Create `scripts/test-analyze-prompt.sh` automated validation script for manual testing and verification.

## Context
Quick validation script enables rapid testing during development and provides example usage for documentation.

## Dependencies
- **Blocks**: None (aids development and verification)
- **Requires**: TASK-008 (handleAnalyzePrompt implementation)

## Acceptance Criteria
- [ ] Script created at `scripts/test-analyze-prompt.sh`
- [ ] Executable permissions set
- [ ] Tests complete analyze_prompt flow
- [ ] Supports custom prompts via argument
- [ ] Color-coded pass/fail output
- [ ] Automatic cleanup on completion
- [ ] Detailed output showing categories identified
- [ ] Returns proper exit codes

## Script Functionality

### Features
1. Start MCP Hub if not running
2. Send analyze_prompt request with test prompt
3. Verify categories identified
4. Send tools/list request
5. Verify tools filtered correctly
6. Display results with color coding
7. Clean up test session

### Usage
```bash
# Use default test prompt
./scripts/test-analyze-prompt.sh

# Custom prompt
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# Verbose mode
./scripts/test-analyze-prompt.sh --verbose "Create a new file"
```

## Implementation Template

### File Location
`scripts/test-analyze-prompt.sh`

### Code Structure
```bash
#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HUB_URL=${MCP_HUB_URL:-"http://localhost:7000"}
SESSION_ID="test-$(date +%s)"
PROMPT="${1:-Check my GitHub notifications}"

echo "🧪 Testing analyze_prompt functionality"
echo "Prompt: $PROMPT"
echo "Session: $SESSION_ID"
echo ""

# Test 1: Analyze prompt
echo "1️⃣ Calling hub__analyze_prompt..."
RESULT=$(curl -s "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":1,
    \"method\":\"tools/call\",
    \"params\":{
      \"name\":\"hub__analyze_prompt\",
      \"arguments\":{\"prompt\":\"${PROMPT}\"}
    }
  }")

# Extract categories
CATEGORIES=$(echo "$RESULT" | jq -r '.result.content[0].text' | jq -r '.categories[]' 2>/dev/null || echo "")

if [ -n "$CATEGORIES" ]; then
  echo -e "${GREEN}✓${NC} Analysis complete"
  echo "Categories: $(echo $CATEGORIES | tr '\\n' ', ')"
else
  echo -e "${RED}✗${NC} Analysis failed"
  echo "$RESULT" | jq
  exit 1
fi

# Test 2: Verify tools filtered
echo ""
echo "2️⃣ Checking tools/list..."
TOOLS=$(curl -s "${HUB_URL}/mcp/messages?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":2,
    \"method\":\"tools/list\"
  }")

TOOL_COUNT=$(echo "$TOOLS" | jq '.result.tools | length')
echo "Tools exposed: $TOOL_COUNT"

if [ "$TOOL_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Tools filtered correctly"
else
  echo -e "${RED}✗${NC} No tools exposed"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
```

## Testing Strategy
- Test with various prompts
- Verify correct exit codes
- Test with MCP Hub not running
- Test cleanup behavior
- Verify color coding works

## Success Metrics
- Script runs successfully
- Clear output formatting
- Correct pass/fail detection
- Useful for debugging
- Easy to extend

## Related Tasks
- TASK-015: Integration test suite
- TASK-017: Testing guide documentation

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 5.2
- Bash scripting best practices
