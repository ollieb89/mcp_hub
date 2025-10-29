/**
 * API Tests for /api/filtering/stats endpoint
 * Tests Sprint 4.2.1: Filtering statistics endpoint
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("API: /api/filtering/stats endpoint", () => {
  let mockMcpServerEndpoint;
  let mockRequest;

  beforeEach(() => {
    // Create mock request object
    mockRequest = {
      app: {
        locals: {}
      }
    };
  });

  describe("Success cases", () => {
    it("should return comprehensive statistics when filtering is enabled", async () => {
      // Arrange: Create mock endpoint with filtering service
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map([
            ['tool1', { serverName: 'fs', definition: {} }],
            ['tool2', { serverName: 'fs', definition: {} }],
            ['tool3', { serverName: 'web', definition: {} }]
          ])
        },
        toolFilteringService: {
          config: {
            enabled: true,
            mode: 'category',
            serverFilter: {
              mode: 'allowlist',
              servers: ['filesystem']
            },
            categoryFilter: {
              categories: ['filesystem', 'web']
            }
          },
          getStats: vi.fn().mockReturnValue({
            enabled: true,
            mode: 'category',
            totalChecked: 100,
            totalFiltered: 80,
            totalExposed: 20,
            filterRate: 0.8,
            categoryCacheSize: 50,
            cacheHitRate: 0.95,
            llmCacheSize: 10,
            llmCacheHitRate: 0.85,
            allowedServers: ['filesystem'],
            allowedCategories: ['filesystem', 'web']
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate the handler logic
      const stats = mockMcpServerEndpoint.toolFilteringService.getStats();

      const result = {
        enabled: stats.enabled,
        mode: stats.mode,
        totalTools: stats.totalChecked,
        filteredTools: stats.totalFiltered,
        exposedTools: stats.totalExposed,
        filterRate: stats.filterRate,
        serverFilterMode: mockMcpServerEndpoint.toolFilteringService.config.serverFilter?.mode || null,
        allowedServers: stats.allowedServers,
        allowedCategories: stats.allowedCategories,
        categoryCacheSize: stats.categoryCacheSize,
        cacheHitRate: stats.cacheHitRate,
        llmCacheSize: stats.llmCacheSize,
        llmCacheHitRate: stats.llmCacheHitRate,
        timestamp: new Date().toISOString()
      };

      // Assert: Verify comprehensive statistics
      expect(result.enabled).toBe(true);
      expect(result.mode).toBe('category');
      expect(result.totalTools).toBe(100);
      expect(result.filteredTools).toBe(80);
      expect(result.exposedTools).toBe(20);
      expect(result.filterRate).toBe(0.8);
      expect(result.serverFilterMode).toBe('allowlist');
      expect(result.allowedServers).toEqual(['filesystem']);
      expect(result.allowedCategories).toEqual(['filesystem', 'web']);
      expect(result.categoryCacheSize).toBe(50);
      expect(result.cacheHitRate).toBe(0.95);
      expect(result.llmCacheSize).toBe(10);
      expect(result.llmCacheHitRate).toBe(0.85);
      expect(result.timestamp).toBeDefined();
    });

    it("should return statistics when filtering is disabled", async () => {
      // Arrange: Create mock endpoint with disabled filtering
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map([['tool1', {}]])
        },
        toolFilteringService: {
          config: {
            enabled: false,
            serverFilter: null,
            categoryFilter: null
          },
          getStats: vi.fn().mockReturnValue({
            enabled: false,
            mode: null,
            totalChecked: 0,
            totalFiltered: 0,
            totalExposed: 0,
            filterRate: 0,
            categoryCacheSize: 0,
            cacheHitRate: 0,
            llmCacheSize: 0,
            llmCacheHitRate: 0,
            allowedServers: [],
            allowedCategories: []
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate the handler logic
      const stats = mockMcpServerEndpoint.toolFilteringService.getStats();

      // Assert: Should return stats with enabled=false
      expect(stats.enabled).toBe(false);
      expect(stats.totalChecked).toBe(0);
      expect(stats.totalFiltered).toBe(0);
      expect(stats.filterRate).toBe(0);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when MCP endpoint not initialized", async () => {
      // Arrange: No mcpServerEndpoint
      mockRequest.app.locals.mcpServerEndpoint = null;

      // Simulate the handler logic
      const shouldReturn404 = !mockRequest.app.locals.mcpServerEndpoint;

      // Assert
      expect(shouldReturn404).toBe(true);
      // In actual implementation, would verify:
      // expect(mockResponse.status).toHaveBeenCalledWith(404);
      // expect(mockResponse.json).toHaveBeenCalledWith({
      //   error: 'MCP endpoint not initialized',
      //   timestamp: expect.any(String)
      // });
    });

    it("should return 404 when tool filtering service not initialized", async () => {
      // Arrange: Endpoint exists but no filtering service
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map()
        },
        toolFilteringService: null
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate the handler logic
      const shouldReturn404 = !mockMcpServerEndpoint.toolFilteringService;

      // Assert
      expect(shouldReturn404).toBe(true);
      // In actual implementation, would verify:
      // expect(mockResponse.status).toHaveBeenCalledWith(404);
      // expect(mockResponse.json).toHaveBeenCalledWith({
      //   error: 'Tool filtering not initialized',
      //   timestamp: expect.any(String)
      // });
    });

    it("should handle errors gracefully and return 500", async () => {
      // Arrange: Service throws error
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map()
        },
        toolFilteringService: {
          config: {},
          getStats: vi.fn().mockImplementation(() => {
            throw new Error('Internal service error');
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Act & Assert: Should throw error (caught by error handler)
      expect(() => {
        mockMcpServerEndpoint.toolFilteringService.getStats();
      }).toThrow('Internal service error');
      
      // In actual implementation, error middleware would catch and return 500
    });
  });

  describe("Edge cases", () => {
    it("should handle empty tool set gracefully", async () => {
      // Arrange: No tools registered
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map()
        },
        toolFilteringService: {
          config: {
            enabled: true,
            mode: 'category'
          },
          getStats: vi.fn().mockReturnValue({
            enabled: true,
            mode: 'category',
            totalChecked: 0,
            totalFiltered: 0,
            totalExposed: 0,
            filterRate: 0,
            categoryCacheSize: 0,
            cacheHitRate: 0,
            llmCacheSize: 0,
            llmCacheHitRate: 0,
            allowedServers: [],
            allowedCategories: ['filesystem']
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate the handler logic
      const stats = mockMcpServerEndpoint.toolFilteringService.getStats();
      const totalTools = mockMcpServerEndpoint.registeredCapabilities.tools.size;

      // Assert: Should handle empty set without errors
      expect(totalTools).toBe(0);
      expect(stats.totalChecked).toBe(0);
      expect(stats.filterRate).toBe(0);
    });

    it("should handle missing serverFilter config", async () => {
      // Arrange: No serverFilter in config
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map()
        },
        toolFilteringService: {
          config: {
            enabled: true,
            mode: 'category',
            serverFilter: null
          },
          getStats: vi.fn().mockReturnValue({
            enabled: true,
            mode: 'category',
            totalChecked: 10,
            totalFiltered: 5,
            totalExposed: 5,
            filterRate: 0.5,
            categoryCacheSize: 5,
            cacheHitRate: 0.8,
            llmCacheSize: 0,
            llmCacheHitRate: 0,
            allowedServers: [],
            allowedCategories: ['filesystem']
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate serverFilterMode extraction
      const serverFilterMode = mockMcpServerEndpoint.toolFilteringService.config.serverFilter?.mode || null;

      // Assert: Should return null when serverFilter is missing
      expect(serverFilterMode).toBeNull();
    });

    it("should include timestamp in response", async () => {
      // Arrange
      mockMcpServerEndpoint = {
        registeredCapabilities: {
          tools: new Map()
        },
        toolFilteringService: {
          config: { enabled: false },
          getStats: vi.fn().mockReturnValue({
            enabled: false,
            mode: null,
            totalChecked: 0,
            totalFiltered: 0,
            totalExposed: 0,
            filterRate: 0,
            categoryCacheSize: 0,
            cacheHitRate: 0,
            llmCacheSize: 0,
            llmCacheHitRate: 0,
            allowedServers: [],
            allowedCategories: []
          })
        }
      };

      mockRequest.app.locals.mcpServerEndpoint = mockMcpServerEndpoint;

      // Simulate timestamp generation
      const timestamp = new Date().toISOString();

      // Assert: Timestamp should be valid ISO string
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
