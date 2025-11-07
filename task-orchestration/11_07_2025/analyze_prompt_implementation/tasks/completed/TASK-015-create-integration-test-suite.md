# TASK-015: Create Integration Test Suite

## Status
- **Current**: TODO
- **Assigned**: Frontend Developer
- **Priority**: HIGH
- **Estimated**: 3 hours
- **Phase**: 3 - Testing Infrastructure

## Description
Create comprehensive integration test suite for prompt-based filtering with 23 tests covering all critical flows.

## Context
Integration tests validate complete end-to-end behavior including LLM analysis, tool filtering, and session management.

## Dependencies
- **Blocks**: None (validates implementation)
- **Requires**: TASK-001 through TASK-013 (all implementation complete)

## Acceptance Criteria
- [ ] 23 integration tests created
- [ ] Tests cover meta-tool registration
- [ ] Tests cover session initialization (zero, meta-only, minimal, custom)
- [ ] Tests cover tool exposure filtering
- [ ] Tests cover session isolation
- [ ] Tests cover LLM analysis flow
- [ ] Tests cover error handling
- [ ] Tests cover backward compatibility
- [ ] All tests passing
- [ ] Test coverage >90% for new code

## Test Suite Structure

### File Location
`tests/prompt-based-filtering.test.js`

### Test Categories (23 total tests)

**Category 1: Meta-Tool Registration** (3 tests)
1. hub__analyze_prompt registered when filtering enabled
2. Meta-tool not registered when filtering disabled
3. Meta-tool has correct schema

**Category 2: Session Initialization** (5 tests)
4. zero-default: Session starts with empty exposedCategories
5. meta-only: Session starts with ['meta'] only
6. minimal: Session starts with ['meta', 'filesystem']
7. custom: Session starts with configured categories
8. Session exposureHistory initialized empty

**Category 3: Tool Exposure Filtering** (6 tests)
9. tools/list returns empty with zero-default before analysis
10. tools/list returns meta-only tools with meta-only mode
11. tools/list returns filtered tools after analysis
12. tools/list filters by multiple categories
13. Additive mode accumulates categories
14. Replacement mode replaces categories

**Category 4: Session Isolation** (3 tests)
15. Different sessions have independent exposedCategories
16. Session A changes don't affect Session B
17. Multiple concurrent sessions work correctly

**Category 5: LLM Analysis** (4 tests)
18. analyze_prompt identifies GitHub category correctly
19. analyze_prompt identifies multiple categories
20. analyze_prompt handles LLM failure gracefully
21. Heuristic fallback works when LLM unavailable

**Category 6: Backward Compatibility** (2 tests)
22. tools/list returns all tools when filtering disabled
23. Existing behavior unchanged when feature flag off

## Implementation Template
(See full test suite structure in ANALYZE_PROMPT_PLAN.md Section 5.1)

## Testing Strategy
- Use Vitest for test execution
- Mock LLM providers for consistent results
- Use supertest for API testing
- Mock MCPHub and ToolFilteringService
- Test actual MCP protocol messages

## Success Metrics
- All 23 tests pass
- Test coverage >90% for new code
- Tests run in < 10 seconds
- No flaky tests
- Clear test failure messages

## Related Tasks
- TASK-016: Create validation script
- TASK-017: Create testing guide

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 5.1
- `claudedocs/TESTING_ANALYZE_PROMPT.md`
- Existing test patterns in tests/ directory
