import { Alert, Box, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTools } from "@api/hooks";
import { queryKeys } from "@utils/query-client";
import ToolsTable from "@components/ToolsTable";
import ErrorBoundary from "@components/ErrorBoundary";
import { useSSESubscription } from "@hooks/useSSESubscription";

const ToolsPage = () => {
  const queryClient = useQueryClient();

  // React Query hooks - automatic caching and refetching
  const { data: toolsData, isLoading, error } = useTools();

  // SSE integration - invalidate queries on tool list changes
  useSSESubscription(
    ["tool_list_changed"],
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    }, [queryClient]),
  );

  return (
    <ErrorBoundary
      recoverableErrors={[/filter error|tool fetch error|network error/i]}
      onError={(error) => {
        console.log("[ToolsPage] Error caught:", error.message);
      }}
    >
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
    </ErrorBoundary>
  );
};

export default ToolsPage;
