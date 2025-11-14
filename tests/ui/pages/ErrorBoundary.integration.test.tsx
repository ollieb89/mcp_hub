import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "@components/ErrorBoundary";
import { useSnackbar } from "@hooks/useSnackbar";

vi.mock("@hooks/useSnackbar", () => ({
  useSnackbar: vi.fn(),
}));

// Mock page components
const MockDashboardPage: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Failed to fetch dashboard data");
  }
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Filtering stats loaded</p>
    </div>
  );
};

const MockServersPage: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Connection refused");
  }
  return (
    <div>
      <h1>Servers</h1>
      <p>Server list loaded</p>
    </div>
  );
};

const MockConfigPage: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("JSON parse error");
  }
  return (
    <div>
      <h1>Config</h1>
      <p>Configuration loaded</p>
    </div>
  );
};

const MockToolsPage: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Tool fetch error");
  }
  return (
    <div>
      <h1>Tools</h1>
      <p>Tools loaded</p>
    </div>
  );
};

describe("ErrorBoundary Integration with Page Components", () => {
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

  describe("DashboardPage Integration", () => {
    it("renders dashboard content when no error occurs", () => {
      render(
        <ErrorBoundary recoverableErrors={[/failed to fetch|timeout|network error/i]}>
          <MockDashboardPage />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Filtering stats loaded")).toBeInTheDocument();
    });

    it("catches network errors and displays fallback UI", async () => {
      render(
        <ErrorBoundary recoverableErrors={[/failed to fetch|timeout|network error/i]}>
          <MockDashboardPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/failed to fetch dashboard data/i)).toBeInTheDocument();
    });

    it("provides retry button for dashboard errors", async () => {
      const user = userEvent.setup();
      render(
        <ErrorBoundary recoverableErrors={[/failed to fetch|timeout|network error/i]}>
          <MockDashboardPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /retry now/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      // Error persists but button is clickable
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("ServersPage Integration", () => {
    it("renders servers content when no error occurs", () => {
      render(
        <ErrorBoundary recoverableErrors={[/connection refused|server error|timeout|network error/i]}>
          <MockServersPage />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Servers")).toBeInTheDocument();
      expect(screen.getByText("Server list loaded")).toBeInTheDocument();
    });

    it("catches connection errors in servers page", async () => {
      render(
        <ErrorBoundary recoverableErrors={[/connection refused|server error|timeout|network error/i]}>
          <MockServersPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
    });
  });

  describe("ConfigPage Integration", () => {
    it("renders config content when no error occurs", () => {
      render(
        <ErrorBoundary recoverableErrors={[/json parse error|validation error|config error|network error/i]}>
          <MockConfigPage />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Config")).toBeInTheDocument();
      expect(screen.getByText("Configuration loaded")).toBeInTheDocument();
    });

    it("catches JSON parse errors in config page", async () => {
      render(
        <ErrorBoundary recoverableErrors={[/json parse error|validation error|config error|network error/i]}>
          <MockConfigPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/json parse error/i)).toBeInTheDocument();
    });
  });

  describe("ToolsPage Integration", () => {
    it("renders tools content when no error occurs", () => {
      render(
        <ErrorBoundary recoverableErrors={[/filter error|tool fetch error|network error/i]}>
          <MockToolsPage />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Tools")).toBeInTheDocument();
      expect(screen.getByText("Tools loaded")).toBeInTheDocument();
    });

    it("catches tool fetch errors", async () => {
      render(
        <ErrorBoundary recoverableErrors={[/filter error|tool fetch error|network error/i]}>
          <MockToolsPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/tool fetch error/i)).toBeInTheDocument();
    });
  });

  describe("Cross-Page Error Handling Patterns", () => {
    it("supports multiple recoverable error patterns", async () => {
      const multiPatterns = [
        /json parse error/i,
        /validation error/i,
        /config error/i,
        /network error/i,
      ];

      render(
        <ErrorBoundary recoverableErrors={multiPatterns}>
          <MockConfigPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it("calls onError callback when page error occurs", async () => {
      const onErrorCallback = vi.fn();

      render(
        <ErrorBoundary
          recoverableErrors={[/error/i]}
          onError={onErrorCallback}
        >
          <MockDashboardPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(onErrorCallback).toHaveBeenCalled();
      });

      expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it("handles custom fallback UI per page", async () => {
      const customFallback = ({ error }: { error: Error | null }) => (
        <div>
          <h2>Custom Dashboard Error</h2>
          <p>{error?.message || "Unknown error"}</p>
        </div>
      );

      render(
        <ErrorBoundary
          recoverableErrors={[/error/i]}
          fallback={customFallback}
        >
          <MockDashboardPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText("Custom Dashboard Error")).toBeInTheDocument();
      });
    });
  });

  describe("Error Boundary Edge Cases", () => {
    it("handles null children gracefully", () => {
      const { container } = render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>,
      );

      expect(container).toBeInTheDocument();
    });

    it("supports rapid retry button clicks", async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary recoverableErrors={[/error/i]}>
          <MockDashboardPage shouldThrow={true} />
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /retry now/i });

      // Multiple rapid clicks should not crash
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
