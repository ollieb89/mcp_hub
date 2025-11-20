import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import { useUpdateFilteringMode, useToggleFiltering } from '@api/mutations';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';
import { createMockFilteringStats } from '../../utils/test-data';

describe('Filtering Mutations', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    
    // Pre-seed cache with initial stats
    const initialStats = createMockFilteringStats({
      enabled: true,
      mode: 'category',
    });
    queryClient.setQueryData(['filtering', 'stats'], initialStats);
  });

  describe('useUpdateFilteringMode', () => {
    it('should optimistically update mode', async () => {
      // Arrange
      const newMode = 'prompt-based';
      
      // Add delay to verify optimistic update
      server.use(
        http.post('/api/filtering/mode', async () => {
          await delay(100);
          return HttpResponse.json({
            status: 'ok',
            toolFiltering: { mode: newMode },
          });
        })
      );

      const { result } = renderHook(() => useUpdateFilteringMode(), {
        wrapper: createWrapper(queryClient),
      });

      // Act
      act(() => {
        result.current.mutate(newMode);
      });

      // Assert: Optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['filtering', 'stats']);
        expect(cachedData).toMatchObject({
          mode: newMode,
        });
      });

      // Assert: Success
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should rollback on error', async () => {
      // Arrange: Mock error
      server.use(
        http.post('/api/filtering/mode', async () => {
          await delay(100);
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useUpdateFilteringMode(), {
        wrapper: createWrapper(queryClient),
      });

      // Act
      act(() => {
        result.current.mutate('prompt-based');
      });

      // Assert: Optimistic update
      await waitFor(() => {
        expect(queryClient.getQueryData(['filtering', 'stats'])).toMatchObject({
          mode: 'prompt-based',
        });
      });

      // Assert: Rollback after error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(queryClient.getQueryData(['filtering', 'stats'])).toMatchObject({
        mode: 'category', // Original value
      });
    });
  });

  describe('useToggleFiltering', () => {
    it('should optimistically toggle enabled state', async () => {
      // Arrange
      const newEnabled = false;
      
      server.use(
        http.post('/api/filtering/status', async () => {
          await delay(100);
          return HttpResponse.json({
            status: 'ok',
            toolFiltering: { enabled: newEnabled },
          });
        })
      );

      const { result } = renderHook(() => useToggleFiltering(), {
        wrapper: createWrapper(queryClient),
      });

      // Act
      act(() => {
        result.current.mutate(newEnabled);
      });

      // Assert: Optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['filtering', 'stats']);
        expect(cachedData).toMatchObject({
          enabled: newEnabled,
        });
      });

      // Assert: Success
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should rollback on error', async () => {
      // Arrange: Mock error
      server.use(
        http.post('/api/filtering/status', async () => {
          await delay(100);
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useToggleFiltering(), {
        wrapper: createWrapper(queryClient),
      });

      // Act
      act(() => {
        result.current.mutate(false);
      });

      // Assert: Optimistic update
      await waitFor(() => {
        expect(queryClient.getQueryData(['filtering', 'stats'])).toMatchObject({
          enabled: false,
        });
      });

      // Assert: Rollback after error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(queryClient.getQueryData(['filtering', 'stats'])).toMatchObject({
        enabled: true, // Original value
      });
    });
  });
});
