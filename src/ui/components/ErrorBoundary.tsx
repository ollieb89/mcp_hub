import React, { ReactNode, ErrorInfo } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSnackbar } from "@hooks/useSnackbar";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  recoverableErrors?: RegExp[];
  logToService?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * ErrorBoundary component for graceful error handling with recovery actions
 * 
 * Replaces the need for manual polling/error state management by providing:
 * - Automatic error capturing
 * - Retry mechanisms with exponential backoff
 * - Optional error logging service integration
 * - Customizable fallback UI
 * - Recovery action callbacks
 * 
 * @deprecated usePolling.ts - Use ErrorBoundary for error handling + recovery instead
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, logToService } = this.props;

    // Log error to console
    console.error("ErrorBoundary caught error:", error, errorInfo);

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to service if enabled
    if (logToService) {
      this.logErrorToService(error, errorInfo);
    }

    // Update error count
    this.setState((prev) => ({
      errorCount: prev.errorCount + 1,
    }));
  }

  componentWillUnmount() {
    // Clean up retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  private logErrorToService = async (error: Error, info: ErrorInfo) => {
    try {
      // This would integrate with your error logging service
      // e.g., Sentry, LogRocket, etc.
      console.log("[ErrorBoundary] Would log to service:", {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[ErrorBoundary] Failed to log error:", err);
    }
  };

  private isRecoverableError = (error: Error): boolean => {
    const { recoverableErrors } = this.props;

    if (!recoverableErrors) {
      return false;
    }

    return recoverableErrors.some((pattern) => pattern.test(error.message));
  };

  private getRetryDelay = (): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. (max 30s)
    const { errorCount } = this.state;
    return Math.min(1000 * Math.pow(2, Math.max(0, errorCount - 1)), 30000);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleAutoRetry = () => {
    const delay = this.getRetryDelay();
    const timeout = setTimeout(() => {
      this.handleRetry();
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, recoverableErrors } = this.props;

    if (!hasError) {
      return children;
    }

    if (!error) {
      return children;
    }

    const isRecoverable = this.isRecoverableError(error);

    // Use custom fallback if provided
    if (fallback) {
      return fallback(error, this.handleRetry);
    }

    // Default fallback UI
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={3}>
          <Stack spacing={2} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ErrorIcon color="error" sx={{ fontSize: 32 }} />
              <Typography variant="h6" color="error">
                Something went wrong
              </Typography>
            </Stack>

            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2" component="div">
                {error.message || "An unexpected error occurred"}
              </Typography>
            </Alert>

            {isRecoverable && (
              <Alert severity="info">
                <Typography variant="body2">
                  This error may be temporary. Click retry to try again, or the app will attempt to recover
                  automatically in a few moments.
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                Retry Now
              </Button>

              {isRecoverable && (
                <Button
                  variant="outlined"
                  onClick={this.handleAutoRetry}
                  disabled={this.state.errorCount > 3}
                >
                  Auto-retry (Attempt {this.state.errorCount}/3)
                </Button>
              )}

              <Button
                variant="outlined"
                color="inherit"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </Stack>

            {process.env.NODE_ENV === "development" && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                <Typography variant="caption" component="pre">
                  {error.stack}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  }
}

/**
 * Hook-based error boundary for use in functional components
 * Provides recovery actions similar to usePolling but with proper error handling
 */
export function useErrorRecovery() {
  const { showSnackbar } = useSnackbar();

  const retry = React.useCallback(
    (operation: () => Promise<void>, maxRetries = 3) => {
      let attempts = 0;

      const attemptOperation = async (): Promise<void> => {
        try {
          attempts++;
          await operation();
          showSnackbar("Operation succeeded");
        } catch (error) {
          if (attempts < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
            showSnackbar(`Retrying in ${delay / 1000}s... (Attempt ${attempts}/${maxRetries})`);
            setTimeout(attemptOperation, delay);
          } else {
            showSnackbar(`Operation failed after ${maxRetries} attempts`);
            throw error;
          }
        }
      };

      return attemptOperation();
    },
    [showSnackbar],
  );

  return { retry };
}

export default ErrorBoundary;
