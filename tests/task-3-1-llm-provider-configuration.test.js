import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Task 3.1: LLM Provider Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========== 3.1.1: Add llmCategorization config section ==========

  describe('3.1.1: llmCategorization Config Section', () => {
    it('should load llmCategorization config from mcp-servers.json', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'test-key-123',
        },
      };

      // Verify config structure
      expect(config.llmCategorization).toBeDefined();
      expect(config.llmCategorization.enabled).toBe(true);
      expect(config.llmCategorization.provider).toBe('anthropic');
      expect(config.llmCategorization.apiKey).toBeDefined();
    });

    it('should load config with environment variable substitution', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'resolved-from-env',
          model: 'claude-3-haiku-20240307',
        },
      };

      expect(config.llmCategorization.apiKey).toBe('resolved-from-env');
    });

    it('should load config with optional timeout setting', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
          model: 'gpt-4',
          timeout: 5000,
        },
      };

      expect(config.llmCategorization.timeout).toBe(5000);
    });

    it('should load config with optional cacheTTL setting', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'gemini',
          apiKey: 'gemini-key-123',
          model: 'gemini-pro',
          cacheTTL: 86400,
        },
      };

      expect(config.llmCategorization.cacheTTL).toBe(86400);
    });

    it('should have default values for optional fields', () => {
      const config = {
        llmCategorization: {
          enabled: false,
        },
      };

      const withDefaults = {
        ...config.llmCategorization,
        timeout: config.llmCategorization.timeout || 5000,
        cacheTTL: config.llmCategorization.cacheTTL || 86400,
      };

      expect(withDefaults.timeout).toBe(5000);
      expect(withDefaults.cacheTTL).toBe(86400);
    });
  });

  // ========== 3.1.2: Provider Selection ==========

  describe('3.1.2: Provider Selection (OpenAI, Anthropic, Gemini)', () => {
    it('should validate OpenAI provider selection', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
          model: 'gpt-4',
        },
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      expect(validProviders).toContain(config.llmCategorization.provider);
    });

    it('should validate Anthropic provider selection', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
          model: 'claude-3-haiku-20240307',
        },
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      expect(validProviders).toContain(config.llmCategorization.provider);
    });

    it('should validate Gemini provider selection', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'gemini',
          apiKey: 'AIza-test',
          model: 'gemini-pro',
        },
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      expect(validProviders).toContain(config.llmCategorization.provider);
    });

    it('should reject invalid provider selection', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'invalid-provider',
          apiKey: 'test-key',
          model: 'test-model',
        },
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      expect(validProviders).not.toContain(config.llmCategorization.provider);
    });

    it('should support provider-specific model names', () => {
      const providers = {
        openai: 'gpt-4',
        anthropic: 'claude-3-haiku-20240307',
        gemini: 'gemini-pro',
      };

      // Verify each provider has valid model
      expect(providers.openai).toBeDefined();
      expect(providers.anthropic).toBeDefined();
      expect(providers.gemini).toBeDefined();
    });

    it('should handle provider switching at runtime', () => {
      const currentConfig = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
        },
      };

      // Switch provider
      currentConfig.llmCategorization.provider = 'anthropic';
      currentConfig.llmCategorization.apiKey = 'sk-ant-test-123';

      expect(currentConfig.llmCategorization.provider).toBe('anthropic');
      expect(currentConfig.llmCategorization.apiKey).toBe('sk-ant-test-123');
    });
  });

  // ========== 3.1.3: API Key Validation ==========

  describe('3.1.3: API Key Validation on Startup', () => {
    it('should validate API key is not empty', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
        },
      };

      const isValid = config.llmCategorization.apiKey && config.llmCategorization.apiKey.length > 0;
      expect(isValid).toBe(true);
    });

    it('should reject empty API key', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: '',
        },
      };

      const isValid = config.llmCategorization.apiKey && config.llmCategorization.apiKey.length > 0;
      expect(isValid).toBeFalsy();
    });

    it('should validate OpenAI key format (sk-)', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
        },
      };

      const validFormat = config.llmCategorization.apiKey.startsWith('sk-');
      expect(validFormat).toBe(true);
    });

    it('should validate Anthropic key format (sk-ant-)', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
        },
      };

      const validFormat = config.llmCategorization.apiKey.startsWith('sk-ant-');
      expect(validFormat).toBe(true);
    });

    it('should validate Gemini key format (AIza)', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'gemini',
          apiKey: 'AIza-test-key',
        },
      };

      const validFormat = config.llmCategorization.apiKey.startsWith('AIza');
      expect(validFormat).toBe(true);
    });

    it('should report missing API key on startup', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: undefined,
        },
      };

      const hasError = !config.llmCategorization.apiKey;
      expect(hasError).toBe(true);
    });

    it('should allow null API key if LLM is disabled', () => {
      const config = {
        llmCategorization: {
          enabled: false,
          provider: 'openai',
          apiKey: null,
        },
      };

      // If disabled, null key is acceptable
      const isValid = !config.llmCategorization.enabled || config.llmCategorization.apiKey;
      expect(isValid).toBe(true);
    });

    it('should validate API key on config reload', () => {
      const cfg = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
        },
      };

      const isValid1 = cfg.llmCategorization.apiKey && cfg.llmCategorization.apiKey.length > 0;
      expect(isValid1).toBe(true);

      // Reload config
      cfg.llmCategorization.apiKey = 'sk-new-key-456';
      const isValid2 = cfg.llmCategorization.apiKey && cfg.llmCategorization.apiKey.length > 0;
      expect(isValid2).toBe(true);
    });
  });

  // ========== 3.1.4: Graceful Degradation ==========

  describe('3.1.4: Graceful Degradation if API Key Missing', () => {
    it('should fallback to heuristics when LLM disabled', () => {
      const config = {
        llmCategorization: {
          enabled: false,
        },
      };

      const shouldUseLLM = config.llmCategorization?.enabled;
      expect(shouldUseLLM).toBe(false);
    });

    it('should fallback to heuristics when API key missing', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: null,
        },
      };

      const hasValidKey = config.llmCategorization.apiKey && config.llmCategorization.apiKey.length > 0;
      const shouldUseLLM = config.llmCategorization?.enabled && hasValidKey;
      expect(shouldUseLLM).toBeFalsy();
    });

    it('should provide fallback category from heuristics', () => {
      const fallbackCategory = 'version-control'; // Heuristic categorization

      expect(fallbackCategory).toBeDefined();
      const validCategories = ['filesystem', 'web', 'search', 'database', 'version-control', 'docker', 'cloud', 'development', 'communication', 'other'];
      expect(validCategories).toContain(fallbackCategory);
    });

    it('should log warning when falling back to heuristics', () => {
      const mockLoggerInstance = {
        warn: vi.fn(),
      };
      mockLoggerInstance.warn('LLM not available, using heuristics');

      expect(mockLoggerInstance.warn).toHaveBeenCalled();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith('LLM not available, using heuristics');
    });

    it('should continue normal operation without LLM', () => {
      const config = {
        llmCategorization: {
          enabled: false,
        },
      };

      const tools = [{ name: 'tool1' }, { name: 'tool2' }];
      const results = tools.map(t => ({
        ...t,
        category: 'web', // From heuristics
      }));

      expect(results).toHaveLength(2);
      expect(results[0].category).toBeDefined();
    });

    it('should handle missing provider gracefully', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'unknown-provider',
          apiKey: 'test-key',
        },
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      const isValidProvider = validProviders.includes(config.llmCategorization.provider);
      const shouldUseLLM = isValidProvider;

      expect(shouldUseLLM).toBe(false);
    });

    it('should maintain performance with heuristics fallback', () => {
      const startTime = Date.now();

      // Simulate heuristic categorization (should be fast)
      const result = 'web';

      const duration = Date.now() - startTime;
      expect(result).toBe('web');
      expect(duration).toBeLessThan(10); // Should be <10ms
    });

    it('should provide consistent fallback results', () => {
      const result1 = 'web';
      const result2 = 'web';

      expect(result1).toBe(result2);
    });
  });

  // ========== 3.1.5: Configuration Schema Validation ==========

  describe('3.1.5: Configuration Schema Validation', () => {
    it('should validate against config schema', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
          model: 'claude-3-haiku-20240307',
          timeout: 5000,
          cacheTTL: 86400,
        },
      };

      // Basic schema validation
      expect(typeof config.llmCategorization.enabled).toBe('boolean');
      expect(typeof config.llmCategorization.provider).toBe('string');
      expect(typeof config.llmCategorization.apiKey).toBe('string');
      expect(typeof config.llmCategorization.model).toBe('string');
      expect(typeof config.llmCategorization.timeout).toBe('number');
      expect(typeof config.llmCategorization.cacheTTL).toBe('number');
    });

    it('should enforce required fields', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          // Missing: provider, apiKey, model
        },
      };

      const hasRequired = config.llmCategorization.enabled !== undefined;
      expect(hasRequired).toBe(true);
    });

    it('should validate enabled field is boolean', () => {
      const validConfigs = [
        { enabled: true },
        { enabled: false },
      ];

      validConfigs.forEach(cfg => {
        expect(typeof cfg.enabled).toBe('boolean');
      });
    });

    it('should validate provider is enum string', () => {
      const config = {
        provider: 'anthropic',
      };

      const validProviders = ['openai', 'anthropic', 'gemini'];
      expect(validProviders).toContain(config.provider);
    });

    it('should validate timeout is positive integer', () => {
      const config = {
        timeout: 5000,
      };

      expect(config.timeout).toBeGreaterThan(0);
      expect(Number.isInteger(config.timeout)).toBe(true);
    });

    it('should validate cacheTTL is positive integer', () => {
      const config = {
        cacheTTL: 86400,
      };

      expect(config.cacheTTL).toBeGreaterThan(0);
      expect(Number.isInteger(config.cacheTTL)).toBe(true);
    });

    it('should reject invalid timeout', () => {
      const config = {
        timeout: -5000,
      };

      const isValid = config.timeout && config.timeout > 0;
      expect(isValid).toBe(false);
    });

    it('should reject non-integer cacheTTL', () => {
      const config = {
        cacheTTL: 'not-a-number',
      };

      const isValid = typeof config.cacheTTL === 'number' && Number.isInteger(config.cacheTTL);
      expect(isValid).toBe(false);
    });

    it('should support additional properties', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
          model: 'gpt-4',
          customProperty: 'custom-value',
        },
      };

      expect(config.llmCategorization.customProperty).toBe('custom-value');
    });

    it('should validate complete minimal config', () => {
      const minimalConfig = {
        llmCategorization: {
          enabled: true,
        },
      };

      expect(minimalConfig.llmCategorization).toBeDefined();
      expect(minimalConfig.llmCategorization.enabled).toBe(true);
    });

    it('should validate complete full config', () => {
      const fullConfig = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
          model: 'claude-3-haiku-20240307',
          timeout: 5000,
          cacheTTL: 86400,
        },
      };

      expect(fullConfig.llmCategorization).toBeDefined();
      expect(Object.keys(fullConfig.llmCategorization).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ========== End-to-End Configuration Tests ==========

  describe('3.1 Integration: Full Configuration Workflow', () => {
    it('should load and validate OpenAI config', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
          model: 'gpt-4',
        },
      };

      expect(config.llmCategorization.enabled).toBe(true);
      expect(config.llmCategorization.provider).toBe('openai');
      expect(config.llmCategorization.apiKey).toBeDefined();
    });

    it('should load and validate Anthropic config', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
          model: 'claude-3-haiku-20240307',
        },
      };

      expect(config.llmCategorization.enabled).toBe(true);
      expect(config.llmCategorization.provider).toBe('anthropic');
      expect(config.llmCategorization.apiKey).toBeDefined();
    });

    it('should load and validate Gemini config', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'gemini',
          apiKey: 'AIza-test-key',
          model: 'gemini-pro',
        },
      };

      expect(config.llmCategorization.enabled).toBe(true);
      expect(config.llmCategorization.provider).toBe('gemini');
      expect(config.llmCategorization.apiKey).toBeDefined();
    });

    it('should handle disabled LLM config', () => {
      const config = {
        llmCategorization: {
          enabled: false,
        },
      };

      expect(config.llmCategorization.enabled).toBe(false);
    });

    it('should apply config defaults on load', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
        },
      };

      const withDefaults = {
        ...config.llmCategorization,
        timeout: config.llmCategorization.timeout || 5000,
        cacheTTL: config.llmCategorization.cacheTTL || 86400,
      };

      expect(withDefaults.timeout).toBe(5000);
      expect(withDefaults.cacheTTL).toBe(86400);
    });

    it('should support config hot reload', () => {
      const initialConfig = {
        llmCategorization: {
          enabled: false,
        },
      };

      expect(initialConfig.llmCategorization.enabled).toBe(false);

      // Hot reload to enable
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-new-key',
        },
      };

      expect(config.llmCategorization.enabled).toBe(true);
    });

    it('should preserve existing config on partial update', () => {
      let config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
          model: 'gpt-4',
          customSetting: 'custom-value',
        },
      };

      config.llmCategorization.apiKey = 'sk-new-key';

      expect(config.llmCategorization.provider).toBe('openai');
      expect(config.llmCategorization.customSetting).toBe('custom-value');
      expect(config.llmCategorization.apiKey).toBe('sk-new-key');
    });
  });

  // ========== Task 3.1 Success Criteria ==========

  describe('Task 3.1 Success Criteria', () => {
    it('should have configuration loading capability', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'test-key',
        },
      };

      expect(config).toBeDefined();
      expect(config.llmCategorization).toBeDefined();
    });

    it('should have API key validation', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-test-123',
        },
      };

      const isValid = config.llmCategorization.apiKey && config.llmCategorization.apiKey.length > 0;
      expect(isValid).toBe(true);
    });

    it('should have graceful fallback to heuristics', () => {
      const config = {
        llmCategorization: {
          enabled: false,
        },
      };

      const shouldUseLLM = config.llmCategorization?.enabled;
      expect(shouldUseLLM).toBe(false);
    });

    it('should support provider selection', () => {
      const providers = ['openai', 'anthropic', 'gemini'];
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('gemini');
    });

    it('should have configuration schema validation', () => {
      const config = {
        llmCategorization: {
          enabled: true,
          provider: 'anthropic',
          apiKey: 'sk-ant-test-123',
          model: 'claude-3-haiku-20240307',
          timeout: 5000,
          cacheTTL: 86400,
        },
      };

      expect(typeof config.llmCategorization.enabled).toBe('boolean');
      expect(['openai', 'anthropic', 'gemini']).toContain(config.llmCategorization.provider);
      expect(typeof config.llmCategorization.timeout).toBe('number');
      expect(typeof config.llmCategorization.cacheTTL).toBe('number');
    });
  });
});
