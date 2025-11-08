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
  capabilities: z.object({
    tools: z.array(z.any()),
    resources: z.array(z.any()),
    resourceTemplates: z.array(z.any()),
    prompts: z.array(z.any()),
  }),
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
  state: z.enum(['starting', 'ready', 'restarting', 'stopped']),
  server_id: z.string(),
  activeClients: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  servers: z.array(HealthServerInfoSchema),
});

// Type exports
export type HealthServerInfo = z.infer<typeof HealthServerInfoSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
