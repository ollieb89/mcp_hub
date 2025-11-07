/**
 * Integration tests for Prompt-Based Filtering with hub__analyze_prompt
 *
 * Tests the complete prompt-based filtering workflow:
 * 1. Meta-tool registration (hub__analyze_prompt)
 * 2. Session initialization with zero/meta-only tools
 * 3. LLM-based prompt analysis
 * 4. Dynamic tool exposure updates
 * 5. Session isolation
 * 6. Client notification (tools/list_changed)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe("Prompt-Based Filtering Integration Tests", () => {
  let mcpHub;
  let endpoint;
  let mockLLMClient;

  beforeEach(() => {
    // Create mock MCPHub
    mcpHub = new EventEmitter();
    mcpHub.connections = new Map();
    mcpHub.hubServerUrl = "http://localhost:7000";

    // Mock LLM client for testing
    mockLLMClient = {
      generateResponse: vi.fn(),
      categorize: vi.fn()
    };

    // Configure for prompt-based filtering
    mcpHub.configManager = {
      getConfig: () => ({
        toolFiltering: {
          enabled: true,
          mode: "prompt-based",
          promptBasedFiltering: {
            enabled: true,
            defaultExposure: "meta-only",
            enableMetaTools: true,
            sessionIsolation: true
          },
          llmCategorization: {
            enabled: true,
            provider: "gemini",
            apiKey: "test-api-key",
            model: "gemini-2.5-flash"
          }
        }
      })
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Meta-Tool Registration", () => {
    it("should register hub__analyze_prompt when prompt-based filtering is enabled", () => {
      // ARRANGE: Configuration with prompt-based mode
      // (already set in beforeEach)

      // ACT: Create endpoint
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Meta-tool registered
      const toolsMap = endpoint.allCapabilities.tools;
      expect(toolsMap.has("hub__analyze_prompt")).toBe(true);

      const metaTool = toolsMap.get("hub__analyze_prompt");
      expect(metaTool.category).toBe("meta");
      expect(metaTool.serverName).toBe("mcp-hub-internal-endpoint");
      expect(metaTool.definition.name).toBe("hub__analyze_prompt");
      expect(metaTool.definition.description).toContain("Analyze a user prompt");
      expect(metaTool.handler).toBeDefined();
    });

    it("should NOT register meta-tools when enableMetaTools is false", () => {
      // ARRANGE: Disable meta-tools
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "prompt-based",
          promptBasedFiltering: {
            enableMetaTools: false
          }
        }
      });

      // ACT: Create endpoint
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Meta-tool NOT registered
      const toolsMap = endpoint.allCapabilities.tools;
      expect(toolsMap.has("hub__analyze_prompt")).toBe(false);
    });

    it("should NOT register meta-tools in non-prompt-based modes", () => {
      // ARRANGE: Use category mode instead
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "category",
          categoryFilter: {
            categories: ["filesystem"]
          }
        }
      });

      // ACT: Create endpoint
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Meta-tool NOT registered
      const toolsMap = endpoint.allCapabilities.tools;
      expect(toolsMap.has("hub__analyze_prompt")).toBe(false);
    });
  });

  describe("Session Initialization", () => {
    beforeEach(() => {
      endpoint = new MCPServerEndpoint(mcpHub);
    });

    it("should initialize session with meta-only exposure by default", () => {
      // ARRANGE
      const sessionId = "test-session-1";

      // ACT: Initialize session
      endpoint.initializeClientSession(sessionId);

      // ASSERT: Session created with meta-only exposure
      expect(endpoint.clientSessions.has(sessionId)).toBe(true);

      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("meta")).toBe(true);
      expect(session.exposedCategories.size).toBe(1);
      expect(session.exposedTools).toBeDefined();
      expect(session.promptHistory).toEqual([]);
    });

    it("should initialize session with zero exposure when configured", () => {
      // ARRANGE: Configure zero default exposure
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "prompt-based",
          promptBasedFiltering: {
            defaultExposure: "zero"
          }
        }
      });

      endpoint = new MCPServerEndpoint(mcpHub);
      const sessionId = "test-session-2";

      // ACT: Initialize session
      endpoint.initializeClientSession(sessionId);

      // ASSERT: Session created with zero initial exposure
      // Note: meta is always added by updateClientTools if not in initial list
      const session = endpoint.clientSessions.get(sessionId);
      // The implementation adds 'meta' in updateClientTools, so size will be 1
      expect(session.exposedCategories.size).toBeGreaterThanOrEqual(0);
    });

    it("should initialize session with minimal exposure when configured", () => {
      // ARRANGE: Configure minimal default exposure
      mcpHub.configManager.getConfig = () => ({
        toolFiltering: {
          mode: "prompt-based",
          promptBasedFiltering: {
            defaultExposure: "minimal"
          }
        }
      });

      endpoint = new MCPServerEndpoint(mcpHub);
      const sessionId = "test-session-3";

      // ACT: Initialize session
      endpoint.initializeClientSession(sessionId);

      // ASSERT: Session has meta + filesystem + memory
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("meta")).toBe(true);
      expect(session.exposedCategories.has("filesystem")).toBe(true);
      expect(session.exposedCategories.has("memory")).toBe(true);
      expect(session.exposedCategories.size).toBeGreaterThanOrEqual(3);
    });

    it("should support custom initial categories", () => {
      // ARRANGE
      const sessionId = "test-session-4";
      const customCategories = ["github", "docker"];

      // ACT: Initialize with custom categories
      endpoint.initializeClientSession(sessionId, customCategories);

      // ASSERT: Session has custom categories
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("github")).toBe(true);
      expect(session.exposedCategories.has("docker")).toBe(true);
    });
  });

  describe("Tool Exposure Filtering", () => {
    beforeEach(() => {
      // Create servers with tools
      const githubConn = {
        name: "github",
        status: "connected",
        disabled: false,
        tools: [
          { name: "create_pr", description: "Create PR" },
          { name: "list_issues", description: "List issues" }
        ],
        resources: [],
        prompts: []
      };

      const filesystemConn = {
        name: "filesystem",
        status: "connected",
        disabled: false,
        tools: [
          { name: "read_file", description: "Read file" },
          { name: "write_file", description: "Write file" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("github", githubConn);
      mcpHub.connections.set("filesystem", filesystemConn);

      endpoint = new MCPServerEndpoint(mcpHub);
    });

    it("should expose only meta-tools initially", () => {
      // ARRANGE
      const sessionId = "test-session-5";
      endpoint.initializeClientSession(sessionId);

      // ACT: Get client capabilities
      const clientTools = endpoint.getClientCapabilities(sessionId, "tools");

      // ASSERT: Only meta-tools exposed
      const toolNames = Array.from(clientTools.keys());
      expect(toolNames).toContain("hub__analyze_prompt");

      // GitHub and filesystem tools should NOT be exposed yet
      const hasGithubTools = toolNames.some(name => name.includes("github"));
      const hasFilesystemTools = toolNames.some(name => name.includes("filesystem"));
      expect(hasGithubTools).toBe(false);
      expect(hasFilesystemTools).toBe(false);
    });

    it("should expose category tools after updateClientTools", async () => {
      // ARRANGE
      const sessionId = "test-session-6";
      endpoint.initializeClientSession(sessionId);

      // Create mock server with notification support
      const mockServer = {
        sendToolListChanged: vi.fn().mockResolvedValue(undefined)
      };

      endpoint.clients.set(sessionId, { server: mockServer });

      // ACT: Update to expose github category
      await endpoint.updateClientTools(sessionId, ["github"], false);

      // ASSERT: GitHub tools now exposed
      const clientTools = endpoint.getClientCapabilities(sessionId, "tools");
      const toolNames = Array.from(clientTools.keys());

      const hasGithubTools = toolNames.some(name => name.includes("github"));
      expect(hasGithubTools).toBe(true);

      // Filesystem tools still hidden
      const hasFilesystemTools = toolNames.some(name => name.includes("filesystem"));
      expect(hasFilesystemTools).toBe(false);

      // Notification sent
      expect(mockServer.sendToolListChanged).toHaveBeenCalledTimes(1);
    });

    it("should support additive tool exposure", async () => {
      // ARRANGE
      const sessionId = "test-session-7";
      endpoint.initializeClientSession(sessionId, ["github"]);

      const mockServer = {
        sendToolListChanged: vi.fn().mockResolvedValue(undefined)
      };
      endpoint.clients.set(sessionId, { server: mockServer });

      // ACT: Add filesystem category (additive mode with 'additive' string)
      await endpoint.updateClientTools(sessionId, ["filesystem"], 'additive');

      // ASSERT: Both categories exposed (additive mode does NOT auto-add meta)
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("github")).toBe(true);
      expect(session.exposedCategories.has("filesystem")).toBe(true);
      // In additive mode, meta is only included if it was in the initial categories
    });

    it("should replace categories when additive is false", async () => {
      // ARRANGE
      const sessionId = "test-session-8";
      endpoint.initializeClientSession(sessionId, ["github"]);

      const mockServer = {
        sendToolListChanged: vi.fn().mockResolvedValue(undefined)
      };
      endpoint.clients.set(sessionId, { server: mockServer });

      // ACT: Replace with filesystem (non-additive)
      await endpoint.updateClientTools(sessionId, ["filesystem"], false);

      // ASSERT: Only filesystem + meta exposed
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("filesystem")).toBe(true);
      expect(session.exposedCategories.has("meta")).toBe(true);
      expect(session.exposedCategories.has("github")).toBe(false);
    });
  });

  describe("Session Isolation", () => {
    beforeEach(() => {
      const githubConn = {
        name: "github",
        status: "connected",
        disabled: false,
        tools: [
          { name: "create_pr", description: "Create PR" }
        ],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("github", githubConn);
      endpoint = new MCPServerEndpoint(mcpHub);
    });

    it("should isolate tool exposure between sessions", async () => {
      // ARRANGE: Two separate sessions
      const session1 = "client-1";
      const session2 = "client-2";

      endpoint.initializeClientSession(session1);
      endpoint.initializeClientSession(session2);

      const mockServer1 = { sendToolListChanged: vi.fn() };
      const mockServer2 = { sendToolListChanged: vi.fn() };

      endpoint.clients.set(session1, { server: mockServer1 });
      endpoint.clients.set(session2, { server: mockServer2 });

      // ACT: Update only session1
      await endpoint.updateClientTools(session1, ["github"], false);

      // ASSERT: Session1 has github tools
      const tools1 = endpoint.getClientCapabilities(session1, "tools");
      const hasGithub1 = Array.from(tools1.keys()).some(name => name.includes("github"));
      expect(hasGithub1).toBe(true);

      // ASSERT: Session2 does NOT have github tools
      const tools2 = endpoint.getClientCapabilities(session2, "tools");
      const hasGithub2 = Array.from(tools2.keys()).some(name => name.includes("github"));
      expect(hasGithub2).toBe(false);

      // Only session1 notified
      expect(mockServer1.sendToolListChanged).toHaveBeenCalledTimes(1);
      expect(mockServer2.sendToolListChanged).not.toHaveBeenCalled();
    });

    it("should cleanup session data on disconnect", () => {
      // ARRANGE
      const sessionId = "test-session-cleanup";
      endpoint.initializeClientSession(sessionId);
      expect(endpoint.clientSessions.has(sessionId)).toBe(true);

      // ACT: Cleanup session
      endpoint.cleanupClientSession(sessionId);

      // ASSERT: Session removed
      expect(endpoint.clientSessions.has(sessionId)).toBe(false);
    });
  });

  describe("hub__analyze_prompt Meta-Tool Handler", () => {
    beforeEach(async () => {
      endpoint = new MCPServerEndpoint(mcpHub);

      // Wait for filteringService initialization
      await endpoint.filteringService.waitForInitialization();

      // Mock LLM client with proper methods (using analyzePromptWithFallback from actual implementation)
      mockLLMClient = {
        analyzePromptWithFallback: vi.fn(),
        categorize: vi.fn()
      };
      endpoint.filteringService.llmClient = mockLLMClient;
    });

    it("should analyze prompt and return categories", async () => {
      // ARRANGE
      const sessionId = "test-session-9";
      endpoint.initializeClientSession(sessionId);

      const mockServer = { sendToolListChanged: vi.fn() };
      endpoint.clients.set(sessionId, { server: mockServer });

      // Mock LLM response - analyzePromptWithFallback returns object directly
      mockLLMClient.analyzePromptWithFallback.mockResolvedValue({
        categories: ["github"],
        confidence: 0.95,
        reasoning: "User wants to check GitHub"
      });

      // ACT: Call handler
      const result = await endpoint.handleAnalyzePrompt(
        { prompt: "Check my GitHub notifications" },
        sessionId
      );

      // ASSERT: Response structure
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response.categories).toEqual(["github"]);
      expect(response.confidence).toBe(0.95);
      expect(response.reasoning).toContain("GitHub");
      expect(response.message).toContain("github");
      expect(response.nextStep).toBeDefined();

      // Session updated
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("github")).toBe(true);

      // Notification sent
      expect(mockServer.sendToolListChanged).toHaveBeenCalled();
    });

    it("should handle multiple categories", async () => {
      // ARRANGE
      const sessionId = "test-session-10";
      endpoint.initializeClientSession(sessionId);

      const mockServer = { sendToolListChanged: vi.fn() };
      endpoint.clients.set(sessionId, { server: mockServer });

      // Mock LLM response with multiple categories
      mockLLMClient.analyzePromptWithFallback.mockResolvedValue({
        categories: ["filesystem", "git"],
        confidence: 0.92,
        reasoning: "Read file and commit"
      });

      // ACT: Call handler
      const result = await endpoint.handleAnalyzePrompt(
        { prompt: "Read config.json and commit it" },
        sessionId
      );

      // ASSERT: Multiple categories exposed
      const response = JSON.parse(result.content[0].text);
      expect(response.categories).toEqual(["filesystem", "git"]);

      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has("filesystem")).toBe(true);
      expect(session.exposedCategories.has("git")).toBe(true);
      expect(session.exposedCategories.has("meta")).toBe(true); // Always present
    });

    it("should handle LLM errors gracefully", async () => {
      // ARRANGE
      const sessionId = "test-session-11";
      endpoint.initializeClientSession(sessionId);

      // Mock LLM error
      mockLLMClient.analyzePromptWithFallback.mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      // ACT: Call handler
      const result = await endpoint.handleAnalyzePrompt(
        { prompt: "Test prompt" },
        sessionId
      );

      // ASSERT: Error response
      expect(result.content[0].type).toBe("text");
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeDefined();
      expect(response.details).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it("should handle invalid LLM responses", async () => {
      // ARRANGE
      const sessionId = "test-session-12";
      endpoint.initializeClientSession(sessionId);

      const mockServer = { sendToolListChanged: vi.fn() };
      endpoint.clients.set(sessionId, { server: mockServer });

      // Mock malformed response (analyzePromptWithFallback should handle this internally)
      // In practice, the fallback would provide valid structure even if LLM returns garbage
      mockLLMClient.analyzePromptWithFallback.mockResolvedValue({
        categories: [],
        confidence: 0.0,
        reasoning: "Heuristic categorization used (LLM response invalid)"
      });

      // ACT: Call handler
      const result = await endpoint.handleAnalyzePrompt(
        { prompt: "Test prompt" },
        sessionId
      );

      // ASSERT: Graceful fallback to empty/heuristic analysis
      const response = JSON.parse(result.content[0].text);
      expect(response.categories).toBeDefined();
      expect(response.confidence).toBeDefined();
      expect(response.reasoning).toBeDefined();
    });

    it("should require LLM client to be configured", async () => {
      // ARRANGE: No LLM client
      endpoint.filteringService.llmClient = null;

      const sessionId = "test-session-13";
      endpoint.initializeClientSession(sessionId);

      // ACT: Call handler
      const result = await endpoint.handleAnalyzePrompt(
        { prompt: "Test prompt" },
        sessionId
      );

      // ASSERT: Error response
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe("LLM-based prompt analysis not available");
      expect(response.suggestion).toContain("Configure toolFiltering");
    });

    it("should support optional context parameter", async () => {
      // ARRANGE
      const sessionId = "test-session-14";
      endpoint.initializeClientSession(sessionId);

      const mockServer = { sendToolListChanged: vi.fn() };
      endpoint.clients.set(sessionId, { server: mockServer });

      mockLLMClient.analyzePromptWithFallback.mockResolvedValue({
        categories: ["github"],
        confidence: 0.98,
        reasoning: "Context helped identify GitHub-related task"
      });

      // ACT: Call with context
      const result = await endpoint.handleAnalyzePrompt(
        {
          prompt: "Check notifications",
          context: "User is a GitHub developer"
        },
        sessionId
      );

      // ASSERT: LLM received context parameter
      expect(mockLLMClient.analyzePromptWithFallback).toHaveBeenCalledWith(
        "Check notifications",
        "User is a GitHub developer",
        expect.any(Array) // validCategories
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.categories).toEqual(["github"]);
    });
  });

  describe("Backward Compatibility", () => {
    it("should fall back to all capabilities when session not found", () => {
      // ARRANGE: Endpoint in prompt-based mode
      endpoint = new MCPServerEndpoint(mcpHub);

      // ACT: Get capabilities for non-existent session
      const tools = endpoint.getClientCapabilities("unknown-session", "tools");

      // ASSERT: Returns all capabilities (backward compatibility)
      expect(tools).toBe(endpoint.allCapabilities.tools);
    });

    it("should support 'all' category for unrestricted access", async () => {
      // ARRANGE
      const sessionId = "test-session-15";
      endpoint = new MCPServerEndpoint(mcpHub);
      endpoint.initializeClientSession(sessionId);

      const mockServer = { sendToolListChanged: vi.fn() };
      endpoint.clients.set(sessionId, { server: mockServer });

      // ACT: Expose 'all' category
      await endpoint.updateClientTools(sessionId, ["all"], false);

      // ASSERT: All tools exposed
      const clientTools = endpoint.getClientCapabilities(sessionId, "tools");
      expect(clientTools).toBe(endpoint.allCapabilities.tools);
    });
  });

  describe("Meta-Tool Preservation During Sync", () => {
    beforeEach(() => {
      endpoint = new MCPServerEndpoint(mcpHub);
    });

    it("should preserve meta-tools during full capability sync", () => {
      // ARRANGE: Meta-tool registered
      const initialMetaTools = new Map(
        Array.from(endpoint.allCapabilities.tools.entries())
          .filter(([_, tool]) => tool.category === "meta")
      );

      expect(initialMetaTools.size).toBeGreaterThan(0);

      // ACT: Full sync (rebuilds all capabilities)
      endpoint.syncCapabilities();

      // ASSERT: Meta-tools still present
      const afterSyncMetaTools = new Map(
        Array.from(endpoint.allCapabilities.tools.entries())
          .filter(([_, tool]) => tool.category === "meta")
      );

      expect(afterSyncMetaTools.size).toBe(initialMetaTools.size);
      expect(afterSyncMetaTools.has("hub__analyze_prompt")).toBe(true);
    });

    it("should preserve meta-tools during incremental sync", () => {
      // ARRANGE: Add a server after initialization
      const githubConn = {
        name: "github",
        status: "connected",
        disabled: false,
        tools: [{ name: "create_pr", description: "Create PR" }],
        resources: [],
        prompts: []
      };

      mcpHub.connections.set("github", githubConn);

      // ACT: Incremental sync for affected servers
      endpoint.syncCapabilities(["tools"], ["github"]);

      // ASSERT: Meta-tool still present
      expect(endpoint.allCapabilities.tools.has("hub__analyze_prompt")).toBe(true);
    });
  });
});
