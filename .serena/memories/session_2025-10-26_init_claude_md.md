# Session: CLAUDE.md Creation for MCP Hub

## Date
2025-10-26

## Task Completed
Created comprehensive CLAUDE.md file for the mcp-hub repository to guide future Claude Code instances.

## Key Discoveries

### Project Architecture Understanding
1. **Dual Interface Design**
   - Management Interface (`/api/*`): REST API for server management
   - MCP Server Interface (`/mcp`): Single unified endpoint for all MCP clients
   - Allows clients to connect once and access all server capabilities

2. **Core Components**
   - **MCPHub**: Central orchestrator managing multiple MCP servers
   - **MCPConnection**: Individual server connection handler (STDIO, SSE, streamable-http)
   - **ServiceManager**: Application lifecycle and state management
   - **MCPServerEndpoint**: Unified MCP server with capability namespacing

3. **Transport Types**
   - STDIO: Local script-based servers with process spawning
   - SSE: Remote servers with Server-Sent Events
   - streamable-http: Remote servers with OAuth 2.0 PKCE flow

4. **Key Utilities**
   - **EnvResolver**: Universal placeholder resolution (${VAR}, ${cmd:}, ${env:})
   - **SSEManager**: Real-time event broadcasting to clients
   - **WorkspaceCacheManager**: Global workspace tracking across instances
   - **DevWatcher**: Hot-reload for STDIO servers in dev mode

### Configuration System
- Supports multiple config files merged in order
- VS Code compatibility (`servers` key, predefined variables)
- JSON5 support (comments, trailing commas)
- Environment variable resolution with MCP_HUB_ENV global injection
- File watching with intelligent change detection

### Development Patterns
- Event-driven architecture using Node.js EventEmitter
- Parallel server connection establishment with Promise.allSettled()
- Graceful multi-phase shutdown with configurable delays
- Capability namespacing to prevent conflicts (e.g., `filesystem__search`)

### Testing Setup
- Vitest for test execution with 80% coverage thresholds
- Tests in `tests/**/*.test.js`
- Integration tests for transport types
- Mock-fs, nock, and supertest for testing

### File Structure
```
src/
├── MCPHub.js - Main orchestrator
├── MCPConnection.js - Server connections
├── server.js - Express app & ServiceManager
├── mcp/server.js - Unified MCP endpoint
└── utils/ - Core utilities (config, env-resolver, sse-manager, etc.)
```

## Files Modified
- Created: `/home/ob/Development/Tools/mcp-hub/CLAUDE.md`

## Documentation Created
Comprehensive CLAUDE.md covering:
- Development commands (build, test, release)
- Architecture overview with component details
- Configuration system with examples
- Code patterns and important considerations
- Common development workflows
- Testing strategy
- OAuth flow details
- Workspace cache mechanism

## Notes for Future Sessions
- Project uses ESM modules (type: "module" in package.json)
- Node.js >= 18.0.0 required
- XDG-compliant paths for state and logs
- MCP specification 2025-03-26 implementation
- Marketplace integration via mcp-registry
- Dev mode requires absolute cwd path in config

## Session Statistics
- Files read: ~15 (README, package.json, core source files)
- Lines of code analyzed: ~2900+ lines
- Key patterns identified: Event-driven, parallel ops, graceful shutdown
- Documentation created: 1 comprehensive CLAUDE.md file
