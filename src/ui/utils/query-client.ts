/**
 * React Query configuration and query key factory
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Query keys factory for consistency and type safety
 * Use this to generate query keys throughout the application
 */
export const queryKeys = {
  health: ['health'] as const,
  servers: {
    all: ['servers'] as const,
    detail: (name: string) => ['servers', name] as const,
  },
  tools: {
    all: ['tools'] as const,
    filtered: (mode: string) => ['tools', 'filtered', mode] as const,
  },
  config: ['config'] as const,
  filtering: {
    stats: ['filtering', 'stats'] as const,
  },
  marketplace: {
    catalog: (params: Record<string, unknown>) => ['marketplace', 'catalog', params] as const,
  },
} as const;
