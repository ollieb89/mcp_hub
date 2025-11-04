import { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import ReactDiffViewer from "react-diff-viewer-continued";
import type { HubConfig } from "@api/config";

interface ConfigPreviewDialogProps {
  open: boolean;
  currentConfig: HubConfig;
  proposedConfig: HubConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfigChange {
  type: "added" | "removed" | "modified";
  path: string;
  description: string;
}

/**
 * Analyze config differences and extract key changes
 */
function analyzeConfigChanges(
  current: HubConfig,
  proposed: HubConfig
): ConfigChange[] {
  const changes: ConfigChange[] = [];

  // Check tool filtering changes
  const currentFiltering = current.toolFiltering ?? {};
  const proposedFiltering = proposed.toolFiltering ?? {};

  if (currentFiltering.enabled !== proposedFiltering.enabled) {
    changes.push({
      type: "modified",
      path: "toolFiltering.enabled",
      description: `Filtering ${proposedFiltering.enabled ? "enabled" : "disabled"}`,
    });
  }

  if (currentFiltering.mode !== proposedFiltering.mode) {
    changes.push({
      type: "modified",
      path: "toolFiltering.mode",
      description: `Mode changed: ${currentFiltering.mode ?? "none"} → ${proposedFiltering.mode}`,
    });
  }

  // Check server changes
  const currentServers = Object.keys(current.mcpServers ?? {});
  const proposedServers = Object.keys(proposed.mcpServers ?? {});

  const addedServers = proposedServers.filter((s) => !currentServers.includes(s));
  const removedServers = currentServers.filter((s) => !proposedServers.includes(s));

  addedServers.forEach((server) => {
    changes.push({
      type: "added",
      path: `mcpServers.${server}`,
      description: `Added server: ${server}`,
    });
  });

  removedServers.forEach((server) => {
    changes.push({
      type: "removed",
      path: `mcpServers.${server}`,
      description: `Removed server: ${server}`,
    });
  });

  return changes;
}

const ConfigPreviewDialog = ({
  open,
  currentConfig,
  proposedConfig,
  onConfirm,
  onCancel,
}: ConfigPreviewDialogProps) => {
  const currentJson = useMemo(
    () => JSON.stringify(currentConfig, null, 2),
    [currentConfig]
  );

  const proposedJson = useMemo(
    () => JSON.stringify(proposedConfig, null, 2),
    [proposedConfig]
  );

  const changes = useMemo(
    () => analyzeConfigChanges(currentConfig, proposedConfig),
    [currentConfig, proposedConfig]
  );

  const hasDestructiveChanges = changes.some(
    (c) => c.type === "removed" || (c.type === "modified" && c.path.includes("mcpServers"))
  );

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Review Configuration Changes
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Review the changes below before applying them to your configuration.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Key Changes Summary */}
        {changes.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Key Changes ({changes.length})
            </Typography>
            <Stack spacing={1}>
              {changes.map((change, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Chip
                    label={change.type}
                    size="small"
                    color={
                      change.type === "added"
                        ? "success"
                        : change.type === "removed"
                          ? "error"
                          : "warning"
                    }
                    sx={{ minWidth: 80 }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {change.description}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {change.path}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Destructive Changes Warning */}
        {hasDestructiveChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              ⚠️ Destructive Changes Detected
            </Typography>
            <Typography variant="body2">
              This configuration contains removed servers or modified server
              settings. Applying these changes may disrupt active connections.
              Ensure you understand the impact before proceeding.
            </Typography>
          </Alert>
        )}

        {/* Diff Viewer */}
        <Box
          sx={{
            "& .diff-viewer": {
              fontSize: "12px",
              fontFamily: "monospace",
            },
            "& pre": {
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            },
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            Configuration Diff
          </Typography>
          <ReactDiffViewer
            oldValue={currentJson}
            newValue={proposedJson}
            splitView={true}
            useDarkTheme={true}
            leftTitle="Current Configuration"
            rightTitle="Proposed Configuration"
            compareMethod="diffLines"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigPreviewDialog;
