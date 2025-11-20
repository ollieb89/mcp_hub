/**
 * Integration tests for capabilities schema with real backend responses.
 *
 * Tests validate schema behavior with actual MCP Hub health endpoint data.
 * Updated to match current flat API structure (no envelope pattern).
 */

import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from '../health.schema';
import type { HealthResponse, HealthServerInfo } from '../health.schema';

// ============================================================================
// Sample Backend Responses (matching actual API structure)
// ============================================================================

const createValidServer = (overrides: Partial<HealthServerInfo> = {}): HealthServerInfo => ({
  name: 'github',
  displayName: 'GitHub MCP Server',
  description: 'GitHub integration server',
  transportType: 'stdio',
  status: 'connected',
  error: null,
  capabilities: {
    tools: [],
    resources: [],
    resourceTemplates: [],
    prompts: [],
  },
  uptime: 12345,
  lastStarted: '2025-01-08T12:00:00.000Z',
  authorizationUrl: null,
  serverInfo: {
    name: 'github-mcp',
    version: '1.0.0',
  },
  config_source: 'config.json',
  ...overrides,
});

const VALID_HEALTH_RESPONSE: HealthResponse = {
  status: 'ok',
  state: 'ready',
  server_id: 'hub-instance-1',
  version: '1.0.0',
  activeClients: 2,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [
    createValidServer({
      name: 'github',
      displayName: 'GitHub MCP Server',
      description: 'GitHub integration',
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
            inputSchema: {},
          },
        ],
        resources: [
          {
            name: 'GitHub Notifications',
            uri: 'github://notifications',
            description: 'List of GitHub notifications',
            contentType: 'application/json',
          },
        ],
        resourceTemplates: [
          {
            name: 'GitHub Issue',
            uriTemplate: 'github://{owner}/{repo}/issues/{number}',
            description: 'Access specific GitHub issue',
            contentType: 'application/json',
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
    }),
    createValidServer({
      name: 'filesystem',
      displayName: 'Filesystem Server',
      description: 'Local filesystem access',
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
            name: 'File',
            uriTemplate: 'file:///{path}',
            description: 'Access local file',
            contentType: 'text/plain',
          },
        ],
        prompts: [],
      },
    }),
  ],
};

const DISCONNECTED_SERVER_RESPONSE: HealthResponse = {
  status: 'ok',
  state: 'ready',
  server_id: 'hub-instance-1',
  version: '1.0.0',
  activeClients: 1,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [
    createValidServer({
      name: 'broken-server',
      displayName: 'Broken Server',
      description: 'Server with connection issues',
      status: 'disconnected',
      error: 'Connection timeout after 30s',
      uptime: 0,
      lastStarted: null,
    }),
  ],
};

const MINIMAL_CAPABILITIES_RESPONSE: HealthResponse = {
  status: 'ok',
  state: 'ready',
  server_id: 'hub-instance-1',
  version: '1.0.0',
  activeClients: 0,
  timestamp: '2025-01-08T12:00:00.000Z',
  servers: [
    createValidServer({
      name: 'minimal-server',
      displayName: 'Minimal Server',
      description: 'Server with no capabilities',
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
    }),
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
        expect(result.data.servers).toHaveLength(2);
        expect(result.data.servers[0].capabilities.tools).toHaveLength(2);
        expect(result.data.servers[0].capabilities.resources).toHaveLength(1);
        expect(result.data.servers[0].capabilities.prompts).toHaveLength(1);
      }
    });

    it('should validate response with disconnected server', () => {
      const result = HealthResponseSchema.safeParse(DISCONNECTED_SERVER_RESPONSE);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.servers[0].status).toBe('disconnected');
        expect(result.data.servers[0].error).toBe('Connection timeout after 30s');
      }
    });

    it('should validate response with error status server', () => {
      const response: HealthResponse = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            status: 'error',
            error: 'Failed to initialize',
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should handle server with minimal capabilities', () => {
      const result = HealthResponseSchema.safeParse(MINIMAL_CAPABILITIES_RESPONSE);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.servers[0].capabilities.tools).toEqual([]);
        expect(result.data.servers[0].capabilities.resources).toEqual([]);
      }
    });

    it('should allow tools without description (MCP protocol allows optional)', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            capabilities: {
              tools: [
                {
                  name: 'minimal_tool',
                  // description is optional per MCP spec
                  inputSchema: {},
                },
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should allow prompts with optional arguments', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            capabilities: {
              tools: [],
              resources: [],
              resourceTemplates: [],
              prompts: [
                {
                  name: 'simple-prompt',
                  description: 'Simple prompt without arguments',
                  // arguments is optional
                },
              ],
            },
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid backend responses', () => {
    it('should reject response with missing required tool name', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            capabilities: {
              tools: [
                {
                  // missing required name field
                  description: 'Tool without name',
                  inputSchema: {},
                } as any,
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = JSON.stringify(result.error.issues);
        expect(errorMessage).toContain('name');
      }
    });

    it('should reject response with malformed resource (missing uri)', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            capabilities: {
              tools: [],
              resources: [
                {
                  name: 'broken_resource',
                  // missing required uri field
                  description: 'Test',
                  contentType: 'text/plain',
                } as any,
              ],
              resourceTemplates: [],
              prompts: [],
            },
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = JSON.stringify(result.error.issues);
        expect(errorMessage).toContain('uri');
      }
    });

    it('should reject response with invalid tool name (empty string)', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          createValidServer({
            capabilities: {
              tools: [
                {
                  name: '', // empty string not valid
                  description: 'Empty name tool',
                  inputSchema: {},
                },
              ],
              resources: [],
              resourceTemplates: [],
              prompts: [],
            },
          }),
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      // Schema uses .min(1) validation which rejects empty strings
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject response with missing required server fields', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            name: 'incomplete-server',
            // missing many required fields
          } as any,
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject response with invalid server status', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...createValidServer(),
            status: 'invalid_status',
          } as any,
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = JSON.stringify(result.error.issues);
        expect(errorMessage).toContain('status');
      }
    });
  });

  describe('type inference with real data', () => {
    it('should provide correct TypeScript types for nested capabilities', () => {
      const response: HealthResponse = VALID_HEALTH_RESPONSE;

      // Type assertions - will fail at compile time if types are wrong
      const firstServer = response.servers[0];
      const tool = firstServer.capabilities.tools[0];
      const resource = firstServer.capabilities.resources[0];
      const prompt = firstServer.capabilities.prompts[0];

      // Verify TypeScript inferred correct types
      expect(tool.name).toBe('github__create_issue');
      expect(resource.uri).toBe('github://notifications');
      expect(prompt.name).toBe('analyze-pr');
    });
  });

  describe('error message quality', () => {
    it('should provide descriptive error for missing required field', () => {
      const response = {
        status: 'ok',
        state: 'ready',
        server_id: 'test',
        activeClients: 0,
        timestamp: '2025-01-08T12:00:00.000Z',
        // missing 'servers' field
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        expect(errorMessage).toBeTruthy();
      }
    });

    it('should provide path information for nested validation errors', () => {
      const response = {
        ...VALID_HEALTH_RESPONSE,
        servers: [
          {
            ...createValidServer(),
            status: 'invalid_status',
          } as any,
        ],
      };

      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue.path).toContain('servers');
        expect(issue.path).toContain('status');
      }
    });
  });

  describe('React Query Hook Integration', () => {
    it('should work with typical React Query usage pattern', () => {
      // Simulate data from React Query
      const queryData: HealthResponse = VALID_HEALTH_RESPONSE;

      // Validate at runtime (what React Query would do)
      const result = HealthResponseSchema.safeParse(queryData);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type-safe access to nested data
        const serverNames = result.data.servers.map((s) => s.name);
        expect(serverNames).toContain('github');
        expect(serverNames).toContain('filesystem');
      }
    });
  });
});
