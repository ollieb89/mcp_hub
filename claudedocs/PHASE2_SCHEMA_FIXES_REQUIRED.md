# Phase 2 Schema Fixes - Action Items

**Status:** Ready for Implementation
**Estimated Time:** 1.5 hours
**Priority:** Complete before Phase 2 React Query implementation

---

## Critical Fixes (Priority 1 - MUST DO)

### 1. Fix Health Response State Enum

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/health.schema.ts`

**Current:**
```typescript
state: z.enum(['starting', 'ready', 'restarting', 'stopped']),
```

**Fix:**
```typescript
state: z.enum(['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error']),
```

**Reason:** Backend uses `HubState.RESTARTED`, `HubState.STOPPING`, and `HubState.ERROR` which are not in schema.

---

### 2. Fix Server Status Enum

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/server.schema.ts`

**Current:**
```typescript
export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
]);
```

**Fix:**
```typescript
export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
  'unauthorized',
  'disabled'
]);
```

**Reason:** MCPConnection supports `unauthorized` and `disabled` states.

---

### 3. Add Missing Timestamp Fields

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/server.schema.ts`

**Current:**
```typescript
export const ServersResponseSchema = z.object({
  servers: z.array(ServerInfoSchema),
});
```

**Fix:**
```typescript
export const ServersResponseSchema = z.object({
  servers: z.array(ServerInfoSchema),
  timestamp: z.string().datetime()
});
```

---

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/tools.schema.ts`

**Current:**
```typescript
export const ToolsResponseSchema = z.object({
  tools: z.array(ToolSummarySchema),
});
```

**Fix:**
```typescript
export const ToolsResponseSchema = z.object({
  tools: z.array(ToolSummarySchema),
  timestamp: z.string().datetime()
});
```

**Reason:** Backend returns `timestamp` in both responses but schemas don't validate it.

---

### 4. Add Optional Health Response Fields

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/health.schema.ts`

**Current:**
```typescript
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  state: z.enum([...]),
  server_id: z.string(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
});
```

**Fix:**
```typescript
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  state: z.enum(['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error']),
  server_id: z.string(),
  version: z.string().optional(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
  connections: z.object({
    totalConnections: z.number(),
    connections: z.array(z.object({
      id: z.string(),
      state: z.string(),
      connectedAt: z.string().datetime(),
      lastEventAt: z.string().datetime()
    }))
  }).optional(),
  mcpEndpoint: z.object({
    totalConnections: z.number(),
    activeConnections: z.number(),
    totalRequests: z.number()
  }).optional(),
  workspaces: z.object({
    current: z.string(),
    allActive: z.array(z.object({
      key: z.string(),
      port: z.number(),
      configPaths: z.array(z.string()),
      pid: z.number(),
      state: z.string(),
      activeConnections: z.number()
    }))
  }).optional()
});
```

**Reason:** Backend conditionally returns these fields but schema doesn't validate them.

---

### 5. Fix Filtering Mode Enum

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/filtering.schema.ts`

**Current:**
```typescript
export const FilteringModeSchema = z.enum([
  'static',
  'server-allowlist',
  'category',
  'prompt-based',
]);
```

**Fix Option A (Add "hybrid"):**
```typescript
export const FilteringModeSchema = z.enum([
  'static',
  'server-allowlist',
  'category',
  'hybrid',
  'prompt-based',
]);
```

**Fix Option B (Remove from backend):**
Update `/home/ob/Development/Tools/mcp-hub/src/server.js:672` to remove "hybrid":
```javascript
const validModes = ["server-allowlist", "category", "prompt-based"];
```

**Reason:** Backend validates "hybrid" mode but schema doesn't include it.

**Recommendation:** Choose Option A (add to schema) as it's simpler and backward compatible.

---

## High Value Additions (Priority 2 - SHOULD DO)

### 6. Create Server Action Schemas

**New File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/server-actions.schema.ts`

```typescript
/**
 * Server action schemas for start/stop/refresh operations
 */
import { z } from 'zod';
import { ServerInfoSchema } from './server.schema';

/**
 * Request schema for server actions (start, stop, refresh)
 */
export const ServerActionRequestSchema = z.object({
  server_name: z.string()
});

/**
 * Response schema for server actions
 */
export const ServerActionResponseSchema = z.object({
  status: z.literal("ok"),
  server: ServerInfoSchema,
  timestamp: z.string().datetime()
});

// Type exports
export type ServerActionRequest = z.infer<typeof ServerActionRequestSchema>;
export type ServerActionResponse = z.infer<typeof ServerActionResponseSchema>;
```

**Reason:** UI needs these for server start/stop/refresh operations.

---

### 7. Create SSE Event Schemas

**New File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/sse.schema.ts`

```typescript
/**
 * SSE event schemas for real-time updates
 */
import { z } from 'zod';

/**
 * Core SSE event types
 */
export const SSEEventTypeSchema = z.enum([
  'heartbeat',
  'hub_state',
  'log',
  'subscription_event'
]);

/**
 * Subscription event types
 */
export const SubscriptionTypeSchema = z.enum([
  'config_changed',
  'servers_updating',
  'servers_updated',
  'tool_list_changed',
  'resource_list_changed',
  'prompt_list_changed',
  'workspaces_updated'
]);

/**
 * Hub state values
 */
export const HubStateSchema = z.enum([
  'starting',
  'ready',
  'restarting',
  'restarted',
  'stopped',
  'stopping',
  'error'
]);

/**
 * Heartbeat event payload
 */
export const HeartbeatEventSchema = z.object({
  connections: z.number(),
  timestamp: z.string().datetime()
});

/**
 * Hub state event payload
 */
export const HubStateEventSchema = z.object({
  state: HubStateSchema,
  server_id: z.string(),
  pid: z.number(),
  port: z.number(),
  timestamp: z.string().datetime(),
  message: z.string().optional(),
  code: z.string().optional(),
  data: z.unknown().optional()
});

/**
 * Subscription event payload
 */
export const SubscriptionEventSchema = z.object({
  type: SubscriptionTypeSchema,
  changes: z.object({
    added: z.array(z.string()).optional(),
    removed: z.array(z.string()).optional(),
    modified: z.array(z.string()).optional()
  }).optional(),
  data: z.unknown().optional()
});

/**
 * Log event payload
 */
export const LogEventSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string(),
  timestamp: z.string().datetime(),
  context: z.unknown().optional()
});

// Type exports
export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;
export type HubState = z.infer<typeof HubStateSchema>;
export type HeartbeatEvent = z.infer<typeof HeartbeatEventSchema>;
export type HubStateEvent = z.infer<typeof HubStateEventSchema>;
export type SubscriptionEvent = z.infer<typeof SubscriptionEventSchema>;
export type LogEvent = z.infer<typeof LogEventSchema>;
```

**Reason:** Phase 2 React Query hooks need SSE event validation for real-time updates.

---

### 8. Add Config Response Optional Fields

**File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/config.schema.ts`

**Current:**
```typescript
export const ConfigResponseSchema = z.object({
  config: ConfigDataSchema,
});
```

**Fix:**
```typescript
export const ConfigResponseSchema = z.object({
  config: ConfigDataSchema,
  version: z.string(),
  timestamp: z.string().datetime()
});
```

**Reason:** Backend's `createVersionedResponse()` returns version and timestamp.

---

## Nice to Have (Priority 3 - COULD DO)

### 9. Marketplace Schemas (Optional)

**New File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/marketplace.schema.ts`

```typescript
import { z } from 'zod';

export const MarketplaceServerSchema = z.object({
  mcpId: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stars: z.number().optional(),
  // Add other fields based on marketplace.js implementation
});

export const MarketplaceResponseSchema = z.object({
  servers: z.array(MarketplaceServerSchema),
  timestamp: z.string().datetime()
});

export const MarketplaceDetailsRequestSchema = z.object({
  mcpId: z.string()
});

export const MarketplaceDetailsResponseSchema = z.object({
  server: z.unknown(), // Define based on actual response
  timestamp: z.string().datetime()
});
```

**Reason:** Only needed if Phase 2 includes marketplace functionality.

---

### 10. OAuth Schemas (Optional)

**New File:** `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/oauth.schema.ts`

```typescript
import { z } from 'zod';

export const OAuthAuthorizeRequestSchema = z.object({
  server_name: z.string()
});

export const OAuthManualCallbackRequestSchema = z.object({
  url: z.string().url()
});

export const OAuthManualCallbackResponseSchema = z.object({
  status: z.literal("ok"),
  message: z.string(),
  server_name: z.string(),
  timestamp: z.string().datetime()
});
```

**Reason:** Only needed if Phase 2 includes OAuth authorization UI.

---

## Implementation Order

1. **30 minutes** - Critical Fixes (Items 1-5)
   - Fix enums in health.schema.ts, server.schema.ts, filtering.schema.ts
   - Add timestamp fields to response schemas
   - Add optional fields to health response

2. **30 minutes** - SSE Event Schemas (Item 7)
   - Create new sse.schema.ts file
   - Export all event types and schemas

3. **15 minutes** - Server Action Schemas (Item 6)
   - Create new server-actions.schema.ts file
   - Export request/response schemas

4. **15 minutes** - Config Response Fix (Item 8)
   - Add version and timestamp to ConfigResponseSchema

**Total Time:** 1.5 hours for Priority 1 + Priority 2

---

## Testing Checklist

After implementing fixes:

- [ ] Run TypeScript compiler: `bun run typecheck` (if exists)
- [ ] Test schema validation against live endpoints
- [ ] Verify SSE event parsing with new schemas
- [ ] Check that existing UI code still compiles
- [ ] Run existing test suite: `bun test`

---

## Migration Notes

### Breaking Changes

**None** - All changes are additive or fix existing bugs. Existing code will continue to work.

### Deprecation Warnings

**None** - No features being deprecated.

### API Version

Current API version: Unversioned
Recommended: Consider adding `/api/v1/` prefix for future versioning strategy.

---

## Related Files

- `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/health.schema.ts`
- `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/server.schema.ts`
- `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/tools.schema.ts`
- `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/config.schema.ts`
- `/home/ob/Development/Tools/mcp-hub/src/ui/api/schemas/filtering.schema.ts`
- `/home/ob/Development/Tools/mcp-hub/src/utils/sse-manager.js` (reference for SSE event types)
- `/home/ob/Development/Tools/mcp-hub/src/server.js` (backend API implementation)

---

**Prepared By:** Backend Architect Agent
**Date:** 2025-11-08
**Ready for Implementation:** ✅ YES
