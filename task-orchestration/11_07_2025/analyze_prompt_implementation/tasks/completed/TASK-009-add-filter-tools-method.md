# TASK-009: Add filterToolsBySessionCategories() Method

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: CRITICAL
- **Estimated**: 1 hour
- **Phase**: 2 - Tool Exposure Protocol

## Description
Create `filterToolsBySessionCategories()` method that filters tools based on session's exposed categories.

## Context
This is the missing piece that actually enforces tool filtering. Without this, session state is updated but tools/list doesn't respect it.

## Dependencies
- **Blocks**: TASK-010 (modify handleToolsList)
- **Requires**: TASK-011 (inferToolCategory helper)

## Acceptance Criteria
- [ ] Method added to MCPServerEndpoint class
- [ ] Takes session object as parameter
- [ ] Returns filtered array of tools
- [ ] Handles empty exposedCategories (returns empty array or meta-only)
- [ ] Uses inferToolCategory() for category extraction
- [ ] Efficient implementation (no redundant iterations)
- [ ] Documented with JSDoc comments
- [ ] Debug logging for filtering decisions

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template
```javascript
/**
 * Filter tools by session's exposed categories
 * @param {Object} session - Session object with exposedCategories Set
 * @returns {Array} Filtered tools matching exposed categories
 */
filterToolsBySessionCategories(session) {
  const { exposedCategories } = session;
  const allTools = Array.from(this.allCapabilities.tools.values());

  // If no categories exposed, return empty (zero-default)
  if (exposedCategories.size === 0) {
    return [];
  }

  // Filter tools by category
  const filtered = allTools.filter(tool => {
    const category = tool.category || this.inferToolCategory(tool);
    const included = exposedCategories.has(category);

    if (included) {
      logger.debug({
        tool: tool.definition.name,
        category,
        sessionId: session.id
      }, 'Tool included in filter');
    }

    return included;
  });

  logger.info({
    sessionId: session.id,
    totalTools: allTools.length,
    filteredTools: filtered.length,
    categories: Array.from(exposedCategories)
  }, 'Filtered tools by session categories');

  return filtered;
}
```

## Testing Strategy
- Unit test with various category combinations
- Test empty exposedCategories
- Test single category
- Test multiple categories
- Test uncategorized tools
- Test meta-only tools
- Verify logging output

## Success Metrics
- Correctly filters tools by category
- Returns expected tool counts
- Efficient performance (< 10ms for 100 tools)
- Debug logs show filtering decisions

## Edge Cases
- Session with no exposed categories
- All tools uncategorized
- Category not matching any tools
- Tool with missing category field

## Related Tasks
- TASK-010: Modify handleToolsList (caller)
- TASK-011: Add inferToolCategory helper
- TASK-012: Enhanced updateClientTools

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.2
- Memory: `analyze_prompt_critical_bug_fixes` (Bug #2)
