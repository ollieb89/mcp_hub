/**
 * Mock data factories for testing
 * Provides consistent, customizable test data
 */
import type {
  ServerStatus,
  ServerInfo,
  ServersResponse,
  HubConfig,
  FilteringStats,
  ToolsResponse,
  ToolSummary,
  Tool,
  HealthResponse,
  HealthServerInfo,
  ConfigResponse,
} from '../schemas';

/**
 * Server factory for creating mock server objects
 */
export const mockServerFactory = {
  /**
   * Create a single mock server
   *
   * @param overrides - Properties to override
   * @returns Mock server object
   *
   * @example
   * ```typescript
   * const server = mockServerFactory.create({
   *   name: 'github',
   *   status: 'connected',
   * });
   * ```
   */
  create: (overrides: Partial<ServerInfo> = {}): ServerInfo => ({
    name: 'test-server',
    status: 'connected' as ServerStatus,
    displayName: 'Test Server',
    description: 'Test server description',
    transportType: 'stdio',
    error: null,
    capabilities: {
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    },
    uptime: 0,
    lastStarted: null,
    authorizationUrl: null,
    serverInfo: null,
    config_source: 'test-config',
    ...overrides,
  }),

  /**
   * Create multiple mock servers
   *
   * @param count - Number of servers to create
   * @param overrides - Properties to override for all servers
   * @returns Array of mock servers
   *
   * @example
   * ```typescript
   * const servers = mockServerFactory.createList(3, { status: 'connected' });
   * ```
   */
  createList: (
    count: number,
    overrides: Partial<ServerInfo> = {}
  ): ServerInfo[] =>
    Array.from({ length: count }, (_, i) =>
      mockServerFactory.create({
        name: `server-${i}`,
        displayName: `Server ${i}`,
        ...overrides,
      })
    ),
};

/**
 * Servers response factory for API responses
 */
export const mockServersResponseFactory = {
  /**
   * Create a complete servers response
   *
   * @param overrides - Properties to override
   * @returns Mock servers response
   *
   * @example
   * ```typescript
   * const response = mockServersResponseFactory.create({
   *   servers: mockServerFactory.createList(5),
   * });
   * ```
   */
  create: (overrides: Partial<ServersResponse> = {}): ServersResponse => ({
    timestamp: new Date().toISOString(),
    servers: mockServerFactory.createList(3),
    ...overrides,
  }),
};

/**
 * Config factory for hub configuration
 */
export const mockConfigFactory = {
  /**
   * Create a mock hub configuration
   *
   * @param overrides - Properties to override
   * @returns Mock HubConfig
   *
   * @example
   * ```typescript
   * const config = mockConfigFactory.create({
   *   mcpServers: {
   *     github: { command: 'npx', args: ['-y', '@mcp/server-github'] },
   *   },
   * });
   * ```
   */
  create: (overrides: Partial<HubConfig> = {}): HubConfig => ({
    mcpServers: {
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
      },
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      },
    },
    ...overrides,
  }),
};

/**
 * Config response factory for API responses
 */
export const mockConfigResponseFactory = {
  /**
   * Create a complete config response with version
   *
   * @param overrides - Properties to override
   * @returns Mock config response
   *
   * @example
   * ```typescript
   * const response = mockConfigResponseFactory.create({
   *   version: 'abc123',
   * });
   * ```
   */
  create: (overrides: Partial<ConfigResponse> = {}): ConfigResponse => ({
    timestamp: new Date().toISOString(),
    config: mockConfigFactory.create(overrides.config),
    version: 'v1.0.0-test',
    ...overrides,
  }),
};

/**
 * Filtering stats factory
 */
export const mockFilteringStatsFactory = {
  /**
   * Create mock filtering statistics
   *
   * @param overrides - Properties to override
   * @returns Mock filtering stats
   *
   * @example
   * ```typescript
   * const stats = mockFilteringStatsFactory.create({
   *   enabled: true,
   *   mode: 'prompt-based',
   * });
   * ```
   */
  create: (overrides: Partial<FilteringStats> = {}): FilteringStats => ({
    enabled: true,
    mode: 'prompt-based',
    totalTools: 150,
    filteredTools: 125,
    exposedTools: 25,
    filterRate: 0.83,
    serverFilterMode: 'allowlist',
    allowedServers: ['github', 'filesystem'],
    allowedCategories: ['github', 'filesystem', 'web'],
    categoryCacheSize: 50,
    cacheHitRate: 0.95,
    llmCacheSize: 100,
    llmCacheHitRate: 0.85,
    timestamp: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Tool factory for creating mock tools
 */
export const mockToolFactory = {
  /**
   * Create a single mock tool
   *
   * @param overrides - Properties to override
   * @returns Mock tool object
   *
   * @example
   * ```typescript
   * const tool = mockToolFactory.create({
   *   name: 'github__search',
   *   serverName: 'github',
   * });
   * ```
   */
  create: (overrides: Partial<Tool> = {}): Tool => ({
    name: 'test__tool',
    description: 'Test tool description',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    ...overrides,
  }),

  /**
   * Create multiple mock tools
   *
   * @param count - Number of tools to create
   * @param overrides - Properties to override for all tools
   * @returns Array of mock tools
   *
   * @example
   * ```typescript
   * const tools = mockToolFactory.createList(10, { category: 'github' });
   * ```
   */
  createList: (count: number, overrides: Partial<Tool> = {}): Tool[] =>
    Array.from({ length: count }, (_, i) =>
      mockToolFactory.create({
        name: `tool-${i}`,
        description: `Tool ${i} description`,
        ...overrides,
      })
    ),
};

/**
 * Tool summary factory for API responses
 */
export const mockToolSummaryFactory = {
  /**
   * Create a single mock tool summary
   *
   * @param overrides - Properties to override
   * @returns Mock tool summary
   */
  create: (overrides: Partial<ToolSummary> = {}): ToolSummary => ({
    server: 'test-server',
    serverDisplayName: 'Test Server',
    name: 'test__tool',
    description: 'Test tool description',
    enabled: true,
    categories: ['general'],
    ...overrides,
  }),

  /**
   * Create multiple mock tool summaries
   *
   * @param count - Number of tool summaries to create
   * @param overrides - Properties to override for all tools
   * @returns Array of mock tool summaries
   */
  createList: (count: number, overrides: Partial<ToolSummary> = {}): ToolSummary[] =>
    Array.from({ length: count }, (_, i) =>
      mockToolSummaryFactory.create({
        name: `tool-${i}`,
        description: `Tool ${i} description`,
        ...overrides,
      })
    ),
};

/**
 * Tools response factory
 */
export const mockToolsResponseFactory = {
  /**
   * Create a complete tools response
   *
   * @param overrides - Properties to override
   * @returns Mock tools response
   *
   * @example
   * ```typescript
   * const response = mockToolsResponseFactory.create({
   *   tools: mockToolSummaryFactory.createList(50),
   * });
   * ```
   */
  create: (overrides: Partial<ToolsResponse> = {}): ToolsResponse => ({
    timestamp: new Date().toISOString(),
    tools: mockToolSummaryFactory.createList(10),
    ...overrides,
  }),
};

/**
 * Health server info factory
 */
export const mockHealthServerInfoFactory = {
  /**
   * Create a single health server info
   */
  create: (overrides: Partial<HealthServerInfo> = {}): HealthServerInfo => ({
    name: 'test-server',
    displayName: 'Test Server',
    description: 'Test server description',
    transportType: 'stdio',
    status: 'connected',
    error: null,
    capabilities: {
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    },
    uptime: 0,
    lastStarted: null,
    authorizationUrl: null,
    serverInfo: null,
    config_source: 'test-config',
    ...overrides,
  }),

  /**
   * Create multiple health server infos
   */
  createList: (count: number, overrides: Partial<HealthServerInfo> = {}): HealthServerInfo[] =>
    Array.from({ length: count }, (_, i) =>
      mockHealthServerInfoFactory.create({
        name: `server-${i}`,
        displayName: `Server ${i}`,
        ...overrides,
      })
    ),
};

/**
 * Health response factory
 */
export const mockHealthResponseFactory = {
  /**
   * Create a mock health response
   *
   * @param overrides - Properties to override
   * @returns Mock health response
   *
   * @example
   * ```typescript
   * const health = mockHealthResponseFactory.create({
   *   state: 'ready',
   *   activeClients: 5,
   * });
   * ```
   */
  create: (overrides: Partial<HealthResponse> = {}): HealthResponse => ({
    status: 'ok',
    state: 'ready',
    server_id: 'test-server-id',
    version: '1.0.0',
    activeClients: 2,
    timestamp: new Date().toISOString(),
    servers: mockHealthServerInfoFactory.createList(3),
    ...overrides,
  }),
};

/**
 * Marketplace item factory
 */
export const mockMarketplaceItemFactory = {
  /**
   * Create a mock marketplace item
   *
   * @param overrides - Properties to override
   * @returns Mock marketplace item
   */
  create: (overrides = {}) => ({
    id: 'test-server',
    name: 'Test Server',
    description: 'Test server description',
    author: 'Test Author',
    repository: 'https://github.com/test/test-server',
    stars: 100,
    category: 'general',
    installCommand: 'npm install @test/server',
    ...overrides,
  }),

  /**
   * Create multiple marketplace items
   *
   * @param count - Number of items to create
   * @param overrides - Properties to override
   * @returns Array of marketplace items
   */
  createList: (count: number, overrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      mockMarketplaceItemFactory.create({
        id: `server-${i}`,
        name: `Server ${i}`,
        stars: Math.floor(Math.random() * 1000),
        ...overrides,
      })
    ),
};

/**
 * Error factory for testing error states
 */
export const mockErrorFactory = {
  /**
   * Create a mock API error
   *
   * @param message - Error message
   * @param code - Optional error code
   * @returns Error object
   */
  apiError: (message = 'API Error', code?: string) => {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  },

  /**
   * Create a mock network error
   */
  networkError: () => new Error('Failed to fetch'),

  /**
   * Create a mock validation error
   */
  validationError: (field = 'unknown') =>
    new Error(`Validation failed for field: ${field}`),

  /**
   * Create a mock version conflict error
   */
  versionConflictError: () =>
    new Error(
      'Version mismatch - config was modified by another process. Please refresh and try again.'
    ),
};
