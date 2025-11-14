import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const mockRefresh = vi.fn();

// Mock React Query hook instead of deprecated usePolling
vi.mock("@api/hooks", () => ({
  useServers: () => ({
    data: {
      servers: [
        {
          name: "example",
          displayName: "Example Server",
          status: "disabled",
          transportType: "sse",
          capabilities: { tools: [] },
          uptime: 0,
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: mockRefresh,
  }),
}));

vi.mock("@api/mutations", () => ({
  useStartServer: () => ({
    mutate: vi.fn().mockImplementation((name, callbacks) => {
      callbacks?.onSuccess?.();
    }),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
  useStopServer: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@hooks/useSnackbar", () => ({
  useSnackbar: () => ({
    message: null,
    open: false,
    showSnackbar: vi.fn(),
    closeSnackbar: vi.fn(),
  }),
}));

vi.mock("@hooks/useSSESubscription", () => ({
  useSSESubscription: vi.fn(),
}));

vi.mock("@api/servers", () => ({
  getServers: vi.fn(),
  startServer: vi.fn().mockResolvedValue(undefined),
  stopServer: vi.fn().mockResolvedValue(undefined),
}));

import ServersPage from "@pages/ServersPage";
import { startServer } from "@api/servers";

describe("ServersPage", () => {
  it("starts a server when toggled on", async () => {
    render(
      <MemoryRouter>
        <ServersPage />
      </MemoryRouter>,
    );

    const toggle = (await screen.findAllByRole("switch"))[0];
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(startServer).toHaveBeenCalledWith("example");
    });
  });
});

