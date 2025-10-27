/**
 * Event-Driven Test Template - EventEmitter Testing
 *
 * Purpose: Test components that use Node.js EventEmitter pattern
 * Use when: Testing event-based communication and state changes
 *
 * Key Patterns:
 * - EventEmitter mocking with vi.hoisted()
 * - Event emission verification
 * - Event handler testing
 * - Event-driven state transitions
 *
 * Based on Sprint 3.5 EventEmitter patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { YourEventDrivenComponent } from '../src/your-component.js';
import { createTestConfig } from './helpers/fixtures.js';

// Hoisted mocks for EventEmitter patterns
const { createMockHub, createMockConnection } = vi.hoisted(() => {
  return {
    createMockHub: () => {
      const hub = new EventEmitter();
      hub.connections = new Map();
      hub.serverUrl = 'http://localhost:3000';
      return hub;
    },
    createMockConnection: (name, status = 'connected') => {
      const connection = new EventEmitter();
      connection.name = name;
      connection.status = status;
      connection.tools = [];
      connection.resources = [];
      connection.prompts = [];
      return connection;
    }
  };
});

describe('YourEventDrivenComponent - Event Handling', () => {
  let component;
  let mockHub;
  let mockConnection;

  beforeEach(() => {
    // ARRANGE: Set up event-driven environment
    mockHub = createMockHub();
    mockConnection = createMockConnection('test-server');

    mockHub.connections.set('test-server', mockConnection);

    const config = createTestConfig();
    component = new YourEventDrivenComponent(config, mockHub);
  });

  afterEach(() => {
    // Clean up event listeners
    component?.removeAllListeners();
    mockHub?.removeAllListeners();
    mockConnection?.removeAllListeners();
  });

  describe('Event Emission', () => {
    it('should emit event on state change', async () => {
      // ARRANGE
      const eventSpy = vi.fn();
      component.on('stateChanged', eventSpy);

      // ACT
      await component.changeState('active');

      // ASSERT: Event emitted with correct data
      expect(eventSpy).toHaveBeenCalledOnce();
      expect(eventSpy).toHaveBeenCalledWith({
        previousState: 'initialized',
        newState: 'active',
        timestamp: expect.any(Number)
      });
    });

    it('should emit multiple events in sequence', async () => {
      // ARRANGE
      const events = [];
      component.on('operationStarted', (data) => events.push({ type: 'started', data }));
      component.on('operationProgress', (data) => events.push({ type: 'progress', data }));
      component.on('operationCompleted', (data) => events.push({ type: 'completed', data }));

      // ACT
      await component.performLongOperation();

      // ASSERT: Events emitted in order
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('started');
      expect(events[1].type).toBe('progress');
      expect(events[2].type).toBe('completed');
    });

    it('should not emit event when condition not met', async () => {
      // ARRANGE
      const eventSpy = vi.fn();
      component.on('conditionalEvent', eventSpy);

      // ACT: Perform operation that doesn't meet condition
      await component.performOperationWithoutCondition();

      // ASSERT: Event not emitted
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Handler Registration', () => {
    it('should register event handler successfully', () => {
      // ARRANGE
      const handler = vi.fn();

      // ACT
      component.on('testEvent', handler);
      component.emit('testEvent', { data: 'test' });

      // ASSERT: Handler called
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple listeners for same event', () => {
      // ARRANGE
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      // ACT
      component.on('testEvent', handler1);
      component.on('testEvent', handler2);
      component.on('testEvent', handler3);
      component.emit('testEvent', { data: 'test' });

      // ASSERT: All handlers called
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should handle once listener correctly', () => {
      // ARRANGE
      const handler = vi.fn();

      // ACT
      component.once('testEvent', handler);
      component.emit('testEvent', { data: 'first' });
      component.emit('testEvent', { data: 'second' });

      // ASSERT: Handler called only once
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ data: 'first' });
    });

    it('should remove event listener successfully', () => {
      // ARRANGE
      const handler = vi.fn();
      component.on('testEvent', handler);

      // ACT
      component.off('testEvent', handler);
      component.emit('testEvent', { data: 'test' });

      // ASSERT: Handler not called after removal
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Hub Event Integration', () => {
    it('should respond to hub connection events', async () => {
      // ARRANGE
      const syncSpy = vi.spyOn(component, 'syncCapabilities');

      // ACT: Hub emits connection event
      mockHub.emit('connectionEstablished', {
        serverName: 'new-server',
        connection: createMockConnection('new-server')
      });

      // ASSERT: Component responds to hub event
      await vi.waitFor(() => {
        expect(syncSpy).toHaveBeenCalled();
      });
    });

    it('should handle hub toolsChanged event', async () => {
      // ARRANGE
      mockConnection.tools = [
        { name: 'tool-1', description: 'Test tool 1' },
        { name: 'tool-2', description: 'Test tool 2' }
      ];

      const updateSpy = vi.spyOn(component, 'updateToolRegistry');

      // ACT: Hub emits toolsChanged
      mockHub.emit('toolsChanged', {
        serverName: 'test-server',
        tools: mockConnection.tools
      });

      // ASSERT: Component updates tool registry
      await vi.waitFor(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(component.registeredTools.size).toBe(2);
      });
    });

    it('should handle hub disconnection events', async () => {
      // ARRANGE
      mockConnection.status = 'connected';
      const cleanupSpy = vi.spyOn(component, 'cleanupServerResources');

      // ACT: Hub emits disconnection
      mockConnection.status = 'disconnected';
      mockHub.emit('serverDisconnected', {
        serverName: 'test-server'
      });

      // ASSERT: Component cleans up resources
      await vi.waitFor(() => {
        expect(cleanupSpy).toHaveBeenCalledWith('test-server');
      });
    });
  });

  describe('Event Error Handling', () => {
    it('should handle errors in event listeners gracefully', () => {
      // ARRANGE
      const errorHandler = vi.fn();
      const throwingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      component.on('error', errorHandler);
      component.on('testEvent', throwingHandler);

      // ACT: Emit event that causes handler to throw
      component.emit('testEvent', { data: 'test' });

      // ASSERT: Error emitted and handled
      expect(throwingHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Handler error'
        })
      );
    });

    it('should emit error event on operation failure', async () => {
      // ARRANGE
      const errorSpy = vi.fn();
      component.on('error', errorSpy);

      // ACT: Perform operation that fails
      await component.performFailingOperation();

      // ASSERT: Error event emitted
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'OPERATION_FAILED',
          message: expect.any(String)
        })
      );
    });
  });

  describe('Event-Driven State Transitions', () => {
    it('should transition through states via events', async () => {
      // ARRANGE
      const stateChanges = [];
      component.on('stateChanged', (data) => {
        stateChanges.push(data.newState);
      });

      // ACT: Trigger state transitions
      await component.initialize();
      await component.start();
      await component.pause();
      await component.resume();
      await component.stop();

      // ASSERT: All state transitions recorded
      expect(stateChanges).toEqual([
        'initializing',
        'ready',
        'running',
        'paused',
        'running',
        'stopped'
      ]);
    });

    it('should prevent invalid state transitions', async () => {
      // ARRANGE
      const errorSpy = vi.fn();
      component.on('error', errorSpy);

      // ACT: Attempt invalid transition
      await component.initialize();
      await component.stop(); // Cannot go from initialized to stopped

      // ASSERT: Error emitted for invalid transition
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_STATE_TRANSITION',
          message: expect.stringContaining('Cannot transition')
        })
      );
    });
  });

  describe('Event Propagation and Bubbling', () => {
    it('should propagate events from child to parent', async () => {
      // ARRANGE
      const childComponent = new YourEventDrivenComponent(createTestConfig(), mockHub);
      const parentEventSpy = vi.fn();

      component.addChild(childComponent);
      component.on('childEvent', parentEventSpy);

      // ACT: Child emits event
      childComponent.emit('childEvent', { source: 'child', data: 'test' });

      // ASSERT: Parent receives propagated event
      expect(parentEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'child',
          data: 'test'
        })
      );
    });

    it('should stop event propagation when requested', async () => {
      // ARRANGE
      const childComponent = new YourEventDrivenComponent(createTestConfig(), mockHub);
      const parentEventSpy = vi.fn();

      component.addChild(childComponent);
      component.on('stoppableEvent', parentEventSpy);

      // ACT: Child emits event with stopPropagation
      childComponent.emit('stoppableEvent', {
        data: 'test',
        stopPropagation: true
      });

      // ASSERT: Parent does not receive event
      expect(parentEventSpy).not.toHaveBeenCalled();
    });
  });
});

/**
 * EVENT-DRIVEN TEST CHECKLIST:
 *
 * ✓ Event emission verification
 * ✓ Event handler registration and removal
 * ✓ Multiple listeners for same event
 * ✓ Once listeners (single-fire)
 * ✓ Hub event integration
 * ✓ Error handling in listeners
 * ✓ Event-driven state transitions
 * ✓ Event propagation and bubbling
 * ✓ vi.hoisted() for EventEmitter mocks
 * ✓ Cleanup in afterEach
 *
 * ANTI-PATTERNS TO AVOID:
 * ✗ Not cleaning up listeners (memory leaks)
 * ✗ Testing event implementation over behavior
 * ✗ Hardcoded delays waiting for events
 * ✗ Missing error event handling
 * ✗ Not testing event data structure
 */
