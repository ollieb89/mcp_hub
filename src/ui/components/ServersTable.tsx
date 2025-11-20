import ReplayIcon from "@mui/icons-material/Replay";
import RouterIcon from "@mui/icons-material/Router";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ServerInfo } from "@api/servers";

type ServersTableProps = {
  servers: ServerInfo[];
  loading?: boolean;
  onRefresh: () => void;
  onToggle: (server: ServerInfo, enabled: boolean) => Promise<void> | void;
  onRestart: (server: ServerInfo) => Promise<void> | void;
};

const formatUptime = (seconds?: number) => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const ServersTable = ({
  servers,
  loading = false,
  onRefresh,
  onToggle,
  onRestart,
}: ServersTableProps) => (
  <Box>
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      mb={2}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <RouterIcon color="primary" />
        <Typography variant="h6" fontWeight={600}>
          Connected Servers
        </Typography>
      </Stack>
      <Button
        variant="outlined"
        size="small"
        startIcon={loading ? <CircularProgress size={14} /> : <ReplayIcon />}
        onClick={onRefresh}
        disabled={loading}
      >
        Refresh
      </Button>
    </Stack>
    <TableContainer
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Server</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Transport</TableCell>
            <TableCell align="right">Tools</TableCell>
            <TableCell align="right">Uptime</TableCell>
            <TableCell align="right">Enabled</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {servers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 3 }}
                >
                  No servers discovered. Configure servers to populate this table.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            servers.map((server) => {
              const toolsCount =
                server.capabilities?.tools?.length ??
                (server as unknown as { tools?: unknown[] }).tools?.length ??
                0;
              const enabled = server.status !== "disabled";

              return (
                <TableRow key={server.name} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {server.displayName || server.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {server.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        server.status === "connected"
                          ? "success"
                          : server.status === "connecting"
                            ? "warning"
                            : server.status === "disabled"
                              ? "default"
                              : "error"
                      }
                      label={server.status}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {server.transportType ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{toolsCount}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatUptime(server.uptime as number | undefined)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={enabled}
                      onChange={(event) => onToggle(server, event.target.checked)}
                      inputProps={{ "aria-label": `Toggle ${server.name}` }}
                      data-testid={`toggle-${server.name}`}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Restart server">
                      <span>
                        <IconButton
                          aria-label="Restart server"
                          size="small"
                          onClick={() => onRestart(server)}
                          disabled={server.status !== "connected"}
                        >
                          <PowerSettingsNewIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

export default ServersTable;
