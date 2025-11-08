# Schema Implementation Guide - Quick Reference

**Status:** Ready for Implementation
**Estimated Time:** 3 hours
**Dependencies:** None (all changes are additive)

---

## Quick Start Checklist

```bash
# 1. Create feature branch
git checkout -b schema-fixes-phase2

# 2. Implement fixes in order (Phase 1-7)
# 3. Run tests after each phase
bun test

# 4. Final validation
bun run test:coverage
bun run typecheck  # If TypeScript check script exists

# 5. Commit and push
git add .
git commit -m "feat(schemas): Phase 2 schema fixes for Zod validation"
git push origin schema-fixes-phase2
```

---

## Implementation Order (Dependencies First)

### Phase 1: Critical Enum Fixes (30 min) 🔴

**Files to Modify:**
1. `src/ui/api/schemas/health.schema.ts`
2. `src/ui/api/schemas/server.schema.ts`
3. `src/ui/api/schemas/filtering.schema.ts`

**Changes:**

```typescript
// 1. health.schema.ts - Line 46
// BEFORE:
state: z.enum(['starting', 'ready', 'restarting', 'stopped']),

// AFTER:
state: z.enum(['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error']),
```

```typescript
// 2. server.schema.ts - Lines 14-19
// BEFORE:
export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
]);

// AFTER:
export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
  'unauthorized',
  'disabled'
]);
```

```typescript
// 3. filtering.schema.ts - Lines 14-19
// BEFORE:
export const FilteringModeSchema = z.enum([
  'static',
  'server-allowlist',
  'category',
  'prompt-based',
]);

// AFTER:
export const FilteringModeSchema = z.enum([
  'static',
  'server-allowlist',
  'category',
  'hybrid',
  'prompt-based',
]);
```

**Validation:**
```bash
bun test src/ui/api/schemas/__tests__/
# All existing tests should still pass
```

---

### Phase 2: Timestamp Fields (15 min) 🟡

**Files to Modify:**
1. `src/ui/api/schemas/server.schema.ts`
2. `src/ui/api/schemas/tools.schema.ts`

**Changes:**

```typescript
// 1. server.schema.ts - Lines 107-109
// BEFORE:
export const ServersResponseSchema = z.object({
  servers: z.array(ServerInfoSchema),
});

// AFTER:
export const ServersResponseSchema = z.object({
  servers: z.array(ServerInfoSchema),
  timestamp: z.string().datetime()
});
```

```typescript
// 2. tools.schema.ts - Lines 26-28
// BEFORE:
export const ToolsResponseSchema = z.object({
  tools: z.array(ToolSummarySchema),
});

// AFTER:
export const ToolsResponseSchema = z.object({
  tools: z.array(ToolSummarySchema),
  timestamp: z.string().datetime()
});
```

**Validation:**
```bash
# Test with live API
curl http://localhost:7000/api/servers | jq '.timestamp'
curl http://localhost:7000/api/tools | jq '.timestamp'
```

---

### Phase 3: Optional Health Fields (30 min) 🟡

**File to Modify:**
1. `src/ui/api/schemas/health.schema.ts`

**Changes:**

```typescript
// health.schema.ts - Lines 44-51
// BEFORE:
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  state: z.enum(['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error']),
  server_id: z.string(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
});

// AFTER:
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

**Validation:**
```bash
# Test minimal response
curl http://localhost:7000/api/health

# Test verbose response (if supported)
curl http://localhost:7000/api/health?verbose=true
```

---

### Phase 4: SSE Event Schemas (30 min) 🟢

**New File to Create:**
1. `src/ui/api/schemas/sse.schema.ts`

**Complete File Content:**

```typescript
/**
 * SSE event schemas for real-time updates
 * Validates Server-Sent Events from /api/sse/subscribe
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

**Validation:**
```bash
# Test SSE connection
curl -N http://localhost:7000/api/sse/subscribe
# Should receive heartbeat events
```

---

### Phase 5: Server Actions (20 min) 🟢

**New File to Create:**
1. `src/ui/api/schemas/server-actions.schema.ts`

**Complete File Content:**

```typescript
/**
 * Server action schemas for start/stop/refresh operations
 * Validates requests to /api/servers/:name/start, stop, refresh
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

**Validation:**
```bash
# Test server action (if you have a test server configured)
curl -X POST http://localhost:7000/api/servers/test-server/start
```

---

### Phase 6: Config Response Fix (15 min) 🟡

**File to Modify:**
1. `src/ui/api/schemas/config.schema.ts`

**Changes:**

```typescript
// config.schema.ts - Lines 99-103
// BEFORE:
export const ConfigResponseSchema = z.object({
  config: ConfigDataSchema,
});

// AFTER:
export const ConfigResponseSchema = z.object({
  config: ConfigDataSchema,
  version: z.string(),
  timestamp: z.string().datetime()
});
```

**Note:** These fields are REQUIRED (not optional) because backend always returns them via `createVersionedResponse()`.

**Validation:**
```bash
curl http://localhost:7000/api/config | jq '{version, timestamp}'
# Should show both fields
```

---

### Phase 7: Update Index Exports (10 min) 🟢

**File to Modify:**
1. `src/ui/api/schemas/index.ts`

**Changes:**

```typescript
// Add to existing exports
export * from './sse.schema';
export * from './server-actions.schema';
```

**Validation:**
```typescript
// Verify all exports work
import {
  SSEEventTypeSchema,
  ServerActionRequestSchema,
  // ... all other schemas
} from '@/api/schemas';
```

---

### Phase 8: Comprehensive Testing (30 min) 🔵

**Test Files to Create:**

1. `src/ui/api/schemas/__tests__/sse.schema.test.ts`
2. `src/ui/api/schemas/__tests__/server-actions.schema.test.ts`

**Update Existing Tests:**
3. `src/ui/api/schemas/__tests__/config-filtering-tools-health.schema.test.ts`

**Example Test File (`sse.schema.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest';
import {
  SSEEventTypeSchema,
  SubscriptionTypeSchema,
  HubStateSchema,
  HeartbeatEventSchema,
  HubStateEventSchema,
  SubscriptionEventSchema,
  LogEventSchema,
} from '../sse.schema';

describe('SSEEventTypeSchema', () => {
  it('should validate all core event types', () => {
    const types = ['heartbeat', 'hub_state', 'log', 'subscription_event'];
    types.forEach((type) => {
      expect(() => SSEEventTypeSchema.parse(type)).not.toThrow();
    });
  });

  it('should reject invalid event types', () => {
    expect(() => SSEEventTypeSchema.parse('invalid')).toThrow();
  });
});

describe('SubscriptionTypeSchema', () => {
  it('should validate all subscription types', () => {
    const types = [
      'config_changed',
      'servers_updating',
      'servers_updated',
      'tool_list_changed',
      'resource_list_changed',
      'prompt_list_changed',
      'workspaces_updated'
    ];
    types.forEach((type) => {
      expect(() => SubscriptionTypeSchema.parse(type)).not.toThrow();
    });
  });
});

describe('HubStateSchema', () => {
  it('should validate all 7 hub states', () => {
    const states = ['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error'];
    states.forEach((state) => {
      expect(() => HubStateSchema.parse(state)).not.toThrow();
    });
  });
});

describe('HeartbeatEventSchema', () => {
  it('should validate heartbeat event', () => {
    const event = {
      connections: 5,
      timestamp: new Date().toISOString()
    };
    expect(() => HeartbeatEventSchema.parse(event)).not.toThrow();
  });
});

describe('HubStateEventSchema', () => {
  it('should validate hub state change event', () => {
    const event = {
      state: 'ready',
      server_id: 'mcp-hub',
      pid: 12345,
      port: 7000,
      timestamp: new Date().toISOString()
    };
    expect(() => HubStateEventSchema.parse(event)).not.toThrow();
  });

  it('should validate optional fields', () => {
    const event = {
      state: 'error',
      server_id: 'mcp-hub',
      pid: 12345,
      port: 7000,
      timestamp: new Date().toISOString(),
      message: 'Server initialization failed',
      code: 'INIT_ERROR',
      data: { details: 'Connection timeout' }
    };
    expect(() => HubStateEventSchema.parse(event)).not.toThrow();
  });
});

describe('SubscriptionEventSchema', () => {
  it('should validate subscription event with changes', () => {
    const event = {
      type: 'tool_list_changed',
      changes: {
        added: ['filesystem__read_file'],
        removed: ['github__create_issue'],
        modified: ['docker__list_containers']
      }
    };
    expect(() => SubscriptionEventSchema.parse(event)).not.toThrow();
  });

  it('should validate subscription event without changes', () => {
    const event = {
      type: 'config_changed',
      data: { source: 'manual_edit' }
    };
    expect(() => SubscriptionEventSchema.parse(event)).not.toThrow();
  });
});

describe('LogEventSchema', () => {
  it('should validate all log levels', () => {
    const levels = ['error', 'warn', 'info', 'debug'];
    levels.forEach((level) => {
      const event = {
        level: level as 'error' | 'warn' | 'info' | 'debug',
        message: 'Test log message',
        timestamp: new Date().toISOString()
      };
      expect(() => LogEventSchema.parse(event)).not.toThrow();
    });
  });
});
```

**Example Test File (`server-actions.schema.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest';
import {
  ServerActionRequestSchema,
  ServerActionResponseSchema,
} from '../server-actions.schema';

describe('ServerActionRequestSchema', () => {
  it('should validate server action request', () => {
    const request = { server_name: 'filesystem' };
    expect(() => ServerActionRequestSchema.parse(request)).not.toThrow();
  });

  it('should reject missing server_name', () => {
    expect(() => ServerActionRequestSchema.parse({})).toThrow();
  });

  it('should reject empty server_name', () => {
    const request = { server_name: '' };
    // Zod allows empty strings by default, add .min(1) if you want to reject
    expect(() => ServerActionRequestSchema.parse(request)).not.toThrow();
  });
});

describe('ServerActionResponseSchema', () => {
  it('should validate server action response', () => {
    const response = {
      status: 'ok',
      server: { name: 'filesystem', status: 'connected' },
      timestamp: new Date().toISOString()
    };
    expect(() => ServerActionResponseSchema.parse(response)).not.toThrow();
  });

  it('should require literal "ok" status', () => {
    const response = {
      status: 'success',
      server: { name: 'test', status: 'connected' },
      timestamp: new Date().toISOString()
    };
    expect(() => ServerActionResponseSchema.parse(response)).toThrow();
  });

  it('should require timestamp', () => {
    const response = {
      status: 'ok',
      server: { name: 'test', status: 'connected' }
    };
    expect(() => ServerActionResponseSchema.parse(response)).toThrow();
  });
});
```

**Run Tests:**
```bash
bun test src/ui/api/schemas/__tests__/
bun run test:coverage
```

**Expected Results:**
- All 482+ existing tests pass
- ~68 new tests added
- Coverage remains >80% (ideally >82.94%)

---

## Final Validation Checklist

```bash
# 1. All tests pass
bun test
# Expected: 550+ tests passing (482 + ~68 new)

# 2. Coverage check
bun run test:coverage
# Expected: >82% branches

# 3. TypeScript compilation (if available)
bun run typecheck || npx tsc --noEmit
# Expected: 0 errors

# 4. Live API validation
curl http://localhost:7000/api/health
curl http://localhost:7000/api/servers
curl http://localhost:7000/api/tools
curl http://localhost:7000/api/config
curl -N http://localhost:7000/api/sse/subscribe

# 5. Verify all responses validate against schemas
```

---

## Common Issues & Solutions

### Issue 1: TypeScript Errors After Enum Changes

**Symptom:**
```
Type '"unauthorized"' is not assignable to type 'ServerStatus'
```

**Solution:**
```typescript
// Old code using hardcoded string
const status = 'unauthorized'; // Error

// Fixed: Use schema-inferred type
import { ServerStatus } from '@/api/schemas';
const status: ServerStatus = 'unauthorized'; // OK
```

---

### Issue 2: Optional Fields Causing Type Errors

**Symptom:**
```
Property 'connections' does not exist on type 'HealthResponse'
```

**Solution:**
```typescript
// Old code assuming field exists
const total = response.connections.totalConnections; // Error

// Fixed: Check for optional field
const total = response.connections?.totalConnections ?? 0; // OK
```

---

### Issue 3: Zod Validation Failing in Tests

**Symptom:**
```
ZodError: Invalid enum value. Expected 'starting' | 'ready' | ...
```

**Solution:**
```typescript
// Bad test data
const badData = { state: 'active' }; // Wrong value

// Fixed test data
const goodData = { state: 'ready' }; // Valid enum value
```

---

## Commit Message Format

```
feat(schemas): Phase 2 schema fixes for Zod validation

BREAKING CHANGE: None (all changes are additive)

Changes:
- Add 3 missing hub states to HealthResponseSchema
- Add unauthorized/disabled states to ServerStatusSchema
- Add timestamp fields to ServersResponse and ToolsResponse
- Add optional debug fields to HealthResponseSchema
- Add hybrid filtering mode to FilteringModeSchema
- Create SSE event schemas for real-time validation
- Create server action schemas for start/stop/refresh
- Add version/timestamp to ConfigResponseSchema

Fixes: None (proactive schema alignment)
Closes: #[issue-number]

Co-authored-by: Backend Architect Agent
```

---

## Post-Implementation Tasks

1. **Update Documentation:**
   - [ ] Add schema usage examples to README
   - [ ] Document new SSE event validation
   - [ ] Update API contract documentation

2. **Integration with React Query:**
   - [ ] Update React Query hooks to use new schemas
   - [ ] Add schema validation to all API calls
   - [ ] Handle validation errors gracefully

3. **Performance Monitoring:**
   - [ ] Measure schema validation performance
   - [ ] Verify <5ms overhead per API call
   - [ ] Monitor for any performance regressions

4. **Follow-Up Investigation:**
   - [ ] Clarify "hybrid" vs "static" filtering mode with product team
   - [ ] Audit backend for 'error' server status usage
   - [ ] Consider schema composition patterns for future scalability

---

## Quick Reference: Files Changed

**Modified Files (6):**
1. `src/ui/api/schemas/health.schema.ts`
2. `src/ui/api/schemas/server.schema.ts`
3. `src/ui/api/schemas/tools.schema.ts`
4. `src/ui/api/schemas/config.schema.ts`
5. `src/ui/api/schemas/filtering.schema.ts`
6. `src/ui/api/schemas/index.ts`

**New Files (4):**
1. `src/ui/api/schemas/sse.schema.ts`
2. `src/ui/api/schemas/server-actions.schema.ts`
3. `src/ui/api/schemas/__tests__/sse.schema.test.ts`
4. `src/ui/api/schemas/__tests__/server-actions.schema.test.ts`

**Total:** 10 files (6 modified, 4 new)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Implementation Status:** Ready

---

**Need Help?**
- Review architectural analysis: `claudedocs/SCHEMA_VALIDATION_ARCHITECTURE_REVIEW.md`
- Check original requirements: `claudedocs/PHASE2_SCHEMA_FIXES_REQUIRED.md`
- Backend reference: `CLAUDE.md`
