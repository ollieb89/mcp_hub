# TASK-013: Send tools/list_changed Notification

## Status
- **Current**: TODO
- **Assigned**: Frontend Architect
- **Priority**: MEDIUM
- **Estimated**: 30 minutes
- **Phase**: 2 - Tool Exposure Protocol

## Description
Create or update `sendToolsChangedNotification()` method to send MCP notifications when tool exposure changes.

## Context
MCP clients need notification to re-fetch tools/list after exposure changes. This implements the notification protocol correctly.

## Dependencies
- **Blocks**: TASK-012 (updateClientTools calls this)
- **Requires**: None (may already exist, needs verification)

## Acceptance Criteria
- [ ] Method sends proper MCP notification
- [ ] Notification format complies with MCP spec
- [ ] Includes sessionId for routing
- [ ] Logs notification sending
- [ ] Handles notification failures gracefully
- [ ] Documented with JSDoc comments

## Implementation Details

### File Location
`src/mcp/server.js` (MCPServerEndpoint class)

### Code Template
```javascript
/**
 * Send tools/list_changed notification to client
 * @param {string} sessionId - Session identifier
 * @param {string[]} addedCategories - Categories just added
 * @param {string} mode - Operation mode ('additive' or 'replacement')
 * @returns {Promise<void>}
 */
async sendToolsChangedNotification(sessionId, addedCategories, mode) {
  const session = this.sessions.get(sessionId);
  if (!session) {
    logger.warn({ sessionId }, 'Cannot send notification: session not found');
    return;
  }

  try {
    // MCP notification format
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed',
      params: {
        // MCP spec: notification is signal only, no data
      }
    };

    // Send via client connection (implementation depends on transport)
    if (session.client && session.client.sendNotification) {
      await session.client.sendNotification(notification);
    }

    logger.info({
      sessionId,
      addedCategories,
      mode,
      totalCategories: session.exposedCategories.size
    }, 'Sent tools/list_changed notification');
  } catch (error) {
    logger.error({
      sessionId,
      error: error.message
    }, 'Failed to send tools/list_changed notification');
    // Don't throw - notification failure shouldn't break analysis
  }
}
```

## Testing Strategy
- Unit test notification format
- Test with valid session
- Test with missing session
- Test notification failure handling
- Integration test client receives notification
- Verify MCP spec compliance

## Success Metrics
- Notifications sent successfully
- Clients re-fetch tools/list after notification
- Failures logged but don't break flow
- MCP spec compliance verified

## MCP Notification Spec
According to MCP specification:
- Method: `notifications/tools/list_changed`
- Params: Empty object (signal only)
- Client should re-fetch tools/list after receiving

## Related Tasks
- TASK-012: updateClientTools (caller)
- TASK-010: handleToolsList (clients re-fetch after notification)

## Reference Documentation
- MCP notification protocol specification
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 3.5
