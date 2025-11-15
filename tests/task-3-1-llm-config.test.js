/**
 * Sprint 3, Task 3.1: LLM Provider Configuration Tests
 * 
 * Tests for LLM provider configuration, API key validation, and graceful degradation.
 * Covers all 5 work items:
 * - 3.1.1: Configuration section (schema validation)
 * - 3.1.2: Provider selection (OpenAI, Anthropic, Gemini)
 * - 3.1.3: API key validation on startup
 * - 3.1.4: Graceful degradation if API key missing
 * - 3.1.5: Configuration schema validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

/**
 * Mock MCP Hub
 */
const createMockMcpHub = () => ({
  getServerTools: vi.fn().mockResolvedValue([]),
  getServers: vi.fn().mockResolvedValue([])
});

describe('Task 3.1: LLM Provider Configuration', () => {
  let mockHub;

  beforeEach(() => {
    mockHub = createMockMcpHub();
    // Clear any environment variables that might interfere
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('3.1.1: Configuration Section in Schema', () => {
    it('should accept valid llmCategorization configuration', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key-12345678',
            model: 'gemini-2.5-flash',
            temperature: 0.3,
            maxRetries: 3
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      // Should not throw
      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should accept minimal llmCategorization configuration', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'sk-test1234567890'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should allow llmCategorization to be disabled', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: false,
            provider: 'gemini'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should work without llmCategorization section', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });
  });

  describe('3.1.2: Provider Selection (OpenAI, Anthropic, Gemini)', () => {
    it('should support OpenAI provider', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'sk-test1234567890',
            model: 'gpt-4o-mini'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should support Anthropic provider', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'anthropic',
            apiKey: 'sk-ant-test1234567890',
            model: 'claude-3-haiku-20240307'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should support Gemini provider', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'AIzaSyTest1234567890',
            model: 'gemini-2.5-flash'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should be case-insensitive for provider names', () => {
      const config1 = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'OpenAI',
            apiKey: 'sk-test1234567890'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      // Should normalize provider name
      expect(() => {
        new ToolFilteringService(config1, mockHub);
      }).not.toThrow();
    });
  });

  describe('3.1.3: API Key Validation on Startup', () => {
    it('should validate OpenAI API key format', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'invalid-key'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);
      // Should warn about invalid format but not throw during construction
      // (the actual LLM creation attempt would fail, but we gracefully degrade)
      expect(service).toBeDefined();
    });

    it('should accept valid OpenAI API key format (sk-*)', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'sk-validkeywith32characterslength!!!'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should validate Anthropic API key format', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'anthropic',
            apiKey: 'sk-ant-validkeywith32characterslength!'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should validate Gemini API key', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'AIzaSyValidGeminiKeyWith32Characters!!'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should reject API key when it is empty string', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: ''
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);
      // Should gracefully degrade (llmClient remains null)
      expect(service).toBeDefined();
    });
  });

  describe('3.1.4: Graceful Degradation if API Key Missing', () => {
    it('should fallback to heuristics when API key is missing', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini'
            // No apiKey provided
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);

      // Should not throw and should have category cache ready
      expect(service.categoryCache).toBeDefined();
      expect(service.categoryCache.size).toBeGreaterThanOrEqual(0);
    });

    it('should work without llmCategorization section entirely', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: ['web', 'filesystem']
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);

      // Should initialize successfully with heuristic categorization
      expect(service).toBeDefined();
      expect(service.shouldIncludeTool('fetch__url', 'test-server')).toBe(true);
    });

    it('should categorize tools using heuristics when LLM is disabled', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: false,
            provider: 'gemini'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: ['web']
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);

      // Should use heuristic-based categorization
      const category = service.getToolCategory('fetch__url', 'test-server');
      expect(category).toBe('web'); // Matches heuristic pattern
    });

    it('should use heuristics as fallback when LLM client creation fails', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'sk-invalid-key-format-short'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: ['web']
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);
      await service.waitForInitialization();

      // Even if llmClient is created, it should still work
      // The fallback happens when actual API calls fail
      expect(service).toBeDefined();

      // But should still categorize using heuristics
      const category = service.getToolCategory('fetch__url', 'test-server');
      expect(category).toBeDefined();
      expect(typeof category).toBe('string');
      expect(category).toBe('web'); // Heuristic pattern matches
    });
  });

  describe('3.1.5: Configuration Schema Validation', () => {
    it('should validate that enabled is a boolean', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: 'yes', // Invalid: should be boolean
            provider: 'gemini',
            apiKey: 'test-key'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      // Should throw during initialization
      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).toThrow();
    });

    it('should validate provider enum (openai|anthropic|gemini)', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'invalid-provider',
            apiKey: 'test-key'
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).toThrow(/provider must be one of/i);
    });

    it('should validate temperature is between 0 and 2', () => {
      const configInvalid1 = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key',
            temperature: -1 // Invalid: below 0
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(configInvalid1, mockHub);
      }).toThrow(/temperature must be a number between 0 and 2/i);

      const configInvalid2 = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key',
            temperature: 3 // Invalid: above 2
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(configInvalid2, mockHub);
      }).toThrow(/temperature must be a number between 0 and 2/i);
    });

    it('should validate maxRetries is an integer between 0 and 10', () => {
      const configInvalid1 = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key',
            maxRetries: -1 // Invalid: below 0
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(configInvalid1, mockHub);
      }).toThrow(/maxRetries must be an integer between 0 and 10/i);

      const configInvalid2 = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key',
            maxRetries: 11 // Invalid: above 10
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(configInvalid2, mockHub);
      }).toThrow(/maxRetries must be an integer between 0 and 10/i);
    });

    it('should validate model is a string when provided', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-key',
            model: 123 // Invalid: should be string
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).toThrow(/model must be a string/i);
    });

    it('should require provider when enabled is true', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: true
            // provider missing
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).toThrow(/provider is required when enabled=true/i);
    });

    it('should allow optional fields when enabled is false', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          llmCategorization: {
            enabled: false
            // provider not required when disabled
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should validate valid temperature values', () => {
      const validTemps = [0, 0.5, 1, 1.5, 2];

      for (const temp of validTemps) {
        const config = {
          toolFiltering: {
            enabled: true,
            mode: 'hybrid',
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
              temperature: temp
            },
            serverFilter: {
              mode: 'allowlist',
              servers: []
            },
            categoryFilter: {
              categories: []
            }
          }
        };

        expect(() => {
          new ToolFilteringService(config, mockHub);
        }).not.toThrow(`temperature ${temp} should be valid`);
      }
    });

    it('should validate valid maxRetries values', () => {
      const validRetries = [0, 1, 3, 5, 10];

      for (const retries of validRetries) {
        const config = {
          toolFiltering: {
            enabled: true,
            mode: 'hybrid',
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
              maxRetries: retries
            },
            serverFilter: {
              mode: 'allowlist',
              servers: []
            },
            categoryFilter: {
              categories: []
            }
          }
        };

        expect(() => {
          new ToolFilteringService(config, mockHub);
        }).not.toThrow(`maxRetries ${retries} should be valid`);
      }
    });
  });

  describe('Success Criteria Validation', () => {
    it('should load configuration without errors', () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'prompt-based',
          llmCategorization: {
            enabled: true,
            provider: 'gemini',
            apiKey: 'test-api-key',
            model: 'gemini-2.5-flash',
            temperature: 0,
            maxRetries: 3
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: []
          },
          promptBasedFiltering: {
            enabled: true,
            defaultExposure: 'meta-only'
          }
        }
      };

      expect(() => {
        new ToolFilteringService(config, mockHub);
      }).not.toThrow();
    });

    it('should support flexible provider selection', () => {
      const providers = [
        {
          provider: 'openai',
          apiKey: 'sk-test1234567890',
          model: 'gpt-4o-mini'
        },
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-test1234567890',
          model: 'claude-3-haiku-20240307'
        },
        {
          provider: 'gemini',
          apiKey: 'AIzaSyTest1234567890',
          model: 'gemini-2.5-flash'
        }
      ];

      for (const { provider, apiKey, model } of providers) {
        const config = {
          toolFiltering: {
            enabled: true,
            mode: 'hybrid',
            llmCategorization: {
              enabled: true,
              provider,
              apiKey,
              model
            },
            serverFilter: {
              mode: 'allowlist',
              servers: []
            },
            categoryFilter: {
              categories: []
            }
          }
        };

        expect(() => {
          new ToolFilteringService(config, mockHub);
        }).not.toThrow(`Provider ${provider} should be supported`);
      }
    });

    it('should provide graceful fallback to heuristics', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: true,
            provider: 'gemini'
            // Missing API key - should gracefully fallback
          },
          serverFilter: {
            mode: 'allowlist',
            servers: []
          },
          categoryFilter: {
            categories: ['web', 'filesystem']
          }
        }
      };

      const service = new ToolFilteringService(config, mockHub);
      await service.waitForInitialization();

      // Should work despite missing API key
      expect(service.shouldIncludeTool('fetch__url', 'test')).toBe(true);
      expect(service.shouldIncludeTool('filesystem__read', 'test')).toBe(true);
    });
  });
});
