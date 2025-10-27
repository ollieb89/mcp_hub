/**
 * Integration Test Template - Multi-Component Testing
 *
 * Purpose: Test component interactions and real transport behavior
 * Use when: Testing multiple components working together or real I/O
 *
 * Key Patterns:
 * - Minimal mocking (use real transports when possible)
 * - Process lifecycle testing with vi.waitFor()
 * - Timeout and error scenarios
 * - Real filesystem/network operations
 *
 * Based on Sprint 3 Integration Test patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YourSystem } from '../src/your-system.js';
import { ComponentA } from '../src/component-a.js';
import { ComponentB } from '../src/component-b.js';
import {
  createStdioConfig,
  createSSEConfig,
  createHttpConfig,
  createEnvContext
} from './helpers/fixtures.js';

describe('YourSystem Integration Tests', () => {
  let system;
  let componentA;
  let componentB;

  beforeEach(async () => {
    // ARRANGE: Set up integrated system
    const config = createStdioConfig('test-system');
    system = new YourSystem(config);

    componentA = new ComponentA(system);
    componentB = new ComponentB(system);
  });

  afterEach(async () => {
    // Clean up all components
    await componentA?.cleanup();
    await componentB?.cleanup();
    await system?.shutdown();
  });

  describe('Component Integration', () => {
    it('should coordinate operations between components', async () => {
      // ARRANGE
      await componentA.initialize();
      await componentB.initialize();

      // ACT
      const resultA = await componentA.produceData({ value: 42 });
      const resultB = await componentB.consumeData(resultA);

      // ASSERT: Verify end-to-end flow
      expect(resultA).toBeDefined();
      expect(resultB).toBeDefined();
      expect(resultB.processedValue).toBe(42);
    });

    it('should handle component failure gracefully', async () => {
      // ARRANGE
      await componentA.initialize();
      await componentB.initialize();

      // Simulate component failure
      vi.spyOn(componentB, 'consumeData').mockRejectedValue(new Error('Component B failed'));

      // ACT & ASSERT
      await expect(
        async () => {
          const data = await componentA.produceData({ value: 42 });
          await componentB.consumeData(data);
        }
      ).rejects.toThrow('Component B failed');

      // Verify system state after failure
      expect(system.isHealthy()).toBe(false);
    });
  });

  describe('STDIO Transport Integration', () => {
    it('should establish real STDIO connection', async () => {
      // ARRANGE
      const stdioConfig = createStdioConfig('stdio-server', {
        command: 'node',
        args: ['./tests/fixtures/stdio-test-server.js']
      });

      // ACT
      const connection = await system.connectStdio(stdioConfig);

      // ASSERT: Verify real process spawned
      expect(connection.process).toBeDefined();
      expect(connection.process.pid).toBeGreaterThan(0);
      expect(connection.status).toBe('connected');

      // Wait for initialization
      await vi.waitFor(() => {
        expect(connection.isReady).toBe(true);
      }, { timeout: 5000 });
    });

    it('should handle STDIO process termination', async () => {
      // ARRANGE
      const stdioConfig = createStdioConfig('stdio-server', {
        command: 'node',
        args: ['./tests/fixtures/stdio-test-server.js']
      });
      const connection = await system.connectStdio(stdioConfig);

      // ACT: Kill process
      connection.process.kill('SIGTERM');

      // ASSERT: Verify disconnection detected
      await vi.waitFor(() => {
        expect(connection.status).toBe('disconnected');
      }, { timeout: 3000 });
    });

    it('should timeout on hanging STDIO operations', async () => {
      // ARRANGE
      const stdioConfig = createStdioConfig('stdio-server', {
        command: 'node',
        args: ['./tests/fixtures/stdio-test-server.js'],
        timeout: 1000 // 1 second timeout
      });
      const connection = await system.connectStdio(stdioConfig);

      // ACT & ASSERT: Operation should timeout
      await expect(
        connection.callTool('hanging_operation', {})
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: expect.stringContaining('timeout')
      });
    }, 10000); // Test timeout: 10 seconds
  });

  describe('SSE Transport Integration', () => {
    it('should establish SSE connection with real endpoint', async () => {
      // ARRANGE
      const sseConfig = createSSEConfig('sse-server', {
        url: 'http://localhost:3000/mcp',
        headers: { 'Authorization': 'Bearer test-token' }
      });

      // ACT
      const connection = await system.connectSSE(sseConfig);

      // ASSERT: Verify connection established
      expect(connection.eventSource).toBeDefined();
      expect(connection.status).toBe('connected');

      // Wait for first event
      await vi.waitFor(() => {
        expect(connection.receivedEvents.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('should reconnect SSE on connection loss', async () => {
      // ARRANGE
      const sseConfig = createSSEConfig('sse-server');
      const connection = await system.connectSSE(sseConfig);
      expect(connection.status).toBe('connected');

      // ACT: Simulate connection loss
      connection.eventSource.close();

      // ASSERT: Verify reconnection attempt
      await vi.waitFor(() => {
        expect(connection.status).toBe('reconnecting');
      }, { timeout: 2000 });

      await vi.waitFor(() => {
        expect(connection.status).toBe('connected');
      }, { timeout: 10000 });
    }, 15000); // Test timeout: 15 seconds
  });

  describe('HTTP Transport Integration', () => {
    it('should complete OAuth flow with real endpoints', async () => {
      // ARRANGE
      const httpConfig = createHttpConfig('http-server', {
        url: 'https://api.example.com/mcp',
        oauth: {
          authorizationEndpoint: 'https://api.example.com/oauth/authorize',
          tokenEndpoint: 'https://api.example.com/oauth/token'
        }
      });

      // ACT
      const connection = await system.connectHttp(httpConfig);

      // ASSERT: Verify OAuth completed
      expect(connection.tokens).toBeDefined();
      expect(connection.tokens.access_token).toBeDefined();
      expect(connection.status).toBe('connected');
    }, 30000); // OAuth flow can take time
  });

  describe('Timeout and Error Scenarios', () => {
    it('should handle operation timeout with race condition', async () => {
      // ARRANGE
      const config = createStdioConfig('test-server');
      const connection = await system.connect(config);

      // Mock hanging operation
      vi.spyOn(connection, 'callTool').mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      // ACT & ASSERT: Should timeout
      const timeoutPromise = connection.callTool('hanging_tool', {});

      await expect(
        Promise.race([
          timeoutPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 1000)
          )
        ])
      ).rejects.toThrow('Timeout');
    }, 5000);

    it('should handle network errors gracefully', async () => {
      // ARRANGE
      const config = createSSEConfig('unreachable-server', {
        url: 'http://localhost:9999/mcp' // Non-existent server
      });

      // ACT & ASSERT
      await expect(system.connectSSE(config)).rejects.toMatchObject({
        code: 'CONNECTION_FAILED',
        message: expect.stringContaining('ECONNREFUSED')
      });
    });
  });

  describe('Environment Resolution Integration', () => {
    it('should resolve environment variables in configuration', async () => {
      // ARRANGE
      const envContext = createEnvContext({
        API_KEY: 'test-key-123',
        BASE_URL: 'https://api.test.com'
      });

      Object.entries(envContext).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const config = createStdioConfig('env-server', {
        command: '${MCP_BINARY_PATH}/server',
        env: {
          API_KEY: '${API_KEY}',
          BASE_URL: '${BASE_URL}'
        }
      });

      // ACT
      const resolvedConfig = await system.resolveConfig(config);

      // ASSERT: Verify env vars resolved
      expect(resolvedConfig.command).toBe('/usr/local/bin/server');
      expect(resolvedConfig.env.API_KEY).toBe('test-key-123');
      expect(resolvedConfig.env.BASE_URL).toBe('https://api.test.com');
    });
  });

  describe('Parallel Operations', () => {
    it('should handle multiple concurrent connections', async () => {
      // ARRANGE
      const configs = [
        createStdioConfig('server-1'),
        createStdioConfig('server-2'),
        createStdioConfig('server-3')
      ];

      // ACT: Connect all in parallel
      const connections = await Promise.all(
        configs.map(config => system.connect(config))
      );

      // ASSERT: All connections successful
      expect(connections).toHaveLength(3);
      connections.forEach((conn, index) => {
        expect(conn.status).toBe('connected');
        expect(conn.name).toBe(`server-${index + 1}`);
      });
    });

    it('should handle partial failure in parallel operations', async () => {
      // ARRANGE
      const configs = [
        createStdioConfig('good-server-1'),
        createStdioConfig('bad-server', { command: 'nonexistent' }),
        createStdioConfig('good-server-2')
      ];

      // ACT
      const results = await Promise.allSettled(
        configs.map(config => system.connect(config))
      );

      // ASSERT: Mixed results
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      // System should remain functional with partial failures
      expect(system.activeConnections).toBe(2);
    });
  });
});

/**
 * INTEGRATION TEST CHECKLIST:
 *
 * ✓ Multi-component interaction tests
 * ✓ Real transport testing (STDIO, SSE, HTTP)
 * ✓ Process lifecycle with vi.waitFor()
 * ✓ Timeout and race condition scenarios
 * ✓ Network error handling
 * ✓ OAuth flow integration
 * ✓ Environment resolution
 * ✓ Parallel operation handling
 * ✓ Graceful degradation on failures
 * ✓ Realistic test timeouts
 *
 * ANTI-PATTERNS TO AVOID:
 * ✗ Over-mocking (defeats integration purpose)
 * ✗ Hardcoded delays instead of vi.waitFor()
 * ✗ Testing implementation over integration
 * ✗ Missing cleanup in afterEach
 * ✗ Unrealistic short timeouts
 */
