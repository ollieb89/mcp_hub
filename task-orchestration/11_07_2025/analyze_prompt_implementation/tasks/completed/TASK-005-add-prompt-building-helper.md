# TASK-005: Add Prompt Building Helper Method

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: HIGH
- **Estimated**: 1 hour
- **Phase**: 1 - LLM Provider Enhancement

## Description
Create `_buildAnalysisPrompt()` helper method that constructs optimized prompts for LLM analysis with few-shot examples.

## Context
Consistent prompt engineering across all providers ensures reliable category identification. Few-shot examples improve accuracy significantly.

## Dependencies
- **Blocks**: TASK-002, TASK-003, TASK-004 (all provider implementations)
- **Requires**: None (can be developed in parallel with TASK-001)

## Acceptance Criteria
- [ ] `_buildAnalysisPrompt(userPrompt, context, validCategories)` method added to base class
- [ ] Protected method (intended for subclass use only)
- [ ] Includes few-shot examples for common categories
- [ ] Clear instructions for JSON format
- [ ] Handles missing/null context gracefully
- [ ] Returns string ready for LLM consumption
- [ ] Documented with JSDoc comments

## Implementation Details

### File Location
`src/utils/llm-provider.js` (LLMProvider base class)

### Code Template
```javascript
/**
 * Build prompt for analyzing user intent
 * @protected
 * @param {string} userPrompt - User's request
 * @param {string} [context] - Optional conversation context
 * @param {string[]} validCategories - Valid category names
 * @returns {string} Formatted prompt for LLM
 */
_buildAnalysisPrompt(userPrompt, context, validCategories) {
  const contextSection = context ? `\nConversation Context: ${context}` : '';

  return `You are an expert at analyzing user requests to determine which tool categories are needed.

USER REQUEST:
"${userPrompt}"${contextSection}

AVAILABLE CATEGORIES:
${validCategories.join(', ')}

EXAMPLES:
1. Request: "Check my GitHub pull requests"
   Response: {"categories": ["github"], "confidence": 0.95, "reasoning": "User needs GitHub tools to check PRs"}

2. Request: "List all Python files and run tests"
   Response: {"categories": ["filesystem", "python"], "confidence": 0.90, "reasoning": "Needs filesystem for listing and python for testing"}

3. Request: "What can you do?"
   Response: {"categories": ["meta"], "confidence": 0.99, "reasoning": "Meta question about capabilities"}

Analyze the user request and respond with ONLY a JSON object:
{
  "categories": ["category1", "category2"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- Only use categories from the AVAILABLE CATEGORIES list
- Include ALL relevant categories (don't under-select)
- Confidence 0.0-1.0 based on clarity of request
- If unclear, default to ["meta"] with low confidence
- Respond with JSON ONLY, no markdown formatting`;
}
```

## Testing Strategy
- Unit test verifies prompt generation
- Test with/without context parameter
- Validate few-shot examples included
- Test with different category lists
- Manual review of generated prompts

## Success Metrics
- LLM providers achieve >85% category identification accuracy
- Confidence scores correlate with actual accuracy
- Few-shot examples improve performance over zero-shot

## Rollback Plan
- Simplify prompt if accuracy regresses
- A/B test prompt variations

## Related Tasks
- TASK-001: Base method definition
- TASK-002: OpenAIProvider (uses this helper)
- TASK-003: GeminiProvider (uses this helper)
- TASK-004: AnthropicProvider (uses this helper)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.2
- Few-shot prompting best practices
