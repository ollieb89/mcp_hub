# MCP Hub Configuration Schema Documentation

This document provides comprehensive documentation for the MCP Hub configuration schema, including validation rules, examples, and best practices.

## Overview

MCP Hub uses a JSON5-based configuration system that supports:
- Multiple MCP server configurations (STDIO, SSE, streamable-http)
- HTTP connection pooling for remote servers
- Tool filtering with multiple modes
- LLM-based prompt analysis for dynamic tool exposure
- VS Code compatibility
- Environment variable resolution

## Schema Files

- **`config.schema.json`** - JSON Schema for validation and IDE support
- **`config.schema.d.ts`** - TypeScript type definitions
- **`mcp-servers.example.json`** - Example configuration file

## Using the Schema

### In VS Code

Add this to the top of your `mcp-servers.json`:

```json
{
  "$schema": "./config.schema.json",
  "mcpServers": {
    // your configuration
  }
}
```

This enables:
- Autocomplete for all configuration options
- Inline validation with error messages
- Hover documentation for properties

### With TypeScript

```typescript
import type { McpHubConfig } from './config.schema';

const config: McpHubConfig = {
  connectionPool: {
    enabled: true,
    maxConnections: 100
  },
  mcpServers: {
    // your servers
  }
};
```

### Validation in Code

The schema is enforced at runtime by `ConfigManager` in `src/utils/config.js`:
- Connection pool validation via `validatePoolConfig()`
- Dev config validation via `#validateDevConfig()`
- Tool filtering validation via `#validateToolFilteringConfig()`

## Configuration Structure

### Top-Level Properties

```json
{
  "connectionPool": { },      // Global HTTP connection pooling
  "toolFiltering": { },       // Tool exposure filtering
  "mcpServers": { },          // MCP server configurations
  "servers": { }              // VS Code compatibility alias
}
```

## Connection Pool Configuration

Controls HTTP connection pooling for remote MCP servers (SSE and streamable-http transports).

### Properties

| Property | Type | Range | Default | Description |
|----------|------|-------|---------|-------------|
| `enabled` | boolean | - | `true` | Enable connection pooling globally |
| `keepAliveTimeout` | integer | 1000-600000 | 60000 | Socket keep-alive timeout (ms) |
| `keepAliveMaxTimeout` | integer | 1000-600000 | 600000 | Maximum socket lifetime (ms) |
| `maxConnections` | integer | 1-1000 | 50 | Maximum connections per host |
| `maxFreeConnections` | integer | 0-100 | 10 | Maximum idle connections per host |
| `timeout` | integer | 1000-300000 | 30000 | Socket timeout (ms) |
| `pipelining` | integer | 0-100 | 0 | Number of pipelined requests |

### Examples

**Global Configuration:**
```json
{
  "connectionPool": {
    "enabled": true,
    "keepAliveTimeout": 60000,
    "maxConnections": 50
  },
  "mcpServers": {
    // All remote servers inherit these settings
  }
}
```

**Per-Server Override:**
```json
{
  "mcpServers": {
    "high-traffic-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "connectionPool": {
        "maxConnections": 100,  // Override global setting
        "keepAliveTimeout": 30000
      }
    }
  }
}
```

**Disable Pooling:**
```json
{
  "connectionPool": {
    "enabled": false  // Disable globally for debugging
  }
}
```

### When to Use

**Use Global Configuration When:**
- All remote servers have similar requirements
- You want centralized performance tuning
- Standard settings work for most servers

**Use Per-Server Overrides When:**
- High-traffic servers need more connections
- Low-latency requirements (shorter keep-alive)
- Legacy servers have connection limits

**Disable Pooling When:**
- Debugging connection-related issues
- Servers don't support persistent connections
- Development/testing environments

### Performance Impact

- **Enabled:** 10-30% latency reduction for remote servers
- **Connection Reuse:** Reduces TLS handshake overhead
- **Resource Usage:** Monitor `maxConnections` and `maxFreeConnections`

## Tool Filtering Configuration

Manages which tools are exposed to MCP clients.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable tool filtering globally |
| `mode` | string | `"static"` | Filtering mode (see below) |
| `serverFilter` | object | - | Server-based filtering |
| `categoryFilter` | object | - | Category-based filtering |
| `promptBasedFiltering` | object | - | LLM-driven dynamic exposure |
| `llmCategorization` | object | - | LLM provider configuration |
| `autoEnableThreshold` | integer | - | Auto-enable when tool count exceeds threshold |

### Filtering Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `static` | Expose all tools | Default, no filtering |
| `server-allowlist` | Filter by server name | Limit to specific servers |
| `category` | Filter by tool category | Expose specific categories |
| `hybrid` | Server + category filtering | Combined filtering |
| `prompt-based` | LLM-driven dynamic exposure | Intelligent context-aware filtering |

### Server Filter Configuration

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",  // or "denylist"
      "servers": ["github", "filesystem", "memory"]
    }
  }
}
```

### Category Filter Configuration

**Valid Categories:**
- `filesystem` - File system operations
- `web` - Web and HTTP operations
- `search` - Search engines
- `database` - Database operations
- `version-control` - Git, GitHub, GitLab
- `docker` - Container operations
- `cloud` - AWS, GCP, Azure
- `development` - npm, pip, linters, etc.
- `communication` - Slack, email, Discord
- `other` - Uncategorized tools

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web"],
      "customMappings": {
        "myserver__*": "custom-category",
        "special_tool": "filesystem"
      }
    }
  }
}
```

### Prompt-Based Filtering (LLM-Driven)

Zero-default exposure with intelligent tool discovery based on user intent.

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",  // "zero", "meta-only", "minimal", "all"
      "enableMetaTools": true,
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",  // "gemini", "openai", "anthropic"
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash",
      "temperature": 0,
      "maxRetries": 3
    }
  }
}
```

**Default Exposure Levels:**
- `zero` - No tools exposed initially
- `meta-only` - Only `hub__analyze_prompt` meta-tool (recommended)
- `minimal` - Core essential tools
- `all` - All tools (defeats purpose of filtering)

**Workflow:**
1. Client starts with zero/meta-only tools
2. User makes request → Client calls `hub__analyze_prompt`
3. Hub uses LLM to analyze prompt → Identifies relevant categories
4. Hub exposes relevant tools → Sends `tools/list_changed` notification
5. Client re-fetches tool list → Proceeds with original request

**Benefits:**
- 70-90% token reduction (typical)
- Context-aware tool exposure
- Per-client isolation
- Prevents tool overload (25+ servers = 50k+ tokens)

**LLM Provider Support:**

| Provider | Recommended Model | API Key Env Var |
|----------|-------------------|-----------------|
| Gemini | `gemini-2.5-flash` | `GEMINI_API_KEY` |
| OpenAI | `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY` |

See `claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md` for complete guide.

## MCP Server Configurations

### Transport Types

MCP Hub supports three transport types:

1. **STDIO** - Local script-based servers
2. **SSE** - Server-Sent Events (remote servers)
3. **streamable-http** - HTTP streaming with OAuth (remote servers)

### STDIO Server Configuration

For local script-based MCP servers.

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["server.js", "--port", "3000"],
      "env": {
        "API_KEY": "${GITHUB_TOKEN}",
        "NODE_ENV": "production"
      },
      "cwd": "${workspaceFolder}/server",
      "disabled": false
    }
  }
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `command` | string | ✅ | Command to execute |
| `args` | string[] | ❌ | Command arguments |
| `env` | object | ❌ | Environment variables |
| `cwd` | string | ❌ | Working directory (default: `.`) |
| `disabled` | boolean | ❌ | Disable server (default: `false`) |
| `dev` | object | ❌ | Development mode configuration |
| `note` | string | ❌ | Documentation note |

**⚠️ STDIO servers do NOT support `connectionPool` property.**

### SSE Server Configuration

For remote servers using Server-Sent Events.

```json
{
  "mcpServers": {
    "remote-server": {
      "type": "sse",  // Optional, inferred if 'url' present
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "connectionPool": {
        "maxConnections": 75
      }
    }
  }
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ❌ | Transport type (`"sse"`) |
| `url` | string | ✅ | Server URL |
| `headers` | object | ❌ | HTTP headers |
| `connectionPool` | object | ❌ | Per-server pool config |
| `disabled` | boolean | ❌ | Disable server |
| `note` | string | ❌ | Documentation note |

### streamable-http Server Configuration

For remote servers with OAuth support.

```json
{
  "mcpServers": {
    "oauth-server": {
      "type": "streamable-http",  // Required
      "url": "https://mcp.example.com",
      "headers": {
        "Authorization": "Bearer ${TOKEN}"
      },
      "connectionPool": {
        "maxConnections": 100,
        "keepAliveTimeout": 30000
      }
    }
  }
}
```

**Properties:** Same as SSE, but `type: "streamable-http"` is required.

**OAuth Flow:**
1. Hub creates callback endpoint at `/oauth/callback`
2. Opens browser with authorization URL
3. Waits for authorization code callback
4. Exchanges code for tokens
5. Establishes authenticated connection

### Development Mode (STDIO Only)

Enables hot-reload for STDIO servers during development.

```json
{
  "mcpServers": {
    "dev-server": {
      "command": "node",
      "args": ["server.js"],
      "dev": {
        "enabled": true,
        "watch": ["**/*.js", "**/*.ts", "!node_modules/**"],
        "cwd": "/absolute/path/to/server"  // REQUIRED
      }
    }
  }
}
```

**⚠️ Important:** `dev.cwd` MUST be an absolute path!

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | ✅ | Enable dev mode |
| `watch` | string[] | ❌ | Glob patterns to watch |
| `cwd` | string | ✅ | Absolute watch directory |

## Environment Variable Resolution

MCP Hub supports powerful environment variable resolution with multiple syntaxes.

### Syntax Types

| Syntax | Description | Example |
|--------|-------------|---------|
| `${VAR}` | Standard env variable | `${GITHUB_TOKEN}` |
| `${env:VAR}` | Explicit env variable | `${env:API_KEY}` |
| `${cmd: command}` | Command execution | `${cmd: op read op://vault/key}` |
| `${workspaceFolder}` | VS Code workspace | `${workspaceFolder}/config` |
| `${userHome}` | User home directory | `${userHome}/.config` |
| `${/}` | Path separator | `${workspaceFolder}${/}config` |
| `${input:id}` | VS Code input variable | `${input:api-key}` |

### Resolution Priority

1. **Predefined Variables** - `${workspaceFolder}`, `${userHome}`, etc.
2. **Process Environment** - `process.env`
3. **Global Environment** - Top-level `env` in config
4. **Server Environment** - Server-specific `env`

### Multi-Pass Resolution

Environment variables are resolved recursively with cycle detection:

```json
{
  "env": {
    "BASE_PATH": "${userHome}/projects",
    "PROJECT_PATH": "${BASE_PATH}/my-app",
    "CONFIG_FILE": "${PROJECT_PATH}/config.json"
  }
}
```

### Command Execution

Execute commands to retrieve values dynamically:

```json
{
  "env": {
    "API_KEY": "${cmd: op read op://vault/api-key --raw}",
    "COMMIT_SHA": "${cmd: git rev-parse HEAD}",
    "VERSION": "${cmd: node -p \"require('./package.json').version\"}"
  }
}
```

### Examples

**GitHub Server:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Workspace-Relative Paths:**
```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["${workspaceFolder}/server/index.js"],
      "cwd": "${workspaceFolder}/server"
    }
  }
}
```

**Command Execution:**
```json
{
  "mcpServers": {
    "secure-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${cmd: op read op://vault/key --raw}",
        "DB_PASSWORD": "${cmd: aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text}"
      }
    }
  }
}
```

## VS Code Compatibility

MCP Hub supports VS Code's `.vscode/mcp.json` format.

### Supported Features

- ✅ `servers` key (normalized to `mcpServers`)
- ✅ `${env:VAR}` syntax
- ✅ `${input:VAR}` syntax via `MCP_HUB_ENV`
- ✅ Predefined variables: `${workspaceFolder}`, `${userHome}`, etc.
- ✅ All STDIO server options

### Migration from VS Code

Simply rename your `.vscode/mcp.json` to `mcp-servers.json` and MCP Hub will automatically handle the conversion.

**VS Code Format:**
```json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

**Automatically Normalized To:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Complete Examples

### Minimal Configuration

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
```

### Production Configuration

```json
{
  "$schema": "./config.schema.json",
  "connectionPool": {
    "enabled": true,
    "keepAliveTimeout": 60000,
    "maxConnections": 50
  },
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
  },
  "mcpServers": {
    "github": {
      "command": "${HOME}/bin/github-mcp-server",
      "args": ["stdio"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "note": "GitHub's official MCP server with 260+ tools"
    },
    "vercel": {
      "type": "streamable-http",
      "url": "https://mcp.vercel.com",
      "headers": {
        "Authorization": "Bearer ${VERCEL_TOKEN}"
      },
      "connectionPool": {
        "maxConnections": 100
      },
      "note": "Official Vercel deployment server"
    },
    "custom-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "X-Custom-Header": "value"
      }
    }
  }
}
```

### Development Configuration

```json
{
  "mcpServers": {
    "local-dev": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "${workspaceFolder}/server",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      },
      "dev": {
        "enabled": true,
        "watch": ["**/*.js", "**/*.ts", "!node_modules/**"],
        "cwd": "/home/user/projects/my-server"
      }
    }
  }
}
```

## Validation and Error Handling

### Common Validation Errors

**Invalid Connection Pool:**
```
ConfigError: Server 'my-server' has invalid connectionPool configuration: 
  - keepAliveTimeout must be between 1000 and 600000
  - maxConnections must be between 1 and 1000
```

**Invalid Dev Config:**
```
ConfigError: Server 'my-server' dev.cwd must be an absolute path
```

**Invalid Tool Filtering:**
```
ConfigError: Invalid toolFiltering.mode: 'invalid-mode'. 
Must be one of: static, server-allowlist, category, hybrid, prompt-based
```

**STDIO Connection Pool Error:**
```
ConfigError: Server 'my-server' is STDIO transport and cannot have connectionPool configuration
```

### Runtime Validation

All configuration is validated at:
1. **Load Time** - When config file is first read
2. **Watch Events** - When config file changes
3. **API Updates** - When config is updated via REST API

### Debugging Configuration

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug bun start
```

**Check Resolved Environment Variables:**
```bash
# Look for "Resolved environment variable" messages in logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "Resolved"
```

## Best Practices

### Security

1. **Never hardcode secrets** - Use environment variables:
   ```json
   "env": {
     "API_KEY": "${GITHUB_TOKEN}"  // ✅ Good
     "API_KEY": "ghp_abc123..."    // ❌ Bad
   }
   ```

2. **Use command execution for secret managers**:
   ```json
   "env": {
     "API_KEY": "${cmd: op read op://vault/key --raw}"
   }
   ```

3. **Store sensitive config outside version control**:
   - Add `mcp-servers.json` to `.gitignore`
   - Use `mcp-servers.example.json` for templates

### Performance

1. **Enable connection pooling for remote servers**
2. **Use prompt-based filtering for 25+ servers**
3. **Adjust `maxConnections` for high-traffic servers**
4. **Monitor logs for connection pool exhaustion**

### Development

1. **Use dev mode for STDIO servers during development**
2. **Set absolute paths in `dev.cwd`**
3. **Use `disabled: true` instead of deleting servers**
4. **Add `note` fields for documentation**

### Organization

1. **Group related servers** - Use consistent naming
2. **Document server purposes** - Use `note` fields
3. **Use JSON5 comments** - Inline documentation
4. **Keep example config updated** - Template for new users

## Schema Versioning

The schema follows semantic versioning:

- **Major:** Breaking changes to configuration structure
- **Minor:** New optional properties
- **Patch:** Documentation updates, bug fixes

Current version: **1.0.0**

## Related Documentation

- **MCP Protocol Specification:** [2025-03-26](https://spec.modelcontextprotocol.io/)
- **Prompt-Based Filtering Guide:** `claudedocs/PROMPT_BASED_FILTERING_QUICK_START.md`
- **HTTP Connection Pooling:** `claudedocs/HTTP_CONNECTION_POOL.md`
- **VS Code Compatibility:** `README.md` (VS Code section)
- **Environment Resolution:** `src/utils/env-resolver.js`

## Support

For issues or questions:
- GitHub Issues: Report bugs or feature requests
- Documentation: Check `claudedocs/` directory
- Examples: See `mcp-servers.example.json`
