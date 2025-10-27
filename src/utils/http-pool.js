/**
 * HTTP Connection Pool Manager
 *
 * Provides optimized HTTP/HTTPS agents with connection pooling for persistent
 * connections to remote MCP servers. Reduces TLS handshake overhead and
 * connection establishment latency through keep-alive connections.
 *
 * @module utils/http-pool
 */

import http from 'http';
import https from 'https';

/**
 * Default configuration for HTTP connection pooling
 *
 * @constant {Object} DEFAULT_POOL_CONFIG
 * @property {boolean} keepAlive - Enable HTTP keep-alive
 * @property {number} keepAliveMsecs - How long to keep idle connections alive (60s)
 * @property {number} maxSockets - Maximum sockets per host (50)
 * @property {number} maxFreeSockets - Maximum idle sockets to maintain (10)
 * @property {number} timeout - Socket timeout in milliseconds (30s)
 * @property {string} scheduling - Socket scheduling strategy ('lifo' for better reuse)
 */
export const DEFAULT_POOL_CONFIG = {
  keepAlive: true,
  keepAliveMsecs: 60000,  // 60 seconds - keep idle connections alive
  maxSockets: 50,          // Maximum concurrent connections per host
  maxFreeSockets: 10,      // Keep up to 10 idle connections per host
  timeout: 30000,          // 30 second socket timeout
  scheduling: 'lifo',      // Last In First Out - better connection reuse
};

/**
 * Create HTTP and HTTPS agents with optimized connection pooling
 *
 * @param {Object} config - Custom configuration (merged with defaults)
 * @param {boolean} [config.keepAlive=true] - Enable HTTP keep-alive
 * @param {number} [config.keepAliveMsecs=60000] - Keep-alive timeout
 * @param {number} [config.maxSockets=50] - Max sockets per host
 * @param {number} [config.maxFreeSockets=10] - Max idle sockets per host
 * @param {number} [config.timeout=30000] - Socket timeout
 * @param {string} [config.scheduling='lifo'] - Scheduling strategy
 * @returns {Object} Object with http and https agents
 * @returns {http.Agent} .http - HTTP agent
 * @returns {https.Agent} .https - HTTPS agent
 *
 * @example
 * const agents = createHTTPAgent({ maxSockets: 100 });
 * // Use with fetch:
 * fetch(url, { agent: agents.https });
 */
export function createHTTPAgent(config = {}) {
  const poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };

  return {
    http: new http.Agent(poolConfig),
    https: new https.Agent(poolConfig),
  };
}

/**
 * Select appropriate agent based on URL protocol
 *
 * @param {Object} agents - Agents object from createHTTPAgent()
 * @param {http.Agent} agents.http - HTTP agent
 * @param {https.Agent} agents.https - HTTPS agent
 * @param {URL|string} url - URL to determine protocol for
 * @returns {http.Agent|https.Agent} Appropriate agent for the URL
 *
 * @example
 * const agents = createHTTPAgent();
 * const agent = getAgentForURL(agents, 'https://example.com');
 * // Returns agents.https
 */
export function getAgentForURL(agents, url) {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return urlObj.protocol === 'https:' ? agents.https : agents.http;
}

/**
 * Get connection pool statistics for monitoring
 *
 * @param {http.Agent|https.Agent} agent - Agent to get stats for
 * @returns {Object} Connection pool statistics
 * @returns {number} .activeSockets - Currently active connections
 * @returns {number} .idleSockets - Idle connections available for reuse
 * @returns {number} .requests - Pending requests waiting for sockets
 *
 * @example
 * const stats = getAgentStats(agents.https);
 * console.log(`Active: ${stats.activeSockets}, Idle: ${stats.idleSockets}`);
 */
export function getAgentStats(agent) {
  const activeSockets = Object.values(agent.sockets).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const idleSockets = Object.values(agent.freeSockets).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const requests = Object.values(agent.requests).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return {
    activeSockets,
    idleSockets,
    requests,
  };
}

/**
 * Destroy HTTP agents and close all connections
 *
 * Call this during cleanup to properly close all HTTP connections
 * and free resources.
 *
 * @param {Object} agents - Agents object from createHTTPAgent()
 *
 * @example
 * const agents = createHTTPAgent();
 * // ... use agents ...
 * destroyAgents(agents);
 */
export function destroyAgents(agents) {
  if (agents.http) {
    agents.http.destroy();
  }
  if (agents.https) {
    agents.https.destroy();
  }
}
