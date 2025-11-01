# Test Suite Fixes - Vitest Mocking Patterns (Nov 2024)

## Overview
Fixed 74 failing tests (15.4% failure rate) achieving 482/482 passing tests (100% success rate). All failures were due to JavaScript constructor mocking patterns incompatible with vitest.

## Root Causes Identified

### 1. Arrow Functions Cannot Be Constructors
**Problem:** Arrow functions (`() => {}`) cannot be called with `new` keyword in JavaScript
**Error:** `TypeError: () => value is not a constructor`
**Scope:** 73 tests across MCPConnection.test.js, MCPConnection.integration.test.js, MCPHub.test.js

### 2. mockReturnValue vs mockImplementation Conflict
**Problem:** `.mockReturnValue()` cannot override existing `.mockImplementation()`
**Impact:** Per-test and beforeEach mock customization failed
**Scope:** Integration tests with dynamic mock behavior

### 3. File System State Issues
**Problem:** Test environment missing cache directory `/home/ob/.local/state/mcp-hub/`
**Error:** `ENOENT: no such file or directory`
**File:** tool-filtering-service.js `_flushCache()` method

### 4. Shared Mock Instance Pattern
**Problem:** ConfigManager mock created new instance per call, breaking test setup expectations
**Impact:** MCPHub tests couldn't configure the ConfigManager instance used by MCPHub constructor

## Solutions Applied

### Pattern 1: Module-Level Constructor Mocks
```javascript
// WRONG - Arrow function
vi.mock("module", () => ({
  Constructor: vi.fn(() => ({ method: vi.fn() }))
}));

// CORRECT - Regular function with explicit return
vi.mock("module", () => ({
  Constructor: vi.fn().mockImplementation(function() {
    return {
      method: vi.fn(),
      property: 'value'
    };
  })
}));
```

### Pattern 2: beforeEach Mock Overrides
```javascript
// WRONG - mockReturnValue conflicts with mockImplementation
beforeEach(() => {
  mockInstance = { method: vi.fn() };
  Constructor.mockReturnValue(mockInstance); // Fails!
});

// CORRECT - Chain mockImplementation calls
beforeEach(() => {
  mockInstance = { method: vi.fn() };
  Constructor.mockImplementation(function() { return mockInstance; });
});
```

### Pattern 3: Per-Test Mock Overrides
```javascript
// WRONG - Arrow function in override
it('test', () => {
  Transport.mockImplementationOnce(() => {
    throw new Error("fail");
  });
});

// CORRECT - Regular function
it('test', () => {
  Transport.mockImplementationOnce(function() {
    throw new Error("fail");
  });
});
```

### Pattern 4: Shared Mock Instances
```javascript
// For mocks where all calls should return same instance
let sharedInstance = null;
vi.mock("module", () => ({
  Manager: vi.fn(function() {
    if (!sharedInstance) {
      sharedInstance = {
        method: vi.fn(),
        config: vi.fn()
      };
    }
    return sharedInstance;
  })
}));

// Reset in beforeEach
beforeEach(() => {
  sharedInstance = null;
});
```

### Pattern 5: File System Operations in Tests
```javascript
// Add directory creation before file operations
const dir = path.dirname(filePath);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(filePath, content);
```

## Files Modified

### src/utils/tool-filtering-service.js
- **Line 616:** Added `await fs.mkdir(dir, { recursive: true });` before file write
- **Reason:** Ensure cache directory exists before atomic file operations

### tests/MCPConnection.test.js
- **Lines 13-27:** Fixed Client mock to use .mockImplementation(function() {...})
- **Lines 31-42:** Fixed StdioClientTransport mock
- **Lines 73-74:** Changed beforeEach from mockReturnValue to mockImplementation

### tests/MCPConnection.integration.test.js
- **Lines 14-64:** Fixed 5 module-level mocks (Client, StdioClientTransport, SSEClientTransport, StreamableHTTPClientTransport, DevWatcher)
- **Lines 113-142:** Fixed beforeEach override pattern for 3 transports
- **Multiple locations:** Fixed 8+ per-test mockImplementationOnce calls to use regular functions
- **sed command:** Batch replaced all remaining mockReturnValue(mock*) patterns

### tests/MCPHub.test.js
- **Lines 16-28:** Converted ConfigManager mock to shared instance pattern
- **Line 29-52:** Fixed MCPConnection mock to use .mockImplementation()
- **Line 76:** Added sharedConfigManagerInstance reset in beforeEach
- **Line 198:** Fixed newConnection mockImplementation

## Key Learnings

### JavaScript Constructor Mechanics
1. Arrow functions have no `prototype` property and cannot be constructors
2. Regular functions can be called with `new`, creating `this` context
3. Constructor functions need explicit `return` for mock objects

### Vitest Mock Behavior
1. `.mockImplementation()` is chainable and overridable
2. `.mockReturnValue()` is terminal and cannot override `.mockImplementation()`
3. `.mockImplementationOnce()` respects constructor requirements
4. Mock functions must use `function() {}` syntax for constructor compatibility

### Test Architecture Patterns
1. Module-level mocks define default behavior
2. beforeEach overrides customize per-test-suite behavior
3. Per-test overrides handle specific scenarios
4. Shared instances solve singleton/manager pattern testing

## Debugging Commands Used
```bash
# Capture detailed failure breakdown
npm test 2>&1 > /tmp/test_output.txt && tail -10 /tmp/test_output.txt

# Check specific error patterns
npm test 2>&1 | grep "is not a constructor" | head -5

# Find all mock patterns in file
grep -n "mockImplementation\|mockReturnValue" tests/file.test.js

# Batch replace with sed
sed -i 's/\(Client\|Transport\)\.mockReturnValue(\(mock[^)]*\));/\1.mockImplementation(function() { return \2; });/g' file.test.js
```

## Test Execution Timeline
- **Start:** 408 passing / 74 failing (84.6%)
- **After file system fix:** 409 passing / 73 failing (85.0%)
- **After module mocks:** 449 passing / 33 failing (93.2%)
- **After beforeEach fixes:** 463 passing / 19 failing (96.1%)
- **After sed replacements:** 476 passing / 6 failing (98.8%)
- **After shared ConfigManager:** 481 passing / 1 failing (99.8%)
- **Final:** 482 passing / 0 failing (100%)

## Impact
- **Phase 1 Internal Testing:** UNBLOCKED - deployment can proceed
- **Test reliability:** 100% pass rate establishes stable baseline
- **CI/CD:** Green builds enable confident merging
- **Developer confidence:** All tool filtering features validated

## Related Documentation
- Test failure analysis: `claudedocs/Test_Failure_Analysis.md`
- Test plan: `claudedocs/TEST_PLAN.md`
- Sprint 3 completion: `claudedocs/SPRINT3_COMPLETION.md`
- ML tool workflow: `claudedocs/ML_TOOL_WF.md` (Phase 1 section)

## Prevention Guidelines
1. **Always use regular functions for constructor mocks:** `vi.fn().mockImplementation(function() { return {...}; })`
2. **Override with mockImplementation, not mockReturnValue:** Maintain consistency in mock patterns
3. **Test file operations need directory creation:** Use `fs.mkdir(dir, { recursive: true })`
4. **Singleton mocks need shared instance pattern:** Store instance in closure variable
5. **Verify mock constructability:** If called with `new`, mock must be regular function

## Future Considerations
- Consider extracting mock factory functions to test helpers
- Document mock patterns in CONTRIBUTING.md
- Add pre-commit hook to check for arrow function constructor mocks
- Create vitest custom matcher for constructor compatibility
