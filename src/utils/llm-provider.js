import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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
}

/**
 * OpenAI provider implementation
 * Uses OpenAI's GPT models for tool categorization
 */
export class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    
    // Store baseURL for backward compatibility
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    
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
      // Ensure request id is available on the error object for observability
      try {
        error.request_id = error.request_id || error.headers?.['x-request-id'] || error.requestId || 'unknown';
      } catch {
        /* ignore */
      }

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

      // Re-throw the original error object (now decorated with request_id when available)
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
 * Anthropic (Claude) provider implementation
 * Uses Anthropic's Claude models for tool categorization
 */
export class AnthropicProvider extends LLMProvider {
  constructor(config) {
    super(config);
    
    // Store baseURL for backward compatibility
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.anthropicVersion = config.anthropicVersion || '2023-06-01';
    
    // Initialize Anthropic client with retry configuration
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: config.baseURL,  // Optional custom endpoint
      maxRetries: 3,            // Retry transient failures
      timeout: 30000,           // 30 second timeout
    });
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
      // Ensure request id is available on the error object for observability
      try {
        error.request_id = error.request_id || error.headers?.['x-request-id'] || error.requestId || 'unknown';
      } catch {
        /* ignore */
      }

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

      // Re-throw the original error object (now decorated with request_id when available)
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
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
