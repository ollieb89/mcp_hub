import EventEmitter from 'events';

/**
 * Default batching configuration
 */
export const DEFAULT_BATCH_CONFIG = {
  batchWindow: 100,      // 100ms default batching window
  maxBatchSize: 50,      // Maximum events per batch
};

/**
 * Event types that should never be batched (critical events)
 * Note: 'log' events must bypass batching to prevent infinite recursion
 * (logger → SSE → EventBatcher → logger)
 */
const CRITICAL_EVENTS = new Set(['hub_state', 'error', 'log']);

/**
 * EventBatcher - Batches multiple SSE events into single notifications
 * to reduce network overhead and improve client-side processing efficiency.
 *
 * Features:
 * - Time-based batching (configurable window)
 * - Size-based batching (configurable max size)
 * - Deduplication within batches
 * - Critical event bypass
 *
 * @extends EventEmitter
 * @emits flush - Emitted when a batch is ready to send
 */
export class EventBatcher extends EventEmitter {
  /**
   * Create an EventBatcher
   * @param {Object} options Configuration options
   * @param {number} options.batchWindow Batching window in milliseconds (default: 100)
   * @param {number} options.maxBatchSize Maximum events per batch (default: 50)
   */
  constructor(options = {}) {
    super();

    this.batchWindow = options.batchWindow ?? DEFAULT_BATCH_CONFIG.batchWindow;
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_BATCH_CONFIG.maxBatchSize;

    // Batch queues by event type
    // Map<eventType, Array<eventData>>
    this.batches = new Map();

    // Timers for each event type
    // Map<eventType, NodeJS.Timeout>
    this.timers = new Map();

    // NOTE: No logging in constructor to prevent recursion during initialization
  }

  /**
   * Add event to batch queue
   * @param {string} eventType - Type of event (e.g., 'tool_list_changed')
   * @param {Object} eventData - Event data to batch
   */
  enqueue(eventType, eventData) {
    // Critical events bypass batching
    // NOTE: Do NOT log here to prevent infinite recursion (log → SSE → EventBatcher → log)
    if (this._isCriticalEvent(eventType)) {
      this.emit('flush', {
        type: eventType,
        batch: [eventData],
        batchSize: 1,
        reason: 'critical',
      });
      return;
    }

    // Initialize batch for this event type
    if (!this.batches.has(eventType)) {
      this.batches.set(eventType, []);
    }

    const batch = this.batches.get(eventType);

    // Deduplicate within batch
    const isDuplicate = this._isDuplicate(batch, eventData);
    if (isDuplicate) {
      // NOTE: No logging here to prevent recursion
      return;
    }

    // Add event to batch with timestamp
    batch.push({
      ...eventData,
      timestamp: Date.now(),
    });

    // NOTE: No logging here to prevent recursion with log events

    // Flush if batch size limit reached
    if (batch.length >= this.maxBatchSize) {
      // NOTE: No logging here to prevent recursion
      this._flushBatch(eventType, 'size_limit');
      return;
    }

    // Schedule batch flush if not already scheduled
    if (!this.timers.has(eventType)) {
      const timer = setTimeout(() => {
        this._flushBatch(eventType, 'time_window');
      }, this.batchWindow);

      this.timers.set(eventType, timer);
      // NOTE: No logging here to prevent recursion
    }
  }

  /**
   * Flush specific batch immediately
   * @param {string} eventType - Type of event to flush
   * @param {string} reason - Reason for flush ('time_window' | 'size_limit' | 'manual')
   * @private
   */
  _flushBatch(eventType, reason = 'manual') {
    const batch = this.batches.get(eventType);
    const timer = this.timers.get(eventType);

    // Clear timer if exists
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(eventType);
    }

    // Emit batch if not empty
    if (batch && batch.length > 0) {
      const batchData = {
        type: eventType,
        batch: [...batch],
        batchSize: batch.length,
        reason,
        timestamp: Date.now(),
      };

      // NOTE: No logging here to prevent recursion

      this.emit('flush', batchData);

      // Clear batch
      this.batches.delete(eventType);
    }
  }

  /**
   * Flush all pending batches immediately
   */
  flushAll() {
    // NOTE: No logging here to prevent recursion

    for (const eventType of this.batches.keys()) {
      this._flushBatch(eventType, 'manual');
    }
  }

  /**
   * Check if event is duplicate within batch
   * @param {Array} batch - Current batch array
   * @param {Object} eventData - Event to check
   * @returns {boolean} True if duplicate
   * @private
   */
  _isDuplicate(batch, eventData) {
    // Same server + same event = duplicate
    if (eventData.server) {
      return batch.some(item => item.server === eventData.server);
    }

    // Fallback to deep comparison for other events
    const eventStr = JSON.stringify(eventData);
    return batch.some(item => {
      // eslint-disable-next-line no-unused-vars
      const { timestamp, ...itemWithoutTimestamp } = item;
      return JSON.stringify(itemWithoutTimestamp) === eventStr;
    });
  }

  /**
   * Check if event type is critical and should bypass batching
   * @param {string} eventType - Event type to check
   * @returns {boolean} True if critical
   * @private
   */
  _isCriticalEvent(eventType) {
    return CRITICAL_EVENTS.has(eventType);
  }

  /**
   * Get current batching statistics
   * @returns {Object} Stats object
   */
  getStats() {
    const stats = {
      pendingBatches: this.batches.size,
      activeTimers: this.timers.size,
      batchSizes: {},
    };

    for (const [eventType, batch] of this.batches.entries()) {
      stats.batchSizes[eventType] = batch.length;
    }

    return stats;
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    // NOTE: No logging here to prevent recursion during shutdown

    // Flush all pending batches before cleanup
    this.flushAll();

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.batches.clear();

    // NOTE: No logging here to prevent recursion during shutdown
  }
}
