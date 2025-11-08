/**
 * React Query mutations for configuration operations
 * Includes version checking for concurrent write protection
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { saveConfig, type ConfigData, type ConfigResponse } from '../config';

/**
 * Save configuration with version checking
 *
 * Requires expectedVersion parameter for concurrent write protection.
 * Uses SHA-256 hash versioning to detect conflicting writes.
 * On success, updates cache with new config and version.
 * On error (version mismatch), provides detailed error for user handling.
 *
 * @param options - React Query mutation options
 * @returns Mutation object with mutate function and states
 *
 * @example
 * ```tsx
 * function ConfigEditor() {
 *   const { data: configData } = useConfig();
 *   const saveConfigMutation = useSaveConfig();
 *   const [config, setConfig] = useState<ConfigData | null>(null);
 *
 *   useEffect(() => {
 *     if (configData) setConfig(configData.config);
 *   }, [configData]);
 *
 *   const handleSave = () => {
 *     if (!config || !configData) return;
 *
 *     saveConfigMutation.mutate(
 *       {
 *         config,
 *         expectedVersion: configData.version, // Concurrent write protection
 *       },
 *       {
 *         onSuccess: (response) => {
 *           toast.success('Config saved successfully');
 *           // Update local state with new version
 *           setConfig(response.config);
 *         },
 *         onError: (error) => {
 *           if (error.message.includes('version mismatch')) {
 *             toast.error(
 *               'Config was modified by another process. Please refresh and try again.'
 *             );
 *           } else {
 *             toast.error(`Failed to save config: ${error.message}`);
 *           }
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <div>
 *       <JsonEditor value={config} onChange={setConfig} />
 *       <button
 *         onClick={handleSave}
 *         disabled={saveConfigMutation.isPending}
 *       >
 *         {saveConfigMutation.isPending ? 'Saving...' : 'Save Config'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSaveConfig(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      config,
      expectedVersion,
    }: {
      config: ConfigData;
      expectedVersion?: string;
    }) => saveConfig(config, expectedVersion),
    onMutate: async ({ config }) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.config });

      // Snapshot previous value for rollback
      const previousConfig = queryClient.getQueryData<ConfigResponse>(
        queryKeys.config
      );

      // Optimistically update config (but keep old version until confirmed)
      queryClient.setQueryData<ConfigResponse>(queryKeys.config, (old) => {
        if (!old) return old;

        return {
          ...old,
          config,
        };
      });

      // Return context with snapshot for rollback
      return { previousConfig };
    },
    onSuccess: (data) => {
      // Update cache with confirmed data including new version
      queryClient.setQueryData(queryKeys.config, data);
    },
    onError: (_error, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousConfig) {
        queryClient.setQueryData(queryKeys.config, context.previousConfig);
      }
    },
    onSettled: () => {
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filtering.stats });
    },
    ...options,
  });
}
