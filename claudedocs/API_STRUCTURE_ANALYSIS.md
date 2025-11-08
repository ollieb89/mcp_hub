# API Structure Analysis - Flat vs Envelope

**Created**: 2025-01-08
**Purpose**: Document actual API response structure to fix schema tests

## Summary

All MCP Hub API endpoints use **FLAT** structure, NOT envelope structure.

## Structure Comparison

### FLAT (Actual API)
```typescript
{
  // Direct data fields
  config: {},
  version: "1.0.0",
  timestamp: "2025-01-08T12:00:00.000Z"
}
```

### ENVELOPE (Incorrect Test Expectation)
```typescript
{
  status: "success",  // ❌ Not in actual API
  meta: {             // ❌ Not in actual API
    timestamp: "..."
  },
  data: {             // ❌ Not in actual API
    config: {},
    version: "1.0.0"
  }
}
```

## Endpoint Analysis

### `/api/config` - GET

**Schema**: `ConfigResponseSchema` (config.schema.ts:101-105)

**Actual Structure**:
```typescript
{
  config: ConfigDataSchema,  // Flat
  version: string,
  timestamp: string  // ISO 8601 datetime
}
```

**Test Errors**:
- Line 69: `status: 'success'` - Does NOT exist
- Line 70-72: `meta` wrapper - Does NOT exist
- Line 73-80: `data` wrapper - Does NOT exist
- Line 79: `version: 1` - Should be `version: "1.0.0"` (string not number)
- Line 80: `path` field - Does NOT exist in schema

**Correct Test Data**:
```typescript
const response = {
  config: {
    mcpServers: {
      github: { command: 'github-server' },
    },
  },
  version: '1.0.0',
  timestamp: '2025-01-08T12:00:00.000Z'
};
```

### `/api/config` - POST (Save)

**Schema**: `ConfigSaveRequestSchema` (config.schema.ts:110-112)

**Actual Structure**:
```typescript
{
  config: ConfigDataSchema  // Just the config, no version
}
```

**Test Errors**:
- Line 94: `version: 1` - Should NOT exist (only in response, not request)
- Line 100-108: Test expects rejection without version - WRONG, version not required

**Correct Test Data**:
```typescript
// Valid request
const request = {
  config: {
    mcpServers: {},
  }
  // No version field in request
};
```

### `/api/filtering/stats` - GET

**Schema**: `FilteringStatsSchema` (filtering.schema.ts:25-40)

**Actual Structure**:
```typescript
{
  enabled: boolean,
  mode: FilteringModeSchema,
  totalTools: number,
  filteredTools: number,
  exposedTools: number,
  filterRate: number,
  serverFilterMode: 'allowlist' | 'blocklist',
  allowedServers: string[],
  allowedCategories: string[],
  categoryCacheSize: number,
  cacheHitRate: number,
  llmCacheSize: number,
  llmCacheHitRate: number,
  timestamp: string  // ISO 8601 datetime
}
```

**Test Errors**:
- Line 131-135: Missing required fields (enabled, filteredTools, filterRate, serverFilterMode, allowedServers, allowedCategories, categoryCacheSize, cacheHitRate, llmCacheSize, llmCacheHitRate, timestamp)
- Line 142: `categorizedTools` - Does NOT exist in schema
- Line 143-147: `categories` object - Does NOT exist in schema
- Line 148: `serverAllowlist` - Does NOT exist (use `allowedServers` instead)

**Correct Test Data**:
```typescript
// Minimal stats
const stats = {
  enabled: true,
  mode: 'static' as const,
  totalTools: 100,
  filteredTools: 50,
  exposedTools: 50,
  filterRate: 0.5,
  serverFilterMode: 'allowlist' as const,
  allowedServers: [],
  allowedCategories: [],
  categoryCacheSize: 0,
  cacheHitRate: 0,
  llmCacheSize: 0,
  llmCacheHitRate: 0,
  timestamp: '2025-01-08T12:00:00.000Z'
};
```

### `/api/tools` - GET

**Schema**: `ToolsResponseSchema` (tools.schema.ts:26-29)

**Actual Structure**:
```typescript
{
  tools: ToolSummarySchema[],
  timestamp: string  // ISO 8601 datetime
}
```

**ToolSummarySchema** (tools.schema.ts:14-21):
```typescript
{
  server: string,
  serverDisplayName: string,
  name: string,
  description: string,
  enabled: boolean,
  categories: string[]
}
```

**Test Errors**:
- Line 201-206: `status/meta/data` envelope - Does NOT exist
- Line 222-224: `serverName` field - Should be `server` and `serverDisplayName`
- Line 230-239: Missing `enabled` and `categories` fields
- Line 256: `data: []` - Should be `tools: []`

**Correct Test Data**:
```typescript
// Empty tools list
const response = {
  tools: [],
  timestamp: '2025-01-08T12:00:00.000Z'
};

// With tools
const response = {
  tools: [
    {
      server: 'filesystem',
      serverDisplayName: 'Filesystem',
      name: 'read_file',
      description: 'Read file contents',
      enabled: true,
      categories: ['filesystem']
    }
  ],
  timestamp: '2025-01-08T12:00:00.000Z'
};
```

### `/api/health` - GET

**Schema**: `HealthResponseSchema` (health.schema.ts:44-78)

**Actual Structure**:
```typescript
{
  status: 'ok' | 'error',
  state: 'starting' | 'ready' | 'restarting' | 'restarted' | 'stopped' | 'stopping' | 'error',
  server_id: string,
  activeClients: number,
  timestamp: string,  // ISO 8601 datetime
  servers: HealthServerInfoSchema[],
  version?: string,  // Optional
  connections?: ConnectionsInfoSchema  // Optional
}
```

**Test Errors**:
- Line 246: `status: 'success'` - Should be `status: 'ok'`
- Line 247-249: `meta` wrapper - Does NOT exist
- Line 250-257: `data` wrapper - Does NOT exist
- Line 251: `status: 'ready'` - Should be `state: 'ready'`
- Line 252: `uptime` - Does NOT exist in HealthResponseSchema
- Line 253-255: `servers` nested in data - Should be at top level

**Correct Test Data**:
```typescript
const response = {
  status: 'ok' as const,
  state: 'ready' as const,
  server_id: 'test-server',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [
    {
      name: 'filesystem',
      displayName: 'Filesystem',
      description: 'File operations',
      transportType: 'stdio' as const,
      status: 'connected' as const,
      error: null,
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: []
      },
      uptime: 0,
      lastStarted: '2025-01-08T11:00:00.000Z',
      authorizationUrl: null,
      serverInfo: { name: 'filesystem', version: '1.0.0' },
      config_source: 'mcp-servers.json'
    }
  ]
};
```

## Migration Plan

### Phase 1: Update Test Data ✅ (Tasks 3-5, 1.75 hours)

1. **ConfigResponseSchema** (Task 3, 45 min):
   - Remove envelope wrapper
   - Fix `version` type (string not number)
   - Remove `path` field

2. **FilteringStatsSchema** (Task 5, 30 min):
   - Add all required fields
   - Remove non-existent fields (`categorizedTools`, `categories`, `serverAllowlist`)

3. **ToolsResponseSchema** (Task 4, 30 min):
   - Change `data` to `tools`
   - Fix ToolSummarySchema field names (`server`/`serverDisplayName` not `serverName`)
   - Add required fields (`enabled`, `categories`)

4. **HealthResponseSchema** (Task 3, 45 min):
   - Remove envelope wrapper
   - Fix `status` values ('ok' not 'success')
   - Fix `state` vs `status` field names
   - Remove `uptime` field (not in schema)
   - Move `servers` to top level

### Phase 2: Documentation (Task 8, 45 min)

Create `claudedocs/SCHEMA_TESTING_PATTERNS.md` with:
- Flat vs envelope structure explanation
- Schema field reference for each endpoint
- Test data factory examples
- Common pitfalls and fixes

## Schema Documentation Comments

All schema files already document the flat structure in comments:

```typescript
/**
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
```

This confirms the flat structure is intentional and correct.
