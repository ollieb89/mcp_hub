import { request } from "./client";

export interface ToolSummary {
  server: string;
  serverDisplayName: string;
  name: string;
  description: string;
  enabled: boolean;
  categories: string[];
}

export interface ToolsResponse {
  tools: ToolSummary[];
  timestamp: string;
}

export function getTools() {
  return request<ToolsResponse>("/api/tools");
}
