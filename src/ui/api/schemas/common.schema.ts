/**
 * Common Zod schemas and utilities
 *
 * CURRENT API FORMAT (flat structure, no envelope)
 * This file contains shared schema utilities.
 * Envelope structures removed - documented in SCHEMA_API_MISMATCH_ANALYSIS.md
 */
import { z } from 'zod';

/**
 * Common error object structure
 * Used by API client for error handling
 */
export const ErrorObjectSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

/**
 * Common pagination metadata
 * For future paginated endpoints
 */
export const PaginationMetadataSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

// Type exports
export type ErrorObject = z.infer<typeof ErrorObjectSchema>;
export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;
