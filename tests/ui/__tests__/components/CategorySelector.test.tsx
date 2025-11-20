import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategorySelector } from '../../../../src/ui/components/CategorySelector';
import * as useToolsHook from '../../../../src/ui/api/hooks/useTools';

// Mock the useTools hook
vi.mock('../../../../src/ui/api/hooks/useTools', () => ({
  useTools: vi.fn(),
}));

describe('CategorySelector', () => {
  const mockOnChange = vi.fn();
  const mockTools = [
    { name: 'tool1', categories: ['cat1', 'cat2'] },
    { name: 'tool2', categories: ['cat2', 'cat3'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    (useToolsHook.useTools as any).mockReturnValue({
      data: { tools: mockTools },
      isLoading: false,
    });
  });

  it('renders with label and placeholder', () => {
    render(<CategorySelector value={[]} onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Filter Categories')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select categories...')).toBeInTheDocument();
  });

  it('displays unique categories from tools', async () => {
    render(<CategorySelector value={[]} onChange={mockOnChange} />);
    
    // Open the dropdown
    const input = screen.getByLabelText('Filter Categories');
    await userEvent.click(input);
    
    // Check options (cat1, cat2, cat3) - should be unique and sorted
    expect(screen.getByRole('option', { name: 'cat1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'cat2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'cat3' })).toBeInTheDocument();
    
    // Ensure no duplicates
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('calls onChange when a category is selected', async () => {
    render(<CategorySelector value={[]} onChange={mockOnChange} />);
    
    // Open dropdown
    const input = screen.getByLabelText('Filter Categories');
    await userEvent.click(input);
    
    // Select cat1
    await userEvent.click(screen.getByRole('option', { name: 'cat1' }));
    
    expect(mockOnChange).toHaveBeenCalledWith(['cat1']);
  });

  it('shows selected values as checked', async () => {
    render(<CategorySelector value={['cat1']} onChange={mockOnChange} />);
    
    // Open dropdown
    const input = screen.getByLabelText('Filter Categories');
    await userEvent.click(input);
    
    // Check if cat1 is checked
    const option = screen.getByRole('option', { name: 'cat1' });
    const checkbox = within(option).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    
    // Check if cat2 is unchecked
    const option2 = screen.getByRole('option', { name: 'cat2' });
    const checkbox2 = within(option2).getByRole('checkbox');
    expect(checkbox2).not.toBeChecked();
  });

  it('shows loading state', () => {
    (useToolsHook.useTools as any).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<CategorySelector value={[]} onChange={mockOnChange} />);
    
    // Autocomplete usually shows a loading indicator if loading prop is true
    // But here we are also passing it to InputProps endAdornment
    // Let's check if the input is disabled or if loading indicator is present
    
    const input = screen.getByLabelText('Filter Categories');
    expect(input).toBeDisabled();
    
    // Check for progressbar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<CategorySelector value={[]} onChange={mockOnChange} disabled={true} />);
    
    const input = screen.getByLabelText('Filter Categories');
    expect(input).toBeDisabled();
  });
});
