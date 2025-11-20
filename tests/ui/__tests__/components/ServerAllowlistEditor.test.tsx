import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ServerAllowlistEditor from '../../../../src/ui/components/ServerAllowlistEditor';

describe('ServerAllowlistEditor', () => {
  const mockOnChange = vi.fn();
  const defaultServers = ['server1', 'server2'];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders title and existing servers', () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
        title="Test Servers"
      />
    );

    expect(screen.getByText('Test Servers')).toBeInTheDocument();
    expect(screen.getByText('server1')).toBeInTheDocument();
    expect(screen.getByText('server2')).toBeInTheDocument();
  });

  it('adds a new server via button click', async () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add server name');
    await userEvent.type(input, 'new-server');
    
    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith([...defaultServers, 'new-server']);
  });

  it('adds a new server via Enter key', async () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add server name');
    await userEvent.type(input, 'new-server{enter}');

    expect(mockOnChange).toHaveBeenCalledWith([...defaultServers, 'new-server']);
  });

  it('does not add duplicate servers', async () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Add server name');
    await userEvent.type(input, 'server1');
    
    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('does not add empty servers', async () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    await userEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('removes a server', async () => {
    render(
      <ServerAllowlistEditor
        servers={defaultServers}
        onChange={mockOnChange}
      />
    );

    const chip = screen.getByText('server1').closest('.MuiChip-root');
    const deleteIcon = chip?.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).toBeInTheDocument();
    
    if (deleteIcon) {
        await userEvent.click(deleteIcon);
    }

    expect(mockOnChange).toHaveBeenCalledWith(['server2']);
  });

  it('renders empty state message', () => {
    render(
      <ServerAllowlistEditor
        servers={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No allowed servers defined.')).toBeInTheDocument();
  });
});
