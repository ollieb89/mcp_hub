# Analyze Prompt Tool - Comprehensive Implementation Plan

**Date**: 2025-11-07
**Status**: Architecture Complete - Ready for Implementation
**Goal**: Make `hub__analyze_prompt` properly analyze user NLP input and activate relevant MCP server tools

---

## Executive Summary

The `hub__analyze_prompt` meta-tool currently has critical bugs preventing it from properly exposing tools based on user prompts. This plan provides a complete solution combining:

1. **AI Engineer**: LLM integration fixes and robust prompt engineering
2. **Frontend Architect**: Tool exposure protocol and session management
3. **Frontend Developer**: Testing infrastructure and debugging system

**Key Issues Identified:**
- ❌ LLM method mismatch (`generateResponse()` doesn't exist)
- ❌ Tool categorization works but tools aren't actually exposed to clients
- ❌ No integration between `updateClientTools()` and `tools/list` handler
- ⚠️ Fragile JSON parsing and weak error handling

**Solution Approach:**
- ✅ Add `analyzePrompt()` method to LLMProvider with robust implementation
- ✅ Integrate session-based filtering into `tools/list` handler
- ✅ Implement additive exposure mode with proper notifications
- ✅ Create comprehensive testing and debugging infrastructure

---

## Table of Contents

1. [Problem Analysis](#1-problem-analysis)
2. [LLM Integration Design](#2-llm-integration-design)
3. [Tool Exposure Protocol](#3-tool-exposure-protocol)
4. [Implementation Plan](#4-implementation-plan)
5. [Testing Strategy](#5-testing-strategy)
6. [Configuration Guide](#6-configuration-guide)
7. [Deployment Plan](#7-deployment-plan)

---

## 1. Problem Analysis

### 1.1 Current Implementation Issues

**File: `src/mcp/server.js:433-514` (`handleAnalyzePrompt`)**

```javascript
// ❌ CURRENT BROKEN CODE
async handleAnalyzePrompt(args, sessionId) {
  // Bug 1: Method doesn't exist on LLMProvider
  const response = await this.filteringService.llmClient.generateResponse(analysisPrompt);

  // Bug 2: Fragile regex-based JSON extraction
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  analysis = JSON.parse(jsonMatch[0]);

  // Bug 3: Updates session categories but tools/list doesn't read them
  await this.updateClientTools(sessionId, analysis.categories, false);
}
```

**Problems:**
1. **API Mismatch**: LLMProvider only has `categorize()` method, not `generateResponse()`
2. **Parsing Fragility**: Regex JSON extraction fails on markdown/extra text
3. **Critical Gap**: `updateClientTools()` sets categories in session but `tools/list` handler never checks them

**File: `src/mcp/server.js:289-316` (`updateClientTools`)**

```javascript
// ⚠️ INCOMPLETE IMPLEMENTATION
async updateClientTools(sessionId, categories, additive = false) {
  session.exposedCategories = new Set(['meta', ...categories]);

  // ✅ Sends notification (correct)
  await client.server.sendToolListChanged();

  // ❌ But tools/list handler doesn't filter based on exposedCategories!
}
```

### 1.2 Root Cause Analysis

**The Missing Link:**
```
User prompt → LLM analysis → Categories identified → Session state updated
                                                           ↓
                                                    (MISSING STEP)
                                                           ↓
Client calls tools/list → Returns ALL tools (doesn't check session.exposedCategories)
```

**What Should Happen:**
```
User prompt → LLM analysis → Categories identified → Session state updated
                                                           ↓
                                            tools/list checks session state
                                                           ↓
Client calls tools/list → Returns ONLY tools matching exposedCategories
```

---

## 2. LLM Integration Design

### 2.1 API Interface

**Add to `src/utils/llm-provider.js` - LLMProvider base class:**

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

/**
 * Internal method for generating LLM content (provider-specific)
 * @protected
 */
async _generateContent(prompt) {
  throw new Error('Must implement _generateContent() method');
}
```

### 2.2 Improved Prompt Engineering

**Key Improvements:**
- Few-shot examples for clarity
- Confidence calibration guidelines
- Category descriptions
- Edge case handling (vague prompts, multi-category needs)

**Implementation:**

```javascript
/**
 * Build prompt for analyzing user intent
 * @private
 */
_buildAnalysisPrompt(userPrompt, context, validCategories) {
  return `You are an expert at analyzing user requests and mapping them to relevant tool categories.

USER REQUEST: "${userPrompt}"
${context ? `CONTEXT: ${context}` : ''}

AVAILABLE CATEGORIES:
${validCategories.map(cat => `- ${cat}: ${this._getCategoryDescription(cat)}`).join('\n')}

CONFIDENCE GUIDELINES:
- 0.9-1.0: Very clear, specific request with obvious category match
- 0.7-0.9: Clear request, confident category selection
- 0.5-0.7: Somewhat ambiguous, reasonable category inference
- 0.0-0.5: Vague or unclear request, low confidence in categorization

EXAMPLES:

Example 1:
Request: "Check my GitHub notifications and list recent issues"
Response: {"categories": ["github"], "confidence": 0.95, "reasoning": "Clear GitHub-specific operations"}

Example 2:
Request: "Read config.json and push changes to my repository"
Response: {"categories": ["filesystem", "git"], "confidence": 0.9, "reasoning": "File reading requires filesystem, pushing requires git operations"}

Example 3:
Request: "Help me with my project"
Response: {"categories": ["meta"], "confidence": 0.3, "reasoning": "Request too vague, suggesting meta-tools for clarification"}

IMPORTANT:
- Respond with ONLY valid JSON
- Use only categories from the list above
- If request is too vague, return ["meta"] with low confidence
- Multiple categories are encouraged when appropriate

Respond with a JSON object in this exact format:
{
  "categories": ["category1", "category2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;
}

_getCategoryDescription(category) {
  const descriptions = {
    github: 'GitHub repository management, issues, PRs, notifications',
    filesystem: 'File operations, reading/writing files, directory management',
    web: 'Web browsing, fetching web content, HTTP requests',
    docker: 'Container management, Docker operations',
    git: 'Git operations (local), commits, branches, diffs',
    python: 'Python environment management, package operations',
    database: 'Database operations, queries, data management',
    memory: 'Knowledge management, information storage and retrieval',
    vertex_ai: 'AI-assisted development tasks, code generation',
    meta: 'MCP Hub meta-tools, configuration, help'
  };
  return descriptions[category] || 'General tools';
}
```

### 2.3 Robust Response Parsing

**Multi-Step Validation:**

```javascript
/**
 * Parse and validate LLM response with comprehensive error handling
 * @private
 */
_parseAnalysisResponse(response, validCategories) {
  // Step 1: Extract JSON from response (handles markdown, extra text)
  let jsonText = response.trim();

  // Remove markdown code blocks
  jsonText = jsonText.replace(/^```(?:json)?\s*\n?/m, '')
                     .replace(/\n?```\s*$/m, '');

  // Find JSON object (supports nested braces)
  const jsonMatch = jsonText.match(/\{(?:[^{}]|(\{(?:[^{}]|(\{[^{}]*\}))*\}))*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  // Step 2: Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  // Step 3: Validate structure
  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error('Response missing "categories" array');
  }

  if (typeof parsed.confidence !== 'number') {
    parsed.confidence = parseFloat(parsed.confidence) || 0.5;
  }

  if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
    parsed.reasoning = 'No reasoning provided';
  }

  // Step 4: Validate and sanitize categories
  const validatedCategories = parsed.categories
    .map(cat => String(cat).toLowerCase().trim())
    .filter(cat => validCategories.includes(cat));

  // If all categories were invalid, fall back to meta
  if (validatedCategories.length === 0 && parsed.categories.length > 0) {
    logger.warn('All LLM-suggested categories were invalid', {
      suggested: parsed.categories,
      valid: validCategories
    });
    validatedCategories.push('meta');
    parsed.confidence = Math.min(parsed.confidence, 0.3);
  }

  // Step 5: Clamp confidence to valid range
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

  return {
    categories: validatedCategories,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning.substring(0, 500)
  };
}
```

### 2.4 Error Handling & Fallback

**Comprehensive Strategy:**

```javascript
/**
 * Analyze prompt with retry logic and heuristic fallback
 */
async analyzePromptWithFallback(prompt, context, validCategories) {
  // Validation
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      categories: ['meta'],
      confidence: 0.0,
      reasoning: 'Empty or invalid prompt'
    };
  }

  // Try LLM analysis with retries
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);
      const rawResponse = await this._generateContent(analysisPrompt);
      const analysis = this._parseAnalysisResponse(rawResponse, validCategories);

      logger.info('LLM prompt analysis successful', {
        categories: analysis.categories,
        confidence: analysis.confidence,
        attempt: attempt + 1
      });

      return analysis;

    } catch (error) {
      lastError = error;
      logger.warn(`Prompt analysis attempt ${attempt + 1} failed: ${error.message}`);

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed - use heuristic fallback
  logger.error('LLM prompt analysis failed, using heuristic fallback');
  return this._heuristicFallback(prompt, validCategories);
}

/**
 * Keyword-based heuristic fallback
 * @private
 */
_heuristicFallback(prompt, validCategories) {
  const lowerPrompt = prompt.toLowerCase();
  const categories = [];

  const keywordMap = {
    github: ['github', 'repository', 'repo', 'issue', 'pr', 'pull request'],
    filesystem: ['file', 'read', 'write', 'directory', 'folder', 'save'],
    web: ['web', 'http', 'fetch', 'download', 'url', 'website'],
    docker: ['docker', 'container', 'image'],
    git: ['git', 'commit', 'branch', 'merge', 'push', 'pull'],
    database: ['database', 'sql', 'query', 'table'],
    memory: ['remember', 'save', 'recall', 'memory'],
    python: ['python', 'pip', 'package']
  };

  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (validCategories.includes(category)) {
      if (keywords.some(kw => lowerPrompt.includes(kw))) {
        categories.push(category);
      }
    }
  }

  if (categories.length === 0) {
    categories.push('meta');
  }

  return {
    categories,
    confidence: 0.4,
    reasoning: 'LLM unavailable, used keyword-based heuristic matching'
  };
}
```

### 2.5 Provider Implementations

**OpenAI Provider:**

```javascript
// src/utils/llm-provider.js - OpenAIProvider

async analyzePrompt(prompt, context, validCategories) {
  const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

  try {
    const completion = await this.client.chat.completions.create({
      model: this.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert at analyzing user requests. Respond with ONLY valid JSON.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    return this._parseAnalysisResponse(response, validCategories);

  } catch (error) {
    logger.error('OpenAI prompt analysis failed', { error: error.message });
    throw error;
  }
}
```

**Gemini Provider:**

```javascript
// src/utils/llm-provider.js - GeminiProvider

async analyzePrompt(prompt, context, validCategories) {
  const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

  try {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 150,
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = response.text();

    return this._parseAnalysisResponse(text, validCategories);

  } catch (error) {
    logger.error('Gemini prompt analysis failed', { error: error.message });
    throw error;
  }
}
```

---

## 3. Tool Exposure Protocol

### 3.1 Complete Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Initial Connection                                         │
└─────────────────────────────────────────────────────────────────────┘

Client connects to /mcp
    │
    ├─> Session initialized (sessionId generated)
    │   - exposedCategories = Set(['meta']) (meta-only default)
    │
    └─> Client calls tools/list
        │
        └─> Server filters based on session.exposedCategories
            - Returns ONLY hub__analyze_prompt (meta category)

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Dynamic Tool Exposure via Prompt Analysis                 │
└─────────────────────────────────────────────────────────────────────┘

User makes request: "Check my GitHub notifications"
    │
    ├─> Client calls hub__analyze_prompt({ prompt: "...", context: "..." })
    │   │
    │   ├─> LLM analyzes prompt
    │   │   - Identifies categories: ['github']
    │   │   - Calculates confidence: 0.98
    │   │
    │   ├─> updateClientTools(sessionId, categories, 'additive')
    │   │   - session.exposedCategories.add('github')
    │   │   - Now contains: ['meta', 'github']
    │   │
    │   ├─> Send tools/list_changed notification
    │   │
    │   └─> Return analysis result
    │
    ├─> Client receives tools/list_changed notification
    │   │
    │   └─> Client MUST call tools/list (MCP spec requirement)
    │
    └─> Client calls tools/list
        │
        └─> Server filters tools by session.exposedCategories
            - Returns: meta tools + github tools
            - Client proceeds with original request
```

### 3.2 Session State Management

**Session Structure:**

```javascript
// src/mcp/server.js
class MCPServerEndpoint {
  initializeSession(sessionId, transport) {
    const defaultExposure = this.config.toolFiltering?.promptBasedFiltering?.defaultExposure || 'meta-only';

    const sessionState = {
      sessionId,
      transport,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),

      // Tool exposure state
      exposedCategories: new Set(defaultExposure === 'meta-only' ? ['meta'] : []),
      exposureMode: 'additive',
      exposureHistory: [], // Track changes for debugging

      // Reconnection handling
      reconnectionToken: null,
      persistent: false
    };

    this.sessions.set(sessionId, sessionState);
    return sessionState;
  }
}
```

### 3.3 Critical Implementation: Modified `tools/list` Handler

**THE KEY FIX - This is what's currently missing:**

```javascript
// src/mcp/server.js - CRITICAL MODIFICATION

async handleToolsList(request) {
  const sessionId = this.getSessionId(request);
  const session = this.sessions.get(sessionId);

  if (!session) {
    throw new Error('Session not found. Client must reconnect.');
  }

  this.updateSessionActivity(sessionId);

  const promptBasedEnabled = this.config.toolFiltering?.promptBasedFiltering?.enabled;

  let toolsToExpose;

  if (promptBasedEnabled) {
    // ✅ NEW: Filter by session categories
    toolsToExpose = this.filterToolsBySessionCategories(session);

    logger.debug({
      sessionId,
      exposedCategories: Array.from(session.exposedCategories),
      toolCount: toolsToExpose.length
    }, 'Filtered tools by session categories');

  } else {
    // Existing behavior: return all tools
    toolsToExpose = Array.from(this.allCapabilities.tools.values());
  }

  return {
    tools: toolsToExpose.map(tool => ({
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.definition.inputSchema
    }))
  };
}

/**
 * Filter tools based on session's exposed categories
 * @private
 */
filterToolsBySessionCategories(session) {
  const { exposedCategories } = session;
  const allTools = Array.from(this.allCapabilities.tools.values());

  if (exposedCategories.size === 0) {
    return []; // Zero-default: no tools
  }

  return allTools.filter(tool => {
    const toolCategory = tool.category || this.inferToolCategory(tool);
    return exposedCategories.has(toolCategory);
  });
}

/**
 * Extract category from namespaced tool name
 * @private
 */
inferToolCategory(tool) {
  // Example: "github__search" -> "github"
  const match = tool.definition.name.match(/^([^_]+)__/);
  return match ? match[1] : 'uncategorized';
}
```

### 3.4 Updated `updateClientTools` Method

```javascript
// src/mcp/server.js - Enhanced version

async updateClientTools(sessionId, categories, mode = 'additive') {
  const session = this.sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const addedCategories = [];

  if (mode === 'additive') {
    // Add to existing categories
    for (const cat of categories) {
      if (!session.exposedCategories.has(cat)) {
        session.exposedCategories.add(cat);
        addedCategories.push(cat);
      }
    }
  } else if (mode === 'replacement') {
    // Replace all categories
    session.exposedCategories = new Set(categories);
    addedCategories.push(...categories);
  }

  // Track exposure history for debugging
  session.exposureHistory.push({
    timestamp: Date.now(),
    operation: mode,
    addedCategories,
    totalCategories: Array.from(session.exposedCategories)
  });

  // Send notification if categories changed
  if (addedCategories.length > 0) {
    await this.sendToolsChangedNotification(sessionId, addedCategories, mode);
  }

  logger.info(`Updated client ${sessionId} tool exposure: ${Array.from(session.exposedCategories).join(', ')}`);

  return {
    added: addedCategories,
    total: Array.from(session.exposedCategories)
  };
}

/**
 * Send MCP tools/list_changed notification
 * @private
 */
async sendToolsChangedNotification(sessionId, addedCategories, mode) {
  const session = this.sessions.get(sessionId);
  const client = this.clients.get(sessionId);

  if (client && client.server) {
    try {
      await client.server.sendToolListChanged();

      logger.debug({
        sessionId,
        addedCategories,
        totalCategories: session.exposedCategories.size
      }, 'Sent tools/list_changed notification');
    } catch (error) {
      logger.error(`Failed to send tool list notification to ${sessionId}:`, error);
    }
  }
}
```

### 3.5 Fixed `handleAnalyzePrompt` Method

**Complete Implementation:**

```javascript
// src/mcp/server.js - MCPServerEndpoint.handleAnalyzePrompt()

async handleAnalyzePrompt(args, sessionId) {
  const { prompt, context } = args;

  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Invalid prompt',
          details: 'Prompt must be a non-empty string',
          categories: ['meta'],
          confidence: 0.0,
          reasoning: 'Empty or invalid prompt provided'
        })
      }]
    };
  }

  // Check if LLM is available
  if (!this.filteringService || !this.filteringService.llmClient) {
    const heuristicResult = this._heuristicPromptAnalysis(prompt);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...heuristicResult,
          warning: 'LLM-based analysis not available',
          suggestion: 'Configure toolFiltering.llmCategorization in config'
        })
      }]
    };
  }

  try {
    const validCategories = ['github', 'filesystem', 'web', 'docker', 'git',
                             'python', 'database', 'memory', 'vertex_ai', 'meta'];

    // Call LLM with fallback handling (uses new analyzePromptWithFallback method)
    const analysis = await this.filteringService.llmClient.analyzePromptWithFallback(
      prompt,
      context,
      validCategories
    );

    // Handle low confidence
    const enhancedAnalysis = this._handleLowConfidenceAnalysis(analysis);

    // ✅ KEY FIX: Update client tools based on analysis
    if (enhancedAnalysis.categories && enhancedAnalysis.categories.length > 0) {
      await this.updateClientTools(sessionId, enhancedAnalysis.categories, 'additive');
    }

    logger.info('Prompt analysis completed', {
      sessionId,
      categories: enhancedAnalysis.categories,
      confidence: enhancedAnalysis.confidence
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...enhancedAnalysis,
          message: `Updated tool exposure: ${enhancedAnalysis.categories.join(', ')}`,
          nextStep: this._getNextStepGuidance(enhancedAnalysis)
        })
      }]
    };

  } catch (error) {
    logger.error('Error in analyze_prompt meta-tool', {
      error: error.message,
      sessionId
    });

    // Return heuristic fallback on complete failure
    const fallback = this._heuristicPromptAnalysis(prompt);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...fallback,
          error: 'LLM analysis failed',
          details: error.message,
          warning: 'Using basic keyword matching instead'
        })
      }]
    };
  }
}

/**
 * Get next step guidance based on analysis confidence
 * @private
 */
_getNextStepGuidance(analysis) {
  if (analysis.confidence >= 0.7) {
    return 'Tools list has been updated. Proceed with your request using the newly available tools.';
  }

  if (analysis.confidence >= 0.5) {
    return 'Tools list updated with moderate confidence. You may want to refine your request for better tool selection.';
  }

  return 'Low confidence in tool selection. Consider providing more specific details, or use meta-tools for assistance.';
}

/**
 * Simple heuristic prompt analysis (fallback)
 * @private
 */
_heuristicPromptAnalysis(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const categories = [];

  const keywordMap = {
    github: ['github', 'repository', 'repo', 'issue', 'pr'],
    filesystem: ['file', 'read', 'write', 'directory', 'save'],
    web: ['web', 'http', 'fetch', 'download', 'url'],
    docker: ['docker', 'container'],
    git: ['git', 'commit', 'branch', 'push'],
    database: ['database', 'sql', 'query'],
    memory: ['remember', 'memory'],
    python: ['python', 'pip']
  };

  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => lowerPrompt.includes(kw))) {
      categories.push(category);
    }
  }

  if (categories.length === 0) {
    categories.push('meta');
  }

  return {
    categories,
    confidence: 0.4,
    reasoning: 'Basic keyword-based analysis (LLM not available)'
  };
}

/**
 * Handle low confidence analysis results
 * @private
 */
_handleLowConfidenceAnalysis(analysis) {
  if (analysis.confidence < 0.5) {
    return {
      ...analysis,
      warning: 'Low confidence in category selection',
      suggestion: 'Consider providing more specific details about your request',
      categories: ['meta', ...analysis.categories.filter(c => c !== 'meta')]
    };
  }

  return analysis;
}
```

---

## 4. Implementation Plan

### Phase 1: LLM Provider Enhancement (Day 1 - 4 hours)

**Hour 1-2: Add `analyzePrompt()` method**
- [ ] Add base method to `LLMProvider` class
- [ ] Implement in `OpenAIProvider`
- [ ] Implement in `GeminiProvider`
- [ ] Implement in `AnthropicProvider`
- [ ] Add `_buildAnalysisPrompt()` helper
- [ ] Add `_getCategoryDescription()` helper

**Hour 2-3: Response parsing and validation**
- [ ] Implement `_parseAnalysisResponse()` with multi-step validation
- [ ] Add JSON extraction logic (handles markdown)
- [ ] Add category validation and sanitization
- [ ] Add confidence clamping

**Hour 3-4: Error handling and fallback**
- [ ] Implement `analyzePromptWithFallback()` with retry logic
- [ ] Implement `_heuristicFallback()` keyword matching
- [ ] Add comprehensive error logging
- [ ] Test with various failure scenarios

### Phase 2: Tool Exposure Protocol (Day 1-2 - 6 hours)

**Hour 1-2: Session management**
- [ ] Update session initialization in `MCPServerEndpoint`
- [ ] Add `exposedCategories` Set to session state
- [ ] Add `exposureHistory` tracking
- [ ] Implement session activity tracking
- [ ] Add session cleanup logic

**Hour 2-4: Critical `tools/list` modification**
- [ ] Modify `handleToolsList()` to check session state
- [ ] Implement `filterToolsBySessionCategories()` method
- [ ] Implement `inferToolCategory()` helper
- [ ] Add debug logging for tool filtering
- [ ] Test filtering with various category combinations

**Hour 4-5: Enhanced `updateClientTools`**
- [ ] Refactor to support both additive and replacement modes
- [ ] Add exposure history tracking
- [ ] Improve notification sending
- [ ] Add validation for invalid categories

**Hour 5-6: Fixed `handleAnalyzePrompt`**
- [ ] Update to use new `analyzePromptWithFallback()` method
- [ ] Add input validation
- [ ] Implement `_handleLowConfidenceAnalysis()`
- [ ] Implement `_getNextStepGuidance()`
- [ ] Implement `_heuristicPromptAnalysis()`

### Phase 3: Testing Infrastructure (Day 2 - 4 hours)

**Hour 1-2: Unit tests**
- [ ] Test LLM prompt analysis with mocked providers
- [ ] Test response parsing edge cases
- [ ] Test heuristic fallback logic
- [ ] Test session filtering logic

**Hour 2-3: Integration tests**
- [ ] End-to-end flow: connect → analyze → tools/list
- [ ] Multi-client session isolation
- [ ] Additive vs replacement mode
- [ ] Error scenarios and fallbacks

**Hour 3-4: Manual testing tools**
- [ ] Create `scripts/test-analyze-prompt.sh`
- [ ] Add debug logging points
- [ ] Create validation commands
- [ ] Document testing procedures

### Phase 4: Documentation (Day 2 - 2 hours)

- [ ] Update README with prompt-based filtering section
- [ ] Create configuration examples
- [ ] Write troubleshooting guide
- [ ] Update API documentation

---

## 5. Testing Strategy

### 5.1 Automated Testing

**Unit Tests: `tests/llm-provider-analyze.test.js`**

```javascript
describe('LLMProvider.analyzePrompt()', () => {
  test('Extracts categories from clear prompt', async () => {
    const analysis = await provider.analyzePrompt(
      'Check my GitHub notifications',
      null,
      ['github', 'filesystem', 'web']
    );

    expect(analysis.categories).toContain('github');
    expect(analysis.confidence).toBeGreaterThan(0.8);
  });

  test('Handles vague prompts with low confidence', async () => {
    const analysis = await provider.analyzePrompt(
      'help me',
      null,
      validCategories
    );

    expect(analysis.categories).toContain('meta');
    expect(analysis.confidence).toBeLessThan(0.5);
  });

  test('Falls back to heuristic on LLM failure', async () => {
    mockLLM.mockRejectedValue(new Error('API error'));

    const analysis = await provider.analyzePromptWithFallback(
      'read config.json',
      null,
      validCategories
    );

    expect(analysis.categories).toContain('filesystem');
    expect(analysis.confidence).toBe(0.4);
  });
});
```

**Integration Tests: `tests/prompt-based-filtering.test.js`**

```javascript
describe('Prompt-Based Tool Exposure', () => {
  test('Complete flow: analyze → tools/list', async () => {
    // Initialize session
    const sessionId = 'test-session-1';
    endpoint.initializeSession(sessionId, transport);

    // Initial tools/list (should only have meta)
    let tools = await endpoint.handleToolsList({ sessionId });
    expect(tools.tools).toHaveLength(1);
    expect(tools.tools[0].name).toBe('hub__analyze_prompt');

    // Analyze prompt
    await endpoint.handleAnalyzePrompt({
      prompt: 'Check GitHub issues',
      context: null
    }, sessionId);

    // Re-fetch tools/list (should now include github tools)
    tools = await endpoint.handleToolsList({ sessionId });
    expect(tools.tools.some(t => t.name.startsWith('github__'))).toBe(true);
  });

  test('Session isolation: different clients different tools', async () => {
    const session1 = 'client-1';
    const session2 = 'client-2';

    // Client 1 analyzes for github
    await endpoint.handleAnalyzePrompt({ prompt: 'GitHub issues' }, session1);

    // Client 2 analyzes for docker
    await endpoint.handleAnalyzePrompt({ prompt: 'Docker containers' }, session2);

    // Verify isolation
    const tools1 = await endpoint.handleToolsList({ sessionId: session1 });
    const tools2 = await endpoint.handleToolsList({ sessionId: session2 });

    expect(tools1.tools.some(t => t.name.startsWith('github__'))).toBe(true);
    expect(tools1.tools.some(t => t.name.startsWith('docker__'))).toBe(false);

    expect(tools2.tools.some(t => t.name.startsWith('docker__'))).toBe(true);
    expect(tools2.tools.some(t => t.name.startsWith('github__'))).toBe(false);
  });
});
```

### 5.2 Manual Testing

**Quick Test Script: `scripts/test-analyze-prompt.sh`**

```bash
#!/bin/bash
# Quick validation script for analyze_prompt functionality

SESSION_ID="test-$(date +%s)"
MCP_URL="http://localhost:7000/mcp"

echo "Testing hub__analyze_prompt..."

# 1. Initial tools/list
echo "1. Checking initial tools (should only have meta)..."
INITIAL_TOOLS=$(curl -s "${MCP_URL}?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools | length')

echo "   Initial tool count: ${INITIAL_TOOLS}"

# 2. Call analyze_prompt
echo "2. Analyzing prompt: 'Check my GitHub notifications'..."
ANALYSIS=$(curl -s "${MCP_URL}?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"hub__analyze_prompt",
      "arguments":{"prompt":"Check my GitHub notifications"}
    }
  }')

echo "   Analysis result:"
echo "${ANALYSIS}" | jq '.result.content[0].text | fromjson'

# 3. Re-fetch tools/list
echo "3. Re-fetching tools/list..."
UPDATED_TOOLS=$(curl -s "${MCP_URL}?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/list"}' \
  | jq '.result.tools | length')

echo "   Updated tool count: ${UPDATED_TOOLS}"

# 4. Verify github tools are present
GITHUB_TOOLS=$(curl -s "${MCP_URL}?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/list"}' \
  | jq '.result.tools[] | select(.name | startswith("github__")) | .name')

echo "   GitHub tools exposed:"
echo "${GITHUB_TOOLS}"

# Validation
if [ ${UPDATED_TOOLS} -gt ${INITIAL_TOOLS} ]; then
  echo "✅ SUCCESS: Tool exposure working correctly"
else
  echo "❌ FAILURE: Tools not exposed after analysis"
  exit 1
fi
```

### 5.3 Debug Logging

**Key Checkpoints:**

```javascript
// 1. Meta-tool registration
logger.debug('Registered meta-tool: hub__analyze_prompt');

// 2. Session initialization
logger.debug({
  sessionId,
  exposedCategories: Array.from(session.exposedCategories)
}, 'Session initialized');

// 3. Prompt analysis entry
logger.info({ sessionId, prompt }, 'Starting prompt analysis');

// 4. LLM provider call
logger.debug('Calling LLM for prompt analysis');

// 5. Category analysis result
logger.info({
  categories: analysis.categories,
  confidence: analysis.confidence
}, 'LLM analysis complete');

// 6. Tool exposure update
logger.info({
  sessionId,
  addedCategories,
  totalCategories: session.exposedCategories.size
}, 'Updated tool exposure');

// 7. Client notification
logger.debug({ sessionId }, 'Sent tools/list_changed notification');
```

**Enable debug mode:**

```bash
DEBUG_TOOL_FILTERING=true bun start
```

**Monitor logs:**

```bash
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "analyze_prompt"
```

---

## 6. Configuration Guide

### 6.1 Minimal Configuration

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only"
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  }
}
```

### 6.2 Complete Configuration Options

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",

    "promptBasedFiltering": {
      "enabled": true,

      "defaultExposure": "meta-only",
      // Options: "zero", "meta-only", "minimal", "all"

      "exposureMode": "additive",
      // Options: "additive" (progressive), "replacement" (reset on each analysis)

      "sessionIsolation": true,
      // Per-client tool exposure (true) or global (false)

      "enableMetaTools": true
      // Always expose meta-tools regardless of analysis
    },

    "llmCategorization": {
      "enabled": true,

      "provider": "gemini",
      // Options: "openai", "anthropic", "gemini"

      "apiKey": "${env:GEMINI_API_KEY}",
      // Environment variable resolution supported

      "model": "gemini-2.5-flash",
      // Provider-specific model selection

      "maxRetries": 3,
      // Number of retry attempts on LLM failure

      "timeout": 30000
      // LLM request timeout in milliseconds
    }
  }
}
```

### 6.3 Environment Variables

```bash
# Required for LLM-based analysis
export GEMINI_API_KEY="your-api-key-here"

# OR for OpenAI
export OPENAI_API_KEY="sk-your-api-key"

# OR for Anthropic
export ANTHROPIC_API_KEY="sk-ant-your-api-key"

# Optional: Enable debug logging
export DEBUG_TOOL_FILTERING=true
```

---

## 7. Deployment Plan

### 7.1 Pre-Deployment Checklist

- [ ] All unit tests passing (23/23)
- [ ] Integration tests passing (end-to-end flow)
- [ ] Manual testing completed (scripts/test-analyze-prompt.sh)
- [ ] Debug logging validated
- [ ] Configuration examples tested
- [ ] Documentation updated

### 7.2 Rollout Strategy

**Phase 1: Opt-In Beta (Week 1)**
- Deploy with `promptBasedFiltering.enabled: false` by default
- Users opt-in via configuration
- Monitor logs for issues
- Gather user feedback

**Phase 2: Default Enabled (Week 2)**
- Change default to `enabled: true`
- Provide clear migration guide
- Monitor performance metrics
- Address any issues

**Phase 3: Optimization (Week 3+)**
- Analyze LLM performance metrics
- Optimize prompt templates based on real usage
- Add additional categories as needed
- Improve heuristic fallback based on patterns

### 7.3 Monitoring Metrics

**Key Performance Indicators:**

```javascript
{
  "prompt_analysis": {
    "total_calls": 1523,
    "average_latency_ms": 1200,
    "llm_success_rate": 0.97,
    "heuristic_fallback_rate": 0.03,
    "average_confidence": 0.85
  },
  "tool_exposure": {
    "average_categories_per_session": 2.3,
    "most_common_categories": ["filesystem", "github", "web"],
    "session_isolation_violations": 0
  },
  "error_rates": {
    "llm_failures": 0.02,
    "parsing_errors": 0.01,
    "session_not_found": 0.00
  }
}
```

### 7.4 Rollback Plan

If critical issues are discovered:

1. **Immediate**: Set `promptBasedFiltering.enabled: false` in config
2. **Restart**: `bun start` (applies new config)
3. **Revert**: Git revert to previous version if needed
4. **Notify**: Alert users via GitHub issue/discussion

**No data loss**: All changes are in-memory session state, no persistent data affected.

---

## 8. Success Criteria

### 8.1 Functional Requirements

- ✅ `hub__analyze_prompt` correctly analyzes user prompts
- ✅ LLM determines appropriate tool categories with >80% accuracy
- ✅ `tools/list` returns ONLY tools matching session's exposed categories
- ✅ Session isolation: different clients have independent tool exposure
- ✅ Additive mode: progressively expands tool access
- ✅ Heuristic fallback: works without LLM when configured

### 8.2 Performance Requirements

- ✅ LLM analysis completes in <2000ms (p95)
- ✅ Tool exposure update <10ms
- ✅ Total end-to-end flow <3000ms
- ✅ No memory leaks with long-running sessions
- ✅ Handles 100+ concurrent sessions

### 8.3 Quality Requirements

- ✅ 100% test coverage for critical paths
- ✅ Comprehensive error handling (no unhandled rejections)
- ✅ Debug logging at all key decision points
- ✅ Clear user-facing error messages
- ✅ Documentation complete and accurate

---

## 9. Next Steps

### Immediate Actions (Today)

1. **Review Plan**: Get stakeholder approval on architecture
2. **Set Up Environment**: Ensure GEMINI_API_KEY available for testing
3. **Create Branch**: `git checkout -b fix/analyze-prompt-tool-activation`

### Day 1: Implementation

1. **Morning**: Implement LLM provider enhancements (Phase 1)
2. **Afternoon**: Implement tool exposure protocol (Phase 2)
3. **Evening**: Create automated tests

### Day 2: Testing & Documentation

1. **Morning**: Integration testing and manual validation
2. **Afternoon**: Documentation and configuration examples
3. **Evening**: Create PR with comprehensive description

### Day 3: Review & Deploy

1. **Morning**: Code review and address feedback
2. **Afternoon**: Merge and deploy to staging
3. **Evening**: Monitor metrics and user feedback

---

## Appendix A: File Modifications Summary

### Modified Files

1. **`src/utils/llm-provider.js`**
   - Add `analyzePrompt()` to base class
   - Add `analyzePromptWithFallback()` wrapper
   - Implement in OpenAIProvider, GeminiProvider, AnthropicProvider
   - Add prompt building and parsing helpers

2. **`src/mcp/server.js`**
   - Modify `handleToolsList()` to filter by session categories
   - Add `filterToolsBySessionCategories()` method
   - Add `inferToolCategory()` helper
   - Update `updateClientTools()` with additive/replacement modes
   - Fix `handleAnalyzePrompt()` to use new LLM method
   - Add helper methods for low confidence and heuristic analysis

3. **`tests/llm-provider-analyze.test.js`** (NEW)
   - Unit tests for `analyzePrompt()` method
   - Response parsing tests
   - Error handling and fallback tests

4. **`tests/prompt-based-filtering.test.js`** (NEW)
   - Integration tests for complete flow
   - Session isolation tests
   - Multi-client tests

5. **`scripts/test-analyze-prompt.sh`** (NEW)
   - Automated validation script
   - Quick sanity check for deployments

6. **`claudedocs/TESTING_ANALYZE_PROMPT.md`** (NEW)
   - Comprehensive testing guide
   - Debug logging documentation
   - Troubleshooting guide

---

## Appendix B: Troubleshooting Guide

### Issue: Meta-tool not appearing in tools/list

**Symptoms**: `hub__analyze_prompt` not available to client

**Solution**:
1. Check configuration: `mode: "prompt-based"` must be set
2. Verify `promptBasedFiltering.enabled: true`
3. Check logs: `grep "Registered meta-tool" ~/.local/state/mcp-hub/logs/mcp-hub.log`

### Issue: LLM analysis failing

**Symptoms**: Analysis returns error or uses heuristic fallback

**Solution**:
1. Verify API key: `echo $GEMINI_API_KEY` (should not be empty)
2. Check network: `curl https://generativelanguage.googleapis.com`
3. Review logs: `grep "LLM prompt analysis failed" ~/.local/state/mcp-hub/logs/mcp-hub.log`
4. Test with heuristic-only mode to isolate issue

### Issue: Tools not updating after analysis

**Symptoms**: tools/list returns same tools before and after analyze_prompt

**Solution**:
1. Verify notification was sent: `grep "Sent tools/list_changed" logs`
2. Check session state: `grep "Updated tool exposure" logs`
3. Ensure client re-fetches: Client MUST call tools/list after notification
4. Verify filtering is enabled: `promptBasedFiltering.enabled: true`

### Issue: Session isolation not working

**Symptoms**: Different clients see same tool set

**Solution**:
1. Verify configuration: `sessionIsolation: true`
2. Check session IDs: Each client should have unique sessionId
3. Review session state: `grep "Session initialized" logs`

---

## Conclusion

This comprehensive plan provides a complete solution to fix the `hub__analyze_prompt` meta-tool, enabling proper NLP-based tool activation for MCP Hub. The architecture has been validated by specialist agents (AI Engineer, Frontend Architect, Frontend Developer) and includes:

✅ **LLM Integration**: Robust prompt engineering with fallback strategies
✅ **Tool Exposure Protocol**: Session-based filtering with proper notifications
✅ **Testing Infrastructure**: Automated tests and manual validation tools
✅ **Documentation**: Complete guides for developers and users

**Estimated Implementation Time**: 2-3 days
**Risk Level**: Low (comprehensive testing, clear rollback plan)
**Impact**: High (enables core prompt-based filtering feature)

Ready to proceed with implementation! 🚀
