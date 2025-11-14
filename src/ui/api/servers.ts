import { z } from "zod";
import { request } from "./client";
import {
  ServersResponseSchema,
  type ServerInfo,
  type ServersResponse
} from "./schemas/server.schema";

// Re-export types for convenience
export type { ServersResponse, ServerInfo };

/**
 * Fetch all MCP servers with their current status and capabilities
 * @returns Promise with validated servers data
 * @throws APIError if request fails or validation fails
 */
export function getServers(): Promise<ServersResponse> {
  return request("/api/servers", ServersResponseSchema);
}

/**
 * Start a server
 * @param serverName - Name of server to start
 * @returns Promise that resolves when server starts
 * @throws APIError if request fails
 */
export function startServer(serverName: string): Promise<{ success: boolean }> {
  return request(
    "/api/servers/start",
    z.object({ success: z.boolean() }),
    {
      method: "POST",
      body: JSON.stringify({ server_name: serverName }),
    }
  );
}

/**
 * Stop a server
 * @param serverName - Name of server to stop
 * @param disable - Whether to disable the server
 * @returns Promise that resolves when server stops
 * @throws APIError if request fails
 */
export function stopServer(serverName: string, disable?: boolean): Promise<{ success: boolean }> {
  const query = disable ? "?disable=true" : "";
  return request(
    `/api/servers/stop${query}`,
    z.object({ success: z.boolean() }),
    {
      method: "POST",
      body: JSON.stringify({ server_name: serverName }),
    }
  );
}

/**
 * Restart the MCP Hub
 * @returns Promise that resolves when hub restarts
 * @throws APIError if request fails
 */
export function restartHub(): Promise<{ success: boolean }> {
  return request(
    "/api/restart",
    z.object({ success: z.boolean() }),
    {
      method: "POST",
    }
  );
}
