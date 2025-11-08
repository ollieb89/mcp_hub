# MCP Hub UI-API Integration Design Specification

**Project**: MCP Hub
**Version**: 1.0.0
**Created**: 2025-01-08
**Status**: Design Specification
**Audience**: Full-stack developers, architects, maintainers

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Integration Map](#component-integration-map)
4. [Type System & Contracts](#type-system--contracts)
5. [State Management Strategy](#state-management-strategy)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Real-Time Integration](#real-time-integration)
8. [Error Handling & User Feedback](#error-handling--user-feedback)
9. [Performance Optimization](#performance-optimization)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Current State

**Frontend**: React + TypeScript + MUI + Vite application with:
- 4 pages (Dashboard, Servers, Tools, Configuration)
- 14 UI components
- 4 custom hooks
- Basic API client layer (`src/ui/api/`)

**Backend**: Express.js REST API with:
- 24+ endpoints across 6 categories
- SSE real-time event streaming
- MCP protocol endpoints
- Configuration management with version tracking

### Design Goals

1. **Type Safety**: End-to-end TypeScript with runtime validation
2. **Real-Time Sync**: Seamless SSE integration with client state
3. **Performance**: <500KB bundle, <3.5s TTI, optimistic updates
4. **Developer Experience**: Clear patterns, minimal boilerplate, strong typing
5. **Reliability**: 80%+ test coverage, comprehensive error handling

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Management** | Zustand | Minimal boilerplate, TypeScript-first, selective subscriptions |
| **Data Fetching** | TanStack Query | Automatic caching, optimistic updates, SSE integration |
| **Type Validation** | Zod | Runtime safety, schema-first contracts, form integration |
| **Real-Time** | Centralized SSE Manager | Single connection, automatic cache updates, reconnection logic |
| **Component Pattern** | Atomic Design | Scalable structure, reusable primitives, clear hierarchy |

---

## Architecture Overview

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    React Application                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Pages      │  │  Components  │  │    Hooks     │    │ │
│  │  │ (4 routes)   │  │  (14 total)  │  │  (4 custom)  │    │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │ │
│  │         │                  │                  │             │ │
│  │         └──────────────────┴──────────────────┘             │ │
│  │                            │                                │ │
│  │  ┌─────────────────────────▼──────────────────────────┐   │ │
│  │  │         State Management Layer (Zustand)           │   │ │
│  │  │  - Server State (TanStack Query)                   │   │ │
│  │  │  - UI State (Zustand)                              │   │ │
│  │  │  - Real-Time Events (SSE Manager)                  │   │ │
│  │  └─────────────────────────┬──────────────────────────┘   │ │
│  │                            │                                │ │
│  │  ┌─────────────────────────▼──────────────────────────┐   │ │
│  │  │           API Client Layer (Typed)                 │   │ │
│  │  │  - Request Validation (Zod)                        │   │ │
│  │  │  - Response Parsing (Zod)                          │   │ │
│  │  │  - Error Transformation                            │   │ │
│  │  └─────────────────────────┬──────────────────────────┘   │ │
│  └────────────────────────────┼────────────────────────────┘ │
└─────────────────────────────┬─┼────────────────────────────┘
                               │ │
                    ┌──────────▼─▼──────────┐
                    │    HTTP/HTTPS          │
                    │   /api/* (REST)        │
                    │   /events (SSE)        │
                    └──────────┬─────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                      Express.js Server                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    API Router                           │  │
│  │  - 24+ REST endpoints                                   │  │
│  │  - Validation middleware (Ajv)                          │  │
│  │  - Authentication (API key)                             │  │
│  │  - Rate limiting                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 SSE Manager                             │  │
│  │  - Event broadcasting                                   │  │
│  │  - Connection management                                │  │
│  │  - Subscription types                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   MCP Hub                               │  │
│  │  - Server orchestration                                 │  │
│  │  - Tool filtering                                       │  │
│  │  - Configuration management                             │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Directory Structure (Proposed)

```
src/ui/
├── api/                      # API client layer
│   ├── client.ts            # Base fetch wrapper (existing)
│   ├── schemas/             # Zod schemas (NEW)
│   │   ├── server.schema.ts
│   │   ├── config.schema.ts
│   │   ├── filtering.schema.ts
│   │   ├── tools.schema.ts
│   │   └── common.schema.ts
│   ├── hooks/               # React Query hooks (NEW)
│   │   ├── useServers.ts
│   │   ├── useConfig.ts
│   │   ├── useFiltering.ts
│   │   ├── useTools.ts
│   │   └── useMarketplace.ts
│   ├── mutations/           # Mutation functions (NEW)
│   │   ├── server.mutations.ts
│   │   ├── config.mutations.ts
│   │   └── filtering.mutations.ts
│   ├── config.ts            # Config API (refactored)
│   ├── filtering.ts         # Filtering API (refactored)
│   ├── servers.ts           # Servers API (refactored)
│   ├── tools.ts             # Tools API (refactored)
│   └── index.ts             # Exports
├── components/              # UI components
│   ├── atoms/               # Atomic primitives (NEW)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── molecules/           # Composite components (NEW)
│   │   ├── MetricCard.tsx  # (existing, moved)
│   │   ├── FilteringCard.tsx
│   │   └── ServerStatusBadge.tsx
│   ├── organisms/           # Complex components (NEW)
│   │   ├── ServersTable.tsx # (existing, moved)
│   │   ├── ToolsTable.tsx
│   │   ├── ConfigEditor.tsx
│   │   └── LogsPanel.tsx
│   ├── templates/           # Page layouts (NEW)
│   │   ├── DashboardLayout.tsx
│   │   └── SettingsLayout.tsx
│   ├── Sidebar.tsx          # (existing, refactored)
│   └── Header.tsx           # (existing, refactored)
├── hooks/                   # Custom hooks
│   ├── useSSESubscription.ts # (existing, enhanced)
│   ├── useSnackbar.ts       # (existing)
│   ├── useLogsStream.ts     # (existing, refactored)
│   └── usePolling.ts        # (existing, deprecated)
├── pages/                   # Page components
│   ├── DashboardPage.tsx
│   ├── ServersPage.tsx
│   ├── ToolsPage.tsx
│   └── ConfigPage.tsx
├── store/                   # Zustand stores (NEW)
│   ├── ui.store.ts          # UI state (sidebar, modals, etc.)
│   ├── sse.store.ts         # SSE connection state
│   └── index.ts
├── utils/                   # Utility functions (NEW)
│   ├── sse-client.ts        # SSE connection manager
│   ├── query-client.ts      # React Query config
│   └── error-handler.ts     # Global error handler
├── theme/
│   └── index.ts
├── App.tsx
└── main.tsx
```

---

## Component Integration Map

### Page → Component → API Mapping

#### DashboardPage

**Components Used:**
- `MetricCard` (×4) - Server count, tool count, active connections, cache stats
- `ActiveFiltersCard` - Current filtering configuration
- `CacheLineChart` - Cache performance over time
- `ToolPieChart` - Tools distribution by server

**API Dependencies:**
- `GET /api/health` → Hub state, server count, active connections
- `GET /api/servers` → Server statuses
- `GET /api/tools` → Tool aggregation
- `GET /api/filtering/stats` → Filtering metrics
- `GET /events` (SSE) → Real-time health updates

**State Management:**
```typescript
// src/ui/pages/DashboardPage.tsx
import { useHealth } from '@api/hooks/useHealth';
import { useServers } from '@api/hooks/useServers';
import { useFilteringStats } from '@api/hooks/useFiltering';

function DashboardPage() {
  // React Query hooks fetch and cache data
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: stats } = useFilteringStats();

  // SSE updates automatically invalidate React Query cache
  useSSESubscription(['hub_state', 'tool_list_changed']);

  // UI state in Zustand
  const { isSidebarOpen } = useUIStore();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Servers"
          value={health?.servers?.length || 0}
          isLoading={healthLoading}
        />
      </Grid>
      {/* ... more metrics */}
    </Grid>
  );
}
```

#### ServersPage

**Components Used:**
- `ServersTable` - Server list with status, uptime, actions
- `Sidebar` - Navigation

**API Dependencies:**
- `GET /api/servers` → Server list
- `POST /api/servers/start` → Start server
- `POST /api/servers/stop` → Stop server
- `POST /api/servers/refresh` → Refresh capabilities
- `GET /events` (SSE) → Real-time server updates

**State Management:**
```typescript
// src/ui/pages/ServersPage.tsx
import { useServers, useStartServer, useStopServer } from '@api/hooks/useServers';

function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const startServer = useStartServer();
  const stopServer = useStopServer();

  // SSE invalidates query on server state change
  useSSESubscription(['servers_updated']);

  const handleStart = async (serverName: string) => {
    await startServer.mutateAsync(serverName, {
      // Optimistic update
      onMutate: async (name) => {
        await queryClient.cancelQueries(['servers']);
        const previous = queryClient.getQueryData(['servers']);

        queryClient.setQueryData(['servers'], (old: ServersResponse) => ({
          ...old,
          servers: old.servers.map(s =>
            s.name === name ? { ...s, status: 'connecting' } : s
          )
        }));

        return { previous };
      },
      // Rollback on error
      onError: (err, name, context) => {
        queryClient.setQueryData(['servers'], context?.previous);
      }
    });
  };

  return <ServersTable servers={servers} onStart={handleStart} onStop={handleStop} />;
}
```

#### ToolsPage

**Components Used:**
- `ToolsTable` - Tool list with search, filter, category badges
- `ActiveFiltersCard` - Current filtering state

**API Dependencies:**
- `GET /api/tools` → Tool aggregation
- `GET /api/filtering/stats` → Filtering statistics
- `POST /api/filtering/mode` → Update filtering mode
- `GET /events` (SSE) → Real-time tool list changes

#### ConfigPage

**Components Used:**
- `ConfigTabs` - JSON editor, server allowlist, category list
- `RawJsonEditor` - Monaco editor for JSON
- `ConfigPreviewDialog` - Preview changes before save

**API Dependencies:**
- `GET /api/config` → Fetch configuration
- `POST /api/config` → Save configuration (with version check)
- `GET /events` (SSE) → Configuration change notifications

---

## Type System & Contracts

### Shared Type Definitions

```typescript
// src/ui/api/schemas/common.schema.ts
import { z } from 'zod';

export const TimestampSchema = z.string().datetime();

export const BaseResponseSchema = z.object({
  status: z.literal('success'),
  meta: z.object({
    timestamp: TimestampSchema,
    requestId: z.string().optional(),
  }),
});

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
  meta: z.object({
    timestamp: TimestampSchema,
    requestId: z.string().optional(),
  }),
});
```

### Server Schema

```typescript
// src/ui/api/schemas/server.schema.ts
import { z } from 'zod';
import { BaseResponseSchema } from './common.schema';

export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'unauthorized',
  'disabled',
]);

export const ServerInfoSchema = z.object({
  name: z.string(),
  status: ServerStatusSchema,
  displayName: z.string().optional(),
  transportType: z.enum(['stdio', 'sse', 'streamable-http']).optional(),
  uptime: z.number().nonnegative().optional(),
  disabled: z.boolean().optional(),
  lastError: z.string().optional(),
  capabilities: z
    .object({
      tools: z.array(z.unknown()).optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const ServersResponseSchema = BaseResponseSchema.extend({
  data: z.array(ServerInfoSchema),
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
export type ServersResponse = z.infer<typeof ServersResponseSchema>;
```

### API Client with Validation

```typescript
// src/ui/api/client.ts (enhanced)
import { z } from 'zod';
import { ErrorResponseSchema } from './schemas/common.schema';

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public requestId?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Validate error response
    const errorResult = ErrorResponseSchema.safeParse(data);

    if (errorResult.success) {
      throw new APIError(
        errorResult.data.error.code,
        errorResult.data.error.message,
        errorResult.data.error.details,
        errorResult.data.error.requestId
      );
    }

    // Fallback for non-standard errors
    throw new APIError(
      'UNKNOWN_ERROR',
      data.message || response.statusText,
      data
    );
  }

  // Validate success response
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new APIError(
      'VALIDATION_ERROR',
      'Response validation failed',
      { errors: result.error.errors }
    );
  }

  return result.data;
}
```

### Type-Safe API Functions

```typescript
// src/ui/api/servers.ts (refactored)
import { request } from './client';
import { ServersResponseSchema, ServerInfoSchema } from './schemas/server.schema';

export function getServers() {
  return request('/api/servers', ServersResponseSchema);
}

export function getServerInfo(serverName: string) {
  return request(`/api/servers/${serverName}`, ServerInfoSchema);
}

export function startServer(serverName: string) {
  return request('/api/servers/start', ServerInfoSchema, {
    method: 'POST',
    body: JSON.stringify({ server_name: serverName }),
  });
}
```

---

## State Management Strategy

### Zustand for UI State

```typescript
// src/ui/store/ui.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;

  // Snackbars
  snackbars: Array<{ id: string; message: string; severity: 'success' | 'error' | 'info' }>;
  addSnackbar: (message: string, severity?: 'success' | 'error' | 'info') => void;
  removeSnackbar: (id: string) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      activeModal: null,
      modalData: null,
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      snackbars: [],
      addSnackbar: (message, severity = 'info') =>
        set((state) => ({
          snackbars: [
            ...state.snackbars,
            { id: crypto.randomUUID(), message, severity },
          ],
        })),
      removeSnackbar: (id) =>
        set((state) => ({
          snackbars: state.snackbars.filter((s) => s.id !== id),
        })),

      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'UI Store' }
  )
);
```

### TanStack Query for Server State

```typescript
// src/ui/utils/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory for consistency
export const queryKeys = {
  health: ['health'] as const,
  servers: {
    all: ['servers'] as const,
    detail: (name: string) => ['servers', name] as const,
  },
  tools: {
    all: ['tools'] as const,
    filtered: (mode: string) => ['tools', 'filtered', mode] as const,
  },
  config: ['config'] as const,
  filtering: {
    stats: ['filtering', 'stats'] as const,
  },
  marketplace: {
    catalog: (params: Record<string, unknown>) => ['marketplace', 'catalog', params] as const,
  },
} as const;
```

### React Query Hooks

```typescript
// src/ui/api/hooks/useServers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServers, startServer, stopServer } from '../servers';
import { queryKeys } from '@utils/query-client';

export function useServers() {
  return useQuery({
    queryKey: queryKeys.servers.all,
    queryFn: getServers,
  });
}

export function useStartServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startServer,
    onMutate: async (serverName) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.servers.all });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.servers.all);

      // Optimistic update
      queryClient.setQueryData(queryKeys.servers.all, (old: ServersResponse) => ({
        ...old,
        data: old.data.map((s) =>
          s.name === serverName ? { ...s, status: 'connecting' as const } : s
        ),
      }));

      return { previous };
    },
    onError: (err, serverName, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.servers.all, context?.previous);
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
}

export function useStopServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverName, disable }: { serverName: string; disable?: boolean }) =>
      stopServer(serverName, disable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
}
```

---

## Data Flow Architecture

### Request Flow (Happy Path)

```
User Interaction
    │
    ├─> Component Event Handler
    │       │
    │       ├─> React Query Mutation Hook
    │       │       │
    │       │       ├─> Optimistic Update (queryClient.setQueryData)
    │       │       │
    │       │       ├─> API Request (typed with Zod)
    │       │       │       │
    │       │       │       └─> HTTP POST /api/servers/start
    │       │       │               │
    │       │       │               └─> Backend Validation (Ajv)
    │       │       │                       │
    │       │       │                       └─> MCPHub.startServer()
    │       │       │                               │
    │       │       │                               └─> SSE Broadcast (servers_updated)
    │       │       │
    │       │       ├─> Success Response (validated with Zod)
    │       │       │
    │       │       └─> Cache Invalidation (queryClient.invalidateQueries)
    │       │
    │       └─> UI Update (automatic via React Query)
    │
    └─> SSE Event (servers_updated)
            │
            └─> SSE Manager Hook
                    │
                    └─> React Query Cache Invalidation
                            │
                            └─> Automatic Re-fetch
                                    │
                                    └─> UI Update
```

### Error Flow

```
API Request
    │
    ├─> Network Error (fetch failed)
    │       │
    │       └─> React Query Retry (3 attempts)
    │               │
    │               ├─> Success → Continue normal flow
    │               │
    │               └─> Failure → onError callback
    │                       │
    │                       ├─> Rollback Optimistic Update
    │                       │
    │                       └─> Show Error Snackbar
    │
    └─> HTTP Error (4xx/5xx)
            │
            ├─> Parse Error Response (ErrorResponseSchema)
            │       │
            │       └─> Throw APIError
            │               │
            │               └─> React Query onError
            │                       │
            │                       ├─> Log Error (requestId)
            │                       │
            │                       └─> Show Error Snackbar with Details
            │
            └─> Validation Error (Zod parse failed)
                    │
                    └─> Throw APIError (VALIDATION_ERROR)
                            │
                            └─> React Query onError
                                    │
                                    └─> Show Technical Error Dialog
```

---

## Real-Time Integration

### SSE Connection Manager

```typescript
// src/ui/utils/sse-client.ts
import { queryClient, queryKeys } from './query-client';

export type SSEEventType =
  | 'hub_state'
  | 'tool_list_changed'
  | 'resource_list_changed'
  | 'servers_updated'
  | 'config_changed';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners = new Map<SSEEventType, Set<(data: unknown) => void>>();

  connect() {
    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource('/events');

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      this.eventSource?.close();
      this.eventSource = null;
      this.reconnect();
    };

    // Listen for all event types
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.eventSource) return;

    // Hub state changes
    this.eventSource.addEventListener('hub_state', (event) => {
      const data = JSON.parse(event.data);
      this.emit('hub_state', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.health });
    });

    // Tool list changes
    this.eventSource.addEventListener('tool_list_changed', (event) => {
      const data = JSON.parse(event.data);
      this.emit('tool_list_changed', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    });

    // Server updates
    this.eventSource.addEventListener('servers_updated', (event) => {
      const data = JSON.parse(event.data);
      this.emit('servers_updated', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    });

    // Config changes
    this.eventSource.addEventListener('config_changed', (event) => {
      const data = JSON.parse(event.data);
      this.emit('config_changed', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    });
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`[SSE] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  subscribe(eventType: SSEEventType, callback: (data: unknown) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: SSEEventType, data: unknown) {
    this.listeners.get(eventType)?.forEach((callback) => callback(data));
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.listeners.clear();
  }
}

export const sseManager = new SSEConnectionManager();
```

### SSE React Hook

```typescript
// src/ui/hooks/useSSESubscription.ts (enhanced)
import { useEffect } from 'react';
import { sseManager, SSEEventType } from '@utils/sse-client';

export function useSSESubscription(
  eventTypes: SSEEventType[],
  callback?: (eventType: SSEEventType, data: unknown) => void
) {
  useEffect(() => {
    // Ensure SSE connection is established
    sseManager.connect();

    // Subscribe to events
    const unsubscribers = eventTypes.map((eventType) =>
      sseManager.subscribe(eventType, (data) => {
        callback?.(eventType, data);
      })
    );

    // Cleanup
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [eventTypes, callback]);
}
```

### Usage in Components

```typescript
// src/ui/pages/DashboardPage.tsx
import { useSSESubscription } from '@hooks/useSSESubscription';
import { useUIStore } from '@store/ui.store';

function DashboardPage() {
  const { addSnackbar } = useUIStore();

  // Automatic cache invalidation via sseManager
  useSSESubscription(['hub_state', 'tool_list_changed']);

  // Custom event handling
  useSSESubscription(['servers_updated'], (eventType, data) => {
    addSnackbar('Servers updated', 'info');
  });

  // React Query automatically re-fetches due to cache invalidation
  const { data: health } = useHealth();

  return <div>{/* ... */}</div>;
}
```

---

## Error Handling & User Feedback

### Global Error Boundary

```typescript
// src/ui/components/ErrorBoundary.tsx
import React from 'react';
import { Alert, Box, Button } from '@mui/material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Log to monitoring service (e.g., Sentry)
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Application Error</strong>
            <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          </Alert>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

### Snackbar System

```typescript
// src/ui/components/SnackbarManager.tsx
import { useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useUIStore } from '@store/ui.store';

export function SnackbarManager() {
  const { snackbars, removeSnackbar } = useUIStore();

  return (
    <>
      {snackbars.map((snackbar) => (
        <Snackbar
          key={snackbar.id}
          open
          autoHideDuration={6000}
          onClose={() => removeSnackbar(snackbar.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeSnackbar(snackbar.id)}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
```

### API Error Handling in Components

```typescript
// src/ui/pages/ServersPage.tsx
import { useStartServer } from '@api/hooks/useServers';
import { useUIStore } from '@store/ui.store';
import { APIError } from '@api/client';

function ServersPage() {
  const startServer = useStartServer();
  const { addSnackbar } = useUIStore();

  const handleStart = async (serverName: string) => {
    try {
      await startServer.mutateAsync(serverName);
      addSnackbar(`Server "${serverName}" started`, 'success');
    } catch (error) {
      if (error instanceof APIError) {
        addSnackbar(
          `Failed to start server: ${error.message} (${error.code})`,
          'error'
        );

        // Log request ID for debugging
        console.error('[ServerStart] Error:', {
          code: error.code,
          message: error.message,
          requestId: error.requestId,
          details: error.details,
        });
      } else {
        addSnackbar('An unexpected error occurred', 'error');
      }
    }
  };

  return <div>{/* ... */}</div>;
}
```

---

## Performance Optimization

### Code Splitting Strategy

```typescript
// src/ui/App.tsx (enhanced)
import { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Route-based code splitting
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const ServersPage = lazy(() => import('@pages/ServersPage'));
const ToolsPage = lazy(() => import('@pages/ToolsPage'));
const ConfigPage = lazy(() => import('@pages/ConfigPage'));

// Heavy components lazy loaded
const MonacoEditor = lazy(() => import('@components/organisms/MonacoEditor'));
const ToolsTable = lazy(() => import('@components/organisms/ToolsTable'));

const PageFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/servers" element={<ServersPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/configuration" element={<ConfigPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtualization for Large Lists

```typescript
// src/ui/components/organisms/ToolsTable.tsx (enhanced)
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface ToolsTableProps {
  tools: ToolSummary[];
}

function ToolsTable({ tools }: ToolsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Row height
    overscan: 10, // Render 10 extra items for smooth scrolling
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const tool = tools[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ToolRow tool={tool} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Memoization Best Practices

```typescript
// src/ui/components/organisms/ServersTable.tsx
import { memo, useMemo } from 'react';

interface ServersTableProps {
  servers: ServerInfo[];
  onStart: (name: string) => void;
  onStop: (name: string) => void;
}

export const ServersTable = memo(function ServersTable({
  servers,
  onStart,
  onStop,
}: ServersTableProps) {
  // Expensive computation memoized
  const serversByStatus = useMemo(() => {
    return servers.reduce((acc, server) => {
      if (!acc[server.status]) {
        acc[server.status] = [];
      }
      acc[server.status].push(server);
      return acc;
    }, {} as Record<string, ServerInfo[]>);
  }, [servers]);

  // Sort order memoized
  const sortedServers = useMemo(() => {
    return [...servers].sort((a, b) => a.name.localeCompare(b.name));
  }, [servers]);

  return (
    <TableContainer>
      {sortedServers.map((server) => (
        <ServerRow
          key={server.name}
          server={server}
          onStart={onStart}
          onStop={onStop}
        />
      ))}
    </TableContainer>
  );
});

// Memoize individual row
const ServerRow = memo(function ServerRow({
  server,
  onStart,
  onStop,
}: {
  server: ServerInfo;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
}) {
  return (
    <TableRow>
      <TableCell>{server.name}</TableCell>
      <TableCell>{server.status}</TableCell>
      <TableCell>
        <Button onClick={() => onStart(server.name)}>Start</Button>
        <Button onClick={() => onStop(server.name)}>Stop</Button>
      </TableCell>
    </TableRow>
  );
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Setup infrastructure without breaking existing functionality

**Tasks:**
1. Install dependencies
   ```bash
   bun add zustand @tanstack/react-query zod
   bun add -D @tanstack/react-query-devtools
   ```

2. Create directory structure
   - `src/ui/api/schemas/`
   - `src/ui/api/hooks/`
   - `src/ui/api/mutations/`
   - `src/ui/store/`
   - `src/ui/utils/`

3. Setup Zod schemas
   - Common schemas (BaseResponseSchema, ErrorResponseSchema)
   - Server schemas
   - Config schemas
   - Filtering schemas
   - Tools schemas

4. Setup React Query
   - Create query client configuration
   - Add QueryClientProvider to App.tsx
   - Add React Query DevTools (development only)

5. Setup Zustand stores
   - UI store (sidebar, modals, snackbars, theme)
   - SSE store (connection state)

**Success Criteria:**
- All dependencies installed and types working
- Directory structure created
- Zod schemas validate existing API responses
- React Query provider wraps app
- Zustand stores accessible in components

---

### Phase 2: State Management Migration (Weeks 3-4)

**Goal**: Migrate to React Query for server state, Zustand for UI state

**Tasks:**
1. Migrate API functions to use validated `request()`
   - Update `servers.ts`
   - Update `config.ts`
   - Update `filtering.ts`
   - Update `tools.ts`

2. Create React Query hooks
   - `useHealth()` - health endpoint
   - `useServers()` - servers list
   - `useConfig()` - config fetch
   - `useFilteringStats()` - filtering stats
   - `useTools()` - tools list

3. Create mutation hooks
   - `useStartServer()` - with optimistic updates
   - `useStopServer()` - with optimistic updates
   - `useSaveConfig()` - with version checking
   - `useUpdateFilteringMode()` - with optimistic updates

4. Migrate SSE integration
   - Create SSEConnectionManager
   - Integrate with React Query cache invalidation
   - Update useSSESubscription hook

**Success Criteria:**
- All API calls use Zod-validated request function
- React Query hooks replace manual fetch calls
- Optimistic updates working for server start/stop
- SSE events automatically invalidate relevant queries
- No manual state management for server data

---

### Phase 3: Component Migration (Weeks 5-6)

**Goal**: Refactor components to use new state management

**Tasks:**
1. Migrate DashboardPage
   - Use `useHealth()` hook
   - Use `useServers()` hook
   - Use `useFilteringStats()` hook
   - Remove manual state management

2. Migrate ServersPage
   - Use `useServers()` hook
   - Use `useStartServer()` mutation
   - Use `useStopServer()` mutation
   - Implement optimistic updates
   - Add error handling with snackbars

3. Migrate ToolsPage
   - Use `useTools()` hook
   - Use `useFilteringStats()` hook
   - Implement virtualization for tool list

4. Migrate ConfigPage
   - Use `useConfig()` hook
   - Use `useSaveConfig()` mutation
   - Implement version conflict handling
   - Add preview dialog

5. Refactor components to Atomic Design
   - Create atoms (Button, Input, Badge, Spinner)
   - Create molecules (MetricCard, ServerStatusBadge)
   - Move existing components to organisms/
   - Create templates for page layouts

**Success Criteria:**
- All pages use React Query hooks
- No manual state updates in components
- Optimistic updates working correctly
- Error handling consistent across pages
- Component hierarchy follows Atomic Design

---

### Phase 4: Testing & Optimization (Weeks 7-8)

**Goal**: Achieve 80%+ test coverage and optimize performance

**Tasks:**
1. Write unit tests
   - Zod schemas validation tests
   - React Query hooks tests (with MSW)
   - Zustand store tests
   - Component unit tests (Testing Library)

2. Write integration tests
   - Page flow tests (user interactions)
   - SSE integration tests
   - Error handling tests

3. E2E tests (Playwright)
   - Server start/stop flow
   - Config save flow
   - Filtering mode change flow

4. Performance optimization
   - Code splitting (route-based)
   - Lazy loading (heavy components)
   - Virtualization (tools table)
   - Memoization (expensive computations)
   - Bundle analysis and tree shaking

5. Accessibility audit
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
   - Color contrast

**Success Criteria:**
- 80%+ test coverage (branches)
- All critical user flows covered by E2E tests
- Bundle size <500KB gzipped
- TTI <3.5s
- Lighthouse score >90
- WCAG 2.1 AA compliant

---

### Phase 5: Polish & Deploy (Weeks 9-10)

**Goal**: Production-ready UI with documentation

**Tasks:**
1. Documentation
   - API client usage guide
   - Component library (Storybook)
   - State management patterns
   - Testing guidelines

2. Error monitoring
   - Integrate Sentry or similar
   - Add request ID tracking
   - Add performance monitoring

3. Build optimization
   - Production build configuration
   - Asset optimization (images, fonts)
   - Service worker (optional)

4. Deployment
   - CI/CD pipeline updates
   - Environment-specific configs
   - Smoke tests in staging

**Success Criteria:**
- Complete documentation
- Error monitoring active
- Production build optimized
- Deployment pipeline working
- Staging environment validated

---

## Testing Strategy

### Unit Tests (Vitest + Testing Library)

```typescript
// src/ui/api/schemas/__tests__/server.schema.test.ts
import { describe, it, expect } from 'vitest';
import { ServerInfoSchema, ServersResponseSchema } from '../server.schema';

describe('ServerInfoSchema', () => {
  it('should validate valid server info', () => {
    const validServer = {
      name: 'test-server',
      status: 'connected',
      displayName: 'Test Server',
      transportType: 'stdio',
    };

    const result = ServerInfoSchema.safeParse(validServer);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalidServer = {
      name: 'test-server',
      status: 'invalid-status',
    };

    const result = ServerInfoSchema.safeParse(invalidServer);
    expect(result.success).toBe(false);
  });
});
```

```typescript
// src/ui/api/hooks/__tests__/useServers.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useServers } from '../useServers';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/servers', () => {
    return HttpResponse.json({
      status: 'success',
      data: [
        { name: 'server-1', status: 'connected' },
        { name: 'server-2', status: 'disconnected' },
      ],
      meta: { timestamp: new Date().toISOString() },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useServers', () => {
  it('should fetch servers successfully', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useServers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].name).toBe('server-1');
  });
});
```

### Integration Tests

```typescript
// src/ui/pages/__tests__/ServersPage.integration.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, userEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ServersPage } from '../ServersPage';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/servers', () => {
    return HttpResponse.json({
      status: 'success',
      data: [{ name: 'test-server', status: 'disconnected' }],
      meta: { timestamp: new Date().toISOString() },
    });
  }),
  http.post('/api/servers/start', () => {
    return HttpResponse.json({
      status: 'success',
      data: { name: 'test-server', status: 'connecting' },
      meta: { timestamp: new Date().toISOString() },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ServersPage Integration', () => {
  it('should start server when button clicked', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ServersPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for servers to load
    await waitFor(() => {
      expect(screen.getByText('test-server')).toBeInTheDocument();
    });

    // Click start button
    const startButton = screen.getByRole('button', { name: /start/i });
    await user.click(startButton);

    // Optimistic update should show 'connecting'
    await waitFor(() => {
      expect(screen.getByText('connecting')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/servers.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Server Management', () => {
  test('should start and stop server', async ({ page }) => {
    // Navigate to servers page
    await page.goto('/servers');

    // Wait for servers table
    await page.waitForSelector('table');

    // Find test server row
    const serverRow = page.locator('tr:has-text("test-server")');

    // Start server
    await serverRow.getByRole('button', { name: /start/i }).click();

    // Wait for status change
    await expect(serverRow.locator('text=connecting')).toBeVisible();
    await expect(serverRow.locator('text=connected')).toBeVisible({ timeout: 10000 });

    // Stop server
    await serverRow.getByRole('button', { name: /stop/i }).click();

    // Wait for status change
    await expect(serverRow.locator('text=disconnected')).toBeVisible({ timeout: 10000 });
  });

  test('should show error on invalid server operation', async ({ page }) => {
    await page.goto('/servers');

    // Start non-existent server
    await page.evaluate(() => {
      // Simulate error by calling mutation directly
      window.startServerMutation('non-existent-server');
    });

    // Error snackbar should appear
    await expect(page.locator('role=alert')).toContainText('Failed to start server');
  });
});
```

---

## Conclusion

This design specification provides a comprehensive blueprint for properly integrating the MCP Hub UI with the backend API. The architecture leverages modern React patterns (React Query, Zustand), ensures type safety with Zod validation, and provides a seamless real-time experience through SSE integration.

### Key Achievements

✅ **Type Safety**: End-to-end TypeScript with runtime validation
✅ **Performance**: Optimistic updates, code splitting, virtualization
✅ **Real-Time**: Automatic cache invalidation from SSE events
✅ **Developer Experience**: Minimal boilerplate, clear patterns
✅ **Reliability**: Comprehensive error handling, 80%+ test coverage

### Next Steps

1. **Review with team** - Get stakeholder buy-in on architectural decisions
2. **Create POC** - Build proof of concept for Phase 1 (Foundation)
3. **Gradual migration** - Follow 10-week implementation roadmap
4. **Continuous monitoring** - Track performance and error metrics
5. **Iterate based on feedback** - Adjust patterns based on real-world usage

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-01-08
**Version**: 1.0.0
**Approval Required**: Yes (architect review)
