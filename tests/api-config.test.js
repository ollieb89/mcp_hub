import request from "supertest";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import app, { __setServiceManager } from "../src/server.js";
import { writeConfigToDisk, loadRawConfig } from "../src/utils/config-persistence.js";

vi.mock("../src/utils/config-persistence.js", () => ({
  writeConfigToDisk: vi.fn().mockResolvedValue(undefined),
  loadRawConfig: vi.fn().mockResolvedValue({ mock: true }),
}));

describe("API configuration endpoints", () => {
  let mockServiceManager;

  beforeAll(() => {
    mockServiceManager = {
      broadcastSubscriptionEvent: vi.fn(),
      restartHub: vi.fn().mockResolvedValue(undefined),
      mcpHub: {
        configManager: {
          getConfig: vi.fn(() => ({
            toolFiltering: {
              enabled: false,
              mode: "server-allowlist",
            },
          })),
        },
        connections: new Map(),
        getAllServerStatuses: vi.fn(() => []),
      },
    };

    __setServiceManager(mockServiceManager);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceManager.mcpHub.connections = new Map();
    mockServiceManager.mcpHub.getAllServerStatuses.mockReturnValue([]);
    mockServiceManager.mcpHub.configManager.getConfig.mockImplementation(() => ({
      toolFiltering: {
        enabled: false,
        mode: "server-allowlist",
      },
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    __setServiceManager(null);
  });

  it("POST /api/filtering/status toggles filtering flag", async () => {
    const response = await request(app)
      .post("/api/filtering/status")
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(writeConfigToDisk).toHaveBeenCalledWith(
      mockServiceManager.mcpHub.configManager,
      expect.objectContaining({
        toolFiltering: expect.objectContaining({
          enabled: true,
        }),
      }),
    );
    expect(mockServiceManager.broadcastSubscriptionEvent).toHaveBeenCalled();
  });

  it("POST /api/filtering/mode updates mode", async () => {
    const response = await request(app)
      .post("/api/filtering/mode")
      .send({ mode: "category" });

    expect(response.status).toBe(200);
    expect(writeConfigToDisk).toHaveBeenCalledWith(
      mockServiceManager.mcpHub.configManager,
      expect.objectContaining({
        toolFiltering: expect.objectContaining({
          mode: "category",
        }),
      }),
    );
  });

  it("GET /api/config returns raw config", async () => {
    loadRawConfig.mockResolvedValueOnce({ raw: true });

    const response = await request(app).get("/api/config");

    expect(response.status).toBe(200);
    expect(response.body.config).toEqual({ raw: true });
    expect(loadRawConfig).toHaveBeenCalledWith(mockServiceManager.mcpHub.configManager);
  });

  it("POST /api/config writes config and restarts hub", async () => {
    const proposed = { mcpServers: {}, toolFiltering: { enabled: true } };

    const response = await request(app).post("/api/config").send(proposed);

    expect(response.status).toBe(200);
    expect(writeConfigToDisk).toHaveBeenCalledWith(
      mockServiceManager.mcpHub.configManager,
      proposed,
    );
    expect(mockServiceManager.restartHub).toHaveBeenCalled();
  });

  it("GET /api/tools returns tool list", async () => {
    const tool = { name: "example", description: "demo tool" };
    const connection = {
      displayName: "Example Server",
      disabled: false,
      tools: [tool],
    };

    mockServiceManager.mcpHub.connections = new Map([["example", connection]]);
    mockServiceManager.mcpHub.getAllServerStatuses.mockReturnValue([{ name: "example" }]);

    const response = await request(app).get("/api/tools");

    expect(response.status).toBe(200);
    expect(response.body.tools).toEqual([
      expect.objectContaining({
        server: "example",
        serverDisplayName: "Example Server",
        name: "example",
        description: "demo tool",
        enabled: true,
      }),
    ]);
  });
});
