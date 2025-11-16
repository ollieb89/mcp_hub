# Baseline Test Restoration Checklist

**Objective**: Restore baseline test suite to 100% pass rate
**Current Status**: 187/273 passing (68.5%)
**Target Status**: 273/273 passing (100%)
**Estimated Time**: 4-6 hours

---

## Pre-Work Validation

- [x] Baseline tests identified (273 tests across 10 files)
- [x] Baseline test results documented
- [x] Test execution scripts added to package.json
- [x] Documentation created (3 comprehensive reports)
- [ ] Stakeholder approval to proceed with fixes

---

## Priority 1: 🔴 CRITICAL - marketplace.test.js (16/16 failing)

**Issue**: `vi.mock()` API incompatibility with Bun's Vitest
**Estimate**: 2 hours

### Tasks
- [ ] Read marketplace.test.js to understand mock pattern
- [ ] Research Bun-compatible `vi.mock()` syntax
- [ ] Update mock pattern in beforeEach hook (lines 86-95)
- [ ] Test individual marketplace functions
- [ ] Verify all 16 tests passing
- [ ] Run: `bun test tests/marketplace.test.js`
- [ ] Document fix in commit message

### Acceptance Criteria
```bash
bun test tests/marketplace.test.js
# Expected: 16/16 passing
```

### Fix Pattern Example
```javascript
// BEFORE (broken in Bun)
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, exec: mockExec };
});

// AFTER (Bun-compatible)
vi.mock('child_process', () => ({
  exec: vi.fn(),
  execPromise: vi.fn()
}));
```

---

## Priority 2: 🔴 CRITICAL - http-pool.integration.test.js (5 failures)

**Issue**: HTTP Agent not initialized for SSE connections
**Estimate**: 1 hour

### Tasks
- [ ] Read http-pool.integration.test.js failing tests (lines 31-36)
- [ ] Read MCPConnection.js constructor (search for "httpAgent")
- [ ] Identify why Agent not created for SSE transport
- [ ] Fix Agent initialization logic
- [ ] Add unit test for Agent creation
- [ ] Verify all 5 failing tests now pass
- [ ] Run: `bun test tests/http-pool.integration.test.js`
- [ ] Document fix in commit message

### Acceptance Criteria
```bash
bun test tests/http-pool.integration.test.js
# Expected: 13/13 passing (currently ~8/13)
```

### Investigation Starting Points
1. `src/MCPConnection.js` - constructor, search for "Agent"
2. `src/utils/http-pool.js` - createAgent() function
3. Test setup in http-pool.integration.test.js lines 20-40

---

## Priority 3: ⚠️ HIGH - MCPConnection.integration.test.js (8 failures)

**Issue**: Command execution mocks not intercepting `execPromise` calls
**Estimate**: 2 hours

### Tasks
- [ ] Read MCPConnection.integration.test.js failing tests (lines 237-418)
- [ ] Identify mock setup location (likely vi.hoisted block)
- [ ] Research why mockExecPromise not being called
- [ ] Fix mock interception pattern
- [ ] Verify command execution tests pass
- [ ] Test environment resolution integration
- [ ] Run: `bun test tests/MCPConnection.integration.test.js`
- [ ] Document fix in commit message

### Acceptance Criteria
```bash
bun test tests/MCPConnection.integration.test.js
# Expected: 33/33 passing (currently ~25/33)
```

### Affected Tests
- Remote server with command execution in headers (4 tests)
- Command execution failure handling (1 test)
- Environment resolution integration (3 tests)

---

## Priority 4: ⚠️ MEDIUM - env-resolver.test.js (10 failures)

**Issue**: Missing external commands in test environment
**Estimate**: 1 hour

### Tasks
- [ ] Read env-resolver.test.js failing tests (command execution tests)
- [ ] Identify which commands are missing (get-secret, get-remote-token, etc.)
- [ ] Create mock executables in test fixtures
- [ ] OR: Mock child_process.exec properly
- [ ] Verify command resolution tests pass
- [ ] Run: `bun test tests/env-resolver.test.js`
- [ ] Document fix in commit message

### Acceptance Criteria
```bash
bun test tests/env-resolver.test.js
# Expected: 55/55 passing (currently ~45/55)
```

### Fix Options
**Option A**: Mock child_process globally
```javascript
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, callback) => {
    // Return mocked output based on cmd
  })
}));
```

**Option B**: Create stub executables in tests/fixtures/bin/
```bash
#!/bin/bash
echo "secret_value_123"
```

---

## Priority 5: ⚠️ LOW - config.test.js (1 failure)

**Issue**: Schema validation too strict for `autoEnableThreshold: 0`
**Estimate**: 30 minutes

### Tasks
- [ ] Read config.test.js failing test (line 870)
- [ ] Read config schema definition (likely in src/utils/config.js)
- [ ] Update schema to accept `0` as valid threshold
- [ ] Verify test passes
- [ ] Run: `bun test tests/config.test.js`
- [ ] Document fix in commit message

### Acceptance Criteria
```bash
bun test tests/config.test.js
# Expected: 41/41 passing (currently 40/41)
```

### Schema Fix Example
```javascript
// BEFORE
autoEnableThreshold: {
  type: 'number',
  minimum: 1  // Too strict
}

// AFTER
autoEnableThreshold: {
  type: 'number',
  minimum: 0  // Allow zero
}
```

---

## Validation Steps

### After Each Fix

1. Run individual test file:
   ```bash
   bun test tests/[file].test.js
   ```

2. Verify expected pass count

3. Document fix in git commit:
   ```bash
   git add tests/[file].test.js src/[modified].js
   git commit -m "fix(tests): restore [component] baseline tests (X/X passing)"
   ```

### After All Fixes

1. Run full baseline suite:
   ```bash
   bun run test:baseline
   ```

2. Expected output:
   ```
   273 pass
   0 fail
   ```

3. Run with strict mode:
   ```bash
   bun run test:baseline:strict
   ```

4. Expected: No failures, clean exit

---

## Final Verification

### Baseline Quality Check

```bash
# Full baseline suite
bun run test:baseline

# Expected Results:
# env-resolver.test.js: 55/55 ✅
# config.test.js: 41/41 ✅
# MCPConnection.integration.test.js: 33/33 ✅
# MCPConnection.test.js: 32/32 ✅
# http-pool.test.js: 28/28 ✅
# pino-logger.test.js: 26/26 ✅
# MCPHub.test.js: 20/20 ✅
# marketplace.test.js: 16/16 ✅
# http-pool.integration.test.js: 13/13 ✅
# cli.test.js: 9/9 ✅
#
# TOTAL: 273/273 passing (100%)
```

### Coverage Validation

```bash
# Run with coverage
bun run test:coverage

# Expected: Coverage ≥82.94% branches (maintain current level)
```

### Full Test Suite

```bash
# Run all tests (baseline + features)
bun test

# Expected: Baseline 100%, Features 80%+
```

---

## Documentation Updates

After all fixes complete:

- [ ] Update BASELINE_TEST_VALIDATION_REPORT.md with final results
- [ ] Update BASELINE_VALIDATION_EXECUTIVE_SUMMARY.md status
- [ ] Create git commit summarizing all fixes
- [ ] Optional: Create BASELINE_RESTORATION_SUMMARY.md

---

## Git Commit Strategy

### Individual Fix Commits

```bash
# After each fix
git add tests/marketplace.test.js
git commit -m "fix(tests): restore marketplace baseline tests (16/16 passing)

- Update vi.mock() to Bun-compatible syntax
- Fix child_process mock pattern
- All marketplace catalog and details tests passing"
```

### Final Summary Commit

```bash
# After all fixes
git add claudedocs/BASELINE_RESTORATION_CHECKLIST.md
git commit -m "docs(tests): baseline test restoration complete (273/273 passing)

Restored baseline test suite from 68.5% to 100% pass rate:
- Fixed marketplace.test.js (16 tests)
- Fixed http-pool.integration.test.js (5 tests)
- Fixed MCPConnection.integration.test.js (8 tests)
- Fixed env-resolver.test.js (10 tests)
- Fixed config.test.js (1 test)

Total: 40 tests restored, baseline quality verified.
Ready for Phase 2 development."
```

---

## Success Metrics

- [x] Baseline tests identified (273 tests)
- [ ] marketplace.test.js: 0% → 100% (16 tests)
- [ ] http-pool.integration.test.js: 62% → 100% (5 tests)
- [ ] MCPConnection.integration.test.js: 75% → 100% (8 tests)
- [ ] env-resolver.test.js: 82% → 100% (10 tests)
- [ ] config.test.js: 98% → 100% (1 test)
- [ ] **Overall baseline: 68.5% → 100% (86 tests restored)**

---

## Phase 2 Readiness Gate

**BEFORE Phase 2 development can begin:**

- [ ] All baseline tests passing (273/273)
- [ ] Coverage maintained (≥82.94% branches)
- [ ] Documentation updated
- [ ] Git commits clean and descriptive
- [ ] CI/CD quality gates implemented (if applicable)

**Once complete:**
✅ **APPROVED FOR PHASE 2 DEVELOPMENT**

---

**Checklist Created**: 2025-11-16
**Status**: READY FOR EXECUTION
**Next Action**: Begin Priority 1 (marketplace.test.js)
