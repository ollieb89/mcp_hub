# TASK-007: Add Fallback and Retry Logic

## Status
- **Current**: TODO
- **Assigned**: AI Engineer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 1 - LLM Provider Enhancement

## Description
Create `analyzePromptWithFallback()` method that wraps `analyzePrompt()` with retry logic and heuristic keyword-based fallback.

## Context
LLM APIs can fail or timeout. Providing graceful degradation with keyword matching ensures the feature works even when LLM is unavailable.

## Dependencies
- **Blocks**: TASK-008 (should be called from handleAnalyzePrompt)
- **Requires**: TASK-001, TASK-002, TASK-003, TASK-004

## Acceptance Criteria
- [ ] `analyzePromptWithFallback()` method added to base class
- [ ] Implements 3 retry attempts with exponential backoff
- [ ] Falls back to keyword matching after retries exhausted
- [ ] Validates prompt is non-empty before attempting
- [ ] Returns meta category for empty prompts
- [ ] Logs retry attempts and fallback activation
- [ ] Maintains consistent return type
- [ ] Documented with JSDoc comments

## Implementation Details

### File Location
`src/utils/llm-provider.js` (LLMProvider base class)

### Code Template
```javascript
/**
 * Analyze prompt with retry logic and heuristic fallback
 * @param {string} prompt - User's request
 * @param {string} [context] - Optional conversation context
 * @param {string[]} validCategories - Valid category names
 * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
 */
async analyzePromptWithFallback(prompt, context, validCategories) {
  // Validation
  if (!prompt || prompt.trim().length === 0) {
    return {
      categories: ['meta'],
      confidence: 0.0,
      reasoning: 'Empty prompt provided'
    };
  }

  // Try LLM with retries
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const analysis = await this.analyzePrompt(prompt, context, validCategories);

      // Log successful analysis
      if (attempt > 0) {
        logger.info({ attempt: attempt + 1 }, 'LLM analysis succeeded after retry');
      }

      return analysis;
    } catch (error) {
      lastError = error;
      logger.warn({
        attempt: attempt + 1,
        error: error.message
      }, 'LLM analysis attempt failed');

      if (attempt < 2) {
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed, use heuristic fallback
  logger.warn({
    error: lastError?.message
  }, 'LLM analysis failed, using heuristic fallback');

  return this._heuristicFallback(prompt, validCategories);
}

/**
 * Keyword-based category inference fallback
 * @protected
 */
_heuristicFallback(prompt, validCategories) {
  const lowerPrompt = prompt.toLowerCase();
  const matched = new Set();

  const keywords = {
    github: ['github', 'pull request', 'pr', 'issue', 'repository', 'repo', 'commit'],
    filesystem: ['file', 'directory', 'folder', 'path', 'read', 'write', 'list'],
    web: ['http', 'url', 'website', 'fetch', 'download', 'scrape'],
    docker: ['docker', 'container', 'image', 'build', 'run'],
    git: ['git', 'branch', 'merge', 'clone', 'push', 'pull'],
    python: ['python', 'py', 'pip', 'pytest', 'test'],
    database: ['database', 'db', 'sql', 'query', 'table', 'postgres', 'mysql'],
    memory: ['remember', 'recall', 'memory', 'store', 'save'],
    vertex_ai: ['vertex', 'ai', 'model', 'prediction', 'training']
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (!validCategories.includes(category)) continue;
    if (words.some(word => lowerPrompt.includes(word))) {
      matched.add(category);
    }
  }

  // Default to meta if no matches
  if (matched.size === 0) {
    matched.add('meta');
  }

  return {
    categories: Array.from(matched),
    confidence: 0.6, // Medium confidence for heuristic
    reasoning: 'Determined via keyword matching (LLM unavailable)'
  };
}
```

## Testing Strategy
- Unit test retry logic with mocked failures
- Test exponential backoff timing
- Test fallback activation
- Test keyword matching accuracy
- Test empty prompt handling
- Integration test with real LLM failures

## Success Metrics
- Retries work correctly (3 attempts)
- Exponential backoff delays correct
- Fallback provides reasonable categories
- No unhandled exceptions
- Graceful degradation maintains UX

## Rollback Plan
- Revert to direct `analyzePrompt()` calls
- Return error instead of fallback

## Related Tasks
- TASK-001: Base method definition
- TASK-002, TASK-003, TASK-004: Provider implementations
- TASK-008: handleAnalyzePrompt (caller)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 2.4
- Retry pattern best practices
