import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  getFilteringStats,
  type FilteringStats,
  setFilteringEnabled,
  setFilteringMode,
} from "@api/filtering";
import FilteringCard, {
  type FilteringMode,
} from "@components/FilteringCard";
import MetricCard from "@components/MetricCard";
import PieChartIcon from "@mui/icons-material/PieChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ActiveFiltersCard from "@components/ActiveFiltersCard";
import LogsPanel from "@components/LogsPanel";
import { useLogsStream } from "@hooks/useLogsStream";
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
  const [stats, setStats] = useState<FilteringStats | null>(null);
  const [history, setHistory] = useState<CacheHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logs, connected } = useLogsStream({ limit: 40 });
  
  const appendHistory = useCallback((next: FilteringStats) => {
    const point: CacheHistoryPoint = {
      timestamp: next.timestamp,
      cacheHitRate: next.cacheHitRate ?? 0,
      llmCacheHitRate: next.llmCacheHitRate ?? 0,
    };

    setHistory((prev) => {
      const updated = [...prev, point];
      return updated.slice(-20);
    });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await getFilteringStats();
      setStats(response);
      appendHistory(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [appendHistory]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      setPending(true);
      try {
        await setFilteringEnabled(enabled);
        await fetchStats();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPending(false);
      }
    },
    [fetchStats],
  );

  const handleModeChange = useCallback(
    async (mode: FilteringMode) => {
      setPending(true);
      try {
        await setFilteringMode(mode);
        await fetchStats();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPending(false);
      }
    },
    [fetchStats],
  );

  const handleEditFilters = useCallback(() => {
    navigate("/configuration");
  }, [navigate]);

  const logsLoading = !connected && logs.length === 0;
  const derivedLogs = useMemo(() => logs.slice().reverse(), [logs]);

  return (
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
          {error}
        </Alert>
      )}

      {loading && !stats ? (
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
              <CacheLineChart history={history} loading={loading} />
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
  );
};

export default DashboardPage;
