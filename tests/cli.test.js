import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as server from "../src/server.js";
import { run } from "../src/utils/cli.js";

// Mock process.argv
const originalArgv = process.argv;
const setArgv = (args) => {
  process.argv = ["node", "mcp-hub", ...args];
};

// Mock startServer
vi.mock("../src/server.js", () => ({
  startServer: vi.fn(),
}));

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn((code, message, data, exit, exitCode) => {
      if (exit) {
        process.exit(exitCode);
      }
    }),
  },
}));

// Mock process.kill
const mockKill = vi.fn();
const mockExit = vi.fn();
process.kill = mockKill;

describe("CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKill.mockReset();
    mockExit.mockReset();

    // Set NODE_ENV to test to prevent auto-execution, but use production for VERSION
    process.env.NODE_ENV = "test";
    process.env.VERSION = "v1.0.0-test";

    // Mock process.exit
    process.exit = mockExit;
  });

  afterEach(() => {
    process.argv = originalArgv;
    delete process.env.NODE_ENV;
    delete process.env.VERSION;
  });

  it("should start server with valid arguments", async () => {
    // ARRANGE: Set CLI arguments
    setArgv(["--port", "3000", "--config", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify server started with correct options
    expect(server.startServer).toHaveBeenCalledWith({
      port: 3000,
      config: ["./config.json"],  // CLI now passes config as array
      watch: false,
      autoShutdown: false,  // Added in CLI implementation
      shutdownDelay: 0,  // Added in CLI implementation
    });
  });

  it("should start server with watch flag", async () => {
    // ARRANGE: Set CLI arguments with watch flag
    setArgv(["--port", "3000", "--config", "./config.json", "--watch"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify watch mode enabled
    expect(server.startServer).toHaveBeenCalledWith({
      port: 3000,
      config: ["./config.json"],  // CLI now passes config as array
      watch: true,
      autoShutdown: false,
      shutdownDelay: 0,
    });
  });

  it("should handle port flag alias", async () => {
    // ARRANGE: Use -p alias for port
    setArgv(["-p", "3000", "--config", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify -p alias resolves to port
    expect(server.startServer).toHaveBeenCalledWith({
      port: 3000,
      config: ["./config.json"],
      watch: false,
      autoShutdown: false,
      shutdownDelay: 0,
    });
  });

  it("should handle config flag alias", async () => {
    // ARRANGE: Use -c alias for config
    setArgv(["--port", "3000", "-c", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify -c alias resolves to config
    expect(server.startServer).toHaveBeenCalledWith({
      port: 3000,
      config: ["./config.json"],
      watch: false,
      autoShutdown: false,
      shutdownDelay: 0,
    });
  });

  it("should handle watch flag alias", async () => {
    // ARRANGE: Use -w alias for watch
    setArgv(["--port", "3000", "--config", "./config.json", "-w"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify -w alias enables watch mode
    expect(server.startServer).toHaveBeenCalledWith({
      port: 3000,
      config: ["./config.json"],
      watch: true,
      autoShutdown: false,
      shutdownDelay: 0,
    });
  });

  it("should fail when port is missing", async () => {
    // ARRANGE: Set args without required port
    setArgv(["--config", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify exits with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should fail when config is missing", async () => {
    // ARRANGE: Set args without required config
    setArgv(["--port", "3000"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify exits with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should handle server start errors", async () => {
    // ARRANGE: Mock server error
    const error = new Error("Server start error");
    server.startServer.mockRejectedValueOnce(error);
    setArgv(["--port", "3000", "--config", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify exits with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should handle fatal errors", async () => {
    // ARRANGE: Mock fatal server error
    const fatalError = new Error("Fatal error");
    server.startServer.mockRejectedValueOnce(fatalError);
    setArgv(["--port", "3000", "--config", "./config.json"]);

    // ACT: Run CLI with arguments
    await run();

    // ASSERT: Verify exits with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
