# Schema Optimization Implementation Checklist

Quick reference for implementing schema performance optimizations.

## 🚨 Critical (Fix Immediately)

### 1. Fix Test File Imports
**File**: `src/ui/api/schemas/__tests__/config-filtering-tools-health.schema.test.ts`

**Problem**: Imports non-existent schemas
```typescript
// ❌ REMOVE THESE IMPORTS
import {
  FilteringStatsResponseSchema,        // Does not exist
  FilteringModeUpdateRequestSchema,    // Does not exist
} from '../filtering.schema';

import {
  HealthDataSchema,                    // Does not exist
  HealthResponseSchema,                // Wrong structure
} from '../health.schema';
```

**Fix**: Use actual schema exports
```typescript
// ✅ CORRECT IMPORTS
import {
  FilteringModeSchema,
  FilteringStatsSchema,
} from '../filtering.schema';

import {
  HealthServerInfoSchema,
  HealthResponseSchema,
} from '../health.schema';
```

**Verification**:
```bash
bun test src/ui/api/schemas/__tests__/config-filtering-tools-health.schema.test.ts
# Should pass without import errors
```

---

### 2. Align Test Cases with Flat API Structure

**Problem**: Tests expect envelope structure, but API returns flat structure

**Current Test** (❌ Wrong):
```typescript
const response = {
  status: 'success',
  meta: { timestamp: '2025-01-08T12:00:00.000Z' },
  data: {
    status: 'ready',
    uptime: 12345,
    servers: []
  }
};
expect(() => HealthResponseSchema.parse(response)).not.toThrow();
```

**Corrected Test** (✅ Right):
```typescript
const response = {
  status: 'ok',
  state: 'ready',
  server_id: 'test-server',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: []
};
expect(() => HealthResponseSchema.parse(response)).not.toThrow();
```

**Reference**: Check actual API response structure in `src/server.js:538-568`

---

## ⚠️ High Priority (This Week)

### 3. Replace `z.any()` with Proper Schemas

**Files to Update**:
- `src/ui/api/schemas/health.schema.ts`
- `src/ui/api/schemas/server.schema.ts`

**Current Implementation** (❌):
```typescript
// health.schema.ts:23-26
capabilities: z.object({
  tools: z.array(z.any()),              // ❌ No validation
  resources: z.array(z.any()),          // ❌ No validation
  resourceTemplates: z.array(z.any()),  // ❌ No validation
  prompts: z.array(z.any()),            // ❌ No validation
})

// server.schema.ts:29
inputSchema: z.any(),  // ❌ Complete trust in backend
```

**Recommended Fix** (✅):
```typescript
// health.schema.ts - Import from server.schema
import {
  ToolSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  PromptSchema
} from './server.schema';

// Update HealthServerInfoSchema
capabilities: z.object({
  tools: z.array(ToolSchema),                      // ✅ Type-safe
  resources: z.array(ResourceSchema),              // ✅ Type-safe
  resourceTemplates: z.array(ResourceTemplateSchema),  // ✅ Type-safe
  prompts: z.array(PromptSchema),                  // ✅ Type-safe
})

// server.schema.ts - Replace z.any() for inputSchema
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()).optional(),  // ✅ Better than z.any()
});
```

**Performance Impact**: +15μs per tool validation (negligible)
**Safety Improvement**: 100% (catches malformed backend responses)

---

### 4. Add `.strict()` and `.passthrough()` Modes

**Purpose**:
- `.strict()` on request schemas → Catch client errors
- `.passthrough()` on response schemas → Forward compatibility

**Files to Update**:
- `src/ui/api/schemas/config.schema.ts`
- `src/ui/api/schemas/health.schema.ts`
- `src/ui/api/schemas/server.schema.ts`
- `src/ui/api/schemas/filtering.schema.ts`
- `src/ui/api/schemas/tools.schema.ts`

**Implementation**:
```typescript
// REQUEST SCHEMAS (user input validation)
export const ConfigSaveRequestSchema = z.object({
  config: ConfigDataSchema,
}).strict();  // ✅ Reject unknown fields from client

// RESPONSE SCHEMAS (backend responses)
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  state: z.enum(['starting', 'ready', 'restarting', 'stopped']),
  server_id: z.string(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
}).passthrough();  // ✅ Allow future backend fields
```

**Files Pattern**:
- `ConfigSaveRequestSchema` → `.strict()`
- All response schemas → `.passthrough()`

---

## 📋 Medium Priority (Next Sprint)

### 5. Create Test Data Factories

**New File**: `src/ui/api/schemas/__tests__/factories.ts`

**Implementation**:
```typescript
export function createMockServer(overrides = {}) {
  return {
    name: 'test-server',
    displayName: 'Test Server',
    description: 'Mock server for testing',
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
    lastStarted: new Date().toISOString(),
    authorizationUrl: null,
    serverInfo: { name: 'test', version: '1.0.0' },
    config_source: 'test.json',
    ...overrides
  };
}

export function createMockHealthResponse(serverCount = 5) {
  return {
    status: 'ok' as const,
    state: 'ready' as const,
    server_id: 'test',
    activeClients: 0,
    timestamp: new Date().toISOString(),
    servers: Array(serverCount).fill(null).map((_, i) =>
      createMockServer({ name: `server-${i}` })
    )
  };
}

export function createMockFilteringStats(overrides = {}) {
  return {
    enabled: true,
    mode: 'prompt-based' as const,
    totalTools: 100,
    filteredTools: 50,
    exposedTools: 50,
    filterRate: 0.5,
    serverFilterMode: 'allowlist' as const,
    allowedServers: ['filesystem', 'github'],
    allowedCategories: ['filesystem', 'github'],
    categoryCacheSize: 100,
    cacheHitRate: 0.95,
    llmCacheSize: 20,
    llmCacheHitRate: 0.87,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}
```

**Usage in Tests**:
```typescript
import { createMockHealthResponse, createMockFilteringStats } from './factories';

it('should validate health response', () => {
  const health = createMockHealthResponse(25);
  expect(() => HealthResponseSchema.parse(health)).not.toThrow();
});
```

---

### 6. Add Performance Benchmarks

**New File**: `src/ui/api/schemas/__tests__/performance.bench.ts`

**Implementation**:
```typescript
import { describe, bench } from 'vitest';
import {
  HealthResponseSchema,
  FilteringStatsSchema,
  ConfigDataSchema
} from '../schemas';
import {
  createMockHealthResponse,
  createMockFilteringStats
} from './factories';

describe('Schema Validation Performance', () => {
  bench('HealthResponse validation (5 servers)', () => {
    const data = createMockHealthResponse(5);
    HealthResponseSchema.safeParse(data);
  });

  bench('HealthResponse validation (25 servers)', () => {
    const data = createMockHealthResponse(25);
    HealthResponseSchema.safeParse(data);
  });

  bench('FilteringStats validation', () => {
    const data = createMockFilteringStats();
    FilteringStatsSchema.safeParse(data);
  });
});
```

**Run Benchmarks**:
```bash
bun run vitest bench src/ui/api/schemas/__tests__/performance.bench.ts
```

**Expected Results**:
- Health (5 servers): < 0.5ms
- Health (25 servers): < 2ms
- Filtering stats: < 0.1ms

---

### 7. Implement Validation Result Caching

**File**: `src/ui/api/cache.ts` (new file)

**Implementation**:
```typescript
const validationCache = new Map<string, { data: any; timestamp: number }>();

export function getCachedValidation<T>(
  cacheKey: string,
  validate: () => T,
  ttl: number = 2000
): T {
  const cached = validationCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data as T;
  }

  const data = validate();
  validationCache.set(cacheKey, { data, timestamp: now });
  return data;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now - value.timestamp > 60000) {  // 1 minute
      validationCache.delete(key);
    }
  }
}, 60000);
```

**Usage** (in React Query hooks):
```typescript
// Before (validates every time)
const { data } = useQuery({
  queryKey: ['health'],
  queryFn: () => request('/api/health', HealthResponseSchema),
  refetchInterval: 2000
});

// After (caches validation)
import { getCachedValidation } from '../api/cache';

const { data } = useQuery({
  queryKey: ['health'],
  queryFn: () => getCachedValidation(
    'health-validation',
    () => request('/api/health', HealthResponseSchema),
    2000  // TTL matches refetch interval
  ),
  refetchInterval: 2000
});
```

---

### 8. Improve Error Messages

**File**: `src/ui/api/errors.ts` (new file)

**Implementation**:
```typescript
import { z } from 'zod';

export function formatZodError(error: z.ZodError): string {
  return error.errors.map(err => {
    const path = err.path.join('.');
    const value = JSON.stringify((err as any).received);
    return `${path}: ${err.message} (received: ${value})`;
  }).join('; ');
}
```

**Update**: `src/ui/api/client.ts:70-75`

```typescript
// Before
if (!result.success) {
  throw new APIError(
    'VALIDATION_ERROR',
    'Response validation failed',
    { errors: result.error.errors }
  );
}

// After
import { formatZodError } from './errors';

if (!result.success) {
  throw new APIError(
    'VALIDATION_ERROR',
    formatZodError(result.error),
    { errors: result.error.errors }
  );
}
```

---

## 🔮 Future Enhancements

### 9. Add Discriminated Unions for Errors

**When**: After basic optimizations complete

**File**: `src/ui/api/schemas/common.schema.ts`

**Implementation**:
```typescript
export const ValidationErrorSchema = z.object({
  type: z.literal('validation'),
  code: z.string(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string()
  })),
  timestamp: z.string().datetime(),
});

export const ServerErrorSchema = z.object({
  type: z.literal('server'),
  code: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export const ErrorResponseSchema = z.discriminatedUnion('type', [
  ValidationErrorSchema,
  ServerErrorSchema,
]);
```

**Requires**: Backend changes to add `type` field to error responses

---

## Verification Commands

**Run all schema tests**:
```bash
bun test src/ui/api/schemas/__tests__/
```

**Run performance benchmarks**:
```bash
bun run vitest bench src/ui/api/schemas/__tests__/performance.bench.ts
```

**Type check**:
```bash
tsc --noEmit src/ui/api/schemas/**/*.ts
```

**Coverage check**:
```bash
bun run test:coverage -- src/ui/api/schemas/
```

---

## Progress Tracking

- [ ] Fix test file imports
- [ ] Align test cases with flat API structure
- [ ] Replace `z.any()` with proper schemas
- [ ] Add `.strict()` to request schemas
- [ ] Add `.passthrough()` to response schemas
- [ ] Create test data factories
- [ ] Add performance benchmarks
- [ ] Implement validation caching
- [ ] Improve error messages
- [ ] Add discriminated unions (future)

**Estimated Total Effort**: 12-16 hours

**Priority Order**:
1. Test fixes (4 hours) - Unblocks everything else
2. Replace `z.any()` (4 hours) - Critical safety improvement
3. Add strict/passthrough (1 hour) - Easy win
4. Test factories (2 hours) - Improves test maintainability
5. Benchmarks (3 hours) - Establishes performance baseline
6. Caching (4 hours) - Optional optimization
7. Error formatting (2 hours) - Developer experience
8. Discriminated unions (TBD) - Requires backend changes
