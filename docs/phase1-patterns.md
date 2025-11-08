# Phase 1: Foundation Architecture - Usage Guide

**Status**: ✅ Complete (100%)
**Date Completed**: January 8, 2025
**Coverage**: Schema validation, React Query, Zustand stores, SSE integration

This document provides comprehensive usage patterns, examples, and best practices for the Phase 1 foundation architecture of MCP Hub's UI-API integration.

---

## Table of Contents

1. [Schema Validation System](#schema-validation-system)
2. [Zustand Store Usage](#zustand-store-usage)
3. [SSE Integration Patterns](#sse-integration-patterns)
4. [React Query Hooks](#react-query-hooks)
5. [Migration Notes for Phase 2](#migration-notes-for-phase-2)

---

## Schema Validation System

### Overview

Phase 1 implements comprehensive Zod-based schema validation for all API responses and requests. Schemas provide runtime type safety, automatic validation, and TypeScript type inference.

### Schema Structure

```
src/ui/api/schemas/
├── common.schema.ts      # Shared base schemas
├── config.schema.ts      # Configuration schemas
└── filtering.schema.ts   # Tool filtering schemas
```

### Common Schemas

**TimestampSchema** - ISO 8601 datetime validation:
```typescript
import { TimestampSchema } from '@/api/schemas/common.schema';

// Valid formats:
TimestampSchema.parse('2025-01-08T12:00:00.000Z'); // ✅
TimestampSchema.parse('2025-01-08T12:00:00Z');     // ✅ (milliseconds optional)

// Invalid formats:
TimestampSchema.parse('2025-01-08');    // ❌ Date only
TimestampSchema.parse('12:00:00');      // ❌ Time only
```

**BaseResponseSchema** - Standard API response wrapper:
```typescript
import { BaseResponseSchema } from '@/api/schemas/common.schema';

const response = {
  status: 'success',
  meta: {
    timestamp: '2025-01-08T12:00:00.000Z',
    requestId: 'req-123', // Optional
  },
};

BaseResponseSchema.parse(response); // ✅
```

**PaginationSchema** - Pagination metadata:
```typescript
import { PaginationSchema } from '@/api/schemas/common.schema';

const pagination = {
  page: 1,              // Must be positive integer
  pageSize: 20,         // Must be positive integer
  totalPages: 5,        // Must be non-negative integer
  totalItems: 100,      // Must be non-negative integer
  hasNext: true,
  hasPrev: false,
};

PaginationSchema.parse(pagination); // ✅
```

**ErrorResponseSchema** - Standardized error responses:
```typescript
import { ErrorResponseSchema } from '@/api/schemas/common.schema';

const errorResponse = {
  status: 'error',
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: {              // Optional
      field: 'username',
      reason: 'too short',
    },
    requestId: 'req-456', // Optional
  },
  meta: {
    timestamp: '2025-01-08T12:00:00.000Z',
    requestId: 'req-456', // Optional
  },
};

ErrorResponseSchema.parse(errorResponse); // ✅
```

### Configuration Schemas

**ConfigDataSchema** - MCP server configuration:
```typescript
import { ConfigDataSchema } from '@/api/schemas/config.schema';

const config = {
  mcpServers: {
    'filesystem': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
    },
    'github': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
    },
  },
  toolFiltering: {           // Optional
    enabled: true,
    mode: 'prompt-based',
  },
  connectionPool: {          // Optional
    enabled: true,
    keepAliveTimeout: 60000,
    maxConnections: 50,
  },
};

ConfigDataSchema.parse(config); // ✅
```

**ConfigResponseSchema** - Complete config API response:
```typescript
import { ConfigResponseSchema } from '@/api/schemas/config.schema';

const response = {
  status: 'success',
  data: {
    config: { /* ConfigData */ },
    version: 1,
    path: '/path/to/mcp-servers.json',
  },
  meta: {
    timestamp: '2025-01-08T12:00:00.000Z',
  },
};

ConfigResponseSchema.parse(response); // ✅
```

**ConfigSaveRequestSchema** - Config save payload:
```typescript
import { ConfigSaveRequestSchema } from '@/api/schemas/config.schema';

const saveRequest = {
  config: { /* ConfigData */ },
  version: 1,
};

ConfigSaveRequestSchema.parse(saveRequest); // ✅
```

### Filtering Schemas

**FilteringModeSchema** - Tool filtering modes:
```typescript
import { FilteringModeSchema } from '@/api/schemas/filtering.schema';

// Valid modes:
FilteringModeSchema.parse('static');           // ✅
FilteringModeSchema.parse('prompt-based');     // ✅
FilteringModeSchema.parse('server-allowlist'); // ✅
FilteringModeSchema.parse('category');         // ✅

// Invalid mode:
FilteringModeSchema.parse('invalid-mode');     // ❌
```

**FilteringStatsSchema** - Filtering statistics:
```typescript
import { FilteringStatsSchema } from '@/api/schemas/filtering.schema';

const stats = {
  mode: 'prompt-based',
  totalTools: 150,
  exposedTools: 25,
  categorizedTools: 120,        // Optional
  categories: {                 // Optional
    'github': 15,
    'filesystem': 30,
  },
  serverAllowlist: [            // Optional
    'github',
    'filesystem',
  ],
  promptBasedStats: {           // Optional
    totalSessions: 42,
    averageExposedTools: 18.5,
  },
};

FilteringStatsSchema.parse(stats); // ✅
```

### TypeScript Integration

All schemas export TypeScript types via `z.infer<typeof Schema>`:

```typescript
import type {
  BaseResponse,
  ErrorResponse,
  PaginationInfo,
} from '@/api/schemas/common.schema';

import type {
  ConfigData,
  ConfigResponse,
  ConfigSaveRequest,
} from '@/api/schemas/config.schema';

import type {
  FilteringMode,
  FilteringStats,
  FilteringStatsResponse,
} from '@/api/schemas/filtering.schema';

// Use in component props, function parameters, etc.
function handleConfig(config: ConfigData) {
  // TypeScript knows the exact shape of config
  console.log(config.mcpServers);
  console.log(config.toolFiltering?.enabled);
}
```

### Validation Best Practices

**1. Always validate API responses:**
```typescript
import { ConfigResponseSchema } from '@/api/schemas/config.schema';

async function fetchConfig() {
  const response = await fetch('/api/config');
  const data = await response.json();

  // Validate before use
  const validatedData = ConfigResponseSchema.parse(data);

  return validatedData.data.config;
}
```

**2. Use safeParse for error handling:**
```typescript
import { ConfigDataSchema } from '@/api/schemas/config.schema';

function validateConfig(input: unknown) {
  const result = ConfigDataSchema.safeParse(input);

  if (!result.success) {
    console.error('Validation errors:', result.error.errors);
    return null;
  }

  return result.data;
}
```

**3. Partial validation for forms:**
```typescript
import { ConfigDataSchema } from '@/api/schemas/config.schema';

// For partial updates
const PartialConfigSchema = ConfigDataSchema.partial();

function validatePartialConfig(input: unknown) {
  return PartialConfigSchema.parse(input);
}
```

---

## Zustand Store Usage

### Overview

Phase 1 implements lightweight Zustand stores for SSE connection state management. Stores provide reactive state updates with minimal boilerplate.

### SSE Store

**Location**: `src/ui/store/sse.store.ts`

**State Shape**:
```typescript
interface SSEState {
  isConnected: boolean;      // Current connection status
  isConnecting: boolean;     // Connection in progress
  reconnectAttempts: number; // Current retry count
  lastError: string | null;  // Last error message
}
```

**Actions**:
```typescript
interface SSEActions {
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setReconnectAttempts: (attempts: number) => void;
  setLastError: (error: string | null) => void;
  reset: () => void;
}
```

**Basic Usage**:
```typescript
import { useSSEStore } from '@/store/sse.store';

function ConnectionStatus() {
  // Subscribe to specific state slices
  const isConnected = useSSEStore((state) => state.isConnected);
  const isConnecting = useSSEStore((state) => state.isConnecting);
  const lastError = useSSEStore((state) => state.lastError);

  return (
    <div>
      {isConnecting && <div>Connecting...</div>}
      {isConnected && <div>Connected ✅</div>}
      {lastError && <div>Error: {lastError}</div>}
    </div>
  );
}
```

**Updating State**:
```typescript
import { useSSEStore } from '@/store/sse.store';

function ConnectButton() {
  const setConnecting = useSSEStore((state) => state.setConnecting);
  const setConnected = useSSEStore((state) => state.setConnected);
  const setLastError = useSSEStore((state) => state.setLastError);

  const handleConnect = async () => {
    setConnecting(true);
    setLastError(null);

    try {
      await connectToSSE();
      setConnected(true);
    } catch (error) {
      setLastError(error.message);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  return <button onClick={handleConnect}>Connect</button>;
}
```

**Resetting State**:
```typescript
import { useSSEStore } from '@/store/sse.store';

function DisconnectButton() {
  const reset = useSSEStore((state) => state.reset);

  return (
    <button onClick={reset}>
      Disconnect and Reset
    </button>
  );
}
```

### Performance Optimization

**Selective Subscription** - Only subscribe to needed state slices:
```typescript
// ❌ Bad: Re-renders on ANY state change
const store = useSSEStore();

// ✅ Good: Re-renders only when isConnected changes
const isConnected = useSSEStore((state) => state.isConnected);
```

**Multiple Selectors** - Combine related state:
```typescript
import { useSSEStore } from '@/store/sse.store';

// Combine related state with shallow comparison
const { isConnected, isConnecting } = useSSEStore(
  (state) => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
  }),
  shallow // Import from 'zustand/shallow'
);
```

**Direct Store Access** (outside React):
```typescript
import { useSSEStore } from '@/store/sse.store';

// Get state without subscription
const state = useSSEStore.getState();
console.log(state.isConnected);

// Update state directly
useSSEStore.setState({ isConnected: true });
```

---

## SSE Integration Patterns

### Overview

The SSE (Server-Sent Events) integration provides real-time updates from the MCP Hub backend. The system automatically manages connections, handles reconnection, and invalidates React Query caches when relevant events occur.

### Architecture

```
┌─────────────────┐
│  SSE Manager    │ ← Singleton connection manager
│  (sse-client.ts)│
└────────┬────────┘
         │
         ├─── EventSource (/events)
         ├─── Auto-reconnection (exponential backoff)
         ├─── Event listeners
         └─── Cache invalidation
              │
              └──> React Query Cache
```

### SSE Manager

**Location**: `src/ui/utils/sse-client.ts`

**Singleton Instance**:
```typescript
import { sseManager } from '@/utils/sse-client';

// Use the singleton throughout your app
sseManager.connect();
sseManager.disconnect();
```

**Connection Management**:
```typescript
import { sseManager } from '@/utils/sse-client';

// Establish connection
sseManager.connect();

// Check connection state
const state = sseManager.getConnectionState();
console.log(state.isConnected);      // boolean
console.log(state.isConnecting);     // boolean
console.log(state.reconnectAttempts); // number
console.log(state.lastError);        // string | null

// Disconnect
sseManager.disconnect();
```

### Event Subscription

**Available Event Types**:
```typescript
type SSEEventType =
  | 'heartbeat'            // Connection keepalive
  | 'hub_state'            // Hub state changes
  | 'log'                  // Backend log messages
  | 'config_changed'       // Configuration updates
  | 'tool_list_changed'    // Tool availability changes
  | 'resource_list_changed' // Resource availability changes
  | 'servers_updated'      // Server connection changes
  | 'notification';        // General notifications
```

**Subscribe to Events**:
```typescript
import { sseManager, type SSEEventType } from '@/utils/sse-client';

function MyComponent() {
  useEffect(() => {
    // Subscribe to hub_state events
    const unsubscribe = sseManager.subscribe('hub_state', (data) => {
      console.log('Hub state changed:', data);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  return <div>Listening for hub state changes...</div>;
}
```

**Multiple Subscriptions**:
```typescript
import { sseManager } from '@/utils/sse-client';

useEffect(() => {
  // Subscribe to multiple event types
  const unsubscribeHub = sseManager.subscribe('hub_state', handleHubState);
  const unsubscribeTools = sseManager.subscribe('tool_list_changed', handleTools);
  const unsubscribeServers = sseManager.subscribe('servers_updated', handleServers);

  // Cleanup all subscriptions
  return () => {
    unsubscribeHub();
    unsubscribeTools();
    unsubscribeServers();
  };
}, []);
```

### useSSESubscription Hook

**Location**: `src/ui/hooks/useSSESubscription.ts`

**Basic Usage**:
```typescript
import { useSSESubscription } from '@/hooks/useSSESubscription';

function ToolsMonitor() {
  useSSESubscription('tool_list_changed', (data) => {
    console.log('Tools changed:', data);
    // React Query cache is automatically invalidated
  });

  return <div>Monitoring tool changes...</div>;
}
```

**With TypeScript Type Safety**:
```typescript
import { useSSESubscription } from '@/hooks/useSSESubscription';

interface HubStateData {
  status: 'ready' | 'restarting' | 'stopped';
  uptime: number;
}

function HubMonitor() {
  useSSESubscription<HubStateData>('hub_state', (data) => {
    // TypeScript knows the shape of data
    console.log(`Hub is ${data.status}, uptime: ${data.uptime}s`);
  });

  return <div>Monitoring hub state...</div>;
}
```

**Conditional Subscription**:
```typescript
import { useSSESubscription } from '@/hooks/useSSESubscription';

function ConditionalMonitor({ enabled }: { enabled: boolean }) {
  useSSESubscription(
    'hub_state',
    (data) => console.log(data),
    [enabled], // Dependencies array
    enabled    // Only subscribe when enabled
  );

  return <div>Conditional monitoring</div>;
}
```

### Automatic Cache Invalidation

The SSE manager automatically invalidates React Query caches when relevant events occur:

| SSE Event | React Query Key Invalidated |
|-----------|----------------------------|
| `hub_state` | `['health']` |
| `tool_list_changed` | `['tools']` |
| `servers_updated` | `['servers']` |
| `config_changed` | `['config']` |
| `resource_list_changed` | (No automatic invalidation) |

**Example Flow**:
```
1. Backend config changes
2. Backend emits 'config_changed' SSE event
3. SSE manager receives event
4. SSE manager invalidates queryClient.invalidateQueries({ queryKey: ['config'] })
5. All useConfig() hooks automatically refetch
6. UI updates with fresh data
```

### Reconnection Behavior

**Automatic Reconnection** with exponential backoff:
```
Attempt 1: Wait 1 second  (1s × 2^0)
Attempt 2: Wait 2 seconds (1s × 2^1)
Attempt 3: Wait 4 seconds (1s × 2^2)
Attempt 4: Wait 8 seconds (1s × 2^3)
Attempt 5: Wait 16 seconds (1s × 2^4)
Max attempts: 5
```

**Monitoring Reconnection**:
```typescript
import { useSSEStore } from '@/store/sse.store';

function ReconnectionStatus() {
  const reconnectAttempts = useSSEStore((state) => state.reconnectAttempts);
  const lastError = useSSEStore((state) => state.lastError);

  if (reconnectAttempts > 0) {
    return (
      <div>
        Reconnecting... (Attempt {reconnectAttempts}/5)
        {lastError && <p>Error: {lastError}</p>}
      </div>
    );
  }

  return null;
}
```

### Full Integration Example

**Complete SSE integration in a component**:
```typescript
import { useEffect } from 'react';
import { useSSESubscription } from '@/hooks/useSSESubscription';
import { useSSEStore } from '@/store/sse.store';
import { sseManager } from '@/utils/sse-client';

function Dashboard() {
  const isConnected = useSSEStore((state) => state.isConnected);
  const isConnecting = useSSEStore((state) => state.isConnecting);
  const reconnectAttempts = useSSEStore((state) => state.reconnectAttempts);

  // Connect on mount
  useEffect(() => {
    sseManager.connect();
    return () => sseManager.disconnect();
  }, []);

  // Subscribe to hub state changes
  useSSESubscription('hub_state', (data) => {
    console.log('Hub state:', data);
  });

  // Subscribe to tool changes
  useSSESubscription('tool_list_changed', (data) => {
    console.log('Tools updated:', data);
    // React Query cache automatically invalidated
  });

  return (
    <div>
      <header>
        {isConnecting && <span>Connecting...</span>}
        {isConnected && <span>Live ✅</span>}
        {reconnectAttempts > 0 && (
          <span>Reconnecting ({reconnectAttempts}/5)...</span>
        )}
      </header>

      {/* Rest of dashboard */}
    </div>
  );
}
```

---

## React Query Hooks

### Overview

Phase 1 establishes the React Query configuration with QueryClientProvider, DevTools, and cache management. All data fetching will use React Query hooks for consistent caching, loading states, and error handling.

### Query Client Configuration

**Location**: `src/ui/utils/query-client.ts`

**Configuration**:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes (formerly cacheTime)
      retry: 3,                         // Retry failed requests 3 times
      refetchOnWindowFocus: false,      // Don't refetch on window focus
      refetchOnMount: true,             // Refetch on component mount
      refetchOnReconnect: true,         // Refetch on network reconnect
    },
    mutations: {
      retry: 1,                         // Retry failed mutations once
    },
  },
});
```

### App Integration

**Location**: `src/ui/App.tsx`

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/utils/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Your app routes */}
      </Router>

      {/* Development tools (automatically hidden in production) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Basic Query Pattern

**Recommended Hook Structure**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { ConfigResponseSchema } from '@/api/schemas/config.schema';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await fetch('/api/config');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate with Zod schema
      const validated = ConfigResponseSchema.parse(data);

      return validated.data;
    },
    staleTime: 1000 * 60 * 5, // Optional: override default
  });
}
```

**Component Usage**:
```typescript
import { useConfig } from '@/hooks/useConfig';

function ConfigDisplay() {
  const { data, isLoading, error, isError } = useConfig();

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h2>Configuration</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### Mutation Pattern

**Recommended Hook Structure**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfigSaveRequestSchema } from '@/api/schemas/config.schema';

export function useSaveConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      // Validate payload
      const validated = ConfigSaveRequestSchema.parse(payload);

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate config query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}
```

**Component Usage**:
```typescript
import { useSaveConfig } from '@/hooks/useSaveConfig';

function ConfigEditor() {
  const saveConfig = useSaveConfig();

  const handleSave = (config: unknown) => {
    saveConfig.mutate(config, {
      onSuccess: () => {
        alert('Configuration saved!');
      },
      onError: (error) => {
        alert(`Error: ${error.message}`);
      },
    });
  };

  return (
    <div>
      <button
        onClick={() => handleSave({ /* config data */ })}
        disabled={saveConfig.isPending}
      >
        {saveConfig.isPending ? 'Saving...' : 'Save Config'}
      </button>

      {saveConfig.isError && (
        <div>Error: {saveConfig.error.message}</div>
      )}
    </div>
  );
}
```

### Cache Invalidation Patterns

**Manual Invalidation**:
```typescript
import { useQueryClient } from '@tanstack/react-query';

function RefreshButton() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate specific query
    queryClient.invalidateQueries({ queryKey: ['config'] });

    // Invalidate all queries starting with 'config'
    queryClient.invalidateQueries({ queryKey: ['config'], exact: false });

    // Invalidate all queries
    queryClient.invalidateQueries();
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

**Automatic Invalidation via SSE**:
```typescript
// Already handled by SSE manager!
// No manual invalidation needed for these events:
// - hub_state → invalidates ['health']
// - tool_list_changed → invalidates ['tools']
// - servers_updated → invalidates ['servers']
// - config_changed → invalidates ['config']
```

### Query Key Conventions

**Consistent query key structure**:
```typescript
// ✅ Good: Consistent, hierarchical keys
['config']                    // All config data
['config', serverId]          // Config for specific server
['tools']                     // All tools
['tools', { category }]       // Filtered tools
['servers']                   // All servers
['servers', serverId]         // Specific server

// ❌ Bad: Inconsistent, flat keys
['getConfig']
['configData']
['allTools']
```

### React Query DevTools

**Available in Development**:
- Press `Ctrl+Shift+D` or click floating icon to open
- View all active queries and mutations
- See cache state, stale/fresh status
- Manually trigger refetch or invalidation
- Monitor query lifecycle and updates

---

## Migration Notes for Phase 2

### Phase 2 Scope

Phase 2 will migrate all existing components to use the Phase 1 foundation:
- Replace direct API calls with React Query hooks
- Replace React.useState with Zustand stores where appropriate
- Integrate SSE subscriptions for real-time updates
- Add comprehensive error handling

### Preparatory Steps

**Before Phase 2 Migration**:

1. **Audit Current State Management** - Identify all instances of:
   - `React.useState` for server/shared state
   - Direct `fetch()` calls to backend APIs
   - Polling/interval-based updates
   - Manual cache invalidation logic

2. **Create Missing Schemas** - Add Zod schemas for:
   - Server list responses
   - Tool list responses
   - Health check responses
   - Any other API endpoints

3. **Create React Query Hooks** - Implement hooks for:
   - `useServers()` - Fetch server list
   - `useTools()` - Fetch tool list
   - `useHealth()` - Health check
   - Mutations for server actions (start, stop, restart)

4. **Document Component Dependencies** - Map which components need:
   - SSE integration
   - Real-time updates
   - Global state access
   - API data fetching

### Migration Checklist (Per Component)

**For Each Component**:

- [ ] Replace direct fetch with React Query hook
- [ ] Add loading state UI
- [ ] Add error state UI
- [ ] Replace useState with Zustand store (if shared state)
- [ ] Add SSE subscription (if real-time updates needed)
- [ ] Remove manual polling/intervals
- [ ] Add schema validation
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Test real-time updates (if applicable)

### Example Migration

**Before (Direct Fetch)**:
```typescript
function ServerList() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/servers')
      .then((res) => res.json())
      .then((data) => {
        setServers(data.servers);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <ul>{servers.map((s) => <li key={s.id}>{s.name}</li>)}</ul>;
}
```

**After (React Query + SSE)**:
```typescript
import { useServers } from '@/hooks/useServers';
import { useSSESubscription } from '@/hooks/useSSESubscription';

function ServerList() {
  const { data: servers, isLoading, error } = useServers();

  // Real-time updates via SSE
  useSSESubscription('servers_updated', (data) => {
    console.log('Servers updated:', data);
    // React Query cache automatically invalidated
  });

  if (isLoading) {
    return <div>Loading servers...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <ul>
      {servers.map((server) => (
        <li key={server.id}>{server.name}</li>
      ))}
    </ul>
  );
}
```

### Breaking Changes to Avoid

**DO NOT** in Phase 2:
- Change API response formats (maintain backward compatibility)
- Remove existing REST endpoints (components may still use them temporarily)
- Modify SSE event payloads (existing listeners depend on them)
- Change Zustand store structure (components using Phase 1 stores)

**Safe to Change** in Phase 2:
- Component internal state management
- Component data fetching methods
- Component render logic
- Component file organization

### Testing Strategy for Phase 2

**Component Testing**:
1. Test loading states
2. Test error states
3. Test successful data fetch
4. Test SSE updates (if applicable)
5. Test user interactions (mutations)
6. Test cache behavior

**Integration Testing**:
1. Test SSE → React Query cache flow
2. Test mutation → invalidation → refetch flow
3. Test reconnection behavior
4. Test error recovery

### Performance Considerations

**Phase 2 Optimizations**:
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Debounce user input in forms
- Use Suspense boundaries for better UX
- Monitor React Query cache size

**Avoid**:
- Over-fetching (request only needed data)
- Over-invalidation (target specific query keys)
- Polling when SSE available
- Unnecessary re-renders (use selective Zustand selectors)

---

## Summary

Phase 1 establishes the complete foundation for type-safe, reactive UI-API integration:

**✅ Completed**:
- Comprehensive Zod schema validation system
- Zustand store for SSE connection state
- SSE manager with auto-reconnection and cache invalidation
- React Query configuration with DevTools
- useSSESubscription hook for real-time updates
- Test coverage: 53 schema tests + 23 SSE integration tests

**📦 Ready for Phase 2**:
- Schemas provide runtime type safety
- Stores enable reactive state management
- SSE manager handles real-time updates
- React Query ensures consistent data fetching
- Patterns documented for component migration

**🎯 Next Steps** (Phase 2):
1. Create React Query hooks for all API endpoints
2. Migrate components from direct fetch to hooks
3. Replace useState with Zustand stores where appropriate
4. Integrate SSE subscriptions for real-time features
5. Add comprehensive component testing

---

**Document Version**: 1.0.0
**Last Updated**: January 8, 2025
**Maintained By**: MCP Hub Development Team
