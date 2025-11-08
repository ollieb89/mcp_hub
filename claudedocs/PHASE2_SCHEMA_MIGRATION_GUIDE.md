# Phase 2 Schema Migration Guide

Guide for migrating from pre-Phase 2 schemas to the updated validation system.

---

## Overview

Phase 2 schema fixes add missing enum values, optional fields, and new schemas for server actions and SSE events. All changes are backwards compatible - existing code will continue to work.

---

## Breaking Changes

**None.** All modifications are additive or fixes to existing bugs.

---

## New Features

### 1. Extended Server Status Values

**Before:**
```typescript
type ServerStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
```

**After:**
```typescript
type ServerStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unauthorized' | 'disabled';
```

**Migration Action:** None required. Existing status values still valid.

**Benefit:** Can now properly handle OAuth-required servers and disabled servers.

---

### 2. Extended Hub State Values

**Before:**
```typescript
type HubState = 'starting' | 'ready' | 'restarting' | 'stopped';
```

**After:**
```typescript
type HubState = 'starting' | 'ready' | 'restarting' | 'restarted' | 'stopped' | 'stopping' | 'error';
```

**Migration Action:** None required. Existing states still valid.

**Benefit:** More granular hub lifecycle tracking.

---

### 3. Timestamp Fields Added

**Before:**
```typescript
type ServersResponse = {
  servers: ServerInfo[];
};
```

**After:**
```typescript
type ServersResponse = {
  servers: ServerInfo[];
  timestamp: string; // ISO 8601 datetime
};
```

**Migration Action:** Update components to use timestamp for cache invalidation.

**Example:**
```typescript
// Before
const { data } = useQuery({ queryKey: ['servers'] });

// After - Use timestamp for smarter caching
const { data } = useQuery({
  queryKey: ['servers'],
  select: (data) => ({
    ...data,
    cacheTime: new Date(data.timestamp)
  })
});
```

---

### 4. Optional Health Response Fields

**Before:**
```typescript
type HealthResponse = {
  status: 'ok' | 'error';
  state: HubState;
  server_id: string;
  activeClients: number;
  timestamp: string;
  servers: HealthServerInfo[];
};
```

**After:**
```typescript
type HealthResponse = {
  status: 'ok' | 'error';
  state: HubState;
  server_id: string;
  version?: string; // NEW
  activeClients: number;
  timestamp: string;
  servers: HealthServerInfo[];
  connections?: { /* connection details */ }; // NEW
  mcpEndpoint?: { /* endpoint stats */ }; // NEW
  workspaces?: { /* workspace info */ }; // NEW
};
```

**Migration Action:** Add optional field access in health components.

**Example:**
```typescript
// Before
const HealthStatus = ({ health }: { health: HealthResponse }) => (
  <div>
    <p>Status: {health.status}</p>
    <p>State: {health.state}</p>
  </div>
);

// After - Use optional fields
const HealthStatus = ({ health }: { health: HealthResponse }) => (
  <div>
    <p>Status: {health.status}</p>
    <p>State: {health.state}</p>
    {health.version && <p>Version: {health.version}</p>}
    {health.connections && (
      <p>Active Connections: {health.connections.totalConnections}</p>
    )}
  </div>
);
```

---

### 5. New Filtering Mode: "hybrid"

**Before:**
```typescript
type FilteringMode = 'static' | 'server-allowlist' | 'category' | 'prompt-based';
```

**After:**
```typescript
type FilteringMode = 'static' | 'server-allowlist' | 'category' | 'hybrid' | 'prompt-based';
```

**Migration Action:** None required unless using mode selection UI.

**Benefit:** Backend now supports hybrid filtering mode.

---

### 6. Config Version Tracking

**Before:**
```typescript
type ConfigResponse = {
  config: ConfigData;
};
```

**After:**
```typescript
type ConfigResponse = {
  config: ConfigData;
  version: string;
  timestamp: string;
};
```

**Migration Action:** Use version for optimistic updates and conflict detection.

**Example:**
```typescript
const { mutate } = useMutation({
  mutationFn: async (newConfig: ConfigData) => {
    const current = await fetchConfig();

    // Check version before saving
    if (current.version !== expectedVersion) {
      throw new ConflictError('Config changed by another client');
    }

    return saveConfig(newConfig);
  }
});
```

---

## New Schemas Available

### Server Actions

**Import:**
```typescript
import {
  ServerActionRequestSchema,
  ServerActionResponseSchema,
  type ServerActionRequest,
  type ServerActionResponse
} from '@/api/schemas';
```

**Usage:**
```typescript
async function startServer(serverName: string) {
  const request: ServerActionRequest = { server_name: serverName };
  const response = await fetch('/api/servers/start', {
    method: 'POST',
    body: JSON.stringify(request)
  });
  const data: ServerActionResponse = await response.json();
  return ServerActionResponseSchema.parse(data);
}
```

---

### SSE Events

**Import:**
```typescript
import {
  HeartbeatEventSchema,
  HubStateEventSchema,
  SubscriptionEventSchema,
  LogEventSchema,
  type HeartbeatEvent,
  type HubStateEvent,
  type SubscriptionEvent,
  type LogEvent
} from '@/api/schemas';
```

**Usage:**
```typescript
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('heartbeat', (event) => {
  const data: HeartbeatEvent = HeartbeatEventSchema.parse(JSON.parse(event.data));
  console.log(`Connections: ${data.connections}`);
});

eventSource.addEventListener('hub_state', (event) => {
  const data: HubStateEvent = HubStateEventSchema.parse(JSON.parse(event.data));
  console.log(`State changed to: ${data.state}`);
});
```

---

## Component Update Examples

### Health Check Component

**Before:**
```typescript
import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@/api/schemas';

export function HealthStatus() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const response = await fetch('/api/health');
      return response.json();
    }
  });

  if (!health) return <div>Loading...</div>;

  return (
    <div>
      <h2>Hub Status: {health.state}</h2>
      <p>Active Clients: {health.activeClients}</p>
    </div>
  );
}
```

**After (with schema validation and new fields):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { HealthResponseSchema, type HealthResponse } from '@/api/schemas';

export function HealthStatus() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const response = await fetch('/api/health');
      const data = await response.json();
      return HealthResponseSchema.parse(data); // ← Validate
    }
  });

  if (!health) return <div>Loading...</div>;

  return (
    <div>
      <h2>Hub Status: {health.state}</h2>
      <p>Active Clients: {health.activeClients}</p>

      {/* New optional fields */}
      {health.version && <p>Version: {health.version}</p>}

      {health.connections && (
        <details>
          <summary>Connection Details</summary>
          <p>Total: {health.connections.totalConnections}</p>
          <ul>
            {health.connections.connections.map(conn => (
              <li key={conn.id}>
                {conn.state} - {new Date(conn.lastEventAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </details>
      )}

      {health.mcpEndpoint && (
        <p>MCP Requests: {health.mcpEndpoint.totalRequests}</p>
      )}
    </div>
  );
}
```

---

### Server List Component

**Before:**
```typescript
import { useQuery } from '@tanstack/react-query';
import type { ServersResponse } from '@/api/schemas';

export function ServerList() {
  const { data } = useQuery({
    queryKey: ['servers'],
    queryFn: async (): Promise<ServersResponse> => {
      const response = await fetch('/api/servers');
      return response.json();
    }
  });

  return (
    <ul>
      {data?.servers.map(server => (
        <li key={server.name}>{server.displayName}</li>
      ))}
    </ul>
  );
}
```

**After (with schema validation and timestamp caching):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { ServersResponseSchema, type ServersResponse } from '@/api/schemas';

export function ServerList() {
  const { data } = useQuery({
    queryKey: ['servers'],
    queryFn: async (): Promise<ServersResponse> => {
      const response = await fetch('/api/servers');
      const data = await response.json();
      return ServersResponseSchema.parse(data); // ← Validate
    },
    // Use timestamp for cache invalidation
    select: (data) => ({
      ...data,
      lastUpdated: new Date(data.timestamp)
    })
  });

  return (
    <div>
      {data?.lastUpdated && (
        <small>Last updated: {data.lastUpdated.toLocaleString()}</small>
      )}
      <ul>
        {data?.servers.map(server => (
          <li key={server.name}>
            {server.displayName}
            {/* Handle new status values */}
            {server.status === 'unauthorized' && <span> (Needs Auth)</span>}
            {server.status === 'disabled' && <span> (Disabled)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Server Action Hook

**New - Using ServerActionResponseSchema:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ServerActionRequestSchema,
  ServerActionResponseSchema,
  type ServerActionResponse
} from '@/api/schemas';

export function useStartServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverName: string): Promise<ServerActionResponse> => {
      const request = ServerActionRequestSchema.parse({
        server_name: serverName
      });

      const response = await fetch('/api/servers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      return ServerActionResponseSchema.parse(data);
    },
    onSuccess: () => {
      // Invalidate server list cache
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  });
}

// Usage in component
function ServerControl({ serverName }: { serverName: string }) {
  const startServer = useStartServer();

  return (
    <button
      onClick={() => startServer.mutate(serverName)}
      disabled={startServer.isPending}
    >
      {startServer.isPending ? 'Starting...' : 'Start Server'}
    </button>
  );
}
```

---

## Testing Updates

### Update Test Assertions

**Before:**
```typescript
it('should have valid server status', () => {
  expect(['connected', 'connecting', 'disconnected', 'error']).toContain(
    server.status
  );
});
```

**After:**
```typescript
import { ServerStatusSchema } from '@/api/schemas';

it('should have valid server status', () => {
  expect(() => ServerStatusSchema.parse(server.status)).not.toThrow();
});
```

---

### Mock Data Updates

**Before:**
```typescript
const mockHealth: HealthResponse = {
  status: 'ok',
  state: 'ready',
  server_id: 'test-123',
  activeClients: 5,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: []
};
```

**After (with optional fields):**
```typescript
import { HealthResponseSchema, type HealthResponse } from '@/api/schemas';

const mockHealth: HealthResponse = HealthResponseSchema.parse({
  status: 'ok',
  state: 'ready',
  server_id: 'test-123',
  version: '1.0.0', // Optional field
  activeClients: 5,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [],
  connections: { // Optional field
    totalConnections: 3,
    connections: []
  }
});
```

---

## Checklist

Use this checklist when migrating components:

- [ ] Replace `.json()` with `Schema.parse()` for all API responses
- [ ] Add timestamp-based cache invalidation where beneficial
- [ ] Handle new `unauthorized` and `disabled` server statuses in UI
- [ ] Use optional health response fields (`version`, `connections`, etc.)
- [ ] Update server action mutations to use new schemas
- [ ] Add SSE event validation with new event schemas
- [ ] Update tests to use schema validation instead of manual assertions
- [ ] Handle `hybrid` filtering mode in filtering UI (if applicable)
- [ ] Use config `version` field for conflict detection

---

## Rollback Plan

If issues arise, you can temporarily disable schema validation:

**Emergency Bypass (Not Recommended):**
```typescript
// Temporarily bypass validation
const data = await response.json();
return data as HealthResponse; // Type assertion without validation
```

**Better Approach - Safe Parse:**
```typescript
const data = await response.json();
const result = HealthResponseSchema.safeParse(data);

if (!result.success) {
  console.warn('Schema validation failed, using unvalidated data');
  return data as HealthResponse;
}

return result.data;
```

---

## Support

For issues or questions:
- Check `SCHEMA_USAGE_QUICK_REFERENCE.md` for usage examples
- Review `PHASE2_SCHEMA_FIXES_IMPLEMENTATION_SUMMARY.md` for technical details
- Consult Zod documentation: https://zod.dev

---

**Migration Priority:** Low (backwards compatible)
**Breaking Changes:** None
**Testing Recommended:** Yes (add schema validation tests)
**Estimated Migration Time:** 1-2 hours for full codebase
