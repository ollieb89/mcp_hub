/**
 * Integration tests for capabilities schema with real backend responses.
 *
 * Tests validate schema behavior with actual MCP Hub health endpoint data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HealthResponseSchema } from '../health.schema';
import type { HealthResponse } from '../health.schema';

// ============================================================================
// Sample Backend Responses (from actual MCP Hub instances)
// ============================================================================

const VALID_HEALTH_RESPONSE: HealthResponse = {
  status: 'ok',
  timestamp: '2025-01-08T12:00:00Z',
  totalServers: 2,
  connectedServers: 2,
  version: '1.0.0',
  servers: [
    {
      serverName: 'github',
      enabled: true,
      connectionState: 'connected',
      transportType: 'stdio',
      lastError: null,
      protocolVersion: '2025-03-26',
      capabilities: {
        tools: [
          {
            name: 'github__create_issue',
            description: 'Create a new GitHub issue',
            inputSchema: {
              type: 'object',
              properties: {
                repository: { type: 'string' },
                title: { type: 'string' },
                body: { type: 'string' },
              },
              required: ['repository', 'title'],
            },
          },
          {
            name: 'github__search_repos',
            description: 'Search GitHub repositories',
          },
        ],
        resources: [
          {
            uri: 'github://notifications',
            name: 'GitHub Notifications',
            mimeType: 'application/json',
            description: 'List of GitHub notifications',
          },
        ],
        resourceTemplates: [
          {
            uriTemplate: 'github://{owner}/{repo}/issues/{number}',
            name: 'GitHub Issue',
            mimeType: 'application/json',
          },
        ],
        prompts: [
          {
            name: 'analyze-pr',
            description: 'Analyze pull request for code quality',
            arguments: [
              {
                name: 'pr_number',
                description: 'Pull request number',
                required: true,
              },
            ],
          },
        ],
      },
    },
    {
      serverName: 'filesystem',
      enabled: true,
      connectionState: 'connected',
      transportType: 'stdio',
      lastError: null,
      protocolVersion: '2025-03-26',
      capabilities: {
        tools: [
          {
            name: 'filesystem__read',
            description: 'Read file contents',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
              required: ['path'],
            },
          },
        ],
        resources: [],
        resourceTemplates: [
          {
            uriTemplate: 'file:///{path}',
            name: 'File',
          },
        ],
        prompts: [],
      },
    },
  ],
};

const DISCONNECTED_SERVER_RESPONSE: HealthResponse = {
  status: 'degraded',
  timestamp: '2025-01-08T12:00:00Z',
  totalServers: 1,
  connectedServers: 0,
  servers: [
    {
      serverName: 'broken-server',
      enabled: true,
      connectionState: 'disconnected',
      transportType: null,
      lastError: 'Connection timeout',
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
    },
  ],
};

const UNAUTHORIZED_SERVER_RESPONSE: HealthResponse = {
  status: 'degraded',
  timestamp: '2025-01-08T12:00:00Z',
  totalServers: 1,
  connectedServers: 0,
  servers: [
    {
      serverName: 'oauth-server',
      enabled: true,
      connectionState: 'unauthorized',
      transportType: 'streamable-http',
      lastError: 'OAuth authorization required',
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
    },
  ],
};

// ============================================================================
// Integration Tests
// ============================================================================

describe('HealthResponse Schema Integration', () => {
  describe('valid backend responses', () => {
    it('should validate complete multi-server health response', () => {
      const result = HealthResponseSchema.safeParse(VALID_HEALTH_RESPONSE);

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify structure
        expect(result.data.status).toBe('ok');
        expect(result.data.servers).toHaveLength(2);

        // Verify first server capabilities
        const githubServer = result.data.servers[0];
        expect(githubServer.serverName).toBe('github');
        expect(githubServer.capabilities.tools).toHaveLength(2);
        expect(githubServer.capabilities.resources).toHaveLength(1);

        // Verify tool structure
        const createIssueTool = githubServer.capabilities.tools[0];
        expect(createIssueTool.name).toBe('github__create_issue');
        expect(createIssueTool.inputSchema).toBeDefined();
        expect(createIssueTool.inputSchema?.type).toBe('object');

        // Verify resource structure
        const notificationsResource = githubServer.capabilities.resources[0];
        expect(notificationsResource.uri).toBe('github://notifications');
        expect(notificationsResource.mimeType).toBe('application/json');
      }
    });

    it('should validate response with disconnected server', () => {
      const result = HealthResponseSchema.safeParse(DISCONNECTED_SERVER_RESPONSE);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('degraded');
        const server = result.data.servers[0];
        expect(server.connectionState).toBe('disconnected');
        expect(server.lastError).toBe('Connection timeout');
        expect(server.transportType).toBeNull();

        // Empty capabilities should still be valid
        expect(server.capabilities.tools).toEqual([]);
        expect(server.capabilities.resources).toEqual([]);
      }
    });

    it('should validate response with unauthorized server', () => {
      const result = HealthResponseSchema.safeParse(UNAUTHORIZED_SERVER_RESPONSE);

      expect(result.success).toBe(true);
      if (result.success) {
        const server = result.data.servers[0];
        expect(server.connectionState).toBe('unauthorized');
        expect(server.transportType).toBe('streamable-http');
        expect(server.lastError).toContain('OAuth');
      }
    });

    it('should handle server with minimal capabilities', () => {
      const minimalResponse = {
        status: 'ok' as const,
        timestamp: '2025-01-08T12:00:00Z',
        totalServers: 1,
        connectedServers: 1,
        servers: [
          {
            serverName: 'minimal',
            enabled: true,
            connectionState: 'connected' as const,
            transportType: 'stdio' as const,
            lastError: null,
            capabilities: {
              tools: [],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(minimalResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid backend responses', () => {
    it('should reject response with malformed tool (missing description)', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [
                {
                  name: 'test-tool',
                  // Missing required description field
                },
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('description');
      }
    });

    it('should reject response with malformed resource (missing uri)', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [],
              resources: [
                {
                  name: 'Resource Name',
                  // Missing required uri field
                },
              ],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('uri');
      }
    });

    it('should reject response with empty tool name', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [
                {
                  name: '',
                  description: 'Valid description',
                },
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject response with invalid prompt argument', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [],
              resources: [],
              resourceTemplates: [],
              prompts: [
                {
                  name: 'test-prompt',
                  arguments: [
                    {
                      name: 'arg1',
                      // Missing required field
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('required');
      }
    });

    it('should reject response with extra unknown fields in capabilities', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [],
              resources: [],
              resourceTemplates: [],
              prompts: [],
              unknownField: 'should fail',
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('unrecognized_keys');
      }
    });
  });

  describe('type inference with real data', () => {
    it('should provide correct TypeScript types for nested capabilities', () => {
      const result = HealthResponseSchema.safeParse(VALID_HEALTH_RESPONSE);

      if (result.success) {
        // TypeScript should infer these types correctly
        const server = result.data.servers[0];
        const capabilities = server.capabilities;

        // Tools array should be typed correctly
        const tools = capabilities.tools;
        expect(tools).toBeInstanceOf(Array);

        if (tools.length > 0) {
          const tool = tools[0];
          // These should not cause TypeScript errors
          const toolName: string = tool.name;
          const toolDescription: string = tool.description;
          const toolInputSchema: Record<string, unknown> | undefined = tool.inputSchema;

          expect(toolName).toBeTruthy();
          expect(toolDescription).toBeTruthy();
          expect(toolInputSchema).toBeDefined();
        }

        // Resources array should be typed correctly
        const resources = capabilities.resources;
        if (resources.length > 0) {
          const resource = resources[0];
          const uri: string = resource.uri;
          const name: string | undefined = resource.name;

          expect(uri).toBeTruthy();
          expect(name).toBeDefined();
        }
      }
    });
  });

  describe('error message quality', () => {
    it('should provide descriptive error for missing required field', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [{ name: 'test' }], // Missing description
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        // Should have descriptive error message
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });

    it('should provide path information for nested validation errors', () => {
      const invalidResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...VALID_HEALTH_RESPONSE.servers[0],
            capabilities: {
              tools: [],
              resources: [{ uri: '' }], // Empty URI
              resourceTemplates: [],
              prompts: [],
            },
          },
        ],
      };

      const result = HealthResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorPath = result.error.issues[0].path;
        // Should include full path to error
        expect(errorPath).toContain('servers');
        expect(errorPath).toContain('capabilities');
        expect(errorPath).toContain('resources');
      }
    });
  });
});

// ============================================================================
// React Query Integration Scenarios
// ============================================================================

describe('React Query Hook Integration', () => {
  it('should work with typical React Query usage pattern', () => {
    // Simulate React Query hook receiving backend data
    const queryData = VALID_HEALTH_RESPONSE;

    // Parse with schema (as useHealthQuery would do)
    const result = HealthResponseSchema.safeParse(queryData);

    expect(result.success).toBe(true);

    if (result.success) {
      // Simulate component usage
      const { servers, status, connectedServers } = result.data;

      // TypeScript should infer correct types
      expect(status).toBe('ok');
      expect(connectedServers).toBe(2);
      expect(servers).toHaveLength(2);

      // Accessing nested capabilities should have proper types
      servers.forEach((server) => {
        expect(server.capabilities.tools).toBeInstanceOf(Array);
        expect(server.capabilities.resources).toBeInstanceOf(Array);

        // All capability arrays should be safe to iterate
        server.capabilities.tools.forEach((tool) => {
          expect(tool.name).toBeTruthy();
          expect(tool.description).toBeTruthy();
        });
      });
    }
  });

  it('should handle validation errors gracefully in React Query context', () => {
    const malformedData = {
      ...VALID_HEALTH_RESPONSE,
      servers: [
        {
          ...VALID_HEALTH_RESPONSE.servers[0],
          capabilities: {
            tools: [{ invalid: 'structure' }], // Malformed tool
            resources: [],
            resourceTemplates: [],
            prompts: [],
          },
        },
      ],
    };

    const result = HealthResponseSchema.safeParse(malformedData);

    // Should fail validation
    expect(result.success).toBe(false);

    if (!result.success) {
      // Error should be actionable for error boundaries
      expect(result.error.issues).toBeInstanceOf(Array);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
