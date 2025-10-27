# Sprint 2 Detailed Workflow: Core Functionality Tests

**Sprint**: Sprint 2 of 5
**Duration**: 5-6 hours (sequential) | 3-4 hours (parallel with 2 developers)
**Goal**: Rewrite MCPHub and MCPConnection unit tests to 100% passing
**Status**: 🟢 Ready for execution (pending Sprint 1 completion)
**Date Created**: 2025-10-27

---

## Executive Summary

Sprint 2 transforms 42 failing tests in MCPHub.test.js and MCPConnection.test.js from brittle implementation-focused tests to robust behavior-driven tests. This sprint applies the helper utilities, testing standards, and infrastructure created in Sprint 1.

### Critical Success Factors

1. **Sprint 1 Dependency**: Sprint 2 CANNOT start until Sprint 1 achieves go/no-go approval
2. **Helper Utility Mastery**: All tests must use Sprint 1 helpers (mocks, fixtures, assertions)
3. **Behavior Focus**: Zero logger or constructor assertions allowed
4. **Quality Gates**: Both files must reach 100% pass rate before Sprint 3
5. **Parallelization Opportunity**: 50% time savings if 2 developers available

### Expected Outcomes

- **Test Pass Rate**: 193/246 (78%) → 235/246 (96%) - gain of 42 tests
- **MCPHub.test.js**: 8/20 passing → 20/20 passing (100%)
- **MCPConnection.test.js**: 0/22 passing → 22/22 passing (100%)
- **Code Coverage**: Maintained >80% across all metrics
- **Test Brittleness**: Eliminated through behavior-driven approach

---

## Prerequisites Validation

### Sprint 1 Completion Checklist

Before starting Sprint 2, verify Sprint 1 delivered:

- [ ] **Helper Utilities Created**:
  - `tests/helpers/mocks.js` exists with createMockLogger, createMockConfigManager, createMockConnection
  - `tests/helpers/fixtures.js` exists with createTestConfig, createServerConfig, createToolResponse
  - `tests/helpers/assertions.js` exists with expectServerConnected, expectToolCallSuccess, etc.

- [ ] **Documentation Complete**:
  - `tests/TESTING_STANDARDS.md` exists with 5 sections + 4 transformation examples
  - AAA pattern, test naming conventions, mock usage documented

- [ ] **Configuration Setup**:
  - `vitest.config.js` updated with setupFiles and path aliases (@helpers)
  - `tests/setup.js` created with global cleanup

- [ ] **Pilot Tests Validated**:
  - 2 pilot tests passing using new infrastructure
  - Team feedback collected and incorporated
  - Go/no-go decision: ✅ GO for Sprint 2

- [ ] **Quality Gates Passed**:
  - Helper utilities work as designed
  - Documentation examples accurate
  - Vitest configuration functional
  - Team approves approach

**❌ STOP**: If any checklist item fails, return to Sprint 1 before proceeding.

**✅ GO**: All items complete → Proceed with Sprint 2 execution.

---

## Task Overview

### Task Breakdown

| Task | Focus | Tests | Time | Dependencies |
|------|-------|-------|------|--------------|
| 2.1 | MCPHub.test.js | 20 | 2.5-3h | Sprint 1 complete |
| 2.2 | MCPConnection.test.js | 22 | 2.5-3h | Sprint 1 complete |
| Integration | Validation & Quality | - | 0.5h | Tasks 2.1 & 2.2 |
| **Total** | **Core Functionality** | **42** | **5.5-6.5h** | - |

### Dependency Matrix

```
Sprint 1 Complete (ALL helpers + docs + config)
    ├─→ Task 2.1: MCPHub.test.js (2.5-3h)
    └─→ Task 2.2: MCPConnection.test.js (2.5-3h)
            └─→ Integration Validation (0.5h)
                    └─→ Sprint 2 Complete
```

**Critical Path**: Sprint 1 → (Task 2.1 | Task 2.2) → Integration → Sprint 2 Complete

**Parallelization Opportunity**: Tasks 2.1 and 2.2 are independent and can run in parallel if 2 developers available.

---

## Execution Phases

### Phase A: Core Test Rewrites (5-6h sequential | 2.5-3h parallel)

**Option 1: Sequential Execution** (Single Developer)
1. Complete Task 2.1: MCPHub.test.js (2.5-3h)
2. Complete Task 2.2: MCPConnection.test.js (2.5-3h)
3. Total: 5-6h

**Option 2: Parallel Execution** (2 Developers)
1. Developer A: Task 2.1 MCPHub.test.js (2.5-3h)
2. Developer B: Task 2.2 MCPConnection.test.js (2.5-3h)
3. Total: 2.5-3h (50% time reduction)

**Coordination for Parallel**:
- Daily sync to share learnings
- Shared Slack channel for helper gaps
- Coordinate on helper utility additions

### Phase B: Integration & Validation (0.5h sequential)

1. Merge both test file rewrites
2. Run full test suite: `npm test`
3. Verify coverage: `npm run test:coverage`
4. Address integration issues if any
5. Final quality validation

**Required After**: Both Task 2.1 and Task 2.2 complete

---

## Task 2.1: Rewrite MCPHub.test.js (2.5-3h)

### Overview

Rewrite 20 MCPHub tests from brittle implementation-focused to robust behavior-driven tests.

**Current State**: 8/20 passing (60% failure rate)
**Target State**: 20/20 passing (100% pass rate)
**Time Budget**: 2.5-3h (~7.5 min/test + analysis overhead)

### Focus Areas

1. **Initialization Behavior** (5 tests)
   - Loading config from file
   - Watching config for changes
   - Starting enabled servers
   - Skipping disabled servers
   - Hot-reload on config changes

2. **Server Lifecycle** (5 tests)
   - Connect individual server
   - Disconnect individual server
   - Disconnect all servers
   - Reconnect after disconnect
   - Handle connection failures

3. **Server Operations** (4 tests)
   - Call tool on connected server
   - Read resource from server
   - Handle tool errors
   - Handle resource errors

4. **Status Reporting** (3 tests)
   - Get single server status
   - Get all server statuses
   - Status updates on state changes

5. **Event Emissions** (3 tests)
   - toolsChanged event
   - resourcesChanged event
   - promptsChanged event

### Subtasks

#### Subtask 2.1.1: Analyze Existing Test Structure (30 min)

**Goal**: Understand current test patterns and identify transformation opportunities

**Actions**:
1. Read `tests/MCPHub.test.js` completely
2. Identify brittle patterns:
   - Logger assertions: `expect(logger.debug).toHaveBeenCalledWith(...)`
   - Constructor assertions: `expect(MCPConnection).toHaveBeenCalledWith(...)`
   - Mock implementation details: `mockConfig.mcpServers.server1`
3. Map tests to focus areas (initialization, lifecycle, operations, status, events)
4. Note helper utilities needed for each test category
5. Document transformation patterns in comments

**Deliverable**: Analysis document with test categorization and transformation strategy

**Validation**: Clear understanding of which helpers to use for each test category

#### Subtask 2.1.2: Rewrite Initialization Tests (45 min)

**Goal**: Transform 5 initialization tests to behavior-driven approach

**Tests to Rewrite**:
1. "should load config from file and start enabled servers"
2. "should watch config for changes and hot-reload"
3. "should skip disabled servers during initialization"
4. "should handle config loading errors gracefully"
5. "should emit events when servers initialize"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks internal mechanics)
it("should start enabled servers from config", async () => {
  await mcpHub.initialize();

  // BAD: Tests constructor call details
  expect(MCPConnection).toHaveBeenCalledWith(
    "server1",
    mockConfig.mcpServers.server1
  );

  // BAD: Tests logger implementation
  expect(logger.info).toHaveBeenCalledWith(
    "Starting MCP server 'server1'"
  );
});

// AFTER (Behavior-focused - checks outcomes)
it("should successfully connect all enabled servers", async () => {
  // ARRANGE: Setup test data using Sprint 1 fixtures
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] },
      server2: { command: 'node', args: ['server2.js'] }
    }
  });

  const hub = new MCPHub(config);

  // ACT: Execute initialization
  await hub.initialize();

  // ASSERT: Verify behavioral outcomes using Sprint 1 assertions
  expectServerConnected(hub, 'server1');
  expectServerConnected(hub, 'server2');
  expect(hub.connections.size).toBe(2);

  const statuses = hub.getAllServerStatuses();
  expect(statuses).toHaveLength(2);
  expect(statuses[0].status).toBe('connected');
  expect(statuses[1].status).toBe('connected');
});
```

**Helper Utilities Used**:
- `createTestConfig()` - Generate test configuration
- `expectServerConnected()` - Verify server connection state
- No logger assertions
- No constructor assertions

**Validation After Subtask**:
```bash
npm test tests/MCPHub.test.js -- --grep "initialization"
# Expected: 5/5 initialization tests passing
```

#### Subtask 2.1.3: Rewrite Server Lifecycle Tests (45 min)

**Goal**: Transform 5 server lifecycle tests to behavior-driven approach

**Tests to Rewrite**:
1. "should connect individual server successfully"
2. "should disconnect individual server cleanly"
3. "should disconnect all servers on shutdown"
4. "should reconnect server after disconnect"
5. "should handle connection failures gracefully"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks mock calls)
it("should disconnect server", async () => {
  await mcpHub.connectServer('server1', config);
  await mcpHub.disconnectServer('server1');

  // BAD: Tests mock implementation
  expect(mockConnection.disconnect).toHaveBeenCalled();

  // BAD: Tests logger details
  expect(logger.info).toHaveBeenCalledWith(
    "Disconnected from MCP server 'server1'"
  );
});

// AFTER (Behavior-focused - checks state changes)
it("should disconnect server and remove from connections", async () => {
  // ARRANGE: Create hub with connected server
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] }
    }
  });

  const hub = new MCPHub(config);
  await hub.initialize();
  expectServerConnected(hub, 'server1'); // Verify initial state

  // ACT: Disconnect the server
  await hub.disconnectServer('server1');

  // ASSERT: Verify disconnection outcomes
  expectServerDisconnected(hub, 'server1');
  expect(hub.connections.size).toBe(0);

  const status = hub.getServerStatus('server1');
  expect(status).toBeNull(); // Server no longer tracked
});
```

**Helper Utilities Used**:
- `createTestConfig()` - Test configuration
- `expectServerConnected()` - Verify connection
- `expectServerDisconnected()` - Verify disconnection
- Focus on `hub.connections` Map and state changes

**Validation After Subtask**:
```bash
npm test tests/MCPHub.test.js -- --grep "lifecycle"
# Expected: 5/5 lifecycle tests passing
```

#### Subtask 2.1.4: Rewrite Server Operations Tests (30 min)

**Goal**: Transform 4 server operations tests to behavior-driven approach

**Tests to Rewrite**:
1. "should call tool on connected server successfully"
2. "should read resource from connected server"
3. "should handle tool execution errors"
4. "should handle resource access errors"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks mock method calls)
it("should call tool on server", async () => {
  await mcpHub.initialize();
  const args = { param: "value" };

  await mcpHub.callTool('server1', 'test-tool', args);

  // BAD: Tests mock implementation details
  expect(mockConnection.callTool).toHaveBeenCalledWith(
    'test-tool',
    args
  );
});

// AFTER (Behavior-focused - checks operation results)
it("should successfully call tool and return result", async () => {
  // ARRANGE: Setup hub with mock connection
  const toolResponse = createToolResponse({
    content: [{ type: 'text', text: 'Tool executed successfully' }],
    isError: false
  });

  const mockConnection = createMockConnection({
    callTool: vi.fn().mockResolvedValue(toolResponse)
  });

  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] }
    }
  });

  const hub = new MCPHub(config);
  hub.connections.set('server1', mockConnection);

  // ACT: Execute tool call
  const result = await hub.callTool('server1', 'test-tool', { param: 'value' });

  // ASSERT: Verify result structure and success
  expectToolCallSuccess(result);
  expect(result.content).toHaveLength(1);
  expect(result.content[0].text).toBe('Tool executed successfully');
  expect(result.isError).toBe(false);
});
```

**Helper Utilities Used**:
- `createTestConfig()` - Configuration setup
- `createMockConnection()` - Mock with tool behavior
- `createToolResponse()` - Realistic tool result
- `expectToolCallSuccess()` - Validate success state

**Validation After Subtask**:
```bash
npm test tests/MCPHub.test.js -- --grep "operations"
# Expected: 4/4 operations tests passing
```

#### Subtask 2.1.5: Rewrite Status Reporting Tests (20 min)

**Goal**: Transform 3 status reporting tests to behavior-driven approach

**Tests to Rewrite**:
1. "should get single server status"
2. "should get all server statuses"
3. "should update status on state changes"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - minimal behavior verification)
it("should get server status", async () => {
  await mcpHub.initialize();
  const status = mcpHub.getServerStatus('server1');

  // Incomplete assertions
  expect(status).toBeDefined();
});

// AFTER (Behavior-focused - comprehensive status validation)
it("should return comprehensive server status", async () => {
  // ARRANGE: Create hub with connected server
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] }
    }
  });

  const hub = new MCPHub(config);
  await hub.initialize();

  // ACT: Get server status
  const status = hub.getServerStatus('server1');

  // ASSERT: Verify complete status structure
  expect(status).toBeDefined();
  expect(status.name).toBe('server1');
  expect(status.status).toBe('connected');
  expect(status).toHaveProperty('tools');
  expect(status).toHaveProperty('resources');
  expect(status).toHaveProperty('prompts');
  expect(Array.isArray(status.tools)).toBe(true);
});
```

**Helper Utilities Used**:
- `createTestConfig()` - Configuration
- Focus on complete status object structure
- No partial assertions

**Validation After Subtask**:
```bash
npm test tests/MCPHub.test.js -- --grep "status"
# Expected: 3/3 status tests passing
```

#### Subtask 2.1.6: Rewrite Event Emission Tests (20 min)

**Goal**: Transform 3 event emission tests to behavior-driven approach

**Tests to Rewrite**:
1. "should emit toolsChanged event when tools update"
2. "should emit resourcesChanged event when resources update"
3. "should emit promptsChanged event when prompts update"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks event call details)
it("should emit toolsChanged event", async () => {
  await mcpHub.initialize();

  // BAD: Checks internal event emission details
  expect(mockEventEmitter.emit).toHaveBeenCalledWith(
    'toolsChanged',
    expect.any(Object)
  );
});

// AFTER (Behavior-focused - verifies event handler receives data)
it("should notify listeners when tools change", async () => {
  // ARRANGE: Setup hub with event listener
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] }
    }
  });

  const hub = new MCPHub(config);

  const toolsChangedHandler = vi.fn();
  hub.on('toolsChanged', toolsChangedHandler);

  await hub.initialize();

  // ACT: Trigger tools change (simulated via connection event)
  const mockConnection = hub.connections.get('server1');
  mockConnection.emit('toolsChanged', { tools: ['new-tool'] });

  // ASSERT: Verify handler was called with correct data
  expect(toolsChangedHandler).toHaveBeenCalled();
  const eventData = toolsChangedHandler.mock.calls[0][0];
  expect(eventData).toHaveProperty('server');
  expect(eventData).toHaveProperty('tools');
});
```

**Helper Utilities Used**:
- `createTestConfig()` - Configuration
- Vitest mock functions: `vi.fn()`
- Event listener pattern verification

**Validation After Subtask**:
```bash
npm test tests/MCPHub.test.js -- --grep "event"
# Expected: 3/3 event tests passing
```

### Task 2.1 Completion Validation

After completing all subtasks, run comprehensive validation:

```bash
# Full MCPHub test suite
npm test tests/MCPHub.test.js

# Expected output:
# ✓ tests/MCPHub.test.js (20)
#   ✓ Initialization (5)
#   ✓ Server Lifecycle (5)
#   ✓ Server Operations (4)
#   ✓ Status Reporting (3)
#   ✓ Event Emissions (3)
#
# Test Files  1 passed (1)
# Tests  20 passed (20)
```

**Quality Checks**:

1. **Helper Usage Verification**:
```bash
# Should find many occurrences
grep -c "createTestConfig\|createMockConnection\|expectServer" tests/MCPHub.test.js
```

2. **Anti-Pattern Detection**:
```bash
# Should find ZERO occurrences
grep -c "expect(logger" tests/MCPHub.test.js
grep -c "toHaveBeenCalledWith.*MCPConnection" tests/MCPHub.test.js
```

3. **Coverage Check**:
```bash
npm run test:coverage -- tests/MCPHub.test.js
# Verify: >80% coverage maintained
```

**Go/No-Go Decision**:
- ✅ All 20 tests passing
- ✅ No logger/constructor assertions
- ✅ All tests use helper utilities
- ✅ Coverage >80%
- ✅ Peer review complete

**Deliverables**:
- ✅ `tests/MCPHub.test.js` - 20/20 passing (100%)
- ✅ All tests follow AAA pattern
- ✅ All tests use Sprint 1 helpers
- ✅ Zero brittle assertions

---

## Task 2.2: Rewrite MCPConnection.test.js (2.5-3h)

### Overview

Rewrite 22 MCPConnection tests from brittle implementation-focused to robust behavior-driven tests.

**Current State**: 0/22 passing (100% failure rate)
**Target State**: 22/22 passing (100% pass rate)
**Time Budget**: 2.5-3h (~6.8 min/test + analysis overhead)

### Focus Areas

1. **Connection Lifecycle** (5 tests)
   - Connect to server
   - Disconnect from server
   - Reconnect after failure
   - Handle connection timeouts
   - Connection state transitions

2. **Capability Management** (6 tests)
   - List tools from server
   - List resources from server
   - List prompts from server
   - Update capabilities on server changes
   - Handle capability errors
   - Resource templates handling

3. **Operation Execution** (5 tests)
   - Execute tool successfully
   - Read resource successfully
   - Execute prompt successfully
   - Handle operation timeouts
   - Handle operation errors

4. **Error Handling** (3 tests)
   - Connection errors with proper error types
   - Operation errors with context
   - Recovery after transient failures

5. **Event Emissions** (3 tests)
   - Emit events on capability changes
   - Emit events on connection state changes
   - Emit notification events

### Subtasks

#### Subtask 2.2.1: Analyze Existing Test Structure (30 min)

**Goal**: Understand current MCPConnection test patterns

**Actions**:
1. Read `tests/MCPConnection.test.js` completely
2. Identify brittle patterns:
   - Mock client call assertions: `expect(mockClient.callTool).toHaveBeenCalledWith(...)`
   - Logger assertions: `expect(logger.warn).toHaveBeenCalled()`
   - Incomplete mock configurations causing "undefined is not a function"
3. Map tests to focus areas (lifecycle, capabilities, operations, errors, events)
4. Note which helper utilities needed for each category
5. Document async/promise handling patterns

**Deliverable**: Analysis document with transformation strategy for MCPConnection

**Validation**: Clear plan for rewriting each test category

#### Subtask 2.2.2: Rewrite Connection Lifecycle Tests (40 min)

**Goal**: Transform 5 connection lifecycle tests to behavior-driven approach

**Tests to Rewrite**:
1. "should connect to server successfully"
2. "should disconnect from server cleanly"
3. "should reconnect after connection failure"
4. "should timeout on slow connections"
5. "should track connection state transitions"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks mock client calls)
it("should connect to server", async () => {
  await connection.connect();

  // BAD: Tests mock implementation
  expect(mockClient.connect).toHaveBeenCalled();

  // BAD: Tests logger
  expect(logger.info).toHaveBeenCalledWith(
    "Connected to MCP server 'test-server'"
  );
});

// AFTER (Behavior-focused - checks connection state)
it("should successfully connect and retrieve server info", async () => {
  // ARRANGE: Create connection with realistic mock
  const serverInfo = {
    name: 'test-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  };

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    getServerInfo: vi.fn().mockResolvedValue(serverInfo),
    listTools: vi.fn().mockResolvedValue([]),
    listResources: vi.fn().mockResolvedValue([]),
    listPrompts: vi.fn().mockResolvedValue([])
  };

  const connection = new MCPConnection('test-server', config, { client: mockClient });

  // ACT: Perform connection
  await connection.connect();

  // ASSERT: Verify connection state outcomes
  expect(connection.isConnected()).toBe(true);
  expect(connection.getStatus()).toBe('connected');

  const info = await connection.getServerInfo();
  expect(info.name).toBe('test-server');
  expect(info.version).toBe('1.0.0');
  expect(info.capabilities).toBeDefined();
});
```

**Helper Utilities Used**:
- `createMockConnection()` with connection behavior overrides
- Focus on `isConnected()`, `getStatus()`, and `getServerInfo()` outcomes
- No mock client call assertions

**Async Error Handling Pattern**:

```javascript
// BEFORE (Problematic - doesn't test async rejection properly)
it("should handle connection errors", async () => {
  mockClient.connect.mockRejectedValue(new Error("Connection failed"));

  await connection.connect();

  // BAD: Doesn't verify error was thrown
  expect(logger.error).toHaveBeenCalled();
});

// AFTER (Proper async error testing)
it("should throw ConnectionError when connection fails", async () => {
  // ARRANGE: Mock connection failure
  const mockClient = {
    connect: vi.fn().mockRejectedValue(new Error("Network timeout")),
  };

  const connection = new MCPConnection('test-server', config, { client: mockClient });

  // ACT & ASSERT: Verify error is thrown with proper type
  await expect(connection.connect()).rejects.toThrow(ConnectionError);

  await expect(connection.connect()).rejects.toMatchObject({
    code: 'CONNECTION_FAILED',
    details: expect.objectContaining({
      server: 'test-server',
      cause: expect.any(Error)
    })
  });

  // Verify connection state reflects failure
  expect(connection.isConnected()).toBe(false);
  expect(connection.getStatus()).toBe('disconnected');
});
```

**Validation After Subtask**:
```bash
npm test tests/MCPConnection.test.js -- --grep "lifecycle"
# Expected: 5/5 lifecycle tests passing
```

#### Subtask 2.2.3: Rewrite Capability Management Tests (50 min)

**Goal**: Transform 6 capability management tests to behavior-driven approach

**Tests to Rewrite**:
1. "should list tools from server"
2. "should list resources from server"
3. "should list prompts from server"
4. "should update capabilities when server changes"
5. "should handle capability retrieval errors"
6. "should manage resource templates"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks mock method calls)
it("should list tools", async () => {
  await connection.connect();
  const tools = await connection.listTools();

  // BAD: Tests mock implementation
  expect(mockClient.listTools).toHaveBeenCalled();
});

// AFTER (Behavior-focused - validates tool list structure)
it("should return complete tool list with metadata", async () => {
  // ARRANGE: Create connection with tools
  const mockTools = [
    {
      name: 'search-files',
      description: 'Search files in workspace',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          path: { type: 'string' }
        },
        required: ['query']
      }
    },
    {
      name: 'read-file',
      description: 'Read file contents',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' }
        },
        required: ['path']
      }
    }
  ];

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue(mockTools),
    getServerInfo: vi.fn().mockResolvedValue({ name: 'test-server' })
  };

  const connection = new MCPConnection('test-server', config, { client: mockClient });
  await connection.connect();

  // ACT: List tools
  const tools = await connection.listTools();

  // ASSERT: Verify complete tool structure
  expect(tools).toHaveLength(2);

  expect(tools[0]).toHaveProperty('name', 'search-files');
  expect(tools[0]).toHaveProperty('description');
  expect(tools[0]).toHaveProperty('inputSchema');
  expect(tools[0].inputSchema).toHaveProperty('type', 'object');
  expect(tools[0].inputSchema).toHaveProperty('properties');
  expect(tools[0].inputSchema).toHaveProperty('required');

  expect(tools[1]).toHaveProperty('name', 'read-file');
  expect(tools[1]).toHaveProperty('inputSchema');
});
```

**Helper Utilities Used**:
- `createMockConnection()` with capability overrides
- Focus on returned data structure validation
- Comprehensive property checks

**Validation After Subtask**:
```bash
npm test tests/MCPConnection.test.js -- --grep "capability"
# Expected: 6/6 capability tests passing
```

#### Subtask 2.2.4: Rewrite Operation Execution Tests (40 min)

**Goal**: Transform 5 operation execution tests to behavior-driven approach

**Tests to Rewrite**:
1. "should execute tool and return result"
2. "should read resource and return content"
3. "should execute prompt and return result"
4. "should timeout on slow operations"
5. "should handle operation errors gracefully"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks mock calls)
it("should call tool", async () => {
  const args = { query: "test" };
  await connection.callTool('search-files', args);

  // BAD: Tests mock implementation
  expect(mockClient.callTool).toHaveBeenCalledWith('search-files', args);
});

// AFTER (Behavior-focused - validates operation result)
it("should execute tool and return structured result", async () => {
  // ARRANGE: Setup connection with tool behavior
  const toolResult = {
    content: [
      {
        type: 'text',
        text: 'Found 3 files matching query'
      },
      {
        type: 'resource',
        resource: {
          uri: 'file:///path/to/file1.js',
          mimeType: 'application/javascript'
        }
      }
    ],
    isError: false
  };

  const connection = createMockConnection({
    callTool: vi.fn().mockResolvedValue(toolResult)
  });

  // ACT: Execute tool
  const result = await connection.callTool('search-files', { query: 'test' });

  // ASSERT: Verify result structure using helper
  expectToolCallSuccess(result);

  expect(result.content).toHaveLength(2);
  expect(result.content[0].type).toBe('text');
  expect(result.content[0].text).toBe('Found 3 files matching query');
  expect(result.content[1].type).toBe('resource');
  expect(result.content[1].resource).toHaveProperty('uri');
  expect(result.content[1].resource).toHaveProperty('mimeType');
  expect(result.isError).toBe(false);
});
```

**Resource Operation Pattern**:

```javascript
it("should read resource and return content with metadata", async () => {
  // ARRANGE: Setup resource read behavior
  const resourceContent = {
    contents: [
      {
        uri: 'file:///workspace/config.json',
        mimeType: 'application/json',
        text: '{"setting": "value"}'
      }
    ]
  };

  const connection = createMockConnection({
    readResource: vi.fn().mockResolvedValue(resourceContent)
  });

  // ACT: Read resource
  const result = await connection.readResource('file:///workspace/config.json');

  // ASSERT: Verify resource content structure
  expectResourceReadSuccess(result);

  expect(result.contents).toHaveLength(1);
  expect(result.contents[0]).toHaveProperty('uri');
  expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
  expect(result.contents[0]).toHaveProperty('text');

  // Verify content is valid JSON
  const parsed = JSON.parse(result.contents[0].text);
  expect(parsed).toHaveProperty('setting', 'value');
});
```

**Helper Utilities Used**:
- `createMockConnection()` with operation-specific behavior
- `expectToolCallSuccess()` - Validate tool execution
- `expectResourceReadSuccess()` - Validate resource access
- Focus on result structure and data validation

**Validation After Subtask**:
```bash
npm test tests/MCPConnection.test.js -- --grep "operation"
# Expected: 5/5 operation tests passing
```

#### Subtask 2.2.5: Rewrite Error Handling Tests (25 min)

**Goal**: Transform 3 error handling tests to behavior-driven approach

**Tests to Rewrite**:
1. "should throw ConnectionError on connection failures"
2. "should throw ToolError on tool execution failures"
3. "should recover gracefully after transient errors"

**Transformation Pattern**:

```javascript
// BEFORE (Problematic - doesn't verify error properly)
it("should handle tool errors", async () => {
  mockClient.callTool.mockRejectedValue(new Error("Tool failed"));

  await connection.callTool('broken-tool', {});

  // BAD: Tests side effect instead of error
  expect(logger.error).toHaveBeenCalled();
});

// AFTER (Proper error validation)
it("should throw ToolError with context on tool failure", async () => {
  // ARRANGE: Setup tool failure
  const connection = createMockConnection({
    callTool: vi.fn().mockRejectedValue(new Error("Tool execution failed"))
  });

  // ACT & ASSERT: Verify error type and structure
  await expect(
    connection.callTool('broken-tool', { arg: 'value' })
  ).rejects.toThrow(ToolError);

  await expect(
    connection.callTool('broken-tool', { arg: 'value' })
  ).rejects.toMatchObject({
    code: 'TOOL_EXECUTION_ERROR',
    message: expect.stringContaining('Tool execution failed'),
    details: expect.objectContaining({
      server: 'test-server',
      tool: 'broken-tool',
      args: { arg: 'value' },
      cause: expect.any(Error)
    })
  });
});
```

**Recovery Pattern**:

```javascript
it("should recover and retry after transient connection failure", async () => {
  // ARRANGE: Setup connection that fails then succeeds
  let connectAttempts = 0;
  const connection = createMockConnection({
    connect: vi.fn().mockImplementation(async () => {
      connectAttempts++;
      if (connectAttempts === 1) {
        throw new Error("Transient network error");
      }
      return undefined; // Success on retry
    }),
    isConnected: vi.fn().mockReturnValue(false)
  });

  // ACT: First attempt fails
  await expect(connection.connect()).rejects.toThrow();
  expect(connection.isConnected()).toBe(false);

  // ACT: Retry succeeds
  await connection.connect();

  // ASSERT: Verify recovery
  expect(connectAttempts).toBe(2);
  expect(connection.isConnected()).toBe(true);
  expect(connection.getStatus()).toBe('connected');
});
```

**Helper Utilities Used**:
- `createMockConnection()` with error behavior
- Custom error type validation: `ConnectionError`, `ToolError`, `ResourceError`
- Proper async rejection testing with `rejects.toThrow()`

**Validation After Subtask**:
```bash
npm test tests/MCPConnection.test.js -- --grep "error"
# Expected: 3/3 error handling tests passing
```

#### Subtask 2.2.6: Rewrite Event Emission Tests (25 min)

**Goal**: Transform 3 event emission tests to behavior-driven approach

**Tests to Rewrite**:
1. "should emit event when capabilities change"
2. "should emit event on connection state changes"
3. "should emit notification events from server"

**Transformation Pattern**:

```javascript
// BEFORE (Brittle - checks emit call)
it("should emit toolsChanged event", async () => {
  await connection.updateCapabilities();

  // BAD: Tests internal emit mechanism
  expect(mockEventEmitter.emit).toHaveBeenCalledWith(
    'toolsChanged',
    expect.any(Object)
  );
});

// AFTER (Behavior-focused - verifies listener receives correct data)
it("should notify listeners when tools are updated", async () => {
  // ARRANGE: Setup connection with event listener
  const connection = new MCPConnection('test-server', config);
  await connection.connect();

  const toolsChangedHandler = vi.fn();
  connection.on('toolsChanged', toolsChangedHandler);

  const newTools = [
    { name: 'new-tool', description: 'New functionality' }
  ];

  // ACT: Trigger tools update
  await connection.updateTools(newTools);

  // ASSERT: Verify listener received correct event data
  expect(toolsChangedHandler).toHaveBeenCalledTimes(1);

  const eventData = toolsChangedHandler.mock.calls[0][0];
  expect(eventData).toHaveProperty('server', 'test-server');
  expect(eventData).toHaveProperty('tools');
  expect(eventData.tools).toHaveLength(1);
  expect(eventData.tools[0].name).toBe('new-tool');
});
```

**State Change Event Pattern**:

```javascript
it("should emit state change events with previous and current states", async () => {
  // ARRANGE: Setup connection with state listener
  const connection = new MCPConnection('test-server', config);

  const stateChangeHandler = vi.fn();
  connection.on('stateChanged', stateChangeHandler);

  // ACT: Connect (disconnected → connecting → connected)
  await connection.connect();

  // ASSERT: Verify state transition events
  expect(stateChangeHandler).toHaveBeenCalled();

  const calls = stateChangeHandler.mock.calls;

  // First transition: disconnected → connecting
  expect(calls[0][0]).toMatchObject({
    server: 'test-server',
    previousState: 'disconnected',
    currentState: 'connecting'
  });

  // Second transition: connecting → connected
  expect(calls[1][0]).toMatchObject({
    server: 'test-server',
    previousState: 'connecting',
    currentState: 'connected'
  });
});
```

**Helper Utilities Used**:
- Vitest mock functions: `vi.fn()`
- Event listener registration and verification
- Mock call inspection: `handler.mock.calls[0][0]`

**Validation After Subtask**:
```bash
npm test tests/MCPConnection.test.js -- --grep "event"
# Expected: 3/3 event emission tests passing
```

### Task 2.2 Completion Validation

After completing all subtasks, run comprehensive validation:

```bash
# Full MCPConnection test suite
npm test tests/MCPConnection.test.js

# Expected output:
# ✓ tests/MCPConnection.test.js (22)
#   ✓ Connection Lifecycle (5)
#   ✓ Capability Management (6)
#   ✓ Operation Execution (5)
#   ✓ Error Handling (3)
#   ✓ Event Emissions (3)
#
# Test Files  1 passed (1)
# Tests  22 passed (22)
```

**Quality Checks**:

1. **Helper Usage Verification**:
```bash
# Should find many occurrences
grep -c "createMockConnection\|expectToolCallSuccess\|expectResourceReadSuccess" tests/MCPConnection.test.js
```

2. **Anti-Pattern Detection**:
```bash
# Should find ZERO occurrences
grep -c "expect(logger" tests/MCPConnection.test.js
grep -c "expect(mockClient" tests/MCPConnection.test.js
```

3. **Async Error Handling Check**:
```bash
# Should find proper async error testing
grep -c "rejects.toThrow" tests/MCPConnection.test.js
# Expected: 3+ occurrences
```

4. **Coverage Check**:
```bash
npm run test:coverage -- tests/MCPConnection.test.js
# Verify: >80% coverage maintained
```

**Go/No-Go Decision**:
- ✅ All 22 tests passing
- ✅ No logger/mock client assertions
- ✅ All tests use helper utilities
- ✅ Proper async error handling
- ✅ Coverage >80%
- ✅ Peer review complete

**Deliverables**:
- ✅ `tests/MCPConnection.test.js` - 22/22 passing (100%)
- ✅ All tests follow AAA pattern
- ✅ All tests use Sprint 1 helpers
- ✅ Proper async rejection testing
- ✅ Zero brittle assertions

---

## Integration Validation (0.5h)

### Overview

After completing both Task 2.1 and Task 2.2, perform integration validation to ensure no conflicts or shared state issues.

### Validation Steps

#### Step 1: Full Test Suite Execution (10 min)

```bash
# Run entire test suite
npm test

# Expected results:
# ✓ tests/MCPHub.test.js (20)
# ✓ tests/MCPConnection.test.js (22)
# ✓ tests/MCPConnection.integration.test.js (70 - should still be failing from before)
# ✓ tests/cli.test.js (0 - should still be failing from before)
# ✓ tests/config.test.js (passing)
# ✓ tests/env-resolver.test.js (passing)
#
# Tests  235 passed | 11 failed | 246 total
# Expected pass rate: 96% (up from 78%)
```

**Success Criteria**:
- MCPHub.test.js: 20/20 passing ✅
- MCPConnection.test.js: 22/22 passing ✅
- Total: 235/246 passing (96%)
- Gain: +42 tests (193 → 235)

#### Step 2: Coverage Validation (10 min)

```bash
# Check coverage for Sprint 2 files
npm run test:coverage

# Verify coverage thresholds:
# - Branches: >80%
# - Functions: >80%
# - Lines: >80%
# - Statements: >80%
```

**Coverage Analysis**:
```bash
# Detailed coverage for Sprint 2 files
npm run test:coverage -- tests/MCPHub.test.js tests/MCPConnection.test.js

# Review coverage report
open coverage/index.html
```

**Success Criteria**:
- All coverage thresholds >80% ✅
- No coverage drops from Sprint 1 baseline
- High coverage on critical paths

#### Step 3: Quality Anti-Pattern Scan (5 min)

```bash
# Verify NO brittle patterns in Sprint 2 files
echo "Checking for logger assertions (should be 0):"
grep -c "expect(logger" tests/MCPHub.test.js tests/MCPConnection.test.js || echo "✅ None found"

echo "Checking for constructor assertions (should be 0):"
grep -c "toHaveBeenCalledWith.*MCPConnection" tests/MCPHub.test.js || echo "✅ None found"

echo "Checking for mock client assertions (should be 0):"
grep -c "expect(mockClient" tests/MCPConnection.test.js || echo "✅ None found"

echo "Checking for helper utility usage (should be many):"
grep -c "createTestConfig\|createMockConnection\|expectServer" tests/MCPHub.test.js tests/MCPConnection.test.js
```

**Success Criteria**:
- Zero logger assertions ✅
- Zero constructor assertions ✅
- Zero mock client assertions ✅
- Heavy helper utility usage ✅

#### Step 4: Shared State Check (5 min)

**Goal**: Verify no test pollution or shared state issues between test files

```bash
# Run tests in different orders to detect shared state
npm test -- --sequence.shuffle
npm test -- --sequence.shuffle
npm test -- --sequence.shuffle

# All runs should have identical pass/fail results
```

**Success Criteria**:
- Test results consistent across shuffled runs ✅
- No flaky tests appearing/disappearing

#### Step 5: Performance Validation (5 min)

```bash
# Check test execution time
time npm test tests/MCPHub.test.js tests/MCPConnection.test.js

# Target: <10 seconds for 42 tests
```

**Success Criteria**:
- Test suite execution <10 seconds ✅
- No significant performance degradation

#### Step 6: Documentation Update (5 min)

**Update Progress Tracking**:

Update `claudedocs/TEST_PLAN.md` Sprint 2 Acceptance section:
```markdown
### Sprint 2 Acceptance
- [x] MCPHub.test.js - 20/20 tests passing (100%)
- [x] MCPConnection.test.js - 22/22 tests passing (100%)
- [x] All tests use helper utilities
- [x] All tests follow behavior-driven principles
- [x] No logger/implementation assertions
```

**Create Sprint 2 Completion Document**:

Create `claudedocs/Sprint2_Completion.md`:
```markdown
# Sprint 2 Completion Report

**Date**: [Date]
**Status**: ✅ Complete

## Results
- Tests Fixed: 42
- Pass Rate: 78% → 96% (+18%)
- Total Passing: 193 → 235

## Quality Metrics
- Helper Usage: 100%
- Logger Assertions: 0
- Constructor Assertions: 0
- Coverage: >80% all metrics

## Learnings
[Document key insights and helper gaps discovered]

## Recommendations for Sprint 3
[Based on Sprint 2 experience]
```

---

## Agile Ceremonies

### Daily Standup (15 minutes)

**Format**: Async or synchronous, team member updates

**Questions**:
1. What did you complete yesterday?
2. What will you work on today?
3. Any blockers or challenges?

**Example Updates**:

**Day 1** (Sprint 2 Start):
```
Developer A:
- Completed: Validated Sprint 1 completion, ready to start MCPHub tests
- Today: Analyze MCPHub test structure (Subtask 2.1.1), start initialization tests (Subtask 2.1.2)
- Blockers: None

Developer B (if parallel):
- Completed: Validated Sprint 1 completion
- Today: Analyze MCPConnection test structure (Subtask 2.2.1), start lifecycle tests (Subtask 2.2.2)
- Blockers: None
```

**Day 2** (Mid-Sprint):
```
Developer A:
- Completed: MCPHub initialization (5/5) and lifecycle tests (5/5) - 10/20 total
- Today: Complete operations (4), status (3), events (3) tests - finish MCPHub.test.js
- Blockers: None, helper utilities working great

Developer B (if parallel):
- Completed: MCPConnection lifecycle (5/5) and capabilities (6/6) - 11/22 total
- Today: Complete operations (5), errors (3), events (3) tests
- Blockers: None, discovered one missing helper for resource templates (added)
```

**Day 3** (Sprint End):
```
Developer A:
- Completed: MCPHub.test.js 20/20 passing ✅
- Today: Integration validation, coverage checks, peer review
- Blockers: None

Developer B (if parallel):
- Completed: MCPConnection.test.js 22/22 passing ✅
- Today: Integration validation, coverage checks, documentation
- Blockers: None
```

### Sprint Demo (30 minutes)

**Format**: Team demonstration of Sprint 2 outcomes

**Agenda**:

**1. Test Execution Demo** (5 min)
- Live execution of `npm test tests/MCPHub.test.js tests/MCPConnection.test.js`
- Show 42/42 tests passing
- Highlight pass rate improvement: 78% → 96%

**Demo Script**:
```bash
# Show before state (can reference TEST_PLAN.md)
echo "Before Sprint 2: 193/246 passing (78%)"

# Execute Sprint 2 tests
npm test tests/MCPHub.test.js tests/MCPConnection.test.js

# Show after state
npm test | grep "Tests"
echo "After Sprint 2: 235/246 passing (96%)"
```

**2. Before/After Transformation Examples** (10 min)

**Show 3 key transformations**:

**Example 1**: Initialization test (MCPHub)
- Show BEFORE: Logger and constructor assertions
- Show AFTER: Behavior-focused with helpers
- Explain improvement: resilient to implementation changes

**Example 2**: Tool execution test (MCPConnection)
- Show BEFORE: Mock client assertions
- Show AFTER: Result structure validation
- Explain improvement: tests actual outcomes

**Example 3**: Error handling test
- Show BEFORE: Improper async error handling
- Show AFTER: Proper rejects.toThrow() pattern
- Explain improvement: catches async errors correctly

**3. Helper Utility Benefits** (10 min)

**Demonstrate helper usage**:
```bash
# Show helper usage statistics
echo "Helper utility usage in Sprint 2:"
grep -o "createTestConfig\|createMockConnection\|expectServer[A-Za-z]*" tests/MCPHub.test.js tests/MCPConnection.test.js | sort | uniq -c

# Show test readability comparison
# Display side-by-side: before (verbose setup) vs after (helper one-liners)
```

**Benefits Highlighted**:
- Reduced boilerplate: ~50% less code per test
- Improved readability: intent-focused assertions
- Prevented errors: complete mock objects
- Maintainability: change helpers once, applies everywhere

**4. Coverage Report Review** (5 min)

```bash
# Show coverage report
npm run test:coverage -- tests/MCPHub.test.js tests/MCPConnection.test.js

# Open HTML report
open coverage/index.html
```

**Highlight**:
- All metrics >80% ✅
- Critical paths well-covered
- No coverage drops from baseline

**5. Q&A** (5 min)

**Common Questions**:
- Q: "How long did Sprint 2 take?" A: [Actual time vs 5-6h estimate]
- Q: "Any helper gaps discovered?" A: [List any additions made]
- Q: "Confidence for Sprint 3?" A: [Team confidence level 1-10]

### Sprint Retrospective (30 minutes)

**Format**: Team reflection on Sprint 2 experience

**Agenda**:

**1. What Went Well** (10 min)

**Facilitation Questions**:
- What aspects of Sprint 2 exceeded expectations?
- Which helper utilities were most valuable?
- What transformation patterns worked best?
- How did the workflow document help?

**Example Retrospective Notes**:
```markdown
## What Went Well 👍

- Helper utilities drastically reduced test boilerplate
- Sequential execution approach in Sprint 1 workflow was clear and easy to follow
- AAA pattern made tests very readable
- Quality gates caught issues early (anti-pattern scans)
- Peer review process caught subtle issues
- Time estimates were accurate (±10%)
- [Parallel execution saved 2 hours - if applicable]
```

**2. What Could Be Improved** (10 min)

**Facilitation Questions**:
- What slowed us down during Sprint 2?
- Which subtasks took longer than expected?
- Were there any helper utility gaps?
- What additional examples would have helped?
- Any frustrations or obstacles encountered?

**Example Retrospective Notes**:
```markdown
## What Could Be Improved 🔄

- Helper utilities needed 2 additions mid-sprint (resource template mock, error factory)
- Async error testing patterns took time to understand initially
- Some existing tests had hidden dependencies that required refactoring
- Could use more transformation examples in TESTING_STANDARDS.md
- Time estimates slightly optimistic for MCPConnection error handling tests
- [Communication between parallel developers needed better coordination - if applicable]
```

**3. Action Items for Sprint 3** (10 min)

**Facilitation Questions**:
- What will we do differently in Sprint 3?
- Should we update helper utilities before Sprint 3?
- Do we need additional examples or documentation?
- Should we adjust time estimates?
- Any process improvements to implement?

**Example Action Items**:
```markdown
## Try in Sprint 3 🎯

1. **Update Helper Utilities**:
   - Add createResourceTemplateMock() to mocks.js
   - Add expectConnectionError() to assertions.js
   - Document async error testing pattern in TESTING_STANDARDS.md

2. **Improve Time Estimates**:
   - Add 20% buffer to error handling subtasks
   - Account for async complexity in estimates

3. **Enhanced Peer Review**:
   - Review tests in batches of 5 rather than all at once
   - Use checklist from TESTING_STANDARDS.md during review

4. **Documentation Updates**:
   - Add 2 more async error transformation examples to TESTING_STANDARDS.md
   - Create quick reference card for helper utilities

5. **Communication** (if parallel):
   - Daily Slack check-ins for helper utility additions
   - Shared document for discovered patterns
```

### Working Agreement

**Sprint 2 Quality Standards**:

1. **Test Quality**:
   - All tests MUST use Sprint 1 helper utilities
   - Zero logger or constructor assertions allowed
   - All tests MUST follow AAA pattern
   - Async errors MUST use `rejects.toThrow()` pattern

2. **Incremental Validation**:
   - Run tests after each batch of 5 rewrites
   - Fix failures immediately before proceeding
   - Keep tests passing throughout sprint

3. **Peer Review Required**:
   - Each completed test file requires peer review
   - Use TESTING_STANDARDS.md checklist
   - Address feedback before marking complete

4. **Documentation**:
   - Update Sprint 2 Acceptance checklist as tasks complete
   - Document any helper utility additions
   - Create Sprint2_Completion.md at sprint end

5. **Quality Gates**:
   - Anti-pattern scan must pass (0 logger/constructor assertions)
   - Coverage must stay >80%
   - All tests must pass before sprint completion

**Definition of Done**:
- ✅ All 42 tests passing
- ✅ No brittle assertions
- ✅ Helper utilities used throughout
- ✅ Peer review complete
- ✅ Coverage >80%
- ✅ Documentation updated

---

## Risk Management

### Risk 1: Helper Utility Gaps

**Probability**: Medium (40%)
**Impact**: Medium
**Severity**: 🟡 Yellow

**Description**: Sprint 1 helpers may not cover all MCPConnection test scenarios, requiring mid-sprint additions.

**Indicators**:
- Tests fail due to missing helper functions
- Excessive boilerplate in tests indicates helper gap
- Developer feedback requests new helpers

**Mitigation**:
1. Sprint 1 pilot tests validate common patterns
2. Budget 30 min per task for analysis (identifies gaps early)
3. Document helper additions immediately
4. Quick review process for new helpers

**Contingency**:
- Add missing helpers on-demand to Sprint 1 deliverables
- Update `tests/helpers/*.js` files
- Add JSDoc documentation for new helpers
- Notify other developer if working in parallel
- Update TESTING_STANDARDS.md with new patterns

**Acceptance**: Helper gaps are normal and expected. Adding 1-3 helpers mid-sprint is acceptable and doesn't indicate Sprint 1 failure.

### Risk 2: Time Estimates Too Optimistic

**Probability**: Medium (35%)
**Impact**: Medium
**Severity**: 🟡 Yellow

**Description**: 2.5-3h per task may be insufficient if tests have hidden complexity or dependencies.

**Indicators**:
- Daily standup reveals slower-than-expected progress
- Subtasks taking >20% longer than estimated
- Still working on Task 2.1 after 3.5 hours

**Mitigation**:
1. Built-in 20% buffer in estimates (2.5h → 3h realistic)
2. 30 min analysis subtask identifies complexity early
3. Daily standups catch slippage within 24 hours
4. Break tests into smaller batches (5 tests at a time)

**Contingency**:
- Extend sprint by 1 day (5-6h → 7-8h total)
- Prioritize critical tests if time running short
- Defer 2-3 low-priority tests to Sprint 3 if necessary
- Reassess estimates for remaining sprints

**Acceptance**: 10-20% time overrun is normal. Adjust Sprint 3-5 estimates based on actuals.

### Risk 3: Existing Tests Have Hidden Dependencies

**Probability**: Low (20%)
**Impact**: High
**Severity**: 🟠 Orange

**Description**: Some tests may rely on specific mock configurations, shared state, or test execution order that isn't obvious from code.

**Indicators**:
- Tests fail even after behavior-focused rewrite
- Different pass/fail results when tests run in different orders
- "Works on my machine" issues between developers

**Mitigation**:
1. 30 min analysis subtask per file (identifies dependencies)
2. Run tests with `--sequence.shuffle` to detect order dependencies
3. Use `beforeEach` / `afterEach` for proper cleanup
4. Global test setup in `tests/setup.js` handles common cleanup

**Contingency**:
- Document dependencies in test comments
- Refactor tests to eliminate shared state
- Use test isolation techniques (separate describe blocks)
- Budget extra 30-60 min for dependency resolution if discovered

**Acceptance**: 1-2 hidden dependencies per test file is normal. Document and resolve systematically.

### Risk 4: Coverage Drops Below 80%

**Probability**: Low (15%)
**Impact**: Critical
**Severity**: 🔴 Red

**Description**: Behavior-focused tests might miss edge cases that implementation-focused tests accidentally covered.

**Indicators**:
- `npm run test:coverage` shows <80% for branches, functions, lines, or statements
- Coverage report shows uncovered code paths
- CI/CD pipeline fails coverage threshold check

**Mitigation**:
1. Run coverage after each file completion (early detection)
2. Review coverage report HTML to identify gaps
3. Add tests for uncovered paths immediately
4. Maintain coverage mindset during test rewrites

**Contingency**:
- Identify uncovered code paths from coverage report
- Add missing test scenarios to address gaps
- Prioritize high-risk uncovered paths (error handling, edge cases)
- May need to add 2-3 tests beyond the 42 planned
- Budget extra 30-60 min for coverage remediation

**Go/No-Go Impact**: Coverage <80% is a STOP condition. Must be resolved before Sprint 3.

### Risk 5: Parallel Execution Coordination Issues

**Probability**: Medium (30%) - Only if parallel execution chosen
**Impact**: Low
**Severity**: 🟢 Green

**Description**: If 2 developers work in parallel, coordination challenges may arise (helper additions, merge conflicts, inconsistent patterns).

**Indicators**:
- Merge conflicts in test files or helpers
- Inconsistent helper usage between developers
- Duplicate helper additions
- Communication gaps in standups

**Mitigation**:
1. Clear task boundaries (Dev A: MCPHub, Dev B: MCPConnection)
2. Shared Slack channel for real-time coordination
3. Daily sync to share learnings and helper additions
4. Version control best practices (frequent commits, clear messages)

**Contingency**:
- Hold quick sync call to align on patterns (15 min)
- Designate one developer as "helper owner" for additions
- Use pair programming for 30 min to align approaches
- Merge frequently to avoid large conflicts

**Acceptance**: Minor coordination friction is normal with parallel work. Benefits (50% time savings) outweigh costs.

---

## Success Metrics

### Primary Success Criteria

**1. Test Pass Rate**
- **Target**: 235/246 tests passing (96%)
- **Current**: 193/246 tests passing (78%)
- **Gain**: +42 tests (+18% pass rate)
- **Measurement**: `npm test | grep "Tests"`

**2. MCPHub.test.js**
- **Target**: 20/20 tests passing (100%)
- **Current**: 8/20 tests passing (40%)
- **Measurement**: `npm test tests/MCPHub.test.js`

**3. MCPConnection.test.js**
- **Target**: 22/22 tests passing (100%)
- **Current**: 0/22 tests passing (0%)
- **Measurement**: `npm test tests/MCPConnection.test.js`

**4. Code Coverage**
- **Target**: >80% branches, functions, lines, statements
- **Measurement**: `npm run test:coverage`
- **Status**: Must maintain Sprint 1 baseline

**5. Zero Brittle Assertions**
- **Target**: 0 logger/constructor assertions in Sprint 2 files
- **Measurement**:
  ```bash
  grep -c "expect(logger" tests/MCPHub.test.js tests/MCPConnection.test.js
  grep -c "toHaveBeenCalledWith.*MCPConnection" tests/MCPHub.test.js
  grep -c "expect(mockClient" tests/MCPConnection.test.js
  ```
- **Expected**: All should return 0

### Secondary Success Criteria

**6. Helper Utility Usage**
- **Target**: 100% of tests use Sprint 1 helpers
- **Measurement**:
  ```bash
  grep -c "createTestConfig\|createMockConnection\|expectServer" tests/MCPHub.test.js tests/MCPConnection.test.js
  ```
- **Expected**: >50 occurrences across both files

**7. Test Execution Performance**
- **Target**: <10 seconds for 42 tests
- **Measurement**: `time npm test tests/MCPHub.test.js tests/MCPConnection.test.js`

**8. Proper Async Error Handling**
- **Target**: All async errors use `rejects.toThrow()` pattern
- **Measurement**: `grep -c "rejects.toThrow" tests/MCPConnection.test.js`
- **Expected**: ≥3 occurrences (one per error handling test)

### Leading Indicators

**🟢 Green Flags** (On Track):
- ✅ Daily progress matches subtask time estimates
- ✅ Tests passing after each batch of 5 rewrites
- ✅ Helper utilities working without modifications
- ✅ Anti-pattern scans passing consistently
- ✅ Peer review feedback minor/stylistic only

**🟡 Yellow Flags** (Watch Closely):
- ⚠️ Subtasks taking 20-30% longer than estimated
- ⚠️ 1-2 helper utility additions needed
- ⚠️ Coverage trending toward 80% threshold
- ⚠️ 2-3 tests with hidden dependencies discovered
- ⚠️ Peer review identifies pattern inconsistencies

**🔴 Red Flags** (STOP and Reassess):
- 🚨 Subtasks taking >50% longer than estimated
- 🚨 >3 helper utility gaps discovered
- 🚨 Coverage drops below 80%
- 🚨 >5 tests with hidden dependencies
- 🚨 Anti-pattern scans consistently failing
- 🚨 Tests passing individually but failing together (shared state)

---

## Acceptance Criteria

### Sprint 2 Go/No-Go Checklist

Before marking Sprint 2 complete and proceeding to Sprint 3, ALL criteria must be met:

#### Test Results
- [ ] **MCPHub.test.js**: 20/20 tests passing (100%)
- [ ] **MCPConnection.test.js**: 22/22 tests passing (100%)
- [ ] **Total Tests**: 235/246 passing (96%) - gain of 42 tests
- [ ] **Test Execution**: <10 seconds for both files

#### Code Quality
- [ ] **Helper Usage**: 100% of tests use Sprint 1 utilities
- [ ] **Zero Logger Assertions**: `grep -c "expect(logger"` returns 0
- [ ] **Zero Constructor Assertions**: No `toHaveBeenCalledWith.*MCPConnection` patterns
- [ ] **Zero Mock Client Assertions**: No `expect(mockClient` patterns
- [ ] **AAA Pattern**: All tests follow Arrange-Act-Assert structure
- [ ] **Proper Async**: Error tests use `rejects.toThrow()` pattern

#### Coverage
- [ ] **Branches**: >80%
- [ ] **Functions**: >80%
- [ ] **Lines**: >80%
- [ ] **Statements**: >80%
- [ ] **No Coverage Drops**: Maintained or improved from Sprint 1 baseline

#### Integration
- [ ] **Shared State**: Tests pass consistently with `--sequence.shuffle`
- [ ] **No Test Pollution**: Same results across multiple shuffled runs
- [ ] **Full Suite**: All existing passing tests still pass

#### Documentation
- [ ] **Sprint 2 Acceptance**: Checklist in TEST_PLAN.md updated
- [ ] **Sprint2_Completion.md**: Created with results and learnings
- [ ] **Helper Additions**: Any new helpers documented in respective files
- [ ] **TESTING_STANDARDS.md**: Updated if new patterns discovered

#### Review
- [ ] **Peer Review**: Both test files reviewed by team member
- [ ] **Quality Scan**: Anti-pattern checks pass
- [ ] **Team Demo**: Sprint demo completed with stakeholders
- [ ] **Retrospective**: Team retrospective held and action items documented

### Go/No-Go Decision

**🟢 GO for Sprint 3**:
- All checklist items completed ✅
- No red flags present
- Team confidence high
- Coverage >80%
- 235/246 tests passing

**🔴 NO-GO (Extend Sprint 2)**:
- Any checklist item incomplete
- Red flags present (coverage <80%, >5 hidden dependencies, etc.)
- Quality gates failing
- Team confidence low

**If NO-GO**: Address gaps, add 1 day to sprint, re-validate before Sprint 3.

---

## Next Steps After Sprint 2

### Immediate Actions (Day 1 Post-Sprint)

1. **Update Project Board**:
   - Mark Sprint 2 tasks complete
   - Update TEST_PLAN.md Sprint 2 Acceptance checklist
   - Archive Sprint 2 branch if using separate branches

2. **Create Sprint2_Completion.md**:
   - Document final results (235/246 passing)
   - Capture key learnings and insights
   - Note any helper additions made
   - List recommendations for Sprint 3

3. **Team Communication**:
   - Share Sprint 2 completion report with team
   - Celebrate 42 tests fixed (+18% pass rate improvement)
   - Highlight top contributors

### Sprint 3 Preparation (Day 2-3 Post-Sprint)

1. **Sprint 3 Planning Session** (1 hour):
   - Review Sprint 3 scope from TEST_PLAN.md
   - Apply Sprint 2 learnings to Sprint 3 estimates
   - Discuss parallel execution opportunity again
   - Assign responsibilities

2. **Helper Utility Refinement** (30 min):
   - Incorporate any Sprint 2 helper additions into official files
   - Update JSDoc documentation
   - Add new patterns to TESTING_STANDARDS.md

3. **Environment Validation**:
   - Ensure Sprint 2 infrastructure supports Sprint 3 needs
   - Verify no conflicts with integration test requirements
   - Check that all dependencies available

### Sprint 3 Kickoff (Ready When)

**Prerequisites for Sprint 3**:
- ✅ Sprint 2 complete with go decision
- ✅ Sprint2_Completion.md created
- ✅ Helper utilities updated if needed
- ✅ Team rested and ready for next phase

**Sprint 3 Scope Preview**:
- Focus: Integration & Error Handling Tests
- Files: `MCPConnection.integration.test.js`
- Tests: ~78 tests (8 failing currently)
- Duration: 4-5 hours
- Complexity: Higher (transport-specific integration, OAuth flows)

---

## Appendix

### Complete Transformation Examples

#### Example 1: MCPHub Initialization Test

**BEFORE (Brittle)**:
```javascript
it("should start enabled servers from config", async () => {
  const mockConfig = {
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] },
      server2: { command: 'node', args: ['server2.js'], disabled: true }
    }
  };

  const mcpHub = new MCPHub(mockConfig);
  await mcpHub.initialize();

  // BAD: Tests constructor internals
  expect(MCPConnection).toHaveBeenCalledWith(
    "server1",
    mockConfig.mcpServers.server1
  );

  expect(MCPConnection).not.toHaveBeenCalledWith(
    "server2",
    expect.any(Object)
  );

  // BAD: Tests logger implementation
  expect(logger.info).toHaveBeenCalledWith(
    "Starting MCP server 'server1'"
  );

  expect(logger.debug).toHaveBeenCalledWith(
    "Skipping disabled MCP server 'server2'",
    { server: "server2" }
  );
});
```

**AFTER (Behavior-Focused)**:
```javascript
it("should connect enabled servers and skip disabled servers", async () => {
  // ARRANGE: Setup configuration with enabled and disabled servers
  const config = createTestConfig({
    mcpServers: {
      enabled: { command: 'node', args: ['enabled.js'] },
      disabled: { command: 'node', args: ['disabled.js'], disabled: true }
    }
  });

  const hub = new MCPHub(config);

  // ACT: Initialize hub
  await hub.initialize();

  // ASSERT: Verify behavioral outcomes
  expectServerConnected(hub, 'enabled');
  expectServerDisconnected(hub, 'disabled');
  expect(hub.connections.size).toBe(1);

  const statuses = hub.getAllServerStatuses();
  expect(statuses).toHaveLength(1);
  expect(statuses[0].name).toBe('enabled');
  expect(statuses[0].status).toBe('connected');
});
```

**Improvements**:
- ✅ Tests WHAT (outcomes) not HOW (implementation)
- ✅ Uses Sprint 1 helpers (`createTestConfig`, `expectServerConnected`)
- ✅ No logger assertions
- ✅ No constructor assertions
- ✅ Resilient to logger changes, constructor signature changes
- ✅ Clear AAA structure
- ✅ Descriptive test name

#### Example 2: MCPConnection Tool Execution

**BEFORE (Mock-Focused)**:
```javascript
it("should call tool on server", async () => {
  const mockClient = {
    callTool: vi.fn().mockResolvedValue({ content: [] })
  };

  const connection = new MCPConnection('test-server', config, { client: mockClient });
  await connection.connect();

  const args = { query: "test" };
  await connection.callTool('search-files', args);

  // BAD: Tests mock implementation details
  expect(mockClient.callTool).toHaveBeenCalledWith('search-files', args);
  expect(mockClient.callTool).toHaveBeenCalledTimes(1);
});
```

**AFTER (Outcome-Focused)**:
```javascript
it("should execute tool and return structured result", async () => {
  // ARRANGE: Setup connection with realistic tool behavior
  const toolResult = createToolResponse({
    content: [
      { type: 'text', text: 'Found 3 files matching query' },
      {
        type: 'resource',
        resource: {
          uri: 'file:///workspace/file1.js',
          mimeType: 'application/javascript'
        }
      }
    ],
    isError: false
  });

  const connection = createMockConnection({
    callTool: vi.fn().mockResolvedValue(toolResult)
  });

  // ACT: Execute tool
  const result = await connection.callTool('search-files', { query: 'test' });

  // ASSERT: Verify result structure and content
  expectToolCallSuccess(result);

  expect(result.content).toHaveLength(2);

  expect(result.content[0]).toMatchObject({
    type: 'text',
    text: 'Found 3 files matching query'
  });

  expect(result.content[1]).toMatchObject({
    type: 'resource',
    resource: {
      uri: expect.stringMatching(/^file:\/\//),
      mimeType: 'application/javascript'
    }
  });

  expect(result.isError).toBe(false);
});
```

**Improvements**:
- ✅ Tests result structure and data, not mock calls
- ✅ Uses helpers (`createToolResponse`, `createMockConnection`, `expectToolCallSuccess`)
- ✅ Validates complete response structure
- ✅ No mock client assertions
- ✅ Resilient to implementation changes

#### Example 3: Async Error Handling

**BEFORE (Problematic)**:
```javascript
it("should handle connection errors", async () => {
  const mockClient = {
    connect: vi.fn().mockRejectedValue(new Error("Network timeout"))
  };

  const connection = new MCPConnection('test-server', config, { client: mockClient });

  // BAD: Doesn't properly test async rejection
  await connection.connect();

  // BAD: Tests side effect instead of error
  expect(logger.error).toHaveBeenCalled();
});
```

**AFTER (Proper Async Error Testing)**:
```javascript
it("should throw ConnectionError with context on connection failure", async () => {
  // ARRANGE: Setup connection that will fail
  const connection = createMockConnection({
    connect: vi.fn().mockRejectedValue(new Error("Network timeout")),
    isConnected: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue('disconnected')
  });

  // ACT & ASSERT: Verify error is thrown with proper type
  await expect(connection.connect()).rejects.toThrow(ConnectionError);

  // ASSERT: Verify error structure
  await expect(connection.connect()).rejects.toMatchObject({
    code: 'CONNECTION_FAILED',
    message: expect.stringContaining('Network timeout'),
    details: expect.objectContaining({
      server: 'test-server',
      cause: expect.any(Error)
    })
  });

  // ASSERT: Verify connection state reflects failure
  expect(connection.isConnected()).toBe(false);
  expect(connection.getStatus()).toBe('disconnected');
});
```

**Improvements**:
- ✅ Proper async rejection testing with `rejects.toThrow()`
- ✅ Validates error type and structure
- ✅ Tests behavioral outcome (connection state)
- ✅ No logger assertions
- ✅ Comprehensive error validation

### Helper Utility Quick Reference

**Mock Factories** (`tests/helpers/mocks.js`):
```javascript
createMockLogger(overrides)           // Complete logger with 4 methods
createMockConfigManager(overrides)    // ConfigManager with all operations
createMockConnection(overrides)       // MCPConnection with all methods
createMockRequest(overrides)          // Express request mock
createMockResponse()                  // Express response mock
```

**Test Fixtures** (`tests/helpers/fixtures.js`):
```javascript
createTestConfig(overrides)           // Configuration object
createServerConfig(name, overrides)   // Server-specific config
createToolResponse(overrides)         // Tool call result
createResourceResponse(overrides)     // Resource read result
createServerStatus(overrides)         // Server status object
```

**Assertion Helpers** (`tests/helpers/assertions.js`):
```javascript
expectServerConnected(hub, name)      // Verify connection state
expectServerDisconnected(hub, name)   // Verify disconnection
expectToolCallSuccess(result)         // Validate tool execution
expectResourceReadSuccess(result)     // Validate resource access
expectServerError(error, code, name)  // Validate server error
expectConnectionError(error, code)    // Validate connection error
```

### Time Tracking Template

Use this table to track actual time spent vs estimates:

| Subtask | Estimated | Actual | Variance | Notes |
|---------|-----------|--------|----------|-------|
| 2.1.1 Analysis | 30 min | ___ min | ___% | |
| 2.1.2 Initialization | 45 min | ___ min | ___% | |
| 2.1.3 Lifecycle | 45 min | ___ min | ___% | |
| 2.1.4 Operations | 30 min | ___ min | ___% | |
| 2.1.5 Status | 20 min | ___ min | ___% | |
| 2.1.6 Events | 20 min | ___ min | ___% | |
| **Task 2.1 Total** | **2.5-3h** | **___ h** | **___%** | |
| 2.2.1 Analysis | 30 min | ___ min | ___% | |
| 2.2.2 Lifecycle | 40 min | ___ min | ___% | |
| 2.2.3 Capabilities | 50 min | ___ min | ___% | |
| 2.2.4 Operations | 40 min | ___ min | ___% | |
| 2.2.5 Errors | 25 min | ___ min | ___% | |
| 2.2.6 Events | 25 min | ___ min | ___% | |
| **Task 2.2 Total** | **2.5-3h** | **___ h** | **___%** | |
| Integration | 30 min | ___ min | ___% | |
| **Sprint 2 Total** | **5.5-6.5h** | **___ h** | **___%** | |

---

**End of Sprint 2 Workflow Document**

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Status**: ✅ Ready for Execution
**Next Review**: After Sprint 2 completion
