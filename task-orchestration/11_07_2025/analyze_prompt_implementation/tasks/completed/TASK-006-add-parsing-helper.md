# TASK-006: Add Response Parsing Helper Method

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: HIGH
- **Estimated**: 1.5 hours
- **Phase**: 1 - LLM Provider Enhancement

## Description
Create `_parseAnalysisResponse()` helper method that robustly parses and validates LLM responses with multi-step validation.

## Context
Current regex-based parsing fails on markdown code blocks and nested JSON. This task implements comprehensive parsing with fallback strategies.

## Dependencies
- **Blocks**: TASK-002, TASK-003, TASK-004 (all provider implementations)
- **Requires**: None (can be developed in parallel with TASK-001)

## Acceptance Criteria
- [ ] `_parseAnalysisResponse(response, validCategories)` method added to base class
- [ ] Protected method (intended for subclass use only)
- [ ] Handles markdown code blocks (```json ... ```)
- [ ] Handles nested JSON structures correctly
- [ ] Validates response structure
- [ ] Sanitizes category names
- [ ] Provides fallback values for invalid responses
- [ ] Returns normalized object with validated types
- [ ] Documented with JSDoc comments

## Implementation Details

### File Location
`src/utils/llm-provider.js` (LLMProvider base class)

### Code Template
```javascript
/**
 * Parse and validate LLM response
 * @protected
 * @param {string} response - Raw LLM response text
 * @param {string[]} validCategories - Valid category names for validation
 * @returns {{categories: string[], confidence: number, reasoning: string}}
 * @throws {Error} If response cannot be parsed or validated
 */
_parseAnalysisResponse(response, validCategories) {
  // Step 1: Remove markdown code blocks
  let jsonText = response.trim()
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '');

  // Step 2: Extract JSON with nested brace support
  const jsonMatch = jsonText.match(/\{(?:[^{}]|(\{(?:[^{}]|(\{[^{}]*\}))*\}))*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  // Step 3: Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`JSON parse failed: ${error.message}`);
  }

  // Step 4: Validate structure
  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error('Response missing "categories" array');
  }

  // Step 5: Sanitize categories
  const validatedCategories = parsed.categories
    .map(cat => String(cat).toLowerCase().trim())
    .filter(cat => validCategories.includes(cat));

  // Step 6: Fallback to meta if all invalid
  if (validatedCategories.length === 0) {
    validatedCategories.push('meta');
    parsed.confidence = Math.min(parsed.confidence || 0.3, 0.3);
  }

  // Step 7: Normalize confidence
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));

  return {
    categories: validatedCategories,
    confidence,
    reasoning: String(parsed.reasoning || 'No reasoning provided')
  };
}
```

## Testing Strategy
- Unit tests with various JSON formats
- Test markdown code block handling
- Test nested JSON structures
- Test malformed responses
- Test empty/missing fields
- Test invalid category names
- Verify fallback behavior

## Success Metrics
- Parses 100% of valid LLM responses
- Gracefully handles malformed responses
- Always returns valid structure
- No unhandled exceptions in production

## Edge Cases
- Empty response
- Response with only text, no JSON
- Malformed JSON
- Valid JSON, wrong structure
- All categories invalid
- Negative confidence values
- Confidence > 1.0

## Rollback Plan
- Revert to simpler parsing if issues arise
- Enable debug logging to identify failures

## Related Tasks
- TASK-001: Base method definition
- TASK-002: OpenAIProvider (uses this helper)
- TASK-003: GeminiProvider (uses this helper)
- TASK-004: AnthropicProvider (uses this helper)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.3
- Memory: `analyze_prompt_critical_bug_fixes` (Bug #3)
