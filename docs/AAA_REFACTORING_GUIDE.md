# AAA Pattern Refactoring Guide

**Purpose:** Guide for refactoring existing MCP Hub tests to include AAA pattern comments consistently.

**Status:** Initial refactoring completed for cli.test.js (8 tests) and config.test.js (3 tests sample). Remaining tests need AAA pattern applied.

---

## ✅ Completed Refactoring

| File | Tests Refactored | Status | Result |
|------|------------------|--------|--------|
| tests/cli.test.js | 8/8 (100%) | ✅ Complete | All 9 tests passing |
| tests/config.test.js | 3/41 (7% sample) | 🚧 Sample complete | All 41 tests passing |

---

## 🎯 What is AAA Pattern?

**AAA = Arrange-Act-Assert**

Add explicit comments to make test structure crystal clear:

```javascript
it('should do something', () => {
  // ARRANGE: Set up test environment and inputs
  const input = createTestData();
  const component = new Component(input);

  // ACT: Perform the operation being tested
  const result = component.performOperation();

  // ASSERT: Verify expected outcome
  expect(result).toBe(expected);
});
```

---

## 📋 Files Needing Refactoring

### High Priority (Missing AAA Comments)

| File | Test Count | AAA Count | Priority | Estimated Time |
|------|------------|-----------|----------|----------------|
| tool-filtering-service.test.js | ~80 | ~40 lowercase | Medium | 2-3 hours |
| tool-filtering-integration.test.js | ~20 | 0 | High | 1 hour |
| tool-filtering.benchmark.test.js | ~5 | 0 | Low | 30 min |
| api-filtering-stats.test.js | ~15 | 0 | High | 45 min |
| e2e-filtering.test.js | ~25 | 0 | High | 1 hour |
| filtering-performance.test.js | ~10 | 0 | Medium | 30 min |
| env-resolver.test.js | ~15 | 0 | High | 45 min |
| event-batcher.test.js | ~10 | 0 | Medium | 30 min |
| llm-provider.test.js | ~20 | 0 | High | 1 hour |
| marketplace.test.js | ~15 | 0 | Medium | 45 min |
| config.test.js | 38 remaining | 0 | Medium | 2 hours |

### Medium Priority (Partial AAA Comments)

| File | Test Count | AAA Count | Completeness | Estimated Time |
|------|------------|-----------|--------------|----------------|
| MCPConnection.test.js | ~30 | 5 | ~17% | 1.5 hours |
| MCPHub.test.js | ~40 | 15 | ~38% | 2 hours |

### Low Priority (Good AAA Coverage)

| File | Test Count | AAA Count | Completeness | Notes |
|------|------------|-----------|--------------|-------|
| http-pool.integration.test.js | ~15 | 13 | ~87% | Nearly complete |
| http-pool.test.js | ~25 | 21 | ~84% | Nearly complete |
| MCPConnection.integration.test.js | ~35 | 30 | ~86% | Nearly complete |
| MCPOAuth.test.js | ~25 | 21 | ~84% | Nearly complete |
| MCPServer.test.js | ~40 | 34 | ~85% | Nearly complete |

---

## 🔧 Refactoring Process

### Step 1: Identify Test Structure

Look for the test's natural phases:

```javascript
// BEFORE - No comments
it('should connect to server', async () => {
  const config = createConfig();
  service = new Service(config);
  await service.connect();
  expect(service.isConnected()).toBe(true);
});
```

### Step 2: Add AAA Comments

```javascript
// AFTER - Clear AAA structure
it('should connect to server', async () => {
  // ARRANGE: Setup service with config
  const config = createConfig();
  service = new Service(config);
  
  // ACT: Establish connection
  await service.connect();
  
  // ASSERT: Verify connected state
  expect(service.isConnected()).toBe(true);
});
```

### Step 3: Refine Comments

Make comments specific and helpful:

```javascript
// ❌ Vague
// ARRANGE: Setup
// ACT: Do stuff
// ASSERT: Check

// ✅ Specific
// ARRANGE: Mock server error response
// ACT: Attempt connection
// ASSERT: Verify error handling
```

---

## 📝 AAA Pattern Examples by Test Type

### Unit Test Example
```javascript
it('should validate configuration schema', () => {
  // ARRANGE: Invalid config missing required field
  const invalidConfig = { port: 3000 };
  
  // ACT: Validate config
  const result = ConfigValidator.validate(invalidConfig);
  
  // ASSERT: Verify validation failed
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Missing required field: host');
});
```

### Integration Test Example
```javascript
it('should establish STDIO connection', async () => {
  // ARRANGE: Configure STDIO server
  const config = createStdioConfig('test-server', {
    command: 'node',
    args: ['server.js']
  });
  
  // ACT: Connect to server
  const connection = await hub.connect(config);
  
  // ASSERT: Verify connection established
  expect(connection.status).toBe('connected');
  expect(connection.process.pid).toBeGreaterThan(0);
});
```

### Async Test with Error Example
```javascript
it('should handle connection timeout', async () => {
  // ARRANGE: Mock hanging connection
  const config = createConfig({ timeout: 1000 });
  vi.spyOn(transport, 'connect').mockImplementation(() => 
    new Promise(() => {}) // Never resolves
  );
  
  // ACT & ASSERT: Verify timeout error
  await expect(service.connect(config)).rejects.toMatchObject({
    code: 'TIMEOUT',
    message: expect.stringContaining('timeout')
  });
});
```

### Process Testing Example (Sprint 4 Pattern)
```javascript
it('should exit with code 1 on error', async () => {
  // ARRANGE: Set invalid arguments
  process.argv = ['node', 'cli.js'];
  
  // ACT: Run CLI
  yourCli.run();
  
  // ASSERT: Wait for exit call
  await vi.waitFor(() => {
    expect(mockExit).toHaveBeenCalled();
  }, { timeout: 1000 });
  
  expect(mockExit).toHaveBeenCalledWith(1);
});
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Mistake 1: Comments Too Generic
```javascript
// BAD
it('should work', () => {
  // ARRANGE
  setup();
  // ACT
  doThing();
  // ASSERT
  check();
});
```

### ✅ Fix: Be Specific
```javascript
// GOOD
it('should exclude disabled servers', () => {
  // ARRANGE: Config with disabled server
  const config = createConfig({ disabled: ['server1'] });
  
  // ACT: Get active servers
  const active = hub.getActiveServers();
  
  // ASSERT: Verify server1 excluded
  expect(active).not.toContain('server1');
});
```

### ❌ Mistake 2: Missing Phase Separation
```javascript
// BAD - All in ARRANGE
it('should connect', () => {
  // ARRANGE
  const config = createConfig();
  service = new Service(config);
  await service.connect();
  expect(service.isConnected()).toBe(true);
});
```

### ✅ Fix: Separate Phases
```javascript
// GOOD - Clear separation
it('should connect', () => {
  // ARRANGE
  const config = createConfig();
  service = new Service(config);
  
  // ACT
  await service.connect();
  
  // ASSERT
  expect(service.isConnected()).toBe(true);
});
```

### ❌ Mistake 3: ACT & ASSERT Combined (Sometimes OK!)
```javascript
// ACCEPTABLE for simple expects
it('should throw on invalid input', async () => {
  // ARRANGE: Invalid input
  const input = null;
  
  // ACT & ASSERT: Verify error thrown
  await expect(service.process(input)).rejects.toThrow('Invalid input');
});
```

---

## 🔄 Batch Refactoring Workflow

### For Files with Many Tests (40+ tests)

1. **Read entire file** to understand test structure
2. **Identify patterns** - Are tests already well-structured?
3. **Use multi_replace_string_in_file** for efficiency:
   - Group similar tests (e.g., all constructor tests)
   - Apply same AAA pattern to batch
   - Verify with test run

### Example Batch Refactoring
```javascript
// Original pattern (repeated 10 times)
it('should handle X', () => {
  const x = setupX();
  const result = component.processX(x);
  expect(result).toBe(expected);
});

// After batch refactoring (all 10 at once)
it('should handle X', () => {
  // ARRANGE: Setup X input
  const x = setupX();
  
  // ACT: Process X
  const result = component.processX(x);
  
  // ASSERT: Verify expected result
  expect(result).toBe(expected);
});
```

---

## ✅ Verification Checklist

After refactoring a file, verify:

- [ ] All tests have ARRANGE comment
- [ ] All tests have ACT comment
- [ ] All tests have ASSERT comment
- [ ] Comments are specific, not generic
- [ ] Phases are separated by blank lines
- [ ] Tests still pass: `npm test path/to/file.test.js`
- [ ] No implementation details in comments
- [ ] No logger assertions in tests

---

## 📊 Progress Tracking

Update this table as you complete files:

| File | Before AAA | After AAA | Date | Who |
|------|------------|-----------|------|-----|
| cli.test.js | 0% | 100% | 2025-10-31 | Initial refactor |
| config.test.js | 0% | 7% (sample) | 2025-10-31 | Initial refactor |
| ... | ... | ... | ... | ... |

---

## 🎓 Learning Resources

- **Templates**: `tests/templates/*.template.js` - Reference implementations
- **Testing Standards**: `tests/TESTING_STANDARDS.md` - Complete standards
- **Sprint Docs**: `claudedocs/Sprint*.md` - Pattern evolution
- **FAQ**: `tests/FAQ.md` - Common questions

---

## 🚀 Estimated Timeline

| Phase | Files | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | High-priority files (6 files) | 4-5 hours | High |
| Phase 2 | Medium-priority files (4 files) | 3-4 hours | Medium |
| Phase 3 | Partial coverage files (2 files) | 3-4 hours | Medium |
| Phase 4 | Remaining tests | 2-3 hours | Low |
| **Total** | **~18 files** | **12-16 hours** | - |

**Team Approach:** Split files among 2-3 team members = 4-6 hours per person

---

## 💡 Tips for Efficiency

### Use Find & Replace Patterns
```bash
# Find tests without AAA
grep -n "it(" tests/yourfile.test.js | grep -v "// ARRANGE"

# Count AAA comments
grep -c "// ARRANGE" tests/yourfile.test.js
```

### Multi-File Refactoring
```bash
# Refactor multiple similar files at once
for file in tests/tool-filtering*.test.js; do
  echo "Processing $file..."
  # Apply refactoring
done
```

### Verify After Each File
```bash
# Quick test verification
npm test tests/yourfile.test.js && echo "✅ PASS" || echo "❌ FAIL"
```

---

## 📞 Questions?

- Check `tests/FAQ.md` first
- Review refactored examples in `cli.test.js` and `config.test.js`
- Ask in standup or code review
- Reference Sprint 1-5 documentation in `claudedocs/`

---

## 🎯 Success Criteria

Refactoring is complete when:

✅ All test files have consistent AAA comments  
✅ All tests still pass (308 tests minimum)  
✅ Comments are specific and helpful  
✅ Team can easily understand test structure  
✅ New tests naturally follow the pattern  

---

*Last Updated: October 31, 2025*  
*Part of Sprint 5 Test Suite Improvements*  
*Based on Sprint 1-5 Testing Standards*
