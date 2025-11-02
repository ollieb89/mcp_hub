# Tool Filtering System - Developer Integration Guide

Technical guide for developers integrating with or extending the MCP Hub tool filtering system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Integration Points](#integration-points)
- [Extending the System](#extending-the-system)
- [API Reference](#api-reference)
- [Testing Guide](#testing-guide)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Design Principles

1. **Non-Blocking**: Filtering operations never block MCP request handling (<10ms overhead)
2. **Fail-Safe**: Errors in filtering default to allowing tools (availability > filtering)
3. **Backward Compatible**: System disabled by default, zero impact when not configured
4. **Extensible**: Pluggable categorization strategies (pattern-based, LLM-based, custom)
5. **Observable**: Comprehensive statistics and logging for monitoring

### High-Level Flow

```
MCP Client Request
      ↓
MCPServerEndpoint
      ↓
registerServerCapabilities()
      ↓
ToolFilteringService.shouldIncludeTool() ← Configuration
      ↓                                     ← Category Cache
   Filter?                                  ← LLM (background)
  ↙     ↘
YES     NO
 ↓       ↓
Include Exclude
 ↓       ↓
Tool List for Client
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MCPServerEndpoint                    │
│  - Unified MCP server at /mcp                          │
│  - Capability registration and namespacing             │
│  - Integrates ToolFilteringService                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│               ToolFilteringService                      │
│  - Main filtering logic coordinator                    │
│  - Mode dispatch (server/category/hybrid)              │
│  - Configuration management                            │
│  - Statistics tracking                                 │
└─────┬─────────┬─────────────┬─────────────┬────────────┘
      │         │             │             │
      ↓         ↓             ↓             ↓
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Server  │ │ Category │ │  Pattern │ │ LLM Category │
│ Filter  │ │ Mappings │ │  Matcher │ │   (Async)    │
└─────────┘ └──────────┘ └──────────┘ └──────────────┘
```

## Core Components

### 1. ToolFilteringService

**Location:** `src/utils/tool-filtering-service.js`

**Responsibilities:**
- Determine if a tool should be included based on configuration
- Manage category cache and pattern matching
- Coordinate LLM categorization (when enabled)
- Track statistics (total tools, filtered tools, cache hits)

**Key Methods:**

```javascript
class ToolFilteringService {
  /**
   * Primary decision method - MUST be synchronous
   * @param {string} toolName - Tool name (without namespace)
   * @param {string} serverName - Source MCP server name
   * @param {object} toolDefinition - Full tool definition (optional)
   * @returns {boolean} - true to include, false to exclude
   */
  shouldIncludeTool(toolName, serverName, toolDefinition = {}) {
    // Performance: <10ms average
    // Thread-safe: No blocking operations
    // Fail-safe: Defaults to true on error
  }

  /**
   * Get tool's category (for category/hybrid modes)
   * @param {string} toolName - Tool name
   * @param {string} serverName - Server name
   * @param {object} toolDefinition - Tool definition
   * @returns {string} - Category name ('filesystem', 'web', etc.)
   */
  getToolCategory(toolName, serverName, toolDefinition) {
    // Synchronous return with background LLM refinement
    // Priority: customMappings > patternMatch > LLM (async) > 'other'
  }

  /**
   * Get current filtering statistics
   * @returns {object} - Stats object
   */
  getStats() {
    // Returns: enabled, mode, toolCounts, cacheStats, llmStats
  }

  /**
   * Graceful shutdown - flush pending operations
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Await pending LLM categorizations
    // Flush logs and caches
  }
}
```

### 2. MCPServerEndpoint Integration

**Location:** `src/mcp/server.js`

**Integration Point:** `registerServerCapabilities()` method (lines 519-570)

```javascript
registerServerCapabilities(connection, { capabilityId, serverId }) {
  const serverName = connection.name;

  // ... existing capability logic ...

  // Apply tool filtering for tools capability type (Sprint 2)
  if (capabilityId === 'tools' && this.filteringService) {
    const originalCount = capabilities.length;

    // Filter tools using shouldIncludeTool method
    capabilities = capabilities.filter(tool =>
      this.filteringService.shouldIncludeTool(tool.name, serverName, tool)
    );

    // Log filtering results
    const filteredCount = capabilities.length;
    if (filteredCount < originalCount) {
      logger.info(`Tool filtering: ${serverName} reduced from ${originalCount} to ${filteredCount} tools`);
    }
  }

  // ... continue with registration of filtered capabilities ...
}
```

**Key Integration Notes:**
- Filtering happens BEFORE capability registration
- Filtered tools never enter `registeredCapabilities` Map
- Resources and prompts bypass filtering (only tools filtered)
- Namespacing still applies to included tools

### 3. Configuration Management

**Location:** `src/utils/config.js`

**Validation Method:** `#validateToolFilteringConfig()` (lines 462-559)

```javascript
#validateToolFilteringConfig(filteringConfig = {}) {
  // Validate mode
  const validModes = ['server-allowlist', 'category', 'hybrid'];
  if (filteringConfig.mode && !validModes.includes(filteringConfig.mode)) {
    throw new ConfigError(
      `Invalid toolFiltering.mode: ${filteringConfig.mode}. Must be one of: ${validModes.join(', ')}`,
      { mode: filteringConfig.mode, validModes }
    );
  }

  // Validate serverFilter
  if (filteringConfig.serverFilter) {
    const validFilterModes = ['allowlist', 'denylist'];
    if (!validFilterModes.includes(filteringConfig.serverFilter.mode)) {
      throw new ConfigError(
        `Invalid toolFiltering.serverFilter.mode: ${filteringConfig.serverFilter.mode}`,
        { mode: filteringConfig.serverFilter.mode, validModes: validFilterModes }
      );
    }

    if (!Array.isArray(filteringConfig.serverFilter.servers)) {
      throw new ConfigError(
        'toolFiltering.serverFilter.servers must be an array',
        { servers: filteringConfig.serverFilter.servers }
      );
    }
  }

  // Validate categoryFilter
  if (filteringConfig.categoryFilter) {
    if (!Array.isArray(filteringConfig.categoryFilter.categories)) {
      throw new ConfigError(
        'toolFiltering.categoryFilter.categories must be an array',
        { categories: filteringConfig.categoryFilter.categories }
      );
    }

    if (filteringConfig.categoryFilter.customMappings !== undefined) {
      if (typeof filteringConfig.categoryFilter.customMappings !== 'object' ||
          Array.isArray(filteringConfig.categoryFilter.customMappings)) {
        throw new ConfigError(
          'toolFiltering.categoryFilter.customMappings must be an object',
          { customMappings: filteringConfig.categoryFilter.customMappings }
        );
      }
    }
  }

  // Validate LLM categorization
  if (filteringConfig.llmCategorization) {
    if (filteringConfig.llmCategorization.enabled) {
      if (!filteringConfig.llmCategorization.apiKey) {
        throw new ConfigError(
          'toolFiltering.llmCategorization.apiKey is required when enabled'
        );
      }

      const validProviders = ['openai', 'anthropic'];
      if (!validProviders.includes(filteringConfig.llmCategorization.provider)) {
        throw new ConfigError(
          `Invalid LLM provider: ${filteringConfig.llmCategorization.provider}. Must be one of: ${validProviders.join(', ')}`
        );
      }
    }
  }

  // Validate autoEnableThreshold
  if (filteringConfig.autoEnableThreshold !== undefined) {
    if (typeof filteringConfig.autoEnableThreshold !== 'number' ||
        filteringConfig.autoEnableThreshold < 1) {
      throw new ConfigError(
        'toolFiltering.autoEnableThreshold must be a positive number',
        { autoEnableThreshold: filteringConfig.autoEnableThreshold }
      );
    }
  }
}
```

**Configuration Schema:**

```typescript
interface ToolFilteringConfig {
  enabled: boolean;
  mode?: 'server-allowlist' | 'category' | 'hybrid';
  autoEnableThreshold?: number;

  serverFilter?: {
    mode: 'allowlist' | 'denylist';
    servers: string[];
  };

  categoryFilter?: {
    categories: string[];
    customMappings?: Record<string, string>;
  };

  llmCategorization?: {
    enabled: boolean;
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
  };
}
```

## Integration Points

### Adding New Filtering Modes

To add a custom filtering mode (e.g., `permission-based`):

**Step 1: Update Configuration Validation**

```javascript
// src/utils/config.js
#validateToolFilteringConfig(filteringConfig = {}) {
  const validModes = ['server-allowlist', 'category', 'hybrid', 'permission-based'];
  // ... rest of validation
}
```

**Step 2: Implement Mode Logic**

```javascript
// src/utils/tool-filtering-service.js
shouldIncludeTool(toolName, serverName, toolDefinition = {}) {
  if (!this.config.enabled) return true;

  switch (this.config.mode) {
    case 'server-allowlist':
      return this._filterByServer(serverName);

    case 'category':
      return this._filterByCategory(toolName, serverName, toolDefinition);

    case 'hybrid':
      return this._filterByServer(serverName) ||
             this._filterByCategory(toolName, serverName, toolDefinition);

    case 'permission-based':  // NEW MODE
      return this._filterByPermissions(toolName, serverName, toolDefinition);

    default:
      logger.warn(`Unknown filtering mode: ${this.config.mode}`);
      return true;  // Fail-safe
  }
}

_filterByPermissions(toolName, serverName, toolDefinition) {
  const userPermissions = this.config.permissionFilter?.userPermissions || [];
  const requiredPermission = toolDefinition.requiredPermission || 'read';

  return userPermissions.includes(requiredPermission);
}
```

**Step 3: Add Tests**

```javascript
// tests/tool-filtering-service.test.js
describe('Permission-Based Filtering', () => {
  it('allows tools matching user permissions', () => {
    const config = {
      toolFiltering: {
        enabled: true,
        mode: 'permission-based',
        permissionFilter: {
          userPermissions: ['read', 'write']
        }
      }
    };

    const service = new ToolFilteringService(config, mockMcpHub);

    expect(service.shouldIncludeTool(
      'filesystem__read',
      'filesystem',
      { requiredPermission: 'read' }
    )).toBe(true);

    expect(service.shouldIncludeTool(
      'filesystem__delete',
      'filesystem',
      { requiredPermission: 'admin' }
    )).toBe(false);
  });
});
```

### Custom Category Providers

To implement a custom categorization strategy (e.g., ML-based):

```javascript
// src/utils/custom-ml-categorizer.js
import { EventEmitter } from 'events';

export class MLCategorizer extends EventEmitter {
  constructor(modelPath) {
    super();
    this.model = loadModel(modelPath);
    this.cache = new Map();
  }

  /**
   * Categorize tool using ML model
   * @param {string} toolName
   * @param {object} toolDefinition
   * @returns {Promise<string>} - category name
   */
  async categorize(toolName, toolDefinition) {
    const cacheKey = `${toolName}_${JSON.stringify(toolDefinition)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const features = this._extractFeatures(toolName, toolDefinition);
    const category = await this.model.predict(features);

    this.cache.set(cacheKey, category);
    this.emit('categorized', { toolName, category });

    return category;
  }

  _extractFeatures(toolName, toolDefinition) {
    return {
      name: toolName,
      description: toolDefinition.description || '',
      inputSchema: toolDefinition.inputSchema || {},
      // ... additional feature extraction
    };
  }
}
```

**Integration:**

```javascript
// src/utils/tool-filtering-service.js
import { MLCategorizer } from './custom-ml-categorizer.js';

class ToolFilteringService {
  constructor(config, mcpHub) {
    // ... existing initialization

    if (config.toolFiltering?.mlCategorization?.enabled) {
      this.mlCategorizer = new MLCategorizer(
        config.toolFiltering.mlCategorization.modelPath
      );

      this.mlCategorizer.on('categorized', ({ toolName, category }) => {
        this.categoryCache.set(toolName, category);
        logger.debug(`ML categorized: ${toolName} → ${category}`);
      });
    }
  }

  async _categorizeTool(toolName, serverName, toolDefinition) {
    if (this.mlCategorizer) {
      return await this.mlCategorizer.categorize(toolName, toolDefinition);
    }

    // Fallback to default LLM or pattern matching
    return super._categorizeTool(toolName, serverName, toolDefinition);
  }
}
```

### REST API Extension

Add new endpoints for advanced filtering control:

```javascript
// src/utils/router.js
export function registerRoutes(app, mcpHub, serviceManager) {
  // ... existing routes

  // Get category mappings
  registerRoute(app, 'GET', '/api/filtering/categories', async (req, res) => {
    const filteringService = mcpHub.serverEndpoint?.filteringService;

    if (!filteringService) {
      return res.status(503).json({
        error: 'Tool filtering not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const categories = filteringService.getCategoryMappings();

    res.json({
      categories,
      defaultCategories: DEFAULT_CATEGORIES,
      timestamp: new Date().toISOString()
    });
  });

  // Update filtering configuration dynamically
  registerRoute(app, 'POST', '/api/filtering/config', async (req, res) => {
    const newConfig = req.body;

    try {
      await mcpHub.updateFilteringConfig(newConfig);

      res.json({
        success: true,
        config: newConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}
```

## Extending the System

### Pattern Matching Extension

Add custom pattern matching logic:

```javascript
// src/utils/tool-filtering-service.js
_matchesPattern(toolName, pattern) {
  // Existing wildcard logic
  if (pattern.includes('*')) {
    const regex = this._getPatternRegex(pattern);
    return regex.test(toolName);
  }

  // NEW: Regex pattern support
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    const regexStr = pattern.slice(1, -1);
    try {
      const regex = new RegExp(regexStr);
      return regex.test(toolName);
    } catch (error) {
      logger.warn(`Invalid regex pattern: ${pattern}`);
      return false;
    }
  }

  // NEW: Glob pattern support
  if (pattern.includes('{') || pattern.includes('[')) {
    return this._matchesGlobPattern(toolName, pattern);
  }

  // Exact match fallback
  return toolName === pattern;
}

_matchesGlobPattern(toolName, globPattern) {
  // Implement glob pattern matching
  // e.g., "filesystem__{read,write}" matches "filesystem__read" and "filesystem__write"
  const regex = globToRegex(globPattern);
  return regex.test(toolName);
}
```

### Auto-Enable Strategy Extension

Implement custom auto-enable logic:

```javascript
// src/utils/tool-filtering-service.js
async autoEnableIfNeeded() {
  const stats = this.getStats();

  // Existing threshold check
  if (this.config.autoEnableThreshold &&
      stats.totalTools >= this.config.autoEnableThreshold) {
    await this._enableFiltering();
    return;
  }

  // NEW: Token-based auto-enable
  if (this.config.autoEnableTokenThreshold) {
    const estimatedTokens = stats.totalTools * 15; // ~15 tokens per tool

    if (estimatedTokens >= this.config.autoEnableTokenThreshold) {
      logger.info(`Auto-enabling filtering: ${estimatedTokens} tokens > ${this.config.autoEnableTokenThreshold} threshold`);
      await this._enableFiltering();
      return;
    }
  }

  // NEW: Server count auto-enable
  if (this.config.autoEnableServerThreshold) {
    const serverCount = new Set(
      Array.from(this.mcpHub.connections.keys())
    ).size;

    if (serverCount >= this.config.autoEnableServerThreshold) {
      logger.info(`Auto-enabling filtering: ${serverCount} servers > ${this.config.autoEnableServerThreshold} threshold`);
      await this._enableFiltering();
    }
  }
}
```

## API Reference

### REST Endpoints

#### GET /api/filtering/stats

Get current filtering statistics.

**Response:**
```json
{
  "enabled": true,
  "mode": "server-allowlist",
  "totalTools": 3247,
  "allowedTools": 18,
  "filteredTools": 3229,
  "filteringRate": 0.9945,
  "cacheStats": {
    "categoryCache": {
      "size": 156,
      "hitRate": 0.87
    },
    "patternCache": {
      "size": 12,
      "hitRate": 0.95
    }
  },
  "llmStats": {
    "enabled": false,
    "totalCategorizations": 0,
    "pendingCategorizations": 0
  },
  "serverStats": {
    "filesystem": { "total": 8, "allowed": 8, "filtered": 0 },
    "github": { "total": 15, "allowed": 10, "filtered": 5 }
  },
  "timestamp": "2025-10-28T14:30:00.000Z"
}
```

#### GET /api/filtering/categories

Get category mappings and available categories.

**Response:**
```json
{
  "categories": {
    "filesystem": ["filesystem__read", "filesystem__write"],
    "web": ["web-browser__fetch", "playwright__navigate"],
    "code": ["github__create_pr", "github__review_code"]
  },
  "defaultCategories": {
    "filesystem": ["read", "write", "list", "search"],
    "web": ["fetch", "navigate", "screenshot"],
    "code": ["git", "lint", "test"]
  },
  "timestamp": "2025-10-28T14:30:00.000Z"
}
```

### JavaScript API

#### ToolFilteringService Class

```javascript
const service = new ToolFilteringService(config, mcpHub);

// Check if tool should be included
const shouldInclude = service.shouldIncludeTool('filesystem__read', 'filesystem', toolDef);

// Get tool category
const category = service.getToolCategory('github__create_pr', 'github', toolDef);

// Get statistics
const stats = service.getStats();

// Graceful shutdown
await service.shutdown();
```

#### Configuration API

```javascript
const configManager = new ConfigManager();

// Load configuration
const config = await configManager.loadConfig('/path/to/mcp.json');

// Validate specific section
configManager.validateToolFilteringConfig(config.toolFiltering);

// Watch for changes
configManager.on('configChanged', (newConfig) => {
  console.log('Configuration updated:', newConfig);
});
```

## Testing Guide

### Unit Testing

**Test Structure:**

```javascript
// tests/tool-filtering-service.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

describe('ToolFilteringService', () => {
  let service;
  let mockMcpHub;
  let config;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMcpHub = { config: {} };
    config = {
      toolFiltering: {
        enabled: true,
        mode: 'server-allowlist',
        serverFilter: {
          mode: 'allowlist',
          servers: ['filesystem']
        }
      }
    };
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  it('should allow tools from allowlisted servers', () => {
    service = new ToolFilteringService(config, mockMcpHub);

    expect(service.shouldIncludeTool('read', 'filesystem', {})).toBe(true);
    expect(service.shouldIncludeTool('read', 'github', {})).toBe(false);
  });
});
```

**Key Test Patterns:**

1. **Behavior-Driven Tests:** Focus on observable outcomes
2. **AAA Pattern:** Arrange-Act-Assert structure
3. **Async Handling:** Use `vi.waitFor()` for background operations
4. **Cleanup:** Always call `shutdown()` in afterEach

### Integration Testing

**Test MCPServerEndpoint Integration:**

```javascript
// tests/tool-filtering-integration.test.js
describe('MCPServerEndpoint Integration', () => {
  it('should filter tools during capability registration', async () => {
    // Arrange
    const config = {
      toolFiltering: {
        enabled: true,
        mode: 'server-allowlist',
        serverFilter: {
          mode: 'allowlist',
          servers: ['filesystem']
        }
      }
    };

    const mcpHub = new MCPHub(config);
    const serverEndpoint = new MCPServerEndpoint(mcpHub);

    const mockConnection = {
      name: 'github',
      tools: [
        { name: 'create_pr' },
        { name: 'review_code' }
      ]
    };

    // Act
    serverEndpoint.registerServerCapabilities(mockConnection, {
      capabilityId: 'tools',
      serverId: 'github'
    });

    // Assert
    const registeredTools = serverEndpoint.registeredCapabilities.tools;
    expect(registeredTools.size).toBe(0);  // GitHub filtered out
  });
});
```

### Performance Testing

**Benchmark Filtering Overhead:**

```javascript
// tests/tool-filtering-performance.test.js
describe('Performance', () => {
  it('should filter 1000 tools in <10ms', async () => {
    const service = new ToolFilteringService(config, mockMcpHub);
    const tools = Array.from({ length: 1000 }, (_, i) => ({
      name: `tool_${i}`,
      server: 'filesystem'
    }));

    const startTime = performance.now();

    tools.forEach(tool => {
      service.shouldIncludeTool(tool.name, tool.server, {});
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10);
  });
});
```

## Performance Optimization

### Caching Strategies

**1. Pattern Regex Caching:**

```javascript
_getPatternRegex(pattern) {
  if (this.patternCache.has(pattern)) {
    return this.patternCache.get(pattern);
  }

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\\\*/g, '.*') + '$';

  try {
    const regex = new RegExp(regexStr);
    this.patternCache.set(pattern, regex);
    return regex;
  } catch (error) {
    logger.warn(`Invalid pattern: ${pattern}`);
    return /^$/;  // Never matches
  }
}
```

**2. Category Cache with TTL:**

```javascript
class ToolFilteringService {
  constructor(config, mcpHub) {
    this.categoryCache = new Map();
    this.categoryCacheTTL = config.toolFiltering?.categoryCacheTTL || 3600000; // 1 hour
    this.categoryCacheTimestamps = new Map();

    // Cleanup expired entries every 5 minutes
    setInterval(() => this._cleanupCategoryCache(), 300000);
  }

  getToolCategory(toolName, serverName, toolDefinition) {
    const cacheKey = `${serverName}__${toolName}`;

    // Check cache validity
    if (this.categoryCache.has(cacheKey)) {
      const timestamp = this.categoryCacheTimestamps.get(cacheKey);
      const age = Date.now() - timestamp;

      if (age < this.categoryCacheTTL) {
        return this.categoryCache.get(cacheKey);
      }

      // Expired, remove
      this.categoryCache.delete(cacheKey);
      this.categoryCacheTimestamps.delete(cacheKey);
    }

    // ... categorization logic
    const category = this._categorizeTool(toolName, serverName, toolDefinition);

    this.categoryCache.set(cacheKey, category);
    this.categoryCacheTimestamps.set(cacheKey, Date.now());

    return category;
  }

  _cleanupCategoryCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, timestamp] of this.categoryCacheTimestamps.entries()) {
      if (now - timestamp >= this.categoryCacheTTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.categoryCache.delete(key);
      this.categoryCacheTimestamps.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired category cache entries`);
    }
  }
}
```

**3. LLM Rate Limiting:**

```javascript
import PQueue from 'p-queue';

class ToolFilteringService {
  constructor(config, mcpHub) {
    // Limit concurrent LLM calls to prevent API overload
    this.llmQueue = new PQueue({ concurrency: 5 });
    this.llmInFlight = new Map();
  }

  async _categorizeTool(toolName, serverName, toolDefinition) {
    const cacheKey = `${serverName}__${toolName}`;

    // Prevent duplicate in-flight requests
    if (this.llmInFlight.has(cacheKey)) {
      return this.llmInFlight.get(cacheKey);
    }

    const promise = this.llmQueue.add(async () => {
      try {
        const category = await this._callLLM(toolName, toolDefinition);
        this.categoryCache.set(cacheKey, category);
        return category;
      } finally {
        this.llmInFlight.delete(cacheKey);
      }
    });

    this.llmInFlight.set(cacheKey, promise);
    return promise;
  }
}
```

### Memory Management

**Bounded Cache Sizes:**

```javascript
class LRUCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key, value) {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }
}

// Usage in ToolFilteringService
class ToolFilteringService {
  constructor(config, mcpHub) {
    const maxCacheSize = config.toolFiltering?.maxCacheSize || 1000;
    this.categoryCache = new LRUCache(maxCacheSize);
    this.patternCache = new LRUCache(100);
  }
}
```


## Troubleshooting

For comprehensive troubleshooting guidance including debug logging, performance profiling, and memory analysis, see the dedicated [Tool Filtering Troubleshooting Guide](./TOOL_FILTERING_TROUBLESHOOTING.md).

**Developer Resources:**
- [Advanced Debugging](./TOOL_FILTERING_TROUBLESHOOTING.md#advanced-debugging)
- [Configuration Validation](./TOOL_FILTERING_TROUBLESHOOTING.md#configuration-validation)
- [Memory Profiling](./TOOL_FILTERING_TROUBLESHOOTING.md#memory-profiling)
- [Performance Monitoring](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-5-high-performance-overhead)

---


- **Test Suite:** [tests/tool-filtering-service.test.js](../tests/tool-filtering-service.test.js)
- **Integration Tests:** [tests/tool-filtering-integration.test.js](../tests/tool-filtering-integration.test.js)
- **User Documentation:** [README.md](../README.md#tool-filtering)
- **Configuration Examples:** [TOOL_FILTERING_EXAMPLES.md](../TOOL_FILTERING_EXAMPLES.md)
- **Architecture:** [Sprint4_Documentation_Architecture.md](../claudedocs/Sprint4_Documentation_Architecture.md)
- **Quick Reference:** [Sprint4_Quick_Reference.md](../claudedocs/Sprint4_Quick_Reference.md)
