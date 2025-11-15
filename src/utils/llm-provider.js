import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

/**
 * Abstract base class for LLM providers
 * Provides a common interface for different LLM services to categorize tools
 */
export class LLMProvider {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  /**
   * Categorize a tool using the LLM
   * @param {string} toolName - Name of the tool to categorize
   * @param {object} toolDefinition - Tool definition with description and inputSchema
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<string>} Category name
   */
  async categorize(toolName, toolDefinition, validCategories) { // eslint-disable-line no-unused-vars
    throw new Error('Must implement categorize() method');
  }

  /**
   * Analyze user prompt and determine needed tool categories
   * @param {string} prompt - User's request/prompt to analyze
   * @param {string} [context] - Optional conversation context
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
   */
  async analyzePrompt(prompt, context, validCategories) { // eslint-disable-line no-unused-vars
    throw new Error('Must implement analyzePrompt() method');
  }

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
    const jsonText = response.trim()
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
   * @param {string} prompt - User's request
   * @param {string[]} validCategories - Valid category names
   * @returns {{categories: string[], confidence: number, reasoning: string}}
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
}

/**
 * OpenAI provider implementation using official SDK
 * 
 * Features:
 * - Automatic retry with exponential backoff (3 retries default)
 * - Typed error handling (APIError, RateLimitError, ConnectionError)
 * - Request ID tracking for observability
 * - TypeScript type safety
 * 
 * @see https://github.com/openai/openai-node
 */
export class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    
    // Initialize OpenAI client with retry configuration
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: config.baseURL,  // Optional custom endpoint
      maxRetries: 3,            // Retry transient failures
      timeout: 30000,           // 30 second timeout
    });
  }

  /**
   * Categorize a tool using OpenAI's API (Task 3.2)
   * @param {string} toolName - Name of the tool to categorize
   * @param {object} toolDefinition - Tool definition with description and inputSchema
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<string>} Category name
   */
  async categorize(toolName, toolDefinition, validCategories) {
    const prompt = this._buildPrompt(toolName, toolDefinition, validCategories);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this._buildSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI API');
      }

      return this._parseCategorizationResponse(response, validCategories);
    } catch (error) {
      // Enhanced error handling with typed errors
      if (error instanceof OpenAI.APIError) {
        logger.error(`OpenAI API error: ${error.status} - ${error.message}`, {
          requestId: error.request_id,
          code: error.code,
          type: error.type,
          toolName
        });
      } else if (error instanceof OpenAI.APIConnectionError) {
        logger.error(`OpenAI connection error: ${error.message}`, {
          toolName,
          cause: error.cause
        });
      } else if (error instanceof OpenAI.RateLimitError) {
        logger.warn(`OpenAI rate limit exceeded`, {
          requestId: error.request_id,
          toolName,
          retryAfter: error.headers?.['retry-after']
        });
      } else {
        logger.error(`OpenAI API call failed: ${error.message}`, {
          toolName,
          error: error.stack
        });
      }
      
      throw error;  // Re-throw for upstream handling
    }
  }

  /**
   * Analyze user prompt to determine needed tool categories
   * @param {string} prompt - User's request
   * @param {string} [context] - Optional conversation context
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
   */
  async analyzePrompt(prompt, context, validCategories) {
    const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

    try {
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
    } catch (error) {
      // Enhanced error handling with typed errors
      if (error instanceof OpenAI.APIError) {
        logger.error(`OpenAI API error during prompt analysis: ${error.status} - ${error.message}`, {
          requestId: error.request_id,
          code: error.code,
          type: error.type,
          prompt: prompt.substring(0, 100)
        });
      } else if (error instanceof OpenAI.APIConnectionError) {
        logger.error(`OpenAI connection error during prompt analysis: ${error.message}`, {
          prompt: prompt.substring(0, 100),
          cause: error.cause
        });
      } else if (error instanceof OpenAI.RateLimitError) {
        logger.warn(`OpenAI rate limit exceeded during prompt analysis`, {
          requestId: error.request_id,
          retryAfter: error.headers?.['retry-after']
        });
      } else {
        logger.error(`OpenAI prompt analysis failed: ${error.message}`, {
          error: error.stack,
          prompt: prompt.substring(0, 100)
        });
      }
      
      throw error;  // Re-throw for upstream handling
    }
  }

  /**
   * Build system prompt for categorization (Task 3.2.1)
   * @protected
   * @returns {string} System prompt for categorization
   */
  _buildSystemPrompt() {
    return `You are an expert at categorizing MCP (Model Context Protocol) tools. Analyze tools based on their functionality, naming patterns, and descriptions. Categorize them accurately into the appropriate category.

Your task:
1. Analyze the tool name, description, and schema
2. Match it to one of the valid categories
3. Provide a confidence score (0-1) based on how well it fits the category
4. Return ONLY a valid JSON object with no additional text or markdown

Guidelines:
- filesystem: File operations (read, write, delete, move, copy)
- web: HTTP requests, web scraping, browser automation
- search: Search engines and query tools
- database: Database operations and SQL execution
- version-control: Git, GitHub, GitLab operations
- docker: Container and orchestration tools
- cloud: Cloud provider services (AWS, Azure, GCP)
- development: Build tools, linters, formatters, package managers
- communication: Chat, email, notification systems
- other: Tools that don't fit the above categories

Be precise in your categorization. If uncertain, provide a lower confidence score.`;
  }

  /**
   * Build the prompt for tool categorization (Task 3.2.2)
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Analyze this MCP tool and categorize it accurately.

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'No description provided'}

Valid categories: ${validCategories.join(', ')}

Respond with ONLY a JSON object in this format (no markdown, no extra text):
{"category": "<one of the valid categories>", "confidence": <number between 0 and 1>}

Example: {"category": "filesystem", "confidence": 0.95}`;
  }

  /**
   * Parse categorization response from LLM (Task 3.2.3)
   * @protected
   * @param {string} response - LLM response text
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Validated category name
   */
  _parseCategorizationResponse(response, validCategories) {
    try {
      // Remove markdown code blocks if present
      let jsonText = response.trim()
        .replace(/^```(?:json)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '');

      // Parse JSON
      const parsed = JSON.parse(jsonText);
      const category = String(parsed.category).toLowerCase().trim();
      const confidence = Number(parsed.confidence) || 0.5;

      // Validate category
      if (!validCategories.includes(category)) {
        logger.warn(`Parsed category '${category}' not in valid list, using fallback`);
        return 'other';
      }

      // Validate confidence
      if (confidence < 0 || confidence > 1) {
        logger.warn(`Invalid confidence ${confidence}, clamping to valid range`);
      }

      return category;
    } catch (error) {
      logger.warn(`Failed to parse categorization response: ${error.message}`);
      return 'other';
    }
  }
}

/**
 * Anthropic (Claude) provider implementation using official SDK
 * 
 * Features:
 * - Automatic retry with exponential backoff (3 retries default)
 * - Typed error handling (APIError, RateLimitError, ConnectionError)
 * - Request ID tracking for observability
 * - TypeScript type safety
 * 
 * @see https://github.com/anthropics/anthropic-sdk-typescript
 */
export class AnthropicProvider extends LLMProvider {
  constructor(config) {
    super(config);
    
    // Initialize Anthropic client with retry configuration
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: config.baseURL,
      maxRetries: 3,
      timeout: 30000
    });
    
    this.anthropicVersion = config.anthropicVersion || '2023-06-01';
  }

  /**
   * Categorize a tool using Anthropic's API
   * @param {string} toolName - Name of the tool to categorize
   * @param {object} toolDefinition - Tool definition with description and inputSchema
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<string>} Category name
   */
  async categorize(toolName, toolDefinition, validCategories) {
    const prompt = this._buildPrompt(toolName, toolDefinition, validCategories);

    try {
      const message = await this.client.messages.create({
        model: this.model || 'claude-3-haiku-20240307',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: 'You are a tool categorization expert. Respond with ONLY the category name, nothing else.',
        temperature: 0
      });

      const category = message.content[0]?.text?.trim().toLowerCase();

      // Validate response
      if (!category || !validCategories.includes(category)) {
        logger.warn(`LLM returned invalid category: ${category}, defaulting to 'other'`, {
          toolName,
          validCategories: validCategories.join(', ')
        });
        return 'other';
      }

      return category;
    } catch (error) {
      // Enhanced error handling with typed errors
      if (error instanceof Anthropic.APIError) {
        logger.error(`Anthropic API error: ${error.status} - ${error.message}`, {
          requestId: error.request_id,
          type: error.type,
          toolName
        });
      } else if (error instanceof Anthropic.APIConnectionError) {
        logger.error(`Anthropic connection error: ${error.message}`, {
          toolName,
          cause: error.cause
        });
      } else if (error instanceof Anthropic.RateLimitError) {
        logger.warn(`Anthropic rate limit exceeded`, {
          requestId: error.request_id,
          toolName,
          retryAfter: error.headers?.['retry-after']
        });
      } else {
        logger.error(`Anthropic API call failed: ${error.message}`, {
          toolName,
          error: error.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * Analyze user prompt to determine needed tool categories
   * @param {string} prompt - User's request/prompt to analyze
   * @param {string} [context] - Optional conversation context
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
   */
  async analyzePrompt(prompt, context, validCategories) {
    const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

    try {
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
    } catch (error) {
      // Anthropic-specific error handling
      const errorType = error?.type || error?.error?.type;
      const errorMessage = error?.message || String(error);

      if (errorType === 'authentication_error' || errorMessage.includes('authentication')) {
        logger.error(`Anthropic authentication error during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else if (errorType === 'rate_limit_error' || errorMessage.includes('rate_limit')) {
        logger.warn(`Anthropic rate limit exceeded during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else if (errorType === 'overloaded_error' || errorMessage.includes('overloaded')) {
        logger.warn(`Anthropic API overloaded during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else if (errorType === 'invalid_request_error') {
        logger.error(`Anthropic invalid request during prompt analysis: ${errorMessage}`, {
          prompt: prompt.substring(0, 100)
        });
      } else {
        logger.error(`Anthropic prompt analysis failed: ${errorMessage}`, {
          error: error?.stack,
          prompt: prompt.substring(0, 100)
        });
      }

      throw error;
    }
  }

  /**
   * Build system prompt for categorization (Task 3.2.1)
   * @protected
   * @returns {string} System prompt for categorization
   */
  _buildSystemPrompt() {
    return `You are an expert at categorizing MCP (Model Context Protocol) tools. Analyze tools based on their functionality, naming patterns, and descriptions. Categorize them accurately into the appropriate category.

Your task:
1. Analyze the tool name, description, and schema
2. Match it to one of the valid categories
3. Provide a confidence score (0-1) based on how well it fits the category
4. Return ONLY a valid JSON object with no additional text or markdown

Guidelines:
- filesystem: File operations (read, write, delete, move, copy)
- web: HTTP requests, web scraping, browser automation
- search: Search engines and query tools
- database: Database operations and SQL execution
- version-control: Git, GitHub, GitLab operations
- docker: Container and orchestration tools
- cloud: Cloud provider services (AWS, Azure, GCP)
- development: Build tools, linters, formatters, package managers
- communication: Chat, email, notification systems
- other: Tools that don't fit the above categories

Be precise in your categorization. If uncertain, provide a lower confidence score.`;
  }

  /**
   * Build the prompt for tool categorization (Task 3.2.2)
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Analyze this MCP tool and categorize it accurately.

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'No description provided'}

Valid categories: ${validCategories.join(', ')}

Respond with ONLY a JSON object in this format (no markdown, no extra text):
{"category": "<one of the valid categories>", "confidence": <number between 0 and 1>}

Example: {"category": "filesystem", "confidence": 0.95}`;
  }

  /**
   * Parse categorization response from LLM (Task 3.2.3)
   * @protected
   * @param {string} response - LLM response text
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Validated category name
   */
  _parseCategorizationResponse(response, validCategories) {
    try {
      // Remove markdown code blocks if present
      const jsonText = response.trim()
        .replace(/^```(?:json)?\\s*\\n?/m, '')
        .replace(/\\n?```\\s*$/m, '');

      // Parse JSON
      const parsed = JSON.parse(jsonText);
      const category = String(parsed.category).toLowerCase().trim();
      const confidence = Number(parsed.confidence) || 0.5;

      // Validate category
      if (!validCategories.includes(category)) {
        logger.warn(`Parsed category '${category}' not in valid list, using fallback`);
        return 'other';
      }

      // Validate confidence
      if (confidence < 0 || confidence > 1) {
        logger.warn(`Invalid confidence ${confidence}, clamping to valid range`);
      }

      return category;
    } catch (error) {
      logger.warn(`Failed to parse categorization response: ${error.message}`);
      return 'other';
    }
  }
}

/**
 * Google Gemini provider implementation using official SDK
 * 
 * Features:
 * - Native Gemini API support (not OpenAI-compatible endpoint)
 * - Automatic retry with exponential backoff
 * - Safety settings configured for tool categorization
 * - Proper error handling
 * 
 * @see https://ai.google.dev/tutorials/node_quickstart
 */
export class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config);
    

    
    // Initialize Gemini client
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = config.model || 'gemini-2.5-flash';
  }

  /**
   * Categorize a tool using Gemini's API
   * @param {string} toolName - Name of the tool to categorize
   * @param {object} toolDefinition - Tool definition with description and inputSchema
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<string>} Category name
   */
  async categorize(toolName, toolDefinition, validCategories) {
    const prompt = this._buildPrompt(toolName, toolDefinition, validCategories);

    try {
      // Get the generative model
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 20,
        },
      });

      // Generate content with retry logic
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const category = response.text().trim().toLowerCase();

          // Validate response
          if (!category || !validCategories.includes(category)) {
            logger.warn(`LLM returned invalid category: ${category}, defaulting to 'other'`, {
              toolName,
              validCategories: validCategories.join(', ')
            });
            return 'other';
          }

          return category;
        } catch (err) {
          lastError = err;
          if (attempt < 2) {
            // Exponential backoff: 1s, 2s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      throw lastError;
    } catch (error) {
      // Enhanced error handling
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
        logger.error(`Gemini API key invalid`, { toolName });
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        logger.warn(`Gemini rate limit exceeded`, { toolName });
      } else if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        logger.warn(`Gemini safety filter triggered for ${toolName}, defaulting to 'other'`);
        return 'other';
      } else {
        logger.error(`Gemini API call failed: ${errorMessage}`, {
          toolName,
          error: error?.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * Analyze user prompt to determine needed tool categories
   * @param {string} prompt - User's request
   * @param {string} [context] - Optional conversation context
   * @param {string[]} validCategories - Array of valid category names
   * @returns {Promise<{categories: string[], confidence: number, reasoning: string}>}
   */
  async analyzePrompt(prompt, context, validCategories) {
    const analysisPrompt = this._buildAnalysisPrompt(prompt, context, validCategories);

    try {
      // Get the generative model with JSON response format
      const model = this.genAI.getGenerativeModel({
        model: this.model || 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 150,
          responseMimeType: 'application/json'
        }
      });

      // Generate content with retry logic
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent(analysisPrompt);
          const response = await result.response;
          const responseText = response.text();

          if (!responseText) {
            throw new Error('No response from Gemini API');
          }

          return this._parseAnalysisResponse(responseText, validCategories);
        } catch (err) {
          lastError = err;
          if (attempt < 2) {
            // Exponential backoff: 1s, 2s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      throw lastError;
    } catch (error) {
      // Enhanced error handling
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
        logger.error(`Gemini API key invalid during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        logger.warn(`Gemini rate limit exceeded during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        logger.warn(`Gemini safety filter triggered during prompt analysis`, {
          prompt: prompt.substring(0, 100)
        });
      } else {
        logger.error(`Gemini prompt analysis failed: ${errorMessage}`, {
          error: error?.stack,
          prompt: prompt.substring(0, 100)
        });
      }
      
      throw error;
    }
  }

  /**
   * Build system prompt for categorization (Task 3.2.1)
   * @protected
   * @returns {string} System prompt for categorization
   */
  _buildSystemPrompt() {
    return `You are an expert at categorizing MCP (Model Context Protocol) tools. Analyze tools based on their functionality, naming patterns, and descriptions. Categorize them accurately into the appropriate category.

Your task:
1. Analyze the tool name, description, and schema
2. Match it to one of the valid categories
3. Provide a confidence score (0-1) based on how well it fits the category
4. Return ONLY a valid JSON object with no additional text or markdown

Guidelines:
- filesystem: File operations (read, write, delete, move, copy)
- web: HTTP requests, web scraping, browser automation
- search: Search engines and query tools
- database: Database operations and SQL execution
- version-control: Git, GitHub, GitLab operations
- docker: Container and orchestration tools
- cloud: Cloud provider services (AWS, Azure, GCP)
- development: Build tools, linters, formatters, package managers
- communication: Chat, email, notification systems
- other: Tools that don't fit the above categories

Be precise in your categorization. If uncertain, provide a lower confidence score.`;
  }

  /**
   * Build the prompt for tool categorization (Task 3.2.2)
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Analyze this MCP tool and categorize it accurately.

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'No description provided'}

Valid categories: ${validCategories.join(', ')}

Respond with ONLY a JSON object in this format (no markdown, no extra text):
{"category": "<one of the valid categories>", "confidence": <number between 0 and 1>}

Example: {"category": "filesystem", "confidence": 0.95}`;
  }

  /**
   * Parse categorization response from LLM (Task 3.2.3)
   * @protected
   * @param {string} response - LLM response text
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Validated category name
   */
  _parseCategorizationResponse(response, validCategories) {
    try {
      // Remove markdown code blocks if present
      const jsonText = response.trim()
        .replace(/^```(?:json)?\\s*\\n?/m, '')
        .replace(/\\n?```\\s*$/m, '');

      // Parse JSON
      const parsed = JSON.parse(jsonText);
      const category = String(parsed.category).toLowerCase().trim();
      const confidence = Number(parsed.confidence) || 0.5;

      // Validate category
      if (!validCategories.includes(category)) {
        logger.warn(`Parsed category '${category}' not in valid list, using fallback`);
        return 'other';
      }

      // Validate confidence
      if (confidence < 0 || confidence > 1) {
        logger.warn(`Invalid confidence ${confidence}, clamping to valid range`);
      }

      return category;
    } catch (error) {
      logger.warn(`Failed to parse categorization response: ${error.message}`);
      return 'other';
    }
  }
}

/**
 * Factory function to create LLM provider
 * @param {object} config - LLM provider configuration
 * @param {string} config.provider - Provider name ('openai' or 'anthropic')
 * @param {string} config.apiKey - API key for the provider
 * @param {string} [config.model] - Model to use (defaults vary by provider)
 * @param {string} [config.baseURL] - Base URL for API (for custom endpoints)
 * @returns {LLMProvider} Configured LLM provider instance
 * @throws {Error} If provider is unknown or not implemented
 */
export function createLLMProvider(config) {
  if (!config || !config.provider) {
    throw new Error('LLM provider configuration required');
  }

  if (!config.apiKey) {
    throw new Error(`API key required for ${config.provider} provider`);
  }

  switch (config.provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
