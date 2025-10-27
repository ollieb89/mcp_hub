import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
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
