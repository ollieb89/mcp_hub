/**
 * React Query hook for individual server detail
 * Provides single server data by filtering from all servers
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getServers } from '../servers';
import { APIError } from '../client';
import type { ServerInfo } from '../schemas/server.schema';

/**
 * Fetch and cache a specific MCP server's details
 *
 * This hook queries all servers and filters for the requested server.
 * It uses a separate query key per server for granular cache management.
 * Cache is invalidated via SSE events (server_state_changed).
 *
 * @param serverName - Exact name of the server to fetch
 * @param options - React Query options for customization
 * @returns Query result with server data, loading state, and error
 *
 * @example
 * ```tsx
 * function ServerDetail({ name }: { name: string }) {
 *   const { data: server, isLoading, error } = useServer(name);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <div>
 *       <h2>{server.displayName || server.name}</h2>
 *       <p>Status: {server.status}</p>
 *       <p>Transport: {server.transportType}</p>
 *       <p>Tools: {server.capabilities.tools.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useServer(
  serverName: string,
  options?: Parameters<typeof useQuery>[0]
) {
  return useQuery<ServerInfo>({
    queryKey: queryKeys.servers.detail(serverName),
    queryFn: async () => {
      const response = await getServers();
      const server = response.servers.find((s) => s.name === serverName);

      if (!server) {
        throw new APIError(
          'SERVER_NOT_FOUND',
          `Server "${serverName}" not found`
        );
      }

      return server;
    },
    ...options,
  });
}
