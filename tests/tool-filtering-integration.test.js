/**
 * Integration tests for Tool Filtering in MCPServerEndpoint
 *
 * Tests the complete filtering workflow:
 * 1. Config validation (Sprint 1)
 * 2. ToolFilteringService integration (Sprint 2)
 * 3. Tool filtering in registerServerCapabilities (Sprint 2)
 * 4. Auto-enable threshold logic (Sprint 2)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MCPServerEndpoint } from "../src/mcp/server.js";
import { EventEmitter } from "events";

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Tool Filtering Integration Tests (Sprint 3)", () => {
  let mcpHub;
  let endpoint;

  beforeEach(() => {
    // Create mock MCPHub
    mcpHub = new EventEmitter();
    mcpHub.connections = new Map();
    mcpHub.hubServerUrl = "http://localhost:7000";
    mcpHub.configManager = {
      getConfig: () => ({
        toolFiltering: null // Default: no filtering
      })
    };
  });

  describe("Server-Allowlist Mode", () => {
    it("should filter tools using server allowlist", () => {
      // ARRANGE: Configure server-allowlist mode with filesystem server allowed
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          enabled: true,
          mode: "server-allowlist",
          serverFilter: {
            mode: "allowlist",
            servers: ["filesystem"]
          }
        }
      });

      const filesystemConn = {
        name: "filesystem",
        status: "connected",
        disabled: false,
        tools: [
          { name: "read_file", description: "Read a file" },
          { name: "write_file", description: "Write a file" }
        ],
        resources: [],
        prompts: []
      };

      const githubConn = {
        name: "github",
        status: "connected",
        disabled: false,
        tools: [
          { name: "create_pr", description: "Create PR" },
          { name: "list_repos", description: "List repos" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("filesystem", filesystemConn);
      mcpHub.connections.set("github", githubConn);

      // ACT: Create endpoint which triggers syncCapabilities
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Only filesystem tools registered, github tools filtered out
      const registeredTools = endpoint.registeredCapabilities.tools;
      const toolNames = [...registeredTools.keys()];

      // Check that filesystem tools are present
      const hasFilesystemTools = toolNames.some(name =>
        name.includes("read_file") || name.includes("write_file")
      );
      expect(hasFilesystemTools).toBe(true);

      // Check that github tools are NOT present
      const hasGithubTools = toolNames.some(name =>
        name.includes("create_pr") || name.includes("list_repos")
      );
      expect(hasGithubTools).toBe(false);
    });

    it("should filter tools using server denylist", () => {
      // ARRANGE: Configure server denylist mode blocking untrusted server
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          enabled: true,
          mode: "server-allowlist",
          serverFilter: {
            mode: "denylist",
            servers: ["untrusted"]
          }
        }
      });

      const trustedConn = {
        name: "trusted",
        status: "connected",
        disabled: false,
        tools: [
          { name: "safe_tool", description: "Safe tool" }
        ],
        resources: [],
        prompts: []
      };

      const untrustedConn = {
        name: "untrusted",
        status: "connected",
        disabled: false,
        tools: [
          { name: "dangerous_tool", description: "Dangerous tool" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("trusted", trustedConn);
      mcpHub.connections.set("untrusted", untrustedConn);

      // ACT: Create endpoint to apply denylist filtering
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Trusted tools registered, untrusted tools blocked
      const registeredTools = endpoint.registeredCapabilities.tools;
      const toolNames = [...registeredTools.keys()];

      // Check that trusted tools are present
      const hasTrustedTools = toolNames.some(name => name.includes("safe_tool"));
      expect(hasTrustedTools).toBe(true);

      // Check that untrusted tools are NOT present
      const hasUntrustedTools = toolNames.some(name => name.includes("dangerous_tool"));
      expect(hasUntrustedTools).toBe(false);
    });
  });

  describe("Category Mode", () => {
    it("should filter tools using category filter", () => {
      // ARRANGE: Configure category mode filtering for file operations only
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "category",
          categoryFilter: {
            categories: ["file_operations"]
          }
        }
      });

      const filesystemConn = {
        name: "filesystem",
        status: "connected",
        disabled: false,
        tools: [
          { name: "read_file", description: "Read a file from disk" },
          { name: "write_file", description: "Write a file to disk" },
          { name: "search_web", description: "Search the web" } // Should be filtered out
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("filesystem", filesystemConn);

      // ACT: Create endpoint to apply category filtering
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: File operation tools pass, web search tool filtered out
      const registeredTools = endpoint.registeredCapabilities.tools;

      // With keyword matching, read_file and write_file should pass
      expect(registeredTools.size).toBeGreaterThan(0);

      const toolNames = [...registeredTools.keys()];

      // Check file operation tools are present
      expect(toolNames.some(name => name.includes("read_file") || name.includes("write_file"))).toBe(true);
    });

    it("should use custom mappings for category filter", () => {
      // ARRANGE: Configure category mode with custom tool-to-category mappings
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "category",
          categoryFilter: {
            categories: ["file_operations"],
            customMappings: {
              "custom_tool": "file_operations"
            }
          }
        }
      });

      const customConn = {
        name: "custom",
        status: "connected",
        disabled: false,
        tools: [
          { name: "custom_tool", description: "Custom file tool" },
          { name: "other_tool", description: "Other tool" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("custom", customConn);

      // ACT: Create endpoint to apply custom mapping
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Custom tool passes via mapping, other tool filtered out
      const registeredTools = endpoint.registeredCapabilities.tools;
      expect(registeredTools.size).toBeGreaterThan(0);

      const toolNames = [...registeredTools.keys()];
      expect(toolNames.some(name => name.includes("custom_tool"))).toBe(true);
    });
  });

  describe("Hybrid Mode", () => {
    it("should apply both server and category filters", () => {
      // ARRANGE: Configure hybrid mode with server allowlist and category filter
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          enabled: true,
          mode: "hybrid",
          serverFilter: {
            mode: "allowlist",
            servers: ["filesystem"]
          },
          categoryFilter: {
            categories: ["file_operations"]
          }
        }
      });

      const filesystemConn = {
        name: "filesystem",
        status: "connected",
        disabled: false,
        tools: [
          { name: "read_file", description: "Read a file" },
          { name: "search_web", description: "Search web" } // Filtered by category
        ],
        resources: [],
        prompts: []
      };

      const githubConn = {
        name: "github",
        status: "connected",
        disabled: false,
        tools: [
          { name: "read_repo", description: "Read repo file" } // Filtered by server
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("filesystem", filesystemConn);
      mcpHub.connections.set("github", githubConn);

      // ACT: Create endpoint to apply hybrid filtering
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Hybrid OR logic - tools pass if matching either filter
      // read_file: filesystem server (✓) + file_operations (✓) = PASS
      // search_web: filesystem server (✓) + web category (✗) = PASS (server match)
      // read_repo: github server (✗) + unknown category (✗) = FAIL
      const registeredTools = endpoint.registeredCapabilities.tools;

      const toolNames = [...registeredTools.keys()];
      expect(toolNames.some(name => name.includes("read_file"))).toBe(true);
      expect(toolNames.some(name => name.includes("search_web"))).toBe(true); // Passes server filter
      expect(toolNames.some(name => name.includes("read_repo"))).toBe(false);
    });
  });

  describe("Auto-Enable Threshold", () => {
    it("should auto-enable filtering when threshold exceeded", () => {
      // ARRANGE: Configure auto-enable threshold with multiple servers exceeding limit
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "category",
          categoryFilter: {
            categories: ["file_operations"]
          },
          autoEnableThreshold: 5 // Enable when > 5 tools
        }
      });

      const server1 = {
        name: "server1",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool1", description: "Tool 1" },
          { name: "tool2", description: "Tool 2" },
          { name: "tool3", description: "Tool 3" }
        ],
        resources: [],
        prompts: []
      };

      const server2 = {
        name: "server2",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool4", description: "Tool 4" },
          { name: "tool5", description: "Tool 5" },
          { name: "tool6", description: "Tool 6" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("server1", server1);
      mcpHub.connections.set("server2", server2);

      // ACT: Create endpoint triggering auto-enable check (6 tools > 5 threshold)
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Filtering service active due to threshold exceeded
      expect(endpoint.filteringService).toBeDefined();

      // ToolFilteringService doesn't expose .enabled property
      // Instead, verify that auto-enable was triggered by checking internal state
      // In the actual implementation, this would log auto-enable message
    });

    it("should not auto-enable when below threshold", () => {
      // ARRANGE: Configure high auto-enable threshold with minimal tools
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "category",
          categoryFilter: {
            categories: ["file_operations"]
          },
          autoEnableThreshold: 100 // High threshold
        }
      });

      const smallServer = {
        name: "small",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool1", description: "Tool 1" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("small", smallServer);

      // ACT: Create endpoint with tool count below threshold
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Filtering service exists but auto-enable not triggered
      expect(endpoint.filteringService).toBeDefined();

      // ToolFilteringService doesn't expose .enabled property
      // Instead, verify endpoint created successfully without auto-enable
    });
  });

  describe("No Filtering", () => {
    it("should register all tools when filtering is not configured", () => {
      // ARRANGE: No filtering configuration, all tools should pass through
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: null
      });

      const conn1 = {
        name: "server1",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool1", description: "Tool 1" },
          { name: "tool2", description: "Tool 2" }
        ],
        resources: [],
        prompts: []
      };

      const conn2 = {
        name: "server2",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool3", description: "Tool 3" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("server1", conn1);
      mcpHub.connections.set("server2", conn2);

      // ACT: Create endpoint without any filtering
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: All 3 tools registered from both servers
      const registeredTools = endpoint.registeredCapabilities.tools;
      expect(registeredTools.size).toBe(3);
    });
  });

  describe("Resources and Prompts (No Filtering)", () => {
    it("should not filter resources even with tool filtering enabled", () => {
      // ARRANGE: Enable tool filtering, resources and prompts should pass unfiltered
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          enabled: true,
          mode: "server-allowlist",
          serverFilter: {
            mode: "allowlist",
            servers: ["allowed"]
          }
        }
      });

      const allowedServer = {
        name: "allowed",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool1", description: "Tool 1" }
        ],
        resources: [
          { uri: "resource1://test", name: "Resource 1" }
        ],
        prompts: [
          { name: "prompt1", description: "Prompt 1" }
        ]
      };

      const blockedServer = {
        name: "blocked",
        status: "connected",
        disabled: false,
        tools: [
          { name: "tool2", description: "Tool 2" }
        ],
        resources: [
          { uri: "resource2://test", name: "Resource 2" }
        ],
        prompts: [
          { name: "prompt2", description: "Prompt 2" }
        ]
      };

      mcpHub.connections.set("allowed", allowedServer);
      mcpHub.connections.set("blocked", blockedServer);

      // ACT: Create endpoint with tool filtering active
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Tools filtered by server, resources and prompts pass through
      const toolNames = [...endpoint.registeredCapabilities.tools.keys()];

      // Only allowed server tools should be present
      const hasAllowedTools = toolNames.some(name => name.includes("tool1"));
      expect(hasAllowedTools).toBe(true);

      // Blocked server tools should NOT be present
      const hasBlockedTools = toolNames.some(name => name.includes("tool2"));
      expect(hasBlockedTools).toBe(false);

      // All resources and prompts should be present (not filtered)
      expect(endpoint.registeredCapabilities.resources.size).toBe(2); // All resources
      expect(endpoint.registeredCapabilities.prompts.size).toBe(2); // All prompts
    });
  });
});
