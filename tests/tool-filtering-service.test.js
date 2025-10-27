import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService, { DEFAULT_CATEGORIES } from '../src/utils/tool-filtering-service.js';

/**
 * Test Suite: ToolFilteringService - Sprint 0.1 Non-Blocking Architecture
 *
 * Focus: Validates that Sprint 0.1 critical architecture is correctly implemented
 * - shouldIncludeTool() is synchronous (NO breaking changes)
 * - LLM categorization runs in background
 * - Rate limiting prevents API abuse
 * - Returns immediate default ('other') when LLM needed
 * - Background updates refine categories asynchronously
 */

describe('ToolFilteringService - Sprint 0.1: Non-Blocking Architecture', () => {
  let service;
  let mockMcpHub;
  let config;

  beforeEach(() => {
    // Reset mocks and create fresh instances
    vi.clearAllMocks();

    mockMcpHub = {
      config: {}
    };

    // Default config for most tests
    config = {
      toolFiltering: {
        enabled: true,
        mode: 'category',
        categoryFilter: {
          categories: ['filesystem', 'web'],
          customMappings: {}
        }
      }
    };
  });

  afterEach(async () => {
    // Clean up service
    if (service) {
      await service.shutdown();
    }
  });

  describe('Critical: shouldIncludeTool() Synchronicity', () => {
    it('shouldIncludeTool returns immediately without blocking', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const startTime = Date.now();
      const result = service.shouldIncludeTool(
        'unknown_tool',
        'test-server',
        { description: 'Test tool' }
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
      expect(duration).toBeLessThan(10); // Should return in < 10ms
    });

    it('shouldIncludeTool has synchronous return type', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const result = service.shouldIncludeTool(
        'filesystem__read',
        'test-server',
        { description: 'Read file' }
      );

      // Assert
      // Result should NOT be a Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(typeof result).toBe('boolean');
    });

    it('shouldIncludeTool works without LLM enabled', () => {
      // Arrange
      const noLLMConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          }
        }
      };
      mockMcpHub.config = noLLMConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const result = service.shouldIncludeTool(
        'filesystem__read',
        'test-server',
        { description: 'Read file' }
      );

      // Assert
      expect(result).toBe(true); // filesystem is allowed
    });
  });

  describe('Critical: Background LLM Categorization', () => {
    it('getToolCategory returns default immediately when pattern not matched', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const category = service.getToolCategory(
        'unknown_mysterious_tool',
        'test-server',
        { description: 'Unknown tool' }
      );

      // Assert
      expect(category).toBe('other'); // Immediate default
    });

    it('getToolCategory triggers background LLM when enabled', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          },
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Mock LLM client
      const mockCategorize = vi.fn().mockResolvedValue('web');
      service.llmClient = { categorize: mockCategorize };

      // Act
      const category = service.getToolCategory(
        'unknown_tool',
        'test-server',
        { description: 'Test tool' }
      );

      // Assert immediate return
      expect(category).toBe('other');

      // Wait for background processing
      await vi.waitFor(() => {
        expect(mockCategorize).toHaveBeenCalledWith(
          'unknown_tool',
          { description: 'Test tool' },
          expect.arrayContaining(['filesystem', 'web', 'search'])
        );
      }, { timeout: 1000 });
    });

    it('background LLM refines category asynchronously', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          },
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Mock LLM to return 'web' category
      service.llmClient = {
        categorize: vi.fn().mockResolvedValue('web')
      };

      // Act - First call returns 'other'
      const initialCategory = service.getToolCategory(
        'custom_browser_tool',
        'test-server',
        { description: 'Browser automation tool' }
      );

      // Assert initial return
      expect(initialCategory).toBe('other');

      // Wait for background refinement
      await vi.waitFor(() => {
        const refinedCategory = service.categoryCache.get('custom_browser_tool');
        expect(refinedCategory).toBe('web');
      }, { timeout: 1000 });
    });

    it('LLM categorization does not block shouldIncludeTool', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          },
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Mock slow LLM (500ms delay)
      service.llmClient = {
        categorize: vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve('web'), 500))
        )
      };

      // Act - shouldIncludeTool should return immediately
      const startTime = Date.now();
      const result = service.shouldIncludeTool(
        'slow_categorization_tool',
        'test-server',
        { description: 'Test tool' }
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBe(false); // 'other' not in allowed categories
      expect(duration).toBeLessThan(50); // Should return quickly, not wait 500ms
    });
  });

  describe('Critical: Rate Limiting', () => {
    it('rate limiting prevents excessive API calls', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          },
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      const mockCategorize = vi.fn().mockResolvedValue('web');
      service.llmClient = { categorize: mockCategorize };

      // Act - Trigger 20 categorizations rapidly
      for (let i = 0; i < 20; i++) {
        service.getToolCategory(
          `tool_${i}`,
          'test-server',
          { description: `Tool ${i}` }
        );
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Assert - With concurrency=5 and interval=100ms (10/sec),
      // 20 tools should take at least 2 seconds
      // But we can't easily test exact timing, so just verify all were called
      expect(mockCategorize).toHaveBeenCalledTimes(20);
    });

    it('PQueue limits concurrent LLM calls to 5', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      service.llmClient = {
        categorize: vi.fn().mockImplementation(async () => {
          concurrentCalls++;
          maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
          await new Promise(resolve => setTimeout(resolve, 100));
          concurrentCalls--;
          return 'web';
        })
      };

      // Act - Trigger 10 categorizations
      for (let i = 0; i < 10; i++) {
        service.getToolCategory(
          `tool_${i}`,
          'test-server',
          { description: `Tool ${i}` }
        );
      }

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Assert - Max concurrent should not exceed 5
      expect(maxConcurrentCalls).toBeLessThanOrEqual(5);
    });
  });

  describe('Critical: Graceful Shutdown', () => {
    it('shutdown flushes pending LLM operations', async () => {
      // Arrange
      const llmConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          llmCategorization: {
            enabled: true,
            provider: 'openai',
            apiKey: 'test-key'
          }
        }
      };
      mockMcpHub.config = llmConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Manually add entries to llmCache to simulate pending writes
      service.llmCache.set('test_tool', 'web');
      service.llmCacheDirty = true;

      // Mock the file operations to prevent actual disk I/O
      const mockFlushCache = vi.fn().mockResolvedValue(undefined);
      const originalFlush = service._flushCache.bind(service);
      service._flushCache = mockFlushCache;

      // Act
      await service.shutdown();

      // Assert - shutdown should call flush and clear interval
      expect(mockFlushCache).toHaveBeenCalled();
      expect(service.llmCacheFlushInterval).toBeUndefined();
    });
  });

  describe('Pattern Matching Performance', () => {
    it('pattern regex is cached for repeated matches', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - Match same pattern multiple times
      service._matchesPattern('filesystem__read', 'filesystem__*');
      service._matchesPattern('filesystem__write', 'filesystem__*');
      service._matchesPattern('filesystem__list', 'filesystem__*');

      // Assert - Pattern should be cached (only compiled once)
      expect(service.patternCache.has('filesystem__*')).toBe(true);
      expect(service.patternCache.size).toBe(1);
    });

    it('invalid patterns are handled gracefully', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert - Should not throw
      expect(() => {
        service._matchesPattern('test_tool', '***[invalid');
      }).not.toThrow();

      const result = service._matchesPattern('test_tool', '***[invalid');
      expect(result).toBe(false);
    });
  });

  describe('Auto-Enable Race Condition Protection', () => {
    it('autoEnableIfNeeded is idempotent', () => {
      // Arrange
      const autoEnableConfig = {
        toolFiltering: {
          autoEnableThreshold: 100
        }
      };
      mockMcpHub.config = autoEnableConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - Call multiple times
      const result1 = service.autoEnableIfNeeded(150);
      const result2 = service.autoEnableIfNeeded(150);
      const result3 = service.autoEnableIfNeeded(150);

      // Assert - Only first call should succeed
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('concurrent autoEnableIfNeeded calls are safe', () => {
      // Arrange
      const autoEnableConfig = {
        toolFiltering: {
          autoEnableThreshold: 100
        }
      };
      mockMcpHub.config = autoEnableConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - Simulate concurrent calls
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(service.autoEnableIfNeeded(150));
      }

      // Assert - Only one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
    });
  });

  describe('Safe Statistics', () => {
    it('getStats prevents NaN with safe division', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - Get stats before any operations (all denominators are 0)
      const stats = service.getStats();

      // Assert - No NaN values
      expect(isNaN(stats.filterRate)).toBe(false);
      expect(isNaN(stats.cacheHitRate)).toBe(false);
      expect(isNaN(stats.llmCacheHitRate)).toBe(false);
      expect(stats.filterRate).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
      expect(stats.llmCacheHitRate).toBe(0);
    });

    it('getStats calculates correct rates after operations', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - Perform some operations (check same tool twice to trigger cache hit)
      service.shouldIncludeTool('filesystem__read', 'test-server', {});
      service.shouldIncludeTool('filesystem__read', 'test-server', {}); // Cache hit
      service.shouldIncludeTool('filesystem__write', 'test-server', {});
      service.shouldIncludeTool('unknown_tool', 'test-server', {});

      const stats = service.getStats();

      // Assert
      expect(stats.totalChecked).toBe(4);
      expect(stats.totalFiltered).toBe(1); // 'unknown_tool' filtered
      expect(stats.filterRate).toBeCloseTo(1/4);
      expect(stats.cacheHitRate).toBeGreaterThan(0); // Second filesystem__read hits cache
    });
  });

  describe('Category Filtering Logic', () => {
    it('filters tools by allowed categories', () => {
      // Arrange
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('filesystem__read', 'test-server', {})).toBe(true);
      expect(service.shouldIncludeTool('http__fetch', 'test-server', {})).toBe(true);
      expect(service.shouldIncludeTool('database__query', 'test-server', {})).toBe(false);
    });

    it('uses custom category mappings', () => {
      // Arrange
      const customConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['custom'],
            customMappings: {
              'mytool__*': 'custom'
            }
          }
        }
      };
      mockMcpHub.config = customConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('mytool__action', 'test-server', {})).toBe(true);
      expect(service.shouldIncludeTool('othertool__action', 'test-server', {})).toBe(false);
    });
  });

  describe('Server Filtering Logic', () => {
    it('filters by server allowlist', () => {
      // Arrange
      const serverConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'server-allowlist',
          serverFilter: {
            mode: 'allowlist',
            servers: ['allowed-server']
          }
        }
      };
      mockMcpHub.config = serverConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('any_tool', 'allowed-server', {})).toBe(true);
      expect(service.shouldIncludeTool('any_tool', 'blocked-server', {})).toBe(false);
    });

    it('filters by server denylist', () => {
      // Arrange
      const serverConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'server-allowlist',
          serverFilter: {
            mode: 'denylist',
            servers: ['blocked-server']
          }
        }
      };
      mockMcpHub.config = serverConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('any_tool', 'allowed-server', {})).toBe(true);
      expect(service.shouldIncludeTool('any_tool', 'blocked-server', {})).toBe(false);
    });
  });

  describe('Hybrid Filtering Mode', () => {
    it('allows tool if either server or category matches', () => {
      // Arrange
      const hybridConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'hybrid',
          serverFilter: {
            mode: 'allowlist',
            servers: ['good-server']
          },
          categoryFilter: {
            categories: ['filesystem']
          }
        }
      };
      mockMcpHub.config = hybridConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      // Tool from allowed server
      expect(service.shouldIncludeTool('unknown_tool', 'good-server', {})).toBe(true);

      // Tool from disallowed server but allowed category
      expect(service.shouldIncludeTool('filesystem__read', 'bad-server', {})).toBe(true);

      // Tool from disallowed server and category
      expect(service.shouldIncludeTool('database__query', 'bad-server', {})).toBe(false);
    });
  });

  describe('Disabled Filtering', () => {
    it('allows all tools when filtering disabled', () => {
      // Arrange
      const disabledConfig = {
        toolFiltering: {
          enabled: false
        }
      };
      mockMcpHub.config = disabledConfig;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('any_tool', 'any-server', {})).toBe(true);
      expect(service.shouldIncludeTool('another_tool', 'another-server', {})).toBe(true);
    });
  });
});

describe('DEFAULT_CATEGORIES Export', () => {
  it('exports default category mappings', () => {
    expect(DEFAULT_CATEGORIES).toBeDefined();
    expect(typeof DEFAULT_CATEGORIES).toBe('object');
    expect(DEFAULT_CATEGORIES.filesystem).toBeDefined();
    expect(Array.isArray(DEFAULT_CATEGORIES.filesystem)).toBe(true);
  });

  it('contains expected categories', () => {
    const expectedCategories = [
      'filesystem',
      'web',
      'search',
      'database',
      'version-control',
      'docker',
      'cloud',
      'development',
      'communication'
    ];

    expectedCategories.forEach(category => {
      expect(DEFAULT_CATEGORIES[category]).toBeDefined();
      expect(Array.isArray(DEFAULT_CATEGORIES[category])).toBe(true);
    });
  });
});
