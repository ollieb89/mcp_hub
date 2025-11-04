import { request } from "./client";

export interface FilteringStats {
  enabled: boolean;
  mode: string;
  totalTools: number;
  filteredTools: number;
  exposedTools: number;
  filterRate: number;
  serverFilterMode: string | null;
  allowedServers: string[];
  allowedCategories: string[];
  categoryCacheSize: number;
  cacheHitRate: number;
  llmCacheSize: number;
  llmCacheHitRate: number;
  timestamp: string;
}

export function getFilteringStats() {
  return request<FilteringStats>("/api/filtering/stats");
}

export function setFilteringEnabled(enabled: boolean) {
  return request<{ status: string; toolFiltering: { enabled: boolean } }>(
    "/api/filtering/status",
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    },
  );
}

export function setFilteringMode(mode: FilteringStats["mode"]) {
  return request<{ status: string; toolFiltering: { mode: string } }>(
    "/api/filtering/mode",
    {
      method: "POST",
      body: JSON.stringify({ mode }),
    },
  );
}
