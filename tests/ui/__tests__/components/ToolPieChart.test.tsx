import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ToolPieChart from '../../../../src/ui/components/ToolPieChart';

// Mock PieChart
vi.mock('@mui/x-charts/PieChart', () => ({
  PieChart: () => <div data-testid="pie-chart">Pie Chart</div>,
}));

describe('ToolPieChart', () => {
  const mockStats = {
    enabled: true,
    mode: 'static',
    totalTools: 10,
    exposedTools: 8,
    filteredTools: 2,
    filterRate: 0.2,
    cacheHitRate: 0.9,
    allowedCategories: [],
  };

  it('renders chart with stats', () => {
    render(<ToolPieChart stats={mockStats} />);

    expect(screen.getByText('Tool Distribution')).toBeInTheDocument();
    expect(screen.getByText('10 tools')).toBeInTheDocument();
    expect(screen.getByText('Exposed 8, Filtered 2')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders loading/empty state when stats is null', () => {
    render(<ToolPieChart stats={null} />);
    
    // Skeletons
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    // Should still see title? No, MetricCard renders title but if stats is null it renders skeletons for value/subtitle.
    // Wait, if stats is null, it returns a MetricCard with skeletons.
    expect(screen.getByText('Tool Distribution')).toBeInTheDocument();
  });

  it('renders no tools message when total is 0', () => {
    const emptyStats = { ...mockStats, totalTools: 0, exposedTools: 0, filteredTools: 0 };
    render(<ToolPieChart stats={emptyStats} />);
    
    expect(screen.getByText('0 tools')).toBeInTheDocument();
    expect(screen.getByText('No tools available yet.')).toBeInTheDocument();
  });
});
