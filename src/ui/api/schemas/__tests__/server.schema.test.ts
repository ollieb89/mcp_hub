import { describe, it, expect } from 'vitest';
import {
  ServerStatusSchema,
  ServerInfoSchema,
  ServersResponseSchema,
  ServerResponseSchema,
} from '../server.schema';

describe('ServerStatusSchema', () => {
  it('should validate all valid status values', () => {
    const validStatuses = ['connected', 'connecting', 'disconnected', 'unauthorized', 'disabled'];

    validStatuses.forEach((status) => {
      expect(() => ServerStatusSchema.parse(status)).not.toThrow();
    });
  });

  it('should reject invalid status values', () => {
    expect(() => ServerStatusSchema.parse('invalid')).toThrow();
    expect(() => ServerStatusSchema.parse('active')).toThrow();
    expect(() => ServerStatusSchema.parse('')).toThrow();
  });
});

describe('ServerInfoSchema', () => {
  it('should validate minimal server info', () => {
    const server = {
      name: 'github',
      status: 'connected' as const,
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should validate complete server info with all fields', () => {
    const server = {
      name: 'filesystem',
      status: 'connected' as const,
      displayName: 'Local Filesystem',
      transportType: 'stdio' as const,
      uptime: 12345,
      disabled: false,
      lastError: 'Connection failed', // lastError is string or undefined, not null
      capabilities: {
        tools: [
          { name: 'read_file', description: 'Read a file' },
          { name: 'write_file', description: 'Write a file' },
        ],
      },
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should validate SSE transport type', () => {
    const server = {
      name: 'remote-server',
      status: 'connected' as const,
      transportType: 'sse' as const,
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should validate streamable-http transport type', () => {
    const server = {
      name: 'oauth-server',
      status: 'connected' as const,
      transportType: 'streamable-http' as const,
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should reject invalid transport type', () => {
    const server = {
      name: 'server',
      status: 'connected' as const,
      transportType: 'invalid',
    };

    expect(() => ServerInfoSchema.parse(server)).toThrow();
  });

  it('should reject negative uptime', () => {
    const server = {
      name: 'server',
      status: 'connected' as const,
      uptime: -100,
    };

    expect(() => ServerInfoSchema.parse(server)).toThrow();
  });

  it('should handle missing optional fields', () => {
    const server = {
      name: 'minimal-server',
      status: 'disconnected' as const,
    };

    const result = ServerInfoSchema.parse(server);
    expect(result.displayName).toBeUndefined();
    expect(result.transportType).toBeUndefined();
    expect(result.uptime).toBeUndefined();
  });
});

describe('ServersResponseSchema', () => {
  it('should validate empty servers list', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: [],
    };

    expect(() => ServersResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate response with multiple servers', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: [
        {
          name: 'filesystem',
          status: 'connected' as const,
          transportType: 'stdio' as const,
        },
        {
          name: 'github',
          status: 'connected' as const,
          displayName: 'GitHub MCP',
        },
        {
          name: 'disabled-server',
          status: 'disabled' as const,
          disabled: true,
        },
      ],
    };

    expect(() => ServersResponseSchema.parse(response)).not.toThrow();
  });

  it('should reject invalid server data', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: [
        {
          // missing required 'name' field
          status: 'connected',
        },
      ],
    };

    expect(() => ServersResponseSchema.parse(response)).toThrow();
  });
});

describe('ServerResponseSchema', () => {
  it('should validate single server response', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
      },
      data: {
        name: 'filesystem',
        status: 'connected' as const,
        uptime: 54321,
      },
    };

    expect(() => ServerResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate detailed server response', () => {
    const response = {
      status: 'success' as const,
      meta: {
        timestamp: '2025-01-08T12:00:00.000Z',
        requestId: 'req-789',
      },
      data: {
        name: 'github',
        status: 'connected' as const,
        displayName: 'GitHub MCP Server',
        transportType: 'sse' as const,
        uptime: 123456,
        capabilities: {
          tools: [
            { name: 'create_issue', description: 'Create GitHub issue' },
          ],
        },
      },
    };

    expect(() => ServerResponseSchema.parse(response)).not.toThrow();
  });
});
