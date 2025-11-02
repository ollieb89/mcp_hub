/**
 * Complex Mock Template
 * 
 * Use this template for advanced mocking scenarios requiring hoisted dependencies,
 * EventEmitter patterns, and module-level mocking.
 * Based on Sprint 4 file watching and event-driven testing patterns.
 * 
 * Key Patterns:
 * - vi.hoisted() for mocking before imports (CRITICAL for EventEmitter)
 * - Chokidar file watcher mocking
 * - EventEmitter testing with event verification
 * - Module factory mocking with vi.mock()
 * - Async event sequences with vi.waitFor()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * CRITICAL: Use vi.hoisted() for mocks that must exist before imports
 * 
 * Sprint 4 Pattern: Mock EventEmitter BEFORE the module imports it
 * Why? Because the module instantiates the EventEmitter at module load time.
 * 
 * Without vi.hoisted():
 *   1. Module imports and creates real EventEmitter instance
 *   2. Your vi.mock() runs too late
 *   3. Tests fail because they're testing real EventEmitter
 * 
 * With vi.hoisted():
 *   1. Mock is hoisted to top of file
 *   2. Module imports get the mocked EventEmitter
 *   3. Tests work correctly
 */

// Hoisted mock for EventEmitter (Sprint 4 pattern)
const { mockWatcher, mockEmitterInstance } = vi.hoisted(() => {
  // Create mock EventEmitter instance
  const mockEmitterInstance = {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    listeners: vi.fn(() => []),
    listenerCount: vi.fn(() => 0),
    eventNames: vi.fn(() => [])
  };

  // Create mock chokidar watcher
  const mockWatcher = {
    ...mockEmitterInstance,
    add: vi.fn().mockReturnThis(),
    unwatch: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
    getWatched: vi.fn(() => ({}))
  };

  return { mockWatcher, mockEmitterInstance };
});

// Mock chokidar with hoisted instance
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => mockWatcher)
  },
  watch: vi.fn(() => mockWatcher)
}));

// Mock EventEmitter for custom classes
vi.mock('events', () => ({
  default: class MockEventEmitter {
    constructor() {
      return mockEmitterInstance;
    }
  },
  EventEmitter: class MockEventEmitter {
    constructor() {
      return mockEmitterInstance;
    }
  }
}));

// Now import modules that depend on EventEmitter
import chokidar from 'chokidar';
import { EventEmitter } from 'events';

/**
 * Test Suite: [Component] - Event-Driven Behavior
 * 
 * Focus: Testing EventEmitter patterns, file watching, and async events
 * Pattern: Sprint 4 vi.hoisted() + EventEmitter mocking
 */
describe('[Component] - Event-Driven Behavior', () => {
  let watcher;
  let emitter;
  let eventHandler;

  beforeEach(() => {
    // ARRANGE: Reset all mocks
    vi.clearAllMocks();
    
    // Create event handler spy
    eventHandler = vi.fn();
    
    // Reset mock implementations
    mockEmitterInstance.on.mockImplementation((event, handler) => {
      // Store handler for manual triggering
      mockEmitterInstance[`_handler_${event}`] = handler;
      return mockEmitterInstance;
    });
    
    mockEmitterInstance.emit.mockImplementation((event, ...args) => {
      const handler = mockEmitterInstance[`_handler_${event}`];
      if (handler) {
        handler(...args);
      }
      return true;
    });
  });

  afterEach(() => {
    // Cleanup watchers
    if (watcher && watcher.close) {
      watcher.close();
    }
    
    // Remove all listeners
    if (emitter && emitter.removeAllListeners) {
      emitter.removeAllListeners();
    }
    
    vi.restoreAllMocks();
  });

  /**
   * Test Group: EventEmitter Patterns
   * Testing event registration, emission, and removal
   */
  describe('EventEmitter Patterns', () => {
    
    it('should register event listener', () => {
      // ARRANGE: Create emitter
      emitter = new EventEmitter();
      
      // ACT: Register listener
      emitter.on('test-event', eventHandler);
      
      // ASSERT: Listener registered
      expect(mockEmitterInstance.on).toHaveBeenCalledWith('test-event', eventHandler);
    });

    it('should emit event with data', () => {
      // ARRANGE: Setup emitter with listener
      emitter = new EventEmitter();
      emitter.on('data', eventHandler);
      
      // ACT: Emit event with data
      const testData = { id: 1, value: 'test' };
      emitter.emit('data', testData);
      
      // ASSERT: Handler called with correct data
      expect(eventHandler).toHaveBeenCalledWith(testData);
    });

    it('should handle multiple event listeners', () => {
      // ARRANGE: Multiple handlers for same event
      emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      // ACT: Register multiple listeners
      emitter.on('multi-event', handler1);
      emitter.on('multi-event', handler2);
      emitter.on('multi-event', handler3);
      
      // ASSERT: All handlers registered
      expect(mockEmitterInstance.on).toHaveBeenCalledTimes(3);
    });

    it('should remove specific event listener', () => {
      // ARRANGE: Register listener
      emitter = new EventEmitter();
      emitter.on('remove-test', eventHandler);
      
      // ACT: Remove listener
      emitter.off('remove-test', eventHandler);
      
      // ASSERT: Listener removed
      expect(mockEmitterInstance.off).toHaveBeenCalledWith('remove-test', eventHandler);
    });

    it('should remove all listeners for event', () => {
      // ARRANGE: Register multiple listeners
      emitter = new EventEmitter();
      emitter.on('clear-test', vi.fn());
      emitter.on('clear-test', vi.fn());
      
      // ACT: Remove all listeners
      emitter.removeAllListeners('clear-test');
      
      // ASSERT: All listeners removed
      expect(mockEmitterInstance.removeAllListeners).toHaveBeenCalledWith('clear-test');
    });

    it('should register one-time listener', () => {
      // ARRANGE: Create emitter
      emitter = new EventEmitter();
      
      // ACT: Register once listener
      emitter.once('once-event', eventHandler);
      
      // ASSERT: Once called
      expect(mockEmitterInstance.once).toHaveBeenCalledWith('once-event', eventHandler);
    });

    it('should get listener count for event', () => {
      // ARRANGE: Setup with listeners
      emitter = new EventEmitter();
      mockEmitterInstance.listenerCount.mockReturnValue(3);
      
      // ACT: Get count
      const count = emitter.listenerCount('test-event');
      
      // ASSERT: Correct count
      expect(count).toBe(3);
    });

    it('should list all event names', () => {
      // ARRANGE: Setup with events
      emitter = new EventEmitter();
      mockEmitterInstance.eventNames.mockReturnValue(['event1', 'event2', 'event3']);
      
      // ACT: Get event names
      const names = emitter.eventNames();
      
      // ASSERT: All names returned
      expect(names).toEqual(['event1', 'event2', 'event3']);
    });
  });

  /**
   * Test Group: File Watcher Patterns
   * Testing Chokidar file watching with vi.hoisted()
   */
  describe('File Watcher Patterns', () => {
    
    it('should create file watcher for directory', () => {
      // ARRANGE: Watch path
      const watchPath = '/app/config';
      
      // ACT: Create watcher
      watcher = chokidar.watch(watchPath, {
        persistent: true,
        ignoreInitial: true
      });
      
      // ASSERT: Watcher created with correct options
      expect(chokidar.watch).toHaveBeenCalledWith(
        watchPath,
        expect.objectContaining({
          persistent: true,
          ignoreInitial: true
        })
      );
    });

    it('should register file change handler', () => {
      // ARRANGE: Create watcher
      watcher = chokidar.watch('/app/config');
      const changeHandler = vi.fn();
      
      // ACT: Register change handler
      watcher.on('change', changeHandler);
      
      // ASSERT: Handler registered
      expect(mockWatcher.on).toHaveBeenCalledWith('change', changeHandler);
    });

    it('should handle file add event', async () => {
      // ARRANGE: Create watcher with add handler
      watcher = chokidar.watch('/app/config');
      const addHandler = vi.fn();
      watcher.on('add', addHandler);
      
      // Setup mock to call handler
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'add') {
          mockWatcher._addHandler = handler;
        }
        return mockWatcher;
      });
      
      // ACT: Simulate file add
      const filePath = '/app/config/new-file.json';
      mockWatcher._addHandler?.(filePath);
      
      // Wait for handler execution
      await vi.waitFor(() => {
        expect(addHandler).toHaveBeenCalled();
      });
      
      // ASSERT: Handler called with path
      expect(addHandler).toHaveBeenCalledWith(filePath);
    });

    it('should handle file unlink event', async () => {
      // ARRANGE: Create watcher with unlink handler
      watcher = chokidar.watch('/app/config');
      const unlinkHandler = vi.fn();
      watcher.on('unlink', unlinkHandler);
      
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'unlink') {
          mockWatcher._unlinkHandler = handler;
        }
        return mockWatcher;
      });
      
      // ACT: Simulate file deletion
      const filePath = '/app/config/deleted.json';
      mockWatcher._unlinkHandler?.(filePath);
      
      // ASSERT: Handler called
      await vi.waitFor(() => {
        expect(unlinkHandler).toHaveBeenCalledWith(filePath);
      });
    });

    it('should add paths to existing watcher', () => {
      // ARRANGE: Create watcher
      watcher = chokidar.watch('/app/config');
      
      // ACT: Add more paths
      watcher.add('/app/data');
      watcher.add('/app/logs');
      
      // ASSERT: Paths added
      expect(mockWatcher.add).toHaveBeenCalledWith('/app/data');
      expect(mockWatcher.add).toHaveBeenCalledWith('/app/logs');
    });

    it('should unwatch specific paths', () => {
      // ARRANGE: Create watcher
      watcher = chokidar.watch('/app/config');
      
      // ACT: Unwatch path
      watcher.unwatch('/app/config/temp');
      
      // ASSERT: Path unwatched
      expect(mockWatcher.unwatch).toHaveBeenCalledWith('/app/config/temp');
    });

    it('should close watcher and cleanup', async () => {
      // ARRANGE: Create watcher
      watcher = chokidar.watch('/app/config');
      
      // ACT: Close watcher
      await watcher.close();
      
      // ASSERT: Close called
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should debounce rapid file changes', async () => {
      // ARRANGE: Create watcher with debounced handler
      watcher = chokidar.watch('/app/config');
      const handler = vi.fn();
      let debounceTimer;
      
      const debouncedHandler = (path) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handler(path), 100);
      };
      
      watcher.on('change', debouncedHandler);
      
      // Setup mock to trigger handler
      mockWatcher.on.mockImplementation((event, h) => {
        if (event === 'change') {
          mockWatcher._changeHandler = h;
        }
        return mockWatcher;
      });
      
      // ACT: Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        mockWatcher._changeHandler?.('/app/config/file.json');
      }
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // ASSERT: Handler called only once
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test Group: Async Event Sequences
   * Testing complex event flows with vi.waitFor()
   */
  describe('Async Event Sequences', () => {
    
    it('should handle event sequence in order', async () => {
      // ARRANGE: Create emitter with sequence tracking
      emitter = new EventEmitter();
      const sequence = [];
      
      mockEmitterInstance.on.mockImplementation((event, handler) => {
        mockEmitterInstance[`_handler_${event}`] = handler;
        return mockEmitterInstance;
      });
      
      mockEmitterInstance.emit.mockImplementation((event, data) => {
        const handler = mockEmitterInstance[`_handler_${event}`];
        if (handler) {
          handler(data);
        }
        return true;
      });
      
      // ACT: Register handlers and emit sequence
      emitter.on('step1', (data) => sequence.push({ step: 1, data }));
      emitter.on('step2', (data) => sequence.push({ step: 2, data }));
      emitter.on('step3', (data) => sequence.push({ step: 3, data }));
      
      emitter.emit('step1', 'first');
      emitter.emit('step2', 'second');
      emitter.emit('step3', 'third');
      
      // ASSERT: Sequence correct
      await vi.waitFor(() => {
        expect(sequence).toHaveLength(3);
      });
      
      expect(sequence[0]).toEqual({ step: 1, data: 'first' });
      expect(sequence[1]).toEqual({ step: 2, data: 'second' });
      expect(sequence[2]).toEqual({ step: 3, data: 'third' });
    });

    it('should wait for async event with timeout', async () => {
      // ARRANGE: Create emitter
      emitter = new EventEmitter();
      const asyncHandler = vi.fn();
      
      mockEmitterInstance.on.mockImplementation((event, handler) => {
        mockEmitterInstance[`_handler_${event}`] = handler;
        return mockEmitterInstance;
      });
      
      emitter.on('async-event', asyncHandler);
      
      // ACT: Emit event after delay
      setTimeout(() => {
        const handler = mockEmitterInstance._handler_async_event;
        handler?.({ success: true });
      }, 50);
      
      // ASSERT: Wait with timeout
      await vi.waitFor(() => {
        expect(asyncHandler).toHaveBeenCalledWith({ success: true });
      }, { timeout: 1000 });
    });

    it('should handle event with error', async () => {
      // ARRANGE: Create emitter with error handler
      emitter = new EventEmitter();
      const errorHandler = vi.fn();
      
      mockEmitterInstance.on.mockImplementation((event, handler) => {
        mockEmitterInstance[`_handler_${event}`] = handler;
        return mockEmitterInstance;
      });
      
      emitter.on('error', errorHandler);
      
      // ACT: Emit error event
      const testError = new Error('Test error');
      const handler = mockEmitterInstance._handler_error;
      handler?.(testError);
      
      // ASSERT: Error handler called
      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(testError);
      });
    });

    it('should chain multiple async events', async () => {
      // ARRANGE: Create emitter with chained handlers
      emitter = new EventEmitter();
      const results = [];
      
      mockEmitterInstance.on.mockImplementation((event, handler) => {
        mockEmitterInstance[`_handler_${event}`] = handler;
        return mockEmitterInstance;
      });
      
      mockEmitterInstance.emit.mockImplementation((event, data) => {
        const handler = mockEmitterInstance[`_handler_${event}`];
        if (handler) {
          Promise.resolve(handler(data));
        }
        return true;
      });
      
      // Setup chain: init -> process -> complete
      emitter.on('init', async (data) => {
        results.push('init');
        emitter.emit('process', data + 1);
      });
      
      emitter.on('process', async (data) => {
        results.push('process');
        emitter.emit('complete', data + 1);
      });
      
      emitter.on('complete', async (data) => {
        results.push('complete');
      });
      
      // ACT: Start chain
      emitter.emit('init', 1);
      
      // ASSERT: All events fired in sequence
      await vi.waitFor(() => {
        expect(results).toEqual(['init', 'process', 'complete']);
      }, { timeout: 1000 });
    });
  });

  /**
   * Test Group: Module Factory Mocking
   * Testing vi.mock() with factory functions
   */
  describe('Module Factory Mocking', () => {
    
    it('should mock module with custom factory', async () => {
      // ARRANGE: Mock module created with vi.hoisted()
      // Already mocked at top of file
      
      // ACT: Import and use mocked module
      const { default: chokidarDefault } = await import('chokidar');
      const watcher = chokidarDefault.watch('/test');
      
      // ASSERT: Mock used instead of real module
      expect(watcher).toBe(mockWatcher);
      expect(chokidarDefault.watch).toHaveBeenCalled();
    });

    it('should verify mock implementation called', () => {
      // ARRANGE: Create watcher (uses mocked chokidar)
      watcher = chokidar.watch('/app');
      
      // ACT: Call watcher methods
      watcher.add('/new/path');
      watcher.on('change', vi.fn());
      
      // ASSERT: Mock implementations called
      expect(mockWatcher.add).toHaveBeenCalledWith('/new/path');
      expect(mockWatcher.on).toHaveBeenCalled();
    });

    it('should reset mock between tests', () => {
      // ARRANGE: Use mock in first test
      watcher = chokidar.watch('/first');
      watcher.add('/path1');
      
      // ACT: Clear mocks (done in beforeEach)
      vi.clearAllMocks();
      
      // Create new watcher
      watcher = chokidar.watch('/second');
      
      // ASSERT: Previous calls cleared
      expect(mockWatcher.add).not.toHaveBeenCalledWith('/path1');
      expect(chokidar.watch).toHaveBeenCalledTimes(1); // only current call
    });
  });

  /**
   * Test Group: Real-World Scenarios
   * Complex scenarios combining multiple patterns
   */
  describe('Real-World Scenarios', () => {
    
    it('should reload config when file changes', async () => {
      // ARRANGE: Setup config watcher
      const configPath = '/app/config/default.json';
      watcher = chokidar.watch(configPath);
      const reloadHandler = vi.fn();
      
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'change') {
          mockWatcher._changeHandler = handler;
        }
        return mockWatcher;
      });
      
      watcher.on('change', reloadHandler);
      
      // ACT: Simulate config file change
      mockWatcher._changeHandler?.(configPath);
      
      // ASSERT: Reload triggered
      await vi.waitFor(() => {
        expect(reloadHandler).toHaveBeenCalledWith(configPath);
      });
    });

    it('should handle watcher errors gracefully', async () => {
      // ARRANGE: Setup watcher with error handler
      watcher = chokidar.watch('/app/config');
      const errorHandler = vi.fn();
      
      mockWatcher.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          mockWatcher._errorHandler = handler;
        }
        return mockWatcher;
      });
      
      watcher.on('error', errorHandler);
      
      // ACT: Simulate watcher error
      const watchError = new Error('ENOSPC: System limit for number of file watchers reached');
      mockWatcher._errorHandler?.(watchError);
      
      // ASSERT: Error handler called
      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(watchError);
      });
    });

    it('should cleanup watchers on shutdown', async () => {
      // ARRANGE: Create multiple watchers
      const watcher1 = chokidar.watch('/app/config');
      const watcher2 = chokidar.watch('/app/data');
      
      // ACT: Close all watchers
      await Promise.all([
        watcher1.close(),
        watcher2.close()
      ]);
      
      // ASSERT: All watchers closed
      expect(mockWatcher.close).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Sprint 4 Complex Mock Testing Patterns Summary:
 * 
 * 1. ✅ vi.hoisted() Usage (CRITICAL):
 *    - Mock EventEmitter BEFORE module imports
 *    - Create mock instances in hoisted block
 *    - Return mocks for use in vi.mock() factories
 *    - Without this, modules import real EventEmitter
 * 
 * 2. ✅ EventEmitter Testing:
 *    - Mock all EventEmitter methods (on, emit, off, etc.)
 *    - Store handlers for manual triggering
 *    - Implement emit() to call stored handlers
 *    - Verify event registration and emission
 * 
 * 3. ✅ Chokidar File Watching:
 *    - Mock chokidar.watch() to return mock watcher
 *    - Implement watcher methods (add, unwatch, close)
 *    - Simulate file events (add, change, unlink)
 *    - Test debounce patterns for rapid changes
 * 
 * 4. ✅ Async Event Patterns:
 *    - Use vi.waitFor() for async event verification
 *    - Test event sequences and chaining
 *    - Handle timeout scenarios
 *    - Verify error event handling
 * 
 * 5. ✅ Module Factory Mocking:
 *    - Use vi.mock() with factory function
 *    - Return hoisted mock instances from factory
 *    - Reset mocks between tests with vi.clearAllMocks()
 *    - Verify mock implementations called
 * 
 * 6. ✅ Cleanup:
 *    - Close watchers in afterEach
 *    - Remove all event listeners
 *    - Restore all mocks
 *    - Clear mock call history
 * 
 * Why vi.hoisted()? 
 * Without it, this happens:
 *   1. Your module imports at parse time
 *   2. Module creates real EventEmitter instance
 *   3. Your vi.mock() runs after imports
 *   4. Tests fail because they're testing REAL EventEmitter
 * 
 * With vi.hoisted():
 *   1. Mock is hoisted to top (before imports)
 *   2. Module imports get MOCKED EventEmitter
 *   3. Tests work correctly
 * 
 * This is THE most important pattern from Sprint 4!
 */
