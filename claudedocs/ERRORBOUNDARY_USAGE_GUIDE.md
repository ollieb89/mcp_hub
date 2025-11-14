# ErrorBoundary Usage Guide

## Overview

The `ErrorBoundary` component provides robust error handling for React components with automatic recovery, exponential backoff retry logic, and customizable error fallback UI. It replaces the deprecated `usePolling` hook pattern and provides both class-component and hook-based APIs.

## Quick Start

### Basic Usage (Class Component Wrapper)

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

function MyPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/network error|timeout|failed to fetch/i]}
      onError={(error) => {
        console.log('[MyPage] Error caught:', error.message);
      }}
    >
      <div>
        {/* Your page content here */}
        <h1>My Page</h1>
      </div>
    </ErrorBoundary>
  );
}
```

### Hook-Based Recovery (Functional Components)

```tsx
import { useErrorRecovery } from '@components/ErrorBoundary';

function MyComponent() {
  const { retry } = useErrorRecovery();

  const handleOperation = async () => {
    try {
      await retry(
        async () => {
          // Your async operation
          const response = await fetch('/api/data');
          if (!response.ok) throw new Error('Failed to fetch');
          return response.json();
        },
        3, // max retries
      );
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  return <button onClick={handleOperation}>Retry Operation</button>;
}
```

## API Reference

### ErrorBoundary Component Props

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  
  // Array of RegExp patterns for errors that can auto-retry
  recoverableErrors?: RegExp[];
  
  // Callback when an error is caught
  onError?: (error: Error, info?: React.ErrorInfo) => void;
  
  // Custom fallback UI
  fallback?: (props: {
    error: Error | null;
    reset: () => void;
  }) => React.ReactNode;
  
  // Whether to log errors to service (e.g., Sentry)
  logToService?: boolean;
}
```

### useErrorRecovery Hook

```tsx
function useErrorRecovery() {
  return {
    retry: async (
      operation: () => Promise<void>,
      maxRetries?: number,
    ) => Promise<void>;
  };
}
```

## Implementation Patterns

### 1. Dashboard Page Pattern

**Use Case:** Pages with network-dependent data loading (filtering stats, charts, logs)

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

export default function DashboardPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/failed to fetch|timeout|network error/i]}
      onError={(error) => {
        console.log('[Dashboard] Error caught:', error.message);
      }}
    >
      <Box>
        {/* Dashboard content: stats, charts, logs */}
      </Box>
    </ErrorBoundary>
  );
}
```

**Error Patterns Handled:**
- Network timeouts
- Failed fetch requests
- API unavailability

**Fallback Behavior:**
- Auto-retry on network errors (exponential backoff)
- Manual retry button for persistent errors
- Error message display for debugging

### 2. Server Management Pattern

**Use Case:** Pages with server state mutations (start, stop, restart)

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

export default function ServersPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/connection refused|server error|timeout|network error/i]}
      onError={(error) => {
        console.log('[Servers] Error caught:', error.message);
      }}
    >
      <Box>
        {/* Servers table, mutation controls */}
      </Box>
    </ErrorBoundary>
  );
}
```

**Error Patterns Handled:**
- Connection refused
- Server unavailable
- Timeout during operations

**Fallback Behavior:**
- Auto-retry transient connection errors
- Display current server state on error
- Provide manual retry for operations

### 3. Configuration Management Pattern

**Use Case:** Pages with JSON parsing and validation (config editing, form validation)

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

export default function ConfigPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/json parse error|validation error|config error|network error/i]}
      onError={(error) => {
        console.log('[Config] Error caught:', error.message);
      }}
    >
      <Box>
        {/* Config editors, JSON viewers */}
      </Box>
    </ErrorBoundary>
  );
}
```

**Error Patterns Handled:**
- JSON parsing errors
- Validation failures
- Configuration loading errors

**Fallback Behavior:**
- Auto-retry network-related config loading
- Display last known valid config on validation error
- Provide reload option for user-correctable errors

### 4. Tool Filtering Pattern

**Use Case:** Pages with data filtering and display (tool browsing, filtering UI)

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

export default function ToolsPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/filter error|tool fetch error|network error/i]}
      onError={(error) => {
        console.log('[Tools] Error caught:', error.message);
      }}
    >
      <Box>
        {/* Tools table, filter controls */}
      </Box>
    </ErrorBoundary>
  );
}
```

**Error Patterns Handled:**
- Tool fetch failures
- Filter application errors
- Network errors

**Fallback Behavior:**
- Auto-retry network errors
- Preserve tool list while fixing filter errors
- Provide manual filter reset option

## Error Classification

### Recoverable Errors (Auto-Retry)

Errors matching `recoverableErrors` patterns trigger automatic retry with exponential backoff:
- 1st attempt: immediate
- 2nd attempt: 1 second delay
- 3rd attempt: 2 seconds delay
- 4th attempt: 4 seconds delay (max 30s)

Examples:
- Network timeouts
- Temporary service unavailability
- Connection refused (transient)
- Failed to fetch (temporary network issue)

### Non-Recoverable Errors (Manual Retry)

Errors NOT matching `recoverableErrors` patterns show error UI with manual retry button:
- Invalid API keys
- Malformed requests
- Missing required configuration
- Permission denied errors

## Custom Fallback UI

Provide custom error UI per page or use the default:

```tsx
<ErrorBoundary
  fallback={({ error, reset }) => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Configuration Error</h2>
      <p>{error?.message}</p>
      <button onClick={reset}>Try Again</button>
      <a href="/docs/config">View Documentation</a>
    </div>
  )}
>
  <YourContent />
</ErrorBoundary>
```

## Error Logging Integration

Enable error logging to external services:

```tsx
<ErrorBoundary
  recoverableErrors={[/error/i]}
  logToService={true}
  onError={(error, info) => {
    // Custom logging logic
    console.error('Page error:', error, info?.componentStack);
  }}
>
  <YourContent />
</ErrorBoundary>
```

## Testing Error Boundaries

### Unit Testing

```tsx
it('catches and handles errors', async () => {
  const { getByText } = render(
    <ErrorBoundary recoverableErrors={[/error/i]}>
      <ThrowingComponent />
    </ErrorBoundary>,
  );

  await waitFor(() => {
    expect(getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
it('integrates with pages correctly', async () => {
  const { getByText } = render(
    <ErrorBoundary recoverableErrors={[/network error/i]}>
      <DashboardPage />
    </ErrorBoundary>,
  );

  // Verify error handling and recovery
  const retryButton = getByText(/retry/i);
  await userEvent.click(retryButton);
  
  expect(getByText(/dashboard/i)).toBeInTheDocument();
});
```

## Best Practices

### 1. **Specific Error Patterns**

Use domain-specific error patterns for each page:

```tsx
// Good: Specific to dashboard errors
recoverableErrors={[/failed to fetch|timeout|network error/i]}

// Avoid: Too broad
recoverableErrors={[/error/i]}
```

### 2. **Meaningful Error Messages**

Ensure error messages are user-friendly:

```tsx
// Good: Clear and actionable
throw new Error('Failed to fetch dashboard data - please check your connection');

// Avoid: Generic or technical
throw new Error('ERR_NETWORK_TIMEOUT');
```

### 3. **Strategic Placement**

Wrap pages, not individual components:

```tsx
// Good: Error boundary wraps entire page
<ErrorBoundary>
  <DashboardPage />
</ErrorBoundary>

// Avoid: Excessive nesting
<ErrorBoundary>
  <Component1>
    <ErrorBoundary>
      <Component2 />
    </ErrorBoundary>
  </Component1>
</ErrorBoundary>
```

### 4. **Provide Context in Callbacks**

Include page/feature context in error callbacks:

```tsx
onError={(error) => {
  console.log('[DashboardPage] Error:', error.message);
  // Track feature-specific errors for monitoring
}}
```

### 5. **Combine with Query Error Handling**

Use ErrorBoundary for React errors, React Query's `onError` for API errors:

```tsx
// ErrorBoundary for render/lifecycle errors
<ErrorBoundary recoverableErrors={[/network error/i]}>
  <Component />
</ErrorBoundary>

// React Query onError for API errors
const { data, error } = useQuery({
  queryFn: fetchData,
  onError: (error) => {
    // Handle API-specific errors
  },
});
```

## Migration from usePolling

The deprecated `usePolling` hook has been replaced with ErrorBoundary + `useErrorRecovery`:

**Old Pattern (Deprecated):**
```tsx
const { isLoading, error } = usePolling(fetchData, 5000);
```

**New Pattern:**
```tsx
<ErrorBoundary recoverableErrors={[/network error/i]}>
  <MyComponent />
</ErrorBoundary>

// Inside component
const { retry } = useErrorRecovery();
await retry(fetchData);
```

## Monitoring and Debugging

### Enable Debug Logging

```tsx
<ErrorBoundary
  onError={(error, info) => {
    console.log('[ErrorBoundary] Error:', {
      message: error.message,
      stack: error.stack,
      componentStack: info?.componentStack,
      timestamp: new Date().toISOString(),
    });
  }}
>
  <YourContent />
</ErrorBoundary>
```

### Track Error Metrics

```tsx
const onErrorCallback = (error: Error) => {
  // Send to monitoring service
  trackError({
    name: error.name,
    message: error.message,
    feature: 'DashboardPage',
    timestamp: Date.now(),
  });
};
```

## Troubleshooting

### Error Not Being Caught

**Problem:** Error boundary not catching component errors

**Solution:** Verify the error occurs during render or lifecycle (not event handlers):
- ✅ Render phase errors
- ✅ Lifecycle method errors
- ❌ Event handler errors (use try/catch instead)

### Infinite Retry Loop

**Problem:** Errors keep retrying indefinitely

**Solution:** Ensure `recoverableErrors` patterns match only transient errors:
```tsx
// Only auto-retry network/timeout errors
recoverableErrors={[/network error|timeout|connection refused/i]}

// Don't auto-retry validation errors
// User-correctable errors should use manual retry
```

### Custom Fallback Not Rendering

**Problem:** Error boundary shows default UI instead of custom fallback

**Solution:** Ensure `fallback` function is provided and renders valid JSX:
```tsx
<ErrorBoundary
  fallback={({ error }) => (
    <div>Custom Error: {error?.message}</div>
  )}
>
  <YourContent />
</ErrorBoundary>
```

## See Also

- [ErrorBoundary Test Suite](../../tests/ui/ErrorBoundary.test.tsx)
- [ErrorBoundary Integration Tests](../../tests/ui/pages/ErrorBoundary.integration.test.tsx)
- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
