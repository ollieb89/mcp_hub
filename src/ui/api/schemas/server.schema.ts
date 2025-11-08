/**
 * Server-related Zod schemas
 * Validates server info and API responses from /api/servers
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Server connection status
 */
export const ServerStatusSchema = z.enum([
  'connected',
  'connecting',
  'disconnected',
  'error',
]);

/**
 * Tool schema for server capabilities
 */
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});

/**
 * Resource schema for server capabilities
 */
export const ResourceSchema = z.object({
  name: z.string(),
  uri: z.string(),
  description: z.string(),
  contentType: z.string(),
});

/**
 * Resource template schema for server capabilities
 */
export const ResourceTemplateSchema = z.object({
  name: z.string(),
  uriTemplate: z.string(),
  description: z.string(),
  contentType: z.string(),
});

/**
 * Prompt argument schema
 */
export const PromptArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
});

/**
 * Prompt schema for server capabilities
 */
export const PromptSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(PromptArgumentSchema).optional(),
});

/**
 * Server capabilities object
 */
export const ServerCapabilitiesSchema = z.object({
  tools: z.array(ToolSchema),
  resources: z.array(ResourceSchema),
  resourceTemplates: z.array(ResourceTemplateSchema),
  prompts: z.array(PromptSchema),
});

/**
 * Server info object from MCP protocol
 */
export const ServerInfoObjectSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/**
 * Complete server information as returned by /api/servers
 */
export const ServerInfoSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  transportType: z.enum(['stdio', 'sse', 'streamable-http']),
  status: ServerStatusSchema,
  error: z.string().nullable(),
  capabilities: ServerCapabilitiesSchema,
  uptime: z.number().nonnegative(),
  lastStarted: z.string().datetime().nullable(),
  authorizationUrl: z.string().url().nullable(),
  serverInfo: ServerInfoObjectSchema.nullable(),
  config_source: z.string(),
});

/**
 * Response from /api/servers endpoint
 */
export const ServersResponseSchema = z.object({
  servers: z.array(ServerInfoSchema),
});

// Type exports
export type ServerStatus = z.infer<typeof ServerStatusSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceTemplate = z.infer<typeof ResourceTemplateSchema>;
export type PromptArgument = z.infer<typeof PromptArgumentSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type ServerCapabilities = z.infer<typeof ServerCapabilitiesSchema>;
export type ServerInfoObject = z.infer<typeof ServerInfoObjectSchema>;
export type ServerInfo = z.infer<typeof ServerInfoSchema>;
export type ServersResponse = z.infer<typeof ServersResponseSchema>;
