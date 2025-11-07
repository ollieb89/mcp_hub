# TASK-011: Add inferToolCategory() Helper Method

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: HIGH
- **Estimated**: 30 minutes
- **Phase**: 2 - Tool Exposure Protocol

## Description
Create `inferToolCategory()` helper method that extracts category from namespaced tool names.

## Context
Tools are namespaced as `{server}__{toolname}` (e.g., `github__search`). This method extracts the server/category prefix.

## Dependencies
- **Blocks**: TASK-009 (filterToolsBySessionCategories)
- **Requires**: None

## Acceptance Criteria
- [ ] Method added to MCPServerEndpoint class
- [ ] Extracts category from namespaced tool names
- [ ] Handles tools without namespace (returns 'uncategorized')
- [ ] Returns lowercase category name
- [ ] Efficient regex implementation
- [ ] Documented with JSDoc comments
- [ ] Handles edge cases gracefully

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template
```javascript
/**
 * Infer category from tool name
 * Extracts namespace prefix from namespaced tools: "github__search" -> "github"
 * @param {Object} tool - Tool object with definition
 * @returns {string} Category name or 'uncategorized'
 */
inferToolCategory(tool) {
  const toolName = tool.definition?.name;

  if (!toolName) {
    logger.warn({ tool }, 'Tool missing name in definition');
    return 'uncategorized';
  }

  // Extract namespace: "github__search" -> "github"
  const match = toolName.match(/^([^_]+)__/);

  if (match) {
    return match[1].toLowerCase();
  }

  // No namespace, check if it's a meta tool
  if (toolName.startsWith('hub__')) {
    return 'meta';
  }

  logger.debug({ toolName }, 'Tool has no category namespace');
  return 'uncategorized';
}
```

## Testing Strategy
- Unit test with various tool name formats
- Test namespaced tools: `github__search`
- Test meta tools: `hub__analyze_prompt`
- Test tools without namespace
- Test tools with underscores in name: `server_name__tool_name`
- Test malformed tool objects
- Test empty/null names

## Success Metrics
- Correctly extracts category from 100% of namespaced tools
- Handles edge cases gracefully
- No exceptions thrown
- Consistent return values

## Edge Cases
- Tool with null/undefined name
- Tool with multiple underscores: `my_server__my_tool`
- Tool with no underscores
- Tool with single underscore: `tool_name`
- Meta tools: `hub__*`

## Related Tasks
- TASK-009: filterToolsBySessionCategories (caller)
- TASK-010: handleToolsList (indirect caller)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.3
- Tool naming conventions
