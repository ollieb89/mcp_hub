import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    // Backend tests use node environment (no DOM needed)
    // UI tests run separately via Node.js vitest (see test:ui script)
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: [
      "src/ui/**",
      "tests/ui/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**"
    ],
    setupFiles: ["./tests/setup.js"],
    // Resource-efficient defaults: sequential execution to minimize system load
    // Override with --no-file-parallelism=false for faster parallel execution
    fileParallelism: false, // Run test files sequentially (lower memory/CPU)
    maxConcurrency: 5, // Limit concurrent tests within a file
    pool: 'threads', // Use thread pool (more stable than forks)
    poolOptions: {
      threads: {
        singleThread: true, // Use single worker thread (minimal resources)
      },
    },
    isolate: true, // Isolate test files (prevents memory leaks between files)
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "tests/**"],
        thresholds: {
          // Global thresholds: Acceptable for current scope
          // Many infrastructure files (server.js, mcp/server.js, sse-manager.js, etc.)
          // require separate integration test suites
          global: {
            branches: 70,
            functions: 60,
            lines: 50,
            statements: 50,
          },
          // Per-file thresholds: Strict for files we actively test
          "src/MCPConnection.js": {
            branches: 80,
            functions: 70,
            lines: 70,
            statements: 70,
          },
          "src/MCPHub.js": {
            branches: 80,
            functions: 60,
            lines: 60,
            statements: 60,
          },
        },
      },
  },
  resolve: {
    alias: {
      "@helpers": path.resolve(__dirname, "./tests/helpers"),
      "@src": path.resolve(__dirname, "./src"),
    },
  },
});
