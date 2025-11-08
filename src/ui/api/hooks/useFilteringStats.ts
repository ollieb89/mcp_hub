/**
 * React Query hook for tool filtering statistics endpoint
 * Provides filtering metrics with automatic caching and refetching
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getFilteringStats } from '../filtering';

/**
 * Fetch and cache tool filtering statistics
 *
 * Automatically refetches on window focus and reconnect.
 * Cache is invalidated via SSE events (filtering_stats_changed).
 * Includes LLM cache metrics, category cache, and filter rates.
 *
 * @param options - React Query options for customization
 * @returns Query result with filtering stats data, loading state, and error
 *
 * @example
 * ```tsx
 * function FilteringDashboard() {
 *   const { data, isLoading, error } = useFilteringStats();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <div>
 *       <MetricCard
 *         label="Filter Rate"
 *         value={`${(data.filterRate * 100).toFixed(1)}%`}
 *       />
 *       <MetricCard
 *         label="LLM Cache Hit Rate"
 *         value={`${(data.llmCacheHitRate * 100).toFixed(1)}%`}
 *       />
 *       <MetricCard label="Exposed Tools" value={data.exposedTools} />
 *       <MetricCard label="Total Tools" value={data.totalTools} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useFilteringStats(options?: Parameters<typeof useQuery>[0]) {
  return useQuery({
    queryKey: queryKeys.filtering.stats,
    queryFn: getFilteringStats,
    ...options,
  });
}
