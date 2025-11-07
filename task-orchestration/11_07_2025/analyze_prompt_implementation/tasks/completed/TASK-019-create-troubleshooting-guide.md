# TASK-019: Create Troubleshooting Guide

## Status
- **Current**: TODO
- **Assigned**: Technical Writer / Developer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 4 - Documentation & Deployment

## Description
Create comprehensive troubleshooting guide for common analyze_prompt issues and debugging strategies.

## Context
Troubleshooting documentation reduces support burden and enables self-service problem resolution.

## Dependencies
- **Blocks**: None (documentation task)
- **Requires**: TASK-014 (debug logging checkpoints)

## Acceptance Criteria
- [ ] Guide created or README section added
- [ ] Common issues documented
- [ ] Debug procedures explained
- [ ] Log analysis guidance provided
- [ ] Recovery procedures documented
- [ ] Clear, actionable solutions

## Troubleshooting Guide Structure

### Common Issues

**Issue 1: "Method not found" Error**
```
Symptom: Error when calling hub__analyze_prompt
Cause: LLM provider missing analyzePrompt() implementation
Solution:
1. Verify provider implementation exists
2. Check provider class extends LLMProvider
3. Verify provider instantiated correctly
Debug: Enable DEBUG_TOOL_FILTERING=true
```

**Issue 2: Tools Not Updating After Analysis**
```
Symptom: analyze_prompt completes but tools/list unchanged
Cause: handleToolsList() not filtering by session categories
Solution:
1. Verify promptBasedFiltering.enabled: true
2. Check session.exposedCategories updated
3. Verify filterToolsBySessionCategories() called
Debug: Check logs for "Filtered tools by session categories"
```

**Issue 3: LLM Analysis Fails**
```
Symptom: Analysis returns error or meta category with low confidence
Cause: LLM API key missing, invalid, or API error
Solution:
1. Verify API key set: echo $GEMINI_API_KEY
2. Check API key valid (not expired)
3. Verify network connectivity
4. Check logs for detailed error
Debug: Heuristic fallback should activate
```

**Issue 4: Session Not Found**
```
Symptom: "Session not found" error
Cause: Client reconnected, lost session state
Solution:
1. Expected behavior (sessions ephemeral)
2. Client should call analyze_prompt again
3. Implement session persistence if needed
```

**Issue 5: Incorrect Categories Identified**
```
Symptom: Wrong categories returned for prompt
Cause: LLM misinterpretation or prompt ambiguity
Solution:
1. Review confidence score (low = uncertain)
2. Refine prompt to be more specific
3. Use context parameter for disambiguation
4. Report pattern for prompt improvement
Debug: Check reasoning field in response
```

### Debug Procedures

**Procedure 1: Enable Debug Logging**
```bash
DEBUG_TOOL_FILTERING=true bun start
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep analyze_prompt
```

**Procedure 2: Check Configuration**
```bash
# Verify configuration loaded
grep -A 10 "promptBasedFiltering" mcp-servers.json

# Check LLM provider configured
grep "llmCategorization" mcp-servers.json
```

**Procedure 3: Test LLM Provider**
```bash
# Quick API key test
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

**Procedure 4: Validate Complete Flow**
```bash
# Use validation script
./scripts/test-analyze-prompt.sh --verbose "Your test prompt"

# Check all 7 debug checkpoints logged
grep "Meta-tools registered" mcp-hub.log
grep "Session initialized" mcp-hub.log
grep "Starting prompt analysis" mcp-hub.log
grep "Calling LLM provider" mcp-hub.log
grep "LLM analysis completed" mcp-hub.log
grep "Tool exposure updated" mcp-hub.log
grep "Client notified" mcp-hub.log
```

### Log Analysis

**Key Log Patterns to Search**:
```bash
# Analysis flow
grep "handleAnalyzePrompt" mcp-hub.log

# Category identification
grep "categories:" mcp-hub.log

# Tool filtering
grep "Filtered tools by session categories" mcp-hub.log

# Errors
grep "ERROR" mcp-hub.log | grep analyze
```

### Recovery Procedures

**Rollback Feature**:
```json
{
  "promptBasedFiltering": {
    "enabled": false  // Disable feature
  }
}
```

**Clear Session State**:
```bash
# Restart Hub to clear all sessions
bun start
```

## Success Metrics
- Common issues covered
- Clear solutions provided
- Reduced troubleshooting time
- Self-service resolution enabled

## Related Tasks
- TASK-014: Debug logging (enables troubleshooting)
- TASK-017: Testing guide
- TASK-018: Configuration docs

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 7
- Existing troubleshooting documentation
