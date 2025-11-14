# ErrorBoundary Quick Reference

## One-Minute Setup

Add to any page:

```tsx
import ErrorBoundary from '@components/ErrorBoundary';

export default function MyPage() {
  return (
    <ErrorBoundary
      recoverableErrors={[/network error|timeout|connection failed/i]}
      onError={(error) => console.log('[MyPage]', error.message)}
    >
      <Box>{/* Your page content */}</Box>
    </ErrorBoundary>
  );
}
```

## Error Pattern Templates

Copy and customize for your page:

### Network/Fetch Errors
```tsx
recoverableErrors={[/failed to fetch|network error|timeout|connection refused|server unavailable/i]}
```

### API/Server Errors
```tsx
recoverableErrors={[/api error|server error|connection refused|timeout|500|502|503/i]}
```

### Data Processing Errors
```tsx
recoverableErrors={[/json parse error|validation error|format error|network error/i]}
```

### Tool/Filter Errors
```tsx
recoverableErrors={[/filter error|tool error|fetch error|network error/i]}
```

## Test Template

```tsx
it('handles errors gracefully', async () => {
  const { getByText } = render(
    <ErrorBoundary recoverableErrors={[/error/i]}>
      <MyComponent shouldThrow={true} />
    </ErrorBoundary>,
  );

  await waitFor(() => {
    expect(getByText(/something went wrong/i)).toBeInTheDocument();
  });

  const retryButton = getByText(/retry now/i);
  expect(retryButton).toBeInTheDocument();
});
```

## Hook Usage

```tsx
import { useErrorRecovery } from '@components/ErrorBoundary';

function MyComponent() {
  const { retry } = useErrorRecovery();

  const handleClick = async () => {
    await retry(
      () => fetchData(),
      3, // max retries
    );
  };

  return <button onClick={handleClick}>Retry</button>;
}
```

## Custom Fallback

```tsx
<ErrorBoundary
  fallback={({ error }) => (
    <Alert severity="error">
      {error?.message}
      <button>Try Again</button>
    </Alert>
  )}
>
  <MyContent />
</ErrorBoundary>
```

## Pages Using ErrorBoundary

| Page | Location | Patterns |
|------|----------|----------|
| Dashboard | `src/ui/pages/DashboardPage.tsx` | `/failed to fetch\|timeout\|network error/i` |
| Servers | `src/ui/pages/ServersPage.tsx` | `/connection refused\|server error\|timeout\|network error/i` |
| Config | `src/ui/pages/ConfigPage.tsx` | `/json parse error\|validation error\|config error\|network error/i` |
| Tools | `src/ui/pages/ToolsPage.tsx` | `/filter error\|tool fetch error\|network error/i` |

## Debugging

Enable detailed logging:

```tsx
<ErrorBoundary
  onError={(error, info) => {
    console.group('[ErrorBoundary]');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    console.log('Component Stack:', info?.componentStack);
    console.groupEnd();
  }}
>
  <MyContent />
</ErrorBoundary>
```

## Common Errors

| Problem | Solution |
|---------|----------|
| Error not caught | Errors must occur during render (not event handlers) |
| Infinite retries | Ensure patterns match only transient errors |
| Wrong button text | Use `getByRole('button', { name: /retry now/i })` in tests |
| No fallback UI | Provide `fallback` prop or check children throw error |

## Documentation

- **Full Guide:** `claudedocs/ERRORBOUNDARY_USAGE_GUIDE.md`
- **Unit Tests:** `tests/ui/ErrorBoundary.test.tsx` (19 tests)
- **Integration Tests:** `tests/ui/pages/ErrorBoundary.integration.test.tsx` (14 tests)
- **Completion Summary:** `claudedocs/PHASE4_COMPLETION_SUMMARY.md`

## Status

- ✅ 33/33 tests passing
- ✅ Bundle size: 242.12 KB (within limits)
- ✅ Production ready
- ✅ All pages integrated
