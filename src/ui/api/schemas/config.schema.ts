/**
 * Configuration-related Zod schemas
 * Validates config data and API responses from /api/config
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Server configuration object for mcpServers
 */
export const ServerConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  disabled: z.boolean().optional(),
  url: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  dev: z
    .object({
      enabled: z.boolean().optional(),
      watch: z.array(z.string()).optional(),
      cwd: z.string().optional(),
    })
    .optional(),
  connectionPool: z
    .object({
      enabled: z.boolean().optional(),
      maxConnections: z.number().optional(),
      keepAliveTimeout: z.number().optional(),
      maxFreeConnections: z.number().optional(),
    })
    .optional(),
});

/**
 * Prompt-based filtering configuration
 */
export const PromptBasedFilteringSchema = z.object({
  enabled: z.boolean(),
  defaultExposure: z.enum(['zero', 'meta-only', 'minimal', 'all']),
  enableMetaTools: z.boolean(),
  sessionIsolation: z.boolean(),
});

/**
 * Server filter configuration
 */
export const ServerFilterSchema = z.object({
  mode: z.enum(['allowlist', 'blocklist']),
  servers: z.array(z.string()),
});

/**
 * LLM categorization configuration
 */
export const LLMCategorizationSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['gemini', 'openai', 'anthropic']),
  apiKey: z.string(),
  model: z.string(),
});

/**
 * Tool filtering configuration
 */
export const ToolFilteringSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['static', 'server-allowlist', 'category', 'prompt-based']).optional(),
  comment: z.string().optional(),
  promptBasedFiltering: PromptBasedFilteringSchema.optional(),
  serverFilter: ServerFilterSchema.optional(),
  llmCategorization: LLMCategorizationSchema.optional(),
});

/**
 * Connection pool configuration
 */
export const ConnectionPoolSchema = z.object({
  enabled: z.boolean().optional(),
  keepAliveTimeout: z.number().optional(),
  maxConnections: z.number().optional(),
  maxFreeConnections: z.number().optional(),
});

/**
 * Complete configuration data
 */
export const ConfigDataSchema = z.object({
  toolFiltering: ToolFilteringSchema.optional(),
  connectionPool: ConnectionPoolSchema.optional(),
  mcpServers: z.record(z.string(), ServerConfigSchema),
});

/**
 * Response from /api/config endpoint
 */
export const ConfigResponseSchema = z.object({
  config: ConfigDataSchema,
  version: z.string(),
  timestamp: z.string().datetime()
});

/**
 * Request body for saving configuration
 */
export const ConfigSaveRequestSchema = z.object({
  config: ConfigDataSchema,
});

// Type exports
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type PromptBasedFiltering = z.infer<typeof PromptBasedFilteringSchema>;
export type ServerFilter = z.infer<typeof ServerFilterSchema>;
export type LLMCategorization = z.infer<typeof LLMCategorizationSchema>;
export type ToolFiltering = z.infer<typeof ToolFilteringSchema>;
export type ConnectionPool = z.infer<typeof ConnectionPoolSchema>;
export type ConfigData = z.infer<typeof ConfigDataSchema>;
export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;
export type ConfigSaveRequest = z.infer<typeof ConfigSaveRequestSchema>;

// Alias for backwards compatibility
export type HubConfig = ConfigData;
