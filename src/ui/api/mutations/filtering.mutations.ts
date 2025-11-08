/**
 * React Query mutations for tool filtering operations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import {
  setFilteringMode,
  setFilteringEnabled,
  type FilteringStatsResponse,
  type FilteringMode,
} from '../filtering';

/**
 * Update tool filtering mode
 *
 * Changes the filtering mode (e.g., 'prompt-based', 'static', 'category').
 * Optimistically updates the mode in cache before API confirmation.
 * On success, invalidates filtering stats and tools list.
 * On error, rolls back to previous state.
 *
 * @param options - React Query mutation options
 * @returns Mutation object with mutate function and states
 *
 * @example
 * ```tsx
 * function FilteringModeSelector() {
 *   const { data: stats } = useFilteringStats();
 *   const updateModeMutation = useUpdateFilteringMode();
 *
 *   const handleModeChange = (mode: string) => {
 *     updateModeMutation.mutate(mode, {
 *       onSuccess: () => {
 *         toast.success(`Filtering mode updated to ${mode}`);
 *       },
 *       onError: (error) => {
 *         toast.error(`Failed to update mode: ${error.message}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <select
 *       value={stats?.mode || ''}
 *       onChange={(e) => handleModeChange(e.target.value)}
 *       disabled={updateModeMutation.isPending}
 *     >
 *       <option value="prompt-based">Prompt-Based</option>
 *       <option value="static">Static</option>
 *       <option value="category">Category</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useUpdateFilteringMode(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mode: FilteringMode) => setFilteringMode(mode),
    onMutate: async (mode: FilteringMode) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.filtering.stats });

      // Snapshot previous value
      const previousStats = queryClient.getQueryData<FilteringStatsResponse>(
        queryKeys.filtering.stats
      );

      // Optimistically update mode
      queryClient.setQueryData<FilteringStatsResponse>(
        queryKeys.filtering.stats,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            mode,
          };
        }
      );

      return { previousStats };
    },
    onError: (_error, _mode, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.filtering.stats,
          context.previousStats
        );
      }
    },
    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.filtering.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    },
    ...options,
  });
}

/**
 * Toggle tool filtering enabled/disabled state
 *
 * Enables or disables the entire tool filtering system.
 * Optimistically updates the enabled state in cache.
 * On success, invalidates filtering stats and tools list.
 * On error, rolls back to previous state.
 *
 * @param options - React Query mutation options
 * @returns Mutation object with mutate function and states
 *
 * @example
 * ```tsx
 * function FilteringToggle() {
 *   const { data: stats } = useFilteringStats();
 *   const toggleFilteringMutation = useToggleFiltering();
 *
 *   const handleToggle = () => {
 *     const newEnabled = !stats?.enabled;
 *     toggleFilteringMutation.mutate(newEnabled, {
 *       onSuccess: () => {
 *         toast.success(
 *           `Filtering ${newEnabled ? 'enabled' : 'disabled'} successfully`
 *         );
 *       },
 *       onError: (error) => {
 *         toast.error(`Failed to toggle filtering: ${error.message}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleToggle}
 *       disabled={toggleFilteringMutation.isPending}
 *     >
 *       {stats?.enabled ? 'Disable' : 'Enable'} Filtering
 *     </button>
 *   );
 * }
 * ```
 */
export function useToggleFiltering(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) => setFilteringEnabled(enabled),
    onMutate: async (enabled: boolean) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.filtering.stats });

      // Snapshot previous value
      const previousStats = queryClient.getQueryData<FilteringStatsResponse>(
        queryKeys.filtering.stats
      );

      // Optimistically update enabled state
      queryClient.setQueryData<FilteringStatsResponse>(
        queryKeys.filtering.stats,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            enabled,
          };
        }
      );

      return { previousStats };
    },
    onError: (_error, _enabled, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(
          queryKeys.filtering.stats,
          context.previousStats
        );
      }
    },
    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.filtering.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    },
    ...options,
  });
}
