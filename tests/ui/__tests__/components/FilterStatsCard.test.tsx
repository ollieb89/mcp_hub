import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterStatsCard } from '../../../../src/ui/components/FilterStatsCard';
import * as useFilteringStatsHook from '../../../../src/ui/api/hooks/useFilteringStats';

// Mock the hook
vi.mock('../../../../src/ui/api/hooks/useFilteringStats', () => ({
  useFilteringStats: vi.fn(),
}));

describe('FilterStatsCard', () => {
  const mockRefetch = vi.fn();
  const mockStats = {
    enabled: true,
    mode: 'whitelist',
    totalTools: 100,
    exposedTools: 80,
    filteredTools: 20,
    filterRate: 0.2,
    cacheHitRate: 0.95,
    allowedCategories: ['cat1', 'cat2'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useFilteringStatsHook.useFilteringStats as any).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders stats correctly', () => {
    render(<FilterStatsCard />);

    expect(screen.getByText('Tool Filtering Stats')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('whitelist')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Total tools
    expect(screen.getByText(/80 \(80.0%\)/)).toBeInTheDocument(); // Exposed
    expect(screen.getByText(/20 \(20.0%\)/)).toBeInTheDocument(); // Filtered
    expect(screen.getByText('20.0%')).toBeInTheDocument(); // Filter rate
    expect(screen.getByText('95.0%')).toBeInTheDocument(); // Cache hit rate
    
    expect(screen.getByText('cat1')).toBeInTheDocument();
    expect(screen.getByText('cat2')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    (useFilteringStatsHook.useFilteringStats as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<FilterStatsCard />);
    
    // Check for skeletons or just that main content is not there
    // Skeletons usually don't have text content.
    // The refresh button should be disabled.
    const refreshBtn = screen.getByRole('button');
    expect(refreshBtn).toBeDisabled();
  });

  it('renders error state', () => {
    (useFilteringStatsHook.useFilteringStats as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch' },
      refetch: mockRefetch,
    });

    render(<FilterStatsCard />);
    
    expect(screen.getByText(/Failed to load filtering stats: Failed to fetch/)).toBeInTheDocument();
  });

  it('renders no data state', () => {
    (useFilteringStatsHook.useFilteringStats as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<FilterStatsCard />);
    
    expect(screen.getByText('No filtering stats available')).toBeInTheDocument();
  });

  it('calls refetch when refresh button is clicked', async () => {
    render(<FilterStatsCard />);

    const refreshBtn = screen.getByRole('button', { name: /refresh stats/i });
    await userEvent.click(refreshBtn);

    expect(mockRefetch).toHaveBeenCalled();
  });
});
