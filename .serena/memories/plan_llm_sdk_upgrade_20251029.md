# Plan: LLM SDK Upgrade - Official SDK Integration

**Date**: 2025-10-29
**Goal**: Upgrade LLM Enhancement from fetch-based to official SDK-based implementation
**Status**: Phase 2 Complete ✅ | Phase 3 Ready to Start
**Estimated Duration**: 5-7 hours total | ~2.5 hours spent

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

## Target State
- ✅ Official OpenAI SDK with typed errors (COMPLETE)
- ✅ Official Anthropic SDK with typed errors (COMPLETE)
- ✅ Built-in retry logic with exponential backoff (COMPLETE)
- ✅ Request ID tracking for all API calls (COMPLETE)
- ✅ Enhanced observability and logging (COMPLETE)
- ⏳ Maintain 442/442 test pass rate (Full suite validation pending)

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
**Status**: ⏳ Ready to Start

Remaining Tasks:
- ⏳ Task 3.1: Update Test Mocks for SDK (45 min)
  - Replace nock/fetch mocks with SDK mocks in llm-provider.test.js
  - Add typed error tests
  - Verify retry behavior
  
- ⏳ Task 3.2: Run Full Test Suite (30 min)
  - Validate all 442 tests still passing
  - Check for any regressions
  
- ⏳ Task 3.3: Performance Benchmarking (15 min)
  - Verify <5ms overhead from SDK
  - Compare with baseline metrics

### Phase 4: Documentation & Cleanup (1h)
**Status**: ⏳ Not Started

## Success Criteria

| Metric | Target | Current Status |
|--------|--------|----------------|
| Test Pass Rate | 442/442 (100%) | 79/79 tool-filtering ✅ |
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
- **Phase 3 Estimate**: 1.5 hours
- **Phase 4 Estimate**: 1 hour
- **Total Remaining**: 2.5 hours

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

## Next Actions (Phase 3)
1. Update llm-provider.test.js to use SDK mocks instead of nock
2. Run full test suite (442 tests) to verify no regressions
3. Benchmark performance to ensure <5ms overhead
4. Proceed to Phase 4 documentation if all tests pass

## Related Memories
- `task_2.1_sdk_installation_complete`
- `task_2.2_openai_sdk_refactor_complete`
- `task_2.3_anthropic_sdk_refactor_complete`
- `task_2.4_factory_verification_complete`
- `task_2.5_observability_complete`

## Risk Assessment
✅ **Phase 2 Risks Mitigated**:
- SDK version conflicts → Resolved (compatible versions installed)
- Breaking test mocks → Resolved (tests updated, 79/79 passing)
- Performance regression → Low risk (SDK is optimized)
- Breaking changes to API → Resolved (backward compatible)

⚠️ **Phase 3 Risks**:
- Test failures in llm-provider.test.js → Medium (nock → SDK mock migration)
- Full suite regressions → Low (isolated changes to LLM layer)
- Performance overhead → Low (SDK is production-optimized)

## Completion Status
- Phase 1: ✅ Skipped
- Phase 2: ✅ Complete (100%)
- Phase 3: ⏳ Ready to start
- Phase 4: ⏳ Pending Phase 3

**Overall Progress**: ~40% complete (2 of 4 phases done)
**Time Efficiency**: On track (2.5h / 5-7h budget)
