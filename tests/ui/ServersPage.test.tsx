import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const mockRefresh = vi.fn();

vi.mock("@hooks/usePolling", () => ({
  usePolling: () => ({
    data: [
      {
        name: "example",
        displayName: "Example Server",
        status: "disabled",
        transportType: "sse",
        capabilities: { tools: [] },
        uptime: 0,
      },
    ],
    loading: false,
    error: null,
    refresh: mockRefresh,
  }),
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
