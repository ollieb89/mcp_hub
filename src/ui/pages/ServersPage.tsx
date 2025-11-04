import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { getServers, startServer, stopServer, type ServerInfo } from "@api/servers";
import ServersTable from "@components/ServersTable";
import { usePolling } from "@hooks/usePolling";
import { useSnackbar } from "@hooks/useSnackbar";

const ServersPage = () => {
  const { message, open, showSnackbar, closeSnackbar } = useSnackbar();
  const fetchServers = useCallback(async () => {
    const response = await getServers();
    return response.servers;
  }, []);

  const { data, error, loading, refresh } = usePolling(fetchServers, {
    interval: 20000,
  });

  const handleToggle = useCallback(
    async (server: ServerInfo, enabled: boolean) => {
      try {
        if (enabled) {
          await startServer(server.name);
          showSnackbar(`Started ${server.displayName || server.name}`);
        } else {
          await stopServer(server.name, true);
          showSnackbar(`Disabled ${server.displayName || server.name}`);
        }
      } catch (err) {
        showSnackbar((err as Error).message);
      } finally {
        await refresh();
      }
    },
    [refresh, showSnackbar],
  );

  const handleRestart = useCallback(
    async (server: ServerInfo) => {
      try {
        await stopServer(server.name, false);
        await startServer(server.name);
        showSnackbar(`Restarted ${server.displayName || server.name}`);
      } catch (err) {
        showSnackbar((err as Error).message);
      } finally {
        await refresh();
      }
    },
    [refresh, showSnackbar],
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
          {error}
        </Alert>
      )}

      <ServersTable
        servers={data ?? []}
        loading={loading}
        onRefresh={refresh}
        onToggle={handleToggle}
        onRestart={handleRestart}
      />

      <Snackbar open={open} autoHideDuration={4000} onClose={closeSnackbar} message={message ?? ""} />
    </Box>
  );
};

export default ServersPage;
