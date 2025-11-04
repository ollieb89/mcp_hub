import PieChartIcon from "@mui/icons-material/PieChart";
import { Box, Skeleton, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import type { FilteringStats } from "@api/filtering";
import MetricCard from "./MetricCard";

type ToolPieChartProps = {
  stats: FilteringStats | null;
};

const ToolPieChart = ({ stats }: ToolPieChartProps) => {
  if (!stats) {
    return (
      <MetricCard
        title="Tool Distribution"
        value={<Skeleton variant="text" width={120} />}
        subtitle={<Skeleton variant="text" width="80%" />}
        icon={<PieChartIcon />}
      />
    );
  }

  const total = stats.totalTools || 0;
  const exposed = stats.exposedTools || 0;
  const filtered = stats.filteredTools || 0;

  return (
    <MetricCard
      title="Tool Distribution"
      value={`${total} tools`}
      subtitle={`Exposed ${exposed}, Filtered ${filtered}`}
      icon={<PieChartIcon />}
    >
      <Box sx={{ height: 220 }}>
        <PieChart
          colors={["#6C5CE7", "#FF7675"]}
          series={[
            {
              data: [
                { id: 0, value: exposed, label: "Exposed" },
                { id: 1, value: filtered, label: "Filtered" },
              ],
              arcLabel: (item) =>
                total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%",
              innerRadius: 40,
            },
          ]}
          slotProps={{
            legend: { hidden: false },
          }}
        />
        {total === 0 && (
          <Typography variant="body2" color="text.secondary" align="center">
            No tools available yet.
          </Typography>
        )}
      </Box>
    </MetricCard>
  );
};

export default ToolPieChart;
