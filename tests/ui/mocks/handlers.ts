/**
 * MSW (Mock Service Worker) request handlers
 * Mocks MCP Hub API responses for testing
 */
import { http, HttpResponse } from 'msw';

/**
 * Default mock data
 * Can be overridden in individual tests using server.use()
 */
export const mockHealthData = {
  state: 'ready' as const,
  activeClients: 2,
  servers: ['filesystem', 'github'],
  timestamp: new Date().toISOString(),
};

export const mockServersData = [
  {
    name: 'filesystem',
    displayName: 'File System',
    status: 'connected' as const,
    transportType: 'stdio' as const,
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read file contents' },
        { name: 'write_file', description: 'Write file contents' },
      ],
    },
    uptime: 123456,
  },
  {
    name: 'github',
    displayName: 'GitHub',
    status: 'connected' as const,
    transportType: 'sse' as const,
    capabilities: {
      tools: [
        { name: 'search_repos', description: 'Search GitHub repositories' },
      ],
    },
    uptime: 234567,
  },
  {
    name: 'disabled-server',
    displayName: 'Disabled Server',
    status: 'disabled' as const,
    transportType: 'stdio' as const,
    capabilities: { tools: [] },
    uptime: 0,
  },
];

export const mockConfigData = {
  config: {
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env: {},
      },
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
      },
    },
  },
  version: 'v1-abc123',
  timestamp: new Date().toISOString(),
};

export const mockFilteringStatsData = {
  enabled: true,
  mode: 'category' as const,
  totalTools: 12,
  filteredTools: 4,
  exposedTools: 8,
  filterRate: 0.33,
  serverFilterMode: 'allowlist' as const,
  allowedServers: ['filesystem', 'github'],
  allowedCategories: ['filesystem', 'web'],
  categoryCacheSize: 3,
  cacheHitRate: 0.6,
  llmCacheSize: 2,
  llmCacheHitRate: 0.4,
  timestamp: new Date().toISOString(),
};

export const mockToolsData = [
  {
    name: 'filesystem__read_file',
    displayName: 'Read File',
    description: 'Read file contents from filesystem',
    server: 'filesystem',
    category: 'filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'github__search_repos',
    displayName: 'Search Repositories',
    description: 'Search GitHub repositories',
    server: 'github',
    category: 'web',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

export const mockMarketplaceData = {
  servers: [
    {
      name: 'filesystem',
      displayName: 'File System',
      description: 'Access and manipulate files on the local filesystem',
      category: 'filesystem',
      stars: 150,
      author: 'modelcontextprotocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
    },
    {
      name: 'github',
      displayName: 'GitHub',
      description: 'Interact with GitHub repositories and issues',
      category: 'web',
      stars: 200,
      author: 'modelcontextprotocol',
      repository: 'https://github.com/modelcontextprotocol/servers',
    },
  ],
  total: 2,
};

/**
 * MSW request handlers
 * Define API endpoints and their responses
 */
export const handlers = [
  // Health endpoint
  http.get('/api/health', () => {
    return HttpResponse.json(mockHealthData);
  }),

  // Servers endpoints
  http.get('/api/servers', () => {
    return HttpResponse.json(mockServersData);
  }),

  http.post('/api/servers/:name/start', async ({ params }) => {
    return HttpResponse.json({
      status: 'ok',
      server: params.name,
      message: `Server ${params.name} started successfully`,
    });
  }),

  http.post('/api/servers/:name/stop', async ({ params }) => {
    return HttpResponse.json({
      status: 'ok',
      server: params.name,
      message: `Server ${params.name} stopped successfully`,
    });
  }),

  // Config endpoints
  http.get('/api/config', () => {
    return HttpResponse.json(mockConfigData);
  }),

  http.post('/api/config', async ({ request }) => {
    const body = (await request.json()) as {
      config: unknown;
      expectedVersion?: string;
    };

    // Simulate version conflict
    if (
      body.expectedVersion &&
      body.expectedVersion !== mockConfigData.version
    ) {
      return new HttpResponse(
        JSON.stringify({ error: 'Config version mismatch' }),
        {
          status: 409,
          statusText: 'Conflict',
        }
      );
    }

    // Success response with new version
    return HttpResponse.json({
      config: body.config,
      version: 'v1-xyz789', // New version after save
      timestamp: new Date().toISOString(),
    });
  }),

  // Filtering endpoints
  http.get('/api/filtering/stats', () => {
    return HttpResponse.json(mockFilteringStatsData);
  }),

  http.post('/api/filtering/enabled', async ({ request }) => {
    const body = (await request.json()) as { enabled: boolean };
    return HttpResponse.json({
      status: 'ok',
      toolFiltering: { enabled: body.enabled },
    });
  }),

  http.post('/api/filtering/mode', async ({ request }) => {
    const body = (await request.json()) as { mode: string };
    return HttpResponse.json({
      status: 'ok',
      toolFiltering: { mode: body.mode },
    });
  }),

  // Tools endpoints
  http.get('/api/tools', () => {
    return HttpResponse.json(mockToolsData);
  }),

  // Marketplace endpoints
  http.get('/api/marketplace/catalog', () => {
    return HttpResponse.json(mockMarketplaceData);
  }),
];
