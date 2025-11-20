/**
 * Tests for ToolFilterPanel component
 * Validates filtering configuration UI, mode selection, enabled toggle,
 * apply/reset buttons, and mutation handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ToolFilterPanel } from '../ToolFilterPanel';
import type { FilteringStats } from '@ui/api/filtering';
import * as hooks from '@ui/api/hooks';
import * as mutations from '@ui/api/mutations';

// Mock data
const mockFilteringStats: FilteringStats = {
  enabled: true,
  mode: 'static',
  totalTools: 150,
  filteredTools: 75,
  exposedTools: 75,
  filterRate: 0.5,
  serverFilterMode: 'allowlist',
  allowedServers: ['server1'],
  allowedCategories: ['filesystem', 'database'],
  categoryCacheSize: 500,
  cacheHitRate: 0.942,
  llmCacheSize: 200,
  llmCacheHitRate: 0.88,
  timestamp: '2025-11-16T12:00:00Z',
};

// Helper to create QueryClient with disabled retries
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// Wrapper component for tests
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('ToolFilterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading and Error States', () => {
    it('should display loading spinner when data is loading', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display error alert when data fetch fails', () => {
      // Arrange
      const error = new Error('Network error');
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      } as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.getByText(/Failed to load filtering configuration/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('should display info alert when no stats are available', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.getByText(/No filtering stats available/)
      ).toBeInTheDocument();
    });
  });

  describe('Initial Rendering', () => {
    beforeEach(() => {
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);
    });

    it('should render with stats data and show current configuration', () => {
      // Arrange + Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(
        screen.getByText('Tool Filtering Configuration')
      ).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeChecked();
      expect(screen.getByRole('combobox', { name: /Filtering Mode/i })).toHaveTextContent('Static');
      expect(screen.getByText(/Mode: static • Enabled: Yes/)).toBeInTheDocument();
    });

    it('should show disabled state when filtering is disabled in stats', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: { ...mockFilteringStats, enabled: false },
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByRole('switch')).not.toBeChecked();
      expect(screen.getByText('Filtering Disabled')).toBeInTheDocument();
    });

    it('should disable mode select when filtering is disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: { ...mockFilteringStats, enabled: false },
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });

      // Assert - mui-disabled class is used by Material-UI for disabled state
      expect(modeSelect).toHaveClass('Mui-disabled');
    });
  });

  describe('Mode Selection', () => {
    beforeEach(() => {
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);
    });

    it('should update draft state when mode is changed', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act - Open select and choose Category mode
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
      await user.click(modeSelect);
      await user.click(screen.getByRole('option', { name: 'Category' }));

      // Assert - Buttons should be enabled (has changes)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Reset/i })).toBeEnabled();
      });
    });

    it('should show category selector hint for category mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
      await user.click(modeSelect);
      await user.click(screen.getByRole('option', { name: 'Category' }));

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Filter Categories')).toBeInTheDocument();
      });
    });

    it('should show category selector hint for hybrid mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
      await user.click(modeSelect);
      await user.click(screen.getByRole('option', { name: 'Hybrid' }));

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Filter Categories')).toBeInTheDocument();
      });
    });

    it('should not show category selector for static mode', () => {
      // Arrange + Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.queryByText(/Category Selection/)).not.toBeInTheDocument();
    });
  });

  describe('Enabled Toggle', () => {
    beforeEach(() => {
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);
    });

    it('should toggle enabled state and enable Apply button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act
      const enableSwitch = screen.getByRole('switch');
      await user.click(enableSwitch);

      // Assert
      expect(enableSwitch).not.toBeChecked();
      expect(screen.getByText('Filtering Disabled')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeEnabled();
    });

    it('should disable mode select when toggled off', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act
      await user.click(screen.getByRole('switch'));

      // Assert
      await waitFor(() => {
        const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
        expect(modeSelect).toHaveClass('Mui-disabled');
      });
    });
  });

  describe('Apply and Reset Buttons', () => {
    let mockUpdateMode: ReturnType<typeof vi.fn>;
    let mockToggleFiltering: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUpdateMode = vi.fn().mockResolvedValue({});
      mockToggleFiltering = vi.fn().mockResolvedValue({});

      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockUpdateMode,
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockToggleFiltering,
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);
    });

    it('should have Apply and Reset buttons disabled when no changes', () => {
      // Arrange + Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Reset/i })).toBeDisabled();
    });

    it('should call updateMode mutation when mode is changed and applied', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act - Change mode and apply
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
      await user.click(modeSelect);
      await user.click(screen.getByRole('option', { name: 'Category' }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeEnabled();
      });
      
      await user.click(screen.getByRole('button', { name: /Apply Changes/i }));

      // Assert
      await waitFor(() => {
        expect(mockUpdateMode).toHaveBeenCalledWith('category');
      });
    });

    it('should call toggleFiltering mutation when enabled is changed and applied', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act - Toggle enabled and apply
      const enableSwitch = screen.getByRole('switch');
      await user.click(enableSwitch);
      await user.click(screen.getByRole('button', { name: /Apply Changes/i }));

      // Assert
      await waitFor(() => {
        expect(mockToggleFiltering).toHaveBeenCalledWith(false);
      });
    });

    it('should call both mutations when both mode and enabled are changed', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act - Change mode first (while enabled), then toggle enabled, then apply
      const modeSelect = screen.getByRole('combobox', { name: /Filtering Mode/i });
      await user.click(modeSelect);
      await user.click(screen.getByRole('option', { name: 'Hybrid' }));
      
      const enableSwitch = screen.getByRole('switch');
      await user.click(enableSwitch);
      
      await user.click(screen.getByRole('button', { name: /Apply Changes/i }));

      // Assert
      await waitFor(() => {
        expect(mockUpdateMode).toHaveBeenCalledWith('hybrid');
        expect(mockToggleFiltering).toHaveBeenCalledWith(false);
      });
    });

    it('should reset draft state when Reset button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Act - Make change and reset
      const enableSwitch = screen.getByRole('switch');
      await user.click(enableSwitch);
      await user.click(screen.getByRole('button', { name: /Reset/i }));

      // Assert - Buttons should be disabled again (no changes)
      expect(screen.getByRole('button', { name: /Apply Changes/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Reset/i })).toBeDisabled();
      expect(enableSwitch).toBeChecked();
    });
  });

  describe('Mutation States', () => {
    beforeEach(() => {
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);
    });

    it('should show loading state during mutation', () => {
      // Arrange
      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByRole('button', { name: /Applying.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Applying.../i })).toBeDisabled();
    });

    it('should disable all inputs during mutation', () => {
      // Arrange
      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByRole('switch')).toBeDisabled();
      expect(screen.getByRole('combobox', { name: /Filtering Mode/i })).toHaveClass('Mui-disabled');
    });
  });

  describe('Current Configuration Display', () => {
    it('should display current server configuration info', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: mockFilteringStats,
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText(/Mode: static • Enabled: Yes/)).toBeInTheDocument();
      expect(screen.getByText(/Categories: database, filesystem/)).toBeInTheDocument();
    });

    it('should not show categories section when no categories are set', () => {
      // Arrange
      vi.spyOn(hooks, 'useFilteringStats').mockReturnValue({
        data: { ...mockFilteringStats, allowedCategories: [] },
        isLoading: false,
        error: null,
      } as ReturnType<typeof hooks.useFilteringStats>);

      vi.spyOn(mutations, 'useUpdateFilteringMode').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useUpdateFilteringMode>);

      vi.spyOn(mutations, 'useToggleFiltering').mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof mutations.useToggleFiltering>);

      // Act
      render(<ToolFilterPanel />, { wrapper: createWrapper() });

      // Assert
      expect(screen.queryByText(/Categories:/)).not.toBeInTheDocument();
    });
  });
});
