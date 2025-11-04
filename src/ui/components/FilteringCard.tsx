import { useMemo } from "react";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { FilteringStats } from "@api/filtering";
import MetricCard from "./MetricCard";

const filteringModes = [
  { value: "server-allowlist", label: "Server Allowlist" },
  { value: "category", label: "Category" },
  { value: "hybrid", label: "Hybrid" },
  { value: "prompt-based", label: "Prompt Based" },
] as const;

export type FilteringMode = (typeof filteringModes)[number]["value"];

type FilteringCardProps = {
  stats: FilteringStats | null;
  pending?: boolean;
  onToggle: (enabled: boolean) => Promise<void> | void;
  onModeChange: (mode: FilteringMode) => Promise<void> | void;
  onEditFilters?: () => void;
};

const FilteringCard = ({
  stats,
  pending = false,
  onToggle,
  onModeChange,
  onEditFilters,
}: FilteringCardProps) => {
  const modeLabel = useMemo(() => {
    if (!stats) return "Loading…";
    const entry = filteringModes.find((item) => item.value === stats.mode);
    return entry?.label ?? stats.mode;
  }, [stats]);

  const enabled = stats?.enabled ?? false;

  return (
    <MetricCard
      title="Filtering Status"
      value={
        <Stack direction="row" spacing={1} alignItems="center">
          <Switch
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            disabled={pending || !stats}
            inputProps={{ "aria-label": "Toggle filtering" }}
          />
          <Typography variant="h6" component="span">
            {enabled ? "Enabled" : "Disabled"}
          </Typography>
        </Stack>
      }
      subtitle={
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Current mode: {modeLabel}
          </Typography>
          <FormControl size="small" disabled={pending || !stats}>
            <InputLabel id="filtering-mode-label">Mode</InputLabel>
            <Select
              labelId="filtering-mode-label"
              label="Mode"
              value={stats?.mode ?? ""}
              onChange={(event) =>
                onModeChange(event.target.value as FilteringMode)
              }
            >
              {filteringModes.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  {mode.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      }
      icon={<ToggleOnIcon />}
      action={
        onEditFilters && (
          <Button size="small" onClick={onEditFilters}>
            Edit Filters
          </Button>
        )
      }
    >
      {!stats && (
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={24} />
        </Box>
      )}
    </MetricCard>
  );
};

export default FilteringCard;
