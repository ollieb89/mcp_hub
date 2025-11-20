import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import { useSaveConfig } from '@api/mutations/config.mutations';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';
import { createMockConfig } from '../../utils/test-data';

describe('useSaveConfig', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // Pre-seed cache with initial config
    const initialConfig = createMockConfig();
    queryClient.setQueryData(['config'], initialConfig);
  });

  it('should optimistically update config on save', async () => {
    // Arrange
    const updatedConfig = {
      mcpServers: {
        filesystem: { command: 'npx', args: ['fs-server'] },
      },
    };

    // Add delay to ensure we can catch the optimistic update
    server.use(
      http.post('/api/config', async ({ request }) => {
        await delay(100);
        const body = (await request.json()) as { config: unknown };
        return HttpResponse.json({
          status: 'ok',
          config: body.config,
          version: 'v1-xyz789',
          timestamp: new Date().toISOString(),
        });
      })
    );

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: updatedConfig,
        expectedVersion: 'v1-abc123',
      });
    });

    // Assert: Optimistic update applied immediately
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['config']);
      expect(cachedData).toMatchObject({
        config: updatedConfig,
        version: 'v1-abc123', // Old version (not confirmed yet)
      });
    });

    // Assert: Mutation succeeds and updates version
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const finalData = queryClient.getQueryData(['config']);
    expect(finalData).toMatchObject({
      config: updatedConfig,
      version: 'v1-xyz789', // New version from server
    });
  });

  it('should rollback on error', async () => {
    // Arrange: Mock API error with delay
    server.use(
      http.post('/api/config', async () => {
        await delay(100);
        return new HttpResponse(null, { status: 500 });
      })
    );

    const originalConfig = queryClient.getQueryData(['config']);
    const updatedConfig = { mcpServers: { new: {} } };

    // Act: Trigger mutation
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: updatedConfig,
        expectedVersion: 'v1-abc123',
      });
    });

    // Assert: Optimistic update applied
    await waitFor(() => {
      expect(queryClient.getQueryData(['config'])).toMatchObject({
        config: updatedConfig,
      });
    });

    // Assert: Error occurs and rollback happens
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(['config'])).toEqual(originalConfig);
  });

  it('should handle version conflict (409)', async () => {
    // Arrange: Mock version conflict
    server.use(
      http.post('/api/config', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Config version mismatch' }),
          { status: 409 }
        );
      })
    );

    // Act
    const { result } = renderHook(() => useSaveConfig(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        config: { mcpServers: {} },
        expectedVersion: 'v1-old-version', // Wrong version
      });
    });

    // Assert: Error with 409 status
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});
