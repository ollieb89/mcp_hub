import { request } from "./client";

export interface HubConfig {
  mcpServers?: Record<string, unknown>;
  toolFiltering?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ConfigResponse {
  config: HubConfig;
  version: string;
  timestamp: string;
}

export interface ConfigMutationResponse {
  status: string;
  config: HubConfig;
  version: string;
  timestamp: string;
}

export function getConfig() {
  return request<ConfigResponse>("/api/config");
}

export function saveConfig(config: HubConfig, expectedVersion?: string) {
  return request<ConfigMutationResponse>("/api/config", {
    method: "POST",
    body: JSON.stringify({
      config,
      expectedVersion,
    }),
  });
}
