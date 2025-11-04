import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getConfig, saveConfig, type HubConfig } from "@api/config";
import ConfigTabs from "@components/ConfigTabs";
import CategoryListEditor from "@components/CategoryListEditor";
import ServerAllowlistEditor from "@components/ServerAllowlistEditor";
import RawJsonEditor from "@components/RawJsonEditor";
import type { FilteringMode } from "@components/FilteringCard";
import { useSnackbar } from "@hooks/useSnackbar";

const filteringModes: FilteringMode[] = [
  "server-allowlist",
  "category",
  "hybrid",
  "prompt-based",
];

const ConfigPage = () => {
  const [config, setConfig] = useState<HubConfig | null>(null);
  const [rawConfig, setRawConfig] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { message, open, showSnackbar, closeSnackbar } = useSnackbar();

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getConfig();
      setConfig(response.config);
      setRawConfig(JSON.stringify(response.config, null, 2));
      setError(null);
      setDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    try {
      const response = await saveConfig(config);
      setConfig(response.config);
      setRawConfig(JSON.stringify(response.config, null, 2));
      showSnackbar("Configuration saved successfully.");
      setDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, showSnackbar]);

  const handleRawSave = useCallback(async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(rawConfig);
      const response = await saveConfig(parsed);
      setConfig(response.config);
      setRawConfig(JSON.stringify(response.config, null, 2));
      showSnackbar("Raw configuration applied.");
      setDirty(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [rawConfig, showSnackbar]);

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
      <Typography variant="body2" color="text.secondary">
        Edit the underlying configuration file. Ensure the JSON is valid before applying changes.
      </Typography>
      <RawJsonEditor value={rawConfig} onChange={setRawConfig} />
      <Button
        variant="contained"
        onClick={handleRawSave}
        disabled={saving}
        sx={{ alignSelf: "flex-start" }}
      >
        {saving ? <CircularProgress size={18} /> : "Apply JSON"}
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !dirty || !config}
          startIcon={saving ? <CircularProgress size={18} /> : undefined}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Stack>

      {loading || !config ? (
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
    </Box>
  );
};

export default ConfigPage;
