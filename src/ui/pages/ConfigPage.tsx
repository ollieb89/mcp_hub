import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
  Select,
} from "@mui/material";
import { type HubConfig } from "@api/config";
import { useConfig } from "@api/hooks";
import { useSaveConfig } from "@api/mutations";
import { queryKeys } from "@utils/query-client";
import ConfigTabs from "@components/ConfigTabs";
import CategoryListEditor from "@components/CategoryListEditor";
import ServerAllowlistEditor from "@components/ServerAllowlistEditor";
import RawJsonEditor from "@components/RawJsonEditor";
import ConfigPreviewDialog from "@components/ConfigPreviewDialog";
import type { FilteringMode } from "@components/FilteringCard";
import { useSnackbar } from "@hooks/useSnackbar";
import { useConfigUpdates } from "@hooks/useSSESubscription";

const filteringModes: FilteringMode[] = [
  "server-allowlist",
  "category",
  "hybrid",
  "prompt-based",
];

const ConfigPage = () => {
  const queryClient = useQueryClient();
  const { message, open, showSnackbar, closeSnackbar } = useSnackbar();

  // React Query hooks - automatic caching and refetching
  const { data: configData, isLoading, error: queryError } = useConfig();
  const saveConfigMutation = useSaveConfig();

  // Local state for form editing
  const [config, setConfig] = useState<HubConfig | null>(null);
  const [configVersion, setConfigVersion] = useState<string>("");
  const [rawConfig, setRawConfig] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<HubConfig | null>(null);

  // Sync query data to local state when loaded
  useEffect(() => {
    if (configData) {
      setConfig(configData.config);
      setConfigVersion(configData.version);
      setRawConfig(JSON.stringify(configData.config, null, 2));
      if (!dirty) {
        setError(null);
      }
    }
  }, [configData, dirty]);

  // SSE integration - invalidate queries on config changes
  useConfigUpdates(
    useCallback((event) => {
      if (event.type === "config_changed" && !dirty) {
        // Only auto-reload if user hasn't made local changes
        queryClient.invalidateQueries({ queryKey: queryKeys.config });
      }
    }, [dirty, queryClient]),
  );

  const updateConfigState = useCallback(
    (updater: (prev: HubConfig) => HubConfig) => {
      setConfig((prev) => {
        if (!prev) {
          return prev;
        }
        const next = updater(prev);
        setRawConfig(JSON.stringify(next, null, 2));
        setDirty(true);
        return next;
      });
    },
    [],
  );

  const toolFiltering = useMemo(
    () => config?.toolFiltering ?? {},
    [config],
  );

  const handleSave = useCallback(() => {
    if (!config) return;

    saveConfigMutation.mutate(
      { config, expectedVersion: configVersion },
      {
        onSuccess: (response) => {
          setConfig(response.config);
          setConfigVersion(response.version);
          setRawConfig(JSON.stringify(response.config, null, 2));
          showSnackbar("Configuration saved successfully.");
          setDirty(false);
          setError(null);
        },
        onError: (err) => {
          const errorMsg = err.message;
          if (errorMsg.includes("version mismatch")) {
            setError(
              "Configuration was modified by another process. Please reload and reapply your changes."
            );
          } else {
            setError(errorMsg);
          }
        },
      }
    );
  }, [config, configVersion, saveConfigMutation, showSnackbar]);

  const handleRawPreview = useCallback(() => {
    try {
      const parsed = JSON.parse(rawConfig);
      setPreviewConfig(parsed);
      setShowPreview(true);
      setError(null);
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`);
    }
  }, [rawConfig]);

  const handleRawSave = useCallback(() => {
    if (!previewConfig) return;

    saveConfigMutation.mutate(
      { config: previewConfig, expectedVersion: configVersion },
      {
        onSuccess: (response) => {
          setConfig(response.config);
          setConfigVersion(response.version);
          setRawConfig(JSON.stringify(response.config, null, 2));
          showSnackbar("Raw configuration applied.");
          setDirty(false);
          setError(null);
          setShowPreview(false);
        },
        onError: (err) => {
          const errorMsg = err.message;
          if (errorMsg.includes("version mismatch")) {
            setError(
              "Configuration was modified by another process. Please reload and reapply your changes."
            );
            setShowPreview(false);
          } else {
            setError(errorMsg);
          }
        },
      }
    );
  }, [previewConfig, configVersion, saveConfigMutation, showSnackbar]);

  const generalContent = (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Switch
          checked={Boolean(toolFiltering.enabled)}
          onChange={(event) =>
            updateConfigState((prev) => ({
              ...prev,
              toolFiltering: {
                ...toolFiltering,
                enabled: event.target.checked,
              },
            }))
          }
          inputProps={{ "aria-label": "Enable tool filtering" }}
        />
        <Typography variant="body1">
          Tool filtering {toolFiltering.enabled ? "enabled" : "disabled"}
        </Typography>
      </Stack>

      <FormControl size="small" sx={{ maxWidth: 240 }}>
        <InputLabel id="tool-filtering-mode-label">Mode</InputLabel>
        <Select
          labelId="tool-filtering-mode-label"
          label="Mode"
          value={(toolFiltering.mode as FilteringMode) ?? filteringModes[0]}
          onChange={(event) =>
            updateConfigState((prev) => ({
              ...prev,
              toolFiltering: {
                ...toolFiltering,
                mode: event.target.value,
              },
            }))
          }
        >
          {filteringModes.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {mode}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Auto-enable threshold"
        type="number"
        size="small"
        sx={{ maxWidth: 240 }}
        value={toolFiltering.autoEnableThreshold ?? ""}
        helperText="Automatically enables filtering when the exposed tool count exceeds this number."
        onChange={(event) =>
          updateConfigState((prev) => ({
            ...prev,
            toolFiltering: {
              ...toolFiltering,
              autoEnableThreshold:
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
            },
          }))
        }
      />
    </Stack>
  );

  const categoriesContent = (
    <CategoryListEditor
      categories={toolFiltering.categoryFilter?.categories ?? []}
      onChange={(categories) =>
        updateConfigState((prev) => ({
          ...prev,
          toolFiltering: {
            ...toolFiltering,
            categoryFilter: {
              ...(toolFiltering.categoryFilter ?? {}),
              categories,
            },
          },
        }))
      }
    />
  );

  const serversContent = (
    <ServerAllowlistEditor
      servers={toolFiltering.serverFilter?.servers ?? []}
      onChange={(servers) =>
        updateConfigState((prev) => ({
          ...prev,
          toolFiltering: {
            ...toolFiltering,
            serverFilter: {
              mode: toolFiltering.serverFilter?.mode ?? "allowlist",
              servers,
            },
          },
        }))
      }
    />
  );

  const rawContent = (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2" fontWeight={600} mb={0.5}>
          Preview Changes Before Applying
        </Typography>
        <Typography variant="body2">
          Raw JSON editing provides direct access to your configuration. A preview
          dialog will show you exactly what changes will be made before applying them.
        </Typography>
      </Alert>
      <RawJsonEditor
        value={rawConfig}
        onChange={(value) => {
          setRawConfig(value);
          setDirty(true);
        }}
      />
      <Button
        variant="contained"
        onClick={handleRawPreview}
        disabled={!dirty}
        sx={{ alignSelf: "flex-start" }}
      >
        Preview & Apply Changes
      </Button>
    </Stack>
  );

  const tabs = [
    { label: "General", content: generalContent },
    { label: "Categories", content: categoriesContent },
    { label: "Servers", content: serversContent },
    { label: "Raw JSON", content: rawContent },
  ];

  return (
    <Box>
      <Stack spacing={1} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Adjust tool filtering behaviour, allowed categories, and server allowlists. Raw JSON editing is available for advanced changes.
        </Typography>
      </Stack>

      {(error || queryError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || queryError?.message}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saveConfigMutation.isPending || !dirty || !config}
          startIcon={saveConfigMutation.isPending ? <CircularProgress size={18} /> : undefined}
        >
          {saveConfigMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </Stack>

      {isLoading || !config ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ConfigTabs value={activeTab} onChange={setActiveTab} tabs={tabs} />
      )}

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        message={message ?? ""}
      />

      {config && previewConfig && (
        <ConfigPreviewDialog
          open={showPreview}
          currentConfig={config}
          proposedConfig={previewConfig}
          onConfirm={handleRawSave}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </Box>
  );
};

export default ConfigPage;
