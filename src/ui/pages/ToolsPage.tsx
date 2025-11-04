import { Alert, Box, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { getTools } from "@api/tools";
import ToolsTable from "@components/ToolsTable";
import { usePolling } from "@hooks/usePolling";

const ToolsPage = () => {
  const fetchTools = useCallback(async () => {
    const response = await getTools();
    return response.tools;
  }, []);

  const { data, error, loading } = usePolling(fetchTools, { interval: 20000 });

  return (
    <Box>
      <Stack spacing={1} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Tools
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and filter tools exposed by all connected MCP servers.
        </Typography>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <ToolsTable tools={data ?? []} loading={loading} />
    </Box>
  );
};

export default ToolsPage;
