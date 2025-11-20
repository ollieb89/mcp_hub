import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServersTable from '@components/ServersTable';
import { createMockServer } from '../../utils/test-data';

describe('ServersTable', () => {
  it('renders empty state correctly', () => {
    render(
      <ServersTable 
        servers={[]} 
        onRefresh={vi.fn()} 
        onToggle={vi.fn()} 
        onRestart={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Connected Servers')).toBeInTheDocument();
    expect(screen.getByText(/no servers discovered/i)).toBeInTheDocument();
  });

  it('renders list of servers correctly', () => {
    const servers = [
      createMockServer({ 
        name: 'server-1', 
        status: 'connected',
        transportType: 'stdio'
      }),
      createMockServer({ 
        name: 'server-2', 
        status: 'disabled',
        transportType: 'sse'
      })
    ];
    
    render(
      <ServersTable 
        servers={servers} 
        onRefresh={vi.fn()} 
        onToggle={vi.fn()} 
        onRestart={vi.fn()} 
      />
    );
    
    expect(screen.getByText('server-1')).toBeInTheDocument();
    expect(screen.getByText('server-2')).toBeInTheDocument();
    expect(screen.getByText('stdio')).toBeInTheDocument();
    expect(screen.getByText('sse')).toBeInTheDocument();
    
    // Check status chips
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('disabled')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    
    render(
      <ServersTable 
        servers={[]} 
        onRefresh={onRefresh} 
        onToggle={vi.fn()} 
        onRestart={vi.fn()} 
      />
    );
    
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('calls onToggle when switch is toggled', async () => {
    const onToggle = vi.fn();
    const server = createMockServer({ name: 'test-server', status: 'connected' });
    
    render(
      <ServersTable 
        servers={[server]} 
        onRefresh={vi.fn()} 
        onToggle={onToggle} 
        onRestart={vi.fn()} 
      />
    );
    
    const switchControl = within(screen.getByTestId(`toggle-${server.name}`)).getByRole('switch');
    await userEvent.click(switchControl);
    
    expect(onToggle).toHaveBeenCalledWith(server, false);
  });

  it('calls onRestart when restart button is clicked', async () => {
    const onRestart = vi.fn();
    const server = createMockServer({ name: 'test-server', status: 'connected' });
    
    render(
      <ServersTable 
        servers={[server]} 
        onRefresh={vi.fn()} 
        onToggle={vi.fn()} 
        onRestart={onRestart} 
      />
    );
    
    const row = screen.getByRole('row', { name: /test-server/i });
    const restartButton = within(row).getByRole('button', { name: /restart server/i });
    await userEvent.click(restartButton);
    
    expect(onRestart).toHaveBeenCalledWith(server);
  });

  it('disables restart button for disconnected servers', () => {
    const server = createMockServer({ name: 'test-server', status: 'disconnected' });
    
    render(
      <ServersTable 
        servers={[server]} 
        onRefresh={vi.fn()} 
        onToggle={vi.fn()} 
        onRestart={vi.fn()} 
      />
    );
    
    const row = screen.getByRole('row', { name: /test-server/i });
    const restartButton = within(row).getByRole('button', { name: /restart server/i });
    expect(restartButton).toBeDisabled();
  });

  it('shows loading state on refresh button', () => {
    render(
      <ServersTable 
        servers={[]} 
        loading={true}
        onRefresh={vi.fn()} 
        onToggle={vi.fn()} 
        onRestart={vi.fn()} 
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
    // CircularProgress doesn't have a default role, but we can check if the icon is replaced
    // or check for the disabled state which is sufficient for this test
  });
});
