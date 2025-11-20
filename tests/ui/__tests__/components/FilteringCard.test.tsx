import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilteringCard from '@components/FilteringCard';
import { createMockFilteringStats } from '../../utils/test-data';

describe('FilteringCard', () => {
  it('renders loading state correctly', () => {
    render(
      <FilteringCard 
        stats={null} 
        onToggle={vi.fn()} 
        onModeChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Filtering Status')).toBeInTheDocument();
    expect(screen.getByText(/Loading…/)).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('renders enabled state correctly', () => {
    const stats = createMockFilteringStats({ enabled: true });
    
    render(
      <FilteringCard 
        stats={stats} 
        onToggle={vi.fn()} 
        onModeChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('renders disabled state correctly', () => {
    const stats = createMockFilteringStats({ enabled: false });
    
    render(
      <FilteringCard 
        stats={stats} 
        onToggle={vi.fn()} 
        onModeChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('calls onToggle when switch is clicked', async () => {
    const onToggle = vi.fn();
    const stats = createMockFilteringStats({ enabled: false });
    
    render(
      <FilteringCard 
        stats={stats} 
        onToggle={onToggle} 
        onModeChange={vi.fn()} 
      />
    );
    
    const switchControl = screen.getByRole('switch');
    await userEvent.click(switchControl);
    
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onModeChange when mode is selected', async () => {
    const onModeChange = vi.fn();
    const stats = createMockFilteringStats({ mode: 'category' });
    
    render(
      <FilteringCard 
        stats={stats} 
        onToggle={vi.fn()} 
        onModeChange={onModeChange} 
      />
    );
    
    // Open select
    const select = screen.getByRole('combobox', { name: /mode/i });
    await userEvent.click(select);
    
    // Select option
    const option = screen.getByRole('option', { name: /hybrid/i });
    await userEvent.click(option);
    
    expect(onModeChange).toHaveBeenCalledWith('hybrid');
  });

  it('disables controls when pending', () => {
    const stats = createMockFilteringStats();
    
    render(
      <FilteringCard 
        stats={stats} 
        pending={true}
        onToggle={vi.fn()} 
        onModeChange={vi.fn()} 
      />
    );
    
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /mode/i })).toHaveAttribute('aria-disabled', 'true');
  });
});
