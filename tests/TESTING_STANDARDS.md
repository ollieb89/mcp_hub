# Testing Standards - MCP Hub

**Purpose**: Establish behavior-driven testing standards for maintainable, resilient tests

**Audience**: All developers writing or reviewing tests

**Last Updated**: 2025-10-27

---

## Testing Philosophy

### Core Principle: Test WHAT, Not HOW

**Definition**: Tests should verify observable behavior and outcomes, not implementation details or internal mechanics.

**Why This Matters**:
- Tests that check implementation break during refactoring even when behavior is correct
- Implementation-focused tests create maintenance burden without adding value
- Behavior-focused tests document actual system requirements and expectations
- Resilient tests survive code refactoring and implementation changes

**Test Behavior (WHAT code does)**:
```javascript
✅ GOOD: Tests observable outcomes
it("should exclude disabled servers from active connections", async () => {
  // ARRANGE
  const config = createTestConfig({
    mcpServers: {
      'enabled': { command: 'node', args: ['enabled.js'] },
      'disabled': { command: 'node', args: ['disabled.js'], disabled: true }
    }
  });
  
  // ACT
  const hub = new MCPHub(config);
  await hub.initialize();
  
  // ASSERT
  expect(hub.connections.has('enabled')).toBe(true);
  expect(hub.connections.has('disabled')).toBe(false);
});
```

**Don't Test Implementation (HOW it's done)**:
```javascript
❌ BAD: Tests internal mechanics
it("should call logger.debug with specific message", async () => {
  await mcpHub.initialize();
  
  // Brittle - breaks when log level or message changes
  expect(logger.debug).toHaveBeenCalledWith(
    "Skipping disabled MCP server 'server2'",
    { server: "server2" }
  );
});
```

### Behavior vs Implementation Indicators

**Behavior Indicators** (Test these):
- ✅ Observable outcomes (state changes, return values)
- ✅ Public API results
- ✅ Error conditions and error structures
- ✅ Data transformations
- ✅ Side effects that users care about

**Implementation Indicators** (Avoid testing):
- ❌ Internal method calls
- ❌ Logger calls and log messages
- ❌ Constructor signatures
- ❌ Private/protected method invocations
- ❌ Mock implementation details

---

## Test Naming Convention

### Format: should [expected behavior] when [scenario/condition]

**Examples**:
- ✅ "should exclude disabled servers from active connections"
- ✅ "should throw ServerError when connection fails"
- ✅ "should successfully call tool on connected server"
- ✅ "should disconnect all servers when disconnectAll is called"
- ❌ "should call logger.debug" (tests implementation)
- ❌ "should call MCPConnection with exact arguments" (tests mechanics)
- ❌ "should update config manager" (too vague)

**Guidelines**:
1. **Start with "should"** to indicate expected behavior
2. **Describe observable outcome**, not the method called
3. **Include "when" clause** if scenario context is important
4. **Use active voice** and present tense
5. **Be specific** about what success looks like
6. **Avoid implementation details** in test names

### When to Include "when" Clause

Use "when" for conditional behavior or specific scenarios:
- ✅ "should throw error when server not found"
- ✅ "should retry connection when timeout occurs"
- ✅ "should skip disabled servers when initializing"

Omit "when" for straightforward behavior:
- ✅ "should initialize successfully"
- ✅ "should return server status"
- ✅ "should execute tool call"

---

## AAA Pattern: Arrange-Act-Assert

### Structure

Every test should follow this three-phase structure with clear comments:

```javascript
it("should [behavior] when [condition]", async () => {
  // ARRANGE: Setup test data and mocks
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] }
    }
  });
  const connection = createMockConnection({
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Success' }],
      isError: false
    })
  });
  const hub = new MCPHub(config);
  
  // ACT: Execute the behavior
  await hub.initialize();
  const result = await hub.callTool('server1', 'tool-name', {});
  
  // ASSERT: Verify outcomes, not implementation
  expectServerConnected(hub, 'server1');
  expectToolCallSuccess(result);
  expect(result.content[0].text).toBe('Success');
});
```

### Arrange Phase Guidelines

**DO**:
- ✅ Create all test data using fixture helpers
- ✅ Setup mocks using factory functions
- ✅ Instantiate the system under test
- ✅ Keep arrangement focused and minimal
- ✅ Use meaningful variable names

**DON'T**:
- ❌ Create complex nested mock configurations inline
- ❌ Mix arrangement with execution
- ❌ Leave test data undefined or ambiguous
- ❌ Repeat setup code across tests (use `beforeEach`)

**Example**:
```javascript
// GOOD: Clear, organized arrange phase
it("should handle multiple server failures gracefully", async () => {
  // ARRANGE
  const config = createMultiServerConfig(['server1', 'server2']);
  const connection = createMockConnection({
    connect: vi.fn()
      .mockResolvedValueOnce(undefined) // server1 succeeds
      .mockRejectedValueOnce(new Error("Connection failed")) // server2 fails
  });
  const hub = new MCPHub(config);
  
  // ACT
  await hub.initialize();
  
  // ASSERT
  expectServerConnected(hub, 'server1');
  expectServerDisconnected(hub, 'server2');
});
```

### Act Phase Guidelines

**DO**:
- ✅ Execute the behavior being tested
- ✅ Make it a single logical operation
- ✅ Use clear, meaningful variable names for results
- ✅ Handle async properly with await

**DON'T**:
- ❌ Perform multiple unrelated actions
- ❌ Mix testing multiple behaviors
- ❌ Add business logic in the act phase
- ❌ Forget to await async operations

**Example**:
```javascript
// GOOD: Single logical operation
const status = await hub.connectServer('server1', config);
const result = await hub.callTool('server1', 'tool-name', args);

// BAD: Multiple unrelated operations
await hub.connectServer('server1', config);
await hub.disconnectServer('server1');
await hub.connectServer('server2', config);
```

### Assert Phase Guidelines

**DO**:
- ✅ Verify outcomes using assertion helpers
- ✅ Check public API, not private state
- ✅ Focus on behavior, not implementation
- ✅ Include multiple related assertions if needed
- ✅ Use semantic assertion helpers

**DON'T**:
- ❌ Assert internal method calls
- ❌ Check logger calls
- ❌ Verify constructor arguments
- ❌ Access private properties
- ❌ Test implementation details

**Example**:
```javascript
// GOOD: Behavior-focused assertions
expectServerConnected(hub, 'server1');
expectToolCallSuccess(result);
expect(result.content).toHaveLength(1);

// BAD: Implementation-focused assertions
expect(connection.connect).toHaveBeenCalled();
expect(logger.info).toHaveBeenCalledWith('Success');
expect(MCPConnection).toHaveBeenCalledWith('server1', config);
```

---

## Mock Usage Best Practices

### Use Mock Factories

**Why**: Complete mocks prevent test failures from missing methods

**Good**: Complete mock from factory
```javascript
const connection = createMockConnection({
  callTool: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Success' }],
    isError: false
  })
});
```

**Bad**: Incomplete inline mock
```javascript
const connection = {
  callTool: vi.fn()
  // Missing: disconnect, getServerInfo, etc.
};
```

### Override Default Behavior

Mock factories provide sensible defaults. Override specific methods as needed:

```javascript
const connection = createMockConnection({
  // Override default connect behavior
  connect: vi.fn().mockRejectedValue(new Error('Connection failed'))
});

const config = createTestConfig({
  // Override default server config
  mcpServers: {
    server1: {
      command: 'node',
      args: ['custom.js'],
      disabled: true
    }
  }
});
```

### Avoid Incomplete Mock Configurations

**Problem**: Incomplete mocks cause tests to fail when code calls missing methods

**Solution**: Always use mock factories or provide complete mock objects

```javascript
// BAD: Incomplete
const hub = new MCPHub();
hub.configManager = {
  loadConfig: vi.fn()
  // Missing: watchConfig, getConfig, updateConfig, on
};

// GOOD: Complete
const hub = new MCPHub();
hub.configManager = createMockConfigManager();
```

### Clean Up After Tests

Always clean up mocks to prevent test interference:

```javascript
afterEach(() => {
  vi.restoreAllMocks();
});
```

**Why**: Prevents mocks from affecting subsequent tests

---

## Helper Utilities Reference

### Mock Factories (`tests/helpers/mocks.js`)

Use these to create complete mock objects:

- `createMockLogger()` - Logger with info/warn/debug/error
- `createMockConfigManager()` - ConfigManager with all methods
- `createMockConnection()` - MCPConnection with all methods
- `createMockRequest()` - Express request object
- `createMockResponse()` - Express response with chainable methods
- `createMockServiceManager()` - ServiceManager with nested objects

**Usage**:
```javascript
import { createMockConnection } from '@helpers/mocks';

const connection = createMockConnection({
  callTool: vi.fn().mockResolvedValue(specificValue)
});
```

### Test Fixtures (`tests/helpers/fixtures.js`)

Use these to generate consistent test data:

- `createTestConfig()` - Base configuration
- `createServerConfig(name, overrides)` - Server configuration
- `createToolResponse(overrides)` - Tool call response
- `createResourceResponse(overrides)` - Resource read response
- `createServerStatus(name, status, overrides)` - Server status
- `createToolList(count, prefix)` - Tool list
- `createResourceList(count, prefix)` - Resource list
- `createPromptList(count, prefix)` - Prompt list
- `createMultiServerConfig(servers)` - Multiple servers
- `createDisabledServerConfig(name)` - Disabled server

**Usage**:
```javascript
import { createTestConfig, createToolResponse } from '@helpers/fixtures';

const config = createTestConfig({
  mcpServers: { server1: { command: 'node', args: ['server1.js'] } }
});
```

### Assertion Helpers (`tests/helpers/assertions.js`)

Use these for semantic, readable assertions:

**Server State**:
- `expectServerConnected(hub, serverName)`
- `expectServerDisconnected(hub, serverName)`
- `expectAllServersConnected(hub, serverNames)`
- `expectNoActiveConnections(hub)`

**Operation Results**:
- `expectToolCallSuccess(result)`
- `expectResourceReadSuccess(result)`
- `expectToolCallContent(result, expectedText)`
- `expectResourceContent(result, expectedUri)`

**Error Handling**:
- `expectServerError(error, code, serverName)`
- `expectConnectionError(error, code)`
- `expectToolError(error, code, toolName)`
- `expectResourceError(error, code, uri)`
- `expectConfigError(error, code)`
- `expectValidationError(error, code, field)`

**Capabilities**:
- `expectServerCapabilities(status, expectedTools, expectedResources, expectedPrompts)`

**Usage**:
```javascript
import { expectServerConnected, expectToolCallSuccess } from '@helpers/assertions';

expectServerConnected(hub, 'server1');
expectToolCallSuccess(result);
```

---

## Transformation Examples

### Example 1: Logger Assertion Transformation

**BEFORE (Implementation-coupled)**:
```javascript
it("should skip disabled servers", async () => {
  await mcpHub.initialize();
  
  // BAD: Tests exact log message and level
  expect(logger.debug).toHaveBeenCalledWith(
    "Skipping disabled MCP server 'server2'",
    { server: "server2" }
  );
});
```

**AFTER (Behavior-focused)**:
```javascript
it("should exclude disabled servers from active connections", async () => {
  // ARRANGE
  const config = createTestConfig({
    mcpServers: {
      enabled: { command: 'node', args: ['enabled.js'] },
      disabled: { command: 'node', args: ['disabled.js'], disabled: true }
    }
  });
  
  // ACT
  const hub = new MCPHub(config);
  await hub.initialize();
  
  // ASSERT
  expectServerConnected(hub, 'enabled');
  expectServerDisconnected(hub, 'disabled');
  expect(hub.connections.size).toBe(1);
});
```

**Key Changes**:
- ❌ Removed logger assertion checking implementation details
- ✅ Added behavior assertions checking connection state
- ✅ Used helper functions for clarity
- ✅ Tests outcomes, not internal mechanics

---

### Example 2: Function Signature Transformation

**BEFORE (Brittle)**:
```javascript
it("should start enabled servers from config", async () => {
  await mcpHub.initialize();
  
  // BAD: Breaks when constructor signature evolves
  expect(MCPConnection).toHaveBeenCalledWith(
    "server1",
    mockConfig.mcpServers.server1
  );
  expect(MCPConnection).not.toHaveBeenCalledWith(
    "server2",
    mockConfig.mcpServers.server2
  );
});
```

**AFTER (Resilient)**:
```javascript
it("should successfully connect all enabled servers", async () => {
  // ARRANGE
  const config = createTestConfig({
    mcpServers: {
      server1: { command: 'node', args: ['server1.js'] },
      server2: { command: 'node', args: ['server2.js'], disabled: true }
    }
  });
  
  // ACT
  const hub = new MCPHub(config);
  await hub.initialize();
  
  // ASSERT
  const statuses = hub.getAllServerStatuses();
  expect(statuses).toHaveLength(1);
  expectServerConnected(hub, 'server1');
  expectServerDisconnected(hub, 'server2');
});
```

**Key Changes**:
- ❌ Removed constructor call assertion
- ✅ Added end-state verification
- ✅ Tests public API, not internals
- ✅ Resilient to implementation changes

---

### Example 3: Mock Configuration Transformation

**BEFORE (Incomplete)**:
```javascript
it("should call tool on server", async () => {
  const connection = {
    callTool: vi.fn().mockResolvedValue({ content: [] })
    // Missing: disconnect, getServerInfo, etc.
  };
  
  // Test fails when code calls missing methods
});
```

**AFTER (Complete with helper)**:
```javascript
it("should successfully execute tool and return result", async () => {
  // ARRANGE
  const connection = createMockConnection({
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Success' }],
      isError: false
    })
  });
  
  // ACT
  const result = await connection.callTool("test-tool", { param: "value" });
  
  // ASSERT
  expectToolCallSuccess(result);
  expect(result.content[0].text).toBe('Success');
});
```

**Key Changes**:
- ❌ Removed incomplete mock setup
- ✅ Used complete mock factory
- ✅ All methods pre-configured
- ✅ Easy to extend for specific needs

---

### Example 4: Async Handling Transformation

**BEFORE (Problematic)**:
```javascript
it("should handle connection errors", async () => {
  connection.connect.mockRejectedValueOnce(new Error("Network fail"));
  
  // BAD: Doesn't properly await or assert rejection
  await mcpHub.connectServer("server1", config);
  
  expect(logger.error).toHaveBeenCalled();
});
```

**AFTER (Proper async)**:
```javascript
it("should throw ServerError when connection fails", async () => {
  // ARRANGE
  const connection = createMockConnection({
    connect: vi.fn().mockRejectedValue(new Error("Network fail"))
  });
  
  // ACT & ASSERT
  await expect(
    hub.connectServer("server1", config)
  ).rejects.toThrow(ServerError);
  
  await expect(
    hub.connectServer("server1", config)
  ).rejects.toMatchObject({
    code: 'SERVER_ERROR',
    data: expect.objectContaining({
      server: 'server1'
    })
  });
});
```

**Key Changes**:
- ❌ Removed improper async handling
- ✅ Added proper `rejects.toThrow` assertion
- ✅ Verified error type and structure
- ✅ Tests error behavior, not side effects

---

### Example 5: Internal Method Call Transformation

**BEFORE (Implementation-focused)**:
```javascript
it("should disconnect server", async () => {
  await mcpHub.connectServer("server1", mockConfig.mcpServers.server1);
  await mcpHub.disconnectServer("server1");
  
  // BAD: Tests internal method call
  expect(connection.disconnect).toHaveBeenCalled();
  expect(mcpHub.connections.has("server1")).toBe(false);
});
```

**AFTER (Behavior-focused)**:
```javascript
it("should remove server from connections when disconnected", async () => {
  // ARRANGE
  const hub = new MCPHub(config);
  await hub.connectServer("server1", serverConfig);
  
  // ACT
  await hub.disconnectServer("server1");
  
  // ASSERT
  expectServerDisconnected(hub, 'server1');
});
```

**Key Changes**:
- ❌ Removed internal method call verification
- ✅ Used semantic assertion helper
- ✅ Tests observable state change
- ✅ Clear, readable intent

---

## Code Review Checklist

When reviewing tests, verify:

### Test Structure
- [ ] **Naming**: Test name describes behavior, not implementation
- [ ] **AAA Pattern**: Clear separation of Arrange, Act, Assert
- [ ] **Comments**: AAA phases are clearly commented

### Test Focus
- [ ] **Behavior Focus**: Tests verify outcomes, not internal calls
- [ ] **No Logger Checks**: No assertions on logger.debug/info/warn calls
- [ ] **No Signature Checks**: No assertions on exact function arguments
- [ ] **No Mock Access**: No direct access to mock.calls arrays
- [ ] **No Constructor Checks**: No assertions on constructor calls

### Helper Usage
- [ ] **Mock Factories**: Uses `createMock*` functions instead of inline mocks
- [ ] **Test Fixtures**: Uses `create*` functions for test data
- [ ] **Assertion Helpers**: Uses semantic assertion helpers where appropriate
- [ ] **Complete Mocks**: All required methods present in mocks

### Test Quality
- [ ] **Single Responsibility**: Test verifies one behavior
- [ ] **Readable**: Test intent is clear
- [ ] **Deterministic**: Test always produces same results
- [ ] **Isolated**: Test doesn't depend on other tests
- [ ] **Fast**: Test runs quickly

### Async Handling
- [ ] **Proper Await**: All async operations properly awaited
- [ ] **Error Testing**: Proper use of `rejects.toThrow` for errors
- [ ] **Timeout Handling**: Long-running operations have timeouts

### Cleanup
- [ ] **Mock Cleanup**: Mock cleanup in `afterEach` if needed
- [ ] **Resource Cleanup**: Proper cleanup of resources
- [ ] **No Leaks**: Test doesn't leak resources

---

## Common Pitfalls and Solutions

### Pitfall 1: Testing Implementation Details

**Problem**: Tests verify internal mechanics instead of behavior

```javascript
// BAD: Tests how something is implemented
expect(connection.connect).toHaveBeenCalled();
expect(logger.info).toHaveBeenCalledWith('Connected');
```

**Solution**: Test observable outcomes

```javascript
// GOOD: Tests what happens
expectServerConnected(hub, 'server1');
expect(result.success).toBe(true);
```

---

### Pitfall 2: Over-Specification

**Problem**: Tests are too specific and break with any change

```javascript
// BAD: Too specific
expect(result).toEqual({ data: 'exact', format: 'specific' });
```

**Solution**: Test only what matters

```javascript
// GOOD: Test only important aspects
expect(result.data).toBe('exact');
expect(result).toHaveProperty('data');
```

---

### Pitfall 3: Incomplete Mocks

**Problem**: Mocks missing methods cause test failures

```javascript
// BAD: Incomplete mock
const connection = { callTool: vi.fn() };
```

**Solution**: Use complete mock factories

```javascript
// GOOD: Complete mock
const connection = createMockConnection();
```

---

### Pitfall 4: Testing Multiple Behaviors

**Problem**: One test verifies multiple unrelated behaviors

```javascript
// BAD: Tests multiple behaviors
it("should connect, call tool, and read resource", async () => {
  await hub.connectServer(...);
  await hub.callTool(...);
  await hub.readResource(...);
});
```

**Solution**: One behavior per test

```javascript
// GOOD: One behavior per test
it("should connect server", async () => { ... });
it("should call tool", async () => { ... });
it("should read resource", async () => { ... });
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Test Failure Analysis](../claudedocs/Test_Failure_Analysis.md)
- [Test Plan](../claudedocs/TEST_PLAN.md)
- [MCPHub Test Analysis](../claudedocs/MCPHub_Test_Analysis.md)
- Helper utilities: 
  - `tests/helpers/mocks.js`
  - `tests/helpers/fixtures.js`
  - `tests/helpers/assertions.js`

---

## Quick Reference

### Import Helpers
```javascript
import { createMockConnection } from '@helpers/mocks';
import { createTestConfig } from '@helpers/fixtures';
import { expectServerConnected } from '@helpers/assertions';
```

### Common Patterns
```javascript
// Basic test structure
it("should [behavior] when [condition]", async () => {
  // ARRANGE
  const config = createTestConfig({ ... });
  const mock = createMockConnection({ ... });
  
  // ACT
  const result = await action();
  
  // ASSERT
  expectServerConnected(hub, 'server1');
});
```

### Common Assertions
```javascript
// Server state
expectServerConnected(hub, 'server1');
expectServerDisconnected(hub, 'server1');

// Operation results
expectToolCallSuccess(result);
expectResourceReadSuccess(result);

// Error handling
expectServerError(error, 'SERVER_ERROR', 'server1');
```

---

**Remember**: Test WHAT your code does, not HOW it does it.

