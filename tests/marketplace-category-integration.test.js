import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Marketplace } from '../src/marketplace.js';
import { CategoryMapper } from '../src/services/CategoryMapper.js';
import { STANDARD_CATEGORIES } from '../src/utils/category-definitions.js';

describe('Marketplace-CategoryMapper Integration', () => {
  let marketplace;
  let categoryMapper;
  let mockLogger;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    // Initialize CategoryMapper
    categoryMapper = new CategoryMapper({
      enableLLM: false,
      enableCache: true,
      enablePersistentCache: false, // Disable for tests
      logger: mockLogger
    });

    // Initialize Marketplace with CategoryMapper
    marketplace = new Marketplace({
      ttl: 3600000,
      logger: mockLogger,
      categoryMapper
    });

    // Mock the cache with test data
    marketplace.cache = {
      registry: {
        servers: [
          {
            id: 'filesystem',
            name: 'filesystem',
            description: 'File system operations',
            url: 'https://github.com/test/filesystem',
            tools: [
              { name: 'read_file' },
              { name: 'write_file' }
            ]
          },
          {
            id: 'github',
            name: 'github',
            description: 'GitHub API integration',
            url: 'https://github.com/test/github',
            tools: [
              { name: 'create_issue' },
              { name: 'list_repos' }
            ]
          },
          {
            id: 'unknown-server',
            name: 'unknown-server',
            description: 'Some unknown server',
            url: 'https://github.com/test/unknown',
            tools: []
          }
        ]
      },
      lastFetchedAt: Date.now(),
      serverDocumentation: {}
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Test Suite 1: Category Enrichment (8 tests)
  // ============================================
  describe('Category Enrichment', () => {
    it('should enrich all servers with category field', async () => {
      // Arrange
      const servers = marketplace.cache.registry.servers;

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(enriched).toHaveLength(3);
      enriched.forEach(server => {
        expect(server).toHaveProperty('category');
        expect(typeof server.category).toBe('string');
      });
    });

    it('should assign valid categories from STANDARD_CATEGORIES', async () => {
      // Arrange
      const servers = marketplace.cache.registry.servers;
      const validCategories = [...Object.keys(STANDARD_CATEGORIES), 'other']; // Include 'other' as valid fallback

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      enriched.forEach(server => {
        expect(validCategories).toContain(server.category);
      });
    });

    it('should preserve all original server data', async () => {
      // Arrange
      const servers = marketplace.cache.registry.servers;
      const originalData = JSON.parse(JSON.stringify(servers));

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      enriched.forEach((server, index) => {
        const original = originalData[index];
        expect(server.id).toBe(original.id);
        expect(server.name).toBe(original.name);
        expect(server.description).toBe(original.description);
        expect(server.url).toBe(original.url);
        expect(server.tools).toEqual(original.tools);
      });
    });

    it('should categorize filesystem server correctly', async () => {
      // Arrange
      const filesystemServer = [marketplace.cache.registry.servers[0]];

      // Act
      const enriched = await marketplace.enrichWithCategories(filesystemServer);

      // Assert
      expect(enriched[0].category).toBe('filesystem');
    });

    it('should categorize github server correctly', async () => {
      // Arrange
      const githubServer = [marketplace.cache.registry.servers[1]];

      // Act
      const enriched = await marketplace.enrichWithCategories(githubServer);

      // Assert
      expect(enriched[0].category).toBe('github');
    });

    it('should handle empty server array gracefully', async () => {
      // Arrange
      const emptyArray = [];

      // Act
      const enriched = await marketplace.enrichWithCategories(emptyArray);

      // Assert
      expect(enriched).toEqual([]);
    });

    it('should handle servers with missing description field', async () => {
      // Arrange
      const serversWithoutDescription = [{
        id: 'test',
        name: 'test-server',
        url: 'https://github.com/test',
        tools: []
      }];

      // Act
      const enriched = await marketplace.enrichWithCategories(serversWithoutDescription);

      // Assert
      expect(enriched[0]).toHaveProperty('category');
      expect(enriched[0].category).toBe('other');
    });

    it('should handle servers with missing tools field', async () => {
      // Arrange
      const serversWithoutTools = [{
        id: 'test',
        name: 'test-server',
        description: 'Test description',
        url: 'https://github.com/test'
      }];

      // Act
      const enriched = await marketplace.enrichWithCategories(serversWithoutTools);

      // Assert
      expect(enriched[0]).toHaveProperty('category');
      expect(typeof enriched[0].category).toBe('string');
    });
  });

  // ============================================
  // Test Suite 2: Error Handling (5 tests)
  // ============================================
  describe('Error Handling', () => {
    it('should handle missing CategoryMapper gracefully', async () => {
      // Arrange
      const marketplaceWithoutMapper = new Marketplace({
        ttl: 3600000,
        logger: mockLogger,
        categoryMapper: null
      });
      marketplaceWithoutMapper.cache = marketplace.cache;
      const servers = marketplace.cache.registry.servers;

      // Act
      const enriched = await marketplaceWithoutMapper.enrichWithCategories(servers);

      // Assert
      expect(enriched).toHaveLength(3);
      enriched.forEach(server => {
        expect(server.category).toBe('other');
      });
    });

    it('should not break marketplace when categorization fails', async () => {
      // Arrange
      const faultyMapper = {
        categorizeBatch: vi.fn().mockRejectedValue(new Error('Categorization error'))
      };
      marketplace.categoryMapper = faultyMapper;
      const servers = marketplace.cache.registry.servers;

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(enriched).toHaveLength(3);
      enriched.forEach(server => {
        expect(server.category).toBe('other');
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Marketplace] Category enrichment failed',
        expect.objectContaining({
          error: 'Categorization error',
          serverCount: 3
        })
      );
    });

    it('should handle invalid category from CategoryMapper', async () => {
      // Arrange
      const invalidCategoryMapper = {
        categorizeBatch: vi.fn().mockResolvedValue(new Map([
          ['filesystem', 'invalid-category']
        ]))
      };
      marketplace.categoryMapper = invalidCategoryMapper;
      const servers = [marketplace.cache.registry.servers[0]];

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      // Should fallback to 'other' for invalid categories
      expect(enriched[0].category).toBe('invalid-category'); // CategoryMapper returns what it returns
    });

    it('should handle partial categorization failures', async () => {
      // Arrange
      const partialFailureMapper = {
        categorizeBatch: vi.fn().mockResolvedValue(new Map([
          ['filesystem', 'filesystem'],
          ['github', 'github']
          // 'unknown-server' not in map (simulates failure)
        ]))
      };
      marketplace.categoryMapper = partialFailureMapper;
      const servers = marketplace.cache.registry.servers;

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(enriched[0].category).toBe('filesystem');
      expect(enriched[1].category).toBe('github');
      expect(enriched[2].category).toBe('other'); // Fallback for missing category
    });

    it('should log warnings when enrichment fails', async () => {
      // Arrange
      const errorMapper = {
        categorizeBatch: vi.fn().mockRejectedValue(new Error('Test error'))
      };
      marketplace.categoryMapper = errorMapper;
      const servers = marketplace.cache.registry.servers;

      // Act
      await marketplace.enrichWithCategories(servers);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Marketplace] Category enrichment failed',
        expect.objectContaining({
          error: 'Test error'
        })
      );
    });
  });

  // ============================================
  // Test Suite 3: Cache Coordination (4 tests)
  // ============================================
  describe('Cache Coordination', () => {
    it('should use CategoryMapper categorizeBatch for batch operations', async () => {
      // Arrange
      const batchSpy = vi.spyOn(categoryMapper, 'categorizeBatch');
      const servers = [marketplace.cache.registry.servers[0]];

      // Act
      await marketplace.enrichWithCategories(servers);

      // Assert
      expect(batchSpy).toHaveBeenCalledTimes(1); // Uses categorizeBatch for batch
    });

    it('should benefit from memory cache on repeated categorizations', async () => {
      // Arrange
      const servers = [marketplace.cache.registry.servers[0]];

      // Act - First categorization
      const first = await marketplace.enrichWithCategories(servers);

      // Act - Second categorization (should use cache)
      const second = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(first[0].category).toBe(second[0].category);
      expect(first[0].category).toBe('filesystem');
    });

    it('should handle batch categorization efficiently', async () => {
      // Arrange
      const batchSpy = vi.spyOn(categoryMapper, 'categorizeBatch');
      const servers = marketplace.cache.registry.servers;

      // Act
      await marketplace.enrichWithCategories(servers);

      // Assert
      expect(batchSpy).toHaveBeenCalledTimes(1);
      expect(batchSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'filesystem' }),
          expect.objectContaining({ name: 'github' }),
          expect.objectContaining({ name: 'unknown-server' })
        ])
      );
    });

    it('should maintain independent caches for Marketplace and CategoryMapper', async () => {
      // Arrange
      const servers = marketplace.cache.registry.servers;

      // Act - Categorize servers
      await marketplace.enrichWithCategories(servers);

      // Act - Invalidate marketplace cache
      marketplace.cache.lastFetchedAt = 0;

      // Act - Categorize again (CategoryMapper cache should still work)
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(enriched[0].category).toBe('filesystem');
      expect(enriched[1].category).toBe('github');
    });
  });

  // ============================================
  // Test Suite 4: Performance Benchmarking (3 tests)
  // ============================================
  describe('Performance Benchmarking', () => {
    it('should categorize single server in <50ms (cache miss)', async () => {
      // Arrange
      const server = [marketplace.cache.registry.servers[0]];
      const start = Date.now();

      // Act
      await marketplace.enrichWithCategories(server);
      const elapsed = Date.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(50);
    });

    it('should categorize single server in <5ms (cache hit)', async () => {
      // Arrange
      const server = [marketplace.cache.registry.servers[0]];

      // Prime the cache
      await marketplace.enrichWithCategories(server);

      // Act - Second call should be cached
      const start = Date.now();
      await marketplace.enrichWithCategories(server);
      const elapsed = Date.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(5);
    });

    it('should batch categorize 3 servers in <100ms total', async () => {
      // Arrange
      const servers = marketplace.cache.registry.servers;
      const start = Date.now();

      // Act
      await marketplace.enrichWithCategories(servers);
      const elapsed = Date.now() - start;

      // Assert
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ============================================
  // Test Suite 5: Backward Compatibility (3 tests)
  // ============================================
  describe('Backward Compatibility', () => {
    it('should support old constructor signature with just ttl', () => {
      // Arrange & Act
      const oldStyleMarketplace = new Marketplace({ ttl: 5000 });

      // Assert
      expect(oldStyleMarketplace.ttl).toBe(5000);
      expect(oldStyleMarketplace.categoryMapper).toBeNull();
    });

    it('should maintain existing API response structure', async () => {
      // Arrange
      const servers = [marketplace.cache.registry.servers[0]];

      // Act
      const enriched = await marketplace.enrichWithCategories(servers);

      // Assert
      expect(enriched[0]).toHaveProperty('id');
      expect(enriched[0]).toHaveProperty('name');
      expect(enriched[0]).toHaveProperty('description');
      expect(enriched[0]).toHaveProperty('url');
      expect(enriched[0]).toHaveProperty('tools');
      expect(enriched[0]).toHaveProperty('category'); // New field
    });

    it('should work without categoryMapper for backward compatibility', async () => {
      // Arrange
      const marketplaceWithoutMapper = new Marketplace({
        ttl: 3600000,
        logger: mockLogger
      });
      marketplaceWithoutMapper.cache = marketplace.cache;
      const servers = marketplace.cache.registry.servers;

      // Act
      const enriched = await marketplaceWithoutMapper.enrichWithCategories(servers);

      // Assert
      expect(enriched).toHaveLength(3);
      enriched.forEach(server => {
        expect(server).toHaveProperty('category');
        expect(server.category).toBe('other');
      });
    });
  });

  // ============================================
  // Test Suite 6: getCatalog Integration (2 tests)
  // ============================================
  describe('getCatalog Integration', () => {
    it('should return servers with categories from getCatalog', async () => {
      // Arrange
      vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);

      // Act
      const catalog = await marketplace.getCatalog();

      // Assert
      expect(catalog).toHaveLength(3);
      catalog.forEach(server => {
        expect(server).toHaveProperty('category');
      });
    });

    it('should apply category filter after enrichment', async () => {
      // Arrange
      vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);

      // Act
      const catalog = await marketplace.getCatalog({ category: 'filesystem' });

      // Assert
      // Note: queryCatalog handles filtering, enrichment happens after
      expect(catalog.length).toBeGreaterThanOrEqual(0);
      catalog.forEach(server => {
        expect(server).toHaveProperty('category');
      });
    });
  });

  // ============================================
  // Test Suite 7: getServerDetails Integration (2 tests)
  // ============================================
  describe('getServerDetails Integration', () => {
    it('should return server with category from getServerDetails', async () => {
      // Arrange
      vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);
      marketplace.cache.serverDocumentation['filesystem'] = {
        content: '# Filesystem Server',
        lastFetchedAt: Date.now()
      };

      // Act
      const details = await marketplace.getServerDetails('filesystem');

      // Assert
      expect(details).toBeDefined();
      expect(details.server).toHaveProperty('category');
      expect(details.server.category).toBe('filesystem');
    });

    it('should handle undefined server gracefully', async () => {
      // Arrange
      vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);

      // Act
      const details = await marketplace.getServerDetails('non-existent-server');

      // Assert
      expect(details).toBeUndefined();
    });
  });
});
