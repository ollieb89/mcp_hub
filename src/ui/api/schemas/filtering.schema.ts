/**
 * Tool filtering-related Zod schemas
 * Validates filtering stats from /api/filtering/stats
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This schema matches the existing backend API response format.
 * Future migration to envelope structure documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Filtering mode enum
 */
export const FilteringModeSchema = z.enum([
  'static',
  'server-allowlist',
  'category',
  'hybrid',
  'prompt-based',
]);

/**
 * Filtering statistics response from /api/filtering/stats
 */
export const FilteringStatsSchema = z.object({
  enabled: z.boolean(),
  mode: FilteringModeSchema,
  totalTools: z.number().int().nonnegative(),
  filteredTools: z.number().int().nonnegative(),
  exposedTools: z.number().int().nonnegative(),
  filterRate: z.number().nonnegative(),
  serverFilterMode: z.enum(['allowlist', 'blocklist']),
  allowedServers: z.array(z.string()),
  allowedCategories: z.array(z.string()),
  categoryCacheSize: z.number().int().nonnegative(),
  cacheHitRate: z.number().nonnegative(),
  llmCacheSize: z.number().int().nonnegative(),
  llmCacheHitRate: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

// Type exports
export type FilteringMode = z.infer<typeof FilteringModeSchema>;
export type FilteringStats = z.infer<typeof FilteringStatsSchema>;
