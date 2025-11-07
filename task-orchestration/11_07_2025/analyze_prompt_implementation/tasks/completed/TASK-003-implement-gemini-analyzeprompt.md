# TASK-003: Implement analyzePrompt() in GeminiProvider

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: HIGH
- **Estimated**: 45 minutes
- **Phase**: 1 - LLM Provider Enhancement

## Description
Implement the `analyzePrompt()` method in GeminiProvider using the Google Generative AI SDK.

## Context
Gemini 2.5 Flash is the recommended model for cost-effective, fast analysis. Supports JSON mode for structured responses.

## Dependencies
- **Blocks**: TASK-008 (fix handleAnalyzePrompt)
- **Requires**: TASK-001, TASK-005 (base method and prompt builder)

## Acceptance Criteria
- [ ] Method implemented in GeminiProvider class
- [ ] Uses `gemini-2.5-flash` as default model (configurable)
- [ ] Implements JSON response mode
- [ ] Temperature set to 0.3 for consistent responses
- [ ] Calls `_buildAnalysisPrompt()` helper
- [ ] Calls `_parseAnalysisResponse()` for validation
- [ ] Proper error handling with descriptive messages
- [ ] Handles Gemini-specific error codes

## Implementation Details

### File Location
`src/utils/llm-provider.js` (GeminiProvider class)

### Code Template
```javascript
async analyzePrompt(prompt, context, validCategories) {
  const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

  const model = this.client.getGenerativeModel({
    model: this.model || 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 150,
      responseMimeType: 'application/json'
    }
  });

  const result = await model.generateContent([
    { role: 'user', parts: [{ text: analysisPrompt }] }
  ]);

  const response = result.response.text();
  if (!response) {
    throw new Error('No response from Gemini API');
  }

  return this._parseAnalysisResponse(response, validCategories);
}
```

## Testing Strategy
- Unit test with mocked Gemini SDK client
- Test with various prompt types
- Verify JSON response format
- Test Gemini-specific error conditions
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
- TASK-004: AnthropicProvider implementation
- TASK-005: Prompt building helper
- TASK-006: Response parsing helper

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.5.2
- Google Generative AI SDK docs
- Memory: `llm_sdk_upgrade_project_complete_merged`
