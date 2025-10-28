import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMProvider, OpenAIProvider, AnthropicProvider, createLLMProvider } from '../src/utils/llm-provider.js';

/**
 * Test Suite: LLM Provider - Sprint 3.1.1
 *
 * Focus: Validates LLM provider abstraction and implementations
 * - Abstract base class structure
 * - OpenAI provider implementation
 * - Anthropic provider implementation
 * - Factory function for provider creation
 * - Prompt building logic
 * - Response validation
 * - Error handling for API failures
 */

describe('LLMProvider - Sprint 3.1.1: Provider Abstraction', () => {
  const validCategories = ['filesystem', 'web', 'database', 'search', 'other'];
  const testToolDefinition = {
    description: 'Test tool for categorization',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      }
    }
  };

  describe('Abstract Base Class', () => {
    it('should throw error when categorize not implemented', async () => {
      const provider = new LLMProvider({ apiKey: 'test-key', model: 'test-model' });

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Must implement categorize() method');
    });

    it('should store config properties', () => {
      const config = { apiKey: 'test-key', model: 'test-model' };
      const provider = new LLMProvider(config);

      expect(provider.config).toBe(config);
      expect(provider.apiKey).toBe('test-key');
      expect(provider.model).toBe('test-model');
    });
  });

  describe('OpenAI Provider', () => {
    let provider;
    let mockFetch;

    beforeEach(() => {
      provider = new OpenAIProvider({ apiKey: 'test-openai-key' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should initialize with correct defaults', () => {
      expect(provider.baseURL).toBe('https://api.openai.com/v1');
      expect(provider.apiKey).toBe('test-openai-key');
    });

    it('should allow custom baseURL', () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com/v1'
      });
      expect(customProvider.baseURL).toBe('https://custom.openai.com/v1');
    });

    it('should successfully categorize tool with valid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'filesystem'
              }
            }
          ]
        })
      });

      const category = await provider.categorize('filesystem__read', testToolDefinition, validCategories);

      expect(category).toBe('filesystem');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use specified model or default to gpt-4o-mini', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'web' } }]
        })
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4o-mini');
    });

    it('should use custom model when specified', async () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'web' } }]
        })
      });

      await customProvider.categorize('fetch__url', testToolDefinition, validCategories);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4');
    });

    it('should default to other for invalid category response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'invalid_category'
              }
            }
          ]
        })
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      });

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('OpenAI API error: 401 Unauthorized - Invalid API key');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Network error');
    });

    it('should build correct prompt', () => {
      const prompt = provider._buildPrompt('filesystem__read', testToolDefinition, validCategories);

      expect(prompt).toContain('filesystem__read');
      expect(prompt).toContain('Test tool for categorization');
      expect(prompt).toContain('filesystem, web, database, search, other');
      expect(prompt).toContain('Respond with ONLY the category name');
    });

    it('should handle missing tool description', () => {
      const prompt = provider._buildPrompt('test_tool', {}, validCategories);

      expect(prompt).toContain('Description: N/A');
    });
  });

  describe('Anthropic Provider', () => {
    let provider;
    let mockFetch;

    beforeEach(() => {
      provider = new AnthropicProvider({ apiKey: 'test-anthropic-key' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should initialize with correct defaults', () => {
      expect(provider.baseURL).toBe('https://api.anthropic.com/v1');
      expect(provider.apiKey).toBe('test-anthropic-key');
      expect(provider.anthropicVersion).toBe('2023-06-01');
    });

    it('should successfully categorize tool with valid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              text: 'database'
            }
          ]
        })
      });

      const category = await provider.categorize('postgres__query', testToolDefinition, validCategories);

      expect(category).toBe('database');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use specified model or default to claude-3-haiku', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'web' }]
        })
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('claude-3-haiku-20240307');
    });

    it('should default to other for invalid category response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'random_category' }]
        })
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Invalid API key'
      });

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Anthropic API error: 403 Forbidden - Invalid API key');
    });
  });

  describe('Factory Function', () => {
    it('should create OpenAI provider', () => {
      const provider = createLLMProvider({
        provider: 'openai',
        apiKey: 'test-key'
      });

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.apiKey).toBe('test-key');
    });

    it('should create Anthropic provider', () => {
      const provider = createLLMProvider({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.apiKey).toBe('test-key');
    });

    it('should be case-insensitive for provider name', () => {
      const provider1 = createLLMProvider({
        provider: 'OpenAI',
        apiKey: 'test-key'
      });

      const provider2 = createLLMProvider({
        provider: 'ANTHROPIC',
        apiKey: 'test-key'
      });

      expect(provider1).toBeInstanceOf(OpenAIProvider);
      expect(provider2).toBeInstanceOf(AnthropicProvider);
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        createLLMProvider({
          provider: 'unknown',
          apiKey: 'test-key'
        });
      }).toThrow('Unknown LLM provider: unknown');
    });

    it('should throw error for missing provider', () => {
      expect(() => {
        createLLMProvider({
          apiKey: 'test-key'
        });
      }).toThrow('LLM provider configuration required');
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        createLLMProvider({
          provider: 'openai'
        });
      }).toThrow('API key required for openai provider');
    });

    it('should pass custom configuration to provider', () => {
      const provider = createLLMProvider({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        baseURL: 'https://custom.com'
      });

      expect(provider.model).toBe('gpt-4');
      expect(provider.baseURL).toBe('https://custom.com');
    });
  });
});
