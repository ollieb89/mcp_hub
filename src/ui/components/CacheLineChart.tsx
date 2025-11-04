import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Skeleton, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import MetricCard from "./MetricCard";

export type CacheHistoryPoint = {
  timestamp: string;
  cacheHitRate: number;
  llmCacheHitRate: number;
};

type CacheLineChartProps = {
  history: CacheHistoryPoint[];
  loading?: boolean;
};

const CacheLineChart = ({ history, loading = false }: CacheLineChartProps) => {
  if (loading && history.length === 0) {
    return (
      <MetricCard
        title="Cache Performance"
        value={<Skeleton variant="text" width={120} />}
        subtitle={<Skeleton variant="text" width="70%" />}
        icon={<TrendingUpIcon />}
      />
    );
  }

  const latest = history.at(-1);

  return (
    <MetricCard
      title="Cache Performance"
      value={
        latest
          ? `${Math.round(latest.cacheHitRate * 100)}% cache hit rate`
          : "No data"
      }
      subtitle={
        latest
          ? `LLM cache hit rate ${Math.round(latest.llmCacheHitRate * 100)}%`
          : "Cache metrics will appear once statistics load."
      }
      icon={<TrendingUpIcon />}
    >
      <Box sx={{ height: 220, mt: 1 }}>
        {history.length > 1 ? (
          <LineChart
            xAxis={[
              {
                scaleType: "point",
                data: history.map((point) =>
                  new Date(point.timestamp).toLocaleTimeString(),
                ),
              },
            ]}
            series={[
              {
                id: "cache",
                label: "Category cache",
                data: history.map((point) => point.cacheHitRate * 100),
                area: true,
                curve: "monotoneX",
              },
              {
                id: "llm",
                label: "LLM cache",
                data: history.map((point) => point.llmCacheHitRate * 100),
                area: true,
                curve: "monotoneX",
              },
            ]}
            height={200}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" align="center">
            More data points are required to render cache trends.
          </Typography>
        )}
      </Box>
    </MetricCard>
  );
};

export default CacheLineChart;
