# TASK-001: Add analyzePrompt() Base Method to LLMProvider

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: CRITICAL
- **Estimated**: 1 hour
- **Phase**: 1 - LLM Provider Enhancement

## Description
Add the `analyzePrompt()` abstract method to the LLMProvider base class to enable prompt analysis capabilities across all LLM providers.

## Context
The `hub__analyze_prompt` meta-tool currently fails because it calls a non-existent `generateResponse()` method. This task establishes the correct interface for prompt analysis.

## Dependencies
- **Blocks**: TASK-002, TASK-003, TASK-004 (provider implementations)
- **Requires**: None

## Acceptance Criteria
- [ ] `analyzePrompt(prompt, context, validCategories)` method added to LLMProvider base class
- [ ] Method signature documented with JSDoc comments
- [ ] Method throws "Must implement" error in base class
- [ ] Return type documented: `{categories: string[], confidence: number, reasoning: string}`
- [ ] No breaking changes to existing `categorize()` method

## Implementation Details

### File Location
`src/utils/llm-provider.js`

### Code Template
```javascript
/**
 * Analyze user prompt and determine needed tool categories
 * @param {string} prompt - User's request
 * @param {string} [context] - Optional conversation context
 * @param {string[]} validCategories - Array of valid category names
 * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
 */
async analyzePrompt(prompt, context, validCategories) {
  throw new Error('Must implement analyzePrompt() method');
}
```

## Testing Strategy
- Unit test verifies method exists on base class
- Unit test verifies method throws error when not overridden
- Integration tests in TASK-015 will validate complete flow

## Success Metrics
- Method callable from MCPServerEndpoint
- Type signatures match expected interface
- No TypeScript/JSDoc errors

## Rollback Plan
- Revert commit if method signature needs changes
- No data loss (code-only change)

## Related Tasks
- TASK-002: Implement in OpenAIProvider
- TASK-003: Implement in GeminiProvider
- TASK-004: Implement in AnthropicProvider
- TASK-005: Add prompt building helper

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.1
- Memory: `analyze_prompt_critical_bug_fixes` (Bug #1)
