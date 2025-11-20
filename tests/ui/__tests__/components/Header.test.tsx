import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@components/Header';

describe('Header', () => {
  it('renders title and subtitle', () => {
    render(<Header />);
    
    expect(screen.getByText('MCP Hub Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor servers, tools, and filtering in real time.')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<Header />);
    
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders notifications button', () => {
    render(<Header />);
    
    // IconButton usually doesn't have a label unless aria-label is set.
    // The code shows <IconButton size="small"><NotificationsNoneIcon /></IconButton>
    // So it might not have an accessible name.
    // We can check for the button role, but there are two buttons.
    // We can check if there are 2 buttons.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });
});
