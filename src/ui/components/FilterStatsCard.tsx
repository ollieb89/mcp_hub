/**
 * FilterStatsCard Component
 * Displays current tool filtering statistics with refresh capability
 * Auto-updates via SSE events (config_changed)
 */
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert,
  Skeleton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFilteringStats } from '@ui/api/hooks/useFilteringStats';

/**
 * FilterStatsCard displays tool filtering metrics
 *
 * Features:
 * - Real-time stats display (enabled, mode, tool counts, filter rate, cache metrics)
 * - Manual refresh button
 * - Automatic updates via SSE (config_changed event)
 * - Loading skeleton states
 * - Error handling with Alert
 *
 * @example
 * ```tsx
 * <FilterStatsCard />
 * ```
 */
export function FilterStatsCard() {
  const { data: stats, isLoading, error, refetch } = useFilteringStats();

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader
          title={<Skeleton width="60%" />}
          action={
            <IconButton disabled>
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Skeleton variant="rectangular" height={32} />
            <Skeleton variant="rectangular" height={32} />
            <Skeleton variant="rectangular" height={32} />
            <Skeleton variant="rectangular" height={32} />
            <Skeleton variant="rectangular" height={32} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader
          title="Tool Filtering Stats"
          action={
            <IconButton onClick={() => refetch()} aria-label="Refresh stats">
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Alert severity="error">
            Failed to load filtering stats: {error.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!stats) {
    return (
      <Card>
        <CardHeader
          title="Tool Filtering Stats"
          action={
            <IconButton onClick={() => refetch()} aria-label="Refresh stats">
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Alert severity="info">No filtering stats available</Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentages
  const exposedPercentage =
    stats.totalTools > 0
      ? ((stats.exposedTools / stats.totalTools) * 100).toFixed(1)
      : '0.0';
  const filteredPercentage =
    stats.totalTools > 0
      ? ((stats.filteredTools / stats.totalTools) * 100).toFixed(1)
      : '0.0';
  const filterRatePercentage = (stats.filterRate * 100).toFixed(1);
  const cacheHitRatePercentage = (stats.cacheHitRate * 100).toFixed(1);

  return (
    <Card>
      <CardHeader
        title="Tool Filtering Stats"
        action={
          <IconButton
            onClick={() => refetch()}
            aria-label="Refresh stats"
            disabled={isLoading}
          >
            <RefreshIcon />
          </IconButton>
        }
      />
      <CardContent>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
            alignItems: 'center',
          }}
        >
          {/* Status */}
          <Typography variant="body2" fontWeight="medium">
            Status:
          </Typography>
          <Box>
            <Chip
              label={stats.enabled ? 'Enabled' : 'Disabled'}
              color={stats.enabled ? 'success' : 'default'}
              size="small"
            />
          </Box>

          {/* Mode */}
          <Typography variant="body2" fontWeight="medium">
            Mode:
          </Typography>
          <Typography variant="body2">{stats.mode}</Typography>

          {/* Total Tools */}
          <Typography variant="body2" fontWeight="medium">
            Total Tools:
          </Typography>
          <Typography variant="body2">{stats.totalTools}</Typography>

          {/* Exposed Tools */}
          <Typography variant="body2" fontWeight="medium">
            Exposed Tools:
          </Typography>
          <Typography variant="body2">
            {stats.exposedTools} ({exposedPercentage}%)
          </Typography>

          {/* Filtered Tools */}
          <Typography variant="body2" fontWeight="medium">
            Filtered Tools:
          </Typography>
          <Typography variant="body2">
            {stats.filteredTools} ({filteredPercentage}%)
          </Typography>

          {/* Filter Rate */}
          <Typography variant="body2" fontWeight="medium">
            Filter Rate:
          </Typography>
          <Typography variant="body2">{filterRatePercentage}%</Typography>

          {/* Cache Hit Rate */}
          <Typography variant="body2" fontWeight="medium">
            Cache Hit Rate:
          </Typography>
          <Typography variant="body2">{cacheHitRatePercentage}%</Typography>

          {/* Allowed Categories (if present) */}
          {stats.allowedCategories && stats.allowedCategories.length > 0 && (
            <>
              <Typography variant="body2" fontWeight="medium">
                Active Categories:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {stats.allowedCategories.map((category) => (
                  <Chip key={category} label={category} size="small" />
                ))}
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
