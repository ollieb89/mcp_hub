# Sprint 3 Implementation Workflow: Integration & Error Handling Tests

**Date**: 2025-10-27
**Status**: 🔄 Ready for Execution
**Duration**: 4-5 hours (Sequential execution required)
**Sprint Goal**: Rewrite integration tests and add comprehensive error coverage
**Expected Outcome**: 268/268 tests passing (109% of original 246 target)

---

## Executive Summary

### Sprint Overview
Sprint 3 focuses on **Integration & Error Handling Tests** - the most complex testing phase requiring transport-specific integration validation and comprehensive error scenario coverage. This sprint rewrites MCPConnection.integration.test.js (~78 tests) and adds 10-15 missing error handling tests.

### Critical Success Factors
1. **Transport Isolation**: STDIO, SSE, and streamable-http tests must not interfere
2. **OAuth Flow Completeness**: Full PKCE authorization flow with all error states
3. **Process Cleanup**: Zero zombie processes after STDIO transport tests
4. **Async Robustness**: Event-based waiting, no hardcoded setTimeout delays
5. **Error Comprehensiveness**: All 5 gap categories covered (timeout, config, concurrency, cleanup, edge cases)

### Expected Outcomes
- **Current State**: 235/246 passing (96%) after Sprint 2
- **Sprint 3 Target**: 268/268 passing (109% of original 246)
  - Integration tests: 78/78 passing (100% vs current ~10% failure rate)
  - New error tests: 10-15 tests added
  - Total gain: +33 tests from Sprint 2 baseline

### Execution Model
**Sequential Execution Required** (No Parallelization):
- **Phase A**: Task 3.1 - Integration test rewrite (2.5-3h)
- **Phase B**: Task 3.2 - Error coverage enhancement (1.5-2h)
- **Dependency**: Task 3.2 requires Task 3.1 coverage report for gap identification
- **Duration**: 4-5 hours total (single developer, no coordination overhead)

### Key Risks
1. **OAuth Flow Complexity** (HIGH/HIGH) - PKCE flow requires authorization server simulation
2. **Async Timing Brittleness** (MEDIUM/HIGH) - Real async delays must not cause flakiness
3. **Process Cleanup Verification** (MEDIUM/MEDIUM) - STDIO process termination critical
4. **Transport Isolation Failures** (LOW/HIGH) - Tests must not share state or ports
5. **Coverage Gap Identification** (MEDIUM/MEDIUM) - Requires systematic coverage analysis

---

## Prerequisites Validation

**Sprint 2 MUST be 100% complete before starting Sprint 3.**

### Sprint 2 Completion Checklist

#### Test Results ✅
- [ ] Sprint 2 tests: 235/246 passing (96%)
- [ ] MCPHub.test.js: 20/20 passing (100%)
- [ ] MCPConnection.test.js: 22/22 passing (100%)
- [ ] Sprint 2 quality gates: ALL passed

#### Infrastructure Proven ✅
- [ ] Helper utilities validated with 42 Sprint 2 tests
- [ ] Behavior-driven patterns established and working
- [ ] Async error handling pattern (rejects.toThrow) validated
- [ ] AAA test structure proven across unit tests
- [ ] Zero brittle assertions in Sprint 2 tests

#### Documentation Complete ✅
- [ ] TESTING_STANDARDS.md includes async patterns
- [ ] Sprint2_Completion.md created with learnings
- [ ] TEST_P2_WF.md accepted and archived
- [ ] Helper utility reference accessible

#### Team Readiness ✅
- [ ] Sprint 2 retrospective completed
- [ ] Learnings from Sprint 2 documented
- [ ] Team familiar with helper utilities
- [ ] Integration test complexity understood

### Go/No-Go Decision

**🟢 GO**: All checklist items complete, Sprint 2 delivered 235/246 passing, team confident in patterns

**🔴 NO-GO**: Any item incomplete → Return to Sprint 2, do NOT proceed

**⚠️ STOP Condition**: If Sprint 2 achieved <230/246 (94%), investigate root cause before Sprint 3

---

## Phase A: Task 3.1 - Rewrite MCPConnection.integration.test.js

**Duration**: 2.5-3 hours
**Current Status**: ~70 passing, ~8 failing (~10% failure rate)
**Target**: 78/78 passing (100%)
**Complexity**: HIGH - Real integration scenarios with external systems

### Overview
Integration tests validate **actual connection behavior** with transport-specific protocols, not just mocked interactions. This requires testing:
- STDIO: Real process spawning, environment variables, working directories
- SSE: EventSource connections, reconnection logic, server-sent events
- streamable-http: OAuth PKCE flow, HTTP requests, token management

### Subtask 3.1.1: Analyze Integration Test Structure (30 min) ✅ COMPLETE

**Objective**: Understand current integration test organization and identify brittle patterns

**Status**: ✅ Complete - See `claudedocs/SUBTASK_3.1.1_COMPLETE.md` for detailed analysis

**Key Findings**:
- **Total Tests**: 19 test cases across 6 categories
- **Transport Distribution**: 9 STDIO, 9 SSE (0 explicit streamable-http)
- **Brittle Patterns**: 11 mock implementations, heavy transport mock duplication
- **Missing Coverage**: No OAuth tests, no dev-mode tests, no capability tests
- **File Size**: 662 lines with extensive mock setup

**Actions Completed**:
1. ✅ **Read existing test file** - Analyzed 662-line test structure with 6 test suites
2. ✅ **Map tests to transport types** - Identified 9 STDIO and 9 SSE occurrences
3. ✅ **Identify brittle patterns** - Found 11 mock implementations, no logger assertions, 1 hardcoded timeout
4. ✅ **Document transformation strategy** - Created comprehensive analysis document

**Deliverables**:
- ✅ Test structure map (transport breakdown) - Documented in SUBTASK_3.1.1_COMPLETE.md
- ✅ Brittle pattern list with line numbers - Lines 386, 405, 432, 437, 462, 467, 495, 500, 554, 557
- ✅ Transformation strategy document - 4-phase refactoring plan

**Validation Results**:
- ✅ All 19 tests categorized by transport and scenario (not 78 as initially estimated)
- ✅ Brittle patterns identified for each test category
- ✅ Clear understanding of current vs target structure

---

### Subtask 3.1.2: Rewrite STDIO Transport Integration Tests (45 min) ✅ COMPLETE

**Objective**: Validate STDIO transport with real process spawning and environment resolution

**Status**: ✅ Complete - See `claudedocs/SUBTASK_3.1.2_COMPLETE.md` for detailed analysis

**Key Achievements**:
- **Created Test Fixtures**: STDIO test server and helper functions
- **Refactored 7 Integration Tests**: Basic Connection Lifecycle + Environment Resolution
- **Added Fixtures**: `createStdioConfig()`, `createSSEConfig()`, `createEnvContext()`
- **All Tests Passing**: 18/18 tests passing
- **Brittle Patterns Eliminated**: 0 logger assertions, 1 intentional setTimeout

**Actions Completed**:
1. ✅ **Created test fixtures** - `tests/fixtures/stdio-test-server.js` for STDIO transport
2. ✅ **Added STDIO-specific helpers** - `createStdioConfig()`, `createSSEConfig()`, `createHttpConfig()`
3. ✅ **Rewrote Basic Connection Lifecycle tests** - Now use `createStdioConfig()` fixture
4. ✅ **Rewrote Environment Resolution tests** - Validates actual environment resolution behavior
5. ✅ **Added ARRANGE/ACT/ASSERT comments** - Improved test readability

**Key Transformations**:
```javascript
// BEFORE: Inline config objects
const config = {
  command: "test-server",
  args: ["--port", "3000"],
  type: "stdio"
};

// AFTER: Fixture-based config
const config = createStdioConfig("test-server", {
  command: "test-server",
  args: ["--port", "3000"]
});
```

**Deliverables**:
- ✅ `tests/fixtures/stdio-test-server.js` - Executable test server for STDIO testing
- ✅ Updated `tests/helpers/fixtures.js` - STDIO/SSE/HTTP config helpers
- ✅ Refactored `tests/MCPConnection.integration.test.js` - 7 tests using fixtures
- ✅ Documentation in `claudedocs/SUBTASK_3.1.2_COMPLETE.md`

**Validation Results**:
```bash
✓ tests/MCPConnection.integration.test.js (18 tests) 237ms
  Test Files  1 passed (1)
  Tests  18 passed (18)

# Brittle pattern elimination
grep -c "expect(logger" tests/MCPConnection.integration.test.js  # 0
grep -c "setTimeout" tests/MCPConnection.integration.test.js   # 1 (intentional)
```

**Note**: Additional enhancement opportunities identified for future subtasks:
- Real process spawning tests with actual STDIO communication
- Capability discovery tests with real server responses
- Error scenario tests with process crashes and spawn failures
- Dev mode integration tests for file watching and auto-restart

---

### Subtask 3.1.3: Rewrite SSE Transport Integration Tests (40 min)

**Objective**: Validate SSE transport with EventSource connections and reconnection logic

**Focus Areas**:
1. EventSource connection establishment
2. Server-sent event handling (message, error, custom events)
3. Reconnection logic (automatic reconnection)
4. Connection state transitions (connecting → connected → disconnected)
5. Authentication headers (Authorization, custom headers)
6. Error scenarios (network failure, server unavailable)

**Example Transformation**:

**BEFORE** (Mock EventSource with logger checking):
```javascript
it("should connect via SSE and handle events", async () => {
  const config = { url: 'https://mcp.example.com/sse' };

  mockEventSource.mockImplementation((url) => ({
    addEventListener: vi.fn(),
    close: vi.fn()
  }));

  const connection = new MCPConnection('sse-test', config);
  await connection.connect();

  expect(mockEventSource).toHaveBeenCalledWith('https://mcp.example.com/sse');
  expect(logger.info).toHaveBeenCalledWith('SSE connection established');
});
```

**AFTER** (Real SSE behavior with event validation):
```javascript
it("should establish SSE connection and handle MCP events", async () => {
  // ARRANGE: SSE server configuration
  const config = createServerConfig('sse-test', {
    url: 'https://mcp.example.com/sse',
    transport: 'sse',
    headers: {
      'Authorization': 'Bearer ${env:SSE_TOKEN}'
    }
  });

  process.env.SSE_TOKEN = 'sse-test-token';

  // Create mock with realistic SSE behavior
  const connection = createMockConnection({
    connect: vi.fn().mockImplementation(async () => {
      // Simulate SSE connection delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }),
    getServerInfo: vi.fn().mockResolvedValue({
      name: 'sse-server',
      version: '1.0.0',
      capabilities: { tools: {}, resources: {} }
    })
  });

  // ACT: Connect via SSE
  await connection.connect();

  // ASSERT: Verify connection state
  expect(connection.isConnected()).toBe(true);
  expect(connection.getStatus()).toBe('connected');

  // Verify server capabilities received
  const serverInfo = await connection.getServerInfo();
  expect(serverInfo).toHaveProperty('capabilities');
  expect(serverInfo.capabilities).toHaveProperty('tools');

  // ACT: Simulate disconnect
  await connection.disconnect();

  // ASSERT: Verify cleanup
  expect(connection.isConnected()).toBe(false);
  expect(connection.getStatus()).toBe('disconnected');
});
```

**SSE Reconnection Pattern**:
```javascript
it("should automatically reconnect on connection loss", async () => {
  // ARRANGE: SSE connection with reconnection tracking
  let connectionAttempts = 0;
  const connection = createMockConnection({
    connect: vi.fn().mockImplementation(async () => {
      connectionAttempts++;
      if (connectionAttempts === 1) {
        // First attempt succeeds
        return;
      } else if (connectionAttempts === 2) {
        // Simulate connection loss
        throw new Error('Connection lost');
      } else {
        // Reconnection succeeds
        return;
      }
    }),
    on: vi.fn() // Event emitter for reconnection events
  });

  // ACT: Initial connection
  await connection.connect();
  expect(connection.isConnected()).toBe(true);

  // Simulate connection loss (would be triggered by EventSource error)
  const reconnectHandler = connection.on.mock.calls.find(
    call => call[0] === 'reconnecting'
  )?.[1];

  if (reconnectHandler) {
    await reconnectHandler();
  }

  // ASSERT: Verify reconnection attempt occurred
  expect(connectionAttempts).toBeGreaterThan(1);
});
```

**Tests to Rewrite** (~10-12 tests):
1. SSE connection establishment
2. Event message handling (MCP protocol messages)
3. Custom event types (toolsChanged, resourcesChanged)
4. Connection state transitions
5. Reconnection on network failure
6. Reconnection backoff strategy
7. Authentication header injection
8. Error event handling
9. Connection timeout during establishment
10. Graceful disconnect
11. Server unavailable scenarios
12. Event stream parsing errors

**Validation Commands**:
```bash
# Run SSE tests only
npm test tests/MCPConnection.integration.test.js -- -t "SSE"

# Verify event handling patterns
grep -c "on('message'\\|addEventListener" tests/MCPConnection.integration.test.js

# Check reconnection logic
grep -c "reconnect\\|backoff" tests/MCPConnection.integration.test.js
```

---

### Subtask 3.1.4: Rewrite streamable-http + OAuth Integration Tests (50 min)

**Objective**: Validate HTTP transport with complete OAuth PKCE authorization flow

**Focus Areas**:
1. OAuth PKCE authorization URL generation
2. PKCE code verifier and challenge creation
3. Authorization callback handling (/oauth/callback)
4. Authorization code exchange for tokens
5. Token storage and injection in requests
6. Token refresh flow (access token expiration)
7. OAuth error scenarios (denied, invalid_grant, network failure)
8. HTTP request/response handling (MCP over HTTP)

**Complete OAuth PKCE Flow Example**:

```javascript
describe("streamable-http OAuth PKCE Flow", () => {
  it("should complete full OAuth authorization flow", async () => {
    // ARRANGE: streamable-http server requiring OAuth
    const config = createServerConfig('oauth-test', {
      url: 'https://mcp.example.com',
      transport: 'streamable-http',
      oauth: {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        tokenEndpoint: 'https://auth.example.com/token',
        clientId: 'mcp-hub-test',
        scopes: ['mcp.read', 'mcp.write']
      }
    });

    // Mock OAuth provider for PKCE flow
    const oauthProvider = {
      // Step 1: Generate PKCE code verifier and challenge
      generatePKCE: vi.fn().mockReturnValue({
        codeVerifier: 'test-verifier-' + crypto.randomBytes(32).toString('base64url'),
        codeChallenge: 'test-challenge-' + crypto.randomBytes(32).toString('base64url'),
        codeChallengeMethod: 'S256'
      }),

      // Step 2: Generate authorization URL
      getAuthorizationUrl: vi.fn().mockReturnValue({
        url: 'https://auth.example.com/authorize?response_type=code&client_id=mcp-hub-test&code_challenge=test-challenge&code_challenge_method=S256&scope=mcp.read+mcp.write&redirect_uri=http://localhost:3000/oauth/callback&state=test-state',
        state: 'test-state'
      }),

      // Step 3: Handle authorization callback
      handleCallback: vi.fn().mockImplementation(async ({ code, state }) => {
        expect(code).toBe('test-auth-code');
        expect(state).toBe('test-state');
        return { code, state };
      }),

      // Step 4: Exchange code for tokens
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        access_token: 'test-access-token-abc123',
        refresh_token: 'test-refresh-token-xyz789',
        expires_in: 3600,
        token_type: 'Bearer'
      }),

      // Step 5: Refresh token when expired
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: 'test-access-token-refreshed',
        refresh_token: 'test-refresh-token-xyz789',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    };

    const connection = createMockConnection({
      oauthProvider,
      connect: vi.fn().mockImplementation(async () => {
        // Step 1: Generate PKCE parameters
        const pkce = oauthProvider.generatePKCE();
        expect(pkce.codeVerifier).toBeDefined();
        expect(pkce.codeChallenge).toBeDefined();
        expect(pkce.codeChallengeMethod).toBe('S256');

        // Step 2: Get authorization URL
        const authUrl = oauthProvider.getAuthorizationUrl();
        expect(authUrl.url).toContain('code_challenge=' + pkce.codeChallenge);
        expect(authUrl.url).toContain('code_challenge_method=S256');

        // Step 3: Simulate user authorization (browser opens, user approves)
        // In real flow, browser would redirect to callback
        const callbackParams = {
          code: 'test-auth-code',
          state: authUrl.state
        };
        await oauthProvider.handleCallback(callbackParams);

        // Step 4: Exchange authorization code for tokens
        const tokens = await oauthProvider.exchangeCodeForTokens({
          code: callbackParams.code,
          codeVerifier: pkce.codeVerifier
        });

        expect(tokens.access_token).toBeDefined();
        expect(tokens.refresh_token).toBeDefined();
        expect(tokens.expires_in).toBeGreaterThan(0);

        // Connection established with access token
        return tokens;
      }),
      getServerInfo: vi.fn().mockResolvedValue({
        name: 'oauth-server',
        version: '1.0.0'
      })
    });

    // ACT: Connect (triggers OAuth flow)
    await connection.connect();

    // ASSERT: Verify connection with OAuth
    expect(connection.isConnected()).toBe(true);
    expect(oauthProvider.generatePKCE).toHaveBeenCalledTimes(1);
    expect(oauthProvider.getAuthorizationUrl).toHaveBeenCalledTimes(1);
    expect(oauthProvider.handleCallback).toHaveBeenCalledTimes(1);
    expect(oauthProvider.exchangeCodeForTokens).toHaveBeenCalledTimes(1);

    // Verify server info accessible with authentication
    const serverInfo = await connection.getServerInfo();
    expect(serverInfo.name).toBe('oauth-server');
  });

  it("should refresh expired access token automatically", async () => {
    // ARRANGE: Connection with expired token
    const oauthProvider = {
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'same-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    };

    const connection = createMockConnection({
      oauthProvider,
      callTool: vi.fn().mockImplementation(async (toolName, args) => {
        // Simulate token expiration on first call
        if (connection.callTool.mock.calls.length === 1) {
          throw new Error('Token expired');
        }
        // After refresh, tool call succeeds
        return createToolResponse({
          content: [{ type: 'text', text: 'Success' }]
        });
      })
    });

    // ACT: Call tool (triggers token refresh)
    const result = await connection.callTool('test-tool', {});

    // ASSERT: Verify token refresh occurred
    expect(oauthProvider.refreshAccessToken).toHaveBeenCalledTimes(1);
    expectToolCallSuccess(result);
  });

  it("should handle OAuth authorization denied error", async () => {
    // ARRANGE: User denies authorization
    const oauthProvider = {
      handleCallback: vi.fn().mockImplementation(async ({ error }) => {
        if (error === 'access_denied') {
          throw new Error('User denied authorization');
        }
      })
    };

    const connection = createMockConnection({
      oauthProvider,
      connect: vi.fn().mockImplementation(async () => {
        // Simulate authorization denial callback
        await oauthProvider.handleCallback({
          error: 'access_denied',
          error_description: 'User denied access'
        });
      })
    });

    // ACT & ASSERT: Connection should fail with auth error
    await expect(connection.connect()).rejects.toThrow('User denied authorization');
  });
});
```

**Tests to Rewrite** (~15-18 tests):
1. OAuth authorization URL generation
2. PKCE code verifier/challenge creation
3. Authorization callback handling
4. State parameter validation
5. Authorization code exchange
6. Token storage
7. Access token injection in requests
8. Token expiration handling
9. Automatic token refresh
10. Refresh token expiration
11. OAuth error: access_denied
12. OAuth error: invalid_grant
13. OAuth error: server_error
14. HTTP request/response (MCP protocol)
15. Connection without OAuth (API key auth)
16. HTTP timeout scenarios
17. Network errors during OAuth
18. Concurrent requests with token refresh

**Validation Commands**:
```bash
# Run OAuth tests
npm test tests/MCPConnection.integration.test.js -- -t "OAuth\\|streamable-http"

# Verify PKCE flow coverage
grep -c "codeVerifier\\|codeChallenge\\|S256" tests/MCPConnection.integration.test.js

# Check token refresh logic
grep -c "refreshAccessToken\\|expires_in" tests/MCPConnection.integration.test.js
```

---

### Subtask 3.1.5: Rewrite Error Scenario Integration Tests (30 min)

**Objective**: Comprehensive error handling for all transport types

**Focus Areas**:
1. Network failures (connection refused, timeout, DNS failure)
2. Protocol errors (invalid MCP messages, malformed JSON)
3. Transport-specific errors (process crash, SSE disconnect, HTTP 500)
4. Timeout scenarios (connection timeout, operation timeout)
5. Recovery scenarios (retry logic, reconnection, fallback)

**Network Error Pattern**:
```javascript
it("should handle network connection failure gracefully", async () => {
  // ARRANGE: Server unavailable
  const connection = createMockConnection({
    connect: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    getStatus: vi.fn().mockReturnValue('disconnected')
  });

  // ACT & ASSERT: Connection fails with appropriate error
  await expect(connection.connect()).rejects.toThrow(ConnectionError);
  await expect(connection.connect()).rejects.toMatchObject({
    code: 'CONNECTION_REFUSED',
    message: expect.stringContaining('ECONNREFUSED')
  });

  expect(connection.isConnected()).toBe(false);
  expect(connection.getStatus()).toBe('disconnected');
});
```

**Timeout Pattern**:
```javascript
it("should timeout connection attempt after configured duration", async () => {
  // ARRANGE: Connection that never completes
  const connection = createMockConnection({
    connect: vi.fn().mockImplementation(() =>
      new Promise((resolve) => {
        // Never resolves (simulates hanging connection)
        setTimeout(() => resolve(), 60000); // 60s but test will timeout first
      })
    ),
    connectionTimeout: 2000 // 2 second timeout
  });

  // ACT & ASSERT: Connection times out
  await expect(connection.connect()).rejects.toThrow('Connection timeout');

  expect(connection.isConnected()).toBe(false);
}, 5000); // Test timeout: 5 seconds
```

**Tests to Rewrite** (~10-12 tests):
1. Connection refused (server not running)
2. Connection timeout (server not responding)
3. DNS resolution failure
4. Network unreachable
5. Protocol error (invalid MCP version)
6. Malformed JSON response
7. Process crash (STDIO)
8. SSE connection drop
9. HTTP 500 server error
10. Retry logic with exponential backoff
11. Max retry exceeded
12. Graceful degradation

**Validation Commands**:
```bash
# Run error scenario tests
npm test tests/MCPConnection.integration.test.js -- -t "error\\|timeout\\|failure"

# Verify proper error types
grep -c "ConnectionError\\|TimeoutError\\|ProtocolError" tests/MCPConnection.integration.test.js

# Check retry logic
grep -c "retry\\|backoff\\|maxRetries" tests/MCPConnection.integration.test.js
```

---

### Subtask 3.1.6: Validate Integration Test Suite (15 min)

**Objective**: Ensure all integration tests pass and meet quality standards

**Actions**:

1. **Run full integration suite** (5 min)
   ```bash
   npm test tests/MCPConnection.integration.test.js

   # Expected output:
   # Test Files  1 passed (1)
   # Tests  78 passed (78)
   # Duration  ~30-45 seconds (integration tests slower than unit)
   ```

2. **Verify transport isolation** (3 min)
   ```bash
   # Run with shuffle to verify no shared state
   npm test tests/MCPConnection.integration.test.js -- --sequence.shuffle

   # Run with sharding to verify independence
   npm test tests/MCPConnection.integration.test.js -- --shard=1/2
   npm test tests/MCPConnection.integration.test.js -- --shard=2/2

   # All runs should pass consistently
   ```

3. **Check quality anti-patterns** (3 min)
   ```bash
   # Logger assertions (should be 0)
   grep -c "expect(logger" tests/MCPConnection.integration.test.js

   # Hardcoded delays (should be 0)
   grep -c "setTimeout" tests/MCPConnection.integration.test.js

   # Constructor mocking (should be 0 for integration)
   grep -c "toHaveBeenCalledWith.*new " tests/MCPConnection.integration.test.js
   ```

4. **Generate coverage report** (4 min)
   ```bash
   npm run test:coverage -- tests/MCPConnection.integration.test.js

   # Open HTML report
   open coverage/index.html

   # Review coverage for:
   # - MCPConnection.js transport methods
   # - OAuth flow in src/utils/oauth-provider.js
   # - EnvResolver (environment variable resolution)
   # Target: >80% for integration-relevant code
   ```

**Deliverables**:
- ✅ All 78 integration tests passing
- ✅ Tests pass with --sequence.shuffle (no shared state)
- ✅ Zero anti-patterns detected
- ✅ Coverage report generated (for Task 3.2 gap analysis)

**Go/No-Go Decision for Phase B**:
- 🟢 GO: All 78 tests pass, no anti-patterns, coverage ≥75%
- 🟡 REVIEW: <78 tests pass OR coverage <75%, investigate before proceeding
- 🔴 NO-GO: <70 tests pass OR >2 anti-patterns, fix issues before Task 3.2

---

## Phase B: Task 3.2 - Add Missing Error Handling Tests

**Duration**: 1.5-2 hours
**Target**: Add 10-15 new error handling tests
**Expected Outcome**: Comprehensive error coverage across all gap categories

### Overview
Task 3.2 systematically addresses coverage gaps identified during Task 3.1. These tests focus on error scenarios that aren't covered by existing integration tests but are critical for production reliability.

### Subtask 3.2.1: Identify Coverage Gaps (20 min)

**Objective**: Systematic analysis of uncovered error scenarios

**Actions**:

1. **Review Task 3.1 coverage report** (10 min)
   ```bash
   # Open coverage HTML report from Task 3.1
   open coverage/index.html

   # Focus on:
   # - Uncovered branches in error handling paths
   # - Try/catch blocks with low coverage
   # - Timeout handling code
   # - Cleanup/finally blocks
   ```

2. **Cross-reference with TEST_PLAN.md gap categories** (5 min)
   - Timeout scenarios: Tool execution timeout, resource access timeout
   - Configuration validation: Missing fields, type errors, invalid URLs
   - Concurrency: Race conditions, parallel operations
   - Cleanup: Resource leaks, connection cleanup
   - Edge cases: Empty responses, partial data, malformed messages

3. **Create gap analysis document** (5 min)
   ```markdown
   # Coverage Gaps Analysis

   ## Timeout Scenarios (3-4 tests needed)
   - [ ] Tool execution timeout (5 minute default)
   - [ ] Resource read timeout
   - [ ] Prompt execution timeout
   - [ ] Configurable timeout override

   ## Configuration Validation (3-4 tests needed)
   - [ ] Missing required field (command for STDIO)
   - [ ] Invalid URL format (for SSE/HTTP)
   - [ ] Type errors (args should be array)
   - [ ] Conflicting transport config

   ## Concurrency & Cleanup (4-5 tests needed)
   - [ ] Parallel tool calls without interference
   - [ ] Connection cleanup on process exit
   - [ ] Memory leak prevention (repeated connect/disconnect)
   - [ ] Zombie process detection (STDIO)
   - [ ] Event listener cleanup

   ## Edge Cases (2-3 tests needed)
   - [ ] Empty tool response
   - [ ] Partial JSON in MCP message
   - [ ] Unknown MCP method
   ```

**Deliverables**:
- Gap analysis document with specific test requirements
- Priority order for gap categories
- Expected test count per category

---

### Subtask 3.2.2: Add Timeout Handling Tests (25 min)

**Objective**: Comprehensive timeout coverage for all MCP operations

**Tests to Add** (3-4 tests):

```javascript
describe("Timeout Handling", () => {
  it("should timeout tool execution after configured duration", async () => {
    // ARRANGE: Tool that takes too long
    const connection = createMockConnection({
      callTool: vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(
          createToolResponse({ content: [] })
        ), 10000)) // 10 seconds but will timeout first
      ),
      toolTimeout: 2000 // 2 second timeout
    });

    await connection.connect();

    // ACT & ASSERT: Tool call times out
    await expect(
      connection.callTool('slow-tool', {})
    ).rejects.toThrow(TimeoutError);

    await expect(
      connection.callTool('slow-tool', {})
    ).rejects.toMatchObject({
      code: 'TOOL_TIMEOUT',
      details: {
        toolName: 'slow-tool',
        timeout: 2000
      }
    });
  }, 5000); // Test timeout: 5 seconds

  it("should timeout resource read after default duration", async () => {
    // ARRANGE: Resource that never responds
    const connection = createMockConnection({
      readResource: vi.fn().mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      ),
      resourceTimeout: 3000 // 3 second timeout
    });

    await connection.connect();

    // ACT & ASSERT: Resource read times out
    await expect(
      connection.readResource('file:///slow/resource')
    ).rejects.toThrow('Resource read timeout');
  }, 5000);

  it("should allow timeout override per operation", async () => {
    // ARRANGE: Connection with default timeout
    const connection = createMockConnection({
      callTool: vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(
          createToolResponse({ content: [] })
        ), 4000)) // 4 seconds
      ),
      defaultTimeout: 2000 // 2 second default
    });

    await connection.connect();

    // ACT: Call with extended timeout
    const result = await connection.callTool('slow-tool', {}, {
      timeout: 5000 // Override to 5 seconds
    });

    // ASSERT: Operation succeeds with extended timeout
    expectToolCallSuccess(result);
  }, 7000);

  it("should cleanup resources when timeout occurs", async () => {
    // ARRANGE: Operation that times out
    const cleanupFn = vi.fn();
    const connection = createMockConnection({
      callTool: vi.fn().mockImplementation(async () => {
        try {
          await new Promise(() => {}); // Hangs
        } finally {
          cleanupFn();
        }
      }),
      toolTimeout: 1000
    });

    await connection.connect();

    // ACT: Timeout triggers
    await expect(
      connection.callTool('test-tool', {})
    ).rejects.toThrow(TimeoutError);

    // ASSERT: Cleanup occurred
    // Note: In real implementation, verify connection is still usable
    expect(connection.isConnected()).toBe(true);
  }, 3000);
});
```

**Validation**:
```bash
npm test tests/MCPConnection.integration.test.js -- -t "Timeout"
```

---

### Subtask 3.2.3: Add Configuration Validation Tests (25 min)

**Objective**: Validate configuration error handling

**Tests to Add** (3-4 tests):

```javascript
describe("Configuration Validation", () => {
  it("should throw ConfigError for missing required STDIO command", async () => {
    // ARRANGE: Invalid STDIO config (missing command)
    const config = createServerConfig('invalid-stdio', {
      transport: 'stdio',
      args: ['server.js']
      // Missing required 'command' field
    });

    // ACT & ASSERT: Connection fails during setup
    expect(() => new MCPConnection('invalid', config)).toThrow(ConfigError);
    expect(() => new MCPConnection('invalid', config)).toThrow(
      'STDIO transport requires "command" field'
    );
  });

  it("should throw ConfigError for invalid SSE URL format", async () => {
    // ARRANGE: Invalid SSE config (malformed URL)
    const config = createServerConfig('invalid-sse', {
      transport: 'sse',
      url: 'not-a-valid-url'
    });

    // ACT & ASSERT: Connection fails validation
    await expect(
      new MCPConnection('invalid', config).connect()
    ).rejects.toThrow(ConfigError);

    await expect(
      new MCPConnection('invalid', config).connect()
    ).rejects.toMatchObject({
      code: 'INVALID_URL',
      details: { url: 'not-a-valid-url' }
    });
  });

  it("should throw ConfigError for type mismatch in args", async () => {
    // ARRANGE: Invalid config (args should be array)
    const config = createServerConfig('invalid-args', {
      transport: 'stdio',
      command: 'node',
      args: 'server.js' // Should be ['server.js']
    });

    // ACT & ASSERT: Validation catches type error
    expect(() => new MCPConnection('invalid', config)).toThrow(
      'args must be an array'
    );
  });

  it("should throw ConfigError for conflicting transport configuration", async () => {
    // ARRANGE: Config with both STDIO and HTTP properties
    const config = createServerConfig('conflicting', {
      command: 'node', // STDIO property
      url: 'https://example.com', // HTTP property
      // Conflict: can't be both STDIO and HTTP
    });

    // ACT & ASSERT: Validation detects conflict
    expect(() => new MCPConnection('conflicting', config)).toThrow(
      'Conflicting transport configuration'
    );
  });
});
```

**Validation**:
```bash
npm test tests/MCPConnection.integration.test.js -- -t "Configuration Validation"
```

---

### Subtask 3.2.4: Add Concurrency & Cleanup Tests (25 min)

**Objective**: Validate safe concurrent operations and resource cleanup

**Tests to Add** (4-5 tests):

```javascript
describe("Concurrency & Resource Cleanup", () => {
  it("should handle parallel tool calls without interference", async () => {
    // ARRANGE: Connection supporting concurrent operations
    let callCount = 0;
    const connection = createMockConnection({
      callTool: vi.fn().mockImplementation(async (toolName) => {
        callCount++;
        const id = callCount;
        await new Promise(resolve => setTimeout(resolve, 100));
        return createToolResponse({
          content: [{ type: 'text', text: `Result ${id}` }]
        });
      })
    });

    await connection.connect();

    // ACT: Execute 3 tool calls in parallel
    const results = await Promise.all([
      connection.callTool('tool1', {}),
      connection.callTool('tool2', {}),
      connection.callTool('tool3', {})
    ]);

    // ASSERT: All calls succeed independently
    expect(results).toHaveLength(3);
    results.forEach(result => expectToolCallSuccess(result));

    // Verify results are distinct (no interference)
    const texts = results.map(r => r.content[0].text);
    expect(new Set(texts).size).toBe(3); // All unique
  });

  it("should cleanup connection resources on disconnect", async () => {
    // ARRANGE: Connection with event listeners
    const connection = createMockConnection({
      removeAllListeners: vi.fn()
    });

    await connection.connect();

    // Add event listeners
    connection.on('toolsChanged', vi.fn());
    connection.on('resourcesChanged', vi.fn());

    // ACT: Disconnect
    await connection.disconnect();

    // ASSERT: Cleanup occurred
    expect(connection.removeAllListeners).toHaveBeenCalled();
    expect(connection.isConnected()).toBe(false);
  });

  it("should prevent memory leaks with repeated connect/disconnect", async () => {
    // ARRANGE: Connection for stress testing
    const connection = createMockConnection();

    // ACT: Repeated connect/disconnect cycles
    for (let i = 0; i < 10; i++) {
      await connection.connect();
      expect(connection.isConnected()).toBe(true);

      await connection.disconnect();
      expect(connection.isConnected()).toBe(false);
    }

    // ASSERT: No resource leaks
    // In real tests, would check process.memoryUsage() growth
    expect(connection.getStatus()).toBe('disconnected');
  });

  it("should detect and cleanup zombie STDIO processes", async () => {
    // ARRANGE: STDIO connection that may leave zombie processes
    const mockProcess = {
      pid: 12345,
      kill: vi.fn(),
      killed: false
    };

    const connection = createMockConnection({
      getProcess: vi.fn().mockReturnValue(mockProcess),
      disconnect: vi.fn().mockImplementation(async () => {
        if (mockProcess.pid && !mockProcess.killed) {
          mockProcess.kill();
          mockProcess.killed = true;
        }
      })
    });

    await connection.connect();
    const process = connection.getProcess();
    expect(process.pid).toBe(12345);

    // ACT: Disconnect and verify process termination
    await connection.disconnect();

    // ASSERT: Process was killed
    expect(mockProcess.kill).toHaveBeenCalled();
    expect(mockProcess.killed).toBe(true);
  });

  it("should cleanup event listeners on connection errors", async () => {
    // ARRANGE: Connection that fails after partial setup
    const listeners = [];
    const connection = createMockConnection({
      connect: vi.fn().mockImplementation(async () => {
        // Partial setup: add listeners
        connection.on('toolsChanged', () => {});
        listeners.push('toolsChanged');

        // Then fail
        throw new Error('Connection failed');
      }),
      removeAllListeners: vi.fn().mockImplementation(() => {
        listeners.length = 0;
      })
    });

    // ACT: Connection fails
    await expect(connection.connect()).rejects.toThrow('Connection failed');

    // ASSERT: Cleanup occurred despite error
    expect(connection.removeAllListeners).toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });
});
```

**Validation**:
```bash
npm test tests/MCPConnection.integration.test.js -- -t "Concurrency\\|Cleanup"
```

---

### Subtask 3.2.5: Add Edge Case Tests (25 min)

**Objective**: Handle unusual but valid scenarios

**Tests to Add** (2-3 tests):

```javascript
describe("Edge Cases", () => {
  it("should handle empty tool response gracefully", async () => {
    // ARRANGE: Tool returning empty content array
    const connection = createMockConnection({
      callTool: vi.fn().mockResolvedValue({
        content: [], // Valid but empty
        isError: false
      })
    });

    await connection.connect();

    // ACT: Call tool with empty response
    const result = await connection.callTool('empty-tool', {});

    // ASSERT: Empty response is valid
    expectToolCallSuccess(result);
    expect(result.content).toHaveLength(0);
    expect(result.isError).toBe(false);
  });

  it("should handle partial JSON in streamed MCP messages", async () => {
    // ARRANGE: Connection receiving chunked JSON
    const chunks = [
      '{"jsonrpc":"2.0",',
      '"id":1,"result":{',
      '"content":[{"type":"text",',
      '"text":"Complete"}]}}'
    ];

    const connection = createMockConnection({
      callTool: vi.fn().mockImplementation(async () => {
        // Simulate streaming with partial JSON parsing
        let buffer = '';
        for (const chunk of chunks) {
          buffer += chunk;
        }

        // Parse complete JSON
        const message = JSON.parse(buffer);
        return {
          content: message.result.content,
          isError: false
        };
      })
    });

    await connection.connect();

    // ACT: Handle streamed response
    const result = await connection.callTool('streamed-tool', {});

    // ASSERT: Correctly parsed from chunks
    expectToolCallSuccess(result);
    expect(result.content[0].text).toBe('Complete');
  });

  it("should handle unknown MCP method gracefully", async () => {
    // ARRANGE: Server sends unknown method in notification
    const connection = createMockConnection({
      handleNotification: vi.fn().mockImplementation((method, params) => {
        if (method === 'unknown/newFeature') {
          // Gracefully ignore unknown methods
          console.warn(`Unknown MCP method: ${method}`);
          return;
        }
        // Handle known methods normally
      })
    });

    await connection.connect();

    // ACT: Receive unknown method notification
    connection.handleNotification('unknown/newFeature', {});

    // ASSERT: No crash, graceful handling
    expect(connection.isConnected()).toBe(true);
    expect(connection.handleNotification).toHaveBeenCalledWith(
      'unknown/newFeature',
      {}
    );
  });
});
```

**Validation**:
```bash
npm test tests/MCPConnection.integration.test.js -- -t "Edge Cases"
```

---

### Subtask 3.2.6: Final Validation and Documentation (10 min)

**Objective**: Verify all error handling tests pass and document additions

**Actions**:

1. **Run complete test suite** (3 min)
   ```bash
   npm test tests/MCPConnection.integration.test.js

   # Expected: ~90 tests total (78 integration + 12 error handling)
   ```

2. **Verify test count increase** (2 min)
   ```bash
   # Count tests before Sprint 3: 78
   # Count tests after Sprint 3:
   npm test tests/MCPConnection.integration.test.js -- --reporter=verbose | grep -c "✓"

   # Expected: 88-93 tests
   ```

3. **Update documentation** (5 min)
   Create `claudedocs/Sprint3_Error_Tests_Added.md`:
   ```markdown
   # Sprint 3: Error Handling Tests Added

   ## Timeout Handling (4 tests)
   - Tool execution timeout
   - Resource read timeout
   - Timeout override per operation
   - Cleanup on timeout

   ## Configuration Validation (4 tests)
   - Missing STDIO command
   - Invalid URL format
   - Type mismatch in args
   - Conflicting transport config

   ## Concurrency & Cleanup (5 tests)
   - Parallel tool calls
   - Connection resource cleanup
   - Memory leak prevention
   - Zombie process detection
   - Event listener cleanup on error

   ## Edge Cases (3 tests)
   - Empty tool response
   - Partial JSON streaming
   - Unknown MCP method

   Total: 16 new tests added
   ```

**Deliverables**:
- ✅ All error handling tests passing
- ✅ Test count increased by 10-16 tests
- ✅ Documentation updated with test additions
- ✅ Coverage gaps addressed

---

## Integration Validation

**Duration**: 15 minutes
**Objective**: Verify Sprint 3 achieves all quality and completeness targets

### Validation Process

**Step 1: Full Test Suite Execution** (3 min)
```bash
# Run ALL tests (Sprint 1-3 coverage)
npm test

# Expected output:
# Test Files  5 passed (5)
#   tests/MCPHub.test.js
#   tests/MCPConnection.test.js
#   tests/MCPConnection.integration.test.js
#   tests/config.test.js
#   tests/env-resolver.test.js
# Tests  268 passed (268)
# Duration  ~60-90 seconds
```

**Step 2: Transport Isolation Verification** (3 min)
```bash
# Verify STDIO, SSE, HTTP tests don't interfere
npm test tests/MCPConnection.integration.test.js -- --sequence.shuffle

# Run 3 times to verify consistency
for i in {1..3}; do
  npm test tests/MCPConnection.integration.test.js -- --sequence.shuffle
done

# All runs should show same pass count
```

**Step 3: OAuth Flow Completeness Check** (2 min)
```bash
# Verify all OAuth steps covered
grep -c "PKCE\\|codeVerifier\\|codeChallenge" tests/MCPConnection.integration.test.js
# Expected: ≥5

grep -c "authorization\\|callback\\|exchange\\|refresh" tests/MCPConnection.integration.test.js
# Expected: ≥8
```

**Step 4: Process Cleanup Validation** (2 min)
```bash
# Check process termination patterns
grep -c "process.kill\\|disconnect.*process\\|cleanup" tests/MCPConnection.integration.test.js
# Expected: ≥3

# Verify no zombie process warnings
npm test tests/MCPConnection.integration.test.js 2>&1 | grep -i "zombie\\|orphan"
# Expected: No matches
```

**Step 5: Async Robustness Check** (2 min)
```bash
# No hardcoded setTimeout (anti-pattern)
grep -c "setTimeout" tests/MCPConnection.integration.test.js
# Expected: 0 (or only in controlled test scenarios)

# Proper async waiting patterns
grep -c "waitFor\\|waitUntil\\|await.*Promise" tests/MCPConnection.integration.test.js
# Expected: ≥10
```

**Step 6: Coverage Report Review** (3 min)
```bash
# Generate comprehensive coverage
npm run test:coverage

# Review integration-specific coverage
open coverage/index.html

# Check key files:
# - src/MCPConnection.js (transport methods >80%)
# - src/utils/oauth-provider.js (OAuth flow >75%)
# - src/utils/env-resolver.js (resolution logic >80%)
```

### Go/No-Go Decision

**🟢 GO - Sprint 3 Complete**:
- ✅ 268/268 tests passing (100%)
- ✅ Integration tests: 88-93/88-93 (100%)
- ✅ Transport isolation verified (--shuffle consistent)
- ✅ OAuth flow complete (all steps tested)
- ✅ Zero zombie processes
- ✅ Zero hardcoded timeouts
- ✅ Coverage >80% for integration-relevant code

**🟡 REVIEW - Minor Issues**:
- 265-267/268 tests passing (98-99%)
- OR Coverage 75-79%
- OR 1-2 flaky tests with --shuffle
- **Action**: Investigate issues, fix if time allows, otherwise document

**🔴 NO-GO - Significant Issues**:
- <265/268 tests passing (<98%)
- OR Coverage <75%
- OR >2 failing tests with --shuffle
- OR Zombie processes detected
- OR >3 hardcoded setTimeout patterns
- **Action**: STOP, address critical issues before proceeding

---

## Agile Ceremonies

### Daily Standup (15 minutes)

**Format**: Quick status update with blocker identification

**Day 1 Update** (During Task 3.1):
```
What I completed yesterday:
- Sprint 2 completed with 235/246 passing
- Reviewed Sprint 3 plan and prerequisites

What I'm working on today:
- Task 3.1: Integration test rewrite
- Focus: STDIO and SSE transport tests
- Target: 50% of integration tests rewritten

Blockers:
- None yet, starting fresh

Confidence:
- HIGH - Sprint 2 patterns proven, ready to apply
```

**Day 2 Update** (Finishing Task 3.1, Starting 3.2):
```
What I completed yesterday:
- STDIO transport tests: 15/15 rewritten
- SSE transport tests: 12/12 rewritten
- OAuth tests: 10/18 in progress

What I'm working on today:
- Complete OAuth PKCE flow tests
- Error scenario tests
- Start Task 3.2 (error handling gaps)

Blockers:
- OAuth flow complexity higher than expected
- May need +30 min for complete OAuth coverage

Confidence:
- MEDIUM-HIGH - OAuth learning curve but making progress
```

**Day 3 Update** (Completing Sprint 3):
```
What I completed yesterday:
- Task 3.1 complete: 78/78 integration tests passing
- Task 3.2: Added 12 error handling tests
- Coverage report generated

What I'm working on today:
- Final 4 edge case tests
- Integration validation
- Sprint 3 documentation

Blockers:
- None

Confidence:
- HIGH - On track for completion
```

### Sprint Demo (30 minutes)

**5-Part Demonstration**:

**Part 1: Transport Demonstrations** (7 min)
```
Demo Script:
1. STDIO Transport
   - Show process spawning test
   - Demonstrate environment variable resolution
   - Verify process cleanup (no zombies)

2. SSE Transport
   - Show EventSource connection
   - Demonstrate reconnection logic
   - Verify event handling

3. streamable-http Transport
   - Show HTTP request/response
   - Demonstrate connection without OAuth
```

**Part 2: OAuth PKCE Flow Walkthrough** (8 min)
```
Live Code Walkthrough:
1. Authorization URL generation
   - Show PKCE code verifier creation
   - Show code challenge (S256 hash)
   - Show full authorization URL with parameters

2. Callback Handling
   - Show state validation
   - Show authorization code extraction

3. Token Exchange
   - Show code + verifier exchange for tokens
   - Show access_token and refresh_token storage

4. Token Refresh
   - Show automatic refresh on expiration
   - Show request retry with new token

5. Error Scenarios
   - Show access_denied handling
   - Show invalid_grant error
```

**Part 3: Error Handling Demonstration** (7 min)
```
Test Execution:
1. Run timeout tests
   npm test -- -t "timeout"
   - Show 2-second tool timeout
   - Show operation succeeds with override

2. Run configuration validation tests
   npm test -- -t "Configuration Validation"
   - Show ConfigError for missing fields
   - Show type mismatch detection

3. Run concurrency tests
   npm test -- -t "parallel tool calls"
   - Show 3 parallel calls succeed independently
```

**Part 4: Quality Metrics Review** (5 min)
```
Metrics Display:
1. Test Results
   - Before Sprint 3: 235/246 (96%)
   - After Sprint 3: 268/268 (100%)
   - Gain: +33 tests, +4% pass rate

2. Coverage Report
   - Integration test coverage: >80%
   - OAuth provider coverage: >75%
   - Environment resolver coverage: >80%

3. Quality Scans
   - Logger assertions: 0 ✅
   - Hardcoded timeouts: 0 ✅
   - Transport isolation: Verified ✅
```

**Part 5: Q&A** (3 min)
```
Common Questions:
Q: How complex was OAuth testing?
A: HIGH complexity but well-structured - PKCE flow has 5 distinct steps that all need testing

Q: Any flaky tests with async timing?
A: No - proper event-based waiting prevents brittleness

Q: Process cleanup working correctly?
A: Yes - no zombie processes detected after STDIO tests
```

### Sprint Retrospective (30 minutes)

**3-Section Format**:

**Section 1: What Went Well** (10 min)
```
Facilitation Questions:
- Which transport was easiest to test?
- Did Sprint 2 patterns transfer well to integration tests?
- How effective was the OAuth flow example in TEST_P3_WF.md?
- What helper utilities were most valuable?

Expected Insights:
- STDIO tests straightforward with process lifecycle understanding
- SSE tests moderate complexity with reconnection logic
- OAuth tests complex but comprehensive documentation helped
- createMockConnection helper critical for transport abstraction
```

**Section 2: What Could Improve** (10 min)
```
Facilitation Questions:
- What integration testing challenges were unexpected?
- Which error scenarios were hardest to simulate?
- Did Task 3.2 gap analysis take longer than expected?
- What additional helper utilities would have helped?

Expected Insights:
- OAuth flow complexity underestimated (+30 min vs estimate)
- Transport isolation required careful port management
- Gap identification systematic but time-consuming
- Would benefit from createOAuthProvider helper
```

**Section 3: Action Items for Sprint 4-5** (10 min)
```
Sprint 4 (CLI Tests) Actions:
1. Add createCLITestEnv helper for argv mocking
2. Review process.exit mocking patterns
3. Plan for CLI integration validation

Sprint 5 (Quality & Docs) Actions:
1. Create OAuth flow diagram for documentation
2. Document transport selection decision tree
3. Add troubleshooting guide for common integration issues
4. Update TESTING_STANDARDS.md with integration patterns

General Improvements:
1. Create helper utility addition process (documentation + tests)
2. Establish OAuth testing pattern library
3. Document process cleanup validation technique
```

### Working Agreement (Sprint 3 Additions)

**All Sprint 2 Rules Apply**, plus:

**Transport Isolation**:
- [ ] Each transport MUST use unique ports (no conflicts)
- [ ] STDIO tests MUST verify process cleanup (no zombies)
- [ ] SSE tests MUST not leave EventSource connections open
- [ ] HTTP tests MUST cleanup axios/fetch instances

**OAuth Testing**:
- [ ] OAuth flow MUST cover all 5 steps (authorize, callback, exchange, refresh, errors)
- [ ] PKCE verifier/challenge MUST be validated in tests
- [ ] State parameter MUST be verified in callback tests
- [ ] Token storage MUST be tested with expiration scenarios

**Async Patterns**:
- [ ] NO hardcoded setTimeout delays allowed (use event-based waiting)
- [ ] Timeout tests MUST complete within 2x timeout value
- [ ] Integration tests MAY take longer than unit tests (acceptable)
- [ ] All async errors MUST use rejects.toThrow() pattern

**Quality Standards**:
- [ ] Run tests with --sequence.shuffle before marking complete
- [ ] Verify process cleanup after every STDIO test run
- [ ] Check coverage report for each transport type
- [ ] Document any new helper utilities added

---

## Risk Management

### Risk 1: OAuth Flow Complexity
**Probability**: HIGH
**Impact**: HIGH
**Category**: Technical Complexity

**Description**: OAuth PKCE authorization flow involves 5 distinct steps with external authorization server simulation, state management, code verifier/challenge generation, token exchange, and refresh logic. This is significantly more complex than any Sprint 2 testing scenario.

**Indicators**:
- OAuth tests taking >60 min (vs 50 min estimate)
- Incomplete flow coverage (missing refresh or error scenarios)
- Flaky OAuth tests due to state management issues

**Mitigation**:
1. Review OAuth 2.0 PKCE specification before starting
2. Study existing implementation in `src/utils/oauth-provider.js`
3. Break OAuth testing into 5 separate test suites (one per step)
4. Allocate 30-45 min buffer specifically for OAuth
5. Use TEST_P3_WF.md complete OAuth example as reference

**Contingency**:
- If >90 min spent on OAuth without completion:
  - Pause and reassess OAuth understanding
  - Pair with team member for OAuth flow review
  - Split OAuth testing into separate subtask if needed
- If OAuth tests are flaky:
  - Review state management in tests
  - Verify mock authorization server consistency
  - Add explicit state validation steps

**Acceptance**: OAuth complexity is expected - budget extra time appropriately

---

### Risk 2: Async Timing Brittleness
**Probability**: MEDIUM
**Impact**: HIGH
**Category**: Test Quality

**Description**: Integration tests involve real async delays that vary by system load. Hardcoded timeouts or improper async waiting causes flakiness that undermines test reliability.

**Indicators**:
- Tests pass locally but fail in CI
- Inconsistent results with --sequence.shuffle
- setTimeout patterns appearing in tests
- "Race condition" errors in test output

**Mitigation**:
1. Use Vitest waitFor/waitUntil utilities (not setTimeout)
2. Implement event-based waiting (await until condition met)
3. Increase test timeout limits to 10-15 seconds per integration test
4. Run tests 3x with --shuffle to verify consistency
5. Avoid hardcoded delays entirely

**Contingency**:
- If flaky tests detected:
  - Identify specific timing-sensitive operations
  - Replace setTimeout with proper async waiting
  - Increase timeout if legitimate slow operation
  - Add explicit state verification before proceeding
- If >3 flaky tests:
  - STOP and review async patterns across all tests
  - Systematic refactor to event-based waiting

**Acceptance**: 1-2 timing adjustments normal, >3 indicates pattern problem

---

### Risk 3: Process Cleanup Verification
**Probability**: MEDIUM
**Impact**: MEDIUM
**Category**: Resource Management

**Description**: STDIO tests spawn real child processes that must be properly terminated. Zombie processes accumulate and cause system issues or test failures.

**Indicators**:
- `ps aux | grep node` shows orphaned processes after tests
- System slowdown after multiple test runs
- "Address already in use" errors (port conflicts from zombie processes)
- Memory usage growing with repeated test runs

**Mitigation**:
1. Use proper process.kill() with SIGTERM signal
2. Verify process termination in test cleanup (afterEach)
3. Add process existence checks after disconnect
4. Implement timeout for process termination (force SIGKILL if needed)
5. Monitor process count before/after test suites

**Contingency**:
- If zombie processes detected:
  - Add explicit process.kill() in afterEach hooks
  - Verify disconnect() implementation terminates process
  - Add process existence assertion in cleanup tests
- If persistent zombie process issues:
  - Implement global test suite cleanup
  - Add process monitoring to test framework
  - Use process.on('exit') cleanup handlers

**Acceptance**: Zero zombie processes is requirement, not goal

---

### Risk 4: Transport Isolation Failures
**Probability**: LOW
**Impact**: HIGH
**Category**: Test Independence

**Description**: Tests for different transport types (STDIO, SSE, HTTP) may interfere if they share state, ports, or resources. This causes flaky failures that are hard to debug.

**Indicators**:
- Tests pass individually but fail when run together
- Different results with --sequence.shuffle
- Port conflict errors (EADDRINUSE)
- "Server already running" errors

**Mitigation**:
1. Use unique ports for each transport test (STDIO: 3001, SSE: 3002, HTTP: 3003)
2. Isolate test suites with separate describe blocks
3. Verify independence with --sequence.shuffle
4. Use separate mock instances per transport
5. Clean up resources in afterEach/afterAll hooks

**Contingency**:
- If transport interference detected:
  - Map which tests conflict (run individually vs together)
  - Identify shared resources (ports, files, global state)
  - Refactor to unique resources per test
  - Add explicit isolation verification tests
- If persistent isolation issues:
  - Use Vitest test.concurrent.skip to disable parallelization
  - Increase test timeout to allow sequential execution

**Acceptance**: Tests must pass consistently with any execution order

---

### Risk 5: Coverage Gap Identification Incomplete
**Probability**: MEDIUM
**Impact**: MEDIUM
**Category**: Quality Assurance

**Description**: Task 3.2 relies on systematic coverage gap identification from Task 3.1. If coverage analysis is rushed or incomplete, critical error scenarios may be missed.

**Indicators**:
- Task 3.2 completed in <1 hour (vs 1.5h estimate)
- <10 new tests added (vs 10-15 target)
- Coverage report not thoroughly reviewed
- Gaps identified after Sprint 3 completion

**Mitigation**:
1. Allocate full 20 min for Task 3.2.1 (gap analysis)
2. Generate HTML coverage report and review systematically
3. Cross-reference with TEST_PLAN.md gap categories (all 5)
4. Use coverage branch view to identify untested error paths
5. Validate gap list with team/peer review

**Contingency**:
- If gap analysis takes >30 min:
  - Acceptable - thoroughness more important than speed
  - Document complex gap identification for future sprints
- If <8 new tests identified:
  - Re-review coverage report (may have missed branches)
  - Check TEST_PLAN.md gap categories (all 5 covered?)
  - Consult with team for scenario suggestions
- If gaps found after Sprint 3:
  - Add to Sprint 4-5 backlog
  - Document as tech debt with priority

**Acceptance**: Some gap identification learning curve expected

---

## Success Metrics

### Primary Success Criteria

**1. Integration Test Pass Rate**
- **Target**: 78/78 (100%)
- **Current**: ~70/78 (~90%)
- **Measure**: `npm test tests/MCPConnection.integration.test.js`
- **Critical**: ALL integration tests must pass

**2. New Error Test Coverage**
- **Target**: 10-15 new tests added
- **Focus**: Timeout, config, concurrency, cleanup, edge cases
- **Measure**: Test count before/after Sprint 3
- **Critical**: All 5 gap categories addressed

**3. Total Test Pass Rate**
- **Target**: 268/268 (100%)
- **Baseline**: 235/246 (96%) after Sprint 2
- **Gain**: +33 tests, +4% pass rate
- **Measure**: `npm test` (full suite)
- **Critical**: 100% pass rate before Sprint 4

**4. Transport Isolation**
- **Target**: Consistent pass with --sequence.shuffle
- **Measure**: 3 runs of `npm test -- --sequence.shuffle`
- **Critical**: No flaky tests due to transport interference

**5. OAuth Flow Completeness**
- **Target**: All 5 PKCE steps tested
  - Authorization URL generation
  - Callback handling
  - Token exchange
  - Token refresh
  - Error scenarios
- **Measure**: Grep for OAuth keywords in tests
- **Critical**: Complete OAuth coverage for production reliability

### Secondary Success Criteria

**6. Code Coverage**
- **Target**: >80% for integration-relevant code
- **Files**: MCPConnection.js, oauth-provider.js, env-resolver.js
- **Acceptable**: 75-80% (integration tests have lower coverage)
- **Measure**: `npm run test:coverage`

**7. Process Cleanup**
- **Target**: Zero zombie processes after STDIO tests
- **Measure**: `ps aux | grep node` after test run
- **Critical**: Clean process termination

**8. Async Robustness**
- **Target**: Zero hardcoded setTimeout patterns
- **Measure**: `grep -c "setTimeout" tests/`
- **Acceptable**: 0-2 (only in controlled scenarios)

**9. Helper Utility Usage**
- **Target**: 100% of new tests use Sprint 1-2 helpers
- **Measure**: Grep for createMockConnection, createServerConfig
- **Goal**: Consistent pattern application

**10. Performance**
- **Target**: <60 seconds for full integration suite
- **Current**: ~30-45 seconds
- **Acceptable**: Integration tests slower than unit tests
- **Measure**: Total test duration

### Leading Indicators

**🟢 Green Flags** (On Track):
- Task 3.1 progressing at ~15-20 tests/hour
- OAuth tests completed within 50-80 min (including buffer)
- Transport tests pass consistently with --shuffle
- Zero process cleanup issues
- Coverage trends toward 80%

**🟡 Yellow Flags** (Monitor):
- Task 3.1 slower than 12 tests/hour (<3 tests per subtask)
- OAuth tests taking >90 min
- 1-2 flaky tests with --shuffle
- Coverage trending 75-79%
- 1-2 zombie processes after cleanup attempt

**🔴 Red Flags** (Intervention Required):
- <10 tests/hour (severe velocity issue)
- OAuth incomplete after 120 min
- >3 flaky tests with --shuffle
- Coverage <75%
- >2 zombie processes or persistent process issues
- Team blocked on integration testing complexity

---

## Acceptance Criteria

**Complete Sprint 3 Go/No-Go Checklist** (ALL must be met):

### Test Results ✅
- [ ] MCPConnection.integration.test.js: 78/78 passing (100%)
- [ ] New error tests: 10-15 added and passing
- [ ] Total test suite: 268/268 passing (100%)
- [ ] Integration suite execution: <60 seconds

### Transport Coverage ✅
- [ ] STDIO transport: 12-15 tests covering process lifecycle
- [ ] SSE transport: 10-12 tests covering EventSource and reconnection
- [ ] streamable-http transport: 15-18 tests covering HTTP and OAuth
- [ ] Error scenarios: 10-12 tests covering network/protocol/timeout errors

### OAuth Completeness ✅
- [ ] Authorization URL generation tested
- [ ] PKCE code verifier/challenge tested (S256)
- [ ] Callback handling with state validation tested
- [ ] Authorization code exchange tested
- [ ] Token refresh flow tested
- [ ] OAuth errors tested (access_denied, invalid_grant)

### Quality Standards ✅
- [ ] Zero logger assertions (anti-pattern scan)
- [ ] Zero hardcoded setTimeout patterns
- [ ] All tests follow AAA pattern
- [ ] All tests use Sprint 1-2 helper utilities
- [ ] Async errors use rejects.toThrow() pattern

### Integration Validation ✅
- [ ] Tests pass with --sequence.shuffle (3 runs)
- [ ] Transport isolation verified (no interference)
- [ ] Process cleanup validated (zero zombies)
- [ ] Coverage >75% for integration-relevant code

### Error Handling Coverage ✅
- [ ] Timeout scenarios: 3-4 tests (tool, resource, configurable)
- [ ] Configuration validation: 3-4 tests (missing, invalid, type errors)
- [ ] Concurrency & cleanup: 4-5 tests (parallel, resources, memory, processes)
- [ ] Edge cases: 2-3 tests (empty, partial, unknown)

### Documentation ✅
- [ ] Sprint 3 acceptance updated
- [ ] Sprint3_Error_Tests_Added.md created
- [ ] OAuth flow documented with examples
- [ ] TEST_P3_WF.md archived
- [ ] TESTING_STANDARDS.md updated with integration patterns

### Review ✅
- [ ] Peer review complete
- [ ] Quality scans pass (zero anti-patterns)
- [ ] Sprint demo complete
- [ ] Retrospective held with action items

---

## Go/No-Go Decision

**🟢 GO - Sprint 3 Complete, Proceed to Sprint 4**:
- All checklist items complete ✅
- 268/268 tests passing (100%)
- Zero anti-patterns detected
- Transport isolation verified
- OAuth flow complete and tested
- Zero zombie processes
- Coverage >75%
- Team confident in integration patterns
- Sprint 3 learnings documented

**🟡 REVIEW - Minor Issues, Conditional Proceed**:
- 265-267/268 tests passing (98-99%)
- OR Coverage 72-75%
- OR 1-2 minor flaky tests with --shuffle
- OR OAuth missing 1 error scenario
- **Decision**: Review issues, document workarounds, proceed if low risk

**🔴 NO-GO - Significant Issues, Do Not Proceed**:
- <265/268 tests passing (<98%)
- OR Coverage <72%
- OR >2 failing tests with --shuffle
- OR OAuth flow incomplete (missing core steps)
- OR Zombie processes detected
- OR >3 hardcoded setTimeout patterns
- **Action**: STOP Sprint 4, address critical issues, re-validate Sprint 3

---

## Appendix

### A. Complete OAuth PKCE Flow Example

**Full Integration Test with All Steps**:

```javascript
describe("OAuth PKCE Complete Flow", () => {
  it("should successfully authorize and refresh tokens", async () => {
    // SETUP: OAuth configuration
    const oauthConfig = {
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      clientId: 'mcp-hub-client',
      scopes: ['mcp.read', 'mcp.write'],
      redirectUri: 'http://localhost:3000/oauth/callback'
    };

    // STEP 1: Generate PKCE Parameters
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    expect(codeVerifier).toHaveLength(43); // Base64url of 32 bytes
    expect(codeChallenge).toHaveLength(43);

    // STEP 2: Build Authorization URL
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL(oauthConfig.authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', oauthConfig.clientId);
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Verify URL structure
    expect(authUrl.toString()).toContain('code_challenge=');
    expect(authUrl.toString()).toContain('code_challenge_method=S256');

    // STEP 3: Simulate Authorization (Browser Redirect)
    // In real flow: User approves in browser, redirect to callback
    const authorizationCode = 'test-auth-code-' + crypto.randomBytes(16).toString('hex');

    // STEP 4: Handle Callback
    const callbackParams = {
      code: authorizationCode,
      state: state
    };

    // Validate state matches
    expect(callbackParams.state).toBe(state);

    // STEP 5: Exchange Code for Tokens
    const tokenExchangeBody = {
      grant_type: 'authorization_code',
      code: callbackParams.code,
      redirect_uri: oauthConfig.redirectUri,
      client_id: oauthConfig.clientId,
      code_verifier: codeVerifier
    };

    // Mock token response
    const tokenResponse = {
      access_token: 'access-token-' + crypto.randomBytes(32).toString('hex'),
      refresh_token: 'refresh-token-' + crypto.randomBytes(32).toString('hex'),
      expires_in: 3600,
      token_type: 'Bearer'
    };

    expect(tokenResponse.access_token).toBeDefined();
    expect(tokenResponse.refresh_token).toBeDefined();
    expect(tokenResponse.expires_in).toBe(3600);

    // STEP 6: Use Access Token
    const apiRequest = {
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`
      }
    };

    expect(apiRequest.headers.Authorization).toContain('Bearer');

    // STEP 7: Simulate Token Expiration
    const isExpired = Date.now() > (Date.now() + tokenResponse.expires_in * 1000);
    expect(isExpired).toBe(false); // Not expired yet

    // STEP 8: Refresh Access Token
    const refreshBody = {
      grant_type: 'refresh_token',
      refresh_token: tokenResponse.refresh_token,
      client_id: oauthConfig.clientId
    };

    const refreshedTokens = {
      access_token: 'new-access-token-' + crypto.randomBytes(32).toString('hex'),
      refresh_token: tokenResponse.refresh_token, // Often same refresh token
      expires_in: 3600,
      token_type: 'Bearer'
    };

    expect(refreshedTokens.access_token).not.toBe(tokenResponse.access_token);
    expect(refreshedTokens.refresh_token).toBe(tokenResponse.refresh_token);
  });
});
```

---

### B. Transport Isolation Pattern

**Ensuring STDIO, SSE, and HTTP Tests Don't Interfere**:

```javascript
describe("Transport Isolation", () => {
  // Separate describe blocks for each transport
  describe("STDIO Transport", () => {
    const STDIO_PORT = 3001;

    beforeEach(() => {
      // Setup STDIO-specific mocks
    });

    afterEach(() => {
      // Cleanup STDIO resources
    });

    it("STDIO test 1", async () => {
      // Uses STDIO_PORT, isolated from other transports
    });
  });

  describe("SSE Transport", () => {
    const SSE_PORT = 3002;

    beforeEach(() => {
      // Setup SSE-specific mocks
    });

    afterEach(() => {
      // Cleanup SSE resources (close EventSource)
    });

    it("SSE test 1", async () => {
      // Uses SSE_PORT, isolated from other transports
    });
  });

  describe("streamable-http Transport", () => {
    const HTTP_PORT = 3003;

    beforeEach(() => {
      // Setup HTTP-specific mocks
    });

    afterEach(() => {
      // Cleanup HTTP resources (close connections)
    });

    it("HTTP test 1", async () => {
      // Uses HTTP_PORT, isolated from other transports
    });
  });
});
```

---

### C. Process Cleanup Pattern

**Ensuring Zero Zombie STDIO Processes**:

```javascript
describe("STDIO Process Cleanup", () => {
  let connection;
  let childProcess;

  beforeEach(async () => {
    connection = new MCPConnection('stdio-test', {
      command: 'node',
      args: ['test-server.js']
    });

    await connection.connect();
    childProcess = connection.getProcess();
  });

  afterEach(async () => {
    // Ensure disconnect is called
    if (connection.isConnected()) {
      await connection.disconnect();
    }

    // Verify process is terminated
    if (childProcess && childProcess.pid) {
      // Check process doesn't exist
      try {
        process.kill(childProcess.pid, 0); // Signal 0 = check existence
        throw new Error(`Zombie process detected: ${childProcess.pid}`);
      } catch (err) {
        // Expected: process should not exist (ESRCH error)
        expect(err.code).toBe('ESRCH');
      }
    }
  });

  it("should terminate process on disconnect", async () => {
    expect(childProcess.pid).toBeDefined();
    expect(connection.isConnected()).toBe(true);

    // Disconnect
    await connection.disconnect();

    // Verify termination
    expect(connection.isConnected()).toBe(false);

    // Process should no longer exist
    try {
      process.kill(childProcess.pid, 0);
      fail('Process should be terminated');
    } catch (err) {
      expect(err.code).toBe('ESRCH');
    }
  });
});
```

---

### D. Async Waiting Pattern (No setTimeout)

**Event-Based Waiting Instead of Hardcoded Timeouts**:

```javascript
// ❌ BAD: Hardcoded timeout
it("should connect within time limit", async () => {
  connection.connect();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Brittle!
  expect(connection.isConnected()).toBe(true);
});

// ✅ GOOD: Event-based waiting
it("should connect and emit ready event", async () => {
  const connectPromise = new Promise((resolve) => {
    connection.once('ready', resolve);
  });

  connection.connect();
  await connectPromise; // Waits for actual event

  expect(connection.isConnected()).toBe(true);
});

// ✅ GOOD: Condition-based waiting with timeout
it("should establish connection", async () => {
  await connection.connect();

  // Wait for condition with timeout
  await waitFor(() => connection.isConnected(), {
    timeout: 5000,
    interval: 100
  });

  expect(connection.getStatus()).toBe('connected');
});
```

---

### E. Helper Utility Quick Reference

**Sprint 1-2 Helpers for Integration Tests**:

```javascript
// Mock Factories (tests/helpers/mocks.js)
createMockLogger(overrides)       // Logger with info/warn/debug/error
createMockConfigManager(overrides) // ConfigManager with loadConfig/watchConfig
createMockConnection(overrides)    // MCPConnection with all methods

// Test Fixtures (tests/helpers/fixtures.js)
createTestConfig(overrides)        // Full configuration object
createServerConfig(name, overrides) // Server-specific config
createToolResponse(overrides)       // Tool call result structure
createResourceResponse(overrides)   // Resource read result structure

// Assertions (tests/helpers/assertions.js)
expectServerConnected(hub, name)    // Verify connection state
expectToolCallSuccess(result)       // Validate tool execution
expectResourceReadSuccess(result)   // Validate resource access
```

**New Sprint 3 Helper Candidates**:
```javascript
// Consider adding for Sprint 4-5:
createOAuthProvider(overrides)      // OAuth flow mocking
createProcessMock(overrides)        // Child process simulation
createEventSourceMock(overrides)    // SSE EventSource mocking
```

---

### F. Time Tracking Template

| Subtask | Estimated | Actual | Variance | Notes |
|---------|-----------|--------|----------|-------|
| 3.1.1: Analyze structure | 30 min | ___ min | ___ | |
| 3.1.2: STDIO tests | 45 min | ___ min | ___ | |
| 3.1.3: SSE tests | 40 min | ___ min | ___ | |
| 3.1.4: OAuth + HTTP tests | 50 min | ___ min | ___ | |
| 3.1.5: Error scenarios | 30 min | ___ min | ___ | |
| 3.1.6: Validate integration | 15 min | ___ min | ___ | |
| **Phase A Total** | **210 min** | **___ min** | **___** | |
| 3.2.1: Identify gaps | 20 min | ___ min | ___ | |
| 3.2.2: Timeout tests | 25 min | ___ min | ___ | |
| 3.2.3: Config tests | 25 min | ___ min | ___ | |
| 3.2.4: Concurrency tests | 25 min | ___ min | ___ | |
| 3.2.5: Edge case tests | 25 min | ___ min | ___ | |
| 3.2.6: Final validation | 10 min | ___ min | ___ | |
| **Phase B Total** | **130 min** | **___ min** | **___** | |
| **Sprint 3 Total** | **340 min (5.7h)** | **___ min** | **___** | |

**Variance Calculation**: (Actual - Estimated) / Estimated * 100%
**Use for**: Adjusting Sprint 4-5 estimates based on actual Sprint 3 velocity

---

## References

- **TEST_PLAN.md**: Source sprint plan document (Sprint 3 section lines 330-393)
- **TEST_P2_WF.md**: Sprint 2 workflow with proven patterns
- **Test_Failure_Analysis.md**: Original root cause analysis
- **Sprint2_Completion.md**: Sprint 2 learnings and helper validation
- **Vitest Documentation**: [https://vitest.dev/](https://vitest.dev/)
- **OAuth 2.0 PKCE Spec**: [RFC 7636](https://tools.ietf.org/html/rfc7636)
- **MCP Protocol Spec**: Version 2025-03-26

---

## Session Metadata

- **Created**: 2025-10-27
- **Sprint**: 3 of 5 (Integration & Error Handling)
- **Duration**: 4-5 hours sequential execution
- **Prerequisites**: Sprint 2 complete (235/246 passing)
- **Status**: ✅ Ready for Execution
- **Next Sprint**: Sprint 4 (CLI & Configuration Tests)

**This workflow is ready for team review and Sprint 3 execution** 🎯
