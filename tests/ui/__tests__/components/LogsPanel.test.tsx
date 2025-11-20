import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogsPanel from '@components/LogsPanel';

describe('LogsPanel', () => {
  it('renders empty state correctly', () => {
    render(<LogsPanel logs={[]} />);
    
    expect(screen.getByText('Recent Logs')).toBeInTheDocument();
    expect(screen.getByText('0 entries')).toBeInTheDocument();
    expect(screen.getByText('Waiting for log events…')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    render(<LogsPanel logs={[]} loading={true} />);
    
    // Skeletons usually don't have accessible text, but we can check that the empty message is NOT there
    expect(screen.queryByText('Waiting for log events…')).not.toBeInTheDocument();
    // Or check for the container structure if needed, but absence of empty state is a good proxy
  });

  it('renders list of logs correctly', () => {
    const logs = [
      { timestamp: new Date('2023-01-01T12:00:00').toISOString(), message: 'Log message 1', level: 'info' },
      { timestamp: new Date('2023-01-01T12:01:00').toISOString(), message: 'Log message 2', level: 'error' }
    ];
    
    render(<LogsPanel logs={logs} />);
    
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('Log message 1')).toBeInTheDocument();
    expect(screen.getByText('Log message 2')).toBeInTheDocument();
    expect(screen.getByText('[INFO]')).toBeInTheDocument();
    expect(screen.getByText('[ERROR]')).toBeInTheDocument();
    
    // Check timestamps (locale dependent, so partial match or just existence)
    // 12:00:00 PM or 12:00:00 depending on locale
    // We can just check that *some* time string is rendered, or rely on the fact that it renders without error
  });

  it('calls onViewAll when button is clicked', async () => {
    const onViewAll = vi.fn();
    render(<LogsPanel logs={[]} onViewAll={onViewAll} />);
    
    await userEvent.click(screen.getByRole('button', { name: /view all/i }));
    expect(onViewAll).toHaveBeenCalled();
  });

  it('does not render View All button if handler not provided', () => {
    render(<LogsPanel logs={[]} />);
    
    expect(screen.queryByRole('button', { name: /view all/i })).not.toBeInTheDocument();
  });
});
