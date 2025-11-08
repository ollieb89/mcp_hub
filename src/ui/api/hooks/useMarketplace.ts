/**
 * React Query hook for marketplace catalog endpoint
 * Provides marketplace server catalog with filtering and sorting
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@ui/utils/query-client';
import { getMarketplaceCatalog, type MarketplaceCatalogParams } from '../marketplace';

/**
 * Fetch and cache marketplace catalog
 *
 * Supports filtering by search, category, tags, and sorting by stars/name/updated.
 * Cache key includes all query params for proper invalidation.
 *
 * @param params - Query parameters for filtering and sorting
 * @param options - React Query options for customization
 * @returns Query result with marketplace data, loading state, and error
 *
 * @example
 * ```tsx
 * function MarketplacePage() {
 *   const [search, setSearch] = useState('');
 *   const [category, setCategory] = useState<string>();
 *
 *   const { data, isLoading, error } = useMarketplace({
 *     search,
 *     category,
 *     sort: 'stars',
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Alert>Error: {error.message}</Alert>;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <CategoryFilter value={category} onChange={setCategory} />
 *       <ServerGrid servers={data.servers} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useMarketplace(
  params?: MarketplaceCatalogParams,
  options?: Parameters<typeof useQuery>[0]
) {
  return useQuery({
    queryKey: queryKeys.marketplace.catalog(params || {}),
    queryFn: () => getMarketplaceCatalog(params),
    ...options,
  });
}
