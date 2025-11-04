import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import type { FilteringStats } from "@api/filtering";
import MetricCard from "./MetricCard";

type ActiveFiltersCardProps = {
  stats: FilteringStats | null;
  onEdit?: () => void;
};

const renderChips = (items: string[]) => {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        None configured.
      </Typography>
    );
  }

  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {items.map((item) => (
        <Chip key={item} label={item} size="small" color="primary" variant="outlined" />
      ))}
    </Stack>
  );
};

const ActiveFiltersCard = ({ stats, onEdit }: ActiveFiltersCardProps) => (
  <MetricCard
    title="Active Filters"
    value={`${stats?.allowedCategories?.length ?? 0} categories`}
    subtitle={`${stats?.allowedServers?.length ?? 0} servers`}
    icon={<ListAltIcon />}
    action={
      onEdit && (
        <Button size="small" onClick={onEdit}>
          Manage
        </Button>
      )
    }
  >
    {stats ? (
      <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Allowed Categories
          </Typography>
          {renderChips(stats.allowedCategories ?? [])}
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Allowed Servers
          </Typography>
          {renderChips(stats.allowedServers ?? [])}
        </Box>
      </Box>
    ) : (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Filters will appear once metrics load.
      </Typography>
    )}
  </MetricCard>
);

export default ActiveFiltersCard;
