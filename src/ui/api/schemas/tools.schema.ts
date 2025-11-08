/**
 * Tools-related Zod schemas
 * Validates tool data and API responses from /api/tools
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Tool summary object from /api/tools
 */
export const ToolSummarySchema = z.object({
  server: z.string(),
  serverDisplayName: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  categories: z.array(z.string()),
});

/**
 * Response from /api/tools endpoint
 */
export const ToolsResponseSchema = z.object({
  tools: z.array(ToolSummarySchema),
  timestamp: z.string().datetime()
});

// Type exports
export type ToolSummary = z.infer<typeof ToolSummarySchema>;
export type ToolsResponse = z.infer<typeof ToolsResponseSchema>;
