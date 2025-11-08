/**
 * React Query hook for servers list endpoint
 * Provides server connection data with automatic caching and refetching
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getServers } from '../servers';

/**
 * Fetch and cache all MCP server statuses
 *
 * Automatically refetches on window focus and reconnect.
 * Cache is invalidated via SSE events (server_state_changed, notification).
 *
 * @param options - React Query options for customization
 * @returns Query result with servers data, loading state, and error
 *
 * @example
 * ```tsx
 * function ServersList() {
 *   const { data, isLoading, error } = useServers();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <ul>
 *       {data.servers.map((server) => (
 *         <li key={server.name}>
 *           {server.displayName || server.name} - {server.status}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useServers(options?: Parameters<typeof useQuery>[0]) {
  return useQuery({
    queryKey: queryKeys.servers.all,
    queryFn: getServers,
    ...options,
  });
}
