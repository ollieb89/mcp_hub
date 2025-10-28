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
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
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
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const category = data.choices[0].message.content.trim().toLowerCase();

      // Validate response
      if (!validCategories.includes(category)) {
        logger.warn(`LLM returned invalid category: ${category}, defaulting to 'other'`);
        return 'other';
      }

      return category;
    } catch (error) {
      logger.error(`OpenAI API call failed: ${error.message}`);
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
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
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
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.anthropicVersion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const category = data.content[0].text.trim().toLowerCase();

      // Validate response
      if (!validCategories.includes(category)) {
        logger.warn(`LLM returned invalid category: ${category}, defaulting to 'other'`);
        return 'other';
      }

      return category;
    } catch (error) {
      logger.error(`Anthropic API call failed: ${error.message}`);
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
