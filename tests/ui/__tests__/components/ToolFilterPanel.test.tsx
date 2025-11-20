import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolFilterPanel } from '../../../../src/ui/components/ToolFilterPanel';
import * as hooks from '../../../../src/ui/api/hooks';
import * as mutations from '../../../../src/ui/api/mutations';

// Mock hooks and mutations
vi.mock('../../../../src/ui/api/hooks', () => ({
  useFilteringStats: vi.fn(),
}));

vi.mock('../../../../src/ui/api/mutations', () => ({
  useUpdateFilteringMode: vi.fn(),
  useToggleFiltering: vi.fn(),
}));

// Mock CategorySelector
vi.mock('../../../../src/ui/components/CategorySelector', () => ({
  CategorySelector: ({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) => (
    <div data-testid="category-selector">
      <button onClick={() => onChange([...value, 'new-cat'])}>Add Cat</button>
      <span>{value.join(', ')}</span>
    </div>
  ),
}));

describe('ToolFilterPanel', () => {
  const mockUpdateMode = vi.fn();
  const mockToggleFiltering = vi.fn();
  
  const mockStats = {
    enabled: true,
    mode: 'static',
    totalTools: 10,
    exposedTools: 8,
    filteredTools: 2,
    filterRate: 0.2,
    cacheHitRate: 0.9,
    allowedCategories: ['cat1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (hooks.useFilteringStats as any).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    });
    (mutations.useUpdateFilteringMode as any).mockReturnValue({
      mutateAsync: mockUpdateMode,
      isPending: false,
    });
    (mutations.useToggleFiltering as any).mockReturnValue({
      mutateAsync: mockToggleFiltering,
      isPending: false,
    });
  });

  it('renders current configuration', () => {
    render(<ToolFilterPanel />);

    expect(screen.getByText('Tool Filtering Configuration')).toBeInTheDocument();
    expect(screen.getByText('Filtering Enabled')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtering Mode')).toHaveTextContent('Static');
    
    // Check info box
    expect(screen.getByText(/Mode: static/)).toBeInTheDocument();
    expect(screen.getByText(/Enabled: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Categories: cat1/)).toBeInTheDocument();
  });

  it('toggles enabled state', async () => {
    render(<ToolFilterPanel />);

    const switchControl = screen.getByRole('switch');
    await userEvent.click(switchControl);

    expect(screen.getByText('Filtering Disabled')).toBeInTheDocument();
    
    // Apply button should be enabled
    const applyBtn = screen.getByRole('button', { name: /apply changes/i });
    expect(applyBtn).toBeEnabled();
    
    await userEvent.click(applyBtn);
    
    expect(mockToggleFiltering).toHaveBeenCalledWith(false);
  });

  it('changes filtering mode', async () => {
    render(<ToolFilterPanel />);

    const modeSelect = screen.getByLabelText('Filtering Mode');
    await userEvent.click(modeSelect);
    
    const option = screen.getByRole('option', { name: 'Category' });
    await userEvent.click(option);

    expect(screen.getByLabelText('Filtering Mode')).toHaveTextContent('Category');
    
    // Category selector should appear
    expect(screen.getByTestId('category-selector')).toBeInTheDocument();
    
    const applyBtn = screen.getByRole('button', { name: /apply changes/i });
    await userEvent.click(applyBtn);
    
    expect(mockUpdateMode).toHaveBeenCalledWith('category');
  });

  it('resets changes', async () => {
    render(<ToolFilterPanel />);

    const switchControl = screen.getByRole('switch');
    await userEvent.click(switchControl);
    
    expect(screen.getByText('Filtering Disabled')).toBeInTheDocument();
    
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await userEvent.click(resetBtn);
    
    expect(screen.getByText('Filtering Enabled')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    (hooks.useFilteringStats as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ToolFilterPanel />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (hooks.useFilteringStats as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load' },
    });

    render(<ToolFilterPanel />);
    
    expect(screen.getByText(/Failed to load filtering configuration: Failed to load/)).toBeInTheDocument();
  });
});
