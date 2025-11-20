/**
 * Tests for CategorySelector Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CategorySelector } from '../CategorySelector';
import * as hooks from '@ui/api/hooks/useTools';
import type { ToolsResponse } from '@ui/api/schemas/tools.schema';

// Mock tools data
const mockToolsData: ToolsResponse = {
  tools: [
    {
      server: 'server1',
      serverDisplayName: 'Server 1',
      name: 'tool1',
      description: 'Tool 1',
      enabled: true,
      categories: ['filesystem', 'database'],
    },
    {
      server: 'server1',
      serverDisplayName: 'Server 1',
      name: 'tool2',
      description: 'Tool 2',
      enabled: true,
      categories: ['database', 'network'],
    },
    {
      server: 'server2',
      serverDisplayName: 'Server 2',
      name: 'tool3',
      description: 'Tool 3',
      enabled: true,
      categories: ['security', 'filesystem'],
    },
  ],
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

describe('CategorySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render with empty selection', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(
        screen.getByLabelText('Filter Categories')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Select categories...')).toBeInTheDocument();
    });

    it('should extract and display unique categories from tools', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      // Open the autocomplete dropdown
      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);

      // Assert
      // Should have 4 unique categories: filesystem, database, network, security
      expect(screen.getByText('database')).toBeInTheDocument();
      expect(screen.getByText('filesystem')).toBeInTheDocument();
      expect(screen.getByText('network')).toBeInTheDocument();
      expect(screen.getByText('security')).toBeInTheDocument();
    });

    it('should display categories in sorted order', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);

      // Assert
      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      const categoryTexts = options.map((opt) => opt.textContent);

      // Expected sorted order: database, filesystem, network, security
      expect(categoryTexts).toEqual(['database', 'filesystem', 'network', 'security']);
    });

    it('should display loading indicator while tools are loading', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter Categories')).toBeDisabled();
    });

    it('should handle empty tools data gracefully', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: { tools: [], timestamp: '2025-11-16T12:00:00Z' },
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByLabelText('Filter Categories')).toBeInTheDocument();
      // Should not crash, but have no options
    });
  });

  describe('Selection Behavior', () => {
    it('should call onChange when category is selected', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);
      await user.click(screen.getByText('filesystem'));

      // Assert
      expect(mockOnChange).toHaveBeenCalledWith(['filesystem']);
    });

    it('should call onChange when multiple categories are selected', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);
      await user.click(screen.getByText('filesystem'));
      await user.click(screen.getByText('database'));

      // Assert
      // First click adds 'filesystem', second adds 'database'
      expect(mockOnChange).toHaveBeenNthCalledWith(1, ['filesystem']);
      expect(mockOnChange).toHaveBeenNthCalledWith(2, ['database']);
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should display selected categories as chips', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector
          value={['filesystem', 'database']}
          onChange={mockOnChange}
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('filesystem')).toBeInTheDocument();
      expect(screen.getByText('database')).toBeInTheDocument();
    });

    it('should call onChange when category is deselected', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector
          value={['filesystem', 'database']}
          onChange={mockOnChange}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);
      
      // Click on the filesystem option in the listbox (not the chip)
      const listbox = screen.getByRole('listbox');
      const filesystemOption = within(listbox).getByText('filesystem');
      await user.click(filesystemOption);

      // Assert
      expect(mockOnChange).toHaveBeenCalledWith(['database']);
    });
  });

  describe('Checkbox States', () => {
    it('should display checkboxes for each category', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);

      // Assert
      const listbox = screen.getByRole('listbox');
      const checkboxes = within(listbox).getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 4 unique categories
    });

    it('should show checked checkboxes for selected categories', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector
          value={['filesystem', 'database']}
          onChange={mockOnChange}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.click(input);

      // Assert
      const listbox = screen.getByRole('listbox');
      const checkboxes = within(listbox).getAllByRole('checkbox');
      const checkedCheckboxes = checkboxes.filter((cb) => cb.getAttribute('data-testid') === 'CheckBoxIcon');

      // Should have 2 checked (filesystem, database)
      expect(checkboxes.filter((cb) => (cb as HTMLInputElement).checked)).toHaveLength(2);
    });
  });

  describe('Search and Filter', () => {
    it('should filter categories based on search input', async () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      const user = userEvent.setup();

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByLabelText('Filter Categories');
      await user.type(input, 'file');

      // Assert
      // Should show only 'filesystem' option
      expect(screen.getByText('filesystem')).toBeInTheDocument();
      expect(screen.queryByText('database')).not.toBeInTheDocument();
      expect(screen.queryByText('network')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable selector when disabled prop is true', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: mockToolsData,
        isLoading: false,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector
          value={[]}
          onChange={mockOnChange}
          disabled={true}
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByLabelText('Filter Categories')).toBeDisabled();
    });

    it('should disable selector when tools are loading', () => {
      // Arrange
      const mockOnChange = vi.fn();
      vi.spyOn(hooks, 'useTools').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as Partial<ReturnType<typeof hooks.useTools>> as ReturnType<typeof hooks.useTools>);

      // Act
      render(
        <CategorySelector value={[]} onChange={mockOnChange} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByLabelText('Filter Categories')).toBeDisabled();
    });
  });
});
