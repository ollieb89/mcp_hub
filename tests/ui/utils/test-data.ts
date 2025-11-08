/**
 * Test data factories
 * Reusable functions to create mock data for tests
 */

/**
 * Server status types
 */
type ServerStatus = 'connected' | 'connecting' | 'disconnected' | 'disabled';
type TransportType = 'stdio' | 'sse' | 'streamable-http';

/**
 * Create mock server data
 *
 * @param overrides - Partial server data to override defaults
 * @returns Mock server object
 *
 * @example
 * ```typescript
 * // Default connected server
 * const server = createMockServer();
 *
 * // Disabled server
 * const disabled = createMockServer({ status: 'disabled', uptime: 0 });
 *
 * // Server with custom capabilities
 * const withTools = createMockServer({
 *   capabilities: {
 *     tools: [{ name: 'custom_tool', description: 'Custom tool' }]
 *   }
 * });
 * ```
 */
export function createMockServer(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test-server',
    displayName: 'Test Server',
    status: 'connected' as ServerStatus,
    transportType: 'stdio' as TransportType,
    capabilities: {
      tools: [
        { name: 'test_tool', description: 'Test tool' },
      ],
    },
    uptime: 12345,
    ...overrides,
  };
}

/**
 * Create mock config data
 *
 * @param overrides - Partial config data to override defaults
 * @returns Mock config response object
 *
 * @example
 * ```typescript
 * // Default config
 * const config = createMockConfig();
 *
 * // Config with custom version
 * const versioned = createMockConfig({ version: 'v2-xyz789' });
 *
 * // Config with custom servers
 * const withServers = createMockConfig({
 *   config: {
 *     mcpServers: {
 *       filesystem: { command: 'npx', args: ['fs-server'] }
 *     }
 *   }
 * });
 * ```
 */
export function createMockConfig(overrides: Record<string, unknown> = {}) {
  return {
    config: {
      mcpServers: {},
    },
    version: 'v1-abc123',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock filtering stats data
 *
 * @param overrides - Partial filtering stats to override defaults
 * @returns Mock filtering stats object
 *
 * @example
 * ```typescript
 * // Default stats (enabled, category mode)
 * const stats = createMockFilteringStats();
 *
 * // Disabled filtering
 * const disabled = createMockFilteringStats({ enabled: false });
 *
 * // Prompt-based mode
 * const promptBased = createMockFilteringStats({ mode: 'prompt-based' });
 *
 * // Custom filter rate
 * const highFilter = createMockFilteringStats({
 *   totalTools: 100,
 *   filteredTools: 80,
 *   exposedTools: 20,
 *   filterRate: 0.8
 * });
 * ```
 */
export function createMockFilteringStats(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    mode: 'category' as const,
    totalTools: 10,
    filteredTools: 3,
    exposedTools: 7,
    filterRate: 0.3,
    serverFilterMode: 'allowlist' as const,
    allowedServers: ['filesystem'],
    allowedCategories: ['filesystem', 'web'],
    categoryCacheSize: 2,
    cacheHitRate: 0.5,
    llmCacheSize: 1,
    llmCacheHitRate: 0.3,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock tool data
 *
 * @param overrides - Partial tool data to override defaults
 * @returns Mock tool object
 *
 * @example
 * ```typescript
 * // Default tool
 * const tool = createMockTool();
 *
 * // Tool with custom server
 * const githubTool = createMockTool({
 *   name: 'github__search_repos',
 *   server: 'github',
 *   category: 'web'
 * });
 *
 * // Tool with complex input schema
 * const advancedTool = createMockTool({
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       query: { type: 'string' },
 *       limit: { type: 'number', default: 10 }
 *     },
 *     required: ['query']
 *   }
 * });
 * ```
 */
export function createMockTool(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test__tool',
    displayName: 'Test Tool',
    description: 'Test tool description',
    server: 'test-server',
    category: 'test',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input parameter' },
      },
      required: ['input'],
    },
    ...overrides,
  };
}

/**
 * Create mock health data
 *
 * @param overrides - Partial health data to override defaults
 * @returns Mock health response object
 *
 * @example
 * ```typescript
 * // Default health (ready state)
 * const health = createMockHealth();
 *
 * // Hub restarting
 * const restarting = createMockHealth({ state: 'restarting' });
 *
 * // Multiple active clients
 * const busy = createMockHealth({
 *   activeClients: 10,
 *   servers: ['filesystem', 'github', 'database']
 * });
 * ```
 */
export function createMockHealth(overrides: Record<string, unknown> = {}) {
  return {
    state: 'ready' as const,
    activeClients: 1,
    servers: ['test-server'],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock marketplace server data
 *
 * @param overrides - Partial marketplace server data to override defaults
 * @returns Mock marketplace server object
 *
 * @example
 * ```typescript
 * // Default marketplace server
 * const server = createMockMarketplaceServer();
 *
 * // Popular server
 * const popular = createMockMarketplaceServer({
 *   stars: 500,
 *   displayName: 'Popular Server'
 * });
 *
 * // Server from specific category
 * const dbServer = createMockMarketplaceServer({
 *   name: 'postgres',
 *   category: 'database'
 * });
 * ```
 */
export function createMockMarketplaceServer(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test-marketplace-server',
    displayName: 'Test Marketplace Server',
    description: 'Test marketplace server description',
    category: 'test',
    stars: 50,
    author: 'test-author',
    repository: 'https://github.com/test/test-server',
    ...overrides,
  };
}

/**
 * Create array of mock servers
 *
 * @param count - Number of servers to create
 * @param baseOverrides - Common overrides for all servers
 * @returns Array of mock servers
 *
 * @example
 * ```typescript
 * // Create 3 connected servers
 * const servers = createMockServers(3);
 *
 * // Create 5 disabled servers
 * const disabled = createMockServers(5, { status: 'disabled' });
 * ```
 */
export function createMockServers(count: number, baseOverrides: Record<string, unknown> = []) {
  return Array.from({ length: count }, (_, i) =>
    createMockServer({
      name: `server-${i}`,
      displayName: `Server ${i}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create array of mock tools
 *
 * @param count - Number of tools to create
 * @param baseOverrides - Common overrides for all tools
 * @returns Array of mock tools
 *
 * @example
 * ```typescript
 * // Create 10 tools
 * const tools = createMockTools(10);
 *
 * // Create 5 filesystem tools
 * const fsTools = createMockTools(5, { category: 'filesystem', server: 'filesystem' });
 * ```
 */
export function createMockTools(count: number, baseOverrides: Record<string, unknown> = []) {
  return Array.from({ length: count }, (_, i) =>
    createMockTool({
      name: `tool_${i}`,
      displayName: `Tool ${i}`,
      ...baseOverrides,
    })
  );
}
