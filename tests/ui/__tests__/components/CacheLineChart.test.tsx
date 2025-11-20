import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CacheLineChart from '../../../../src/ui/components/CacheLineChart';

// Mock LineChart
vi.mock('@mui/x-charts/LineChart', () => ({
  LineChart: () => <div data-testid="line-chart">Line Chart</div>,
}));

describe('CacheLineChart', () => {
  const mockHistory = [
    { timestamp: '2023-01-01T10:00:00Z', cacheHitRate: 0.5, llmCacheHitRate: 0.6 },
    { timestamp: '2023-01-01T10:05:00Z', cacheHitRate: 0.7, llmCacheHitRate: 0.8 },
  ];

  it('renders chart with data', () => {
    render(<CacheLineChart history={mockHistory} />);

    expect(screen.getByText('Cache Performance')).toBeInTheDocument();
    expect(screen.getByText('70% cache hit rate')).toBeInTheDocument();
    expect(screen.getByText('LLM cache hit rate 80%')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<CacheLineChart history={[]} loading={true} />);
    
    // Skeletons don't have text, but we can check that chart is not rendered
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('renders no data state', () => {
    render(<CacheLineChart history={[]} />);
    
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Cache metrics will appear once statistics load.')).toBeInTheDocument();
    expect(screen.getByText('More data points are required to render cache trends.')).toBeInTheDocument();
  });

  it('renders insufficient data message', () => {
    const singlePoint = [mockHistory[0]];
    render(<CacheLineChart history={singlePoint} />);
    
    expect(screen.getByText('50% cache hit rate')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.getByText('More data points are required to render cache trends.')).toBeInTheDocument();
  });
});
