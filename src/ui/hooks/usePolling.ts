import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @deprecated usePolling is deprecated. Use one of the following instead:
 * 1. React Query hooks (useQuery, useInfiniteQuery) for automatic caching and refetching
 * 2. ErrorBoundary component with recovery actions for error handling
 * 3. useErrorRecovery hook for manual retry logic with exponential backoff
 *
 * Migration guide:
 * - For automatic polling: Use @tanstack/react-query with queryOptions.refetchInterval
 * - For error recovery: Use ErrorBoundary or useErrorRecovery hook
 * - For SSE updates: Use useSSESubscription hook
 *
 * Will be removed in version 2.0.0
 */
export interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * @deprecated usePolling is deprecated. See deprecation notice above.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: { interval?: number } = {},
): PollingState<T> {
  const { interval = 15000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef({ cancelled: false });

  // Runtime deprecation warning
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[Deprecation] usePolling hook is deprecated. " +
      "Use React Query hooks or ErrorBoundary instead. " +
      "See usePolling.ts for migration guide."
    );
  }

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      if (!controllerRef.current.cancelled) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!controllerRef.current.cancelled) {
        setError((err as Error).message);
      }
    } finally {
      if (!controllerRef.current.cancelled) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    controllerRef.current.cancelled = false;
    run();
    const id = setInterval(run, interval);

    return () => {
      controllerRef.current.cancelled = true;
      clearInterval(id);
    };
  }, [interval, run]);

  return {
    data,
    error,
    loading,
    refresh: run,
  };
}
