# Master Coordination Plan
## Analyze Prompt Implementation Project

**Project ID**: analyze_prompt_implementation
**Created**: 2025-11-07
**Status**: READY FOR EXECUTION
**Estimated Duration**: 2-3 days
**Total Tasks**: 21

---

## Executive Summary

This project implements the critical fix for `hub__analyze_prompt` meta-tool to enable proper NLP-based MCP tool activation. The implementation addresses three critical bugs and adds comprehensive testing infrastructure.

### Critical Bugs Fixed
1. **LLM Method Mismatch**: Calls non-existent `generateResponse()` method
2. **Missing Tool Filter Integration**: Tool exposure state updated but not enforced
3. **Fragile JSON Parsing**: Fails on markdown blocks and malformed responses

### Project Value
- **Impact**: HIGH - Enables core prompt-based filtering feature
- **Risk**: LOW - Comprehensive testing, clear rollback plan
- **Complexity**: MODERATE - Well-defined requirements, clear architecture

---

## Project Phases

### Phase 1: LLM Provider Enhancement (4 hours)
**Objective**: Add `analyzePrompt()` method to all LLM providers

**Tasks**: 7 tasks (TASK-001 through TASK-007)
- Add base method definition
- Implement in OpenAI, Gemini, Anthropic providers
- Add prompt building helper
- Add response parsing helper
- Add retry logic and fallback

**Critical Path**: TASK-001 → TASK-002/003/004 → TASK-008

**Parallelization**: TASK-002, TASK-003, TASK-004 can run in parallel after TASK-001

### Phase 2: Tool Exposure Protocol (6 hours)
**Objective**: Fix tool filtering integration and session management

**Tasks**: 7 tasks (TASK-008 through TASK-014)
- Fix handleAnalyzePrompt implementation
- Add filterToolsBySessionCategories method
- Modify handleToolsList for filtering
- Add inferToolCategory helper
- Enhance updateClientTools
- Send tools/list_changed notifications
- Add debug logging checkpoints

**Critical Path**: TASK-011 → TASK-009 → TASK-010
**Critical Path**: TASK-001-007 → TASK-008 → TASK-012 → TASK-013

**Parallelization**: TASK-011 (helper) can run in parallel with TASK-008

### Phase 3: Testing Infrastructure (4 hours)
**Objective**: Create comprehensive test suite and validation tools

**Tasks**: 3 tasks (TASK-015 through TASK-017)
- Create integration test suite (23 tests)
- Create automated validation script
- Create testing guide documentation

**Critical Path**: TASK-001-013 → TASK-015 → TASK-016 → TASK-017

**Parallelization**: TASK-016 and TASK-017 can run in parallel after TASK-015

### Phase 4: Documentation & Deployment (2 hours)
**Objective**: Update documentation and deploy to production

**Tasks**: 4 tasks (TASK-018 through TASK-021)
- Update configuration documentation
- Create troubleshooting guide
- Deploy to staging
- Production deployment

**Critical Path**: TASK-020 → TASK-021

**Parallelization**: TASK-018, TASK-019 can run in parallel

---

## Dependency Graph

```
Phase 1: LLM Provider Enhancement
TASK-001 (base method)
  ├─→ TASK-002 (OpenAI impl) ─┐
  ├─→ TASK-003 (Gemini impl) ──┼─→ TASK-007 (fallback)
  ├─→ TASK-004 (Anthropic impl)┘
  ├─→ TASK-005 (prompt builder) ─→ [002, 003, 004]
  └─→ TASK-006 (response parser) ─→ [002, 003, 004]

Phase 2: Tool Exposure Protocol
TASK-007 ─→ TASK-008 (fix handleAnalyzePrompt)
TASK-011 (helper) ─→ TASK-009 (filter method) ─→ TASK-010 (modify handleToolsList)
TASK-008 ─→ TASK-012 (enhance updateClientTools) ─→ TASK-013 (notifications)
TASK-014 (debug logging) [parallel with 008-013]

Phase 3: Testing Infrastructure
TASK-001-013 ─→ TASK-015 (test suite)
TASK-015 ─┬─→ TASK-016 (validation script)
          └─→ TASK-017 (testing guide)

Phase 4: Documentation & Deployment
TASK-001-017 ─┬─→ TASK-018 (config docs)
              ├─→ TASK-019 (troubleshooting)
              └─→ TASK-020 (staging) ─→ TASK-021 (production)
```

---

## Resource Allocation

### Agent Assignment

**AI Engineer** (6 tasks, 5.5 hours)
- TASK-001: Add base method (1h)
- TASK-002: OpenAI implementation (45m)
- TASK-003: Gemini implementation (45m)
- TASK-004: Anthropic implementation (45m)
- TASK-005: Prompt builder (1h)
- TASK-006: Response parser (1.5h)
- TASK-007: Fallback logic (1h)

**Frontend Architect** (7 tasks, 6.5 hours)
- TASK-008: Fix handleAnalyzePrompt (2h)
- TASK-009: Filter method (1h)
- TASK-010: Modify handleToolsList (1h)
- TASK-011: Helper method (30m)
- TASK-012: Enhance updateClientTools (1h)
- TASK-013: Notifications (30m)
- TASK-014: Debug logging (1h)

**Frontend Developer** (4 tasks, 5 hours)
- TASK-014: Debug logging (shared, 1h)
- TASK-015: Test suite (3h)
- TASK-016: Validation script (1h)
- TASK-017: Testing guide (1h)

**Technical Writer / Developer** (2 tasks, 2 hours)
- TASK-018: Config documentation (1h)
- TASK-019: Troubleshooting guide (1h)

**DevOps / Lead** (2 tasks, 2 hours)
- TASK-020: Staging deployment (1h)
- TASK-021: Production deployment (1h)

### Parallelization Opportunities

**Wave 1** (4 hours) - Can execute in parallel:
```
AI Engineer:
  TASK-001 (1h) → [TASK-002 (45m) || TASK-003 (45m) || TASK-004 (45m)]
  Then: TASK-005 (1h), TASK-006 (1.5h), TASK-007 (1h)

Frontend Architect:
  TASK-011 (30m) → TASK-009 (1h)

Total wave time: ~4 hours (with parallel execution)
```

**Wave 2** (3 hours) - Sequential with limited parallelization:
```
Frontend Architect:
  TASK-008 (2h) → TASK-012 (1h) → TASK-013 (30m)
  TASK-009 (from Wave 1) → TASK-010 (1h)
  TASK-014 (1h) [parallel with above]

Total wave time: ~3 hours
```

**Wave 3** (3 hours) - Testing phase:
```
Frontend Developer:
  TASK-015 (3h) → [TASK-016 (1h) || TASK-017 (1h)]

Total wave time: ~4 hours (3h + max(1h, 1h))
```

**Wave 4** (2 hours) - Documentation and deployment:
```
Technical Writer:
  [TASK-018 (1h) || TASK-019 (1h)]

DevOps:
  TASK-020 (1h) → TASK-021 (1h)

Total wave time: ~3 hours (max(1h, 1h) + 2h)
```

**Total Project Duration**: ~14 hours sequential, ~10-12 hours with parallelization

---

## Risk Management

### High-Risk Tasks
1. **TASK-008** (Fix handleAnalyzePrompt) - Complex integration
2. **TASK-010** (Modify handleToolsList) - Critical for tool exposure
3. **TASK-015** (Test suite) - Must validate all flows

### Mitigation Strategies
- Comprehensive testing at each phase
- Incremental integration (not big bang)
- Debug logging for troubleshooting
- Clear rollback procedures

### Rollback Plan
1. Disable feature in config: `promptBasedFiltering.enabled: false`
2. Restart MCP Hub
3. No data loss (session-scoped only)
4. Clients revert to static tool exposure

---

## Quality Gates

### Phase 1 Gate
- [ ] All 7 LLM provider tasks complete
- [ ] Unit tests pass for each provider
- [ ] Method interfaces consistent
- [ ] No breaking changes to existing code

### Phase 2 Gate
- [ ] All 7 tool exposure tasks complete
- [ ] Integration between components verified
- [ ] Debug logging functional
- [ ] Session management working correctly

### Phase 3 Gate
- [ ] 23 integration tests passing
- [ ] Validation script working
- [ ] Testing guide complete
- [ ] Test coverage >90% for new code

### Phase 4 Gate
- [ ] Documentation complete and reviewed
- [ ] Staging validation successful (24-48h)
- [ ] Production deployment approved
- [ ] Monitoring configured

---

## Success Metrics

### Functional Requirements
- ✅ LLM analysis >80% accuracy
- ✅ tools/list filters by session categories
- ✅ Session isolation working
- ✅ Additive mode progressive expansion
- ✅ Heuristic fallback when LLM unavailable

### Performance Requirements
- ✅ LLM analysis: <2000ms (p95)
- ✅ Tool exposure update: <10ms
- ✅ End-to-end flow: <3000ms
- ✅ Supports 100+ concurrent sessions

### Quality Requirements
- ✅ 100% test coverage for critical paths
- ✅ Comprehensive error handling
- ✅ Debug logging at all key points
- ✅ Complete documentation

---

## Communication Plan

### Daily Standups
- **Time**: Start of each phase
- **Attendees**: All assigned agents
- **Agenda**: Progress update, blockers, plan for day

### Phase Reviews
- **Trigger**: Phase completion
- **Review**: Deliverables, quality gates, lessons learned
- **Decision**: Proceed to next phase or address issues

### Stakeholder Updates
- **Frequency**: End of each phase
- **Format**: Status report with metrics
- **Content**: Progress, risks, next steps

---

## Next Steps

1. **Review and Approve** this coordination plan
2. **Assign agents** to tasks (confirm availability)
3. **Create feature branch**: `fix/analyze-prompt-tool-activation`
4. **Begin Phase 1**: LLM Provider Enhancement
5. **Track progress** using EXECUTION-TRACKER.md

---

## References

- **Detailed Plan**: `claudedocs/ANALYZE_PROMPT_PLAN.md`
- **Quick Start**: Memory `analyze_prompt_implementation_quick_start`
- **Bug Details**: Memory `analyze_prompt_critical_bug_fixes`
- **Testing Guide**: `claudedocs/TESTING_ANALYZE_PROMPT.md` (to be created)
- **Task Files**: `tasks/todos/TASK-*.md`

---

**Status**: Ready for execution
**Last Updated**: 2025-11-07
**Approved By**: [Pending]
