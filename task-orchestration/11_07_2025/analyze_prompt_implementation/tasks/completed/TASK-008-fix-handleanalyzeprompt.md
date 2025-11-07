# TASK-008: Fix handleAnalyzePrompt() Implementation

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: CRITICAL
- **Estimated**: 2 hours
- **Phase**: 2 - Tool Exposure Protocol

## Description
Replace the broken `handleAnalyzePrompt()` method in MCPServerEndpoint with correct implementation that calls the new LLM provider methods.

## Context
Current implementation calls non-existent `generateResponse()` method. This task fixes the complete analysis flow including validation, error handling, and client updates.

## Dependencies
- **Blocks**: TASK-015 (integration testing)
- **Requires**: TASK-001, TASK-002, TASK-007 (LLM provider methods complete)

## Acceptance Criteria
- [ ] Method replaced with correct implementation
- [ ] Calls `analyzePromptWithFallback()` on LLM provider
- [ ] Validates prompt input (non-empty string)
- [ ] Handles LLM unavailability gracefully
- [ ] Calls `updateClientTools()` with identified categories
- [ ] Returns properly formatted MCP response
- [ ] Includes guidance for next steps in response
- [ ] Comprehensive error handling
- [ ] Debug logging at key checkpoints

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template (see full implementation in task file)

## Testing Strategy
- Unit test with mocked LLM provider
- Test with valid prompts
- Test with empty/invalid prompts
- Test LLM failure scenarios
- Test tool update integration
- Integration test complete flow

## Success Metrics
- No "method not found" errors
- Correct categories identified
- Tools updated in session state
- Client receives proper MCP response
- Debug logs show complete flow

## Related Tasks
- TASK-007: LLM provider fallback logic
- TASK-009: Add filterToolsBySessionCategories
- TASK-010: Modify handleToolsList

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.4
- Memory: `analyze_prompt_critical_bug_fixes` (Bug #1)
- MCP Protocol specification
