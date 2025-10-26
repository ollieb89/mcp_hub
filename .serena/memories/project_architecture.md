# MCP Hub - Project Architecture

## High-Level Purpose
MCP Hub is a central coordinator for MCP (Model Context Protocol) servers that provides:
1. Management interface for multiple MCP servers
2. Single unified MCP endpoint for all clients

## Core Architecture Pattern

### Three-Layer Design
```
┌─────────────────────────────────────┐
│   MCP Clients (Claude Desktop, etc) │
│   Connect to: /mcp endpoint         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   MCP Hub (ServiceManager)          │
│   - MCPServerEndpoint (/mcp)        │
│   - REST API (/api/*)               │
│   - SSE Events (/api/events)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   MCPHub (Orchestrator)             │
│   - Manages MCPConnection instances │
│   - Config watching & hot-reload    │
│   - Event coordination              │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼──────┐   ┌─────▼──────┐
│ MCP Server │   │ MCP Server │
│ (STDIO)    │   │ (Remote)   │
└────────────┘   └────────────┘
```

## Key Components

### ServiceManager (src/server.js)
- Application lifecycle coordinator
- Hub state management: starting → ready → restarting → stopped
- SSE connection management
- Workspace cache coordination
- Auto-shutdown handling

### MCPHub (src/MCPHub.js)
- Orchestrates multiple MCPConnection instances
- Configuration file watching and hot-reload
- Parallel server startup/shutdown
- Event aggregation and forwarding

### MCPConnection (src/MCPConnection.js)
- Individual server connection wrapper
- Transport abstraction (STDIO, SSE, streamable-http)
- OAuth authentication flow
- Dev mode with file watching
- Capability caching (tools, resources, prompts, templates)

### MCPServerEndpoint (src/mcp/server.js)
- Creates unified MCP server at `/mcp`
- Namespaces capabilities: `servername__toolname`
- Routes requests to appropriate underlying server
- Real-time capability sync on server changes

## Transport Layer

### STDIO Transport
- Spawns local Node.js/Python/other processes
- Environment variable injection with placeholder resolution
- Dev mode: watches files and auto-restarts
- Use case: Local development servers

### SSE Transport
- Connects to remote servers via Server-Sent Events
- ReconnectingEventSource for reliability
- Header-based authentication
- Use case: Remote HTTP-based MCP servers

### streamable-http Transport
- HTTP streaming with OAuth 2.0 PKCE
- Browser-based authorization flow
- Token management via MCPHubOAuthProvider
- Use case: Services requiring OAuth (GitHub, etc.)

## Configuration System

### Multi-File Merging
```javascript
// Load order determines priority (later overrides earlier)
--config ~/.config/mcphub/global.json 
--config ./.mcphub/project.json
```

### Environment Resolution Pipeline
```
1. Predefined vars (${workspaceFolder}, ${userHome})
2. process.env
3. MCP_HUB_ENV global JSON
4. Server-specific env
5. Placeholder resolution (${VAR}, ${cmd: ...})
```

### VS Code Compatibility
- Supports `servers` and `mcpServers` keys
- Predefined variables: `${workspaceFolder}`, `${/}`, etc.
- Input variables via MCP_HUB_ENV

## Event-Driven Architecture

### Event Flow
```
MCPConnection 
  └─> emits: toolsChanged, resourcesChanged, promptsChanged
       │
       ▼
    MCPHub 
      └─> forwards to ServiceManager
           │
           ▼
        SSEManager 
          └─> broadcasts to all connected clients
               │
               ▼
            MCP Clients receive real-time updates
```

### Hub State Events
- `starting`: Initial startup
- `ready`: Fully operational
- `restarting`: Config reload in progress
- `restarted`: Reload complete
- `stopping`: Shutdown initiated
- `stopped`: Fully shut down
- `error`: Error state with details

## Workspace Management

### Global Cache System
- Location: `$XDG_STATE_HOME/mcp-hub/workspaces.json`
- Tracks all active MCP Hub instances across directories
- Prevents port conflicts
- Real-time state updates via SSE
- Automatic cleanup of stale entries

### State Tracking
Each workspace tracks:
- Working directory (cwd)
- Config files loaded
- Process ID (pid)
- Port number
- Start time
- Current state
- Active connections
- Shutdown status

## Capability Namespacing

### Problem
Multiple servers may provide tools with same names (e.g., "search")

### Solution
Namespace with server name:
```javascript
// Original: "search" from filesystem server
// Namespaced: "filesystem__search"

// Original: "search" from github server  
// Namespaced: "github__search"
```

### Implementation
- Delimiter: `__` (double underscore)
- Applied to: tools, resources, prompts
- Routing: MCPServerEndpoint extracts server name and routes

## Error Handling Strategy

### Custom Error Classes
- ConfigError: Configuration issues
- ConnectionError: Server connection failures
- ServerError: Server startup problems
- ToolError: Tool execution failures
- ResourceError: Resource access issues
- ValidationError: Request validation

### Error Propagation
```
MCPConnection error
  └─> wrapped with wrapError()
       └─> logged via logger
            └─> broadcast via SSE
                 └─> HTTP response with appropriate status code
```

## Development Patterns

### Parallel Operations
- Server startup: Promise.allSettled() for all servers
- Independent API calls executed in parallel
- Graceful handling of individual failures

### Graceful Shutdown
1. Set state to 'stopping'
2. Disconnect all MCP servers
3. Close SSE connections  
4. Stop Express server
5. Clean workspace cache
6. Exit process

### Dev Mode (Hot Reload)
1. DevWatcher monitors files matching patterns
2. On change: emit filesChanged event
3. MCPConnection receives event
4. Gracefully disconnect server
5. Restart with new code
6. Emit devServerRestarted

## Logging System

### Structured JSON Logging
- Console output (all levels)
- File output: `$XDG_STATE_HOME/mcp-hub/logs/mcp-hub.log`
- Daily rotation, 30-day retention
- Integration with SSEManager for real-time log events

### Log Levels
- info: Normal operations
- warn: Warning conditions
- debug: Detailed information (includes config changes)
- error: Error conditions with code and stack trace

## Testing Architecture

### Test Categories
1. Unit tests: Individual component behavior
2. Integration tests: Transport layer functionality
3. Config tests: Merging and validation
4. CLI tests: Argument parsing

### Coverage Requirements
- 80% threshold for: branches, functions, lines, statements
- Vitest as test runner
- mock-fs for filesystem operations
- nock for HTTP mocking
- supertest for API testing
