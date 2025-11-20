import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useStartServer, useStopServer } from '@api/mutations/server.mutations';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';

describe('Server Mutations', () => {
  describe('useStartServer', () => {
    it('should start server successfully', async () => {
      const queryClient = createTestQueryClient();

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate('filesystem');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
      });
    });

    it('should handle start error', async () => {
      const queryClient = createTestQueryClient();

      // Mock API error
      server.use(
        http.post('/api/servers/start', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate('filesystem');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useStopServer', () => {
    it('should stop server successfully', async () => {
      const queryClient = createTestQueryClient();

      const { result } = renderHook(() => useStopServer(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({ serverName: 'filesystem' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        success: true,
      });
    });
  });
});
