import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerList } from '../../../../src/ui/components/ServerList';
import * as useServersHook from '../../../../src/ui/api/hooks/useServers';

// Mock useServers
vi.mock('../../../../src/ui/api/hooks/useServers', () => ({
  useServers: vi.fn(),
}));

// Mock ServerCard
vi.mock('../../../../src/ui/components/ServerCard', () => ({
  ServerCard: ({ server }: { server: any }) => (
    <div data-testid="server-card">{server.name}</div>
  ),
}));

describe('ServerList', () => {
  const mockServers = [
    { name: 'server1' },
    { name: 'server2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useServersHook.useServers as any).mockReturnValue({
      data: { servers: mockServers },
      isLoading: false,
      error: null,
    });
  });

  it('renders list of servers', () => {
    render(<ServerList />);

    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    expect(screen.getByText('Manage your Model Context Protocol server connections')).toBeInTheDocument();
    
    const cards = screen.getAllByTestId('server-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('server1')).toBeInTheDocument();
    expect(screen.getByText('server2')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    (useServersHook.useServers as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ServerList />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useServersHook.useServers as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<ServerList />);
    
    expect(screen.getByText(/Failed to load servers: Failed to fetch/)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    (useServersHook.useServers as any).mockReturnValue({
      data: { servers: [] },
      isLoading: false,
      error: null,
    });

    render(<ServerList />);
    
    expect(screen.getByText(/No servers configured/)).toBeInTheDocument();
  });
});
