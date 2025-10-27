# Sprint 2 Task 2.2 Analysis: MCPConnection.test.js

**Date**: 2025-01-27  
**File**: `tests/MCPConnection.test.js`  
**Status**: Analysis Complete  
**Total Tests**: 32 (6 passing, 26 failing)

## Executive Summary

MCPConnection.test.js has 32 tests with 26 failing tests. Main issue: connection initialization tries to run real transport logic instead of mocking it.

## Test Breakdown

### Connection Lifecycle (17 tests)
- **Passing**: 5 tests
  - should initialize in disconnected state
  - should handle disconnect when never connected
  - should handle disconnect during error state
  - should cleanup all resources on error during connection
  - should handle handleAuthCallback when transport is null
- **Failing**: 12 tests
  - should connect successfully - "Invalid URL" error
  - should handle connection errors - Wrong error message structure
  - should handle transport errors - Can't connect
  - should handle transport close - Can't connect
  - should handle stderr output - Can't connect
  - should disconnect cleanly - Can't connect
  - should handle terminateSession gracefully when transport has sessionId - Can't connect
  - should handle disconnect when transport has no sessionId - Can't connect
  - should handle disconnect gracefully when devWatcher throws error - Can't connect
  - should handle disconnect gracefully when transport.close throws error - Can't connect
  - should cleanup is idempotent - Can't connect
  - should handle reconnect when client exists but disconnect throws - Can't connect
  - should handle handleAuthCallback when transport.finishAuth throws - Can't connect

### Capability Discovery (2 tests)
- **Passing**: 1 test
  - should handle capability update errors
- **Failing**: 1 test
  - should handle partial capabilities - Can't connect

### Tool Execution (5 tests)
- **Passing**: 0 tests
- **Failing**: 5 tests
  - All fail with "Invalid URL" - Can't connect

### Resource Access (6 tests)
- **Passing**: 0 tests
- **Failing**: 6 tests
  - All fail with "Invalid URL" - Can't connect

### Server Info (3 tests)
- **Passing**: 0 tests
- **Failing**: 3 tests
  - All fail with "Invalid URL" - Can't connect

## Root Cause Analysis

### Primary Issue: Missing Transport Type Configuration

All failing tests fail because `connect()` tries to create a real transport without proper configuration. The `connect()` method expects one of these in config:
1. `type: 'stdio'` - for STDIO transport
2. `url` property - for HTTP/SSE transport

Current test config:
```javascript
mockConfig = {
  command: "test-server",
  args: ["--port", "3000"],
  env: { TEST_ENV: "value" },
};
```

This is missing the `type` field, causing the transport creation to fail.

### Secondary Issues

1. **Mock Not Complete**: The `Client` mock doesn't properly handle the transport parameter
2. **Transport Mocks Not Used**: Tests create mock transports but never use them
3. **No Helper Utilities**: Tests don't use helper fixtures from Sprint 1

## Brittle Patterns Identified

### Pattern 1: Mock Client Call Assertions ✅ GOOD
```javascript
expect(client.request).toHaveBeenCalledWith(
  {
    method: "tools/call",
    params: { name: "test-tool", arguments: { param: "value" } },
  },
  expect.any(Object)
);
```
**Assessment**: Not brittle - verifies RPC call structure (observable behavior)

### Pattern 2: Logger Assertions ❌ BAD
None found in current tests (good!)

### Pattern 3: Incomplete Mock Configurations ❌ BAD
Missing transport type configuration causing all failures

### Pattern 4: No Helper Utilities Usage ⚠️ NEEDED
Tests should use fixtures from `tests/helpers/fixtures.js`

## Transformation Strategy

### 1. Fix Transport Configuration (Critical)

Add `type: 'stdio'` to mock config:

```javascript
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  mockConfig = {
    type: 'stdio',  // ADD THIS
    command: "test-server",
    args: ["--port", "3000"],
    env: { TEST_ENV: "value" },
  };
  // ... rest of setup
});
```

### 2. Create Connection Fixtures

Add to `tests/helpers/fixtures.js`:

```javascript
/**
 * Create MCPConnection config for testing
 * @param {Object} overrides - Override config properties
 * @returns {Object} Connection config
 */
export function createConnectionConfig(overrides = {}) {
  return {
    type: 'stdio',
    command: 'node',
    args: ['server.js'],
    env: {},
    ...overrides
  };
}

/**
 * Create mock transport object
 * @param {Object} overrides - Override transport properties
 * @returns {Object} Mock transport
 */
export function createMockTransport(overrides = {}) {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    sessionId: null,
    terminateSession: vi.fn().mockResolvedValue(undefined),
    stderr: {
      on: vi.fn()
    },
    ...overrides
  };
}

/**
 * Create mock client object
 * @param {Object} overrides - Override client properties
 * @returns {Object} Mock client
 */
export function createMockClient(overrides = {}) {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    request: vi.fn(),
    setNotificationHandler: vi.fn(),
    ...overrides
  };
}
```

### 3. Fix Connect Mock to Handle Transport

The `Client.connect()` mock should accept and store the transport:

```javascript
Client: vi.fn(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  request: vi.fn(),
  transport: null, // Store transport
  setNotificationHandler: vi.fn(),
})),
```

Update connect mock:
```javascript
client.connect.mockImplementation(async (transport) => {
  client.transport = transport;
  return undefined;
});
```

### 4. Add Connection Assertion Helpers

Add to `tests/helpers/assertions.js`:

```javascript
/**
 * Assert connection is in expected state
 * @param {Object} connection - MCPConnection instance
 * @param {string} expectedStatus - Expected status
 */
export function expectConnectionStatus(connection, expectedStatus) {
  expect(connection.status).toBe(expectedStatus);
}

/**
 * Assert connection has tools
 * @param {Object} connection - MCPConnection instance
 * @param {number} expectedCount - Expected tool count
 */
export function expectConnectionTools(connection, expectedCount) {
  expect(connection.tools).toHaveLength(expectedCount);
}

/**
 * Assert connection has resources
 * @param {Object} connection - MCPConnection instance
 * @param {number} expectedCount - Expected resource count
 */
export function expectConnectionResources(connection, expectedCount) {
  expect(connection.resources).toHaveLength(expectedCount);
}
```

## Test Categories and Transformation Priority

### Priority 1: Connection Lifecycle (12 failing tests)
**Focus**: Fix transport configuration and connect flow

**Transformation Pattern**:
```javascript
// BEFORE - Missing type configuration
const mockConfig = {
  command: "test-server",
  args: ["--port", "3000"],
};

// AFTER - Proper transport type
const mockConfig = createConnectionConfig({
  type: 'stdio',
  command: "test-server",
  args: ["--port", "3000"],
});
```

### Priority 2: Tool Execution (5 failing tests)
**Focus**: Mock client.request properly and use fixtures

**Transformation Pattern**:
```javascript
// BEFORE - Direct client.request mock
client.request.mockImplementation(async ({ method }) => {
  if (method === "tools/call") {
    return { output: "success" };
  }
});

// AFTER - Use fixtures
beforeEach(async () => {
  const toolResponse = createToolResponse({
    output: "success"
  });
  
  client.request.mockImplementation(async ({ method }) => {
    if (method === "tools/call") return toolResponse;
  });
  
  await connection.connect();
});
```

### Priority 3: Resource Access (6 failing tests)
**Focus**: Mock client.request for resources

**Transformation Pattern**:
Similar to Tool Execution, use `createResourceResponse()` fixture

### Priority 4: Server Info (3 failing tests)
**Focus**: Mock capabilities discovery

**Transformation Pattern**:
Use helper fixtures for tools, resources, and templates

## Required Helper Utilities

### New Fixtures Needed
1. `createConnectionConfig()` - Connection configuration
2. `createMockTransport()` - Mock transport object
3. `createMockClient()` - Mock client object

### New Assertions Needed
1. `expectConnectionStatus()` - Verify connection state
2. `expectConnectionTools()` - Verify tools count
3. `expectConnectionResources()` - Verify resources count

## Mock Improvements

### Current Mock Issues
1. `Client.connect()` doesn't accept/store transport parameter
2. `StdioClientTransport` mock incomplete
3. Missing transport type in config

### Required Mock Fixes
1. Make `Client.connect()` accept and store transport
2. Make transport mock methods properly mockable
3. Add transport type to all test configs

## Summary of Changes Needed

1. **Add to `tests/helpers/fixtures.js`**:
   - `createConnectionConfig()`
   - `createMockTransport()`
   - `createMockClient()`

2. **Add to `tests/helpers/assertions.js`**:
   - `expectConnectionStatus()`
   - `expectConnectionTools()`
   - `expectConnectionResources()`

3. **Fix `tests/MCPConnection.test.js`**:
   - Add `type: 'stdio'` to all mock configs
   - Use `createConnectionConfig()` helper
   - Fix `Client.connect()` mock to handle transport
   - Use fixtures for tools/resources/prompts
   - Use assertion helpers for status checks

## Estimated Time

- Helper utilities creation: 30 min
- Fix transport configuration: 15 min
- Transform Connection Lifecycle tests: 60 min
- Transform Tool/Resource tests: 45 min
- Transform Server Info tests: 20 min
- **Total**: ~3 hours

## Success Criteria

✅ All 32 tests passing  
✅ All tests use helper fixtures  
✅ Zero brittle patterns (verify no new ones introduced)  
✅ All tests follow AAA pattern  
✅ Behavior-focused assertions only  
