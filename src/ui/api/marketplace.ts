import { request } from "./client";

/**
 * Marketplace server entry
 */
export interface MarketplaceServer {
  mcpId: string;
  name: string;
  displayName: string;
  description: string;
  author?: string;
  repository?: string;
  stars?: number;
  categories?: string[];
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Marketplace catalog response
 */
export interface MarketplaceCatalogResponse {
  servers: MarketplaceServer[];
  timestamp: string;
}

/**
 * Marketplace catalog query parameters
 */
export interface MarketplaceCatalogParams {
  search?: string;
  category?: string;
  tags?: string[];
  sort?: 'stars' | 'name' | 'updated';
}

/**
 * Fetch marketplace catalog with optional filtering and sorting
 *
 * @param params - Query parameters for filtering and sorting
 * @returns Marketplace catalog with filtered and sorted servers
 */
export function getMarketplaceCatalog(params?: MarketplaceCatalogParams) {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set('search', params.search);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.tags) searchParams.set('tags', params.tags.join(','));
  if (params?.sort) searchParams.set('sort', params.sort);

  const query = searchParams.toString();
  const url = `/marketplace${query ? `?${query}` : ''}`;

  return request<MarketplaceCatalogResponse>(url);
}

/**
 * Server details response
 */
export interface ServerDetailsResponse {
  server: MarketplaceServer & {
    readme?: string;
    installInstructions?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

/**
 * Fetch detailed information about a specific marketplace server
 *
 * @param mcpId - The MCP server ID
 * @returns Detailed server information including README and install instructions
 */
export function getServerDetails(mcpId: string) {
  return request<ServerDetailsResponse>("/marketplace/details", {
    method: "POST",
    body: JSON.stringify({ mcpId }),
  });
}
