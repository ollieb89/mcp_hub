# MCP Hub UI Design

## 1. Purpose

This document captures the current design of the MCP Hub web interface that ships with the Vite + React rewrite. It explains the goals, information architecture, component model, and integration points so new contributors can extend the experience without reverse-engineering the codebase.

## 2. Experience Principles

* **Operational clarity:** surface the health of filtering, servers, tools, and logs at a glance, with one-click access to deeper controls.
* **Safe controls:** every mutation (toggling filtering, editing allowlists, restarting servers) provides immediate feedback and preserves keyboard/screen reader affordances.
* **Dark, calm aesthetics:** Material UI's dark theme with high-contrast accents keeps long monitoring sessions comfortable while retaining WCAG 2.1 AA contrast.
* **Small cognitive steps:** repeatable card, table, and tab patterns reduce the amount of visual parsing needed when moving between sections.

## 3. Application Shell

* **Technology stack:** React 19 + TypeScript bundled by Vite; Material UI (MUI) provides layout primitives, icons, theming, and form controls; `@mui/x-charts` powers data visualisations; Monaco Editor backs the raw JSON view.
* **Routing/layout:** `App.tsx` mounts a permanent `Sidebar` + top `Header` around the routed content. React Router maps `/dashboard`, `/servers`, `/tools`, and `/configuration` with an index redirect to `/dashboard`. `BrowserRouter` is initialised in `main.tsx`.
* **Theming:** `src/ui/theme/index.ts` applies a dark palette (`#121212` background, `#6C5CE7` primary) and Inter typography through `ThemeProvider` + `CssBaseline`. Components lean on MUI props instead of ad-hoc CSS for consistency and accessibility.
* **Responsiveness:** Layouts use MUI's system (`sx` + responsive grid definitions) to collapse multi-column sections into single column stacks below the `md` breakpoint while preserving adequate spacing and touch targets (minimum 44px).

## 4. Page Designs

### 4.1 Dashboard (`DashboardPage.tsx`)

* **Audience:** operators who want real-time filtering, tool inventory, cache health, and hub log visibility.
* **Primary widgets:**
  * `FilteringCard` shows toggle state, exposes a `Switch` with ARIA label, and a select menu for mode changes (server allowlist/category/hybrid/prompt). "Edit Filters" routes to Configuration.
  * `ToolPieChart` renders exposed vs filtered counts with MUI PieChart. Displays percentages on slices and a fallback message when totals are zero.
  * `CacheLineChart` plots cache hit history for category and LLM caches, retaining the most recent 20 samples. Shows skeletons until data arrives.
  * `ActiveFiltersCard` lists allowed categories/servers as filterable chips, falling back to "None configured" states.
  * `LogsPanel` streams `/api/logs` events via `useLogsStream`, keeping the latest 40 entries. Provides a loading skeleton, empty state, and optional "View All" affordance.
* **Behaviour:** `getFilteringStats` polls on load and every 30s, pushing results into local state plus a rolling history array. Mutation handlers (`setFilteringEnabled`, `setFilteringMode`) show optimistic spinners. Errors surface in an `Alert`.

### 4.2 Servers (`ServersPage.tsx`)

* Presents `ServersTable`, a dense, keyboard-reachable table of discovered MCP servers with columns for name, status, transport, tool count, uptime, enablement, and actions.
* Uses `usePolling(getServers, { interval: 20000 })` for passive updates, with a manual `Refresh` button (showing `CircularProgress` when in flight).
* Row controls: toggle switch calls `startServer`/`stopServer` with disable flag; restart button stops (without disable) then starts. Snackbars (via `useSnackbar`) report success/failure.
* Status chips colour map to `connected` (success), `connecting` (warning), `disabled` (default), or error (red) conditions.

### 4.3 Tools (`ToolsPage.tsx`)

* Combines a global search box (wired to local state, hooking into `CircularProgress` adornment while polling) with dropdown filters for server and category.
* `ToolsTable` filters client-side across name, description, server, and categories. Results render as an MUI table with chip lists for categories and empty states when no match exists.
* Polling cadence matches the servers page (20s) so both stay aligned when new servers expose tools.

### 4.4 Configuration (`ConfigPage.tsx`)

* Tabbed layout managed by `ConfigTabs`; panes never unmount so unsaved edits persist when switching tabs.
* **General tab:** toggles `toolFiltering.enabled`, selects mode, and adjusts `autoEnableThreshold`, all synced to JSON state via `updateConfigState`.
* **Categories tab:** `CategoryListEditor` adds/removes allowlisted categories with enter-to-submit support, deduping values.
* **Servers tab:** `ServerAllowlistEditor` mirrors the category editor for server names.
* **Raw JSON tab:** wraps Monaco Editor (dark theme, 2-space indent) with an "Apply JSON" button that POSTs the edited configuration. Invalid JSON surfaces an error banner without clobbering the previous valid config.
* Global "Save Changes" button serialises the structured state through `saveConfig`, disables while saving, and provides snackbar feedback. The page loads initial config with `getConfig` and resets dirty tracking on success.

## 5. Shared Components & Patterns

* `MetricCard` supplies a standard card frame: icon, title, primary value, subtitle, optional action slot, and child content area. All dashboard cards compose this component to maintain consistent spacing and semantics.
* `usePolling` abstracts polling with cancellation awareness, error capture, and manual refresh, keeping asynchronous logic testable.
* `useSnackbar` centralises transient toast messaging; components call `showSnackbar` and `closeSnackbar` without reimplementing state machines.
* Tables favour native `<table>` semantics for screen readers, combine `TableContainer` + `Paper` for dark theme surfaces, and use `Typography` variants for readable hierarchy.
* Charts and cards expose meaningful fallback messaging and skeletons so the dashboard never appears "broken" during initial load or empty states.

## 6. Data & Integration Points

| Concern | Endpoint | Consumer |
| --- | --- | --- |
| Filtering metrics | `GET /api/filtering/stats` | `DashboardPage` (poll + history) |
| Enable/disable filtering | `POST /api/filtering/status { enabled }` | `FilteringCard` |
| Switch filtering mode | `POST /api/filtering/mode { mode }` | `FilteringCard` |
| Persist configuration | `GET/POST /api/config` | `ConfigPage` (tabs + raw editor) |
| Server inventory | `GET /api/servers` | `ServersPage` (polling) |
| Start server | `POST /api/servers/start { server_name }` | `ServersTable` toggle |
| Stop server | `POST /api/servers/stop?disable=...` | `ServersTable` toggle/restart |
| Tool catalogue | `GET /api/tools` | `ToolsPage` |
| Operational logs | `SSE /api/logs` (`log` & `log_batch` events) | `LogsPanel` via `useLogsStream` |

All fetches go through `request()` (`src/ui/api/client.ts`), which injects JSON headers and normalises error messages for UI display.

## 7. Accessibility, Responsiveness, Performance

* **Accessibility:** Every interactive control uses labelled MUI components (`aria-label` on switches, labelled selects, semantic tables). Tabs expose `aria-label` and per-panel `role="tabpanel"`. Chip collections remain keyboard navigable through native focus order.
* **Responsive behaviour:** Grids collapse to single column on small screens; cards stretch full-width with preserved spacing; tables stay scrollable within bordered containers to prevent layout overflow.
* **Performance:** Vite builds to `dist/ui` (`bun run build:ui`). Route-level code splitting keeps the main bundle at ~401 kB; dashboard charts load through lazy modules (Dashboard route ≈16 kB, chart bundle ≈200 kB deferred), and the Raw JSON tab lazy-loads Monaco (≈15 kB chunk) so ConfigPage ships ~23 kB upfront. Remaining optimisation focus is vendor chunking and tree-shaking chart dependencies. Polling intervals balance freshness with server load (20–30 s). SSE keeps logs live without repeated requests.

## 8. Testing & Quality Signals

* Vitest + React Testing Library cover dashboard interactions (`tests/ui/DashboardPage.test.tsx`) and server toggling flows (`tests/ui/ServersPage.test.tsx`). Tests mock API clients/hooks to verify request contracts and loading states.
* Pending gaps (tracked in project notes): end-to-end coverage for tool filtering combinations and config save flows, plus Playwright smoke tests once the UI stabilises.
* Developers should run `bun run test` and `bun run build:ui` before submitting changes; `bunx eslint .` catches lint or accessibility regressions in JSX.

## 9. Known Follow-Ups

1. **Bundle optimisation:** route-level splitting, chart lazy-loading, and Monaco deferral are done; next tune vendor chunking/tree-shaking to push the primary bundle below 500 kB.
2. **Config UX polish:** add diff preview/warning messaging before applying raw JSON edits and guard against concurrent writes.
3. **Logs deep link:** wire "View All" to a dedicated logs page or modal once backend pagination is available.
4. **Extended monitoring:** explore sparklines for server CPU/memory once metrics land in the API.
