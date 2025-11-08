import { describe, it, expect } from 'vitest';
import {
  ConfigDataSchema,
  ConfigResponseSchema,
  ConfigSaveRequestSchema,
} from '../config.schema';
import {
  FilteringModeSchema,
  FilteringStatsSchema,
} from '../filtering.schema';
import {
  ToolSummarySchema,
  ToolsResponseSchema,
} from '../tools.schema';
import {
  HealthResponseSchema,
} from '../health.schema';

// ============================================================================
// Config Schema Tests
// ============================================================================

describe('ConfigDataSchema', () => {
  it('should validate minimal config data', () => {
    const config = {
      mcpServers: {},
    };

    expect(() => ConfigDataSchema.parse(config)).not.toThrow();
  });

  it('should validate config with servers and toolFiltering', () => {
    const config = {
      mcpServers: {
        filesystem: {
          command: 'node',
          args: ['server.js'],
        },
      },
      toolFiltering: {
        enabled: true,
        mode: 'static',
      },
    };

    expect(() => ConfigDataSchema.parse(config)).not.toThrow();
  });

  it('should validate config with connectionPool', () => {
    const config = {
      mcpServers: {},
      connectionPool: {
        enabled: true,
        keepAliveTimeout: 60000,
        maxConnections: 50,
      },
    };

    expect(() => ConfigDataSchema.parse(config)).not.toThrow();
  });
});

describe('ConfigResponseSchema', () => {
  it('should validate config response', () => {
    const response = {
      config: {
        mcpServers: {
          github: { command: 'github-server' },
        },
      },
      version: '1.0.0',
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ConfigResponseSchema.parse(response)).not.toThrow();
  });
});

describe('ConfigSaveRequestSchema', () => {
  it('should validate save request', () => {
    const request = {
      config: {
        mcpServers: {},
      },
    };

    expect(() => ConfigSaveRequestSchema.parse(request)).not.toThrow();
  });

  it('should validate save request with toolFiltering', () => {
    const request = {
      config: {
        mcpServers: {},
        toolFiltering: {
          enabled: true,
          mode: 'static' as const,
        },
      },
    };

    expect(() => ConfigSaveRequestSchema.parse(request)).not.toThrow();
  });
});

// ============================================================================
// Filtering Schema Tests
// ============================================================================

describe('FilteringModeSchema', () => {
  it('should validate all filtering modes', () => {
    const modes = ['static', 'prompt-based', 'server-allowlist', 'category'];

    modes.forEach((mode) => {
      expect(() => FilteringModeSchema.parse(mode)).not.toThrow();
    });
  });

  it('should reject invalid mode', () => {
    expect(() => FilteringModeSchema.parse('invalid')).toThrow();
  });
});

describe('FilteringStatsSchema', () => {
  it('should validate minimal stats (static mode)', () => {
    const stats = {
      enabled: true,
      mode: 'static' as const,
      totalTools: 100,
      filteredTools: 50,
      exposedTools: 50,
      filterRate: 0.5,
      serverFilterMode: 'allowlist' as const,
      allowedServers: [],
      allowedCategories: [],
      categoryCacheSize: 0,
      cacheHitRate: 0,
      llmCacheSize: 0,
      llmCacheHitRate: 0,
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => FilteringStatsSchema.parse(stats)).not.toThrow();
  });

  it('should validate stats with server allowlist', () => {
    const stats = {
      enabled: true,
      mode: 'server-allowlist' as const,
      totalTools: 150,
      filteredTools: 100,
      exposedTools: 50,
      filterRate: 0.67,
      serverFilterMode: 'allowlist' as const,
      allowedServers: ['filesystem', 'github'],
      allowedCategories: [],
      categoryCacheSize: 50,
      cacheHitRate: 0.8,
      llmCacheSize: 20,
      llmCacheHitRate: 0.9,
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => FilteringStatsSchema.parse(stats)).not.toThrow();
  });

  it('should validate stats with categories', () => {
    const stats = {
      enabled: true,
      mode: 'category' as const,
      totalTools: 200,
      filteredTools: 120,
      exposedTools: 80,
      filterRate: 0.6,
      serverFilterMode: 'blocklist' as const,
      allowedServers: [],
      allowedCategories: ['filesystem', 'github', 'web'],
      categoryCacheSize: 100,
      cacheHitRate: 0.85,
      llmCacheSize: 50,
      llmCacheHitRate: 0.92,
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => FilteringStatsSchema.parse(stats)).not.toThrow();
  });

  it('should reject negative tool counts', () => {
    const stats = {
      enabled: true,
      mode: 'static' as const,
      totalTools: -1,
      filteredTools: 50,
      exposedTools: 50,
      filterRate: 0.5,
      serverFilterMode: 'allowlist' as const,
      allowedServers: [],
      allowedCategories: [],
      categoryCacheSize: 0,
      cacheHitRate: 0,
      llmCacheSize: 0,
      llmCacheHitRate: 0,
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => FilteringStatsSchema.parse(stats)).toThrow();
  });
});

// ============================================================================
// Tools Schema Tests
// ============================================================================

describe('ToolSummarySchema', () => {
  it('should validate complete tool summary', () => {
    const tool = {
      server: 'filesystem',
      serverDisplayName: 'Filesystem',
      name: 'read_file',
      description: 'Read file contents',
      enabled: true,
      categories: ['filesystem'],
    };

    expect(() => ToolSummarySchema.parse(tool)).not.toThrow();
  });

  it('should validate tool with multiple categories', () => {
    const tool = {
      server: 'github',
      serverDisplayName: 'GitHub',
      name: 'create_issue',
      description: 'Create a new GitHub issue',
      enabled: true,
      categories: ['github', 'issues'],
    };

    expect(() => ToolSummarySchema.parse(tool)).not.toThrow();
  });
});

describe('ToolsResponseSchema', () => {
  it('should validate empty tools list', () => {
    const response = {
      tools: [],
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ToolsResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate tools response with multiple tools', () => {
    const response = {
      tools: [
        {
          server: 'filesystem',
          serverDisplayName: 'Filesystem',
          name: 'read_file',
          description: 'Read file contents',
          enabled: true,
          categories: ['filesystem'],
        },
        {
          server: 'filesystem',
          serverDisplayName: 'Filesystem',
          name: 'write_file',
          description: 'Write file contents',
          enabled: true,
          categories: ['filesystem'],
        },
        {
          server: 'web',
          serverDisplayName: 'Web Search',
          name: 'search',
          description: 'Search the web',
          enabled: false,
          categories: ['web', 'search'],
        },
      ],
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ToolsResponseSchema.parse(response)).not.toThrow();
  });
});

// ============================================================================
// Health Schema Tests
// ============================================================================

describe('HealthResponseSchema', () => {
  it('should validate health check response with no servers', () => {
    const response = {
      status: 'ok' as const,
      state: 'ready' as const,
      server_id: 'test-server',
      activeClients: 0,
      timestamp: '2025-01-08T12:00:00.000Z',
      servers: [],
    };

    expect(() => HealthResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate health response with servers', () => {
    const response = {
      status: 'ok' as const,
      state: 'ready' as const,
      server_id: 'test-server',
      activeClients: 5,
      timestamp: '2025-01-08T12:00:00.000Z',
      servers: [
        {
          name: 'filesystem',
          displayName: 'Filesystem',
          description: 'File operations',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [],
            resources: [],
            resourceTemplates: [],
            prompts: []
          },
          uptime: 54321,
          lastStarted: '2025-01-08T11:00:00.000Z',
          authorizationUrl: null,
          serverInfo: { name: 'filesystem', version: '1.0.0' },
          config_source: 'mcp-servers.json',
        },
      ],
    };

    expect(() => HealthResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate server with populated capabilities', () => {
    const response = {
      status: 'ok' as const,
      state: 'ready' as const,
      server_id: 'test-server',
      activeClients: 1,
      timestamp: '2025-01-08T12:00:00.000Z',
      servers: [
        {
          name: 'mcp-server',
          displayName: 'MCP Server',
          description: 'Test MCP server',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [
              {
                name: 'read_file',
                description: 'Read file contents',
                inputSchema: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' }
                  },
                  required: ['path']
                }
              }
            ],
            resources: [
              {
                name: 'file-system',
                uri: 'file:///home/user',
                description: 'File system access',
                mimeType: 'application/json'
              }
            ],
            resourceTemplates: [
              {
                name: 'file-template',
                uriTemplate: 'file:///{path}',
                description: 'File access template',
                mimeType: 'text/plain'
              }
            ],
            prompts: [
              {
                name: 'analyze-code',
                description: 'Analyze code for issues',
                arguments: [
                  {
                    name: 'language',
                    description: 'Programming language',
                    required: true
                  }
                ]
              }
            ]
          },
          uptime: 12345,
          lastStarted: '2025-01-08T11:00:00.000Z',
          authorizationUrl: null,
          serverInfo: { name: 'mcp-server', version: '1.0.0' },
          config_source: 'mcp-servers.json',
        },
      ],
    };

    expect(() => HealthResponseSchema.parse(response)).not.toThrow();
  });

  it('should reject server with invalid tool (missing name)', () => {
    const response = {
      status: 'ok' as const,
      state: 'ready' as const,
      server_id: 'test-server',
      activeClients: 1,
      timestamp: '2025-01-08T12:00:00.000Z',
      servers: [
        {
          name: 'mcp-server',
          displayName: 'MCP Server',
          description: 'Test',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [
              {
                description: 'Missing name field'
              }
            ],
            resources: [],
            resourceTemplates: [],
            prompts: []
          },
          uptime: 0,
          lastStarted: null,
          authorizationUrl: null,
          serverInfo: null,
          config_source: 'mcp-servers.json',
        },
      ],
    };

    expect(() => HealthResponseSchema.parse(response)).toThrow();
  });

  it('should reject server with invalid resource (missing uri)', () => {
    const response = {
      status: 'ok' as const,
      state: 'ready' as const,
      server_id: 'test-server',
      activeClients: 1,
      timestamp: '2025-01-08T12:00:00.000Z',
      servers: [
        {
          name: 'mcp-server',
          displayName: 'MCP Server',
          description: 'Test',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [],
            resources: [
              {
                name: 'resource-name',
                description: 'Missing URI field'
              }
            ],
            resourceTemplates: [],
            prompts: []
          },
          uptime: 0,
          lastStarted: null,
          authorizationUrl: null,
          serverInfo: null,
          config_source: 'mcp-servers.json',
        },
      ],
    };

    expect(() => HealthResponseSchema.parse(response)).toThrow();
  });
});
