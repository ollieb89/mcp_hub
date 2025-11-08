import { request } from "./client";
import { HealthResponse } from "./schemas";

/**
 * Fetch hub health status and server states
 *
 * @returns Health check response with hub state and all server statuses
 */
export function getHealth() {
  return request<HealthResponse>("/api/health");
}
