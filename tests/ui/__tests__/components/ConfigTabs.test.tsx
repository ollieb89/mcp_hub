import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfigTabs from '../../../../src/ui/components/ConfigTabs';

describe('ConfigTabs', () => {
  const mockOnChange = vi.fn();
  const tabs = [
    { label: 'Tab 1', content: <div>Content 1</div> },
    { label: 'Tab 2', content: <div>Content 2</div> },
  ];

  it('renders tabs and active content', () => {
    render(<ConfigTabs value={0} onChange={mockOnChange} tabs={tabs} />);

    // Check tabs are rendered
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();

    // Check active content is visible
    expect(screen.getByText('Content 1')).toBeVisible();
    
    // Check inactive content is not rendered
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('calls onChange when clicking a tab', async () => {
    render(<ConfigTabs value={0} onChange={mockOnChange} tabs={tabs} />);

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await userEvent.click(tab2);

    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('renders correct content when value changes', () => {
    render(<ConfigTabs value={1} onChange={mockOnChange} tabs={tabs} />);

    expect(screen.getByText('Content 2')).toBeVisible();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('sets aria attributes correctly', () => {
    render(<ConfigTabs value={0} onChange={mockOnChange} tabs={tabs} />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2).toHaveAttribute('aria-selected', 'false');
    
    const panel1 = screen.getByRole('tabpanel', { hidden: false }); // Only active one is not hidden to accessibility tree?
    // Actually, hidden={false} attribute is on the Box.
    // Let's check by ID if possible, but we don't have easy access to IDs generated inside.
    // But we can check if the visible panel corresponds to the active tab.
  });
});
