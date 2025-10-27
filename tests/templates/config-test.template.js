/**
 * Configuration Test Template - Config Loading and Validation
 *
 * Purpose: Test configuration loading, merging, validation, and file watching
 * Use when: Testing config management, file operations, or validation logic
 *
 * Key Patterns:
 * - mock-fs for filesystem isolation
 * - vi.hoisted() for fs module mocking
 * - Configuration validation testing
 * - File watching behavior
 *
 * Based on Sprint 4 configuration testing patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import { YourConfigManager } from '../src/your-config-manager.js';

// Hoisted fs mock for configuration testing
const { mockReadFile, mockWatchFile } = vi.hoisted(() => {
  return {
    mockReadFile: vi.fn(),
    mockWatchFile: vi.fn()
  };
});

describe('YourConfigManager - Configuration Management', () => {
  let configManager;
  const testConfigPath = '/test/config.json';

  beforeEach(() => {
    // ARRANGE: Set up mock filesystem
    mockFs({
      '/test': {
        'config.json': JSON.stringify({
          setting1: 'value1',
          setting2: 42,
          nested: {
            option: true
          }
        }),
        'config-partial.json': JSON.stringify({
          setting2: 99
        }),
        'config-invalid.json': 'invalid JSON {',
        'config-empty.json': ''
      }
    });

    configManager = new YourConfigManager();
  });

  afterEach(() => {
    // Clean up mock filesystem
    mockFs.restore();
    vi.clearAllMocks();
  });

  describe('Configuration Loading', () => {
    it('should load valid configuration file', async () => {
      // ACT
      const config = await configManager.loadConfig(testConfigPath);

      // ASSERT
      expect(config).toBeDefined();
      expect(config.setting1).toBe('value1');
      expect(config.setting2).toBe(42);
      expect(config.nested.option).toBe(true);
    });

    it('should handle missing configuration file', async () => {
      // ARRANGE
      const missingPath = '/test/nonexistent.json';

      // ACT & ASSERT
      await expect(
        configManager.loadConfig(missingPath)
      ).rejects.toMatchObject({
        code: 'CONFIG_NOT_FOUND',
        message: expect.stringContaining('not found')
      });
    });

    it('should handle invalid JSON configuration', async () => {
      // ARRANGE
      const invalidPath = '/test/config-invalid.json';

      // ACT & ASSERT
      await expect(
        configManager.loadConfig(invalidPath)
      ).rejects.toMatchObject({
        code: 'CONFIG_PARSE_ERROR',
        message: expect.stringContaining('JSON')
      });
    });

    it('should handle empty configuration file', async () => {
      // ARRANGE
      const emptyPath = '/test/config-empty.json';

      // ACT & ASSERT
      await expect(
        configManager.loadConfig(emptyPath)
      ).rejects.toMatchObject({
        code: 'CONFIG_EMPTY',
        message: expect.stringContaining('empty')
      });
    });
  });

  describe('Configuration Merging', () => {
    it('should merge multiple configuration files', async () => {
      // ARRANGE
      const baseConfig = await configManager.loadConfig(testConfigPath);
      const partialConfig = await configManager.loadConfig('/test/config-partial.json');

      // ACT
      const merged = configManager.mergeConfigs([baseConfig, partialConfig]);

      // ASSERT: Later config overrides earlier
      expect(merged.setting1).toBe('value1'); // From base
      expect(merged.setting2).toBe(99); // Overridden by partial
      expect(merged.nested.option).toBe(true); // From base
    });

    it('should deep merge nested configuration', async () => {
      // ARRANGE
      mockFs({
        '/test': {
          'base.json': JSON.stringify({
            nested: {
              option1: true,
              option2: false
            }
          }),
          'override.json': JSON.stringify({
            nested: {
              option2: true,
              option3: 'new'
            }
          })
        }
      });

      const base = await configManager.loadConfig('/test/base.json');
      const override = await configManager.loadConfig('/test/override.json');

      // ACT
      const merged = configManager.mergeConfigs([base, override]);

      // ASSERT: Deep merge preserves all nested options
      expect(merged.nested.option1).toBe(true); // Preserved from base
      expect(merged.nested.option2).toBe(true); // Overridden
      expect(merged.nested.option3).toBe('new'); // Added from override
    });

    it('should handle array merging strategy', async () => {
      // ARRANGE
      mockFs({
        '/test': {
          'config1.json': JSON.stringify({
            items: ['a', 'b']
          }),
          'config2.json': JSON.stringify({
            items: ['c', 'd']
          })
        }
      });

      const config1 = await configManager.loadConfig('/test/config1.json');
      const config2 = await configManager.loadConfig('/test/config2.json');

      // ACT: Replace strategy (default)
      const replaceMerged = configManager.mergeConfigs([config1, config2], {
        arrayMerge: 'replace'
      });

      // ACT: Concatenate strategy
      const concatMerged = configManager.mergeConfigs([config1, config2], {
        arrayMerge: 'concat'
      });

      // ASSERT
      expect(replaceMerged.items).toEqual(['c', 'd']); // Replaced
      expect(concatMerged.items).toEqual(['a', 'b', 'c', 'd']); // Concatenated
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration schema', () => {
      // ARRANGE
      const config = {
        setting1: 'value1',
        setting2: 42,
        nested: {
          option: true
        }
      };

      const schema = {
        setting1: { type: 'string', required: true },
        setting2: { type: 'number', required: true },
        nested: {
          type: 'object',
          properties: {
            option: { type: 'boolean' }
          }
        }
      };

      // ACT
      const result = configManager.validate(config, schema);

      // ASSERT: Validation passes
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      // ARRANGE
      const config = {
        setting2: 42
      };

      const schema = {
        setting1: { type: 'string', required: true },
        setting2: { type: 'number', required: true }
      };

      // ACT
      const result = configManager.validate(config, schema);

      // ASSERT: Validation fails
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'setting1',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should detect type mismatches', () => {
      // ARRANGE
      const config = {
        setting1: 123, // Should be string
        setting2: 'not-a-number' // Should be number
      };

      const schema = {
        setting1: { type: 'string' },
        setting2: { type: 'number' }
      };

      // ACT
      const result = configManager.validate(config, schema);

      // ASSERT: Validation fails with type errors
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'setting1',
          message: expect.stringContaining('type')
        })
      );
    });

    it('should validate custom validation rules', () => {
      // ARRANGE
      const config = {
        port: 99999 // Invalid port range
      };

      const schema = {
        port: {
          type: 'number',
          validate: (value) => value >= 1 && value <= 65535
        }
      };

      // ACT
      const result = configManager.validate(config, schema);

      // ASSERT: Custom validation fails
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'port',
          message: expect.stringContaining('validation')
        })
      );
    });
  });

  describe('Configuration File Watching', () => {
    it('should watch configuration file for changes', async () => {
      // ARRANGE
      const changeSpy = vi.fn();
      configManager.on('configChanged', changeSpy);

      // ACT: Start watching
      await configManager.watch(testConfigPath);

      // Simulate file change
      mockFs({
        '/test': {
          'config.json': JSON.stringify({
            setting1: 'changed-value',
            setting2: 100
          })
        }
      });

      // Trigger change event
      configManager.triggerFileChange(testConfigPath);

      // ASSERT: Change event emitted
      await vi.waitFor(() => {
        expect(changeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            path: testConfigPath,
            newConfig: expect.objectContaining({
              setting1: 'changed-value',
              setting2: 100
            })
          })
        );
      });
    });

    it('should debounce rapid file changes', async () => {
      // ARRANGE
      const changeSpy = vi.fn();
      configManager.on('configChanged', changeSpy);
      await configManager.watch(testConfigPath, { debounce: 200 });

      // ACT: Trigger multiple rapid changes
      configManager.triggerFileChange(testConfigPath);
      configManager.triggerFileChange(testConfigPath);
      configManager.triggerFileChange(testConfigPath);

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 300));

      // ASSERT: Only one change event emitted
      expect(changeSpy).toHaveBeenCalledOnce();
    });

    it('should stop watching when unwatched', async () => {
      // ARRANGE
      const changeSpy = vi.fn();
      configManager.on('configChanged', changeSpy);
      await configManager.watch(testConfigPath);

      // ACT: Unwatch
      await configManager.unwatch(testConfigPath);

      // Trigger change after unwatching
      configManager.triggerFileChange(testConfigPath);

      // Wait to ensure no events emitted
      await new Promise(resolve => setTimeout(resolve, 200));

      // ASSERT: No change event emitted
      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Defaults', () => {
    it('should apply default values for missing fields', () => {
      // ARRANGE
      const partialConfig = {
        setting1: 'value1'
      };

      const defaults = {
        setting1: 'default1',
        setting2: 42,
        setting3: true
      };

      // ACT
      const config = configManager.applyDefaults(partialConfig, defaults);

      // ASSERT: Defaults applied
      expect(config.setting1).toBe('value1'); // User value preserved
      expect(config.setting2).toBe(42); // Default applied
      expect(config.setting3).toBe(true); // Default applied
    });

    it('should not override existing values with defaults', () => {
      // ARRANGE
      const config = {
        setting1: 'user-value',
        setting2: 99
      };

      const defaults = {
        setting1: 'default1',
        setting2: 42
      };

      // ACT
      const merged = configManager.applyDefaults(config, defaults);

      // ASSERT: User values preserved
      expect(merged.setting1).toBe('user-value');
      expect(merged.setting2).toBe(99);
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve environment variables in configuration', () => {
      // ARRANGE
      process.env.TEST_VAR = 'resolved-value';
      process.env.TEST_PORT = '8080';

      const config = {
        apiKey: '${TEST_VAR}',
        port: '${TEST_PORT}',
        url: 'http://localhost:${TEST_PORT}'
      };

      // ACT
      const resolved = configManager.resolveEnvVars(config);

      // ASSERT: Env vars resolved
      expect(resolved.apiKey).toBe('resolved-value');
      expect(resolved.port).toBe('8080');
      expect(resolved.url).toBe('http://localhost:8080');

      // Cleanup
      delete process.env.TEST_VAR;
      delete process.env.TEST_PORT;
    });

    it('should handle missing environment variables', () => {
      // ARRANGE
      const config = {
        apiKey: '${NONEXISTENT_VAR}'
      };

      // ACT & ASSERT
      expect(() => configManager.resolveEnvVars(config))
        .toThrow('Environment variable NONEXISTENT_VAR not found');
    });
  });
});

/**
 * CONFIGURATION TEST CHECKLIST:
 *
 * ✓ Configuration loading (valid, invalid, missing)
 * ✓ Configuration merging (shallow and deep)
 * ✓ Schema validation
 * ✓ Custom validation rules
 * ✓ File watching with debounce
 * ✓ Default value application
 * ✓ Environment variable resolution
 * ✓ mock-fs for filesystem isolation
 * ✓ Cleanup in afterEach
 * ✓ Error handling for all scenarios
 *
 * ANTI-PATTERNS TO AVOID:
 * ✗ Not cleaning up mock-fs
 * ✗ Testing filesystem implementation details
 * ✗ Hardcoded file paths without mocking
 * ✗ Not testing validation edge cases
 * ✗ Missing error scenario coverage
 */
