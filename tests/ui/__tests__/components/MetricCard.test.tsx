import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricCard from '@components/MetricCard';

describe('MetricCard', () => {
  it('renders title and value correctly', () => {
    render(<MetricCard title="Test Metric" value="42" />);
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <MetricCard 
        title="Test Metric" 
        value="42" 
        subtitle="Test Subtitle" 
      />
    );
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    
    render(
      <MetricCard 
        title="Test Metric" 
        value="42" 
        icon={<TestIcon />} 
      />
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <MetricCard title="Test Metric" value="42">
        <div data-testid="child-content">Child Content</div>
      </MetricCard>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
