/**
 * HTTP Connection Pool Tests
 *
 * Validates HTTP/HTTPS agent creation, configuration, and connection pooling
 * for optimized persistent connections to remote MCP servers.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import https from 'https';
import {
  createHTTPAgent,
  getAgentForURL,
  getAgentStats,
  destroyAgents,
  DEFAULT_POOL_CONFIG,
} from '../src/utils/http-pool.js';

describe('HTTP Connection Pool', () => {
  let agents;

  afterEach(() => {
    // Clean up agents after each test
    if (agents) {
      destroyAgents(agents);
      agents = null;
    }
  });

  describe('createHTTPAgent', () => {
    test('creates HTTP and HTTPS agents with default config', () => {
      agents = createHTTPAgent();

      expect(agents).toBeDefined();
      expect(agents.http).toBeInstanceOf(http.Agent);
      expect(agents.https).toBeInstanceOf(https.Agent);
    });

    test('applies default pool configuration', () => {
      agents = createHTTPAgent();

      // HTTP agent
      expect(agents.http.keepAlive).toBe(DEFAULT_POOL_CONFIG.keepAlive);
      expect(agents.http.keepAliveMsecs).toBe(DEFAULT_POOL_CONFIG.keepAliveMsecs);
      expect(agents.http.maxSockets).toBe(DEFAULT_POOL_CONFIG.maxSockets);
      expect(agents.http.maxFreeSockets).toBe(DEFAULT_POOL_CONFIG.maxFreeSockets);

      // HTTPS agent
      expect(agents.https.keepAlive).toBe(DEFAULT_POOL_CONFIG.keepAlive);
      expect(agents.https.keepAliveMsecs).toBe(DEFAULT_POOL_CONFIG.keepAliveMsecs);
      expect(agents.https.maxSockets).toBe(DEFAULT_POOL_CONFIG.maxSockets);
      expect(agents.https.maxFreeSockets).toBe(DEFAULT_POOL_CONFIG.maxFreeSockets);
    });

    test('applies custom configuration', () => {
      const customConfig = {
        maxSockets: 100,
        maxFreeSockets: 20,
        keepAliveMsecs: 30000,
      };

      agents = createHTTPAgent(customConfig);

      expect(agents.http.maxSockets).toBe(100);
      expect(agents.http.maxFreeSockets).toBe(20);
      expect(agents.http.keepAliveMsecs).toBe(30000);
      // Other properties should use defaults
      expect(agents.http.keepAlive).toBe(DEFAULT_POOL_CONFIG.keepAlive);
    });

    test('merges custom config with defaults', () => {
      agents = createHTTPAgent({ maxSockets: 75 });

      expect(agents.http.maxSockets).toBe(75); // Custom
      expect(agents.http.keepAlive).toBe(DEFAULT_POOL_CONFIG.keepAlive); // Default
      expect(agents.http.keepAliveMsecs).toBe(DEFAULT_POOL_CONFIG.keepAliveMsecs); // Default
    });

    test('creates independent HTTP and HTTPS agents', () => {
      agents = createHTTPAgent();

      expect(agents.http).not.toBe(agents.https);
      expect(agents.http.constructor).toBe(http.Agent);
      expect(agents.https.constructor).toBe(https.Agent);
    });
  });

  describe('getAgentForURL', () => {
    beforeEach(() => {
      agents = createHTTPAgent();
    });

    test('returns HTTPS agent for HTTPS URL string', () => {
      const agent = getAgentForURL(agents, 'https://example.com');
      expect(agent).toBe(agents.https);
    });

    test('returns HTTP agent for HTTP URL string', () => {
      const agent = getAgentForURL(agents, 'http://example.com');
      expect(agent).toBe(agents.http);
    });

    test('returns HTTPS agent for HTTPS URL object', () => {
      const url = new URL('https://example.com');
      const agent = getAgentForURL(agents, url);
      expect(agent).toBe(agents.https);
    });

    test('returns HTTP agent for HTTP URL object', () => {
      const url = new URL('http://example.com');
      const agent = getAgentForURL(agents, url);
      expect(agent).toBe(agents.http);
    });

    test('handles URLs with different ports', () => {
      const httpsAgent = getAgentForURL(agents, 'https://example.com:8443');
      const httpAgent = getAgentForURL(agents, 'http://example.com:8080');

      expect(httpsAgent).toBe(agents.https);
      expect(httpAgent).toBe(agents.http);
    });

    test('handles URLs with paths and query params', () => {
      const agent = getAgentForURL(agents, 'https://example.com/path?query=param');
      expect(agent).toBe(agents.https);
    });
  });

  describe('getAgentStats', () => {
    beforeEach(() => {
      agents = createHTTPAgent();
    });

    test('returns zero stats for unused agent', () => {
      const stats = getAgentStats(agents.http);

      expect(stats).toEqual({
        activeSockets: 0,
        idleSockets: 0,
        requests: 0,
      });
    });

    test('returns stats structure with correct properties', () => {
      const stats = getAgentStats(agents.https);

      expect(stats).toHaveProperty('activeSockets');
      expect(stats).toHaveProperty('idleSockets');
      expect(stats).toHaveProperty('requests');
      expect(typeof stats.activeSockets).toBe('number');
      expect(typeof stats.idleSockets).toBe('number');
      expect(typeof stats.requests).toBe('number');
    });

    test('handles agent with no connections', () => {
      const stats = getAgentStats(agents.http);

      expect(stats.activeSockets).toBe(0);
      expect(stats.idleSockets).toBe(0);
      expect(stats.requests).toBe(0);
    });
  });

  describe('destroyAgents', () => {
    test('destroys both HTTP and HTTPS agents', () => {
      agents = createHTTPAgent();

      // Spy on destroy methods
      const httpDestroySpy = vi.spyOn(agents.http, 'destroy');
      const httpsDestroySpy = vi.spyOn(agents.https, 'destroy');

      destroyAgents(agents);

      expect(httpDestroySpy).toHaveBeenCalledOnce();
      expect(httpsDestroySpy).toHaveBeenCalledOnce();
    });

    test('handles missing HTTP agent gracefully', () => {
      agents = createHTTPAgent();
      delete agents.http;

      expect(() => destroyAgents(agents)).not.toThrow();
    });

    test('handles missing HTTPS agent gracefully', () => {
      agents = createHTTPAgent();
      delete agents.https;

      expect(() => destroyAgents(agents)).not.toThrow();
    });

    test('handles empty agents object gracefully', () => {
      expect(() => destroyAgents({})).not.toThrow();
    });
  });

  describe('Connection Pool Configuration', () => {
    test('LIFO scheduling configured for better connection reuse', () => {
      agents = createHTTPAgent();

      expect(agents.http.scheduling).toBe('lifo');
      expect(agents.https.scheduling).toBe('lifo');
    });

    test('keep-alive enabled by default', () => {
      agents = createHTTPAgent();

      expect(agents.http.keepAlive).toBe(true);
      expect(agents.https.keepAlive).toBe(true);
    });

    test('reasonable defaults for production use', () => {
      agents = createHTTPAgent();

      // Verify sensible defaults
      expect(agents.http.maxSockets).toBeGreaterThan(0);
      expect(agents.http.maxFreeSockets).toBeGreaterThan(0);
      expect(agents.http.maxFreeSockets).toBeLessThan(agents.http.maxSockets);
      expect(agents.http.keepAliveMsecs).toBeGreaterThan(0);
    });

    test('disabling keep-alive works correctly', () => {
      agents = createHTTPAgent({ keepAlive: false });

      expect(agents.http.keepAlive).toBe(false);
      expect(agents.https.keepAlive).toBe(false);
    });
  });

  describe('DEFAULT_POOL_CONFIG', () => {
    test('exports default configuration constant', () => {
      expect(DEFAULT_POOL_CONFIG).toBeDefined();
      expect(typeof DEFAULT_POOL_CONFIG).toBe('object');
    });

    test('contains required configuration properties', () => {
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('keepAlive');
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('keepAliveMsecs');
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('maxSockets');
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('maxFreeSockets');
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('timeout');
      expect(DEFAULT_POOL_CONFIG).toHaveProperty('scheduling');
    });

    test('default values are reasonable', () => {
      expect(DEFAULT_POOL_CONFIG.keepAlive).toBe(true);
      expect(DEFAULT_POOL_CONFIG.maxSockets).toBe(50);
      expect(DEFAULT_POOL_CONFIG.maxFreeSockets).toBe(10);
      expect(DEFAULT_POOL_CONFIG.keepAliveMsecs).toBe(60000);
      expect(DEFAULT_POOL_CONFIG.timeout).toBe(30000);
      expect(DEFAULT_POOL_CONFIG.scheduling).toBe('lifo');
    });
  });
});
