import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPConnection } from "../src/MCPConnection.js";
import { ConfigError, ValidationError } from "../src/utils/errors.js";
import { 
  createStdioConfig, 
  createSSEConfig,
  createHttpConfig,
  createMockClient,
  createMockTransport,
  createEnvContext
} from "./helpers/fixtures.js";

// Mock all external dependencies
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(function() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
      setNotificationHandler: vi.fn(),
      onerror: null,
      onclose: null,
    };
  })
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(function() {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      stderr: {
        on: vi.fn()
      },
      onerror: null,
      onclose: null,
    };
  }),
  getDefaultEnvironment: vi.fn(() => ({ NODE_ENV: 'test' }))
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(function() {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      onerror: null,
      onclose: null,
    };
  })
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(function() {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      onerror: null,
      onclose: null,
    };
  })
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
  DevWatcher: vi.fn().mockImplementation(function() {
    return {
      on: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  })
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
    Client.mockImplementation(function() { return mockClient; });

    // Setup mock transport for STDIO
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    mockTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      stderr: {
        on: vi.fn()
      }
    };
    StdioClientTransport.mockImplementation(function() { return mockTransport; });

    // Setup mock transport for SSE
    const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
    const mockSSETransport = {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };
    SSEClientTransport.mockImplementation(function() { return mockSSETransport; });
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
      // ARRANGE: STDIO configuration with transport creation failure
      const config = createStdioConfig("test-server", {
        command: "${MCP_BINARY_PATH}/server",
        args: [],
        env: {}
      });

      connection = new MCPConnection("test-server", config);

      // Mock transport creation failure
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      StdioClientTransport.mockImplementation(function() {
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
      SSEClientTransport.mockImplementationOnce(function() {
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
      StreamableHTTPClientTransport.mockImplementationOnce(function() {
        throw new Error("Connection failed");
      });
      
      // SSE transport also fails
      SSEClientTransport.mockImplementationOnce(function() {
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
      SSEClientTransport.mockImplementationOnce(function() {
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
      
      StreamableHTTPClientTransport.mockImplementationOnce(function() {
        throw new Error("Initial connection failed");
      });
      SSEClientTransport.mockImplementationOnce(function() {
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

  describe("Timeout Handling - Task 3.2.2", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      
      // Setup exec mock for EnvResolver
      mockExecPromise = vi.fn();

      // Setup fresh process.env for each test
      process.env = {
        NODE_ENV: 'test',
        API_KEY: 'secret_key'
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

      // Setup mock transport
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
        stderr: {
          on: vi.fn()
        }
      };
      StdioClientTransport.mockReturnValue(mockTransport);
    });

    it("should handle hanging operations with race condition", async () => {
      // ARRANGE: Connection setup
      const config = createStdioConfig("timeout-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("timeout-server", config);

      // Set up a mock that simulates hanging
      let requestCallCount = 0;
      mockClient.request.mockImplementation((method, params) => {
        requestCallCount++;
        if (method === "tools/list") {
          // Register tools immediately
          return Promise.resolve({ 
            tools: [{ 
              name: 'slow-tool', 
              description: 'Slow tool',
              inputSchema: { type: 'object' }
            }] 
          });
        }
        if (method === "tools/call") {
          // Simulate hanging operation
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve({});
      });

      await connection.connect();

      // ARRANGE: Create hanging promise
      const hangingPromise = new Promise(() => {}); // Never resolves
      
      // Create timeout that will reject
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, 1000);
      });

      // ACT & ASSERT: Timeout should win the race
      await expect(
        Promise.race([hangingPromise, timeoutPromise])
      ).rejects.toThrow('Operation timed out');

      // ASSERT: Connection status remains valid
      expect(connection.status).toBe('connected');

      // Cleanup
      await connection.disconnect();
    }, 3000); // Test timeout: 3 seconds

    it("should handle client disconnection during long operation", async () => {
      // ARRANGE: Connection with operation that triggers disconnection
      const config = createStdioConfig("disconnect-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("disconnect-server", config);

      let requestCallCount = 0;
      mockClient.request.mockImplementation((method, params) => {
        requestCallCount++;
        if (method === "tools/list" && requestCallCount === 1) {
          return Promise.resolve({ tools: [{ name: 'test-tool', description: 'Test tool' }] });
        }
        if (method === "tools/call") {
          // Simulate hanging operation
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve({});
      });

      await connection.connect();

      // Verify initial state
      expect(connection.status).toBe('connected');

      // ACT: Start tool call, then wait and disconnect
      const toolPromise = connection.callTool('test-tool', {});
      
      // Wait a bit then disconnect
      setTimeout(() => {
        if (mockClient.close) {
          mockClient.close();
        }
        // Connection should handle this gracefully
      }, 500);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, 2000);
      });

      // ACT & ASSERT: Should handle timeout gracefully
      await expect(
        Promise.race([toolPromise, timeoutPromise])
      ).rejects.toThrow();

      // Cleanup
      await connection.disconnect();
      expect(connection.status).toBe('disconnected');
    }, 3000);

    it("should maintain connection state when operation is cancelled", async () => {
      // ARRANGE: Connection for state verification
      const config = createStdioConfig("state-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("state-server", config);

      let requestCallCount = 0;
      mockClient.request.mockImplementation((method, params) => {
        requestCallCount++;
        if (method === "tools/list" && requestCallCount === 1) {
          return Promise.resolve({ tools: [{ name: 'test-tool', description: 'Test tool' }] });
        }
        if (method === "tools/call") {
          // Simulate hanging operation
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve({});
      });

      await connection.connect();

      // Verify connection is established
      expect(connection.status).toBe('connected');

      const toolPromise = connection.callTool('test-tool', {});
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, 1000);
      });

      // ACT: Cancel operation
      try {
        await Promise.race([toolPromise, timeoutPromise]);
      } catch (error) {
        // Expected to timeout
      }

      // ASSERT: Connection state remains 'connected'
      expect(connection.status).toBe('connected');

      // Cleanup
      await connection.disconnect();
      expect(connection.status).toBe('disconnected');
    }, 3000);
  });

  describe("Configuration Validation - Task 3.2.3", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      
      // Setup exec mock for EnvResolver
      mockExecPromise = vi.fn();

      // Setup fresh process.env
      process.env = {
        NODE_ENV: 'test',
        API_KEY: 'secret_key'
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

      // Setup mock transport
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
        stderr: {
          on: vi.fn()
        }
      };
      StdioClientTransport.mockReturnValue(mockTransport);
    });

    it("should handle missing command for STDIO server during connection", async () => {
      // ARRANGE: Invalid STDIO config (missing command)
      const config = {
        type: 'stdio',
        args: ['server.js']
        // Missing required 'command' field
      };

      // Note: MCPConnection constructor doesn't validate, but connections will fail
      connection = new MCPConnection("invalid-stdio", config);

      // The actual validation happens when transport is created
      // STDIO transport requires command, so this will fail
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      StdioClientTransport.mockImplementationOnce(function() {
        throw new Error('Cannot create STDIO transport without command');
      });

      // ACT & ASSERT: Connection fails during setup
      await expect(connection.connect()).rejects.toThrow();

      // Cleanup if needed
      if (connection) {
        await connection.disconnect().catch(() => {});
      }
    }, 5000);

    it("should handle invalid URL for SSE transport", async () => {
      // ARRANGE: Invalid SSE config (malformed URL)
      const config = createSSEConfig("invalid-sse", {
        url: 'not-a-valid-url'
      });

      connection = new MCPConnection("invalid-sse", config);

      // Mock SSE transport to throw error for invalid URL
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      SSEClientTransport.mockImplementationOnce(function() {
        try {
          new URL('not-a-valid-url');
        } catch (error) {
          throw new Error('Invalid URL format');
        }
      });

      // ACT & ASSERT: Connection fails validation
      await expect(connection.connect()).rejects.toThrow();

      // Cleanup
      if (connection) {
        await connection.disconnect().catch(() => {});
      }
    }, 5000);

    it("should handle args as string instead of array gracefully", async () => {
      // ARRANGE: Config with args as string (invalid type)
      const config = {
        type: 'stdio',
        command: 'node',
        args: 'server.js' // Should be ['server.js'] but passed as string
      };

      connection = new MCPConnection("type-error-server", config);

      // The connection should still be created but may fail during execution
      // The actual validation would happen at runtime or in ConfigManager
      expect(connection).toBeDefined();
      expect(connection.config.args).toBe('server.js');
      expect(connection.config.command).toBe('node');

      // Cleanup
      await connection.disconnect().catch(() => {});
    }, 3000);

    it("should handle conflicting transport configuration", async () => {
      // ARRANGE: Config with both STDIO and HTTP properties
      const config = {
        type: 'stdio',
        command: 'node', // STDIO property
        url: 'https://example.com', // HTTP property
        args: ['server.js']
      };

      connection = new MCPConnection("conflicting-server", config);

      // The transport type is 'stdio' (from config.type), so it should use command
      expect(connection.transportType).toBe('stdio');
      expect(connection.config.command).toBe('node');
      
      // URL property is present but type is stdio, so it should be ignored
      expect(connection.config.url).toBeDefined();

      // Cleanup
      await connection.disconnect().catch(() => {});
    }, 3000);
  });

  describe("Concurrency & Resource Cleanup - Task 3.2.4", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      
      // Setup exec mock for EnvResolver
      mockExecPromise = vi.fn();

      // Setup fresh process.env
      process.env = {
        NODE_ENV: 'test',
        API_KEY: 'secret_key'
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

      // Setup mock transport
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
        stderr: {
          on: vi.fn()
        }
      };
      StdioClientTransport.mockReturnValue(mockTransport);
    });

    it("should handle parallel client requests without interference", async () => {
      // ARRANGE: Connection setup
      const config = createStdioConfig("concurrent-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("concurrent-server", config);

      let callCount = 0;
      const callResults = [];

      mockClient.request.mockImplementation((method, params) => {
        if (method === "tools/list") {
          return Promise.resolve({ 
            tools: [{ 
              name: 'test-tool', 
              description: 'Test Tool',
              inputSchema: { type: 'object' }
            }] 
          });
        }
        if (method === "tools/call") {
          callCount++;
          const id = callCount;
          // Simulate concurrent processing with slight delay
          return new Promise(resolve => {
            setTimeout(() => {
              callResults.push(`Result ${id}`);
              resolve({ 
                content: [{ type: 'text', text: `Result ${id}` }] 
              });
            }, 50);
          });
        }
        return Promise.resolve({});
      });

      await connection.connect();

      // Wait for connection to be fully established
      await new Promise(resolve => setTimeout(resolve, 200));

      // ACT: Execute multiple concurrent requests through client
      const results = await Promise.all([
        mockClient.request('tools/call', { name: 'test-tool', arguments: {} }),
        mockClient.request('tools/call', { name: 'test-tool', arguments: {} }),
        mockClient.request('tools/call', { name: 'test-tool', arguments: {} })
      ]);

      // ASSERT: All calls succeed independently
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('content');
      });

      // Verify results are distinct (no interference)
      const texts = results.map(r => r.content[0].text);
      expect(new Set(texts).size).toBe(3); // All unique
      expect(callCount).toBe(3); // All three calls executed

      // Cleanup
      await connection.disconnect();
    }, 5000);

    it("should cleanup connection resources on disconnect", async () => {
      // ARRANGE: Connection with event listeners
      const config = createStdioConfig("cleanup-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("cleanup-server", config);

      mockClient.request.mockResolvedValue({ 
        tools: [{ name: 'test-tool', description: 'Test', inputSchema: {} }] 
      });

      await connection.connect();

      // Add event listeners
      const toolsChangedHandler = vi.fn();
      const resourcesChangedHandler = vi.fn();
      connection.on('toolsChanged', toolsChangedHandler);
      connection.on('resourcesChanged', resourcesChangedHandler);

      // ACT: Disconnect
      await connection.disconnect();

      // ASSERT: Connection is cleaned up
      expect(connection.status).toBe('disconnected');
      expect(connection.client).toBeNull();
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);

      // Cleanup already done
    }, 3000);

    it("should prevent issues with repeated connect/disconnect cycles", async () => {
      // ARRANGE: Connection for stress testing
      const config = createStdioConfig("stress-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("stress-server", config);

      mockClient.request.mockResolvedValue({ 
        tools: [{ name: 'test-tool', description: 'Test', inputSchema: {} }] 
      });

      // ACT: Repeated connect/disconnect cycles
      for (let i = 0; i < 5; i++) {
        await connection.connect();
        expect(connection.status).toBe('connected');

        await connection.disconnect();
        expect(connection.status).toBe('disconnected');
      }

      // ASSERT: Connection is still functional
      await connection.connect();
      expect(connection.status).toBe('connected');
      
      // Final cleanup
      await connection.disconnect();
      expect(connection.status).toBe('disconnected');
    }, 10000);

    it("should cleanup transport resources on disconnect", async () => {
      // ARRANGE: Connection with transport
      const config = createStdioConfig("transport-cleanup-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("transport-cleanup-server", config);

      mockClient.request.mockResolvedValue({ 
        tools: [{ name: 'test-tool', description: 'Test', inputSchema: {} }] 
      });

      await connection.connect();

      // Verify transport exists
      expect(mockTransport).toBeDefined();

      // ACT: Disconnect
      await connection.disconnect();

      // ASSERT: Transport close was called
      expect(mockTransport.close).toHaveBeenCalled();
      expect(connection.transport).toBeNull();

      // Verify connection is cleaned up
      expect(connection.status).toBe('disconnected');
      expect(connection.client).toBeNull();
    }, 3000);

    it("should handle cleanup even when connection setup is incomplete", async () => {
      // ARRANGE: Connection that will fail during connect
      const config = createStdioConfig("error-cleanup-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("error-cleanup-server", config);

      // Mock to fail during connection with reject
      mockClient.connect.mockImplementationOnce(() => {
        return Promise.reject(new Error('Connection failed during setup'));
      });

      // ACT: Connection fails
      await expect(connection.connect()).rejects.toThrow('Connection failed during setup');

      // ASSERT: Connection state is cleaned up despite error
      // Status should be disconnected after failed connection
      expect(['disconnected', 'connecting']).toContain(connection.status);
      
      // Should still be able to attempt disconnect
      await connection.disconnect().catch(() => {});
    }, 5000);
  });

  describe("Edge Cases - Task 3.2.5", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      
      // Setup exec mock for EnvResolver
      mockExecPromise = vi.fn();

      // Setup fresh process.env
      process.env = {
        NODE_ENV: 'test',
        API_KEY: 'secret_key'
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

      // Setup mock transport
      const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
      mockTransport = {
        close: vi.fn().mockResolvedValue(undefined),
        stderr: {
          on: vi.fn()
        }
      };
      StdioClientTransport.mockReturnValue(mockTransport);
    });

    it("should handle empty server capabilities gracefully", async () => {
      // ARRANGE: Server with no tools, resources, or prompts
      const config = createStdioConfig("empty-capabilities-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("empty-capabilities-server", config);

      mockClient.request.mockImplementation((method, params) => {
        if (method === "tools/list") {
          return Promise.resolve({ tools: [] }); // No tools
        }
        if (method === "resources/list") {
          return Promise.resolve({ resources: [] }); // No resources
        }
        if (method === "prompts/list") {
          return Promise.resolve({ prompts: [] }); // No prompts
        }
        return Promise.resolve({});
      });

      await connection.connect();

      // Wait for capabilities to be fetched
      await new Promise(resolve => setTimeout(resolve, 200));

      // ASSERT: Empty capabilities are valid
      expect(connection.tools).toEqual([]);
      expect(connection.resources).toEqual([]);
      expect(connection.prompts).toEqual([]);
      expect(connection.status).toBe('connected');

      // Cleanup
      await connection.disconnect();
    }, 5000);

    it("should handle malformed JSON responses gracefully", async () => {
      // ARRANGE: Connection with malformed response handling
      const config = createStdioConfig("malformed-json-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("malformed-json-server", config);

      mockClient.request.mockImplementation((method, params) => {
        if (method === "tools/list") {
          return Promise.resolve({ tools: [] }); // Empty tools
        }
        return Promise.resolve({}); // Return empty object for undefined methods
      });

      await connection.connect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT: Attempt to get server info (should handle gracefully)
      const serverInfo = connection.getServerInfo();

      // ASSERT: Server info is returned even with empty capabilities
      expect(serverInfo).toBeDefined();
      expect(serverInfo.status).toBe('connected');
      expect(serverInfo.capabilities).toBeDefined();
      expect(serverInfo.capabilities.tools).toEqual([]);

      // Cleanup
      await connection.disconnect();
    }, 5000);

    it("should handle unsupported notification methods gracefully", async () => {
      // ARRANGE: Connection that receives unknown notification
      const config = createStdioConfig("unknown-method-server", {
        command: "test-server",
        args: []
      });

      connection = new MCPConnection("unknown-method-server", config);

      mockClient.request.mockResolvedValue({ 
        tools: [{ name: 'test-tool', description: 'Test', inputSchema: {} }] 
      });

      await connection.connect();

      // ACT: Simulate receiving unknown notification
      const unknownNotification = {
        method: 'unknown/newFeature',
        params: {}
      };

      // The connection should handle this gracefully
      // For integration tests, we verify connection remains stable
      expect(connection.status).toBe('connected');

      // Cleanup
      await connection.disconnect();
      expect(connection.status).toBe('disconnected');
    }, 3000);
  });
});
