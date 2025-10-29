import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock OpenAI SDK - must be defined before imports
const mockOpenAICreate = vi.fn();

vi.mock('openai', () => {
  class MockOpenAI {
    constructor(config) {
      this.config = config;
      this.chat = {
        completions: {
          create: mockOpenAICreate
        }
      };
    }
  }

  // Error classes
  MockOpenAI.APIError = class APIError extends Error {
    constructor(status, body, message, headers) {
      super(message);
      this.status = status;
      this.request_id = null;
      this.code = null;
      this.type = null;
    }
  };

  MockOpenAI.APIConnectionError = class APIConnectionError extends Error {
    constructor(opts) {
      super(opts.message);
      this.cause = opts.cause;
    }
  };

  MockOpenAI.RateLimitError = class RateLimitError extends Error {
    constructor(message) {
      super(message);
      this.request_id = null;
      this.headers = {};
    }
  };

  return {
    default: MockOpenAI
  };
});

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    constructor(config) {
      this.config = config;
      this.messages = {
        create: mockAnthropicCreate
      };
    }
  }

  // Error classes
  MockAnthropic.APIError = class APIError extends Error {
    constructor(status, body, message, headers) {
      super(message);
      this.status = status;
      this.request_id = null;
      this.type = null;
    }
  };

  MockAnthropic.APIConnectionError = class APIConnectionError extends Error {
    constructor(opts) {
      super(opts.message);
      this.cause = opts.cause;
    }
  };

  MockAnthropic.RateLimitError = class RateLimitError extends Error {
    constructor(message) {
      super(message);
      this.request_id = null;
      this.headers = {};
    }
  };

  return {
    default: MockAnthropic
  };
});

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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

    beforeEach(() => {
      // Reset mock before each test
      mockOpenAICreate.mockReset();
      provider = new OpenAIProvider({ apiKey: 'test-openai-key' });
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
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'filesystem'
            }
          }
        ]
      });

      const category = await provider.categorize('filesystem__read', testToolDefinition, validCategories);

      expect(category).toBe('filesystem');
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      expect(mockOpenAICreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a tool categorization expert. Respond with ONLY the category name, nothing else.'
          },
          {
            role: 'user',
            content: expect.stringContaining('filesystem__read')
          }
        ],
        temperature: 0,
        max_tokens: 20
      });
    });

    it('should use specified model or default to gpt-4o-mini', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }]
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockOpenAICreate.mock.calls[0][0].model).toBe('gpt-4o-mini');
    });

    it('should use custom model when specified', async () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }]
      });

      await customProvider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockOpenAICreate.mock.calls[0][0].model).toBe('gpt-4');
    });

    it('should default to other for invalid category response', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid_category'
            }
          }
        ]
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new OpenAI.APIError(
        401,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );
      apiError.status = 401;
      apiError.request_id = 'req_123';
      apiError.code = 'invalid_api_key';
      apiError.type = 'invalid_request_error';

      mockOpenAICreate.mockRejectedValueOnce(apiError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle APIError with request_id for debugging', async () => {
      const apiError = new OpenAI.APIError(
        500,
        { error: { message: 'Internal server error', type: 'api_error' } },
        'Internal server error',
        { 'x-request-id': 'req_abc123' }
      );
      apiError.status = 500;
      apiError.request_id = 'req_abc123';
      apiError.code = 'internal_error';
      apiError.type = 'api_error';

      mockOpenAICreate.mockRejectedValueOnce(apiError);

      // Verify error has request_id for logging
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OpenAI.APIError);
        expect(error.message).toBe('Internal server error');
        expect(error.request_id).toBe('req_abc123');
        expect(error.status).toBe(500);
        expect(error.code).toBe('internal_error');
      }
    });

    it('should handle RateLimitError with retry-after header', async () => {
      const rateLimitError = new OpenAI.RateLimitError('Rate limit exceeded');
      rateLimitError.request_id = 'req_ratelimit_456';
      rateLimitError.headers = { 'retry-after': '60', 'x-request-id': 'req_ratelimit_456' };
      rateLimitError.status = 429;

      mockOpenAICreate.mockRejectedValueOnce(rateLimitError);

      // Verify rate limit error has retry information
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OpenAI.RateLimitError);
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.request_id).toBe('req_ratelimit_456');
        expect(error.headers['retry-after']).toBe('60');
      }
    });

    it('should handle network errors', async () => {
      const connectionError = new OpenAI.APIConnectionError({ message: 'Network error' });

      mockOpenAICreate.mockRejectedValueOnce(connectionError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Network error');
    });

    it('should handle APIConnectionError with cause', async () => {
      const connectionError = new OpenAI.APIConnectionError({
        message: 'Connection failed',
        cause: new Error('ECONNREFUSED')
      });

      mockOpenAICreate.mockRejectedValueOnce(connectionError);

      // Verify connection error has cause for debugging
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(OpenAI.APIConnectionError);
        expect(error.message).toBe('Connection failed');
        expect(error.cause).toBeDefined();
        expect(error.cause.message).toBe('ECONNREFUSED');
      }
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';

      mockOpenAICreate.mockRejectedValueOnce(timeoutError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Request timed out');
    });

    it('should handle malformed API responses gracefully', async () => {
      // Missing choices array - should gracefully handle
      mockOpenAICreate.mockResolvedValueOnce({
        choices: []
      });

      const category = await provider.categorize('test_tool', testToolDefinition, validCategories);

      // Malformed response should default to 'other'
      expect(category).toBe('other');
    });

    it('should handle empty response content', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: ''
          }
        }]
      });

      const category = await provider.categorize('test_tool', testToolDefinition, validCategories);

      // Empty content should default to 'other'
      expect(category).toBe('other');
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

    beforeEach(() => {
      // Reset mock before each test
      mockAnthropicCreate.mockReset();
      provider = new AnthropicProvider({ apiKey: 'test-anthropic-key' });
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
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [
          {
            text: 'database'
          }
        ]
      });

      const category = await provider.categorize('postgres__query', testToolDefinition, validCategories);

      expect(category).toBe('database');
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('postgres__query')
          }
        ],
        system: 'You are a tool categorization expert. Respond with ONLY the category name, nothing else.',
        temperature: 0
      });
    });

    it('should use specified model or default to claude-3-haiku', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ text: 'web' }]
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockAnthropicCreate.mock.calls[0][0].model).toBe('claude-3-haiku-20240307');
    });

    it('should default to other for invalid category response', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ text: 'random_category' }]
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Anthropic.APIError(
        403,
        { error: { message: 'Invalid API key' } },
        'Invalid API key',
        {}
      );
      apiError.status = 403;
      apiError.request_id = 'req_456';
      apiError.type = 'authentication_error';

      mockAnthropicCreate.mockRejectedValueOnce(apiError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle APIError with request_id for debugging', async () => {
      const apiError = new Anthropic.APIError(
        500,
        { error: { message: 'Internal server error', type: 'api_error' } },
        'Internal server error',
        { 'x-request-id': 'req_anthropic_xyz789' }
      );
      apiError.status = 500;
      apiError.request_id = 'req_anthropic_xyz789';
      apiError.type = 'api_error';

      mockAnthropicCreate.mockRejectedValueOnce(apiError);

      // Verify error has request_id for logging
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Anthropic.APIError);
        expect(error.message).toBe('Internal server error');
        expect(error.request_id).toBe('req_anthropic_xyz789');
        expect(error.status).toBe(500);
        expect(error.type).toBe('api_error');
      }
    });

    it('should handle RateLimitError with retry information', async () => {
      const rateLimitError = new Anthropic.RateLimitError('Rate limit exceeded');
      rateLimitError.request_id = 'req_anthropic_ratelimit';
      rateLimitError.headers = { 'retry-after': '120', 'x-request-id': 'req_anthropic_ratelimit' };
      rateLimitError.status = 429;

      mockAnthropicCreate.mockRejectedValueOnce(rateLimitError);

      // Verify rate limit error has retry information
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Anthropic.RateLimitError);
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.request_id).toBe('req_anthropic_ratelimit');
        expect(error.headers['retry-after']).toBe('120');
      }
    });

    it('should handle APIConnectionError with cause', async () => {
      const connectionError = new Anthropic.APIConnectionError({
        message: 'Connection failed',
        cause: new Error('ENOTFOUND')
      });

      mockAnthropicCreate.mockRejectedValueOnce(connectionError);

      // Verify connection error has cause for debugging
      try {
        await provider.categorize('test_tool', testToolDefinition, validCategories);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Anthropic.APIConnectionError);
        expect(error.message).toBe('Connection failed');
        expect(error.cause).toBeDefined();
        expect(error.cause.message).toBe('ENOTFOUND');
      }
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';

      mockAnthropicCreate.mockRejectedValueOnce(timeoutError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Request timed out');
    });

    it('should handle malformed API responses gracefully', async () => {
      // Missing content array - should gracefully handle
      mockAnthropicCreate.mockResolvedValueOnce({
        content: []
      });

      const category = await provider.categorize('test_tool', testToolDefinition, validCategories);

      // Malformed response should default to 'other'
      expect(category).toBe('other');
    });

    it('should handle empty response content', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{
          text: ''
        }]
      });

      const category = await provider.categorize('test_tool', testToolDefinition, validCategories);

      // Empty content should default to 'other'
      expect(category).toBe('other');
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
