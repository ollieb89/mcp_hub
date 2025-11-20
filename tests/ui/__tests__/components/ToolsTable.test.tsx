import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolsTable from '@components/ToolsTable';
import type { ToolSummary } from '@api/schemas/tools.schema';

const createMockToolSummary = (overrides: Partial<ToolSummary> = {}): ToolSummary => ({
  server: 'test-server',
  serverDisplayName: 'Test Server',
  name: 'test_tool',
  description: 'Test tool description',
  enabled: true,
  categories: ['test'],
  ...overrides,
});

describe('ToolsTable', () => {
  it('renders empty state correctly', () => {
    render(<ToolsTable tools={[]} />);
    
    expect(screen.getByText('Available Tools')).toBeInTheDocument();
    expect(screen.getByText(/no tools match the current filters/i)).toBeInTheDocument();
  });

  it('renders list of tools correctly', () => {
    const tools = [
      createMockToolSummary({ 
        name: 'tool-1', 
        server: 'server-1',
        serverDisplayName: 'server-1',
        categories: ['cat-1']
      }),
      createMockToolSummary({ 
        name: 'tool-2', 
        server: 'server-2',
        serverDisplayName: 'server-2',
        categories: ['cat-2']
      })
    ];
    
    render(<ToolsTable tools={tools} />);
    
    expect(screen.getByText('tool-1')).toBeInTheDocument();
    expect(screen.getByText('tool-2')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
    expect(screen.getByText('server-2')).toBeInTheDocument();
    expect(screen.getByText('cat-1')).toBeInTheDocument();
    expect(screen.getByText('cat-2')).toBeInTheDocument();
  });

  it('filters tools by search query', async () => {
    const tools = [
      createMockToolSummary({ name: 'alpha-tool' }),
      createMockToolSummary({ name: 'beta-tool' })
    ];
    
    render(<ToolsTable tools={tools} />);
    
    const searchInput = screen.getByPlaceholderText(/search tools/i);
    await userEvent.type(searchInput, 'alpha');
    
    expect(screen.getByText('alpha-tool')).toBeInTheDocument();
    expect(screen.queryByText('beta-tool')).not.toBeInTheDocument();
  });

  it('filters tools by server', async () => {
    const tools = [
      createMockToolSummary({ name: 'tool-1', server: 'server-a', serverDisplayName: 'server-a' }),
      createMockToolSummary({ name: 'tool-2', server: 'server-b', serverDisplayName: 'server-b' })
    ];
    
    render(<ToolsTable tools={tools} />);
    
    // Open server filter
    const serverSelect = screen.getByLabelText(/^server$/i);
    await userEvent.click(serverSelect);
    
    // Select server-a
    const option = screen.getByRole('option', { name: 'server-a' });
    await userEvent.click(option);
    
    expect(screen.getByText('tool-1')).toBeInTheDocument();
    expect(screen.queryByText('tool-2')).not.toBeInTheDocument();
  });

  it('filters tools by category', async () => {
    const tools = [
      createMockToolSummary({ name: 'tool-1', categories: ['web'] }),
      createMockToolSummary({ name: 'tool-2', categories: ['filesystem'] })
    ];
    
    render(<ToolsTable tools={tools} />);
    
    // Open category filter
    const categorySelect = screen.getByLabelText(/^category$/i);
    await userEvent.click(categorySelect);
    
    // Select web
    const option = screen.getByRole('option', { name: 'web' });
    await userEvent.click(option);
    
    expect(screen.getByText('tool-1')).toBeInTheDocument();
    expect(screen.queryByText('tool-2')).not.toBeInTheDocument();
  });

  it('shows loading state in search bar', () => {
    render(<ToolsTable tools={[]} loading={true} />);
    
    // Check for CircularProgress (it usually has role="progressbar")
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
