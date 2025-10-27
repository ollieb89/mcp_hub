# Team Training Guide - MCP Hub Testing

**Purpose**: Comprehensive training guide for team members on MCP Hub testing practices

**Target Audience**: All developers contributing to MCP Hub

**Training Duration**: 2-3 hours (self-paced) or 4 hours (workshop format)

**Last Updated**: 2025-10-27

---

## Training Overview

This guide walks you through the testing philosophy, patterns, and practices established during the Sprint 1-5 Test Suite Rewrite Project. By the end, you'll be able to write high-quality, maintainable tests that follow MCP Hub standards.

### Learning Objectives

After completing this training, you will be able to:

1. ✅ Write behavior-driven tests using the AAA pattern
2. ✅ Choose appropriate test templates for different scenarios
3. ✅ Use test helpers for fixtures, assertions, and mocks
4. ✅ Test async operations, events, and configuration
5. ✅ Interpret coverage reports and identify gaps
6. ✅ Debug failing tests systematically
7. ✅ Avoid common anti-patterns

---

## Part 1: Testing Philosophy (30 minutes)

### Core Principle: Test WHAT, Not HOW

**The Golden Rule**: Test observable behavior and outcomes, not implementation details.

#### Interactive Exercise 1: Identify Behavior vs Implementation

For each test, identify if it's testing behavior (✅) or implementation (❌):

```javascript
// Test A
expect(hub.connections.has('server1')).toBe(true);

// Test B
expect(logger.debug).toHaveBeenCalledWith('Connected to server1');

// Test C
expect(component.status).toBe('connected');

// Test D
expect(component.internalMethod).toHaveBeenCalled();

// Test E
expect(result.tools).toHaveLength(3);
```

<details>
<summary>Click for answers</summary>

- **Test A**: ✅ Behavior - Tests observable state
- **Test B**: ❌ Implementation - Tests internal logging
- **Test C**: ✅ Behavior - Tests observable status
- **Test D**: ❌ Implementation - Tests internal method
- **Test E**: ✅ Behavior - Tests observable outcome

</details>

### Why This Matters

**Implementation-focused tests**:
- ❌ Break during refactoring even when behavior is correct
- ❌ Create maintenance burden without adding value
- ❌ Don't document actual requirements

**Behavior-focused tests**:
- ✅ Survive code refactoring and implementation changes
- ✅ Document actual system requirements
- ✅ Focus on what users/developers care about

### The Five "Exit Doors" Philosophy

Every piece of code has 5 ways it can exit:

1. **Happy Path**: Normal successful execution
2. **Edge Cases**: Valid but unusual inputs
3. **Error Conditions**: Invalid inputs or failure scenarios
4. **State Transitions**: Changes from one state to another
5. **Resource Cleanup**: Proper cleanup even on failure

**Your tests should cover all 5 exit doors.**

---

## Part 2: AAA Pattern and Test Structure (30 minutes)

### The AAA Pattern

Every test follows Arrange-Act-Assert:

```javascript
it('should exclude disabled servers from active connections', async () => {
  // ARRANGE: Set up test environment
  const config = createTestConfig({
    mcpServers: {
      'enabled': { command: 'node', args: ['enabled.js'] },
      'disabled': { command: 'node', args: ['disabled.js'], disabled: true }
    }
  });

  // ACT: Perform operation
  const hub = new MCPHub(config);
  await hub.initialize();

  // ASSERT: Verify expected outcome
  expect(hub.connections.has('enabled')).toBe(true);
  expect(hub.connections.has('disabled')).toBe(false);
});
```

#### Interactive Exercise 2: Restructure This Test

Fix this poorly structured test:

```javascript
it('should work', async () => {
  const hub = new MCPHub(createTestConfig());
  expect(hub).toBeDefined();
  await hub.initialize();
  expect(hub.connections.size).toBeGreaterThan(0);
  const tool = await hub.callTool('server1', 'test-tool', {});
  expect(tool).toBeDefined();
});
```

<details>
<summary>Click for solution</summary>

```javascript
it('should call tool on connected server successfully', async () => {
  // ARRANGE: Set up hub with test server
  const config = createTestConfig({
    mcpServers: {
      'server1': { command: 'node', args: ['server.js'] }
    }
  });
  const hub = new MCPHub(config);
  await hub.initialize();

  // ACT: Call tool
  const result = await hub.callTool('server1', 'test-tool', {});

  // ASSERT: Tool call successful
  expect(result).toBeDefined();
  expect(result.isError).toBe(false);
  expect(result.content).toBeDefined();
});
```

</details>

### Test Naming Convention

Format: `should [expected behavior] when [scenario/condition]`

#### Interactive Exercise 3: Improve These Test Names

Fix these test names:

```javascript
it('test connection', () => { ... });
it('should call logger', () => { ... });
it('handles errors', () => { ... });
it('works correctly', () => { ... });
```

<details>
<summary>Click for solutions</summary>

```javascript
it('should establish STDIO connection successfully', () => { ... });
it('should exclude disabled servers from active connections', () => { ... });
it('should throw ConnectionError when server unreachable', () => { ... });
it('should return tool result when tool execution succeeds', () => { ... });
```

</details>

---

## Part 3: Test Helpers and Fixtures (30 minutes)

### Using Fixtures

Fixtures create consistent test data. **Never copy-paste complex test data.**

#### Before: Repeated Boilerplate

```javascript
const config1 = {
  mcpServers: {
    'server1': { command: 'node', args: ['server.js'], env: {} }
  }
};

const config2 = {
  mcpServers: {
    'server2': { command: 'node', args: ['server.js'], env: {} }
  }
};
```

#### After: Using Fixtures

```javascript
import { createTestConfig, createServerConfig } from './helpers/fixtures.js';

const config1 = createTestConfig();
const config2 = createTestConfig({
  mcpServers: createServerConfig('server2')
});
```

### Common Fixtures

```javascript
// Configuration fixtures
createTestConfig(overrides)
createServerConfig(name, overrides)
createMultiServerConfig(serverNames)

// Transport fixtures
createStdioConfig(name, overrides)
createSSEConfig(name, overrides)
createHttpConfig(name, overrides)

// Capability fixtures
createToolList(count, prefix)
createResourceList(count, prefix)
createPromptList(count, prefix)

// Mock fixtures
createMockClient(overrides)
createMockTransport(overrides)
```

#### Interactive Exercise 4: Use Fixtures

Refactor this test to use fixtures:

```javascript
it('should aggregate tools from multiple servers', () => {
  const server1 = {
    name: 'filesystem',
    tools: [
      { name: 'read', description: 'Read file', inputSchema: { type: 'object' } },
      { name: 'write', description: 'Write file', inputSchema: { type: 'object' } }
    ]
  };

  const server2 = {
    name: 'github',
    tools: [
      { name: 'search', description: 'Search repos', inputSchema: { type: 'object' } }
    ]
  };

  // ... test logic
});
```

<details>
<summary>Click for solution</summary>

```javascript
import { createToolList } from './helpers/fixtures.js';

it('should aggregate tools from multiple servers', () => {
  // ARRANGE
  const server1 = {
    name: 'filesystem',
    tools: createToolList(2, 'file')
  };

  const server2 = {
    name: 'github',
    tools: createToolList(1, 'search')
  };

  // ACT & ASSERT
  // ... test logic
});
```

</details>

### Using Assertion Helpers

Assertion helpers make tests more readable:

```javascript
// Instead of this:
expect(hub.connections.has(serverName)).toBe(true);
const status = hub.getServerStatus(serverName);
expect(status).toBeDefined();
expect(status.status).toBe('connected');

// Use this:
expectServerConnected(hub, serverName);
```

#### Common Assertions

```javascript
// Server assertions
expectServerConnected(hub, serverName)
expectServerDisconnected(hub, serverName)
expectAllServersConnected(hub, serverNames)

// Operation assertions
expectToolCallSuccess(result)
expectResourceReadSuccess(result)

// Error assertions
expectServerError(error, code, serverName)
expectConnectionError(error, code)
expectToolError(error, code, toolName)

// Capability assertions
expectServerCapabilities(status, toolCount, resourceCount, promptCount)
```

---

## Part 4: Async Testing Patterns (45 minutes)

### Using vi.waitFor()

**Rule**: Always use `vi.waitFor()` for async condition waiting. Never arbitrary `setTimeout()`.

```javascript
// ❌ BAD: Arbitrary delay
await new Promise(resolve => setTimeout(resolve, 1000));
expect(component.status).toBe('ready');

// ✅ GOOD: Wait for specific condition
await vi.waitFor(() => {
  expect(component.status).toBe('ready');
}, { timeout: 5000 });
```

### Testing Concurrent Operations

Use `Promise.all()` for operations that must succeed:

```javascript
it('should execute multiple operations in parallel', async () => {
  // ARRANGE
  const operations = [
    component.performAsyncOperation({ id: 1 }),
    component.performAsyncOperation({ id: 2 }),
    component.performAsyncOperation({ id: 3 })
  ];

  // ACT
  const results = await Promise.all(operations);

  // ASSERT: All operations completed
  expect(results).toHaveLength(3);
  results.forEach((result, index) => {
    expect(result.id).toBe(index + 1);
  });
});
```

Use `Promise.allSettled()` for partial failure testing:

```javascript
it('should handle partial failures in concurrent operations', async () => {
  // ARRANGE
  const operations = [
    component.performAsyncOperation({ id: 1, succeed: true }),
    component.performAsyncOperation({ id: 2, succeed: false }),
    component.performAsyncOperation({ id: 3, succeed: true })
  ];

  // ACT
  const results = await Promise.allSettled(operations);

  // ASSERT: Mixed results
  expect(results[0].status).toBe('fulfilled');
  expect(results[1].status).toBe('rejected');
  expect(results[2].status).toBe('fulfilled');
});
```

### Testing Timeouts

Use `Promise.race()` for timeout scenarios:

```javascript
it('should timeout long-running operation', async () => {
  // ARRANGE
  const longOperation = component.performAsyncOperation({ delay: 5000 });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), 1000)
  );

  // ACT & ASSERT: Operation should timeout
  await expect(
    Promise.race([longOperation, timeout])
  ).rejects.toThrow('Operation timeout');
}, 2000); // Test timeout
```

#### Interactive Exercise 5: Fix This Async Test

This test is flaky. Fix it:

```javascript
it('should transition to active state', async () => {
  component.startTransition();
  await new Promise(resolve => setTimeout(resolve, 500));
  expect(component.status).toBe('active');
});
```

<details>
<summary>Click for solution</summary>

```javascript
it('should transition to active state', async () => {
  // ARRANGE
  expect(component.status).toBe('idle');

  // ACT
  component.startTransition();

  // ASSERT: Wait for state change
  await vi.waitFor(() => {
    expect(component.status).toBe('active');
  }, { timeout: 5000 });
});
```

</details>

---

## Part 5: EventEmitter Testing (30 minutes)

### Setting Up EventEmitter Mocks

Use `vi.hoisted()` for EventEmitter factory functions:

```javascript
const { createMockHub } = vi.hoisted(() => {
  return {
    createMockHub: () => {
      const hub = new EventEmitter();
      hub.connections = new Map();
      hub.serverUrl = 'http://localhost:3000';
      return hub;
    }
  };
});
```

### Testing Event Emission

```javascript
it('should emit event on state change', async () => {
  // ARRANGE
  const eventSpy = vi.fn();
  component.on('stateChanged', eventSpy);

  // ACT
  await component.changeState('active');

  // ASSERT: Event emitted with correct data
  expect(eventSpy).toHaveBeenCalledOnce();
  expect(eventSpy).toHaveBeenCalledWith({
    previousState: 'initialized',
    newState: 'active',
    timestamp: expect.any(Number)
  });
});
```

### Testing Event Handlers

```javascript
it('should register and remove event handler', () => {
  // ARRANGE
  const handler = vi.fn();

  // ACT: Register handler
  component.on('testEvent', handler);
  component.emit('testEvent', { data: 'test' });

  // ASSERT: Handler called
  expect(handler).toHaveBeenCalledOnce();

  // ACT: Remove handler
  component.off('testEvent', handler);
  component.emit('testEvent', { data: 'test2' });

  // ASSERT: Handler not called after removal
  expect(handler).toHaveBeenCalledOnce(); // Still just once
});
```

### Critical: Always Clean Up Listeners

```javascript
afterEach(() => {
  // CRITICAL: Remove all listeners to prevent memory leaks
  component?.removeAllListeners();
  mockHub?.removeAllListeners();
});
```

---

## Part 6: Configuration Testing (30 minutes)

### Using mock-fs

```javascript
import mockFs from 'mock-fs';

beforeEach(() => {
  // ARRANGE: Set up mock filesystem
  mockFs({
    '/test': {
      'config.json': JSON.stringify({ setting: 'value' }),
      'invalid.json': 'invalid JSON {'
    }
  });
});

afterEach(() => {
  // CRITICAL: Always restore filesystem
  mockFs.restore();
});
```

### Testing Configuration Validation

```javascript
it('should detect missing required fields', () => {
  // ARRANGE
  const config = {
    setting2: 42
    // setting1 missing
  };

  const schema = {
    setting1: { type: 'string', required: true },
    setting2: { type: 'number', required: true }
  };

  // ACT
  const result = configManager.validate(config, schema);

  // ASSERT: Validation fails
  expect(result.valid).toBe(false);
  expect(result.errors).toContainEqual(
    expect.objectContaining({
      field: 'setting1',
      message: expect.stringContaining('required')
    })
  );
});
```

---

## Part 7: Coverage Analysis (30 minutes)

### Understanding Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open interactive HTML report
npm run test:coverage:ui
```

### Coverage Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Statements** | % of code lines executed | Informational |
| **Branches** | % of decision points tested | **80%+** |
| **Functions** | % of functions called | 70%+ |
| **Lines** | % of lines executed | Informational |

**Key Insight**: Branch coverage is the most important metric.

### Interpreting Coverage

**High branch coverage (80%+) with lower statement coverage (60-70%)**:
- ✅ **Excellent**: All critical decision paths tested
- Common in files with error formatting or defensive code

**Low branch coverage (<70%) with high statement coverage (90%+)**:
- ❌ **Insufficient**: Missing error scenarios and edge cases
- Need more tests for decision points

#### Interactive Exercise 6: Analyze This Coverage

```
File: src/server.js
Statements: 64.18% (410/639)
Branches: 85.06% (73/86)
Functions: 72.72% (16/22)
Lines: 64.18% (410/639)
```

Is this coverage good or bad? Why?

<details>
<summary>Click for answer</summary>

**Assessment**: ✅ **Good coverage**

**Reasoning**:
- Branch coverage: 85.06% (exceeds 80% target)
- All critical decision paths tested
- Lower statement coverage likely due to:
  - Error formatting code
  - Integration scenarios requiring full app startup
  - Edge cases in Express middleware

**Conclusion**: Quality over quantity - focus is on right places.

</details>

---

## Part 8: Debugging Strategies (30 minutes)

### Systematic Debugging Approach

When a test fails:

1. **Read the error message carefully**
2. **Check which assertion failed**
3. **Verify test setup (ARRANGE)**
4. **Add diagnostic logging**
5. **Run test in isolation**
6. **Check for timing issues**
7. **Verify cleanup**

### Common Issues and Solutions

#### Issue: Test passes locally but fails in CI

**Likely cause**: Timing differences

**Solution**:
```javascript
// ❌ BAD: Hardcoded delay
await new Promise(resolve => setTimeout(resolve, 100));

// ✅ GOOD: Wait for condition with generous timeout
await vi.waitFor(() => {
  expect(component.status).toBe('ready');
}, { timeout: 5000 }); // Generous for CI
```

#### Issue: Flaky test (intermittent failures)

**Likely causes**:
1. Timing issues
2. Shared state between tests
3. Missing cleanup

**Debugging approach**:
```bash
# Run test 100 times to reproduce
for i in {1..100}; do npm test -- flaky.test.js || break; done
```

#### Issue: Test timeout

**Likely causes**:
1. Default timeout too short
2. Promise never resolves
3. Process not terminating

**Solution**:
```javascript
it('should complete long operation', async () => {
  // ... test logic
}, 15000); // Increase test timeout
```

---

## Part 9: Anti-Patterns to Avoid (30 minutes)

### ❌ Anti-Pattern 1: Testing Implementation

```javascript
// ❌ BAD
expect(logger.info).toHaveBeenCalledWith('Server connected');
expect(component.internalMethod).toHaveBeenCalled();

// ✅ GOOD
expect(component.status).toBe('connected');
expect(component.getServerList()).toContain('server1');
```

### ❌ Anti-Pattern 2: Arbitrary Delays

```javascript
// ❌ BAD
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ GOOD
await vi.waitFor(() => {
  expect(component.status).toBe('ready');
}, { timeout: 5000 });
```

### ❌ Anti-Pattern 3: Missing Cleanup

```javascript
// ❌ BAD
afterEach(() => {
  // Nothing
});

// ✅ GOOD
afterEach(async () => {
  await component?.cleanup();
  mockHub?.removeAllListeners();
  vi.clearAllMocks();
});
```

### ❌ Anti-Pattern 4: Vague Test Names

```javascript
// ❌ BAD
it('should work', () => { ... });
it('test connection', () => { ... });

// ✅ GOOD
it('should establish STDIO connection successfully', () => { ... });
it('should timeout when server unresponsive', () => { ... });
```

### ❌ Anti-Pattern 5: Testing Too Much

```javascript
// ❌ BAD: Multiple unrelated assertions
it('should do everything', () => {
  expect(component.initialize()).toBeTruthy();
  expect(component.status).toBe('ready');
  expect(component.callTool()).toBeDefined();
  expect(component.getResources()).toHaveLength(3);
});

// ✅ GOOD: One focused assertion per test
it('should initialize successfully', () => {
  expect(component.initialize()).toBeTruthy();
  expect(component.status).toBe('ready');
});

it('should call tool when initialized', () => {
  component.initialize();
  expect(component.callTool()).toBeDefined();
});
```

---

## Part 10: Hands-On Practice (60 minutes)

### Practice Exercise 1: Write a Unit Test

**Task**: Write a unit test for this function:

```javascript
// src/utils/validator.js
export function validateServerConfig(config) {
  if (!config) {
    throw new Error('Config is required');
  }

  if (!config.command) {
    throw new Error('Command is required');
  }

  if (config.disabled) {
    return { valid: true, reason: 'Server disabled, skipping validation' };
  }

  return { valid: true };
}
```

**Requirements**:
1. Use AAA pattern with comments
2. Test all 5 exit doors
3. Use appropriate test names
4. No implementation details

<details>
<summary>Click for solution</summary>

```javascript
import { describe, it, expect } from 'vitest';
import { validateServerConfig } from '../src/utils/validator.js';

describe('validateServerConfig - Configuration Validation', () => {
  it('should return valid for complete configuration', () => {
    // ARRANGE
    const config = {
      command: 'node',
      args: ['server.js']
    };

    // ACT
    const result = validateServerConfig(config);

    // ASSERT
    expect(result.valid).toBe(true);
  });

  it('should throw error when config is null', () => {
    // ARRANGE
    const config = null;

    // ACT & ASSERT
    expect(() => validateServerConfig(config))
      .toThrow('Config is required');
  });

  it('should throw error when command is missing', () => {
    // ARRANGE
    const config = {
      args: ['server.js']
    };

    // ACT & ASSERT
    expect(() => validateServerConfig(config))
      .toThrow('Command is required');
  });

  it('should skip validation for disabled servers', () => {
    // ARRANGE
    const config = {
      disabled: true
    };

    // ACT
    const result = validateServerConfig(config);

    // ASSERT
    expect(result.valid).toBe(true);
    expect(result.reason).toContain('disabled');
  });

  it('should handle empty config object', () => {
    // ARRANGE
    const config = {};

    // ACT & ASSERT
    expect(() => validateServerConfig(config))
      .toThrow('Command is required');
  });
});
```

</details>

### Practice Exercise 2: Write an Async Test

**Task**: Write tests for this async function:

```javascript
// src/utils/fetcher.js
export async function fetchWithRetry(url, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
```

**Requirements**:
1. Test successful fetch
2. Test retry on failure
3. Test max retries exhausted
4. Mock fetch appropriately

<details>
<summary>Click for solution</summary>

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchWithRetry } from '../src/utils/fetcher.js';

describe('fetchWithRetry - Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data on successful fetch', async () => {
    // ARRANGE
    const mockData = { result: 'success' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    // ACT
    const result = await fetchWithRetry('https://api.example.com');

    // ASSERT
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('should retry on failure and succeed', async () => {
    // ARRANGE
    const mockData = { result: 'success' };
    let attempts = 0;

    global.fetch = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return {
        ok: true,
        json: async () => mockData
      };
    });

    // ACT
    const result = await fetchWithRetry('https://api.example.com', {
      maxRetries: 3,
      retryDelay: 10 // Short delay for testing
    });

    // ASSERT
    expect(result).toEqual(mockData);
    expect(attempts).toBe(3);
  });

  it('should throw error after max retries exhausted', async () => {
    // ARRANGE
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // ACT & ASSERT
    await expect(
      fetchWithRetry('https://api.example.com', {
        maxRetries: 3,
        retryDelay: 10
      })
    ).rejects.toThrow('Network error');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
```

</details>

---

## Part 11: Resources and Next Steps (15 minutes)

### Documentation

1. **Testing Standards**: `tests/TESTING_STANDARDS.md`
2. **Test Templates**: `tests/templates/README.md`
3. **FAQ**: `tests/FAQ.md`
4. **Sprint Documentation**: `claudedocs/TEST_SUITE_INDEX.md`
5. **Coverage Analysis**: `claudedocs/Sprint5_CoverageAnalysis.md`

### Test Templates

Use templates as starting points:

- `tests/templates/unit-test.template.js`
- `tests/templates/integration-test.template.js`
- `tests/templates/event-driven-test.template.js`
- `tests/templates/async-test.template.js`
- `tests/templates/config-test.template.js`

### Helper Functions

Familiarize yourself with helpers:

- `tests/helpers/fixtures.js` - Test data creation
- `tests/helpers/assertions.js` - Semantic assertions
- `tests/helpers/mocks.js` - Mock object creation

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- your-test.test.js

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
npm run test:coverage:ui
```

### Getting Help

1. Check FAQ: `tests/FAQ.md`
2. Review existing tests for patterns
3. Search documentation
4. Ask team members
5. Create issue with details

---

## Training Completion Checklist

After completing this training, you should be able to:

- [ ] Explain the difference between behavior and implementation testing
- [ ] Write tests using AAA pattern with explicit comments
- [ ] Choose appropriate test templates for different scenarios
- [ ] Use fixtures for consistent test data
- [ ] Use assertion helpers for semantic clarity
- [ ] Test async operations with `vi.waitFor()`
- [ ] Test EventEmitter components with proper cleanup
- [ ] Test configuration with mock-fs
- [ ] Interpret coverage reports correctly
- [ ] Debug failing tests systematically
- [ ] Identify and avoid common anti-patterns

---

## Workshop Format (Optional)

If conducting as a workshop:

1. **Introduction** (15 min): Overview and objectives
2. **Philosophy** (30 min): Part 1 with exercises
3. **Structure** (30 min): Parts 2-3 with exercises
4. **Break** (15 min)
5. **Async & Events** (60 min): Parts 4-5 with exercises
6. **Config & Coverage** (45 min): Parts 6-7 with exercises
7. **Break** (15 min)
8. **Debugging & Anti-patterns** (45 min): Parts 8-9
9. **Practice** (60 min): Part 10 hands-on exercises
10. **Wrap-up** (15 min): Part 11 and Q&A

**Total**: 4 hours with breaks

---

## Post-Training Resources

### Next Steps

1. **Practice**: Write tests for a new feature using templates
2. **Review**: Read existing tests in the codebase
3. **Contribute**: Improve templates or documentation
4. **Share**: Help other team members with testing questions

### Continuous Learning

- Review Sprint 1-5 documentation for patterns
- Check FAQ for common questions
- Contribute new patterns to templates
- Participate in code reviews focusing on test quality

---

**Training Version**: 1.0
**Based on**: Sprint 1-5 Test Suite Rewrite Project
**Test Count**: 308 tests
**Pass Rate**: 100%
**Coverage**: 82.94% branches
