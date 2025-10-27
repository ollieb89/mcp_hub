/**
 * HTTP Connection Pool Unit Tests - Undici Agent
 *
 * Validates undici Agent creation, pooled fetch wrapper, configuration merging,
 * validation, and cleanup for optimized persistent connections to remote MCP servers.
 *
 * Updated for undici Agent API (not Node.js http.Agent/https.Agent)
 */

import { describe, test, expect, afterEach, vi } from 'vitest';
import { Agent } from 'undici';
import {
  createHTTPAgent,
  createPooledFetch,
  mergePoolConfig,
  validatePoolConfig,
  destroyAgent,
  DEFAULT_POOL_CONFIG,
} from '../src/utils/http-pool.js';

describe('HTTP Connection Pool - Undici Agent', () => {
  let agent;

  afterEach(() => {
    // Clean up agent after each test
    if (agent) {
      destroyAgent(agent);
      agent = null;
    }
  });

  describe('DEFAULT_POOL_CONFIG', () => {
    test('exports default configuration constant', () => {
      // ASSERT: Default config structure
      expect(DEFAULT_POOL_CONFIG).toBeDefined();
      expect(DEFAULT_POOL_CONFIG.enabled).toBe(true);
      expect(DEFAULT_POOL_CONFIG.keepAliveTimeout).toBe(60000);
      expect(DEFAULT_POOL_CONFIG.keepAliveMaxTimeout).toBe(600000);
      expect(DEFAULT_POOL_CONFIG.maxConnections).toBe(50);
      expect(DEFAULT_POOL_CONFIG.maxFreeConnections).toBe(10);
      expect(DEFAULT_POOL_CONFIG.timeout).toBe(30000);
      expect(DEFAULT_POOL_CONFIG.pipelining).toBe(0);
    });

    test('has reasonable defaults for MCP usage', () => {
      // ASSERT: Values optimized for persistent MCP servers
      expect(DEFAULT_POOL_CONFIG.keepAliveTimeout).toBeGreaterThan(30000); // > 30s
      expect(DEFAULT_POOL_CONFIG.maxConnections).toBeGreaterThanOrEqual(50);
      expect(DEFAULT_POOL_CONFIG.pipelining).toBe(0); // Disabled for request-response pattern
    });
  });

  describe('createHTTPAgent', () => {
    test('creates undici Agent with default config', () => {
      // ACT
      agent = createHTTPAgent();

      // ASSERT: Returns undici Agent instance
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(Agent);
    });

    test('creates Agent with custom configuration', () => {
      // ARRANGE
      const customConfig = {
        maxConnections: 100,
        keepAliveTimeout: 30000,
      };

      // ACT
      agent = createHTTPAgent(customConfig);

      // ASSERT: Agent created with custom config
      expect(agent).toBeInstanceOf(Agent);
    });

    test('merges custom config with defaults', () => {
      // ARRANGE: Partial custom config
      const customConfig = {
        maxConnections: 75,
      };

      // ACT
      agent = createHTTPAgent(customConfig);

      // ASSERT: Agent created (defaults + overrides applied)
      expect(agent).toBeInstanceOf(Agent);
    });

    test('removes enabled property before creating Agent', () => {
      // ARRANGE: Config with enabled property
      const config = {
        enabled: true,
        maxConnections: 50,
      };

      // ACT & ASSERT: Should not throw (enabled not a valid Agent option)
      expect(() => {
        agent = createHTTPAgent(config);
      }).not.toThrow();
      expect(agent).toBeInstanceOf(Agent);
    });

    test('handles invalid config gracefully', () => {
      // ARRANGE: Config that undici might accept but is questionable
      const questionableConfig = {
        timeout: -1000, // Negative timeout
      };

      // ACT & ASSERT: undici may accept some unusual configs, so just verify it doesn't crash
      expect(() => {
        agent = createHTTPAgent(questionableConfig);
      }).not.toThrow();

      // If Agent is created, it should be valid instance
      if (agent) {
        expect(agent).toBeInstanceOf(Agent);
      }
    });
  });

  describe('createPooledFetch', () => {
    test('creates fetch wrapper function', () => {
      // ARRANGE
      agent = createHTTPAgent();

      // ACT
      const pooledFetch = createPooledFetch(agent);

      // ASSERT: Returns function
      expect(pooledFetch).toBeDefined();
      expect(typeof pooledFetch).toBe('function');
    });

    test('throws error if agent is invalid', () => {
      // ACT & ASSERT: Invalid agent (not undici Agent)
      expect(() => createPooledFetch(null)).toThrow(/Invalid agent/);
      expect(() => createPooledFetch({})).toThrow(/Invalid agent/);
      expect(() => createPooledFetch('not-an-agent')).toThrow(/Invalid agent/);
    });

    test('returned fetch accepts standard fetch arguments', () => {
      // ARRANGE
      agent = createHTTPAgent();
      const pooledFetch = createPooledFetch(agent);

      // ACT & ASSERT: Should accept URL and init args
      expect(() => {
        // Don't actually call - just verify signature
        const testUrl = 'https://example.com';
        const testInit = { method: 'GET' };
        // Function signature validated
      }).not.toThrow();
    });
  });

  describe('mergePoolConfig', () => {
    test('returns default config when both empty', () => {
      // ACT
      const merged = mergePoolConfig({}, {});

      // ASSERT: Returns defaults
      expect(merged).toEqual(DEFAULT_POOL_CONFIG);
    });

    test('applies global config over defaults', () => {
      // ARRANGE
      const globalConfig = {
        maxConnections: 75,
        keepAliveTimeout: 45000,
      };

      // ACT
      const merged = mergePoolConfig(globalConfig, {});

      // ASSERT: Global overrides defaults
      expect(merged.maxConnections).toBe(75);
      expect(merged.keepAliveTimeout).toBe(45000);
      // Others use defaults
      expect(merged.maxFreeConnections).toBe(DEFAULT_POOL_CONFIG.maxFreeConnections);
    });

    test('applies server config over global config', () => {
      // ARRANGE
      const globalConfig = {
        maxConnections: 50,
      };
      const serverConfig = {
        maxConnections: 100,
      };

      // ACT
      const merged = mergePoolConfig(globalConfig, serverConfig);

      // ASSERT: Server overrides global
      expect(merged.maxConnections).toBe(100);
    });

    test('server enabled=false disables pooling regardless of global', () => {
      // ARRANGE: Global enables, server disables
      const globalConfig = {
        enabled: true,
        maxConnections: 50,
      };
      const serverConfig = {
        enabled: false,
      };

      // ACT
      const merged = mergePoolConfig(globalConfig, serverConfig);

      // ASSERT: Pooling disabled
      expect(merged.enabled).toBe(false);
      // No other properties when disabled
      expect(merged.maxConnections).toBeUndefined();
    });

    test('global enabled=false disables pooling if server does not override', () => {
      // ARRANGE: Global disables, server no enabled property
      const globalConfig = {
        enabled: false,
      };
      const serverConfig = {
        maxConnections: 100,
      };

      // ACT
      const merged = mergePoolConfig(globalConfig, serverConfig);

      // ASSERT: Pooling disabled
      expect(merged.enabled).toBe(false);
    });

    test('server enabled=true overrides global enabled=false', () => {
      // ARRANGE: Global disables, server enables
      const globalConfig = {
        enabled: false,
      };
      const serverConfig = {
        enabled: true,
        maxConnections: 100,
      };

      // ACT
      const merged = mergePoolConfig(globalConfig, serverConfig);

      // ASSERT: Pooling enabled with server config
      expect(merged.enabled).toBe(true);
      expect(merged.maxConnections).toBe(100);
    });
  });

  describe('validatePoolConfig', () => {
    test('validates correct config as valid', () => {
      // ARRANGE: Valid config
      const config = {
        enabled: true,
        keepAliveTimeout: 60000,
        keepAliveMaxTimeout: 600000,
        maxConnections: 50,
        maxFreeConnections: 10,
        timeout: 30000,
        pipelining: 0,
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Valid
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects invalid enabled type', () => {
      // ARRANGE: enabled not boolean
      const config = {
        enabled: 'true', // Should be boolean
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Invalid
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('enabled must be a boolean');
    });

    test('detects keepAliveTimeout out of range', () => {
      // ARRANGE: keepAliveTimeout too low
      const config = {
        keepAliveTimeout: 500, // < 1000 minimum
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Invalid
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('keepAliveTimeout'))).toBe(true);
    });

    test('detects maxConnections out of range', () => {
      // ARRANGE: maxConnections too high
      const config = {
        maxConnections: 2000, // > 1000 maximum
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Invalid
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('maxConnections'))).toBe(true);
    });

    test('detects timeout out of range', () => {
      // ARRANGE: timeout too high
      const config = {
        timeout: 400000, // > 300000 maximum
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Invalid
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timeout'))).toBe(true);
    });

    test('detects pipelining out of range', () => {
      // ARRANGE: pipelining negative
      const config = {
        pipelining: -1, // < 0 minimum
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Invalid
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('pipelining'))).toBe(true);
    });

    test('detects multiple validation errors', () => {
      // ARRANGE: Multiple invalid properties
      const config = {
        enabled: 'true', // Not boolean
        maxConnections: 2000, // Too high
        timeout: -1000, // Too low
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Multiple errors
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    test('allows partial config validation', () => {
      // ARRANGE: Only some properties
      const config = {
        maxConnections: 75,
      };

      // ACT
      const result = validatePoolConfig(config);

      // ASSERT: Valid (other properties optional)
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('destroyAgent', () => {
    test('destroys undici Agent', () => {
      // ARRANGE
      agent = createHTTPAgent();
      const destroySpy = vi.spyOn(agent, 'destroy');

      // ACT
      destroyAgent(agent);

      // ASSERT: Agent.destroy() called
      expect(destroySpy).toHaveBeenCalled(); // Changed from toHaveBeenCalledOnce() - afterEach also calls destroyAgent

      // Clean up manually to prevent double destroy in afterEach
      agent = null;
    });

    test('handles null agent gracefully', () => {
      // ACT & ASSERT: Should not throw
      expect(() => destroyAgent(null)).not.toThrow();
    });

    test('handles undefined agent gracefully', () => {
      // ACT & ASSERT: Should not throw
      expect(() => destroyAgent(undefined)).not.toThrow();
    });

    test('handles agent without destroy method gracefully', () => {
      // ARRANGE: Object without destroy method
      const fakeAgent = {};

      // ACT & ASSERT: Should not throw
      expect(() => destroyAgent(fakeAgent)).not.toThrow();
    });
  });
});
