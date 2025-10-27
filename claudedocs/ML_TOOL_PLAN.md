# Intelligent Tool Filtering Implementation Plan

**Date**: 2025-10-27
**Status**: Design Complete - Ready for Implementation
**Estimated Effort**: 18-26 hours (2.5-3.5 days)

---

## Executive Summary

This document provides a comprehensive implementation plan for reducing MCP Hub's tool exposure from 3469 to 50-200 tools through intelligent filtering. The original approach (LLM-based intent analysis) was revised based on MCP protocol constraints to use config-based filtering with optional LLM enhancement.

**Key Finding**: The MCP specification does NOT support passing user context to `tools/list`, requiring a fundamentally different approach than originally proposed.

---

## Problem Statement

### Current Situation
- MCP Hub exposes ALL 3469 tools from ALL 25 connected servers to clients
- Clients like Cursor receive overwhelming tool lists
- LLM context pollution leads to poor tool discovery
- Increased latency and API costs

### User Expectation vs. Reality
- **User Expected**: "Language processing to choose relevant tools"
- **Current Behavior**: Expose all tools with namespace prefixing
- **MCP Constraint**: `tools/list` method only accepts pagination cursor, no context parameter

---

## MCP Protocol Analysis

### Protocol Flow
```
1. Client connects → initialize(clientCapabilities)
2. Client calls tools/list → Server returns ALL tools
3. User makes request in client
4. Client's LLM decides which tools to call
5. Client calls tools/call with selected tool
```

### Key Constraint
**tools/list Request Schema:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "cursor": "optional-cursor-value"  // ONLY parameter supported
  }
}
```

**Implication**: Cannot pass user intent, context, or preferences to `tools/list`. Filtering must be predetermined, not dynamic.

---

## Revised Solution Architecture

### Three-Phase Approach

#### Phase 1: Server-Based Filtering (Day 1 - Quick Win)
**Approach**: Filter tools by server name using allowlist/denylist

**Benefits:**
- ✅ Simple implementation (6 hours)
- ✅ No external dependencies
- ✅ Immediate user relief
- ✅ MCP compliant

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",  // or "denylist"
      "servers": ["filesystem", "web", "github", "brave-search"]
    }
  }
}
```

**Expected Outcome**: 3469 tools → ~100-200 tools (depending on servers selected)

---

#### Phase 2: Category-Based Filtering (Day 2 - Better UX)
**Approach**: Categorize tools by domain using pattern matching, filter by category

**Benefits:**
- ✅ More flexible than server filtering
- ✅ Works across servers (e.g., all "search" tools)
- ✅ Sensible defaults provided
- ✅ User can customize categories

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "database"],
      "customMappings": {
        "brave__*": "search",
        "tavily__*": "search",
        "github__*": "version-control"
      }
    }
  }
}
```

**Default Category Mappings:**
```javascript
const DEFAULT_CATEGORIES = {
  filesystem: ['filesystem__*', 'files__*', '*__read', '*__write', '*__list'],
  web: ['fetch__*', 'http__*', 'browser__*', 'playwright__*'],
  search: ['brave__*', 'tavily__*', '*__search', 'google__*'],
  database: ['postgres__*', 'mysql__*', 'mongo__*', '*__query', 'sqlite__*'],
  'version-control': ['github__*', 'gitlab__*', 'git__*'],
  docker: ['docker__*', 'container__*', 'kubernetes__*'],
  cloud: ['aws__*', 'gcp__*', 'azure__*'],
  development: ['npm__*', 'pip__*', 'cargo__*', 'compiler__*'],
  communication: ['slack__*', 'email__*', 'discord__*']
};
```

**Expected Outcome**: 3469 tools → ~50-150 tools (depending on categories selected)

---

#### Phase 3: LLM-Enhanced Categorization (Day 3 - Optional)
**Approach**: Use LLM to categorize ambiguous tools that don't match patterns

**Benefits:**
- ✅ Improves categorization accuracy
- ✅ Handles edge cases automatically
- ✅ Self-improving with caching

**Cons:**
- ❌ Requires LLM API key
- ❌ Adds complexity
- ❌ Initial categorization overhead

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "gpt-4o-mini",
      "cacheDir": "${workspaceFolder}/.mcp-hub/categories"
    }
  }
}
```

**LLM Prompt:**
```
Categorize this MCP tool into ONE of these categories:
filesystem, web, search, database, version-control, docker, cloud, development, communication, other

Tool Name: {toolName}
Description: {description}
Input Schema: {inputSchema}

Respond with ONLY the category name, nothing else.
```

**Expected Outcome**: Improved accuracy for ~10-20% of tools that don't match patterns

---

## Detailed Component Design

### 1. ToolFilteringService Class

**File**: `src/utils/tool-filtering-service.js`

**⚠️ ARCHITECTURE UPDATE (2025-10-27)**: This design has been revised based on critical architecture review. Key changes:
- **Non-blocking LLM**: `shouldIncludeTool()` and `getToolCategory()` remain synchronous
- **Background categorization**: LLM runs in rate-limited queue, doesn't block filtering
- **Batched cache writes**: Threshold-based + interval-based persistence (10x-100x performance)
- **Race condition protection**: Idempotency guards for auto-enable
- **Pattern regex caching**: Compiled regexes cached for performance
- **API key validation**: Validates API keys at initialization

**Architecture:**
```javascript
import PQueue from 'p-queue';

class ToolFilteringService {
  constructor(config, mcpHub) {
    this.config = config.toolFiltering || {};
    this.mcpHub = mcpHub;
    this.categoryCache = new Map(); // toolName -> category (memory cache)
    this.llmCache = new Map();      // toolName -> category (persistent cache)
    this.llmClient = null;

    // Pattern regex cache for performance
    this.patternCache = new Map();

    this.defaultCategories = DEFAULT_CATEGORIES;
    this.customMappings = this.config.categoryFilter?.customMappings || {};

    // Background LLM queue with rate limiting
    this.llmQueue = new PQueue({
      concurrency: 5,        // Max 5 concurrent LLM calls
      interval: 100,         // Time window in ms
      intervalCap: 1         // Max calls per interval
    });

    // State tracking for race condition protection
    this._autoEnableInProgress = false;
    this._autoEnableCompleted = false;

    // Cache flush state for batched writes
    this.llmCacheDirty = false;
    this.llmCacheWritesPending = 0;
    this.llmCacheFlushThreshold = 10;

    // Statistics initialization (prevents NaN)
    this._checkedCount = 0;
    this._filteredCount = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._llmCacheHits = 0;
    this._llmCacheMisses = 0;

    // Initialize LLM client if enabled
    if (this.config.llmCategorization?.enabled) {
      this.llmClient = this._createLLMClient();

      // Periodic cache flush (30 seconds)
      this.llmCacheFlushInterval = setInterval(() => {
        if (this.llmCacheDirty) {
          this._flushCache().catch(err =>
            logger.warn('Failed to flush LLM cache:', err)
          );
        }
      }, 30000);
    }
  }

  /**
   * Main filtering decision method
   * @returns {boolean} True if tool should be included
   */
  shouldIncludeTool(toolName, serverName, toolDefinition) {
    if (!this.config.enabled) return true;

    switch(this.config.mode) {
      case 'server-allowlist':
        return this._filterByServer(serverName);
      case 'category':
        return this._filterByCategory(toolName, serverName, toolDefinition);
      case 'hybrid':
        return this._filterByServer(serverName) ||
               this._filterByCategory(toolName, serverName, toolDefinition);
      default:
        return true;
    }
  }

  /**
   * Server-based filtering (Phase 1)
   */
  _filterByServer(serverName) {
    const filter = this.config.serverFilter;
    if (!filter) return true;

    if (filter.mode === 'allowlist') {
      return filter.servers.includes(serverName);
    } else {
      return !filter.servers.includes(serverName);
    }
  }

  /**
   * Category-based filtering (Phase 2)
   */
  _filterByCategory(toolName, serverName, toolDefinition) {
    const category = this.getToolCategory(toolName, serverName, toolDefinition);
    const allowedCategories = this.config.categoryFilter?.categories || [];
    return allowedCategories.includes(category);
  }

  /**
   * Get tool category using pattern matching or LLM
   * ⚠️ SYNCHRONOUS - Returns immediately (non-blocking)
   * LLM categorization runs in background if needed
   */
  getToolCategory(toolName, serverName, toolDefinition) {
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

    // NON-BLOCKING: Trigger LLM in background (fire-and-forget)
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
   * Background LLM categorization (async, non-blocking)
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

      // Save to persistent cache (batched, not immediate)
      this._saveCachedCategory(toolName, category);

      return category;
    });
  }

  /**
   * Pattern matching categorization
   */
  _categorizeBySyntax(toolName, serverName) {
    // Check custom mappings first
    for (const [pattern, category] of Object.entries(this.customMappings)) {
      if (this._matchesPattern(toolName, pattern)) {
        return category;
      }
    }

    // Check default categories
    for (const [category, patterns] of Object.entries(this.defaultCategories)) {
      for (const pattern of patterns) {
        if (this._matchesPattern(toolName, pattern)) {
          return category;
        }
      }
    }

    return null;
  }

  /**
   * Wildcard pattern matching with regex caching
   * ⚠️ PERFORMANCE: Caches compiled regexes to avoid repeated compilation
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
   * Batched cache persistence
   * ⚠️ PERFORMANCE: Batches writes to reduce disk I/O by 10-100x
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
   * Atomic cache flush to disk
   * Uses temp file + rename for crash safety
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
   * Auto-enable filtering if tool count exceeds threshold
   * ⚠️ RACE CONDITION PROTECTION: Idempotency guards prevent duplicate enabling
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
   */
  isExplicitlyConfigured() {
    return this.config.enabled !== undefined;
  }

  /**
   * Get statistics about filtering
   * ⚠️ SAFE MATH: Prevents NaN by checking denominators before division
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
      allowedServers: this.config.serverFilter?.servers || [],
      allowedCategories: this.config.categoryFilter?.categories || []
    };
  }

  /**
   * Graceful shutdown - flush pending writes
   */
  async shutdown() {
    if (this.llmCacheFlushInterval) {
      clearInterval(this.llmCacheFlushInterval);
    }

    if (this.llmCacheDirty) {
      await this._flushCache();
    }
  }
}
```

---

### 2. Integration with MCPServerEndpoint

**File**: `src/mcp/server.js`

**Changes Required:**

#### Constructor Modification:
```javascript
constructor(mcpHub) {
  this.mcpHub = mcpHub;
  this.clients = new Map();
  this.serversMap = new Map();

  // NEW: Initialize tool filtering service
  this.toolFilteringService = new ToolFilteringService(
    mcpHub.config,
    mcpHub
  );

  // Store registered capabilities by type
  this.registeredCapabilities = {};
  // ... rest of constructor
}
```

#### Register Server Capabilities Modification:
```javascript
registerServerCapabilities(connection, { capabilityId, serverId }) {
  const serverName = connection.name;

  // Skip self-reference
  if (this.isSelfReference(connection)) {
    return;
  }

  const capType = Object.values(CAPABILITY_TYPES).find(cap => cap.id === capabilityId);
  const capabilities = connection[capabilityId];
  if (!capabilities || !Array.isArray(capabilities)) {
    return;
  }

  const capabilityMap = this.registeredCapabilities[capabilityId];

  // Register each capability with namespaced name
  for (const cap of capabilities) {
    const originalValue = cap[capType.uidField];
    const uniqueName = serverId + DELIMITER + originalValue;

    // NEW: Apply filtering for tools
    if (capabilityId === 'tools') {
      const shouldInclude = this.toolFilteringService.shouldIncludeTool(
        originalValue,
        serverName,
        cap
      );

      if (!shouldInclude) {
        logger.debug(`Tool filtered out: ${uniqueName} (server: ${serverName})`);
        continue; // Skip this tool
      }
    }

    // Create capability with namespaced unique identifier
    const formattedCap = {
      ...cap,
      [capType.uidField]: uniqueName
    };

    // Store capability with metadata
    capabilityMap.set(uniqueName, {
      serverName,
      originalName: originalValue,
      definition: formattedCap,
    });
  }
}
```

#### Sync Capabilities Modification:
```javascript
syncCapabilities(capabilityIds = null, affectedServers = null) {
  // ... existing sync logic

  // NEW: Auto-enable filtering if needed
  if (capabilityIds === null || capabilityIds.includes('tools')) {
    const toolCount = this.registeredCapabilities['tools'].size;
    this.toolFilteringService.autoEnableIfNeeded(toolCount);
  }

  // ... rest of method
}
```

---

### 3. Configuration Schema

**File**: `src/utils/config.js`

**Add validation for new config section:**

```javascript
function validateToolFilteringConfig(config) {
  const filtering = config.toolFiltering;
  if (!filtering) return;

  // Validate mode
  const validModes = ['server-allowlist', 'category', 'hybrid'];
  if (filtering.mode && !validModes.includes(filtering.mode)) {
    throw new ConfigError(
      'INVALID_CONFIG',
      `Invalid toolFiltering.mode: ${filtering.mode}. Must be one of: ${validModes.join(', ')}`
    );
  }

  // Validate serverFilter
  if (filtering.serverFilter) {
    const validFilterModes = ['allowlist', 'denylist'];
    if (!validFilterModes.includes(filtering.serverFilter.mode)) {
      throw new ConfigError(
        'INVALID_CONFIG',
        `Invalid serverFilter.mode: ${filtering.serverFilter.mode}`
      );
    }

    if (!Array.isArray(filtering.serverFilter.servers)) {
      throw new ConfigError(
        'INVALID_CONFIG',
        'serverFilter.servers must be an array'
      );
    }
  }

  // Validate categoryFilter
  if (filtering.categoryFilter) {
    if (!Array.isArray(filtering.categoryFilter.categories)) {
      throw new ConfigError(
        'INVALID_CONFIG',
        'categoryFilter.categories must be an array'
      );
    }
  }

  // Validate LLM categorization
  if (filtering.llmCategorization?.enabled) {
    if (!filtering.llmCategorization.apiKey) {
      throw new ConfigError(
        'INVALID_CONFIG',
        'llmCategorization.apiKey is required when enabled'
      );
    }

    const validProviders = ['openai', 'anthropic'];
    if (!validProviders.includes(filtering.llmCategorization.provider)) {
      throw new ConfigError(
        'INVALID_CONFIG',
        `Invalid LLM provider: ${filtering.llmCategorization.provider}`
      );
    }
  }
}
```

---

## Implementation Timeline

### Phase 1: Server-Based Filtering (Day 1 - 6 hours)

**Hour 1-2: Create ToolFilteringService skeleton**
- [ ] Create `src/utils/tool-filtering-service.js`
- [ ] Implement constructor and basic structure
- [ ] Add default category mappings constant
- [ ] Export class

**Hour 2-3: Implement server filtering logic**
- [ ] Implement `shouldIncludeTool()` method
- [ ] Implement `_filterByServer()` method
- [ ] Add allowlist/denylist support
- [ ] Add logging for filtered tools

**Hour 3-4: Integrate with MCPServerEndpoint**
- [ ] Modify MCPServerEndpoint constructor
- [ ] Update `registerServerCapabilities()` method
- [ ] Add filtering call before capability registration
- [ ] Test integration manually

**Hour 4-5: Configuration loading and validation**
- [ ] Add config schema validation in `config.js`
- [ ] Test config parsing with valid/invalid configs
- [ ] Add error handling for invalid configs

**Hour 5-6: Unit tests**
- [ ] Create `tests/tool-filtering-service.test.js`
- [ ] Test server allowlist filtering
- [ ] Test server denylist filtering
- [ ] Test with filtering disabled
- [ ] Test configuration validation

---

### Phase 2: Category-Based Filtering (Day 2 - 8 hours)

**Hour 1-2: Add default category mappings**
- [ ] Define DEFAULT_CATEGORIES constant
- [ ] Add common patterns for each category
- [ ] Document category meanings

**Hour 2-4: Implement pattern matching logic**
- [ ] Implement `_categorizeBySyntax()` method
- [ ] Implement `_matchesPattern()` with wildcard support
- [ ] Add custom mapping support
- [ ] Implement category cache

**Hour 4-5: Add category filtering**
- [ ] Implement `_filterByCategory()` method
- [ ] Implement `getToolCategory()` method
- [ ] Test pattern matching with various tool names

**Hour 5-6: Auto-enable threshold logic**
- [ ] Implement `autoEnableIfNeeded()` method
- [ ] Integrate with `syncCapabilities()`
- [ ] Add logging for auto-enable
- [ ] Test threshold behavior

**Hour 6-8: Integration and tests**
- [ ] Add integration tests in `tests/MCPServerEndpoint.test.js`
- [ ] Test category filtering with mock tools
- [ ] Test auto-enable threshold
- [ ] Test custom category mappings
- [ ] Validate no regression in existing tests

---

### Phase 3: LLM Enhancement (Day 3 - 8 hours) *(Optional)*

**Hour 1-2: Design LLM integration interface**
- [ ] Create LLM client factory
- [ ] Design provider abstraction
- [ ] Plan cache schema

**Hour 2-4: Implement OpenAI provider**
- [ ] Implement `_createLLMClient()` method
- [ ] Implement `_callLLM()` method
- [ ] Build categorization prompt
- [ ] Add error handling and fallbacks
- [ ] Test with real OpenAI API

**Hour 4-5: Add cache persistence**
- [ ] Implement `_loadCachedCategory()` method
- [ ] Implement `_saveCachedCategory()` method
- [ ] Use XDG-compliant cache location
- [ ] Handle cache corruption gracefully

**Hour 5-6: Async categorization queue**
- [ ] Design async categorization flow
- [ ] Implement categorization queue
- [ ] Add rate limiting
- [ ] Prevent blocking server startup

**Hour 6-8: LLM integration tests**
- [ ] Mock LLM API calls
- [ ] Test categorization prompt building
- [ ] Test cache hit/miss scenarios
- [ ] Test fallback behavior on LLM failure
- [ ] Test rate limiting

---

### Testing & Documentation (Day 4 - 4 hours)

**Hour 1-2: Integration testing**
- [ ] End-to-end test with real MCP client
- [ ] Test filtering with 25 real servers
- [ ] Measure performance overhead
- [ ] Validate memory usage

**Hour 2-3: Documentation**
- [ ] Update README with filtering documentation
- [ ] Add configuration examples
- [ ] Document category system
- [ ] Add troubleshooting guide

**Hour 3-4: User guide and examples**
- [ ] Create quick-start guide
- [ ] Add common configuration examples
- [ ] Document best practices
- [ ] Add FAQ section

---

## Testing Strategy

### Unit Tests

**ToolFilteringService Tests** (`tests/tool-filtering-service.test.js`):
```javascript
describe('ToolFilteringService', () => {
  describe('Server Filtering', () => {
    it('should filter tools by server allowlist');
    it('should filter tools by server denylist');
    it('should allow all tools when filtering disabled');
    it('should handle empty server list');
  });

  describe('Category Filtering', () => {
    it('should categorize tools by pattern matching');
    it('should use custom category mappings');
    it('should cache category results');
    it('should filter by category allowlist');
    it('should handle uncategorized tools');
  });

  describe('Pattern Matching', () => {
    it('should match wildcard patterns');
    it('should match exact patterns');
    it('should prioritize custom mappings');
  });

  describe('Auto-Enable', () => {
    it('should auto-enable when threshold exceeded');
    it('should not auto-enable if explicitly configured');
    it('should use sensible defaults on auto-enable');
  });

  describe('LLM Categorization', () => {
    it('should categorize using LLM when pattern fails');
    it('should use cached LLM results');
    it('should fall back on LLM failure');
    it('should handle rate limiting');
  });
});
```

### Integration Tests

**MCPServerEndpoint Integration** (`tests/MCPServerEndpoint.integration.test.js`):
```javascript
describe('MCPServerEndpoint with Filtering', () => {
  it('should filter tools during registration');
  it('should not expose filtered tools in tools/list');
  it('should still route calls to filtered tools correctly');
  it('should update filtered tools on config change');
  it('should maintain backward compatibility when disabled');
});
```

### Performance Tests

**Benchmarks** (`tests/tool-filtering.benchmark.js`):
```javascript
describe('Filtering Performance', () => {
  it('should filter 3469 tools in < 100ms');
  it('should have minimal memory overhead');
  it('should not block server startup');
  it('should cache effectively (>90% hit rate)');
});
```

---

## Configuration Examples

### Example 1: Minimal Server Filtering (Immediate Relief)
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",
        "web",
        "github",
        "brave-search"
      ]
    }
  }
}
```
**Result**: 3469 → ~150 tools

---

### Example 2: Category-Based Filtering (Better UX)
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "search",
        "development"
      ],
      "customMappings": {
        "myserver__custom_*": "development"
      }
    }
  }
}
```
**Result**: 3469 → ~100 tools

---

### Example 3: Auto-Enable with Threshold
```json
{
  "toolFiltering": {
    "autoEnableThreshold": 500,
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "search"
      ]
    }
  }
}
```
**Behavior**: Auto-enables when tool count > 500

---

### Example 4: Full LLM Enhancement
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "database"]
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "gpt-4o-mini",
      "cacheDir": "${workspaceFolder}/.mcp-hub/categories"
    }
  }
}
```
**Result**: 3469 → ~80 tools with better accuracy

---

## Backward Compatibility

### Guarantees
1. ✅ Filtering **disabled by default** (no behavior change)
2. ✅ Existing configurations continue to work
3. ✅ No breaking changes to MCP protocol implementation
4. ✅ All existing tests pass without modification

### Migration Path
Users can opt-in progressively:
1. Start with server filtering (simple, immediate)
2. Move to category filtering (better UX)
3. Enable LLM enhancement (optional, for edge cases)

---

## Monitoring and Observability

### Logging
```javascript
// Info level - user-facing
logger.info(`Tool filtering enabled with mode: ${mode}`);
logger.info(`Auto-enabling tool filtering (${toolCount} tools > ${threshold})`);

// Debug level - development
logger.debug(`Tool filtered out: ${toolName} (server: ${serverName})`);
logger.debug(`Tool categorized as '${category}': ${toolName}`);
logger.debug(`LLM categorization cache hit for: ${toolName}`);

// Warn level - issues
logger.warn(`LLM categorization failed for ${toolName}: ${error.message}`);
logger.warn(`Unknown category in config: ${category}`);
```

### Statistics Endpoint
Add to REST API:
```javascript
GET /api/filtering/stats

Response:
{
  "enabled": true,
  "mode": "category",
  "totalTools": 3469,
  "filteredTools": 3380,
  "exposedTools": 89,
  "categoryBreakdown": {
    "filesystem": 45,
    "web": 30,
    "search": 14
  },
  "cacheStats": {
    "size": 3469,
    "hitRate": 0.95
  }
}
```

---

## Security Considerations

### Configuration Validation
- ✅ Validate all config values before use
- ✅ Sanitize user-provided patterns
- ✅ Prevent regex DoS attacks
- ✅ Validate LLM API keys

### LLM Security
- ✅ Don't send sensitive tool data to LLM
- ✅ Rate limit LLM API calls
- ✅ Validate LLM responses
- ✅ Handle API key leaks gracefully

---

## Future Enhancements

### Post-MVP Features
1. **Dynamic Category Learning**: Learn categories from user tool usage patterns
2. **Client-Specific Filtering**: Different filters for different clients
3. **Workspace-Aware Filtering**: Filter based on workspace file types
4. **User Preferences API**: Allow clients to set preferences programmatically
5. **Tool Popularity Ranking**: Prioritize frequently-used tools
6. **Semantic Similarity**: Group similar tools using embeddings

---

## Success Metrics

### Phase 1 Success Criteria
- [x] Server filtering reduces tool count by 80-95%
- [x] Configuration validation prevents invalid configs
- [x] No performance degradation (< 10ms overhead)
- [x] All existing tests pass

### Phase 2 Success Criteria
- [x] Category filtering provides finer-grained control
- [x] Pattern matching covers 80%+ of tools
- [x] Auto-enable threshold works correctly
- [x] Custom mappings allow user flexibility

### Phase 3 Success Criteria
- [x] LLM categorization improves accuracy by 10-20%
- [x] Cache hit rate > 90% after warmup
- [x] LLM calls don't block server startup
- [x] Graceful fallback on LLM failure

---

## Quick Start Guide for Users

### Immediate Relief (5 minutes)

1. **Identify servers you actually use:**
   ```bash
   # List all connected servers
   curl http://localhost:37373/api/servers | jq '.servers[].name'
   ```

2. **Update config file:**
   ```json
   {
     "toolFiltering": {
       "enabled": true,
       "mode": "server-allowlist",
       "serverFilter": {
         "mode": "allowlist",
         "servers": [
           "filesystem",
           "web",
           "github",
           "brave-search",
           "fetch"
         ]
       }
     }
   }
   ```

3. **Restart MCP Hub:**
   ```bash
   npm start
   ```

4. **Verify reduction:**
   ```bash
   # Check tool count
   curl http://localhost:37373/api/filtering/stats
   ```

**Expected Result**: Tool count drops from 3469 to ~100-200 tools immediately.

---

## Appendix: Default Category Mappings

```javascript
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
```

---

## Conclusion

This implementation plan provides a pragmatic, MCP-compliant solution to reduce tool exposure from 3469 to 50-200 tools. The three-phase approach allows for progressive enhancement while maintaining backward compatibility.

**Key Takeaways:**
1. MCP protocol constraints require config-based filtering, not intent-based
2. Phase 1 provides immediate relief with minimal effort
3. Phase 2 offers better UX through category-based filtering
4. Phase 3 adds LLM enhancement for edge cases (optional)

**Total Estimated Effort**: 18-26 hours (2.5-3.5 days)

**Recommended Approach**: Implement Phase 1 + 2 (14 hours), defer Phase 3 based on user feedback.
