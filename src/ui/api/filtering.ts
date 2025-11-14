import { z } from "zod";
import { request } from "./client";
import {
  FilteringStatsSchema,
  FilteringModeSchema,
  type FilteringStats,
  type FilteringMode,
} from "./schemas/filtering.schema";

// Re-export types for convenience
export type { FilteringStats, FilteringMode };

/**
 * Response schema for filtering mutations (enable/mode changes)
 */
const FilteringMutationResponseSchema = z.object({
  status: z.string(),
  toolFiltering: z.object({
    enabled: z.boolean().optional(),
    mode: FilteringModeSchema.optional(),
  }),
});

export type FilteringMutationResponse = z.infer<typeof FilteringMutationResponseSchema>;

/**
 * Fetch current tool filtering statistics
 * @returns Promise with validated filtering stats
 * @throws APIError if request fails or validation fails
 */
export function getFilteringStats(): Promise<FilteringStats> {
  return request("/api/filtering/stats", FilteringStatsSchema);
}

/**
 * Enable or disable tool filtering
 * @param enabled - Whether filtering should be enabled
 * @returns Promise with mutation confirmation
 * @throws APIError if request fails
 */
export function setFilteringEnabled(enabled: boolean): Promise<FilteringMutationResponse> {
  return request(
    "/api/filtering/status",
    FilteringMutationResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }
  );
}

/**
 * Change tool filtering mode
 * @param mode - Filtering mode to set
 * @returns Promise with mutation confirmation
 * @throws APIError if request fails
 */
export function setFilteringMode(mode: FilteringMode): Promise<FilteringMutationResponse> {
  return request(
    "/api/filtering/mode",
    FilteringMutationResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({ mode }),
    }
  );
}
