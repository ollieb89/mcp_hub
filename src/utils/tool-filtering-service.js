import fs from 'fs/promises';
import path from 'path';
import PQueue from 'p-queue';
import logger from './logger.js';
import { getStateDirectory } from './xdg-paths.js';
import { createLLMProvider } from './llm-provider.js';
import { envResolver } from './env-resolver.js';

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

    // Validate LLM configuration schema early (Task 3.1.5)
    this._validateLLMConfig();

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
    
    // Task 3.4: Cache refinement configuration
    this.llmCacheTTL = this.config.llmCategorization?.cacheTTL ?? 86400; // 1 day default
    this._cacheStats = {
      llmHits: 0,
      llmMisses: 0,
      cacheMemoryUsageBytes: 0,
      cacheEntryCount: 0
    };

    // Statistics initialization (prevents NaN) (Sprint 0.5)
    this._checkedCount = 0;
    this._filteredCount = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._llmCacheHits = 0;
    this._llmCacheMisses = 0;

    // Task 3.3: Retry and Circuit Breaker Configuration
    this.llmRetryConfig = {
      maxRetries: this.config.llmCategorization?.retryCount ?? 3,
      backoffBase: this.config.llmCategorization?.backoffBase ?? 1000,
      maxBackoff: this.config.llmCategorization?.maxBackoff ?? 30000
    };

    // Task 3.3: Circuit Breaker State Machine
    this.circuitBreaker = {
      state: 'closed', // 'closed' | 'open' | 'half-open'
      consecutiveFailures: 0,
      threshold: this.config.llmCategorization?.circuitBreakerThreshold ?? 5,
      timeout: this.config.llmCategorization?.circuitBreakerTimeout ?? 30000,
      lastFailureTime: null,
      tripTime: null // When circuit was opened
    };

    // Task 3.3: Queue Monitoring Metrics
    this._llmMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      timeouts: 0,
      totalRetries: 0,
      fallbacksUsed: 0,
      callLatencies: [], // Array of response times (ms)
      circuitBreakerTrips: 0,
      lastCallTime: null,
      queueDepth: 0 // Current pending requests
    };

    // Initialize LLM client if enabled
    if (this.config.llmCategorization?.enabled) {
      this._initializationPromise = this._initializeLLM().catch(err => {
        logger.error('Failed to initialize LLM categorization:', err.message);
        throw err; // Re-throw for waitForInitialization()
      });
    } else {
      this._initializationPromise = Promise.resolve();
    }
  }

  /**
   * Wait for async initialization to complete
   * Useful for testing and ensuring LLM is ready before use
   * @returns {Promise<void>}
   */
  async waitForInitialization() {
    await this._initializationPromise;
  }

  /**
   * Initialize LLM client and cache
   * Validates configuration and API key on startup (Task 3.1.3)
   * @private
   */
  async _initializeLLM() {
    try {
      // Validate API key presence and format (Task 3.1.3)
      if (!this.config.llmCategorization.apiKey) {
        logger.warn('LLM categorization enabled but no API key provided - will use heuristics');
        return; // Graceful degradation (Task 3.1.4)
      }

      // Initialize LLM client (Task 3.1.2)
      this.llmClient = await this._createLLMClient();

      // Set up persistent cache location
      const stateDir = getStateDirectory();
      this.llmCacheFile = path.join(stateDir, 'tool-categories-llm.json');

      // Load existing cache (await to ensure it completes before initialization finishes)
      await this._loadLLMCache();

      // Periodic cache flush (30 seconds) (Sprint 0.2)
      this.llmCacheFlushInterval = setInterval(() => {
        if (this.llmCacheDirty) {
          this._flushCache().catch(err =>
            logger.warn('Failed to flush LLM cache:', err)
          );
        }
      }, 30000);

      logger.info('LLM categorization initialized successfully', {
        provider: this.config.llmCategorization.provider,
        model: this.config.llmCategorization.model || 'default',
        cacheFile: this.llmCacheFile
      });
    } catch (error) {
      logger.warn(`LLM categorization initialization failed - using heuristics: ${error.message}`);
      this.llmClient = null;
      // Don't re-throw - allow graceful degradation (Task 3.1.4)
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
        case 'prompt-based':
          // In prompt-based mode, pass through all tools
          // Filtering happens at MCP server level based on client sessions
          result = true;
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
   * @param {string} _serverName - Server name (reserved for future use)
   * @param {object} toolDefinition - Tool definition
   * @returns {string} - Category name ('filesystem', 'web', etc.)
   */
  getToolCategory(toolName, _serverName, toolDefinition = {}) {
    // Check memory cache first
    if (this.categoryCache.has(toolName)) {
      this._cacheHits++;
      return this.categoryCache.get(toolName);
    }

    this._cacheMisses++;

    // Check LLM persistent cache for previously categorized tools (Task 3.4.4)
    if (this.llmCache.has(toolName)) {
      const cacheEntry = this.llmCache.get(toolName);
      
      // Task 3.4.2: Check TTL
      const now = Math.floor(Date.now() / 1000);
      const age = now - (cacheEntry.timestamp || 0);
      const ttl = cacheEntry.ttl || this.llmCacheTTL;
      
      if (age < ttl) {
        // Cache hit - entry is still valid
        this._llmCacheHits++;
        // Handle both old format (string) and new format (object)
        const category = typeof cacheEntry === 'string' ? cacheEntry : (cacheEntry.category || 'other');
        this.categoryCache.set(toolName, category);
        return category;
      } else {
        // Cache miss - entry expired
        this._llmCacheMisses++;
        this.llmCache.delete(toolName);
      }
    } else {
      this._llmCacheMisses++;
    }

    // Try pattern matching (fast, synchronous)
    const category = this._categorizeBySyntax(toolName);

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
        .then(llmResult => {
          // llmResult now includes category, confidence, source
          const llmCategory = typeof llmResult === 'string' ? llmResult : llmResult.category;
          
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

    // Task 3.3.4: Check if circuit breaker is open (blocking API calls)
    if (this._isCircuitBreakerOpen()) {
      logger.warn(`Circuit breaker is open, falling back to heuristics for ${toolName}`);
      this._llmMetrics.fallbacksUsed++;
      const category = this._categorizeBySyntax(toolName);
      return category;
    }

    // Add to rate-limited queue with retry logic (Task 3.3.1-3.3.3)
    return this.llmQueue.add(async () => {
      this._updateQueueDepth(this.llmQueue.size);

      try {
        // Task 3.3.2: Call LLM with retry and exponential backoff
        const llmResult = await this._callLLMWithRetry(toolName, toolDefinition);
        
        // Task 3.4.3: Extract confidence and source from LLM result
        let cacheEntry;
        if (typeof llmResult === 'object' && llmResult.category) {
          // LLM returned structured result with confidence
          cacheEntry = {
            category: llmResult.category,
            confidence: llmResult.confidence || 0.95,
            source: llmResult.source || 'llm',
            timestamp: Math.floor(Date.now() / 1000),
            ttl: this.llmCacheTTL
          };
        } else {
          // Legacy string result - convert to new format
          cacheEntry = {
            category: llmResult,
            confidence: 0.95,
            source: 'llm',
            timestamp: Math.floor(Date.now() / 1000),
            ttl: this.llmCacheTTL
          };
        }

        // Save to persistent cache (batched, not immediate) (Sprint 0.2)
        this._saveCachedCategory(toolName, cacheEntry);

        this._updateQueueDepth(this.llmQueue.size);
        return cacheEntry;
      } catch (error) {
        // Final safety net (shouldn't reach here as _callLLMWithRetry returns fallback)
        logger.error(`Unexpected error in LLM queue task for ${toolName}:`, error);
        this._llmMetrics.fallbacksUsed++;
        this._updateQueueDepth(this.llmQueue.size);
        const category = this._categorizeBySyntax(toolName);
        return {
          category,
          confidence: 0.60,
          source: 'heuristic',
          timestamp: Math.floor(Date.now() / 1000),
          ttl: this.llmCacheTTL
        };
      }
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
      // Handle both old string format and new object format
      const category = typeof cached === 'string' ? cached : cached.category;
      logger.debug(`LLM cache hit for ${toolName}: ${category}`);
      this._llmCacheHits++;
      return category;
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
      logger.warn(`LLM categorization failed for ${toolName}: ${error.message}`);

      // Fall back to 'other'
      return 'other';
    }
  }

  /**
   * Rate-limited LLM call with timeout (Task 3.5.1)
   * Uses PQueue for concurrency and rate limiting
   * Enforces 5-second timeout per API call
   * 
   * @private
   * @param {string} toolName - Name of the tool
   * @param {object} toolDefinition - Tool definition object
   * @returns {Promise<string>} Category name or throws TimeoutError on timeout
   * @throws {Error} Timeout error if API call exceeds 5 seconds
   */
  async _callLLMWithRateLimit(toolName, toolDefinition) {
    const validCategories = [...Object.keys(this.defaultCategories), 'other'];
    
    // Task 3.5.1: Enforce 5-second timeout on API call
    const LLM_CALL_TIMEOUT = 5000; // 5 seconds
    
    try {
      const category = await Promise.race([
        this.llmClient.categorize(
          toolName,
          toolDefinition,
          validCategories
        ),
        new Promise((_, reject) => 
          setTimeout(() => {
            const error = new Error('LLM API call timeout');
            error.code = 'TIMEOUT';
            reject(error);
          }, LLM_CALL_TIMEOUT)
        )
      ]);

      return category;
    } catch (error) {
      // Log timeout separately for monitoring (Task 3.5.1)
      if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
        this._llmMetrics.timeouts++;
        logger.warn(`LLM API timeout after ${LLM_CALL_TIMEOUT}ms for ${toolName}`, {
          timeout: LLM_CALL_TIMEOUT,
          tool: toolName
        });
      }
      throw error;
    }
  }

  /**
   * Categorize tool using pattern matching
   * Checks custom mappings first, then default categories
   * @private
   * @param {string} toolName - Name of the tool
   * @returns {string|null} Category name or null if no match
   */
  _categorizeBySyntax(toolName) {
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
    if (!this.llmCache.has(toolName)) {
      return null;
    }
    
    const cacheEntry = this.llmCache.get(toolName);
    
    // Handle both old string format and new object format
    if (typeof cacheEntry === 'string') {
      // Legacy format - return as-is (no TTL for old format)
      return cacheEntry;
    }
    
    // Task 3.4.2: Check TTL validity for new format
    const now = Math.floor(Date.now() / 1000);
    const age = now - (cacheEntry.timestamp || 0);
    const ttl = cacheEntry.ttl || this.llmCacheTTL;
    
    if (age >= ttl) {
      // Entry expired, remove from cache
      this.llmCache.delete(toolName);
      return null;
    }
    
    // Return the cache entry (new format with confidence and metadata)
    return cacheEntry;
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
      
      const now = Math.floor(Date.now() / 1000);
      let loadedCount = 0;
      let expiredCount = 0;

      // Load into Map with TTL enforcement (Task 3.4.2)
      for (const [toolName, cacheEntry] of Object.entries(cacheObj)) {
        // Handle both old format (string) and new format (object)
        if (typeof cacheEntry === 'string') {
          // Backward compatibility: migrate old format
          this.llmCache.set(toolName, {
            category: cacheEntry,
            confidence: 0.85, // Default confidence for migrated entries
            source: 'heuristic',
            timestamp: now,
            ttl: this.llmCacheTTL
          });
          loadedCount++;
        } else if (typeof cacheEntry === 'object' && cacheEntry.category) {
          // New format: check TTL (Task 3.4.2)
          const entryTime = cacheEntry.timestamp || now;
          const entryTTL = cacheEntry.ttl || this.llmCacheTTL;
          const age = now - entryTime;

          if (age < entryTTL) {
            this.llmCache.set(toolName, cacheEntry);
            loadedCount++;
          } else {
            // Entry expired, skip it
            expiredCount++;
          }
        }
      }
      
      this._updateCacheMemoryUsage();
      logger.info(`Loaded ${loadedCount} cached tool categories (${expiredCount} expired) from ${this.llmCacheFile}`);
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
  _saveCachedCategory(toolName, categoryData) {
    // Task 3.4.1: Accept enhanced cache entry structure
    // Can be called with either:
    // - { category, confidence, source, timestamp?, ttl? }
    // - Just a category string (for backward compatibility)
    
    let entry;
    if (typeof categoryData === 'string') {
      // Legacy format - wrap in new structure
      entry = {
        category: categoryData,
        confidence: 0.85,
        source: 'heuristic',
        timestamp: Math.floor(Date.now() / 1000),
        ttl: this.llmCacheTTL
      };
    } else {
      // New format - ensure required fields
      entry = {
        category: categoryData.category,
        confidence: categoryData.confidence ?? 0.85,
        source: categoryData.source ?? 'heuristic',
        timestamp: categoryData.timestamp ?? Math.floor(Date.now() / 1000),
        ttl: categoryData.ttl ?? this.llmCacheTTL
      };
    }
    
    this.llmCache.set(toolName, entry);
    this.llmCacheDirty = true;
    this.llmCacheWritesPending++;
    this._updateCacheMemoryUsage();

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
      // Task 3.4: Prepare cache object with enhanced structure
      const cacheObj = {};
      const now = Math.floor(Date.now() / 1000);
      
      for (const [toolName, entry] of this.llmCache.entries()) {
        // Skip expired entries (Task 3.4.2)
        const age = now - (entry.timestamp || 0);
        const ttl = entry.ttl || this.llmCacheTTL;
        
        if (age < ttl) {
          // Keep valid entries
          cacheObj[toolName] = entry;
        }
      }
      
      const tempFile = `${this.llmCacheFile}.tmp`;

      // Ensure parent directory exists
      const dir = path.dirname(this.llmCacheFile);
      await fs.mkdir(dir, { recursive: true });

      // Write to temp file
      await fs.writeFile(tempFile, JSON.stringify(cacheObj, null, 2), 'utf-8');

      // Atomic rename (crash-safe) - with defensive error handling for race conditions
      try {
        await fs.rename(tempFile, this.llmCacheFile);
      } catch (renameError) {
        // If rename fails, try to clean up temp file
        try {
          await fs.unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
        throw renameError;
      }

      this.llmCacheDirty = false;
      this.llmCacheWritesPending = 0;

      logger.debug(`Flushed ${Object.keys(cacheObj).length} entries to LLM cache`);
    } catch (error) {
      logger.error('Failed to flush LLM cache:', error);
      // Don't throw - allow tests to continue
      this.llmCacheDirty = false;
      this.llmCacheWritesPending = 0;
    }
  }

  /**
   * Clear LLM cache and reset dirty flag (for testing and cleanup)
   * @public
   */
  clearLLMCache() {
    this.llmCache.clear();
    this.llmCacheDirty = false;
    this.llmCacheWritesPending = 0;
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
  /**
   * Task 3.3.3: Calculate exponential backoff delay with jitter
   * Formula: min(base * (2^retryCount), maxDelay)
   * @private
   * @param {number} retryCount - Current retry attempt (0-based)
   * @returns {number} Delay in milliseconds
   */
  _calculateBackoffDelay(retryCount) {
    const { backoffBase, maxBackoff } = this.llmRetryConfig;
    const delay = Math.min(
      backoffBase * Math.pow(2, retryCount),
      maxBackoff
    );
    // Add small jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() - 0.5);
    return Math.max(1, Math.floor(delay + jitter));
  }

  /**
   * Task 3.3.2: Call LLM with retry logic and exponential backoff
   * Retries on transient errors (timeout, network, 429, 503)
   * Does NOT retry on permanent errors (auth, validation)
   * @private
   * @param {string} toolName - Tool to categorize
   * @param {object} toolDefinition - Tool definition
   * @returns {Promise<string>} Category name
   */
  async _callLLMWithRetry(toolName, toolDefinition) {
    let lastError;

    for (let attempt = 0; attempt <= this.llmRetryConfig.maxRetries; attempt++) {
      try {
        this._llmMetrics.totalCalls++;
        const startTime = performance.now();

        // Call LLM through rate-limited queue
        const category = await this._callLLMWithRateLimit(toolName, toolDefinition);

        // Record success metrics
        const latency = performance.now() - startTime;
        this._recordLLMLatency(latency);
        this._llmMetrics.successfulCalls++;
        this._resetCircuitBreaker();

        logger.debug(`LLM categorized ${toolName} as ${category} (attempt ${attempt + 1}, ${latency.toFixed(0)}ms)`);
        return category;
      } catch (error) {
        lastError = error;
        this._llmMetrics.failedCalls++;
        this._recordLLMFailure();

        // Determine if error is transient (retryable)
        const isTransient = this._isTransientError(error);
        const isLastAttempt = attempt >= this.llmRetryConfig.maxRetries;

        if (!isTransient || isLastAttempt) {
          // Permanent error or max retries exceeded
          logger.warn(`LLM categorization failed for ${toolName}: ${error.message} (permanent)`, {
            attempt: attempt + 1,
            maxRetries: this.llmRetryConfig.maxRetries,
            error: error.constructor.name
          });
          break;
        }

        // Transient error - wait and retry
        const delay = this._calculateBackoffDelay(attempt);
        this._llmMetrics.totalRetries++;
        logger.debug(`Retrying LLM categorization for ${toolName} after ${delay}ms (attempt ${attempt + 1})`, {
          error: error.message,
          nextAttempt: attempt + 2
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted - fall back to heuristics
    logger.warn(`LLM categorization exhausted retries for ${toolName}, using heuristics`, {
      lastError: lastError?.message,
      attempts: this.llmRetryConfig.maxRetries + 1
    });
    this._llmMetrics.fallbacksUsed++;
    return this._categorizeBySyntax(toolName);
  }

  /**
   * Task 3.3.2: Determine if an error is transient (retryable)
   * Transient: timeout, network errors, 429/503 status
   * Permanent: auth, validation, 400/401/403 status
   * @private
   * @param {Error} error - Error to classify
   * @returns {boolean} true if transient, false if permanent
   */
  _isTransientError(error) {
    const message = error.message || '';
    const name = error.constructor.name || '';

    // Timeout errors (transient)
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      this._llmMetrics.timeouts++;
      return true;
    }

    // Network errors (transient)
    if (name.includes('NetworkError') || 
        message.includes('ECONNREFUSED') || 
        message.includes('ENOTFOUND') ||
        message.includes('socket hang up')) {
      return true;
    }

    // HTTP status codes
    const status = error.status;
    if (status) {
      // Rate limit and service unavailable (transient)
      if (status === 429 || status === 503) {
        return true;
      }
      // Auth, validation, not found (permanent)
      if (status === 401 || status === 403 || status === 400 || status === 404) {
        return false;
      }
    }

    // Unknown errors - assume transient and retry once
    return true;
  }

  /**
   * Task 3.3.4: Check if circuit breaker is open (blocking API calls)
   * States: closed (allow) → open (block) → half-open (try once)
   * @private
   * @returns {boolean} true if breaker is open, false if closed/half-open
   */
  _isCircuitBreakerOpen() {
    const { state, timeout, tripTime } = this.circuitBreaker;

    if (state === 'closed') {
      return false; // Normal operation
    }

    if (state === 'open') {
      // Check if timeout expired to transition to half-open
      const timeSinceTripMs = Date.now() - tripTime;
      if (timeSinceTripMs >= timeout) {
        this.circuitBreaker.state = 'half-open';
        logger.info(`Circuit breaker transitioned to half-open (timeout: ${timeout}ms)`);
        return false; // Allow one attempt in half-open state
      }
      return true; // Still open, block
    }

    // Half-open: allow attempt
    return false;
  }

  /**
   * Task 3.3.4: Record LLM failure and update circuit breaker state
   * Tracks consecutive failures, opens breaker after threshold
   * @private
   */
  _recordLLMFailure() {
    const { threshold } = this.circuitBreaker;

    this.circuitBreaker.consecutiveFailures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.consecutiveFailures >= threshold &&
        this.circuitBreaker.state !== 'open') {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.tripTime = Date.now();
      this._llmMetrics.circuitBreakerTrips++;
      logger.warn(`Circuit breaker opened after ${threshold} consecutive failures`, {
        timeout: this.circuitBreaker.timeout,
        nextHalfOpenAttempt: new Date(this.circuitBreaker.tripTime + this.circuitBreaker.timeout)
      });
    }
  }

  /**
   * Task 3.3.4: Reset circuit breaker on successful LLM call
   * @private
   */
  _resetCircuitBreaker() {
    if (this.circuitBreaker.state !== 'closed') {
      const wasState = this.circuitBreaker.state;
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.consecutiveFailures = 0;
      logger.info(`Circuit breaker reset from ${wasState} to closed`);
    }
  }

  /**
   * Task 3.3.5: Record LLM API call latency
   * Tracks latencies for percentile calculation (p95, p99)
   * Keeps last 1000 measurements for memory efficiency
   * @private
   * @param {number} latencyMs - Response time in milliseconds
   */
  _recordLLMLatency(latencyMs) {
    this._llmMetrics.callLatencies.push(latencyMs);
    this._llmMetrics.lastCallTime = Date.now();

    // Keep only last 1000 measurements for memory efficiency
    if (this._llmMetrics.callLatencies.length > 1000) {
      this._llmMetrics.callLatencies.shift();
    }
  }

  /**
   * Task 3.3.5: Calculate latency percentiles from recorded metrics
   * @private
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Latency in milliseconds, or 0 if no data
   */
  _calculateLatencyPercentile(percentile) {
    const latencies = this._llmMetrics.callLatencies;
    if (latencies.length === 0) return 0;

    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Task 3.3.5: Update queue depth metric
   * Called when adding/removing items from queue
   * @private
   * @param {number} depth - Current queue depth
   */
  // Task 3.4.5: Monitor cache memory usage
  _updateCacheMemoryUsage() {
    let memoryBytes = 0;
    
    for (const [toolName, entry] of this.llmCache.entries()) {
      // Estimate memory: tool name + entry object
      memoryBytes += toolName.length * 2; // UTF-16 encoding estimate
      
      if (typeof entry === 'object') {
        // Enhanced structure
        memoryBytes += (entry.category?.length || 0) * 2;
        memoryBytes += 8; // confidence (float)
        memoryBytes += (entry.source?.length || 0) * 2;
        memoryBytes += 8; // timestamp (number)
        memoryBytes += 8; // ttl (number)
        memoryBytes += 100; // Overhead for object structure
      } else {
        // Legacy string entry
        memoryBytes += (entry?.length || 0) * 2;
      }
    }
    
    this._cacheStats.cacheMemoryUsageBytes = memoryBytes;
    this._cacheStats.cacheEntryCount = this.llmCache.size;
  }

  // Task 3.4.6: Prewarm cache with known tools
  async _prewarmCache(knownTools = []) {
    if (!knownTools || knownTools.length === 0) {
      return;
    }

    const categoriesToPreload = [];
    
    for (const toolName of knownTools) {
      if (!this.llmCache.has(toolName) && !this.categoryCache.has(toolName)) {
        const category = this._categorizeBySyntax(toolName);
        if (category) {
          categoriesToPreload.push({ toolName, category });
          this.categoryCache.set(toolName, category);
        }
      }
    }

    // Save prewarmed categories to cache
    for (const { toolName, category } of categoriesToPreload) {
      this._saveCachedCategory(toolName, {
        category,
        confidence: 0.80, // Heuristic confidence
        source: 'heuristic',
        timestamp: Math.floor(Date.now() / 1000),
        ttl: this.llmCacheTTL
      });
    }

    if (categoriesToPreload.length > 0) {
      await this._flushCache();
      logger.info(`Cache prewarming: loaded ${categoriesToPreload.length} known tools`);
    }
  }

  // Task 3.4: Helper to get cache entry details (for debugging/monitoring)
  _getCacheEntry(toolName) {
    const entry = this.llmCache.get(toolName);
    if (!entry) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const age = now - (entry.timestamp || 0);
    const ttl = entry.ttl || this.llmCacheTTL;
    const isExpired = age >= ttl;
    
    return {
      ...entry,
      age,
      isExpired,
      remainingTTL: Math.max(0, ttl - age)
    };
  }

  _updateQueueDepth(depth) {
    this._llmMetrics.queueDepth = depth;
  }

  getStats() {
    const totalCacheAccess = this._cacheHits + this._cacheMisses;
    const totalLLMCacheAccess = this._llmCacheHits + this._llmCacheMisses;

    // Task 3.3: Calculate LLM metrics
    const avgLatency = this._llmMetrics.callLatencies.length > 0
      ? this._llmMetrics.callLatencies.reduce((a, b) => a + b, 0) / this._llmMetrics.callLatencies.length
      : 0;

    const llmStats = {
      enabled: this.config.llmCategorization?.enabled || false,
      queueDepth: this._llmMetrics.queueDepth,
      totalCalls: this._llmMetrics.totalCalls,
      successfulCalls: this._llmMetrics.successfulCalls,
      failedCalls: this._llmMetrics.failedCalls,
      averageLatency: Math.round(avgLatency),
      p95Latency: Math.round(this._calculateLatencyPercentile(95)),
      p99Latency: Math.round(this._calculateLatencyPercentile(99)),
      timeouts: this._llmMetrics.timeouts,
      totalRetries: this._llmMetrics.totalRetries,
      fallbacksUsed: this._llmMetrics.fallbacksUsed,
      circuitBreakerTrips: this._llmMetrics.circuitBreakerTrips,
      circuitBreakerState: this.circuitBreaker.state,
      circuitBreakerFailures: this.circuitBreaker.consecutiveFailures,
      successRate: this._llmMetrics.totalCalls > 0
        ? (this._llmMetrics.successfulCalls / this._llmMetrics.totalCalls).toFixed(3)
        : 0
    };

    // Task 3.4: Enhanced cache statistics
    const cacheStats = {
      size: this.llmCache.size,
      hitRate: totalLLMCacheAccess > 0
        ? (this._llmCacheHits / totalLLMCacheAccess).toFixed(4)
        : 0,
      hits: this._llmCacheHits,
      misses: this._llmCacheMisses,
      memoryUsageBytes: this._cacheStats.cacheMemoryUsageBytes,
      memoryUsageMB: (this._cacheStats.cacheMemoryUsageBytes / (1024 * 1024)).toFixed(2),
      ttlSeconds: this.llmCacheTTL,
      entryCount: this._cacheStats.cacheEntryCount
    };

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
      llmCache: cacheStats,
      llm: llmStats,
      allowedServers: this.config.serverFilter?.servers || [],
      allowedCategories: this.config.categoryFilter?.categories || []
    };
  }

  /**
   * Create LLM client for categorization (Phase 3)
   * Uses official OpenAI/Anthropic SDKs with retry logic and typed errors
   * @private
   * @returns {LLMProvider} Configured LLM provider instance
   */
  async _createLLMClient() {
    const config = this.config.llmCategorization;
    
    // Validate configuration
    if (!config.provider) {
      throw new Error('LLM provider not specified');
    }
    
    if (!config.apiKey) {
      throw new Error(`API key required for ${config.provider} provider`);
    }
    
    // Resolve environment variables in the configuration (Task 3.1.1)
    const resolvedConfig = await envResolver.resolveConfig(config, ['apiKey', 'baseURL', 'model']);

    // Validate API key format for each provider (Task 3.1.3)
    this._validateAPIKey(resolvedConfig);
    
    // Create provider using factory (supports OpenAI, Anthropic, and Gemini) (Task 3.1.2)
    try {
      const provider = createLLMProvider({
        provider: resolvedConfig.provider,
        apiKey: resolvedConfig.apiKey,
        model: resolvedConfig.model,
        baseURL: resolvedConfig.baseURL,
        anthropicVersion: resolvedConfig.anthropicVersion
      });
      
      logger.info(`LLM provider created successfully`, {
        provider: resolvedConfig.provider,
        model: resolvedConfig.model || 'default',
        hasBaseURL: !!resolvedConfig.baseURL
      });
      
      return provider;
    } catch (error) {
      logger.error(`Failed to create LLM provider: ${error.message}`, {
        provider: resolvedConfig.provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate API key format for the specified provider (Task 3.1.3)
   * @private
   * @param {object} config - Resolved LLM configuration
   */
  _validateAPIKey(config) {
    const { provider, apiKey } = config;
    
    if (!apiKey) {
      throw new Error(`API key is empty for ${provider} provider`);
    }

    // Provider-specific validation
    switch (provider.toLowerCase()) {
      case 'openai':
        // OpenAI keys should start with 'sk-'
        if (!apiKey.startsWith('sk-')) {
          logger.warn('OpenAI API key does not start with "sk-" - may be invalid');
        }
        if (apiKey.length < 20) {
          logger.warn('OpenAI API key appears to be too short');
        }
        break;

      case 'anthropic':
        // Anthropic keys should start with 'sk-ant-'
        if (!apiKey.startsWith('sk-ant-')) {
          logger.warn('Anthropic API key does not start with "sk-ant-" - may be invalid');
        }
        if (apiKey.length < 20) {
          logger.warn('Anthropic API key appears to be too short');
        }
        break;

      case 'gemini':
        // Gemini API keys are typically alphanumeric, no specific format requirement
        if (apiKey.length < 20) {
          logger.warn('Gemini API key appears to be too short');
        }
        break;

      default:
        logger.warn(`Unknown LLM provider: ${provider}`);
    }
  }

  /**
   * Validate LLM categorization configuration against schema (Task 3.1.5)
   * @private
   */
  _validateLLMConfig() {
    const config = this.config.llmCategorization;

    if (!config) {
      return; // No LLM config - fine for static/server-allowlist modes
    }

    // Validate required fields
    if (typeof config.enabled !== 'boolean') {
      throw new Error('llmCategorization.enabled must be a boolean');
    }

    if (config.enabled) {
      // Provider is required when enabled
      if (!config.provider) {
        throw new Error('llmCategorization.provider is required when enabled=true');
      }

      // Validate provider enum
      const validProviders = ['openai', 'anthropic', 'gemini'];
      if (!validProviders.includes(config.provider.toLowerCase())) {
        throw new Error(
          `llmCategorization.provider must be one of: ${validProviders.join(', ')}, got: ${config.provider}`
        );
      }
    }

    // Validate optional fields
    if (config.temperature !== undefined) {
      const temp = Number(config.temperature);
      if (Number.isNaN(temp) || temp < 0 || temp > 2) {
        throw new Error('llmCategorization.temperature must be a number between 0 and 2');
      }
    }

    if (config.maxRetries !== undefined) {
      const retries = Number(config.maxRetries);
      if (!Number.isInteger(retries) || retries < 0 || retries > 10) {
        throw new Error('llmCategorization.maxRetries must be an integer between 0 and 10');
      }
    }

    if (config.model !== undefined && typeof config.model !== 'string') {
      throw new Error('llmCategorization.model must be a string');
    }

    logger.debug('LLM configuration validated successfully');
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
