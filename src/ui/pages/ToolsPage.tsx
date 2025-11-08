import { Alert, Box, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTools } from "@api/hooks";
import { queryKeys } from "@utils/query-client";
import ToolsTable from "@components/ToolsTable";
import { useToolListUpdates } from "@hooks/useSSESubscription";

const ToolsPage = () => {
  const queryClient = useQueryClient();

  // React Query hooks - automatic caching and refetching
  const { data: toolsData, isLoading, error } = useTools();

  // SSE integration - invalidate queries on tool list changes
  useToolListUpdates(
    useCallback((event) => {
      if (event.type === "tool_list_changed") {
        queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
      }
    }, [queryClient]),
  );

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
          {error.message}
        </Alert>
      )}
      <ToolsTable tools={toolsData?.tools ?? []} loading={isLoading} />
    </Box>
  );
};

export default ToolsPage;
