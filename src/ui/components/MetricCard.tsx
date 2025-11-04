import type { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

type MetricCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  action,
  children,
}: MetricCardProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      bgcolor: "background.paper",
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {icon && <Box sx={{ color: "primary.main" }}>{icon}</Box>}
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      {action && <Box sx={{ marginLeft: "auto" }}>{action}</Box>}
    </Box>
    <Typography variant="h4" fontWeight={700}>
      {value}
    </Typography>
    {subtitle && (
      <Box sx={{ color: "text.secondary" }}>
        {typeof subtitle === "string" ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : (
          subtitle
        )}
      </Box>
    )}
    {children}
  </Paper>
);

export default MetricCard;
