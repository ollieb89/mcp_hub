import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActiveFiltersCard from '@components/ActiveFiltersCard';
import { createMockFilteringStats } from '../../utils/test-data';

describe('ActiveFiltersCard', () => {
  it('renders loading state when stats are null', () => {
    render(<ActiveFiltersCard stats={null} />);
    
    expect(screen.getByText('Active Filters')).toBeInTheDocument();
    expect(screen.getByText('Filters will appear once metrics load.')).toBeInTheDocument();
  });

  it('renders active filters correctly', () => {
    const stats = createMockFilteringStats({
      allowedCategories: ['filesystem', 'web'],
      allowedServers: ['github'],
    });

    render(<ActiveFiltersCard stats={stats} />);
    
    expect(screen.getByText('2 categories')).toBeInTheDocument();
    expect(screen.getByText('1 servers')).toBeInTheDocument();
    
    // Check chips
    expect(screen.getByText('filesystem')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('github')).toBeInTheDocument();
  });

  it('renders empty state for empty filters', () => {
    const stats = createMockFilteringStats({
      allowedCategories: [],
      allowedServers: [],
    });

    render(<ActiveFiltersCard stats={stats} />);
    
    const noneConfigured = screen.getAllByText('None configured.');
    expect(noneConfigured).toHaveLength(2); // One for categories, one for servers
  });

  it('calls onEdit when manage button is clicked', async () => {
    const onEdit = vi.fn();
    const stats = createMockFilteringStats();

    render(<ActiveFiltersCard stats={stats} onEdit={onEdit} />);
    
    const button = screen.getByRole('button', { name: /manage/i });
    await userEvent.click(button);
    
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
