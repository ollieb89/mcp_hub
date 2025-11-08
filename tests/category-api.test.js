/**
 * Category API Endpoints Tests
 *
 * Tests for the three category management endpoints:
 * - GET /api/categories - List all categories
 * - GET /api/categories/:id - Get single category
 * - GET /api/categories/stats - Get statistics
 *
 * @module tests/category-api
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { CategoryService } from '../src/services/CategoryService.js';
import { router, registerRoute } from '../src/utils/router.js';
import { wrapError, ValidationError } from '../src/utils/errors.js';

describe('Category API Endpoints', () => {
  let app;
  let categoryService;
  let mockLogger;

  beforeAll(() => {
    // Setup mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    // Initialize CategoryService
    categoryService = new CategoryService({
      enableCache: true,
      cacheTTL: 3600000,
      logger: mockLogger
    });

    // Create Express app
    app = express();
    app.use(express.json());

    // Register category endpoints (same as server.js)
    registerRoute(
      "GET",
      "/categories",
      "Get all categories with optional filtering and sorting",
      async (req, res) => {
        const { sort, fields } = req.query;
        try {
          let categories = categoryService.getAllCategories();

          // Apply sorting if specified
          if (sort) {
            const validSortFields = ['name', 'id', 'color'];
            if (!validSortFields.includes(sort)) {
              throw new ValidationError(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`, { sort });
            }

            categories = [...categories].sort((a, b) => {
              const aVal = a[sort];
              const bVal = b[sort];
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            });
          }

          // Apply field filtering if specified
          if (fields) {
            const fieldList = fields.split(',').map(f => f.trim());
            categories = categories.map(cat => {
              const filtered = {};
              fieldList.forEach(field => {
                if (cat.hasOwnProperty(field)) {
                  filtered[field] = cat[field];
                }
              });
              return filtered;
            });
          }

          res.json({
            categories,
            count: categories.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          throw wrapError(error, "CATEGORY_ERROR", {
            query: req.query,
          });
        }
      }
    );

    // Register /stats BEFORE /:id to avoid route conflicts
    registerRoute(
      "GET",
      "/categories/stats",
      "Get category service statistics",
      async (req, res) => {
        try {
          const statistics = categoryService.getStatistics();
          const health = categoryService.getHealth();

          res.json({
            statistics: {
              ...statistics,
              health
            },
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          throw wrapError(error, "CATEGORY_ERROR", {});
        }
      }
    );

    registerRoute(
      "GET",
      "/categories/:id",
      "Get single category by ID",
      async (req, res) => {
        const { id } = req.params;
        try {
          if (!id) {
            throw new ValidationError("Missing category ID in path parameter");
          }

          // Check if category exists
          if (!categoryService.categoryExists(id)) {
            throw new ValidationError("Category not found", {
              categoryId: id,
              availableCategories: categoryService.getCategoryIds()
            });
          }

          const category = categoryService.getCategory(id);

          res.json({
            category,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          throw wrapError(error, "CATEGORY_ERROR", {
            categoryId: req.params.id,
          });
        }
      }
    );

    // Apply router to app
    app.use('/api', router);

    // Error handling middleware (must be after routes)
    app.use((err, req, res, next) => {
      // Log error
      mockLogger.error('Request error:', err);

      // Determine status code based on error type
      let statusCode = 500;
      if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
        statusCode = 400;
      }

      // Send error response
      res.status(statusCode).json({
        error: err.code || err.name || 'INTERNAL_ERROR',
        code: err.code || err.name || 'INTERNAL_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
        ...(err.data && { details: err.data })
      });
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories with count', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.count).toBe(response.body.categories.length);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return categories with all required fields', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      const category = response.body.categories[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('description');
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('icon');
    });

    it('should return 10 standard categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.count).toBe(10);

      const categoryIds = response.body.categories.map(c => c.id);
      expect(categoryIds).toContain('github');
      expect(categoryIds).toContain('filesystem');
      expect(categoryIds).toContain('web');
      expect(categoryIds).toContain('docker');
      expect(categoryIds).toContain('git');
      expect(categoryIds).toContain('python');
      expect(categoryIds).toContain('database');
      expect(categoryIds).toContain('memory');
      expect(categoryIds).toContain('vertex_ai');
      expect(categoryIds).toContain('meta');
    });

    describe('Query Parameter: sort', () => {
      it('should sort by name when sort=name', async () => {
        const response = await request(app)
          .get('/api/categories?sort=name')
          .expect(200);

        const names = response.body.categories.map(c => c.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      });

      it('should sort by id when sort=id', async () => {
        const response = await request(app)
          .get('/api/categories?sort=id')
          .expect(200);

        const ids = response.body.categories.map(c => c.id);
        const sortedIds = [...ids].sort();
        expect(ids).toEqual(sortedIds);
      });

      it('should sort by color when sort=color', async () => {
        const response = await request(app)
          .get('/api/categories?sort=color')
          .expect(200);

        const colors = response.body.categories.map(c => c.color);
        const sortedColors = [...colors].sort();
        expect(colors).toEqual(sortedColors);
      });

      it('should reject invalid sort field', async () => {
        const response = await request(app)
          .get('/api/categories?sort=invalid')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Invalid sort field');
      });
    });

    describe('Query Parameter: fields', () => {
      it('should return only specified fields when fields=id,name', async () => {
        const response = await request(app)
          .get('/api/categories?fields=id,name')
          .expect(200);

        const category = response.body.categories[0];
        expect(Object.keys(category).sort()).toEqual(['id', 'name'].sort());
        expect(category).not.toHaveProperty('description');
        expect(category).not.toHaveProperty('color');
      });

      it('should return only id field when fields=id', async () => {
        const response = await request(app)
          .get('/api/categories?fields=id')
          .expect(200);

        const category = response.body.categories[0];
        expect(Object.keys(category)).toEqual(['id']);
      });

      it('should handle multiple fields with whitespace', async () => {
        const response = await request(app)
          .get('/api/categories?fields=id, name, color')
          .expect(200);

        const category = response.body.categories[0];
        expect(Object.keys(category).sort()).toEqual(['color', 'id', 'name'].sort());
      });

      it('should ignore invalid fields in field list', async () => {
        const response = await request(app)
          .get('/api/categories?fields=id,invalid,name')
          .expect(200);

        const category = response.body.categories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).not.toHaveProperty('invalid');
      });
    });

    describe('Combined Parameters', () => {
      it('should apply both sort and fields filters', async () => {
        const response = await request(app)
          .get('/api/categories?sort=name&fields=id,name')
          .expect(200);

        // Check fields filtering
        const category = response.body.categories[0];
        expect(Object.keys(category).sort()).toEqual(['id', 'name'].sort());

        // Check sorting
        const names = response.body.categories.map(c => c.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      });
    });

    describe('Performance', () => {
      it('should respond in less than 20ms', async () => {
        const start = Date.now();
        await request(app)
          .get('/api/categories')
          .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(20);
      });
    });
  });

  describe('GET /api/categories/:id', () => {
    describe('Valid Categories', () => {
      const validCategories = [
        'github', 'filesystem', 'web', 'docker', 'git',
        'python', 'database', 'memory', 'vertex_ai', 'meta'
      ];

      validCategories.forEach(categoryId => {
        it(`should return category for id: ${categoryId}`, async () => {
          const response = await request(app)
            .get(`/api/categories/${categoryId}`)
            .expect(200);

          expect(response.body).toHaveProperty('category');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body.category.id).toBe(categoryId);
          expect(response.body.category).toHaveProperty('name');
          expect(response.body.category).toHaveProperty('description');
          expect(response.body.category).toHaveProperty('color');
        });
      });
    });

    describe('Invalid Categories', () => {
      it('should return 400 for non-existent category', async () => {
        const response = await request(app)
          .get('/api/categories/nonexistent')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Category not found');
        expect(response.body.details).toHaveProperty('categoryId');
        expect(response.body.details.categoryId).toBe('nonexistent');
      });

      it('should return available categories in error response', async () => {
        const response = await request(app)
          .get('/api/categories/invalid')
          .expect(400);

        expect(response.body.details).toHaveProperty('availableCategories');
        expect(Array.isArray(response.body.details.availableCategories)).toBe(true);
        expect(response.body.details.availableCategories.length).toBe(10);
      });

      it('should handle special characters in category ID', async () => {
        const response = await request(app)
          .get('/api/categories/@invalid!')
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle empty category ID', async () => {
        // Note: Empty ID will likely route to /categories (list endpoint)
        // This test verifies route handling
        const response = await request(app)
          .get('/api/categories/')
          .expect(200);

        // Should return list, not single category
        expect(response.body).toHaveProperty('categories');
        expect(response.body).toHaveProperty('count');
      });
    });

    describe('Category Data Validation', () => {
      it('should return GitHub category with correct metadata', async () => {
        const response = await request(app)
          .get('/api/categories/github')
          .expect(200);

        const { category } = response.body;
        expect(category.id).toBe('github');
        expect(category.name).toBe('GitHub');
        expect(category.color).toBe('#00CEC9');
        expect(category.icon).toBe('GitHubIcon');
        expect(category.description).toContain('GitHub');
      });

      it('should return filesystem category with patterns and keywords', async () => {
        const response = await request(app)
          .get('/api/categories/filesystem')
          .expect(200);

        const { category } = response.body;
        expect(category.id).toBe('filesystem');
        expect(category).toHaveProperty('patterns');
        expect(category).toHaveProperty('keywords');
        expect(Array.isArray(category.patterns)).toBe(true);
        expect(Array.isArray(category.keywords)).toBe(true);
      });
    });

    describe('Performance', () => {
      it('should respond in less than 15ms', async () => {
        const start = Date.now();
        await request(app)
          .get('/api/categories/github')
          .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(15);
      });

      it('should use cache on repeated requests', async () => {
        // First request (cache miss)
        await request(app).get('/api/categories/github').expect(200);

        // Second request (should hit cache)
        const start = Date.now();
        await request(app).get('/api/categories/github').expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(10); // Cache hit should be faster
      });
    });
  });

  describe('GET /api/categories/stats', () => {
    it('should return comprehensive statistics', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      expect(response.body).toHaveProperty('statistics');
      expect(response.body).toHaveProperty('timestamp');

      const { statistics } = response.body;
      expect(statistics).toHaveProperty('totalCategories');
      expect(statistics).toHaveProperty('categoryRetrieval');
      expect(statistics).toHaveProperty('cacheHits');
      expect(statistics).toHaveProperty('cacheMisses');
      expect(statistics).toHaveProperty('health');
    });

    it('should report 10 total categories', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      expect(response.body.statistics.totalCategories).toBe(10);
    });

    it('should include health status', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      const { health } = response.body.statistics;
      expect(health).toHaveProperty('status');
      expect(health.status).toBe('healthy');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('categories');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('operations');
    });

    it('should include cache statistics', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      const { statistics } = response.body;
      expect(statistics).toHaveProperty('cacheEnabled');
      expect(statistics).toHaveProperty('cacheSize');
      expect(statistics).toHaveProperty('cacheHitRate');
      expect(typeof statistics.cacheHitRate).toBe('number');
      expect(statistics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(statistics.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should include validation statistics', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      const { statistics } = response.body;
      expect(statistics).toHaveProperty('validationCalls');
      expect(statistics).toHaveProperty('validationFailures');
      expect(statistics).toHaveProperty('validationSuccessRate');
      expect(typeof statistics.validationSuccessRate).toBe('number');
    });

    it('should track category retrieval operations', async () => {
      // Get initial stats
      const before = await request(app).get('/api/categories/stats').expect(200);
      const retrievalBefore = before.body.statistics.categoryRetrieval;

      // Make a category request
      await request(app).get('/api/categories/github').expect(200);

      // Check stats updated
      const after = await request(app).get('/api/categories/stats').expect(200);
      const retrievalAfter = after.body.statistics.categoryRetrieval;

      expect(retrievalAfter).toBeGreaterThan(retrievalBefore);
    });

    it('should track cache hit rate correctly', async () => {
      // Make multiple requests to same category
      await request(app).get('/api/categories/web').expect(200);
      await request(app).get('/api/categories/web').expect(200);
      await request(app).get('/api/categories/web').expect(200);

      const response = await request(app).get('/api/categories/stats').expect(200);
      const { cacheHits, cacheMisses } = response.body.statistics;

      expect(cacheHits).toBeGreaterThan(0);
      expect(cacheMisses).toBeGreaterThanOrEqual(0);
    });

    it('should include category IDs in statistics', async () => {
      const response = await request(app)
        .get('/api/categories/stats')
        .expect(200);

      const { statistics } = response.body;
      expect(statistics).toHaveProperty('categoryIds');
      expect(Array.isArray(statistics.categoryIds)).toBe(true);
      expect(statistics.categoryIds.length).toBe(10);
    });

    describe('Health Status Details', () => {
      it('should report cache health information', async () => {
        const response = await request(app)
          .get('/api/categories/stats')
          .expect(200);

        const { cache } = response.body.statistics.health;
        expect(cache).toHaveProperty('enabled');
        expect(cache).toHaveProperty('size');
        expect(cache).toHaveProperty('hitRate');
        expect(cache).toHaveProperty('valid');
        expect(typeof cache.enabled).toBe('boolean');
      });

      it('should report operations health information', async () => {
        const response = await request(app)
          .get('/api/categories/stats')
          .expect(200);

        const { operations } = response.body.statistics.health;
        expect(operations).toHaveProperty('totalRetrieval');
        expect(operations).toHaveProperty('totalValidation');
        expect(operations).toHaveProperty('validationSuccessRate');
      });
    });

    describe('Performance', () => {
      it('should respond in less than 15ms', async () => {
        const start = Date.now();
        await request(app)
          .get('/api/categories/stats')
          .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(15);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/categories?sort=&fields=')
        .expect(200);

      // Should still return valid response with empty params
      expect(response.body).toHaveProperty('categories');
    });

    it('should return proper error structure', async () => {
      const response = await request(app)
        .get('/api/categories/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('Integration', () => {
    it('should work together: list → get → stats', async () => {
      // Get list
      const listResponse = await request(app).get('/api/categories').expect(200);
      const firstCategory = listResponse.body.categories[0];

      // Get single
      const singleResponse = await request(app)
        .get(`/api/categories/${firstCategory.id}`)
        .expect(200);
      expect(singleResponse.body.category.id).toBe(firstCategory.id);

      // Get stats
      const statsResponse = await request(app).get('/api/categories/stats').expect(200);
      expect(statsResponse.body.statistics.totalCategories).toBe(listResponse.body.count);
    });
  });
});
