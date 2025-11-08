/**
 * Testing utilities for React Query hooks and components
 * Provides test wrappers, query client setup, and helper functions
 */
import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a fresh QueryClient for each test
 * Disables retries and caching for predictable tests
 *
 * @returns QueryClient configured for testing
 *
 * @example
 * ```typescript
 * const queryClient = createTestQueryClient();
 * queryClient.setQueryData(queryKeys.servers.all, mockServersData);
 * ```
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity, // Prevent automatic garbage collection during tests
        staleTime: 0, // Always consider data stale for testing
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence expected errors in tests
    },
  });
}

/**
 * Wrapper component with QueryClientProvider
 * Use with renderHook or render for testing
 *
 * @param queryClient - Optional QueryClient instance
 * @returns React component wrapper
 *
 * @example
 * ```typescript
 * const { result } = renderHook(() => useServers(), {
 *   wrapper: createQueryWrapper(),
 * });
 * ```
 */
export function createQueryWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/**
 * Custom render that includes QueryClient
 * Convenience wrapper for component testing
 *
 * @param ui - React component to render
 * @param options - Render options with optional queryClient
 * @returns Render result from @testing-library/react
 *
 * @example
 * ```typescript
 * const { getByText } = renderWithQueryClient(<ServersList />);
 * expect(getByText('GitHub')).toBeInTheDocument();
 * ```
 */
export function renderWithQueryClient(
  ui: ReactNode,
  options?: RenderOptions & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: createQueryWrapper(queryClient),
    ...renderOptions,
  });
}

/**
 * Wait for all React Query operations to settle
 * Useful for cleanup in afterEach hooks
 *
 * @param queryClient - QueryClient instance to clear
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await waitForQueries(queryClient);
 * });
 * ```
 */
export async function waitForQueries(queryClient: QueryClient) {
  await queryClient.getQueryCache().clear();
  await queryClient.getMutationCache().clear();
}

/**
 * Helper to setup initial cache data for tests
 * Eliminates need for mock API calls in some tests
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to set data for
 * @param data - Data to set in cache
 *
 * @example
 * ```typescript
 * const queryClient = createTestQueryClient();
 * setCacheData(queryClient, queryKeys.servers.all, mockServersData);
 * ```
 */
export function setCacheData<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: T
) {
  queryClient.setQueryData(queryKey, data);
}

/**
 * Helper to get current cache data for assertions
 *
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key to get data for
 * @returns Current cache data or undefined
 *
 * @example
 * ```typescript
 * const cachedServers = getCacheData(queryClient, queryKeys.servers.all);
 * expect(cachedServers.servers[0].status).toBe('connected');
 * ```
 */
export function getCacheData<T>(
  queryClient: QueryClient,
  queryKey: unknown[]
): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Mock SSE event for testing
 * Simulates SSE manager emitting an event
 *
 * @param eventType - SSE event type
 * @param data - Event data
 *
 * @example
 * ```typescript
 * import { sseManager } from '@ui/utils/sse-client';
 *
 * // In test
 * mockSSEEvent('servers_updated', { serverName: 'github' });
 * // Triggers cache invalidation via SSE manager
 * ```
 */
export function mockSSEEvent(eventType: string, data: unknown) {
  // Create custom event matching SSE format
  const event = new MessageEvent(eventType, {
    data: JSON.stringify(data),
  });

  // Dispatch on window for SSE manager to catch
  window.dispatchEvent(event);
}
