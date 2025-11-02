import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMProvider, OpenAIProvider, AnthropicProvider, createLLMProvider } from '../src/utils/llm-provider.js';

// Mock the SDKs
vi.mock('openai');
vi.mock('@anthropic-ai/sdk');

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Test Suite: LLM Provider - Sprint 3.1.1
 *
 * Focus: Validates LLM provider abstraction and implementations with SDK mocks
 * - Abstract base class structure
 * - OpenAI provider implementation (using official SDK)
 * - Anthropic provider implementation (using official SDK)
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
    let mockCreate;

    beforeEach(() => {
      // Setup mock for OpenAI SDK
      mockCreate = vi.fn();
      OpenAI.mockImplementation(function() {
        return {
          chat: {
            completions: {
              create: mockCreate
            }
          }
        };
      });
      
      provider = new OpenAIProvider({ apiKey: 'test-openai-key' });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should initialize with correct defaults', () => {
      // Verify OpenAI client was created with correct config
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-openai-key',
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should allow custom baseURL', () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com/v1'
      });
      
      // Check the last call to OpenAI constructor
      expect(OpenAI).toHaveBeenLastCalledWith({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com/v1',
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should successfully categorize tool with valid response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'filesystem'
            }
          }
        ],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      const category = await provider.categorize('filesystem__read', testToolDefinition, validCategories);

      expect(category).toBe('filesystem');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0,
        max_tokens: 20
      });
    });

    it('should use specified model or default to gpt-4o-mini', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini'
        })
      );
    });

    it('should use custom model when specified', async () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      await customProvider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4'
        })
      );
    });

    it('should default to other for invalid category response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid_category'
            }
          }
        ],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Invalid API key');
      apiError.status = 401;
      apiError.type = 'invalid_request_error';
      mockCreate.mockRejectedValueOnce(apiError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow();
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
    let mockCreate;

    beforeEach(() => {
      // Setup mock for Anthropic SDK
      mockCreate = vi.fn();
      Anthropic.mockImplementation(function() {
        return {
          messages: {
            create: mockCreate
          }
        };
      });
      
      provider = new AnthropicProvider({ apiKey: 'test-anthropic-key' });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should initialize with correct defaults', () => {
      // Verify Anthropic client was created with correct config
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-anthropic-key',
        baseURL: undefined,
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should successfully categorize tool with valid response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            text: 'database'
          }
        ],
        id: 'msg-test',
        model: 'claude-3-haiku-20240307',
        role: 'assistant'
      });

      const category = await provider.categorize('postgres__query', testToolDefinition, validCategories);

      expect(category).toBe('database');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
          max_tokens: 20,
          system: expect.any(String),
          temperature: 0,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should use specified model or default to claude-3-haiku', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ text: 'web' }],
        id: 'msg-test',
        model: 'claude-3-haiku-20240307',
        role: 'assistant'
      });

      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307'
        })
      );
    });

    it('should default to other for invalid category response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ text: 'random_category' }],
        id: 'msg-test',
        model: 'claude-3-haiku-20240307',
        role: 'assistant'
      });

      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Invalid API key');
      apiError.status = 401;
      apiError.type = 'authentication_error';
      mockCreate.mockRejectedValueOnce(apiError);

      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow();
    });
  });

  describe('Factory Function', () => {
    beforeEach(() => {
      // Reset mocks for factory tests
      vi.clearAllMocks();
      
      OpenAI.mockImplementation(function() {
        return {
          chat: {
            completions: {
              create: vi.fn()
            }
          }
        };
      });
      
      Anthropic.mockImplementation(function() {
        return {
          messages: {
            create: vi.fn()
          }
        };
      });
    });

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
      // baseURL is passed to SDK, not stored on provider instance
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.com'
        })
      );
    });
  });
});
