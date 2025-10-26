# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Hub is a central coordinator for MCP (Model Context Protocol) servers, providing two key interfaces:
1. **Management Interface** (`/api/*`): REST API and web UI to manage multiple MCP servers
2. **MCP Server Interface** (`/mcp`): Single endpoint for ANY MCP client to access ALL server capabilities

The architecture enables users to manage MCP servers through the Hub's UI while MCP clients (Claude Desktop, Cline, etc.) connect to one endpoint to access all capabilities. Implements MCP specification 2025-03-26.

## Development Commands

### Build & Run
```bash
# Development start with config file
npm start

# Clean build artifacts
npm run clean

# Build for production (creates dist/cli.js)
npm run build

# Build includes prebuild (clean) and postbuild (chmod +x)
```

### Testing
```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Coverage thresholds: 80% for branches, functions, lines, statements
# Tests located in: tests/**/*.test.js
```

### Release Process
```bash
# Patch version (bug fixes)
npm run release:patch

# Minor version (new features)
npm run release:minor

# Major version (breaking changes)
npm run release:major
```

### Other Commands
```bash
# Update marketplace data
npm run update-data
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
      "headers": { "Authorization": "Bearer ${TOKEN}" }
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

3. **streamable-http**: Remote servers with HTTP streaming
   - OAuth 2.0 with PKCE flow
   - Authorization code handling via callback endpoint

## Testing Strategy

**Test Files:**
- `tests/MCPHub.test.js` - Hub orchestration logic
- `tests/MCPConnection.test.js` - Connection management unit tests
- `tests/MCPConnection.integration.test.js` - Transport integration tests
- `tests/config.test.js` - Configuration loading and merging
- `tests/env-resolver.test.js` - Placeholder resolution
- `tests/marketplace.test.js` - Marketplace integration
- `tests/cli.test.js` - CLI argument parsing

**Testing Tools:**
- Vitest for test execution
- mock-fs for filesystem mocking
- nock for HTTP mocking
- supertest for API testing

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
Structured JSON logging to:
- Console (all levels)
- File: `$XDG_STATE_HOME/mcp-hub/logs/mcp-hub.log` (XDG-compliant)
- Fallback: `~/.mcp-hub/logs/mcp-hub.log`
- Rotation: Daily, 30-day retention
- Integrated with SSEManager for real-time log events

## VS Code Compatibility

MCP Hub supports VS Code's `.vscode/mcp.json` format:
- Both `mcpServers` and `servers` keys
- `${env:VAR}` and `${input:VAR}` syntax
- Predefined variables: `${workspaceFolder}`, `${userHome}`, `${/}`
- Input variables via `MCP_HUB_ENV` environment variable

## Marketplace Integration

Uses [MCP Registry](https://github.com/ravitemer/mcp-registry) system:
- Registry hosted on GitHub Pages
- README documentation fetched directly from repositories
- Comprehensive metadata: stars, categories, installation instructions
- 1-hour cache TTL
- Automatic fallback to curl when fetch fails

## File Organization

```
src/
├── MCPHub.js              # Main hub orchestrator
├── MCPConnection.js       # Individual server connections
├── server.js              # Express app & ServiceManager
├── marketplace.js         # Marketplace integration
├── mcp/
│   └── server.js         # Unified MCP server endpoint
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
    └── xdg-paths.js      # XDG directory handling

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
