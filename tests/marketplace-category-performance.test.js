import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Marketplace } from '../src/marketplace.js';

/**
 * Performance Benchmarking Suite for Category Filtering
 *
 * Tests filter performance with various dataset sizes and filter combinations
 * to ensure <50ms latency target is met under production conditions.
 */
describe('Marketplace Category Filter Performance', () => {
  let marketplace;
  let mockLogger;

  // Helper to generate test server data
  function generateServers(count) {
    const categories = ['github', 'filesystem', 'web', 'docker', 'git', 'python', 'database', 'memory', 'vertex_ai', 'meta'];
    const tags = ['api', 'cli', 'automation', 'data', 'utility', 'integration'];

    return Array.from({ length: count }, (_, i) => ({
      id: `server-${i}`,
      name: `server-${i}`,
      description: `Test server ${i} with ${categories[i % categories.length]} functionality`,
      url: `https://github.com/test/server-${i}`,
      category: categories[i % categories.length],
      tags: [tags[i % tags.length], tags[(i + 1) % tags.length]],
      stars: Math.floor(Math.random() * 1000),
      lastCommit: Date.now() - Math.random() * 10000000000
    }));
  }

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    marketplace = new Marketplace({
      ttl: 3600000,
      logger: mockLogger
    });
  });

  // ============================================
  // Benchmark 1: Category Filter Only
  // ============================================
  describe('Category Filter Only', () => {
    it('should filter 50 servers by category in <10ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(50) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'github' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(10);
      result.forEach(server => {
        expect(server.category).toBe('github');
      });
    });

    it('should filter 100 servers by category in <15ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'filesystem' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(15);
      result.forEach(server => {
        expect(server.category).toBe('filesystem');
      });
    });

    it('should filter 200 servers by category in <25ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(200) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'web' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(25);
      result.forEach(server => {
        expect(server.category).toBe('web');
      });
    });

    it('should filter 500 servers by category in <50ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(500) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'docker' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(50);
      result.forEach(server => {
        expect(server.category).toBe('docker');
      });
    });
  });

  // ============================================
  // Benchmark 2: Combined Filters
  // ============================================
  describe('Combined Filters', () => {
    it('should apply search + category filter on 100 servers in <20ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        search: 'test',
        category: 'github'
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(20);
      result.forEach(server => {
        expect(server.category).toBe('github');
        const searchText = `${server.name} ${server.description} ${server.tags.join(' ')}`.toLowerCase();
        expect(searchText).toContain('test');
      });
    });

    it('should apply category + tags filter on 100 servers in <20ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        category: 'filesystem',
        tags: ['api']
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(20);
      result.forEach(server => {
        expect(server.category).toBe('filesystem');
        expect(server.tags).toContain('api');
      });
    });

    it('should apply search + category + tags filter on 100 servers in <25ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        search: 'server',
        category: 'web',
        tags: ['cli']
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(25);
      result.forEach(server => {
        expect(server.category).toBe('web');
        expect(server.tags).toContain('cli');
      });
    });
  });

  // ============================================
  // Benchmark 3: Sort Operation Impact
  // ============================================
  describe('Sort Operation Impact', () => {
    it('should filter + sort by stars on 100 servers in <25ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        category: 'github',
        sort: 'stars'
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(25);
      expect(result.length).toBeGreaterThan(0);

      // Verify sort order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].stars || 0).toBeGreaterThanOrEqual(result[i].stars || 0);
      }
    });

    it('should filter + sort by name on 100 servers in <30ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        category: 'filesystem',
        sort: 'name'
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(30);
      expect(result.length).toBeGreaterThan(0);

      // Verify sort order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should filter + sort by newest on 200 servers in <40ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(200) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        category: 'web',
        sort: 'newest'
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(40);
      expect(result.length).toBeGreaterThan(0);

      // Verify sort order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].lastCommit || 0).toBeGreaterThanOrEqual(result[i].lastCommit || 0);
      }
    });
  });

  // ============================================
  // Benchmark 4: Memory Usage
  // ============================================
  describe('Memory Usage', () => {
    it('should not create excessive intermediate arrays during filtering', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(1000) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      const memBefore = process.memoryUsage().heapUsed;

      // Act
      marketplace.queryCatalog({ category: 'github' });
      marketplace.queryCatalog({ category: 'filesystem' });
      marketplace.queryCatalog({ category: 'web' });

      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;

      // Assert - memory increase should be < 10MB for 3 queries on 1000 servers
      expect(memDelta).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle empty result sets efficiently', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(100) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act - filter for non-existent category
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'nonexistent' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result).toEqual([]);
      expect(elapsed).toBeLessThan(5); // Should be very fast for empty results
    });
  });

  // ============================================
  // Benchmark 5: Worst Case Scenarios
  // ============================================
  describe('Worst Case Scenarios', () => {
    it('should handle all filters + sort on 500 servers in <60ms', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(500) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act - worst case: all filters + expensive sort
      const start = performance.now();
      const result = marketplace.queryCatalog({
        search: 'server',
        category: 'github',
        tags: ['api', 'cli'],
        sort: 'name' // localeCompare is expensive
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(60);
      result.forEach(server => {
        expect(server.category).toBe('github');
        expect(server.tags).toContain('api');
        expect(server.tags).toContain('cli');
      });
    });

    it('should handle sequential queries without performance degradation', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(200) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      const timings = [];

      // Act - run 10 sequential queries
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        marketplace.queryCatalog({ category: 'github' });
        timings.push(performance.now() - start);
      }

      // Assert - each query should be consistent (< 25ms)
      timings.forEach(timing => {
        expect(timing).toBeLessThan(25);
      });

      // Calculate variance - should be low (consistent performance)
      const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      expect(variance).toBeLessThan(50); // Low variance indicates consistent performance
    });

    it('should handle concurrent queries without blocking', async () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(200) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act - run 5 concurrent queries
      const start = performance.now();
      const promises = [
        Promise.resolve(marketplace.queryCatalog({ category: 'github' })),
        Promise.resolve(marketplace.queryCatalog({ category: 'filesystem' })),
        Promise.resolve(marketplace.queryCatalog({ category: 'web' })),
        Promise.resolve(marketplace.queryCatalog({ category: 'docker' })),
        Promise.resolve(marketplace.queryCatalog({ category: 'git' }))
      ];

      await Promise.all(promises);
      const elapsed = performance.now() - start;

      // Assert - concurrent queries should complete faster than sequential
      expect(elapsed).toBeLessThan(100); // 5 sequential would be ~100ms, concurrent should be much faster
    });
  });

  // ============================================
  // Benchmark 6: Filter Selectivity
  // ============================================
  describe('Filter Selectivity Impact', () => {
    it('should handle high selectivity filters (1% match) efficiently', () => {
      // Arrange - create dataset where only 1% match the category
      const servers = generateServers(100);
      servers.forEach((server, i) => {
        server.category = i === 0 ? 'github' : 'filesystem';
      });

      marketplace.cache = {
        registry: { servers },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'github' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBe(1);
      expect(elapsed).toBeLessThan(10);
    });

    it('should handle low selectivity filters (90% match) efficiently', () => {
      // Arrange - create dataset where 90% match the category
      const servers = generateServers(100);
      servers.forEach((server, i) => {
        server.category = i < 90 ? 'github' : 'filesystem';
      });

      marketplace.cache = {
        registry: { servers },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'github' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result.length).toBe(90);
      expect(elapsed).toBeLessThan(15);
    });
  });

  // ============================================
  // Benchmark 7: Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty dataset efficiently', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: [] },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'github' });
      const elapsed = performance.now() - start;

      // Assert
      expect(result).toEqual([]);
      expect(elapsed).toBeLessThan(1);
    });

    it('should handle single server dataset efficiently', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(1) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({ category: 'github' });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(2);
    });

    it('should handle maximum realistic dataset (1000 servers) under budget', () => {
      // Arrange
      marketplace.cache = {
        registry: { servers: generateServers(1000) },
        lastFetchedAt: Date.now(),
        serverDocumentation: {}
      };

      // Act
      const start = performance.now();
      const result = marketplace.queryCatalog({
        category: 'github',
        sort: 'stars'
      });
      const elapsed = performance.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(100); // Relaxed budget for very large dataset
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
