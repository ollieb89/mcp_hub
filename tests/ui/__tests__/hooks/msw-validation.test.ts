import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHealth } from '@api/hooks/useHealth';
import { createTestQueryClient, createWrapper } from '../../utils/test-utils';

describe('MSW Integration Validation', () => {
  it('should fetch health data using MSW mock', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      state: 'ready',
      activeClients: 2,
      servers: expect.arrayContaining([
        expect.objectContaining({ name: 'filesystem' }),
        expect.objectContaining({ name: 'github' }),
      ]),
    });
  });
});
