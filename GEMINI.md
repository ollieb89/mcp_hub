# SuperGemini Entry Point

This file serves as the entry point for the SuperGemini framework.
You can add your own custom instructions and configurations here.

The SuperGemini framework components will be automatically imported below.

# ═══════════════════════════════════════════════════
# SuperGemini Framework Components
# ═══════════════════════════════════════════════════

<!-- Imported from: BUSINESS_PANEL_EXAMPLES.md -->
<!-- Imported from: BUSINESS_SYMBOLS.md -->
<!-- Imported from: FLAGS.md -->
<!-- Imported from: PRINCIPLES.md -->
<!-- Imported from: RESEARCH_CONFIG.md -->
<!-- Imported from: RULES.md -->
<!-- Imported from: MODE_Brainstorming.md -->
<!-- Imported from: MODE_Introspection.md -->
<!-- Imported from: MODE_Task_Management.md -->
<!-- Imported from: MODE_Token_Efficiency.md -->

# MCP Hub Project Overview

## Project Summary
MCP Hub is a central coordinator for Model Context Protocol (MCP) servers and clients. It provides a unified REST API and web UI for managing multiple MCP servers, and a single endpoint for MCP clients to access all server capabilities. This dual-interface approach simplifies client configuration and enhances real-time capability updates.

## Key Features
*   **Unified MCP Server Endpoint:** Single endpoint for all MCP clients, automatic namespacing, real-time capability updates.
*   **Intelligent Prompt-Based Tool Filtering:** LLM-powered intent analysis for dynamic tool exposure, reducing token usage.
*   **Dynamic Server Management:** Start, stop, enable/disable servers on demand, real-time configuration updates, health monitoring, OAuth authentication.
*   **Unified REST API:** Execute tools, access resources, real-time status updates via Server-Sent Events (SSE).
*   **Real-time Events & Monitoring:** Live server status, capability updates, client connection tracking, structured JSON logging.
*   **Workspace Management:** Tracks active MCP Hub instances across different working directories.

## Technologies Used
*   Node.js (>= 18.0.0)
*   Bun/npm for package management
*   JSON for configuration

## Building and Running

### Installation
To install MCP Hub globally:
```bash
# Using Bun (recommended)
bun install -g mcp-hub

# Using npm
npm install -g mcp-hub
```

### Basic Usage
Start the hub server:
```bash
mcp-hub --port 3000 --config path/to/config.json

# Or with multiple config files (merged in order)
mcp-hub --port 3000 --config ~/.config/mcphub/global.json --config ./.mcphub/project.json
```

### Testing
MCP Hub employs a strategic two-tier coverage approach with high code quality standards.
*   **Resource-Efficient (Default - Recommended for CI/CD)**:
    ```bash
    npm test            # Sequential execution (~50-100MB memory, 30-60s)
    npm run test:seq    # Explicit sequential mode
    npm run test:quality # Sequential + coverage for quality gates
    ```
*   **Fast Mode (When Resources Available)**:
    ```bash
    npm run test:fast   # Parallel execution (~200-300MB memory, 10-20s)
    ```
*   **Development**:
    ```bash
    npm run test:watch      # Watch mode with sequential execution
    npm run test:coverage   # Generate coverage report (sequential)
    npm run test:coverage:ui # Open HTML coverage report
    ```

## Development Conventions
*   **Code Quality**: 100% test pass rate, 82.94% branch coverage, 96%+ ESLint compliance, zero memory leaks, zero critical bugs.
*   **Testing Practices**: Test-Driven Development, comprehensive error handling, resource cleanup, event management, function decomposition.
*   **Logging**: Structured JSON logging to console and XDG-compliant file paths.
*   **Error Handling**: Comprehensive error handling with custom error classes for different types of errors (ConfigError, ConnectionError, ServerError, ToolError, ResourceError, ValidationError).
