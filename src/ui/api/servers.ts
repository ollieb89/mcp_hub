import { request } from "./client";

export interface ServerInfo {
  name: string;
  status: string;
  displayName?: string;
  transportType?: string;
  uptime?: number;
  disabled?: boolean;
  lastError?: string;
  capabilities?: {
    tools?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ServersResponse {
  servers: ServerInfo[];
  timestamp: string;
}

export function getServers() {
  return request<ServersResponse>("/api/servers");
}

export function startServer(serverName: string) {
  return request("/api/servers/start", {
    method: "POST",
    body: JSON.stringify({ server_name: serverName }),
  });
}

export function stopServer(serverName: string, disable?: boolean) {
  const query = disable ? "?disable=true" : "";
  return request(`/api/servers/stop${query}`, {
    method: "POST",
    body: JSON.stringify({ server_name: serverName }),
  });
}

export function restartHub() {
  return request("/api/restart", {
    method: "POST",
  });
}
