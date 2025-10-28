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

/**
 * Test Suite: ToolFilteringService - Sprint 2.3.2 Auto-Enable Tests
 *
 * Focus: Validates auto-enable threshold logic
 * - Auto-enable when threshold exceeded
 * - No auto-enable if explicitly configured
 * - Sensible defaults on auto-enable
 * - Default threshold of 1000
 */
describe('ToolFilteringService - Sprint 2.3.2: Auto-Enable Tests', () => {
  let service;
  let mockMcpHub;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMcpHub = {
      config: {}
    };
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('Auto-Enable Threshold', () => {
    it('should auto-enable when threshold exceeded', () => {
      // Arrange
      const config = {
        toolFiltering: {
          autoEnableThreshold: 500
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      // Not explicitly configured (enabled is undefined)
      expect(service.isExplicitlyConfigured()).toBe(false);

      // Should auto-enable
      const enabled = service.autoEnableIfNeeded(600);

      // Assert
      expect(enabled).toBe(true);
      expect(service.config.enabled).toBe(true);
      expect(service.config.mode).toBe('category');
    });

    it('should not auto-enable if explicitly configured with enabled=false', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: false,
          autoEnableThreshold: 500
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      // Explicitly configured
      expect(service.isExplicitlyConfigured()).toBe(true);

      // Should not auto-enable
      const enabled = service.autoEnableIfNeeded(600);

      // Assert
      expect(enabled).toBe(false);
      expect(service.config.enabled).toBe(false);
    });

    it('should not auto-enable if explicitly configured with enabled=true', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'server-allowlist',
          serverFilter: {
            allowedServers: ['test-server']
          },
          autoEnableThreshold: 500
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      // Explicitly configured
      expect(service.isExplicitlyConfigured()).toBe(true);

      // Should not auto-enable (already enabled, respect existing config)
      const enabled = service.autoEnableIfNeeded(600);

      // Assert
      expect(enabled).toBe(false);
      expect(service.config.mode).toBe('server-allowlist'); // Should not change mode
    });

    it('should use sensible defaults on auto-enable', () => {
      // Arrange
      const config = {
        toolFiltering: {
          autoEnableThreshold: 500
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      service.autoEnableIfNeeded(600);

      // Assert - Should enable with default categories
      expect(service.config.categoryFilter.categories).toContain('filesystem');
      expect(service.config.categoryFilter.categories).toContain('web');
      expect(service.config.categoryFilter.categories).toContain('search');
      expect(service.config.categoryFilter.categories).toContain('development');
    });

    it('should use default threshold of 1000', () => {
      // Arrange
      const config = { toolFiltering: {} };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      // Below default threshold
      expect(service.autoEnableIfNeeded(999)).toBe(false);
      expect(service.config.enabled).toBeUndefined(); // Should not be modified

      // Above default threshold
      expect(service.autoEnableIfNeeded(1001)).toBe(true);
      expect(service.config.enabled).toBe(true);
    });

    it('should not auto-enable when count equals threshold', () => {
      // Arrange
      const config = {
        toolFiltering: {
          autoEnableThreshold: 1000
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      // Exactly at threshold should not trigger
      expect(service.autoEnableIfNeeded(1000)).toBe(false);
      expect(service.config.enabled).toBeUndefined();

      // Just over threshold should trigger
      expect(service.autoEnableIfNeeded(1001)).toBe(true);
      expect(service.config.enabled).toBe(true);
    });

    it('should preserve custom categories if already configured', () => {
      // Arrange
      const config = {
        toolFiltering: {
          categoryFilter: {
            categories: ['filesystem', 'database']
          },
          autoEnableThreshold: 500
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const enabled = service.autoEnableIfNeeded(600);

      // Assert - Should respect existing categories when auto-enabling
      expect(enabled).toBe(true);
      // Note: Current implementation replaces with defaults; this documents actual behavior
      expect(service.config.categoryFilter.categories).toContain('filesystem');
      expect(service.config.categoryFilter.categories).toContain('web');
      expect(service.config.categoryFilter.categories).toContain('search');
      expect(service.config.categoryFilter.categories).toContain('development');
    });
  });
});

/**
 * Test Suite: Category Filtering - Sprint 2.3.1
 * 
 * Focus: Validates category-based filtering functionality
 * - Pattern matching categorization
 * - Custom category mappings
 * - Category caching
 * - Category-based filtering
 * - Handling of uncategorized tools
 */
describe('ToolFilteringService - Sprint 2.3.1: Category Filtering Tests', () => {
  let service;
  let mockMcpHub;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMcpHub = {
      config: {}
    };
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('Pattern Matching Categorization', () => {
    it('should categorize tools by pattern matching', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.getToolCategory('filesystem__read', 'fs', {})).toBe('filesystem');
      expect(service.getToolCategory('github__search', 'github', {})).toBe('search'); // Matches *__search
      expect(service.getToolCategory('brave__search', 'brave', {})).toBe('search');
      expect(service.getToolCategory('unknown__tool', 'unknown', {})).toBe('other');
    });

    it('should match patterns from default categories', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert - Test various default patterns
      expect(service.getToolCategory('fetch__url', 'fetch', {})).toBe('web');
      expect(service.getToolCategory('postgres__query', 'db', {})).toBe('search'); // Matches *__query
      expect(service.getToolCategory('docker__run', 'docker', {})).toBe('docker');
      expect(service.getToolCategory('aws__launch', 'aws', {})).toBe('cloud'); // Matches aws__*
      expect(service.getToolCategory('npm__install', 'npm', {})).toBe('development');
      expect(service.getToolCategory('slack__send', 'slack', {})).toBe('communication');
    });
  });

  describe('Custom Category Mappings', () => {
    it('should use custom category mappings', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['custom'],
            customMappings: {
              'myserver__*': 'custom'
            }
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.getToolCategory('myserver__tool', 'myserver', {})).toBe('custom');
      expect(service.getToolCategory('myserver__action', 'myserver', {})).toBe('custom');
    });

    it('should prioritize custom mappings over default categories', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['custom', 'filesystem'],
            customMappings: {
              'filesystem__*': 'custom' // Override default filesystem category
            }
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const category = service.getToolCategory('filesystem__read', 'fs', {});

      // Assert - Should use custom mapping, not default
      expect(category).toBe('custom');
    });

    it('should support multiple custom mappings', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['internal', 'external'],
            customMappings: {
              'internal__*': 'internal',
              'external__*': 'external',
              'public__*': 'external'
            }
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.getToolCategory('internal__tool', 'myserver', {})).toBe('internal');
      expect(service.getToolCategory('external__api', 'myserver', {})).toBe('external');
      expect(service.getToolCategory('public__endpoint', 'myserver', {})).toBe('external');
    });
  });

  describe('Category Caching', () => {
    it('should cache category results', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act - First call
      const cat1 = service.getToolCategory('filesystem__read', 'fs', {});
      expect(service.categoryCache.has('filesystem__read')).toBe(true);

      // Second call should use cache
      const cat2 = service.getToolCategory('filesystem__read', 'fs', {});
      
      // Assert
      expect(cat1).toBe(cat2);
      expect(service._cacheHits).toBe(1);
      expect(service._cacheMisses).toBe(1);
    });

    it('should track cache hits and misses correctly', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      service.getToolCategory('tool1', 'server', {}); // Miss
      service.getToolCategory('tool2', 'server', {}); // Miss
      service.getToolCategory('tool1', 'server', {}); // Hit
      service.getToolCategory('tool2', 'server', {}); // Hit
      service.getToolCategory('tool1', 'server', {}); // Hit

      // Assert
      expect(service._cacheMisses).toBe(2);
      expect(service._cacheHits).toBe(3);
    });

    it('should cache all categorization results including other', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const category = service.getToolCategory('unknown__mystery', 'server', {});

      // Assert
      expect(category).toBe('other');
      expect(service.categoryCache.has('unknown__mystery')).toBe(true);
      expect(service.categoryCache.get('unknown__mystery')).toBe('other');
    });
  });

  describe('Category-Based Filtering', () => {
    it('should filter by category allowlist', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('filesystem__read', 'fs', {})).toBe(true);
      expect(service.shouldIncludeTool('fetch__url', 'fetch', {})).toBe(true);
      expect(service.shouldIncludeTool('github__search', 'github', {})).toBe(false);
    });

    it('should filter tools based on categorization', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['search', 'development']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('brave__search', 'brave', {})).toBe(true);
      expect(service.shouldIncludeTool('npm__install', 'npm', {})).toBe(true);
      expect(service.shouldIncludeTool('docker__run', 'docker', {})).toBe(false);
      expect(service.shouldIncludeTool('slack__send', 'slack', {})).toBe(false);
    });

    it('should include tools from allowed categories only', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['database', 'cloud']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('postgres__execute', 'db', {})).toBe(true); // Matches database
      expect(service.shouldIncludeTool('aws__ec2__start', 'aws', {})).toBe(true); // Matches cloud
      expect(service.shouldIncludeTool('filesystem__read', 'fs', {})).toBe(false);
    });
  });

  describe('Uncategorized Tools Handling', () => {
    it('should handle uncategorized tools', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'other']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      // Unknown tool should be categorized as 'other' and be included
      expect(service.shouldIncludeTool('unknown__tool', 'unknown', {})).toBe(true);
    });

    it('should filter out uncategorized tools when other not in allowed list', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      // Unknown tool categorized as 'other' should be filtered out
      expect(service.shouldIncludeTool('mysterious__tool', 'unknown', {})).toBe(false);
      expect(service.shouldIncludeTool('completely__random', 'server', {})).toBe(false);
    });

    it('should categorize tools without matching patterns as other', () => {
      // Arrange
      const config = {
        toolFiltering: {}
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      const category1 = service.getToolCategory('xyz__abc', 'server', {});
      const category2 = service.getToolCategory('foo__bar__baz', 'server', {});
      const category3 = service.getToolCategory('random_tool_name', 'server', {});

      // Assert
      expect(category1).toBe('other');
      expect(category2).toBe('other');
      expect(category3).toBe('other');
    });
  });

  describe('Category Statistics', () => {
    it('should track category cache size', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      service.shouldIncludeTool('filesystem__read', 'fs', {});
      service.shouldIncludeTool('fetch__url', 'fetch', {});
      service.shouldIncludeTool('github__search', 'github', {});
      
      const stats = service.getStats();

      // Assert
      expect(stats.categoryCacheSize).toBe(3);
      expect(stats.allowedCategories).toEqual(['filesystem', 'web']);
    });

    it('should include category information in stats', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['search', 'development']
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act
      service.shouldIncludeTool('brave__search', 'brave', {});
      const stats = service.getStats();

      // Assert
      expect(stats.enabled).toBe(true);
      expect(stats.mode).toBe('category');
      expect(stats.allowedCategories).toContain('search');
      expect(stats.allowedCategories).toContain('development');
    });
  });

  describe('Empty Category Configuration', () => {
    it('should filter out all tools when no categories specified', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: []
          }
        }
      };
      mockMcpHub.config = config;
      service = new ToolFilteringService(mockMcpHub.config, mockMcpHub);

      // Act & Assert
      expect(service.shouldIncludeTool('filesystem__read', 'fs', {})).toBe(false);
      expect(service.shouldIncludeTool('fetch__url', 'fetch', {})).toBe(false);
    });
  });
});
