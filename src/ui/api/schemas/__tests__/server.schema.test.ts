import { describe, it, expect } from 'vitest';
import {
  ServerStatusSchema,
  ServerInfoSchema,
  ServersResponseSchema,
} from '../server.schema';

describe('ServerStatusSchema', () => {
  it('should validate all valid status values', () => {
    const validStatuses = ['connected', 'connecting', 'disconnected', 'error', 'unauthorized', 'disabled'];

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
  const validServer = {
    name: 'github',
    displayName: 'GitHub MCP Server',
    description: 'GitHub integration server',
    transportType: 'stdio' as const,
    status: 'connected' as const,
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
    config_source: 'config.json',
  };

  it('should validate complete server info with all required fields', () => {
    expect(() => ServerInfoSchema.parse(validServer)).not.toThrow();
  });

  it('should validate server info with populated capabilities', () => {
    const server = {
      ...validServer,
      name: 'filesystem',
      displayName: 'Local Filesystem',
      description: 'Access local filesystem',
      capabilities: {
        tools: [
          { name: 'read_file', description: 'Read a file', inputSchema: {} },
          { name: 'write_file', description: 'Write a file', inputSchema: {} },
        ],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
      uptime: 12345,
      lastStarted: '2025-01-08T12:00:00.000Z',
      serverInfo: {
        name: 'filesystem-server',
        version: '1.0.0',
      },
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should validate SSE transport type', () => {
    const server = {
      ...validServer,
      transportType: 'sse' as const,
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should validate streamable-http transport type', () => {
    const server = {
      ...validServer,
      transportType: 'streamable-http' as const,
      authorizationUrl: 'https://oauth.example.com/authorize',
    };

    expect(() => ServerInfoSchema.parse(server)).not.toThrow();
  });

  it('should reject invalid transport type', () => {
    const server = {
      ...validServer,
      transportType: 'invalid',
    };

    expect(() => ServerInfoSchema.parse(server)).toThrow();
  });

  it('should reject negative uptime', () => {
    const server = {
      ...validServer,
      uptime: -100,
    };

    expect(() => ServerInfoSchema.parse(server)).toThrow();
  });
});

describe('ServersResponseSchema', () => {
  it('should validate empty servers list', () => {
    const response = {
      servers: [],
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ServersResponseSchema.parse(response)).not.toThrow();
  });

  it('should validate response with multiple servers', () => {
    const response = {
      servers: [
        {
          name: 'filesystem',
          displayName: 'Filesystem Server',
          description: 'Access filesystem',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [],
            resources: [],
            resourceTemplates: [],
            prompts: [],
          },
          uptime: 100,
          lastStarted: null,
          authorizationUrl: null,
          serverInfo: null,
          config_source: 'config.json',
        },
        {
          name: 'github',
          displayName: 'GitHub MCP',
          description: 'GitHub integration',
          transportType: 'stdio' as const,
          status: 'connected' as const,
          error: null,
          capabilities: {
            tools: [],
            resources: [],
            resourceTemplates: [],
            prompts: [],
          },
          uptime: 200,
          lastStarted: null,
          authorizationUrl: null,
          serverInfo: null,
          config_source: 'config.json',
        },
      ],
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ServersResponseSchema.parse(response)).not.toThrow();
  });

  it('should reject invalid server data', () => {
    const response = {
      servers: [
        {
          // missing required fields
          name: 'incomplete',
          status: 'connected' as const,
        },
      ],
      timestamp: '2025-01-08T12:00:00.000Z',
    };

    expect(() => ServersResponseSchema.parse(response)).toThrow();
  });
});

// Note: ServerResponseSchema removed - envelope pattern no longer used
// API now returns flat structures without envelope (status/meta/data)
// See SCHEMA_API_MISMATCH_ANALYSIS.md for migration details
