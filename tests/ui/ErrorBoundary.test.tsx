import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary, { useErrorRecovery } from "@components/ErrorBoundary";
import { useSnackbar } from "@hooks/useSnackbar";

vi.mock("@hooks/useSnackbar", () => ({
  useSnackbar: vi.fn(),
}));

// Component that throws an error
const ThrowError: React.FC<{ message: string }> = ({ message }) => {
  throw new Error(message);
};

// Component that uses useErrorRecovery hook
function ComponentWithErrorRecovery({ operation }: { operation: () => Promise<void> }) {
  const { retry } = useErrorRecovery();
  const [status, setStatus] = React.useState("idle");

  const handleRetry = async () => {
    setStatus("retrying");
    try {
      await retry(operation, 2);
      setStatus("success");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div>
      <div data-testid="status">{status}</div>
      <button type="button" onClick={handleRetry}>Retry Operation</button>
    </div>
  );
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("Core Error Catching", () => {
    it("catches errors thrown by child components", () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it("renders children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Safe content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Safe content")).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it("catches errors thrown during initial render", () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Initial render error" />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/initial render error/i)).toBeInTheDocument();
    });
  });

  describe("Recovery and Retry", () => {
    it("clears error state after successful retry", async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error("Temporary error");
        }
        return <div>Success</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/temporary error/i)).toBeInTheDocument();

      shouldThrow = false;
      const retryButton = screen.getByRole("button", { name: /retry now/i });
      await user.click(retryButton);

      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Custom Fallback UI", () => {
    it("uses custom fallback component when provided", () => {
      const customFallback = (error: Error, _retry: () => void) => (
        <div>
          <div>Custom Error UI: {error.message}</div>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError message="Custom error message" />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/custom error ui:/i)).toBeInTheDocument();
      expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    });
  });

  describe("Error Callbacks", () => {
    it("calls onError callback when error occurs", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalled();
      const [error, info] = onError.mock.calls[0];
      expect(error.message).toBe("Test error");
      expect(info.componentStack).toBeDefined();
    });

    it("calls onError only once per error", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("Recoverable Errors", () => {
    it("shows auto-retry button for recoverable errors", () => {
      const recoverablePatterns = [/network error/i];

      render(
        <ErrorBoundary recoverableErrors={recoverablePatterns}>
          <ThrowError message="Network error occurred" />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("button", { name: /auto-retry/i })).toBeInTheDocument();
    });

    it("does not show auto-retry for non-recoverable errors", () => {
      const recoverablePatterns = [/network error/i];

      render(
        <ErrorBoundary recoverableErrors={recoverablePatterns}>
          <ThrowError message="Non-recoverable error" />
        </ErrorBoundary>,
      );

      expect(screen.queryByRole("button", { name: /auto-retry/i })).not.toBeInTheDocument();
    });

    it("tracks error count for recoverable errors", () => {
      const recoverablePatterns = [/persistent/i];
      render(
        <ErrorBoundary recoverableErrors={recoverablePatterns}>
          <ThrowError message="Persistent error" />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/persistent error/i)).toBeInTheDocument();
      const autoRetryButton = screen.queryByRole("button", { name: /auto-retry/i });
      expect(autoRetryButton).toBeInTheDocument();
      expect(autoRetryButton).toHaveTextContent(/attempt 1\/3/i);
    });
  });

  describe("Error Logging", () => {
    it("logs errors when logToService is enabled", () => {
      render(
        <ErrorBoundary logToService={true}>
          <ThrowError message="Logged error" />
        </ErrorBoundary>,
      );

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it("handles logging errors gracefully", () => {
      render(
        <ErrorBoundary logToService={true}>
          <ThrowError message="Error during logging" />
        </ErrorBoundary>,
      );

      // Should not crash the error boundary
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("Page Reload", () => {
    it("provides reload page option", () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles null children gracefully", () => {
      render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>,
      );

      expect(document.body).toBeInTheDocument();
    });

    it("handles empty error message", () => {
      const EmptyErrorComponent = () => {
        throw new Error("");
      };

      render(
        <ErrorBoundary>
          <EmptyErrorComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("handles rapid retry clicks", async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      const retryButton = screen.getByRole("button", { name: /retry now/i });

      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("maintains error state during scroll", () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Test error" />
        </ErrorBoundary>,
      );

      const errorMessage = screen.getByText(/something went wrong/i);
      expect(errorMessage).toBeInTheDocument();

      window.scrollY = 100;
      fireEvent.scroll(window, { target: { scrollY: 100 } });

      expect(errorMessage).toBeInTheDocument();
    });
  });
});

describe("useErrorRecovery Hook", () => {
  const mockShowSnackbar = vi.fn();

  beforeEach(() => {
    vi.mocked(useSnackbar).mockReturnValue({
      message: null,
      open: false,
      showSnackbar: mockShowSnackbar,
      closeSnackbar: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders component with error recovery hook", () => {
    const mockOperation = vi.fn().mockResolvedValue(undefined);

    render(
      <ComponentWithErrorRecovery operation={mockOperation} />,
    );

    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry operation/i })).toBeInTheDocument();
  });

  it("shows snackbar messages during retry attempts", async () => {
    const user = userEvent.setup();
    const mockOperation = vi.fn().mockResolvedValue(undefined);

    render(
      <ComponentWithErrorRecovery operation={mockOperation} />,
    );

    const button = screen.getByRole("button", { name: /retry operation/i });
    await user.click(button);

    expect(mockShowSnackbar).toHaveBeenCalled();
  });
});

