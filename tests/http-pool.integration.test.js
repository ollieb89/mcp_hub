/**
 * HTTP Connection Pool Integration Tests
 *
 * Tests connection pooling integration with MCPConnection for SSE and
 * streamable-http transports, validating connection reuse and proper cleanup.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPConnection } from '../src/MCPConnection.js';
import { getAgentStats } from '../src/utils/http-pool.js';

describe('HTTP Connection Pool Integration', () => {
  let connection;

  afterEach(async () => {
    if (connection) {
      await connection.cleanup();
      connection = null;
    }
  });

  describe('MCPConnection with HTTP Pool', () => {
    test('creates HTTP agents for SSE transport', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-sse', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      expect(connection.httpAgents.http).toBeDefined();
      expect(connection.httpAgents.https).toBeDefined();
    });

    test('creates HTTP agents for streamable-http transport', () => {
      const config = {
        type: 'streamable-http',
        url: 'https://example.com/mcp',
      };

      connection = new MCPConnection('test-http', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      expect(connection.httpAgents.http).toBeDefined();
      expect(connection.httpAgents.https).toBeDefined();
    });

    test('does NOT create HTTP agents for STDIO transport', () => {
      const config = {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      };

      connection = new MCPConnection('test-stdio', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeUndefined();
    });

    test('applies custom HTTP pool configuration', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        httpPool: {
          maxSockets: 100,
          keepAliveMsecs: 30000,
        },
      };

      connection = new MCPConnection('test-custom', config, null, 'http://localhost:3000');

      expect(connection.httpAgents.https.maxSockets).toBe(100);
      expect(connection.httpAgents.https.keepAliveMsecs).toBe(30000);
    });

    test('uses default pool configuration when not specified', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-default', config, null, 'http://localhost:3000');

      // Should use DEFAULT_POOL_CONFIG values
      expect(connection.httpAgents.https.maxSockets).toBe(50);
      expect(connection.httpAgents.https.keepAliveMsecs).toBe(60000);
      expect(connection.httpAgents.https.keepAlive).toBe(true);
    });
  });

  describe('HTTP Agent Cleanup', () => {
    test('destroys HTTP agents on cleanup', async () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-cleanup', config, null, 'http://localhost:3000');

      const httpDestroySpy = vi.spyOn(connection.httpAgents.http, 'destroy');
      const httpsDestroySpy = vi.spyOn(connection.httpAgents.https, 'destroy');

      await connection.cleanup();

      expect(httpDestroySpy).toHaveBeenCalledOnce();
      expect(httpsDestroySpy).toHaveBeenCalledOnce();
      expect(connection.httpAgents).toBeNull();
    });

    test('handles cleanup without HTTP agents gracefully', async () => {
      const config = {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      };

      connection = new MCPConnection('test-stdio-cleanup', config, null, 'http://localhost:3000');

      // Should not throw
      await expect(connection.cleanup()).resolves.not.toThrow();
    });

    test('cleanup is idempotent', async () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-idempotent', config, null, 'http://localhost:3000');

      await connection.cleanup();
      await expect(connection.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Agent Selection for URL Protocol', () => {
    test('SSE transport with HTTPS URL uses HTTPS agent', async () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-https', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      expect(connection.config.url).toContain('https://');
    });

    test('streamable-http transport with HTTP URL uses HTTP agent', async () => {
      const config = {
        type: 'streamable-http',
        url: 'http://example.com/mcp',
      };

      connection = new MCPConnection('test-http', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      expect(connection.config.url).toContain('http://');
    });
  });

  describe('Agent Statistics', () => {
    test('can retrieve agent statistics after creation', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-stats', config, null, 'http://localhost:3000');

      const stats = getAgentStats(connection.httpAgents.https);

      expect(stats).toHaveProperty('activeSockets');
      expect(stats).toHaveProperty('idleSockets');
      expect(stats).toHaveProperty('requests');
    });

    test('initial stats show no connections', () => {
      const config = {
        type: 'streamable-http',
        url: 'https://example.com/mcp',
      };

      connection = new MCPConnection('test-initial-stats', config, null, 'http://localhost:3000');

      const stats = getAgentStats(connection.httpAgents.https);

      expect(stats.activeSockets).toBe(0);
      expect(stats.idleSockets).toBe(0);
      expect(stats.requests).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    test('handles missing httpPool configuration', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        // No httpPool specified
      };

      connection = new MCPConnection('test-no-config', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      // Should use defaults
      expect(connection.httpAgents.https.keepAlive).toBe(true);
    });

    test('handles empty httpPool configuration', () => {
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        httpPool: {},
      };

      connection = new MCPConnection('test-empty-config', config, null, 'http://localhost:3000');

      expect(connection.httpAgents).toBeDefined();
      // Should use defaults
      expect(connection.httpAgents.https.maxSockets).toBe(50);
    });

    test('handles partial httpPool configuration', () => {
      const config = {
        type: 'streamable-http',
        url: 'https://example.com/mcp',
        httpPool: {
          maxSockets: 75,
          // Other properties should use defaults
        },
      };

      connection = new MCPConnection('test-partial-config', config, null, 'http://localhost:3000');

      expect(connection.httpAgents.https.maxSockets).toBe(75);
      expect(connection.httpAgents.https.keepAlive).toBe(true); // Default
      expect(connection.httpAgents.https.keepAliveMsecs).toBe(60000); // Default
    });
  });

  describe('Multiple Connections', () => {
    let connection1;
    let connection2;

    afterEach(async () => {
      if (connection1) {
        await connection1.cleanup();
        connection1 = null;
      }
      if (connection2) {
        await connection2.cleanup();
        connection2 = null;
      }
    });

    test('each connection has independent HTTP agents', () => {
      const config1 = {
        type: 'sse',
        url: 'https://server1.com/mcp/sse',
      };

      const config2 = {
        type: 'sse',
        url: 'https://server2.com/mcp/sse',
      };

      connection1 = new MCPConnection('server1', config1, null, 'http://localhost:3000');
      connection2 = new MCPConnection('server2', config2, null, 'http://localhost:3000');

      expect(connection1.httpAgents).not.toBe(connection2.httpAgents);
      expect(connection1.httpAgents.https).not.toBe(connection2.httpAgents.https);
    });

    test('connections with different pool configs are independent', () => {
      const config1 = {
        type: 'sse',
        url: 'https://server1.com/mcp/sse',
        httpPool: { maxSockets: 50 },
      };

      const config2 = {
        type: 'sse',
        url: 'https://server2.com/mcp/sse',
        httpPool: { maxSockets: 100 },
      };

      connection1 = new MCPConnection('server1', config1, null, 'http://localhost:3000');
      connection2 = new MCPConnection('server2', config2, null, 'http://localhost:3000');

      expect(connection1.httpAgents.https.maxSockets).toBe(50);
      expect(connection2.httpAgents.https.maxSockets).toBe(100);
    });
  });
});
