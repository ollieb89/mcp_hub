/**
 * React Query mutations for server operations
 * Includes optimistic updates for responsive UI
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { startServer, stopServer, type ServersResponse } from '../servers';

/**
 * Start a server with optimistic UI updates
 *
 * Optimistically updates the server status to 'connecting' before the API call.
 * On success, invalidates queries to fetch fresh data.
 * On error, rolls back to previous state.
 *
 * @param options - React Query mutation options
 * @returns Mutation object with mutate function and states
 *
 * @example
 * ```tsx
 * function ServerControls({ serverName }: { serverName: string }) {
 *   const startServerMutation = useStartServer();
 *
 *   const handleStart = () => {
 *     startServerMutation.mutate(serverName, {
 *       onSuccess: () => {
 *         toast.success(`${serverName} started successfully`);
 *       },
 *       onError: (error) => {
 *         toast.error(`Failed to start ${serverName}: ${error.message}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleStart}
 *       disabled={startServerMutation.isPending}
 *     >
 *       {startServerMutation.isPending ? 'Starting...' : 'Start Server'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useStartServer(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serverName: string) => startServer(serverName),
    onMutate: async (serverName: string) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.servers.all });

      // Snapshot previous value for rollback
      const previousServers = queryClient.getQueryData<ServersResponse>(
        queryKeys.servers.all
      );

      // Optimistically update server status to 'connecting'
      queryClient.setQueryData<ServersResponse>(
        queryKeys.servers.all,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            servers: old.servers.map((server) =>
              server.name === serverName
                ? { ...server, status: 'connecting' }
                : server
            ),
          };
        }
      );

      // Return context with snapshot for rollback
      return { previousServers };
    },
    onError: (_error, _serverName, context) => {
      // Rollback to previous state on error
      if (context?.previousServers) {
        queryClient.setQueryData(
          queryKeys.servers.all,
          context.previousServers
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure UI is in sync with backend
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.health });
    },
    ...options,
  });
}

/**
 * Stop a server with optimistic UI updates
 *
 * Optimistically updates the server status to 'disconnecting' before the API call.
 * On success, invalidates queries to fetch fresh data.
 * On error, rolls back to previous state.
 *
 * @param options - React Query mutation options
 * @returns Mutation object with mutate function and states
 *
 * @example
 * ```tsx
 * function ServerControls({ serverName }: { serverName: string }) {
 *   const stopServerMutation = useStopServer();
 *
 *   const handleStop = (disable = false) => {
 *     stopServerMutation.mutate(
 *       { serverName, disable },
 *       {
 *         onSuccess: () => {
 *           toast.success(
 *             `${serverName} stopped${disable ? ' and disabled' : ''}`
 *           );
 *         },
 *         onError: (error) => {
 *           toast.error(`Failed to stop ${serverName}: ${error.message}`);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <>
 *       <button
 *         onClick={() => handleStop(false)}
 *         disabled={stopServerMutation.isPending}
 *       >
 *         Stop Server
 *       </button>
 *       <button
 *         onClick={() => handleStop(true)}
 *         disabled={stopServerMutation.isPending}
 *       >
 *         Stop & Disable
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */
export function useStopServer(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serverName, disable }: { serverName: string; disable?: boolean }) =>
      stopServer(serverName, disable),
    onMutate: async ({ serverName }) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.servers.all });

      // Snapshot previous value for rollback
      const previousServers = queryClient.getQueryData<ServersResponse>(
        queryKeys.servers.all
      );

      // Optimistically update server status to 'disconnected'
      queryClient.setQueryData<ServersResponse>(
        queryKeys.servers.all,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            servers: old.servers.map((server) =>
              server.name === serverName
                ? { ...server, status: 'disconnected' }
                : server
            ),
          };
        }
      );

      // Return context with snapshot for rollback
      return { previousServers };
    },
    onError: (_error, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousServers) {
        queryClient.setQueryData(
          queryKeys.servers.all,
          context.previousServers
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure UI is in sync with backend
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.health });
    },
    ...options,
  });
}
