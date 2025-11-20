/**
 * ServerList component - displays all MCP servers with real-time status
 * Uses React Query for data fetching and automatic cache updates
 */
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useServers } from '@ui/api/hooks/useServers';
import type { ServersResponse } from '@ui/api/schemas/server.schema';
import { ServerCard } from './ServerCard';

/**
 * Container component that fetches and displays all servers
 * 
 * Features:
 * - Automatic refetching on window focus
 * - Loading and error states
 * - Responsive CSS grid layout
 * - Real-time updates via SSE integration
 * 
 * @example
 * ```tsx
 * <ServerList />
 * ```
 */
export function ServerList() {
  const { data, isLoading, error } = useServers() as { 
    data?: ServersResponse; 
    isLoading: boolean; 
    error: Error | null;
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load servers: {errorMessage}
      </Alert>
    );
  }

  if (!data || data.servers.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No servers configured. Add servers to your configuration to get started.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        MCP Servers
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Manage your Model Context Protocol server connections
      </Typography>
      
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 2
        }}
      >
        {data.servers.map((server) => (
          <ServerCard key={server.name} server={server} />
        ))}
      </Box>
    </Box>
  );
}
