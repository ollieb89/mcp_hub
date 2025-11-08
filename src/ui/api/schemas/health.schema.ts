/**
 * Health-related Zod schemas
 * Validates health check and hub state responses from /api/health
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * MCP Tool schema (minimal validation for capabilities)
 * Based on MCP protocol specification
 */
export const ToolSchemaMinimal = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
});

/**
 * MCP Resource schema (minimal validation for capabilities)
 * Based on MCP protocol specification
 */
export const ResourceSchemaMinimal = z.object({
  name: z.string(),
  uri: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * MCP Resource Template schema (minimal validation for capabilities)
 * Based on MCP protocol specification
 */
export const ResourceTemplateSchemaMinimal = z.object({
  name: z.string(),
  uriTemplate: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * MCP Prompt schema (minimal validation for capabilities)
 * Based on MCP protocol specification
 */
export const PromptSchemaMinimal = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
});

/**
 * MCP Capabilities schema
 * Combines all capability types with proper validation
 */
export const CapabilitiesSchema = z.object({
  tools: z.array(ToolSchemaMinimal),
  resources: z.array(ResourceSchemaMinimal),
  resourceTemplates: z.array(ResourceTemplateSchemaMinimal),
  prompts: z.array(PromptSchemaMinimal),
});

/**
 * Server info as returned in health check
 * Subset of full ServerInfo from server.schema.ts
 */
export const HealthServerInfoSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  transportType: z.enum(['stdio', 'sse', 'streamable-http']),
  status: z.enum(['connected', 'connecting', 'disconnected', 'error']),
  error: z.string().nullable(),
  capabilities: CapabilitiesSchema,
  uptime: z.number().nonnegative(),
  lastStarted: z.string().datetime().nullable(),
  authorizationUrl: z.string().url().nullable(),
  serverInfo: z
    .object({
      name: z.string(),
      version: z.string(),
    })
    .nullable(),
  config_source: z.string(),
});

/**
 * Health check response from /api/health
 * Returns hub state and server statuses
 */
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  state: z.enum(['starting', 'ready', 'restarting', 'restarted', 'stopped', 'stopping', 'error']),
  server_id: z.string(),
  version: z.string().optional(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
  connections: z.object({
    totalConnections: z.number(),
    connections: z.array(z.object({
      id: z.string(),
      state: z.string(),
      connectedAt: z.string().datetime(),
      lastEventAt: z.string().datetime()
    }))
  }).optional(),
  mcpEndpoint: z.object({
    totalConnections: z.number(),
    activeConnections: z.number(),
    totalRequests: z.number()
  }).optional(),
  workspaces: z.object({
    current: z.string(),
    allActive: z.array(z.object({
      key: z.string(),
      port: z.number(),
      configPaths: z.array(z.string()),
      pid: z.number(),
      state: z.string(),
      activeConnections: z.number()
    }))
  }).optional()
});

// Type exports
export type ToolMinimal = z.infer<typeof ToolSchemaMinimal>;
export type ResourceMinimal = z.infer<typeof ResourceSchemaMinimal>;
export type ResourceTemplateMinimal = z.infer<typeof ResourceTemplateSchemaMinimal>;
export type PromptMinimal = z.infer<typeof PromptSchemaMinimal>;
export type Capabilities = z.infer<typeof CapabilitiesSchema>;
export type HealthServerInfo = z.infer<typeof HealthServerInfoSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
