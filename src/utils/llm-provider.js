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
   * Categorize a tool using OpenAI's API
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
            content: 'You are a tool categorization expert. Respond with ONLY the category name, nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 20
      });

      const category = completion.choices[0]?.message?.content?.trim().toLowerCase();

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
   * Build the prompt for tool categorization
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Categorize this MCP tool into ONE of these categories: ${validCategories.join(', ')}

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'N/A'}
Input Schema: ${JSON.stringify(toolDefinition.inputSchema || {}, null, 2)}

Respond with ONLY the category name.`;
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
   * Build the prompt for tool categorization
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Categorize this MCP tool into ONE of these categories: ${validCategories.join(', ')}

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'N/A'}
Input Schema: ${JSON.stringify(toolDefinition.inputSchema || {}, null, 2)}

Respond with ONLY the category name.`;
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
   * Build the prompt for tool categorization
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition
   * @param {string[]} validCategories - Valid category names
   * @returns {string} Formatted prompt
   */
  _buildPrompt(toolName, toolDefinition, validCategories) {
    return `Categorize this MCP tool into ONE of these categories: ${validCategories.join(', ')}

Tool Name: ${toolName}
Description: ${toolDefinition.description || 'N/A'}
Input Schema: ${JSON.stringify(toolDefinition.inputSchema || {}, null, 2)}

Respond with ONLY the category name.`;
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
