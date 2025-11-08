/**
 * React Query hook for tools aggregation endpoint
 * Provides aggregated tool data from all connected servers
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getTools } from '../tools';

/**
 * Fetch and cache tools from all MCP servers
 *
 * Automatically refetches on window focus and reconnect.
 * Cache is invalidated via SSE events (tools_changed, tool_list_changed).
 * Returns aggregated tool list with server attribution and category information.
 *
 * @param options - React Query options for customization
 * @returns Query result with tools data, loading state, and error
 *
 * @example
 * ```tsx
 * function ToolsTable() {
 *   const { data, isLoading, error } = useTools();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <table>
 *       <thead>
 *         <tr>
 *           <th>Tool</th>
 *           <th>Server</th>
 *           <th>Categories</th>
 *           <th>Status</th>
 *         </tr>
 *       </thead>
 *       <tbody>
 *         {data.tools.map((tool) => (
 *           <tr key={`${tool.server}__${tool.name}`}>
 *             <td>{tool.name}</td>
 *             <td>{tool.serverDisplayName}</td>
 *             <td>{tool.categories.join(', ')}</td>
 *             <td>{tool.enabled ? 'Enabled' : 'Disabled'}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 */
export function useTools(options?: Parameters<typeof useQuery>[0]) {
  return useQuery({
    queryKey: queryKeys.tools.all,
    queryFn: getTools,
    ...options,
  });
}
