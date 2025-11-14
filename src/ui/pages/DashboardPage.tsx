import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useFilteringStats } from "@api/hooks";
import { useUpdateFilteringMode, useToggleFiltering } from "@api/mutations";
import { queryKeys } from "@utils/query-client";
import FilteringCard, {
  type FilteringMode,
} from "@components/FilteringCard";
import MetricCard from "@components/MetricCard";
import PieChartIcon from "@mui/icons-material/PieChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ActiveFiltersCard from "@components/ActiveFiltersCard";
import LogsPanel from "@components/LogsPanel";
import { useLogsStream } from "@hooks/useLogsStream";
import { useSSESubscription } from "@hooks/useSSESubscription";
import ErrorBoundary from "@components/ErrorBoundary";
import type { CacheHistoryPoint } from "@components/CacheLineChart";

const ToolPieChart = lazy(() => import("@components/ToolPieChart"));
const CacheLineChart = lazy(() => import("@components/CacheLineChart"));

const ToolPieChartFallback = () => (
  <MetricCard
    title="Tool Distribution"
    value={<Skeleton variant="text" width={120} />}
    subtitle={<Skeleton variant="text" width="80%" />}
    icon={<PieChartIcon />}
  >
    <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={24} aria-label="Loading tool chart" />
    </Box>
  </MetricCard>
);

const CacheLineChartFallback = () => (
  <MetricCard
    title="Cache Performance"
    value={<Skeleton variant="text" width={140} />}
    subtitle={<Skeleton variant="text" width="60%" />}
    icon={<TrendingUpIcon />}
  >
    <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={24} aria-label="Loading cache chart" />
    </Box>
  </MetricCard>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // React Query hooks - automatic caching and refetching
  const { data: stats, isLoading, error } = useFilteringStats();
  const updateModeMutation = useUpdateFilteringMode();
  const toggleFilteringMutation = useToggleFiltering();

  // Local state for cache history chart
  const [history, setHistory] = useState<CacheHistoryPoint[]>([]);

  // Logs stream (unchanged)
  const { logs, connected } = useLogsStream({ limit: 40 });

  // Append to cache history when stats update
  const appendHistory = useCallback((nextStats: typeof stats) => {
    if (!nextStats) return;

    const point: CacheHistoryPoint = {
      timestamp: nextStats.timestamp,
      cacheHitRate: nextStats.cacheHitRate ?? 0,
      llmCacheHitRate: nextStats.llmCacheHitRate ?? 0,
    };

    setHistory((prev) => {
      const updated = [...prev, point];
      return updated.slice(-20);
    });
  }, []);

  // Update history when stats change
  useEffect(() => {
    if (stats) {
      appendHistory(stats);
    }
  }, [stats, appendHistory]);

  // SSE integration - invalidate queries on config changes
  useSSESubscription(
    ["config_changed", "servers_updated"],
    useCallback(() => {
      // Invalidate filtering stats query when config changes
      queryClient.invalidateQueries({ queryKey: queryKeys.filtering.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    }, [queryClient]),
  );

  // Handle toggle with mutation hook
  const handleToggle = useCallback(
    (enabled: boolean) => {
      toggleFilteringMutation.mutate(enabled);
    },
    [toggleFilteringMutation],
  );

  // Handle mode change with mutation hook
  const handleModeChange = useCallback(
    (mode: FilteringMode) => {
      updateModeMutation.mutate(mode);
    },
    [updateModeMutation],
  );

  const handleEditFilters = useCallback(() => {
    navigate("/configuration");
  }, [navigate]);

  // Mutation pending state
  const pending = updateModeMutation.isPending || toggleFilteringMutation.isPending;

  // Logs state (unchanged)
  const logsLoading = !connected && logs.length === 0;
  const derivedLogs = useMemo(() => logs.slice().reverse(), [logs]);

  return (
    <ErrorBoundary
      recoverableErrors={[/failed to fetch|timeout|network error/i]}
      onError={(error) => {
        console.log("[DashboardPage] Error caught:", error.message);
      }}
    >
      <Box>
        <Stack spacing={1} mb={3}>
          <Typography variant="h5" fontWeight={700}>
            Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor filtering behaviour, tool inventory, cache health, and recent logs.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message}
          </Alert>
        )}

        {isLoading && !stats ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              <FilteringCard
                stats={stats}
                pending={pending}
                onToggle={handleToggle}
                onModeChange={handleModeChange}
                onEditFilters={handleEditFilters}
              />
              <Suspense fallback={<ToolPieChartFallback />}>
                <ToolPieChart stats={stats} />
              </Suspense>
              <Suspense fallback={<CacheLineChartFallback />}>
                <CacheLineChart history={history} loading={isLoading} />
              </Suspense>
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              <ActiveFiltersCard stats={stats} onEdit={handleEditFilters} />
              <LogsPanel logs={derivedLogs} loading={logsLoading} />
            </Box>
          </Stack>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default DashboardPage;
