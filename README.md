# MCP Hub 

[![npm version](https://badge.fury.io/js/mcp-hub.svg)](https://www.npmjs.com/package/mcp-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> **Current Status**: MCP Hub v4.2.1 is production-ready with 308+ tests (100% pass rate), 82.94% branch coverage, and zero critical bugs. The project is actively maintained with regular updates.

**Quick Links**: [Installation](#installation) · [Configuration](#configuration) · [REST API](#rest-api) · [Testing](#testing) · [Roadmap](#roadmap) · [Contributing](./CONTRIBUTING.md)

MCP Hub acts as a central coordinator for MCP servers and clients, providing two key interfaces:

1. **Management Interface** (/api/*): Manage multiple MCP servers through a unified REST API and web UI
2. **MCP Server Interface** (/mcp): Connect ANY MCP client to access ALL server capabilities through a single endpoint

This dual-interface approach means you can manage servers through the Hub's UI while MCP clients (Claude Desktop, Cline, etc.) only need to connect to one endpoint (`localhost:37373/mcp`) to access all capabilities. Implements [MCP 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26) specification.

## Recent Highlights

### 🎉 What's New in v4.2.x

- **VS Code Configuration Compatibility** (v4.2.0): Full support for `.vscode/mcp.json` files with VS Code-style variable syntax (`${env:}`, `${workspaceFolder}`, etc.) - seamless migration from VS Code
- **Enhanced Workspace Management** (v4.1.x): Real-time workspace lifecycle tracking with detailed state management and SSE event streaming
- **Multiple Configuration Files** (v4.1.0): Support for layered configuration with intelligent merging (e.g., global + project configs)
- **Improved Stability** (v4.2.1): Enhanced workspace cache locking to prevent deadlocks and improved error handling
- **LLM SDK Upgrade**: Migration to official OpenAI and Anthropic SDKs with automatic retries, typed errors, and better observability

### 🚀 Production-Ready Quality

- **100% Test Pass Rate**: 308+ tests all passing with strategic 82.94% branch coverage
- **Zero Critical Bugs**: All production issues resolved and actively monitored
- **96%+ ESLint Compliance**: Clean, maintainable codebase following best practices
- **Zero Memory Leaks**: Comprehensive resource cleanup with idempotent patterns
- **Enterprise Features**: HTTP connection pooling, tool filtering, workspace management, and real-time event streaming

## Feature Support & Maturity

### Production Readiness

| Component | Status | Maturity | Notes |
|-----------|--------|----------|-------|
| Core Server | ✅ Stable | Production | Zero critical bugs, comprehensive error handling |
| STDIO Transport | ✅ Stable | Production | Battle-tested with dev mode hot-reload |
| SSE Transport | ✅ Stable | Production | Reliable with automatic reconnection |
| streamable-http | ✅ Stable | Production | Primary transport for remote servers |
| OAuth 2.0 (PKCE) | ✅ Stable | Production | Full authentication flow support |
| Tool Filtering | ✅ Stable | Production | Reduces token usage by 60-85% |
| HTTP Connection Pool | ✅ Stable | Production | 10-30% latency improvement |
| Workspace Management | ✅ Stable | Production | Multi-instance coordination |
| Real-time Events (SSE) | ✅ Stable | Production | Event batching with deduplication |
| Marketplace Integration | ✅ Stable | Production | MCP Registry with 1-hour cache |
| VS Code Compatibility | ✅ Stable | Production | Full `.vscode/mcp.json` support |
| Configuration System | ✅ Stable | Production | Multi-file, VS Code compatible |
| Web UI | 🚧 Planned | Future | In development roadmap |
| TUI | 🚧 Planned | Future | Inspired by mcphub.nvim |

### Feature Coverage

| Category | Feature | Support | Notes |
|----------|---------|---------|-------|
| **Transport** ||||
| | streamable-http | ✅ | Primary transport protocol for remote servers |
| | SSE | ✅ | Fallback transport for remote servers |
| | STDIO | ✅ | For running local servers |
| **Authentication** ||||
| | OAuth 2.0 | ✅ | With PKCE flow |
| | Headers | ✅ | For API keys/tokens |
| **Capabilities** ||||
| | Tools | ✅ | List tools |
| | 🔔 Tool List Changed | ✅ | Real-time updates |
| | Resources | ✅ | Full support |
| | 🔔 Resource List Changed | ✅ | Real-time updates |
| | Resource Templates | ✅ | URI templates |
| | Prompts | ✅ | Full support |
| | 🔔 Prompts List Changed | ✅ | Real-time updates |
| | Roots | ❌ | Not supported |
| | Sampling | ❌ | Not supported |
| | Completion | ❌ | Not supported |
| **Marketplace** ||||
| | Server Discovery | ✅ | Browse available servers |
| | Installation | ✅ | Auto configuration |
| **Real-time** ||||
| | Status Updates | ✅ | Server & connection state |
| | Capability Updates | ✅ | Automatic refresh |
| | Event Streaming to clients | ✅ | SSE-based |
| | Auto Reconnection | ✅ | With backoff |
| **Development** ||||
| | Hot Reload | ✅ | Auto restart a MCP server on file changes with `dev` mode |
| **Configuration** ||||
| | `${}` Syntax | ✅ | Environment variables and command execution across all fields |
| | VS Code Compatibility | ✅ | Support for `servers` key, `${env:}`, `${input:}`, predefined variables |
| | JSON5 Support | ✅ | Comments and trailing commas in configuration files |

## Simplified Client Configuration

Configure all MCP clients with just one endpoint:
```json
{
    "mcpServers" : {
        "Hub": {
            "url" : "http://localhost:7000/mcp"  
        }
    }
}
```

The Hub automatically:
- Namespaces capabilities to prevent conflicts (e.g., `filesystem__search` vs `database__search`)
- Routes requests to the appropriate server
- Updates capabilities in real-time when servers are added/removed
- Handles authentication and connection management

## Key Features

- **Unified MCP Server Endpoint** (/mcp):
  - Single endpoint for ALL MCP clients to connect to
  - Access capabilities from all managed servers through one connection
  - Automatic namespacing prevents conflicts between servers
  - Real-time capability updates when servers change
  - Simplified client configuration - just one endpoint instead of many

- **🆕 Intelligent Prompt-Based Tool Filtering**:
  - Zero-default tool exposure - clients start with only meta-tools
  - LLM-powered intent analysis using Gemini
  - Dynamic tool exposure based on user prompts
  - Per-client session isolation
  - Context-aware tool selection
  - See [Prompt-Based Filtering Guide](./claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md)

- **Dynamic Server Management**:
  - Start, stop, enable/disable servers on demand
  - Real-time configuration updates with automatic server reconnection
  - Support for local (STDIO) and remote (streamable-http/SSE) MCP servers 
  - Health monitoring and automatic recovery
  - OAuth authentication with PKCE flow
  - Header-based token authentication

- **Unified REST API**:
  - Execute tools from any connected server
  - Access resources and resource templates
  - Real-time status updates via Server-Sent Events (SSE)
  - Full CRUD operations for server management

- **Real-time Events & Monitoring**:
  - Live server status and capability updates
  - Client connection tracking
  - Tool and resource list change notifications
  - Structured JSON logging with file output

- **Client Connection Management**:
  - Simple SSE-based client connections via /api/events
  - Automatic connection cleanup on disconnect
  - Optional auto-shutdown when no clients connected
  - Real-time connection state monitoring

- **Process Lifecycle Management**:
  - Graceful startup and shutdown handling
  - Proper cleanup of server connections
  - Error recovery and reconnection

- **Workspace Management**:
  - Track active MCP Hub instances across different working directories
  - Global workspace cache in XDG-compliant state directory
  - Real-time workspace updates via SSE events
  - API endpoints to list and monitor active workspaces

### Components

#### Hub Server
The main management server that:
- Maintains connections to multiple MCP servers
- Provides unified API access to server capabilities
- Handles server lifecycle and health monitoring
- Manages SSE client connections and events
- Processes configuration updates and server reconnection

#### MCP Servers
Connected services that:
- Provide tools, resources, templates, and prompts
- Support two connectivity modes:
  - Script-based STDIO servers for local operations
  - Remote servers (streamable-http/SSE) with OAuth support
- Implement real-time capability updates
- Support automatic status recovery
- Maintain consistent interface across transport types

## Installation

### Using Bun (Recommended)

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Install MCP Hub globally
bun install -g mcp-hub
```

### Using npm

```bash
npm install -g mcp-hub
```

## Basic Usage

Start the hub server:

```bash
mcp-hub --port 3000 --config path/to/config.json

# Or with multiple config files (merged in order)
mcp-hub --port 3000 --config ~/.config/mcphub/global.json --config ./.mcphub/project.json
```

### CLI Options
```bash
Options:
  --port            Port to run the server on (required)
  --config          Path to config file(s). Can be specified multiple times. Merged in order. (required)
  --watch           Watch config file for changes, only updates affected servers (default: false)
  --auto-shutdown   Whether to automatically shutdown when no clients are connected (default: false)
  --shutdown-delay  Delay in milliseconds before shutting down when auto-shutdown is enabled (default: 0)
  -h, --help       Show help information
```

## Configuration

MCP Hub uses JSON configuration files to define managed servers with **universal `${}` placeholder syntax** for environment variables and command execution.

### OAuth Configuration for Remote Services

When connecting to remote MCP servers that require OAuth authentication (like Vercel), you may need to configure a public URL for OAuth redirect callbacks:

```bash
# Set the public URL that Vercel can reach for OAuth callbacks
export MCP_HUB_PUBLIC_URL="https://your-public-domain.com"
npm start
```

For local development, you can use tunneling services like ngrok:

```bash
# Start ngrok tunnel (in separate terminal)
ngrok http 7000

# Get the public URL from ngrok output (e.g., https://abc123.ngrok.io)
# Set environment variable and start MCP Hub
export MCP_HUB_PUBLIC_URL="https://abc123.ngrok.io"
npm start
```

## VS Code Configuration Compatibility

MCP Hub provides seamless compatibility with VS Code's `.vscode/mcp.json` configuration format, enabling you to use the same configuration files across both VS Code and MCP Hub.

### Supported Features

#### Server Configuration Keys
Both `mcpServers` and `servers` keys are supported:

```json
{
  "servers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "perplexity": {
      "command": "npx", 
      "args": ["-y", "server-perplexity-ask"],
      "env": {
        "API_KEY": "${env:PERPLEXITY_API_KEY}"
      }
    }
  }
}
```

#### Variable Substitution
MCP Hub supports VS Code-style variable substitution:

- **Environment Variables**: `${env:VARIABLE_NAME}` or `${VARIABLE_NAME}`
- **Workspace Variables**: `${workspaceFolder}`, `${userHome}`, `${pathSeparator}`
- **Command Execution**: `${cmd: command args}`

**Supported Predefined Variables:**
- `${workspaceFolder}` - Directory where mcp-hub is running
- `${userHome}` - User's home directory  
- `${pathSeparator}` - OS path separator (/ or \)
- `${workspaceFolderBasename}` - Just the folder name
- `${cwd}` - Alias for workspaceFolder
- `${/}` - VS Code shorthand for pathSeparator

#### VS Code Input Variables
For `${input:}` variables used in VS Code configs, use the `MCP_HUB_ENV` environment variable:

```bash
# Set input variables globally
export MCP_HUB_ENV='{"input:api-key":"your-secret-key","input:database-url":"postgresql://..."}'

# Then use in config
{
  "servers": {
    "myserver": {
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  }
}
```

### Migration from VS Code
Existing `.vscode/mcp.json` files work directly with MCP Hub. Simply point MCP Hub to your VS Code configuration:

```bash
mcp-hub --config .vscode/mcp.json --port 3000
```

### Multiple Configuration Files

MCP Hub supports loading multiple configuration files that are merged in order. This enables flexible configuration management:

- **Global Configuration**: System-wide settings (e.g., `~/.config/mcphub/global.json`)
- **Project Configuration**: Project-specific settings (e.g., `./.mcphub/project.json`)
- **Environment Configuration**: Environment-specific overrides

When multiple config files are specified, they are merged with later files overriding earlier ones:

```bash
# Global config is loaded first, then project config overrides
mcp-hub --port 3000 --config ~/.config/mcphub/global.json --config ./.mcphub/project.json
```

**Merge Behavior:**
- `mcpServers` sections are merged (server definitions from later files override earlier ones)
- Other top-level properties are completely replaced by later files
- Missing config files are silently skipped

### Universal Placeholder Syntax

- **`${ENV_VAR}`** or **`${env:ENV_VAR}`** - Resolves environment variables
- **`${cmd: command args}`** - Executes commands and uses output
- **`${workspaceFolder}`** - Directory where mcp-hub is running
- **`${userHome}`** - User's home directory
- **`${pathSeparator}`** - OS path separator
- **`${input:variable-id}`** - Resolves from MCP_HUB_ENV (VS Code compatibility)
- **`null` or `""`** - Falls back to `process.env`

### Configuration Examples

#### Local STDIO Server
```json
{
  "mcpServers": {
    "local-server": {
      "command": "${MCP_BINARY_PATH}/server",
      "args": [
        "--token", "${API_TOKEN}",
        "--database", "${DB_URL}",
        "--secret", "${cmd: op read op://vault/secret}"
      ],
      "env": {
        "API_TOKEN": "${cmd: aws ssm get-parameter --name /app/token --query Parameter.Value --output text}",
        "DB_URL": "postgresql://user:${DB_PASSWORD}@localhost/myapp",
        "DB_PASSWORD": "${cmd: op read op://vault/db/password}",
        "FALLBACK_VAR": null
      },
      "dev": {
        "enabled": true,
        "watch": ["src/**/*.js", "**/*.json"],
        "cwd": "/absolute/path/to/server/directory"
      }
    }
  }
}
```

#### Remote Server
```json
{
  "mcpServers": {
    "remote-server": {
      "url": "https://${PRIVATE_DOMAIN}/mcp",
      "headers": {
        "Authorization": "Bearer ${cmd: op read op://vault/api/token}",
        "X-Custom-Header": "${CUSTOM_VALUE}"
      }
    }
  }
}
```

#### Remote Server with Custom HTTP Connection Pool
```json
{
  "connectionPool": {
    "maxConnections": 50,
    "keepAliveTimeout": 60000
  },
  "mcpServers": {
    "high-traffic-server": {
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "connectionPool": {
        "maxConnections": 100,
        "maxFreeConnections": 20,
        "keepAliveTimeout": 30000
      }
    },
    "default-pool-server": {
      "url": "https://another-api.com/mcp",
      "headers": {
        "X-API-Key": "${API_KEY}"
      }
      // Uses global connectionPool settings (50 connections, 60s keep-alive)
    },
    "disabled-pool-server": {
      "url": "https://legacy-api.com/mcp",
      "connectionPool": {
        "enabled": false
      }
      // Disables connection pooling for this specific server
    }
  }
}
```

## Tool Filtering

MCP Hub supports intelligent tool filtering to manage overwhelming tool counts from multiple MCP servers. With 25+ servers, you might have 3000+ tools consuming 50k+ tokens before any work begins. Tool filtering reduces this to 50-200 relevant tools, freeing 30-40k tokens for actual tasks.

### Quick Start (5 Minutes)

**Problem:** Check your current token usage to see if filtering will help:

```bash
# In Claude Code or your MCP client, check context usage
# Look for "MCP tools: XXk tokens"
# If > 30k tokens → Filtering recommended
# If > 50k tokens → Filtering critical
```

**Solution:** Add minimal filtering configuration:

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github", "web-browser"]
    }
  }
}
```

**Result:** Typical reduction from 3000+ tools → 20-30 tools (70-85% token reduction)

### Filtering Modes

MCP Hub provides three filtering strategies:

#### 1. Server-Allowlist Mode (Recommended for Beginners)

**Use when:** You know which specific servers you need

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    }
  }
}
```

**Expected outcome:** 10-30 tools | 70-85% token reduction

**Best for:** Focused workflows where you use 2-5 specific servers

#### 2. Category Mode

**Use when:** You need tools by functional category (filesystem, web, search, etc.)

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Expected outcome:** 20-50 tools | 60-75% token reduction

**Available categories:** `filesystem`, `web`, `search`, `code`, `communication`, `data`, `ai`, `system`, `custom`

**Custom mappings:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["custom", "filesystem"],
      "customMappings": {
        "mytool__*": "custom",
        "company__*": "custom"
      }
    }
  }
}
```

#### 3. Hybrid Mode (Advanced)

**Use when:** You need server filtering AND per-server tool filtering

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["github", "filesystem"]
    },
    "categoryFilter": {
      "categories": ["filesystem", "web"]
    }
  }
}
```

**Expected outcome:** 30-80 tools | 50-70% token reduction

**Best for:** Power users with complex, multi-server workflows

### Configuration Examples

#### Frontend Development
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "playwright", "web-browser"]
    }
  }
}
```
**Tools:** ~15 | **Use case:** React/Vue development with browser testing

#### Backend Development
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "data", "search", "code"]
    }
  }
}
```
**Tools:** ~25 | **Use case:** API development with database and code search

#### DevOps/Infrastructure
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["kubernetes", "docker", "filesystem", "github"]
    }
  }
}
```
**Tools:** ~20 | **Use case:** Infrastructure management and deployments

### Server Denylist (Alternative)

Instead of allowlist, block specific servers:

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "denylist",
      "servers": ["experimental", "debug", "test"]
    }
  }
}
```

**Use when:** You want most servers except a few problematic ones

### Auto-Enable (Optional)

Automatically enable filtering when tool count exceeds threshold:

```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Behavior:** If total tool count > 100, filtering automatically activates

### LLM Enhancement (Optional) - Now with Official SDKs ✨

The LLM categorization feature now uses official OpenAI and Anthropic SDKs for production-grade reliability:

**New Features:**
- ✅ **Automatic Retries**: Transient failures (429, 5xx) automatically retried with exponential backoff
- ✅ **Typed Errors**: Detailed error information with `APIError`, `RateLimitError`, `ConnectionError`
- ✅ **Request Tracking**: Every API call tracked with `request_id` for debugging
- ✅ **Better Observability**: Enhanced logging with error context and retry information

**Configuration** (unchanged):
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
      "model": "gpt-4o-mini"
    }
  }
}
```

**Error Handling Examples:**

```javascript
// Automatic retry on transient failures
// 429 Rate Limit → SDK retries with backoff
// 500 Server Error → SDK retries up to 3 times
// Connection timeout → SDK retries

// Detailed error logging
// ✅ Request ID: req_abc123
// ✅ Error Type: RateLimitError
// ✅ Retry After: 60 seconds
// ✅ Status Code: 429
```

**Observability:**

Check LLM performance in stats API:
```bash
curl http://localhost:37373/api/filtering/stats
```

Response includes LLM metrics:
```json
{
  "llm": {
    "cacheHits": 150,
    "cacheMisses": 10,
    "errorsByType": {
      "RateLimitError": 2,
      "APIError": 1
    },
    "totalRetries": 5
  }
}
```

**Benefits**: 10-20% accuracy improvement for edge cases  
**Cost**: ~$0.01 per 100 tools (cached after first categorization)  
**Reliability**: Automatic retry handles 80%+ of transient failures

### Monitoring & Statistics

Check filtering effectiveness via REST API:

```bash
# Get filtering statistics
curl http://localhost:3000/api/filtering/stats | jq
```

**Example response:**
```json
{
  "enabled": true,
  "mode": "server-allowlist",
  "toolsEvaluated": 3469,
  "toolsIncluded": 89,
  "toolsFiltered": 3380,
  "filterRate": 97.4,
  "serversTotal": 25,
  "serversActive": 3
}
```

### Troubleshooting

#### Issue: Token count didn't decrease after enabling filtering

**Diagnostic:**
```bash
# 1. Verify config loaded
cat mcp.json | grep -A 10 "toolFiltering"

# 2. Check server names match exactly
npm start 2>&1 | grep "Connected to server"

# 3. Restart MCP Hub
npm restart
```

**Solution:**
- Server names in `serverFilter.servers` must match exact names from `mcpServers` config
- Always restart after configuration changes
- Check logs for "Tool filtering initialized" message

#### Issue: LLM still selecting wrong tools

**Root cause:** Tool count still > 30 (LLM threshold for reliable selection)

**Diagnostic:**
```bash
# Check current tool count via filtering stats
curl http://localhost:3000/api/filtering/stats | jq '.toolsIncluded'
```

**Solution:**
- If > 30 tools: Switch to more restrictive mode (server-allowlist)
- If using category mode: Reduce number of categories
- If using hybrid mode: Add per-server tool patterns

#### Issue: No tools showing up

**Root cause:** Filters too restrictive, blocking everything

**Diagnostic:**
```bash
# Check if any tools included
curl http://localhost:3000/api/filtering/stats | jq '.toolsIncluded'
# If 0: Your filters blocked all tools
```

**Solution:**
- Start with minimal config (1-2 servers in allowlist)
- Add servers incrementally
- Verify server names with: `cat mcp.json | jq '.mcpServers | keys'`

### Best Practices

1. **Start Simple:** Begin with server-allowlist mode, 2-3 servers
2. **Monitor Impact:** Check token reduction via stats API
3. **Iterate:** Add servers/categories incrementally
4. **Target 15-25 tools:** Optimal range for LLM reliability
5. **Test Workflows:** Verify your common tasks still work after filtering
6. **Document Config:** Comment your filtering choices for team members

### Performance Impact

- **Filtering overhead:** < 10ms per tool check
- **Memory usage:** Negligible (~1MB for cache)
- **Token reduction:** 60-85% typical
- **Context freed:** 30-50k tokens for actual work

### Migration Guide

**Phase 1: Baseline** (No changes)
```bash
# Document current state
curl http://localhost:3000/api/servers | jq '.servers[] | .name'
# Note your most-used servers
```

**Phase 2: Experiment** (Reversible)
```bash
# Backup config
cp mcp.json mcp.json.backup

# Add minimal filtering
# (server-allowlist with 1-2 servers)

# Test and monitor
curl http://localhost:3000/api/filtering/stats | jq
```

**Phase 3: Optimize** (Iterative)
```bash
# Add servers incrementally
# Monitor token usage after each addition
# Adjust mode if needed
```

**Rollback:** `mv mcp.json.backup mcp.json && npm restart`


### Configuration Options

MCP Hub supports both STDIO servers and remote servers (streamable-http/SSE). The server type is automatically detected from the configuration. **All fields support the universal `${}` placeholder syntax.**

#### STDIO Server Options

For running script-based MCP servers locally:

- **command**: Command to start the MCP server executable (supports `${VARIABLE}` and `${cmd: command}`)
- **args**: Array of command line arguments (supports `${VARIABLE}` and `${cmd: command}` placeholders)
- **env**: Environment variables with placeholder resolution and system fallback
- **cwd**: The cwd for process spawning the MCP server
- **dev**: Development mode configuration (optional)
  - **enabled**: Enable/disable dev mode (default: true)
  - **watch**: Array of glob patterns to watch for changes (default: ["**/*.js", "**/*.ts", "**/*.json"])
  - **cwd**: **Required** absolute path to the server's working directory for file watching

##### Global Environment Variables (`MCP_HUB_ENV`)

MCP Hub will look for the environment variable `MCP_HUB_ENV` (a JSON string) in its own process environment. If set, all key-value pairs from this variable will be injected into the environment of every managed MCP server (both stdio and remote). This is useful for passing secrets, tokens, or other shared configuration to all servers without repeating them in each server config.

- Server-specific `env` fields always override values from `MCP_HUB_ENV`.
- Example usage:
  ```sh
  MCP_HUB_ENV='{"DBUS_SESSION_BUS_ADDRESS":"/run/user/1000/bus","MY_TOKEN":"abc"}' mcp-hub --port 3000 --config path/to/config.json
  ```

#### Remote Server Options

For connecting to remote MCP servers:

- **url**: Server endpoint URL (supports `${VARIABLE}` and `${cmd: command}` placeholders)
- **headers**: Authentication headers (supports `${VARIABLE}` and `${cmd: command}` placeholders)
- **connectionPool**: HTTP connection pool configuration (optional, applies to SSE and streamable-http transports)
  - **enabled**: Enable connection pooling (default: `true`)
  - **keepAliveTimeout**: Keep-alive timeout in milliseconds (default: `60000` - 60 seconds)
  - **keepAliveMaxTimeout**: Maximum socket lifetime in milliseconds (default: `600000` - 10 minutes)
  - **maxConnections**: Maximum connections per host (default: `50`)
  - **maxFreeConnections**: Maximum idle connections per host (default: `10`)
  - **timeout**: Socket timeout in milliseconds (default: `30000` - 30 seconds)
  - **pipelining**: Number of pipelined requests (default: `0` - disabled for MCP request-response pattern)

**HTTP Connection Pooling Benefits:**
- Reduces TLS handshake overhead through persistent connections
- Improves latency by 10-30% for remote MCP servers
- Optimizes resource usage with configurable connection limits
- Automatic connection reuse with undici Agent
- Can be configured globally or per-server with precedence rules

#### Server Type Detection

The server type is determined by:
- STDIO server → Has `command` field
- Remote server → Has `url` field

Note: A server configuration cannot mix STDIO and remote server fields.

#### Placeholder Resolution Order

1. **Commands First**: `${cmd: command args}` are executed first
2. **Environment Variables**: `${VAR}` are resolved from `env` object, then `process.env`
3. **Fallback**: `null` or `""` values fall back to `process.env`
4. **Multi-pass**: Dependencies between variables are resolved automatically

## Nix

### Nixpkgs install

> coming...

### Flake install

Just add it to your NixOS flake.nix or home-manager:

```nix
inputs = {
  mcp-hub.url = "github:ravitemer/mcp-hub";
  ...
}
```

To integrate mcp-hub to your NixOS/Home Manager configuration, add the following to your environment.systemPackages or home.packages respectively:

```nix
inputs.mcp-hub.packages."${system}".default
```

### Usage without install

If you want to use mcphub.nvim without having mcp-hub server in your PATH you can link the server under the hood adding
the mcp-hub nix store path to the `cmd` command in the plugin config like

[Nixvim](https://github.com/nix-community/nixvim) example:
```nix
{ mcphub-nvim, mcp-hub, ... }:
{
  extraPlugins = [mcphub-nvim];
  extraConfigLua = ''
    require("mcphub").setup({
        port = 3000,
        config = vim.fn.expand("~/mcp-hub/mcp-servers.json"),
        cmd = "${mcp-hub}/bin/mcp-hub"
    })
  '';
}

# where
{
  # For nixpkgs (not available yet)
  mcp-hub = pkgs.mcp-hub;

  # For flakes
  mcp-hub = inputs.mcp-hub.packages."${system}".default;
}
```

## Example Integrations

### Neovim Integration

The [ravitemer/mcphub.nvim](https://github.com/ravitemer/mcphub.nvim) plugin provides seamless integration with Neovim, allowing direct interaction with MCP Hub from your editor:

- Execute MCP tools directly from Neovim
- Access MCP resources within your editing workflow
- Real-time status updates in Neovim
- Auto install mcp servers with marketplace addition

### Training Job Monitoring

MCP Hub can be used to monitor ML training jobs through custom MCP servers. See [examples/training-monitor](./examples/training-monitor) for a complete example demonstrating:

- **Real-time Training Status**: Check training job progress, metrics, and logs
- **Multi-Job Monitoring**: Track multiple training runs simultaneously
- **Custom Tools**: Use `run_training_monitor` tool to query training status
- **Framework Integration**: Extend to work with TensorBoard, Weights & Biases, or custom training frameworks

Example configuration:
```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/path/to/pico_training_monitor.py"],
      "env": {
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      }
    }
  }
}
```

Use the tool through any MCP client:
```javascript
// Check all training jobs
await client.callTool('pico-training-monitor', 'run_training_monitor', {});

// Check specific job
await client.callTool('pico-training-monitor', 'run_training_monitor', {
  job_id: "experiment-123"
});
```

## REST API

### Health and Status

#### Health Check

```bash
GET /api/health
```

The health endpoint provides comprehensive status information including:
- Current hub state (starting, ready, restarting, restarted, stopping, stopped, error)
- Connected server statuses and capabilities
- Active SSE connection details
- Detailed connection metrics
- Error state details if applicable

Response:
```json
{
  "status": "ok",
  "state": "ready",
  "server_id": "mcp-hub",
  "version": "4.1.1",
  "activeClients": 2,
  "timestamp": "2024-02-20T05:55:00.000Z",
  "servers": [],
  "connections": {
    "totalConnections": 2,
    "connections": [
      {
        "id": "client-uuid",
        "state": "connected",
        "connectedAt": "2024-02-20T05:50:00.000Z",
        "lastEventAt": "2024-02-20T05:55:00.000Z"
      }
    ]
  },
  "workspaces": {
    "current": "40123",
    "allActive": {
      "40123": {
        "cwd": "/path/to/project-a",
        "config_files": ["/home/user/.config/mcphub/global.json", "/path/to/project-a/.mcphub/project.json"],
        "pid": 12345,
        "port": 40123,
        "startTime": "2025-01-17T10:00:00.000Z",
        "state": "active",
        "activeConnections": 2,
        "shutdownStartedAt": null,
        "shutdownDelay": null
      }
    }
  }
}
```

#### List MCP Servers

```bash
GET /api/servers
```

#### Get Server Info

```bash
POST /api/servers/info
Content-Type: application/json

{
  "server_name": "example-server"
}
```

#### Refresh Server Capabilities

```bash
POST /api/servers/refresh
Content-Type: application/json

{
  "server_name": "example-server"
}
```

Response:

```json
{
  "status": "ok",
  "server": {
    "name": "example-server",
    "capabilities": {
      "tools": ["tool1", "tool2"],
      "resources": ["resource1", "resource2"],
      "resourceTemplates": []
    }
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Refresh All Servers

```bash
POST /api/refresh
```

Response:

```json
{
  "status": "ok",
  "servers": [
    {
      "name": "example-server",
      "capabilities": {
        "tools": ["tool1", "tool2"],
        "resources": ["resource1", "resource2"],
        "resourceTemplates": []
      }
    }
  ],
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Start Server

```bash
POST /api/servers/start
Content-Type: application/json

{
  "server_name": "example-server"
}
```

Response:

```json
{
  "status": "ok",
  "server": {
    "name": "example-server",
    "status": "connected",
    "uptime": 123
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Stop Server

```bash
POST /api/servers/stop?disable=true|false
Content-Type: application/json

{
  "server_name": "example-server"
}
```

The optional `disable` query parameter can be set to `true` to disable the server in the configuration.

Response:

```json
{
  "status": "ok",
  "server": {
    "name": "example-server",
    "status": "disconnected",
    "uptime": 0
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

### Workspace Management

#### List Active Workspaces

```bash
GET /api/workspaces
```

Response:

```json
{
  "workspaces": {
    "40123": {
      "cwd": "/path/to/project-a",
      "config_files": ["/home/user/.config/mcphub/global.json", "/path/to/project-a/.mcphub/project.json"],
      "pid": 12345,
      "port": 40123,
      "startTime": "2025-01-17T10:00:00.000Z",
      "state": "active",
      "activeConnections": 2,
      "shutdownStartedAt": null,
      "shutdownDelay": null
    },
    "40567": {
      "cwd": "/path/to/project-b",
      "config_files": ["/home/user/.config/mcphub/global.json"],
      "pid": 54321,
      "port": 40567,
      "startTime": "2025-01-17T10:05:00.000Z",
      "state": "shutting_down",
      "activeConnections": 0,
      "shutdownStartedAt": "2025-01-17T10:15:00.000Z",
      "shutdownDelay": 600000
    }
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

### Marketplace Integration

#### List Available Servers

```bash
GET /api/marketplace
```

Query Parameters:

- `search`: Filter by name, description, or tags
- `category`: Filter by category
- `tags`: Filter by comma-separated tags
- `sort`: Sort by "newest", "stars", or "name"

Response:

```json
{
  "servers": [
    {
      "id": "example-server",
      "name": "Example Server",
      "description": "Description here",
      "author": "example-author",
      "url": "https://github.com/user/repo",
      "category": "search",
      "tags": ["search", "ai"],
      "stars": 100,
      "featured": true,
      "verified": true,
      "lastCommit": 1751257963,
      "updatedAt": 1751265038
    }
  ],
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Get Server Details

```bash
POST /api/marketplace/details
Content-Type: application/json

{
  "mcpId": "example-server"
}
```

Response:

```json
{
  "server": {
    "id": "example-server",
    "name": "Example Server",
    "description": "Description here",
    "author": "example-author",
    "url": "https://github.com/user/repo",
    "category": "search",
    "tags": ["search", "ai"],
    "installations": [],
    "stars": 100,
    "featured": true,
    "verified": true,
    "lastCommit": 1751257963,
    "updatedAt": 1751265038
  },
  "readmeContent": "# Server Documentation...",
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

### MCP Server Operations

#### Execute Tool

```bash
POST /api/servers/tools
Content-Type: application/json

{
  "server_name": "example-server",
  "tool": "tool_name",
  "arguments": {},
  "request_options" : {}
}
```

#### Access Resource

```bash
POST /api/servers/resources
Content-Type: application/json

{
  "server_name": "example-server",
  "uri": "resource://uri",
  "request_options" : {}
}
```

#### Get Prompt

```bash
POST /api/servers/prompts
Content-Type: application/json

{
  "server_name": "example-server",
  "prompt": "prompt_name",
  "arguments": {},
  "request_options" : {}
}
```

Response:

```json
{
  "result": {
    "messages": [
      {
        "role": "assistant",
        "content": {
          "type": "text",
          "text": "Text response example"
        }
      },
      {
        "role": "assistant",
        "content": {
          "type": "image",
          "data": "base64_encoded_image_data",
          "mimeType": "image/png"
        }
      }
    ]
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Restart Hub

```bash
POST /api/restart
```

Reloads the configuration file and restarts all MCP servers.

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

## Real-time Events System

MCP Hub implements a comprehensive real-time events system using Server-Sent Events (SSE) at `/api/events`. This endpoint provides live updates about server status, configuration changes, capability updates, and more.

### Hub States

The hub server transitions through several states during its lifecycle:

| State | Description |
|-------|-------------|
| `starting` | Initial startup, loading configuration |
| `ready` | Server is running and ready to handle requests |
| `restarting` | Reloading configuration/reconnecting servers |
| `restarted` | Configuration reload complete |
| `stopping` | Graceful shutdown in progress |
| `stopped` | Server has fully stopped |
| `error` | Error state (includes error details) |

You can monitor these states through the `/health` endpoint or SSE events.

### Event Types

MCP Hub emits several types of events:

#### Core Events

1. **heartbeat** - Periodic connection health check
```json
{
  "connections": 2,
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

2. **hub_state** - Hub server state changes
```json
{
  "state": "ready",
  "server_id": "mcp-hub",
  "version": "1.0.0",
  "pid": 12345,
  "port": 3000,
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

3. **log** - Server log messages
```json
{
  "type": "info",
  "message": "Server started",
  "data": {},
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

#### Subscription Events

1. **config_changed** - Configuration file changes detected
```json
{
  "type": "config_changed",
  "newConfig": {},
  "isSignificant": true,
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

2. **servers_updating** - Server updates in progress
```json
{
  "type": "servers_updating",
  "changes": {
    "added": ["server1"],
    "removed": [],
    "modified": ["server2"],
    "unchanged": ["server3"]
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

3. **servers_updated** - Server updates completed
```json
{
  "type": "servers_updated",
  "changes": {
    "added": ["server1"],
    "removed": [],
    "modified": ["server2"],
    "unchanged": ["server3"]
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

4. **tool_list_changed** - Server's tools list updated
```json
{
  "type": "tool_list_changed",
  "server": "example-server",
  "tools": ["tool1", "tool2"],
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

5. **resource_list_changed** - Server's resources/templates updated
```json
{
  "type": "resource_list_changed",
  "server": "example-server",
  "resources": ["resource1", "resource2"],
  "resourceTemplates": [],
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

6. **prompt_list_changed** - Server's prompts list updated
```json
{
  "type": "prompt_list_changed",
  "server": "example-server",
  "prompts": ["prompt1", "prompt2"],
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

7. **workspaces_updated** - Active workspaces changed
```json
{
  "type": "workspaces_updated",
  "workspaces": {
    "40123": {
      "cwd": "/path/to/project-a",
      "config_files": ["/home/user/.config/mcphub/global.json", "/path/to/project-a/.mcphub/project.json"],
      "pid": 12345,
      "port": 40123,
      "startTime": "2025-01-17T10:00:00.000Z",
      "state": "active",
      "activeConnections": 2,
      "shutdownStartedAt": null,
      "shutdownDelay": null
    }
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

### Connection Management

- Each SSE connection is assigned a unique ID
- Connections are automatically cleaned up on client disconnect
- Connection statistics available via `/health` endpoint
- Optional auto-shutdown when no clients are connected

### Event Batching

MCP Hub implements intelligent event batching to reduce SSE traffic and improve client-side processing efficiency. By default, capability change events (tools, resources, prompts) are batched within a configurable time window, reducing network overhead by 30-50% during high-change scenarios (e.g., hub restart, multiple server updates).

#### Batching Behavior

**Time-Based Batching**: Events are collected in batches and flushed after a configurable window (default: 100ms)

**Size-Based Batching**: Batches are automatically flushed when reaching a size limit (default: 50 events)

**Critical Event Bypass**: Critical events (`hub_state`, `error`) bypass batching for immediate delivery

**Deduplication**: Duplicate events from the same server within a batch are automatically deduplicated

#### Configuration

Event batching is enabled by default and can be configured globally in the server startup options:

```json
{
  "sse": {
    "batching": {
      "enabled": true,
      "batchWindow": 100,     // Time window in milliseconds
      "maxBatchSize": 50      // Maximum events per batch
    }
  }
}
```

To disable batching:

```json
{
  "sse": {
    "batching": {
      "enabled": false
    }
  }
}
```

#### Batch Event Format

When batching is enabled, clients receive batch events with a `_batch` suffix on the event type:

```javascript
// Batched event format
{
  "type": "tool_list_changed_batch",
  "batchSize": 3,
  "events": [
    { "server": "server1", "tools": [...], "timestamp": 1698765432100 },
    { "server": "server2", "tools": [...], "timestamp": 1698765432150 },
    { "server": "server3", "tools": [...], "timestamp": 1698765432180 }
  ],
  "reason": "time_window",  // or "size_limit", "critical", "manual"
  "timestamp": 1698765432200
}
```

#### Client-Side Handling

Clients should handle both batched and non-batched events for backward compatibility:

```javascript
// Handle batched events
eventSource.addEventListener('tool_list_changed_batch', (event) => {
  const { events, batchSize } = JSON.parse(event.data);

  // Process batch of tool changes
  events.forEach(({ server, tools, timestamp }) => {
    updateToolsForServer(server, tools);
  });

  console.log(`Processed batch of ${batchSize} tool changes`);
});

// Backward compatibility: still support non-batched events
eventSource.addEventListener('tool_list_changed', (event) => {
  const { server, tools } = JSON.parse(event.data);
  updateToolsForServer(server, tools);
});
```

#### Performance Impact

**Expected Benefits**:
- **SSE Traffic**: 30-50% reduction during hub restart and multi-server updates
- **Network Overhead**: Fewer HTTP/2 frames and reduced header overhead
- **Client Processing**: Enables efficient batch DOM updates
- **Latency**: Maximum +100ms latency (configurable trade-off)

**When Batching Helps Most**:
- Hub startup/restart with many servers
- Multiple servers updating capabilities simultaneously
- High-frequency capability changes
- Rapid configuration reloads

**When to Disable Batching**:
- Ultra-low latency requirements (real-time critical systems)
- Single server deployments with infrequent changes
- Debugging and development scenarios requiring immediate event visibility

## Logging

MCP Hub uses structured JSON logging for all events. Logs are written to both console and file following XDG Base Directory Specification:

- **XDG compliant**: `$XDG_STATE_HOME/mcp-hub/logs/mcp-hub.log` (typically `~/.local/state/mcp-hub/logs/mcp-hub.log`)
- **Legacy fallback**: `~/.mcp-hub/logs/mcp-hub.log` (for backward compatibility)

Example log entry:

```json
{
  "type": "error",
  "code": "TOOL_ERROR",
  "message": "Failed to execute tool",
  "data": {
    "server": "example-server",
    "tool": "example-tool",
    "error": "Invalid parameters"
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

Log levels include:

- `info`: Normal operational messages
- `warn`: Warning conditions
- `debug`: Detailed debug information (includes configuration changes)
- `error`: Error conditions (includes error code and stack trace)

Logs are rotated daily and kept for 30 days by default.

## Workspace Cache

MCP Hub maintains a global workspace cache to track active instances across different working directories with real-time lifecycle management:

- **Cache Location**: `$XDG_STATE_HOME/mcp-hub/workspaces.json` (typically `~/.local/state/mcp-hub/workspaces.json`)
- **Purpose**: Prevents port conflicts, enables workspace discovery, and provides real-time lifecycle tracking
- **Content**: Maps port numbers (as keys) to hub process information with detailed lifecycle state
- **Cleanup**: Automatically removes stale entries when processes are no longer running

### Cache Structure

```json
{
  "40123": {
    "cwd": "/path/to/project-a",
    "config_files": ["/home/user/.config/mcphub/global.json", "/path/to/project-a/.mcphub/project.json"],
    "pid": 12345,
    "port": 40123,
    "startTime": "2025-01-17T10:00:00.000Z",
    "state": "active",
    "activeConnections": 2,
    "shutdownStartedAt": null,
    "shutdownDelay": null
  },
  "40567": {
    "cwd": "/path/to/project-b", 
    "config_files": ["/home/user/.config/mcphub/global.json"],
    "pid": 54321,
    "port": 40567,
    "startTime": "2025-01-17T10:05:00.000Z",
    "state": "shutting_down",
    "activeConnections": 0,
    "shutdownStartedAt": "2025-01-17T10:15:00.000Z",
    "shutdownDelay": 600000
  }
}
```

## Error Handling

MCP Hub implements a comprehensive error handling system with custom error classes for different types of errors:

### Error Classes

- **ConfigError**: Configuration-related errors (invalid config, missing fields)
- **ConnectionError**: Server connection issues (failed connections, transport errors)
- **ServerError**: Server startup/initialization problems
- **ToolError**: Tool execution failures
- **ResourceError**: Resource access issues
- **ValidationError**: Request validation errors

Each error includes:

- Error code for easy identification
- Detailed error message
- Additional context in the details object
- Stack trace for debugging

Example error structure:

```json
{
  "code": "CONNECTION_ERROR",
  "message": "Failed to communicate with server",
  "details": {
    "server": "example-server",
    "error": "connection timeout"
  },
  "timestamp": "2024-02-20T05:55:00.000Z"
}
```

## Architecture

### Hub Server Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant H as Hub Server
    participant M1 as MCP Server 1
    participant M2 as MCP Server 2

    Note over H: Server Start (state: starting)
    activate H
    
    Note over H: Config Loading
    H->>H: Load & Validate Config
    H->>H: Watch Config File
    H->>H: Initialize SSE Manager
    
    Note over H: Server Connections (state: ready)
    H->>+M1: Connect
    M1-->>-H: Connected + Capabilities
    H->>+M2: Connect
    M2-->>-H: Connected + Capabilities
    H-->>C: hub_state (ready)

    Note over C,H: Client Setup
    C->>H: Connect to /api/events (SSE)
    H-->>C: connection_opened
    
    Note over C,H: Client Operations
    C->>H: Execute Tool (HTTP)
    H->>M1: Execute Tool
    M1-->>H: Tool Result
    H-->>C: HTTP Response
    
    Note over H,C: Real-time Updates
    H->>H: Detect Config Change
    H-->>C: servers_updating (SSE)
    H->>M1: Reconnect with New Config
    M1-->>H: Updated Capabilities
    H-->>C: servers_updated (SSE)

    Note over H,C: Server Events
    M2->>H: Tool List Changed
    H-->>C: tool_list_changed (SSE)
    
    Note over H: Shutdown Process
    Note over C,H: Client Disconnects
    H-->>C: hub_state (stopping) (SSE)
    H->>M1: Disconnect
    H->>M2: Disconnect
    H-->>C: hub_state (stopped) (SSE)
    deactivate H
```

The Hub Server coordinates communication between clients and MCP servers:

1. Starts and connects to configured MCP servers
2. Handles SSE client connections and events
3. Routes tool and resource requests to appropriate servers
4. Monitors server health and maintains capabilities
5. Manages graceful startup/shutdown processes

### MCP Server Management

```mermaid
flowchart TB
    A[Hub Server Start] --> B{Config Available?}
    B -->|Yes| C[Load Server Configs]
    B -->|No| D[Use Default Settings]
    
    C --> E[Initialize Connections]
    D --> E
    
    E --> F{For Each MCP Server}
    F -->|Enabled| G[Attempt Connection]
    F -->|Disabled| H[Skip Server]
    
    G --> I{Connection Status}
    I -->|Success| J[Fetch Capabilities]
    I -->|Failure| K[Log Error]
    
    J --> L[Store Server Info]
    K --> M[Mark Server Unavailable]
    
    L --> N[Monitor Health]
    M --> N
    
    N --> O{Health Check}
    O -->|Healthy| P[Update Capabilities]
    O -->|Unhealthy| Q[Attempt Reconnect]
    
    Q -->|Success| P
    Q -->|Failure| R[Update Status]
    
    P --> N
    R --> N
```

The Hub Server actively manages MCP servers through:

1. Configuration-based server initialization
2. Connection and capability discovery
3. Health monitoring and status tracking
4. Automatic reconnection attempts
5. Server state management

### Request Handling

```mermaid
sequenceDiagram
    participant C as Client
    participant H as Hub Server
    participant M as MCP Server
    
    Note over C,H: Tool Execution
    C->>H: POST /api/servers/tools (HTTP)
    H->>H: Validate Request & Server
    
    alt Server Not Connected
        H-->>C: 503 Server Unavailable (HTTP)
    else Server Connected
        H->>M: Execute Tool
        
        alt Success
            M-->>H: Tool Result
            H-->>C: Result Response (HTTP)
        else Error
            M-->>H: Error Details
            H-->>C: Error Response (HTTP)
            H-->>C: log (SSE Event)
        end
    end
    
    Note over C,H: Resource Access
    C->>H: POST /api/servers/resources (HTTP)
    H->>H: Validate URI & Template
    
    alt Invalid Resource
        H-->>C: 404 Not Found (HTTP)
    else Server Not Connected
        H-->>C: 503 Unavailable (HTTP)
    else Valid Request
        H->>M: Request Resource
        
        alt Success
            M-->>H: Resource Data
            H-->>C: Resource Content (HTTP)
        else Error
            M-->>H: Error Details
            H-->>C: Error Response (HTTP)
            H-->>C: log (SSE Event)
        end
    end
    
    Note over C,H: Prompt Execution
    C->>H: POST /api/servers/prompts (HTTP)
    H->>H: Validate Prompt & Args
    
    alt Invalid Prompt
        H-->>C: 404 Not Found (HTTP)
    else Server Not Connected
        H-->>C: 503 Unavailable (HTTP)
    else Valid Request
        H->>M: Execute Prompt
        
        alt Success
            M-->>H: Messages Array
            H-->>C: Messages Response (HTTP)
        else Error
            M-->>H: Error Details
            H-->>C: Error Response (HTTP)
            H-->>C: log (SSE Event)
        end
    end
```

All client requests follow a standardized flow:

1. Request validation
2. Server status verification
3. Request routing to appropriate MCP server
4. Response handling and error management

## Requirements

- Node.js >= 18.0.0

## Code Quality & Development

MCP Hub maintains high code quality standards through comprehensive testing, documentation, and continuous improvement.

### Quality Metrics

- **Test Coverage**: 80%+ across all modules
- **ESLint Compliance**: 96%+ pass rate (1 intentional nested try-catch for transport fallback)
- **JSDoc Documentation**: 100% coverage for public APIs
- **Code Style**: Standardized across entire codebase
- **Memory Leaks**: Zero detected in production
- **Critical Bugs**: All resolved and monitored

### Development Practices

- **Test-Driven Development**: All critical changes include tests
- **Comprehensive Error Handling**: Graceful degradation with detailed logging
- **Resource Cleanup**: Idempotent cleanup patterns prevent leaks
- **Event Management**: Proper handler lifecycle management
- **Function Decomposition**: Large functions broken into focused, testable units
- **Centralized Constants**: Single source of truth for configuration values

### Architecture Highlights

- **Structured JSON Logging**: XDG-compliant log files with rotation
- **Memory Safety**: Comprehensive null checks and defensive programming
- **Promise Handling**: `Promise.allSettled` ensures all servers start independently
- **Event-Driven Architecture**: Clean separation of concerns with EventEmitter pattern
- **Error Classes**: Custom error types for different failure scenarios

### Testing

MCP Hub employs a strategic two-tier coverage approach:

- **Critical Components**: 70-80%+ coverage (MCPConnection, MCPHub, core utilities)
- **Global Baseline**: 50-70% (infrastructure files require integration tests)
- **Current Metrics**: 308+ tests passing (100% pass rate), 82.94% branch coverage

#### Run Tests

**Resource-Efficient (Default - Recommended for CI/CD)**:
```bash
npm test                    # Sequential execution (~50-100MB memory, 30-60s)
npm run test:seq            # Explicit sequential mode
npm run test:quality        # Sequential + coverage for quality gates
```

**Fast Mode (When Resources Available)**:
```bash
npm run test:fast           # Parallel execution (~200-300MB memory, 10-20s)
```

**Development**:
```bash
npm run test:watch          # Watch mode with sequential execution
npm run test:coverage       # Generate coverage report (sequential)
npm run test:coverage:ui    # Open HTML coverage report
```

> **Note**: Tests run sequentially by default to minimize system resource usage. This is ideal for CI/CD, resource-constrained systems, or when running tests alongside development work. Use `npm run test:fast` for quicker results when you have available CPU/memory resources.
>
> For detailed configuration options and resource optimization, see [`docs/testing-resource-optimization.md`](docs/testing-resource-optimization.md).

#### Coverage Strategy
The project focuses on testing observable outcomes ("exit doors"):
- API response correctness and schema validation
- State changes (database/cache mutations)
- External service call validation
- Message queue interactions
- Observability (logging, error handling, metrics)

Coverage thresholds are strategically configured per-file rather than globally, following Vitest best practices for infrastructure-heavy projects. See `vitest.config.js` for details.

#### Test Organization
- `tests/*.test.js` - Unit tests for core components
- `tests/*.integration.test.js` - Integration tests for transports and connections
- `tests/helpers/` - Shared test utilities and patterns

#### Behavior-Driven Testing
Tests follow the AAA (Arrange-Act-Assert) pattern with explicit comments for clarity. All tests validate observable behavior rather than implementation details, ensuring tests remain valuable as code evolves.

For detailed testing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md#testing-guidelines).

### Code Quality Improvements

Recent sprints focused on improving code quality through:

1. **Critical Bug Fixes**: Resolved variable scope issues, added null checks throughout
2. **Error Handling**: Enhanced with comprehensive try-catch blocks and logging
3. **Promise Management**: Improved server startup with Promise.allSettled
4. **Constants Extraction**: Centralized all magic numbers in `src/utils/constants.js`
5. **Resource Cleanup**: Standardized cleanup patterns to prevent memory leaks
6. **JSDoc Documentation**: 100% coverage for all public methods
7. **Function Decomposition**: Split large functions following Single Responsibility Principle
8. **Memory Leak Prevention**: Fixed event handler duplication issues
9. **Code Style Standardization**: Fixed 26 of 27 ESLint violations

For detailed sprint retrospectives and development workflow, see [IMP_WF.md](./IMP_WF.md).

## MCP Registry

MCP Hub now uses the [MCP Registry](https://github.com/ravitemer/mcp-registry) system for marketplace functionality. This provides:

- **Decentralized Server Discovery**: Registry hosted on GitHub Pages for better reliability
- **Direct GitHub Integration**: README documentation fetched directly from repositories
- **Enhanced Metadata**: Comprehensive server information including stars, categories, and installation instructions
- **Better Caching**: Improved cache system with 1-hour TTL for frequent updates
- **Fallback Support**: Automatic fallback to curl when fetch fails (useful for proxy/VPN environments)

The registry is updated regularly with new servers and improvements to existing entries.

## Roadmap

### Completed ✅

- [x] Custom marketplace integration (MCP Registry)
- [x] HTTP connection pooling for remote servers
- [x] Tool filtering system with LLM categorization
- [x] VS Code configuration compatibility
- [x] Multi-configuration file support
- [x] Workspace management and tracking
- [x] Real-time event streaming with batching
- [x] Development mode with hot-reload
- [x] OAuth 2.0 authentication with PKCE
- [x] Comprehensive test suite (308+ tests, 100% pass rate)

### In Progress 🚧

- [ ] Enhanced Web UI for server management
- [ ] Terminal UI (TUI) interface inspired by mcphub.nvim
- [ ] Advanced tool filtering patterns
- [ ] Extended marketplace features

### Planned 📋

- [ ] Plugin system for extensibility
- [ ] Built-in monitoring dashboard
- [ ] Advanced analytics and metrics
- [ ] Multi-user support with role-based access

## Acknowledgements

- [ravitemer/mcp-registry](https://github.com/ravitemer/mcp-registry) - For providing the MCP server marketplace endpoints that power MCP Hub's marketplace integration
