/**
 * Mock Factories for Test Dependencies
 *
 * These factories create complete mock objects with all required methods,
 * preventing incomplete mock configurations that cause test failures.
 */

import { vi } from 'vitest';

/**
 * Create a complete logger mock with all 4 methods
 * @param {Object} overrides - Override specific methods
 * @returns {Object} Logger mock
 */
export function createMockLogger(overrides = {}) {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    ...overrides
  };
}

/**
 * Create a ConfigManager mock with default behavior
 * @param {Object} overrides - Override specific methods or return values
 * @returns {Object} ConfigManager mock
 */
export function createMockConfigManager(overrides = {}) {
  return {
    loadConfig: vi.fn().mockResolvedValue(undefined),
    watchConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    ...overrides
  };
}

/**
 * Create an MCPConnection mock with all methods
 * @param {Object} overrides - Override specific methods or return values
 * @returns {Object} MCPConnection mock
 */
export function createMockConnection(overrides = {}) {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getServerInfo: vi.fn().mockResolvedValue({
      name: 'test-server',
      status: 'connected'
    }),
    callTool: vi.fn().mockResolvedValue({
      content: [],
      isError: false
    }),
    readResource: vi.fn().mockResolvedValue({
      content: [],
      isError: false
    }),
    listTools: vi.fn().mockResolvedValue([]),
    listResources: vi.fn().mockResolvedValue([]),
    listPrompts: vi.fn().mockResolvedValue([]),
    authorize: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    ...overrides
  };
}

/**
 * Create an Express request mock
 * @param {Object} overrides - Request properties to override
 * @returns {Object} Request mock
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  };
}

/**
 * Create an Express response mock with chainable methods
 * @param {Object} overrides - Response properties to override
 * @returns {Object} Response mock with chainable methods
 */
export function createMockResponse(overrides = {}) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    headersSent: false,
    writableEnded: false,
    ...overrides
  };
  return res;
}

/**
 * Create a ServiceManager mock
 * @param {Object} overrides - Override specific methods or return values
 * @returns {Object} ServiceManager mock
 */
export function createMockServiceManager(overrides = {}) {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    restartHub: vi.fn().mockResolvedValue(undefined),
    getServerStatus: vi.fn().mockReturnValue({
      name: 'test-server',
      status: 'connected'
    }),
    getAllServerStatuses: vi.fn().mockReturnValue([]),
    getConnection: vi.fn().mockReturnValue(null),
    workspaceCache: {
      getActiveWorkspaces: vi.fn().mockResolvedValue([])
    },
    mcpHub: {
      startServer: vi.fn().mockResolvedValue({}),
      stopServer: vi.fn().mockResolvedValue({}),
      refreshServer: vi.fn().mockResolvedValue({}),
      refreshAllServers: vi.fn().mockResolvedValue([]),
      getServerStatus: vi.fn().mockReturnValue({}),
      getAllServerStatuses: vi.fn().mockReturnValue([]),
      getConnection: vi.fn().mockReturnValue(null),
      callTool: vi.fn().mockResolvedValue({}),
      readResource: vi.fn().mockResolvedValue({}),
      callPrompt: vi.fn().mockResolvedValue({})
    },
    ...overrides
  };
}

