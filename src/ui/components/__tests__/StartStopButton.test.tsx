/**
 * StartStopButton component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StartStopButton } from '../StartStopButton';
import type { ServerInfo } from '@ui/api/schemas/server.schema';

// Mock the mutation hooks
vi.mock('@ui/api/mutations/server.mutations', () => ({
  useStartServer: vi.fn(),
  useStopServer: vi.fn()
}));

import { useStartServer, useStopServer } from '@ui/api/mutations/server.mutations';

describe('StartStopButton', () => {
  let queryClient: QueryClient;
  const mockStartMutate = vi.fn();
  const mockStopMutate = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset mocks
    vi.clearAllMocks();

    // Default mock return values
    vi.mocked(useStartServer).mockReturnValue({
      mutate: mockStartMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      status: 'idle',
      submittedAt: 0
    } as any);

    vi.mocked(useStopServer).mockReturnValue({
      mutate: mockStopMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      status: 'idle',
      submittedAt: 0
    } as any);
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  const createMockServer = (overrides?: Partial<ServerInfo>): ServerInfo => ({
    name: 'test-server',
    displayName: 'Test Server',
    description: 'Test server description',
    transportType: 'stdio',
    status: 'disconnected',
    error: null,
    capabilities: {
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: []
    },
    uptime: 0,
    lastStarted: null,
    authorizationUrl: null,
    serverInfo: null,
    config_source: 'test',
    ...overrides
  });

  describe('Start button (disconnected server)', () => {
    it('shows "Start" button for disconnected server', () => {
      const server = createMockServer({ status: 'disconnected' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('calls start mutation when Start button clicked', async () => {
      const user = userEvent.setup();
      const server = createMockServer({ 
        name: 'my-server',
        status: 'disconnected' 
      });

      renderWithQuery(<StartStopButton server={server} />);

      const button = screen.getByRole('button', { name: /start/i });
      await user.click(button);

      expect(mockStartMutate).toHaveBeenCalledWith('my-server');
    });

    it('shows loading state while starting', () => {
      vi.mocked(useStartServer).mockReturnValue({
        mutate: mockStartMutate,
        isPending: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: vi.fn(),
        mutateAsync: vi.fn(),
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        status: 'pending',
        submittedAt: Date.now()
      } as any);

      const server = createMockServer({ status: 'disconnected' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /starting/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Stop button (connected server)', () => {
    it('shows "Stop" button for connected server', () => {
      const server = createMockServer({ status: 'connected' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('calls stop mutation when Stop button clicked', async () => {
      const user = userEvent.setup();
      const server = createMockServer({ 
        name: 'my-server',
        status: 'connected' 
      });

      renderWithQuery(<StartStopButton server={server} />);

      const button = screen.getByRole('button', { name: /stop/i });
      await user.click(button);

      expect(mockStopMutate).toHaveBeenCalledWith({
        serverName: 'my-server',
        disable: false
      });
    });

    it('shows loading state while stopping', () => {
      vi.mocked(useStopServer).mockReturnValue({
        mutate: mockStopMutate,
        isPending: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: vi.fn(),
        mutateAsync: vi.fn(),
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        status: 'pending',
        submittedAt: Date.now()
      } as any);

      const server = createMockServer({ status: 'connected' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /stopping/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Button variants and states', () => {
    it('uses contained variant for disconnected server', () => {
      const server = createMockServer({ status: 'disconnected' });

      const { container } = renderWithQuery(<StartStopButton server={server} />);

      // Material-UI contained buttons have specific classes
      const button = container.querySelector('button');
      expect(button?.classList.contains('MuiButton-contained')).toBe(true);
    });

    it('uses outlined variant for connected server', () => {
      const server = createMockServer({ status: 'connected' });

      const { container } = renderWithQuery(<StartStopButton server={server} />);

      const button = container.querySelector('button');
      expect(button?.classList.contains('MuiButton-outlined')).toBe(true);
    });

    it('shows "Retry" for error status', () => {
      const server = createMockServer({ 
        status: 'error',
        error: 'Connection failed'
      });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('shows "Disabled" for disabled status', () => {
      const server = createMockServer({ status: 'disabled' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /disabled/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows Stop button for connecting status', () => {
      const server = createMockServer({ status: 'connecting' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  describe('Authorization flow', () => {
    it('shows authorization button for unauthorized server', () => {
      const server = createMockServer({
        status: 'unauthorized',
        authorizationUrl: 'https://example.com/oauth'
      });

      renderWithQuery(<StartStopButton server={server} />);

      const link = screen.getByRole('link', { name: /authorize server/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/oauth');
    });

    it('authorization button opens in new tab', () => {
      const server = createMockServer({
        status: 'unauthorized',
        authorizationUrl: 'https://example.com/oauth'
      });

      renderWithQuery(<StartStopButton server={server} />);

      const link = screen.getByRole('link', { name: /authorize server/i });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not show authorization button when no auth URL', () => {
      const server = createMockServer({
        status: 'unauthorized',
        authorizationUrl: null
      });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.queryByRole('button', { name: /authorize/i })).not.toBeInTheDocument();
      // Should fall back to regular start button
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('button has fullWidth prop for responsive layout', () => {
      const server = createMockServer({ status: 'disconnected' });

      const { container } = renderWithQuery(<StartStopButton server={server} />);

      const button = container.querySelector('button');
      expect(button?.classList.contains('MuiButton-fullWidth')).toBe(true);
    });

    it('disables button during mutations', () => {
      vi.mocked(useStartServer).mockReturnValue({
        mutate: mockStartMutate,
        isPending: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: vi.fn(),
        mutateAsync: vi.fn(),
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: false,
        status: 'pending',
        submittedAt: Date.now()
      } as any);

      const server = createMockServer({ status: 'disconnected' });

      renderWithQuery(<StartStopButton server={server} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
