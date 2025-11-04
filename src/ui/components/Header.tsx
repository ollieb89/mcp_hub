import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

const Header = () => (
  <AppBar
    position="fixed"
    elevation={0}
    sx={{
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: "background.paper",
      color: "text.primary",
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Toolbar sx={{ minHeight: 64, px: 3 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          MCP Hub Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor servers, tools, and filtering in real time.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
        >
          Refresh
        </Button>
        <IconButton size="small">
          <NotificationsNoneIcon />
        </IconButton>
      </Stack>
    </Toolbar>
  </AppBar>
);

export default Header;
