# Phase 2: React Query Hooks - Quick Reference

## Query Hooks Cheat Sheet

```typescript
// Basic query
const { data, isLoading, error } = useServers();

// Custom options
const { data } = useServers({
  enabled: true,              // Enable/disable query
  staleTime: 30_000,          // Data fresh for 30s
  refetchInterval: 10_000,    // Poll every 10s
  refetchOnWindowFocus: true, // Refetch on window focus
});

// Manual refetch
const { data, refetch } = useServers();
refetch(); // Trigger manual refetch
```

## Mutation Hooks Cheat Sheet

```typescript
// Basic mutation
const mutation = useStartServer();

// Trigger mutation
mutation.mutate(serverName, {
  onSuccess: (data) => toast.success('Success!'),
  onError: (error) => toast.error(error.message),
});

// Check mutation status
mutation.isPending  // Is mutation running?
mutation.isSuccess  // Did it succeed?
mutation.isError    // Did it fail?
mutation.error      // Error object
```

## Available Hooks

### Queries (GET)

| Hook | Returns |
|------|---------|
| `useHealth()` | Hub health and state |
| `useServers()` | All server statuses |
| `useConfig()` | Hub configuration |
| `useFilteringStats()` | Tool filtering stats |
| `useTools()` | All available tools |
| `useMarketplace(params)` | Marketplace catalog |

### Mutations (POST/PUT)

| Hook | Action |
|------|--------|
| `useStartServer()` | Start MCP server |
| `useStopServer()` | Stop MCP server |
| `useSaveConfig()` | Save config with version check |
| `useUpdateFilteringMode()` | Change filtering mode |
| `useToggleFiltering()` | Enable/disable filtering |

## Query Keys

```typescript
import { queryKeys } from '@ui/utils/query-client';

queryKeys.health                          // ['health']
queryKeys.servers.all                     // ['servers']
queryKeys.servers.detail('github')        // ['servers', 'github']
queryKeys.tools.all                       // ['tools']
queryKeys.tools.filtered('prompt-based') // ['tools', 'filtered', 'prompt-based']
queryKeys.config                          // ['config']
queryKeys.filtering.stats                 // ['filtering', 'stats']
queryKeys.marketplace.catalog(params)     // ['marketplace', 'catalog', params]
```

## Loading States

```typescript
const { data, isLoading, isFetching, isRefetching } = useServers();

isLoading      // true on initial load (no cached data)
isFetching     // true on any fetch (initial or background)
isRefetching   // true on background refetch (has cached data)
```

## Error Handling

```typescript
const { data, error, isError } = useServers();

if (isError) {
  // Check error type
  if (error.message.includes('Failed to fetch')) {
    // Backend offline
  } else {
    // Other error
  }
}
```

## Optimistic Updates Pattern

```typescript
onMutate: async (args) => {
  // 1. Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey });

  // 2. Snapshot previous value
  const previous = queryClient.getQueryData(queryKey);

  // 3. Optimistically update cache
  queryClient.setQueryData(queryKey, (old) => ({
    ...old,
    // Your optimistic update here
  }));

  // 4. Return context for rollback
  return { previous };
},
onError: (err, vars, context) => {
  // 5. Rollback on error
  queryClient.setQueryData(queryKey, context.previous);
},
onSettled: () => {
  // 6. Refetch to ensure sync
  queryClient.invalidateQueries({ queryKey });
}
```

## SSE Integration

```typescript
// Automatic cache invalidation (already configured)
// hub_state          → invalidates health
// servers_updated    → invalidates servers
// tool_list_changed  → invalidates tools
// config_changed     → invalidates config

// Custom event subscription
import { useSSESubscription } from '@ui/hooks/useSSESubscription';

useSSESubscription('servers_updated', (data) => {
  // Handle custom logic beyond cache invalidation
});
```

## Testing Utilities

```typescript
// Test setup
import {
  createTestQueryClient,
  createQueryWrapper,
  renderWithQueryClient,
  setCacheData,
  getCacheData,
} from '@ui/api/__tests__/test-utils';

// Mock factories
import {
  mockServersResponseFactory,
  mockServerFactory,
  mockConfigFactory,
  mockFilteringStatsFactory,
  mockToolFactory,
  mockHealthResponseFactory,
  mockErrorFactory,
} from '@ui/api/__tests__/factories';

// Test pattern
const queryClient = createTestQueryClient();
const { result } = renderHook(() => useServers(), {
  wrapper: createQueryWrapper(queryClient),
});
```

## Common Patterns

### 1. Simple Data Display
```typescript
const { data, isLoading } = useServers();
if (isLoading) return <Spinner />;
return <div>{data.servers.length} servers</div>;
```

### 2. Error Handling
```typescript
const { data, error, isError, refetch } = useServers();
if (isError) return <Alert onRetry={refetch}>{error.message}</Alert>;
```

### 3. Mutation with Callback
```typescript
const mutation = useStartServer();
mutation.mutate(name, {
  onSuccess: () => toast.success('Started'),
  onError: (err) => toast.error(err.message),
});
```

### 4. Dependent Query
```typescript
const { data: servers } = useServers();
const { data: config } = useConfig({ enabled: !!servers });
```

### 5. Manual Refetch
```typescript
const { refetch, isFetching } = useServers();
<button onClick={() => refetch()} disabled={isFetching}>Refresh</button>
```

### 6. Polling
```typescript
const { data } = useHealth({ refetchInterval: 30_000 });
```

### 7. Version Conflict
```typescript
const { data: configData } = useConfig();
const mutation = useSaveConfig();
mutation.mutate({
  config,
  expectedVersion: configData.version, // Optimistic locking
});
```

## Cache Operations

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate (refetch)
queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });

// Set data manually
queryClient.setQueryData(queryKeys.servers.all, newData);

// Get current data
const data = queryClient.getQueryData(queryKeys.servers.all);

// Prefetch
queryClient.prefetchQuery({
  queryKey: queryKeys.servers.all,
  queryFn: getServers,
});
```

## Performance Tips

```typescript
// ✅ Memoize query keys
const params = useMemo(() => ({ page: 1 }), []);

// ✅ Selective invalidation
queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });

// ✅ Disable unnecessary refetches
const { data } = useMarketplace(params, {
  refetchOnWindowFocus: false,
});

// ✅ Prefetch on hover
<Link onMouseEnter={() => queryClient.prefetchQuery(...)}>
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Data not updating | Check cache invalidation in mutation `onSettled` |
| Stale data | Reduce `staleTime` or check SSE connection |
| Optimistic update not reverting | Implement `onError` rollback |
| Infinite refetch loop | Memoize query key objects |
| Test failing "No QueryClient" | Use `createQueryWrapper()` |

## File Locations

```
src/ui/api/
├── hooks/               # Query hooks (useHealth, useServers, etc.)
├── mutations/           # Mutation hooks (useStartServer, etc.)
├── schemas/             # Zod validation schemas
├── __tests__/
│   ├── test-utils.tsx   # Testing utilities
│   └── factories.ts     # Mock data factories
└── *.ts                 # API functions (getServers, etc.)
```

## Import Paths

```typescript
// Hooks
import { useServers, useHealth, useConfig } from '@ui/api/hooks';

// Mutations
import { useStartServer, useStopServer } from '@ui/api/mutations';

// Query client
import { queryClient, queryKeys } from '@ui/utils/query-client';

// SSE
import { useSSESubscription } from '@ui/hooks/useSSESubscription';

// Testing
import { createQueryWrapper } from '@ui/api/__tests__/test-utils';
import { mockServerFactory } from '@ui/api/__tests__/factories';
```

## Resources

- **Architecture**: `claudedocs/PHASE2_UI_API_INTEGRATION_ARCHITECTURE.md`
- **Developer Guide**: `claudedocs/PHASE2_DEVELOPER_GUIDE.md`
- **React Query Docs**: https://tanstack.com/query/latest
- **Testing Examples**: `src/ui/api/hooks/__tests__/useServers.test.ts`

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-01-08
