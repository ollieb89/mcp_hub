import SubjectIcon from "@mui/icons-material/Subject";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import MetricCard from "./MetricCard";

export type LogEntry = {
  timestamp: string;
  message: string;
  level?: string;
};

type LogsPanelProps = {
  logs: LogEntry[];
  loading?: boolean;
  onViewAll?: () => void;
};

const LogsPanel = ({ logs, loading = false, onViewAll }: LogsPanelProps) => (
  <MetricCard
    title="Recent Logs"
    value={`${logs.length} entries`}
    subtitle="Live log stream updates automatically."
    icon={<SubjectIcon />}
    action={
      onViewAll && (
        <Button onClick={onViewAll} size="small">
          View All
        </Button>
      )
    }
  >
    <Box
      sx={{
        mt: 2,
        maxHeight: 260,
        overflow: "auto",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      {loading ? (
        <Stack spacing={1} sx={{ p: 2 }}>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Stack>
      ) : logs.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ py: 3 }}
        >
          Waiting for log events…
        </Typography>
      ) : (
        <List dense disablePadding>
          {logs.map((log, index) => (
            <ListItem
              key={`${log.timestamp}-${index}`}
              sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Typography>
                    {log.level && (
                      <Typography variant="caption" color="text.secondary">
                        [{log.level.toUpperCase()}]
                      </Typography>
                    )}
                  </Stack>
                }
                secondary={
                  <Typography variant="body2" color="text.primary">
                    {log.message}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  </MetricCard>
);

export default LogsPanel;
