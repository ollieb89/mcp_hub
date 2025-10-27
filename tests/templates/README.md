# Test Templates

**Purpose**: Reusable test templates based on Sprint 1-5 patterns

**Last Updated**: 2025-10-27

---

## Overview

This directory contains test templates that encapsulate the testing patterns established during the Sprint 1-5 Test Suite Rewrite Project. These templates serve as starting points for writing new tests that follow MCP Hub's established testing standards.

## Available Templates

### 1. Unit Test Template (`unit-test.template.js`)

**Use When**: Testing individual components, classes, or functions in isolation

**Key Patterns**:
- Behavior-driven testing (test WHAT, not HOW)
- AAA pattern with explicit comments
- Mock external dependencies
- Focus on observable outcomes

**Includes**:
- Constructor and initialization tests
- Core functionality with happy path
- Error handling and edge cases
- State management and transitions
- Event emission verification
- Concurrent operation handling

**Example Use Cases**:
- Testing MCPHub class behavior
- Testing MCPConnection lifecycle
- Testing utility functions
- Testing event emitters

---

### 2. Integration Test Template (`integration-test.template.js`)

**Use When**: Testing multiple components working together or real I/O operations

**Key Patterns**:
- Minimal mocking (use real transports when possible)
- Process lifecycle testing with `vi.waitFor()`
- Timeout and error scenarios
- Real filesystem/network operations

**Includes**:
- Component integration testing
- STDIO transport integration
- SSE transport integration
- HTTP transport integration
- Timeout and race condition testing
- Environment variable resolution
- Parallel operation handling

**Example Use Cases**:
- Testing MCPConnection with real transports
- Testing OAuth flow end-to-end
- Testing file watching behavior
- Testing multi-server coordination

---

### 3. Event-Driven Test Template (`event-driven-test.template.js`)

**Use When**: Testing components that use Node.js EventEmitter pattern

**Key Patterns**:
- EventEmitter mocking with `vi.hoisted()`
- Event emission verification
- Event handler testing
- Event-driven state transitions

**Includes**:
- Event emission tests
- Event handler registration/removal
- Hub event integration
- Event error handling
- Event-driven state transitions
- Event propagation and bubbling

**Example Use Cases**:
- Testing MCPHub event coordination
- Testing server endpoint capability sync
- Testing event-based notifications
- Testing event propagation patterns

---

### 4. Async Test Template (`async-test.template.js`)

**Use When**: Testing asynchronous operations, promises, timeouts, or concurrent operations

**Key Patterns**:
- `vi.waitFor()` for async condition waiting
- `Promise.race()` for timeout testing
- `Promise.allSettled()` for concurrent operations
- Proper async/await error handling

**Includes**:
- Basic async operations
- Concurrent operation handling
- Timeout and race conditions
- Async state management with `vi.waitFor()`
- Resource acquisition and cleanup
- Async error propagation
- Retry logic with exponential backoff
- Debounce and throttle patterns

**Example Use Cases**:
- Testing tool execution timeouts
- Testing concurrent server connections
- Testing async resource cleanup
- Testing retry mechanisms

---

### 5. Configuration Test Template (`config-test.template.js`)

**Use When**: Testing configuration loading, validation, or file operations

**Key Patterns**:
- `mock-fs` for filesystem isolation
- `vi.hoisted()` for fs module mocking
- Configuration validation testing
- File watching behavior

**Includes**:
- Configuration loading (valid, invalid, missing)
- Configuration merging (shallow and deep)
- Schema validation
- Custom validation rules
- File watching with debounce
- Default value application
- Environment variable resolution

**Example Use Cases**:
- Testing ConfigManager
- Testing config file merging
- Testing schema validation
- Testing file watching behavior

---

## How to Use Templates

### Step 1: Copy Template

```bash
cp tests/templates/unit-test.template.js tests/your-component.test.js
```

### Step 2: Replace Placeholders

Search and replace the following placeholders:
- `YourComponent` → Actual component name
- `your-component` → Actual file path
- `YourBehavior` → Actual behavior name
- `performOperation` → Actual method name

### Step 3: Customize Tests

1. Keep the test structure (AAA pattern with comments)
2. Modify fixtures and assertions for your component
3. Add domain-specific test scenarios
4. Follow the checklist at the bottom of each template

### Step 4: Run Tests

```bash
# Run single test file
npm test -- your-component.test.js

# Run with watch mode
npm run test:watch -- your-component.test.js

# Check coverage
npm run test:coverage
```

---

## Template Selection Guide

| Scenario | Recommended Template |
|----------|---------------------|
| New class/function | `unit-test.template.js` |
| Real transport testing | `integration-test.template.js` |
| EventEmitter component | `event-driven-test.template.js` |
| Async operations | `async-test.template.js` |
| Config management | `config-test.template.js` |
| Multiple patterns needed | Combine templates |

---

## Common Patterns Across Templates

### 1. AAA Pattern

Always use explicit comments for test structure:

```javascript
it('should do something', () => {
  // ARRANGE: Set up test environment
  const input = createTestData();

  // ACT: Perform operation
  const result = component.performOperation(input);

  // ASSERT: Verify expected outcome
  expect(result).toBe(expected);
});
```

### 2. Behavior-Focused Testing

Test WHAT the code does, not HOW:

```javascript
✅ GOOD: expect(hub.connections.has('server')).toBe(true);
❌ BAD: expect(logger.debug).toHaveBeenCalledWith(...);
```

### 3. Test Naming Convention

Format: `should [expected behavior] when [scenario/condition]`

```javascript
✅ GOOD: 'should exclude disabled servers from active connections'
❌ BAD: 'should call logger.debug'
```

### 4. Fixture Reuse

Use helper functions for consistent test data:

```javascript
import { createTestConfig, createToolList } from './helpers/fixtures.js';

const config = createTestConfig({ customOption: 'value' });
const tools = createToolList(3, 'file');
```

### 5. Semantic Assertions

Use assertion helpers for clarity:

```javascript
import { expectServerConnected, expectToolCallSuccess } from './helpers/assertions.js';

expectServerConnected(hub, 'server1');
expectToolCallSuccess(result);
```

---

## Anti-Patterns to Avoid

### ❌ 1. Testing Implementation Details

```javascript
// BAD: Testing internal method calls
expect(component.internalMethod).toHaveBeenCalled();

// GOOD: Testing observable behavior
expect(component.status).toBe('completed');
```

### ❌ 2. Logger Assertions

```javascript
// BAD: Asserting on logger calls
expect(logger.info).toHaveBeenCalledWith('Connected');

// GOOD: Asserting on actual state changes
expect(connection.status).toBe('connected');
```

### ❌ 3. Hardcoded Delays

```javascript
// BAD: Arbitrary timeout
await new Promise(resolve => setTimeout(resolve, 1000));

// GOOD: Wait for specific condition
await vi.waitFor(() => {
  expect(component.status).toBe('ready');
});
```

### ❌ 4. Missing Cleanup

```javascript
// BAD: No cleanup
afterEach(() => {
  // Nothing
});

// GOOD: Proper resource cleanup
afterEach(async () => {
  await component?.cleanup();
  vi.clearAllMocks();
});
```

### ❌ 5. Vague Test Names

```javascript
// BAD: Unclear test name
it('should work', () => { ... });

// GOOD: Descriptive test name
it('should exclude disabled servers from active connections', () => { ... });
```

---

## Integration with Existing Helpers

All templates work seamlessly with existing test helpers:

### Fixtures (`tests/helpers/fixtures.js`)

```javascript
import {
  createTestConfig,
  createToolList,
  createResourceList,
  createServerConfig,
  createStdioConfig,
  createSSEConfig,
  createHttpConfig
} from './helpers/fixtures.js';
```

### Assertions (`tests/helpers/assertions.js`)

```javascript
import {
  expectServerConnected,
  expectToolCallSuccess,
  expectResourceReadSuccess,
  expectServerError,
  expectConnectionError
} from './helpers/assertions.js';
```

### Mocks (`tests/helpers/mocks.js`)

```javascript
import {
  createMockClient,
  createMockTransport
} from './helpers/mocks.js';
```

---

## Template Maintenance

### When to Update Templates

1. **New Pattern Discovered**: When a new testing pattern proves valuable, add it to relevant templates
2. **Anti-Pattern Identified**: Document and add to anti-patterns section
3. **Helper Function Added**: Update template imports and examples
4. **Coverage Gap**: Add test scenarios that improve coverage

### How to Propose Changes

1. Create issue describing pattern or improvement
2. Update relevant template(s)
3. Add example to template README
4. Update template checklist
5. Submit PR with template changes

---

## Additional Resources

- **Testing Standards**: `tests/TESTING_STANDARDS.md`
- **Sprint Documentation**: `claudedocs/TEST_SUITE_INDEX.md`
- **Coverage Analysis**: `claudedocs/Sprint5_CoverageAnalysis.md`
- **Contributing Guidelines**: `CONTRIBUTING.md`

---

## Quick Start Example

```bash
# 1. Copy template
cp tests/templates/unit-test.template.js tests/my-component.test.js

# 2. Edit test file
# - Replace YourComponent with MyComponent
# - Replace your-component with my-component
# - Customize test scenarios

# 3. Run tests
npm test -- my-component.test.js

# 4. Check coverage
npm run test:coverage
```

---

## Template Quality Standards

All templates follow these standards:

✅ **Behavior-Driven**: Test observable outcomes, not implementation
✅ **AAA Pattern**: Explicit Arrange-Act-Assert comments
✅ **Comprehensive**: Cover happy path, errors, and edge cases
✅ **Well-Documented**: Include checklists and anti-patterns
✅ **Helper Integration**: Use existing fixture and assertion helpers
✅ **Realistic**: Based on actual Sprint 1-5 test patterns
✅ **Maintainable**: Clear naming and structure
✅ **Complete**: Include setup, teardown, and cleanup

---

**For Questions or Improvements**:
- Review `tests/TESTING_STANDARDS.md`
- Check existing tests for examples
- Consult Sprint 1-5 documentation in `claudedocs/`
