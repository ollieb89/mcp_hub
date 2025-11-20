/**
 * Performance benchmarks for capabilities schema validation.
 *
 * Validates that schema validation meets <5ms performance requirement
 * for typical MCP Hub health responses.
 */

import { describe, it, expect } from 'vitest';
import { HealthResponseSchema, CapabilitiesSchema } from '../health.schema';

// ============================================================================
// Performance Test Data
// ============================================================================

/**
 * Small response: 2 servers, 10 tools total
 */
const SMALL_RESPONSE = {
  status: 'ok' as const,
  state: 'ready' as const,
  server_id: 'test-hub',
  version: '1.0.0',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [
    {
      name: 'server1',
      displayName: 'Server 1',
      description: 'Test server 1',
      transportType: 'stdio' as const,
      status: 'connected' as const,
      error: null,
      uptime: 1000,
      lastStarted: '2025-01-08T11:00:00.000Z',
      authorizationUrl: null,
      serverInfo: { name: 'server1', version: '1.0.0' },
      config_source: 'test',
      capabilities: {
        tools: Array.from({ length: 5 }, (_, i) => ({
          name: `tool_${i}`,
          description: `Tool ${i} description`,
          inputSchema: {
            type: 'object',
            properties: { param: { type: 'string' } },
          },
        })),
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
    },
    {
      name: 'server2',
      displayName: 'Server 2',
      description: 'Test server 2',
      transportType: 'stdio' as const,
      status: 'connected' as const,
      error: null,
      uptime: 1000,
      lastStarted: '2025-01-08T11:00:00.000Z',
      authorizationUrl: null,
      serverInfo: { name: 'server2', version: '1.0.0' },
      config_source: 'test',
      capabilities: {
        tools: Array.from({ length: 5 }, (_, i) => ({
          name: `tool_${i + 5}`,
          description: `Tool ${i + 5} description`,
        })),
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
    },
  ],
};

/**
 * Medium response: 10 servers, 100 tools total
 */
const MEDIUM_RESPONSE = {
  status: 'ok' as const,
  state: 'ready' as const,
  server_id: 'test-hub',
  version: '1.0.0',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: Array.from({ length: 10 }, (_, serverIdx) => ({
    name: `server_${serverIdx}`,
    displayName: `Server ${serverIdx}`,
    description: `Test server ${serverIdx}`,
    transportType: 'stdio' as const,
    status: 'connected' as const,
    error: null,
    uptime: 1000,
    lastStarted: '2025-01-08T11:00:00.000Z',
    authorizationUrl: null,
    serverInfo: { name: `server_${serverIdx}`, version: '1.0.0' },
    config_source: 'test',
    capabilities: {
      tools: Array.from({ length: 10 }, (_, toolIdx) => ({
        name: `server${serverIdx}_tool${toolIdx}`,
        description: `Tool ${toolIdx} for server ${serverIdx}`,
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { type: 'number' },
          },
        },
      })),
      resources: Array.from({ length: 5 }, (_, resIdx) => ({
        name: `Resource ${resIdx}`,
        uri: `resource://server${serverIdx}/resource${resIdx}`,
        mimeType: 'application/json',
      })),
      resourceTemplates: [
        {
          name: 'Resource Template',
          uriTemplate: `resource://server${serverIdx}/{path}`,
        },
      ],
      prompts: Array.from({ length: 3 }, (_, promptIdx) => ({
        name: `prompt_${promptIdx}`,
        description: `Prompt ${promptIdx}`,
        arguments: [
          { name: 'arg1', description: 'Argument 1', required: true },
          { name: 'arg2', description: 'Argument 2', required: false },
        ],
      })),
    },
  })),
};

/**
 * Large response: 25 servers, 250 tools total (realistic large deployment)
 */
const LARGE_RESPONSE = {
  status: 'ok' as const,
  state: 'ready' as const,
  server_id: 'test-hub',
  version: '1.0.0',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: Array.from({ length: 25 }, (_, serverIdx) => ({
    name: `server_${serverIdx}`,
    displayName: `Server ${serverIdx}`,
    description: `Test server ${serverIdx}`,
    transportType: 'stdio' as const,
    status: 'connected' as const,
    error: null,
    uptime: 1000,
    lastStarted: '2025-01-08T11:00:00.000Z',
    authorizationUrl: null,
    serverInfo: { name: `server_${serverIdx}`, version: '1.0.0' },
    config_source: 'test',
    capabilities: {
      tools: Array.from({ length: 10 }, (_, toolIdx) => ({
        name: `server${serverIdx}_tool${toolIdx}`,
        description: `Tool ${toolIdx} for server ${serverIdx}`,
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { type: 'number' },
            param3: { type: 'boolean' },
          },
          required: ['param1'],
        },
      })),
      resources: Array.from({ length: 10 }, (_, resIdx) => ({
        name: `Resource ${resIdx}`,
        uri: `resource://server${serverIdx}/resource${resIdx}`,
        mimeType: 'application/json',
        description: `Resource description ${resIdx}`,
      })),
      resourceTemplates: Array.from({ length: 5 }, (_, templateIdx) => ({
        name: `Template ${templateIdx}`,
        uriTemplate: `resource://server${serverIdx}/template${templateIdx}/{path}`,
        mimeType: 'application/json',
      })),
      prompts: Array.from({ length: 5 }, (_, promptIdx) => ({
        name: `prompt_${promptIdx}`,
        description: `Prompt ${promptIdx}`,
        arguments: [
          { name: 'arg1', description: 'Argument 1', required: true },
          { name: 'arg2', description: 'Argument 2', required: false },
          { name: 'arg3', description: 'Argument 3', required: false },
        ],
      })),
    },
  })),
};

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Measures execution time of a function with high precision.
 */
function measureExecutionTime(fn: () => void, iterations = 1000): number {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  return (end - start) / iterations; // Average time per iteration
}

/**
 * Performance assertion helper.
 */
function expectPerformance(
  actualMs: number,
  targetMs: number,
  description: string
): void {
  expect(actualMs).toBeLessThan(targetMs);
  console.log(`✅ ${description}: ${actualMs.toFixed(3)}ms (target: <${targetMs}ms)`);
}

// ============================================================================
// Performance Tests
// ============================================================================

describe('Schema Validation Performance', () => {
  describe('baseline measurements', () => {
    it('should validate small response <1ms', () => {
      const avgTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(SMALL_RESPONSE);
      });

      expectPerformance(avgTime, 1.0, 'Small response (2 servers, 10 tools)');
    });

    it('should validate medium response <3ms', () => {
      const avgTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(MEDIUM_RESPONSE);
      }, 100); // Fewer iterations for larger data

      expectPerformance(avgTime, 3.0, 'Medium response (10 servers, 100 tools)');
    });

    it('should validate large response <5ms', () => {
      const avgTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(LARGE_RESPONSE);
      }, 100);

      expectPerformance(avgTime, 5.0, 'Large response (25 servers, 250 tools)');
    });
  });

  describe('capabilities-only validation', () => {
    it('should validate small capabilities <0.5ms', () => {
      const capabilities = SMALL_RESPONSE.servers[0].capabilities;

      const avgTime = measureExecutionTime(() => {
        CapabilitiesSchema.safeParse(capabilities);
      });

      expectPerformance(avgTime, 0.5, 'Small capabilities (5 tools)');
    });

    it('should validate medium capabilities <2ms', () => {
      const capabilities = MEDIUM_RESPONSE.servers[0].capabilities;

      const avgTime = measureExecutionTime(() => {
        CapabilitiesSchema.safeParse(capabilities);
      }, 100);

      expectPerformance(avgTime, 2.0, 'Medium capabilities (10 tools, 5 resources)');
    });

    it('should validate large capabilities <3ms', () => {
      const capabilities = LARGE_RESPONSE.servers[0].capabilities;

      const avgTime = measureExecutionTime(() => {
        CapabilitiesSchema.safeParse(capabilities);
      }, 100);

      expectPerformance(avgTime, 3.0, 'Large capabilities (10 tools, 10 resources, 5 templates)');
    });
  });

  describe('validation failure performance', () => {
    it('should fail fast on invalid tool name <0.5ms', () => {
      const invalidResponse = {
        ...SMALL_RESPONSE,
        servers: [
          {
            ...SMALL_RESPONSE.servers[0],
            capabilities: {
              tools: [{ name: '', description: 'Invalid' }], // Invalid
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const avgTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(invalidResponse);
      });

      expectPerformance(avgTime, 0.5, 'Validation failure (early exit)');
    });

    it('should handle mixed valid/invalid tools efficiently', () => {
      const mixedResponse = {
        ...MEDIUM_RESPONSE,
        servers: [
          {
            ...MEDIUM_RESPONSE.servers[0],
            capabilities: {
              tools: [
                ...MEDIUM_RESPONSE.servers[0].capabilities.tools.slice(0, 5),
                { name: '', description: 'Invalid' }, // Invalid tool
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const avgTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(mixedResponse);
      }, 100);

      expectPerformance(avgTime, 2.0, 'Mixed valid/invalid tools');
    });
  });

  describe('schema compilation overhead', () => {
    it('should demonstrate schema reuse performance benefit', () => {
      // First parse (includes schema compilation)
      const firstParseTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(SMALL_RESPONSE);
      }, 10);

      // Subsequent parses (schema already compiled)
      const subsequentParseTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(SMALL_RESPONSE);
      }, 1000);

      console.log(`📊 Schema reuse benefit: ${firstParseTime.toFixed(3)}ms (first) vs ${subsequentParseTime.toFixed(3)}ms (subsequent)`);

      // Subsequent parses should be significantly faster
      expect(subsequentParseTime).toBeLessThan(firstParseTime);
    });
  });

  describe('real-world scenario benchmarks', () => {
    it('should handle typical health endpoint polling <2ms', () => {
      // Simulate 1-second polling interval (typical React Query usage)
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = HealthResponseSchema.safeParse(MEDIUM_RESPONSE);
        const end = performance.now();

        expect(result.success).toBe(true);
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`📊 Real-world polling: avg=${avgTime.toFixed(3)}ms, max=${maxTime.toFixed(3)}ms`);

      expectPerformance(avgTime, 2.0, 'Health endpoint polling (average)');
      expectPerformance(maxTime, 5.0, 'Health endpoint polling (max)');
    });

    it('should validate 100 consecutive responses <500ms total', () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = HealthResponseSchema.safeParse(SMALL_RESPONSE);
        expect(result.success).toBe(true);
      }

      const totalTime = performance.now() - start;
      const avgTime = totalTime / iterations;

      console.log(`📊 Batch validation: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms per validation`);

      expect(totalTime).toBeLessThan(500);
      expectPerformance(avgTime, 1.0, 'Batch validation (average)');
    });
  });

  describe('z.any() baseline comparison', () => {
    it('should compare performance with previous z.any() implementation', () => {
      // Simulate old z.any() schema (no validation overhead)
      const anyTime = measureExecutionTime(() => {
        // Just parse JSON (minimal overhead)
        JSON.parse(JSON.stringify(MEDIUM_RESPONSE));
      }, 100);

      // New typed schema validation
      const typedTime = measureExecutionTime(() => {
        HealthResponseSchema.safeParse(MEDIUM_RESPONSE);
      }, 100);

      const overhead = typedTime - anyTime;
      const overheadPercent = ((overhead / anyTime) * 100).toFixed(1);

      console.log(`📊 Validation overhead vs z.any():`);
      console.log(`   z.any() equivalent: ${anyTime.toFixed(3)}ms`);
      console.log(`   Typed validation: ${typedTime.toFixed(3)}ms`);
      console.log(`   Overhead: ${overhead.toFixed(3)}ms (${overheadPercent}%)`);

      // Overhead should be acceptable (<3ms)
      expect(overhead).toBeLessThan(3.0);
    });
  });
});

// ============================================================================
// Performance Regression Tests
// ============================================================================

describe('Performance Regression Monitoring', () => {
  it('should maintain performance across schema updates', () => {
    // Baseline: Initial measurement
    const baseline = measureExecutionTime(() => {
      HealthResponseSchema.safeParse(MEDIUM_RESPONSE);
    }, 100);

    // This test serves as a baseline reference
    // Future changes should not significantly increase validation time
    console.log(`📊 Performance baseline: ${baseline.toFixed(3)}ms`);
    console.log(`   Future changes should maintain <${(baseline * 1.2).toFixed(3)}ms (20% tolerance)`);

    expect(baseline).toBeLessThan(5.0);
  });

  it('should provide performance metrics for CI/CD monitoring', () => {
    const metrics = {
      small: measureExecutionTime(() => HealthResponseSchema.safeParse(SMALL_RESPONSE)),
      medium: measureExecutionTime(() => HealthResponseSchema.safeParse(MEDIUM_RESPONSE), 100),
      large: measureExecutionTime(() => HealthResponseSchema.safeParse(LARGE_RESPONSE), 100),
    };

    console.log('📊 Performance Metrics for CI/CD:');
    console.log(JSON.stringify(metrics, null, 2));

    // All should meet performance targets
    expect(metrics.small).toBeLessThan(1.0);
    expect(metrics.medium).toBeLessThan(3.0);
    expect(metrics.large).toBeLessThan(5.0);
  });
});
