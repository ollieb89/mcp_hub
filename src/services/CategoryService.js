/**
 * CategoryService - Core service for MCP Hub category operations
 *
 * Provides centralized category management including:
 * - Category metadata retrieval
 * - Category validation
 * - Statistics and analytics
 * - Caching for performance
 *
 * This service acts as the primary interface for category operations
 * and is used by API endpoints and the CategoryMapper.
 *
 * @module CategoryService
 * @version 1.0.0
 * @created 2024-11-05
 */

import {
  STANDARD_CATEGORIES,
  CATEGORY_ORDER,
  CATEGORY_COLORS,
  getCategoryById,
  getAllCategories,
  validateCategoryId,
  getCategoryIds,
  categoryExists,
  getCategoryName,
  getCategoryColor,
  getCategoryStats as getDefinitionStats
} from '../utils/category-definitions.js';

/**
 * CategoryService class - Manages category operations and caching
 *
 * @class CategoryService
 * @example
 * const categoryService = new CategoryService({ enableCache: true });
 * const github = categoryService.getCategory('github');
 * const all = categoryService.getAllCategories();
 * const stats = categoryService.getStatistics();
 */
export class CategoryService {
  /**
   * Create a CategoryService instance
   *
   * @param {Object} options - Service configuration options
   * @param {boolean} [options.enableCache=true] - Enable in-memory caching
   * @param {number} [options.cacheTTL=3600000] - Cache TTL in ms (default 1 hour)
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor(options = {}) {
    this.options = {
      enableCache: options.enableCache !== false, // Default true
      cacheTTL: options.cacheTTL || 3600000, // 1 hour default
      logger: options.logger || console
    };

    // Initialize caches
    this._categoryCache = new Map();
    this._statsCache = null;
    this._lastCacheUpdate = null;

    // Statistics tracking
    this._stats = {
      categoryRetrieval: 0,
      cacheHits: 0,
      cacheMisses: 0,
      validationCalls: 0,
      validationFailures: 0
    };

    this.options.logger.info('[CategoryService] Initialized', {
      enableCache: this.options.enableCache,
      cacheTTL: this.options.cacheTTL
    });
  }

  /**
   * Get category metadata by ID
   *
   * @param {string} categoryId - Category identifier
   * @returns {Object|null} Category metadata or null if not found
   *
   * @example
   * const github = service.getCategory('github');
   * console.log(github.name); // "GitHub"
   * console.log(github.color); // "#00CEC9"
   */
  getCategory(categoryId) {
    this._stats.categoryRetrieval++;

    if (!categoryId) {
      return null;
    }

    // Check cache first
    if (this.options.enableCache && this._isCacheValid()) {
      const cached = this._categoryCache.get(categoryId);
      if (cached) {
        this._stats.cacheHits++;
        return cached;
      }
      this._stats.cacheMisses++;
    }

    // Get from definitions
    const category = getCategoryById(categoryId);

    // Cache if enabled
    if (this.options.enableCache && category) {
      this._categoryCache.set(categoryId, category);
      this._updateCacheTimestamp();
    }

    return category;
  }

  /**
   * Get all categories in display order
   *
   * @returns {Array<Object>} Array of category metadata objects
   *
   * @example
   * const categories = service.getAllCategories();
   * console.log(categories.length); // 10
   * categories.forEach(cat => console.log(cat.name));
   */
  getAllCategories() {
    return getAllCategories();
  }

  /**
   * Get category IDs in display order
   *
   * @returns {string[]} Array of category IDs
   *
   * @example
   * const ids = service.getCategoryIds();
   * console.log(ids); // ['github', 'filesystem', 'web', ...]
   */
  getCategoryIds() {
    return getCategoryIds();
  }

  /**
   * Validate category ID
   *
   * @param {string} categoryId - Category ID to validate
   * @returns {boolean} True if valid category ID
   *
   * @example
   * service.validateCategory('github');  // true
   * service.validateCategory('invalid'); // false
   */
  validateCategory(categoryId) {
    this._stats.validationCalls++;

    const isValid = validateCategoryId(categoryId);

    if (!isValid) {
      this._stats.validationFailures++;
    }

    return isValid;
  }

  /**
   * Check if category exists
   *
   * @param {string} categoryId - Category ID to check
   * @returns {boolean} True if category exists
   *
   * @example
   * service.categoryExists('github');  // true
   * service.categoryExists('invalid'); // false
   */
  categoryExists(categoryId) {
    return categoryExists(categoryId);
  }

  /**
   * Get category display name
   *
   * @param {string} categoryId - Category ID
   * @returns {string|null} Display name or null if not found
   *
   * @example
   * service.getCategoryName('github'); // "GitHub"
   */
  getCategoryName(categoryId) {
    return getCategoryName(categoryId);
  }

  /**
   * Get category color
   *
   * @param {string} categoryId - Category ID
   * @returns {string|null} Hex color code or null if not found
   *
   * @example
   * service.getCategoryColor('github'); // "#00CEC9"
   */
  getCategoryColor(categoryId) {
    return getCategoryColor(categoryId);
  }

  /**
   * Get all category colors
   *
   * @returns {Object<string, string>} Map of category ID to color
   *
   * @example
   * const colors = service.getAllColors();
   * console.log(colors.github); // "#00CEC9"
   */
  getAllColors() {
    return { ...CATEGORY_COLORS };
  }

  /**
   * Get comprehensive category statistics
   *
   * @returns {Object} Statistics object
   *
   * @example
   * const stats = service.getStatistics();
   * console.log(stats.totalCategories); // 10
   * console.log(stats.cacheHitRate); // 0.75
   */
  getStatistics() {
    const definitionStats = getDefinitionStats();

    const totalRequests = this._stats.cacheHits + this._stats.cacheMisses;
    const cacheHitRate = totalRequests > 0
      ? this._stats.cacheHits / totalRequests
      : 0;

    const validationSuccessRate = this._stats.validationCalls > 0
      ? 1 - (this._stats.validationFailures / this._stats.validationCalls)
      : 1;

    return {
      // Category counts
      totalCategories: definitionStats.total,
      categoryIds: definitionStats.ids,

      // Service statistics
      categoryRetrieval: this._stats.categoryRetrieval,
      validationCalls: this._stats.validationCalls,
      validationFailures: this._stats.validationFailures,
      validationSuccessRate,

      // Cache statistics
      cacheEnabled: this.options.enableCache,
      cacheHits: this._stats.cacheHits,
      cacheMisses: this._stats.cacheMisses,
      cacheHitRate,
      cacheSize: this._categoryCache.size,
      lastCacheUpdate: this._lastCacheUpdate,

      // Definition statistics
      hasPatterns: definitionStats.hasPatterns,
      hasKeywords: definitionStats.hasKeywords
    };
  }

  /**
   * Get category by multiple criteria
   *
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.id] - Category ID
   * @param {string} [criteria.name] - Category name (case-insensitive)
   * @param {string} [criteria.color] - Category color
   * @returns {Object|null} Category metadata or null if not found
   *
   * @example
   * service.findCategory({ name: 'GitHub' });
   * service.findCategory({ color: '#00CEC9' });
   */
  findCategory(criteria) {
    if (!criteria || typeof criteria !== 'object') {
      return null;
    }

    // Search by ID (fastest)
    if (criteria.id) {
      return this.getCategory(criteria.id);
    }

    // Search by name
    if (criteria.name) {
      const searchName = criteria.name.toLowerCase();
      const all = this.getAllCategories();
      return all.find(cat =>
        cat.name.toLowerCase() === searchName
      ) || null;
    }

    // Search by color
    if (criteria.color) {
      const all = this.getAllCategories();
      return all.find(cat =>
        cat.color === criteria.color
      ) || null;
    }

    return null;
  }

  /**
   * Get categories by tags (if implemented in future)
   *
   * @param {string} tag - Tag to filter by
   * @returns {Array<Object>} Matching categories
   *
   * @example
   * const devCategories = service.getCategoriesByTag('development');
   */
  getCategoriesByTag(tag) {
    if (!tag) {
      return [];
    }

    // Not implemented in current category definitions
    // Reserved for future enhancement
    this.options.logger.warn('[CategoryService] Tag filtering not yet implemented');
    return [];
  }

  /**
   * Clear all caches
   *
   * @example
   * service.clearCache();
   */
  clearCache() {
    this._categoryCache.clear();
    this._statsCache = null;
    this._lastCacheUpdate = null;

    this.options.logger.info('[CategoryService] Cache cleared');
  }

  /**
   * Reset service statistics
   *
   * @example
   * service.resetStatistics();
   */
  resetStatistics() {
    this._stats = {
      categoryRetrieval: 0,
      cacheHits: 0,
      cacheMisses: 0,
      validationCalls: 0,
      validationFailures: 0
    };

    this.options.logger.info('[CategoryService] Statistics reset');
  }

  /**
   * Warm up cache by loading all categories
   *
   * @returns {number} Number of categories cached
   *
   * @example
   * const count = service.warmCache();
   * console.log(`Cached ${count} categories`);
   */
  warmCache() {
    if (!this.options.enableCache) {
      return 0;
    }

    const categories = this.getAllCategories();
    categories.forEach(category => {
      this._categoryCache.set(category.id, category);
    });

    this._updateCacheTimestamp();

    this.options.logger.info('[CategoryService] Cache warmed', {
      count: this._categoryCache.size
    });

    return this._categoryCache.size;
  }

  /**
   * Check if cache is valid (not expired)
   *
   * @private
   * @returns {boolean} True if cache is valid
   */
  _isCacheValid() {
    if (!this._lastCacheUpdate) {
      return false;
    }

    const age = Date.now() - this._lastCacheUpdate;
    return age < this.options.cacheTTL;
  }

  /**
   * Update cache timestamp
   *
   * @private
   */
  _updateCacheTimestamp() {
    this._lastCacheUpdate = Date.now();
  }

  /**
   * Get service health status
   *
   * @returns {Object} Health status object
   *
   * @example
   * const health = service.getHealth();
   * console.log(health.status); // "healthy"
   */
  getHealth() {
    const stats = this.getStatistics();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      categories: {
        total: stats.totalCategories,
        loaded: true
      },
      cache: {
        enabled: stats.cacheEnabled,
        size: stats.cacheSize,
        hitRate: stats.cacheHitRate,
        valid: this._isCacheValid()
      },
      operations: {
        totalRetrieval: stats.categoryRetrieval,
        totalValidation: stats.validationCalls,
        validationSuccessRate: stats.validationSuccessRate
      }
    };
  }

  /**
   * Export service configuration and state
   *
   * @returns {Object} Service state export
   *
   * @example
   * const state = service.export();
   * console.log(state.config);
   */
  export() {
    return {
      config: {
        enableCache: this.options.enableCache,
        cacheTTL: this.options.cacheTTL
      },
      state: {
        cacheSize: this._categoryCache.size,
        lastCacheUpdate: this._lastCacheUpdate,
        statistics: this._stats
      },
      categories: {
        total: CATEGORY_ORDER.length,
        ids: CATEGORY_ORDER
      }
    };
  }
}

/**
 * Create singleton instance for application-wide use
 *
 * @param {Object} options - Service options
 * @returns {CategoryService} Service instance
 *
 * @example
 * import { createCategoryService } from './services/CategoryService.js';
 * const service = createCategoryService({ enableCache: true });
 */
export function createCategoryService(options = {}) {
  return new CategoryService(options);
}

/**
 * Default export
 */
export default CategoryService;
