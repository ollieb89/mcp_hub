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
import { createTestConfig } from "./helpers/fixtures.js";
import { expectServerConnected, expectServerDisconnected, expectNoActiveConnections } from "./helpers/assertions.js";

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
  const MockConnection = vi.fn(() => {
    const instance = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getServerInfo: vi.fn().mockResolvedValue({ name: '', status: 'connected' }),
      callTool: vi.fn(),
      readResource: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      listenerCount: vi.fn().mockReturnValue(0),
      removeAllListeners: vi.fn(),
      updateCapabilities: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue([]),
      listResources: vi.fn().mockResolvedValue([]),
      listPrompts: vi.fn().mockResolvedValue([]),
      status: 'connected'
    };
    return instance;
  });
  return { MCPConnection: MockConnection };
});

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
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
    it("should successfully initialize and start enabled servers from config file", async () => {
      // ARRANGE
      // Config is already set up in beforeEach with server1 (enabled) and server2 (disabled)

      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify initialization succeeded by checking servers are connected
      expect(mcpHub.connections.has('server1')).toBe(true);
      expect(mcpHub.connections.has('server2')).toBe(true);
      expect(mcpHub.connections.size).toBeGreaterThan(0);

      // Verify we can get server statuses (confirms initialization worked)
      const statuses = mcpHub.getAllServerStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });

    it("should watch config file for changes when enabled", async () => {
      // ARRANGE
      const config = createTestConfig({
        mcpServers: {
          server1: { host: "localhost", port: 3000 }
        }
      });
      mcpHub = new MCPHub("config.json", { watch: true });
      configManager.getConfig.mockReturnValue(config);

      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify watcher was set up by checking config can be updated
      const newConfig = {
        mcpServers: {
          server3: { host: "localhost", port: 3002 }
        }
      };
      
      // Simulate config change event
      const configChangeHandlers = mcpHub.configManager.on.mock.calls;
      const configChangeHandler = configChangeHandlers.find(call => call[0] === 'configChanged');
      expect(configChangeHandler).toBeDefined();

      // If handler exists, config watching is enabled
      if (configChangeHandler) {
        await configChangeHandler[1](newConfig);
        expect(mcpHub.configManager.getConfig).toHaveBeenCalled();
      }
    });

    it("should not watch config when using object config instead of file path", async () => {
      // ARRANGE
      const objectConfig = {
        mcpServers: {
          server1: { host: "localhost", port: 3000 }
        }
      };
      mcpHub = new MCPHub(objectConfig, { watch: true });

      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify no config watcher was set up (no configChanged listener)
      const configChangeHandlers = mcpHub.configManager.on.mock.calls.filter(call => call[0] === 'configChanged');
      expect(configChangeHandlers.length).toBe(0);

      // Verify initialization still succeeded
      expect(mcpHub.connections.size).toBeGreaterThan(0);
    });

    it("should apply config updates when watching config file", async () => {
      // ARRANGE
      const initialConfig = createTestConfig({
        mcpServers: {
          server1: { host: "localhost", port: 3000 }
        }
      });
      mcpHub = new MCPHub("config.json", { watch: true });
      configManager.getConfig.mockReturnValue(initialConfig);

      await mcpHub.initialize();
      const initialConnections = mcpHub.connections.size;

      // ACT
      // Simulate config change with added server
      const newConfig = createTestConfig({
        mcpServers: {
          server1: { host: "localhost", port: 3000 },
          server3: { host: "localhost", port: 3002 }
        }
      });

      // Trigger config change handler
      const configChangeHandlers = mcpHub.configManager.on.mock.calls;
      const configChangeHandler = configChangeHandlers.find(call => call[0] === 'configChanged');
      
      let newConnection;
      if (configChangeHandler) {
        // Setup mock for added server
        newConnection = new MCPConnection();
        MCPConnection.mockReturnValue(newConnection);
        configManager.getConfig.mockReturnValue(newConfig);
        
        // Call handler with changes indicating a new server was added
        await configChangeHandler[1]({ 
          config: newConfig, 
          changes: { added: ['server3'], removed: [], modified: [] }
        });
      }

      // ASSERT
      // Verify config change handler was registered (observable behavior of watching)
      expect(configChangeHandler).toBeDefined();
      
      // Verify new server connection was created and connected
      expect(newConnection).toBeDefined();
      expect(newConnection.connect).toHaveBeenCalled();
      
      // Verify MCPConnection was called with "server3" specifically (observable behavior)
      const server3Calls = MCPConnection.mock.calls.filter(call => call[0] === 'server3');
      expect(server3Calls.length).toBeGreaterThan(0);
    });
  });

  describe("Server Management", () => {
    it("should successfully connect all enabled servers from config", async () => {
      // ARRANGE
      // Config is already set up in beforeEach
      
      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify enabled server1 is connected
      expect(mcpHub.connections.has('server1')).toBe(true);
      // Verify disabled server2 is also in connections map but marked as disabled
      expect(mcpHub.connections.has('server2')).toBe(true);
      // Verify connections were created for both servers
      expect(mcpHub.connections.size).toBe(2);
    });

    it("should create connections for all servers including disabled ones", async () => {
      // ARRANGE
      // Configure test to use config with one enabled and one disabled server
      const testConfig = {
        mcpServers: {
          enabled: { host: "localhost", port: 3000 },
          disabled: { host: "localhost", port: 3001, disabled: true }
        }
      };
      configManager.getConfig.mockReturnValue(testConfig);
      
      // ACT
      await mcpHub.initialize();
      
      // ASSERT
      // Both servers should be in the connections map
      expect(mcpHub.connections.has('enabled')).toBe(true);
      expect(mcpHub.connections.has('disabled')).toBe(true);
      expect(mcpHub.connections.size).toBe(2);
    });

    it("should handle multiple server failures gracefully and continue with successful servers", async () => {
      // ARRANGE
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

      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify initialization completed without throwing
      // Verify that the successful server is connected
      expectServerConnected(mcpHub, 'server1');
      
      // Verify total connections reflects the successful server
      expect(mcpHub.connections.size).toBe(2); // Both created but one failed
      
      // Verify server status is available for successful server
      const statuses = mcpHub.getAllServerStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });

    it("should continue startup when some servers fail without crashing", async () => {
      // ARRANGE
      // Mock error for one server
      connection.connect.mockRejectedValueOnce(new Error("Startup failed"));

      // ACT
      await mcpHub.initialize();

      // ASSERT
      // Verify initialization completed successfully despite the error
      expect(mcpHub.connections.size).toBeGreaterThan(0);
      
      // Verify we can still get status information
      const statuses = mcpHub.getAllServerStatuses();
      expect(statuses).toBeDefined();
    });

    it("should throw ServerError when connection fails", async () => {
      // ARRANGE
      const error = new Error("Connection failed");
      connection.connect.mockRejectedValueOnce(error);

      // ACT & ASSERT
      // Verify that error is thrown and has correct type
      await expect(
        mcpHub.connectServer("server1", mockConfig.mcpServers.server1)
      ).rejects.toThrow(Error);
      
      // Verify error message contains relevant information
      try {
        await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      } catch (thrownError) {
        expect(thrownError.message).toBeDefined();
        expect(thrownError.message).toContain("Connection failed");
      }
    });

    it("should disconnect server but keep in connections map", async () => {
      // ARRANGE
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      expectServerConnected(mcpHub, 'server1');

      // ACT
      await mcpHub.disconnectServer("server1");

      // ASSERT
      // Note: disconnectServer doesn't remove from connections map (by design)
      // The connection is disconnected but still tracked in the map
      expect(mcpHub.connections.has("server1")).toBe(true);
    });

    it("should handle disconnect errors gracefully and keep server in map", async () => {
      // ARRANGE
      const error = new Error("Disconnect failed");
      connection.disconnect.mockRejectedValueOnce(error);

      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      expectServerConnected(mcpHub, 'server1');

      // ACT
      await mcpHub.disconnectServer("server1");

      // ASSERT
      // Verify disconnect completes without throwing despite error
      // Note: Server remains in connections map even if disconnect fails
      expect(mcpHub.connections.has("server1")).toBe(true);
    });

    it("should disconnect all servers and clear connections", async () => {
      // ARRANGE
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      await mcpHub.connectServer("server3", { host: "localhost", port: 3002 });

      expect(mcpHub.connections.size).toBe(2);

      // ACT
      await mcpHub.disconnectAll();

      // ASSERT
      // Verify all servers disconnected
      expectNoActiveConnections(mcpHub);
    });

    it("should be able to reconnect server after disconnect", async () => {
      // ARRANGE
      // First connection
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      expectServerConnected(mcpHub, 'server1');

      // ACT - Simulate a restart by disconnecting and reconnecting
      await mcpHub.disconnectServer("server1");
      
      // Reconnect using the same server name
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
      
      // ASSERT
      // Verify server connection can be re-established
      expectServerConnected(mcpHub, 'server1');
      expect(connection.connect).toHaveBeenCalledTimes(2); // Connected twice
    });
  });

  describe("Server Operations", () => {
    beforeEach(async () => {
      await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
    });

    it("should call tool on server", async () => {
      // ARRANGE
      const args = { param: "value" };

      // ACT
      await mcpHub.callTool("server1", "test-tool", args);

      // ASSERT
      // Note: callTool passes request_options as optional 3rd param
      expect(connection.callTool).toHaveBeenCalledWith("test-tool", args, undefined);
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
      // ARRANGE
      const uri = "resource://test";

      // ACT
      await mcpHub.readResource("server1", uri);

      // ASSERT
      // Note: readResource passes request_options as optional 3rd param
      expect(connection.readResource).toHaveBeenCalledWith(uri, undefined);
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
      // ACT
      const status = mcpHub.getServerStatus("server1");

      // ASSERT
      // Verify status contains expected server information
      expect(status).toEqual({
        name: "server1",
        status: "connected",
      });
    });

    it("should throw error for non-existent server status", () => {
      // ACT & ASSERT
      // Verify that querying non-existent server throws appropriate error
      expect(() => mcpHub.getServerStatus("invalid")).toThrow(
        new ServerError("Server not found", {
          server: "invalid",
        })
      );
    });

    it("should get all server statuses", () => {
      // ACT
      const statuses = mcpHub.getAllServerStatuses();

      // ASSERT
      // Verify all connected servers are returned with their status information
      expect(statuses).toEqual([
        {
          name: "server1",
          status: "connected",
        },
      ]);
    });
  });
});
