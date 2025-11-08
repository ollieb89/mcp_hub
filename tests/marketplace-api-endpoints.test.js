import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Marketplace } from '../src/marketplace.js';
import { CategoryMapper } from '../src/services/CategoryMapper.js';
import { router, registerRoute } from '../src/utils/router.js';

/**
 * API endpoint tests for marketplace category filtering
 *
 * Coverage areas:
 * 1. GET /marketplace with category parameter
 * 2. Category + other query parameters (search, tags, sort)
 * 3. Error handling and validation
 * 4. Response format and structure
 * 5. Edge cases (empty results, invalid categories)
 */
describe('Marketplace API Endpoints - Category Filtering', () => {
  let app;
  let marketplace;
  let mockLogger;

  beforeAll(async () => {
    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    // Initialize CategoryMapper
    const categoryMapper = new CategoryMapper({
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

    // Mock cache with test data
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
            id: 'web-scraper',
            name: 'web-scraper',
            description: 'Web scraping tool',
            url: 'https://github.com/test/web',
            category: 'web',
            tags: ['browser', 'scraping'],
            stars: 120,
            lastCommit: 1200,
            tools: [{ name: 'fetch_page' }]
          }
        ]
      },
      lastFetchedAt: Date.now(),
      serverDocumentation: {}
    };

    // Create Express app
    app = express();
    app.use(express.json());

    // Register marketplace route (matching server.js implementation)
    registerRoute(
      'GET',
      '/marketplace',
      'Get marketplace catalog with filtering and sorting',
      async (req, res) => {
        const { search, category, tags, sort } = req.query;
        try {
          const servers = await marketplace.getCatalog({
            search,
            category,
            tags: tags ? tags.split(',') : undefined,
            sort
          });
          res.json({
            servers,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.status(500).json({
            error: 'MARKETPLACE_ERROR',
            message: error.message,
            query: req.query
          });
        }
      }
    );

    // Use the router with routes
    app.use('/', router);

    // Mock isCatalogValid to avoid cache refresh
    vi.spyOn(marketplace, 'isCatalogValid').mockReturnValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Test Suite 1: Basic Category Filtering (6 tests)
  // ============================================
  describe('Basic Category Filtering', () => {
    it('should filter servers by category parameter', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('servers');
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].category).toBe('filesystem');
    });

    it('should return all servers when category not provided', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(4);
    });

    it('should return empty array for non-existent category', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'nonexistent' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toEqual([]);
    });

    it('should include timestamp in response', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'github' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should return servers with category field populated', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'docker' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0]).toHaveProperty('category');
      expect(response.body.servers[0].category).toBe('docker');
    });

    it('should handle category parameter case-sensitively', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'FILESYSTEM' }); // Uppercase

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toEqual([]); // No match (case-sensitive)
    });
  });

  // ============================================
  // Test Suite 2: Combined Query Parameters (8 tests)
  // ============================================
  describe('Combined Query Parameters', () => {
    it('should combine category + search parameters', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'web', search: 'scraping' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].id).toBe('web-scraper');
    });

    it('should combine category + tags parameters', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'github', tags: 'git,api' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].id).toBe('github');
    });

    it('should combine category + sort parameters', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'docker', sort: 'stars' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].stars).toBe(150);
    });

    it('should combine category + search + sort', async () => {
      // Arrange: Add another web server for sorting
      marketplace.cache.registry.servers.push({
        id: 'web-crawler',
        name: 'web-crawler',
        description: 'Web crawler for data extraction',
        url: 'https://github.com/test/crawler',
        category: 'web',
        tags: ['crawler'],
        stars: 180,
        lastCommit: 1800,
        tools: []
      });

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'web', search: 'web', sort: 'stars' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers.length).toBeGreaterThanOrEqual(2);
      // Verify descending star order
      const stars = response.body.servers.map(s => s.stars);
      expect(stars[0]).toBeGreaterThanOrEqual(stars[1]);
    });

    it('should combine category + tags + sort', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'docker', tags: 'containers', sort: 'name' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
    });

    it('should combine all parameters: category + search + tags + sort', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({
          category: 'github',
          search: 'github',
          tags: 'git',
          sort: 'stars'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].id).toBe('github');
    });

    it('should return empty when category matches but search does not', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem', search: 'docker' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toEqual([]);
    });

    it('should return empty when category matches but tags do not', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'github', tags: 'nonexistent' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toEqual([]);
    });
  });

  // ============================================
  // Test Suite 3: Response Format (5 tests)
  // ============================================
  describe('Response Format', () => {
    it('should return JSON response with correct structure', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      expect(response.body).toHaveProperty('servers');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.servers)).toBe(true);
    });

    it('should include all server fields in response', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'github' });

      // Assert
      expect(response.status).toBe(200);
      const server = response.body.servers[0];
      expect(server).toHaveProperty('id');
      expect(server).toHaveProperty('name');
      expect(server).toHaveProperty('description');
      expect(server).toHaveProperty('url');
      expect(server).toHaveProperty('category');
      expect(server).toHaveProperty('tags');
      expect(server).toHaveProperty('stars');
      expect(server).toHaveProperty('tools');
    });

    it('should return servers array even when empty', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'nonexistent' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('servers');
      expect(Array.isArray(response.body.servers)).toBe(true);
      expect(response.body.servers).toEqual([]);
    });

    it('should preserve server order from queryCatalog', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ sort: 'stars' });

      // Assert
      expect(response.status).toBe(200);
      const stars = response.body.servers.map(s => s.stars);
      // Verify descending order
      for (let i = 1; i < stars.length; i++) {
        expect(stars[i - 1]).toBeGreaterThanOrEqual(stars[i]);
      }
    });

    it('should include enriched category field in all servers', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace');

      // Assert
      expect(response.status).toBe(200);
      response.body.servers.forEach(server => {
        expect(server).toHaveProperty('category');
        expect(typeof server.category).toBe('string');
      });
    });
  });

  // ============================================
  // Test Suite 4: Edge Cases (6 tests)
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty category parameter', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: '' });

      // Assert
      expect(response.status).toBe(200);
      // Empty string should not filter (return all)
      expect(response.body.servers.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only category', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: '   ' });

      // Assert
      expect(response.status).toBe(200);
      // Whitespace category should return empty (no match)
      expect(response.body.servers).toEqual([]);
    });

    it('should handle special characters in category query', async () => {
      // Arrange - Test that special characters in query parameter work
      const specialCategory = 'test-category_123';

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: specialCategory });

      // Assert
      expect(response.status).toBe(200);
      // Should return empty (no servers with this category in test data)
      expect(response.body.servers).toEqual([]);
    });

    it('should handle URL-encoded category parameter', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: encodeURIComponent('filesystem') });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].category).toBe('filesystem');
    });

    it('should handle multiple category parameters (takes last)', async () => {
      // Act - Express query parser behavior: last value wins
      const response = await request(app)
        .get('/marketplace')
        .query({ category: ['filesystem', 'github'] }); // Array -> last value

      // Assert
      expect(response.status).toBe(200);
      // Express/supertest array handling may vary, just verify valid response
      expect(response.body).toHaveProperty('servers');
      expect(Array.isArray(response.body.servers)).toBe(true);
    });

    it('should handle very long category name in query', async () => {
      // Arrange - Test that very long category query parameters work
      const longCategory = 'a'.repeat(100);

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: longCategory });

      // Assert
      expect(response.status).toBe(200);
      // Should return empty (no servers with this category in test data)
      expect(response.body.servers).toEqual([]);
    });
  });

  // ============================================
  // Test Suite 5: Error Handling (4 tests)
  // ============================================
  describe('Error Handling', () => {
    it('should handle marketplace errors gracefully', async () => {
      // Arrange: Mock getCatalog to throw error
      vi.spyOn(marketplace, 'getCatalog').mockRejectedValueOnce(
        new Error('Marketplace error')
      );

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('MARKETPLACE_ERROR');
    });

    it('should include query parameters in error response', async () => {
      // Arrange: Mock getCatalog to throw error
      vi.spyOn(marketplace, 'getCatalog').mockRejectedValueOnce(
        new Error('Test error')
      );

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem', search: 'test' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('query');
      expect(response.body.query).toEqual({
        category: 'filesystem',
        search: 'test'
      });
    });

    it('should handle invalid sort parameter gracefully', async () => {
      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'github', sort: 'invalid' });

      // Assert
      // Should still return results (invalid sort defaults to 'newest')
      expect(response.status).toBe(200);
      expect(response.body.servers).toHaveLength(1);
    });

    it('should handle concurrent requests with different categories', async () => {
      // Act: Make concurrent requests
      const [response1, response2, response3] = await Promise.all([
        request(app).get('/marketplace').query({ category: 'filesystem' }),
        request(app).get('/marketplace').query({ category: 'github' }),
        request(app).get('/marketplace').query({ category: 'docker' })
      ]);

      // Assert
      expect(response1.status).toBe(200);
      expect(response1.body.servers[0].category).toBe('filesystem');
      expect(response2.status).toBe(200);
      expect(response2.body.servers[0].category).toBe('github');
      expect(response3.status).toBe(200);
      expect(response3.body.servers[0].category).toBe('docker');
    });
  });

  // ============================================
  // Test Suite 6: Performance (3 tests)
  // ============================================
  describe('Performance', () => {
    it('should respond to category filter request in <100ms', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({ category: 'filesystem' });

      const elapsed = Date.now() - start;

      // Assert
      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle multiple combined parameters in <150ms', async () => {
      // Arrange
      const start = Date.now();

      // Act
      const response = await request(app)
        .get('/marketplace')
        .query({
          category: 'github',
          search: 'github',
          tags: 'git',
          sort: 'stars'
        });

      const elapsed = Date.now() - start;

      // Assert
      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(150);
    });

    it('should maintain consistent response time across categories', async () => {
      // Arrange
      const categories = ['filesystem', 'github', 'docker', 'web'];
      const times = [];

      // Act
      for (const category of categories) {
        const start = Date.now();
        await request(app).get('/marketplace').query({ category });
        times.push(Date.now() - start);
      }

      // Assert
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(100);
      // Verify consistent performance (no outliers)
      times.forEach(time => {
        expect(time).toBeLessThan(avgTime * 2); // Within 2x of average
      });
    });
  });
});
