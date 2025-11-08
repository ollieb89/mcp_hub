# UI Testing Quick Start Guide
**Get Week 1 Testing Running in 30 Minutes**

## Prerequisites Checklist

✅ **Already installed** (from package.json):
- Vitest ^4.0.6
- @testing-library/react ^16.3.0
- @testing-library/user-event ^14.6.1
- @testing-library/jest-dom ^6.9.1
- jsdom ^27.1.0

❌ **Need to install**:
- MSW (Mock Service Worker)

## Step 1: Install MSW (5 minutes)

```bash
# Install MSW as dev dependency
bun add -d msw@latest

# Verify installation
bun list msw
```

**Expected output**: `msw@2.x.x` (latest version)

## Step 2: Integrate MSW Setup (2 minutes)

Edit `tests/setup.js` and add this line at the top:

```javascript
// tests/setup.js (ADD THIS LINE)
import './setup-msw.js';
import '@testing-library/jest-dom/vitest';
// ... rest of file
```

**What this does**:
- Starts MSW server before all tests
- Resets handlers after each test (prevents pollution)
- Cleans up MSW server after test suite completes

## Step 3: Validate MSW Integration (3 minutes)

Create a simple validation test:

```typescript
// tests/ui/__tests__/hooks/msw-validation.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHealth } from '@api/hooks/useHealth';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';

describe('MSW Integration Validation', () => {
  it('should fetch health data using MSW mock', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      state: 'ready',
      activeClients: 2,
      servers: expect.arrayContaining(['filesystem', 'github']),
    });
  });
});
```

Run the validation test:

```bash
bun run vitest run tests/ui/__tests__/hooks/msw-validation.test.ts
```

**Expected output**: ✅ 1 passing test

If test passes, MSW is working correctly! 🎉

## Step 4: Week 1 - Critical Mutation Tests (Start Here)

### Test 1: Config Save Mutation (Optimistic Update)

Create `tests/ui/__tests__/mutations/config.mutations.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useSaveConfig } from '@api/mutations/config.mutations';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';
import { createMockConfig } from '../../utils/test-data';

describe('useSaveConfig', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // Pre-seed cache with initial config
    const initialConfig = createMockConfig();
    queryClient.setQueryData(['config'], initialConfig);
  });

  it('should optimistically update config on save', async () => {
    // Arrange
    const updatedConfig = {
      mcpServers: {
        filesystem: { command: 'npx', args: ['fs-server'] },
      },
    };

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: updatedConfig,
        expectedVersion: 'v1-abc123',
      });
    });

    // Assert: Optimistic update applied immediately
    const cachedData = queryClient.getQueryData(['config']);
    expect(cachedData).toMatchObject({
      config: updatedConfig,
      version: 'v1-abc123', // Old version (not confirmed yet)
    });

    // Assert: Mutation succeeds and updates version
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const finalData = queryClient.getQueryData(['config']);
    expect(finalData).toMatchObject({
      config: updatedConfig,
      version: 'v1-xyz789', // New version from server
    });
  });

  it('should rollback on error', async () => {
    // Arrange: Mock API error
    server.use(
      http.post('/api/config', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const originalConfig = queryClient.getQueryData(['config']);
    const updatedConfig = { mcpServers: { new: {} } };

    // Act: Trigger mutation
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: updatedConfig,
        expectedVersion: 'v1-abc123',
      });
    });

    // Assert: Optimistic update applied
    expect(queryClient.getQueryData(['config'])).toMatchObject({
      config: updatedConfig,
    });

    // Assert: Error occurs and rollback happens
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(['config'])).toEqual(originalConfig);
  });

  it('should handle version conflict (409)', async () => {
    // Arrange: Mock version conflict
    server.use(
      http.post('/api/config', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Config version mismatch' }),
          { status: 409 }
        );
      })
    );

    // Act
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: { mcpServers: {} },
        expectedVersion: 'v1-old-version', // Wrong version
      });
    });

    // Assert: Error with 409 status
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

Run the test:

```bash
bun run vitest run tests/ui/__tests__/mutations/config.mutations.test.ts
```

**Expected**: ✅ 3 passing tests

### Test 2: Server Mutations (Start/Stop)

Create `tests/ui/__tests__/mutations/server.mutations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStartServer, useStopServer } from '@api/mutations/server.mutations';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';

describe('Server Mutations', () => {
  describe('useStartServer', () => {
    it('should start server successfully', async () => {
      const queryClient = createTestQueryClient();

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate('filesystem');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        status: 'ok',
        server: 'filesystem',
      });
    });

    it('should handle start error', async () => {
      const queryClient = createTestQueryClient();

      // Mock API error
      server.use(
        http.post('/api/servers/:name/start', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate('filesystem');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useStopServer', () => {
    it('should stop server successfully', async () => {
      const queryClient = createTestQueryClient();

      const { result } = renderHook(() => useStopServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate('filesystem');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        status: 'ok',
        server: 'filesystem',
      });
    });
  });
});
```

## Step 5: Run All Week 1 Tests (1 minute)

```bash
# Run all mutation tests
bun run vitest run tests/ui/__tests__/mutations/

# Expected output:
# ✅ config.mutations.test.ts (3 tests)
# ✅ server.mutations.test.ts (3 tests)
# Total: 6 passing tests
```

## Step 6: Check Coverage (2 minutes)

```bash
# Run tests with coverage
bun run vitest run --coverage tests/ui/__tests__/mutations/

# View coverage report
bun run vitest run --coverage --coverage.reporter=html
# Open coverage/index.html in browser
```

**Expected coverage after Week 1**:
- Mutations files: ~90% (optimistic updates, rollback, error handling)
- Overall UI coverage: ~20-30% (just mutations tested)

## Common Issues & Solutions

### Issue 1: MSW not intercepting requests

**Symptom**: Test fails with "Network request failed" or similar

**Solution**:
```typescript
// Check MSW server is running
import { server } from '../../mocks/server';

beforeAll(() => {
  server.listen(); // Should be in setup-msw.js
});
```

### Issue 2: QueryClient cache pollution between tests

**Symptom**: Tests pass individually but fail when run together

**Solution**:
```typescript
// Always create fresh QueryClient in beforeEach
beforeEach(() => {
  queryClient = createTestQueryClient(); // Fresh client per test
});
```

### Issue 3: React Query not refetching

**Symptom**: Hook returns stale data or doesn't update

**Solution**:
```typescript
// Use waitFor() to wait for async updates
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});

// Don't assert immediately after act()
```

## Next Steps

After Week 1 tests pass:

1. **Week 2**: Query hooks (useHealth, useServers, useConfig, etc.)
2. **Week 3**: Component tests + Zustand stores
3. **Week 4**: E2E tests with Playwright

## Reference Files Created

✅ Test infrastructure (already created):
- `tests/ui/mocks/handlers.ts` - MSW request handlers
- `tests/ui/mocks/server.ts` - MSW server setup
- `tests/ui/utils/test-utils.tsx` - React Query test wrappers
- `tests/ui/utils/test-data.ts` - Mock data factories
- `tests/setup-msw.js` - MSW lifecycle integration

✅ Documentation:
- `claudedocs/UI_TESTING_STRATEGY_PHASE4.md` - Complete strategy
- `claudedocs/UI_TESTING_QUICK_START.md` - This guide

## Get Help

**MSW Documentation**: https://mswjs.io/docs/
**React Query Testing**: https://tanstack.com/query/latest/docs/react/guides/testing
**Testing Library**: https://testing-library.com/docs/react-testing-library/intro/

---

**Time to first passing test**: ~30 minutes
**Week 1 completion**: 16-20 hours (6 mutation tests + infrastructure)
**Full strategy completion**: 4 weeks (80%+ UI coverage)
