# TASK-002: Implement analyzePrompt() in OpenAIProvider

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: HIGH
- **Estimated**: 45 minutes
- **Phase**: 1 - LLM Provider Enhancement

## Description
Implement the `analyzePrompt()` method in OpenAIProvider using the OpenAI SDK with optimized parameters for intent analysis.

## Context
OpenAI's Chat Completions API with `response_format: { type: 'json_object' }` provides reliable JSON responses for structured analysis.

## Dependencies
- **Blocks**: TASK-008 (fix handleAnalyzePrompt)
- **Requires**: TASK-001, TASK-005 (base method and prompt builder)

## Acceptance Criteria
- [ ] Method implemented in OpenAIProvider class
- [ ] Uses `gpt-4o-mini` as default model (configurable)
- [ ] Implements `response_format: { type: 'json_object' }` for structured output
- [ ] Temperature set to 0.3 for consistent responses
- [ ] Max tokens limited to 150 (adequate for category response)
- [ ] Calls `_buildAnalysisPrompt()` helper
- [ ] Calls `_parseAnalysisResponse()` for validation
- [ ] Proper error handling with descriptive messages

## Implementation Details

### File Location
`src/utils/llm-provider.js` (OpenAIProvider class)

### Code Template
```javascript
async analyzePrompt(prompt, context, validCategories) {
  const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

  const completion = await this.client.chat.completions.create({
    model: this.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing user requests. Respond with ONLY valid JSON.'
      },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3,
    max_tokens: 150,
    response_format: { type: 'json_object' }
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from OpenAI API');
  }

  return this._parseAnalysisResponse(response, validCategories);
}
```

## Testing Strategy
- Unit test with mocked OpenAI SDK client
- Test with various prompt types (GitHub, filesystem, database)
- Verify JSON response format
- Test error handling (API failures, timeouts)

## Success Metrics
- Correctly identifies categories for test prompts
- Confidence scores in range [0, 1]
- Response time < 2000ms (p95)
- Zero parsing errors with valid responses

## Rollback Plan
- Revert to throwing "not implemented" error
- No persistent data changes

## Related Tasks
- TASK-001: Base method definition
- TASK-003: GeminiProvider implementation
- TASK-004: AnthropicProvider implementation
- TASK-005: Prompt building helper
- TASK-006: Response parsing helper

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.5.1
- OpenAI Chat Completions API docs
- Memory: `llm_sdk_upgrade_project_complete_merged`
