import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartStopButton } from '../../../../src/ui/components/StartStopButton';
import * as serverMutations from '../../../../src/ui/api/mutations/server.mutations';
import type { ServerInfo } from '../../../../src/ui/api/schemas/server.schema';

// Mock mutations
vi.mock('../../../../src/ui/api/mutations/server.mutations', () => ({
  useStartServer: vi.fn(),
  useStopServer: vi.fn(),
}));

describe('StartStopButton', () => {
  const mockStartMutate = vi.fn();
  const mockStopMutate = vi.fn();
  
  const mockServer: ServerInfo = {
    name: 'test-server',
    displayName: 'Test Server',
    status: 'disconnected',
    transportType: 'stdio',
    uptime: 0,
    description: 'A test server',
    error: null,
    capabilities: { tools: [], resources: [], resourceTemplates: [], prompts: [] },
    lastStarted: null,
    authorizationUrl: null,
    serverInfo: null,
    config_source: 'test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (serverMutations.useStartServer as any).mockReturnValue({
      mutate: mockStartMutate,
      isPending: false,
    });
    (serverMutations.useStopServer as any).mockReturnValue({
      mutate: mockStopMutate,
      isPending: false,
    });
  });

  it('renders Start button when disconnected', () => {
    render(<StartStopButton server={mockServer} />);
    
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('renders Stop button when connected', () => {
    const connectedServer = { ...mockServer, status: 'connected' as const };
    render(<StartStopButton server={connectedServer} />);
    
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('calls start mutation when clicked and disconnected', async () => {
    render(<StartStopButton server={mockServer} />);
    
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    
    expect(mockStartMutate).toHaveBeenCalledWith('test-server');
  });

  it('calls stop mutation when clicked and connected', async () => {
    const connectedServer = { ...mockServer, status: 'connected' as const };
    render(<StartStopButton server={connectedServer} />);
    
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    
    expect(mockStopMutate).toHaveBeenCalledWith({ serverName: 'test-server', disable: false });
  });

  it('renders loading state when starting', () => {
    (serverMutations.useStartServer as any).mockReturnValue({
      mutate: mockStartMutate,
      isPending: true,
    });

    render(<StartStopButton server={mockServer} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('renders loading state when stopping', () => {
    const connectedServer = { ...mockServer, status: 'connected' as const };
    (serverMutations.useStopServer as any).mockReturnValue({
      mutate: mockStopMutate,
      isPending: true,
    });

    render(<StartStopButton server={connectedServer} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Stopping...')).toBeInTheDocument();
  });

  it('renders Disabled button when disabled', () => {
    const disabledServer = { ...mockServer, status: 'disabled' as const };
    render(<StartStopButton server={disabledServer} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders Retry button when error', () => {
    const errorServer = { ...mockServer, status: 'error' as const };
    render(<StartStopButton server={errorServer} />);
    
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('renders Authorize button when unauthorized', () => {
    const authServer = { 
      ...mockServer, 
      status: 'unauthorized' as const,
      authorizationUrl: 'http://auth.com'
    };
    render(<StartStopButton server={authServer} />);
    
    const authBtn = screen.getByRole('link', { name: /authorize server/i });
    expect(authBtn).toBeInTheDocument();
    expect(authBtn).toHaveAttribute('href', 'http://auth.com');
  });
});
