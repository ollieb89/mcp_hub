# TASK-004: Implement analyzePrompt() in AnthropicProvider

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: MEDIUM
- **Estimated**: 45 minutes
- **Phase**: 1 - LLM Provider Enhancement

## Description
Implement the `analyzePrompt()` method in AnthropicProvider using the Anthropic SDK.

## Context
Claude 3.5 Haiku provides excellent accuracy for intent analysis. Supports structured outputs for reliable JSON responses.

## Dependencies
- **Blocks**: TASK-008 (fix handleAnalyzePrompt)
- **Requires**: TASK-001, TASK-005 (base method and prompt builder)

## Acceptance Criteria
- [ ] Method implemented in AnthropicProvider class
- [ ] Uses `claude-3-5-haiku-20241022` as default model (configurable)
- [ ] Temperature set to 0.3 for consistent responses
- [ ] Max tokens limited to 150
- [ ] Calls `_buildAnalysisPrompt()` helper
- [ ] Calls `_parseAnalysisResponse()` for validation
- [ ] Proper error handling with descriptive messages
- [ ] Handles Anthropic-specific error codes

## Implementation Details

### File Location
`src/utils/llm-provider.js` (AnthropicProvider class)

### Code Template
```javascript
async analyzePrompt(prompt, context, validCategories) {
  const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

  const message = await this.client.messages.create({
    model: this.model || 'claude-3-5-haiku-20241022',
    max_tokens: 150,
    temperature: 0.3,
    system: 'You are an expert at analyzing user requests. Respond with ONLY valid JSON.',
    messages: [
      { role: 'user', content: analysisPrompt }
    ]
  });

  const response = message.content[0]?.text;
  if (!response) {
    throw new Error('No response from Anthropic API');
  }

  return this._parseAnalysisResponse(response, validCategories);
}
```

## Testing Strategy
- Unit test with mocked Anthropic SDK client
- Test with various prompt types
- Verify JSON response format
- Test Anthropic-specific error conditions
- Verify response time meets requirements

## Success Metrics
- Correctly identifies categories for test prompts
- Confidence scores in range [0, 1]
- Response time < 2000ms (p95)
- Proper error handling for API failures

## Rollback Plan
- Revert to throwing "not implemented" error
- No persistent data changes

## Related Tasks
- TASK-001: Base method definition
- TASK-002: OpenAIProvider implementation
- TASK-003: GeminiProvider implementation
- TASK-005: Prompt building helper
- TASK-006: Response parsing helper

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.5.3
- Anthropic Messages API docs
- Memory: `llm_sdk_upgrade_project_complete_merged`
