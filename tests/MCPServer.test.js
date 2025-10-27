/**
 * MCP Server Endpoint Integration Tests
 *
 * Tests for src/mcp/server.js - Unified MCP server endpoint that exposes
 * ALL capabilities from multiple managed MCP servers through one interface.
 *
 * Coverage Target: 70%+ for src/mcp/server.js (669 lines, 588 uncovered)
 * Test Count: 15-20 comprehensive tests
 *
 * Test Categories:
 * 1. Capability Aggregation (4-5 tests)
 * 2. Namespacing Logic (3-4 tests)
 * 3. Request Routing (4-5 tests)
 * 4. Error Handling (2-3 tests)
 * 5. Capability Synchronization (2-3 tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import {
  createToolList,
  createResourceList,
  createResourceTemplateList,
  createPromptList,
  createServerInfo
} from './helpers/fixtures.js';
import {
  createMockRequest,
  createMockResponse
} from './helpers/mocks.js';

describe('MCPServerEndpoint - Capability Aggregation', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    // ARRANGE: Create mock MCPHub with multiple connected servers
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should aggregate tools from multiple servers', () => {
    // ARRANGE: Create two servers with different tools
    const server1 = new EventEmitter();
    server1.name = 'filesystem';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(3, 'file');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('filesystem');

    const server2 = new EventEmitter();
    server2.name = 'github';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(2, 'repo');
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('github');

    mockHub.connections.set('filesystem', server1);
    mockHub.connections.set('github', server2);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Tools from both servers should be registered with namespacing
    const toolsMap = endpoint.registeredCapabilities.tools;
    expect(toolsMap.size).toBe(5); // 3 from filesystem + 2 from github
    expect(toolsMap.has('filesystem__file-1')).toBe(true);
    expect(toolsMap.has('filesystem__file-2')).toBe(true);
    expect(toolsMap.has('filesystem__file-3')).toBe(true);
    expect(toolsMap.has('github__repo-1')).toBe(true);
    expect(toolsMap.has('github__repo-2')).toBe(true);
  });

  it('should handle multiple servers with overlapping tool names', () => {
    // ARRANGE: Create two servers with same tool name "search"
    const server1 = new EventEmitter();
    server1.name = 'filesystem';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = [{ name: 'search', description: 'Search files', inputSchema: { type: 'object', properties: {} } }];
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('filesystem');

    const server2 = new EventEmitter();
    server2.name = 'github';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = [{ name: 'search', description: 'Search repos', inputSchema: { type: 'object', properties: {} } }];
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('github');

    mockHub.connections.set('filesystem', server1);
    mockHub.connections.set('github', server2);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Both tools should exist with unique namespaced names
    const toolsMap = endpoint.registeredCapabilities.tools;
    expect(toolsMap.size).toBe(2);
    expect(toolsMap.has('filesystem__search')).toBe(true);
    expect(toolsMap.has('github__search')).toBe(true);
    expect(toolsMap.get('filesystem__search').originalName).toBe('search');
    expect(toolsMap.get('github__search').originalName).toBe('search');
  });

  it('should aggregate resources and resource templates', () => {
    // ARRANGE: Create server with resources and templates
    const server = new EventEmitter();
    server.name = 'filesystem';
    server.status = 'connected';
    server.disabled = false;
    server.tools = [];
    server.resources = createResourceList(3, 'file://');
    server.resourceTemplates = createResourceTemplateList(2, 'file://{path}');
    server.prompts = [];
    server.serverInfo = createServerInfo('filesystem');

    mockHub.connections.set('filesystem', server);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Resources and templates should be registered
    const resourcesMap = endpoint.registeredCapabilities.resources;
    const templatesMap = endpoint.registeredCapabilities.resourceTemplates;
    expect(resourcesMap.size).toBe(3);
    expect(templatesMap.size).toBe(2);
    expect(resourcesMap.has('filesystem__file:///1')).toBe(true);
    expect(templatesMap.has('filesystem__file://{path}1')).toBe(true);
  });

  it('should aggregate prompts from multiple sources', () => {
    // ARRANGE: Create two servers with prompts
    const server1 = new EventEmitter();
    server1.name = 'templates';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = [];
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = createPromptList(2, 'code');
    server1.serverInfo = createServerInfo('templates');

    const server2 = new EventEmitter();
    server2.name = 'docs';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = [];
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = createPromptList(2, 'documentation');
    server2.serverInfo = createServerInfo('docs');

    mockHub.connections.set('templates', server1);
    mockHub.connections.set('docs', server2);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Prompts from both servers should be registered
    const promptsMap = endpoint.registeredCapabilities.prompts;
    expect(promptsMap.size).toBe(4);
    expect(promptsMap.has('templates__code-1')).toBe(true);
    expect(promptsMap.has('docs__documentation-1')).toBe(true);
  });

  it('should handle empty capabilities gracefully', () => {
    // ARRANGE: Create server with no capabilities
    const server = new EventEmitter();
    server.name = 'empty';
    server.status = 'connected';
    server.disabled = false;
    server.tools = [];
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('empty');

    mockHub.connections.set('empty', server);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: All capability maps should be empty
    expect(endpoint.registeredCapabilities.tools.size).toBe(0);
    expect(endpoint.registeredCapabilities.resources.size).toBe(0);
    expect(endpoint.registeredCapabilities.resourceTemplates.size).toBe(0);
    expect(endpoint.registeredCapabilities.prompts.size).toBe(0);
  });
});

describe('MCPServerEndpoint - Namespacing Logic', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should create safe server names by replacing special characters', () => {
    // ARRANGE & ACT: Test special character replacement
    const safeName1 = endpoint.createSafeServerName('my-server');
    const safeName2 = endpoint.createSafeServerName('server@home');
    const safeName3 = endpoint.createSafeServerName('server.local');
    const safeName4 = endpoint.createSafeServerName('server:8080');

    // ASSERT: Special characters should be replaced with underscores
    expect(safeName1).toBe('my_server');
    expect(safeName2).toBe('server_home');
    expect(safeName3).toBe('server_local');
    expect(safeName4).toBe('server_8080');
  });

  it('should handle duplicate server names with counter suffix', () => {
    // ARRANGE: Create two servers with same base name (after safe transformation)
    const server1 = new EventEmitter();
    server1.name = 'my-server';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(1, 'tool');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('my-server');

    const server2 = new EventEmitter();
    server2.name = 'my_server'; // Same after safe name transformation
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(1, 'tool');
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('my_server');

    mockHub.connections.set('my-server', server1);
    mockHub.connections.set('my_server', server2);

    // ACT: Sync servers map
    endpoint.syncServersMap();

    // ASSERT: Second server should have counter suffix
    const serverIds = Array.from(endpoint.serversMap.keys());
    expect(serverIds).toContain('my_server');
    expect(serverIds).toContain('my_server_1');
  });

  it('should namespace resource URIs with special characters correctly', () => {
    // ARRANGE: Create server with resource URIs containing special chars
    const server = new EventEmitter();
    server.name = 'filesystem';
    server.status = 'connected';
    server.disabled = false;
    server.tools = [];
    server.resources = [
      { uri: 'file:///path/to/file.txt', name: 'File 1', description: 'Test', mimeType: 'text/plain' },
      { uri: 'http://example.com/resource?id=123', name: 'Web Resource', description: 'Test', mimeType: 'text/html' }
    ];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('filesystem');

    mockHub.connections.set('filesystem', server);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Resources should be namespaced correctly
    const resourcesMap = endpoint.registeredCapabilities.resources;
    expect(resourcesMap.has('filesystem__file:///path/to/file.txt')).toBe(true);
    expect(resourcesMap.has('filesystem__http://example.com/resource?id=123')).toBe(true);
  });

  it('should exclude disabled servers from capability registration', () => {
    // ARRANGE: Create one connected and one disabled server
    const connectedServer = new EventEmitter();
    connectedServer.name = 'active';
    connectedServer.status = 'connected';
    connectedServer.disabled = false;
    connectedServer.tools = createToolList(2, 'active');
    connectedServer.resources = [];
    connectedServer.resourceTemplates = [];
    connectedServer.prompts = [];
    connectedServer.serverInfo = createServerInfo('active');

    const disabledServer = new EventEmitter();
    disabledServer.name = 'disabled';
    disabledServer.status = 'connected';
    disabledServer.disabled = true; // Disabled
    disabledServer.tools = createToolList(2, 'disabled');
    disabledServer.resources = [];
    disabledServer.resourceTemplates = [];
    disabledServer.prompts = [];
    disabledServer.serverInfo = createServerInfo('disabled');

    mockHub.connections.set('active', connectedServer);
    mockHub.connections.set('disabled', disabledServer);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Only active server tools should be registered
    const toolsMap = endpoint.registeredCapabilities.tools;
    expect(toolsMap.size).toBe(2);
    expect(toolsMap.has('active__active-1')).toBe(true);
    expect(toolsMap.has('disabled__disabled-1')).toBe(false);
  });
});

describe('MCPServerEndpoint - Request Routing', () => {
  let mockHub;
  let endpoint;
  let server;

  beforeEach(() => {
    // ARRANGE: Setup hub and endpoint with test server
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Success' }],
      isError: false
    });

    endpoint = new MCPServerEndpoint(mockHub);

    // Create test server with capabilities
    server = new EventEmitter();
    server.name = 'test-server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = [{ name: 'test-tool', description: 'Test', inputSchema: { type: 'object', properties: {} } }];
    server.resources = [{ uri: 'test://resource/1', name: 'Resource', description: 'Test', mimeType: 'text/plain' }];
    server.resourceTemplates = [];
    server.prompts = [{ name: 'test-prompt', description: 'Test', arguments: [] }];
    server.serverInfo = createServerInfo('test-server');

    mockHub.connections.set('test-server', server);
    endpoint.syncCapabilities();
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
    server = null;
  });

  it('should register tool capability with correct metadata', () => {
    // ARRANGE & ACT: Capabilities already synced in beforeEach

    // ASSERT: Tool should be registered with routing metadata
    const toolsMap = endpoint.registeredCapabilities.tools;
    const toolReg = toolsMap.get('test_server__test-tool');

    expect(toolReg).toBeDefined();
    expect(toolReg.serverName).toBe('test-server');
    expect(toolReg.originalName).toBe('test-tool');
    expect(toolReg.definition.name).toBe('test_server__test-tool');
  });

  it('should register resource capability with correct metadata', () => {
    // ARRANGE & ACT: Capabilities already synced in beforeEach

    // ASSERT: Resource should be registered with routing metadata
    const resourcesMap = endpoint.registeredCapabilities.resources;
    const resourceReg = resourcesMap.get('test_server__test://resource/1');

    expect(resourceReg).toBeDefined();
    expect(resourceReg.serverName).toBe('test-server');
    expect(resourceReg.originalName).toBe('test://resource/1');
    expect(resourceReg.definition.uri).toBe('test_server__test://resource/1');
  });

  it('should register prompt capability with correct metadata', () => {
    // ARRANGE & ACT: Capabilities already synced in beforeEach

    // ASSERT: Prompt should be registered with routing metadata
    const promptsMap = endpoint.registeredCapabilities.prompts;
    const promptReg = promptsMap.get('test_server__test-prompt');

    expect(promptReg).toBeDefined();
    expect(promptReg.serverName).toBe('test-server');
    expect(promptReg.originalName).toBe('test-prompt');
    expect(promptReg.definition.name).toBe('test_server__test-prompt');
  });

  it('should resolve capability for valid request', () => {
    // ARRANGE: Create request for registered tool
    const request = {
      params: {
        name: 'test_server__test-tool'
      }
    };

    // ACT: Get registered capability
    const result = endpoint.getRegisteredCapability(request, 'tools', 'name');

    // ASSERT: Should return capability with routing info
    expect(result).toBeDefined();
    expect(result.serverName).toBe('test-server');
    expect(result.originalName).toBe('test-tool');
  });

  it('should return null for invalid capability request', () => {
    // ARRANGE: Create request for non-existent tool
    const request = {
      params: {
        name: 'nonexistent__tool'
      }
    };

    // ACT: Attempt to get non-existent capability
    const result = endpoint.getRegisteredCapability(request, 'tools', 'name');

    // ASSERT: Should return null or undefined (both indicate not found)
    expect(result).toBeUndefined();
  });
});

describe('MCPServerEndpoint - Error Handling', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should exclude disconnected servers from capability sync', () => {
    // ARRANGE: Create disconnected server
    const server = new EventEmitter();
    server.name = 'disconnected';
    server.status = 'disconnected'; // Not connected
    server.disabled = false;
    server.tools = createToolList(2, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('disconnected');

    mockHub.connections.set('disconnected', server);

    // ACT: Sync capabilities
    endpoint.syncCapabilities();

    // ASSERT: Tools from disconnected server should not be registered
    const toolsMap = endpoint.registeredCapabilities.tools;
    expect(toolsMap.size).toBe(0);
  });

  it('should handle servers with missing serverInfo', () => {
    // ARRANGE: Create server without serverInfo
    const server = new EventEmitter();
    server.name = 'no-info';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(1, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    // serverInfo intentionally missing

    mockHub.connections.set('no-info', server);

    // ACT: Sync capabilities (should not crash)
    expect(() => endpoint.syncCapabilities()).not.toThrow();

    // ASSERT: Capabilities should still be registered
    const toolsMap = endpoint.registeredCapabilities.tools;
    expect(toolsMap.size).toBe(1);
  });

  it('should detect self-reference connections', () => {
    // ARRANGE: Create server that's actually this hub (using correct internal name)
    const selfServer = new EventEmitter();
    selfServer.name = 'self-reference';
    selfServer.status = 'connected';
    selfServer.disabled = false;
    selfServer.tools = createToolList(2, 'tool');
    selfServer.resources = [];
    selfServer.resourceTemplates = [];
    selfServer.prompts = [];
    selfServer.serverInfo = { name: 'mcp-hub-internal-endpoint', version: '1.0.0' };

    // ACT: Check if it's a self-reference
    const isSelf = endpoint.isSelfReference(selfServer);

    // ASSERT: Should detect self-reference
    expect(isSelf).toBe(true);
  });
});

describe('MCPServerEndpoint - Capability Synchronization', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should sync capabilities when server connects', () => {
    // ARRANGE: Start with no servers
    expect(endpoint.registeredCapabilities.tools.size).toBe(0);

    // ACT: Add server and emit toolsChanged event
    const server = new EventEmitter();
    server.name = 'new-server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(2, 'new');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('new-server');

    mockHub.connections.set('new-server', server);
    mockHub.emit('toolsChanged');

    // ASSERT: Tools should be registered
    expect(endpoint.registeredCapabilities.tools.size).toBe(2);
    expect(endpoint.registeredCapabilities.tools.has('new_server__new-1')).toBe(true);
  });

  it('should sync capabilities on configuration change', () => {
    // ARRANGE: Create initial server
    const server = new EventEmitter();
    server.name = 'server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(2, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('server');

    mockHub.connections.set('server', server);
    endpoint.syncCapabilities();
    expect(endpoint.registeredCapabilities.tools.size).toBe(2);

    // ACT: Modify server capabilities and emit config change
    server.tools = createToolList(3, 'updated');
    mockHub.emit('importantConfigChangeHandled');

    // ASSERT: Capabilities should be re-synced
    expect(endpoint.registeredCapabilities.tools.size).toBe(3);
    expect(endpoint.registeredCapabilities.tools.has('server__updated-1')).toBe(true);
  });

  it('should sync all capabilities on hub state READY transition', () => {
    // ARRANGE: Create servers
    const server1 = new EventEmitter();
    server1.name = 'server1';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(1, 'a');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('server1');

    const server2 = new EventEmitter();
    server2.name = 'server2';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(1, 'b');
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('server2');

    mockHub.connections.set('server1', server1);
    mockHub.connections.set('server2', server2);

    // ACT: Emit hub state READY
    mockHub.emit('hubStateChanged', { state: 'ready' });

    // ASSERT: All capabilities should be synced
    expect(endpoint.registeredCapabilities.tools.size).toBe(2);
  });
});

describe('MCPServerEndpoint - Transport Lifecycle', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(async () => {
    if (endpoint) {
      await endpoint.close();
    }
    endpoint = null;
    mockHub = null;
  });

  it('should track active client connections', async () => {
    // ARRANGE: No clients initially
    expect(endpoint.hasActiveConnections()).toBe(false);

    // ACT: Simulate client connection by adding to clients map
    const mockTransport = {
      sessionId: 'test-session-123'
    };
    const mockServer = {
      close: vi.fn().mockResolvedValue(undefined)
    };
    endpoint.clients.set('test-session-123', { transport: mockTransport, server: mockServer });

    // ASSERT: Should detect active connection
    expect(endpoint.hasActiveConnections()).toBe(true);
    expect(endpoint.clients.size).toBe(1);
  });

  it('should provide endpoint URL', () => {
    // ARRANGE & ACT: Get endpoint URL
    const url = endpoint.getEndpointUrl();

    // ASSERT: Should return correct URL format
    expect(url).toBe('http://localhost:3000/mcp');
  });

  it('should close all client connections', async () => {
    // ARRANGE: Add mock clients
    const mockServer1 = { close: vi.fn().mockResolvedValue(undefined) };
    const mockServer2 = { close: vi.fn().mockResolvedValue(undefined) };

    endpoint.clients.set('session1', { transport: {}, server: mockServer1 });
    endpoint.clients.set('session2', { transport: {}, server: mockServer2 });

    // Add some capabilities
    const server = new EventEmitter();
    server.name = 'test';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(2, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('test');

    mockHub.connections.set('test', server);
    endpoint.syncCapabilities();

    // ACT: Close endpoint
    await endpoint.close();

    // ASSERT: All clients closed and capabilities cleared
    expect(mockServer1.close).toHaveBeenCalled();
    expect(mockServer2.close).toHaveBeenCalled();
    expect(endpoint.clients.size).toBe(0);
    expect(endpoint.registeredCapabilities.tools.size).toBe(0);
    expect(endpoint.registeredCapabilities.resources.size).toBe(0);
    expect(endpoint.registeredCapabilities.prompts.size).toBe(0);
  });

  it('should handle errors during client close gracefully', async () => {
    // ARRANGE: Add client that will error on close
    const mockServer = {
      close: vi.fn().mockRejectedValue(new Error('Close failed'))
    };
    endpoint.clients.set('error-session', { transport: {}, server: mockServer });

    // ACT & ASSERT: Close should not throw
    await expect(endpoint.close()).resolves.not.toThrow();
    expect(endpoint.clients.size).toBe(0);
  });
});

describe('MCPServerEndpoint - Stats and Monitoring', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should provide accurate statistics', () => {
    // ARRANGE: Create servers with various capabilities
    const server1 = new EventEmitter();
    server1.name = 'filesystem';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(3, 'file');
    server1.resources = createResourceList(5, 'file://');
    server1.resourceTemplates = createResourceTemplateList(2, 'file://{path}');
    server1.prompts = createPromptList(2, 'code');
    server1.serverInfo = createServerInfo('filesystem');

    const server2 = new EventEmitter();
    server2.name = 'github';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(4, 'repo');
    server2.resources = createResourceList(3, 'github://');
    server2.resourceTemplates = [];
    server2.prompts = createPromptList(1, 'pr');
    server2.serverInfo = createServerInfo('github');

    mockHub.connections.set('filesystem', server1);
    mockHub.connections.set('github', server2);
    endpoint.syncCapabilities();

    // Add mock clients
    endpoint.clients.set('client1', { transport: {}, server: {} });
    endpoint.clients.set('client2', { transport: {}, server: {} });

    // ACT: Get stats
    const stats = endpoint.getStats();

    // ASSERT: Stats should be accurate
    expect(stats.activeClients).toBe(2);
    expect(stats.registeredCapabilities.tools).toBe(7); // 3 + 4
    expect(stats.registeredCapabilities.resources).toBe(8); // 5 + 3
    expect(stats.registeredCapabilities.resourceTemplates).toBe(2); // 2 + 0
    expect(stats.registeredCapabilities.prompts).toBe(3); // 2 + 1
    expect(stats.totalCapabilities).toBe(20); // 7 + 8 + 2 + 3
  });

  it('should handle empty stats correctly', () => {
    // ARRANGE: No servers or clients

    // ACT: Get stats
    const stats = endpoint.getStats();

    // ASSERT: All stats should be zero
    expect(stats.activeClients).toBe(0);
    expect(stats.registeredCapabilities.tools).toBe(0);
    expect(stats.registeredCapabilities.resources).toBe(0);
    expect(stats.registeredCapabilities.resourceTemplates).toBe(0);
    expect(stats.registeredCapabilities.prompts).toBe(0);
    expect(stats.totalCapabilities).toBe(0);
  });
});

describe('MCPServerEndpoint - Partial Synchronization', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should support incremental server map updates', () => {
    // ARRANGE: Create initial servers
    const server1 = new EventEmitter();
    server1.name = 'server1';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(2, 'a');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('server1');

    const server2 = new EventEmitter();
    server2.name = 'server2';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(2, 'b');
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('server2');

    mockHub.connections.set('server1', server1);
    mockHub.connections.set('server2', server2);
    endpoint.syncServersMap();
    expect(endpoint.serversMap.size).toBe(2);

    // ACT: Update only server1
    server1.tools = createToolList(3, 'updated');
    endpoint.syncServersMapPartial(['server1']);

    // ASSERT: Server map should be partially updated
    expect(endpoint.serversMap.size).toBe(2);
    const updatedServer = endpoint.serversMap.get('server1');
    expect(updatedServer.tools.length).toBe(3);
  });

  it('should remove disconnected servers from partial sync', () => {
    // ARRANGE: Create servers
    const server1 = new EventEmitter();
    server1.name = 'server1';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(1, 'a');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('server1');

    mockHub.connections.set('server1', server1);
    endpoint.syncServersMap();
    expect(endpoint.serversMap.size).toBe(1);

    // ACT: Remove server from connections and do partial sync
    mockHub.connections.delete('server1');
    endpoint.syncServersMapPartial(['server1']);

    // ASSERT: Server should be removed from map
    expect(endpoint.serversMap.size).toBe(0);
  });

  it('should sync only affected capabilities', () => {
    // ARRANGE: Create two servers
    const server1 = new EventEmitter();
    server1.name = 'server1';
    server1.status = 'connected';
    server1.disabled = false;
    server1.tools = createToolList(2, 'a');
    server1.resources = [];
    server1.resourceTemplates = [];
    server1.prompts = [];
    server1.serverInfo = createServerInfo('server1');

    const server2 = new EventEmitter();
    server2.name = 'server2';
    server2.status = 'connected';
    server2.disabled = false;
    server2.tools = createToolList(2, 'b');
    server2.resources = [];
    server2.resourceTemplates = [];
    server2.prompts = [];
    server2.serverInfo = createServerInfo('server2');

    mockHub.connections.set('server1', server1);
    mockHub.connections.set('server2', server2);
    endpoint.syncCapabilities();
    expect(endpoint.registeredCapabilities.tools.size).toBe(4);

    // ACT: Update only server1 capabilities
    server1.tools = createToolList(3, 'updated');
    endpoint.syncCapabilities(['tools'], ['server1']);

    // ASSERT: Only server1 tools should be updated
    expect(endpoint.registeredCapabilities.tools.size).toBe(5); // 3 from server1 + 2 from server2
    expect(endpoint.registeredCapabilities.tools.has('server1__updated-1')).toBe(true);
    expect(endpoint.registeredCapabilities.tools.has('server2__b-1')).toBe(true);
  });
});

describe('MCPServerEndpoint - Client Notifications', () => {
  let mockHub;
  let endpoint;

  beforeEach(() => {
    mockHub = new EventEmitter();
    mockHub.connections = new Map();
    mockHub.hubServerUrl = 'http://localhost:3000';
    mockHub.rawRequest = vi.fn();

    endpoint = new MCPServerEndpoint(mockHub);
  });

  afterEach(() => {
    endpoint = null;
    mockHub = null;
  });

  it('should notify clients when capabilities change', () => {
    // ARRANGE: Add mock clients with notification methods
    const mockServer1 = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendPromptListChanged: vi.fn()
    };
    const mockServer2 = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendPromptListChanged: vi.fn()
    };

    endpoint.clients.set('client1', { transport: {}, server: mockServer1 });
    endpoint.clients.set('client2', { transport: {}, server: mockServer2 });

    // Create server with tools
    const server = new EventEmitter();
    server.name = 'test-server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(2, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('test-server');

    mockHub.connections.set('test-server', server);

    // ACT: Sync capabilities (should trigger notifications)
    endpoint.syncCapabilities();

    // ASSERT: Both clients should be notified
    expect(mockServer1.sendToolListChanged).toHaveBeenCalled();
    expect(mockServer2.sendToolListChanged).toHaveBeenCalled();
  });

  it('should handle notification errors gracefully', () => {
    // ARRANGE: Add client with failing notification
    const mockServer = {
      sendToolListChanged: vi.fn().mockImplementation(() => {
        throw new Error('Notification failed');
      })
    };

    endpoint.clients.set('error-client', { transport: {}, server: mockServer });

    // Create server
    const server = new EventEmitter();
    server.name = 'test-server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(1, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('test-server');

    mockHub.connections.set('test-server', server);

    // ACT & ASSERT: Sync should not throw despite notification error
    expect(() => endpoint.syncCapabilities()).not.toThrow();
    expect(mockServer.sendToolListChanged).toHaveBeenCalled();
  });

  it('should skip notifications when no clients connected', () => {
    // ARRANGE: No clients
    expect(endpoint.clients.size).toBe(0);

    // Create and sync server
    const server = new EventEmitter();
    server.name = 'test-server';
    server.status = 'connected';
    server.disabled = false;
    server.tools = createToolList(2, 'tool');
    server.resources = [];
    server.resourceTemplates = [];
    server.prompts = [];
    server.serverInfo = createServerInfo('test-server');

    mockHub.connections.set('test-server', server);

    // ACT & ASSERT: Should sync without attempting notifications
    expect(() => endpoint.syncCapabilities()).not.toThrow();
    expect(endpoint.registeredCapabilities.tools.size).toBe(2);
  });
});
