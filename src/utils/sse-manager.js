import EventEmitter from 'events';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import { EventBatcher } from './event-batcher.js';

const HEART_BEAT_INTERVAL = 10000;

/**
 * Core event types supported by the SSE system
 */
export const EventTypes = {
  HEARTBEAT: 'heartbeat',
  HUB_STATE: 'hub_state',
  LOG: 'log',
  SUBSCRIPTION_EVENT: 'subscription_event'
};

/**
 * SSE connection states
 */
export const ConnectionState = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

export const SubscriptionTypes = {
  CONFIG_CHANGED: 'config_changed',
  SERVERS_UPDATING: "servers_updating",
  SERVERS_UPDATED: 'servers_updated',
  TOOL_LIST_CHANGED: 'tool_list_changed',
  RESOURCE_LIST_CHANGED: 'resource_list_changed',
  PROMPT_LIST_CHANGED: 'prompt_list_changed',
  WORKSPACES_UPDATED: 'workspaces_updated'
}

/**
 * Hub states for UI synchronization
 */
export const HubState = {
  STARTING: 'starting',
  READY: 'ready',
  RESTARTING: 'restarting',
  RESTARTED: 'restarted',
  STOPPED: "stopped",
  STOPPING: 'stopping',
  ERROR: 'error',
};

/**
 * Manages Server-Sent Events (SSE) connections and event broadcasting
 */
export class SSEManager extends EventEmitter {
  /**
   * @param {Object} options Configuration options
   * @param {boolean} options.autoShutdown Whether to shutdown when no clients are connected
   * @param {number} options.shutdownDelay Delay in ms before shutdown
   * @param {number} options.heartbeatInterval Interval in ms for heartbeat events
   * @param {Object} options.batching Batching configuration
   * @param {boolean} options.batching.enabled Whether to enable event batching (default: true)
   * @param {number} options.batching.batchWindow Batching window in ms (default: 100)
   * @param {number} options.batching.maxBatchSize Maximum events per batch (default: 50)
   */
  constructor(options = {}) {
    super();
    this.connections = new Map();
    this.heartbeatInterval = options.heartbeatInterval || HEART_BEAT_INTERVAL
    this.autoShutdown = options.autoShutdown || false;
    this.shutdownDelay = options.shutdownDelay || 0;
    this.shutdownTimer = null;
    this.heartbeatTimer = null;
    this.workspaceCache = options.workspaceCache || null;
    this.port = options.port || null;

    // Initialize event batcher
    const batchingEnabled = options.batching?.enabled ?? true;
    this.batchingEnabled = batchingEnabled;

    if (batchingEnabled) {
      this.batcher = new EventBatcher({
        batchWindow: options.batching?.batchWindow,
        maxBatchSize: options.batching?.maxBatchSize,
      });

      // Listen for batch flushes
      this.batcher.on('flush', ({ type, batch, batchSize, reason }) => {
        this._broadcastBatch(type, batch, batchSize, reason);
      });

      logger.debug('SSEManager batching enabled', {
        batchWindow: this.batcher.batchWindow,
        maxBatchSize: this.batcher.maxBatchSize,
      });
    } else {
      this.batcher = null;
      logger.debug('SSEManager batching disabled');
    }

    this.setupHeartbeat();
    this.setupAutoShutdown();
  }

  /**
   * Sets up auto-shutdown behavior when no clients are connected
   * @private
   */
  setupAutoShutdown() {
    if (!this.autoShutdown) return;

    logger.debug("Setting up auto shutting down")
    this.on('connectionClosed', async () => {
      // Update workspace cache with current connection count
      if (this.workspaceCache && this.port) {
        await this.workspaceCache.updateActiveConnections(this.port, this.connections.size);
      }

      if (this.connections.size === 0) {
        if (this.shutdownTimer) {
          clearTimeout(this.shutdownTimer);
        }

        // Mark workspace as shutting down in cache
        if (this.workspaceCache && this.port) {
          await this.workspaceCache.setShutdownTimer(this.port, this.shutdownDelay);
        }

        logger.debug(`Starting timer for auto shutdown (${this.shutdownDelay}ms)`);
        this.shutdownTimer = setTimeout(() => {
          logger.info('No active SSE connections, initiating shutdown', {
            shutdownDelay: this.shutdownDelay
          });
          process.emit('SIGTERM');
        }, this.shutdownDelay);
      }
    });
  }

  /**
   * Sets up periodic heartbeat events
   * @private
   */
  setupHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast(EventTypes.HEARTBEAT, {
        connections: this.connections.size,
        timestamp: new Date().toISOString()
      });
    }, this.heartbeatInterval);

    // Ensure timer doesn't prevent Node from exiting
    this.heartbeatTimer.unref();
  }

  /**
   * Adds a new SSE connection
   * @param {Request} req Express request object
   * @param {Response} res Express response object
   * @returns {Object} Connection object
   */
  async addConnection(req, res) {
    const id = uuidv4();

    const connection = {
      id,
      res,
      state: ConnectionState.CONNECTED,
      connectedAt: new Date(),
      lastEventAt: new Date(),
      send: (event, data) => {
        if (res.writableEnded) return false;

        try {
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify({
            ...data,
            timestamp: new Date().toISOString()
          })}\n\n`);

          connection.lastEventAt = new Date();
          return true;
        } catch (error) {
          logger.error('SSE_SEND_ERROR', error.message, {
            clientId: id,
            event,
            error: error.stack
          });
          connection.state = ConnectionState.ERROR;
          return false;
        }
      }
    };

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Set error handling before adding connection
    req.on('error', (error) => {
      connection.state = ConnectionState.DISCONNECTED;
      this.connections.delete(id);
      logger.debug(`SSE_CONNECTION_ERROR: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
    });

    // Handle client disconnect
    req.on('close', () => {
      connection.state = ConnectionState.DISCONNECTED;
      this.connections.delete(id);
      this.emit('connectionClosed', { id, remaining: this.connections.size });
      logger.debug('SSE client disconnected');
    });

    // Cancel any pending shutdown
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;

      // Cancel shutdown in workspace cache
      if (this.workspaceCache && this.port) {
        await this.workspaceCache.cancelShutdownTimer(this.port);
      }
    }

    this.connections.set(id, connection);

    // Update workspace cache with new connection count
    if (this.workspaceCache && this.port) {
      await this.workspaceCache.updateActiveConnections(this.port, this.connections.size);
    }

    logger.debug('SSE client connected', {
      clientId: id,
      totalConnections: this.connections.size
    });

    return connection;
  }

  /**
   * Broadcasts an event to all connected clients
   * @param {string} event Event type
   * @param {Object} data Event data
   * @returns {number} Number of clients the event was sent to
   */
  broadcast(event, data) {
    // Use batching if enabled
    if (this.batchingEnabled && this.batcher) {
      this.batcher.enqueue(event, data);
      return this.connections.size; // Return potential recipients
    }

    // Fallback to direct broadcast if batching disabled
    return this._broadcastDirect(event, data);
  }

  /**
   * Broadcast event directly to all clients (non-batched)
   * @param {string} event Event type
   * @param {Object} data Event data
   * @returns {number} Number of clients the event was sent to
   * @private
   */
  _broadcastDirect(event, data) {
    let sentCount = 0;

    for (const [id, connection] of this.connections) {
      if (connection.state === ConnectionState.CONNECTED) {
        if (connection.send(event, data)) {
          sentCount++;
        }
      } else {
        // Clean up dead connections
        this.connections.delete(id);
      }
    }

    return sentCount;
  }

  /**
   * Broadcast batched events to all clients
   * @param {string} eventType Event type
   * @param {Array} batch Array of events
   * @param {number} batchSize Size of batch
   * @param {string} reason Reason for flush
   * @returns {number} Number of clients the batch was sent to
   * @private
   */
  _broadcastBatch(eventType, batch, batchSize, reason) {
    const batchMessage = {
      type: `${eventType}_batch`,
      batchSize,
      events: batch,
      reason,
      timestamp: Date.now(),
    };

    let sentCount = 0;

    for (const [id, connection] of this.connections) {
      if (connection.state === ConnectionState.CONNECTED) {
        if (connection.send(`${eventType}_batch`, batchMessage)) {
          sentCount++;
        }
      } else {
        // Clean up dead connections
        this.connections.delete(id);
      }
    }

    logger.debug('Broadcast batched event', {
      eventType,
      batchSize,
      sentCount,
      reason,
    });

    return sentCount;
  }

  /**
   * Sends an event to a specific client
   * @param {string} clientId Client identifier
   * @param {string} event Event type
   * @param {Object} data Event data
   * @returns {boolean} Whether the event was sent successfully
   */
  sendToClient(clientId, event, data) {
    const connection = this.connections.get(clientId);
    if (!connection || connection.state !== ConnectionState.CONNECTED) {
      return false;
    }
    return connection.send(event, data);
  }

  /**
   * Gets stats about current connections
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        state: conn.state,
        connectedAt: conn.connectedAt,
        lastEventAt: conn.lastEventAt
      }))
    };
  }

  /**
   * Performs clean shutdown of all SSE connections
   */
  async shutdown() {
    logger.info(`Shutting down SSE manager (${this.connections.size} connections)`);

    // Flush and destroy batcher
    if (this.batcher) {
      this.batcher.destroy();
      this.batcher = null;
    }

    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      if (!connection.res.writableEnded) {
        connection.res.end();
      }
    }

    this.connections.clear();
    this.removeAllListeners();

    logger.info('SSE manager shutdown complete');
  }
}
