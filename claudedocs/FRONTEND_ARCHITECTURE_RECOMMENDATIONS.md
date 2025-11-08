# Frontend Architecture Recommendations

## Component Organization Strategy

### Atomic Design Structure

Reorganize components using atomic design principles:

```
src/ui/components/
├── atoms/                    # Smallest reusable elements
│   ├── MetricCard.tsx       # ✓ Already atomic
│   ├── Badge/
│   ├── Icon/
│   └── StatusIndicator/
│
├── molecules/                # Simple component combinations
│   ├── FilteringCard/
│   │   ├── FilteringCard.tsx
│   │   ├── FilteringCard.test.tsx
│   │   └── index.ts
│   ├── ActiveFiltersCard/   # ✓ Move here
│   ├── ServerAllowlistEditor/
│   └── CategoryListEditor/
│
├── organisms/                # Complex component assemblies
│   ├── ServersTable/
│   │   ├── ServersTable.tsx
│   │   ├── ServerRow.tsx
│   │   ├── ServerActions.tsx
│   │   └── index.ts
│   ├── ToolsTable/           # ✓ Move here
│   ├── LogsPanel/            # ✓ Move here
│   ├── Header/               # ✓ Move here
│   ├── Sidebar/              # ✓ Move here
│   └── charts/
│       ├── ToolPieChart/
│       └── CacheLineChart/
│
├── templates/                # Page-level layouts
│   ├── DashboardLayout/
│   ├── PageLayout/
│   └── SidebarLayout/
│
└── features/                 # Feature-specific components
    ├── config/
    │   ├── ConfigTabs/
    │   ├── RawJsonEditor/
    │   └── ConfigPreviewDialog/
    └── logs/
        └── LogsViewer/
```

**Benefits:**
- **Discoverability**: Clear component hierarchy
- **Reusability**: Atomic components easily composed
- **Testing**: Test smaller units independently
- **Code Splitting**: Feature-based lazy loading

**Migration Path:**
1. Create new directory structure
2. Move components preserving exports via index.ts
3. Update imports using path aliases
4. Add component tests alongside each component

---

## 2. State Management Strategy

### Current State Issues

**Identified Problems:**
- No global state management visible
- Likely prop drilling through component tree
- Multiple data fetching points without coordination
- SSE subscription state scattered across hooks

### Recommendation: **Zustand** with Feature Stores

**Why Zustand over alternatives:**
- ✅ Minimal boilerplate (vs Redux Toolkit)
- ✅ No Context Provider wrapper needed
- ✅ Built-in DevTools support
- ✅ Excellent TypeScript support
- ✅ Selective subscription (avoid re-renders)
- ✅ Simple async actions
- ✅ 3.5KB gzipped (vs 43KB Redux)

**Architecture:**

```typescript
// src/ui/store/index.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createServersSlice } from './slices/servers'
import { createToolsSlice } from './slices/tools'
import { createConfigSlice } from './slices/config'
import { createUISlice } from './slices/ui'

export const useStore = create(
  devtools(
    (...a) => ({
      ...createServersSlice(...a),
      ...createToolsSlice(...a),
      ...createConfigSlice(...a),
      ...createUISlice(...a),
    }),
    { name: 'MCPHubStore' }
  )
)

// Feature-specific selectors
export const useServers = () => useStore(state => state.servers)
export const useTools = () => useStore(state => state.tools)
export const useConfig = () => useStore(state => state.config)
```

**Example Store Slice:**

```typescript
// src/ui/store/slices/servers.ts
import { StateCreator } from 'zustand'
import * as serversAPI from '@api/servers'

export interface ServersSlice {
  servers: Record<string, ServerInfo>
  loading: boolean
  error: string | null

  fetchServers: () => Promise<void>
  restartServer: (name: string) => Promise<void>
  updateServer: (name: string, config: ServerConfig) => Promise<void>
}

export const createServersSlice: StateCreator<ServersSlice> = (set, get) => ({
  servers: {},
  loading: false,
  error: null,

  fetchServers: async () => {
    set({ loading: true, error: null })
    try {
      const data = await serversAPI.list()
      set({ servers: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  restartServer: async (name: string) => {
    await serversAPI.restart(name)
    // Optimistic update
    set(state => ({
      servers: {
        ...state.servers,
        [name]: { ...state.servers[name], status: 'restarting' }
      }
    }))
  },

  updateServer: async (name: string, config: ServerConfig) => {
    await serversAPI.update(name, config)
    await get().fetchServers() // Refetch for consistency
  }
})
```

**UI Slice for Global UI State:**

```typescript
// src/ui/store/slices/ui.ts
export interface UISlice {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' }

  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  showSnackbar: (message: string, severity: 'success' | 'error' | 'info') => void
  hideSnackbar: () => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  theme: 'light',
  snackbar: { open: false, message: '', severity: 'info' },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  showSnackbar: (message, severity) => set({ snackbar: { open: true, message, severity } }),
  hideSnackbar: () => set(state => ({ snackbar: { ...state.snackbar, open: false } }))
})
```

**Usage in Components:**

```typescript
// Before (prop drilling)
<ServersTable
  servers={servers}
  onRestart={handleRestart}
  loading={loading}
/>

// After (Zustand)
import { useStore } from '@ui/store'

function ServersTable() {
  // Selective subscription - only re-render when servers change
  const servers = useStore(state => state.servers)
  const restartServer = useStore(state => state.restartServer)
  const loading = useStore(state => state.loading)

  return (
    <Table>
      {Object.entries(servers).map(([name, server]) => (
        <ServerRow
          key={name}
          server={server}
          onRestart={() => restartServer(name)}
        />
      ))}
    </Table>
  )
}
```

---

## 3. Data Fetching Strategy

### Current Issues
- Manual polling with `usePolling` hook
- No request deduplication
- No background refetching
- No stale-while-revalidate
- Manual cache invalidation

### Recommendation: **TanStack Query (React Query)** + Zustand

**Why React Query:**
- ✅ Automatic caching and invalidation
- ✅ Background refetching
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Integrated with SSE for real-time sync
- ✅ DevTools for debugging
- ✅ Perfect for server state management

**Architecture:**

```typescript
// src/ui/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds
      gcTime: 5 * 60 * 1000,    // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**Query Hooks:**

```typescript
// src/ui/api/queries/servers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as serversAPI from '@api/servers'

// Query keys for cache management
export const serverKeys = {
  all: ['servers'] as const,
  lists: () => [...serverKeys.all, 'list'] as const,
  list: (filters: string) => [...serverKeys.lists(), { filters }] as const,
  details: () => [...serverKeys.all, 'detail'] as const,
  detail: (name: string) => [...serverKeys.details(), name] as const,
}

// List all servers
export function useServers() {
  return useQuery({
    queryKey: serverKeys.lists(),
    queryFn: serversAPI.list,
    staleTime: 60_000, // 1 minute
  })
}

// Get server details
export function useServer(name: string) {
  return useQuery({
    queryKey: serverKeys.detail(name),
    queryFn: () => serversAPI.get(name),
    enabled: !!name, // Only fetch if name provided
  })
}

// Restart server mutation
export function useRestartServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => serversAPI.restart(name),
    onMutate: async (name) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: serverKeys.detail(name) })

      const previous = queryClient.getQueryData(serverKeys.detail(name))

      queryClient.setQueryData(serverKeys.detail(name), (old: ServerInfo) => ({
        ...old,
        status: 'restarting'
      }))

      return { previous }
    },
    onError: (err, name, context) => {
      // Rollback on error
      queryClient.setQueryData(serverKeys.detail(name), context.previous)
    },
    onSettled: (data, error, name) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(name) })
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() })
    },
  })
}

// Update server config mutation
export function useUpdateServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, config }: { name: string; config: ServerConfig }) =>
      serversAPI.update(name, config),
    onSuccess: () => {
      // Invalidate all server queries
      queryClient.invalidateQueries({ queryKey: serverKeys.all })
    },
  })
}
```

**Component Usage:**

```typescript
// src/ui/pages/ServersPage.tsx
import { useServers, useRestartServer } from '@api/queries/servers'
import { useSnackbar } from '@hooks/useSnackbar'

function ServersPage() {
  const { data: servers, isLoading, error, refetch } = useServers()
  const restartServer = useRestartServer()
  const { showSnackbar } = useSnackbar()

  const handleRestart = async (name: string) => {
    try {
      await restartServer.mutateAsync(name)
      showSnackbar(`Server ${name} restarted successfully`, 'success')
    } catch (error) {
      showSnackbar(`Failed to restart ${name}: ${error.message}`, 'error')
    }
  }

  if (isLoading) return <CircularProgress />
  if (error) return <ErrorAlert error={error} onRetry={refetch} />

  return <ServersTable servers={servers} onRestart={handleRestart} />
}
```

**Integration with SSE:**

```typescript
// src/ui/hooks/useSSESync.ts
import { useQueryClient } from '@tanstack/react-query'
import { useSSESubscription } from './useSSESubscription'
import { serverKeys } from '@api/queries/servers'

export function useSSESync() {
  const queryClient = useQueryClient()

  useSSESubscription('servers_changed', () => {
    // Invalidate all server queries when SSE event received
    queryClient.invalidateQueries({ queryKey: serverKeys.all })
  })

  useSSESubscription('tools_changed', () => {
    queryClient.invalidateQueries({ queryKey: ['tools'] })
  })

  useSSESubscription('config_changed', () => {
    queryClient.invalidateQueries({ queryKey: ['config'] })
  })

  useSSESubscription('hub_state', (data) => {
    // Update specific query data directly
    queryClient.setQueryData(['hub', 'state'], data)
  })
}
```

**App-Level Integration:**

```typescript
// src/ui/App.tsx
import { QueryProvider } from './providers/QueryProvider'
import { useSSESync } from '@hooks/useSSESync'

function AppContent() {
  useSSESync() // Enable SSE-driven cache invalidation

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/servers" element={<ServersPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/config" element={<ConfigPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  )
}
```

---

## 4. Real-Time Updates Integration

### Current State
- `useSSESubscription` hook exists
- Manual subscription management per component
- Potential memory leaks if cleanup not handled

### Recommendations

**A. Centralized SSE Manager Hook**

```typescript
// src/ui/hooks/useSSEManager.ts
import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type SSEHandler = (data: any) => void

class SSEManager {
  private eventSource: EventSource | null = null
  private handlers = new Map<string, Set<SSEHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    if (this.eventSource) return

    this.eventSource = new EventSource('/api/events')

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected')
      this.reconnectAttempts = 0
    }

    this.eventSource.onerror = () => {
      console.error('[SSE] Connection error')
      this.eventSource?.close()
      this.eventSource = null

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
      }
    }

    // Register generic message handler
    this.eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        this.emit(type, data)
      } catch (error) {
        console.error('[SSE] Parse error:', error)
      }
    }
  }

  subscribe(eventType: string, handler: SSEHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    return () => this.unsubscribe(eventType, handler)
  }

  unsubscribe(eventType: string, handler: SSEHandler) {
    this.handlers.get(eventType)?.delete(handler)
  }

  emit(eventType: string, data: any) {
    this.handlers.get(eventType)?.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[SSE] Handler error for ${eventType}:`, error)
      }
    })
  }

  disconnect() {
    this.eventSource?.close()
    this.eventSource = null
    this.handlers.clear()
  }
}

// Singleton instance
const sseManager = new SSEManager()

export function useSSEManager() {
  useEffect(() => {
    sseManager.connect()
    return () => sseManager.disconnect()
  }, [])

  return sseManager
}

// Convenience hook for specific events
export function useSSEEvent(eventType: string, handler: SSEHandler) {
  const managerRef = useRef(sseManager)

  useEffect(() => {
    const unsubscribe = managerRef.current.subscribe(eventType, handler)
    return unsubscribe
  }, [eventType, handler])
}
```

**B. React Query Integration**

```typescript
// src/ui/hooks/useRealtimeSync.ts
import { useQueryClient } from '@tanstack/react-query'
import { useSSEEvent, useSSEManager } from './useSSEManager'
import { serverKeys } from '@api/queries/servers'
import { toolKeys } from '@api/queries/tools'
import { configKeys } from '@api/queries/config'

export function useRealtimeSync() {
  const queryClient = useQueryClient()

  // Initialize SSE connection
  useSSEManager()

  // Server state changes
  useSSEEvent('servers_changed', () => {
    queryClient.invalidateQueries({ queryKey: serverKeys.all })
  })

  // Tool list changes
  useSSEEvent('tools_changed', () => {
    queryClient.invalidateQueries({ queryKey: toolKeys.all })
  })

  // Config changes
  useSSEEvent('config_changed', () => {
    queryClient.invalidateQueries({ queryKey: configKeys.all })
  })

  // Hub state updates (direct cache update)
  useSSEEvent('hub_state', (state) => {
    queryClient.setQueryData(['hub', 'state'], state)
  })

  // Log events (append to logs array)
  useSSEEvent('log', (logEntry) => {
    queryClient.setQueryData(['logs'], (old: LogEntry[] = []) => [
      ...old.slice(-999), // Keep last 1000 entries
      logEntry
    ])
  })
}
```

**C. Optimistic Updates with SSE Confirmation**

```typescript
// src/ui/api/queries/servers.ts
export function useRestartServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => serversAPI.restart(name),

    // Immediate optimistic update
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: serverKeys.detail(name) })

      const previous = queryClient.getQueryData(serverKeys.detail(name))

      queryClient.setQueryData(serverKeys.detail(name), (old: ServerInfo) => ({
        ...old,
        status: 'restarting',
        lastRestart: Date.now()
      }))

      return { previous }
    },

    // API confirms action
    onSuccess: (data, name) => {
      // Don't invalidate yet - wait for SSE confirmation
      // SSE 'servers_changed' event will trigger invalidation
    },

    // Rollback on API error
    onError: (err, name, context) => {
      queryClient.setQueryData(serverKeys.detail(name), context.previous)
    },
  })
}
```

---

## 5. Type Safety Improvements

### Current Issues
- API response types likely not validated at runtime
- No schema validation for server responses
- Potential type mismatches between API and UI

### Recommendations

**A. Runtime Type Validation with Zod**

```bash
bun add zod
```

**Schema Definitions:**

```typescript
// src/ui/api/schemas/server.ts
import { z } from 'zod'

export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'unauthorized',
  'disabled'
])

export const ServerTransportSchema = z.enum(['stdio', 'sse', 'streamable-http'])

export const ServerInfoSchema = z.object({
  name: z.string(),
  status: ServerStatusSchema,
  transport: ServerTransportSchema,
  toolCount: z.number(),
  resourceCount: z.number(),
  promptCount: z.number(),
  uptime: z.number().optional(),
  lastError: z.string().optional(),
  capabilities: z.object({
    tools: z.boolean(),
    resources: z.boolean(),
    prompts: z.boolean(),
  }).optional(),
})

export const ServerListResponseSchema = z.record(ServerInfoSchema)

// Export TypeScript types
export type ServerStatus = z.infer<typeof ServerStatusSchema>
export type ServerTransport = z.infer<typeof ServerTransportSchema>
export type ServerInfo = z.infer<typeof ServerInfoSchema>
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>
```

**API Client with Validation:**

```typescript
// src/ui/api/client.ts
import { z } from 'zod'

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  schema?: z.ZodSchema<T>
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()

  // Runtime validation if schema provided
  if (schema) {
    const result = schema.safeParse(data)
    if (!result.success) {
      console.error('[API] Validation error:', result.error.format())
      throw new ValidationError(
        `Invalid API response for ${endpoint}`,
        result.error
      )
    }
    return result.data
  }

  return data
}
```

**Typed API Functions:**

```typescript
// src/ui/api/servers.ts
import { request } from './client'
import { ServerListResponseSchema, ServerInfoSchema, type ServerInfo } from './schemas/server'

export async function list(): Promise<Record<string, ServerInfo>> {
  return request('/servers', {}, ServerListResponseSchema)
}

export async function get(name: string): Promise<ServerInfo> {
  return request(`/servers/${name}`, {}, ServerInfoSchema)
}

export async function restart(name: string): Promise<void> {
  await request(`/servers/${name}/restart`, { method: 'POST' })
}
```

**B. Form Validation with React Hook Form + Zod**

```bash
bun add react-hook-form @hookform/resolvers
```

```typescript
// src/ui/components/forms/ServerConfigForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const serverConfigSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  disabled: z.boolean().default(false),
})

type ServerConfigFormData = z.infer<typeof serverConfigSchema>

export function ServerConfigForm({ onSubmit, defaultValues }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ServerConfigFormData>({
    resolver: zodResolver(serverConfigSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        {...register('command')}
        label="Command"
        error={!!errors.command}
        helperText={errors.command?.message}
      />

      <TextField
        {...register('cwd')}
        label="Working Directory"
        error={!!errors.cwd}
        helperText={errors.cwd?.message}
      />

      <FormControlLabel
        control={<Checkbox {...register('disabled')} />}
        label="Disabled"
      />

      <Button type="submit">Save</Button>
    </form>
  )
}
```

**C. Type-Safe API Contracts**

```typescript
// src/ui/api/types.ts - Shared types between frontend and backend

// Import backend types if possible
// Or define shared contract types

export interface APIResponse<T> {
  data: T
  timestamp: string
  success: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface APIError {
  message: string
  code: string
  details?: Record<string, any>
}
```

---

## 6. Error Handling & User Feedback

### Current Issues
- Ad-hoc error handling across components
- Inconsistent user feedback patterns
- No global error boundary

### Recommendations

**A. Global Error Boundary**

```typescript
// src/ui/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Container, Typography } from '@mui/material'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    // Send to error tracking service (Sentry, etc.)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset)
      }

      return (
        <Container sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Something went wrong</Typography>
            <Typography variant="body2">{this.state.error?.message}</Typography>
          </Alert>
          <Button onClick={this.reset} variant="contained">
            Try Again
          </Button>
        </Container>
      )
    }

    return this.props.children
  }
}
```

**B. Centralized Toast/Snackbar System**

```typescript
// src/ui/providers/SnackbarProvider.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const SnackbarContext = createContext<SnackbarContextType | null>(null)

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<AlertColor>('info')

  const showSnackbar = useCallback((msg: string, sev: AlertColor = 'info') => {
    setMessage(msg)
    setSeverity(sev)
    setOpen(true)
  }, [])

  const showSuccess = useCallback((msg: string) => showSnackbar(msg, 'success'), [showSnackbar])
  const showError = useCallback((msg: string) => showSnackbar(msg, 'error'), [showSnackbar])
  const showWarning = useCallback((msg: string) => showSnackbar(msg, 'warning'), [showSnackbar])
  const showInfo = useCallback((msg: string) => showSnackbar(msg, 'info'), [showSnackbar])

  return (
    <SnackbarContext.Provider value={{
      showSnackbar,
      showSuccess,
      showError,
      showWarning,
      showInfo
    }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setOpen(false)} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  )
}

export function useSnackbar() {
  const context = useContext(SnackbarContext)
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider')
  }
  return context
}
```

**C. React Query Error Handling**

```typescript
// src/ui/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSnackbar } from './SnackbarProvider'

function createQueryClient(showError: (msg: string) => void) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('HTTP 4')) {
            return false
          }
          return failureCount < 2
        },
        onError: (error: Error) => {
          console.error('[Query Error]', error)
          showError(error.message)
        },
      },
      mutations: {
        onError: (error: Error) => {
          console.error('[Mutation Error]', error)
          showError(error.message)
        },
      },
    },
  })
}

export function QueryProvider({ children }) {
  const { showError } = useSnackbar()
  const queryClient = createQueryClient(showError)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**D. Graceful Degradation Components**

```typescript
// src/ui/components/QueryErrorAlert.tsx
import { Alert, Button } from '@mui/material'

interface Props {
  error: Error
  onRetry?: () => void
  message?: string
}

export function QueryErrorAlert({ error, onRetry, message }: Props) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message || error.message}
    </Alert>
  )
}

// Usage in components
function ServersPage() {
  const { data, error, isLoading, refetch } = useServers()

  if (error) {
    return <QueryErrorAlert error={error} onRetry={refetch} />
  }

  // ... rest of component
}
```

---

## 7. Performance Optimization

### Recommendations

**A. Code Splitting & Lazy Loading**

```typescript
// src/ui/App.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'

// Lazy load pages
const DashboardPage = lazy(() => import('@pages/DashboardPage'))
const ServersPage = lazy(() => import('@pages/ServersPage'))
const ToolsPage = lazy(() => import('@pages/ToolsPage'))
const ConfigPage = lazy(() => import('@pages/ConfigPage'))

function LoadingFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/servers" element={<ServersPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

**B. Component Memoization**

```typescript
// src/ui/components/organisms/ServersTable/ServerRow.tsx
import { memo } from 'react'
import { TableRow, TableCell, Button } from '@mui/material'

interface Props {
  server: ServerInfo
  onRestart: (name: string) => void
}

// Memoize to prevent re-renders when sibling rows change
export const ServerRow = memo(function ServerRow({ server, onRestart }: Props) {
  return (
    <TableRow>
      <TableCell>{server.name}</TableCell>
      <TableCell>{server.status}</TableCell>
      <TableCell>{server.toolCount}</TableCell>
      <TableCell>
        <Button onClick={() => onRestart(server.name)}>
          Restart
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if server data changed
  return (
    prevProps.server.name === nextProps.server.name &&
    prevProps.server.status === nextProps.server.status &&
    prevProps.server.toolCount === nextProps.server.toolCount
  )
})
```

**C. Virtualized Lists for Large Datasets**

```bash
bun add @tanstack/react-virtual
```

```typescript
// src/ui/components/organisms/ToolsTable/VirtualizedToolsTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { Box, Paper } from '@mui/material'

interface Props {
  tools: ToolInfo[]
}

export function VirtualizedToolsTable({ tools }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Row height in pixels
    overscan: 5, // Render 5 extra items above/below viewport
  })

  return (
    <Paper ref={parentRef} sx={{ height: '600px', overflow: 'auto' }}>
      <Box sx={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const tool = tools[virtualRow.index]
          return (
            <Box
              key={virtualRow.key}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ToolRow tool={tool} />
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
```

**D. React Query Optimizations**

```typescript
// src/ui/api/queries/servers.ts

// Prefetch data on hover
export function usePrefetchServer() {
  const queryClient = useQueryClient()

  return (name: string) => {
    queryClient.prefetchQuery({
      queryKey: serverKeys.detail(name),
      queryFn: () => serversAPI.get(name),
      staleTime: 60_000,
    })
  }
}

// Component usage
function ServerRow({ server }) {
  const prefetchServer = usePrefetchServer()

  return (
    <TableRow
      onMouseEnter={() => prefetchServer(server.name)}
      onClick={() => navigate(`/servers/${server.name}`)}
    >
      {/* ... */}
    </TableRow>
  )
}

// Selective field updates
export function useUpdateServerStatus(name: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: ServerStatus) => serversAPI.updateStatus(name, status),
    onSuccess: (data, status) => {
      // Update only status field, don't refetch entire object
      queryClient.setQueryData(serverKeys.detail(name), (old: ServerInfo) => ({
        ...old,
        status,
      }))
    },
  })
}
```

**E. Bundle Analysis & Optimization**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'], // If using charts
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

---

## 8. Testing Strategy

### Recommendations

**A. Testing Pyramid**

```
          /\
         /E2E\       (5-10% - Critical user journeys)
        /------\
       /Integration\ (20-30% - Component interactions)
      /------------\
     /   Unit Tests  \ (60-75% - Hooks, utilities, pure functions)
    /----------------\
```

**B. Vitest Configuration**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/ui/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/ui/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, './src/ui'),
      '@api': path.resolve(__dirname, './src/ui/api'),
      '@components': path.resolve(__dirname, './src/ui/components'),
      '@pages': path.resolve(__dirname, './src/ui/pages'),
      '@hooks': path.resolve(__dirname, './src/ui/hooks'),
      '@theme': path.resolve(__dirname, './src/ui/theme'),
    },
  },
})
```

**C. Test Setup**

```typescript
// src/ui/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock EventSource
global.EventSource = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
}))
```

**D. Test Utilities**

```typescript
// src/ui/test/utils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { SnackbarProvider } from '@ui/providers/SnackbarProvider'

// Create fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })
}

interface CustomRenderOptions extends RenderOptions {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SnackbarProvider>
            {children}
          </SnackbarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { renderWithProviders as render }
```

**E. Unit Test Example (Hooks)**

```typescript
// src/ui/hooks/useServers.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useServers } from '@api/queries/servers'
import * as serversAPI from '@api/servers'

vi.mock('@api/servers')

describe('useServers', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  it('should fetch servers successfully', async () => {
    const mockServers = {
      'filesystem': { name: 'filesystem', status: 'connected', toolCount: 5 },
      'github': { name: 'github', status: 'connected', toolCount: 10 },
    }

    vi.mocked(serversAPI.list).mockResolvedValue(mockServers)

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useServers(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockServers)
    expect(serversAPI.list).toHaveBeenCalledOnce()
  })

  it('should handle errors gracefully', async () => {
    const mockError = new Error('API Error')
    vi.mocked(serversAPI.list).mockRejectedValue(mockError)

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useServers(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })
})
```

**F. Integration Test Example (Components)**

```typescript
// src/ui/pages/ServersPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@ui/test/utils'
import { ServersPage } from './ServersPage'
import * as serversAPI from '@api/servers'

vi.mock('@api/servers')

describe('ServersPage', () => {
  const mockServers = {
    'filesystem': {
      name: 'filesystem',
      status: 'connected',
      transport: 'stdio',
      toolCount: 5,
      resourceCount: 2,
      promptCount: 0,
    },
    'github': {
      name: 'github',
      status: 'disconnected',
      transport: 'sse',
      toolCount: 10,
      resourceCount: 0,
      promptCount: 3,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render servers table', async () => {
    vi.mocked(serversAPI.list).mockResolvedValue(mockServers)

    render(<ServersPage />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    // Check if servers are displayed
    expect(screen.getByText('filesystem')).toBeInTheDocument()
    expect(screen.getByText('github')).toBeInTheDocument()
    expect(screen.getByText('connected')).toBeInTheDocument()
    expect(screen.getByText('disconnected')).toBeInTheDocument()
  })

  it('should restart server on button click', async () => {
    vi.mocked(serversAPI.list).mockResolvedValue(mockServers)
    vi.mocked(serversAPI.restart).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<ServersPage />)

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    // Find and click restart button for filesystem server
    const restartButtons = screen.getAllByRole('button', { name: /restart/i })
    await user.click(restartButtons[0])

    // Verify API call
    expect(serversAPI.restart).toHaveBeenCalledWith('filesystem')

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/restarted successfully/i)).toBeInTheDocument()
    })
  })

  it('should display error on fetch failure', async () => {
    const mockError = new Error('Failed to fetch servers')
    vi.mocked(serversAPI.list).mockRejectedValue(mockError)

    render(<ServersPage />)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch servers/i)).toBeInTheDocument()
    })
  })
})
```

**G. E2E Test Example (Playwright)**

```bash
bun add -D @playwright/test
```

```typescript
// tests/e2e/servers.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Servers Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/servers')
  })

  test('should display servers list', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table')

    // Check for filesystem server
    await expect(page.locator('text=filesystem')).toBeVisible()
    await expect(page.locator('text=connected')).toBeVisible()
  })

  test('should restart server', async ({ page }) => {
    // Click restart button for first server
    await page.click('button:has-text("Restart"):first')

    // Check for success notification
    await expect(page.locator('text=restarted successfully')).toBeVisible()

    // Verify server status changed to "restarting"
    await expect(page.locator('text=restarting')).toBeVisible()
  })

  test('should navigate to server details', async ({ page }) => {
    // Click on server name
    await page.click('text=filesystem')

    // Verify navigation to details page
    await expect(page).toHaveURL(/\/servers\/filesystem/)

    // Check for details content
    await expect(page.locator('h1:has-text("filesystem")')).toBeVisible()
  })
})
```

**H. Testing Scripts**

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 9. Accessibility (a11y) Considerations

### Recommendations

**A. Semantic HTML & ARIA**

```typescript
// src/ui/components/organisms/ServersTable/ServersTable.tsx
import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

export function ServersTable({ servers, onRestart }) {
  return (
    <Table aria-label="MCP Servers">
      <TableHead>
        <TableRow>
          <TableCell>Server Name</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Transport</TableCell>
          <TableCell>Tools</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(servers).map(([name, server]) => (
          <TableRow key={name}>
            <TableCell>{name}</TableCell>
            <TableCell>
              <StatusBadge status={server.status} aria-label={`Status: ${server.status}`} />
            </TableCell>
            <TableCell>{server.transport}</TableCell>
            <TableCell>{server.toolCount}</TableCell>
            <TableCell>
              <Button
                onClick={() => onRestart(name)}
                aria-label={`Restart ${name} server`}
              >
                Restart
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**B. Keyboard Navigation**

```typescript
// src/ui/components/molecules/ServerCard.tsx
import { Card, CardContent, CardActions, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export function ServerCard({ server }) {
  const navigate = useNavigate()

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(`/servers/${server.name}`)
    }
  }

  return (
    <Card
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => navigate(`/servers/${server.name}`)}
      sx={{
        cursor: 'pointer',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
      role="button"
      aria-label={`View ${server.name} details`}
    >
      <CardContent>
        <Typography variant="h6">{server.name}</Typography>
        <Typography color="textSecondary">{server.status}</Typography>
      </CardContent>
    </Card>
  )
}
```

**C. Focus Management**

```typescript
// src/ui/components/organisms/Modal/ConfirmDialog.tsx
import { useRef, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'

export function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent id="confirm-dialog-description">
        {message}
      </DialogContent>
      <DialogActions>
        <Button ref={cancelButtonRef} onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

**D. Screen Reader Support**

```typescript
// src/ui/components/atoms/LoadingSpinner.tsx
import { CircularProgress, Box } from '@mui/material'

export function LoadingSpinner({ size = 40, label = 'Loading...' }) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={size} aria-label={label} />
      <span className="sr-only">{label}</span>
    </Box>
  )
}

// Global styles for screen reader only content
// src/ui/theme/global.css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**E. Color Contrast & Theme**

```typescript
// src/ui/theme/index.ts
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // WCAG AA compliant
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      contrastText: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // Ensure minimum touch target size (48x48px)
          minHeight: '48px',
          minWidth: '48px',
        },
      },
    },
  },
})
```

**F. Accessibility Testing**

```bash
bun add -D @axe-core/react
```

```typescript
// src/ui/main.tsx (development only)
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000)
  })
}
```

---

## 10. Build Optimization & Deployment

### Recommendations

**A. Production Build Configuration**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react({
      // Use React's automatic JSX runtime
      jsxRuntime: 'automatic',
      // Enable Fast Refresh
      fastRefresh: true,
    }),

    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),

    // Brotli compression (better than gzip)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // Bundle analysis
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  build: {
    // Target modern browsers
    target: 'es2020',

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },

    // Source maps for debugging
    sourcemap: true,

    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff|woff2/.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },

        // JS chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Path aliases
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, './src/ui'),
      '@api': path.resolve(__dirname, './src/ui/api'),
      '@components': path.resolve(__dirname, './src/ui/components'),
      '@pages': path.resolve(__dirname, './src/ui/pages'),
      '@hooks': path.resolve(__dirname, './src/ui/hooks'),
      '@theme': path.resolve(__dirname, './src/ui/theme'),
    },
  },
})
```

**B. Environment Variables**

```typescript
// src/ui/config/env.ts
interface Env {
  API_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
  ENABLE_DEVTOOLS: boolean
}

export const env: Env = {
  API_URL: import.meta.env.VITE_API_URL || '/api',
  NODE_ENV: import.meta.env.MODE as Env['NODE_ENV'],
  ENABLE_DEVTOOLS: import.meta.env.DEV,
}

// Validate required env vars at build time
const requiredEnvVars = ['VITE_API_URL']
requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key] && import.meta.env.PROD) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})
```

```bash
# .env.production
VITE_API_URL=/api
```

**C. Docker Build**

```dockerfile
# Dockerfile.ui
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Production image
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Brotli compression (if module available)
    brotli on;
    brotli_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://mcp-hub-backend:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE proxy
    location /api/events {
        proxy_pass http://mcp-hub-backend:7000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**D. CI/CD Pipeline**

```yaml
# .github/workflows/ui.yml
name: UI Build & Test

on:
  push:
    branches: [main]
    paths:
      - 'src/ui/**'
      - 'package.json'
      - 'vite.config.ts'
  pull_request:
    branches: [main]
    paths:
      - 'src/ui/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run type-check

      - name: Lint
        run: bun run lint

      - name: Unit tests
        run: bun run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Analyze bundle
        run: ls -lh dist/assets

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright
        run: bunx playwright install --with-deps

      - name: Download build
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Run E2E tests
        run: bun run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Summary & Migration Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ Install dependencies: Zustand, TanStack Query, Zod, React Hook Form
2. ✅ Set up test infrastructure: Vitest, Testing Library, Playwright
3. ✅ Create atomic design directory structure
4. ✅ Implement global providers (Query, Snackbar, ErrorBoundary)

### Phase 2: State Management (Week 3-4)
1. ✅ Create Zustand store slices (servers, tools, config, UI)
2. ✅ Implement React Query hooks for all API endpoints
3. ✅ Integrate SSE with React Query cache invalidation
4. ✅ Add Zod schemas for API validation

### Phase 3: Component Migration (Week 5-6)
1. ✅ Reorganize components into atomic structure
2. ✅ Refactor pages to use new hooks and state
3. ✅ Add error boundaries and loading states
4. ✅ Implement accessibility improvements

### Phase 4: Testing & Optimization (Week 7-8)
1. ✅ Write unit tests for hooks and utilities
2. ✅ Write integration tests for components
3. ✅ Write E2E tests for critical flows
4. ✅ Optimize bundle with code splitting and lazy loading
5. ✅ Configure production build with compression

### Phase 5: Polish & Deploy (Week 9-10)
1. ✅ Accessibility audit and fixes
2. ✅ Performance testing and optimization
3. ✅ CI/CD pipeline setup
4. ✅ Documentation and deployment guide

---

## Key Metrics to Track

### Performance
- ⚡ First Contentful Paint (FCP) < 1.5s
- ⚡ Largest Contentful Paint (LCP) < 2.5s
- ⚡ Time to Interactive (TTI) < 3.5s
- ⚡ Bundle size < 500KB (gzipped)

### Quality
- ✅ Test coverage > 80%
- ✅ TypeScript strict mode enabled
- ✅ Zero accessibility violations (axe-core)
- ✅ Lighthouse score > 90

### Developer Experience
- 🚀 Hot reload < 100ms
- 🚀 Build time < 30s
- 🚀 Test execution < 10s
- 🚀 Type checking < 5s
