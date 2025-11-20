/**
 * Tests for FilterStatsCard Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterStatsCard } from '../FilterStatsCard';
import * as hooks from '@ui/api/hooks/useFilteringStats';

// Mock filtering stats data
const mockFilteringStats = {
  enabled: true,
  mode: 'hybrid' as const,
  totalTools: 150,
  filteredTools: 75,
  exposedTools: 75,
  filterRate: 0.5,
  serverFilterMode: 'allowlist' as const,
  allowedServers: ['server1'],
  allowedCategories: ['filesystem', 'database'],
  categoryCacheSize: 500,
  cacheHitRate: 0.942,
  llmCacheSize: 200,
  llmCacheHitRate: 0.88,
  timestamp: '2025-11-16T12:00:00Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('FilterStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading and Error States', () => {
    it('should display loading skeletons while data is loading', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      const { container } = render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
      const refreshButton = screen.getByRole('button');
      expect(refreshButton).toBeDisabled();
    });

    it('should display error alert when query fails', () => {
      // Arrange
      const mockError = new Error('Network error');
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.getByText(/Failed to load filtering stats: Network error/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled();
    });

    it('should display info alert when no stats available', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.getByText(/No filtering stats available/i)
      ).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should display all filtering stats correctly', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Tool Filtering Stats')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument(); // Status chip
      expect(screen.getByText('hybrid')).toBeInTheDocument(); // Mode
      expect(screen.getByText('150')).toBeInTheDocument(); // Total tools
      const exposedAndFilteredTexts = screen.getAllByText(/75 \(50\.0%\)/);
      expect(exposedAndFilteredTexts).toHaveLength(2); // Exposed and filtered tools
      expect(screen.getByText('50.0%')).toBeInTheDocument(); // Filter rate
      expect(screen.getByText('94.2%')).toBeInTheDocument(); // Cache hit rate
    });

    it('should display status chip with success color when enabled', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      const statusChip = screen.getByText('Enabled');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip.closest('.MuiChip-colorSuccess')).toBeInTheDocument();
    });

    it('should display status chip with default color when disabled', () => {
      // Arrange
      const disabledStats = { ...mockFilteringStats, enabled: false };
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: disabledStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      const statusChip = screen.getByText('Disabled');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip.closest('.MuiChip-colorDefault')).toBeInTheDocument();
    });

    it('should calculate and display percentages correctly', () => {
      // Arrange
      const statsWithDifferentValues = {
        ...mockFilteringStats,
        totalTools: 200,
        exposedTools: 50,
        filteredTools: 150,
        filterRate: 0.75,
        cacheHitRate: 0.85,
      };
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: statsWithDifferentValues,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText(/50 \(25\.0%\)/)).toBeInTheDocument(); // Exposed: 50/200 = 25%
      expect(screen.getByText(/150 \(75\.0%\)/)).toBeInTheDocument(); // Filtered: 150/200 = 75%
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Filter rate
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Cache hit rate
    });

    it('should display allowed categories when present', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Active Categories:')).toBeInTheDocument();
      expect(screen.getByText('filesystem')).toBeInTheDocument();
      expect(screen.getByText('database')).toBeInTheDocument();
    });

    it('should not display categories section when empty', () => {
      // Arrange
      const statsWithoutCategories = {
        ...mockFilteringStats,
        allowedCategories: [],
      };
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: statsWithoutCategories,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.queryByText('Active Categories:')
      ).not.toBeInTheDocument();
    });
  });

  describe('Refresh Button', () => {
    it('should call refetch when refresh button is clicked', async () => {
      // Arrange
      const mockRefetch = vi.fn();
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const user = userEvent.setup();

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should allow refresh button click in error state', async () => {
      // Arrange
      const mockRefetch = vi.fn();
      const mockError = new Error('Network error');
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      const user = userEvent.setup();

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(refreshButton).toBeEnabled();
    });

    it('should disable refresh button during loading', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });
      const refreshButton = screen.getByRole('button');

      // Assert
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total tools without division errors', () => {
      // Arrange
      const statsWithZeroTools = {
        ...mockFilteringStats,
        totalTools: 0,
        exposedTools: 0,
        filteredTools: 0,
      };
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: statsWithZeroTools,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as Partial<ReturnType<typeof hooks.useFilteringStats>> as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('0')).toBeInTheDocument(); // Total tools
      const zeroPercentageTexts = screen.getAllByText(/0 \(0\.0%\)/);
      expect(zeroPercentageTexts).toHaveLength(2); // Exposed and filtered tools
    });

    it('should handle undefined allowedCategories gracefully', () => {
      // Arrange
      const statsWithoutCategories = {
        ...mockFilteringStats,
        allowedCategories: undefined,
      };
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: statsWithoutCategories as any,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      // Act
      render(<FilterStatsCard />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.queryByText('Active Categories:')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Tool Filtering Stats')).toBeInTheDocument();
    });
  });
});
