/**
 * StartStopButton component - controls server start/stop operations
 * Implements optimistic updates with automatic rollback on failure
 */
import { Button, CircularProgress, Box } from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { useStartServer, useStopServer } from '@ui/api/mutations/server.mutations';
import type { ServerInfo } from '@ui/api/schemas/server.schema';

interface StartStopButtonProps {
  server: ServerInfo;
}

/**
 * Button that starts or stops a server with optimistic UI updates
 * 
 * Features:
 * - Optimistic status updates (instant feedback)
 * - Automatic rollback on error
 * - Loading indicator during operation
 * - Disabled state management
 * - Color-coded icons (green=start, red=stop)
 * 
 * @example
 * ```tsx
 * <StartStopButton server={serverInfo} />
 * ```
 */
export function StartStopButton({ server }: StartStopButtonProps) {
  const startMutation = useStartServer();
  const stopMutation = useStopServer();
  
  const isStarting = startMutation.isPending;
  const isStopping = stopMutation.isPending;
  const isPending = isStarting || isStopping;
  
  const isRunning = server.status === 'connected' || server.status === 'connecting';
  const isDisabled = server.status === 'disabled';
  const hasError = server.status === 'error';
  const needsAuth = server.status === 'unauthorized';
  
  const handleClick = () => {
    if (isRunning) {
      stopMutation.mutate({ 
        serverName: server.name,
        disable: false 
      });
    } else {
      startMutation.mutate(server.name);
    }
  };
  
  // Show authorization link for unauthorized servers
  if (needsAuth && server.authorizationUrl) {
    return (
      <Button
        variant="outlined"
        color="warning"
        fullWidth
        size="small"
        href={server.authorizationUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Authorize Server
      </Button>
    );
  }
  
  return (
    <Button
      variant={isRunning ? 'outlined' : 'contained'}
      color={isRunning ? 'error' : 'success'}
      fullWidth
      size="small"
      onClick={handleClick}
      disabled={isPending || isDisabled}
      startIcon={
        isPending ? (
          <CircularProgress size={16} />
        ) : isRunning ? (
          <Stop />
        ) : (
          <PlayArrow />
        )
      }
    >
      <Box component="span">
        {isPending ? (
          isStarting ? 'Starting...' : 'Stopping...'
        ) : isRunning ? (
          'Stop'
        ) : isDisabled ? (
          'Disabled'
        ) : hasError ? (
          'Retry'
        ) : (
          'Start'
        )}
      </Box>
    </Button>
  );
}
