import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Marketplace } from '../src/marketplace.js';
import { CategoryMapper } from '../src/services/CategoryMapper.js';

/**
 * Comprehensive test suite for marketplace category filtering
 *
 * Coverage areas:
 * 1. queryCatalog method edge cases
 * 2. Category filter with other filters (search, tags, sort)
 * 3. Empty results and invalid categories
 * 4. Performance at scale (100+ servers)
 * 5. Case sensitivity and normalization
 * 6. Filter combination behaviors
 */
describe('Marketplace Category Filtering', () => {
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
      enablePersistentCache: false,
      logger: mockLogger
    });

    // Initialize Marketplace
    marketplace = new Marketplace({
      ttl: 3600000,
      logger: mockLogger,
      categoryMapper
    });

    // Mock cache with diverse test data
    marketplace.cache = {
      registry: {
        servers: [
          {
            id: 'filesystem',
            name: 'filesystem',
            description: 'File system operations',
            url: 'https://github.com/test/filesystem',
            category: 'filesystem',
            tags: ['files', 'storage'],
            stars: 100,
            lastCommit: 1000,
            tools: [{ name: 'read_file' }]
          },
          {
            id: 'github',
            name: 'github',
            description: 'GitHub API integration',
            url: 'https://github.com/test/github',
            category: 'github',
            tags: ['git', 'api'],
            stars: 200,
            lastCommit: 2000,
            tools: [{ name: 'create_issue' }]
          },
          {
            id: 'docker',
            name: 'docker',
            description: 'Docker container management',
            url: 'https://github.com/test/docker',
            category: 'docker',
            tags: ['containers', 'devops'],
            stars: 150,
            lastCommit: 1500,
            tools: [{ name: 'list_containers' }]
          },
          {
            id: 'python-env',
            name: 'python-env',
            description: 'Python environment manager',
            url: 'https://github.com/test/python',
            category: 'python',
            tags: ['python', 'devops'],
            stars: 80,
            lastCommit: 800,
            tools: [{ name: 'create_venv' }]
          },
          {
            id: 'web-scraper',
            name: 'web-scraper',
            description: 'Web scraping tool for browser automation',
            url: 'https://github.com/test/web',
            category: 'web',
            tags: ['browser', 'scraping'],
            stars: 120,
            lastCommit: 1200,
            tools: [{ name: 'fetch_page' }]
          },
          {
            id: 'unknown-server',
            name: 'unknown-server',
            description: 'Some uncategorized server',
            url: 'https://github.com/test/unknown',
            category: 'other',
            tags: [],
            stars: 10,
            lastCommit: 100,
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
  // Test Suite 1: queryCatalog Edge Cases (10 tests)
  // ============================================
  describe('queryCatalog Edge Cases', () => {
    it('should return all servers when no category filter provided', () => {
      // Arrange - no filters

      // Act
      const result = marketplace.queryCatalog({});

      // Assert
      expect(result).toHaveLength(6);
    });

    it('should filter by single category correctly', () => {
      // Arrange
      const filter = { category: 'filesystem' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('filesystem');
    });

    it('should return empty array for non-existent category', () => {
      // Arrange
      const filter = { category: 'nonexistent' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null category gracefully', () => {
      // Arrange
      const filter = { category: null };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Null category should not filter (return all)
      expect(result).toHaveLength(6);
    });

    it('should handle undefined category gracefully', () => {
      // Arrange
      const filter = { category: undefined };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Undefined category should not filter (return all)
      expect(result).toHaveLength(6);
    });

    it('should handle empty string category', () => {
      // Arrange
      const filter = { category: '' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Empty string is falsy, should not filter
      expect(result).toHaveLength(6);
    });

    it('should be case-sensitive for category matching', () => {
      // Arrange
      const filter = { category: 'FILESYSTEM' }; // Uppercase

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Should not match (case-sensitive comparison)
      expect(result).toEqual([]);
    });

    it('should filter other category servers', () => {
      // Arrange
      const filter = { category: 'other' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('unknown-server');
    });

    it('should handle servers with missing category field', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'no-category',
        name: 'no-category',
        description: 'Server without category field',
        url: 'https://github.com/test/no-cat',
        tags: [],
        tools: []
      });
      const filter = { category: 'filesystem' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Should only return servers with matching category
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('filesystem');
    });

    it('should handle empty registry gracefully', () => {
      // Arrange
      marketplace.cache.registry.servers = [];
      const filter = { category: 'filesystem' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Test Suite 2: Combined Filters (12 tests)
  // ============================================
  describe('Combined Filters', () => {
    it('should combine category + search filters', () => {
      // Arrange
      const filter = { category: 'web', search: 'browser' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('web-scraper');
    });

    it('should combine category + tags filters', () => {
      // Arrange
      const filter = { category: 'python', tags: ['python'] };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('python-env');
    });

    it('should combine category + sort filters', () => {
      // Arrange
      const filter = { category: 'docker', sort: 'stars' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].stars).toBe(150);
    });

    it('should combine category + search + sort', () => {
      // Arrange
      // Add another github server for sorting test
      marketplace.cache.registry.servers.push({
        id: 'github-cli',
        name: 'github-cli',
        description: 'GitHub CLI tool',
        url: 'https://github.com/test/gh',
        category: 'github',
        tags: ['cli'],
        stars: 300,
        lastCommit: 3000,
        tools: []
      });
      const filter = { category: 'github', search: 'github', sort: 'stars' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].stars).toBeGreaterThan(result[1].stars); // Descending order
      expect(result[0].id).toBe('github-cli'); // 300 stars
      expect(result[1].id).toBe('github'); // 200 stars
    });

    it('should combine category + tags + sort', () => {
      // Arrange
      const filter = { category: 'docker', tags: ['containers'], sort: 'name' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('docker');
    });

    it('should combine all filters: category + search + tags + sort', () => {
      // Arrange
      const filter = {
        category: 'web',
        search: 'web',
        tags: ['browser'],
        sort: 'stars'
      };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('web-scraper');
    });

    it('should return empty when category matches but search does not', () => {
      // Arrange
      const filter = { category: 'filesystem', search: 'docker' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty when category matches but tags do not', () => {
      // Arrange
      const filter = { category: 'github', tags: ['nonexistent'] };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter by multiple categories (OR logic) - not supported', () => {
      // Arrange
      // Current implementation only supports single category
      const filter = { category: 'github' }; // Only one category

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result.every(s => s.category === 'github')).toBe(true);
    });

    it('should sort by name within category filter', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'filesystem-advanced',
        name: 'advanced-filesystem',
        description: 'Advanced file operations',
        url: 'https://github.com/test/fs-adv',
        category: 'filesystem',
        tags: ['files'],
        stars: 50,
        lastCommit: 500,
        tools: []
      });
      const filter = { category: 'filesystem', sort: 'name' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('advanced-filesystem');
      expect(result[1].name).toBe('filesystem');
    });

    it('should sort by stars within category filter', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'filesystem-advanced',
        name: 'advanced-filesystem',
        description: 'Advanced file operations',
        url: 'https://github.com/test/fs-adv',
        category: 'filesystem',
        tags: ['files'],
        stars: 200,
        lastCommit: 500,
        tools: []
      });
      const filter = { category: 'filesystem', sort: 'stars' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].stars).toBe(200); // Descending
      expect(result[1].stars).toBe(100);
    });

    it('should sort by newest within category filter', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'filesystem-advanced',
        name: 'advanced-filesystem',
        description: 'Advanced file operations',
        url: 'https://github.com/test/fs-adv',
        category: 'filesystem',
        tags: ['files'],
        stars: 50,
        lastCommit: 5000, // Newest
        tools: []
      });
      const filter = { category: 'filesystem', sort: 'newest' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].lastCommit).toBe(5000); // Descending
      expect(result[1].lastCommit).toBe(1000);
    });
  });

  // ============================================
  // Test Suite 3: Performance at Scale (5 tests)
  // ============================================
  describe('Performance at Scale', () => {
    beforeEach(() => {
      // Generate 100 servers across different categories
      const categories = ['filesystem', 'github', 'docker', 'python', 'web', 'database', 'git', 'memory', 'vertex_ai', 'other'];
      const servers = [];

      for (let i = 0; i < 100; i++) {
        const category = categories[i % categories.length];
        servers.push({
          id: `server-${i}`,
          name: `server-${i}`,
          description: `Description for server ${i} in ${category}`,
          url: `https://github.com/test/server-${i}`,
          category,
          tags: [`tag-${i % 5}`, category],
          stars: Math.floor(Math.random() * 1000),
          lastCommit: 1000 + i,
          tools: [{ name: `tool-${i}` }]
        });
      }

      marketplace.cache.registry.servers = servers;
    });

    it('should filter 100 servers by category in <50ms', () => {
      // Arrange
      const filter = { category: 'filesystem' };
      const start = Date.now();

      // Act
      const result = marketplace.queryCatalog(filter);
      const elapsed = Date.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(s => s.category === 'filesystem')).toBe(true);
      expect(elapsed).toBeLessThan(50);
    });

    it('should combine category + search on 100 servers in <100ms', () => {
      // Arrange
      const filter = { category: 'github', search: 'server-1' };
      const start = Date.now();

      // Act
      const result = marketplace.queryCatalog(filter);
      const elapsed = Date.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(s => s.category === 'github')).toBe(true);
      expect(elapsed).toBeLessThan(100);
    });

    it('should sort 100 servers by stars within category in <100ms', () => {
      // Arrange
      const filter = { category: 'docker', sort: 'stars' };
      const start = Date.now();

      // Act
      const result = marketplace.queryCatalog(filter);
      const elapsed = Date.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      // Verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].stars).toBeGreaterThanOrEqual(result[i].stars);
      }
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle all filters on 100 servers in <150ms', () => {
      // Arrange
      const filter = {
        category: 'web',
        search: 'server',
        tags: ['web'],
        sort: 'name'
      };
      const start = Date.now();

      // Act
      const result = marketplace.queryCatalog(filter);
      const elapsed = Date.now() - start;

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(s => s.category === 'web')).toBe(true);
      expect(elapsed).toBeLessThan(150);
    });

    it('should maintain correct filtering with large dataset', () => {
      // Arrange
      const filter = { category: 'python' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Should return exactly 10 servers (100 servers / 10 categories)
      expect(result).toHaveLength(10);
      expect(result.every(s => s.category === 'python')).toBe(true);
    });
  });

  // ============================================
  // Test Suite 4: Empty Results Handling (5 tests)
  // ============================================
  describe('Empty Results Handling', () => {
    it('should return empty array for category with no matches', () => {
      // Arrange
      const filter = { category: 'nonexistent' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when category + search have no matches', () => {
      // Arrange
      const filter = { category: 'filesystem', search: 'nonexistent' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when category + tags have no matches', () => {
      // Arrange
      const filter = { category: 'github', tags: ['nonexistent'] };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty registry with category filter', () => {
      // Arrange
      marketplace.cache.registry.servers = [];
      const filter = { category: 'filesystem' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for valid category with impossible tag combination', () => {
      // Arrange
      const filter = { category: 'filesystem', tags: ['files', 'impossible-tag'] };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      // Tags use AND logic, so impossible tag should result in empty
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Test Suite 5: Filter Application Order (4 tests)
  // ============================================
  describe('Filter Application Order', () => {
    it('should apply search before category filter', () => {
      // Arrange
      const filter = { search: 'github', category: 'github' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('github');
    });

    it('should apply category before tags filter', () => {
      // Arrange
      const filter = { category: 'python', tags: ['python'] };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('python-env');
    });

    it('should apply sort after all filters', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'filesystem-2',
        name: 'filesystem-2',
        description: 'Another file system',
        url: 'https://github.com/test/fs2',
        category: 'filesystem',
        tags: ['files'],
        stars: 200,
        lastCommit: 2000,
        tools: []
      });
      const filter = { category: 'filesystem', sort: 'stars' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].stars).toBeGreaterThan(result[1].stars);
    });

    it('should maintain filter independence', () => {
      // Arrange
      const filter1 = { category: 'github' };
      const filter2 = { search: 'github' };

      // Act
      const result1 = marketplace.queryCatalog(filter1);
      const result2 = marketplace.queryCatalog(filter2);

      // Assert
      // Results should be independent (different filter criteria)
      expect(result1).toHaveLength(1);
      expect(result2.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Test Suite 6: Integration with getCatalog (5 tests)
  // ============================================
  describe('Integration with getCatalog', () => {
    beforeEach(() => {
      vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);
    });

    it('should pass category filter to queryCatalog via getCatalog', async () => {
      // Arrange
      const querySpy = vi.spyOn(marketplace, 'queryCatalog');

      // Act
      await marketplace.getCatalog({ category: 'filesystem' });

      // Assert
      expect(querySpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'filesystem' })
      );
    });

    it('should enrich filtered results from getCatalog', async () => {
      // Arrange
      const enrichSpy = vi.spyOn(marketplace, 'enrichWithCategories');

      // Act
      const result = await marketplace.getCatalog({ category: 'github' });

      // Assert
      expect(enrichSpy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('github');
    });

    it('should combine category filter with search in getCatalog', async () => {
      // Arrange - no additional setup needed

      // Act
      const result = await marketplace.getCatalog({
        category: 'web',
        search: 'browser'
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('web-scraper');
    });

    it('should handle empty results from category filter in getCatalog', async () => {
      // Arrange - no additional setup needed

      // Act
      const result = await marketplace.getCatalog({ category: 'nonexistent' });

      // Assert
      expect(result).toEqual([]);
    });

    it('should maintain category field after getCatalog enrichment', async () => {
      // Arrange - no additional setup needed

      // Act
      const result = await marketplace.getCatalog({ category: 'docker' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('category');
      expect(result[0].category).toBe('docker');
    });
  });

  // ============================================
  // Test Suite 7: Boundary Conditions (4 tests)
  // ============================================
  describe('Boundary Conditions', () => {
    it('should handle single server in category', () => {
      // Arrange
      const filter = { category: 'docker' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('docker');
    });

    it('should handle all servers in same category', () => {
      // Arrange
      marketplace.cache.registry.servers = marketplace.cache.registry.servers.map(s => ({
        ...s,
        category: 'filesystem'
      }));
      const filter = { category: 'filesystem' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(6);
      expect(result.every(s => s.category === 'filesystem')).toBe(true);
    });

    it('should handle category with special characters', () => {
      // Arrange
      marketplace.cache.registry.servers.push({
        id: 'special-cat',
        name: 'special-cat',
        description: 'Special category test',
        url: 'https://github.com/test/special',
        category: 'test-category_123',
        tags: [],
        stars: 10,
        lastCommit: 100,
        tools: []
      });
      const filter = { category: 'test-category_123' };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('test-category_123');
    });

    it('should handle very long category names', () => {
      // Arrange
      const longCategory = 'a'.repeat(100);
      marketplace.cache.registry.servers.push({
        id: 'long-cat',
        name: 'long-cat',
        description: 'Long category name test',
        url: 'https://github.com/test/long',
        category: longCategory,
        tags: [],
        stars: 10,
        lastCommit: 100,
        tools: []
      });
      const filter = { category: longCategory };

      // Act
      const result = marketplace.queryCatalog(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(longCategory);
    });
  });
});
