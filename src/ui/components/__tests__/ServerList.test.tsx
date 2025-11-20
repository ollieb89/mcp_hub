/**
 * ServerList component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServerList } from '../ServerList';
import type { ServersResponse } from '@ui/api/schemas/server.schema';

// Mock the useServers hook
vi.mock('@ui/api/hooks/useServers', () => ({
  useServers: vi.fn()
}));

// Mock ServerCard to isolate ServerList tests
vi.mock('../ServerCard', () => ({
  ServerCard: ({ server }: { server: { name: string } }) => (
    <div data-testid={`server-card-${server.name}`}>{server.name}</div>
  )
}));

import { useServers } from '@ui/api/hooks/useServers';

describe('ServerList', () => {
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

  it('shows loading spinner while fetching servers', () => {
    vi.mocked(useServers).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as any);

    renderWithQuery(<ServerList />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', () => {
    const error = new Error('Failed to connect');
    vi.mocked(useServers).mockReturnValue({
      data: undefined,
      isLoading: false,
      error
    } as any);

    renderWithQuery(<ServerList />);
    
    expect(screen.getByText(/Failed to load servers: Failed to connect/i)).toBeInTheDocument();
  });

  it('shows info message when no servers configured', () => {
    const emptyData: ServersResponse = {
      servers: [],
      timestamp: new Date().toISOString()
    };
    
    vi.mocked(useServers).mockReturnValue({
      data: emptyData,
      isLoading: false,
      error: null
    } as any);

    renderWithQuery(<ServerList />);
    
    expect(screen.getByText(/No servers configured/i)).toBeInTheDocument();
  });

  it('renders server cards when servers are available', () => {
    const mockData: ServersResponse = {
      servers: [
        {
          name: 'test-server-1',
          displayName: 'Test Server 1',
          description: 'First test server',
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
          config_source: 'test'
        },
        {
          name: 'test-server-2',
          displayName: 'Test Server 2',
          description: 'Second test server',
          transportType: 'sse',
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
          config_source: 'test'
        }
      ],
      timestamp: new Date().toISOString()
    };

    vi.mocked(useServers).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    } as any);

    renderWithQuery(<ServerList />);
    
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    expect(screen.getByTestId('server-card-test-server-1')).toBeInTheDocument();
    expect(screen.getByTestId('server-card-test-server-2')).toBeInTheDocument();
  });

  it('displays correct heading and description', () => {
    const mockData: ServersResponse = {
      servers: [{
        name: 'test',
        displayName: 'Test',
        description: 'Test server',
        transportType: 'stdio',
        status: 'connected',
        error: null,
        capabilities: { tools: [], resources: [], resourceTemplates: [], prompts: [] },
        uptime: 0,
        lastStarted: null,
        authorizationUrl: null,
        serverInfo: null,
        config_source: 'test'
      }],
      timestamp: new Date().toISOString()
    };

    vi.mocked(useServers).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    } as any);

    renderWithQuery(<ServerList />);
    
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    expect(screen.getByText(/Manage your Model Context Protocol server connections/i)).toBeInTheDocument();
  });
});
