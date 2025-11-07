# TASK-012: Enhance updateClientTools() Method

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: HIGH
- **Estimated**: 1 hour
- **Phase**: 2 - Tool Exposure Protocol

## Description
Enhance `updateClientTools()` method with additive/replacement modes, exposure history tracking, and improved logging.

## Context
Current implementation always replaces categories. Additive mode enables progressive expansion without re-analysis overhead.

## Dependencies
- **Blocks**: TASK-008 (handleAnalyzePrompt calls this)
- **Requires**: TASK-013 (notification sending)

## Acceptance Criteria
- [ ] Support 'additive' and 'replacement' modes
- [ ] Track exposure history in session
- [ ] Return added/total categories
- [ ] Only send notification if categories actually changed
- [ ] Debug logging for category changes
- [ ] Backward compatible (default to additive mode)
- [ ] Documented with JSDoc comments

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template
```javascript
/**
 * Update client's exposed tool categories
 * @param {string} sessionId - Session identifier
 * @param {string[]} categories - Categories to expose
 * @param {string} mode - 'additive' (default) or 'replacement'
 * @returns {Promise<{added: string[], total: string[]}>} Categories added and total
 */
async updateClientTools(sessionId, categories, mode = 'additive') {
  const session = this.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const addedCategories = [];
  const previousSize = session.exposedCategories.size;

  if (mode === 'additive') {
    // Add new categories, keep existing
    for (const cat of categories) {
      if (!session.exposedCategories.has(cat)) {
        session.exposedCategories.add(cat);
        addedCategories.push(cat);
      }
    }
  } else if (mode === 'replacement') {
    // Replace all categories
    session.exposedCategories = new Set(categories);
    addedCategories.push(...categories);
  } else {
    throw new Error(`Invalid mode: ${mode}. Use 'additive' or 'replacement'`);
  }

  // Track history
  session.exposureHistory = session.exposureHistory || [];
  session.exposureHistory.push({
    timestamp: Date.now(),
    operation: mode,
    addedCategories: [...addedCategories],
    totalCategories: Array.from(session.exposedCategories)
  });

  logger.info({
    sessionId,
    mode,
    addedCategories,
    totalCategories: Array.from(session.exposedCategories),
    previousSize,
    newSize: session.exposedCategories.size
  }, 'Updated client tool exposure');

  // Send notification only if categories changed
  if (addedCategories.length > 0) {
    await this.sendToolsChangedNotification(sessionId, addedCategories, mode);
  } else {
    logger.debug({ sessionId }, 'No new categories added, skipping notification');
  }

  return {
    added: addedCategories,
    total: Array.from(session.exposedCategories)
  };
}
```

## Testing Strategy
- Unit test additive mode
- Unit test replacement mode
- Test no-op (categories already exposed)
- Test notification sending
- Test history tracking
- Test invalid mode handling

## Success Metrics
- Additive mode accumulates categories
- Replacement mode replaces categories
- Notifications only sent when changed
- History accurately tracked
- No duplicate notifications

## Related Tasks
- TASK-008: handleAnalyzePrompt (caller)
- TASK-013: sendToolsChangedNotification
- TASK-010: handleToolsList (reads exposedCategories)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.5
- MCP notification protocol
