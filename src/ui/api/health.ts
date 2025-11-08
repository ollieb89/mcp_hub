import { request } from "./client";
import {
  HealthResponseSchema,
  type HealthResponse,
} from "./schemas/health.schema";

/**
 * Fetch hub health status and server states
 * @returns Promise with validated health data
 * @throws APIError if request fails or validation fails
 */
export function getHealth(): Promise<HealthResponse> {
  return request("/api/health", HealthResponseSchema);
}
