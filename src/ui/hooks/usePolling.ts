import { useCallback, useEffect, useRef, useState } from "react";

export interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: { interval?: number } = {},
): PollingState<T> {
  const { interval = 15000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef({ cancelled: false });

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
