import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBatcher, DEFAULT_BATCH_CONFIG } from '../src/utils/event-batcher.js';

describe('EventBatcher', () => {
  let batcher;

  beforeEach(() => {
    // Use real timers for Bun compatibility
    // Bun's Vitest doesn't fully support fake timer APIs
  });

  afterEach(() => {
    if (batcher) {
      batcher.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      batcher = new EventBatcher();

      expect(batcher.batchWindow).toBe(DEFAULT_BATCH_CONFIG.batchWindow);
      expect(batcher.maxBatchSize).toBe(DEFAULT_BATCH_CONFIG.maxBatchSize);
      expect(batcher.batches.size).toBe(0);
      expect(batcher.timers.size).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      batcher = new EventBatcher({
        batchWindow: 200,
        maxBatchSize: 25,
      });

      expect(batcher.batchWindow).toBe(200);
      expect(batcher.maxBatchSize).toBe(25);
    });

    it('should handle zero values in configuration', () => {
      batcher = new EventBatcher({
        batchWindow: 0,
        maxBatchSize: 0,
      });

      expect(batcher.batchWindow).toBe(0);
      expect(batcher.maxBatchSize).toBe(0);
    });
  });

  describe('Event Enqueueing', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 100 });
    });

    it('should enqueue events to batch', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1', tools: [] });
      batcher.enqueue('tool_list_changed', { server: 'server2', tools: [] });

      expect(batcher.batches.get('tool_list_changed')).toHaveLength(2);
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('should add timestamp to enqueued events', () => {
      const mockTimestamp = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      batcher.enqueue('tool_list_changed', { server: 'server1', tools: [] });

      const batch = batcher.batches.get('tool_list_changed');
      expect(batch[0].timestamp).toBe(mockTimestamp);
    });

    it('should create separate batches for different event types', () => {
      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });

      expect(batcher.batches.size).toBe(2);
      expect(batcher.batches.has('tool_list_changed')).toBe(true);
      expect(batcher.batches.has('resource_list_changed')).toBe(true);
    });
  });

  describe('Time-Based Flushing', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 10 }); // Small window for fast tests
    });

    it('should flush batch after time window', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1', tools: [] });
      batcher.enqueue('tool_list_changed', { server: 'server2', tools: [] });

      expect(flushSpy).not.toHaveBeenCalled();

      // Wait for batch window to elapse
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0]).toMatchObject({
        type: 'tool_list_changed',
        batchSize: 2,
        reason: 'time_window',
      });
    });

    it('should clear batch after flushing', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(batcher.batches.has('tool_list_changed')).toBe(false);
      expect(batcher.timers.has('tool_list_changed')).toBe(false);
    });

    it('should handle multiple event types with separate timers', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });
      await new Promise(resolve => setTimeout(resolve, 15));

      // First event type should have flushed
      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].type).toBe('tool_list_changed');

      batcher.enqueue('resource_list_changed', { server: 'server1' });
      await new Promise(resolve => setTimeout(resolve, 15));

      // Second event type should now flush
      expect(flushSpy).toHaveBeenCalledTimes(2);
      expect(flushSpy.mock.calls[1][0].type).toBe('resource_list_changed');
    });
  });

  describe('Size-Based Flushing', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 1000, maxBatchSize: 3 });
    });

    it('should flush batch when size limit reached', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('tool_list_changed', { server: 'server2' });
      expect(flushSpy).not.toHaveBeenCalled();

      batcher.enqueue('tool_list_changed', { server: 'server3' });

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0]).toMatchObject({
        type: 'tool_list_changed',
        batchSize: 3,
        reason: 'size_limit',
      });
    });

    it('should flush immediately without waiting for timer', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      for (let i = 0; i < 3; i++) {
        batcher.enqueue('tool_list_changed', { server: `server${i}` });
      }

      // Should flush immediately, no need to advance timers
      expect(flushSpy).toHaveBeenCalledOnce();
      expect(batcher.batches.has('tool_list_changed')).toBe(false);
    });

    it('should clear timer when flushing due to size', () => {
      batcher.enqueue('tool_list_changed', { server: 'server1' });

      expect(batcher.timers.has('tool_list_changed')).toBe(true);

      batcher.enqueue('tool_list_changed', { server: 'server2' });
      batcher.enqueue('tool_list_changed', { server: 'server3' });

      expect(batcher.timers.has('tool_list_changed')).toBe(false);
    });
  });

  describe('Deduplication', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 10 });
    });

    it('should deduplicate events from same server', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1', tools: ['tool1'] });
      batcher.enqueue('tool_list_changed', { server: 'server1', tools: ['tool2'] });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batchSize).toBe(1);
    });

    it('should not deduplicate events from different servers', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1', tools: [] });
      batcher.enqueue('tool_list_changed', { server: 'server2', tools: [] });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batchSize).toBe(2);
    });

    it('should deduplicate identical events without server field', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('config_changed', { setting: 'value1' });
      batcher.enqueue('config_changed', { setting: 'value1' });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batchSize).toBe(1);
    });

    it('should not deduplicate different events without server field', async () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('config_changed', { setting: 'value1' });
      batcher.enqueue('config_changed', { setting: 'value2' });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batchSize).toBe(2);
    });
  });

  describe('Critical Event Bypass', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 100 });
    });

    it('should bypass batching for hub_state events', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('hub_state', { state: 'ready' });

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0]).toMatchObject({
        type: 'hub_state',
        batchSize: 1,
        reason: 'critical',
      });
    });

    it('should bypass batching for error events', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('error', { message: 'Something went wrong' });

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].reason).toBe('critical');
    });

    it('should not create batch or timer for critical events', () => {
      batcher.enqueue('hub_state', { state: 'ready' });

      expect(batcher.batches.has('hub_state')).toBe(false);
      expect(batcher.timers.has('hub_state')).toBe(false);
    });
  });

  describe('Manual Flushing', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 1000 });
    });

    it('should flush all pending batches on flushAll()', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });
      batcher.enqueue('prompt_list_changed', { server: 'server1' });

      expect(flushSpy).not.toHaveBeenCalled();

      batcher.flushAll();

      expect(flushSpy).toHaveBeenCalledTimes(3);
      expect(batcher.batches.size).toBe(0);
      expect(batcher.timers.size).toBe(0);
    });

    it('should mark manual flushes with correct reason', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.flushAll();

      expect(flushSpy.mock.calls[0][0].reason).toBe('manual');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 1000 });
    });

    it('should return correct statistics', () => {
      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('tool_list_changed', { server: 'server2' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });

      const stats = batcher.getStats();

      expect(stats.pendingBatches).toBe(2);
      expect(stats.activeTimers).toBe(2);
      expect(stats.batchSizes).toEqual({
        tool_list_changed: 2,
        resource_list_changed: 1,
      });
    });

    it('should return empty statistics when no batches', () => {
      const stats = batcher.getStats();

      expect(stats.pendingBatches).toBe(0);
      expect(stats.activeTimers).toBe(0);
      expect(stats.batchSizes).toEqual({});
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(() => {
      batcher = new EventBatcher({ batchWindow: 1000 });
    });

    it('should flush all batches on destroy', () => {
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });

      batcher.destroy();

      expect(flushSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear all timers on destroy', () => {
      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });

      expect(batcher.timers.size).toBe(2);

      batcher.destroy();

      expect(batcher.timers.size).toBe(0);
    });

    it('should clear all batches on destroy', () => {
      batcher.enqueue('tool_list_changed', { server: 'server1' });
      batcher.enqueue('resource_list_changed', { server: 'server1' });

      expect(batcher.batches.size).toBe(2);

      batcher.destroy();

      expect(batcher.batches.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event data', async () => {
      batcher = new EventBatcher({ batchWindow: 10 });
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', {});

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batch[0]).toHaveProperty('timestamp');
    });

    it('should handle very small batch window', async () => {
      batcher = new EventBatcher({ batchWindow: 1 });
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });

      await new Promise(resolve => setTimeout(resolve, 5));

      expect(flushSpy).toHaveBeenCalledOnce();
    });

    it('should handle very small max batch size', () => {
      batcher = new EventBatcher({ maxBatchSize: 1 });
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      batcher.enqueue('tool_list_changed', { server: 'server1' });

      expect(flushSpy).toHaveBeenCalledOnce();
      expect(flushSpy.mock.calls[0][0].batchSize).toBe(1);
    });

    it('should handle rapid enqueueing of events', () => {
      batcher = new EventBatcher({ batchWindow: 100, maxBatchSize: 50 });
      const flushSpy = vi.fn();
      batcher.on('flush', flushSpy);

      for (let i = 0; i < 100; i++) {
        batcher.enqueue('tool_list_changed', { server: `server${i}` });
      }

      // Should flush twice due to size limit (50 + 50)
      expect(flushSpy).toHaveBeenCalledTimes(2);
    });
  });
});
