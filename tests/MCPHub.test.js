import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPHub } from "../src/MCPHub.js";
import { ConfigManager } from "../src/utils/config.js";
import { MCPConnection } from "../src/MCPConnection.js";
import logger from "../src/utils/logger.js";
import {
  ServerError,
  ConnectionError,
  ConfigError,
  wrapError,
} from "../src/utils/errors.js";

// Mock ConfigManager
vi.mock("../src/utils/config.js", () => {
  const MockConfigManager = vi.fn(() => ({
    loadConfig: vi.fn(),
    watchConfig: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    on: vi.fn(),
  }));
  return { ConfigManager: MockConfigManager };
});

// Mock MCPConnection
vi.mock("../src/MCPConnection.js", () => {
  const MockConnection = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    getServerInfo: vi.fn(),
    callTool: vi.fn(),
    readResource: vi.fn(),
  }));
  return { MCPConnection: MockConnection };
});

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MCPHub", () => {
  let mcpHub;
  let mockConfig;
  let configManager;
  let connection;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset instance mocks
    mockConfig = {
      mcpServers: {
        server1: { host: "localhost", port: 3000 },
        server2: { host: "localhost", port: 3001, disabled: true },
      },
    };

    // Setup ConfigManager mock
    configManager = new ConfigManager();
    ConfigManager.mockReturnValue(configManager);
    configManager.getConfig.mockReturnValue(mockConfig);

    // Setup MCPConnection mock
    connection = new MCPConnection();
    MCPConnection.mockReturnValue(connection);
    connection.getServerInfo.mockReturnValue({
      name: "server1",
      status: "connected",
    });

    // Create new MCPHub instance
    mcpHub = new MCPHub("config.json");
  });

  describe("Initialization", () => {
    it("should load config on initialize", async () => {
      await mcpHub.initialize();
      expect(mcpHub.configManager.loadConfig).toHaveBeenCalled();
    });

    it("should watch config when enabled", async () => {
      mcpHub = new MCPHub("config.json", { watch: true });
      await mcpHub.initialize();

      expect(mcpHub.configManager.watchConfig).toHaveBeenCalled();
    });

    it("should not watch config with object config", async () => {
      mcpHub = new MCPHub({ some: "config" }, { watch: true });
      await mcpHub.initialize();

      expect(mcpHub.configManager.watchConfig).not.toHaveBeenCalled();
    });

    it("should handle config changes when watching", async () => {
      mcpHub = new MCPHub("config.json", { watch: true });
      await mcpHub.initialize();

      // Get the config change handler
      const [[event, handler]] = mcpHub.configManager.on.mock.calls;
      expect(event).toBe("configChanged");

      // Simulate config change
      const newConfig = {
        mcpServers: {
          server3: { host: "localhost", port: 3002 },
        },
      };
      await handler(newConfig);

      expect(mcpHub.configManager.updateConfig).toHaveBeenCalledWith(newConfig);
    });
  });

  describe("Server Management", () => {
    it("should start enabled servers from config", async () => {
      await mcpHub.initialize();

      expect(MCPConnection).toHaveBeenCalledWith(
        "server1",
        mockConfig.mcpServers.server1
      );
      expect(MCPConnection).not.toHaveBeenCalledWith(
        "server2",
        mockConfig.mcpServers.server2
      );
    });

    it("should skip disabled servers", async () => {
      await mcpHub.initialize();

      expect(logger.info).toHaveBeenCalledWith("Skipping disabled server", {
        server: "server2",
      });
    });

    it("should handle multiple server failures gracefully", async () => {
      // Mock config with multiple servers
      const multiServerConfig = {
        mcpServers: {
          server1: { host: "localhost", port: 3000 },
          server3: { host: "localhost", port: 3002 },
        }
      };
      mcpHub.configManager.getConfig.mockReturnValue(multiServerConfig);
      
      // Make server1 succeed but server3 fail
      connection.connect
        .mockResolvedValueOnce(undefined) // server1 succeeds
        .mockRejectedValueOnce(new Error("Connection failed")); // server3 fails

      await mcpHub.initialize();

      // Should complete without throwing, logging summary
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("servers started successfully"),
        expect.objectContaining({
          total: 2,
          successful: 1,
          failed: 1,
        })
      );
    });

    it("should continue startup when some servers fail", async () => {
      // Mock error for one server
      connection.connect.mockRejectedValueOnce(new Error("Startup failed"));

      await mcpHub.initialize();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Startup failed"),
        expect.any(Object),
        false
      );
    });

    it("should handle server connection errors", async () => {
      const error = new Error("Connection failed");
      connection.connect.mockRejectedValueOnce(error);

      await expect(
        mcpHub.connectServer("server1", mockConfig.mcpServers.server1)
      ).rejects.toThrow(
        new ServerError(`Failed to connect server "server1"`, {
          server: "server1",
          error: error.message,
        })
      );
    });

    it("should disconnect server", async () => {
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      await mcpHub.disconnectServer("server1");

      expect(connection.disconnect).toHaveBeenCalled();
      expect(mcpHub.connections.has("server1")).toBe(false);
    });

    it("should handle disconnect errors", async () => {
      const error = new Error("Disconnect failed");
      connection.disconnect.mockRejectedValueOnce(error);

      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      await mcpHub.disconnectServer("server1");

      expect(logger.error).toHaveBeenCalledWith(
        "SERVER_DISCONNECT_ERROR",
        "Error disconnecting server",
        {
          server: "server1",
          error: error.message,
        },
        false
      );
      expect(mcpHub.connections.has("server1")).toBe(false);
    });

    it("should disconnect all servers", async () => {
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      await mcpHub.connectServer("server3", { host: "localhost", port: 3002 });

      await mcpHub.disconnectAll();

      expect(mcpHub.connections.size).toBe(0);
      expect(connection.disconnect).toHaveBeenCalledTimes(2);
    });

    it("should not duplicate event handlers on server restart", async () => {
      // First connection
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      const firstListenerCount = connection.listenerCount("toolsChanged");

      // Simulate a restart by reconnecting
      await mcpHub.disconnectServer("server1");
      connection.removeAllListeners.mockClear();
      
      // Reconnect
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      
      // Verify removeAllListeners was called before adding new listeners
      expect(connection.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe("Server Operations", () => {
    beforeEach(async () => {
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
    });

    it("should call tool on server", async () => {
      const args = { param: "value" };
      await mcpHub.callTool("server1", "test-tool", args);

      expect(connection.callTool).toHaveBeenCalledWith("test-tool", args);
    });

    it("should throw error when calling tool on non-existent server", async () => {
      await expect(mcpHub.callTool("invalid", "test-tool", {})).rejects.toThrow(
        new ServerError("Server not found", {
          server: "invalid",
          operation: "tool_call",
          tool: "test-tool",
        })
      );
    });

    it("should read resource from server", async () => {
      await mcpHub.readResource("server1", "resource://test");

      expect(connection.readResource).toHaveBeenCalledWith("resource://test");
    });

    it("should throw error when reading resource from non-existent server", async () => {
      await expect(
        mcpHub.readResource("invalid", "resource://test")
      ).rejects.toThrow(
        new ServerError("Server not found", {
          server: "invalid",
          operation: "resource_read",
          uri: "resource://test",
        })
      );
    });
  });

  describe("Status Reporting", () => {
    beforeEach(async () => {
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
    });

    it("should get single server status", () => {
      const status = mcpHub.getServerStatus("server1");

      expect(status).toEqual({
        name: "server1",
        status: "connected",
      });
    });

    it("should throw error for non-existent server status", () => {
      expect(() => mcpHub.getServerStatus("invalid")).toThrow(
        new ServerError("Server not found", {
          server: "invalid",
        })
      );
    });

    it("should get all server statuses", () => {
      const statuses = mcpHub.getAllServerStatuses();

      expect(statuses).toEqual([
        {
          name: "server1",
          status: "connected",
        },
      ]);
    });
  });
});
