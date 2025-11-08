/**
 * React hook for SSE event subscription with centralized connection management
 * Integrates with the SSE manager and React Query for automatic cache invalidation
 */
import { useEffect } from 'react';
import { sseManager, SSEEventType } from '../utils/sse-client';

/**
 * Subscribe to SSE events with automatic lifecycle management
 *
 * This hook uses the centralized SSE manager which:
 * - Maintains a single EventSource connection to /events
 * - Automatically invalidates React Query cache on relevant events
 * - Implements exponential backoff reconnection (max 5 attempts)
 * - Tracks connection state in Zustand SSE store
 *
 * @param eventTypes - Array of SSE event types to subscribe to
 * @param callback - Optional callback invoked when events are received
 *
 * @example
 * ```tsx
 * // Basic usage - automatic cache invalidation only
 * useSSESubscription(['servers_updated', 'config_changed']);
 *
 * // With custom callback for additional logic
 * useSSESubscription(['tool_list_changed'], (eventType, data) => {
 *   console.log('Tool list updated:', data);
 *   // Custom logic here (cache invalidation happens automatically)
 * });
 *
 * // Subscribe to multiple events
 * useSSESubscription(
 *   ['hub_state', 'servers_updated', 'config_changed'],
 *   (eventType, data) => {
 *     switch (eventType) {
 *       case 'hub_state':
 *         console.log('Hub state:', data);
 *         break;
 *       case 'servers_updated':
 *         console.log('Servers updated');
 *         break;
 *       case 'config_changed':
 *         console.log('Config changed');
 *         break;
 *     }
 *   }
 * );
 * ```
 *
 * Available event types:
 * - `hub_state` - Hub state changed (starting/ready/restarting/stopped)
 * - `tool_list_changed` - Tool list changed
 * - `resource_list_changed` - Resource list changed
 * - `servers_updated` - Server statuses updated
 * - `config_changed` - Configuration changed
 */
export function useSSESubscription(
  eventTypes: SSEEventType[],
  callback?: (eventType: SSEEventType, data: unknown) => void
) {
  useEffect(() => {
    // Connect to SSE (idempotent - safe to call multiple times)
    // SSE manager maintains single connection shared across all hook instances
    sseManager.connect();

    // Subscribe to all requested event types
    const unsubscribers = eventTypes.map((eventType) =>
      sseManager.subscribe(eventType, (data) => {
        // Invoke user callback if provided
        // Note: React Query cache invalidation happens automatically in SSE manager
        callback?.(eventType, data);
      })
    );

    // Cleanup: unsubscribe from all events on unmount
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [eventTypes, callback]);
}
