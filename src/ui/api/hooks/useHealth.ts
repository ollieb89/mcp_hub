/**
 * React Query hook for hub health endpoint
 * Provides health check data with automatic caching and refetching
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getHealth } from '../health';

/**
 * Fetch and cache hub health status
 *
 * Automatically refetches on window focus and reconnect.
 * Cache is invalidated via SSE events (hub_state, notification).
 *
 * @param options - React Query options for customization
 * @returns Query result with health data, loading state, and error
 *
 * @example
 * ```tsx
 * function HealthStatus() {
 *   const { data, isLoading, error } = useHealth();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <div>
 *       <p>Hub State: {data.state}</p>
 *       <p>Active Clients: {data.activeClients}</p>
 *       <p>Servers: {data.servers.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHealth(options?: Parameters<typeof useQuery>[0]) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    ...options,
  });
}
