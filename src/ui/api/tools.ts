import { request } from "./client";
import {
  ToolsResponseSchema,
  type ToolSummary,
  type ToolsResponse,
} from "./schemas/tools.schema";

/**
 * Fetch all available MCP tools across all servers
 * @returns Promise with validated tools data
 * @throws APIError if request fails or validation fails
 */
export function getTools(): Promise<ToolsResponse> {
  return request("/api/tools", ToolsResponseSchema);
}
