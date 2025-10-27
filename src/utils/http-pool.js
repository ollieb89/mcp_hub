/**
 * HTTP Connection Pool Management
 *
 * Provides optimized HTTP connection pooling for remote MCP servers using undici's Agent.
 * Reduces latency by reusing persistent connections and avoiding TLS handshake overhead.
 *
 * This module is specifically designed for MCP SDK transports (SSEClientTransport and
 * StreamableHTTPClientTransport), which use undici's fetch() internally.
 *
 * @module http-pool
 */

import { fetch, Agent } from 'undici';
import logger from './logger.js';

/**
 * Default connection pool configuration optimized for MCP Hub usage patterns.
 *
 * @constant {Object} DEFAULT_POOL_CONFIG
 * @property {boolean} enabled - Enable connection pooling (default: true)
 * @property {number} keepAliveTimeout - Socket keep-alive timeout in milliseconds (default: 60000ms / 60s)
 * @property {number} keepAliveMaxTimeout - Maximum socket lifetime in milliseconds (default: 600000ms / 10min)
 * @property {number} maxConnections - Maximum connections per host (default: 50)
 * @property {number} maxFreeConnections - Maximum idle connections per host (default: 10)
 * @property {number} timeout - Socket timeout in milliseconds (default: 30000ms / 30s)
 * @property {number} pipelining - Number of pipelined requests (default: 0 - disabled for MCP)
 */
export const DEFAULT_POOL_CONFIG = {
  enabled: true,
  keepAliveTimeout: 60000,        // 60 seconds - longer than default for persistent MCP servers
  keepAliveMaxTimeout: 600000,    // 10 minutes - keep undici's default
  maxConnections: 50,              // Per host - reasonable for concurrent operations
  maxFreeConnections: 10,          // Keep 10 idle connections per host for reuse
  timeout: 30000,                  // 30 second socket timeout
  pipelining: 0                    // Disabled - MCP is request-response, not suited for pipelining
};

/**
 * Creates optimized undici Agent for connection pooling.
 *
 * Creates a single Agent that handles both HTTP and HTTPS protocols with optimized
 * pooling configuration for MCP Hub's usage patterns.
 *
 * @param {Object} config - Connection pool configuration
 * @param {number} [config.keepAliveTimeout=60000] - Socket keep-alive timeout in ms
 * @param {number} [config.keepAliveMaxTimeout=600000] - Maximum socket lifetime in ms
 * @param {number} [config.maxConnections=50] - Maximum connections per host
 * @param {number} [config.maxFreeConnections=10] - Maximum idle connections per host
 * @param {number} [config.timeout=30000] - Socket timeout in ms
 * @param {number} [config.pipelining=0] - Number of pipelined requests
 * @returns {Agent} Undici Agent instance configured for connection pooling
 * @throws {Error} If Agent creation fails
 *
 * @example
 * const agent = createHTTPAgent({ maxConnections: 100 });
 * // Use with createPooledFetch()
 */
export function createHTTPAgent(config = {}) {
  const poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };

  // Remove 'enabled' property as it's not a valid Agent option
  const { enabled, ...agentOptions } = poolConfig;

  try {
    // Create undici Agent with pooling configuration
    // Note: undici uses 'connections' parameter instead of 'maxConnections'
    const agentConfig = {
      keepAliveTimeout: agentOptions.keepAliveTimeout,
      keepAliveMaxTimeout: agentOptions.keepAliveMaxTimeout,
      connections: agentOptions.maxConnections,  // undici's parameter name
      maxFreeConnections: agentOptions.maxFreeConnections,
      timeout: agentOptions.timeout,
      pipelining: agentOptions.pipelining
    };

    logger.debug('Creating HTTP Agent with connection pooling', { config: agentConfig });
    return new Agent(agentConfig);
  } catch (error) {
    logger.error('Failed to create HTTP Agent', { error: error.message, config: poolConfig });
    throw new Error(`HTTP Agent creation failed: ${error.message}`);
  }
}

/**
 * Creates a fetch wrapper that uses the provided undici Agent for connection pooling.
 *
 * This wrapper injects the Agent as the dispatcher for all fetch calls,
 * enabling connection reuse and keep-alive for improved performance.
 *
 * The wrapper preserves all fetch() API semantics while adding connection pooling.
 *
 * @param {Agent} agent - Undici Agent for connection pooling
 * @returns {Function} Custom fetch function with connection pooling
 * @throws {Error} If agent is invalid
 *
 * @example
 * const agent = createHTTPAgent();
 * const pooledFetch = createPooledFetch(agent);
 *
 * // Use like normal fetch, but with connection pooling
 * const response = await pooledFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' })
 * });
 *
 * @example
 * // Use with MCP SDK transports
 * const transport = new SSEClientTransport(url, {
 *   fetch: pooledFetch,
 *   requestInit: { headers }
 * });
 */
export function createPooledFetch(agent) {
  if (!agent || !(agent instanceof Agent)) {
    throw new Error('Invalid agent: must be an undici Agent instance');
  }

  /**
   * Custom fetch implementation with connection pooling.
   *
   * @param {string|URL|Request} input - URL or Request object
   * @param {RequestInit} [init] - Fetch options (headers, method, body, etc.)
   * @returns {Promise<Response>} Fetch response
   */
  return function pooledFetch(input, init = {}) {
    // Inject Agent as dispatcher
    return fetch(input, {
      ...init,
      dispatcher: agent
    });
  };
}

/**
 * Merges global and per-server connection pool configurations.
 *
 * Per-server configuration takes precedence over global configuration.
 * If pooling is explicitly disabled (enabled: false), no merging occurs.
 *
 * @param {Object} [globalConfig] - Global connection pool configuration
 * @param {Object} [serverConfig] - Per-server connection pool configuration
 * @returns {Object} Merged configuration with server overrides applied
 *
 * @example
 * const global = { keepAliveTimeout: 60000, maxConnections: 50 };
 * const server = { maxConnections: 100 };
 * const merged = mergePoolConfig(global, server);
 * // Result: { enabled: true, keepAliveTimeout: 60000, maxConnections: 100, ... }
 *
 * @example
 * const global = { enabled: true, maxConnections: 50 };
 * const server = { enabled: false };
 * const merged = mergePoolConfig(global, server);
 * // Result: { enabled: false }
 */
export function mergePoolConfig(globalConfig = {}, serverConfig = {}) {
  // If server explicitly disables pooling, return that
  if (serverConfig.enabled === false) {
    return { enabled: false };
  }

  // If global explicitly disables pooling and server doesn't override, return disabled
  if (globalConfig.enabled === false && serverConfig.enabled !== true) {
    return { enabled: false };
  }

  // Merge configurations (server overrides global, defaults applied)
  return {
    ...DEFAULT_POOL_CONFIG,
    ...globalConfig,
    ...serverConfig
  };
}

/**
 * Validates connection pool configuration.
 *
 * Ensures all configuration values are within valid ranges and types.
 *
 * @param {Object} config - Connection pool configuration to validate
 * @returns {Object} Validation result with valid flag and errors array
 * @returns {boolean} result.valid - Whether configuration is valid
 * @returns {string[]} result.errors - Array of validation error messages
 *
 * @example
 * const result = validatePoolConfig({ keepAliveTimeout: -1000 });
 * // result.valid = false
 * // result.errors = ['keepAliveTimeout must be between 1000 and 600000']
 */
export function validatePoolConfig(config) {
  const errors = [];

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.keepAliveTimeout !== undefined) {
    if (typeof config.keepAliveTimeout !== 'number' || config.keepAliveTimeout < 1000 || config.keepAliveTimeout > 600000) {
      errors.push('keepAliveTimeout must be a number between 1000 and 600000 (1s - 10min)');
    }
  }

  if (config.keepAliveMaxTimeout !== undefined) {
    if (typeof config.keepAliveMaxTimeout !== 'number' || config.keepAliveMaxTimeout < 1000 || config.keepAliveMaxTimeout > 3600000) {
      errors.push('keepAliveMaxTimeout must be a number between 1000 and 3600000 (1s - 1h)');
    }
  }

  if (config.maxConnections !== undefined) {
    if (typeof config.maxConnections !== 'number' || config.maxConnections < 1 || config.maxConnections > 1000) {
      errors.push('maxConnections must be a number between 1 and 1000');
    }
  }

  if (config.maxFreeConnections !== undefined) {
    if (typeof config.maxFreeConnections !== 'number' || config.maxFreeConnections < 0 || config.maxFreeConnections > 100) {
      errors.push('maxFreeConnections must be a number between 0 and 100');
    }
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 300000) {
      errors.push('timeout must be a number between 1000 and 300000 (1s - 5min)');
    }
  }

  if (config.pipelining !== undefined) {
    if (typeof config.pipelining !== 'number' || config.pipelining < 0 || config.pipelining > 10) {
      errors.push('pipelining must be a number between 0 and 10');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Destroy undici Agent and close all connections.
 *
 * Call this during cleanup to properly close all HTTP connections
 * and free resources.
 *
 * @param {Agent} agent - Undici Agent to destroy
 *
 * @example
 * const agent = createHTTPAgent();
 * // ... use agent ...
 * destroyAgent(agent);
 */
export function destroyAgent(agent) {
  if (agent && typeof agent.destroy === 'function') {
    agent.destroy();
  }
}
