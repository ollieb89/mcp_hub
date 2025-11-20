import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../../../src/ui/components/Sidebar';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('MCP Hub')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('highlights active link', () => {
    render(
      <MemoryRouter initialEntries={['/servers']}>
        <Sidebar />
      </MemoryRouter>
    );

    // The active link should have the 'active' class.
    // MUI ListItemButton with NavLink component applies 'active' class when route matches.
    // We can check if the element with text 'Servers' or its parent has the active class.
    // Or check for specific styles if we can't check class.
    // But NavLink adds 'active' class by default.
    
    const serversLink = screen.getByRole('link', { name: /servers/i });
    expect(serversLink).toHaveClass('active');
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).not.toHaveClass('active');
  });
});
