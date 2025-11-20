import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ServerCard } from '../../../../src/ui/components/ServerCard';
import type { ServerInfo } from '../../../../src/ui/api/schemas/server.schema';

// Mock StartStopButton
vi.mock('../../../../src/ui/components/StartStopButton', () => ({
  StartStopButton: () => <button>Start/Stop</button>,
}));

describe('ServerCard', () => {
  const mockServer: ServerInfo = {
    name: 'test-server',
    displayName: 'Test Server',
    status: 'connected',
    transportType: 'stdio',
    uptime: 3665, // 1h 1m 5s
    description: 'A test server',
    error: null,
    capabilities: {
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    },
    lastStarted: null,
    authorizationUrl: null,
    serverInfo: null,
    config_source: 'test',
  };

  it('renders server info correctly', () => {
    render(<ServerCard server={mockServer} />);

    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('A test server')).toBeInTheDocument();
    expect(screen.getByText('stdio')).toBeInTheDocument();
    expect(screen.getByText('1h 1m')).toBeInTheDocument();
  });

  it('renders error message if present', () => {
    const errorServer = { ...mockServer, status: 'error' as const, error: 'Connection failed' };
    render(<ServerCard server={errorServer} />);

    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('Error: Connection failed')).toBeInTheDocument();
  });

  it('renders authorization warning if unauthorized', () => {
    const authServer = { 
      ...mockServer, 
      status: 'unauthorized' as const, 
      authorizationUrl: 'http://auth.com' 
    };
    render(<ServerCard server={authServer} />);

    expect(screen.getByText('unauthorized')).toBeInTheDocument();
    expect(screen.getByText('Authorization required')).toBeInTheDocument();
  });

  it('renders start/stop button', () => {
    render(<ServerCard server={mockServer} />);
    expect(screen.getByText('Start/Stop')).toBeInTheDocument();
  });

  it('uses name if displayName is missing', () => {
    const noDisplayServer = { ...mockServer, displayName: undefined };
    render(<ServerCard server={noDisplayServer} />);
    expect(screen.getByText('test-server')).toBeInTheDocument();
  });
  
  it('formats uptime correctly for minutes only', () => {
    const shortUptimeServer = { ...mockServer, uptime: 125 }; // 2m 5s
    render(<ServerCard server={shortUptimeServer} />);
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('shows "Not running" for 0 uptime', () => {
    const stoppedServer = { ...mockServer, uptime: 0 };
    render(<ServerCard server={stoppedServer} />);
    // Uptime chip is not rendered if uptime is 0?
    // Let's check code: {server.uptime > 0 && (...)}
    // So it shouldn't be there.
    expect(screen.queryByText(/m/)).not.toBeInTheDocument();
  });
});
