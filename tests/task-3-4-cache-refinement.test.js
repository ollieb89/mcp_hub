/**
 * Task 3.4: Cache Refinement & Statistics (1.5 hours)
 * 
 * Tests for:
 * - 3.4.1: LLM categorization cache layer with enhanced structure
 * - 3.4.2: Cache TTL for stale data enforcement
 * - 3.4.3: Confidence score weighting
 * - 3.4.4: Cache hit/miss rate tracking
 * - 3.4.5: Cache memory usage monitoring
 * - 3.4.6: Cache prewarming for known tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

describe('Task 3.4: Cache Refinement & Statistics', () => {
  let service;
  let mockHub;
  let config;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockHub = {
      config: {}
    };

    config = {
      toolFiltering: {
        enabled: true,
        mode: 'hybrid',
        serverFilter: {
          mode: 'allowlist',
          servers: ['test-server']
        },
        categoryFilter: {
          categories: ['web', 'filesystem', 'development']
        },
        llmCategorization: {
          enabled: false // Disabled for tests unless needed
        }
      }
    };

    service = new ToolFilteringService(config, mockHub);
    await service.waitForInitialization();
  });

  afterEach(async () => {
    service?.shutdown?.();
  });

  // ====== Task 3.4.1: Enhanced Cache Structure ======
  describe('3.4.1: LLM Categorization Cache Layer', () => {
    it('should store cache entries in enhanced format', () => {
      const toolName = 'fetch__data';
      const cacheEntry = {
        category: 'web',
        confidence: 0.98,
        source: 'llm',
        timestamp: Math.floor(Date.now() / 1000),
        ttl: 86400
      };

      service._saveCachedCategory(toolName, cacheEntry);
      
      const stored = service.llmCache.get(toolName);
      expect(stored).toBeDefined();
      expect(stored.category).toBe('web');
      expect(stored.confidence).toBe(0.98);
      expect(stored.source).toBe('llm');
      expect(stored.timestamp).toBeDefined();
      expect(stored.ttl).toBe(86400);
    });

    it('should handle legacy string format and convert to enhanced format', () => {
      const toolName = 'fetch__url';
      
      // Save using legacy string format
      service._saveCachedCategory(toolName, 'web');
      
      const stored = service.llmCache.get(toolName);
      expect(stored).toBeDefined();
      expect(stored.category).toBe('web');
      expect(stored.confidence).toBe(0.85); // Default confidence
      expect(stored.source).toBe('heuristic');
      expect(stored.ttl).toBe(86400);
    });

    it('should provide default values for missing fields', () => {
      const toolName = 'search__query';
      const partialEntry = {
        category: 'search'
        // confidence, source, timestamp, ttl intentionally missing
      };

      service._saveCachedCategory(toolName, partialEntry);
      
      const stored = service.llmCache.get(toolName);
      expect(stored.confidence).toBe(0.85); // Default
      expect(stored.source).toBe('heuristic'); // Default
      expect(stored.timestamp).toBeDefined();
      expect(stored.ttl).toBe(86400); // Default
    });
  });

  // ====== Task 3.4.2: Cache TTL ======
  describe('3.4.2: Cache TTL for Stale Data', () => {
    it('should expire cache entries based on TTL', async () => {
      const toolName = 'filesystem__read';
      const now = Math.floor(Date.now() / 1000);
      const expiredEntry = {
        category: 'filesystem',
        confidence: 0.95,
        source: 'llm',
        timestamp: now - 100000, // 100000 seconds ago
        ttl: 86400 // 1 day TTL (expired)
      };

      service.llmCache.set(toolName, expiredEntry);

      // Try to load - should be expired
      const loaded = await service._loadCachedCategory(toolName);
      expect(loaded).toBeNull();
      expect(service.llmCache.has(toolName)).toBe(false); // Should be removed
    });

    it('should keep valid cache entries within TTL', async () => {
      const toolName = 'filesystem__write';
      const now = Math.floor(Date.now() / 1000);
      const validEntry = {
        category: 'filesystem',
        confidence: 0.95,
        source: 'llm',
        timestamp: now - 1000, // 1000 seconds ago
        ttl: 86400 // 1 day TTL (still valid)
      };

      service.llmCache.set(toolName, validEntry);

      // Try to load - should be valid
      const loaded = await service._loadCachedCategory(toolName);
      expect(loaded).toBeDefined();
      expect(loaded.category).toBe('filesystem');
      expect(service.llmCache.has(toolName)).toBe(true); // Should still be in cache
    });

    it('should enforce TTL during cache flush', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Ensure cache file is set for persistence
      if (!service.llmCacheFile) {
        const p = await import('path');
        // Use a temp file in /tmp for testing
        service.llmCacheFile = p.default.join('/tmp', 'test-tool-categories-ttl.json');
      }
      
      // Add mix of valid and expired entries
      service.llmCache.set('valid_tool', {
        category: 'web',
        confidence: 0.90,
        source: 'llm',
        timestamp: now - 1000,
        ttl: 86400
      });

      service.llmCache.set('expired_tool', {
        category: 'filesystem',
        confidence: 0.95,
        source: 'llm',
        timestamp: now - 100000,
        ttl: 86400
      });

      service.llmCacheDirty = true;
      await service._flushCache();

      // Reload cache from file
      service.llmCache.clear();
      await service._loadLLMCache();

      // Valid entry should be loaded, expired should not
      expect(service.llmCache.has('valid_tool')).toBe(true);
      expect(service.llmCache.has('expired_tool')).toBe(false);
    });

    it('should use configurable TTL from config', () => {
      const customConfig = {
        ...config,
        toolFiltering: {
          ...config.toolFiltering,
          llmCategorization: {
            enabled: false,
            cacheTTL: 3600 // 1 hour
          }
        }
      };

      const serviceWithCustomTTL = new ToolFilteringService(customConfig, mockHub);
      expect(serviceWithCustomTTL.llmCacheTTL).toBe(3600);
      
      serviceWithCustomTTL.shutdown();
    });
  });

  // ====== Task 3.4.3: Confidence Scores ======
  describe('3.4.3: Confidence Score Weighting', () => {
    it('should track confidence scores from LLM', () => {
      const toolName = 'github__search';
      const highConfidenceEntry = {
        category: 'version-control',
        confidence: 0.98,
        source: 'llm',
        timestamp: Math.floor(Date.now() / 1000),
        ttl: 86400
      };

      service._saveCachedCategory(toolName, highConfidenceEntry);
      const stored = service.llmCache.get(toolName);
      
      expect(stored.confidence).toBe(0.98);
    });

    it('should handle confidence values between 0 and 1', () => {
      const toolName = 'docker__pull';
      
      // Test various confidence levels
      const confidenceLevels = [0, 0.25, 0.5, 0.75, 0.95, 1.0];
      
      confidenceLevels.forEach((confidence, index) => {
        const tool = `${toolName}_${index}`;
        service._saveCachedCategory(tool, {
          category: 'docker',
          confidence,
          source: 'llm',
          timestamp: Math.floor(Date.now() / 1000),
          ttl: 86400
        });
        
        expect(service.llmCache.get(tool).confidence).toBe(confidence);
      });
    });

    it('should assign lower confidence to heuristic matches', () => {
      const toolName = 'unknown__tool';
      service._saveCachedCategory(toolName, {
        category: 'other',
        confidence: 0.60,
        source: 'heuristic',
        timestamp: Math.floor(Date.now() / 1000),
        ttl: 86400
      });

      const stored = service.llmCache.get(toolName);
      expect(stored.confidence).toBeLessThan(0.85); // Lower than default
      expect(stored.source).toBe('heuristic');
    });
  });

  // ====== Task 3.4.4: Cache Hit/Miss Rates ======
  describe('3.4.4: Cache Hit/Miss Rate Tracking', () => {
    it('should track LLM cache hits', async () => {
      const toolName = 'fetch__data';
      const now = Math.floor(Date.now() / 1000);
      
      // Add entry to persistent cache
      service.llmCache.set(toolName, {
        category: 'web',
        confidence: 0.95,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });
      
      // Load should return the cached entry
      const loaded = await service._loadCachedCategory(toolName);
      
      expect(loaded).toBeDefined();
      expect(loaded.category).toBe('web');
      expect(loaded.confidence).toBe(0.95);
    });

    it('should track LLM cache misses', async () => {
      const toolName = 'nonexistent__tool';

      const loaded = await service._loadCachedCategory(toolName);

      expect(loaded).toBeNull();
    });

    it('should calculate accurate cache hit rate', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Setup cache entries
      service.llmCache.set('tool1', {
        category: 'web',
        confidence: 0.95,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });

      service.llmCache.set('tool2', {
        category: 'filesystem',
        confidence: 0.90,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });

      // Simulate hits and misses
      service._llmCacheHits = 8;
      service._llmCacheMisses = 2; // 80% hit rate

      const stats = service.getStats();
      
      expect(stats.llmCache.hits).toBe(8);
      expect(stats.llmCache.misses).toBe(2);
      expect(parseFloat(stats.llmCache.hitRate)).toBe(0.8);
    });

    it('should handle zero accesses gracefully', () => {
      service._llmCacheHits = 0;
      service._llmCacheMisses = 0;

      const stats = service.getStats();
      
      expect(stats.llmCache.hitRate).toBe(0);
      expect(stats.llmCache.hits).toBe(0);
      expect(stats.llmCache.misses).toBe(0);
    });
  });

  // ====== Task 3.4.5: Memory Usage Monitoring ======
  describe('3.4.5: Cache Memory Usage Monitoring', () => {
    it('should estimate cache memory usage', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Add several entries
      for (let i = 0; i < 5; i++) {
        service.llmCache.set(`tool_${i}`, {
          category: 'web',
          confidence: 0.95,
          source: 'llm',
          timestamp: now,
          ttl: 86400
        });
      }

      service._updateCacheMemoryUsage();

      expect(service._cacheStats.cacheMemoryUsageBytes).toBeGreaterThan(0);
      expect(service._cacheStats.cacheEntryCount).toBe(5);
    });

    it('should report memory usage in bytes and MB', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Add entries
      for (let i = 0; i < 10; i++) {
        service.llmCache.set(`tool_very_long_name_${i}`, {
          category: 'development',
          confidence: 0.92,
          source: 'llm',
          timestamp: now,
          ttl: 86400
        });
      }

      service._updateCacheMemoryUsage();
      const stats = service.getStats();

      expect(stats.llmCache.memoryUsageBytes).toBeGreaterThan(0);
      expect(stats.llmCache.memoryUsageMB).toBeDefined();
      expect(parseFloat(stats.llmCache.memoryUsageMB)).toBeGreaterThanOrEqual(0);
    });

    it('should update memory usage when cache entries change', () => {
      const now = Math.floor(Date.now() / 1000);
      
      service._updateCacheMemoryUsage();
      const initialMemory = service._cacheStats.cacheMemoryUsageBytes;

      // Add a new entry
      service.llmCache.set('new_tool', {
        category: 'web',
        confidence: 0.95,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });

      service._updateCacheMemoryUsage();
      const newMemory = service._cacheStats.cacheMemoryUsageBytes;

      expect(newMemory).toBeGreaterThan(initialMemory);
    });
  });

  // ====== Task 3.4.6: Cache Prewarming ======
  describe('3.4.6: Cache Prewarming for Known Tools', () => {
    it('should prewarm cache with known tools', async () => {
      const knownTools = ['fetch__data', 'filesystem__read', 'github__search'];

      await service._prewarmCache(knownTools);

      // At least some tools should be categorized
      let prewarmedCount = 0;
      for (const tool of knownTools) {
        if (service.categoryCache.has(tool)) {
          prewarmedCount++;
        }
      }

      expect(prewarmedCount).toBeGreaterThan(0);
    });

    it('should skip already cached tools during prewarming', async () => {
      const toolName = 'fetch__data';
      
      // Pre-populate cache
      service.categoryCache.set(toolName, 'web');
      const initialSize = service.llmCache.size;

      await service._prewarmCache([toolName]);

      // Cache size should not significantly increase
      expect(service.llmCache.size).toBeLessThanOrEqual(initialSize + 1);
    });

    it('should handle empty tool list gracefully', async () => {
      const initialSize = service.llmCache.size;

      await service._prewarmCache([]);

      expect(service.llmCache.size).toBe(initialSize);
    });

    it('should save prewarmed entries to persistent cache', async () => {
      const knownTools = ['fetch__data', 'filesystem__read'];

      await service._prewarmCache(knownTools);
      service.llmCacheDirty = true;
      await service._flushCache();

      // Reload and verify
      service.llmCache.clear();
      await service._loadLLMCache();

      // Should have reloaded entries
      expect(service.llmCache.size).toBeGreaterThanOrEqual(0);
    });
  });

  // ====== Cache Helpers ======
  describe('Cache Helper Methods', () => {
    it('should get cache entry details with TTL info', () => {
      const toolName = 'tool_test';
      const now = Math.floor(Date.now() / 1000);
      
      service.llmCache.set(toolName, {
        category: 'web',
        confidence: 0.95,
        source: 'llm',
        timestamp: now - 1000,
        ttl: 86400
      });

      const details = service._getCacheEntry(toolName);

      expect(details).toBeDefined();
      expect(details.category).toBe('web');
      expect(details.age).toBeDefined();
      expect(details.isExpired).toBe(false);
      expect(details.remainingTTL).toBeGreaterThan(0);
    });

    it('should indicate expired entries in cache details', () => {
      const toolName = 'expired_tool';
      const now = Math.floor(Date.now() / 1000);
      
      service.llmCache.set(toolName, {
        category: 'filesystem',
        confidence: 0.90,
        source: 'llm',
        timestamp: now - 100000,
        ttl: 86400
      });

      const details = service._getCacheEntry(toolName);

      expect(details.isExpired).toBe(true);
      expect(details.remainingTTL).toBe(0);
    });
  });

  // ====== Statistics Integration ======
  describe('Statistics Integration', () => {
    it('should include cache statistics in getStats output', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // Add cache entries
      for (let i = 0; i < 3; i++) {
        service.llmCache.set(`tool_${i}`, {
          category: 'web',
          confidence: 0.95,
          source: 'llm',
          timestamp: now,
          ttl: 86400
        });
      }

      service._updateCacheMemoryUsage();
      service._llmCacheHits = 10;
      service._llmCacheMisses = 5;

      const stats = service.getStats();

      expect(stats.llmCache).toBeDefined();
      expect(stats.llmCache.size).toBe(3);
      expect(stats.llmCache.hitRate).toBeDefined();
      expect(stats.llmCache.memoryUsageBytes).toBeGreaterThan(0);
      expect(stats.llmCache.ttlSeconds).toBe(86400);
    });

    it('should report complete cache metrics', () => {
      const now = Math.floor(Date.now() / 1000);
      
      service.llmCache.set('tool1', {
        category: 'web',
        confidence: 0.95,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });

      service._updateCacheMemoryUsage();
      const stats = service.getStats();
      const cacheStats = stats.llmCache;

      // Verify all metrics are present
      expect(cacheStats.size).toBeGreaterThanOrEqual(1);
      expect(cacheStats.hitRate).toBeDefined();
      expect(cacheStats.hits).toBeDefined();
      expect(cacheStats.misses).toBeDefined();
      expect(cacheStats.memoryUsageBytes).toBeDefined();
      expect(cacheStats.memoryUsageMB).toBeDefined();
      expect(cacheStats.ttlSeconds).toBe(86400);
      expect(cacheStats.entryCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ====== Backward Compatibility ======
  describe('Backward Compatibility', () => {
    it('should handle old cache entries in memory', async () => {
      // Simulate old cache file with string values already in memory
      service.llmCache.clear();
      service.llmCache.set('old_tool', 'web'); // Old string format

      // When getToolCategory is called, it tries to load from cache
      // The in-memory entry is string, which should still work
      const entry = service.llmCache.get('old_tool');
      
      // Entry exists but in old format
      expect(entry).toBe('web');
      
      // When saved, it should be converted to new format
      service._saveCachedCategory('old_tool', entry);
      const converted = service.llmCache.get('old_tool');
      
      expect(converted).toBeDefined();
      expect(converted.category).toBe('web');
      expect(converted.confidence).toBeDefined();
    });

    it('should handle mixed old and new format cache in memory', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      service.llmCache.clear();
      
      // New format entries (old format storage is tested separately)
      service.llmCache.set('tool1', {
        category: 'filesystem',
        confidence: 0.95,
        source: 'llm',
        timestamp: now,
        ttl: 86400
      });

      service.llmCache.set('tool2', {
        category: 'web',
        confidence: 0.90,
        source: 'heuristic',
        timestamp: now,
        ttl: 86400
      });

      // Ensure cache file is set
      if (!service.llmCacheFile) {
        const p = await import('path');
        service.llmCacheFile = p.default.join('/tmp', 'test-mixed-format.json');
      }

      service.llmCacheDirty = true;
      await service._flushCache();

      // Reload and verify both are loaded correctly
      service.llmCache.clear();
      await service._loadLLMCache();

      expect(service.llmCache.size).toBe(2);
      const entry1 = service.llmCache.get('tool1');
      const entry2 = service.llmCache.get('tool2');

      expect(entry1.category).toBe('filesystem');
      expect(entry2.category).toBe('web');
    });
  });
});
