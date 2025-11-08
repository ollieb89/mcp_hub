/**
 * Server action schemas for start/stop/refresh operations
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';
import { ServerInfoSchema } from './server.schema';

/**
 * Request schema for server actions (start, stop, refresh)
 */
export const ServerActionRequestSchema = z.object({
  server_name: z.string()
});

/**
 * Response schema for server actions
 */
export const ServerActionResponseSchema = z.object({
  status: z.literal("ok"),
  server: ServerInfoSchema,
  timestamp: z.string().datetime()
});

// Type exports
export type ServerActionRequest = z.infer<typeof ServerActionRequestSchema>;
export type ServerActionResponse = z.infer<typeof ServerActionResponseSchema>;
