import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@api/filtering", () => ({
  getFilteringStats: vi.fn(),
  setFilteringEnabled: vi.fn(),
  setFilteringMode: vi.fn(),
}));

vi.mock("@hooks/useLogsStream", () => ({
  useLogsStream: () => ({ logs: [], connected: true }),
}));

import DashboardPage from "@pages/DashboardPage";
import {
  getFilteringStats,
  setFilteringEnabled,
  setFilteringMode,
} from "@api/filtering";

const mockStats = {
  enabled: true,
  mode: "category",
  totalTools: 12,
  filteredTools: 4,
  exposedTools: 8,
  filterRate: 0.33,
  serverFilterMode: "allowlist",
  allowedServers: ["example"],
  allowedCategories: ["filesystem"],
  categoryCacheSize: 3,
  cacheHitRate: 0.6,
  llmCacheSize: 2,
  llmCacheHitRate: 0.4,
  timestamp: new Date().toISOString(),
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(getFilteringStats).mockResolvedValue(mockStats);
    vi.mocked(setFilteringEnabled).mockResolvedValue({
      status: "ok",
      toolFiltering: { enabled: false },
    });
    vi.mocked(setFilteringMode).mockResolvedValue({
      status: "ok",
      toolFiltering: { mode: "hybrid" },
    });
  });

  it("renders filtering statistics", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/12 tools/i)).toBeInTheDocument();
    expect(screen.getByText(/active filters/i)).toBeInTheDocument();
  });

  it("toggles filtering via API", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const toggle = await screen.findByRole("switch");
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(setFilteringEnabled).toHaveBeenCalledWith(false);
    });
  });

  it("updates mode using select", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const select = await screen.findByLabelText(/mode/i);
    await userEvent.click(select);
    const option = await screen.findByRole("option", { name: /hybrid/i });
    await userEvent.click(option);

    await waitFor(() => {
      expect(setFilteringMode).toHaveBeenCalledWith("hybrid");
    });
  });
});
