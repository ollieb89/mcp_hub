# MCP Hub UI Testing Strategy - Phase 4
**Quality Engineer**: Strategic Testing Implementation Plan
**Target**: 80%+ UI code coverage with comprehensive test suite
**Timeline**: 4 weeks systematic implementation

---

## Executive Summary

### Current State Analysis
- **Backend**: 482/482 tests passing (100% pass rate, 82.94% branch coverage)
- **UI**: 5 tests total (4 schema + 1 SSE client)
- **Coverage Gap**: ~95% of UI code untested
- **Risk Level**: 🔴 **HIGH** - Production UI changes without test safety net

### Testing Philosophy
**Behavior-Driven Testing** over implementation testing:
- Test observable outcomes, not internals
- Focus on user interactions and data flow
- Validate integration points (React Query + SSE + Zustand)
- Prevent regressions through strategic coverage

### Success Criteria
✅ **80%+ branch coverage** for UI code
✅ **100% critical path coverage** (server start/stop, config save, filtering)
✅ **Zero test failures** in CI/CD pipeline
✅ **Sub-3-second** test execution time
✅ **Production-grade** test quality matching backend standards

---

## Test Prioritization Matrix

### Tier 1: Critical Path (Must Have) - Week 1-2
| Component/Hook | Risk | User Impact | Complexity | Priority |
|----------------|------|-------------|------------|----------|
| useSaveConfig mutation | 🔴 HIGH | Data loss risk | High | **P0** |
| useServerMutations (start/stop) | 🔴 HIGH | Core functionality | Medium | **P0** |
| useFilteringStats + SSE | 🟡 MED | Real-time updates | High | **P1** |
| ConfigPreviewDialog | 🟡 MED | User safety | Medium | **P1** |
| ServersTable | 🟡 MED | Primary interface | Low | **P1** |

### Tier 2: High Value (Should Have) - Week 3
| Component/Hook | Risk | User Impact | Complexity | Priority |
|----------------|------|-------------|------------|----------|
| useHealth hook | 🟡 MED | Status visibility | Low | **P2** |
| useTools hook | 🟡 MED | Tool discovery | Low | **P2** |
| ToolsTable component | 🟢 LOW | Data display | Low | **P2** |
| FilteringCard component | 🟢 LOW | Settings UI | Low | **P2** |
| MetricCard component | 🟢 LOW | Dashboard UI | Low | **P2** |

### Tier 3: Nice to Have (Could Have) - Week 4
| Component/Hook | Risk | User Impact | Complexity | Priority |
|----------------|------|-------------|------------|----------|
| useMarketplace hook | 🟢 LOW | Discovery feature | Low | **P3** |
| UI Store (Zustand) | 🟢 LOW | UI state | Low | **P3** |
| SSE Store (Zustand) | 🟡 MED | Connection state | Medium | **P3** |
| Page integration tests | 🟡 MED | Flow validation | High | **P3** |
| E2E Playwright tests | 🟡 MED | End-to-end flows | High | **P3** |

### Coverage Targets by Test Type
```yaml
Unit Tests (Hooks + Components):
  target: 80% branch coverage
  focus: React Query caching, mutations, error handling

Integration Tests (Pages + Flows):
  target: 60% critical path coverage
  focus: Multi-component interactions, SSE events

E2E Tests (Playwright):
  target: Critical paths only
  focus: Server lifecycle, config save, filtering

Performance:
  execution_time: <3 seconds (unit + integration)
  parallel_execution: true
  ci_integration: GitHub Actions
```

---

## Tech Stack Recommendations

### Core Testing Framework (Already Installed)
```json
{
  "vitest": "^4.0.6",              // Test runner
  "@testing-library/react": "^16.3.0",
  "@testing-library/user-event": "^14.6.1",
  "@testing-library/jest-dom": "^6.9.1",
  "jsdom": "^27.1.0"
}
```

### Required Additions
```bash
# API mocking (CRITICAL - must install first)
bun add -d msw@latest

# E2E testing (install Week 4)
bun add -d @playwright/test
```

### MSW Setup (Mock Service Worker)
**Why MSW over vi.mock()?**
- ✅ Request-level mocking (more realistic than function mocking)
- ✅ Works with React Query without queryClient hacks
- ✅ Reusable handlers across tests
- ✅ Network-level interception (catches fetch/axios/etc.)
- ✅ Better TypeScript support with typed handlers

**Initial Setup**:
```typescript
// tests/ui/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      state: 'ready',
      activeClients: 2,
      servers: ['filesystem', 'github'],
      timestamp: new Date().toISOString(),
    });
  }),

  // Servers endpoint
  http.get('/api/servers', () => {
    return HttpResponse.json([
      {
        name: 'filesystem',
        displayName: 'File System',
        status: 'connected',
        transportType: 'stdio',
        capabilities: { tools: ['read', 'write'] },
        uptime: 123456,
      },
    ]);
  }),

  // Config endpoint
  http.get('/api/config', () => {
    return HttpResponse.json({
      config: { mcpServers: {} },
      version: 'v1-abc123',
      timestamp: new Date().toISOString(),
    });
  }),
];

// tests/ui/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Test Setup Integration**:
```typescript
// tests/setup.js (UPDATE existing file)
import '@testing-library/jest-dom';
import { server } from './ui/mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test (prevent cross-test pollution)
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

### React Query Test Utilities
```typescript
// tests/ui/utils/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';

/**
 * Create fresh QueryClient for each test (prevent cross-test cache pollution)
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Prevent garbage collection during tests
        staleTime: 0, // Always refetch in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Test wrapper with QueryClient + Router
 */
interface WrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * Custom render with QueryClient + Router providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  return {
    ...render(ui, {
      wrapper: createWrapper(queryClient),
      ...options,
    }),
    queryClient,
  };
}
```

---

## Test File Structure

### Directory Organization
```
tests/ui/
├── __tests__/                    # All test files here
│   ├── hooks/                    # React Query hooks (Week 1-2)
│   │   ├── useHealth.test.ts
│   │   ├── useServers.test.ts
│   │   ├── useConfig.test.ts
│   │   ├── useFilteringStats.test.ts
│   │   ├── useTools.test.ts
│   │   └── useMarketplace.test.ts
│   ├── mutations/                # React Query mutations (Week 1-2)
│   │   ├── server.mutations.test.ts
│   │   ├── config.mutations.test.ts
│   │   └── filtering.mutations.test.ts
│   ├── stores/                   # Zustand stores (Week 3)
│   │   ├── ui.store.test.ts
│   │   └── sse.store.test.ts
│   ├── components/               # Component tests (Week 2-3)
│   │   ├── MetricCard.test.tsx
│   │   ├── ServersTable.test.tsx
│   │   ├── ToolsTable.test.tsx
│   │   ├── FilteringCard.test.tsx
│   │   ├── ConfigTabs.test.tsx
│   │   ├── ConfigPreviewDialog.test.tsx
│   │   └── ...
│   ├── integration/              # Page integration tests (Week 3-4)
│   │   ├── DashboardPage.test.tsx
│   │   ├── ServersPage.test.tsx
│   │   ├── ConfigPage.test.tsx
│   │   └── ToolsPage.test.tsx
│   └── e2e/                      # Playwright E2E (Week 4)
│       ├── server-lifecycle.spec.ts
│       ├── config-save-flow.spec.ts
│       └── filtering-flow.spec.ts
├── mocks/                        # MSW handlers
│   ├── handlers.ts               # API mock handlers
│   └── server.ts                 # MSW server setup
└── utils/                        # Test utilities
    ├── test-utils.tsx            # React Query + Router wrapper
    ├── test-data.ts              # Mock data factories
    └── custom-matchers.ts        # Custom assertions
```

### Naming Conventions
- **Test files**: `[component-name].test.tsx` or `[hook-name].test.ts`
- **E2E specs**: `[feature-name].spec.ts`
- **Test suites**: `describe('[ComponentName]', () => { ... })`
- **Test cases**: `it('should [behavior]', async () => { ... })`

---

## Implementation Roadmap

### Week 1: Critical Mutations + MSW Setup (16-20 hours)
**Goal**: Test optimistic updates, error rollback, cache invalidation

**Monday-Tuesday: MSW Setup + Infrastructure**
- [ ] Install MSW: `bun add -d msw@latest`
- [ ] Create MSW handlers (`tests/ui/mocks/handlers.ts`)
- [ ] Create MSW server setup (`tests/ui/mocks/server.ts`)
- [ ] Update `tests/setup.js` with MSW lifecycle
- [ ] Create React Query test utils (`tests/ui/utils/test-utils.tsx`)
- [ ] Validate MSW working with simple health hook test

**Wednesday-Thursday: Config Mutations (P0)**
- [ ] Test `useSaveConfig` optimistic update flow
- [ ] Test `useSaveConfig` error rollback scenario
- [ ] Test `useSaveConfig` version conflict handling
- [ ] Test cache invalidation on save success

**Friday: Server Mutations (P0)**
- [ ] Test `useStartServer` mutation
- [ ] Test `useStopServer` mutation
- [ ] Test server mutation error handling
- [ ] Test optimistic server status updates

**Deliverables**:
- ✅ MSW fully integrated
- ✅ 2 critical mutation files tested (config + server)
- ✅ Optimistic update + rollback patterns validated

---

### Week 2: Query Hooks + High-Priority Components (20-24 hours)
**Goal**: Test all React Query hooks with caching behavior

**Monday-Tuesday: Query Hooks (P1-P2)**
- [ ] Test `useHealth` hook (caching, refetch, SSE invalidation)
- [ ] Test `useServers` hook (caching, polling integration)
- [ ] Test `useConfig` hook (caching, mutation updates)
- [ ] Test `useFilteringStats` hook (SSE invalidation)
- [ ] Test `useTools` hook (filtering, search)
- [ ] Test `useMarketplace` hook (query params, pagination)

**Wednesday-Thursday: Critical Components (P1)**
- [ ] Test `ServersTable` (status display, start/stop actions)
- [ ] Test `ConfigPreviewDialog` (diff view, version warning)
- [ ] Test `FilteringCard` (mode switching, enable/disable)

**Friday: Buffer + Code Review**
- [ ] Fix failing tests from Week 1-2
- [ ] Code review and refactor
- [ ] Update documentation

**Deliverables**:
- ✅ All 6 React Query hooks tested
- ✅ 3 high-priority components tested
- ✅ ~60% UI code coverage achieved

---

### Week 3: Remaining Components + Integration Tests (20-24 hours)
**Goal**: Component unit tests + page integration tests

**Monday-Tuesday: Component Tests (P2-P3)**
- [ ] Test `MetricCard` (data display, formatting)
- [ ] Test `ToolsTable` (filtering, sorting, search)
- [ ] Test `ConfigTabs` (tab switching, validation)
- [ ] Test `ActiveFiltersCard` (filter display, removal)
- [ ] Test `RawJsonEditor` (Monaco integration, validation)

**Wednesday-Thursday: Zustand Store Tests (P3)**
- [ ] Test `ui.store.ts` (sidebar, modals, snackbars, theme)
- [ ] Test `sse.store.ts` (connection state, reconnection)

**Friday: Integration Tests (P3)**
- [ ] Update `DashboardPage.test.tsx` to use MSW
- [ ] Update `ServersPage.test.tsx` to use MSW + React Query
- [ ] Test `ConfigPage` save flow with preview dialog
- [ ] Test `ToolsPage` filtering and search

**Deliverables**:
- ✅ All priority components tested
- ✅ Zustand stores fully tested
- ✅ Page integration tests refactored to MSW
- ✅ ~75% UI code coverage achieved

---

### Week 4: E2E Tests + Quality Gates (16-20 hours)
**Goal**: End-to-end critical paths + CI/CD integration

**Monday-Tuesday: Playwright Setup + E2E Tests**
- [ ] Install Playwright: `bun add -d @playwright/test`
- [ ] Create Playwright config (`playwright.config.ts`)
- [ ] Test server start/stop flow (E2E)
- [ ] Test config save flow with preview (E2E)
- [ ] Test filtering mode change (E2E)

**Wednesday-Thursday: Quality Gates + CI/CD**
- [ ] Configure coverage thresholds in `vitest.config.ts`
- [ ] Add `test:ui` script to `package.json`
- [ ] Create GitHub Actions workflow for UI tests
- [ ] Document testing patterns and best practices

**Friday: Final Validation**
- [ ] Run full test suite (backend + UI)
- [ ] Validate 80%+ UI coverage achieved
- [ ] Performance validation (<3s execution)
- [ ] Documentation review and finalization

**Deliverables**:
- ✅ E2E critical paths tested
- ✅ CI/CD pipeline integrated
- ✅ 80%+ UI code coverage achieved
- ✅ Quality gates enforced

---

## Sample Test Implementations

### 1. React Query Hook Test (with MSW)

**File**: `tests/ui/__tests__/hooks/useHealth.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useHealth } from '@api/hooks/useHealth';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';

describe('useHealth', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('should fetch health data successfully', async () => {
    // Arrange: MSW handler already configured in handlers.ts

    // Act
    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Assert: Success state after fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      state: 'ready',
      activeClients: 2,
      servers: ['filesystem', 'github'],
      timestamp: expect.any(String),
    });
  });

  it('should handle API error gracefully', async () => {
    // Arrange: Override handler to return error
    server.use(
      http.get('/api/health', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    // Act
    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Error state
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('should cache data for 30 seconds (staleTime)', async () => {
    // Arrange
    let requestCount = 0;
    server.use(
      http.get('/api/health', () => {
        requestCount++;
        return HttpResponse.json({
          state: 'ready',
          activeClients: requestCount,
          servers: [],
          timestamp: new Date().toISOString(),
        });
      })
    );

    // Act: First render
    const { result: result1 } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    expect(result1.current.data?.activeClients).toBe(1);

    // Act: Second render (should use cache, not refetch)
    const { result: result2 } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    // Assert: Same data (cached), request count still 1
    expect(result2.current.data?.activeClients).toBe(1);
    expect(requestCount).toBe(1); // Only 1 request made
  });

  it('should invalidate cache on SSE hub_state event', async () => {
    // Arrange: Initial data fetch
    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const initialData = result.current.data;

    // Act: Simulate SSE event triggering cache invalidation
    await queryClient.invalidateQueries({ queryKey: ['health'] });

    // Assert: Hook refetches after invalidation
    await waitFor(() => {
      expect(result.current.isRefetching).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should be fresh (new fetch)
    expect(result.current.data).not.toBe(initialData);
  });
});
```

---

### 2. Zustand Store Test

**File**: `tests/ui/__tests__/stores/ui.store.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '@ui/store/ui.store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const { getState, setState } = useUIStore;
    setState({
      ...getState(),
      isSidebarOpen: true,
      activeModal: null,
      modalData: null,
      snackbars: [],
      theme: 'dark',
    });
  });

  describe('Sidebar state', () => {
    it('should toggle sidebar open/closed', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Assert: Initial state
      expect(result.current.isSidebarOpen).toBe(true);

      // Act: Toggle sidebar
      act(() => {
        result.current.toggleSidebar();
      });

      // Assert: Sidebar closed
      expect(result.current.isSidebarOpen).toBe(false);

      // Act: Toggle again
      act(() => {
        result.current.toggleSidebar();
      });

      // Assert: Sidebar open again
      expect(result.current.isSidebarOpen).toBe(true);
    });

    it('should set sidebar open state directly', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Act: Set sidebar closed
      act(() => {
        result.current.setSidebarOpen(false);
      });

      // Assert
      expect(result.current.isSidebarOpen).toBe(false);

      // Act: Set sidebar open
      act(() => {
        result.current.setSidebarOpen(true);
      });

      // Assert
      expect(result.current.isSidebarOpen).toBe(true);
    });
  });

  describe('Modal state', () => {
    it('should open modal with data', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());
      const modalData = { serverId: 'test-server' };

      // Act: Open modal
      act(() => {
        result.current.openModal('server-settings', modalData);
      });

      // Assert
      expect(result.current.activeModal).toBe('server-settings');
      expect(result.current.modalData).toEqual(modalData);
    });

    it('should close modal and clear data', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal('server-settings', { serverId: 'test' });
      });

      // Act: Close modal
      act(() => {
        result.current.closeModal();
      });

      // Assert
      expect(result.current.activeModal).toBeNull();
      expect(result.current.modalData).toBeNull();
    });
  });

  describe('Snackbar state', () => {
    it('should add snackbar with unique ID', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Act: Add snackbar
      act(() => {
        result.current.addSnackbar('Test message', 'success');
      });

      // Assert
      expect(result.current.snackbars).toHaveLength(1);
      expect(result.current.snackbars[0]).toMatchObject({
        id: expect.any(String),
        message: 'Test message',
        severity: 'success',
      });
    });

    it('should add multiple snackbars', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Act: Add multiple snackbars
      act(() => {
        result.current.addSnackbar('Message 1', 'info');
        result.current.addSnackbar('Message 2', 'error');
      });

      // Assert
      expect(result.current.snackbars).toHaveLength(2);
      expect(result.current.snackbars[0].message).toBe('Message 1');
      expect(result.current.snackbars[1].message).toBe('Message 2');
    });

    it('should remove snackbar by ID', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addSnackbar('Test message', 'info');
      });

      const snackbarId = result.current.snackbars[0].id;

      // Act: Remove snackbar
      act(() => {
        result.current.removeSnackbar(snackbarId);
      });

      // Assert
      expect(result.current.snackbars).toHaveLength(0);
    });

    it('should default to info severity', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Act: Add snackbar without severity
      act(() => {
        result.current.addSnackbar('Test message');
      });

      // Assert
      expect(result.current.snackbars[0].severity).toBe('info');
    });
  });

  describe('Theme state', () => {
    it('should toggle theme between light and dark', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Assert: Initial theme
      expect(result.current.theme).toBe('dark');

      // Act: Toggle theme
      act(() => {
        result.current.toggleTheme();
      });

      // Assert: Theme changed to light
      expect(result.current.theme).toBe('light');

      // Act: Toggle again
      act(() => {
        result.current.toggleTheme();
      });

      // Assert: Theme back to dark
      expect(result.current.theme).toBe('dark');
    });

    it('should set theme directly', () => {
      // Arrange
      const { result } = renderHook(() => useUIStore());

      // Act: Set theme to light
      act(() => {
        result.current.setTheme('light');
      });

      // Assert
      expect(result.current.theme).toBe('light');

      // Act: Set theme to dark
      act(() => {
        result.current.setTheme('dark');
      });

      // Assert
      expect(result.current.theme).toBe('dark');
    });
  });
});
```

---

### 3. Component Test (with Testing Library)

**File**: `tests/ui/__tests__/components/MetricCard.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricCard from '@components/MetricCard';

describe('MetricCard', () => {
  it('should render metric value and label', () => {
    // Arrange & Act
    render(
      <MetricCard
        title="Active Servers"
        value={5}
        icon={<span data-testid="server-icon" />}
      />
    );

    // Assert
    expect(screen.getByText('Active Servers')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByTestId('server-icon')).toBeInTheDocument();
  });

  it('should render with subtitle', () => {
    // Arrange & Act
    render(
      <MetricCard
        title="Tool Count"
        value={42}
        subtitle="Across all servers"
        icon={<span data-testid="tool-icon" />}
      />
    );

    // Assert
    expect(screen.getByText('Tool Count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Across all servers')).toBeInTheDocument();
  });

  it('should render with trend indicator', () => {
    // Arrange & Act
    render(
      <MetricCard
        title="Cache Hit Rate"
        value="85%"
        trend={{ direction: 'up', value: 5 }}
        icon={<span data-testid="cache-icon" />}
      />
    );

    // Assert
    expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('should apply custom color', () => {
    // Arrange & Act
    const { container } = render(
      <MetricCard
        title="Error Count"
        value={3}
        color="error"
        icon={<span data-testid="error-icon" />}
      />
    );

    // Assert: Card has error color class
    const card = container.querySelector('[class*="error"]');
    expect(card).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    // Arrange & Act
    render(
      <MetricCard
        title="Loading Metric"
        value={null}
        loading={true}
        icon={<span data-testid="loading-icon" />}
      />
    );

    // Assert: Skeleton loader shown instead of value
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    expect(screen.queryByText('Loading Metric')).toBeInTheDocument();
  });
});
```

---

### 4. Integration Test (Page with React Query + MSW)

**File**: `tests/ui/__tests__/integration/ConfigPage.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { renderWithProviders } from '../../utils/test-utils';
import ConfigPage from '@pages/ConfigPage';

describe('ConfigPage Integration', () => {
  const mockConfig = {
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      },
    },
  };

  beforeEach(() => {
    // Setup default handlers
    server.use(
      http.get('/api/config', () => {
        return HttpResponse.json({
          config: mockConfig,
          version: 'v1-abc123',
          timestamp: new Date().toISOString(),
        });
      })
    );
  });

  it('should load and display config on mount', async () => {
    // Arrange & Act
    renderWithProviders(<ConfigPage />);

    // Assert: Loading state
    expect(screen.getByTestId('config-loading')).toBeInTheDocument();

    // Assert: Config loaded and displayed
    await waitFor(() => {
      expect(screen.getByText(/filesystem/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('config-loading')).not.toBeInTheDocument();
  });

  it('should show preview dialog before saving', async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithProviders(<ConfigPage />);

    // Wait for config to load
    await waitFor(() => {
      expect(screen.queryByTestId('config-loading')).not.toBeInTheDocument();
    });

    // Act: Edit config in Monaco editor (simplified)
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Assert: Preview dialog shown
    await waitFor(() => {
      expect(screen.getByText(/preview changes/i)).toBeInTheDocument();
    });
  });

  it('should handle version conflict error', async () => {
    // Arrange
    const user = userEvent.setup();

    // Mock version conflict response
    server.use(
      http.post('/api/config', () => {
        return new HttpResponse(null, {
          status: 409,
          statusText: 'Config version mismatch',
        });
      })
    );

    renderWithProviders(<ConfigPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('config-loading')).not.toBeInTheDocument();
    });

    // Act: Try to save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Confirm in preview dialog
    const confirmButton = await screen.findByRole('button', {
      name: /confirm/i,
    });
    await user.click(confirmButton);

    // Assert: Error message shown
    await waitFor(() => {
      expect(
        screen.getByText(/config was modified by another process/i)
      ).toBeInTheDocument();
    });
  });

  it('should successfully save config and update cache', async () => {
    // Arrange
    const user = userEvent.setup();
    const updatedConfig = {
      ...mockConfig,
      mcpServers: {
        ...mockConfig.mcpServers,
        github: { command: 'npx', args: ['github-server'] },
      },
    };

    // Mock successful save
    server.use(
      http.post('/api/config', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          config: body.config,
          version: 'v1-xyz789', // New version
          timestamp: new Date().toISOString(),
        });
      })
    );

    renderWithProviders(<ConfigPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('config-loading')).not.toBeInTheDocument();
    });

    // Act: Save config
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    const confirmButton = await screen.findByRole('button', {
      name: /confirm/i,
    });
    await user.click(confirmButton);

    // Assert: Success message
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });

    // Assert: Preview dialog closed
    expect(screen.queryByText(/preview changes/i)).not.toBeInTheDocument();
  });
});
```

---

### 5. E2E Test (Playwright Spec)

**File**: `tests/ui/__tests__/e2e/server-lifecycle.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Server Lifecycle Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to servers page
    await page.goto('http://localhost:7000/servers');

    // Wait for servers to load
    await page.waitForSelector('[data-testid="servers-table"]');
  });

  test('should start a disabled server', async ({ page }) => {
    // Arrange: Find a disabled server row
    const serverRow = page.locator(
      '[data-testid="server-row"][data-status="disabled"]'
    ).first();
    const serverName = await serverRow.getAttribute('data-server-name');

    // Act: Click the toggle switch to start server
    const toggleSwitch = serverRow.locator('input[type="checkbox"]');
    await toggleSwitch.click();

    // Assert: Loading state appears
    await expect(
      serverRow.locator('[data-testid="server-status-loading"]')
    ).toBeVisible();

    // Assert: Server status changes to connected
    await expect(serverRow).toHaveAttribute('data-status', 'connected', {
      timeout: 10000,
    });

    // Assert: Success notification shown
    await expect(
      page.locator('[data-testid="snackbar"]', {
        hasText: `Server ${serverName} started successfully`,
      })
    ).toBeVisible();
  });

  test('should stop a running server', async ({ page }) => {
    // Arrange: Find a connected server row
    const serverRow = page.locator(
      '[data-testid="server-row"][data-status="connected"]'
    ).first();
    const serverName = await serverRow.getAttribute('data-server-name');

    // Act: Click the toggle switch to stop server
    const toggleSwitch = serverRow.locator('input[type="checkbox"]');
    await toggleSwitch.click();

    // Assert: Loading state appears
    await expect(
      serverRow.locator('[data-testid="server-status-loading"]')
    ).toBeVisible();

    // Assert: Server status changes to disabled
    await expect(serverRow).toHaveAttribute('data-status', 'disabled', {
      timeout: 10000,
    });

    // Assert: Success notification shown
    await expect(
      page.locator('[data-testid="snackbar"]', {
        hasText: `Server ${serverName} stopped successfully`,
      })
    ).toBeVisible();
  });

  test('should show error when start fails', async ({ page }) => {
    // Arrange: Mock API to return error (requires MSW or network interception)
    await page.route('**/api/servers/*/start', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to start server' }),
      });
    });

    const serverRow = page.locator(
      '[data-testid="server-row"][data-status="disabled"]'
    ).first();

    // Act: Try to start server
    const toggleSwitch = serverRow.locator('input[type="checkbox"]');
    await toggleSwitch.click();

    // Assert: Error notification shown
    await expect(
      page.locator('[data-testid="snackbar"][data-severity="error"]', {
        hasText: /failed to start/i,
      })
    ).toBeVisible();

    // Assert: Server status remains disabled
    await expect(serverRow).toHaveAttribute('data-status', 'disabled');
  });
});
```

---

## Quality Gates

### Coverage Thresholds (vitest.config.ts)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setup.js')],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/ui/**/*.{ts,tsx}'],
      exclude: [
        'src/ui/**/*.test.{ts,tsx}',
        'src/ui/**/__tests__/**',
        'src/ui/main.tsx', // Entry point
        'src/ui/vite-env.d.ts', // Type definitions
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@api': path.resolve(__dirname, 'src/ui/api'),
      '@components': path.resolve(__dirname, 'src/ui/components'),
      '@pages': path.resolve(__dirname, 'src/ui/pages'),
      '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
      '@theme': path.resolve(__dirname, 'src/ui/theme'),
    },
  },
});
```

### NPM Scripts (package.json)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest run --coverage src/ui",
    "test:ui:watch": "vitest watch src/ui",
    "test:e2e": "playwright test",
    "test:all": "bun run test && bun run test:e2e",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --ui --coverage"
  }
}
```

### CI/CD Integration (GitHub Actions)

**File**: `.github/workflows/ui-tests.yml`

```yaml
name: UI Tests

on:
  pull_request:
    branches: [main]
    paths:
      - 'src/ui/**'
      - 'tests/ui/**'
  push:
    branches: [main]
    paths:
      - 'src/ui/**'
      - 'tests/ui/**'

jobs:
  ui-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run UI unit tests
        run: bun run test:ui

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bun run test:e2e

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: ui-tests
          name: ui-coverage

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
```

### Pre-Commit Hooks (Optional)

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run UI tests before committing UI code changes
if git diff --cached --name-only | grep -q '^src/ui/'; then
  echo "Running UI tests..."
  bun run test:ui
fi
```

---

## Regression Prevention Strategies

### 1. Mutation Testing Pattern
**Always test 3 scenarios for mutations**:
- ✅ Success path (optimistic update + confirmation)
- ❌ Error path (rollback to previous state)
- 🔄 Cache invalidation (related queries refetch)

### 2. Component Testing Checklist
For each component test:
- [ ] Renders with required props
- [ ] Handles loading state
- [ ] Handles error state
- [ ] User interactions trigger expected behaviors
- [ ] Data transformations work correctly

### 3. Integration Testing Focus
Page integration tests should validate:
- [ ] Multi-component coordination
- [ ] SSE event handling
- [ ] Optimistic UI updates
- [ ] Error recovery flows

### 4. E2E Critical Paths Only
Focus E2E on business-critical flows:
- [ ] Server start/stop lifecycle
- [ ] Config save with version checking
- [ ] Filtering mode changes
- [ ] Error states with recovery

### 5. Test Data Management
**Create reusable test data factories**:

```typescript
// tests/ui/utils/test-data.ts
export const createMockServer = (overrides = {}) => ({
  name: 'test-server',
  displayName: 'Test Server',
  status: 'connected',
  transportType: 'stdio',
  capabilities: { tools: [] },
  uptime: 12345,
  ...overrides,
});

export const createMockConfig = (overrides = {}) => ({
  config: { mcpServers: {} },
  version: 'v1-abc123',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createMockFilteringStats = (overrides = {}) => ({
  enabled: true,
  mode: 'category',
  totalTools: 10,
  filteredTools: 3,
  exposedTools: 7,
  filterRate: 0.3,
  ...overrides,
});
```

---

## Performance Targets

### Test Execution Time
```yaml
Unit Tests (Hooks + Components):
  target: <2 seconds
  max: 3 seconds

Integration Tests (Pages):
  target: <5 seconds
  max: 10 seconds

E2E Tests (Playwright):
  target: <30 seconds per spec
  max: 60 seconds per spec

Total Suite:
  target: <1 minute
  max: 2 minutes
```

### Optimization Strategies
- **Parallel execution**: Vitest runs tests in parallel by default
- **Test isolation**: Each test gets fresh QueryClient (no cross-test pollution)
- **MSW caching**: Reuse handlers across tests
- **Minimal setup**: Only render components/hooks under test

---

## Success Metrics

### Coverage Achievement
- **Week 1**: 20-30% UI coverage (critical mutations)
- **Week 2**: 60-70% UI coverage (hooks + components)
- **Week 3**: 75-80% UI coverage (remaining components + stores)
- **Week 4**: 80%+ UI coverage (E2E + final validation)

### Quality Indicators
- ✅ **0 test failures** in CI/CD
- ✅ **100% critical path coverage** (P0-P1 priorities)
- ✅ **Sub-3-second** test execution (unit + integration)
- ✅ **Zero flaky tests** (consistent pass rate)
- ✅ **MSW integration** working across all tests

### Documentation Standards
- ✅ Test patterns documented (this file)
- ✅ Test utilities well-documented (JSDoc)
- ✅ Sample tests serve as reference implementations
- ✅ CI/CD pipeline fully configured

---

## Next Steps for Team

### Immediate Actions (This Week)
1. **Install MSW**: `bun add -d msw@latest`
2. **Review this document**: Team alignment on strategy
3. **Create test infrastructure**: MSW handlers + test utils
4. **Start Week 1**: Critical mutation tests (config + server)

### Questions to Clarify
1. **E2E Environment**: Should Playwright tests run against local dev server or staging?
2. **Coverage Enforcement**: Block PRs if coverage drops below 80%?
3. **Test Ownership**: Who reviews/approves test code changes?
4. **Performance Budget**: Are 3-second test runs acceptable or should we target faster?

### Resources Needed
- **Developer Time**: ~20 hours/week for 4 weeks
- **Review Time**: ~2 hours/week for test code reviews
- **CI/CD Credits**: GitHub Actions compute time (minimal cost)

---

## Appendix: Test Pattern Reference

### AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something', () => {
  // Arrange: Setup test conditions
  const input = 'test';

  // Act: Execute the behavior
  const result = processInput(input);

  // Assert: Verify the outcome
  expect(result).toBe('expected');
});
```

### React Query Testing Pattern
```typescript
it('should fetch data successfully', async () => {
  // Arrange: Fresh queryClient + MSW handler
  const queryClient = createTestQueryClient();

  // Act: Render hook with providers
  const { result } = renderHook(() => useData(), {
    wrapper: createWrapper(queryClient),
  });

  // Assert: Wait for success state
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toEqual(expectedData);
});
```

### Mutation Testing Pattern
```typescript
it('should handle optimistic update and rollback', async () => {
  // Arrange: Mock error response
  server.use(
    http.post('/api/endpoint', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['data'], { value: 'original' });

  // Act: Execute mutation
  const { result } = renderHook(() => useMutation(), {
    wrapper: createWrapper(queryClient),
  });

  act(() => {
    result.current.mutate({ value: 'updated' });
  });

  // Assert: Optimistic update applied
  expect(queryClient.getQueryData(['data'])).toEqual({ value: 'updated' });

  // Assert: Rollback on error
  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(queryClient.getQueryData(['data'])).toEqual({ value: 'original' });
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Author**: Quality Engineer
**Status**: Ready for Implementation
