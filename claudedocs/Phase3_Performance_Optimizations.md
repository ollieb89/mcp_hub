# Phase 3 Performance Optimizations - Design Document

**Status**: Design Complete - Ready for Implementation
**Date**: 2025-10-27
**Author**: Performance Optimization Session
**Dependencies**: Phase 1-2 optimizations completed (3-5x performance improvement)

## Executive Summary

This document outlines three advanced performance optimizations for MCP Hub, prioritized by implementation complexity and expected impact. Phase 1-2 achieved 3-5x performance improvement through capability change detection, incremental sync, and environment resolution caching. Phase 3 focuses on HTTP connection pooling, batched notifications, and intelligent tool response caching.

### Performance Baseline (Post Phase 1-2)
- ✅ Capability change detection: 70% reduction in SSE events
- ✅ Incremental capability sync: 10x faster single-server updates
- ✅ Environment resolution caching: 3-5x faster
- ✅ O(1) request routing with Map lookups
- ✅ Parallel server operations with Promise.allSettled()

### Phase 3 Targets
- **Priority 1**: HTTP connection pooling (10-30% improvement, LOW risk)
- **Priority 2**: Batch notification system (30-50% SSE traffic reduction, MEDIUM risk)
- **Priority 3**: LRU tool response cache (2-5x read-heavy improvement, HIGH risk - deferred)

---

## Priority 1: HTTP Connection Pool Optimization

### Overview
Configure persistent HTTP connections with keep-alive to reduce TLS handshake overhead and connection establishment latency for remote MCP servers (SSE and streamable-http transports).

### Current State Analysis

**Examined Code** (`src/MCPConnection.js`):
```javascript
// _createSSETransport() - lines 925-953
const transport = new SSEClientTransport(new URL(resolvedConfig.url), {
  requestInit: {
    headers: resolvedConfig.headers,
  },
  authProvider,
});

// _createStreambleHTTPTransport() - lines 911-923
const transport = new StreamableHTTPClientTransport(new URL(resolvedConfig.url), {
  authProvider,
  requestInit: {
    headers: resolvedConfig.headers,
  },
});
```

**Finding**: Neither transport explicitly configures HTTP connection pooling. Node.js fetch() (undici-based) has default connection pooling, but not optimally configured for persistent server connections.

### Implementation Design

#### 1. HTTP Agent Configuration

Create optimized http.Agent for both HTTPS and HTTP:

```javascript
// src/utils/http-pool.js (NEW FILE)
import http from 'http';
import https from 'https';

export const DEFAULT_POOL_CONFIG = {
  keepAlive: true,
  keepAliveMsecs: 60000,  // 60 seconds
  maxSockets: 50,          // Per host
  maxFreeSockets: 10,      // Keep 10 idle connections per host
  timeout: 30000,          // 30 second socket timeout
  scheduling: 'lifo',      // Last In First Out for better connection reuse
};

export function createHTTPAgent(config = {}) {
  const poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };

  return {
    http: new http.Agent(poolConfig),
    https: new https.Agent(poolConfig),
  };
}

export function getAgentForURL(agents, url) {
  return url.protocol === 'https:' ? agents.https : agents.http;
}
```

#### 2. MCPConnection Integration

**Modify `src/MCPConnection.js`**:

```javascript
import { createHTTPAgent, getAgentForURL } from './utils/http-pool.js';

class MCPConnection extends EventEmitter {
  constructor(name, config, envResolver, options = {}) {
    // ... existing code ...

    // Create HTTP agents for connection pooling
    this.httpAgents = createHTTPAgent(config.httpPool || {});
  }

  async _createSSETransport(authProvider, resolvedConfig) {
    const url = new URL(resolvedConfig.url);
    const agent = getAgentForURL(this.httpAgents, url);

    // SSE transport setup with connection pooling
    const reconnectingEventSourceOptions = {
      max_retry_time: 5000,
    };

    class ReconnectingES extends ReconnectingEventSource {
      constructor(url, options) {
        super(url, {
          ...options || {},
          ...reconnectingEventSourceOptions,
          // Add agent for connection pooling
          agent,
        })
      }
    }

    global.EventSource = ReconnectingES;
    const transport = new SSEClientTransport(url, {
      requestInit: {
        headers: resolvedConfig.headers,
        // Add agent to fetch requests
        agent,
      },
      authProvider,
    });
    return transport;
  }

  async _createStreambleHTTPTransport(authProvider, resolvedConfig) {
    const url = new URL(resolvedConfig.url);
    const agent = getAgentForURL(this.httpAgents, url);

    const options = {
      authProvider,
      requestInit: {
        headers: resolvedConfig.headers,
        // Add agent for connection pooling
        agent,
      },
    };
    const transport = new StreamableHTTPClientTransport(url, options);
    return transport;
  }

  async cleanup() {
    // ... existing cleanup code ...

    // Destroy HTTP agents to close idle connections
    this.httpAgents.http.destroy();
    this.httpAgents.https.destroy();
  }
}
```

#### 3. Configuration Schema

Add optional `httpPool` configuration to server config:

```json
{
  "mcpServers": {
    "remote-server": {
      "url": "https://example.com/mcp",
      "httpPool": {
        "keepAlive": true,
        "keepAliveMsecs": 60000,
        "maxSockets": 50,
        "maxFreeSockets": 10,
        "timeout": 30000
      }
    }
  }
}
```

### Performance Impact

**Expected Improvements**:
- **Remote servers**: 10-30% latency reduction
- **STDIO servers**: No impact (not using HTTP)
- **High-frequency requests**: Maximum benefit from connection reuse
- **Idle connections**: Minimal memory overhead (10 connections × ~4KB ≈ 40KB)

**Metrics to Track**:
- Connection establishment time (before/after)
- TLS handshake count (should decrease)
- Active vs idle connections
- Request latency distribution

### Testing Strategy

```javascript
// tests/http-pool.test.js
describe('HTTP Connection Pooling', () => {
  test('creates HTTP and HTTPS agents with correct config', () => {
    const agents = createHTTPAgent({ maxSockets: 100 });
    expect(agents.http.maxSockets).toBe(100);
    expect(agents.https.keepAlive).toBe(true);
  });

  test('selects correct agent based on URL protocol', () => {
    const agents = createHTTPAgent();
    const httpsAgent = getAgentForURL(agents, new URL('https://example.com'));
    expect(httpsAgent).toBe(agents.https);
  });

  test('destroys agents on cleanup', async () => {
    const connection = new MCPConnection('test', { url: 'https://test.com' });
    const destroySpy = vi.spyOn(connection.httpAgents.https, 'destroy');
    await connection.cleanup();
    expect(destroySpy).toHaveBeenCalled();
  });
});

// Integration test
describe('Connection Pooling Integration', () => {
  test('reuses connections for multiple requests', async () => {
    // Mock SSE server
    // Make 10 rapid requests
    // Verify connection count < 10 (reuse occurred)
  });
});
```

### Risks and Mitigation

**Risk 1**: Agent configuration incompatible with MCP SDK transports
**Mitigation**: Verify MCP SDK supports agent in requestInit, fallback to default if not

**Risk 2**: Idle connections consuming resources
**Mitigation**: Conservative maxFreeSockets (10), monitoring, graceful agent destruction

**Risk 3**: Breaking existing connections
**Mitigation**: Backward compatible (default config works), optional configuration

### Implementation Checklist

- [ ] Create `src/utils/http-pool.js` with agent factory
- [ ] Modify `MCPConnection` constructor to create agents
- [ ] Update `_createSSETransport()` to use agent
- [ ] Update `_createStreambleHTTPTransport()` to use agent
- [ ] Update `cleanup()` to destroy agents
- [ ] Add `httpPool` config schema validation
- [ ] Write unit tests for http-pool utility
- [ ] Write integration tests for connection reuse
- [ ] Update documentation with configuration example
- [ ] Add performance metrics logging

**Estimated Time**: 2-4 hours
**Files Modified**: 2 (MCPConnection.js, new http-pool.js)
**Lines of Code**: ~100 lines

---

## Priority 2: Batch Notification System

### Overview
Combine multiple SSE capability change events into batched notifications to reduce network overhead, improve client-side processing efficiency, and decrease SSE connection load.

### Current State Analysis

**Current SSE Events** (`src/utils/sse-manager.js`):
- `toolsChanged` - Tool list updated
- `resourcesChanged` - Resource list updated
- `promptsChanged` - Prompt list updated
- `config_changed` - Configuration updated
- `hub_state` - Hub lifecycle state changed
- `log` - Log message streamed

**Phase 1-2 Improvements**:
- Capability change detection reduces unnecessary events by 70%
- Only legitimate capability changes emit events now

**Remaining Optimization**:
When multiple servers update capabilities simultaneously (e.g., during hub restart), clients receive rapid-fire individual events instead of batched updates.

### Implementation Design

#### 1. Event Batching Manager

```javascript
// src/utils/event-batcher.js (NEW FILE)
import EventEmitter from 'events';

export class EventBatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.batchWindow = options.batchWindow || 100; // 100ms default
    this.maxBatchSize = options.maxBatchSize || 50;

    // Batch queues by event type
    this.batches = new Map();
    this.timers = new Map();
  }

  /**
   * Add event to batch queue
   */
  enqueue(eventType, eventData) {
    // Don't batch critical events
    if (this._isCriticalEvent(eventType)) {
      this.emit('flush', { type: eventType, batch: [eventData] });
      return;
    }

    // Initialize batch for this event type
    if (!this.batches.has(eventType)) {
      this.batches.set(eventType, []);
    }

    const batch = this.batches.get(eventType);

    // Deduplicate within batch (same server + same event)
    const isDuplicate = batch.some(item =>
      this._eventEquals(item, eventData)
    );

    if (!isDuplicate) {
      batch.push({
        ...eventData,
        timestamp: Date.now(),
      });
    }

    // Flush if batch size limit reached
    if (batch.length >= this.maxBatchSize) {
      this._flushBatch(eventType);
      return;
    }

    // Schedule batch flush if not already scheduled
    if (!this.timers.has(eventType)) {
      const timer = setTimeout(() => {
        this._flushBatch(eventType);
      }, this.batchWindow);

      this.timers.set(eventType, timer);
    }
  }

  /**
   * Flush specific batch immediately
   */
  _flushBatch(eventType) {
    const batch = this.batches.get(eventType);
    const timer = this.timers.get(eventType);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(eventType);
    }

    if (batch && batch.length > 0) {
      this.emit('flush', {
        type: eventType,
        batch: [...batch],
        batchSize: batch.length,
      });

      this.batches.delete(eventType);
    }
  }

  /**
   * Flush all pending batches
   */
  flushAll() {
    for (const eventType of this.batches.keys()) {
      this._flushBatch(eventType);
    }
  }

  /**
   * Check if events are equal for deduplication
   */
  _eventEquals(event1, event2) {
    // Same server + same capability type
    if (event1.server && event2.server) {
      return event1.server === event2.server;
    }
    // Fallback to deep comparison for other events
    return JSON.stringify(event1) === JSON.stringify(event2);
  }

  /**
   * Critical events that should never be batched
   */
  _isCriticalEvent(eventType) {
    return ['hub_state', 'error'].includes(eventType);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.batches.clear();
  }
}
```

#### 2. SSEManager Integration

**Modify `src/utils/sse-manager.js`**:

```javascript
import { EventBatcher } from './event-batcher.js';

export class SSEManager {
  constructor(options = {}) {
    // ... existing code ...

    // Initialize event batcher
    this.batcher = new EventBatcher({
      batchWindow: options.batchWindow || 100,
      maxBatchSize: options.maxBatchSize || 50,
    });

    // Listen for batch flushes
    this.batcher.on('flush', ({ type, batch, batchSize }) => {
      this._broadcastBatch(type, batch, batchSize);
    });
  }

  /**
   * Send event to all clients (with batching)
   */
  broadcast(eventType, data) {
    const message = {
      type: eventType,
      data: data,
      timestamp: Date.now(),
    };

    // Enqueue for batching
    this.batcher.enqueue(eventType, message.data);
  }

  /**
   * Broadcast batched events to clients
   */
  _broadcastBatch(eventType, batch, batchSize) {
    const batchMessage = {
      type: `${eventType}_batch`,
      batchSize,
      events: batch,
      timestamp: Date.now(),
    };

    const sseData = `data: ${JSON.stringify(batchMessage)}\n\n`;

    for (const client of this.clients.values()) {
      try {
        client.write(sseData);
      } catch (error) {
        logger.error(`Failed to send batched SSE: ${error.message}`);
      }
    }

    logger.debug(`Broadcast batched ${eventType}: ${batchSize} events`);
  }

  /**
   * Cleanup on shutdown
   */
  close() {
    this.batcher.destroy();
    // ... existing cleanup code ...
  }
}
```

#### 3. Configuration Schema

Add optional batching configuration:

```json
{
  "sse": {
    "batching": {
      "enabled": true,
      "batchWindow": 100,
      "maxBatchSize": 50
    }
  }
}
```

#### 4. Client Compatibility

**Batch Event Format**:
```json
{
  "type": "toolsChanged_batch",
  "batchSize": 3,
  "events": [
    { "server": "server1", "tools": [...], "timestamp": 1698765432100 },
    { "server": "server2", "tools": [...], "timestamp": 1698765432150 },
    { "server": "server3", "tools": [...], "timestamp": 1698765432180 }
  ],
  "timestamp": 1698765432200
}
```

**Client-Side Handling** (example for web UI):
```javascript
eventSource.addEventListener('toolsChanged_batch', (event) => {
  const { events, batchSize } = JSON.parse(event.data);

  // Process batch of tool changes
  events.forEach(({ server, tools, timestamp }) => {
    updateToolsForServer(server, tools);
  });

  console.log(`Processed batch of ${batchSize} tool changes`);
});

// Backward compatibility: still support non-batched events
eventSource.addEventListener('toolsChanged', (event) => {
  const { server, tools } = JSON.parse(event.data);
  updateToolsForServer(server, tools);
});
```

### Performance Impact

**Expected Improvements**:
- **SSE traffic**: 30-50% reduction during high-change scenarios (hub restart, multi-server updates)
- **Network overhead**: Fewer HTTP/2 frames, reduced header overhead
- **Client-side processing**: Batch DOM updates, reduced event handler invocations
- **Latency**: Minimal (100ms batching window)

**Trade-offs**:
- Adds 100ms max latency to capability change notifications
- Increased complexity in client-side event handling
- Requires client updates to support batched events

### Testing Strategy

```javascript
// tests/event-batcher.test.js
describe('EventBatcher', () => {
  test('batches events within window', async () => {
    const batcher = new EventBatcher({ batchWindow: 50 });
    const flushSpy = vi.fn();
    batcher.on('flush', flushSpy);

    batcher.enqueue('toolsChanged', { server: 'server1', tools: [] });
    batcher.enqueue('toolsChanged', { server: 'server2', tools: [] });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(flushSpy).toHaveBeenCalledOnce();
    expect(flushSpy.mock.calls[0][0].batch).toHaveLength(2);
  });

  test('deduplicates identical events in batch', () => {
    const batcher = new EventBatcher({ batchWindow: 50 });

    batcher.enqueue('toolsChanged', { server: 'server1', tools: [] });
    batcher.enqueue('toolsChanged', { server: 'server1', tools: [] });

    const batch = batcher.batches.get('toolsChanged');
    expect(batch).toHaveLength(1);
  });

  test('never batches critical events', () => {
    const batcher = new EventBatcher({ batchWindow: 50 });
    const flushSpy = vi.fn();
    batcher.on('flush', flushSpy);

    batcher.enqueue('hub_state', { state: 'stopped' });

    expect(flushSpy).toHaveBeenCalledImmediately();
  });

  test('flushes when batch size limit reached', () => {
    const batcher = new EventBatcher({ batchWindow: 1000, maxBatchSize: 3 });
    const flushSpy = vi.fn();
    batcher.on('flush', flushSpy);

    for (let i = 0; i < 3; i++) {
      batcher.enqueue('toolsChanged', { server: `server${i}`, tools: [] });
    }

    expect(flushSpy).toHaveBeenCalledOnce();
  });
});
```

### Risks and Mitigation

**Risk 1**: 100ms latency unacceptable for real-time updates
**Mitigation**: Configurable window, critical events bypass batching, benchmark actual user impact

**Risk 2**: Client-side incompatibility
**Mitigation**: Support both batched and non-batched events, gradual rollout

**Risk 3**: Deduplication too aggressive
**Mitigation**: Careful equality check, preserve all unique server events

### Implementation Checklist

- [ ] Create `src/utils/event-batcher.js` with EventBatcher class
- [ ] Modify `SSEManager` to integrate batching
- [ ] Add SSE batching configuration schema
- [ ] Update client-side SSE event handlers
- [ ] Write unit tests for EventBatcher
- [ ] Write integration tests for SSE batching
- [ ] Add batching metrics logging
- [ ] Update documentation with batch event format
- [ ] Add configuration example

**Estimated Time**: 6-8 hours
**Files Modified**: 2 (sse-manager.js, new event-batcher.js)
**Lines of Code**: ~200 lines

---

## Priority 3: LRU Cache for Tool Responses (DEFERRED)

### Overview
Cache tool responses using LRU eviction policy with TTL to reduce redundant tool executions for idempotent, read-only tools.

### Why Deferred

**High Complexity**:
- Tool categorization (cache-safe vs unsafe)
- Argument hashing for stable cache keys
- Cache invalidation on config/server changes
- Correctness risk (stale data)

**Unknown Impact**:
- Need metrics on tool response patterns
- Need data on read-heavy vs write-heavy workloads
- Need idempotent tool identification

**Implementation Prerequisites**:
1. Tool usage telemetry (which tools called, how often, with what arguments)
2. Tool categorization framework (mark tools as cache-safe)
3. Benchmarking infrastructure to measure cache hit rate

### Future Design Outline

When ready to implement, the design would include:

1. **Tool Categorization System**
```javascript
// Tool annotation in MCP server
{
  "tools": [
    {
      "name": "search",
      "cacheable": true,
      "cacheTTL": 300,  // 5 minutes
      "cacheKey": ["query", "limit"]  // Arguments used in cache key
    }
  ]
}
```

2. **LRU Cache Implementation**
```javascript
import LRU from 'lru-cache';

const toolCache = new LRU({
  max: 1000,  // 1000 entries
  maxAge: 1000 * 60 * 5,  // 5 minutes default TTL
  length: (value) => JSON.stringify(value).length,
  maxSize: 1024 * 1024 * 10,  // 10MB max cache size
});
```

3. **Cache Key Generation**
```javascript
function generateCacheKey(toolName, args, cacheKeyFields) {
  const relevantArgs = cacheKeyFields
    ? pick(args, cacheKeyFields)
    : args;

  return `${toolName}:${hashObject(relevantArgs)}`;
}
```

4. **Invalidation Strategy**
- TTL-based expiration (automatic)
- Server reconnect → clear cache for that server
- Config change → clear all caches
- Explicit invalidation API

**Estimated Time**: 10-15 hours when ready
**Risk Level**: HIGH (correctness critical)

---

## Implementation Roadmap

### Phase 3A: Connection Pooling (Week 1)
- **Day 1-2**: Implement http-pool utility and integrate
- **Day 3**: Write tests and validate
- **Day 4**: Monitor and tune configuration
- **Goal**: 10-30% latency reduction for remote servers

### Phase 3B: Batch Notifications (Week 2-3)
- **Day 1-3**: Implement EventBatcher and SSE integration
- **Day 4-5**: Update client-side handlers
- **Day 6-7**: Test and validate batching behavior
- **Goal**: 30-50% SSE traffic reduction

### Phase 3C: Tool Caching (Future - TBD)
- **Prerequisite**: Telemetry and tool usage analysis
- **Phase 1**: Tool categorization framework
- **Phase 2**: Cache implementation
- **Phase 3**: Invalidation and monitoring
- **Goal**: 2-5x improvement for read-heavy workloads

---

## Success Metrics

### Connection Pooling
- ✅ TLS handshake count decreased
- ✅ Connection establishment time < 50ms (vs 200ms cold)
- ✅ Active connection reuse > 70%

### Batch Notifications
- ✅ SSE event count reduced by 30-50%
- ✅ Client-side batch processing working
- ✅ Latency impact < 150ms p99

### Tool Caching (Future)
- ✅ Cache hit rate > 60% for cacheable tools
- ✅ Response time improvement 2-5x
- ✅ Zero stale data incidents

---

## Monitoring and Observability

### Metrics to Add

```javascript
// Connection pool metrics
logger.debug('HTTP pool stats', {
  activeSockets: agent.sockets,
  idleSockets: agent.freeSockets,
  requestCount: agent.requests.length,
});

// Batch metrics
logger.debug('SSE batch stats', {
  batchSize,
  batchWindow: Date.now() - batch[0].timestamp,
  eventType,
});

// Cache metrics (future)
logger.debug('Tool cache stats', {
  hitRate: hits / (hits + misses),
  size: cache.itemCount,
  memory: cache.length,
});
```

### Performance Dashboard

Track over time:
- Request latency (p50, p95, p99)
- SSE event throughput
- Connection pool utilization
- Cache hit rate (when implemented)

---

## Conclusion

Phase 3 optimizations provide incremental performance improvements building on the 3-5x gains from Phase 1-2. Prioritization focuses on low-risk, high-impact changes first (connection pooling), followed by moderate complexity improvements (batch notifications), deferring high-risk optimizations (tool caching) until we have data to justify the complexity.

**Recommended Next Steps**:
1. ✅ Approve Priority 1 (Connection Pooling) for implementation
2. Monitor SSE traffic patterns to validate Priority 2 benefit
3. Implement tool usage telemetry before considering Priority 3
