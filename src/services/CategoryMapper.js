/**
 * CategoryMapper - Intelligent MCP server categorization engine
 *
 * Provides automatic categorization of MCP servers using:
 * 1. Pattern matching (server name patterns)
 * 2. Keyword matching (description/tool name analysis)
 * 3. LLM fallback (Gemini for ambiguous cases)
 *
 * Implements two-tier caching:
 * - In-memory cache (fast, session-scoped)
 * - Persistent cache (XDG-compliant, cross-session)
 *
 * @module CategoryMapper
 * @version 1.0.0
 * @created 2024-11-05
 */

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import {
  getCategoryById,
  getAllCategories,
  matchesPattern,
  matchesKeywords
} from '../utils/category-definitions.js';
import { createLLMProvider } from '../utils/llm-provider.js';
import { envResolver } from '../utils/env-resolver.js';
import { getStateDirectory } from '../utils/xdg-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CategoryMapper class - Maps MCP servers to categories
 *
 * @class CategoryMapper
 * @example
 * const mapper = new CategoryMapper({
 *   enableLLM: true,
 *   llmConfig: { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY }
 * });
 * const category = await mapper.categorize('github-server', 'GitHub operations');
 */
export class CategoryMapper {
  /**
   * Create a CategoryMapper instance
   *
   * @param {Object} options - Mapper configuration options
   * @param {boolean} [options.enableLLM=false] - Enable LLM fallback
   * @param {Object} [options.llmConfig] - LLM configuration
   * @param {string} [options.llmConfig.provider='gemini'] - LLM provider (gemini, openai, anthropic)
   * @param {string} [options.llmConfig.apiKey] - API key for LLM provider
   * @param {string} [options.llmConfig.model] - Model name (optional, uses provider default)
   * @param {boolean} [options.enableCache=true] - Enable in-memory caching
   * @param {boolean} [options.enablePersistentCache=true] - Enable persistent caching
   * @param {string} [options.cacheDir] - Custom cache directory (defaults to XDG)
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor(options = {}) {
    this.options = {
      enableLLM: options.enableLLM || false,
      llmConfig: options.llmConfig || {},
      enableCache: options.enableCache !== false,
      enablePersistentCache: options.enablePersistentCache !== false,
      cacheDir: options.cacheDir || path.join(getStateDirectory(), 'category-cache'),
      logger: options.logger || console
    };

    // Initialize caches
    this._memoryCache = new Map(); // In-memory cache: serverName -> category
    this._persistentCachePath = path.join(this.options.cacheDir, 'categories.json');
    this._persistentCache = null; // Loaded lazily

    // LLM client (initialized on first use)
    this._llmClient = null;
    this._llmInitPromise = null;

    // Statistics tracking
    this._stats = {
      totalCategorizations: 0,
      patternMatches: 0,
      keywordMatches: 0,
      llmFallbacks: 0,
      llmErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      uncategorized: 0
    };

    this.options.logger.info('[CategoryMapper] Initialized', {
      enableLLM: this.options.enableLLM,
      enableCache: this.options.enableCache,
      enablePersistentCache: this.options.enablePersistentCache
    });
  }

  /**
   * Categorize an MCP server
   *
   * Uses three-tier categorization strategy:
   * 1. Pattern matching (fastest, most reliable)
   * 2. Keyword matching (fallback, good accuracy)
   * 3. LLM categorization (slowest, handles ambiguous cases)
   *
   * @param {string} serverName - MCP server name
   * @param {string} [description] - Server description (optional, improves accuracy)
   * @param {Array<string>} [toolNames] - Tool names (optional, for keyword matching)
   * @returns {Promise<string>} Category ID or 'other' if uncategorized
   *
   * @example
   * const category = await mapper.categorize('my-github-server', 'GitHub API wrapper');
   * console.log(category); // "github"
   */
  async categorize(serverName, description = '', toolNames = []) {
    this._stats.totalCategorizations++;

    if (!serverName) {
      this.options.logger.warn('[CategoryMapper] Empty server name provided');
      return 'other';
    }

    // Step 1: Check memory cache
    if (this.options.enableCache) {
      const cached = this._memoryCache.get(serverName);
      if (cached) {
        this._stats.cacheHits++;
        return cached;
      }
    }

    // Step 2: Check persistent cache
    if (this.options.enablePersistentCache) {
      const persistent = await this._loadFromPersistentCache(serverName);
      if (persistent) {
        this._stats.cacheHits++;
        // Store in memory cache for future lookups
        if (this.options.enableCache) {
          this._memoryCache.set(serverName, persistent);
        }
        return persistent;
      }
    }

    this._stats.cacheMisses++;

    // Step 3: Pattern matching
    const patternMatch = this._categorizeByPattern(serverName);
    if (patternMatch) {
      this._stats.patternMatches++;
      await this._cacheCategory(serverName, patternMatch);
      return patternMatch;
    }

    // Step 4: Keyword matching
    const combinedText = [serverName, description, ...toolNames].join(' ');
    const keywordMatch = this._categorizeByKeywords(combinedText);
    if (keywordMatch) {
      this._stats.keywordMatches++;
      await this._cacheCategory(serverName, keywordMatch);
      return keywordMatch;
    }

    // Step 5: LLM fallback (if enabled)
    if (this.options.enableLLM) {
      try {
        const llmCategory = await this._categorizeByLLM(serverName, description, toolNames);
        if (llmCategory && llmCategory !== 'other') {
          this._stats.llmFallbacks++;
          await this._cacheCategory(serverName, llmCategory);
          return llmCategory;
        }
      } catch (error) {
        this.options.logger.warn('[CategoryMapper] LLM categorization failed', {
          serverName,
          error: error.message
        });
        this._stats.llmErrors++;
      }
    }

    // Step 6: Default to 'other'
    this._stats.uncategorized++;
    const defaultCategory = 'other';
    await this._cacheCategory(serverName, defaultCategory);
    return defaultCategory;
  }

  /**
   * Categorize multiple servers in batch
   *
   * @param {Array<Object>} servers - Array of server objects
   * @param {string} servers[].name - Server name
   * @param {string} [servers[].description] - Server description
   * @param {Array<string>} [servers[].toolNames] - Tool names
   * @returns {Promise<Map<string, string>>} Map of serverName -> categoryId
   *
   * @example
   * const servers = [
   *   { name: 'github-server', description: 'GitHub API' },
   *   { name: 'filesystem', description: 'File operations' }
   * ];
   * const categories = await mapper.categorizeBatch(servers);
   */
  async categorizeBatch(servers) {
    const results = new Map();

    // Use Promise.all for parallel categorization
    const promises = servers.map(async (server) => {
      const category = await this.categorize(
        server.name,
        server.description,
        server.toolNames
      );
      return [server.name, category];
    });

    const resolved = await Promise.all(promises);
    resolved.forEach(([name, category]) => {
      results.set(name, category);
    });

    return results;
  }

  /**
   * Categorize by pattern matching
   *
   * @private
   * @param {string} serverName - Server name
   * @returns {string|null} Category ID or null if no match
   */
  _categorizeByPattern(serverName) {
    if (!serverName) return null;

    const categories = getAllCategories();

    for (const category of categories) {
      if (matchesPattern(serverName, category.id)) {
        this.options.logger.debug('[CategoryMapper] Pattern match', {
          serverName,
          category: category.id,
          patterns: category.patterns.length
        });
        return category.id;
      }
    }

    return null;
  }

  /**
   * Categorize by keyword matching
   *
   * @private
   * @param {string} text - Combined text (name + description + tools)
   * @returns {string|null} Category ID or null if no match
   */
  _categorizeByKeywords(text) {
    if (!text) return null;

    const categories = getAllCategories();

    // Score-based matching: count keyword matches
    const scores = new Map();

    for (const category of categories) {
      if (matchesKeywords(text, category.id)) {
        // Count how many keywords match
        const matchCount = category.keywords.filter(keyword =>
          text.toLowerCase().includes(keyword.toLowerCase())
        ).length;

        scores.set(category.id, matchCount);
      }
    }

    // Return category with highest score
    if (scores.size > 0) {
      const bestMatch = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
      this.options.logger.debug('[CategoryMapper] Keyword match', {
        text: text.substring(0, 50) + '...',
        category: bestMatch[0],
        score: bestMatch[1]
      });
      return bestMatch[0];
    }

    return null;
  }

  /**
   * Categorize using LLM
   *
   * @private
   * @param {string} serverName - Server name
   * @param {string} description - Server description
   * @param {Array<string>} toolNames - Tool names
   * @returns {Promise<string>} Category ID
   */
  async _categorizeByLLM(serverName, description, toolNames) {
    // Initialize LLM client if needed
    if (!this._llmClient) {
      await this._initializeLLM();
    }

    // Build categorization prompt
    const categories = getAllCategories()
      .map(cat => `${cat.id}: ${cat.description}`)
      .join('\n');

    const prompt = `Categorize the following MCP server into ONE of these categories:

${categories}

Server Information:
- Name: ${serverName}
- Description: ${description || 'Not provided'}
- Tools: ${toolNames.length > 0 ? toolNames.join(', ') : 'Not provided'}

Respond with ONLY the category ID (e.g., "github", "filesystem", "web").
If uncertain, respond with "other".`;

    try {
      const response = await this._llmClient.generateText(prompt);
      const category = response.trim().toLowerCase();

      // Validate category exists
      const validCategory = getCategoryById(category);
      if (validCategory) {
        this.options.logger.info('[CategoryMapper] LLM categorized', {
          serverName,
          category
        });
        return category;
      }

      this.options.logger.warn('[CategoryMapper] LLM returned invalid category', {
        serverName,
        response: category
      });
      return 'other';
    } catch (error) {
      this.options.logger.error('[CategoryMapper] LLM error', {
        serverName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize LLM client
   *
   * @private
   * @returns {Promise<void>}
   */
  async _initializeLLM() {
    if (this._llmInitPromise) {
      return this._llmInitPromise;
    }

    this._llmInitPromise = (async () => {
      try {
        // Resolve environment variables in config
        const resolvedConfig = await envResolver.resolveConfig(
          this.options.llmConfig,
          ['apiKey', 'model', 'baseURL']
        );

        // Create LLM provider
        this._llmClient = createLLMProvider({
          provider: resolvedConfig.provider || 'gemini',
          apiKey: resolvedConfig.apiKey,
          model: resolvedConfig.model,
          baseURL: resolvedConfig.baseURL
        });

        this.options.logger.info('[CategoryMapper] LLM initialized', {
          provider: resolvedConfig.provider || 'gemini',
          model: resolvedConfig.model || 'default'
        });
      } catch (error) {
        this.options.logger.error('[CategoryMapper] LLM initialization failed', {
          error: error.message
        });
        this._llmClient = null;
        throw error;
      }
    })();

    return this._llmInitPromise;
  }

  /**
   * Cache category result
   *
   * @private
   * @param {string} serverName - Server name
   * @param {string} category - Category ID
   * @returns {Promise<void>}
   */
  async _cacheCategory(serverName, category) {
    // Memory cache
    if (this.options.enableCache) {
      this._memoryCache.set(serverName, category);
    }

    // Persistent cache
    if (this.options.enablePersistentCache) {
      await this._saveToPersistentCache(serverName, category);
    }
  }

  /**
   * Load category from persistent cache
   *
   * @private
   * @param {string} serverName - Server name
   * @returns {Promise<string|null>} Category ID or null
   */
  async _loadFromPersistentCache(serverName) {
    try {
      // Load cache file if not already loaded
      if (!this._persistentCache) {
        await this._loadPersistentCache();
      }

      return this._persistentCache?.[serverName] || null;
    } catch (error) {
      this.options.logger.warn('[CategoryMapper] Persistent cache load failed', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Save category to persistent cache
   *
   * @private
   * @param {string} serverName - Server name
   * @param {string} category - Category ID
   * @returns {Promise<void>}
   */
  async _saveToPersistentCache(serverName, category) {
    try {
      // Load cache if not already loaded
      if (!this._persistentCache) {
        await this._loadPersistentCache();
      }

      // Update cache
      this._persistentCache[serverName] = category;

      // Ensure cache directory exists
      await fs.mkdir(this.options.cacheDir, { recursive: true });

      // Write cache file
      await fs.writeFile(
        this._persistentCachePath,
        JSON.stringify(this._persistentCache, null, 2),
        'utf8'
      );
    } catch (error) {
      this.options.logger.warn('[CategoryMapper] Persistent cache save failed', {
        error: error.message
      });
    }
  }

  /**
   * Load persistent cache from disk
   *
   * @private
   * @returns {Promise<void>}
   */
  async _loadPersistentCache() {
    try {
      const data = await fs.readFile(this._persistentCachePath, 'utf8');
      this._persistentCache = JSON.parse(data);
      this.options.logger.debug('[CategoryMapper] Persistent cache loaded', {
        entries: Object.keys(this._persistentCache).length
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Cache file doesn't exist yet
        this._persistentCache = {};
      } else {
        this.options.logger.warn('[CategoryMapper] Persistent cache load error', {
          error: error.message
        });
        this._persistentCache = {};
      }
    }
  }

  /**
   * Clear all caches
   *
   * @returns {Promise<void>}
   */
  async clearCache() {
    // Clear memory cache
    this._memoryCache.clear();

    // Clear persistent cache
    if (this.options.enablePersistentCache) {
      this._persistentCache = {};
      try {
        await fs.unlink(this._persistentCachePath);
        this.options.logger.info('[CategoryMapper] Persistent cache cleared');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.options.logger.warn('[CategoryMapper] Persistent cache clear failed', {
            error: error.message
          });
        }
      }
    }

    this.options.logger.info('[CategoryMapper] All caches cleared');
  }

  /**
   * Get categorization statistics
   *
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const total = this._stats.totalCategorizations || 1; // Avoid division by zero

    return {
      totalCategorizations: this._stats.totalCategorizations,
      patternMatches: this._stats.patternMatches,
      keywordMatches: this._stats.keywordMatches,
      llmFallbacks: this._stats.llmFallbacks,
      llmErrors: this._stats.llmErrors,
      cacheHits: this._stats.cacheHits,
      cacheMisses: this._stats.cacheMisses,
      uncategorized: this._stats.uncategorized,

      // Rates
      patternMatchRate: this._stats.patternMatches / total,
      keywordMatchRate: this._stats.keywordMatches / total,
      llmFallbackRate: this._stats.llmFallbacks / total,
      cacheHitRate: this._stats.cacheHits / (this._stats.cacheHits + this._stats.cacheMisses || 1),
      uncategorizedRate: this._stats.uncategorized / total,

      // Cache info
      memoryCacheSize: this._memoryCache.size,
      persistentCacheSize: this._persistentCache ? Object.keys(this._persistentCache).length : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this._stats = {
      totalCategorizations: 0,
      patternMatches: 0,
      keywordMatches: 0,
      llmFallbacks: 0,
      llmErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      uncategorized: 0
    };

    this.options.logger.info('[CategoryMapper] Statistics reset');
  }

  /**
   * Get health status
   *
   * @returns {Object} Health status
   */
  getHealth() {
    const stats = this.getStatistics();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      llm: {
        enabled: this.options.enableLLM,
        initialized: this._llmClient !== null,
        errors: stats.llmErrors
      },
      cache: {
        memoryEnabled: this.options.enableCache,
        persistentEnabled: this.options.enablePersistentCache,
        memorySize: stats.memoryCacheSize,
        persistentSize: stats.persistentCacheSize,
        hitRate: stats.cacheHitRate
      },
      categorization: {
        total: stats.totalCategorizations,
        patternMatchRate: stats.patternMatchRate,
        keywordMatchRate: stats.keywordMatchRate,
        llmFallbackRate: stats.llmFallbackRate,
        uncategorizedRate: stats.uncategorizedRate
      }
    };
  }
}

/**
 * Create CategoryMapper instance
 *
 * @param {Object} options - Mapper options
 * @returns {CategoryMapper} Mapper instance
 */
export function createCategoryMapper(options = {}) {
  return new CategoryMapper(options);
}

/**
 * Default export
 */
export default CategoryMapper;
