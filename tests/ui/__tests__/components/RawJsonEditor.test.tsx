import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RawJsonEditor from '../../../../src/ui/components/RawJsonEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => {
  return {
    default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

describe('RawJsonEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnFormat = vi.fn();
  const initialJson = '{"key": "value"}';

  it('renders editor with initial value', async () => {
    render(
      <RawJsonEditor
        value={initialJson}
        onChange={mockOnChange}
      />
    );

    // Wait for lazy load
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('monaco-editor')).toHaveValue(initialJson);
  });

  it('calls onChange when content changes', async () => {
    render(
      <RawJsonEditor
        value={initialJson}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    const editor = screen.getByTestId('monaco-editor');
    await userEvent.clear(editor);
    await userEvent.type(editor, 'foo');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('renders format button when onFormat is provided', async () => {
    render(
      <RawJsonEditor
        value={initialJson}
        onChange={mockOnChange}
        onFormat={mockOnFormat}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /format json/i })).toBeInTheDocument();
    });
  });

  it('calls onFormat when format button is clicked', async () => {
    render(
      <RawJsonEditor
        value={initialJson}
        onChange={mockOnChange}
        onFormat={mockOnFormat}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /format json/i })).toBeInTheDocument();
    });

    const formatBtn = screen.getByRole('button', { name: /format json/i });
    await userEvent.click(formatBtn);

    expect(mockOnFormat).toHaveBeenCalled();
  });

  it('does not render format button when onFormat is not provided', async () => {
    render(
      <RawJsonEditor
        value={initialJson}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /format json/i })).not.toBeInTheDocument();
    });
  });
});
