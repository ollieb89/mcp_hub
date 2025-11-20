/**
 * React Query test utilities
 * Provides test wrapper components and custom render functions
 */
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';

/**
 * Create fresh QueryClient for each test
 * Prevents cross-test cache pollution and ensures test isolation
 *
 * Configuration optimized for testing:
 * - retry: false (fail fast, no retry delays)
 * - gcTime: Infinity (prevent garbage collection during test)
 * - staleTime: 0 (always consider data stale, refetch on mount)
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Prevent garbage collection during tests
        staleTime: 0, // Always refetch in tests (no caching between renders)
        refetchOnWindowFocus: false, // Disable focus refetch in tests
        refetchOnReconnect: false, // Disable reconnect refetch in tests
      },
      mutations: {
        retry: false, // Disable mutation retries in tests
      },
    },
    logger: {
      // Silence React Query logs during tests
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Props for test wrapper component
 */
interface WrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Create test wrapper with QueryClient + Router providers
 * @param queryClient - Optional custom QueryClient instance
 */
export function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * Custom render function with QueryClient + Router providers
 *
 * Automatically wraps components in QueryClientProvider and MemoryRouter.
 * Each render gets a fresh QueryClient by default to prevent test pollution.
 *
 * @param ui - React element to render
 * @param options - Render options (queryClient can override default)
 * @returns Render result with queryClient instance
 *
 * @example
 * ```tsx
 * // Basic usage (auto-creates QueryClient)
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // Custom QueryClient (for pre-seeding cache)
 * const queryClient = createTestQueryClient();
 * queryClient.setQueryData(['servers'], mockServersData);
 * const { getByText } = renderWithProviders(<MyComponent />, { queryClient });
 * ```
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
    queryClient, // Expose queryClient for assertions
  };
}

/**
 * Wait for React Query to finish loading/refetching
 * Useful when testing components that fetch data on mount
 *
 * @param queryClient - QueryClient instance to monitor
 * @returns Promise that resolves when all queries are settled
 *
 * @example
 * ```tsx
 * const queryClient = createTestQueryClient();
 * renderWithProviders(<MyComponent />, { queryClient });
 *
 * await waitForQueryToSettle(queryClient);
 * expect(screen.getByText('Data loaded')).toBeInTheDocument();
 * ```
 */
export async function waitForQueryToSettle(queryClient: QueryClient) {
  return new Promise<void>((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.state.fetchStatus === 'idle') {
        unsubscribe();
        resolve();
      }
    });
  });
}
