# Configuration Schema Quick Reference

**Quick navigation for MCP Hub configuration options**

## Top-Level Structure

```json
{
  "$schema": "./config.schema.json",
  "connectionPool": { },
  "toolFiltering": { },
  "mcpServers": { }
}
```

## Connection Pool (Global)

**Purpose**: HTTP connection pooling for remote servers (SSE/streamable-http)

```json
{
  "connectionPool": {
    "enabled": true,              // Enable pooling (default: true)
    "keepAliveTimeout": 60000,    // Socket keep-alive ms (1000-600000)
    "maxConnections": 50,         // Max connections per host (1-1000)
    "maxFreeConnections": 10,     // Max idle connections (0-100)
    "timeout": 30000,             // Socket timeout ms (1000-300000)
    "pipelining": 0               // Pipelined requests (0-100)
  }
}
```

**Performance Impact**: 10-30% latency reduction

---

## Tool Filtering

**Purpose**: Control which tools are exposed to MCP clients

### Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `static` | All tools exposed | Default, no filtering |
| `server-allowlist` | Filter by server | Limit specific servers |
| `category` | Filter by category | Expose specific tool types |
| `hybrid` | Server + category | Combined filtering |
| `prompt-based` | LLM-driven | Smart context-aware (70-90% token savings) |

### Basic Configuration

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",        // "allowlist" | "denylist"
      "servers": ["github", "filesystem"]
    }
  }
}
```

### Prompt-Based Filtering (Recommended for 25+ servers)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",  // "zero" | "meta-only" | "minimal" | "all"
      "enableMetaTools": true,
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",            // "gemini" | "openai" | "anthropic"
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash",     // Provider-specific model
      "temperature": 0,                // 0-2 (default: 0)
      "maxRetries": 3                  // 0-10 (default: 3)
    }
  }
}
```

**LLM Providers:**
- **Gemini**: `gemini-2.5-flash` (fastest), `gemini-2.5-pro` (best quality)
- **OpenAI**: `gpt-4o-mini`, `gpt-4o`
- **Anthropic**: `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`

---

## MCP Servers

### STDIO Server (Local Script)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",                    // Required
      "args": ["server.js"],                // Optional
      "env": {                              // Optional
        "API_KEY": "${GITHUB_TOKEN}"
      },
      "cwd": "${workspaceFolder}/server",   // Optional (default: ".")
      "disabled": false,                    // Optional (default: false)
      "dev": {                              // Optional (dev mode)
        "enabled": true,
        "watch": ["**/*.js"],
        "cwd": "/absolute/path/required"    // MUST be absolute
      }
    }
  }
}
```

**⚠️ STDIO servers cannot have `connectionPool` property**

### SSE Server (Remote)

```json
{
  "mcpServers": {
    "remote-sse": {
      "type": "sse",                        // Optional (inferred if url present)
      "url": "https://api.example.com/mcp", // Required
      "headers": {                          // Optional
        "Authorization": "Bearer ${TOKEN}"
      },
      "connectionPool": {                   // Optional (overrides global)
        "maxConnections": 100
      },
      "disabled": false
    }
  }
}
```

### streamable-http Server (Remote with OAuth)

```json
{
  "mcpServers": {
    "remote-http": {
      "type": "streamable-http",            // Required
      "url": "https://mcp.example.com",     // Required
      "headers": {                          // Optional
        "Authorization": "Bearer ${TOKEN}"
      },
      "connectionPool": {                   // Optional (overrides global)
        "maxConnections": 100,
        "keepAliveTimeout": 30000
      }
    }
  }
}
```

---

## Environment Variable Syntax

### All Supported Formats

| Syntax | Description | Example |
|--------|-------------|---------|
| `${VAR}` | Standard env var | `${GITHUB_TOKEN}` |
| `${env:VAR}` | Explicit env var | `${env:API_KEY}` |
| `${cmd: ...}` | Command execution | `${cmd: op read op://vault/key}` |
| `${workspaceFolder}` | Current working directory | `${workspaceFolder}/config` |
| `${userHome}` | User home directory | `${userHome}/.config` |
| `${/}` | Path separator | `config${/}file.json` |
| `${pathSeparator}` | Path separator (alias) | Same as `${/}` |
| `${input:id}` | VS Code input variable | `${input:api-key}` (via MCP_HUB_ENV) |

### Resolution Priority

1. Predefined variables (`${workspaceFolder}`, etc.)
2. Process environment (`process.env`)
3. Global environment (top-level `env` in config)
4. Server environment (server-specific `env`)

### Examples

```json
{
  "mcpServers": {
    "secure-server": {
      "command": "node",
      "args": ["${workspaceFolder}/server/index.js"],
      "cwd": "${workspaceFolder}/server",
      "env": {
        "API_KEY": "${cmd: op read op://vault/api-key --raw}",
        "DB_PASSWORD": "${cmd: aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text}",
        "CONFIG_PATH": "${userHome}${/}.config${/}app",
        "FALLBACK_VAR": "${OPTIONAL_VAR:-default-value}"
      }
    }
  }
}
```

---

## Tool Categories

**Standard Categories:**

| Category | Description | Example Patterns |
|----------|-------------|------------------|
| `filesystem` | File operations | `filesystem__*`, `*__read`, `*__write` |
| `web` | Web/HTTP | `fetch__*`, `http__*`, `browser__*` |
| `search` | Search engines | `brave__*`, `tavily__*`, `*__search` |
| `database` | Database ops | `postgres__*`, `mysql__*`, `*__query` |
| `version-control` | Git/GitHub | `github__*`, `git__*`, `*__commit` |
| `docker` | Containers | `docker__*`, `kubernetes__*` |
| `cloud` | Cloud services | `aws__*`, `gcp__*`, `azure__*` |
| `development` | Dev tools | `npm__*`, `pip__*`, `test__*` |
| `communication` | Chat/Email | `slack__*`, `email__*`, `discord__*` |
| `other` | Uncategorized | Fallback category |

**Custom Mappings:**

```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": ["filesystem", "web"],
      "customMappings": {
        "myserver__*": "custom-category",
        "special_tool": "filesystem"
      }
    }
  }
}
```

---

## Validation Commands

```bash
# Validate configuration file
bun run validate:config [path/to/config.json]

# Or use standalone script
bun scripts/validate-config.js mcp-servers.json

# Validate schema itself
bun run validate:schema
```

---

## Common Validation Errors

### Invalid Connection Pool
```
ConfigError: Server 'my-server' has invalid connectionPool configuration:
  - keepAliveTimeout must be between 1000 and 600000
```

**Fix**: Adjust values within valid ranges

### STDIO Connection Pool Error
```
ConfigError: Server 'my-server' is STDIO transport and cannot have connectionPool configuration
```

**Fix**: Remove `connectionPool` from STDIO servers

### Invalid Dev Config
```
ConfigError: Server 'my-server' dev.cwd must be an absolute path
```

**Fix**: Use absolute path: `/home/user/project/server` not `./server`

### Invalid Tool Filtering Mode
```
ConfigError: Invalid toolFiltering.mode: 'invalid-mode'
```

**Fix**: Use one of: `static`, `server-allowlist`, `category`, `hybrid`, `prompt-based`

---

## VS Code Compatibility

**Supported:**
- ✅ `servers` key (normalized to `mcpServers`)
- ✅ `${env:VAR}` syntax
- ✅ `${input:VAR}` via MCP_HUB_ENV
- ✅ Predefined variables (`${workspaceFolder}`, etc.)

**Migration:**
```bash
# Your .vscode/mcp.json works directly
mcp-hub --config .vscode/mcp.json --port 3000
```

---

## TypeScript Types

```typescript
import type { 
  McpHubConfig,
  ConnectionPoolConfig,
  ToolFilteringConfig,
  ServerConfig,
  StdioServerConfig,
  SseServerConfig,
  StreamableHttpServerConfig
} from 'mcp-hub/config.schema';

const config: McpHubConfig = {
  // Fully typed configuration
};
```

---

## Complete Example

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
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "vercel": {
      "type": "streamable-http",
      "url": "https://mcp.vercel.com",
      "headers": {
        "Authorization": "Bearer ${VERCEL_TOKEN}"
      },
      "connectionPool": {
        "maxConnections": 100
      }
    }
  }
}
```

---

## Resources

- **Full Documentation**: [`docs/CONFIG_SCHEMA.md`](./CONFIG_SCHEMA.md)
- **Schema File**: [`config.schema.json`](../config.schema.json)
- **TypeScript Types**: [`config.schema.d.ts`](../config.schema.d.ts)
- **Example Config**: [`mcp-servers.example.json`](../mcp-servers.example.json)
- **Validation Script**: [`scripts/validate-config.js`](../scripts/validate-config.js)

---

**Version**: 1.0.0 | **Last Updated**: 2024