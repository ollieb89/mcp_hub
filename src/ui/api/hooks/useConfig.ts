/**
 * React Query hook for hub configuration endpoint
 * Provides config data with automatic caching and refetching
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getConfig } from '../config';

/**
 * Fetch and cache hub configuration
 *
 * Automatically refetches on window focus and reconnect.
 * Cache is invalidated via SSE events (config_changed).
 * Returns config with SHA-256 version for concurrent write protection.
 *
 * @param options - React Query options for customization
 * @returns Query result with config data, loading state, and error
 *
 * @example
 * ```tsx
 * function ConfigEditor() {
 *   const { data, isLoading, error } = useConfig();
 *   const saveConfig = useSaveConfig();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   const handleSave = () => {
 *     saveConfig.mutate({
 *       config: modifiedConfig,
 *       expectedVersion: data.version, // Concurrent write protection
 *     });
 *   };
 *
 *   return <ConfigForm config={data.config} onSave={handleSave} />;
 * }
 * ```
 */
export function useConfig(options?: Parameters<typeof useQuery>[0]) {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: getConfig,
    ...options,
  });
}
