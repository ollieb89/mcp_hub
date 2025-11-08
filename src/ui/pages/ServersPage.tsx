import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type ServerInfo } from "@api/servers";
import { useServers } from "@api/hooks";
import { useStartServer, useStopServer } from "@api/mutations";
import { queryKeys } from "@utils/query-client";
import ServersTable from "@components/ServersTable";
import { useSnackbar } from "@hooks/useSnackbar";
import { useConfigUpdates } from "@hooks/useSSESubscription";

const ServersPage = () => {
  const queryClient = useQueryClient();
  const { message, open, showSnackbar, closeSnackbar } = useSnackbar();

  // React Query hooks - automatic caching and refetching
  const { data: serversData, isLoading, error, refetch } = useServers();
  const startServerMutation = useStartServer();
  const stopServerMutation = useStopServer();

  // SSE integration - invalidate queries on config changes
  useConfigUpdates(
    useCallback((event) => {
      if (event.type === "config_changed" || event.type === "servers_updated") {
        queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.health });
      }
    }, [queryClient]),
  );

  const handleToggle = useCallback(
    (server: ServerInfo, enabled: boolean) => {
      if (enabled) {
        startServerMutation.mutate(server.name, {
          onSuccess: () => {
            showSnackbar(`Started ${server.displayName || server.name}`);
          },
          onError: (err) => {
            showSnackbar(err.message);
          },
        });
      } else {
        stopServerMutation.mutate(
          { serverName: server.name, disable: true },
          {
            onSuccess: () => {
              showSnackbar(`Disabled ${server.displayName || server.name}`);
            },
            onError: (err) => {
              showSnackbar(err.message);
            },
          },
        );
      }
    },
    [startServerMutation, stopServerMutation, showSnackbar],
  );

  const handleRestart = useCallback(
    async (server: ServerInfo) => {
      try {
        // Stop first (without disable), then start
        await stopServerMutation.mutateAsync({ serverName: server.name, disable: false });
        await startServerMutation.mutateAsync(server.name);
        showSnackbar(`Restarted ${server.displayName || server.name}`);
      } catch (err) {
        showSnackbar((err as Error).message);
      }
    },
    [startServerMutation, stopServerMutation, showSnackbar],
  );

  return (
    <Box>
      <Stack spacing={1} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Servers
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage MCP server processes, review transport details, and monitor uptime.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <ServersTable
        servers={serversData?.servers ?? []}
        loading={isLoading}
        onRefresh={refetch}
        onToggle={handleToggle}
        onRestart={handleRestart}
      />

      <Snackbar open={open} autoHideDuration={4000} onClose={closeSnackbar} message={message ?? ""} />
    </Box>
  );
};

export default ServersPage;
