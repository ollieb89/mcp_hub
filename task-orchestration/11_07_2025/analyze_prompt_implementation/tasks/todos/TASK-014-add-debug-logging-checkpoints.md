# TASK-014: Add Debug Logging Checkpoints

## Status
- **Current**: TODO
- **Assigned**: Frontend Developer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 2 - Tool Exposure Protocol

## Description
Add 7 strategic debug logging checkpoints throughout the analyze_prompt flow for troubleshooting and validation.

## Context
Comprehensive logging enables rapid troubleshooting in production and validates complete flow during development.

## Dependencies
- **Blocks**: None (enhances existing tasks)
- **Requires**: TASK-008, TASK-009, TASK-010, TASK-012 (methods to add logging to)

## Acceptance Criteria
- [ ] 7 debug logging checkpoints added
- [ ] Each checkpoint logs relevant context
- [ ] Controlled by `DEBUG_TOOL_FILTERING` environment variable
- [ ] Performance overhead minimal when disabled
- [ ] Consistent log format across checkpoints
- [ ] Correlation IDs for request tracing
- [ ] Documented in troubleshooting guide

## Debug Checkpoints

### Checkpoint 1: Meta-Tool Registration
**Location**: MCPServerEndpoint constructor
**Purpose**: Verify hub__analyze_prompt registered
```javascript
logger.debug({
  metaTools: this.metaTools.map(t => t.name)
}, 'Meta-tools registered');
```

### Checkpoint 2: Session Initialization
**Location**: createSession() or equivalent
**Purpose**: Verify initial exposedCategories
```javascript
logger.debug({
  sessionId,
  initialCategories: Array.from(session.exposedCategories),
  defaultExposure: config.defaultExposure
}, 'Session initialized with tool exposure');
```

### Checkpoint 3: Prompt Analysis Entry
**Location**: handleAnalyzePrompt() start
**Purpose**: Log incoming request
```javascript
logger.debug({
  sessionId,
  promptLength: prompt.length,
  hasContext: !!context
}, 'Starting prompt analysis');
```

### Checkpoint 4: LLM Provider Call
**Location**: Before analyzePromptWithFallback()
**Purpose**: Track LLM invocation
```javascript
logger.debug({
  sessionId,
  provider: this.filteringService.llmClient.constructor.name,
  validCategories
}, 'Calling LLM provider for analysis');
```

### Checkpoint 5: Category Analysis Result
**Location**: After LLM analysis
**Purpose**: Log identified categories
```javascript
logger.debug({
  sessionId,
  categories: analysis.categories,
  confidence: analysis.confidence,
  reasoning: analysis.reasoning
}, 'LLM analysis completed');
```

### Checkpoint 6: Tool Exposure Update
**Location**: After updateClientTools()
**Purpose**: Log exposure changes
```javascript
logger.debug({
  sessionId,
  addedCategories: result.added,
  totalCategories: result.total,
  mode
}, 'Tool exposure updated');
```

### Checkpoint 7: Client Notification
**Location**: After sendToolsChangedNotification()
**Purpose**: Verify notification sent
```javascript
logger.debug({
  sessionId,
  notificationSent: true,
  toolCount: toolsToExpose.length
}, 'Client notified of tool changes');
```

## Implementation Strategy
- Add checkpoints incrementally as tasks complete
- Use structured logging (JSON format)
- Include correlation IDs for request tracing
- Minimize performance impact

## Testing Strategy
- Verify all checkpoints log correctly
- Test with DEBUG_TOOL_FILTERING=true
- Verify performance overhead acceptable
- Test log parsing and analysis

## Success Metrics
- All 7 checkpoints present
- Logs enable rapid troubleshooting
- Complete request tracing possible
- Performance overhead < 5ms per request

## Related Tasks
- TASK-008: handleAnalyzePrompt
- TASK-009: filterToolsBySessionCategories
- TASK-010: handleToolsList
- TASK-012: updateClientTools
- TASK-019: Create troubleshooting guide

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 4 (Debug System)
- Logging best practices
