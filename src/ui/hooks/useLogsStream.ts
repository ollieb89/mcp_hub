import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@components/LogsPanel";

type UseLogsStreamOptions = {
  limit?: number;
};

type LogsStreamState = {
  logs: LogEntry[];
  connected: boolean;
};

export function useLogsStream(
  options: UseLogsStreamOptions = {},
): LogsStreamState {
  const { limit = 50 } = options;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/logs");
    eventSourceRef.current = eventSource;

    const pushLogs = (entries: LogEntry[]) => {
      setLogs((prev) => {
        const next = [...prev, ...entries];
        return next.slice(-limit);
      });
    };

    eventSource.addEventListener("open", () => {
      setConnected(true);
    });

    eventSource.addEventListener("log", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        pushLogs([
          {
            timestamp: payload.timestamp ?? new Date().toISOString(),
            message: payload.message ?? "",
            level: payload.type,
          },
        ]);
      } catch {
        // Ignore malformed payloads
      }
    });

    eventSource.addEventListener("log_batch", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (Array.isArray(payload.events)) {
          const entries: LogEntry[] = payload.events.map((item: any) => ({
            timestamp: item.timestamp ?? new Date().toISOString(),
            message: item.message ?? "",
            level: item.type,
          }));
          pushLogs(entries);
        }
      } catch {
        // Ignore malformed batches
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [limit]);

  return { logs, connected };
}
