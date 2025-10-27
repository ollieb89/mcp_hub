# Sprint 4 Implementation Workflow: CLI & Configuration Tests

**Date**: 2025-10-27
**Status**: 🔄 Ready for Execution
**Duration**: 3-4 hours (Sequential) OR 2-2.5 hours (Parallel with 2 developers)
**Sprint Goal**: Rewrite CLI and configuration test suites with user-facing behavior focus
**Expected Outcome**: 295-299/295-299 tests passing (120% of original 246 target)

---

## Executive Summary

### Sprint Overview
Sprint 4 focuses on **CLI & Configuration Tests** - validating the user-facing command-line interface and the critical configuration system that powers all MCP server connections. This sprint rewrites cli.test.js (11 tests) and config.test.js (~16-20 tests).

### Critical Success Factors
1. **Process Exit Mocking**: All CLI tests must mock process.exit() without actually exiting
2. **File System Isolation**: All config tests must use mock-fs without touching real files
3. **Environment Cleanup**: No process.env or process.argv pollution between tests
4. **User-Facing Behavior**: Test exit codes and error messages, not logger calls
5. **VS Code Compatibility**: Full support for 'servers' key and ${env:} syntax

### Expected Outcomes
- **Current State**: 268/268 passing (100%) after Sprint 3
- **Sprint 4 Target**: 295-299/295-299 passing (100%)
  - CLI tests: 11/11 passing (100% vs current unknown)
  - Config tests: ~16-20/~16-20 passing (100% vs current unknown)
  - Total gain: +27-31 tests from Sprint 3 baseline

### Execution Model
**Optional Parallelization** (Tasks 4.1 and 4.2 are independent):
- **Sequential**: 3-4h total (single developer, simpler coordination)
- **Parallel**: 2-2.5h wall-clock time (2 developers, 33-38% time savings)
- **Recommendation**: Parallel if 2 developers available, sequential otherwise

### Key Risks
1. **Process.exit() Mocking Complexity** (MEDIUM/MEDIUM) - Tricky to mock without actual exits
2. **File Watching Simulation** (MEDIUM/MEDIUM) - Requires proper event sequencing
3. **Environment Variable Pollution** (LOW/HIGH) - Can interfere with other tests
4. **VS Code Compatibility Edge Cases** (MEDIUM/LOW) - Specific config requirements

---

## Prerequisites Validation

**Sprint 3 MUST be 100% complete before starting Sprint 4.**

### Sprint 3 Completion Checklist

#### Test Results ✅
- [ ] Sprint 3 tests: 268/268 passing (100%)
- [ ] MCPConnection.integration.test.js: 78/78 passing
- [ ] New error tests: 10-15 added and passing
- [ ] Sprint 3 quality gates: ALL passed

#### Integration Patterns Proven ✅
- [ ] Transport isolation validated (STDIO, SSE, HTTP)
- [ ] OAuth PKCE flow complete (all 5 steps tested)
- [ ] Process cleanup verified (zero zombie processes)
- [ ] Async robustness established (event-based waiting)
- [ ] Error coverage comprehensive (timeout, config, concurrency, cleanup, edge cases)

#### Documentation Complete ✅
- [ ] Sprint3_Error_Tests_Added.md created
- [ ] OAuth flow documented with complete examples
- [ ] Transport isolation patterns documented
- [ ] TEST_P3_WF.md accepted and archived

#### Team Readiness ✅
- [ ] Sprint 3 retrospective completed
- [ ] Integration testing learnings documented
- [ ] Team familiar with all testing patterns
- [ ] CLI and config test complexity understood

### Go/No-Go Decision

**🟢 GO**: All checklist items complete, Sprint 3 delivered 268/268 passing, team confident

**🔴 NO-GO**: Any item incomplete → Return to Sprint 3, do NOT proceed

**⚠️ STOP Condition**: If Sprint 3 achieved <265/268 (99%), investigate root cause before Sprint 4

---

## Phase A: Task 4.1 - Rewrite cli.test.js

**Duration**: 1.5-2 hours
**Current Status**: Unknown (need to verify current pass rate)
**Target**: 11/11 passing (100%)
**Complexity**: MEDIUM - Process mocking and argument parsing

### Overview
CLI tests validate the **user-facing command-line interface** - how users interact with MCP Hub via terminal commands. Key focus: argument parsing, error messages, exit codes, and server start integration.

### Subtask 4.1.1: Analyze CLI Test Structure (20 min)

**Objective**: Understand current CLI test organization and identify brittle patterns

**Actions**:
1. **Read existing test file** (10 min)
   ```bash
   cat tests/cli.test.js | head -50
   # Review structure, imports, current patterns
   ```

2. **Identify current patterns** (5 min)
   ```bash
   # Logger assertions (should be 0 after Sprint 2 learning)
   grep -n "expect(logger" tests/cli.test.js

   # Process exit mocking (may or may not exist)
   grep -n "process.exit\\|mockExit" tests/cli.test.js

   # Argv manipulation patterns
   grep -n "setArgv\\|process.argv" tests/cli.test.js
   ```

3. **Map tests to focus areas** (5 min)
   - Argument parsing tests
   - Validation error tests
   - Process exit behavior tests
   - Server start integration tests

**Deliverables**:
- Test structure map (11 tests categorized)
- Brittle pattern list with line numbers
- Transformation strategy document

**Validation**:
- All 11 tests categorized by focus area
- Brittle patterns identified (logger assertions, missing process.exit mocking)
- Clear understanding of current vs target structure

---

### Subtask 4.1.2: Rewrite Argument Parsing Tests (30 min)

**Objective**: Validate CLI argument parsing with user-facing behavior

**Focus Areas**:
1. Required arguments (--port, --config)
2. Optional arguments (--host, --workspace)
3. Flag aliases (-p for --port, -c for --config)
4. Invalid argument values (negative port, non-existent config file)
5. Help text display (--help, -h)

**Example Transformation**:

**BEFORE** (Logger-focused, implementation detail):
```javascript
it("should parse port argument", async () => {
  setArgv(["--port", "3000", "--config", "./config.json"]);
  await import("../src/utils/cli.js");

  expect(logger.info).toHaveBeenCalledWith(
    "Starting MCP Hub on port 3000"
  );
});
```

**AFTER** (Behavior-focused, user-facing):
```javascript
it("should successfully start server when valid port provided", async () => {
  // ARRANGE: Valid CLI arguments
  setArgv(["--port", "3000", "--config", "./mcp-config.json"]);

  // Mock process.exit to prevent actual exit
  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

  // Mock server start (don't actually start)
  const mockServer = {
    listen: vi.fn((port, callback) => callback())
  };

  // ACT: Import CLI (triggers argument parsing and server start)
  await import("../src/utils/cli.js");

  // ASSERT: No errors, no exit called (successful start)
  expect(mockExit).not.toHaveBeenCalled();

  // Cleanup
  mockExit.mockRestore();
});
```

**Key Improvements**:
- ✅ Tests successful server start (user outcome), not logger calls
- ✅ Mocks process.exit to verify no error exit
- ✅ Focuses on user-facing behavior (successful vs failed start)
- ✅ No logger assertions or implementation details

**Argument Parsing Patterns**:

**Required Argument Test**:
```javascript
it("should exit with code 1 when required port is missing", async () => {
  // ARRANGE: Missing required --port argument
  setArgv(["--config", "./mcp-config.json"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

  // ACT: Import CLI (triggers validation)
  await import("../src/utils/cli.js");

  // ASSERT: Exits with error code 1
  expect(mockExit).toHaveBeenCalledWith(1);
  expect(mockExit).toHaveBeenCalledTimes(1);

  // Cleanup
  mockExit.mockRestore();
});
```

**Flag Alias Test**:
```javascript
it("should accept -p as alias for --port", async () => {
  // ARRANGE: Use short flag alias
  setArgv(["-p", "3000", "-c", "./mcp-config.json"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

  // ACT: Import CLI
  await import("../src/utils/cli.js");

  // ASSERT: Successful parsing (no error exit)
  expect(mockExit).not.toHaveBeenCalled();

  mockExit.mockRestore();
});
```

**Invalid Value Test**:
```javascript
it("should exit with code 1 when port is negative", async () => {
  // ARRANGE: Invalid port value
  setArgv(["--port", "-1", "--config", "./mcp-config.json"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

  // ACT: Import CLI
  await import("../src/utils/cli.js");

  // ASSERT: Validation fails, exits with error
  expect(mockExit).toHaveBeenCalledWith(1);

  mockExit.mockRestore();
});
```

**Help Text Test**:
```javascript
it("should display help text and exit with code 0 when --help provided", async () => {
  // ARRANGE: Help flag
  setArgv(["--help"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  const mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});

  // ACT: Import CLI
  await import("../src/utils/cli.js");

  // ASSERT: Help text displayed
  expect(mockStdout).toHaveBeenCalled();
  const helpOutput = mockStdout.mock.calls.map(call => call[0]).join('\n');
  expect(helpOutput).toContain('Usage:');
  expect(helpOutput).toContain('--port');
  expect(helpOutput).toContain('--config');

  // Exits successfully (code 0)
  expect(mockExit).toHaveBeenCalledWith(0);

  // Cleanup
  mockExit.mockRestore();
  mockStdout.mockRestore();
});
```

**Tests to Rewrite** (~5 tests):
1. Valid port and config (successful start)
2. Missing required port (exit code 1)
3. Missing required config (exit code 1)
4. Flag aliases (-p, -c work correctly)
5. Invalid port value (negative, non-numeric)

**Validation Commands**:
```bash
# Run CLI tests only
npm test tests/cli.test.js

# Verify no logger assertions
grep -c "expect(logger" tests/cli.test.js  # Should be 0

# Check process.exit mocking
grep -c "vi.spyOn(process, 'exit')" tests/cli.test.js  # Should be ≥5

# Verify mockRestore cleanup
grep -c "mockRestore()" tests/cli.test.js  # Should match mock count
```

---

### Subtask 4.1.3: Rewrite Validation Error Tests (25 min)

**Objective**: Validate CLI error messages are user-friendly and actionable

**Focus Areas**:
1. Missing required arguments (clear error messages)
2. Invalid config file path (file not found)
3. Malformed config file (JSON parse errors)

**User-Friendly Error Pattern**:
```javascript
it("should show clear error message when config file not found", async () => {
  // ARRANGE: Non-existent config file
  setArgv(["--port", "3000", "--config", "./nonexistent.json"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

  // ACT: Import CLI
  await import("../src/utils/cli.js");

  // ASSERT: User-friendly error message displayed
  expect(mockStderr).toHaveBeenCalled();
  const errorOutput = mockStderr.mock.calls.map(call => call[0]).join('\n');

  // Error message should be clear and actionable
  expect(errorOutput).toContain('Config file not found');
  expect(errorOutput).toContain('./nonexistent.json');
  expect(errorOutput).not.toContain('ENOENT'); // No technical error codes

  // Exits with error
  expect(mockExit).toHaveBeenCalledWith(1);

  // Cleanup
  mockExit.mockRestore();
  mockStderr.mockRestore();
});
```

**Malformed Config Error**:
```javascript
it("should show clear error message when config file is invalid JSON", async () => {
  // ARRANGE: Config file with invalid JSON
  // Use mock-fs to create malformed file
  const mockFs = require('mock-fs');
  mockFs({
    './bad-config.json': '{ invalid json }'
  });

  setArgv(["--port", "3000", "--config", "./bad-config.json"]);

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});

  // ACT: Import CLI
  await import("../src/utils/cli.js");

  // ASSERT: Clear error about invalid JSON
  expect(mockStderr).toHaveBeenCalled();
  const errorOutput = mockStderr.mock.calls.map(call => call[0]).join('\n');

  expect(errorOutput).toContain('Invalid JSON');
  expect(errorOutput).toContain('./bad-config.json');

  expect(mockExit).toHaveBeenCalledWith(1);

  // Cleanup
  mockExit.mockRestore();
  mockStderr.mockRestore();
  mockFs.restore();
});
```

**Tests to Rewrite** (~3 tests):
1. Missing port (clear error message)
2. Config file not found (file path in error)
3. Malformed JSON config (helpful error, not stack trace)

**Validation Commands**:
```bash
# Run validation error tests
npm test tests/cli.test.js -- -t "error\\|invalid\\|missing"

# Check error message quality
grep -i "user-friendly\\|clear error" tests/cli.test.js
```

---

### Subtask 4.1.4: Rewrite Process Exit Behavior Tests (20 min)

**Objective**: Validate correct exit codes for success and failure scenarios

**Focus Areas**:
1. Exit code 0 on successful start
2. Exit code 1 on validation errors
3. Exit code 1 on server start failures

**Exit Code Pattern**:
```javascript
describe("Process Exit Behavior", () => {
  let mockExit;

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  it("should exit with code 0 on successful server start", async () => {
    // ARRANGE: Valid arguments and successful server start
    setArgv(["--port", "3000", "--config", "./mcp-config.json"]);

    // Mock server that starts successfully
    const mockServer = {
      listen: vi.fn((port, callback) => {
        callback(); // Successful start
        return mockServer;
      }),
      on: vi.fn()
    };

    // ACT: Import CLI
    await import("../src/utils/cli.js");

    // Wait for server start
    await new Promise(resolve => setTimeout(resolve, 100));

    // ASSERT: Either no exit (running) or exit 0 (graceful)
    if (mockExit.mock.calls.length > 0) {
      expect(mockExit).toHaveBeenCalledWith(0);
    }
  });

  it("should exit with code 1 when server fails to start", async () => {
    // ARRANGE: Valid arguments but server start fails
    setArgv(["--port", "3000", "--config", "./mcp-config.json"]);

    // Mock server that fails to start (port already in use)
    const mockServer = {
      listen: vi.fn((port, callback) => {
        const error = new Error('EADDRINUSE');
        error.code = 'EADDRINUSE';
        throw error;
      })
    };

    // ACT: Import CLI
    await import("../src/utils/cli.js");

    // ASSERT: Exits with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
```

**Tests to Rewrite** (~2 tests):
1. Exit code 0 on success (or no exit if running)
2. Exit code 1 on server start failure

**Validation Commands**:
```bash
# Run exit code tests
npm test tests/cli.test.js -- -t "exit"

# Verify exit code checks
grep -c "toHaveBeenCalledWith(0)\\|toHaveBeenCalledWith(1)" tests/cli.test.js
```

---

### Subtask 4.1.5: Rewrite Server Start Integration Test (15 min)

**Objective**: Validate CLI successfully initializes server with config

**Integration Test Pattern**:
```javascript
it("should start server and load MCP server configurations", async () => {
  // ARRANGE: Valid CLI arguments with real config structure
  setArgv(["--port", "3000", "--config", "./test-config.json"]);

  // Create test config file
  const mockFs = require('mock-fs');
  mockFs({
    './test-config.json': JSON.stringify({
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['server.js']
        }
      }
    })
  });

  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

  // Mock MCPHub to verify initialization
  const mockHub = {
    initialize: vi.fn().mockResolvedValue(undefined),
    connections: new Map()
  };

  // ACT: Import CLI (initializes MCPHub)
  await import("../src/utils/cli.js");

  // Wait for async initialization
  await new Promise(resolve => setTimeout(resolve, 100));

  // ASSERT: No error exit (successful start)
  expect(mockExit).not.toHaveBeenCalledWith(1);

  // Cleanup
  mockExit.mockRestore();
  mockFs.restore();
});
```

**Test to Rewrite** (~1 test):
1. Successful server initialization with config loading

**Validation Commands**:
```bash
# Run integration test
npm test tests/cli.test.js -- -t "start server"

# Verify MCPHub integration
grep -c "MCPHub\\|initialize" tests/cli.test.js
```

---

### Subtask 4.1.6: Validate CLI Test Suite (10 min)

**Objective**: Ensure all CLI tests pass and meet quality standards

**Actions**:

1. **Run full CLI suite** (3 min)
   ```bash
   npm test tests/cli.test.js

   # Expected output:
   # Test Files  1 passed (1)
   # Tests  11 passed (11)
   # Duration  ~5-10 seconds
   ```

2. **Check quality anti-patterns** (3 min)
   ```bash
   # Logger assertions (should be 0)
   grep -c "expect(logger" tests/cli.test.js

   # Process exit mocking (should be 11 - all tests)
   grep -c "vi.spyOn(process, 'exit')" tests/cli.test.js

   # Mock cleanup (should match mock count)
   grep -c "mockRestore()" tests/cli.test.js

   # Real process exits (should be 0)
   grep -c "process.exit(" tests/cli.test.js
   ```

3. **Verify argv cleanup** (2 min)
   ```bash
   # afterEach should restore argv
   grep -A5 "afterEach" tests/cli.test.js | grep -c "argv"
   ```

4. **Generate coverage report** (2 min)
   ```bash
   npm run test:coverage -- tests/cli.test.js

   # Review src/utils/cli.js coverage
   # Target: >80% for argument parsing and validation paths
   ```

**Deliverables**:
- ✅ All 11 CLI tests passing
- ✅ Zero anti-patterns detected
- ✅ Process.exit properly mocked in all tests
- ✅ Coverage report generated for Phase B dependency

**Go/No-Go Decision for Phase B or Task 4.2 (if parallel)**:
- 🟢 GO: 11/11 tests pass, zero anti-patterns, coverage ≥80%
- 🟡 REVIEW: 10/11 tests pass OR coverage 75-79%, investigate
- 🔴 NO-GO: <10/11 tests pass OR anti-patterns detected, fix before proceeding

---

## Phase B: Task 4.2 - Rewrite config.test.js

**Duration**: 1.5-2 hours
**Current Status**: Unknown (need to verify current pass rate)
**Target**: ~16-20/~16-20 passing (100%)
**Complexity**: MEDIUM-HIGH - File I/O, environment resolution, file watching

### Overview
Config tests validate the **configuration system** that loads, merges, resolves, and watches MCP server configurations. This is critical infrastructure affecting all servers.

### Subtask 4.2.1: Analyze Config Test Structure (20 min)

**Objective**: Understand current config test organization and complexity

**Actions**:
1. **Read existing test file** (10 min)
   ```bash
   cat tests/config.test.js | head -100
   # Review structure, imports, mock-fs usage
   ```

2. **Identify current patterns** (5 min)
   ```bash
   # File I/O patterns (should use mock-fs)
   grep -n "fs.readFile\\|fs.writeFile\\|mock-fs" tests/config.test.js

   # Environment resolution patterns
   grep -n "env:\\|EnvResolver" tests/config.test.js

   # File watching patterns
   grep -n "watch\\|chokidar" tests/config.test.js
   ```

3. **Map tests to focus areas** (5 min)
   - Config loading tests (single file, multiple files, merging)
   - VS Code compatibility tests ('servers' key, ${env:} syntax)
   - Environment resolution tests (recursive, cycle detection)
   - Validation tests (invalid JSON, missing fields)
   - File watching tests (change detection, hot-reload)

**Deliverables**:
- Test structure map (~16-20 tests categorized)
- File I/O and environment patterns identified
- Transformation strategy for each focus area

---

### Subtask 4.2.2: Rewrite Config Loading Tests (30 min)

**Objective**: Validate configuration loading and merging behavior

**Focus Areas**:
1. Single config file loading
2. Multiple config files (merging strategy)
3. Load order (later files override earlier)
4. JSON5 support (comments, trailing commas)

**Config Loading Pattern**:

**Single File Loading**:
```javascript
it("should load config from single file", async () => {
  // ARRANGE: Create test config file with mock-fs
  const mockFs = require('mock-fs');
  mockFs({
    './mcp-config.json': JSON.stringify({
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['server.js']
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load config
  await configManager.loadConfig('./mcp-config.json');
  const config = configManager.getConfig();

  // ASSERT: Config loaded correctly
  expect(config).toHaveProperty('mcpServers');
  expect(config.mcpServers).toHaveProperty('test-server');
  expect(config.mcpServers['test-server']).toMatchObject({
    command: 'node',
    args: ['server.js']
  });

  // Cleanup
  mockFs.restore();
});
```

**Multiple File Merging**:
```javascript
it("should merge multiple config files with later files taking precedence", async () => {
  // ARRANGE: Create multiple config files
  const mockFs = require('mock-fs');
  mockFs({
    './base-config.json': JSON.stringify({
      mcpServers: {
        'server1': { command: 'node', args: ['s1.js'] },
        'server2': { command: 'node', args: ['s2.js'] }
      }
    }),
    './override-config.json': JSON.stringify({
      mcpServers: {
        'server2': { command: 'deno', args: ['s2.ts'] }, // Override
        'server3': { command: 'node', args: ['s3.js'] }  // New
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load multiple files
  await configManager.loadConfig([
    './base-config.json',
    './override-config.json'
  ]);
  const config = configManager.getConfig();

  // ASSERT: Correct merging behavior
  expect(config.mcpServers['server1']).toMatchObject({
    command: 'node',
    args: ['s1.js']
  }); // From base

  expect(config.mcpServers['server2']).toMatchObject({
    command: 'deno',
    args: ['s2.ts']
  }); // Overridden

  expect(config.mcpServers['server3']).toMatchObject({
    command: 'node',
    args: ['s3.js']
  }); // From override

  mockFs.restore();
});
```

**JSON5 Support**:
```javascript
it("should support JSON5 syntax with comments and trailing commas", async () => {
  // ARRANGE: JSON5 config with comments
  const mockFs = require('mock-fs');
  mockFs({
    './config.json5': `{
      // MCP server configuration
      "mcpServers": {
        "test": {
          "command": "node",
          "args": ["server.js"], // Trailing comma OK in JSON5
        },
      },
    }`
  });

  const configManager = new ConfigManager();

  // ACT: Load JSON5 file
  await configManager.loadConfig('./config.json5');
  const config = configManager.getConfig();

  // ASSERT: Parsed correctly despite comments and trailing commas
  expect(config.mcpServers.test).toMatchObject({
    command: 'node',
    args: ['server.js']
  });

  mockFs.restore();
});
```

**Tests to Rewrite** (~4-5 tests):
1. Single file loading
2. Multiple file merging (later overrides earlier)
3. Load order verification
4. JSON5 support (comments, trailing commas)
5. Empty config file (no servers)

**Validation Commands**:
```bash
# Run config loading tests
npm test tests/config.test.js -- -t "load\\|merge"

# Verify mock-fs usage
grep -c "mock-fs\\|mockFs" tests/config.test.js

# Check proper cleanup
grep -c "mockFs.restore()" tests/config.test.js
```

---

### Subtask 4.2.3: Rewrite VS Code Compatibility Tests (25 min)

**Objective**: Validate VS Code-specific config features

**Focus Areas**:
1. 'servers' key as synonym for 'mcpServers'
2. ${env:VAR} syntax (VS Code style)
3. ${workspaceFolder} predefined variable
4. Backward compatibility (both formats work)

**VS Code Compatibility Pattern**:

**'servers' Key Support**:
```javascript
it("should accept 'servers' key as synonym for 'mcpServers' (VS Code compat)", async () => {
  // ARRANGE: VS Code format config
  const mockFs = require('mock-fs');
  mockFs({
    './vscode-config.json': JSON.stringify({
      servers: { // VS Code uses 'servers' instead of 'mcpServers'
        'test-server': {
          command: 'node',
          args: ['server.js']
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load VS Code format
  await configManager.loadConfig('./vscode-config.json');
  const config = configManager.getConfig();

  // ASSERT: 'servers' converted to 'mcpServers' internally
  expect(config.mcpServers).toBeDefined();
  expect(config.mcpServers['test-server']).toMatchObject({
    command: 'node',
    args: ['server.js']
  });

  mockFs.restore();
});
```

**${env:VAR} Syntax**:
```javascript
it("should resolve ${env:VAR} syntax (VS Code style)", async () => {
  // ARRANGE: Config with ${env:} syntax
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: 'node',
          args: ['server.js'],
          env: {
            API_KEY: '${env:TEST_API_KEY}'
          }
        }
      }
    })
  });

  // Set environment variable
  process.env.TEST_API_KEY = 'secret-key-123';

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: ${env:} resolved to actual value
  expect(config.mcpServers.test.env.API_KEY).toBe('secret-key-123');

  // Cleanup
  delete process.env.TEST_API_KEY;
  mockFs.restore();
});
```

**${workspaceFolder} Variable**:
```javascript
it("should resolve ${workspaceFolder} to configured workspace path", async () => {
  // ARRANGE: Config with ${workspaceFolder}
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${workspaceFolder}/scripts/server.sh'
        }
      }
    })
  });

  const configManager = new ConfigManager({
    workspaceFolder: '/home/user/project'
  });

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: ${workspaceFolder} resolved
  expect(config.mcpServers.test.command).toBe('/home/user/project/scripts/server.sh');

  mockFs.restore();
});
```

**Backward Compatibility**:
```javascript
it("should support both 'servers' and 'mcpServers' keys in same config", async () => {
  // ARRANGE: Mixed format config
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'server1': { command: 'node', args: ['s1.js'] }
      },
      servers: {
        'server2': { command: 'node', args: ['s2.js'] }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load mixed format
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Both keys merged into mcpServers
  expect(config.mcpServers.server1).toBeDefined();
  expect(config.mcpServers.server2).toBeDefined();

  mockFs.restore();
});
```

**Tests to Rewrite** (~3-4 tests):
1. 'servers' key support (VS Code format)
2. ${env:VAR} syntax resolution
3. ${workspaceFolder} predefined variable
4. Mixed format compatibility (mcpServers + servers)

**Validation Commands**:
```bash
# Run VS Code compat tests
npm test tests/config.test.js -- -t "VS Code\\|vscode\\|servers key"

# Check environment resolution
grep -c "env:\\|workspaceFolder" tests/config.test.js
```

---

### Subtask 4.2.4: Rewrite Environment Resolution Tests (30 min)

**Objective**: Validate EnvResolver integration and recursive resolution

**Focus Areas**:
1. Simple environment variables (${ENV_VAR})
2. Command substitution (${cmd:echo test})
3. Recursive resolution (${A} references ${B})
4. Cycle detection (${A} → ${B} → ${A})
5. Predefined variables (${userHome}, ${/})

**Environment Resolution Pattern**:

**Simple Environment Variables**:
```javascript
it("should resolve simple environment variables", async () => {
  // ARRANGE: Config with env vars
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${NODE_PATH}/bin/node',
          env: {
            API_KEY: '${API_TOKEN}'
          }
        }
      }
    })
  });

  process.env.NODE_PATH = '/usr/local/node';
  process.env.API_TOKEN = 'secret-123';

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Variables resolved
  expect(config.mcpServers.test.command).toBe('/usr/local/node/bin/node');
  expect(config.mcpServers.test.env.API_KEY).toBe('secret-123');

  // Cleanup
  delete process.env.NODE_PATH;
  delete process.env.API_TOKEN;
  mockFs.restore();
});
```

**Command Substitution**:
```javascript
it("should execute command substitution ${cmd:...}", async () => {
  // ARRANGE: Config with command substitution
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          env: {
            PASSWORD: '${cmd:echo "secret"}'
          }
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Command executed and output used
  expect(config.mcpServers.test.env.PASSWORD).toBe('secret');

  mockFs.restore();
});
```

**Recursive Resolution**:
```javascript
it("should recursively resolve nested variable references", async () => {
  // ARRANGE: Config with recursive references
  process.env.BASE_PATH = '/usr/local';
  process.env.NODE_PATH = '${BASE_PATH}/node';

  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${NODE_PATH}/bin/node'
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Multi-level resolution
  // ${NODE_PATH} → ${BASE_PATH}/node → /usr/local/node
  expect(config.mcpServers.test.command).toBe('/usr/local/node/bin/node');

  // Cleanup
  delete process.env.BASE_PATH;
  delete process.env.NODE_PATH;
  mockFs.restore();
});
```

**Cycle Detection**:
```javascript
it("should detect and throw error on circular variable references", async () => {
  // ARRANGE: Config with circular reference
  process.env.VAR_A = '${VAR_B}';
  process.env.VAR_B = '${VAR_A}'; // Circular!

  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${VAR_A}'
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT & ASSERT: Should throw on circular reference
  await expect(
    configManager.loadConfig('./config.json')
  ).rejects.toThrow('Circular variable reference');

  // Cleanup
  delete process.env.VAR_A;
  delete process.env.VAR_B;
  mockFs.restore();
});
```

**Predefined Variables**:
```javascript
it("should resolve predefined variables (${userHome}, ${/})", async () => {
  // ARRANGE: Config with predefined variables
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${userHome}${/}scripts${/}server.sh'
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Predefined variables resolved
  const expectedPath = require('os').homedir() + require('path').sep + 'scripts' + require('path').sep + 'server.sh';
  expect(config.mcpServers.test.command).toBe(expectedPath);

  mockFs.restore();
});
```

**Tests to Rewrite** (~4-5 tests):
1. Simple environment variables (${VAR})
2. Command substitution (${cmd:...})
3. Recursive resolution (${A} → ${B})
4. Cycle detection (error thrown)
5. Predefined variables (${userHome}, ${/}, ${workspaceFolder})

**Validation Commands**:
```bash
# Run environment resolution tests
npm test tests/config.test.js -- -t "resolve\\|environment\\|EnvResolver"

# Check cycle detection
grep -c "circular\\|cycle" tests/config.test.js
```

---

### Subtask 4.2.5: Rewrite Validation Tests (20 min)

**Objective**: Validate config validation and error handling

**Focus Areas**:
1. Invalid JSON syntax
2. Missing required fields
3. Type errors (args should be array)
4. Malformed config structure

**Validation Pattern**:

**Invalid JSON**:
```javascript
it("should throw ConfigError on invalid JSON syntax", async () => {
  // ARRANGE: Malformed JSON file
  const mockFs = require('mock-fs');
  mockFs({
    './bad-config.json': '{ invalid json }'
  });

  const configManager = new ConfigManager();

  // ACT & ASSERT: Should throw ConfigError
  await expect(
    configManager.loadConfig('./bad-config.json')
  ).rejects.toThrow(ConfigError);

  await expect(
    configManager.loadConfig('./bad-config.json')
  ).rejects.toMatchObject({
    code: 'INVALID_JSON',
    message: expect.stringContaining('Invalid JSON')
  });

  mockFs.restore();
});
```

**Missing Required Fields**:
```javascript
it("should throw ConfigError when server config missing required command", async () => {
  // ARRANGE: Config with missing command
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          args: ['server.js']
          // Missing required 'command' field
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT & ASSERT: Validation fails
  await expect(
    configManager.loadConfig('./config.json')
  ).rejects.toThrow('command is required');

  mockFs.restore();
});
```

**Type Errors**:
```javascript
it("should throw ConfigError when args is not an array", async () => {
  // ARRANGE: Config with wrong type
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: 'node',
          args: 'server.js' // Should be ['server.js']
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT & ASSERT: Type validation fails
  await expect(
    configManager.loadConfig('./config.json')
  ).rejects.toThrow('args must be an array');

  mockFs.restore();
});
```

**Tests to Rewrite** (~3-4 tests):
1. Invalid JSON syntax
2. Missing required command field
3. Type error (args not array)
4. Malformed mcpServers structure

**Validation Commands**:
```bash
# Run validation tests
npm test tests/config.test.js -- -t "validation\\|invalid\\|error"

# Check ConfigError usage
grep -c "ConfigError" tests/config.test.js
```

---

### Subtask 4.2.6: Rewrite File Watching Tests (25 min)

**Objective**: Validate config file watching and hot-reload

**Focus Areas**:
1. File change detection
2. Hot-reload trigger
3. Debouncing (multiple rapid changes)
4. Watch cleanup on stop

**File Watching Pattern**:

**Change Detection**:
```javascript
it("should detect config file changes and trigger reload", async () => {
  // ARRANGE: Create initial config
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'server1': { command: 'node', args: ['s1.js'] }
      }
    })
  });

  const configManager = new ConfigManager();
  await configManager.loadConfig('./config.json');

  // Start watching
  configManager.watchConfig();

  // Setup change listener
  const changeHandler = vi.fn();
  configManager.on('configChanged', changeHandler);

  // ACT: Modify config file
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'server1': { command: 'node', args: ['s1.js'] },
        'server2': { command: 'node', args: ['s2.js'] } // Added
      }
    })
  });

  // Trigger file watcher manually (in real scenario, chokidar would do this)
  await configManager._triggerFileChange('./config.json');

  // Wait for async reload
  await new Promise(resolve => setTimeout(resolve, 100));

  // ASSERT: Change detected and handler called
  expect(changeHandler).toHaveBeenCalled();

  const newConfig = configManager.getConfig();
  expect(newConfig.mcpServers.server2).toBeDefined();

  // Cleanup
  configManager.stopWatching();
  mockFs.restore();
});
```

**Debouncing**:
```javascript
it("should debounce multiple rapid file changes", async () => {
  // ARRANGE: Config with file watching
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {}
    })
  });

  const configManager = new ConfigManager({ debounceMs: 500 });
  await configManager.loadConfig('./config.json');
  configManager.watchConfig();

  const changeHandler = vi.fn();
  configManager.on('configChanged', changeHandler);

  // ACT: Trigger multiple rapid changes
  await configManager._triggerFileChange('./config.json');
  await new Promise(resolve => setTimeout(resolve, 100));
  await configManager._triggerFileChange('./config.json');
  await new Promise(resolve => setTimeout(resolve, 100));
  await configManager._triggerFileChange('./config.json');

  // Wait for debounce period
  await new Promise(resolve => setTimeout(resolve, 600));

  // ASSERT: Handler called only once (debounced)
  expect(changeHandler).toHaveBeenCalledTimes(1);

  // Cleanup
  configManager.stopWatching();
  mockFs.restore();
});
```

**Watch Cleanup**:
```javascript
it("should cleanup file watchers on stopWatching()", async () => {
  // ARRANGE: Config with watching enabled
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({ mcpServers: {} })
  });

  const configManager = new ConfigManager();
  await configManager.loadConfig('./config.json');
  configManager.watchConfig();

  // Verify watching active
  expect(configManager.isWatching()).toBe(true);

  // ACT: Stop watching
  configManager.stopWatching();

  // ASSERT: Watchers cleaned up
  expect(configManager.isWatching()).toBe(false);

  // File changes should no longer trigger events
  const changeHandler = vi.fn();
  configManager.on('configChanged', changeHandler);

  await configManager._triggerFileChange('./config.json');
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(changeHandler).not.toHaveBeenCalled();

  // Cleanup
  mockFs.restore();
});
```

**Tests to Rewrite** (~2-3 tests):
1. File change detection and reload
2. Debouncing multiple rapid changes
3. Watch cleanup on stop

**Validation Commands**:
```bash
# Run file watching tests
npm test tests/config.test.js -- -t "watch\\|file change"

# Check event emission
grep -c "on('configChanged')" tests/config.test.js
```

---

### Subtask 4.2.7: Validate Config Test Suite (10 min)

**Objective**: Ensure all config tests pass and meet quality standards

**Actions**:

1. **Run full config suite** (3 min)
   ```bash
   npm test tests/config.test.js

   # Expected output:
   # Test Files  1 passed (1)
   # Tests  16-20 passed (16-20)
   # Duration  ~10-15 seconds
   ```

2. **Check quality anti-patterns** (3 min)
   ```bash
   # Logger assertions (should be 0)
   grep -c "expect(logger" tests/config.test.js

   # mock-fs usage (should be frequent)
   grep -c "mock-fs\\|mockFs" tests/config.test.js

   # mock-fs cleanup (should match usage)
   grep -c "mockFs.restore()" tests/config.test.js

   # Real file I/O (should be 0)
   grep -c "fs.readFileSync\\|fs.writeFileSync" tests/config.test.js
   ```

3. **Verify environment cleanup** (2 min)
   ```bash
   # afterEach should clean process.env
   grep -A5 "afterEach" tests/config.test.js | grep -c "delete process.env"
   ```

4. **Generate coverage report** (2 min)
   ```bash
   npm run test:coverage -- tests/config.test.js

   # Review src/utils/config.js coverage
   # Review src/utils/env-resolver.js coverage
   # Target: >80% for config loading and resolution paths
   ```

**Deliverables**:
- ✅ All config tests passing (16-20/16-20)
- ✅ Zero anti-patterns detected
- ✅ mock-fs used exclusively (no real file I/O)
- ✅ Environment cleanup verified
- ✅ Coverage report generated

**Go/No-Go Decision**:
- 🟢 GO: All tests pass, zero anti-patterns, coverage ≥80%
- 🟡 REVIEW: 1-2 tests failing OR coverage 75-79%, investigate
- 🔴 NO-GO: >2 tests failing OR real file I/O detected, fix before proceeding

---

## Integration Validation

**Duration**: 15 minutes
**Objective**: Verify Sprint 4 achieves all quality and completeness targets

### Validation Process

**Step 1: Full Test Suite Execution** (3 min)
```bash
# Run ALL tests (Sprint 1-4 coverage)
npm test

# Expected output:
# Test Files  7 passed (7)
#   tests/MCPHub.test.js
#   tests/MCPConnection.test.js
#   tests/MCPConnection.integration.test.js
#   tests/cli.test.js
#   tests/config.test.js
#   tests/env-resolver.test.js
#   tests/marketplace.test.js
# Tests  295-299 passed (295-299)
# Duration  ~90-120 seconds
```

**Step 2: Process Mock Verification** (2 min)
```bash
# Verify all CLI tests mock process.exit
grep -c "vi.spyOn(process, 'exit')" tests/cli.test.js
# Expected: 11 (matches test count)

# Verify no real exits
grep -c "^[^/]*process.exit(" tests/cli.test.js
# Expected: 0
```

**Step 3: File System Isolation Check** (2 min)
```bash
# Verify config tests use mock-fs
grep -c "mock-fs" tests/config.test.js
# Expected: ≥16 (at least one per test)

# Verify no real file operations
grep -c "fs.readFileSync\\|fs.writeFileSync" tests/config.test.js
# Expected: 0
```

**Step 4: Environment Cleanup Validation** (2 min)
```bash
# Check environment restoration
npm test tests/config.test.js

# Run multiple times to verify no pollution
for i in {1..3}; do npm test tests/config.test.js --reporter=verbose; done
# All runs should show same results
```

**Step 5: VS Code Compatibility Check** (3 min)
```bash
# Verify 'servers' key support
grep -c "'servers'\\|\"servers\"" tests/config.test.js
# Expected: ≥2

# Verify ${env:} syntax support
grep -c "env:" tests/config.test.js
# Expected: ≥3
```

**Step 6: Coverage Report Review** (3 min)
```bash
# Generate comprehensive coverage
npm run test:coverage

# Check key files:
# - src/utils/cli.js (>80%)
# - src/utils/config.js (>80%)
# - src/utils/env-resolver.js (>80%)
open coverage/index.html
```

### Go/No-Go Decision

**🟢 GO - Sprint 4 Complete**:
- ✅ 295-299/295-299 tests passing (100%)
- ✅ CLI tests: 11/11 passing (100%)
- ✅ Config tests: 16-20/16-20 passing (100%)
- ✅ Process.exit properly mocked (all CLI tests)
- ✅ File system isolated (mock-fs in all config tests)
- ✅ Environment cleanup verified (no pollution)
- ✅ VS Code compatibility validated
- ✅ Coverage >80% for CLI and config files

**🟡 REVIEW - Minor Issues**:
- 293-294/295-299 tests passing (98-99%)
- OR Coverage 75-79%
- OR 1 file system isolation issue
- **Action**: Investigate issues, fix if time allows, otherwise document

**🔴 NO-GO - Significant Issues**:
- <293/295-299 tests passing (<98%)
- OR Coverage <75%
- OR >1 test with real process.exit() or file I/O
- OR Environment pollution detected
- **Action**: STOP, address critical issues before Sprint 5

---

## Agile Ceremonies

### Daily Standup (15 minutes)

**Format**: Quick status update with blocker identification

**Day 1 Update** (If Sequential):
```
What I completed yesterday:
- Sprint 3 completed with 268/268 passing
- Reviewed Sprint 4 plan and prerequisites

What I'm working on today:
- Task 4.1: CLI test rewrite
- Focus: Argument parsing and process.exit mocking
- Target: 11/11 CLI tests passing

Blockers:
- None yet, starting fresh

Confidence:
- HIGH - CLI tests simpler than integration tests
```

**Day 1 Update** (If Parallel - Developer A):
```
What I'm working on today:
- Task 4.1: CLI tests (all 11 tests)
- Focus: Process.exit mocking and error messages

Blockers:
- None

Confidence:
- HIGH - Clear patterns from Sprint 2-3
```

**Day 1 Update** (If Parallel - Developer B):
```
What I'm working on today:
- Task 4.2: Config tests (loading, VS Code compat, env resolution)
- Focus: mock-fs and environment isolation

Blockers:
- None

Confidence:
- HIGH - Config system well-understood
```

**Day 2 Update** (Completing Sprint 4):
```
What I completed yesterday:
- CLI tests: 11/11 passing
- Config tests: 18/18 passing
- Integration validation started

What I'm working on today:
- Final integration validation
- Sprint 4 documentation
- Prepare for Sprint 5

Blockers:
- None

Confidence:
- HIGH - On track for completion
```

### Sprint Demo (30 minutes)

**5-Part Demonstration**:

**Part 1: CLI Behavior Demonstration** (6 min)
```
Demo Script:
1. Successful server start
   - Show valid arguments: --port 3000 --config ./config.json
   - Demonstrate no error exit (process.exit not called)

2. Error scenarios
   - Missing port: Show exit code 1
   - Invalid config: Show clear error message
   - Help text: Show --help display and exit 0

3. Process.exit mocking
   - Show test code: vi.spyOn(process, 'exit').mockImplementation()
   - Explain why mocking prevents actual exits
   - Demonstrate mockRestore() cleanup
```

**Part 2: Config Loading Demonstration** (6 min)
```
Demo Script:
1. Single file loading
   - Show simple config load
   - Demonstrate server configs extracted

2. Multiple file merging
   - Show base config
   - Show override config
   - Demonstrate merge result (later overrides earlier)

3. JSON5 support
   - Show config with comments and trailing commas
   - Demonstrate successful parsing
```

**Part 3: Environment Resolution Demo** (6 min)
```
Demo Script:
1. Simple variables
   - Show ${NODE_PATH} resolution
   - Show ${API_KEY} resolution

2. Recursive resolution
   - Show ${VAR_A} → ${VAR_B} → actual value
   - Demonstrate multi-level resolution

3. Cycle detection
   - Show circular reference config
   - Demonstrate error thrown (not infinite loop)

4. VS Code compatibility
   - Show ${env:VAR} syntax (VS Code style)
   - Show ${workspaceFolder} resolution
```

**Part 4: File Watching Demo** (5 min)
```
Demo Script:
1. Change detection
   - Modify config file
   - Show hot-reload triggered

2. Debouncing
   - Show multiple rapid changes
   - Demonstrate single reload (debounced)

3. Watch cleanup
   - Show stopWatching()
   - Verify no more events after stop
```

**Part 5: Quality Metrics Review** (5 min)
```
Metrics Display:
1. Test Results
   - Before Sprint 4: 268/268 (100%)
   - After Sprint 4: 295-299/295-299 (100%)
   - Gain: +27-31 tests

2. Coverage Report
   - CLI coverage: >80%
   - Config coverage: >80%
   - EnvResolver coverage: >80%

3. Quality Scans
   - Logger assertions: 0 ✅
   - Process.exit mocking: 11/11 ✅
   - mock-fs usage: 16-20/16-20 ✅
   - Environment cleanup: Verified ✅
```

**Part 6: Q&A** (2 min)
```
Common Questions:
Q: How complex was process.exit mocking?
A: MEDIUM - vi.spyOn works well, key is mockRestore() cleanup

Q: Any file watching challenges?
A: MEDIUM - debouncing required understanding, but chokidar handles it

Q: VS Code compatibility complete?
A: YES - 'servers' key and ${env:} syntax both tested
```

### Sprint Retrospective (30 minutes)

**3-Section Format**:

**Section 1: What Went Well** (10 min)
```
Facilitation Questions:
- Was CLI testing simpler than integration tests?
- Did mock-fs work well for config tests?
- Were Sprint 2-3 patterns helpful for Sprint 4?
- What helper utilities were most valuable?

Expected Insights:
- CLI tests straightforward with process.exit mocking
- mock-fs excellent for file I/O isolation
- Environment resolution more complex than expected
- File watching required careful event simulation
- Sprint 2-3 patterns transferred perfectly
```

**Section 2: What Could Improve** (10 min)
```
Facilitation Questions:
- Which tests took longer than estimated?
- Any unexpected complexity in config or CLI?
- What additional helper utilities would have helped?
- Were there any environment pollution issues?

Expected Insights:
- Environment resolution tests took extra time (recursive, cycles)
- File watching simulation required learning curve
- Would benefit from createCLIEnv() helper
- Process.argv restoration needed more attention
```

**Section 3: Action Items for Sprint 5** (10 min)
```
Sprint 5 (Quality & Docs) Actions:
1. Add createCLIEnv() helper for argv/env isolation
2. Document process.exit mocking pattern
3. Document mock-fs usage pattern
4. Add environment resolution examples to TESTING_STANDARDS.md
5. Create troubleshooting guide for file watching tests

General Improvements:
1. Update helper utility library with CLI/config patterns
2. Document VS Code compatibility requirements
3. Add file watching best practices to standards
```

### Working Agreement (Sprint 4 Additions)

**All Sprint 2-3 Rules Apply**, plus:

**CLI Testing**:
- [ ] All CLI tests MUST mock process.exit (never actually exit)
- [ ] All process mocks MUST be restored in afterEach
- [ ] All tests MUST restore process.argv after modifications
- [ ] Error messages MUST be user-friendly (not stack traces)

**Config Testing**:
- [ ] All config tests MUST use mock-fs (never touch real files)
- [ ] All mock-fs instances MUST be restored after tests
- [ ] All tests MUST clean up process.env modifications
- [ ] Environment resolution MUST detect cycles (prevent infinite loops)

**Integration Standards**:
- [ ] Run tests with different environment variables to verify isolation
- [ ] Verify no global state pollution between test runs
- [ ] Check file system state unchanged after test suite
- [ ] Validate VS Code compatibility with both config formats

---

## Risk Management

### Risk 1: Process.exit() Mocking Complexity
**Probability**: MEDIUM
**Impact**: MEDIUM
**Category**: Technical Complexity

**Description**: process.exit() is inherently destructive and tricky to mock properly. Tests may accidentally exit the test runner or fail to verify exit codes correctly.

**Indicators**:
- Test runner exits unexpectedly during CLI tests
- Exit code assertions failing or timing out
- Mock cleanup not working properly

**Mitigation**:
1. Study Vitest process mocking patterns before starting
2. Always use vi.spyOn(process, 'exit').mockImplementation(() => {})
3. Restore mocks in afterEach hooks automatically
4. Validate mock was called before test ends
5. Test mock restoration explicitly (verify exits after restore)

**Contingency**:
- If mocking not working:
  - Check Vitest version compatibility
  - Use alternative mocking approach (process.exit = vi.fn())
  - Add explicit process.exit guards in test setup
- If tests still exiting:
  - Isolate CLI tests in separate suite
  - Run CLI tests last in test order
  - Use test.only to debug individual tests

**Acceptance**: 1-2 mocking adjustments normal, >3 indicates pattern problem

---

### Risk 2: File Watching Simulation Difficulty
**Probability**: MEDIUM
**Impact**: MEDIUM
**Category**: Test Complexity

**Description**: Simulating file system changes for hot-reload testing requires proper event sequencing and timing with chokidar and mock-fs integration.

**Indicators**:
- File change events not firing in tests
- Debouncing tests failing or flaky
- Watch cleanup not working properly
- Timeouts in file watching tests

**Mitigation**:
1. Use mock-fs with chokidar compatibility mode
2. Trigger file change events manually via _triggerFileChange()
3. Use waitFor for async file watching callbacks
4. Test debouncing with controlled timing
5. Verify watch cleanup explicitly (isWatching() === false)

**Contingency**:
- If file watching events not firing:
  - Manually trigger events instead of relying on mock-fs
  - Use event emitter pattern for test control
  - Skip real file watcher integration, test logic only
- If timing issues persistent:
  - Increase test timeouts for file watching
  - Use longer debounce periods in tests
  - Simplify file watching test scenarios

**Acceptance**: File watching complexity higher than other tests, extra time acceptable

---

### Risk 3: Environment Variable Pollution
**Probability**: LOW
**Impact**: HIGH
**Category**: Test Isolation

**Description**: Config tests that modify process.env can interfere with other tests if not cleaned up properly, causing flaky failures that are hard to debug.

**Indicators**:
- Tests pass individually but fail when run together
- Different results with different test execution orders
- Environment-related failures in unrelated tests
- Inconsistent test results across runs

**Mitigation**:
1. Snapshot process.env in beforeEach, restore in afterEach
2. Use Object.assign to restore entire environment
3. Delete added variables explicitly (delete process.env.VAR)
4. Create createTestEnv() helper for environment isolation
5. Verify no environment leaks with post-suite check

**Contingency**:
- If pollution detected:
  - Identify which tests modify environment
  - Add explicit cleanup for each modification
  - Use test.concurrent.skip to disable parallelization
  - Run config tests in isolation (separate suite)
- If persistent pollution:
  - Implement global beforeEach/afterEach for env cleanup
  - Use environment snapshot/restore wrapper
  - Consider process-based test isolation

**Acceptance**: Zero tolerance for environment pollution - must fix

---

### Risk 4: VS Code Compatibility Edge Cases
**Probability**: MEDIUM
**Impact**: LOW
**Category**: Compatibility

**Description**: VS Code has specific config requirements ('servers' key, ${env:} syntax) that may not be obvious without reviewing VS Code MCP documentation.

**Indicators**:
- 'servers' key not recognized in config
- ${env:} syntax not resolving correctly
- ${workspaceFolder} not resolving
- VS Code users reporting config issues

**Mitigation**:
1. Review VS Code MCP documentation before testing
2. Test both 'servers' and 'mcpServers' keys explicitly
3. Validate ${env:} syntax (not just ${VAR})
4. Test ${workspaceFolder} predefined variable
5. Ensure backward compatibility (both formats work)

**Contingency**:
- If VS Code features not working:
  - Review ConfigManager implementation
  - Add VS Code-specific config normalization
  - Document VS Code compatibility requirements
- If compatibility issues found late:
  - Add VS Code tests retroactively
  - Update config documentation
  - Create migration guide for users

**Acceptance**: VS Code compatibility is nice-to-have, not critical

---

## Success Metrics

### Primary Success Criteria

**1. CLI Test Pass Rate**
- **Target**: 11/11 (100%)
- **Measure**: `npm test tests/cli.test.js`
- **Critical**: ALL CLI tests must pass

**2. Config Test Pass Rate**
- **Target**: 16-20/16-20 (100%)
- **Measure**: `npm test tests/config.test.js`
- **Critical**: ALL config tests must pass

**3. Total Test Pass Rate**
- **Target**: 295-299/295-299 (100%)
- **Baseline**: 268/268 (100%) after Sprint 3
- **Gain**: +27-31 tests
- **Measure**: `npm test` (full suite)
- **Critical**: 100% pass rate before Sprint 5

**4. Process Exit Mocking**
- **Target**: 100% of CLI tests use proper mocking
- **Measure**: `grep -c "vi.spyOn(process, 'exit')" tests/cli.test.js`
- **Critical**: No real process.exit() calls in tests

**5. File System Isolation**
- **Target**: 100% of config tests use mock-fs
- **Measure**: `grep -c "mock-fs" tests/config.test.js`
- **Critical**: No real file I/O in tests

### Secondary Success Criteria

**6. Code Coverage**
- **Target**: >80% for CLI and config files
- **Files**: cli.js, config.js, env-resolver.js
- **Measure**: `npm run test:coverage`

**7. Environment Cleanup**
- **Target**: No process.env pollution between tests
- **Measure**: Run tests 3x, verify consistent results
- **Critical**: Environment isolation maintained

**8. VS Code Compatibility**
- **Target**: 'servers' key and ${env:} syntax fully tested
- **Measure**: Specific tests for VS Code features
- **Goal**: Full backward compatibility

**9. User-Facing Behavior**
- **Target**: Zero logger assertions, only exit codes and messages
- **Measure**: `grep -c "expect(logger" tests/`
- **Goal**: User-centric testing approach

**10. Performance**
- **Target**: <15 seconds for CLI + config test suite
- **Measure**: Test duration in output
- **Acceptable**: Slightly slower due to file I/O mocking

### Leading Indicators

**🟢 Green Flags** (On Track):
- CLI tests progressing ~3-4 tests/hour
- Config tests progressing ~4-5 tests/hour
- Process.exit mocking working correctly
- mock-fs integration smooth
- Zero environment pollution issues

**🟡 Yellow Flags** (Monitor):
- CLI tests slower than 2 tests/hour
- Config tests slower than 3 tests/hour
- 1-2 process mock cleanup issues
- 1-2 file watching simulation issues
- Coverage trending 75-79%

**🔴 Red Flags** (Intervention Required):
- <2 tests/hour velocity (severe slowdown)
- >3 process.exit mocking failures
- Environment pollution detected
- Real file I/O found in tests
- Coverage <75%

---

## Acceptance Criteria

**Complete Sprint 4 Go/No-Go Checklist** (ALL must be met):

### Test Results ✅
- [ ] cli.test.js: 11/11 passing (100%)
- [ ] config.test.js: 16-20/16-20 passing (100%)
- [ ] Total test suite: 295-299/295-299 passing (100%)
- [ ] Test execution: <15 seconds for Sprint 4 tests

### CLI Test Quality ✅
- [ ] All tests mock process.exit properly
- [ ] All mocks restored in afterEach
- [ ] All tests restore process.argv
- [ ] Error messages user-friendly (no stack traces)
- [ ] Help text validated
- [ ] Exit codes verified (0 for success, 1 for error)

### Config Test Quality ✅
- [ ] All tests use mock-fs exclusively
- [ ] All mock-fs instances restored
- [ ] All process.env modifications cleaned up
- [ ] Environment resolution comprehensive
- [ ] Cycle detection tested
- [ ] File watching debouncing tested

### VS Code Compatibility ✅
- [ ] 'servers' key support tested
- [ ] ${env:VAR} syntax resolution tested
- [ ] ${workspaceFolder} predefined variable tested
- [ ] Backward compatibility verified
- [ ] Mixed format (servers + mcpServers) tested

### Code Quality ✅
- [ ] Zero logger assertions (anti-pattern scan)
- [ ] Zero real file I/O operations
- [ ] Zero real process.exit calls
- [ ] All tests follow AAA pattern
- [ ] All tests use Sprint 1-2 helper utilities where applicable

### Coverage ✅
- [ ] cli.js: >80% coverage
- [ ] config.js: >80% coverage
- [ ] env-resolver.js: >80% coverage
- [ ] No critical paths uncovered

### Integration Validation ✅
- [ ] Tests pass consistently (3 runs)
- [ ] No environment pollution detected
- [ ] No file system side effects
- [ ] Full suite still passing (all Sprints 1-4)

### Documentation ✅
- [ ] Sprint 4 acceptance updated
- [ ] Process.exit mocking pattern documented
- [ ] mock-fs usage pattern documented
- [ ] Environment resolution examples added
- [ ] TEST_P4_WF.md archived
- [ ] TESTING_STANDARDS.md updated with CLI/config patterns

### Review ✅
- [ ] Peer review complete
- [ ] Quality scans pass (zero anti-patterns)
- [ ] Sprint demo complete
- [ ] Retrospective held with action items

---

## Go/No-Go Decision

**🟢 GO - Sprint 4 Complete, Proceed to Sprint 5**:
- All checklist items complete ✅
- 295-299/295-299 tests passing (100%)
- Zero anti-patterns detected
- Process.exit properly mocked (all CLI tests)
- File system isolated (all config tests)
- Environment cleanup verified
- VS Code compatibility validated
- Coverage >80%
- Team confident in patterns
- Sprint 4 learnings documented

**🟡 REVIEW - Minor Issues, Conditional Proceed**:
- 293-294/295-299 tests passing (98-99%)
- OR Coverage 75-79%
- OR 1 minor file I/O or env pollution issue
- **Decision**: Review issues, document workarounds, proceed if low risk

**🔴 NO-GO - Significant Issues, Do Not Proceed**:
- <293/295-299 tests passing (<98%)
- OR Coverage <75%
- OR >1 real process.exit() or file I/O detected
- OR Environment pollution persistent
- OR VS Code compatibility broken
- **Action**: STOP Sprint 5, address critical issues, re-validate Sprint 4

---

## Appendix

### A. Process.exit() Mocking Pattern

**Complete Mocking Setup**:

```javascript
describe("CLI Process Exit Tests", () => {
  let mockExit;

  beforeEach(() => {
    // Mock process.exit to prevent actual exits
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    // CRITICAL: Always restore mock
    mockExit.mockRestore();
  });

  it("should exit with code 1 on validation error", async () => {
    // ARRANGE: Invalid arguments
    setArgv(["--config", "./config.json"]); // Missing required --port

    // ACT: Import CLI (triggers validation)
    await import("../src/utils/cli.js");

    // ASSERT: Verify exit code
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockExit).toHaveBeenCalledTimes(1);
  });

  it("should not exit on successful start", async () => {
    // ARRANGE: Valid arguments
    setArgv(["--port", "3000", "--config", "./config.json"]);

    // ACT: Import CLI
    await import("../src/utils/cli.js");

    // ASSERT: No error exit
    expect(mockExit).not.toHaveBeenCalledWith(1);
    // May call with 0 or not at all (both OK)
  });
});
```

**Why This Pattern Works**:
- vi.spyOn intercepts process.exit without executing it
- mockImplementation provides empty function (does nothing)
- mockRestore in afterEach ensures test isolation
- Can verify exit was called AND check exit code

---

### B. mock-fs File System Isolation Pattern

**File I/O Mocking Setup**:

```javascript
describe("Config File Loading Tests", () => {
  const mockFs = require('mock-fs');

  afterEach(() => {
    // CRITICAL: Always restore real file system
    mockFs.restore();
  });

  it("should load config from file", async () => {
    // ARRANGE: Create virtual file system
    mockFs({
      './config.json': JSON.stringify({
        mcpServers: {
          'test': { command: 'node', args: ['server.js'] }
        }
      }),
      './other-file.txt': 'content'
    });

    const configManager = new ConfigManager();

    // ACT: Load config (reads from mock-fs)
    await configManager.loadConfig('./config.json');
    const config = configManager.getConfig();

    // ASSERT: Config loaded from virtual file
    expect(config.mcpServers.test).toMatchObject({
      command: 'node',
      args: ['server.js']
    });

    // Cleanup happens in afterEach
  });

  it("should throw error when file not found", async () => {
    // ARRANGE: Empty virtual file system
    mockFs({});

    const configManager = new ConfigManager();

    // ACT & ASSERT: File not found
    await expect(
      configManager.loadConfig('./nonexistent.json')
    ).rejects.toThrow('ENOENT');

    // Cleanup happens in afterEach
  });
});
```

**Why mock-fs**:
- Creates virtual in-memory file system
- No real file I/O (tests run fast, no cleanup)
- Complete isolation between tests
- Can simulate file not found, permissions, etc.

---

### C. Environment Cleanup Pattern

**Environment Isolation Setup**:

```javascript
describe("Environment Resolution Tests", () => {
  let originalEnv;

  beforeEach(() => {
    // Snapshot environment before test
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore environment completely
    process.env = originalEnv;
  });

  it("should resolve environment variables", async () => {
    // ARRANGE: Set test environment variable
    process.env.TEST_VAR = 'test-value';

    // ... test logic ...

    // No explicit cleanup needed (afterEach handles it)
  });
});
```

**Alternative Pattern (Explicit Cleanup)**:

```javascript
it("should resolve ${VAR} syntax", async () => {
  // ARRANGE: Add test variable
  process.env.TEST_VAR = 'value';

  try {
    // ACT & ASSERT
    // ... test logic ...
  } finally {
    // CLEANUP: Always runs, even if test fails
    delete process.env.TEST_VAR;
  }
});
```

---

### D. Recursive Environment Resolution Example

**Multi-Level Variable Resolution**:

```javascript
it("should recursively resolve nested variable references", async () => {
  // ARRANGE: Nested variables
  process.env.BASE = '/usr/local';
  process.env.NODE = '${BASE}/node';      // References BASE
  process.env.BIN = '${NODE}/bin';        // References NODE
  process.env.CMD = '${BIN}/server.sh';   // References BIN

  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({
      mcpServers: {
        'test': {
          command: '${CMD}'  // Should resolve to /usr/local/node/bin/server.sh
        }
      }
    })
  });

  const configManager = new ConfigManager();

  // ACT: Load and resolve
  await configManager.loadConfig('./config.json');
  const config = configManager.getConfig();

  // ASSERT: Full resolution chain
  // ${CMD} → ${BIN}/server.sh → ${NODE}/bin/server.sh → ${BASE}/node/bin/server.sh → /usr/local/node/bin/server.sh
  expect(config.mcpServers.test.command).toBe('/usr/local/node/bin/server.sh');

  // Cleanup
  delete process.env.BASE;
  delete process.env.NODE;
  delete process.env.BIN;
  delete process.env.CMD;
  mockFs.restore();
});
```

---

### E. File Watching Debouncing Pattern

**Debounce Testing**:

```javascript
it("should debounce multiple rapid file changes", async () => {
  // ARRANGE: Config with file watching
  const mockFs = require('mock-fs');
  mockFs({
    './config.json': JSON.stringify({ mcpServers: {} })
  });

  const configManager = new ConfigManager({ debounceMs: 500 });
  await configManager.loadConfig('./config.json');
  configManager.watchConfig();

  const changeHandler = vi.fn();
  configManager.on('configChanged', changeHandler);

  // ACT: Trigger 5 rapid changes
  for (let i = 0; i < 5; i++) {
    await configManager._triggerFileChange('./config.json');
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms apart
  }

  // Wait for debounce period
  await new Promise(resolve => setTimeout(resolve, 600));

  // ASSERT: Handler called only once (debounced)
  expect(changeHandler).toHaveBeenCalledTimes(1);

  // Cleanup
  configManager.stopWatching();
  mockFs.restore();
});
```

**Why Debouncing Matters**:
- Text editors trigger multiple file change events during save
- Without debouncing, config reloads 10+ times per save
- 500ms debounce provides smooth UX without lag

---

### F. Helper Utility Quick Reference

**Sprint 1-2 Helpers for CLI/Config Tests**:

```javascript
// Mock Factories (tests/helpers/mocks.js)
createMockLogger(overrides)        // Logger with info/warn/debug/error
createMockConfigManager(overrides) // ConfigManager with loadConfig/watchConfig
createMockConnection(overrides)    // MCPConnection with all methods

// Test Fixtures (tests/helpers/fixtures.js)
createTestConfig(overrides)        // Full configuration object
createServerConfig(name, overrides) // Server-specific config

// Assertions (tests/helpers/assertions.js)
expectServerConnected(hub, name)   // Verify connection state
expectToolCallSuccess(result)      // Validate tool execution
```

**New Sprint 4 Helper Candidates**:
```javascript
// Consider adding for Sprint 5:
createCLIEnv(overrides)            // CLI environment with argv/env isolation
createMockFileSystem(structure)    // mock-fs wrapper with cleanup
createTestEnv(variables)           // Environment snapshot/restore helper
```

---

### G. Time Tracking Template

| Subtask | Estimated | Actual | Variance | Notes |
|---------|-----------|--------|----------|-------|
| 4.1.1: Analyze CLI structure | 20 min | ___ min | ___ | |
| 4.1.2: Argument parsing | 30 min | ___ min | ___ | |
| 4.1.3: Validation errors | 25 min | ___ min | ___ | |
| 4.1.4: Process exit behavior | 20 min | ___ min | ___ | |
| 4.1.5: Server start integration | 15 min | ___ min | ___ | |
| 4.1.6: Validate CLI suite | 10 min | ___ min | ___ | |
| **Phase A Total** | **120 min** | **___ min** | **___** | |
| 4.2.1: Analyze config structure | 20 min | ___ min | ___ | |
| 4.2.2: Config loading | 30 min | ___ min | ___ | |
| 4.2.3: VS Code compatibility | 25 min | ___ min | ___ | |
| 4.2.4: Environment resolution | 30 min | ___ min | ___ | |
| 4.2.5: Validation tests | 20 min | ___ min | ___ | |
| 4.2.6: File watching | 25 min | ___ min | ___ | |
| 4.2.7: Validate config suite | 10 min | ___ min | ___ | |
| **Phase B Total** | **160 min** | **___ min** | **___** | |
| **Sprint 4 Total** | **280 min (4.7h)** | **___ min** | **___** | |

**Parallelization Time** (if 2 developers):
- Phase A and B run concurrently: ~160 min (2.7h) wall-clock
- Integration validation: +15 min
- Total parallel: ~175 min (2.9h)

**Variance Calculation**: (Actual - Estimated) / Estimated * 100%
**Use for**: Validating Sprint 5 estimates

---

## References

- **TEST_PLAN.md**: Source sprint plan document (Sprint 4 section lines 396-451)
- **TEST_P3_WF.md**: Sprint 3 workflow with integration patterns
- **TEST_P2_WF.md**: Sprint 2 workflow with unit test patterns
- **TEST_P1_WF.md**: Sprint 1 workflow with helper infrastructure
- **Vitest Documentation**: [https://vitest.dev/](https://vitest.dev/)
- **mock-fs Documentation**: [https://github.com/tschaub/mock-fs](https://github.com/tschaub/mock-fs)

---

## Session Metadata

- **Created**: 2025-10-27
- **Sprint**: 4 of 5 (CLI & Configuration Tests)
- **Duration**: 3-4 hours sequential OR 2-2.5 hours parallel
- **Prerequisites**: Sprint 3 complete (268/268 passing)
- **Status**: ✅ Ready for Execution
- **Next Sprint**: Sprint 5 (Quality & Documentation)

**This workflow is ready for team review and Sprint 4 execution** 🎯
