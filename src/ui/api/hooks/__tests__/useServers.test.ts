/**
 * Tests for useServers query hook
 * Demonstrates React Query testing patterns
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServers } from '../useServers';
import * as serversApi from '../../servers';
import {
  createTestQueryClient,
  createQueryWrapper,
  setCacheData,
  getCacheData,
} from '../../__tests__/test-utils';
import {
  mockServersResponseFactory,
  mockServerFactory,
} from '../../__tests__/factories';
import { queryKeys } from '@ui/utils/query-client';

describe('useServers', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful data fetching', () => {
    it('should fetch servers successfully', async () => {
      // Arrange: Mock API response
      const mockServers = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'connected',
            displayName: 'GitHub',
          }),
          mockServerFactory.create({
            name: 'filesystem',
            status: 'disconnected',
            displayName: 'Filesystem',
          }),
        ],
      });

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(mockServers);

      // Act: Render hook
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Assert: Data loaded successfully
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockServers);
      expect(result.current.data?.servers).toHaveLength(2);
      expect(result.current.data?.servers[0].name).toBe('github');
      expect(serversApi.getServers).toHaveBeenCalledTimes(1);
    });

    it('should use cached data on subsequent renders', async () => {
      // Arrange: Set initial cache data
      const cachedData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, cachedData);

      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(cachedData);

      // Act: Render hook
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Immediately has cached data (no loading state)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(cachedData);

      // Assert: Still refetches in background (staleTime = 0 in tests)
      await waitFor(() => {
        expect(getServersSpy).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      // Arrange: Mock network error
      const mockError = new Error('Failed to fetch');
      vi.spyOn(serversApi, 'getServers').mockRejectedValue(mockError);

      // Act: Render hook
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle API errors', async () => {
      // Arrange: Mock API error
      const mockError = new Error('Server returned 500');
      vi.spyOn(serversApi, 'getServers').mockRejectedValue(mockError);

      // Act: Render hook
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Server returned 500');
    });
  });

  describe('refetching behavior', () => {
    it('should refetch on manual refetch call', async () => {
      // Arrange: Initial data
      const initialData = mockServersResponseFactory.create({
        servers: mockServerFactory.createList(2),
      });

      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(initialData);

      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Act: Refetch with updated data
      const updatedData = mockServersResponseFactory.create({
        servers: mockServerFactory.createList(3),
      });

      getServersSpy.mockResolvedValue(updatedData);
      result.current.refetch();

      // Assert: New data loaded
      await waitFor(() => {
        expect(result.current.data?.servers).toHaveLength(3);
      });

      expect(getServersSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle refetch errors gracefully', async () => {
      // Arrange: Initial success
      const initialData = mockServersResponseFactory.create();
      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(initialData);

      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Act: Refetch with error
      getServersSpy.mockRejectedValue(new Error('Refetch failed'));
      result.current.refetch();

      // Assert: Error state, but keeps old data
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toEqual(initialData); // Stale data preserved
      expect(result.current.error?.message).toBe('Refetch failed');
    });
  });

  describe('loading states', () => {
    it('should differentiate between isLoading and isFetching', async () => {
      // Arrange: Set initial cache
      const cachedData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, cachedData);

      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      // Act: Render hook
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Not loading (has cached data), but is fetching
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.data).toEqual(cachedData);

      // Cleanup
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });
  });

  describe('custom query options', () => {
    it('should respect custom refetchInterval', async () => {
      // Arrange
      const mockData = mockServersResponseFactory.create();
      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(mockData);

      // Act: Enable polling with refetchInterval
      const { result } = renderHook(
        () => useServers({ refetchInterval: 1000 }),
        {
          wrapper: createQueryWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Assert: Should refetch after interval
      await waitFor(
        () => {
          expect(getServersSpy).toHaveBeenCalledTimes(2);
        },
        { timeout: 1500 }
      );
    });

    it('should respect enabled option', async () => {
      // Arrange
      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(mockServersResponseFactory.create());

      // Act: Disabled query
      const { result } = renderHook(() => useServers({ enabled: false }), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Assert: Query not executed
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(getServersSpy).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache when queryClient invalidates', async () => {
      // Arrange: Initial data
      const initialData = mockServersResponseFactory.create({
        servers: mockServerFactory.createList(2),
      });

      const getServersSpy = vi
        .spyOn(serversApi, 'getServers')
        .mockResolvedValue(initialData);

      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Act: Update mock and invalidate
      const updatedData = mockServersResponseFactory.create({
        servers: mockServerFactory.createList(3),
      });

      getServersSpy.mockResolvedValue(updatedData);
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });

      // Assert: Refetch triggered
      await waitFor(() => {
        expect(result.current.data?.servers).toHaveLength(3);
      });

      expect(getServersSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('data transformation', () => {
    it('should provide access to raw server data', async () => {
      // Arrange
      const mockData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'connected',
            capabilities: { tools: 15, resources: 8, prompts: 3 },
          }),
        ],
      });

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(mockData);

      // Act
      const { result } = renderHook(() => useServers(), {
        wrapper: createQueryWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Assert: Can access nested properties
      const server = result.current.data?.servers[0];
      expect(server?.name).toBe('github');
      expect(server?.status).toBe('connected');
      expect(server?.capabilities?.tools).toBe(15);
    });
  });
});
