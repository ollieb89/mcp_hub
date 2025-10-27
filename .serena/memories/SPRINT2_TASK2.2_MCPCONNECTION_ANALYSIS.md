# Sprint 2 Task 2.2: MCPConnection.test.js Analysis

## Status: Analysis Complete (2025-01-27)

### Test File
- **File**: `tests/MCPConnection.test.js`
- **Total Tests**: 32
- **Current Status**: 6 passing, 26 failing

### Critical Issue
**Root Cause**: Missing `type: 'stdio'` in transport configuration

All 26 failing tests fail because `connect()` tries to create a real transport without proper configuration. The error is "Invalid URL" because the transport creation fails.

### Test Categories

#### Connection Lifecycle (17 tests - 12 failing)
- Missing transport type causes "Invalid URL" errors
- Tests need proper `type: 'stdio'` in config

#### Tool Execution (5 tests - all failing)
- Cannot connect to test tools
- Need proper transport mock setup

#### Resource Access (6 tests - all failing)
- Cannot connect to test resources
- Need proper transport mock setup

#### Server Info (3 tests - all failing)
- Cannot fetch server info without connection
- Need proper transport mock setup

#### Capability Discovery (2 tests - 1 failing)
- Cannot connect to discover capabilities
- Need proper transport mock setup

### Required Fixes

#### 1. Add Transport Type to Config
```javascript
mockConfig = {
  type: 'stdio',  // CRITICAL: Add this
  command: "test-server",
  args: ["--port", "3000"],
  env: { TEST_ENV: "value" },
};
```

#### 2. Create Helper Fixtures
Add to `tests/helpers/fixtures.js`:
- `createConnectionConfig()` - Connection configuration
- `createMockTransport()` - Mock transport object
- `createMockClient()` - Mock client object

#### 3. Add Helper Assertions
Add to `tests/helpers/assertions.js`:
- `expectConnectionStatus()` - Verify connection state
- `expectConnectionTools()` - Verify tools count
- `expectConnectionResources()` - Verify resources count

#### 4. Fix Client Mock
`Client.connect()` should accept and store transport parameter:
```javascript
Client: vi.fn(() => ({
  connect: vi.fn().mockImplementation(async (transport) => {
    client.transport = transport;
    return undefined;
  }),
  // ... other methods
}))
```

### Transformation Strategy

**Priority Order**:
1. Connection Lifecycle (12 tests) - Fix transport config first
2. Tool Execution (5 tests) - Use tool fixtures
3. Resource Access (6 tests) - Use resource fixtures
4. Server Info (3 tests) - Use capability fixtures

### Key Files Modified
- `tests/MCPConnection.test.js` - Add transport type to all configs
- `tests/helpers/fixtures.js` - Add connection fixtures
- `tests/helpers/assertions.js` - Add connection assertions

### Estimated Time
~3 hours total:
- Helper utilities: 30 min
- Fix transport config: 15 min
- Transform Connection Lifecycle: 60 min
- Transform Tool/Resource tests: 45 min
- Transform Server Info: 20 min

### Patterns to Apply
- Use `createConnectionConfig()` helper for all test configs
- Add `type: 'stdio'` to all mock configs
- Use fixture helpers for tools/resources/prompts
- Use assertion helpers for connection state
- Follow AAA pattern with behavior-focused assertions

### Documentation
Full analysis document: `claudedocs/SPRINT2_TASK2.2_ANALYSIS.md`

### Next Steps
1. Add helper fixtures to `tests/helpers/fixtures.js`
2. Add assertion helpers to `tests/helpers/assertions.js`
3. Fix transport configuration in all tests
4. Transform tests category by category
5. Verify all 32 tests passing
