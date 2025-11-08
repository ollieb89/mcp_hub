import { z } from "zod";
import { request } from "./client";
import {
  ConfigResponseSchema,
  ConfigDataSchema,
  type ConfigData,
  type ConfigResponse,
} from "./schemas/config.schema";

/**
 * Response schema for config save mutation
 * Includes status field in addition to config data
 */
const ConfigSaveResponseSchema = z.object({
  status: z.string(),
  config: ConfigDataSchema,
  version: z.string(),
  timestamp: z.string().datetime(),
});

export type ConfigSaveResponse = z.infer<typeof ConfigSaveResponseSchema>;

/**
 * Fetch current MCP Hub configuration
 * @returns Promise with validated config data
 * @throws APIError if request fails or validation fails
 */
export function getConfig(): Promise<ConfigResponse> {
  return request("/api/config", ConfigResponseSchema);
}

/**
 * Save MCP Hub configuration with optional version checking
 * @param config - Configuration data to save
 * @param expectedVersion - Optional version for optimistic concurrency control
 * @returns Promise with save confirmation
 * @throws APIError if request fails or validation fails
 */
export function saveConfig(
  config: ConfigData,
  expectedVersion?: string
): Promise<ConfigSaveResponse> {
  return request(
    "/api/config",
    ConfigSaveResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({
        config,
        expectedVersion,
      }),
    }
  );
}
