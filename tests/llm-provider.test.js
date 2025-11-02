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
      // ARRANGE: Create base LLMProvider instance (abstract class)
      const provider = new LLMProvider({ apiKey: 'test-key', model: 'test-model' });

      // ACT & ASSERT: Verify categorize() throws when not overridden
      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow('Must implement categorize() method');
    });

    it('should store config properties', () => {
      // ARRANGE: Prepare config object
      const config = { apiKey: 'test-key', model: 'test-model' };

      // ACT: Create provider with config
      const provider = new LLMProvider(config);

      // ASSERT: Verify config properties stored correctly
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
      // ARRANGE & ACT: Provider created in beforeEach

      // ASSERT: Verify OpenAI client created with default config
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-openai-key',
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should allow custom baseURL', () => {
      // ACT: Create provider with custom baseURL
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com/v1'
      });
      
      // ASSERT: Verify OpenAI client initialized with custom baseURL
      expect(OpenAI).toHaveBeenLastCalledWith({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.com/v1',
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should successfully categorize tool with valid response', async () => {
      // ARRANGE: Mock valid OpenAI API response
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

      // ACT: Categorize tool using OpenAI
      const category = await provider.categorize('filesystem__read', testToolDefinition, validCategories);

      // ASSERT: Verify correct category and API call structure
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
      // ARRANGE: Mock API response
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      // ACT: Categorize with default provider (no model specified)
      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      // ASSERT: Verify default model used
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini'
        })
      );
    });

    it('should use custom model when specified', async () => {
      // ARRANGE: Create provider with custom model
      const customProvider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'web' } }],
        id: 'chatcmpl-test',
        object: 'chat.completion'
      });

      // ACT: Categorize with custom model provider
      await customProvider.categorize('fetch__url', testToolDefinition, validCategories);

      // ASSERT: Verify custom model used in API call
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4'
        })
      );
    });

    it('should default to other for invalid category response', async () => {
      // ARRANGE: Mock API response with invalid category
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

      // ACT: Categorize tool with invalid response
      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      // ASSERT: Verify fallback to 'other'
      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      // ARRANGE: Mock API error (401 authentication)
      const apiError = new Error('Invalid API key');
      apiError.status = 401;
      apiError.type = 'invalid_request_error';
      mockCreate.mockRejectedValueOnce(apiError);

      // ACT & ASSERT: Verify error propagates correctly
      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // ARRANGE: Mock network failure
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      // ACT & ASSERT: Verify network error propagates
      await expect(
        provider.categorize('test_tool', testToolDefinition, validCategories)
      ).rejects.toThrow();
    });

    it('should build correct prompt', () => {
      // ACT: Build categorization prompt
      const prompt = provider._buildPrompt('filesystem__read', testToolDefinition, validCategories);

      // ASSERT: Verify prompt contains all required elements
      expect(prompt).toContain('filesystem__read');
      expect(prompt).toContain('Test tool for categorization');
      expect(prompt).toContain('filesystem, web, database, search, other');
      expect(prompt).toContain('Respond with ONLY the category name');
    });

    it('should handle missing tool description', () => {
      // ACT: Build prompt with empty tool definition
      const prompt = provider._buildPrompt('test_tool', {}, validCategories);

      // ASSERT: Verify N/A placeholder for missing description
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
      // ARRANGE & ACT: Provider created in beforeEach

      // ASSERT: Verify Anthropic client created with default config
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-anthropic-key',
        baseURL: undefined,
        maxRetries: 3,
        timeout: 30000
      });
    });

    it('should successfully categorize tool with valid response', async () => {
      // ARRANGE: Mock valid Anthropic API response
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

      // ACT: Categorize tool using Anthropic
      const category = await provider.categorize('postgres__query', testToolDefinition, validCategories);

      // ASSERT: Verify correct category and API call structure
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
      // ARRANGE: Mock API response
      mockCreate.mockResolvedValueOnce({
        content: [{ text: 'web' }],
        id: 'msg-test',
        model: 'claude-3-haiku-20240307',
        role: 'assistant'
      });

      // ACT: Categorize with default provider (no model specified)
      await provider.categorize('fetch__url', testToolDefinition, validCategories);

      // ASSERT: Verify default Anthropic model used
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307'
        })
      );
    });

    it('should default to other for invalid category response', async () => {
      // ARRANGE: Mock API response with invalid category
      mockCreate.mockResolvedValueOnce({
        content: [{ text: 'random_category' }],
        id: 'msg-test',
        model: 'claude-3-haiku-20240307',
        role: 'assistant'
      });

      // ACT: Categorize tool with invalid response
      const category = await provider.categorize('unknown_tool', testToolDefinition, validCategories);

      // ASSERT: Verify fallback to 'other'
      expect(category).toBe('other');
    });

    it('should handle API errors gracefully', async () => {
      // ARRANGE: Mock API error (401 authentication)
      const apiError = new Error('Invalid API key');
      apiError.status = 401;
      apiError.type = 'authentication_error';
      mockCreate.mockRejectedValueOnce(apiError);

      // ACT & ASSERT: Verify error propagates correctly
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
      // ACT: Create provider via factory
      const provider = createLLMProvider({
        provider: 'openai',
        apiKey: 'test-key'
      });

      // ASSERT: Verify correct provider type and config
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.apiKey).toBe('test-key');
    });

    it('should create Anthropic provider', () => {
      // ACT: Create provider via factory
      const provider = createLLMProvider({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      // ASSERT: Verify correct provider type and config
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.apiKey).toBe('test-key');
    });

    it('should be case-insensitive for provider name', () => {
      // ACT: Create providers with mixed-case names
      const provider1 = createLLMProvider({
        provider: 'OpenAI',
        apiKey: 'test-key'
      });

      const provider2 = createLLMProvider({
        provider: 'ANTHROPIC',
        apiKey: 'test-key'
      });

      // ASSERT: Verify correct types despite case variations
      expect(provider1).toBeInstanceOf(OpenAIProvider);
      expect(provider2).toBeInstanceOf(AnthropicProvider);
    });

    it('should throw error for unknown provider', () => {
      // ACT & ASSERT: Verify factory rejects unknown provider
      expect(() => {
        createLLMProvider({
          provider: 'unknown',
          apiKey: 'test-key'
        });
      }).toThrow('Unknown LLM provider: unknown');
    });

    it('should throw error for missing provider', () => {
      // ACT & ASSERT: Verify factory requires provider field
      expect(() => {
        createLLMProvider({
          apiKey: 'test-key'
        });
      }).toThrow('LLM provider configuration required');
    });

    it('should throw error for missing API key', () => {
      // ACT & ASSERT: Verify factory requires API key
      expect(() => {
        createLLMProvider({
          provider: 'openai'
        });
      }).toThrow('API key required for openai provider');
    });

    it('should pass custom configuration to provider', () => {
      // ACT: Create provider with custom model and baseURL
      const provider = createLLMProvider({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        baseURL: 'https://custom.com'
      });

      // ASSERT: Verify custom config passed through
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
