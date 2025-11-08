# React Query Hooks Quick Reference

Quick reference guide for MCP Hub React Query hooks.

## Query Hooks (Read Operations)

### useHealth()
**Purpose**: Get hub health status and all server states
**Returns**: Hub state, active clients, server list with statuses
**Cache Key**: `['health']`
**SSE Events**: `hub_state`, `notification`

```tsx
import { useHealth } from '@ui/api/hooks';

function HealthStatus() {
  const { data, isLoading, error } = useHealth();

  if (isLoading) return <Spinner />;
  if (error) return <Alert>Error</Alert>;

  return (
    <div>
      <p>Hub State: {data.state}</p>
      <p>Active Clients: {data.activeClients}</p>
      <p>Servers: {data.servers.length}</p>
    </div>
  );
}
```

---

### useServers()
**Purpose**: Get all MCP server connection data
**Returns**: Server list with status, uptime, capabilities
**Cache Key**: `['servers']`
**SSE Events**: `server_state_changed`, `notification`

```tsx
import { useServers } from '@ui/api/hooks';

function ServersList() {
  const { data, isLoading } = useServers();

  return (
    <ul>
      {data?.servers.map((server) => (
        <li key={server.name}>
          {server.displayName} - {server.status}
        </li>
      ))}
    </ul>
  );
}
```

---

### useConfig()
**Purpose**: Get hub configuration with version hash
**Returns**: Config object and SHA-256 version
**Cache Key**: `['config']`
**SSE Events**: `config_changed`

```tsx
import { useConfig } from '@ui/api/hooks';

function ConfigEditor() {
  const { data } = useConfig();

  return (
    <div>
      <p>Version: {data?.version}</p>
      <JsonEditor value={data?.config} />
    </div>
  );
}
```

---

### useFilteringStats()
**Purpose**: Get tool filtering metrics and cache stats
**Returns**: Filter rates, LLM cache, category cache
**Cache Key**: `['filtering', 'stats']`
**SSE Events**: `filtering_stats_changed`

```tsx
import { useFilteringStats } from '@ui/api/hooks';

function FilteringDashboard() {
  const { data } = useFilteringStats();

  return (
    <div>
      <MetricCard label="Filter Rate" value={`${(data.filterRate * 100).toFixed(1)}%`} />
      <MetricCard label="Exposed Tools" value={data.exposedTools} />
      <MetricCard label="Total Tools" value={data.totalTools} />
    </div>
  );
}
```

---

### useTools()
**Purpose**: Get aggregated tools from all servers
**Returns**: Tool list with server attribution, categories
**Cache Key**: `['tools']`
**SSE Events**: `tools_changed`, `tool_list_changed`

```tsx
import { useTools } from '@ui/api/hooks';

function ToolsTable() {
  const { data } = useTools();

  return (
    <table>
      <tbody>
        {data?.tools.map((tool) => (
          <tr key={`${tool.server}__${tool.name}`}>
            <td>{tool.name}</td>
            <td>{tool.serverDisplayName}</td>
            <td>{tool.categories.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### useMarketplace()
**Purpose**: Get marketplace catalog with filtering
**Returns**: Server catalog with search/filter/sort
**Cache Key**: `['marketplace', 'catalog', params]`

```tsx
import { useMarketplace } from '@ui/api/hooks';

function MarketplacePage() {
  const [search, setSearch] = useState('');

  const { data } = useMarketplace({
    search,
    category: 'filesystem',
    sort: 'stars',
  });

  return <ServerGrid servers={data?.servers || []} />;
}
```

---

## Mutation Hooks (Write Operations)

### useStartServer()
**Purpose**: Start a server with optimistic status update
**Optimistic**: Shows 'connecting' immediately
**Invalidates**: `['servers']`, `['health']`

```tsx
import { useStartServer } from '@ui/api/mutations';

function StartButton({ serverName }: { serverName: string }) {
  const startServer = useStartServer();

  const handleStart = () => {
    startServer.mutate(serverName, {
      onSuccess: () => toast.success('Started'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <button onClick={handleStart} disabled={startServer.isPending}>
      {startServer.isPending ? 'Starting...' : 'Start'}
    </button>
  );
}
```

---

### useStopServer()
**Purpose**: Stop a server with optimistic status update
**Optimistic**: Shows 'disconnecting' immediately
**Invalidates**: `['servers']`, `['health']`

```tsx
import { useStopServer } from '@ui/api/mutations';

function StopButton({ serverName }: { serverName: string }) {
  const stopServer = useStopServer();

  const handleStop = (disable = false) => {
    stopServer.mutate(
      { serverName, disable },
      {
        onSuccess: () => toast.success('Stopped'),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <>
      <button onClick={() => handleStop(false)}>Stop</button>
      <button onClick={() => handleStop(true)}>Stop & Disable</button>
    </>
  );
}
```

---

### useSaveConfig()
**Purpose**: Save config with concurrent write protection
**Version Check**: Requires expectedVersion parameter
**Optimistic**: Shows new config immediately
**Invalidates**: `['servers']`, `['filtering', 'stats']`

```tsx
import { useConfig } from '@ui/api/hooks';
import { useSaveConfig } from '@ui/api/mutations';

function ConfigSave() {
  const { data: configData } = useConfig();
  const saveConfig = useSaveConfig();
  const [config, setConfig] = useState(null);

  const handleSave = () => {
    saveConfig.mutate(
      {
        config,
        expectedVersion: configData.version, // Important!
      },
      {
        onSuccess: () => toast.success('Saved'),
        onError: (error) => {
          if (error.message.includes('version mismatch')) {
            toast.error('Config modified elsewhere. Please refresh.');
          }
        },
      }
    );
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

### useUpdateFilteringMode()
**Purpose**: Change filtering mode (prompt-based, static, etc)
**Optimistic**: Shows new mode immediately
**Invalidates**: `['filtering', 'stats']`, `['tools']`

```tsx
import { useUpdateFilteringMode } from '@ui/api/mutations';

function ModeSelector() {
  const updateMode = useUpdateFilteringMode();

  const handleChange = (mode: string) => {
    updateMode.mutate(mode, {
      onSuccess: () => toast.success(`Mode: ${mode}`),
    });
  };

  return (
    <select onChange={(e) => handleChange(e.target.value)}>
      <option value="prompt-based">Prompt-Based</option>
      <option value="static">Static</option>
      <option value="category">Category</option>
    </select>
  );
}
```

---

### useToggleFiltering()
**Purpose**: Enable/disable entire filtering system
**Optimistic**: Shows new enabled state immediately
**Invalidates**: `['filtering', 'stats']`, `['tools']`

```tsx
import { useToggleFiltering } from '@ui/api/mutations';

function FilteringToggle() {
  const { data: stats } = useFilteringStats();
  const toggleFiltering = useToggleFiltering();

  const handleToggle = () => {
    toggleFiltering.mutate(!stats?.enabled, {
      onSuccess: () => toast.success('Updated'),
    });
  };

  return <button onClick={handleToggle}>Toggle Filtering</button>;
}
```

---

## Common Patterns

### Loading States
```tsx
const { data, isLoading, isPending, isError, error } = useQuery();

if (isLoading) return <Spinner />;
if (isError) return <Alert>{error.message}</Alert>;
if (!data) return null;

return <Content data={data} />;
```

### Mutation States
```tsx
const mutation = useMutation();

const handleAction = () => {
  mutation.mutate(variables, {
    onSuccess: (data) => console.log('Success', data),
    onError: (error) => console.error('Error', error),
    onSettled: () => console.log('Completed'),
  });
};

return (
  <button disabled={mutation.isPending}>
    {mutation.isPending ? 'Loading...' : 'Submit'}
  </button>
);
```

### Custom Options
```tsx
// Disable automatic refetching
const { data } = useServers({
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

// Custom stale time
const { data } = useHealth({
  staleTime: 60_000, // 60 seconds
});

// Enable/disable query
const { data } = useConfig({
  enabled: isAuthenticated, // Only fetch when true
});
```

### SSE Integration
```tsx
function DashboardPage() {
  const { data } = useHealth();
  const queryClient = useQueryClient();

  useSSESubscription({
    onEvent: (event) => {
      if (event.type === 'hub_state') {
        queryClient.invalidateQueries({ queryKey: queryKeys.health });
      }
      if (event.type === 'server_state_changed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
      }
    },
  });

  return <Dashboard health={data} />;
}
```

---

## Cache Keys Reference

```typescript
export const queryKeys = {
  health: ['health'],
  servers: {
    all: ['servers'],
    detail: (name: string) => ['servers', name],
  },
  tools: {
    all: ['tools'],
    filtered: (mode: string) => ['tools', 'filtered', mode],
  },
  config: ['config'],
  filtering: {
    stats: ['filtering', 'stats'],
  },
  marketplace: {
    catalog: (params: Record<string, unknown>) => ['marketplace', 'catalog', params],
  },
};
```

---

## Import Paths

```typescript
// Query hooks
import {
  useHealth,
  useServers,
  useConfig,
  useFilteringStats,
  useTools,
  useMarketplace,
} from '@ui/api/hooks';

// Mutation hooks
import {
  useStartServer,
  useStopServer,
  useSaveConfig,
  useUpdateFilteringMode,
  useToggleFiltering,
} from '@ui/api/mutations';

// Query keys
import { queryKeys } from '@ui/utils/query-client';

// Query client
import { queryClient } from '@ui/utils/query-client';
```

---

## Error Handling

```typescript
const mutation = useMutation();

mutation.mutate(variables, {
  onError: (error) => {
    // Type-safe error handling
    if (error instanceof APIError) {
      if (error.code === 'VALIDATION_ERROR') {
        toast.error('Invalid input');
      } else if (error.code === 'VERSION_MISMATCH') {
        toast.error('Config modified elsewhere');
      } else {
        toast.error(error.message);
      }
    }
  },
});
```

---

## Best Practices

1. **Always use hooks** - Don't call API functions directly
2. **Use optimistic updates** - Mutations provide instant feedback
3. **Handle errors** - Always provide onError callback
4. **Version checking** - Use expectedVersion for config saves
5. **SSE integration** - Invalidate queries on SSE events
6. **Custom options** - Override defaults when needed
7. **Loading states** - Show spinners/skeletons during loading
8. **Type safety** - Let TypeScript infer types from hooks

---

**Phase 2 Complete**: All hooks production-ready ✅
