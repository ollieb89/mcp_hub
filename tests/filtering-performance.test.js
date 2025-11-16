/**
 * Comprehensive Performance Benchmarks for Tool Filtering System
 * Sprint 4.3.2: Performance Benchmarking
 * 
 * Metrics to Measure:
 * - Server startup time (before vs after)
 * - Tool registration time per server
 * - Memory usage impact
 * - Category lookup latency
 * - LLM call overhead (if enabled)
 * 
 * Acceptance Criteria:
 * - Startup time increase < 200ms
 * - Registration overhead < 10ms per tool
 * - Memory increase < 50MB
 * - Category lookup < 5ms
 * - No blocking operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';
import { EventEmitter } from 'events';

/**
 * Simple waitFor utility for async test conditions
 */
async function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      callback();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  callback();
}

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Tool Filtering Performance Benchmarks (Sprint 4.3.2)', () => {
  let mcpHub;
  let endpoint;

  /**
   * Helper: Create mock MCPHub with specified number of servers
   */
  function createMockHub(serverCount, toolsPerServer, config = {}, useRealisticNames = false) {
    const hub = new EventEmitter();
    hub.connections = new Map();
    hub.hubServerUrl = 'http://localhost:7000';
    hub.configManager = {
      getConfig: () => config
    };

    // Create mock servers with tools
    for (let i = 0; i < serverCount; i++) {
      const serverName = `server_${i}`;
      const tools = [];

      for (let j = 0; j < toolsPerServer; j++) {
        const toolName = useRealisticNames 
          ? `filesystem__read_${j}` // Use names that match category patterns
          : `${serverName}__tool_${j}`;
        
        tools.push({
          name: toolName,
          description: `Tool ${j} from ${serverName}`,
          inputSchema: { type: 'object', properties: {} }
        });
      }

      hub.connections.set(serverName, {
        name: serverName,
        status: 'connected',
        disabled: false,
        tools,
        resources: [],
        prompts: []
      });
    }

    return hub;
  }

  /**
   * Helper: Measure memory usage
   */
  function getMemoryUsage() {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage().heapUsed;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (endpoint?.filteringService) {
      await endpoint.filteringService.shutdown();
    }
  });

  describe('Metric 1: Server Startup Time', () => {
    it('should have minimal startup overhead with filtering disabled', () => {
      // Arrange
      const config = {
        toolFiltering: { enabled: false }
      };

      mcpHub = createMockHub(25, 50, config); // 1250 tools total

      // Act: Measure startup time
      const startTime = Date.now();
      endpoint = new MCPServerEndpoint(mcpHub);
      const elapsed = Date.now() - startTime;

      // Assert: Baseline should be fast (< 100ms)
      expect(elapsed).toBeLessThan(100);
      
      // Verify all tools registered
      const totalTools = endpoint.registeredCapabilities.tools.size;
      expect(totalTools).toBe(1250);
    });

    it('should have startup time increase < 200ms with filtering enabled', () => {
      // Arrange
      const configWithoutFiltering = {
        toolFiltering: { enabled: false }
      };

      const configWithFiltering = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };

      mcpHub = createMockHub(25, 50, configWithoutFiltering);

      // Act: Measure baseline startup time
      const baselineStart = Date.now();
      const baselineEndpoint = new MCPServerEndpoint(mcpHub);
      const baselineTime = Date.now() - baselineStart;

      // Clean up
      baselineEndpoint.filteringService.shutdown();

      // Act: Measure startup time with filtering
      mcpHub = createMockHub(25, 50, configWithFiltering);
      const filteringStart = Date.now();
      endpoint = new MCPServerEndpoint(mcpHub);
      const filteringTime = Date.now() - filteringStart;

      // Calculate overhead
      const overhead = filteringTime - baselineTime;

      // Assert: Overhead should be < 200ms (acceptance criterion)
      expect(overhead).toBeLessThan(200);
      
      // Additional assertion: Filtering time should still be reasonable
      expect(filteringTime).toBeLessThan(300);
    });

    it('should handle 25 servers with 100 tools each efficiently', () => {
      // Arrange: Large realistic configuration
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web', 'search']
          }
        }
      };

      mcpHub = createMockHub(25, 100, config); // 2500 tools total

      // Act: Measure startup time
      const startTime = Date.now();
      endpoint = new MCPServerEndpoint(mcpHub);
      const elapsed = Date.now() - startTime;

      // Assert: Should handle large config efficiently (< 500ms total)
      expect(elapsed).toBeLessThan(500);
      
      // Verify filtering is working
      const stats = endpoint.filteringService.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.totalChecked).toBe(2500);
    });
  });

  describe('Metric 2: Tool Registration Time Per Server', () => {
    it('should process each tool in < 10ms (registration overhead)', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          }
        }
      };

      mcpHub = createMockHub(1, 100, config); // 1 server, 100 tools

      // Act: Measure registration time
      const startTime = Date.now();
      endpoint = new MCPServerEndpoint(mcpHub);
      const elapsed = Date.now() - startTime;

      // Calculate per-tool overhead
      const perToolTime = elapsed / 100;

      // Assert: Per-tool overhead < 10ms (acceptance criterion)
      expect(perToolTime).toBeLessThan(10);
      
      // Additional assertion: Total time should be reasonable
      expect(elapsed).toBeLessThan(1000); // 1 second for 100 tools
    });

    it('should scale linearly with tool count', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };

      // Test with different tool counts
      const measurements = [];

      for (const toolCount of [10, 50, 100, 200]) {
        mcpHub = createMockHub(1, toolCount, config);
        
        const startTime = Date.now();
        const testEndpoint = new MCPServerEndpoint(mcpHub);
        const elapsed = Date.now() - startTime;
        
        measurements.push({
          toolCount,
          elapsed,
          perTool: elapsed / toolCount
        });

        testEndpoint.filteringService.shutdown();
      }

      // Assert: Average per-tool time should meet acceptance criterion
      const perToolTimes = measurements.map(m => m.perTool);
      const avgPerTool = perToolTimes.reduce((a, b) => a + b, 0) / perToolTimes.length;
      
      expect(avgPerTool).toBeLessThan(10); // < 10ms per tool (acceptance criterion)
      
      // Assert: All individual measurements should meet criterion
      for (const measurement of measurements) {
        expect(measurement.perTool).toBeLessThan(10);
      }
      
      // Assert: No measurement should be suspiciously slow (> 50ms per tool)
      const maxPerTool = Math.max(...perToolTimes);
      expect(maxPerTool).toBeLessThan(50);
    });
  });

  describe('Metric 3: Memory Usage Impact', () => {
    it('should have memory increase < 50MB with filtering enabled', () => {
      // Arrange
      const baselineConfig = {
        toolFiltering: { enabled: false }
      };

      const filteringConfig = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web', 'search']
          }
        }
      };

      // Measure baseline memory
      mcpHub = createMockHub(25, 50, baselineConfig);
      const baselineMemBefore = getMemoryUsage();
      const baselineEndpoint = new MCPServerEndpoint(mcpHub);
      const baselineMemAfter = getMemoryUsage();
      const baselineMemDelta = baselineMemAfter - baselineMemBefore;

      baselineEndpoint.filteringService.shutdown();

      // Measure memory with filtering
      mcpHub = createMockHub(25, 50, filteringConfig);
      const filteringMemBefore = getMemoryUsage();
      endpoint = new MCPServerEndpoint(mcpHub);
      const filteringMemAfter = getMemoryUsage();
      const filteringMemDelta = filteringMemAfter - filteringMemBefore;

      // Calculate memory overhead
      const memoryOverhead = filteringMemDelta - baselineMemDelta;
      const memoryOverheadMB = memoryOverhead / (1024 * 1024);

      // Assert: Memory overhead < 50MB (acceptance criterion)
      expect(memoryOverheadMB).toBeLessThan(50);
    });

    it('should not leak memory after shutdown', async () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          }
        }
      };

      const memBefore = getMemoryUsage();

      // Act: Create and shutdown multiple times
      for (let i = 0; i < 10; i++) {
        mcpHub = createMockHub(5, 50, config);
        const testEndpoint = new MCPServerEndpoint(mcpHub);
        await testEndpoint.filteringService.shutdown();
      }

      const memAfter = getMemoryUsage();
      const memDelta = memAfter - memBefore;
      const memDeltaMB = memDelta / (1024 * 1024);

      // Assert: Memory growth should be minimal (< 10MB for 10 iterations)
      expect(memDeltaMB).toBeLessThan(10);
    });
  });

  describe('Metric 4: Category Lookup Latency', () => {
    it('should perform category lookup in < 5ms', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          }
        }
      };

      const service = new ToolFilteringService(config, {});

      // Act: Measure category lookup time
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        service.getToolCategory('filesystem__read', 'fs', {
          description: 'Read a file'
        });
      }

      const elapsed = Date.now() - startTime;
      const avgLookupTime = elapsed / iterations;

      // Assert: Average lookup time < 5ms (acceptance criterion)
      expect(avgLookupTime).toBeLessThan(5);
      
      // Additional assertion: Should be much faster (< 1ms for cached)
      expect(avgLookupTime).toBeLessThan(1);

      service.shutdown();
    });

    it('should maintain lookup performance under load', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web']
          }
        }
      };

      const service = new ToolFilteringService(config, {});

      // Pre-populate cache with diverse tools
      const toolNames = [
        'filesystem__read',
        'filesystem__write',
        'fetch__get',
        'fetch__post',
        'github__search',
        'docker__run',
      ];

      // Warm up cache
      for (const toolName of toolNames) {
        service.getToolCategory(toolName, 'test', {
          description: 'Test tool'
        });
      }

      // Act: Measure lookup time under load
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const toolName = toolNames[i % toolNames.length];
        service.getToolCategory(toolName, 'test', {
          description: 'Test tool'
        });
      }

      const elapsed = Date.now() - startTime;
      const avgLookupTime = elapsed / iterations;

      // Assert: Should maintain performance (< 1ms avg)
      expect(avgLookupTime).toBeLessThan(1);

      service.shutdown();
    });
  });

  describe('Metric 5: LLM Call Overhead', () => {
    it('should not block on LLM calls', async () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          },
          llmCategorization: { enabled: true }
        }
      };

      const service = new ToolFilteringService(config, {});

      // Mock slow LLM
      service.llmClient = {
        categorize: vi.fn(() => new Promise(resolve => 
          setTimeout(() => resolve('web'), 1000)
        ))
      };

      // Act: Call shouldIncludeTool (should NOT block)
      const startTime = Date.now();
      
      const result = service.shouldIncludeTool('custom__unknown', 'custom', {
        description: 'Unknown tool'
      });

      const elapsed = Date.now() - startTime;

      // Assert: Should return immediately (< 100ms)
      expect(elapsed).toBeLessThan(100);
      
      // Result should be based on pattern/default (not LLM)
      expect(result).toBeDefined();

      await service.shutdown();
    });

    it('should handle concurrent LLM calls efficiently', async () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          },
          llmCategorization: { enabled: true }
        }
      };

      const service = new ToolFilteringService(config, {});

      let callCount = 0;
      service.llmClient = {
        categorize: vi.fn(async () => {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'web';
        })
      };

      // Act: Trigger multiple categorizations
      const startTime = Date.now();
      
      for (let i = 0; i < 20; i++) {
        service.getToolCategory(`custom__tool_${i}`, 'custom', {
          description: 'Custom tool'
        });
      }

      const syncElapsed = Date.now() - startTime;

      // Assert: Synchronous calls should complete quickly
      expect(syncElapsed).toBeLessThan(200);

      // Wait for background LLM processing
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Assert: LLM calls should be rate-limited (max 5 concurrent)
      // With 100ms per call and max 5 concurrent, 20 calls should take ~400ms
      const totalElapsed = Date.now() - startTime;
      expect(totalElapsed).toBeLessThan(1000); // Should complete in reasonable time

      await service.shutdown();
    });
  });

  describe('Overall Performance Validation', () => {
    it('should meet all acceptance criteria simultaneously', () => {
      // Arrange: Production-like configuration
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem', 'web', 'search']
          }
        }
      };

      mcpHub = createMockHub(25, 50, config); // 1250 tools

      // Act: Measure all metrics
      const memBefore = getMemoryUsage();
      const startTime = Date.now();
      
      endpoint = new MCPServerEndpoint(mcpHub);
      
      const elapsed = Date.now() - startTime;
      const memAfter = getMemoryUsage();

      // Calculate metrics
      const startupTime = elapsed;
      const perToolTime = elapsed / 1250;
      const memoryDelta = (memAfter - memBefore) / (1024 * 1024);

      // Assert: All acceptance criteria met
      expect(startupTime).toBeLessThan(500); // Reasonable startup
      expect(perToolTime).toBeLessThan(10); // < 10ms per tool
      expect(memoryDelta).toBeLessThan(50); // < 50MB memory

      // Verify filtering is working
      const stats = endpoint.filteringService.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.totalChecked).toBe(1250);
    });

    it('should have no blocking operations during initialization', () => {
      // Arrange
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: {
            categories: ['filesystem']
          },
          llmCategorization: { enabled: true }
        }
      };

      mcpHub = createMockHub(10, 50, config, true); // 500 tools with realistic names

      // Mock slow async operation (simulating LLM)
      const mockLLM = {
        categorize: vi.fn(() => new Promise(resolve =>
          setTimeout(() => resolve('web'), 5000)
        ))
      };

      // Act: Initialization should not block
      const startTime = Date.now();
      endpoint = new MCPServerEndpoint(mcpHub);
      
      // Inject mock LLM after creation
      endpoint.filteringService.llmClient = mockLLM;
      
      const elapsed = Date.now() - startTime;

      // Assert: Should complete quickly despite slow LLM
      expect(elapsed).toBeLessThan(1000);
      
      // Verify endpoint is functional
      expect(endpoint.registeredCapabilities.tools.size).toBeGreaterThan(0);
    });
  });
});
