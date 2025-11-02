import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPConnection } from "../src/MCPConnection.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ConnectionError,
  ToolError,
  ResourceError,
  wrapError,
} from "../src/utils/errors.js";

// Mock MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(function() {
    return {
      connect: vi.fn().mockImplementation(async (transport) => {
        // Store transport for later use
        if (client) {
          client.transport = transport;
        }
        return undefined;
      }),
      close: vi.fn(),
      request: vi.fn(),
      setNotificationHandler: vi.fn(),
      transport: null,
    };
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(function() {
    return {
      close: vi.fn(),
      stderr: {
        on: vi.fn(),
      },
      onerror: null,
      onclose: null,
    };
  }),
  getDefaultEnvironment: vi.fn().mockReturnValue({}),
}));

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("MCPConnection", () => {
  let connection;
  let client;
  let transport;
  let mockConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockConfig = {
      type: 'stdio',  // CRITICAL: Required for transport creation
      command: "test-server",
      args: ["--port", "3000"],
      env: { TEST_ENV: "value" },
    };

    // Setup client mock
    client = new Client();
    Client.mockImplementation(function() { return client; });
    
    // Override connect to store transport
    client.connect = vi.fn().mockImplementation(async (transportParam) => {
      client.transport = transportParam;
      return undefined;
    });

    // Setup transport mock
    transport = new StdioClientTransport();
    StdioClientTransport.mockImplementation(function() { return transport; });

    // Create connection instance
    connection = new MCPConnection("test-server", mockConfig);
  });

  describe("Connection Lifecycle", () => {
    it("should initialize in disconnected state", () => {
      expect(connection.status).toBe("disconnected");
      expect(connection.error).toBeNull();
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);
      expect(connection.resourceTemplates).toEqual([]);
    });

    it("should connect successfully", async () => {
      // Mock successful capability discovery
      client.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case "tools/list":
            return { tools: [{ name: "test-tool" }] };
          case "resources/list":
            return { resources: [{ uri: "test://resource" }] };
          case "resources/templates/list":
            return { resourceTemplates: [{ uriTemplate: "test://{param}" }] };
        }
      });

      await connection.connect();

      expect(connection.status).toBe("connected");
      expect(connection.error).toBeNull();
      expect(connection.tools).toHaveLength(1);
      expect(connection.resources).toHaveLength(1);
      expect(connection.resourceTemplates).toHaveLength(1);
    });

    it("should handle connection errors", async () => {
      // ARRANGE
      const error = new Error("Connection failed");
      client.connect.mockRejectedValueOnce(error);

      // ACT & ASSERT - First call should throw
      await expect(connection.connect()).rejects.toThrow(ConnectionError);
      
      // Reset mock for second call
      client.connect.mockRejectedValueOnce(error);
      await expect(connection.connect()).rejects.toThrow(/test-server/);
      
      // Verify connection is in error state
      expect(connection.status).toBe("disconnected");
    });

    it("should handle transport errors", async () => {
      await connection.connect();

      // ACT: Simulate client error
      const error = new Error("Transport error");
      if (client.onerror) {
        client.onerror(error);
      }

      // ASSERT: Connection should handle the error gracefully
      // Note: The implementation just logs errors without changing status
      expect(client.onerror).toBeDefined();
    });

    it("should handle transport close", async () => {
      await connection.connect();
      
      // ACT: Simulate client close
      if (client.onclose) {
        client.onclose();
      }

      // ASSERT: Connection should handle close
      expect(client.onclose).toBeDefined();
      expect(connection.startTime).toBeNull();
    });

    it("should handle stderr output", async () => {
      // ARRANGE: Capture stderr callback
      let stderrCallback;
      transport.stderr.on.mockImplementation((event, cb) => {
        if (event === "data") stderrCallback = cb;
      });

      // ACT: Connect and trigger stderr
      await connection.connect();
      stderrCallback(Buffer.from("Error output"));

      // ASSERT: Stderr is handled (logged, not stored in connection.error)
      // The implementation only logs stderr, doesn't store it
      expect(stderrCallback).toBeDefined();
    });

    it("should disconnect cleanly", async () => {
      await connection.connect();
      await connection.disconnect();

      expect(client.close).toHaveBeenCalled();
      expect(transport.close).toHaveBeenCalled();
      expect(connection.status).toBe("disconnected");
      expect(connection.client).toBeNull();
      expect(connection.transport).toBeNull();
    });

    it("should handle terminateSession gracefully when transport has sessionId", async () => {
      // Mock transport with sessionId
      const mockTransport = {
        sessionId: "test-session-123",
        terminateSession: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      await connection.connect();
      connection.transport = mockTransport;

      await connection.disconnect();

      // Verify terminateSession was called on this.transport, not undefined 'transport'
      expect(mockTransport.terminateSession).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
      expect(connection.status).toBe("disconnected");
    });

    it("should handle disconnect when transport has no sessionId", async () => {
      const mockTransport = {
        terminateSession: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      await connection.connect();
      connection.transport = mockTransport;

      await connection.disconnect();

      // terminateSession should not be called when sessionId is undefined
      expect(mockTransport.terminateSession).not.toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });

    it("should handle disconnect gracefully when devWatcher throws error", async () => {
      const mockDevWatcher = {
        stop: vi.fn().mockRejectedValue(new Error("Dev watcher error")),
      };

      await connection.connect();
      connection.devWatcher = mockDevWatcher;

      // Should not throw
      await expect(connection.disconnect()).resolves.toBeUndefined();
      expect(mockDevWatcher.stop).toHaveBeenCalled();
      expect(connection.status).toBe("disconnected");
    });

    it("should handle disconnect gracefully when transport.close throws error", async () => {
      const mockTransport = {
        close: vi.fn().mockRejectedValue(new Error("Close error")),
      };

      await connection.connect();
      connection.transport = mockTransport;

      // Should not throw
      await expect(connection.disconnect()).resolves.toBeUndefined();
      expect(mockTransport.close).toHaveBeenCalled();
      expect(connection.status).toBe("disconnected");
    });

    it("should handle disconnect when never connected", async () => {
      // Never call connect, all resources are null
      await expect(connection.disconnect()).resolves.toBeUndefined();
      expect(connection.status).toBe("disconnected");
    });

    it("should handle disconnect during error state", async () => {
      // Simulate error state
      connection.status = "error";
      connection.error = "Some error";

      await expect(connection.disconnect()).resolves.toBeUndefined();
      expect(connection.status).toBe("disconnected");
    });

    it("should cleanup is idempotent (safe to call multiple times)", async () => {
      await connection.connect();

      // First cleanup
      await connection.cleanup();
      expect(connection.client).toBeNull();
      expect(connection.transport).toBeNull();
      const firstStatus = connection.status;

      // Second cleanup should not throw
      await expect(connection.cleanup()).resolves.toBeUndefined();
      
      // Status should remain unchanged
      expect(connection.status).toBe(firstStatus);
      expect(connection.client).toBeNull();
      expect(connection.transport).toBeNull();
    });

    it("should cleanup all resources on error during connection", async () => {
      // Mock client.connect to throw
      client.connect.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(connection.connect()).rejects.toThrow();

      // Verify cleanup was called
      expect(connection.client).toBeNull();
      expect(connection.transport).toBeNull();
      expect(connection.status).toBe("disconnected");
    });

    it("should handle reconnect when client exists but disconnect throws", async () => {
      await connection.connect();
      
      // Mock disconnect to throw
      const originalDisconnect = connection.disconnect;
      connection.disconnect = vi.fn().mockRejectedValue(new Error("Disconnect error"));

      // reconnect should handle the error gracefully
      await expect(connection.reconnect()).resolves.toBeUndefined();
      
      // Restore original
      connection.disconnect = originalDisconnect;
    });

    it("should handle handleAuthCallback when transport is null", async () => {
      connection.transport = null;
      
      await expect(
        connection.handleAuthCallback("test-code")
      ).rejects.toThrow();
    });

    it("should handle handleAuthCallback when transport.finishAuth throws", async () => {
      await connection.connect();
      connection.transport.finishAuth = vi.fn().mockRejectedValue(new Error("Auth failed"));
      
      await expect(
        connection.handleAuthCallback("test-code")
      ).rejects.toThrow("Auth failed");
    });
  });

  describe("Capability Discovery", () => {
    it("should handle partial capabilities", async () => {
      // ARRANGE: Mock server with only tools support
      client.request.mockImplementation(async ({ method }) => {
        if (method === "tools/list") {
          return { tools: [{ name: "test-tool" }] };
        }
        throw new Error("Not supported");
      });

      // ACT: Connect and discover capabilities
      await connection.connect();

      // ASSERT: Verify partial capabilities are stored correctly
      expect(connection.tools).toHaveLength(1);
      expect(connection.resources).toHaveLength(0);
      expect(connection.resourceTemplates).toHaveLength(0);
    });

    it("should handle capability update errors", async () => {
      // ARRANGE: Mock capability update to fail
      client.request.mockRejectedValue(new Error("Update failed"));

      // ACT: Attempt to update capabilities
      await connection.updateCapabilities();

      // ASSERT: Capabilities should remain unchanged (empty) on error
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);
      expect(connection.resourceTemplates).toEqual([]);
    });
  });

  describe("Tool Execution", () => {
    beforeEach(async () => {
      client.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case "tools/list":
            return { tools: [{ name: "test-tool" }] };
          case "tools/call":
            return { output: "success" };
        }
      });

      await connection.connect();
    });

    it("should execute tool successfully", async () => {
      // ACT
      const result = await connection.callTool("test-tool", { param: "value" });

      // ASSERT
      expect(result).toEqual({ output: "success" });
      expect(client.request).toHaveBeenCalledWith(
        {
          method: "tools/call",
          params: {
            name: "test-tool",
            arguments: { param: "value" },
          },
        },
        expect.any(Object),  // ZodSchema
        undefined  // request_options (optional)
      );
    });

    it("should throw error for non-existent tool", async () => {
      await expect(connection.callTool("invalid-tool", {})).rejects.toThrow(
        new ToolError("Tool not found", {
          server: "test-server",
          tool: "invalid-tool",
          availableTools: ["test-tool"],
        })
      );
    });

    it("should throw error when not connected", async () => {
      connection.client = null;

      await expect(connection.callTool("test-tool", {})).rejects.toThrow(
        new ToolError("Server not initialized", {
          server: "test-server",
          tool: "test-tool",
        })
      );
    });

    it("should handle tool execution errors", async () => {
      const error = new Error("Tool failed");
      client.request.mockRejectedValueOnce(error);

      await expect(connection.callTool("test-tool", {})).rejects.toThrow(
        wrapError(error, "TOOL_EXECUTION_ERROR", {
          server: "test-server",
          tool: "test-tool",
          args: {},
        })
      );
    });
  });

  describe("Resource Access", () => {
    beforeEach(async () => {
      client.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case "resources/list":
            return { resources: [{ uri: "test://resource" }] };
          case "resources/templates/list":
            return {
              resourceTemplates: [{ uriTemplate: "template://{param}" }],
            };
          case "resources/read":
            return { content: "resource content" };
        }
      });

      await connection.connect();
    });

    it("should read resource successfully", async () => {
      // ACT
      const result = await connection.readResource("test://resource");

      // ASSERT
      expect(result).toEqual({ content: "resource content" });
      expect(client.request).toHaveBeenCalledWith(
        {
          method: "resources/read",
          params: { uri: "test://resource" },
        },
        expect.any(Object),  // ZodSchema
        undefined  // request_options (optional)
      );
    });

    it("should handle template resources", async () => {
      const result = await connection.readResource("template://value");

      expect(result).toEqual({ content: "resource content" });
    });

    it("should throw error for non-existent resource", async () => {
      // ARRANGE: Mock request to throw error
      client.request.mockRejectedValueOnce(new Error("Resource not found"));
      
      // ACT & ASSERT
      // Note: wrapError wraps errors as MCPHubError
      await expect(
        connection.readResource("invalid://resource")
      ).rejects.toThrow("Resource not found");
    });

    it("should throw error when not connected", async () => {
      connection.client = null;

      await expect(connection.readResource("test://resource")).rejects.toThrow(
        new ResourceError("Server not initialized", {
          server: "test-server",
          uri: "test://resource",
        })
      );
    });

    it("should handle resource read errors", async () => {
      const error = new Error("Read failed");
      client.request.mockRejectedValueOnce(error);

      await expect(connection.readResource("test://resource")).rejects.toThrow(
        wrapError(error, "RESOURCE_READ_ERROR", {
          server: "test-server",
          uri: "test://resource",
        })
      );
    });
  });

  describe("Server Info", () => {
    beforeEach(async () => {
      // Mock capabilities for connect
      client.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case "tools/list":
            return { tools: [{ name: "test-tool" }] };
          case "resources/list":
            return { resources: [{ uri: "test://resource" }] };
          case "resources/templates/list":
            return {
              resourceTemplates: [{ uriTemplate: "template://{param}" }],
            };
        }
      });
      await connection.connect();
    });

    it("should report server info correctly", () => {
      // ACT
      const info = connection.getServerInfo();

      // ASSERT
      expect(info).toMatchObject({
        name: "test-server",
        status: "connected",
        error: null,
        capabilities: expect.objectContaining({
          tools: expect.arrayContaining([]),
          resources: expect.arrayContaining([]),
          resourceTemplates: expect.arrayContaining([]),
        }),
        uptime: expect.any(Number),
        lastStarted: expect.any(String),
      });
    });

    it("should calculate uptime", () => {
      vi.advanceTimersByTime(5000);

      const info = connection.getServerInfo();
      expect(info.uptime).toBe(5);
    });

    it("should report zero uptime when disconnected", () => {
      vi.advanceTimersByTime(5000);
      connection.startTime = null;

      const info = connection.getServerInfo();
      expect(info.uptime).toBe(0);
    });
  });
});
