# TASK-010: Modify handleToolsList() for Filtering

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: CRITICAL
- **Estimated**: 1 hour
- **Phase**: 2 - Tool Exposure Protocol

## Description
Modify `handleToolsList()` method to filter tools by session categories when prompt-based filtering is enabled.

## Context
This is the **critical fix** for Bug #2. Currently tools/list ignores session.exposedCategories. This task integrates the filter.

## Dependencies
- **Blocks**: TASK-015 (integration testing)
- **Requires**: TASK-009 (filterToolsBySessionCategories method)

## Acceptance Criteria
- [ ] Method modified to check promptBasedFiltering config
- [ ] Calls filterToolsBySessionCategories() when enabled
- [ ] Returns all tools when filtering disabled (backward compatibility)
- [ ] Handles missing session gracefully
- [ ] Updates session activity timestamp
- [ ] Debug logging for filtered tool count
- [ ] Maintains existing response format
- [ ] No breaking changes to API

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template
```javascript
async handleToolsList(request) {
  const sessionId = this.getSessionId(request);
  const session = this.sessions.get(sessionId);

  if (!session) {
    throw new Error('Session not found. Client must reconnect.');
  }

  this.updateSessionActivity(sessionId);

  const promptBasedEnabled = this.config.toolFiltering?.promptBasedFiltering?.enabled;

  let toolsToExpose;

  if (promptBasedEnabled) {
    // ✅ NEW: Filter by session categories
    toolsToExpose = this.filterToolsBySessionCategories(session);

    logger.debug({
      sessionId,
      exposedCategories: Array.from(session.exposedCategories),
      toolCount: toolsToExpose.length
    }, 'Filtered tools by session categories');
  } else {
    // Existing behavior
    toolsToExpose = Array.from(this.allCapabilities.tools.values());

    logger.debug({
      sessionId,
      toolCount: toolsToExpose.length
    }, 'Returning all tools (filtering disabled)');
  }

  return {
    tools: toolsToExpose.map(tool => ({
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.definition.inputSchema
    }))
  };
}
```

## Testing Strategy
- Unit test with filtering enabled
- Unit test with filtering disabled
- Test session state changes reflected
- Test backward compatibility
- Integration test complete flow
- Test with missing session

## Success Metrics
- tools/list returns different tools before/after analysis
- Filtering only active when configured
- No regression for existing functionality
- Debug logs show correct behavior

## Backward Compatibility
- Filtering disabled by default
- No changes to response format
- Existing clients unaffected

## Related Tasks
- TASK-009: filterToolsBySessionCategories method
- TASK-012: Enhanced updateClientTools
- TASK-013: Send notifications

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.1
- Memory: `analyze_prompt_critical_bug_fixes` (Bug #2)
- MCP tools/list specification
