/**
 * ToolFilterPanel - Container component for tool filtering controls
 *
 * Features:
 * - Mode selection (static, server-allowlist, category, hybrid, prompt-based)
 * - Enabled/disabled toggle
 * - Category multi-select (for category/hybrid modes)
 * - Apply/Reset buttons with optimistic updates
 * - Real-time updates via SSE integration
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useFilteringStats } from '@ui/api/hooks';
import {
  useUpdateFilteringMode,
  useToggleFiltering,
} from '@ui/api/mutations';
import type { FilteringMode } from '@ui/api/schemas';
import { CategorySelector } from './CategorySelector';
// import { CategorySelector } from './CategorySelector'; // TODO: Import when created

const FILTERING_MODES: Array<{ value: FilteringMode; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'server-allowlist', label: 'Server Allowlist' },
  { value: 'category', label: 'Category' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'prompt-based', label: 'Prompt-Based' },
];

export function ToolFilterPanel() {
  // Query current filtering stats
  const { data: stats, isLoading, error } = useFilteringStats();

  // Local draft state for form
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftMode, setDraftMode] = useState<FilteringMode>('static');
  const [draftCategories, setDraftCategories] = useState<string[]>([]);

  // Mutations
  const updateModeMutation = useUpdateFilteringMode();
  const toggleFilteringMutation = useToggleFiltering();

  // Sync draft state with fetched stats on mount/update
  useEffect(() => {
    if (stats) {
      setDraftEnabled(stats.enabled);
      setDraftMode(stats.mode);
      setDraftCategories(stats.allowedCategories);
    }
  }, [stats]);

  // Check if draft differs from server state
  const hasChanges =
    stats &&
    (draftEnabled !== stats.enabled ||
      draftMode !== stats.mode ||
      JSON.stringify(draftCategories.sort()) !==
        JSON.stringify(stats.allowedCategories.sort()));

  // Mode selection requires category selector
  const showCategorySelector =
    draftMode === 'category' || draftMode === 'hybrid';

  // Handle mode change
  const handleModeChange = (event: SelectChangeEvent<FilteringMode>) => {
    setDraftMode(event.target.value as FilteringMode);
  };

  // Handle enabled toggle
  const handleEnabledToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftEnabled(event.target.checked);
  };

  // Handle apply button
  const handleApply = async () => {
    if (!stats) return;

    const promises: Promise<unknown>[] = [];

    // Update mode if changed
    if (draftMode !== stats.mode) {
      promises.push(updateModeMutation.mutateAsync(draftMode));
    }

    // Update enabled if changed
    if (draftEnabled !== stats.enabled) {
      promises.push(toggleFilteringMutation.mutateAsync(draftEnabled));
    }

    // TODO: Update categories when backend endpoint exists

    try {
      await Promise.all(promises);
    } catch (err) {
      // Mutations handle errors internally with rollback
      console.error('Failed to apply filtering changes:', err);
    }
  };

  // Handle reset button
  const handleReset = () => {
    if (stats) {
      setDraftEnabled(stats.enabled);
      setDraftMode(stats.mode);
      setDraftCategories(stats.allowedCategories);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load filtering configuration: {error.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No stats available
  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">No filtering stats available</Alert>
        </CardContent>
      </Card>
    );
  }

  // Mutation in progress
  const isSaving =
    updateModeMutation.isPending || toggleFilteringMutation.isPending;

  return (
    <Card>
      <CardHeader
        title="Tool Filtering Configuration"
        subheader="Configure how tools are filtered and exposed to LLMs"
      />
      <CardContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Enabled Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={draftEnabled}
                onChange={handleEnabledToggle}
                disabled={isSaving}
                inputProps={{ 'aria-label': 'Enable filtering' }}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {draftEnabled ? 'Filtering Enabled' : 'Filtering Disabled'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {draftEnabled
                    ? 'Tools will be filtered based on the selected mode'
                    : 'All tools will be exposed without filtering'}
                </Typography>
              </Box>
            }
          />

          {/* Mode Selection */}
          <FormControl fullWidth disabled={isSaving || !draftEnabled}>
            <InputLabel id="filtering-mode-label">Filtering Mode</InputLabel>
            <Select
              labelId="filtering-mode-label"
              id="filtering-mode-select"
              value={draftMode}
              label="Filtering Mode"
              onChange={handleModeChange}
            >
              {FILTERING_MODES.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  {mode.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category Selector */}
          {showCategorySelector && (
            <CategorySelector
              value={draftCategories}
              onChange={setDraftCategories}
              disabled={isSaving || !draftEnabled}
            />
          )}

          {/* Current Server State Info */}
          <Box bgcolor="grey.100" p={2} borderRadius={1}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Current Server Configuration:
            </Typography>
            <Typography variant="body2">
              Mode: {stats.mode} • Enabled: {stats.enabled ? 'Yes' : 'No'}
            </Typography>
            {stats.allowedCategories.length > 0 && (
              <Typography variant="body2">
                Categories: {stats.allowedCategories.join(', ')}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!hasChanges || isSaving}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? 'Applying...' : 'Apply Changes'}
        </Button>
      </CardActions>
    </Card>
  );
}
