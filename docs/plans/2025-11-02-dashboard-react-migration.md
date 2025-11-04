# MCP Hub Dashboard React Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the interactive React + Material UI dashboard described in `UI_DESIGN.md`, including editable filtering settings, server/tools exploration, and live logs.

**Architecture:** Single-page React app (Vite build) served by Express from `dist/ui`, backed by new REST endpoints for config mutations and tool listings. React Router controls navigation via a persistent sidebar layout, with page components calling a shared API client and SSE hook for live log streaming.

**Tech Stack:** React 19, React Router 7, Material UI + MUI X Charts, Vite, TypeScript, Vitest + React Testing Library, Express (existing backend).

### Task 1: Bootstrap Vite + TypeScript React workspace

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Remove: `src/new-ui/index.js`, `src/new-ui/App.js`, `public/bundle.js`

**Step 1: Install client toolchain**
```bash
bun add -d vite @vitejs/plugin-react typescript @types/node
bun add @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-charts react-router-dom recharts
bun add -d @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest-environment-jsdom
```
Expected: dependency tree updated without conflicts.

**Step 2: Update package scripts**
Replace UI scripts in `package.json` `scripts` with:
```json
"dev:ui": "vite dev",
"build:ui": "vite build",
"preview:ui": "vite preview"
```
Ensure `type` remains `module` and existing scripts stay.

**Step 3: Add Vite config**
Create `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7000',
      '/events': 'http://localhost:7000',
      '/mcp': 'http://localhost:7000',
      '/messages': 'http://localhost:7000'
    }
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@api': path.resolve(__dirname, 'src/ui/api'),
      '@components': path.resolve(__dirname, 'src/ui/components'),
      '@pages': path.resolve(__dirname, 'src/ui/pages'),
      '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
      '@theme': path.resolve(__dirname, 'src/ui/theme')
    }
  }
});
```

**Step 4: Add TypeScript configs**
Create `tsconfig.json`:
```json
{
  "extends": "./tsconfig.node.json",
  "include": ["src/ui/**/*"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vitest", "node"]
  }
}
```
Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Step 5: Remove legacy bundle artifacts**
Delete `src/new-ui/` directory contents and `public/bundle.js`. Ensure git removes them.

**Step 6: Smoke test tooling**
Run `bun run dev:ui` to confirm Vite starts and proxies API; expect localhost:5173 dev server banner with no errors.

### Task 2: Extend Express backend for new UI needs

**Files:**
- Modify: `src/server.js`
- Create: `src/utils/config-persistence.js`
- Update tests: `tests/server.test.js` (add cases for new endpoints)

**Step 1: Persist config updates**
Create `src/utils/config-persistence.js`:
```js
import fs from 'fs/promises';
import JSON5 from 'json5';
import path from 'node:path';
import { ConfigError } from './errors.js';

export async function writeConfigToDisk(configManager, updatedConfig) {
  const targetPath = configManager?.configPaths?.[0];
  if (!targetPath) {
    throw new ConfigError('Config path unavailable for persistence');
  }
  const serialized = `${JSON.stringify(updatedConfig, null, 2)}\n`;
  await fs.writeFile(targetPath, serialized, 'utf8');
  await configManager.updateConfig(updatedConfig);
}

export async function loadRawConfig(configManager) {
  const targetPath = configManager?.configPaths?.[0];
  if (!targetPath) {
    throw new ConfigError('Config path unavailable for load');
  }
  const content = await fs.readFile(targetPath, 'utf8');
  return JSON5.parse(content);
}
```

**Step 2: Add helper methods in `src/server.js`**
- Import `{ writeConfigToDisk, loadRawConfig }` and `path` at top.
- After static middleware, add `app.use(express.static('dist/ui'))` before `public` and capture `const uiIndexPath = path.join(process.cwd(), 'dist/ui/index.html');`.

**Step 3: Filtering status endpoint**
Insert after existing `/filtering/stats` route:
```js
registerRoute(
  'POST',
  '/filtering/status',
  'Toggle tool filtering enablement',
  async (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      throw new ValidationError('enabled must be boolean', { enabled });
    }
    const config = serviceManager.mcpHub.configManager.getConfig();
    const nextConfig = { ...config, toolFiltering: { ...config.toolFiltering, enabled } };
    await writeConfigToDisk(serviceManager.mcpHub.configManager, nextConfig);
    serviceManager.broadcastSubscriptionEvent(SubscriptionTypes.CONFIG_CHANGED, { toolFiltering: nextConfig.toolFiltering });
    res.json({ status: 'ok', toolFiltering: nextConfig.toolFiltering, timestamp: new Date().toISOString() });
  }
);
```

**Step 4: Filtering mode endpoint**
```js
registerRoute(
  'POST',
  '/filtering/mode',
  'Update tool filtering mode',
  async (req, res) => {
    const { mode } = req.body;
    const validModes = ['server-allowlist', 'category', 'hybrid', 'prompt-based'];
    if (!validModes.includes(mode)) {
      throw new ValidationError('Invalid filtering mode', { mode, validModes });
    }
    const config = serviceManager.mcpHub.configManager.getConfig();
    const nextConfig = { ...config, toolFiltering: { ...config.toolFiltering, mode } };
    await writeConfigToDisk(serviceManager.mcpHub.configManager, nextConfig);
    serviceManager.broadcastSubscriptionEvent(SubscriptionTypes.CONFIG_CHANGED, { toolFiltering: nextConfig.toolFiltering });
    res.json({ status: 'ok', toolFiltering: nextConfig.toolFiltering, timestamp: new Date().toISOString() });
  }
);
```

**Step 5: Config update endpoint**
```js
registerRoute(
  'POST',
  '/config',
  'Update hub configuration',
  async (req, res) => {
    const proposed = req.body;
    if (!proposed || typeof proposed !== 'object') {
      throw new ValidationError('Body must be config object');
    }
    await writeConfigToDisk(serviceManager.mcpHub.configManager, proposed);
    await serviceManager.restartHub();
    res.json({ status: 'ok', config: serviceManager.mcpHub.configManager.getConfig(), timestamp: new Date().toISOString() });
  }
);
```

**Step 6: Tools listing endpoint**
```js
registerRoute(
  'GET',
  '/tools',
  'List tools aggregated across servers',
  async (req, res) => {
    const servers = serviceManager.mcpHub.getAllServerStatuses();
    const tools = [];
    for (const server of servers) {
      const connection = serviceManager.mcpHub.connections.get(server.name);
      if (!connection) continue;
      for (const tool of connection.tools || []) {
        tools.push({
          server: server.name,
          serverDisplayName: connection.displayName,
          name: tool.name,
          description: tool.description || '',
          enabled: !connection.disabled,
          categories: tool.input_schema?.properties?.categories || []
        });
      }
    }
    res.json({ tools, timestamp: new Date().toISOString() });
  }
);
```

**Step 7: Raw config endpoint**
Add `registerRoute('GET','/config','Fetch raw config', async (req,res)=>{ ... })` returning `await loadRawConfig`. Ensure secrets sanitized (call `envResolver.sanitizeConfig` if available).

**Step 8: Logs SSE proxy**
Add route `registerRoute('GET','/logs','Stream hub logs', async (req,res)=>{ serviceManager.sseManager.streamLogs(req,res); });` and implement `streamLogs` method if missing. If absent, extend SSE manager to provide log events.

**Step 9: SPA fallback**
After API routes but before error middleware, add:
```js
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/mcp') || req.path.startsWith('/messages')) {
    return next();
  }
  res.sendFile(uiIndexPath);
});
```

**Step 10: Tests**
Extend `tests/server.test.js` to cover 200 responses and validation errors for `/api/filtering/status`, `/api/filtering/mode`, `/api/config` (mock ConfigManager). Use supertest:
```js
it('POST /api/filtering/status toggles flag', async () => {
  const res = await request(app).post('/api/filtering/status').send({ enabled: true });
  expect(res.status).toBe(200);
  expect(res.body.toolFiltering.enabled).toBe(true);
});
```
Ensure mocks cover `writeConfigToDisk` by spying with vi.mock.

### Task 3: Create API client utilities

**Files:**
- Create: `src/ui/api/client.ts`, `src/ui/api/filtering.ts`, `src/ui/api/servers.ts`, `src/ui/api/tools.ts`, `src/ui/api/config.ts`

**Step 1: Base client**
`client.ts`:
```ts
const defaultHeaders = { 'Content-Type': 'application/json' } as const;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...defaultHeaders, ...(init?.headers || {}) } });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export { request };
```

**Step 2: Filtering API**
`filtering.ts`:
```ts
import { request } from './client';

export type FilteringStats = {
  enabled: boolean;
  mode: string;
  totalTools: number;
  filteredTools: number;
  exposedTools: number;
  filterRate: number;
  allowedServers: string[];
  allowedCategories: string[];
  categoryCacheSize: number;
  cacheHitRate: number;
  llmCacheSize: number;
  llmCacheHitRate: number;
};

export const getFilteringStats = () => request<{ stats: FilteringStats }>("/api/filtering/stats");
export const setFilteringEnabled = (enabled: boolean) => request("/api/filtering/status", { method: 'POST', body: JSON.stringify({ enabled }) });
export const setFilteringMode = (mode: string) => request("/api/filtering/mode", { method: 'POST', body: JSON.stringify({ mode }) });
```

**Step 3: Servers API**
`servers.ts` with `getServers`, `restartHub`, `startServer`, `stopServer` hitting existing endpoints.

**Step 4: Tools API**
`tools.ts` with `getTools` calling `/api/tools`.

**Step 5: Config API**
`config.ts` exporting `getConfig`, `saveConfig`, `saveRawConfig`. Use `/api/config` endpoints.

### Task 4: Build layout, routing, and shared components

**Files:**
- Create: `src/ui/main.tsx`, `src/ui/App.tsx`, `src/ui/theme/index.ts`, `src/ui/components/Sidebar.tsx`, `src/ui/components/Header.tsx`, `src/ui/components/MetricCard.tsx`
- Modify: `src/ui/index.html`

**Step 1: Vite entry HTML**
`src/ui/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCP Hub Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Bootstrap React root**
`main.tsx`:
```ts
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
```

**Step 3: Define theme**
`theme/index.ts`:
```ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6C5CE7' },
    secondary: { main: '#00CEC9' },
    background: { default: '#121212', paper: '#1E1E28' }
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif'
  }
});

export default theme;
```

**Step 4: App + routing**
`App.tsx`:
```ts
import { Box, Toolbar } from '@mui/material';
import { Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from '@components/Sidebar';
import Header from '@components/Header';
import DashboardPage from '@pages/DashboardPage';
import ServersPage from '@pages/ServersPage';
import ToolsPage from '@pages/ToolsPage';
import ConfigPage from '@pages/ConfigPage';

const App = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
    <Sidebar />
    <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Toolbar sx={{ minHeight: 64 }} />
      <Box component="section" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/servers" element={<ServersPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/configuration" element={<ConfigPage />} />
        </Routes>
      </Box>
    </Box>
  </Box>
);

export default App;
```

**Step 5: Sidebar**
`components/Sidebar.tsx` implementing MUI Drawer with nav links, icons.
```ts
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/servers', label: 'Servers', icon: <StorageIcon /> },
  { to: '/tools', label: 'Tools', icon: <BuildIcon /> },
  { to: '/configuration', label: 'Configuration', icon: <SettingsIcon /> }
];

const Sidebar = () => (
  <Drawer variant="permanent" sx={{ width: 240, [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', bgcolor: 'background.paper' } }}>
    <Toolbar sx={{ minHeight: 64, fontWeight: 700, fontSize: 18, px: 2 }}>MCP Hub</Toolbar>
    <List>
      {navItems.map((item) => (
        <ListItemButton key={item.to} component={NavLink} to={item.to} sx={{ '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } } }}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  </Drawer>
);

export default Sidebar;
```

**Step 6: Header + Metric card**
`Header.tsx` provides top bar with auto-refresh and hub status, `MetricCard.tsx` reusable card with icon slot.

### Task 5: Implement Dashboard page components

**Files:**
- Create: `src/ui/pages/DashboardPage.tsx`, `src/ui/components/FilteringCard.tsx`, `src/ui/components/ToolPieChart.tsx`, `src/ui/components/CacheLineChart.tsx`, `src/ui/components/LogsPanel.tsx`

**Step 1: Stats query hook**
Within `DashboardPage.tsx`, use `useEffect` to fetch stats on mount and set state.

Sample snippet:
```ts
const DashboardPage = () => {
  const [stats, setStats] = useState<FilteringStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFilteringStats()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}><FilteringCard stats={stats} onToggle={setFilteringEnabled} onModeChange={setFilteringMode} /></Grid>
      <Grid item xs={12} md={4}><ToolPieChart stats={stats} /></Grid>
      <Grid item xs={12} md={4}><CacheLineChart stats={stats} /></Grid>
      <Grid item xs={12}><LogsPanel /></Grid>
    </Grid>
  );
};
```

**Step 2: Filtering card**
`FilteringCard.tsx` uses `Switch`, `Select`, `MenuItem` to toggle.

**Step 3: Charts**
Implement `ToolPieChart` using `PieChart` from `@mui/x-charts`, `CacheLineChart` using `LineChart` with mocked time-series derived from stats history (store in local state that appends timestamped stats on updates).

**Step 4: Logs panel**
Create `useLogsStream` hook (Task 6) and display latest 50 entries with auto-scroll.

### Task 6: Servers & Tools management pages

**Files:**
- Create: `src/ui/pages/ServersPage.tsx`, `src/ui/components/ServersTable.tsx`
- Create: `src/ui/pages/ToolsPage.tsx`, `src/ui/components/ToolsTable.tsx`
- Create: `src/ui/hooks/usePolling.ts`

**Step 1: Polling hook**
`usePolling.ts` returns { data, error, loading, refresh } given fetcher function.

**Step 2: Servers table**
Use `DataGrid` from `@mui/x-data-grid` or simple `Table` to render, include `Switch` to enable/disable (call start/stop endpoints), `Button` for refresh.

Sample row action snippet:
```ts
const handleToggle = async (server: ServerRow) => {
  if (server.enabled) {
    await stopServer(server.name, true);
  } else {
    await startServer(server.name);
  }
  refresh();
};
```

**Step 3: Tools page**
Provide search & filters using `TextField` and `Select`; filter data client-side.

### Task 7: Configuration editor page

**Files:**
- Create: `src/ui/pages/ConfigPage.tsx`, `src/ui/components/ConfigTabs.tsx`, `src/ui/components/CategoryListEditor.tsx`, `src/ui/components/ServerAllowlistEditor.tsx`, `src/ui/components/RawJsonEditor.tsx`
- Add dependency: `monaco-editor` + `@monaco-editor/react`

**Step 1: Install editors**
`bun add @monaco-editor/react monaco-editor`

**Step 2: Config page**
Tabs using `Tabs`/`Tab` MUI with panels for General, Categories, Servers, Raw JSON.

**Step 3: Editors**
- General tab: toggles for `toolFiltering.mode`, numeric fields for thresholds.
- Categories tab: list with `Chip` and add dialog.
- Servers tab: list of allowed servers with toggle.
- Raw JSON tab: `<MonacoEditor>` with JSON schema validation.

Hook `Save` button to `saveConfig` and show `Snackbar` on success/error.

### Task 8: Hooks, SSE, and tests

**Files:**
- Create: `src/ui/hooks/useLogsStream.ts`, `src/ui/hooks/useSnackbar.ts`
- Tests: `tests/ui/DashboardPage.test.tsx`, `tests/ui/ServersPage.test.tsx`, `tests/ui/api/filtering.test.ts`

**Step 1: Logs stream hook**
Use `EventSource` to subscribe to `/events` and filter log events. Maintain cleanup on unmount.

**Step 2: Snackbar hook**
Centralize success/error toasts with context provider.

**Step 3: Vitest config**
Extend `vitest.config.ts` (create if absent) to set `environment: 'jsdom'`, include alias same as Vite.

**Step 4: Component tests**
Write tests rendering with `render` from RTL verifying filtering toggle triggers fetch mocks. Example:
```ts
it('toggles filtering', async () => {
  server.use(rest.post('/api/filtering/status', (_req, res, ctx) => res(ctx.json({ status: 'ok', toolFiltering: { enabled: true } }))));
  render(<FilteringCard stats={mockStats} />);
  await user.click(screen.getByRole('checkbox', { name: /filtering/i }));
  expect(await screen.findByText(/enabled/i)).toBeInTheDocument();
});
```

**Step 5: Run tests & lint**
- `bun run build:ui`
- `bun run test`
- `bunx eslint src/ui --ext .ts,.tsx`

All should pass.

**Step 6: Update documentation**
Add new section to `README.md` describing UI dev workflow (`bun run dev:ui`) and Vite proxy usage.

