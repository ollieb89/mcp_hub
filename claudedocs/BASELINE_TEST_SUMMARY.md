# Baseline Test Suite Summary

**Quick Reference**: What you need to know about MCP Hub's baseline tests

---

## What Are Baseline Tests?

**Baseline tests** = Core functionality tests created BEFORE Sprint 1 (2025-10-27)

These 273 tests validate the foundational MCP Hub systems that existed before feature additions:
- MCP server orchestration
- Connection management (STDIO, SSE, HTTP)
- Configuration system
- HTTP connection pooling
- Environment resolution
- Logging and utilities

---

## Quick Commands

```bash
# Run baseline tests (273 tests)
bun run test:baseline

# Run baseline tests with watch mode
bun run test:baseline:watch

# Run baseline tests with fail-fast (stops on first failure)
bun run test:baseline:strict

# Run feature tests only (Sprint 1-4 additions)
bun run test:features

# Run all tests (baseline + features)
bun test
```

---

## Baseline Test Files (10 files, 273 tests)

| File | Tests | Pass Rate | Status |
|------|-------|-----------|--------|
| env-resolver.test.js | 55 | ~82% | ⚠️ Needs fixes |
| config.test.js | 41 | ~98% | ⚠️ Minor issue |
| MCPConnection.integration.test.js | 33 | ~75% | ⚠️ Needs fixes |
| MCPConnection.test.js | 32 | 100% | ✅ Good |
| http-pool.test.js | 28 | 100% | ✅ Good |
| pino-logger.test.js | 26 | 100% | ✅ Good |
| MCPHub.test.js | 20 | 100% | ✅ Good |
| marketplace.test.js | 16 | 0% | 🔴 BROKEN |
| http-pool.integration.test.js | 13 | ~62% | 🔴 Needs fixes |
| cli.test.js | 9 | 100% | ✅ Good |

**Overall**: 187/273 passing (68.5%) - **REQUIRES FIXES**

---

## Critical Issues Found

### 🔴 BLOCKER: marketplace.test.js (16/16 failing)

**Problem**: `vi.mock()` API incompatibility with Bun's Vitest

**Fix**: Update mock pattern to Bun-compatible syntax

**Impact**: All marketplace functionality untested

---

### 🔴 BLOCKER: http-pool.integration.test.js (~5 failures)

**Problem**: HTTP Agent not initialized for SSE connections

**Fix**: Fix Agent initialization in MCPConnection constructor

**Impact**: Connection pooling feature untested, performance regression risk

---

### ⚠️ HIGH: MCPConnection.integration.test.js (~8 failures)

**Problem**: Command execution mocks not intercepting calls

**Fix**: Fix mock setup in `vi.hoisted()` block

**Impact**: Environment resolution integration paths untested

---

### ⚠️ HIGH: env-resolver.test.js (~10 failures)

**Problem**: Missing external commands in test environment

**Fix**: Mock external commands or use stubbed executables

**Impact**: Real-world command resolution scenarios untested

---

### ⚠️ LOW: config.test.js (1 failure)

**Problem**: Schema validation too strict for `autoEnableThreshold: 0`

**Fix**: Update schema to accept `0` as valid threshold

**Impact**: Minor - edge case validation

---

## Why 273 tests vs 482 historical?

**Answer**: Test consolidation and refactoring during Sprint rewrites

The original 482 tests included:
- Redundant test cases (merged)
- Outdated tests (removed)
- Tests split across files (reorganized)
- Tests migrated to feature files (moved)

**The 273 identified tests are the "true baseline"** - they represent core functionality that must work before Phase 2.

---

## Quality Gate Rules

### ✅ Baseline Tests (273 tests)
- **Required Pass Rate**: 100%
- **CI/CD**: BLOCKS PR merge if failing
- **Purpose**: Protect core functionality
- **When to Run**: Before every PR, after every change

### 🎯 Feature Tests (~576 tests)
- **Target Pass Rate**: 80%+
- **CI/CD**: Reports status, doesn't block
- **Purpose**: Validate new features
- **When to Run**: During feature development

---

## Baseline Protection Workflow

### Before Making Changes

```bash
# Verify baseline is healthy
bun run test:baseline

# If failures exist, DON'T proceed
# Fix baseline first, then make changes
```

### After Making Changes

```bash
# Run baseline tests
bun run test:baseline

# If failures:
# 1. Did YOUR change break it? → Fix your code
# 2. Was it already broken? → Fix baseline first

# Only proceed when baseline is 100% passing
```

### Before Merging PR

```bash
# Final validation
bun run test:baseline:strict

# Must show: 273/273 passing
# If not: PR is BLOCKED
```

---

## Next Steps for Phase 2

### BEFORE UI-API Integration Work

**CRITICAL**: Fix all baseline regressions

**Priority Order**:
1. 🔴 Fix marketplace.test.js (16 tests) - 2 hours
2. 🔴 Fix http-pool.integration.test.js (5 tests) - 1 hour
3. ⚠️ Fix MCPConnection.integration.test.js (8 tests) - 2 hours
4. ⚠️ Fix env-resolver.test.js (10 tests) - 1 hour
5. ⚠️ Fix config.test.js (1 test) - 30 min

**Total Estimate**: 4-6 hours to restore baseline quality

**Why This Matters**: Building UI-API integration on unstable foundation = cascading failures

---

## References

- **Full Report**: `claudedocs/BASELINE_TEST_VALIDATION_REPORT.md`
- **Architecture**: `CLAUDE.md` → "Testing Strategy" section
- **Test Results**: `bun run test:baseline` for live status

---

**Last Updated**: 2025-11-16
