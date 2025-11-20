import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryListEditor from '../../../../src/ui/components/CategoryListEditor';

describe('CategoryListEditor', () => {
  const mockOnChange = vi.fn();
  const defaultCategories = ['cat1', 'cat2'];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders title and existing categories', () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
        title="Test Categories"
      />
    );

    expect(screen.getByText('Test Categories')).toBeInTheDocument();
    expect(screen.getByText('cat1')).toBeInTheDocument();
    expect(screen.getByText('cat2')).toBeInTheDocument();
  });

  it('adds a new category via button click', async () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add category');
    await userEvent.type(input, 'new-cat');
    
    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith([...defaultCategories, 'new-cat']);
  });

  it('adds a new category via Enter key', async () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add category');
    await userEvent.type(input, 'new-cat{enter}');

    expect(mockOnChange).toHaveBeenCalledWith([...defaultCategories, 'new-cat']);
  });

  it('does not add duplicate categories', async () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add category');
    await userEvent.type(input, 'cat1');
    
    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(''); // Should clear input even if duplicate
  });

  it('does not add empty categories', async () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('removes a category', async () => {
    render(
      <CategoryListEditor
        categories={defaultCategories}
        onChange={mockOnChange}
      />
    );

    // Find the delete button for 'cat1'
    // Chips with onDelete render a delete icon which is usually a button or svg
    // We can find the chip by text, then find the delete icon inside it
    // Or use getAllByTestId if MUI provides one, but usually it's an SVG with role="button" or similar?
    // Actually MUI Chip delete icon has class MuiChip-deleteIcon
    // Let's try to find the chip and then the delete icon.
    
    // A better way with testing-library is to look for the delete button associated with the chip.
    // MUI Chip delete icon usually has `CancelIcon` or similar.
    // Let's try to click the delete icon inside the chip.
    
    const chip = screen.getByText('cat1').closest('.MuiChip-root');
    // The delete icon is a sibling or child.
    // Usually it's an svg with data-testid="CancelIcon" or similar if using default icons.
    // But we can just click the SVG inside the chip.
    
    // Alternatively, userEvent.click(screen.getByText('cat1').nextElementSibling) might work if structure is known.
    // But let's rely on the fact that there is a delete icon.
    
    // Let's try to find the delete icon by its role if it has one, or just query selector.
    const deleteIcon = chip?.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).toBeInTheDocument();
    
    if (deleteIcon) {
        await userEvent.click(deleteIcon);
    }

    expect(mockOnChange).toHaveBeenCalledWith(['cat2']);
  });

  it('renders empty state message', () => {
    render(
      <CategoryListEditor
        categories={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No categories defined.')).toBeInTheDocument();
  });
});
