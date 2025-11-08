# Current API Response Formats

**Date**: 2025-11-08
**Purpose**: Document actual API response structures for schema adaptation

---

## /api/health

**Response Format**:
```json
{
  "status": "ok",
  "state": "ready",
  "server_id": "mcp-hub",
  "activeClients": 0,
  "timestamp": "2025-11-08T04:10:00.173Z",
  "servers": [
    {
      "name": "serena",
      "displayName": "serena",
      "description": "",
      "transportType": "stdio",
      "status": "disconnected",
      "error": "Failed to connect...",
      "capabilities": {
        "tools": [],
        "resources": [],
        "resourceTemplates": [],
        "prompts": []
      },
      "uptime": 0,
      "lastStarted": null,
      "authorizationUrl": null,
      "serverInfo": null,
      "config_source": "./mcp-servers.json"
    }
  ]
}
```

**Schema Requirements**:
- Flat structure (no envelope)
- `status`: "ok" | "error"
- `state`: "starting" | "ready" | "restarting" | "stopped"
- `timestamp`: ISO 8601 string
- `servers`: Array of server info objects

---

## /api/servers

**Response Format**:
```json
{
  "servers": [
    {
      "name": "shadcn-ui",
      "displayName": "shadcn-ui",
      "description": "",
      "transportType": "stdio",
      "status": "connected",
      "error": null,
      "capabilities": {
        "tools": [
          {
            "name": "get_component",
            "description": "Get the source code...",
            "inputSchema": { /* JSON schema */ }
          }
        ],
        "resources": [
          {
            "name": "get_components",
            "uri": "resource:get_components",
            "description": "List of available...",
            "contentType": "text/plain"
          }
        ],
        "resourceTemplates": [
          {
            "name": "get_install_script_for_component",
            "uriTemplate": "resource-template:...",
            "description": "Generate installation...",
            "contentType": "text/plain"
          }
        ],
        "prompts": [
          {
            "name": "build-shadcn-page",
            "description": "Generate a complete...",
            "arguments": [
              {
                "name": "pageType",
                "description": "Type of page...",
                "required": true
              }
            ]
          }
        ]
      },
      "uptime": 4696,
      "lastStarted": "2025-11-08T02:51:40.914Z",
      "authorizationUrl": null,
      "serverInfo": {
        "name": "shadcn-ui-mcp-server",
        "version": "1.1.4"
      },
      "config_source": "./mcp-servers.json"
    }
  ]
}
```

**Schema Requirements**:
- Root: `{ servers: ServerInfo[] }`
- `status`: "connected" | "connecting" | "disconnected" | "error"
- `error`: string | null
- `capabilities`: Object with tools, resources, resourceTemplates, prompts
- `uptime`: number (seconds)
- `lastStarted`: ISO 8601 string | null
- `serverInfo`: { name: string, version: string } | null

---

## /api/config

**Response Format**:
```json
{
  "config": {
    "toolFiltering": {
      "enabled": true,
      "mode": "server-allowlist",
      "comment": "Modes: 'static', 'server-allowlist', 'prompt-based'",
      "promptBasedFiltering": {
        "enabled": true,
        "defaultExposure": "meta-only",
        "enableMetaTools": true,
        "sessionIsolation": true
      },
      "serverFilter": {
        "mode": "allowlist",
        "servers": ["serena", "git", "github"]
      },
      "llmCategorization": {
        "enabled": true,
        "provider": "gemini",
        "apiKey": "${GEMINI_API_KEY}",
        "model": "gemini-2.5-flash"
      }
    },
    "mcpServers": {
      "serena": {
        "command": "uv",
        "args": ["run", "--directory", "${HOME}/..."],
        "cwd": ".",
        "env": {},
        "disabled": false
      }
    }
  }
}
```

**Schema Requirements**:
- Root: `{ config: ConfigData }`
- `toolFiltering`: Optional configuration object
- `mcpServers`: Record<string, ServerConfig>

---

## /api/filtering/stats

**Response Format**:
```json
{
  "enabled": true,
  "mode": "server-allowlist",
  "totalTools": 355,
  "filteredTools": 205,
  "exposedTools": 150,
  "filterRate": 0.5774647887323944,
  "serverFilterMode": "allowlist",
  "allowedServers": ["serena", "git", "github"],
  "allowedCategories": [],
  "categoryCacheSize": 352,
  "cacheHitRate": 0.008450704225352112,
  "llmCacheSize": 153,
  "llmCacheHitRate": 0,
  "timestamp": "2025-11-08T04:12:56.647Z"
}
```

**Schema Requirements**:
- Flat structure (no envelope)
- `mode`: "static" | "server-allowlist" | "category" | "prompt-based"
- All numeric fields: number
- `allowedServers`: string[]
- `allowedCategories`: string[]
- `timestamp`: ISO 8601 string

---

## /api/tools

**Response Format**:
```json
{
  "tools": [
    {
      "server": "shadcn-ui",
      "serverDisplayName": "shadcn-ui",
      "name": "get_component",
      "description": "Get the source code for...",
      "enabled": true,
      "categories": []
    }
  ]
}
```

**Schema Requirements**:
- Root: `{ tools: ToolSummary[] }`
- `server`: string
- `serverDisplayName`: string
- `name`: string
- `description`: string
- `enabled`: boolean
- `categories`: string[]

---

## Common Patterns

### Timestamps
- **Format**: ISO 8601 with milliseconds
- **Example**: `"2025-11-08T04:10:00.173Z"`
- **Schema**: `z.string().datetime()`

### Nullable Fields
- `error`: `string | null`
- `lastStarted`: `string | null`
- `serverInfo`: `object | null`
- `authorizationUrl`: `string | null`

### Status Enumerations
- **Server Status**: `"connected" | "connecting" | "disconnected" | "error"`
- **Health Status**: `"ok" | "error"`
- **Hub State**: `"starting" | "ready" | "restarting" | "stopped"`
- **Filter Mode**: `"static" | "server-allowlist" | "category" | "prompt-based"`

### Array Fields
- Always non-null arrays (never null)
- Can be empty arrays `[]`

---

## Key Differences from Design Spec

| Aspect | Design Spec (Envelope) | Current API (Flat) |
|--------|------------------------|---------------------|
| **Structure** | `{ status, meta, data }` | Flat object |
| **Timestamp** | `meta.timestamp` | Root `timestamp` |
| **Status** | `"success" \| "error"` | Varies by endpoint |
| **Request ID** | `meta.requestId` | Not implemented |
| **Error Format** | `{ status: "error", error: {...} }` | Varies (HTTP status + body) |

---

## Migration Notes

When backend implements response envelopes:

1. **Wrapper Pattern**:
   ```typescript
   const withEnvelope = <T extends z.ZodType>(dataSchema: T) =>
     z.object({
       status: z.literal('success'),
       meta: z.object({
         timestamp: z.string().datetime(),
         requestId: z.string().optional(),
       }),
       data: dataSchema,
     });
   ```

2. **Schema Updates**:
   ```typescript
   // Current (Phase 1-2)
   export const HealthResponseSchema = z.object({
     status: z.enum(['ok', 'error']),
     state: z.enum(['starting', 'ready', 'restarting', 'stopped']),
     timestamp: z.string().datetime(),
     servers: z.array(ServerInfoSchema),
   });

   // Future (Phase 3-4 after backend migration)
   export const HealthResponseSchema = withEnvelope(
     z.object({
       state: z.enum(['starting', 'ready', 'restarting', 'stopped']),
       servers: z.array(ServerInfoSchema),
     })
   );
   ```

3. **API Client Updates**:
   - Extract `data` field from envelope
   - Handle `meta.requestId` for tracking
   - Map `status: "error"` to error handling

---

**Last Updated**: 2025-11-08
**Document Version**: 1.0
**Purpose**: Schema rewrite reference for Phase 1 completion
