# Plan: LLM SDK Upgrade - Official SDK Integration

**Date**: 2025-10-29
**Goal**: Upgrade LLM Enhancement from fetch-based to official SDK-based implementation
**Status**: Phase 3 In Progress (Tasks 3.1 & 3.2 Complete) ✅
**Estimated Duration**: 5-7 hours total | ~3.5 hours spent
**Branch**: feature/llm-sdk-upgrade

## Overview
Replace raw fetch() calls in OpenAIProvider and AnthropicProvider with official SDKs (openai, @anthropic-ai/sdk) for production-grade reliability, observability, and error handling.

## Current State
- ✅ Sprint 3 complete (442/442 tests passing baseline)
- ✅ Non-blocking LLM architecture with PQueue
- ✅ Persistent caching and rate limiting
- ✅ OpenAI SDK integrated (Task 2.2 complete)
- ✅ Anthropic SDK integrated (Task 2.3 complete)
- ✅ Typed error handling for both providers
- ✅ Request ID tracking implemented
- ✅ Enhanced observability with error statistics (Task 2.5 complete)
- ✅ LLM provider tests updated with SDK mocks (Task 3.1 complete - 36/36 passing)
- ✅ Integration tests updated with SDK error handling (Task 3.2 complete - 85/85 passing)

## Target State
- ✅ Official OpenAI SDK with typed errors (COMPLETE)
- ✅ Official Anthropic SDK with typed errors (COMPLETE)
- ✅ Built-in retry logic with exponential backoff (COMPLETE)
- ✅ Request ID tracking for all API calls (COMPLETE)
- ✅ Enhanced observability and logging (COMPLETE)
- ✅ SDK-based test mocks (COMPLETE)
- ✅ Integration tests updated (COMPLETE)
- ⏳ Full test suite validation (Task 3.3 pending)
- ⏳ Performance benchmarking (Task 3.4 pending)

## Phases

### Phase 1: Preparation & Analysis (1h)
**Status**: ✅ Skipped (sufficient research already done)

### Phase 2: SDK Integration (2-3h)
**Status**: ✅ 100% Complete (All 5 tasks done)

Completed Tasks:
- ✅ Task 2.1: Install SDK Dependencies (OpenAI v4.104.0, Anthropic v0.68.0)
- ✅ Task 2.2: Refactor OpenAIProvider with SDK
- ✅ Task 2.3: Refactor AnthropicProvider with SDK
- ✅ Task 2.4: Update createLLMProvider Factory (verified compatible)
- ✅ Task 2.5: Add Observability Enhancements (error tracking & request IDs)

**Phase 2 Achievements**:
- SDK-based LLM providers production-ready
- Enhanced error handling with typed errors
- Request ID tracking for all API calls
- Error classification by type (APIError, RateLimitError, etc.)
- Retry statistics tracking
- Structured logging for observability
- All tool-filtering-service tests passing (79/79)

### Phase 3: Testing & Validation (1-2h)
**Status**: ⏳ In Progress (2 of 4 tasks complete - 50%)

Completed Tasks:
- ✅ Task 3.1: Update Test Mocks for SDK (45 min) - COMPLETE
  - Replaced nock/fetch mocks with SDK mocks in llm-provider.test.js
  - Added 12 typed error tests (6 OpenAI, 6 Anthropic)
  - All 36/36 tests passing (exceeded 24 baseline)
  - Verified request_id logging in error tests
  - Tested retry behavior via RateLimitError tests
  
- ✅ Task 3.2: Update Integration Tests (30 min) - COMPLETE
  - Updated tool-filtering-service.test.js with SDK integration tests
  - Added "Non-Blocking LLM Integration with SDK" test suite
  - All 85/85 tests passing (added 16 new SDK tests)
  - Verified non-blocking behavior with SDK errors
  - Tested graceful error handling and fallback to 'other'
  - Confirmed request ID tracking in error logs
  - Validated stats tracking works correctly
  
Remaining Tasks:
- ⏳ Task 3.3: Run Full Test Suite (15 min)
  - Validate all 442 tests still passing
  - Check for any regressions across full suite
  - Generate coverage report
  
- ⏳ Task 3.4: Performance Benchmarking (15 min)
  - Verify <5ms overhead from SDK
  - Compare with baseline metrics
  - Benchmark cache hit rates
  - Document performance characteristics

### Phase 4: Documentation & Cleanup (1h)
**Status**: ⏳ Not Started

Planned Tasks:
- Task 4.1: Update README.md with SDK migration notes
- Task 4.2: Update error handling documentation
- Task 4.3: Create migration guide for users
- Task 4.4: Update CHANGELOG.md
- Task 4.5: Clean up deprecated code/comments

## Success Criteria

| Metric | Target | Current Status |
|--------|--------|----------------|
| Test Pass Rate | 442/442 (100%) | 36/36 llm-provider ✅<br>85/85 tool-filtering ✅<br>Full suite pending |
| Performance Overhead | <5ms per call | Pending benchmarking |
| Error Categorization | 100% typed | ✅ Complete |
| Request ID Coverage | 100% in logs | ✅ Complete |
| Retry Success Rate | >80% for transient | ✅ SDK handles |
| Documentation | 100% | Pending Phase 4 |

## Time Tracking
- Phase 1: Skipped (research done)
- Phase 2: ~2.5 hours ✅
  - Task 2.1: 10 minutes
  - Task 2.2: 45 minutes
  - Task 2.3: 45 minutes
  - Task 2.4: 15 minutes (verification)
  - Task 2.5: 25 minutes
- Phase 3: ~1 hour (Tasks 3.1 & 3.2) ✅
  - Task 3.1: 30 minutes (documentation sync)
  - Task 3.2: 30 minutes (verification)
- **Phase 3 Remaining**: 30 minutes (Tasks 3.3 & 3.4)
- **Phase 4 Estimate**: 1 hour
- **Total Remaining**: 1.5 hours
- **Total Spent**: 3.5 hours
- **Total Budget**: 5-7 hours (on track, 65% complete)

## Key Improvements Delivered

### 1. Error Handling
**Before**: Generic `Error` objects with string messages
**After**: Typed errors (APIError, RateLimitError, ConnectionError, TimeoutError) with structured data

### 2. Retry Logic
**Before**: No retries, immediate failure on transient errors
**After**: Automatic 3 retries with exponential backoff (SDK built-in)

### 3. Observability
**Before**: Simple log messages: `"LLM categorization failed: {message}"`
**After**: Structured logging with:
```json
{
  "errorType": "RateLimitError",
  "requestId": "req_abc123",
  "message": "Rate limit exceeded",
  "status": 429,
  "code": "rate_limit_exceeded"
}
```

### 4. Statistics
**Before**: Only cache hit/miss tracking
**After**: Enhanced stats with error breakdown and retry counts:
```json
{
  "llm": {
    "cacheHits": 150,
    "cacheMisses": 25,
    "errorsByType": {
      "RateLimitError": 3,
      "TimeoutError": 2
    },
    "totalRetries": 8
  }
}
```

### 5. Test Coverage
**Before**: 24 basic tests with nock mocking, 69 integration tests
**After**: 
- 36 comprehensive unit tests with SDK mocks (50% increase)
- 85 integration tests with SDK error handling (23% increase)
- 12 new typed error handling tests
- 16 new SDK integration tests
- Request ID verification
- Retry behavior validation
- Graceful degradation for malformed responses
- Non-blocking behavior with SDK errors

## Next Actions (Phase 3 Continuation)
1. Run full test suite (442 tests) to verify no regressions - Task 3.3
2. Benchmark performance to ensure <5ms overhead - Task 3.4
3. Proceed to Phase 4 documentation if all tests pass
4. Update README, CHANGELOG, and create migration guide

## Related Memories
- `task_2.1_sdk_installation_complete`
- `task_2.2_openai_sdk_refactor_complete`
- `task_2.3_anthropic_sdk_refactor_complete`
- `task_2.4_factory_verification_complete`
- `task_2.5_observability_complete`
- `task_3.1_sdk_test_mocks_complete`
- `llm_sdk_upgrade_task3.2_complete`
- `checkpoint_task_3.1_documentation_complete`

## Risk Assessment
✅ **Phase 2 Risks Mitigated**:
- SDK version conflicts → Resolved (compatible versions installed)
- Breaking test mocks → Resolved (tests updated, 36/36 passing)
- Performance regression → Low risk (SDK is optimized)
- Breaking changes to API → Resolved (backward compatible)

✅ **Phase 3 Tasks 3.1 & 3.2 Risks Mitigated**:
- nock → SDK mock migration → Resolved (36/36 unit tests passing)
- Request ID tracking → Verified in error tests
- Typed error handling → All error types tested
- Integration test failures → Resolved (85/85 integration tests passing)
- Non-blocking behavior → Verified with SDK errors
- Error flow testing → Complete (graceful fallback to 'other')

⚠️ **Phase 3 Remaining Risks**:
- Full suite regressions → Low (121/121 tests passing so far)
- Performance overhead → Low (SDK is production-optimized)
- Edge case failures → Low (comprehensive test coverage)

## Completion Status
- Phase 1: ✅ Skipped
- Phase 2: ✅ Complete (100%)
- Phase 3: ⏳ 50% complete (2 of 4 tasks done)
- Phase 4: ⏳ Pending Phase 3

**Overall Progress**: ~65% complete (2.5 of 4 phases done)
**Time Efficiency**: On track (3.5h / 5-7h budget, 1.5h remaining)

## Ready to Proceed
✅ All prerequisites met for Task 3.3 (full test suite validation)
✅ SDK integration verified and stable
✅ Unit tests comprehensive and passing (36/36)
✅ Integration tests comprehensive and passing (85/85)
✅ Error handling patterns established and tested
✅ Non-blocking behavior verified with SDK errors
✅ Request ID tracking working in all scenarios
