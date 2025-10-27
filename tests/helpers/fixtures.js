import { vi } from "vitest";

/**
 * Test Fixtures for Consistent Test Data
 *
 * These generators create realistic test data structures,
 * reducing boilerplate and ensuring consistency.
 */

/**
 * Create a test configuration object
 * @param {Object} overrides - Override specific config properties
 * @returns {Object} Configuration object
 */
export function createTestConfig(overrides = {}) {
  return {
    mcpServers: {
      'test-server': {
        command: 'node',
        args: ['server.js'],
        env: {}
      }
    },
    ...overrides
  };
}

/**
 * Create a server-specific configuration
 * @param {string} name - Server name
 * @param {Object} overrides - Override server config properties
 * @returns {Object} Server configuration object
 */
export function createServerConfig(name, overrides = {}) {
  return {
    [name]: {
      command: 'node',
      args: ['server.js'],
      env: {},
      ...overrides
    }
  };
}

/**
 * Create a tool call response structure
 * @param {Object} overrides - Override response properties
 * @returns {Object} Tool response
 */
export function createToolResponse(overrides = {}) {
  return {
    content: [
      {
        type: 'text',
        text: 'Success'
      }
    ],
    isError: false,
    ...overrides
  };
}

/**
 * Create a resource read response structure
 * @param {Object} overrides - Override response properties
 * @returns {Object} Resource response
 */
export function createResourceResponse(overrides = {}) {
  return {
    contents: [
      {
        uri: 'test://resource',
        text: 'Resource content'
      }
    ],
    ...overrides
  };
}

/**
 * Create a server status object
 * @param {string} name - Server name
 * @param {string} status - Server status (connected, disconnected, etc.)
 * @param {Object} overrides - Override status properties
 * @returns {Object} Server status
 */
export function createServerStatus(name, status = 'connected', overrides = {}) {
  return {
    name,
    status,
    capabilities: {
      tools: [],
      resources: [],
      prompts: []
    },
    ...overrides
  };
}

/**
 * Create a list of tools
 * @param {number} count - Number of tools to create
 * @param {string} prefix - Tool name prefix
 * @returns {Array} Array of tool objects
 */
export function createToolList(count = 3, prefix = 'tool') {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}-${i + 1}`,
    description: `Test tool ${i + 1}`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }));
}

/**
 * Create a list of resources
 * @param {number} count - Number of resources to create
 * @param {string} prefix - Resource URI prefix
 * @returns {Array} Array of resource objects
 */
export function createResourceList(count = 3, prefix = 'test://resource') {
  return Array.from({ length: count }, (_, i) => ({
    uri: `${prefix}/${i + 1}`,
    name: `Resource ${i + 1}`,
    description: `Test resource ${i + 1}`,
    mimeType: 'text/plain'
  }));
}

/**
 * Create a list of resource templates
 * @param {number} count - Number of templates to create
 * @param {string} prefix - Template URI prefix
 * @returns {Array} Array of resource template objects
 */
export function createResourceTemplateList(count = 2, prefix = 'test://{param}') {
  return Array.from({ length: count }, (_, i) => ({
    uriTemplate: `${prefix}${i + 1}`,
    name: `Template ${i + 1}`,
    description: `Test template ${i + 1}`
  }));
}

/**
 * Create a list of prompts
 * @param {number} count - Number of prompts to create
 * @param {string} prefix - Prompt name prefix
 * @returns {Array} Array of prompt objects
 */
export function createPromptList(count = 2, prefix = 'prompt') {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}-${i + 1}`,
    description: `Test prompt ${i + 1}`,
    arguments: []
  }));
}

/**
 * Create a complete server info object
 * @param {string} name - Server name
 * @param {Object} overrides - Override server info properties
 * @returns {Object} Server info object
 */
export function createServerInfo(name, overrides = {}) {
  return {
    name,
    version: '1.0.0',
    ...overrides
  };
}

/**
 * Create a multi-server configuration
 * @param {Array} servers - Array of server names
 * @returns {Object} Multi-server configuration
 */
export function createMultiServerConfig(servers = ['server1', 'server2']) {
  const config = {
    mcpServers: {}
  };
  
  servers.forEach(name => {
    config.mcpServers[name] = {
      command: 'node',
      args: [`${name}.js`],
      env: {}
    };
  });
  
  return config;
}

/**
 * Create a disabled server configuration
 * @param {string} name - Server name
 * @returns {Object} Disabled server configuration
 */
export function createDisabledServerConfig(name) {
  return createServerConfig(name, { disabled: true });
}

/**
 * Create MCPConnection configuration for testing
 * @param {Object} overrides - Override config properties
 * @returns {Object} Connection config
 */
export function createConnectionConfig(overrides = {}) {
  return {
    type: 'stdio',
    command: 'node',
    args: ['server.js'],
    env: {},
    ...overrides
  };
}

/**
 * Create STDIO-specific server configuration for integration tests
 * @param {string} serverName - Server identifier
 * @param {Object} overrides - Override server config properties
 * @returns {Object} STDIO server configuration
 */
export function createStdioConfig(serverName, overrides = {}) {
  return {
    name: serverName,
    type: 'stdio',
    command: 'node',
    args: ['server.js'],
    env: {},
    ...overrides
  };
}

/**
 * Create SSE-specific server configuration for integration tests
 * @param {string} serverName - Server identifier
 * @param {Object} overrides - Override server config properties
 * @returns {Object} SSE server configuration
 */
export function createSSEConfig(serverName, overrides = {}) {
  return {
    name: serverName,
    type: 'sse',
    url: 'http://localhost:3000/mcp',
    headers: {},
    ...overrides
  };
}

/**
 * Create streamable-http-specific server configuration for integration tests
 * @param {string} serverName - Server identifier
 * @param {Object} overrides - Override server config properties
 * @returns {Object} Streamable-HTTP server configuration
 */
export function createHttpConfig(serverName, overrides = {}) {
  return {
    name: serverName,
    type: 'streamable-http',
    url: 'https://api.example.com/mcp',
    headers: {},
    ...overrides
  };
}

/**
 * Create environment context for integration tests
 * Sets up test environment variables for resolution testing
 * @param {Object} envVars - Environment variables to set
 */
export function createEnvContext(envVars = {}) {
  const defaults = {
    NODE_ENV: 'test',
    API_KEY: 'test_api_key',
    CUSTOM_VAR: 'test_custom_value',
    MCP_BINARY_PATH: '/usr/local/bin'
  };
  
  return { ...defaults, ...envVars };
}

/**
 * Create mock transport object for testing
 * @param {Object} overrides - Override transport properties
 * @returns {Object} Mock transport
 */
export function createMockTransport(overrides = {}) {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    sessionId: null,
    terminateSession: vi.fn().mockResolvedValue(undefined),
    stderr: {
      on: vi.fn()
    },
    onerror: null,
    onclose: null,
    ...overrides
  };
}

/**
 * Create mock client object for testing
 * @param {Object} overrides - Override client properties
 * @returns {Object} Mock client
 */
export function createMockClient(overrides = {}) {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    request: vi.fn(),
    setNotificationHandler: vi.fn(),
    transport: null,
    ...overrides
  };
}

