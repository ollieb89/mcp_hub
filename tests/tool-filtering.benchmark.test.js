import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

/**
 * Test Suite: Tool Filtering Performance Benchmarks
 * 
 * Task 3.3.3: Performance testing
 * - Validates non-blocking LLM architecture doesn't impact startup
 * - Validates cache hit rate is high after warmup
 */

describe('LLM Filtering Performance', () => {
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

  it('should not block server startup', async () => {
    // Arrange
    const config = {
      toolFiltering: {
        enabled: true,
        mode: 'category',
        categoryFilter: {
          categories: ['filesystem', 'web']
        },
        llmCategorization: { enabled: true }
      }
    };

    service = new ToolFilteringService(config, mockMcpHub);

    // Mock slow LLM (5 second delay)
    service.llmClient = {
      categorize: vi.fn(() => new Promise(resolve => setTimeout(() => resolve('web'), 5000)))
    };

    // Act - these should use pattern matching (fast, synchronous)
    const start = Date.now();
    
    const result1 = service.shouldIncludeTool('filesystem__read', 'fs', {
      description: 'Read a file'
    });
    
    const result2 = service.shouldIncludeTool('github__search', 'github', {
      description: 'Search repositories'
    });

    const elapsed = Date.now() - start;

    // Assert - should complete quickly without waiting for LLM
    expect(elapsed).toBeLessThan(100);
    expect(result1).toBe(true); // filesystem matches pattern, in allowed categories
    expect(result2).toBe(false); // search/version-control not in allowed categories
    
    // LLM should not have been called for these pattern-matched tools
    expect(service.llmClient.categorize).not.toHaveBeenCalled();
  });

  it('should have high cache hit rate', async () => {
    // Arrange
    const config = {
      toolFiltering: {
        enabled: true,
        mode: 'category',
        categoryFilter: {
          categories: ['web']
        },
        llmCategorization: { enabled: true }
      }
    };

    service = new ToolFilteringService(config, mockMcpHub);

    // Mock LLM to track call count
    service.llmClient = {
      categorize: vi.fn().mockResolvedValue('web')
    };

    // Act - categorize same tool 100 times
    const toolName = 'custom__tool';
    
    // First call: pattern match fails, returns 'other', queues background LLM
    for (let i = 0; i < 100; i++) {
      service.getToolCategory(toolName, 'custom', {
        description: 'Custom tool for testing'
      });
    }

    // Wait for background LLM to complete
    await vi.waitFor(() => {
      expect(service.llmClient.categorize).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Assert - LLM should only be called once (first time, then cached)
    expect(service.llmClient.categorize).toHaveBeenCalledTimes(1);

    // Calculate cache hit rate
    // First call: miss (pattern fails, queues LLM)
    // Next 99 calls: hits (categoryCache has 'other')
    const hitRate = service._cacheHits / (service._cacheHits + service._cacheMisses);
    
    // Should be 99/100 = 0.99 (99% cache hit rate)
    expect(hitRate).toBeGreaterThanOrEqual(0.99);
    
    // Verify stats
    expect(service._cacheHits).toBe(99); // Subsequent calls hit cache
    expect(service._cacheMisses).toBe(1); // First call missed cache
  });
});
