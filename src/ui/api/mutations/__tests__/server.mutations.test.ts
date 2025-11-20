/**
 * Tests for server mutation hooks
 * Demonstrates optimistic updates and rollback testing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStartServer, useStopServer } from '../server.mutations';
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
  mockErrorFactory,
} from '../../__tests__/factories';
import { queryKeys } from '@ui/utils/query-client';

describe('useStartServer', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful mutations', () => {
    it('should start a server successfully', async () => {
      // Arrange: Set initial cache with disconnected server
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'disconnected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'startServer').mockResolvedValue({
        success: true,
        message: 'Server started',
      });

      // Mock refetch to return updated data
      vi.spyOn(serversApi, 'getServers').mockResolvedValue(
        mockServersResponseFactory.create({
          servers: [
            mockServerFactory.create({
              name: 'github',
              status: 'connected',
            }),
          ],
        })
      );

      // Act: Render mutation hook
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      // Trigger mutation
      result.current.mutate('github');

      // Assert: Mutation successful (skip isPending check - timing unreliable)
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serversApi.startServer).toHaveBeenCalledWith('github');
    });
  });

  describe('optimistic updates', () => {
    it('should optimistically update server status to connecting', async () => {
      // Arrange: Set initial cache
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'disconnected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      // Mock slow API call
      vi.spyOn(serversApi, 'startServer').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act: Render and trigger mutation
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate('github');

      // Assert: Optimistic update applied immediately
      await waitFor(() => {
        const cachedData = getCacheData(
          queryClient,
          queryKeys.servers.all
        ) as any;
        expect(cachedData.servers[0].status).toBe('connecting');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });

    it('should preserve other servers during optimistic update', async () => {
      // Arrange: Multiple servers
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'disconnected',
          }),
          mockServerFactory.create({
            name: 'filesystem',
            status: 'connected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'startServer').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act: Start github server
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate('github');

      // Assert: Only github status updated, filesystem unchanged
      await waitFor(() => {
        const cachedData = getCacheData(
          queryClient,
          queryKeys.servers.all
        ) as any;

        expect(cachedData.servers[0].name).toBe('github');
        expect(cachedData.servers[0].status).toBe('connecting');

        expect(cachedData.servers[1].name).toBe('filesystem');
        expect(cachedData.servers[1].status).toBe('connected'); // Unchanged
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });
  });

  describe('error handling and rollback', () => {
    it('should rollback optimistic update on error', async () => {
      // Arrange: Initial state
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'disconnected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      // Mock API error
      vi.spyOn(serversApi, 'startServer').mockRejectedValue(
        mockErrorFactory.apiError('Start failed')
      );

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act: Trigger mutation
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate('github');

      // Assert: Error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Assert: Cache rolled back to original state
      const cachedData = getCacheData(queryClient, queryKeys.servers.all);
      expect(cachedData).toEqual(initialData);
      expect((cachedData as any).servers[0].status).toBe('disconnected');
    });

    it('should provide error details in onError callback', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, initialData);

      const mockError = mockErrorFactory.apiError('Server not found');
      vi.spyOn(serversApi, 'startServer').mockRejectedValue(mockError);
      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      const onErrorMock = vi.fn();
      result.current.mutate('github', { onError: onErrorMock });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // React Query v5 passes 4 args: error, variables, context, metadata
      expect(onErrorMock).toHaveBeenCalledWith(
        mockError,
        'github',
        expect.objectContaining({ previousServers: initialData }),
        expect.anything() // metadata object
      );
    });
  });

  describe('cache invalidation after mutation', () => {
    it('should invalidate servers and health queries on success', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'startServer').mockResolvedValue({
        success: true,
        message: 'Started',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate('github');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Assert: Both servers and health invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.servers.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.health,
      });
    });
  });

  describe('callbacks', () => {
    it('should execute onSuccess callback', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'startServer').mockResolvedValue({
        success: true,
        message: 'Started',
      });

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStartServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      const onSuccessMock = vi.fn();
      result.current.mutate('github', { onSuccess: onSuccessMock });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // React Query v5 passes 4 args: data, variables, context, metadata
      expect(onSuccessMock).toHaveBeenCalledWith(
        { success: true, message: 'Started' },
        'github',
        expect.objectContaining({ previousServers: initialData }),
        expect.anything() // metadata object
      );
    });
  });
});

describe('useStopServer', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('successful mutations', () => {
    it('should stop a server without disabling', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'connected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'stopServer').mockResolvedValue({
        success: true,
        message: 'Stopped',
      });

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStopServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate({ serverName: 'github', disable: false });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serversApi.stopServer).toHaveBeenCalledWith('github', false);
    });

    it('should stop and disable a server', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create();
      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'stopServer').mockResolvedValue({
        success: true,
        message: 'Stopped and disabled',
      });

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStopServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate({ serverName: 'github', disable: true });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(serversApi.stopServer).toHaveBeenCalledWith('github', true);
    });
  });

  describe('optimistic updates', () => {
    it('should optimistically update server status to disconnected', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'connected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'stopServer').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStopServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate({ serverName: 'github' });

      // Assert: Optimistic update to 'disconnected' (implementation detail)
      await waitFor(() => {
        const cachedData = getCacheData(
          queryClient,
          queryKeys.servers.all
        ) as any;
        expect(cachedData.servers[0].status).toBe('disconnected');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should rollback on stop failure', async () => {
      // Arrange
      const initialData = mockServersResponseFactory.create({
        servers: [
          mockServerFactory.create({
            name: 'github',
            status: 'connected',
          }),
        ],
      });

      setCacheData(queryClient, queryKeys.servers.all, initialData);

      vi.spyOn(serversApi, 'stopServer').mockRejectedValue(
        mockErrorFactory.apiError('Stop failed')
      );

      vi.spyOn(serversApi, 'getServers').mockResolvedValue(initialData);

      // Act
      const { result } = renderHook(() => useStopServer(), {
        wrapper: createQueryWrapper(queryClient),
      });

      result.current.mutate({ serverName: 'github' });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Assert: Rollback to connected
      const cachedData = getCacheData(queryClient, queryKeys.servers.all);
      expect((cachedData as any).servers[0].status).toBe('connected');
    });
  });
});
