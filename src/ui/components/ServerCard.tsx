/**
 * ServerCard component - displays individual server status and controls
 * Shows server info, status, and start/stop button
 */
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Chip, 
  Box,
  Tooltip
} from '@mui/material';
import type { ServerInfo, ServerStatus } from '@ui/api/schemas/server.schema';
import { StartStopButton } from './StartStopButton';

interface ServerCardProps {
  server: ServerInfo;
}

/**
 * Get Material-UI color for server status
 */
function getStatusColor(status: ServerStatus): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'connected':
      return 'success';
    case 'connecting':
      return 'info';
    case 'disconnected':
    case 'disabled':
      return 'default';
    case 'unauthorized':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  if (seconds === 0) return 'Not running';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Displays individual server card with status and controls
 * 
 * Features:
 * - Visual status indicator with color coding
 * - Server description and transport type
 * - Uptime display
 * - Integrated start/stop button
 * - Pulse animation during status transitions
 * 
 * @example
 * ```tsx
 * <ServerCard server={serverInfo} />
 * ```
 */
export function ServerCard({ server }: ServerCardProps) {
  const isTransitioning = server.status === 'connecting';
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        ...(isTransitioning && {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.8 }
          }
        })
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" noWrap>
            {server.displayName || server.name}
          </Typography>
          <Chip 
            label={server.status} 
            color={getStatusColor(server.status)}
            size="small"
          />
        </Box>
        
        {server.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {server.description}
          </Typography>
        )}
        
        <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
          <Tooltip title="Transport Type">
            <Chip 
              label={server.transportType} 
              size="small" 
              variant="outlined"
            />
          </Tooltip>
          
          {server.uptime > 0 && (
            <Tooltip title="Uptime">
              <Chip 
                label={formatUptime(server.uptime)} 
                size="small" 
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
        
        {server.error && (
          <Typography variant="caption" color="error" display="block" mt={1}>
            Error: {server.error}
          </Typography>
        )}
        
        {server.authorizationUrl && server.status === 'unauthorized' && (
          <Typography variant="caption" color="warning.main" display="block" mt={1}>
            Authorization required
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ px: 2, pb: 2 }}>
        <StartStopButton server={server} />
      </CardActions>
    </Card>
  );
}
