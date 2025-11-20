import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigPreviewDialog from '@components/ConfigPreviewDialog';
import { createMockConfig } from '../../utils/test-data';

// Mock ReactDiffViewer as it's a complex component
vi.mock('react-diff-viewer-continued', () => ({
  default: () => <div data-testid="mock-diff-viewer">Diff Viewer Content</div>,
}));

describe('ConfigPreviewDialog', () => {
  it('renders dialog when open', () => {
    const currentConfig = createMockConfig().config;
    const proposedConfig = createMockConfig().config;
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Review Configuration Changes')).toBeInTheDocument();
    expect(screen.getByTestId('mock-diff-viewer')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const currentConfig = createMockConfig().config;
    const proposedConfig = createMockConfig().config;
    
    render(
      <ConfigPreviewDialog 
        open={false}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays added server changes', () => {
    const currentConfig = createMockConfig().config;
    const proposedConfig = createMockConfig({
      config: {
        mcpServers: {
          'new-server': { command: 'test' }
        }
      }
    }).config;
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Key Changes (1)')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
    expect(screen.getByText('Added server: new-server')).toBeInTheDocument();
  });

  it('displays removed server changes and warning', () => {
    const currentConfig = createMockConfig({
      config: {
        mcpServers: {
          'old-server': { command: 'test' }
        }
      }
    }).config;
    const proposedConfig = createMockConfig().config; // Empty servers
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('removed')).toBeInTheDocument();
    expect(screen.getByText('Removed server: old-server')).toBeInTheDocument();
    
    // Warning should be present for destructive changes
    expect(screen.getByText(/destructive changes detected/i)).toBeInTheDocument();
  });

  it('displays modified filtering changes', () => {
    const currentConfig = createMockConfig({
      config: {
        toolFiltering: { enabled: false }
      }
    }).config;
    const proposedConfig = createMockConfig({
      config: {
        toolFiltering: { enabled: true }
      }
    }).config;
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('modified')).toBeInTheDocument();
    expect(screen.getByText('Filtering enabled')).toBeInTheDocument();
  });

  it('calls onConfirm when apply button is clicked', async () => {
    const onConfirm = vi.fn();
    const currentConfig = createMockConfig().config;
    const proposedConfig = createMockConfig().config;
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    
    await userEvent.click(screen.getByRole('button', { name: /apply changes/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const currentConfig = createMockConfig().config;
    const proposedConfig = createMockConfig().config;
    
    render(
      <ConfigPreviewDialog 
        open={true}
        currentConfig={currentConfig}
        proposedConfig={proposedConfig}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
