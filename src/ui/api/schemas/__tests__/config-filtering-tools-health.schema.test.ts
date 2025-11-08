import { describe, it, expect } from 'vitest';
import {
  ConfigDataSchema,
  ConfigResponseSchema,
  ConfigSaveRequestSchema,
} from '../config.schema';
import {
  FilteringModeSchema,
  FilteringStatsSchema,
  FilteringStatsResponseSchema,
  FilteringModeUpdateRequestSchema,
} from '../filtering.schema';
import {
  ToolSummarySchema,
  ToolsResponseSchema,
} from '../tools.schema';
import {
  HealthDataSchema,
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
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: {
        config: {
          mcpServers: {
            github: { command: 'github-server' },
          },
        },
        version: 1,
        path: '/path/to/config.json',
      },
    };

    expect(() => ConfigResponseSchema.parse(response)).not.toThrow();
  });
});

describe('ConfigSaveRequestSchema', () => {
  it('should validate save request with version', () => {
    const request = {
      config: {
        mcpServers: {},
      },
      version: 1,
    };

    expect(() => ConfigSaveRequestSchema.parse(request)).not.toThrow();
  });

  it('should reject save request without version', () => {
    const request = {
      config: {
        mcpServers: {},
      },
    };

    expect(() => ConfigSaveRequestSchema.parse(request)).toThrow();
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
  it('should validate minimal stats', () => {
    const stats = {
      mode: 'static' as const,
      totalTools: 100,
      exposedTools: 50,
    };

    expect(() => FilteringStatsSchema.parse(stats)).not.toThrow();
  });

  it('should validate complete stats', () => {
    const stats = {
      mode: 'category' as const,
      totalTools: 100,
      exposedTools: 50,
      categorizedTools: 80,
      categories: {
        filesystem: 10,
        github: 20,
        web: 15,
      },
      serverAllowlist: ['filesystem', 'github'],
    };

    expect(() => FilteringStatsSchema.parse(stats)).not.toThrow();
  });

  it('should reject negative tool counts', () => {
    const stats = {
      mode: 'static' as const,
      totalTools: -1,
      exposedTools: 50,
    };

    expect(() => FilteringStatsSchema.parse(stats)).toThrow();
  });
});

describe('FilteringStatsResponseSchema', () => {
  it('should validate filtering stats response', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: {
        mode: 'prompt-based' as const,
        totalTools: 150,
        exposedTools: 30,
      },
    };

    expect(() => FilteringStatsResponseSchema.parse(response)).not.toThrow();
  });
});

describe('FilteringModeUpdateRequestSchema', () => {
  it('should validate mode update to static', () => {
    const request = {
      mode: 'static' as const,
    };

    expect(() => FilteringModeUpdateRequestSchema.parse(request)).not.toThrow();
  });

  it('should validate mode update with category config', () => {
    const request = {
      mode: 'category' as const,
      categoryConfig: {
        exposedCategories: ['filesystem', 'github'],
      },
    };

    expect(() => FilteringModeUpdateRequestSchema.parse(request)).not.toThrow();
  });

  it('should validate mode update with server allowlist', () => {
    const request = {
      mode: 'server-allowlist' as const,
      serverAllowlist: ['filesystem', 'github', 'web'],
    };

    expect(() => FilteringModeUpdateRequestSchema.parse(request)).not.toThrow();
  });
});

// ============================================================================
// Tools Schema Tests
// ============================================================================

describe('ToolSummarySchema', () => {
  it('should validate minimal tool summary', () => {
    const tool = {
      name: 'read_file',
      serverName: 'filesystem',
    };

    expect(() => ToolSummarySchema.parse(tool)).not.toThrow();
  });

  it('should validate complete tool summary', () => {
    const tool = {
      name: 'create_issue',
      description: 'Create a new GitHub issue',
      serverName: 'github',
      category: 'github',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
      },
    };

    expect(() => ToolSummarySchema.parse(tool)).not.toThrow();
  });
});

describe('ToolsResponseSchema', () => {
  it('should validate empty tools list', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: [],
    };

    expect(() => ToolsResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate tools response with multiple tools', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: [
        {
          name: 'read_file',
          serverName: 'filesystem',
          description: 'Read file contents',
        },
        {
          name: 'write_file',
          serverName: 'filesystem',
        },
        {
          name: 'search',
          serverName: 'web',
          category: 'web',
        },
      ],
    };

    expect(() => ToolsResponseSchema.parse(response)).not.toThrow();
  });
});

// ============================================================================
// Health Schema Tests
// ============================================================================

describe('HealthDataSchema', () => {
  it('should validate minimal health data', () => {
    const health = {
      status: 'ready' as const,
      uptime: 12345,
      servers: [],
    };

    expect(() => HealthDataSchema.parse(health)).not.toThrow();
  });

  it('should validate all health statuses', () => {
    const statuses = ['starting', 'ready', 'restarting', 'stopped'];

    statuses.forEach((status) => {
      const health = {
        status,
        uptime: 0,
        servers: [],
      };
      expect(() => HealthDataSchema.parse(health)).not.toThrow();
    });
  });

  it('should validate complete health data', () => {
    const health = {
      status: 'ready' as const,
      uptime: 123456,
      servers: [
        { name: 'filesystem', status: 'connected' },
        { name: 'github', status: 'connected' },
      ],
      activeConnections: 5,
      version: '1.0.0',
    };

    expect(() => HealthDataSchema.parse(health)).not.toThrow();
  });

  it('should reject negative uptime', () => {
    const health = {
      status: 'ready' as const,
      uptime: -100,
      servers: [],
    };

    expect(() => HealthDataSchema.parse(health)).toThrow();
  });

  it('should reject negative activeConnections', () => {
    const health = {
      status: 'ready' as const,
      uptime: 0,
      servers: [],
      activeConnections: -1,
    };

    expect(() => HealthDataSchema.parse(health)).toThrow();
  });
});

describe('HealthResponseSchema', () => {
  it('should validate health check response', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: {
        status: 'ready' as const,
        uptime: 54321,
        servers: [
          { name: 'filesystem', status: 'connected' },
        ],
      },
    };

    expect(() => HealthResponseSchema.parse(response)).not.toThrow();
  });
});
