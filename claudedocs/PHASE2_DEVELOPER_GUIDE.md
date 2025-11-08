# Phase 2: React Query Hooks - Developer Guide

## Quick Start

### Using Query Hooks (Read Operations)

```typescript
import { useServers } from '@ui/api/hooks';

function ServersList() {
  const { data, isLoading, error } = useServers();

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <ul>
      {data.servers.map((server) => (
        <li key={server.name}>{server.displayName}</li>
      ))}
    </ul>
  );
}
```

### Using Mutation Hooks (Write Operations)

```typescript
import { useStartServer } from '@ui/api/mutations';
import { useSnackbar } from '@ui/hooks/useSnackbar';

function ServerControls({ serverName }: { serverName: string }) {
  const startServerMutation = useStartServer();
  const { showSnackbar } = useSnackbar();

  const handleStart = () => {
    startServerMutation.mutate(serverName, {
      onSuccess: () => {
        showSnackbar(`${serverName} started successfully`, 'success');
      },
      onError: (error) => {
        showSnackbar(`Failed to start ${serverName}: ${error.message}`, 'error');
      },
    });
  };

  return (
    <button
      onClick={handleStart}
      disabled={startServerMutation.isPending}
    >
      {startServerMutation.isPending ? 'Starting...' : 'Start Server'}
    </button>
  );
}
```

---

## Available Hooks

### Query Hooks (GET Operations)

| Hook | Purpose | SSE Invalidation |
|------|---------|------------------|
| `useHealth()` | Hub health and state | `hub_state`, `notification` |
| `useServers()` | All server statuses | `servers_updated`, `notification` |
| `useConfig()` | Hub configuration | `config_changed` |
| `useFilteringStats()` | Tool filtering statistics | `tool_list_changed` |
| `useTools()` | All available tools | `tool_list_changed` |
| `useMarketplace(params)` | Marketplace catalog | None (static data) |

### Mutation Hooks (POST/PUT Operations)

| Hook | Purpose | Optimistic Update |
|------|---------|-------------------|
| `useStartServer()` | Start MCP server | Status → 'connecting' |
| `useStopServer()` | Stop MCP server | Status → 'disconnecting' |
| `useSaveConfig()` | Save hub config | Config preview |
| `useUpdateFilteringMode()` | Change filtering mode | Mode value |
| `useToggleFiltering()` | Enable/disable filtering | Enabled flag |

---

## Common Patterns

### Pattern 1: Simple Data Display

**Use Case:** Display read-only data from API

```typescript
import { useServers } from '@ui/api/hooks';

function ServerCount() {
  const { data, isLoading } = useServers();

  if (isLoading) return <Skeleton width={100} />;

  return (
    <Typography>
      Active Servers: {data.servers.filter(s => s.status === 'connected').length}
    </Typography>
  );
}
```

### Pattern 2: Data Display with Error Handling

**Use Case:** Show error state to user

```typescript
import { useHealth } from '@ui/api/hooks';
import { Alert, CircularProgress } from '@mui/material';

function HubStatus() {
  const { data, isLoading, error, refetch } = useHealth();

  if (isLoading) return <CircularProgress />;

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <button onClick={() => refetch()}>Retry</button>
        }
      >
        Failed to load hub status: {error.message}
      </Alert>
    );
  }

  return <div>Hub State: {data.state}</div>;
}
```

### Pattern 3: Mutation with Optimistic UI

**Use Case:** Instant UI feedback, rollback on error

```typescript
import { useStopServer } from '@ui/api/mutations';

function ServerStopButton({ serverName }: { serverName: string }) {
  const stopServerMutation = useStopServer();

  const handleStop = (disable = false) => {
    stopServerMutation.mutate(
      { serverName, disable },
      {
        onSuccess: () => {
          toast.success(`${serverName} stopped`);
        },
        onError: (error) => {
          // Automatic rollback via React Query
          toast.error(`Stop failed: ${error.message}`);
        },
      }
    );
  };

  return (
    <>
      <button
        onClick={() => handleStop(false)}
        disabled={stopServerMutation.isPending}
      >
        Stop
      </button>
      <button
        onClick={() => handleStop(true)}
        disabled={stopServerMutation.isPending}
      >
        Stop & Disable
      </button>
    </>
  );
}
```

### Pattern 4: Dependent Queries

**Use Case:** Fetch data based on other query results

```typescript
import { useServers, useConfig } from '@ui/api/hooks';

function ServerConfigPanel() {
  const { data: servers } = useServers();
  const { data: config } = useConfig({
    // Only fetch config if servers loaded successfully
    enabled: !!servers,
  });

  if (!servers || !config) return <CircularProgress />;

  return (
    <div>
      {/* Show config for each server */}
      {servers.servers.map((server) => (
        <div key={server.name}>
          <h3>{server.displayName}</h3>
          <pre>{JSON.stringify(config.config.mcpServers[server.name], null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 5: Manual Refetch

**Use Case:** Refresh button to fetch latest data

```typescript
import { useServers } from '@ui/api/hooks';
import RefreshIcon from '@mui/icons-material/Refresh';

function ServersPageHeader() {
  const { refetch, isFetching } = useServers();

  return (
    <Box display="flex" alignItems="center">
      <Typography variant="h4">Servers</Typography>
      <IconButton
        onClick={() => refetch()}
        disabled={isFetching}
      >
        <RefreshIcon />
      </IconButton>
    </Box>
  );
}
```

### Pattern 6: Polling (When SSE Not Available)

**Use Case:** Fallback polling for environments without SSE

```typescript
import { useHealth } from '@ui/api/hooks';

function HubStatusPolling() {
  const { data } = useHealth({
    refetchInterval: 30_000, // Poll every 30s
    refetchIntervalInBackground: false, // Stop polling when window inactive
  });

  return <div>State: {data?.state}</div>;
}
```

### Pattern 7: SSE Event Subscription

**Use Case:** React to real-time events beyond cache invalidation

```typescript
import { useSSESubscription } from '@ui/hooks/useSSESubscription';
import { useSnackbar } from '@ui/hooks/useSnackbar';

function ServerAlerts() {
  const { showSnackbar } = useSnackbar();

  useSSESubscription('servers_updated', (data) => {
    const { serverName, status } = data;

    if (status === 'disconnected') {
      showSnackbar(`Server ${serverName} disconnected`, 'error');
    } else if (status === 'connected') {
      showSnackbar(`Server ${serverName} connected`, 'success');
    }
  });

  return null; // No UI, just side effects
}
```

### Pattern 8: Conditional Mutations

**Use Case:** Disable mutation based on state

```typescript
import { useStartServer } from '@ui/api/mutations';
import { useServers } from '@ui/api/hooks';

function ConditionalServerStart({ serverName }: { serverName: string }) {
  const { data: servers } = useServers();
  const startServerMutation = useStartServer();

  const server = servers?.servers.find((s) => s.name === serverName);
  const canStart = server?.status === 'disconnected';

  return (
    <button
      onClick={() => startServerMutation.mutate(serverName)}
      disabled={!canStart || startServerMutation.isPending}
    >
      {canStart ? 'Start Server' : 'Already Running'}
    </button>
  );
}
```

### Pattern 9: Custom Query Options

**Use Case:** Override default query behavior

```typescript
import { useMarketplace } from '@ui/api/hooks';

function MarketplaceCatalog() {
  const params = useMemo(() => ({ category: 'github' }), []);

  const { data } = useMarketplace(params, {
    staleTime: 60 * 60_000, // 1 hour (marketplace changes infrequently)
    gcTime: 24 * 60 * 60_000, // 24 hours
    refetchOnWindowFocus: false, // No need to refetch on focus
  });

  return <div>{/* Marketplace UI */}</div>;
}
```

### Pattern 10: Version Conflict Handling

**Use Case:** Detect and resolve concurrent config writes

```typescript
import { useConfig, useSaveConfig } from '@ui/api';
import { useState } from 'react';

function ConfigEditor() {
  const { data: configData } = useConfig();
  const saveConfigMutation = useSaveConfig();
  const [config, setConfig] = useState<HubConfig | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  useEffect(() => {
    if (configData) setConfig(configData.config);
  }, [configData]);

  const handleSave = () => {
    if (!config || !configData) return;

    saveConfigMutation.mutate(
      {
        config,
        expectedVersion: configData.version, // Optimistic locking
      },
      {
        onSuccess: (response) => {
          toast.success('Config saved successfully');
          setConfig(response.config); // Update with new version
        },
        onError: (error) => {
          if (error.message.includes('version mismatch')) {
            setConflictDialogOpen(true);
          } else {
            toast.error(`Save failed: ${error.message}`);
          }
        },
      }
    );
  };

  return (
    <div>
      <JsonEditor value={config} onChange={setConfig} />
      <button onClick={handleSave} disabled={saveConfigMutation.isPending}>
        Save
      </button>

      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)}>
        <DialogTitle>Version Conflict</DialogTitle>
        <DialogContent>
          Config was modified by another process. Please refresh and try again.
        </DialogContent>
        <DialogActions>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
```

---

## Loading State Strategies

### Strategy 1: Full Page Loading

**Use Case:** Initial page load with no cached data

```typescript
function DashboardPage() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: servers, isLoading: serversLoading } = useServers();

  const isLoading = healthLoading || serversLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      <HealthCard data={health} />
      <ServersList data={servers} />
    </div>
  );
}
```

### Strategy 2: Skeleton Loading

**Use Case:** Better UX during initial load

```typescript
import { Skeleton, Stack } from '@mui/material';

function ServersPageSkeleton() {
  const { data, isLoading } = useServers();

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={80} />
        ))}
      </Stack>
    );
  }

  return <ServersList data={data} />;
}
```

### Strategy 3: Background Refetch Indicator

**Use Case:** Show subtle indicator during background refetch

```typescript
function DashboardPage() {
  const { data, isLoading, isFetching } = useServers();

  return (
    <Box>
      {/* Subtle top indicator for background refetch */}
      {isFetching && !isLoading && (
        <LinearProgress
          sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
        />
      )}

      {isLoading ? (
        <CircularProgress />
      ) : (
        <ServersList data={data} />
      )}
    </Box>
  );
}
```

### Strategy 4: Mutation Loading States

**Use Case:** Button loading state during mutation

```typescript
function ServerActionButton({ serverName }: { serverName: string }) {
  const startMutation = useStartServer();

  return (
    <button onClick={() => startMutation.mutate(serverName)}>
      {startMutation.isPending ? (
        <>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          Starting...
        </>
      ) : (
        'Start Server'
      )}
    </button>
  );
}
```

---

## Error Handling Strategies

### Strategy 1: Inline Error Display

```typescript
function ServersList() {
  const { data, error, isError, refetch } = useServers();

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <button onClick={() => refetch()}>Retry</button>
        }
      >
        Failed to load servers: {error.message}
      </Alert>
    );
  }

  return <div>{/* Render servers */}</div>;
}
```

### Strategy 2: Global Error Boundary

```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <Box>
              <Alert severity="error">
                Application Error: {error.message}
              </Alert>
              <button onClick={resetErrorBoundary}>Retry</button>
            </Box>
          )}
        >
          <RouterProvider router={router} />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### Strategy 3: Toast Notifications

```typescript
import { useSnackbar } from '@ui/hooks/useSnackbar';

function ServerControls() {
  const startMutation = useStartServer();
  const { showSnackbar } = useSnackbar();

  const handleStart = (serverName: string) => {
    startMutation.mutate(serverName, {
      onError: (error) => {
        // Differentiate error types
        if (error.message.includes('Failed to fetch')) {
          showSnackbar('Backend is offline. Please start MCP Hub.', 'error');
        } else {
          showSnackbar(`Failed to start server: ${error.message}`, 'error');
        }
      },
    });
  };

  return <button onClick={() => handleStart('github')}>Start</button>;
}
```

---

## Testing Guide

### Testing Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useServers } from '../useServers';
import * as serversApi from '../../servers';
import {
  createTestQueryClient,
  createQueryWrapper,
} from '../../__tests__/test-utils';
import { mockServersResponseFactory } from '../../__tests__/factories';

describe('useServers', () => {
  it('should fetch servers successfully', async () => {
    // Arrange: Mock API
    const mockData = mockServersResponseFactory.create();
    vi.spyOn(serversApi, 'getServers').mockResolvedValue(mockData);

    // Act: Render hook
    const { result } = renderHook(() => useServers(), {
      wrapper: createQueryWrapper(),
    });

    // Assert: Data loaded
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle errors', async () => {
    // Arrange: Mock error
    vi.spyOn(serversApi, 'getServers').mockRejectedValue(
      new Error('Network error')
    );

    // Act: Render hook
    const { result } = renderHook(() => useServers(), {
      wrapper: createQueryWrapper(),
    });

    // Assert: Error state
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Network error');
  });
});
```

### Testing Mutation Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStartServer } from '../server.mutations';
import * as serversApi from '../../servers';
import {
  createTestQueryClient,
  createQueryWrapper,
  setCacheData,
  getCacheData,
} from '../../__tests__/test-utils';
import {
  mockServersResponseFactory,
  mockServerFactory,
} from '../../__tests__/factories';
import { queryKeys } from '@ui/utils/query-client';

describe('useStartServer', () => {
  it('should optimistically update server status', async () => {
    const queryClient = createTestQueryClient();

    // Arrange: Set initial cache
    const initialData = mockServersResponseFactory.create({
      servers: [
        mockServerFactory.create({
          name: 'github',
          status: 'disconnected',
        }),
      ],
    });

    setCacheData(queryClient, queryKeys.servers.all, initialData);

    vi.spyOn(serversApi, 'startServer').mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

    // Act: Trigger mutation
    const { result } = renderHook(() => useStartServer(), {
      wrapper: createQueryWrapper(queryClient),
    });

    result.current.mutate('github');

    // Assert: Optimistic update applied
    await waitFor(() => {
      const cachedData = getCacheData(queryClient, queryKeys.servers.all) as any;
      expect(cachedData.servers[0].status).toBe('connecting');
    });

    // Cleanup
    await waitFor(() => {
      expect(result.current.isIdle).toBe(true);
    });
  });

  it('should rollback on error', async () => {
    const queryClient = createTestQueryClient();

    const initialData = mockServersResponseFactory.create();
    setCacheData(queryClient, queryKeys.servers.all, initialData);

    vi.spyOn(serversApi, 'startServer').mockRejectedValue(
      new Error('Start failed')
    );

    vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

    const { result } = renderHook(() => useStartServer(), {
      wrapper: createQueryWrapper(queryClient),
    });

    result.current.mutate('github');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Assert: Rollback to original state
    const cachedData = getCacheData(queryClient, queryKeys.servers.all);
    expect(cachedData).toEqual(initialData);
  });
});
```

### Testing Components with Hooks

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithQueryClient } from '../../__tests__/test-utils';
import { ServersList } from '../ServersList';
import * as serversApi from '@ui/api/servers';
import { mockServersResponseFactory } from '@ui/api/__tests__/factories';

describe('ServersList', () => {
  it('should display servers after loading', async () => {
    // Arrange: Mock API
    vi.spyOn(serversApi, 'getServers').mockResolvedValue(
      mockServersResponseFactory.create({
        servers: [
          { name: 'github', status: 'connected', displayName: 'GitHub' },
          { name: 'filesystem', status: 'disconnected', displayName: 'Filesystem' },
        ],
      })
    );

    // Act: Render component
    renderWithQueryClient(<ServersList />);

    // Assert: Loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Assert: Data loaded
    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Filesystem')).toBeInTheDocument();
    });
  });

  it('should start server on button click', async () => {
    const user = userEvent.setup();

    vi.spyOn(serversApi, 'getServers').mockResolvedValue(
      mockServersResponseFactory.create({
        servers: [
          { name: 'github', status: 'disconnected', displayName: 'GitHub' },
        ],
      })
    );

    const startServerSpy = vi
      .spyOn(serversApi, 'startServer')
      .mockResolvedValue({ success: true, message: 'Started' });

    renderWithQueryClient(<ServersList />);

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    const startButton = screen.getByRole('button', { name: /start/i });
    await user.click(startButton);

    expect(startServerSpy).toHaveBeenCalledWith('github');
  });
});
```

---

## Performance Tips

### 1. Use Query Key Memoization

```typescript
// ❌ Bad: New object every render
const params = { category: filter, page: 1 };
const { data } = useMarketplace(params);

// ✅ Good: Memoize object
const params = useMemo(() => ({ category: filter, page: 1 }), [filter]);
const { data } = useMarketplace(params);
```

### 2. Selective Cache Invalidation

```typescript
// ❌ Bad: Invalidates all queries
queryClient.invalidateQueries();

// ✅ Good: Invalidate specific queries
queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });

// ✅ Better: Exact match
queryClient.invalidateQueries({
  queryKey: queryKeys.servers.detail('github'),
  exact: true,
});
```

### 3. Disable Unnecessary Refetches

```typescript
// For static data that rarely changes
const { data } = useMarketplace(params, {
  staleTime: 60 * 60_000, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
```

### 4. Prefetch Predictable Data

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getServers } from '@ui/api/servers';

function NavLink() {
  const queryClient = useQueryClient();

  const handleHover = () => {
    // Prefetch servers data on hover
    queryClient.prefetchQuery({
      queryKey: queryKeys.servers.all,
      queryFn: getServers,
    });
  };

  return (
    <Link to="/servers" onMouseEnter={handleHover}>
      Servers
    </Link>
  );
}
```

---

## Migration Checklist

### Migrating from Imperative Fetch to React Query

**Before:**
```typescript
const [servers, setServers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  async function fetchServers() {
    try {
      setLoading(true);
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data.servers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  fetchServers();
  const interval = setInterval(fetchServers, 5000); // Poll every 5s
  return () => clearInterval(interval);
}, []);
```

**After:**
```typescript
import { useServers } from '@ui/api/hooks';

const { data, isLoading, error } = useServers();
// No polling needed - SSE invalidation handles real-time updates
```

**Checklist:**
- [ ] Remove `useState` for data, loading, error
- [ ] Remove `useEffect` for data fetching
- [ ] Remove polling intervals (SSE replaces polling)
- [ ] Remove manual error handling (React Query handles it)
- [ ] Import and use appropriate hook
- [ ] Update conditional rendering to use `isLoading` and `error`
- [ ] Access data via `data` property

---

## Troubleshooting

### Issue: Data not updating after mutation

**Cause:** Cache not invalidated after mutation

**Solution:** Ensure mutation hook invalidates related queries

```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.health });
}
```

### Issue: Stale data shown after navigation

**Cause:** `staleTime` too high for dynamic data

**Solution:** Reduce `staleTime` or rely on SSE invalidation

```typescript
const { data } = useServers({
  staleTime: 10_000, // 10 seconds instead of default 30s
});
```

### Issue: Optimistic update not reverting on error

**Cause:** Missing rollback logic in `onError`

**Solution:** Implement rollback with previous data snapshot

```typescript
onError: (_error, _variables, context) => {
  if (context?.previousData) {
    queryClient.setQueryData(queryKeys.<domain>, context.previousData);
  }
}
```

### Issue: Infinite refetch loop

**Cause:** Query key changes on every render

**Solution:** Memoize query key objects/arrays

```typescript
const params = useMemo(() => ({ page: currentPage }), [currentPage]);
const { data } = useMarketplace(params);
```

### Issue: Tests failing with "No QueryClient set"

**Cause:** Missing `QueryClientProvider` in tests

**Solution:** Use `createQueryWrapper()` utility

```typescript
const { result } = renderHook(() => useServers(), {
  wrapper: createQueryWrapper(),
});
```

---

## Best Practices Summary

1. **Always use hooks over imperative fetch** - Declarative data fetching
2. **Leverage SSE for real-time updates** - No polling needed
3. **Implement optimistic updates for mutations** - Better UX
4. **Handle errors gracefully** - User-friendly error messages
5. **Test hooks in isolation** - Use testing utilities
6. **Memoize query keys** - Prevent unnecessary refetches
7. **Use TypeScript** - Type safety via Zod schemas
8. **Follow naming conventions** - Consistency across codebase
9. **Document custom options** - Help future developers
10. **Monitor performance** - Profile with React DevTools

---

## Resources

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Zod Documentation](https://zod.dev/)
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [MCP Hub API Documentation](../README.md)
- [Phase 2 Architecture](./PHASE2_UI_API_INTEGRATION_ARCHITECTURE.md)
- [Testing Utilities](../src/ui/api/__tests__/test-utils.tsx)
- [Mock Factories](../src/ui/api/__tests__/factories.ts)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-08
**Maintainer:** MCP Hub Team
