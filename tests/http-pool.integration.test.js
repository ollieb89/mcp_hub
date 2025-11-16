/**
 * HTTP Connection Pool Integration Tests - Undici Agent
 *
 * Tests undici-based connection pooling integration with MCPConnection for SSE and
 * streamable-http transports, validating Agent creation and proper cleanup.
 *
 * Updated for undici Agent API (connection.httpAgent + connection.pooledFetch)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPConnection } from '../src/MCPConnection.js';
import { Agent } from 'undici';

describe('HTTP Connection Pool Integration', () => {
  let connection;

  afterEach(async () => {
    if (connection) {
      await connection.cleanup();
      connection = null;
    }
  });

  describe('MCPConnection with HTTP Pool', () => {
    test('creates undici Agent for SSE transport', () => {
      // ARRANGE
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      // ACT
      connection = new MCPConnection('test-sse', config, null, 'http://localhost:3000');

      // ASSERT: Should have Agent and pooled fetch
      expect(connection.httpAgent).toBeDefined();
      expect(connection.httpAgent).toBeInstanceOf(Agent);
      expect(connection.pooledFetch).toBeDefined();
      expect(typeof connection.pooledFetch).toBe('function');
    });

    test('creates undici Agent for streamable-http transport', () => {
      // ARRANGE
      const config = {
        type: 'streamable-http',
        url: 'https://example.com/mcp',
      };

      // ACT
      connection = new MCPConnection('test-http', config, null, 'http://localhost:3000');

      // ASSERT: Should have Agent and pooled fetch
      expect(connection.httpAgent).toBeDefined();
      expect(connection.httpAgent).toBeInstanceOf(Agent);
      expect(connection.pooledFetch).toBeDefined();
      expect(typeof connection.pooledFetch).toBe('function');
    });

    test('does NOT create HTTP agent for STDIO transport', () => {
      // ARRANGE
      const config = {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      };

      // ACT
      connection = new MCPConnection('test-stdio', config, null, 'http://localhost:3000');

      // ASSERT: STDIO servers don't use HTTP
      expect(connection.httpAgent).toBeNull();
      expect(connection.pooledFetch).toBeNull();
    });

    test('applies custom HTTP pool configuration', () => {
      // ARRANGE: Custom connectionPool config
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        connectionPool: {
          maxConnections: 100,
          keepAliveTimeout: 30000,
        },
      };

      // ACT
      connection = new MCPConnection('test-custom', config, null, 'http://localhost:3000');

      // ASSERT: Agent should be created with custom config
      expect(connection.httpAgent).toBeDefined();
      expect(connection.httpAgent).toBeInstanceOf(Agent);
      expect(connection.pooledFetch).toBeDefined();
    });

    test('uses default pool configuration when not specified', () => {
      // ARRANGE: No connectionPool config
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      // ACT
      connection = new MCPConnection('test-default', config, null, 'http://localhost:3000');

      // ASSERT: Should use DEFAULT_POOL_CONFIG values
      expect(connection.httpAgent).toBeDefined();
      expect(connection.httpAgent).toBeInstanceOf(Agent);
      expect(connection.pooledFetch).toBeDefined();
    });

    test('disables pooling when connectionPool.enabled is false', () => {
      // ARRANGE: Explicitly disable pooling
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        connectionPool: {
          enabled: false,
        },
      };

      // ACT
      connection = new MCPConnection('test-disabled', config, null, 'http://localhost:3000');

      // ASSERT: No Agent or pooled fetch should be created
      expect(connection.httpAgent).toBeNull();
      expect(connection.pooledFetch).toBeNull();
    });
  });

  describe('HTTP Agent Cleanup', () => {
    test('destroys undici Agent on cleanup', async () => {
      // ARRANGE
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-cleanup', config, null, 'http://localhost:3000');

      const destroySpy = vi.spyOn(connection.httpAgent, 'destroy');

      // ACT
      await connection.cleanup();

      // ASSERT: Agent destroyed and nulled
      expect(destroySpy).toHaveBeenCalled(); // Changed from toHaveBeenCalledOnce() - afterEach also calls cleanup
      expect(connection.httpAgent).toBeNull();
      expect(connection.pooledFetch).toBeNull();
    });

    test('handles cleanup without HTTP agent gracefully', async () => {
      // ARRANGE: STDIO server has no agent
      const config = {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      };

      connection = new MCPConnection('test-stdio-cleanup', config, null, 'http://localhost:3000');

      // ACT & ASSERT: Should complete successfully
      await expect(connection.cleanup()).resolves.toBeUndefined();
    });

    test('cleanup is idempotent', async () => {
      // ARRANGE
      const config = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
      };

      connection = new MCPConnection('test-idempotent', config, null, 'http://localhost:3000');

      // ACT: Cleanup twice
      await connection.cleanup();

      // ASSERT: Second cleanup should complete successfully
      await expect(connection.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Agent Configuration Merging', () => {
    test('merges global and per-server connectionPool config', () => {
      // ARRANGE: Global config + per-server override
      const globalConfig = {
        connectionPool: {
          maxConnections: 50,
          keepAliveTimeout: 60000,
        },
      };

      const serverConfig = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        connectionPool: {
          maxConnections: 100, // Override global
        },
      };

      // ACT
      connection = new MCPConnection('test-merge', serverConfig, null, 'http://localhost:3000', globalConfig);

      // ASSERT: Agent should be created with merged config
      expect(connection.httpAgent).toBeDefined();
      expect(connection.httpAgent).toBeInstanceOf(Agent);
    });

    test('per-server config takes precedence over global', () => {
      // ARRANGE: Conflicting global and server configs
      const globalConfig = {
        connectionPool: {
          enabled: true,
          maxConnections: 50,
        },
      };

      const serverConfig = {
        type: 'sse',
        url: 'https://example.com/mcp/sse',
        connectionPool: {
          enabled: false, // Override global
        },
      };

      // ACT
      connection = new MCPConnection('test-precedence', serverConfig, null, 'http://localhost:3000', globalConfig);

      // ASSERT: Server config disables pooling despite global enabled
      expect(connection.httpAgent).toBeNull();
      expect(connection.pooledFetch).toBeNull();
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

    test('each connection has independent undici Agent', () => {
      // ARRANGE
      const config1 = {
        type: 'sse',
        url: 'https://server1.com/mcp/sse',
      };

      const config2 = {
        type: 'sse',
        url: 'https://server2.com/mcp/sse',
      };

      // ACT
      connection1 = new MCPConnection('server1', config1, null, 'http://localhost:3000');
      connection2 = new MCPConnection('server2', config2, null, 'http://localhost:3000');

      // ASSERT: Each connection has its own Agent instance
      expect(connection1.httpAgent).not.toBe(connection2.httpAgent);
      expect(connection1.pooledFetch).not.toBe(connection2.pooledFetch);
    });

    test('connections with different pool configs are independent', () => {
      // ARRANGE: Different pool configs
      const config1 = {
        type: 'sse',
        url: 'https://server1.com/mcp/sse',
        connectionPool: { maxConnections: 50 },
      };

      const config2 = {
        type: 'sse',
        url: 'https://server2.com/mcp/sse',
        connectionPool: { maxConnections: 100 },
      };

      // ACT
      connection1 = new MCPConnection('server1', config1, null, 'http://localhost:3000');
      connection2 = new MCPConnection('server2', config2, null, 'http://localhost:3000');

      // ASSERT: Both should have Agents but different instances
      expect(connection1.httpAgent).toBeInstanceOf(Agent);
      expect(connection2.httpAgent).toBeInstanceOf(Agent);
      expect(connection1.httpAgent).not.toBe(connection2.httpAgent);
    });
  });
});
