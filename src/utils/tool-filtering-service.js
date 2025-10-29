import fs from 'fs/promises';
import path from 'path';
import PQueue from 'p-queue';
import logger from './logger.js';
import { getStateDirectory } from './xdg-paths.js';

/**
 * Default category mappings for tool classification
 * Maps category names to wildcard patterns that match tool names
 */
export const DEFAULT_CATEGORIES = {
  // File system operations
  filesystem: [
    'filesystem__*',
    'files__*',
    '*__read',
    '*__write',
    '*__list',
    '*__delete',
    '*__move',
    '*__copy'
  ],

  // Web and HTTP
  web: [
    'fetch__*',
    'http__*',
    'browser__*',
    'playwright__*',
    'puppeteer__*',
    '*__request',
    '*__download'
  ],

  // Search engines
  search: [
    'brave__*',
    'tavily__*',
    'google__*',
    '*__search',
    '*__query'
  ],

  // Database operations
  database: [
    'postgres__*',
    'mysql__*',
    'mongo__*',
    'sqlite__*',
    '*__query',
    '*__execute',
    'db__*'
  ],

  // Version control
  'version-control': [
    'github__*',
    'gitlab__*',
    'git__*',
    '*__commit',
    '*__push',
    '*__pull'
  ],

  // Containerization
  docker: [
    'docker__*',
    'container__*',
    'kubernetes__*',
    'k8s__*'
  ],

  // Cloud services
  cloud: [
    'aws__*',
    'gcp__*',
    'azure__*',
    's3__*',
    'ec2__*'
  ],

  // Development tools
  development: [
    'npm__*',
    'pip__*',
    'cargo__*',
    'compiler__*',
    'linter__*',
    'formatter__*',
    'test__*'
  ],

  // Communication
  communication: [
    'slack__*',
    'email__*',
    'discord__*',
    'teams__*',
    '*__send',
    '*__notify'
  ]
};

/**
 * Tool Filtering Service
 *
 * Provides intelligent filtering of MCP tools to reduce cognitive load
 * when large numbers of tools are available. Supports multiple filtering
 * strategies: server-based allowlist/denylist, category-based filtering,
 * and hybrid approaches.
 *
 * Key Features:
 * - Non-blocking LLM categorization (background queue)
 * - Batched cache persistence for performance
 * - Race condition protection for auto-enable
 * - Pattern regex caching
 * - Safe statistics calculation
 *
 * @class ToolFilteringService
 */
class ToolFilteringService {
  constructor(config, mcpHub) {
    this.config = config.toolFiltering || {};
    this.mcpHub = mcpHub;

    // Memory cache for categorized tools
    this.categoryCache = new Map(); // toolName → category

    // Persistent cache for LLM-categorized tools
    this.llmCache = new Map(); // toolName → category
    this.llmCacheFile = null;
    this.llmClient = null;

    // Pattern regex cache for performance (Sprint 0.4)
    this.patternCache = new Map();

    // Category definitions
    this.defaultCategories = DEFAULT_CATEGORIES;
    this.customMappings = this.config.categoryFilter?.customMappings || {};

    // Background LLM queue with rate limiting (Sprint 0.1)
    this.llmQueue = new PQueue({
      concurrency: 5,        // Max 5 concurrent LLM calls
      interval: 100,         // Time window in ms
      intervalCap: 1         // Max 1 call per interval (10/second)
    });

    // State tracking for race condition protection (Sprint 0.3)
    this._autoEnableInProgress = false;
    this._autoEnableCompleted = false;

    // Cache flush state for batched writes (Sprint 0.2)
    this.llmCacheDirty = false;
    this.llmCacheWritesPending = 0;
    this.llmCacheFlushThreshold = 10;

    // Statistics initialization (prevents NaN) (Sprint 0.5)
    this._checkedCount = 0;
    this._filteredCount = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._llmCacheHits = 0;
    this._llmCacheMisses = 0;

    // LLM error tracking for observability (Task 2.5)
    this._llmErrorsByType = new Map(); // Track error types
    this._llmRetryCount = 0;            // Track retry attempts

    // Initialize LLM client if enabled
    if (this.config.llmCategorization?.enabled) {
      this._initializeLLM();
    }
  }

  /**
   * Initialize LLM client and cache
   * @private
   */
  _initializeLLM() {
    try {
      // Validate API key (Sprint 0.5)
      if (!this.config.llmCategorization.apiKey) {
        logger.error('LLM categorization enabled but no API key provided');
        return;
      }

      // Initialize LLM client
      this.llmClient = this._createLLMClient();

      // Set up persistent cache location
      const stateDir = getStateDirectory();
      this.llmCacheFile = path.join(stateDir, 'tool-categories-llm.json');

      // Load existing cache
      this._loadLLMCache().catch(err => {
        logger.warn('Failed to load LLM cache:', err.message);
      });

      // Periodic cache flush (30 seconds) (Sprint 0.2)
      this.llmCacheFlushInterval = setInterval(() => {
        if (this.llmCacheDirty) {
          this._flushCache().catch(err =>
            logger.warn('Failed to flush LLM cache:', err)
          );
        }
      }, 30000);

      logger.info('LLM categorization initialized', {
        provider: this.config.llmCategorization.provider,
        cacheFile: this.llmCacheFile
      });
    } catch (error) {
      logger.error('Failed to initialize LLM categorization:', error);
      this.llmClient = null;
    }
  }

  /**
   * Primary decision method - MUST be synchronous
   * Determines if a tool should be included based on configuration.
   * 
   * Performance: <10ms average
   * Thread-safe: No blocking operations
   * Fail-safe: Defaults to true on error
   * 
   * @param {string} toolName - Tool name (without namespace)
   * @param {string} serverName - Source MCP server name
   * @param {object} toolDefinition - Full tool definition (optional)
   * @returns {boolean} - true to include, false to exclude
   */
  shouldIncludeTool(toolName, serverName, toolDefinition = {}) {
    try {
      // Fail-safe: if filtering disabled, allow all
      if (!this.config.enabled) return true;

      // Performance tracking (debug only)
      const startTime = process.env.DEBUG_TOOL_FILTERING ? performance.now() : null;

      // Get category (may trigger background LLM, but doesn't block)
      const category = this.getToolCategory(toolName, serverName, toolDefinition);

      // Make filtering decision immediately
      let result;
      switch(this.config.mode) {
        case 'server-allowlist':
          result = this._filterByServer(serverName);
          break;
        case 'category':
          result = this._filterByCategory(category);
          break;
        case 'hybrid':
          result = this._filterByServer(serverName) ||
                   this._filterByCategory(category);
          break;
        default:
          logger.warn(`Unknown filtering mode: ${this.config.mode}, defaulting to disabled`);
          result = true;
      }

      // Performance logging (debug only)
      if (startTime) {
        const duration = performance.now() - startTime;
        if (duration > 10) {
          logger.warn(`Tool filtering exceeded 10ms target: ${duration.toFixed(2)}ms for ${toolName}`);
        } else {
          logger.debug(`Tool filtering: ${duration.toFixed(2)}ms for ${toolName}`);
        }
      }

      // Log filter decisions at debug level
      if (!result) {
        logger.debug(`Tool filtered out: ${toolName} (server: ${serverName}, mode: ${this.config.mode})`);
      }

      // Track statistics
      this._checkedCount++;
      if (!result) this._filteredCount++;

      return result;
    } catch (error) {
      // Fail-safe: on error, allow tool (availability > filtering)
      logger.error(`Error in shouldIncludeTool for ${toolName}:`, error);
      return true;
    }
  }

  /**
   * Server-based filtering (allowlist or denylist)
   * @private
   * @param {string} serverName - Server name to check
   * @returns {boolean} True if server passes filter
   */
  _filterByServer(serverName) {
    const filter = this.config.serverFilter;

    // No filter configured, allow all (Sprint 1.2.2)
    if (!filter || !filter.servers) {
      return true;
    }

    const isInList = filter.servers.includes(serverName);

    // Allowlist: only include if in list (Sprint 1.2.2)
    if (filter.mode === 'allowlist') {
      return isInList;
    }

    // Denylist: include if NOT in list (Sprint 1.2.2)
    if (filter.mode === 'denylist') {
      return !isInList;
    }

    // Unknown mode, default to allow (Sprint 1.2.2)
    logger.warn(`Unknown serverFilter.mode: ${filter.mode}`);
    return true;
  }

  /**
   * Category-based filtering
   * @private
   */
  _filterByCategory(category) {
    const allowedCategories = this.config.categoryFilter?.categories || [];
    return allowedCategories.includes(category);
  }

  /**
   * Get tool's category (for category/hybrid modes)
   * Synchronous return with background LLM refinement
   * 
   * Priority: customMappings > patternMatch > LLM (async) > 'other'
   * 
   * @param {string} toolName - Tool name
   * @param {string} serverName - Server name
   * @param {object} toolDefinition - Tool definition
   * @returns {string} - Category name ('filesystem', 'web', etc.)
   */
  getToolCategory(toolName, serverName, toolDefinition = {}) {
    // Check memory cache first
    if (this.categoryCache.has(toolName)) {
      this._cacheHits++;
      return this.categoryCache.get(toolName);
    }

    this._cacheMisses++;

    // Try pattern matching (fast, synchronous)
    const category = this._categorizeBySyntax(toolName, serverName);

    if (category) {
      this.categoryCache.set(toolName, category);
      return category;
    }

    // Default to 'other', queue background LLM categorization
    const defaultCategory = 'other';
    this.categoryCache.set(toolName, defaultCategory);

    // NON-BLOCKING: Trigger LLM in background (fire-and-forget) (Sprint 0.1)
    if (this.config.llmCategorization?.enabled && this.llmClient) {
      this._queueLLMCategorization(toolName, toolDefinition)
        .then(llmCategory => {
          if (llmCategory !== defaultCategory) {
            logger.info(`LLM refined ${toolName}: '${defaultCategory}' → '${llmCategory}'`);
            this.categoryCache.set(toolName, llmCategory);
          }
        })
        .catch(err => {
          logger.warn(`LLM categorization failed for ${toolName}:`, err.message);
        });
    }

    return defaultCategory;
  }

  /**
   * Background LLM categorization (async, non-blocking) (Sprint 0.1)
   * @private
   */
  async _queueLLMCategorization(toolName, toolDefinition) {
    // Check persistent cache first
    const cached = await this._loadCachedCategory(toolName);
    if (cached) {
      this._llmCacheHits++;
      return cached;
    }

    this._llmCacheMisses++;

    // Add to rate-limited queue
    return this.llmQueue.add(async () => {
      const validCategories = [...Object.keys(this.defaultCategories), 'other'];

      const category = await this.llmClient.categorize(
        toolName,
        toolDefinition,
        validCategories
      );

      // Save to persistent cache (batched, not immediate) (Sprint 0.2)
      this._saveCachedCategory(toolName, category);

      return category;
    });
  }

  /**
   * Categorize tool using LLM (Task 3.2.1)
   * Checks cache first, calls LLM if needed
   * 
   * @private
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition object
   * @returns {Promise<string>} Category name
   */
  async _categorizeByLLM(toolName, toolDefinition) {
    // Check persistent cache
    const cached = await this._loadCachedCategory(toolName);
    if (cached) {
      logger.debug(`LLM cache hit for ${toolName}: ${cached}`);
      this._llmCacheHits++;
      return cached;
    }

    this._llmCacheMisses++;

    try {
      logger.debug(`Calling LLM to categorize: ${toolName}`);

      // Call LLM with rate limiting (via PQueue)
      const category = await this._callLLMWithRateLimit(toolName, toolDefinition);

      // Save to cache
      await this._saveCachedCategory(toolName, category);

      logger.info(`LLM categorized ${toolName} as: ${category}`);

      return category;
    } catch (error) {
      // Extract request_id if available (SDK adds it to error)
      const requestId = error.request_id || 'unknown';
      const errorType = error.constructor.name || 'Error';
      
      logger.warn(`LLM categorization failed for ${toolName}`, {
        errorType,
        requestId,
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      // Track error type
      this._llmErrorsByType.set(
        errorType,
        (this._llmErrorsByType.get(errorType) || 0) + 1
      );
      
      // Track if retry occurred (SDK adds retry info)
      if (error._retryCount) {
        this._llmRetryCount += error._retryCount;
      }

      // Fall back to 'other'
      return 'other';
    }
  }

  /**
   * Rate-limited LLM call (Task 3.2.1)
   * Uses PQueue for concurrency and rate limiting
   * 
   * @private
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition object
   * @returns {Promise<string>} Category name
   */
  async _callLLMWithRateLimit(toolName, toolDefinition) {
    return this.llmQueue.add(async () => {
      const validCategories = [...Object.keys(this.defaultCategories), 'other'];

      const category = await this.llmClient.categorize(
        toolName,
        toolDefinition,
        validCategories
      );

      return category;
    });
  }

  /**
   * Categorize tool using pattern matching
   * Checks custom mappings first, then default categories
   * @private
   * @param {string} toolName - Name of the tool
   * @param {string} serverName - Name of the server
   * @returns {string|null} Category name or null if no match
   */
  _categorizeBySyntax(toolName, serverName) {
    // Check custom mappings first (higher priority)
    for (const [pattern, category] of Object.entries(this.customMappings)) {
      if (this._matchesPattern(toolName, pattern)) {
        logger.debug(`Tool ${toolName} matched custom pattern ${pattern} → ${category}`);
        return category;
      }
    }

    // Check default categories
    for (const [category, patterns] of Object.entries(this.defaultCategories)) {
      for (const pattern of patterns) {
        if (this._matchesPattern(toolName, pattern)) {
          logger.debug(`Tool ${toolName} matched default pattern ${pattern} → ${category}`);
          return category;
        }
      }
    }

    // No match found
    return null;
  }

  /**
   * Wildcard pattern matching with regex caching (Sprint 0.4)
   * @private
   */
  _matchesPattern(toolName, pattern) {
    // Check pattern cache
    let regex = this.patternCache.get(pattern);

    if (!regex) {
      try {
        // Compile regex once, cache it
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');

        regex = new RegExp('^' + regexPattern + '$', 'i');
        this.patternCache.set(pattern, regex);
      } catch (error) {
        logger.warn(`Invalid pattern: ${pattern}`, error);
        return false;
      }
    }

    return regex.test(toolName);
  }

  /**
   * Load cached category for a tool
   * @private
   */
  async _loadCachedCategory(toolName) {
    if (this.llmCache.has(toolName)) {
      return this.llmCache.get(toolName);
    }
    return null;
  }

  /**
   * Load LLM cache from disk
   * @private
   */
  async _loadLLMCache() {
    if (!this.llmCacheFile) return;

    try {
      // Ensure directory exists
      const cacheDir = path.dirname(this.llmCacheFile);
      await fs.mkdir(cacheDir, { recursive: true });

      // Load existing cache
      const data = await fs.readFile(this.llmCacheFile, 'utf-8');
      const cacheObj = JSON.parse(data);
      
      // Load into Map
      for (const [toolName, category] of Object.entries(cacheObj)) {
        this.llmCache.set(toolName, category);
      }
      
      logger.info(`Loaded ${this.llmCache.size} cached tool categories from ${this.llmCacheFile}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No existing LLM cache found, will create on first categorization');
      } else {
        logger.warn(`Failed to load LLM cache: ${error.message}`);
      }
    }
  }

  /**
   * Batched cache persistence (Sprint 0.2)
   * Reduces disk I/O by 10-100x through threshold-based writes
   * @private
   */
  _saveCachedCategory(toolName, category) {
    this.llmCache.set(toolName, category);
    this.llmCacheDirty = true;
    this.llmCacheWritesPending++;

    // Flush if threshold reached
    if (this.llmCacheWritesPending >= this.llmCacheFlushThreshold) {
      this._flushCache().catch(err =>
        logger.warn('Failed to flush LLM cache:', err)
      );
    }
  }

  /**
   * Atomic cache flush to disk (Sprint 0.2)
   * Uses temp file + rename for crash safety
   * @private
   */
  async _flushCache() {
    if (!this.llmCacheDirty || !this.llmCacheFile) return;

    try {
      const cacheObj = Object.fromEntries(this.llmCache);
      const tempFile = `${this.llmCacheFile}.tmp`;

      // Write to temp file
      await fs.writeFile(tempFile, JSON.stringify(cacheObj, null, 2), 'utf-8');

      // Atomic rename (crash-safe)
      await fs.rename(tempFile, this.llmCacheFile);

      this.llmCacheDirty = false;
      this.llmCacheWritesPending = 0;

      logger.debug(`Flushed ${this.llmCache.size} entries to LLM cache`);
    } catch (error) {
      logger.error('Failed to flush LLM cache:', error);
      throw error;
    }
  }

  /**
   * Auto-enable filtering if tool count exceeds threshold (Sprint 0.3)
   * Race condition protection through idempotency guards
   *
   * @param {number} toolCount - Current total tool count
   * @returns {boolean} True if auto-enabled, false otherwise
   */
  autoEnableIfNeeded(toolCount) {
    // Already completed - idempotent
    if (this._autoEnableCompleted) {
      return false;
    }

    // In progress - skip concurrent calls
    if (this._autoEnableInProgress) {
      logger.debug('Auto-enable already in progress, skipping');
      return false;
    }

    // Already explicitly configured
    if (this.isExplicitlyConfigured()) {
      return false;
    }

    // Check threshold
    const threshold = this.config.autoEnableThreshold || 1000;
    if (toolCount <= threshold) {
      return false;
    }

    // Set in-progress flag (lock)
    this._autoEnableInProgress = true;

    try {
      logger.info(`Auto-enabling tool filtering: ${toolCount} tools exceeds threshold of ${threshold}`);

      // Modify configuration
      this.config.enabled = true;
      this.config.mode = 'category';
      this.config.categoryFilter = {
        categories: ['filesystem', 'web', 'search', 'development']
      };

      // Mark as completed (permanent)
      this._autoEnableCompleted = true;

      return true;
    } finally {
      // Always release lock
      this._autoEnableInProgress = false;
    }
  }

  /**
   * Check if filtering was explicitly configured by user
   * @returns {boolean}
   */
  isExplicitlyConfigured() {
    return this.config.enabled !== undefined;
  }

  /**
   * Get current filtering statistics
   * 
   * @returns {object} - Stats object with:
   *   - enabled: boolean - whether filtering is active
   *   - mode: string - filtering mode (server-allowlist/category/hybrid)
   *   - totalChecked: number - total tools evaluated
   *   - totalFiltered: number - tools filtered out
   *   - totalExposed: number - tools allowed through
   *   - filterRate: number - percentage filtered (0-1)
   *   - categoryCacheSize: number - memory cache size
   *   - cacheHitRate: number - cache hit percentage (0-1)
   *   - llmCacheSize: number - persistent LLM cache size
   *   - llmCacheHitRate: number - LLM cache hit percentage (0-1)
   *   - allowedServers: string[] - servers in allowlist
   *   - allowedCategories: string[] - categories in allowlist
   */
  getStats() {
    const totalCacheAccess = this._cacheHits + this._cacheMisses;
    const totalLLMCacheAccess = this._llmCacheHits + this._llmCacheMisses;

    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      totalChecked: this._checkedCount,
      totalFiltered: this._filteredCount,
      totalExposed: this._checkedCount - this._filteredCount,
      filterRate: this._checkedCount > 0
        ? this._filteredCount / this._checkedCount
        : 0,
      categoryCacheSize: this.categoryCache.size,
      cacheHitRate: totalCacheAccess > 0
        ? this._cacheHits / totalCacheAccess
        : 0,
      llmCacheSize: this.llmCache.size,
      llmCacheHitRate: totalLLMCacheAccess > 0
        ? this._llmCacheHits / totalLLMCacheAccess
        : 0,
      llm: {
        cacheHits: this._llmCacheHits,
        cacheMisses: this._llmCacheMisses,
        errorsByType: Object.fromEntries(this._llmErrorsByType),
        totalRetries: this._llmRetryCount
      },
      allowedServers: this.config.serverFilter?.servers || [],
      allowedCategories: this.config.categoryFilter?.categories || []
    };
  }

  /**
   * Create LLM client for categorization
   * @private
   */
  _createLLMClient() {
    const provider = this.config.llmCategorization.provider;

    // For now, return a stub - actual implementation in Phase 3
    return {
      categorize: async (toolName, toolDefinition, validCategories) => {
        // Stub implementation - will be replaced with actual LLM API calls
        logger.debug(`LLM categorization stub called for ${toolName}`);
        return 'other';
      }
    };
  }

  /**
   * Graceful shutdown - flush pending operations
   * 
   * Awaits pending LLM categorizations, flushes logs and caches.
   * Call this before process termination to prevent data loss.
   * 
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.llmCacheFlushInterval) {
      clearInterval(this.llmCacheFlushInterval);
      this.llmCacheFlushInterval = undefined;
    }

    if (this.llmCacheDirty) {
      await this._flushCache();
    }
  }
}

export default ToolFilteringService;
