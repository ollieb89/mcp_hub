/**
 * SSE Connection Manager with React Query integration
 * Handles automatic cache invalidation on SSE events
 */
import { queryClient, queryKeys } from './query-client';
import { useSSEStore } from '../store/sse.store';

export type SSEEventType =
  | 'hub_state'
  | 'tool_list_changed'
  | 'resource_list_changed'
  | 'servers_updated'
  | 'config_changed';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners = new Map<SSEEventType, Set<(data: unknown) => void>>();

  connect() {
    if (this.eventSource) {
      return;
    }

    const store = useSSEStore.getState();
    store.setConnecting(true);

    this.eventSource = new EventSource('/events');

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected');
      const store = useSSEStore.getState();
      store.setConnected(true);
      store.resetReconnectAttempts();
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      const store = useSSEStore.getState();
      store.setConnected(false);
      store.setError('Connection error');
      this.eventSource?.close();
      this.eventSource = null;
      this.reconnect();
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.eventSource) return;

    // Hub state changes
    this.eventSource.addEventListener('hub_state', (event) => {
      const data = JSON.parse(event.data);
      this.emit('hub_state', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.health });
    });

    // Tool list changes
    this.eventSource.addEventListener('tool_list_changed', (event) => {
      const data = JSON.parse(event.data);
      this.emit('tool_list_changed', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    });

    // Server updates
    this.eventSource.addEventListener('servers_updated', (event) => {
      const data = JSON.parse(event.data);
      this.emit('servers_updated', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    });

    // Config changes
    this.eventSource.addEventListener('config_changed', (event) => {
      const data = JSON.parse(event.data);
      this.emit('config_changed', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    });

    // Resource list changes
    this.eventSource.addEventListener('resource_list_changed', (event) => {
      const data = JSON.parse(event.data);
      this.emit('resource_list_changed', data);
    });
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached');
      const store = useSSEStore.getState();
      store.setError('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    const store = useSSEStore.getState();
    store.incrementReconnectAttempts();

    setTimeout(() => {
      console.log(`[SSE] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  subscribe(eventType: SSEEventType, callback: (data: unknown) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: SSEEventType, data: unknown) {
    this.listeners.get(eventType)?.forEach((callback) => callback(data));
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.listeners.clear();
    const store = useSSEStore.getState();
    store.setConnected(false);
  }

  getConnectionState() {
    const store = useSSEStore.getState();
    return {
      isConnected: store.isConnected,
      isConnecting: store.isConnecting,
      reconnectAttempts: store.reconnectAttempts,
      lastError: store.lastError,
    };
  }
}

export const sseManager = new SSEConnectionManager();
