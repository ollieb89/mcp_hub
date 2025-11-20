/**
 * ServerCard component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServerCard } from '../ServerCard';
import type { ServerInfo } from '@ui/api/schemas/server.schema';

// Mock StartStopButton to isolate ServerCard tests
vi.mock('../StartStopButton', () => ({
  StartStopButton: ({ server }: { server: { name: string } }) => (
    <button data-testid={`start-stop-${server.name}`}>Start/Stop</button>
  )
}));

describe('ServerCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
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
    status: 'connected',
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

  describe('Basic rendering', () => {
    it('displays server name and description', () => {
      const server = createMockServer({
        displayName: 'My Test Server',
        description: 'A test server for testing'
      });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('My Test Server')).toBeInTheDocument();
      expect(screen.getByText('A test server for testing')).toBeInTheDocument();
    });

    it('falls back to name when displayName is empty', () => {
      const server = createMockServer({
        name: 'fallback-server',
        displayName: ''
      });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('fallback-server')).toBeInTheDocument();
    });

    it('shows transport type chip', () => {
      const server = createMockServer({ transportType: 'sse' });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('sse')).toBeInTheDocument();
    });
  });

  describe('Status indicators', () => {
    it('displays connected status with success color', () => {
      const server = createMockServer({ status: 'connected' });

      renderWithQuery(<ServerCard server={server} />);

      const statusChip = screen.getByText('connected');
      expect(statusChip).toBeInTheDocument();
    });

    it('displays error status with error color', () => {
      const server = createMockServer({ status: 'error' });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('displays connecting status', () => {
      const server = createMockServer({ status: 'connecting' });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('connecting')).toBeInTheDocument();
    });

    it('displays disconnected status', () => {
      const server = createMockServer({ status: 'disconnected' });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });

  describe('Uptime display', () => {
    it('shows "Not running" when uptime is 0', () => {
      const server = createMockServer({ uptime: 0 });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.queryByText(/\dh/)).not.toBeInTheDocument();
    });

    it('displays uptime in minutes for < 1 hour', () => {
      const server = createMockServer({ uptime: 1800 }); // 30 minutes

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('displays uptime in hours and minutes for >= 1 hour', () => {
      const server = createMockServer({ uptime: 5400 }); // 1h 30m

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('displays error message when present', () => {
      const server = createMockServer({
        status: 'error',
        error: 'Connection timeout'
      });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText(/Error: Connection timeout/)).toBeInTheDocument();
    });

    it('hides error message when error is null', () => {
      const server = createMockServer({ error: null });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  describe('Authorization', () => {
    it('shows authorization message for unauthorized status', () => {
      const server = createMockServer({
        status: 'unauthorized',
        authorizationUrl: 'https://example.com/auth'
      });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByText(/Authorization required/)).toBeInTheDocument();
    });

    it('hides authorization message for other statuses', () => {
      const server = createMockServer({
        status: 'connected',
        authorizationUrl: 'https://example.com/auth'
      });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.queryByText(/Authorization required/)).not.toBeInTheDocument();
    });
  });

  describe('Start/Stop button integration', () => {
    it('renders StartStopButton with correct server', () => {
      const server = createMockServer({ name: 'button-test' });

      renderWithQuery(<ServerCard server={server} />);

      expect(screen.getByTestId('start-stop-button-test')).toBeInTheDocument();
    });
  });
});
