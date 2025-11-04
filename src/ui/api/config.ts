import { request } from "./client";

export interface HubConfig {
  mcpServers?: Record<string, unknown>;
  toolFiltering?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ConfigResponse {
  config: HubConfig;
  timestamp: string;
}

export interface ConfigMutationResponse {
  status: string;
  config: HubConfig;
  timestamp: string;
}

export function getConfig() {
  return request<ConfigResponse>("/api/config");
}

export function saveConfig(config: HubConfig) {
  return request<ConfigMutationResponse>("/api/config", {
    method: "POST",
    body: JSON.stringify(config),
  });
}
