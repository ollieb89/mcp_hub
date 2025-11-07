# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Hub is a central coordinator for MCP (Model Context Protocol) servers, providing two key interfaces:
1. **Management Interface** (`/api/*`): REST API and web UI to manage multiple MCP servers
2. **MCP Server Interface** (`/mcp`): Single endpoint for ANY MCP client to access ALL server capabilities

The architecture enables users to manage MCP servers through the Hub's UI while MCP clients (Claude Desktop, Cline, etc.) connect to one endpoint to access all capabilities. Implements MCP specification 2025-03-26.

## Development Commands

> **Note**: This project uses Bun as the primary runtime. All commands use `bun` instead of `npm` for better performance.

### Build & Run
```bash
# Development start with config file
bun start

# Clean build artifacts
bun run clean

# Build for production (creates dist/cli.js)
bun run build

# Build includes prebuild (clean) and postbuild (chmod +x)
```

### Testing
```bash
# Run all tests once
bun test

# Watch mode for development
bun run test:watch

# Generate coverage report
bun run test:coverage

# Open HTML coverage report
bun run test:coverage:ui

# Current status: 509/509 tests passing (100% pass rate)
# Coverage: 82.94% branches (exceeds 80% standard)
# Tests located in: tests/**/*.test.js
```

### Load & Performance Testing
```bash
# Basic load test (requires k6 installation)
bun run test:load

# Stress test (find breaking point)
bun run test:load:stress

# LLM filtering spike test
bun run test:load:spike

# CI/CD integration (JSON output)
bun run test:load:ci

# See tests/load/README.md for complete guide
# See tests/load/INSTALL_K6.md for k6 installation
```

### Release Process
```bash
# Patch version (bug fixes)
bun run release:patch

# Minor version (new features)
bun run release:minor

# Major version (breaking changes)
bun run release:major
```

### Other Commands
```bash
# Update marketplace data
bun run update-data

# Install dependencies
bun install
```

## Architecture Overview

### Core Components

**MCPHub** (`src/MCPHub.js`)
- Central orchestrator managing multiple MCP server connections
- Handles configuration loading, watching, and hot-reload
- Coordinates parallel server startup/shutdown
- Emits events for tools/resources/prompts changes
- Integrates with DevWatcher for hot-reload during development

**MCPConnection** (`src/MCPConnection.js`)
- Manages individual MCP server connections
- Supports three transport types: STDIO, SSE, streamable-http
- Handles OAuth authentication flow (PKCE)
- Maintains tools, resources, prompts, and resource templates
- Implements automatic reconnection and dev mode file watching
- Connection states: connected, connecting, disconnected, unauthorized, disabled

**ServiceManager** (`src/server.js`)
- Application lifecycle coordinator
- Manages Express server, SSE connections, workspace cache
- Tracks hub state transitions: starting → ready → restarting → stopped
- Broadcasts state changes to all connected clients
- Handles graceful shutdown with configurable delays

**MCPServerEndpoint** (`src/mcp/server.js`)
- Creates unified MCP server endpoint at `/mcp`
- Namespaces capabilities from multiple servers (e.g., `filesystem__search`, `github__search`)
- Routes requests to appropriate underlying MCP servers
- Automatically syncs capabilities when servers change
- Implements comprehensive error handling and timeout management

### Key Utilities

**EnvResolver** (`src/utils/env-resolver.js`)
- Universal placeholder resolution system supporting:
  - `${ENV_VAR}` or `${env:ENV_VAR}` - environment variables
  - `${cmd: command args}` - command execution
  - `${workspaceFolder}`, `${userHome}`, etc. - VS Code predefined variables
  - `${input:variable-id}` - VS Code input variables from MCP_HUB_ENV
- Multi-pass recursive resolution with cycle detection
- Resolves configs with proper priority: predefinedVars → process.env → globalEnv → serverEnv

**SSEManager** (`src/utils/sse-manager.js`)
- Server-Sent Events coordination for real-time updates
- Event types: heartbeat, hub_state, log, config_changed, tool_list_changed, etc.
- Connection lifecycle tracking with automatic cleanup
- Integrates with WorkspaceCache for multi-instance coordination

**WorkspaceCacheManager** (`src/utils/workspace-cache.js`)
- Global workspace tracking across MCP Hub instances
- XDG-compliant cache location: `$XDG_STATE_HOME/mcp-hub/workspaces.json`
- Prevents port conflicts and enables workspace discovery
- Real-time lifecycle state tracking: active, shutting_down

**DevWatcher** (`src/utils/dev-watcher.js`)
- File watching system for STDIO servers in dev mode
- Automatic server restart on file changes
- Configurable watch patterns and working directory
- Emits events for server restart lifecycle

**HTTPPool** (`src/utils/http-pool.js`)
- Undici-based HTTP connection pooling for remote MCP servers (SSE and streamable-http)
- Custom fetch wrapper with Agent dispatcher injection
- Configuration merging: global + per-server overrides with precedence rules
- Default settings optimized for persistent MCP connections (60s keep-alive, 50 connections)
- Pool configuration validation with detailed error reporting
- Graceful Agent lifecycle management and cleanup
- Improves remote server latency by 10-30% through connection reuse

### Configuration System

**ConfigManager** (`src/utils/config.js`)
- Supports multiple config files merged in order
- JSON5 support (comments, trailing commas)
- VS Code compatibility (`servers` key, `${env:}` syntax)
- File watching with intelligent change detection
- Deep comparison to identify significant changes

**Configuration Structure:**
```json
{
  "connectionPool": {
    "enabled": true,
    "keepAliveTimeout": 60000,
    "maxConnections": 50
  },
  "mcpServers": {
    "server-name": {
      // STDIO server
      "command": "node",
      "args": ["server.js"],
      "env": { "API_KEY": "${cmd: op read op://vault/key}" },
      "cwd": "/path/to/server",
      "dev": {
        "enabled": true,
        "watch": ["**/*.js"],
        "cwd": "/absolute/path/to/watch"
      },

      // OR remote server
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" },
      "connectionPool": {
        "maxConnections": 100  // Override global setting
      }
    }
  }
}
```

### Error Handling

Custom error classes (`src/utils/errors.js`):
- **ConfigError**: Configuration issues
- **ConnectionError**: Server connection failures
- **ServerError**: Server startup/initialization problems
- **ToolError**: Tool execution failures
- **ResourceError**: Resource access issues
- **ValidationError**: Request validation errors

All errors include:
- Error code for identification
- Detailed message
- Context in `details` object
- Stack trace for debugging

### Transport Types

1. **STDIO**: Local script-based servers
   - Process spawning with environment resolution
   - Dev mode with hot-reload support
   - Environment variable injection

2. **SSE (Server-Sent Events)**: Remote servers with SSE
   - Reconnecting EventSource for reliability
   - Header-based authentication
   - HTTP connection pooling with undici Agent
   - Custom fetch wrapper for persistent connections

3. **streamable-http**: Remote servers with HTTP streaming
   - OAuth 2.0 with PKCE flow
   - Authorization code handling via callback endpoint
   - HTTP connection pooling with undici Agent
   - Custom fetch wrapper for persistent connections

## LLM-Based Tool Filtering (Prompt-Based Mode)

**New Feature**: Intelligent, prompt-based tool exposure for managing overwhelming tool counts.

### Overview
Instead of exposing all tools at once (which can consume 50k+ tokens with 25+ servers), clients start with zero tools and dynamically receive only relevant tools based on LLM analysis of user prompts.

**Benefits:**
- Zero-default exposure: Clients start with only meta-tools
- Context-aware: LLM analyzes user intent to expose relevant tools
- Per-client isolation: Each session has independent tool exposure
- Token reduction: 70-90% typical token savings

### Meta-Tool: `hub__analyze_prompt`

**Purpose**: Analyze user prompt and expose relevant tools dynamically

**Input**:
```json
{
  "prompt": "Check my GitHub notifications",
  "context": "Optional conversation context"
}
```

**Output**:
```json
{
  "categories": ["github"],
  "confidence": 0.98,
  "reasoning": "User wants to check GitHub notifications",
  "message": "Updated tool exposure: github",
  "nextStep": "Tools list has been updated. Proceed with your request."
}
```

**Workflow:**
1. User makes request → Client calls `hub__analyze_prompt`
2. Hub analyzes with LLM (Gemini) → Identifies relevant categories
3. Hub exposes relevant tools → Sends `tools/list_changed` notification
4. Client re-fetches tool list → Proceeds with original request

### Configuration

**Enable Prompt-Based Mode:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "enableMetaTools": true,
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  }
}
```

**Configuration Options:**
- `mode`: "prompt-based" | "static" | "server-allowlist" | "category"
- `defaultExposure`: "zero" | "meta-only" (recommended) | "minimal" | "all"
- `sessionIsolation`: true (per-client) | false (global)

### LLM Provider Support
- **Gemini**: Primary (gemini-2.5-flash recommended)
- **OpenAI**: Supported (gpt-4o-mini)
- **Anthropic**: Supported (claude-3-5-haiku)

### Tool Categories
Standard categories for LLM categorization:
- `github`, `filesystem`, `web`, `docker`, `git`, `python`, `database`, `memory`, `vertex_ai`, `meta`

See `claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md` for complete guide.

## Testing Strategy

**Current Status**: 509/509 tests passing (100% pass rate), 82.94% branches coverage

**Test Files:**
- `tests/MCPHub.test.js` - Hub orchestration logic
- `tests/MCPConnection.test.js` - Connection management unit tests
- `tests/http-pool.test.js` - HTTP connection pool unit tests (30 tests)
- `tests/http-pool.integration.test.js` - Connection pool integration tests (13 tests)
- `tests/MCPConnection.integration.test.js` - Transport integration tests
- `tests/config.test.js` - Configuration loading and merging
- `tests/env-resolver.test.js` - Placeholder resolution
- `tests/marketplace.test.js` - Marketplace integration
- `tests/marketplace-category-integration.test.js` - CategoryMapper-Marketplace integration (27 tests)
- `tests/cli.test.js` - CLI argument parsing
- `tests/pino-logger.test.js` - Pino logger API compatibility and SSE integration (26 tests)

**Testing Tools:**
- Vitest for test execution
- mock-fs for filesystem mocking
- nock for HTTP mocking
- supertest for API testing

### Test Suite Rewrite Project (Sprints 1-5)

Complete rewrite of the MCP Hub test suite from 22% failure rate to 100% pass rate through 5 systematic sprints.

**Sprint Outcomes:**

- **Sprint 1**: Core Test Infrastructure - 246/246 tests passing
  - Rewrote MCPHub and MCPConnection core tests
  - Established behavior-driven testing patterns
  - Created helper utilities and test factories

- **Sprint 2**: Coverage Expansion - 246/246 tests passing (maintained)
  - Enhanced core test coverage
  - Added error handling and edge case tests
  - Improved helper utilities

- **Sprint 3**: Integration Tests - 268/268 tests passing (+22 tests)
  - Added SSE transport integration tests
  - Added streamable-http transport integration tests
  - Comprehensive timeout and error handling coverage

- **Sprint 3.5**: Skipped Test Enablement - 313/313 tests passing (+45 tests)
  - Enabled and fixed all previously skipped tests
  - Added OAuth authentication test coverage
  - Enhanced MCP server endpoint tests

- **Sprint 4**: CLI and Configuration - 308/308 tests passing (refined)
  - Rewrote CLI argument parsing tests
  - Rewrote configuration loading and merging tests
  - Established process.exit mocking pattern
  - Established vi.hoisted() pattern for complex mocks

- **Sprint 5**: Quality & Documentation - 308/308 tests passing (validated)
  - Documented strategic coverage approach (82.94% branches)
  - Created comprehensive testing documentation
  - Validated CI/CD pipeline integration
  - Added test:coverage scripts to package.json

**Key Patterns Established:**

1. **Behavior-Driven Testing**: Focus on observable outcomes, not implementation
2. **AAA Pattern**: Explicit Arrange-Act-Assert structure with comments
3. **Process Mocking**: Use vi.waitFor() for async process validation
4. **Complex Mocks**: vi.hoisted() for EventEmitter/Chokidar patterns
5. **File System Isolation**: mock-fs for configuration testing
6. **Integration Testing**: Real transport testing with minimal mocking

**Project Metrics:**
- Total Tests: 308
- Pass Rate: 100%
- Coverage: 82.94% branches (exceeds 80% standard)
- Performance: <3 second execution time
- Quality Gates: 10/10 thresholds met or exceeded

## Code Patterns

### Event-Driven Architecture
The codebase heavily uses Node.js EventEmitter pattern:
- MCPHub emits: `toolsChanged`, `resourcesChanged`, `promptsChanged`, `notification`, `devServerRestarting`, `devServerRestarted`, `hubStateChanged`
- MCPConnection emits: Same capability events plus auth-related events
- DevWatcher emits: `filesChanged`

### Parallel Operations
Server connections are established in parallel using `Promise.all()`:
```javascript
const startPromises = servers.map(async ([name, config]) => {
  const connection = new MCPConnection(...);
  this.connections.set(name, connection);
  await connection.connect();
});
await Promise.allSettled(startPromises);
```

### Graceful Shutdown
Multi-phase shutdown process:
1. Disconnect all MCP servers
2. Close SSE connections
3. Stop Express server
4. Clean workspace cache
5. Handle auto-shutdown with configurable delay

### Capability Namespacing
To prevent conflicts when multiple servers provide same capability names:
```javascript
const namespacedName = `${serverName}${DELIMITER}${originalName}`;
// Example: "filesystem__search", "github__search"
```

## Important Considerations

### OAuth Flow
For remote servers requiring OAuth:
1. Hub creates callback endpoint at `/oauth/callback`
2. Opens browser with authorization URL
3. Waits for authorization code callback
4. Exchanges code for tokens via MCPHubOAuthProvider
5. Establishes authenticated connection

### Dev Mode Requirements
STDIO servers with dev mode **MUST** specify absolute `cwd` in dev config:
```json
{
  "dev": {
    "enabled": true,
    "watch": ["**/*.js"],
    "cwd": "/absolute/path/to/server"  // Required!
  }
}
```

### HTTP Connection Pooling
Undici-based connection pooling for remote servers (SSE and streamable-http):

**When to Use Global Configuration:**
```json
{
  "connectionPool": {
    "maxConnections": 50,
    "keepAliveTimeout": 60000
  },
  "mcpServers": { /* all servers inherit these settings */ }
}
```
- Consistent remote server requirements
- Standardized performance characteristics
- Centralized tuning for all MCP connections

**When to Use Per-Server Overrides:**
```json
{
  "mcpServers": {
    "high-traffic-api": {
      "connectionPool": {
        "maxConnections": 100,  // Override global
        "keepAliveTimeout": 30000
      }
    }
  }
}
```
- High-traffic servers needing more connections
- Low-latency requirements (shorter keep-alive)
- Legacy servers with connection limits

**When to Disable Pooling:**
```json
{
  "connectionPool": { "enabled": false }
}
```
- Debugging connection-related issues
- Servers that don't support persistent connections
- Development/testing environments

**Performance Implications:**
- Enabled pooling: 10-30% latency reduction for remote servers
- Default settings optimized for MCP's request-response pattern
- Connection reuse reduces TLS handshake overhead
- Monitor `maxConnections` and `maxFreeConnections` for resource usage

**Validation:**
- Configuration validated at load time via `validatePoolConfig`
- Invalid settings throw `ConfigError` with detailed messages
- STDIO servers reject connectionPool configuration (throws error)
- Only applies to SSE and streamable-http transport types

### Workspace Cache
- Location: `$XDG_STATE_HOME/mcp-hub/workspaces.json`
- Automatically cleaned when processes no longer running
- Used to prevent port conflicts across instances
- Updates broadcast via SSE to all connected clients

### MCP Request Timeout
Default timeout for MCP operations: 5 minutes
- Tool execution: 5 min
- Resource access: 5 min
- Prompt execution: 5 min

### Logging

**Two Implementations Available** (via feature flag):

**Pino Logger (Async, Opt-In)**:
```bash
ENABLE_PINO_LOGGER=true bun start
```
- 5-10x faster than legacy (on Node.js)
- Async file I/O (non-blocking event loop)
- Multistream architecture (console + file + SSE)
- Full API compatibility with legacy logger
- Status: Production-ready, opt-in via env var

**Legacy Logger (Synchronous, Default)**:
```bash
ENABLE_PINO_LOGGER=false bun start  # OR just: bun start
```
- Synchronous fs.appendFileSync() (blocks event loop)
- Simpler implementation
- Proven stability
- Status: Default, will be deprecated in future

**Logging Output**:
- Console: Structured JSON (all levels)
- File: `$XDG_STATE_HOME/mcp-hub/logs/mcp-hub.log` (XDG-compliant)
- Fallback: `~/.mcp-hub/logs/mcp-hub.log`
- SSE: Real-time log streaming to connected clients

**Log Levels**: error (0), warn (1), info (2), debug (3)

**Migration Guide**:
1. Test with `ENABLE_PINO_LOGGER=true` in development
2. Monitor for any issues (async behavior differences)
3. If stable, use Pino in production for better performance
4. Rollback: Set `ENABLE_PINO_LOGGER=false` anytime

## VS Code Compatibility

MCP Hub supports VS Code's `.vscode/mcp.json` format:
- Both `mcpServers` and `servers` keys
- `${env:VAR}` and `${input:VAR}` syntax
- Predefined variables: `${workspaceFolder}`, `${userHome}`, `${/}`
- Input variables via `MCP_HUB_ENV` environment variable

## Marketplace Integration

Uses [MCP Registry](https://github.com/ollieb89/mcp-registry) system:
- Registry hosted on GitHub Pages
- README documentation fetched directly from repositories
- Comprehensive metadata: stars, categories, installation instructions
- 1-hour cache TTL
- Automatic fallback to curl when fetch fails

## Automatic Categorization System

**New Feature**: Intelligent, automatic server categorization with three-tier matching strategy.

### Overview

The Automatic Categorization System enriches marketplace server data with relevant categories during fetch operations. Categories help users discover and filter servers, improving the browsing experience.

**Architecture Components:**
- **CategoryMapper** (`src/services/CategoryMapper.js`): Three-tier matching engine
- **CategoryService** (`src/services/CategoryService.js`): Caching and statistics layer
- **Category Definitions** (`src/utils/category-definitions.js`): Standard categories with patterns/keywords
- **Marketplace Integration** (`src/marketplace.js`): On-fetch enrichment

**Integration Strategy**: On-fetch enrichment (categorization during `getCatalog()` and `getServerDetails()`)

### Three-Tier Matching Strategy

**CategoryMapper** uses intelligent fallback across three tiers:

1. **Tier 1: Pattern Matching (71.4% success rate)**
   - Regex patterns matched against server names
   - Fast, deterministic matching
   - Example: `/^github$/i`, `/^.*filesystem.*$/i`

2. **Tier 2: Keyword Matching (21.4% success rate)**
   - Keywords matched against server description + tool names
   - Fuzzy matching with contextual relevance
   - Example keywords: `['github', 'repository', 'pull request']`

3. **Tier 3: LLM Fallback (7.1% success rate, optional)**
   - Gemini/OpenAI/Anthropic for complex cases
   - Disabled by default (conservative approach)
   - Configuration: `llmCategorization.enabled = true`

**Fallback**: If all tiers fail, server assigned `'other'` category

### Standard Categories

10 standard categories defined in `src/utils/category-definitions.js`:

| Category | Description | Icon | Color |
|----------|-------------|------|-------|
| `github` | GitHub operations (repos, issues, PRs) | GitHubIcon | #00CEC9 |
| `filesystem` | File reading/writing operations | FolderIcon | #FFA502 |
| `web` | Web browsing, URL fetching | LanguageIcon | #0984E3 |
| `docker` | Container management | StorageIcon | #2D98DA |
| `git` | Local git operations | GitIcon | #F39C12 |
| `python` | Python environment management | CodeIcon | #3776AB |
| `database` | Database queries | StorageIcon | #E84393 |
| `memory` | Knowledge graph management | PsychologyIcon | #A29BFE |
| `vertex_ai` | AI-assisted development | SmartToyIcon | #6C5CE7 |
| `meta` | Hub internal tools (always available) | SettingsIcon | #74B9FF |

**Other Category**: `'other'` assigned for uncategorized servers (fallback)

### Two-Tier Caching

**Memory Cache** (CategoryMapper):
- Session-lifetime cache for categorization results
- Fast lookups (<5ms for cached servers)
- Cleared on Hub restart

**Persistent Cache** (CategoryService):
- XDG-compliant location: `$XDG_STATE_HOME/mcp-hub/category-cache.json`
- Survives Hub restarts
- 30-day TTL per category
- Automatic cleanup of expired entries

**Cache Coordination**:
- Independent caches (no conflicts)
- Memory cache checked first (fastest)
- Persistent cache checked second (cross-session)
- Categorization performed last (slowest)

### Performance Characteristics

**Categorization Performance**:
- Single server (cache miss): <50ms
- Single server (cache hit): <5ms
- Batch (50 servers): ~500ms cold, ~50ms warm
- Parallel execution via `Promise.all()` for batch operations

**Memory Usage**:
- CategoryMapper: ~1-2 MB per 1000 servers
- Persistent cache: ~50 KB for typical registry

**Statistics Tracking**:
- Total categorization requests
- Tier-by-tier success rates (pattern/keyword/LLM)
- Cache hit rates (memory/persistent/miss)
- Average categorization time

### Marketplace Integration

**Initialization** (`src/server.js` lines 122-137):
```javascript
// Initialize CategoryMapper for automatic server categorization
logger.info("Initializing CategoryMapper");
const { CategoryMapper } = await import('./services/CategoryMapper.js');
const categoryMapper = new CategoryMapper({
  enableLLM: false,              // Conservative: no LLM by default
  enableCache: true,             // Enable memory cache for performance
  enablePersistentCache: true,   // Enable cross-session persistent cache
  logger
});
logger.info("CategoryMapper initialized");

// Initialize marketplace with CategoryMapper
marketplace = getMarketplace({ categoryMapper });
await marketplace.initialize();
```

**Enrichment Flow**:
1. Client calls `marketplace.getCatalog()` or `marketplace.getServerDetails(id)`
2. Marketplace fetches servers from registry (with 1-hour cache)
3. Marketplace calls `enrichWithCategories(servers)` for batch categorization
4. CategoryMapper categorizes using three-tier strategy
5. Marketplace returns servers with `category` field added
6. Client receives enriched server data

**API Response Structure** (backward compatible):
```json
{
  "id": "filesystem",
  "name": "filesystem",
  "description": "File system operations",
  "url": "https://github.com/example/filesystem",
  "tools": [{"name": "read_file"}, {"name": "write_file"}],
  "category": "filesystem"  // NEW: automatically assigned
}
```

### Configuration

**CategoryMapper Configuration** (`src/server.js`):
```javascript
const categoryMapper = new CategoryMapper({
  enableLLM: false,              // Enable LLM fallback (Tier 3)
  enableCache: true,             // Enable memory cache
  enablePersistentCache: true,   // Enable persistent cache
  logger                         // Logger instance
});
```

**LLM Configuration** (if `enableLLM: true`):
Set environment variables for your chosen provider:
```bash
# Gemini (recommended)
export GEMINI_API_KEY="your-key"

# OR OpenAI
export OPENAI_API_KEY="your-key"

# OR Anthropic
export ANTHROPIC_API_KEY="your-key"
```

**Provider Priority**: Gemini → OpenAI → Anthropic (first configured provider used)

### Error Handling

**Graceful Degradation**: Categorization errors never break marketplace functionality

**Error Scenarios**:
1. **CategoryMapper unavailable**: All servers assigned `'other'`
2. **Categorization fails**: Server assigned `'other'`, warning logged
3. **LLM failure**: Fallback to `'other'`, detailed error logged
4. **Partial batch failure**: Failed servers assigned `'other'`, successful continue

**Logging**:
- Warnings for categorization failures (includes error context)
- Info logs for successful batch operations
- Debug logs for performance metrics

### Backward Compatibility

**Maintained Compatibility**:
- Old constructor: `new Marketplace({ ttl: 3600000 })` still works
- New constructor: `new Marketplace({ ttl, logger, categoryMapper })` preferred
- Factory function: `getMarketplace()` supports both signatures
- API response: `category` field added, all existing fields preserved

**Migration**:
- No breaking changes in API contracts
- Category field always present (defaults to `'other'`)
- Clients can ignore `category` field if not needed

### Testing

**Integration Tests** (`tests/marketplace-category-integration.test.js`):
- 27 tests across 7 test suites
- 100% pass rate
- Coverage: Category enrichment, error handling, cache coordination, performance, backward compatibility

**Test Suites**:
1. Category Enrichment (8 tests)
2. Error Handling (5 tests)
3. Cache Coordination (4 tests)
4. Performance Benchmarking (3 tests)
5. Backward Compatibility (3 tests)
6. getCatalog Integration (2 tests)
7. getServerDetails Integration (2 tests)

### Statistics API

**Get Statistics** (via CategoryService):
```javascript
const stats = categoryService.getStatistics();
// Returns:
{
  totalRequests: 1523,
  tierSuccessRates: {
    pattern: 71.4,    // Tier 1 success %
    keyword: 21.4,    // Tier 2 success %
    llm: 7.1          // Tier 3 success % (if enabled)
  },
  cacheHitRates: {
    memory: 89.2,     // Memory cache hit %
    persistent: 8.3,  // Persistent cache hit %
    miss: 2.5         // Cache miss %
  },
  averageTime: 12.5   // Average categorization time (ms)
}
```

**Statistics Interpretation**:
- **High pattern success rate (>70%)**: Well-defined server naming conventions
- **High keyword success rate (>20%)**: Good description quality
- **High cache hit rate (>85%)**: Effective caching, stable registry
- **Low average time (<20ms)**: Optimal performance

### Troubleshooting

**Issue**: All servers categorized as `'other'`
- **Cause**: CategoryMapper not initialized or categorization failing
- **Fix**: Check logs for initialization errors, verify CategoryMapper constructor

**Issue**: Slow categorization performance (>100ms per server)
- **Cause**: Cache not working or LLM enabled without need
- **Fix**: Verify `enableCache: true`, disable LLM if not needed

**Issue**: Inconsistent categories across sessions
- **Cause**: Persistent cache disabled or corrupted
- **Fix**: Enable `enablePersistentCache: true`, delete cache file to rebuild

**Issue**: LLM categorization not working
- **Cause**: API key not configured or provider unavailable
- **Fix**: Set environment variable (GEMINI_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY)

**Debug Logging**:
```bash
DEBUG=mcp-hub:* bun start
# Shows detailed categorization flow and tier decisions
```

## Category API Endpoints

MCP Hub provides three REST API endpoints for category metadata management. These endpoints expose CategoryService functionality for UI integration and external consumers.

### Endpoint Overview

All endpoints are prefixed with `/api/categories` and return JSON responses with timestamps.

**Important**: Route registration order matters - `/categories/stats` must be registered BEFORE `/categories/:id` to avoid route conflicts (Express matches `:id` as a catch-all).

### GET /api/categories

List all standard categories with optional sorting and field filtering.

**Query Parameters:**
- `sort` (optional): Sort field - `name`, `id`, or `color`
- `fields` (optional): Comma-separated list of fields to return (e.g., `id,name,color`)

**Response:**
```json
{
  "categories": [
    {
      "id": "github",
      "name": "GitHub",
      "description": "GitHub operations (repos, issues, PRs)",
      "color": "#00CEC9",
      "icon": "GitHubIcon",
      "patterns": ["/^github$/i", "/^.*github.*$/i"],
      "keywords": ["github", "repository", "pull request"]
    }
  ],
  "count": 10,
  "timestamp": "2025-11-05T12:34:56.789Z"
}
```

**Examples:**
```bash
# Get all categories
curl http://localhost:7000/api/categories

# Sort by name
curl http://localhost:7000/api/categories?sort=name

# Return only id and name fields
curl http://localhost:7000/api/categories?fields=id,name
```

**Error Responses:**
- `400 Bad Request`: Invalid sort field
```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_ERROR",
  "message": "Invalid sort field. Must be one of: name, id, color",
  "timestamp": "2025-11-05T12:34:56.789Z",
  "details": { "sort": "invalid_field" }
}
```

### GET /api/categories/:id

Get detailed metadata for a single category by ID.

**Path Parameters:**
- `id` (required): Category identifier (github, filesystem, web, etc.)

**Response:**
```json
{
  "category": {
    "id": "github",
    "name": "GitHub",
    "description": "GitHub operations (repos, issues, PRs)",
    "color": "#00CEC9",
    "icon": "GitHubIcon",
    "patterns": ["/^github$/i", "/^.*github.*$/i"],
    "keywords": ["github", "repository", "pull request"]
  },
  "timestamp": "2025-11-05T12:34:56.789Z"
}
```

**Examples:**
```bash
# Get GitHub category details
curl http://localhost:7000/api/categories/github

# Get filesystem category details
curl http://localhost:7000/api/categories/filesystem
```

**Error Responses:**
- `400 Bad Request`: Category not found
```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_ERROR",
  "message": "Category not found",
  "timestamp": "2025-11-05T12:34:56.789Z",
  "details": {
    "categoryId": "invalid",
    "availableCategories": ["github", "filesystem", "web", "docker", "git", "python", "database", "memory", "vertex_ai", "meta"]
  }
}
```

### GET /api/categories/stats

Get comprehensive CategoryService statistics and health information.

**Response:**
```json
{
  "statistics": {
    "totalCategories": 10,
    "categoryIds": ["github", "filesystem", "web", "docker", "git", "python", "database", "memory", "vertex_ai", "meta"],
    "categoryRetrieval": 1523,
    "validationCalls": 245,
    "validationFailures": 12,
    "validationSuccessRate": 0.951,
    "cacheEnabled": true,
    "cacheHits": 1356,
    "cacheMisses": 167,
    "cacheHitRate": 0.890,
    "cacheSize": 10,
    "lastCacheUpdate": 1730812496789,
    "hasPatterns": 10,
    "hasKeywords": 10,
    "health": {
      "status": "healthy",
      "timestamp": "2025-11-05T12:34:56.789Z",
      "categories": {
        "total": 10,
        "loaded": true
      },
      "cache": {
        "enabled": true,
        "size": 10,
        "hitRate": 0.890,
        "valid": true
      },
      "operations": {
        "totalRetrieval": 1523,
        "totalValidation": 245,
        "validationSuccessRate": 0.951
      }
    }
  },
  "timestamp": "2025-11-05T12:34:56.789Z"
}
```

**Examples:**
```bash
# Get category statistics
curl http://localhost:7000/api/categories/stats
```

**Statistics Interpretation:**
- **High cache hit rate (>85%)**: Effective caching, stable registry
- **High validation success rate (>90%)**: Good category ID usage
- **Cache valid: true**: Cache within TTL (1 hour), no refresh needed

### Implementation Details

**Route Registration Order** (`src/server.js:528-582`):
```javascript
// IMPORTANT: Register /stats BEFORE /:id to avoid route conflicts
registerRoute("GET", "/categories/stats", ...);
registerRoute("GET", "/categories/:id", ...);
```

**CategoryService Integration** (`src/server.js:123-131`):
```javascript
const { CategoryService } = await import('./services/CategoryService.js');
categoryService = new CategoryService({
  enableCache: true,
  cacheTTL: 3600000, // 1 hour
  logger
});
```

**Error Handling:**
- ValidationError → 400 status code
- CategoryService errors wrapped with wrapError()
- Consistent error response format across all endpoints

**Testing:**
- Test file: `tests/category-api.test.js`
- Coverage: 45 tests (15 for list, 17 for single, 10 for stats, 3 integration)
- Status: 45/45 passing (100%)
- Performance: All endpoints < 20ms response time

**Common Use Cases:**
1. **UI Category Filter**: GET /api/categories → populate dropdown
2. **Category Validation**: GET /api/categories/:id → verify category exists
3. **Admin Dashboard**: GET /api/categories/stats → monitor service health
4. **Category Details Display**: GET /api/categories/:id → show full metadata

## File Organization

```
src/
├── MCPHub.js              # Main hub orchestrator
├── MCPConnection.js       # Individual server connections
├── server.js              # Express app & ServiceManager
├── marketplace.js         # Marketplace integration
├── mcp/
│   └── server.js         # Unified MCP server endpoint
├── services/
│   ├── CategoryMapper.js # Three-tier categorization engine
│   └── CategoryService.js # Caching and statistics layer
└── utils/
    ├── cli.js            # CLI argument parsing
    ├── config.js         # Configuration management
    ├── env-resolver.js   # Placeholder resolution
    ├── errors.js         # Error classes
    ├── logger.js         # Structured logging
    ├── oauth-provider.js # OAuth authentication
    ├── router.js         # Express routing
    ├── sse-manager.js    # Server-Sent Events
    ├── workspace-cache.js # Workspace tracking
    ├── dev-watcher.js    # Dev mode file watching
    ├── xdg-paths.js      # XDG directory handling
    └── category-definitions.js # Standard categories with patterns/keywords

tests/                     # Vitest test files
scripts/
├── build.js              # esbuild configuration
└── release.sh            # Version bump & git tagging
```

## Common Development Workflows

### Adding New Server Configuration Options
1. Update config schema validation in `src/utils/config.js`
2. Handle in `MCPConnection` constructor
3. Add environment resolution if needed in `EnvResolver`
4. Add tests in `tests/config.test.js`

### Adding New API Endpoints
1. Define route in `src/utils/router.js` using `registerRoute()`
2. Add request validation
3. Handle errors with custom error classes
4. Return JSON with timestamp
5. Add tests using supertest

### Adding New Event Types
1. Add event type constant to `src/utils/sse-manager.js` EventTypes
2. Emit from appropriate component
3. Add SSE broadcast in ServiceManager
4. Update documentation in README

### Debugging Connection Issues
1. Check logs in `$XDG_STATE_HOME/mcp-hub/logs/mcp-hub.log`
2. Verify environment resolution with debug logs
3. Test transport independently (STDIO vs SSE vs streamable-http)
4. Check OAuth callback flow for remote servers
5. Verify workspace cache for port conflicts

**Common Connection Issues:**
- `TypeError: fetch failed` → Hub not running, start with `npm start`
- `Connection refused` → Port 7000 not listening, check port conflicts
- `404 Not Found` → Wrong endpoint, use `/mcp` not `/messages`
- Connection timeout → Firewall/network issue, try `127.0.0.1`

See comprehensive troubleshooting guide: `claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md`
