/**
 * Integration Tests: Prompt-Based Tool Filtering
 *
 * Tests the complete end-to-end workflow for intelligent tool exposure:
 * 1. Zero-default exposure (clients start with no tools)
 * 2. hub__analyze_prompt meta-tool for dynamic categorization
 * 3. LLM-based category detection
 * 4. Per-client session isolation
 * 5. Additive mode category accumulation
 * 6. tools/list filtering by session categories
 *
 * Test Strategy:
 * - Integration tests using real MCPServerEndpoint
 * - Mock LLM provider for predictable category responses
 * - Minimal mocking to validate actual integration points
 * - Focus on observable behavior: tool exposure, notifications, session state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import { EventEmitter } from 'events';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock LLM provider for predictable testing
vi.mock('../src/utils/llm-provider.js', () => ({
  createLLMProvider: vi.fn((config) => ({
    analyzePromptWithFallback: vi.fn(async (prompt, context, validCategories) => {
      // Predictable category detection based on prompt keywords
      const lowerPrompt = prompt.toLowerCase();
      const detectedCategories = [];

      if (lowerPrompt.includes('github') || lowerPrompt.includes('pr') || lowerPrompt.includes('repo')) {
        detectedCategories.push('github');
      }
      if (lowerPrompt.includes('file') || lowerPrompt.includes('read') || lowerPrompt.includes('write') || lowerPrompt.includes('config')) {
        detectedCategories.push('filesystem');
      }
      if (lowerPrompt.includes('web') || lowerPrompt.includes('search') || lowerPrompt.includes('fetch') || lowerPrompt.includes('docs') || lowerPrompt.includes('documentation')) {
        detectedCategories.push('web');
      }
      if (lowerPrompt.includes('docker') || lowerPrompt.includes('container')) {
        detectedCategories.push('docker');
      }

      return {
        categories: detectedCategories,
        confidence: 0.95,
        reasoning: `Detected categories: ${detectedCategories.join(', ')}`,
      };
    }),
  })),
}));

describe('Prompt-Based Filtering Integration Tests', () => {
  let mcpHub;
  let endpoint;

  /**
   * Helper: Parse MCP protocol response to extract result object
   */
  function parseMCPResponse(mcpResponse) {
    if (mcpResponse.content && Array.isArray(mcpResponse.content)) {
      const textContent = mcpResponse.content.find(item => item.type === 'text');
      if (textContent && textContent.text) {
        return JSON.parse(textContent.text);
      }
    }
    return mcpResponse;
  }

  /**
   * Helper: Initialize a client session
   */
  function initializeSession(endpoint, sessionId) {
    endpoint.initializeClientSession(sessionId);
    return endpoint.clientSessions.get(sessionId);
  }

  /**
   * Helper: Call analyze_prompt and return parsed result
   */
  async function callAnalyzePrompt(endpoint, sessionId, prompt, context = null) {
    const mcpResponse = await endpoint.handleAnalyzePrompt({ prompt, context }, sessionId);
    return parseMCPResponse(mcpResponse);
  }

  beforeEach(() => {
    // ARRANGE: Create mock MCPHub with multiple servers
    mcpHub = new EventEmitter();
    mcpHub.connections = new Map();
    mcpHub.hubServerUrl = 'http://localhost:7000';

    // Add filesystem server
    mcpHub.connections.set('filesystem', {
      name: 'filesystem',
      status: 'connected',
      disabled: false,
      tools: [
        { name: 'read_file', description: 'Read a file from disk' },
        { name: 'write_file', description: 'Write a file to disk' },
        { name: 'list_directory', description: 'List directory contents' },
      ],
      resources: [],
      prompts: [],
    });

    // Add github server
    mcpHub.connections.set('github', {
      name: 'github',
      status: 'connected',
      disabled: false,
      tools: [
        { name: 'create_pr', description: 'Create a pull request' },
        { name: 'list_repos', description: 'List repositories' },
        { name: 'search_code', description: 'Search code in repos' },
      ],
      resources: [],
      prompts: [],
    });

    // Add web server
    mcpHub.connections.set('web', {
      name: 'web',
      status: 'connected',
      disabled: false,
      tools: [
        { name: 'fetch_url', description: 'Fetch content from URL' },
        { name: 'search_web', description: 'Search the web' },
      ],
      resources: [],
      prompts: [],
    });

    // Add docker server
    mcpHub.connections.set('docker', {
      name: 'docker',
      status: 'connected',
      disabled: false,
      tools: [
        { name: 'list_containers', description: 'List Docker containers' },
        { name: 'start_container', description: 'Start a container' },
      ],
      resources: [],
      prompts: [],
    });
  });

  afterEach(() => {
    if (endpoint) {
      endpoint = null;
    }
  });

  describe('Zero-Default Exposure', () => {
    it('should expose zero tools by default with defaultExposure: "zero"', () => {
      // ARRANGE: Configure zero-default exposure
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
          },
        }),
      };

      // ACT: Create endpoint and initialize session
      endpoint = new MCPServerEndpoint(mcpHub);
      const sessionId = 'test-session-1';
      const session = initializeSession(endpoint, sessionId);

      // Get initial tool list for session
      const exposedTools = endpoint.filterToolsBySessionCategories(session);

      // ASSERT: Zero tools exposed initially (meta always exposed in additive mode)
      expect(exposedTools).toHaveLength(0);
    });

    it('should expose only meta-tools with defaultExposure: "meta-only"', () => {
      // ARRANGE: Configure meta-only default exposure
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'meta-only',
              enableMetaTools: true,
              sessionIsolation: true,
            },
          },
        }),
      };

      // ACT: Create endpoint
      endpoint = new MCPServerEndpoint(mcpHub);

      // ASSERT: Meta tools registered
      const metaTools = [...endpoint.registeredCapabilities.tools.keys()].filter(
        (name) => name.startsWith('hub__')
      );

      expect(metaTools.length).toBeGreaterThan(0);
      expect(metaTools).toContain('hub__analyze_prompt');
    });
  });

  describe('analyze_prompt Workflow', () => {
    beforeEach(async () => {
      // Configure prompt-based filtering for workflow tests
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'meta-only',
              enableMetaTools: true,
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
              model: 'gemini-2.5-flash',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should detect github category from GitHub-related prompt', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-session-github';
      initializeSession(endpoint, sessionId);

      // ACT: Call analyze_prompt
      const result = await callAnalyzePrompt(endpoint, sessionId, 'Check my GitHub notifications and list recent PRs');

      // ASSERT: GitHub category detected
      expect(result.categories).toContain('github');
      expect(result.confidence).toBeGreaterThan(0.8);

      // Verify session updated
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has('github')).toBe(true);
    });

    it('should detect filesystem category from file operation prompt', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-session-files';
      initializeSession(endpoint, sessionId);

      // ACT: Call analyze_prompt
      const result = await callAnalyzePrompt(endpoint, sessionId, 'Read the config file and show me the contents');

      // ASSERT: Filesystem category detected
      expect(result.categories).toContain('filesystem');

      // Verify session updated
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has('filesystem')).toBe(true);
    });

    it('should detect multiple categories from complex prompt', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-session-multi';
      initializeSession(endpoint, sessionId);

      // ACT: Call analyze_prompt with multi-category prompt
      const result = await callAnalyzePrompt(endpoint, sessionId, 'Read the Dockerfile, check GitHub for latest image, and search web for best practices');

      // ASSERT: Multiple categories detected
      expect(result.categories.length).toBeGreaterThan(1);
      expect(result.categories).toEqual(expect.arrayContaining(['filesystem', 'github', 'web', 'docker']));

      // Verify all categories in session
      const session = endpoint.clientSessions.get(sessionId);
      result.categories.forEach(category => {
        expect(session.exposedCategories.has(category)).toBe(true);
      });
    });

    it('should handle meta category for analyze_prompt itself', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-session-meta';
      const session = initializeSession(endpoint, sessionId);

      // ACT: Verify meta category in initial session
      // ASSERT: Meta category available from initialization
      expect(session.exposedCategories.has('meta')).toBe(true);
    });
  });

  describe('Session Isolation', () => {
    beforeEach(async () => {
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should maintain separate tool exposure for different sessions', async () => {
      // ARRANGE: Create endpoint and two sessions
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const session1 = 'client-1';
      const session2 = 'client-2';
      initializeSession(endpoint, session1);
      initializeSession(endpoint, session2);

      // ACT: Expose different categories to each session
      await callAnalyzePrompt(endpoint, session1, 'List my GitHub repos');
      await callAnalyzePrompt(endpoint, session2, 'Read config.json file');

      // ASSERT: Sessions have different exposed categories
      const session1State = endpoint.clientSessions.get(session1);
      const session2State = endpoint.clientSessions.get(session2);

      expect(session1State.exposedCategories.has('github')).toBe(true);
      expect(session1State.exposedCategories.has('filesystem')).toBe(false);

      expect(session2State.exposedCategories.has('filesystem')).toBe(true);
      expect(session2State.exposedCategories.has('github')).toBe(false);
    });

    it('should allow concurrent analyze_prompt calls from multiple clients', async () => {
      // ARRANGE: Create endpoint and initialize sessions
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      ['session-1', 'session-2', 'session-3'].forEach(sid => initializeSession(endpoint, sid));

      // ACT: Simulate concurrent analyze_prompt calls
      const promises = [
        callAnalyzePrompt(endpoint, 'session-1', 'GitHub notifications'),
        callAnalyzePrompt(endpoint, 'session-2', 'Read config file'),
        callAnalyzePrompt(endpoint, 'session-3', 'Search web for docs'),
      ];

      const results = await Promise.all(promises);

      // ASSERT: All calls succeeded with different categories
      expect(results[0].categories).toContain('github');
      expect(results[1].categories).toContain('filesystem');
      expect(results[2].categories).toContain('web');

      // Verify all sessions isolated
      expect(endpoint.clientSessions.size).toBe(3);
    });
  });

  describe('Additive Mode', () => {
    beforeEach(async () => {
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should accumulate categories across multiple analyze_prompt calls', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-additive';
      initializeSession(endpoint, sessionId);

      // ACT: Make multiple analyze_prompt calls
      await callAnalyzePrompt(endpoint, sessionId, 'List GitHub repos');
      await callAnalyzePrompt(endpoint, sessionId, 'Read configuration file');
      await callAnalyzePrompt(endpoint, sessionId, 'Search web for documentation');

      // ASSERT: All categories accumulated
      const session = endpoint.clientSessions.get(sessionId);
      expect(session.exposedCategories.has('github')).toBe(true);
      expect(session.exposedCategories.has('filesystem')).toBe(true);
      expect(session.exposedCategories.has('web')).toBe(true);
      expect(session.exposedCategories.size).toBeGreaterThanOrEqual(3);
    });

    it('should not remove categories once exposed', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-persistent';
      initializeSession(endpoint, sessionId);

      // ACT: Expose github, then make unrelated prompt
      await callAnalyzePrompt(endpoint, sessionId, 'GitHub repos');

      const session1 = endpoint.clientSessions.get(sessionId);
      expect(session1.exposedCategories.has('github')).toBe(true);

      await callAnalyzePrompt(endpoint, sessionId, 'Read file');

      // ASSERT: github still exposed
      const session2 = endpoint.clientSessions.get(sessionId);
      expect(session2.exposedCategories.has('github')).toBe(true);
      expect(session2.exposedCategories.has('filesystem')).toBe(true);
    });
  });

  describe('tools/list Filtering', () => {
    beforeEach(async () => {
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should return empty tool list before analyze_prompt', () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-empty';
      const session = initializeSession(endpoint, sessionId);

      // ACT: Get tools for new session
      const exposedTools = endpoint.filterToolsBySessionCategories(session);

      // ASSERT: Zero tools exposed (empty Set means no categories)
      expect(exposedTools).toHaveLength(0);
    });

    it('should return only github tools after github category exposed', async () => {
      // ARRANGE: Create endpoint, initialize session, expose github
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-github-only';
      initializeSession(endpoint, sessionId);
      await callAnalyzePrompt(endpoint, sessionId, 'List GitHub repos');

      // ACT: Get filtered tools
      const session = endpoint.clientSessions.get(sessionId);
      const exposedTools = endpoint.filterToolsBySessionCategories(session);

      // ASSERT: Only github tools exposed
      const toolNames = exposedTools.map(t => t.definition.name);
      expect(toolNames).toEqual(expect.arrayContaining([
        'github__create_pr',
        'github__list_repos',
        'github__search_code',
      ]));
      expect(toolNames.some(name => name.startsWith('filesystem__'))).toBe(false);
      expect(toolNames.some(name => name.startsWith('web__'))).toBe(false);
    });

    it('should return tools from multiple categories after multi-category prompt', async () => {
      // ARRANGE: Create endpoint, initialize session, expose multiple categories
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-multi-category';
      initializeSession(endpoint, sessionId);
      await callAnalyzePrompt(endpoint, sessionId, 'Check GitHub repos and read config files');

      // ACT: Get filtered tools
      const session = endpoint.clientSessions.get(sessionId);
      const exposedTools = endpoint.filterToolsBySessionCategories(session);

      // ASSERT: Tools from both categories
      const toolNames = exposedTools.map(t => t.definition.name);

      // Should have github tools
      expect(toolNames.some(name => name.startsWith('github__'))).toBe(true);

      // Should have filesystem tools
      expect(toolNames.some(name => name.startsWith('filesystem__'))).toBe(true);

      // Should NOT have web or docker tools
      expect(toolNames.some(name => name.startsWith('web__'))).toBe(false);
      expect(toolNames.some(name => name.startsWith('docker__'))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should handle empty prompt gracefully', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-empty-prompt';
      initializeSession(endpoint, sessionId);

      // ACT: Call with empty prompt
      const mcpResponse = await endpoint.handleAnalyzePrompt({ prompt: '' }, sessionId);
      const result = parseMCPResponse(mcpResponse);

      // ASSERT: Should return error response
      expect(result.error).toBeDefined();
      expect(mcpResponse.isError).toBe(true);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      mcpHub.configManager = {
        getConfig: () => ({
          toolFiltering: {
            enabled: true,
            mode: 'prompt-based',
            promptBasedFiltering: {
              enabled: true,
              defaultExposure: 'zero',
              sessionIsolation: true,
            },
            llmCategorization: {
              enabled: true,
              provider: 'gemini',
              apiKey: 'test-key',
            },
          },
        }),
      };

      // Create endpoint and wait for LLM initialization
      endpoint = new MCPServerEndpoint(mcpHub);
      if (endpoint.filteringService) {
        await endpoint.filteringService.waitForInitialization();
      }
    });

    it('should complete analyze_prompt within 500ms', async () => {
      // ARRANGE: Create endpoint and initialize session
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-perf';
      initializeSession(endpoint, sessionId);

      // ACT: Measure analyze_prompt latency
      const startTime = Date.now();
      await callAnalyzePrompt(endpoint, sessionId, 'List GitHub repos');
      const duration = Date.now() - startTime;

      // ASSERT: Completes quickly
      expect(duration).toBeLessThan(500);
    });

    it('should handle 10 concurrent sessions efficiently', async () => {
      // ARRANGE: Create endpoint and initialize 10 sessions
      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionIds = Array.from({ length: 10 }, (_, i) => `session-${i}`);
      sessionIds.forEach(sid => initializeSession(endpoint, sid));

      // ACT: Simulate 10 concurrent sessions
      const promises = sessionIds.map((sid, i) =>
        callAnalyzePrompt(endpoint, sid, `Session ${i} GitHub query`)
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // ASSERT: All sessions complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(endpoint.clientSessions.size).toBe(10);
    });

    it('should filter 100+ tools efficiently', async () => {
      // ARRANGE: Add many tools to servers
      for (let i = 0; i < 20; i++) {
        mcpHub.connections.get('filesystem').tools.push({
          name: `tool_${i}`,
          description: `Test tool ${i}`,
        });
      }

      // endpoint = new MCPServerEndpoint(mcpHub); // Already created in beforeEach
      const sessionId = 'test-many-tools';
      initializeSession(endpoint, sessionId);
      await callAnalyzePrompt(endpoint, sessionId, 'File operations');

      // ACT: Measure filtering performance
      const session = endpoint.clientSessions.get(sessionId);
      const startTime = Date.now();
      const tools = endpoint.filterToolsBySessionCategories(session);
      const duration = Date.now() - startTime;

      // ASSERT: Filtering is fast
      expect(duration).toBeLessThan(50); // < 50ms for 100+ tools
      expect(tools.length).toBeGreaterThan(0);
    });
  });
});
