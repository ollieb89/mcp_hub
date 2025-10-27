import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPConnection } from "../src/MCPConnection.js";
import { 
  createStdioConfig, 
  createSSEConfig,
  createMockClient,
  createMockTransport,
  createEnvContext
} from "./helpers/fixtures.js";

// Mock all external dependencies
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn()
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(),
  getDefaultEnvironment: vi.fn(() => ({ NODE_ENV: 'test' }))
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn()
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn()
}));

vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../src/utils/dev-watcher.js", () => ({
  DevWatcher: vi.fn(() => ({
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }))
}));

// Mock child_process for EnvResolver
let mockExecPromise;
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

vi.mock('util', () => ({
  promisify: vi.fn().mockImplementation(() => {
    return (...args) => mockExecPromise(...args);
  })
}));

describe("MCPConnection Integration Tests", () => {
  let connection;
  let mockClient;
  let mockTransport;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup exec mock for EnvResolver
    mockExecPromise = vi.fn();

    // Setup fresh process.env for each test
    process.env = {
      NODE_ENV: 'test',
      API_KEY: 'secret_key',
      CUSTOM_VAR: 'custom_value',
      PRIVATE_DOMAIN: 'private.example.com',
      MCP_BINARY_PATH: '/usr/local/bin'
    };

    // Setup mock client
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
      setNotificationHandler: vi.fn(),
      onerror: null,
      onclose: null,
    };
    Client.mockReturnValue(mockClient);

    // Setup mock transport for STDIO
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    mockTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      stderr: {
        on: vi.fn()
      }
    };
    StdioClientTransport.mockReturnValue(mockTransport);

    // Setup mock transport for SSE
    const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
    const mockSSETransport = {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };
    SSEClientTransport.mockReturnValue(mockSSETransport);
  });

  describe("Basic Connection Lifecycle", () => {
    it("should initialize in disconnected state", () => {
      // ARRANGE: Create STDIO server configuration
      const config = createStdioConfig("test-server", {
        command: "test-server",
        args: ["--port", "3000"]
      });

      // ACT: Create connection instance
      connection = new MCPConnection("test-server", config);

      // ASSERT: Verify initial state
      expect(connection.status).toBe("disconnected");
      expect(connection.name).toBe("test-server");
      expect(connection.transportType).toBe("stdio");
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);
      expect(connection.prompts).toEqual([]);
    });

    it("should handle disabled servers", () => {
      // ARRANGE: Create STDIO server configuration with disabled flag
      const config = createStdioConfig("test-server", {
        command: "test-server",
        args: [],
        disabled: true
      });

      // ACT: Create connection instance
      connection = new MCPConnection("test-server", config);

      // ASSERT: Verify disabled state
      expect(connection.status).toBe("disabled");
      expect(connection.disabled).toBe(true);
    });
  });

  describe("Real Environment Resolution Integration", () => {
    it("should resolve stdio server config with actual envResolver", async () => {
      // ARRANGE: STDIO configuration with environment variable placeholders
      const config = createStdioConfig("test-server", {
        command: "${MCP_BINARY_PATH}/server",
        args: ["--token", "${API_KEY}", "--custom", "${CUSTOM_VAR}"],
        env: {
          RESOLVED_VAR: "${API_KEY}",
          COMBINED_VAR: "prefix-${CUSTOM_VAR}-suffix"
        }
      });

      connection = new MCPConnection("test-server", config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });

      await connection.connect();

      // Verify transport was created with actually resolved config
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: "/usr/local/bin/server", // ${MCP_BINARY_PATH} resolved
        args: ["--token", "secret_key", "--custom", "custom_value"], // ${API_KEY} and ${CUSTOM_VAR} resolved
        env: expect.objectContaining({
          RESOLVED_VAR: "secret_key", // ${API_KEY} resolved
          COMBINED_VAR: "prefix-custom_value-suffix" // ${CUSTOM_VAR} resolved in string
        }),
        stderr: 'pipe'
      });

      expect(connection.status).toBe("connected");
    });

    it("should resolve remote server with command execution in headers", async () => {
      // ARRANGE: SSE server configuration with command execution in headers
      const config = createSSEConfig("test-server", {
        url: "https://${PRIVATE_DOMAIN}/mcp",
        headers: {
          "Authorization": "Bearer ${cmd: echo auth_token_123}",
          "X-Custom": "${CUSTOM_VAR}"
        }
      });

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({ stdout: "auth_token_123\n" });

      connection = new MCPConnection("test-server", config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });

      // Mock HTTP transport (should be tried first)
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed
      expect(mockExecPromise).toHaveBeenCalledWith(
        "echo auth_token_123",
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
      );

      // Verify transport was created with actually resolved config
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL("https://private.example.com/mcp"), // ${PRIVATE_DOMAIN} resolved
        expect.objectContaining({
          authProvider: expect.any(Object), // OAuth provider is added
          requestInit: expect.objectContaining({
            headers: {
              "Authorization": "Bearer auth_token_123", // ${cmd: echo auth_token_123} executed
              "X-Custom": "custom_value" // ${CUSTOM_VAR} resolved
            }
          })
        })
      );

      expect(connection.status).toBe("connected");
    });

    it("should resolve env field providing context for headers field", async () => {
      // ARRANGE: SSE configuration with env-based header resolution
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        env: {
          SECRET_TOKEN: "${cmd: echo secret_from_env}"
        },
        headers: {
          "Authorization": "Bearer ${SECRET_TOKEN}" // Should use resolved env value
        }
      });

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({ stdout: "secret_from_env\n" });

      connection = new MCPConnection("test-server", config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });

      // Mock HTTP transport
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed for env
      expect(mockExecPromise).toHaveBeenCalledWith(
        "echo secret_from_env",
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
      );

      // Verify headers used resolved env value
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL("https://api.example.com"),
        expect.objectContaining({
          authProvider: expect.any(Object), // OAuth provider is added
          requestInit: expect.objectContaining({
            headers: {
              "Authorization": "Bearer secret_from_env" // ${SECRET_TOKEN} resolved from env
            }
          })
        })
      );

      expect(connection.status).toBe("connected");
    });

    it("should work with remote servers having no env field (the original bug)", async () => {
      // ARRANGE: SSE configuration without env field
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        headers: {
          "Authorization": "Bearer ${cmd: echo remote_token_directly}"
        }
      });

      // Mock command execution
      mockExecPromise.mockResolvedValueOnce({ stdout: "remote_token_directly\n" });

      connection = new MCPConnection("test-server", config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });

      // Mock HTTP transport
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const mockHTTPTransport = { close: vi.fn() };
      StreamableHTTPClientTransport.mockReturnValue(mockHTTPTransport);

      await connection.connect();

      // Verify command was executed directly in headers field
      expect(mockExecPromise).toHaveBeenCalledWith(
        "echo remote_token_directly",
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
      );

      // Verify headers resolved correctly without env field
      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL("https://api.example.com"),
        expect.objectContaining({
          authProvider: expect.any(Object), // OAuth provider is added
          requestInit: expect.objectContaining({
            headers: {
              "Authorization": "Bearer remote_token_directly"
            }
          })
        })
      );

      expect(connection.status).toBe("connected");
    });

    it("should handle legacy $VAR syntax with deprecation warning", async () => {
      // ARRANGE: STDIO configuration with legacy $VAR syntax
      const config = createStdioConfig("test-server", {
        command: "test-server",
        args: ["--token", "$API_KEY"], // Legacy syntax
        env: {
          SOME_VAR: "value"
        }
      });

      connection = new MCPConnection("test-server", config);

      // Mock successful capabilities
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });

      await connection.connect();

      // Verify legacy syntax still works
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: "test-server",
        args: ["--token", "secret_key"], // $API_KEY resolved from process.env
        env: expect.objectContaining({
          SOME_VAR: "value"
        }),
        stderr: 'pipe'
      });

      expect(connection.status).toBe("connected");
    });
  });

  describe("Error Handling", () => {
    it("should fail connection on command execution failures in strict mode", async () => {
      // ARRANGE: SSE configuration with failing command execution
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        headers: {
          "Authorization": "Bearer ${cmd: failing-command}"
        }
      });

      // Mock command to fail
      mockExecPromise.mockRejectedValueOnce(new Error("Command not found"));

      connection = new MCPConnection("test-server", config);

      // Connection should fail due to command execution failure
      await expect(connection.connect()).rejects.toThrow(
        /cmd execution failed/
      );

      // Command should have been attempted
      expect(mockExecPromise).toHaveBeenCalledWith(
        "failing-command",
        expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
      );

      // Status remains "connecting" because error happens during config resolution (before try block)
      expect(connection.status).toBe("connecting");
    });

    it("should handle transport creation errors", async () => {
      const config = {
        command: "${MCP_BINARY_PATH}/server",
        args: [],
        env: {},
        type: "stdio"
      };

      connection = new MCPConnection("test-server", config);

      // Mock transport creation failure
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      StdioClientTransport.mockImplementation(() => {
        throw new Error("Transport creation failed");
      });

      await expect(connection.connect()).rejects.toThrow(
        'Failed to connect to "test-server" MCP server: Transport creation failed'
      );
    });
  });

  describe("Connection Failure Scenarios", () => {
    it("should handle connection timeout", async () => {
      // ARRANGE: SSE server configuration
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        headers: {}
      });

      // Mock client connect to timeout
      mockClient.connect.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Connection timeout")), 100);
        });
      });

      connection = new MCPConnection("test-server", config);

      await expect(connection.connect()).rejects.toThrow(
        'Failed to connect to "test-server" MCP server: Connection timeout'
      );

      expect(connection.status).toBe("disconnected");
    });

    it("should handle network connection failures", async () => {
      // ARRANGE: SSE configuration for unreachable server
      const config = createSSEConfig("test-server", {
        url: "https://unreachable.example.com/mcp",
        headers: {}
      });

      // Mock both HTTP and SSE transport creation to fail
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      
      // HTTP transport fails
      StreamableHTTPClientTransport.mockImplementationOnce(() => {
        throw new Error("Network unreachable");
      });
      
      // SSE transport also fails  
      SSEClientTransport.mockImplementationOnce(() => {
        throw new Error("Network unreachable");
      });

      connection = new MCPConnection("test-server", config);

      // Attempting to connect should throw with ConnectionError wrapper
      await expect(connection.connect()).rejects.toThrow(/Failed to connect/);

      // Status should be disconnected after failed connection
      expect(connection.status).toBe("disconnected");
    });

    it("should clean up resources after connection failure", async () => {
      // ARRANGE: SSE configuration for connection failure test
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        headers: {}
      });

      // Mock transport creation to fail
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      
      // HTTP transport fails
      StreamableHTTPClientTransport.mockImplementationOnce(() => {
        throw new Error("Connection failed");
      });
      
      // SSE transport also fails
      SSEClientTransport.mockImplementationOnce(() => {
        throw new Error("Connection failed");
      });

      connection = new MCPConnection("test-server", config);

      // Connection should fail with error
      await expect(connection.connect()).rejects.toThrow(/Failed to connect/);

      // Verify resources are cleaned up after failure
      expect(connection.status).toBe("disconnected");
      // Client and transport should be null after failed connection
      expect(connection.client).toBeNull();
      expect(connection.transport).toBeNull();
    });

    it("should handle SSL/TLS certificate errors", async () => {
      // ARRANGE: SSE configuration with SSL/TLS certificate error
      const config = createSSEConfig("test-server", {
        url: "https://self-signed.example.com/mcp",
        headers: {}
      });

      // Mock both HTTP and SSE transport creation to fail with SSL error
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      
      // HTTP transport fails with SSL error
      StreamableHTTPClientTransport.mockImplementationOnce(() => {
        throw new Error("certificate has expired");
      });
      
      // SSE transport also fails with SSL error
      SSEClientTransport.mockImplementationOnce(() => {
        throw new Error("certificate has expired");
      });

      connection = new MCPConnection("test-server", config);

      // Connection should fail with certificate error wrapped in ConnectionError
      await expect(connection.connect()).rejects.toThrow(/certificate has expired/);

      // Status should be disconnected after SSL error
      expect(connection.status).toBe("disconnected");
    });
  });

  describe("Server Restart Scenarios", () => {
    it("should handle normal disconnect and reconnect", async () => {
      const config = {
        command: "test-server",
        args: [],
        env: {},
        type: "stdio"
      };

      connection = new MCPConnection("test-server", config);

      // Mock successful connect
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
      await connection.connect();

      expect(connection.status).toBe("connected");

      // Disconnect
      await connection.disconnect();
      expect(connection.status).toBe("disconnected");

      // Reconnect
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
      await connection.connect();
      expect(connection.status).toBe("connected");
    });

    it("should handle reconnection after error", async () => {
      // ARRANGE: SSE configuration for reconnection test
      const config = createSSEConfig("test-server", {
        url: "https://api.example.com",
        headers: {}
      });

      connection = new MCPConnection("test-server", config);

      // First connection fails - mock transport creation to fail
      const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      
      StreamableHTTPClientTransport.mockImplementationOnce(() => {
        throw new Error("Initial connection failed");
      });
      SSEClientTransport.mockImplementationOnce(() => {
        throw new Error("Initial connection failed");
      });
      
      await expect(connection.connect()).rejects.toThrow(/Initial connection failed/);

      expect(connection.status).toBe("disconnected");

      // Reconnection succeeds - mock transport creation to succeed
      const mockSSETransport = {
        close: vi.fn().mockResolvedValue(undefined),
        on: vi.fn()
      };
      SSEClientTransport.mockReturnValue(mockSSETransport);
      
      // Need fresh client mock
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const mockClient2 = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        request: vi.fn().mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] }),
        setNotificationHandler: vi.fn(),
        getServerVersion: vi.fn().mockReturnValue({ name: 'test', version: '1.0.0' }),
        onerror: null,
        onclose: null,
      };
      Client.mockReturnValue(mockClient2);
      
      await connection.connect();
      expect(connection.status).toBe("connected");
    });

    it("should force disconnect during active operation", async () => {
      const config = {
        command: "test-server",
        args: [],
        env: {},
        type: "stdio"
      };

      connection = new MCPConnection("test-server", config);

      // Connect
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
      await connection.connect();

      expect(connection.status).toBe("connected");

      // Force disconnect by simulating error during operation
      const error = new Error("Operation failed");
      mockClient.close.mockRejectedValueOnce(error);

      await expect(connection.disconnect()).resolves.toBeUndefined();
      expect(connection.status).toBe("disconnected");
    });
  });

  describe("Resource Cleanup on Failure", () => {
    it("should cleanup on disconnect failure", async () => {
      const config = {
        command: "test-server",
        args: [],
        env: {},
        type: "stdio"
      };

      connection = new MCPConnection("test-server", config);

      // Connect
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
      await connection.connect();

      // Mock transport close failure
      mockTransport.close.mockRejectedValueOnce(new Error("Close failed"));

      // Should still disconnect gracefully
      await connection.disconnect();
      expect(connection.status).toBe("disconnected");
    });

    it("should cleanup event handlers on disconnect", async () => {
      const config = {
        command: "test-server",
        args: [],
        env: {},
        type: "stdio"
      };

      connection = new MCPConnection("test-server", config);

      // Connect
      mockClient.request.mockResolvedValue({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
      await connection.connect();

      // Verify event handlers were set
      expect(mockClient.setNotificationHandler).toHaveBeenCalled();

      // Disconnect
      await connection.disconnect();

      // After disconnect, event handlers should be cleared
      expect(connection.client).toBeNull();
    });
  });
});
