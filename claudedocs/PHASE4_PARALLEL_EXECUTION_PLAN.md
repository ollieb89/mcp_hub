# Phase 4 - Parallel Execution Plan (3 Developers, 4 Weeks)

**Strategy**: Maximum velocity through specialized parallel tracks
**Team**: 3 developers working simultaneously
**Duration**: 4 weeks (160 hours total, 480 developer-hours)
**Coordination**: Daily 15-min standups, weekly integration checkpoints

---

## Team Structure

### Developer 1: Testing Lead (QA Engineer)
**Primary**: Testing infrastructure, component tests, integration tests
**Secondary**: Code review for accessibility
**Skills**: React Testing Library, MSW, Vitest, Playwright
**Deliverable**: 150+ tests, 80%+ coverage, automated CI/CD

### Developer 2: Performance Lead (Frontend Engineer)
**Primary**: Performance optimization, bundle analysis, virtualization
**Secondary**: Code review for testing
**Skills**: Vite, React optimization, profiling, monitoring
**Deliverable**: -63% bundle, -46% TTI, 60fps @ 500+ tools

### Developer 3: Accessibility Lead (A11y Specialist)
**Primary**: WCAG compliance, keyboard navigation, screen reader support
**Secondary**: Code review for performance
**Skills**: ARIA, WCAG 2.1, axe-core, keyboard navigation
**Deliverable**: 65% → 95%+ WCAG compliance

---

## Week 1: Foundation & Quick Wins

### Dev 1 (Testing Lead) - Week 1 Focus

#### Day 1: Setup & Infrastructure (8 hours)
**Morning** (4h):
```bash
# Install dependencies
bun add -D @testing-library/react @testing-library/jest-dom msw vitest-dom

# Create MSW handlers
cp tests/ui/mocks/handlers.ts.template tests/ui/mocks/handlers.ts
cp tests/ui/mocks/server.ts.template tests/ui/mocks/server.ts

# Configure Vitest
# Update vitest.config.ts with setupFiles
```

**Afternoon** (4h):
- Set up MSW lifecycle in `tests/setup-msw.js`
- Create test utilities in `tests/ui/utils/test-utils.tsx`
- Create mock data factories in `tests/ui/utils/test-data.ts`
- Write first smoke test to validate setup

**Deliverable**: MSW infrastructure fully configured and validated

#### Day 2-3: Component Tests - Part 1 (16 hours)
**Test Creation** (10 tests):
1. `MetricCard.test.tsx` - 3 tests (render, loading, error states)
2. `ActiveFiltersCard.test.tsx` - 2 tests (enabled/disabled states)
3. `FilteringCard.test.tsx` - 3 tests (mode switching, stats display)
4. `ServersTable.test.tsx` - 2 tests (render, toggle action)

**Pattern Established**:
```typescript
import { render, screen } from '@/tests/ui/utils/test-utils';
import { server } from '@/tests/ui/mocks/server';
import { http, HttpResponse } from 'msw';

describe('MetricCard', () => {
  it('renders metric data correctly', async () => {
    render(<MetricCard label="Tools" value={42} />);
    expect(await screen.findByText('42')).toBeInTheDocument();
  });
});
```

**Deliverable**: 10 component tests passing, test pattern documented

#### Day 4-5: Hook Tests (16 hours)
**Test Creation** (10 tests):
1. `useFilteringStats.test.ts` - 3 tests (success, loading, error)
2. `useServers.test.ts` - 2 tests (data fetching, caching)
3. `useConfig.test.ts` - 2 tests (config loading, updates)
4. `useTools.test.ts` - 2 tests (tool list, filtering)
5. `useSSESubscription.test.ts` - 1 test (event handling)

**Pattern**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@/tests/ui/utils/test-utils';

describe('useFilteringStats', () => {
  it('fetches and caches stats', async () => {
    const { result } = renderHook(() => useFilteringStats(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({...});
  });
});
```

**Deliverable**: 10 hook tests passing, React Query patterns validated

**Week 1 Summary - Dev 1**:
- ✅ MSW infrastructure complete
- ✅ 20 tests passing (10 component + 10 hook)
- ✅ Test utilities established
- ✅ Coverage: ~25-30%

---

### Dev 2 (Performance Lead) - Week 1 Focus

#### Day 1: Analysis & Baseline (8 hours)
**Morning** (4h):
```bash
# Install analysis tools
bun add -D rollup-plugin-visualizer vite-plugin-compression

# Configure bundle analyzer
# Update vite.config.ts with visualizer plugin

# Run baseline build
bun run build:ui
```

**Afternoon** (4h):
- Analyze current bundle (426KB)
- Identify largest chunks (ChartsWrapper: 202KB, ConfigPage: 76KB)
- Profile component render performance
- Document baseline metrics

**Deliverable**: Performance baseline documented, targets set

#### Day 2: Lazy Loading Implementation (8 hours)
**Target Components**:
```typescript
// src/ui/App.tsx - Lazy load all pages
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const ServersPage = lazy(() => import('@pages/ServersPage'));
const ConfigPage = lazy(() => import('@pages/ConfigPage'));
const ToolsPage = lazy(() => import('@pages/ToolsPage'));

// src/ui/pages/* - Lazy load heavy components
const ToolPieChart = lazy(() => import('@components/ToolPieChart'));
const CacheLineChart = lazy(() => import('@components/CacheLineChart'));
const RawJsonEditor = lazy(() => import('@components/RawJsonEditor'));
```

**Expected Impact**: -30% initial bundle size

**Deliverable**: 8 components lazy loaded, bundle reduced to ~300KB

#### Day 3: Memoization & Optimization (8 hours)
**React.memo Candidates**:
1. `ServersTable` - Expensive table render
2. `ToolsTable` - Large dataset
3. `ToolPieChart` - Chart calculations
4. `CacheLineChart` - Time series data
5. `ConfigTabs` - Heavy JSON rendering

**useMemo Optimization**:
```typescript
// DashboardPage.tsx
const sortedServers = useMemo(
  () => servers?.sort((a, b) => a.name.localeCompare(b.name)),
  [servers]
);

// ServersTable.tsx
const filteredTools = useMemo(
  () => tools.filter(t => t.category === selectedCategory),
  [tools, selectedCategory]
);
```

**Expected Impact**: -20% render time

**Deliverable**: 5 components memoized, render performance improved

#### Day 4-5: Code Splitting & Tree Shaking (16 hours)
**Manual Chunks**:
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-mui': ['@mui/material', '@mui/icons-material'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-charts': ['recharts'],
        'vendor-monaco': ['@monaco-editor/react'],
      }
    }
  }
}
```

**Tree Shaking**:
- Remove unused MUI components
- Remove unused utility functions
- Optimize lodash imports (use specific imports)

**Expected Impact**: -20% additional reduction

**Deliverable**: Bundle optimized to ~200KB (-53% from baseline)

**Week 1 Summary - Dev 2**:
- ✅ Baseline metrics documented
- ✅ 8 components lazy loaded
- ✅ 5 components memoized
- ✅ Bundle reduced from 426KB → ~200KB (-53%)

---

### Dev 3 (Accessibility Lead) - Week 1 Focus

#### Day 1: Audit & Planning (8 hours)
**Morning** (4h):
```bash
# Install accessibility tools
bun add -D @axe-core/react eslint-plugin-jsx-a11y

# Configure ESLint
# Update .eslintrc with jsx-a11y rules

# Run initial axe-core audit
npm install -g @axe-core/cli
axe http://localhost:5173 --save audit-baseline.json
```

**Afternoon** (4h):
- Review audit results (65% baseline)
- Prioritize critical issues
- Create remediation checklist
- Document WCAG gaps

**Deliverable**: Accessibility audit complete, action plan created

#### Day 2-3: ARIA Labels & Semantic HTML (16 hours)
**Components to Fix** (15 components):

**Buttons & Controls**:
```tsx
// Before
<IconButton onClick={handleStart}>
  <PlayArrowIcon />
</IconButton>

// After
<IconButton
  onClick={handleStart}
  aria-label="Start MCP server"
>
  <PlayArrowIcon aria-hidden="true" />
</IconButton>
```

**Forms**:
```tsx
// Before
<TextField label="Server Name" />

// After
<TextField
  label="Server Name"
  id="server-name-input"
  aria-describedby="server-name-help"
/>
<FormHelperText id="server-name-help">
  Enter a unique name for this MCP server
</FormHelperText>
```

**Lists & Tables**:
```tsx
// Before
<div>
  <div>Server 1</div>
  <div>Server 2</div>
</div>

// After
<ul role="list" aria-label="MCP Servers">
  <li>Server 1</li>
  <li>Server 2</li>
</ul>
```

**Deliverable**: All interactive elements have ARIA labels

#### Day 4: Keyboard Navigation (8 hours)
**Focus Management**:
```tsx
// Modal focus trap
useEffect(() => {
  const modal = modalRef.current;
  const firstFocusable = modal?.querySelector('button, input');
  firstFocusable?.focus();

  return () => {
    previousFocus.current?.focus();
  };
}, [isOpen]);

// Keyboard handlers
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
  if (e.key === 'Escape') {
    handleClose();
  }
};
```

**Tab Order**:
- Verify logical tab order
- Add `tabIndex={-1}` to decorative elements
- Add skip links for main content

**Deliverable**: Full keyboard navigation working

#### Day 5: Semantic Landmarks (8 hours)
**Page Structure**:
```tsx
<>
  <Header>
    <nav aria-label="Main navigation">
      <Link to="/" aria-current={current === 'home'}>Dashboard</Link>
      <Link to="/servers">Servers</Link>
    </nav>
  </Header>

  <main aria-label="Dashboard content">
    <h1>MCP Hub Dashboard</h1>
    {/* Main content */}
  </main>

  <aside aria-label="Logs panel">
    <LogsPanel />
  </aside>
</>
```

**Deliverable**: Semantic HTML structure complete

**Week 1 Summary - Dev 3**:
- ✅ Accessibility audit complete
- ✅ All ARIA labels added
- ✅ Keyboard navigation functional
- ✅ Semantic landmarks implemented
- ✅ Compliance: 65% → ~80%

---

## Week 1 Integration Checkpoint (Friday 4pm)

### Joint Review (1 hour)
**Attendees**: All 3 developers + PM/tech lead

**Agenda**:
1. **Testing**: Demo MSW setup, run 20 tests live
2. **Performance**: Show bundle reduction (426KB → 200KB)
3. **Accessibility**: Demo keyboard navigation, show audit results
4. **Conflicts**: Resolve any merge conflicts or integration issues
5. **Week 2 Planning**: Confirm priorities and dependencies

**Deliverables**:
- Week 1 progress report
- Week 2 task assignments
- Risk/blocker identification

---

## Week 2: Deep Implementation

### Dev 1 (Testing Lead) - Week 2 Focus

#### Day 1-2: Page Integration Tests (16 hours)
**Test Creation** (20 tests):
1. `DashboardPage.test.tsx` - 6 tests (stats, charts, SSE updates)
2. `ServersPage.test.tsx` - 5 tests (server list, start/stop, mutations)
3. `ConfigPage.test.tsx` - 5 tests (config load, edit, save, validation)
4. `ToolsPage.test.tsx` - 4 tests (tool list, filtering, search)

**Pattern**:
```typescript
describe('DashboardPage', () => {
  it('displays filtering stats', async () => {
    render(<DashboardPage />);
    expect(await screen.findByText('Active Tools')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('handles SSE updates', async () => {
    render(<DashboardPage />);
    act(() => {
      sseManager.emit('config_changed', { /* data */ });
    });
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});
```

**Deliverable**: 20 page tests passing, coverage ~50%

#### Day 3: Mutation Tests (8 hours)
**Test Creation** (10 tests):
1. `useStartServer.test.ts` - 3 tests (success, error, optimistic update)
2. `useStopServer.test.ts` - 2 tests
3. `useSaveConfig.test.ts` - 3 tests (save, validation, rollback)
4. `useUpdateFilteringMode.test.ts` - 2 tests

**Deliverable**: All mutations tested, optimistic updates validated

#### Day 4-5: SSE & WebSocket Tests (16 hours)
**Test Creation** (10 tests):
1. `sse-client.test.ts` - 5 tests (connect, reconnect, events)
2. `useLogsStream.test.ts` - 3 tests (stream, filtering, cleanup)
3. Integration with React Query cache invalidation - 2 tests

**Mock EventSource**:
```typescript
global.EventSource = class EventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
  }
  addEventListener(event, handler) {
    this.handlers[event] = handler;
  }
  close() {
    this.readyState = 2;
  }
};
```

**Deliverable**: SSE fully tested, real-time updates validated

**Week 2 Summary - Dev 1**:
- ✅ 40 additional tests (total: 60 tests)
- ✅ All pages tested
- ✅ All mutations tested
- ✅ SSE integration tested
- ✅ Coverage: ~60%

---

### Dev 2 (Performance Lead) - Week 2 Focus

#### Day 1-2: Virtualization Implementation (16 hours)
**ServersTable Virtualization**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const ServersTable = ({ servers }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: servers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Row height
    overscan: 5,
  });

  return (
    <TableContainer ref={parentRef} sx={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const server = servers[virtualRow.index];
          return (
            <TableRow
              key={server.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Row content */}
            </TableRow>
          );
        })}
      </div>
    </TableContainer>
  );
};
```

**Expected Impact**: 60fps @ 500+ rows

**Deliverable**: ServersTable and ToolsTable virtualized

#### Day 3: Dynamic Imports & Preloading (8 hours)
**Route-based Code Splitting**:
```typescript
// App.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        lazy: async () => {
          const { DashboardPage } = await import('@pages/DashboardPage');
          return { Component: DashboardPage };
        },
      },
      // ... other routes
    ],
  },
]);
```

**Preloading Strategy**:
```typescript
// Preload on hover
<Link
  to="/servers"
  onMouseEnter={() => import('@pages/ServersPage')}
>
  Servers
</Link>
```

**Deliverable**: Route-based splitting implemented, preloading active

#### Day 4-5: Compression & Monitoring (16 hours)
**Brotli/Gzip Compression**:
```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

plugins: [
  viteCompression({ algorithm: 'brotliCompress' }),
  viteCompression({ algorithm: 'gzip' }),
],
```

**Performance Monitoring**:
```typescript
// src/ui/utils/performance.ts
export const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onFID(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};
```

**Deliverable**: Compression active, monitoring setup

**Week 2 Summary - Dev 2**:
- ✅ Virtualization implemented (60fps @ 1000+ rows)
- ✅ Route-based code splitting active
- ✅ Compression enabled (Brotli + Gzip)
- ✅ Performance monitoring setup
- ✅ Bundle: ~160KB (-63% from baseline)

---

### Dev 3 (Accessibility Lead) - Week 2 Focus

#### Day 1-2: Form Accessibility (16 hours)
**Components to Fix** (8 forms):
1. ConfigPage forms (server config, filtering)
2. Server control forms (start/stop, settings)
3. Tool filtering controls
4. Search and filter inputs

**Pattern**:
```tsx
<FormControl fullWidth error={!!errors.serverName}>
  <InputLabel
    htmlFor="server-name-input"
    id="server-name-label"
  >
    Server Name
  </InputLabel>
  <TextField
    id="server-name-input"
    aria-labelledby="server-name-label"
    aria-describedby="server-name-error server-name-help"
    aria-invalid={!!errors.serverName}
    aria-required="true"
  />
  {errors.serverName && (
    <FormHelperText id="server-name-error" role="alert">
      {errors.serverName}
    </FormHelperText>
  )}
  <FormHelperText id="server-name-help">
    Must be unique across all servers
  </FormHelperText>
</FormControl>
```

**Deliverable**: All forms WCAG compliant

#### Day 3: Modal & Dialog Accessibility (8 hours)
**Focus Trap & ARIA**:
```tsx
const ConfigPreviewDialog = ({ open, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      const firstInput = modalRef.current?.querySelector('button, input');
      (firstInput as HTMLElement)?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      role="dialog"
      ref={modalRef}
    >
      <DialogTitle id="dialog-title">Configuration Preview</DialogTitle>
      <DialogContent id="dialog-description">
        {/* Content */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
```

**Deliverable**: All modals accessible with focus management

#### Day 4-5: Color Contrast & Visual (16 hours)
**Color Contrast Fixes**:
```typescript
// theme/index.ts - Update to WCAG AA compliant colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // 4.5:1 contrast ratio
      contrastText: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)', // 4.5:1 on white
      secondary: 'rgba(0, 0, 0, 0.6)', // 4.5:1 on white
    },
  },
});
```

**Visual Indicators**:
```tsx
// Add non-color indicators
<Chip
  label={status}
  color={status === 'connected' ? 'success' : 'error'}
  icon={status === 'connected' ? <CheckIcon /> : <ErrorIcon />}
/>
```

**Deliverable**: All color contrast issues fixed

**Week 2 Summary - Dev 3**:
- ✅ All forms accessible
- ✅ All modals accessible
- ✅ Color contrast WCAG AA
- ✅ Visual indicators added
- ✅ Compliance: ~85%

---

## Week 2 Integration Checkpoint (Friday 4pm)

### Joint Review (1 hour)
1. **Testing**: 60 tests passing, coverage report
2. **Performance**: Bundle <200KB, virtualization demo
3. **Accessibility**: 85% compliance, keyboard nav demo
4. **Integration**: Test all three tracks together
5. **Week 3 Planning**: E2E tests, final optimizations, advanced a11y

---

## Week 3: Advanced Features & Refinement

### Dev 1 (Testing Lead) - Week 3 Focus

#### Day 1-3: Playwright E2E Tests (24 hours)
**Test Scenarios** (30 tests):
1. **User Flows** (10 tests):
   - Complete server setup flow
   - Configuration change flow
   - Tool filtering flow
   - Error recovery flow

2. **Browser Tests** (10 tests):
   - Chrome, Firefox, Safari compatibility
   - Responsive design (mobile, tablet, desktop)
   - Dark mode compatibility

3. **Performance Tests** (10 tests):
   - Page load times
   - Interaction responsiveness
   - Memory leaks

**Pattern**:
```typescript
// tests/e2e/server-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete server setup flow', async ({ page }) => {
  await page.goto('http://localhost:5173/servers');

  // Start server
  await page.getByRole('button', { name: 'Start filesystem server' }).click();
  await expect(page.getByText('Connected')).toBeVisible();

  // Verify tools appear
  await page.goto('http://localhost:5173/tools');
  await expect(page.getByText('filesystem__search')).toBeVisible();
});
```

**Deliverable**: 30 E2E tests passing, CI/CD configured

#### Day 4-5: Coverage & Documentation (16 hours)
**Coverage Analysis**:
```bash
bun run test:coverage
# Target: 80%+ branches, 85%+ lines
```

**Test Documentation**:
- Testing strategy guide
- How to add new tests
- MSW patterns and best practices
- Debugging test failures

**Deliverable**: 80%+ coverage achieved, docs complete

**Week 3 Summary - Dev 1**:
- ✅ 30 E2E tests passing (total: 90+ tests)
- ✅ Coverage: 80%+ achieved
- ✅ CI/CD pipeline configured
- ✅ Testing documentation complete

---

### Dev 2 (Performance Lead) - Week 3 Focus

#### Day 1-2: Service Worker & Caching (16 hours)
**Service Worker Setup**:
```typescript
// src/ui/sw.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST);

// API calls - Network first with cache fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({ cacheName: 'api-cache' })
);

// Static assets - Cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'image-cache' })
);
```

**Expected Impact**: Offline support, faster repeat visits

**Deliverable**: Service worker active, offline functionality

#### Day 3: Resource Hints & Prefetching (8 hours)
**Critical Resource Preload**:
```html
<!-- index.html -->
<link rel="preload" href="/assets/index.js" as="script">
<link rel="preload" href="/assets/index.css" as="style">
<link rel="dns-prefetch" href="http://localhost:7000">
<link rel="preconnect" href="http://localhost:7000">
```

**Smart Prefetching**:
```typescript
// Prefetch on idle
requestIdleCallback(() => {
  import('@components/ToolPieChart');
  import('@components/CacheLineChart');
});

// Prefetch on navigation intent
router.subscribe((state) => {
  if (state.location.pathname === '/') {
    import('@pages/ServersPage'); // Likely next page
  }
});
```

**Deliverable**: Resource hints optimized, prefetching active

#### Day 4-5: Performance Documentation & Monitoring (16 hours)
**Performance Budget**:
```json
{
  "budgets": [
    {
      "path": "/**",
      "timings": [
        { "metric": "interactive", "budget": 3000 },
        { "metric": "first-contentful-paint", "budget": 1000 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 200 },
        { "resourceType": "total", "budget": 400 }
      ]
    }
  ]
}
```

**Monitoring Dashboard**:
- Real-time performance metrics
- Bundle size tracking
- Lighthouse CI integration

**Deliverable**: Performance monitoring complete, docs written

**Week 3 Summary - Dev 2**:
- ✅ Service worker active (offline support)
- ✅ Resource hints optimized
- ✅ Performance monitoring dashboard
- ✅ Final bundle: ~160KB gzipped
- ✅ TTI: <3s (was ~5.5s, -46%)

---

### Dev 3 (Accessibility Lead) - Week 3 Focus

#### Day 1-2: Advanced ARIA Patterns (16 hours)
**Live Regions**:
```tsx
// Announce dynamic content changes
const [announcement, setAnnouncement] = useState('');

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>

// Usage
useEffect(() => {
  if (serverStarted) {
    setAnnouncement(`${serverName} started successfully`);
  }
}, [serverStarted]);
```

**Combobox Pattern**:
```tsx
<Autocomplete
  role="combobox"
  aria-expanded={open}
  aria-controls="server-list"
  aria-activedescendant={activeOption?.id}
  renderInput={(params) => (
    <TextField
      {...params}
      aria-autocomplete="list"
      aria-owns="server-list"
    />
  )}
/>
```

**Deliverable**: All complex patterns implemented correctly

#### Day 3: Screen Reader Testing (8 hours)
**Testing Setup**:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS)
- TalkBack (Android)

**Test Scenarios**:
1. Navigate full app with screen reader only
2. Complete all user flows
3. Verify announcements and live regions
4. Test form validation feedback

**Deliverable**: All screen readers work correctly

#### Day 4-5: Accessibility Documentation & Audit (16 hours)
**Final Audit**:
```bash
# Automated
axe http://localhost:5173 --save audit-final.json
npm run lighthouse -- --only-categories=accessibility

# Manual WCAG checklist
```

**Documentation**:
- Accessibility testing guide
- WCAG compliance report
- Known limitations and future work
- Maintenance guidelines

**Deliverable**: 95%+ compliance, complete documentation

**Week 3 Summary - Dev 3**:
- ✅ Advanced ARIA patterns implemented
- ✅ Screen reader testing complete
- ✅ Final compliance: 95%+
- ✅ Accessibility docs complete

---

## Week 3 Integration Checkpoint (Friday 4pm)

### Joint Review (1 hour)
1. **Testing**: 90+ tests, 80%+ coverage, E2E working
2. **Performance**: Final metrics (-63% bundle, -46% TTI)
3. **Accessibility**: 95%+ WCAG compliance
4. **Production Readiness**: Review deployment checklist
5. **Week 4 Planning**: Polish, documentation, handoff

---

## Week 4: Polish, Documentation & Deployment

### Dev 1 (Testing Lead) - Week 4 Focus

#### Day 1-2: CI/CD Integration (16 hours)
**GitHub Actions Workflow**:
```yaml
# .github/workflows/ui-tests.yml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: npx playwright install
      - run: bun start & # Start backend
      - run: bun run dev:ui & # Start UI
      - run: npx playwright test
```

**Quality Gates**:
- All tests must pass
- Coverage must be ≥80%
- No accessibility violations
- Performance budget met

**Deliverable**: Automated testing in CI/CD

#### Day 3-5: Test Maintenance & Training (24 hours)
- Fix flaky tests
- Add missing edge cases
- Create test writing guide
- Conduct testing workshop
- Knowledge transfer documentation

**Deliverable**: Stable test suite, team trained

**Week 4 Summary - Dev 1**:
- ✅ CI/CD pipeline active
- ✅ All tests stable (no flakes)
- ✅ Team trained on testing
- ✅ Final: 150+ tests, 82%+ coverage

---

### Dev 2 (Performance Lead) - Week 4 Focus

#### Day 1-2: Performance Tuning (16 hours)
**Final Optimizations**:
- Image optimization (WebP, lazy loading)
- Font optimization (preload, subsetting)
- CSS optimization (critical CSS, purge unused)
- JavaScript optimization (minification, dead code elimination)

**Lighthouse Optimization**:
- Target: 95+ performance score
- Fix all opportunities
- Address diagnostics

**Deliverable**: Lighthouse score 95+

#### Day 3-5: Monitoring & Documentation (24 hours)
**Production Monitoring**:
```typescript
// Performance monitoring integration
if (process.env.NODE_ENV === 'production') {
  reportWebVitals((metric) => {
    // Send to analytics
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  });
}
```

**Documentation**:
- Performance optimization guide
- Bundle analysis guide
- Monitoring dashboard guide
- Troubleshooting performance issues

**Deliverable**: Monitoring active, docs complete

**Week 4 Summary - Dev 2**:
- ✅ Final bundle: 158KB (-63%)
- ✅ TTI: 2.8s (-46%)
- ✅ Lighthouse: 95+ performance
- ✅ Monitoring active
- ✅ Docs complete

---

### Dev 3 (Accessibility Lead) - Week 4 Focus

#### Day 1-2: Final Accessibility Validation (16 hours)
**Comprehensive Testing**:
1. Automated: axe-core, Lighthouse, WAVE
2. Manual: WCAG checklist, keyboard-only
3. Screen readers: NVDA, JAWS, VoiceOver
4. User testing: Users with disabilities

**Issue Resolution**:
- Fix any remaining violations
- Document accepted exceptions
- Create remediation plan for future

**Deliverable**: 95%+ compliance validated

#### Day 3-5: Documentation & Training (24 hours)
**Accessibility Guidelines**:
- Component accessibility patterns
- Testing procedures
- WCAG quick reference
- Common pitfalls and solutions

**Team Training**:
- Accessibility workshop
- Screen reader demo
- Keyboard navigation demo
- WCAG compliance review

**Deliverable**: Team trained, docs complete

**Week 4 Summary - Dev 3**:
- ✅ Final compliance: 96%
- ✅ All screen readers working
- ✅ Team trained
- ✅ Docs complete

---

## Week 4 Final Integration (Thursday-Friday)

### Day 4: Integration Testing (8 hours)
**All Developers**:
- Run full test suite (all 150+ tests)
- Verify performance benchmarks
- Validate accessibility compliance
- Test production build
- Smoke test all features

### Day 5: Handoff & Documentation (8 hours)
**Deliverables**:
1. Phase 4 completion report
2. Updated README with testing/performance/a11y info
3. Deployment guide
4. Maintenance guide
5. Known issues and future work

---

## Communication & Coordination

### Daily Standups (15 min @ 9am)
**Format**:
- What I completed yesterday
- What I'm working on today
- Any blockers or dependencies

**Example**:
```
Dev 1: Completed 10 component tests. Today: Starting hook tests.
       Blocker: Need SSE mock from Dev 2.
Dev 2: Lazy loaded 8 components. Today: Implementing virtualization.
       No blockers.
Dev 3: Added ARIA labels to all buttons. Today: Working on forms.
       Question: Which color palette are we using?
```

### Weekly Checkpoints (Friday 4pm, 1 hour)
- Demo deliverables
- Review metrics
- Identify risks
- Plan next week
- Resolve conflicts

### Slack Channel: #phase4-parallel
- Quick questions
- Code review requests
- Share findings
- Celebrate wins

### Code Review Process
**Rules**:
1. All PRs require 1 approval (from other developer)
2. Testing reviews performance code
3. Performance reviews accessibility code
4. Accessibility reviews testing code
5. Max 24-hour review turnaround

---

## Success Metrics

### Week-by-Week Targets

**Week 1**:
- ✅ Testing: 20 tests, 30% coverage
- ✅ Performance: -50% bundle size
- ✅ Accessibility: 80% compliance

**Week 2**:
- ✅ Testing: 60 tests, 60% coverage
- ✅ Performance: -60% bundle, virtualization working
- ✅ Accessibility: 85% compliance

**Week 3**:
- ✅ Testing: 90 tests, 80% coverage, E2E working
- ✅ Performance: -63% bundle, -46% TTI, monitoring active
- ✅ Accessibility: 95% compliance

**Week 4**:
- ✅ Testing: 150+ tests, 82%+ coverage, CI/CD active
- ✅ Performance: Final optimizations, 95+ Lighthouse
- ✅ Accessibility: 96% compliance, team trained

### Final Deliverables (End of Week 4)

**Testing**:
- ✅ 150+ tests passing
- ✅ 82%+ coverage (exceeds 80% target)
- ✅ E2E tests with Playwright
- ✅ CI/CD pipeline configured
- ✅ Testing documentation complete

**Performance**:
- ✅ Bundle: 426KB → 158KB (-63%)
- ✅ TTI: ~5.5s → 2.8s (-46%)
- ✅ Scroll: 60fps @ 1000+ items
- ✅ Lighthouse: 95+ performance score
- ✅ Monitoring dashboard active

**Accessibility**:
- ✅ WCAG 2.1 AA: 65% → 96% compliance
- ✅ All screen readers working
- ✅ Full keyboard navigation
- ✅ Color contrast compliant
- ✅ Team trained on a11y

---

## Risk Mitigation

### Identified Risks

**Week 1 Risks**:
- MSW compatibility issues → Mitigation: Test on Day 1
- Bundle analysis complexity → Mitigation: Use proven tools
- ARIA complexity → Mitigation: Follow established patterns

**Week 2 Risks**:
- Virtualization performance → Mitigation: Benchmark early
- SSE testing difficulty → Mitigation: Mock EventSource
- Form accessibility complexity → Mitigation: Use MUI built-ins

**Week 3 Risks**:
- E2E test flakiness → Mitigation: Proper waits, retry logic
- Service worker bugs → Mitigation: Extensive testing
- Screen reader compatibility → Mitigation: Test multiple readers

**Week 4 Risks**:
- CI/CD configuration → Mitigation: Use GitHub Actions templates
- Performance regression → Mitigation: Automated budgets
- Knowledge transfer gaps → Mitigation: Comprehensive docs

### Contingency Plans

**If Testing Falls Behind**:
- Reduce coverage target to 75%
- Skip some E2E tests (manual testing)
- Extend into Week 5 if needed

**If Performance Misses Targets**:
- Accept -50% bundle instead of -63%
- Skip service worker (future phase)
- Focus on critical path only

**If Accessibility Misses Target**:
- Accept 90% instead of 95%
- Document exceptions
- Create Phase 5 remediation plan

---

## Cost & Resource Summary

### Developer Hours Breakdown

**Total**: 480 developer-hours (3 devs × 40 hours × 4 weeks)

**Dev 1 (Testing)**: 160 hours
- Week 1: 40h (setup + 20 tests)
- Week 2: 40h (40 more tests)
- Week 3: 40h (E2E + coverage)
- Week 4: 40h (CI/CD + docs)

**Dev 2 (Performance)**: 160 hours
- Week 1: 40h (lazy loading + memoization)
- Week 2: 40h (virtualization + compression)
- Week 3: 40h (service worker + monitoring)
- Week 4: 40h (tuning + docs)

**Dev 3 (Accessibility)**: 160 hours
- Week 1: 40h (ARIA + keyboard)
- Week 2: 40h (forms + modals)
- Week 3: 40h (advanced patterns + testing)
- Week 4: 40h (validation + training)

### Expected Outcomes

**Quality**: Production-ready code with 82%+ test coverage
**Performance**: 2x faster load times, 3x smaller bundle
**Accessibility**: WCAG 2.1 AA compliant (96%)
**Timeline**: Complete in exactly 4 weeks
**Team**: Fully trained and capable of maintaining

---

## Next Steps (After Reading This Plan)

### Immediate Actions (Today)

1. **Team Assembly** (2 hours):
   - Identify 3 developers with required skills
   - Confirm availability for 4-week commitment
   - Review and approve plan

2. **Environment Setup** (2 hours):
   - Create Slack channel: #phase4-parallel
   - Set up GitHub project board
   - Schedule recurring meetings (standups + checkpoints)

3. **Kickoff Preparation** (1 hour):
   - Review agent documentation with team
   - Assign initial tasks for Week 1 Day 1
   - Prepare development environments

### Week 1 Day 1 Kickoff (Monday 9am)

**Agenda** (2 hours):
1. Review Phase 4 goals and timeline
2. Introduce parallel execution strategy
3. Review week-by-week targets
4. Answer questions
5. Begin Day 1 tasks (setup)

### Success Tracking

**Daily**: Slack updates in #phase4-parallel
**Weekly**: Checkpoint meetings with metrics review
**Continuous**: GitHub project board updates

---

**Ready to Execute**: ✅ Complete 4-week plan with daily tasks
**Resource Requirements**: 3 specialized developers, 4 weeks
**Expected ROI**: Production-ready Phase 4 in 1 month
**Next Action**: Assemble team and schedule kickoff meeting
