/**
 * Zustand store for SSE connection state
 * Tracks connection status and error state
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SSEState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setError: (error: string | null) => void;
}

export const useSSEStore = create<SSEState>()(
  devtools(
    (set) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      lastError: null,

      // Actions
      setConnected: (connected) =>
        set({
          isConnected: connected,
          isConnecting: false,
          lastError: connected ? null : undefined,
        }),
      setConnecting: (connecting) => set({ isConnecting: connecting }),
      incrementReconnectAttempts: () =>
        set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
      resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
      setError: (error) => set({ lastError: error }),
    }),
    { name: 'SSE Store' }
  )
);
