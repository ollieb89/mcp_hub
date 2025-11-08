# Phase 2 Orchestration Package: UI-API Integration

**Project**: MCP Hub UI-API Integration
**Phase**: Phase 2 - API Migration & React Query Integration
**Duration**: 2 weeks (Weeks 3-4, 10 business days)
**Estimated Effort**: 38.25 hours total (40-hour equivalent)
**Status**: Ready for Implementation (pending Phase 1 completion)

---

## Quick Navigation

This orchestration package contains comprehensive documentation for Phase 2 implementation. Start here to understand the full scope, then dive into detailed documents.

### Key Documents

1. **PHASE2_ORCHESTRATION_PLAN.md** (START HERE)
   - Complete Phase 2 overview and strategy
   - Task breakdown with dependencies
   - Risk management and mitigation
   - Success criteria and validation gates
   - **Read this first to understand the complete plan**

2. **PHASE2_AGENT_ASSIGNMENT.md**
   - Detailed agent roles and responsibilities
   - KPIs and success metrics for each agent
   - Coordination protocols and communication
   - Onboarding and knowledge transfer
   - **Use this to understand team structure**

3. **PHASE2_EXECUTION_TIMELINE.md**
   - Week-by-week execution schedule
   - Daily breakdown with time allocations
   - Gantt chart and critical path
   - Contingency scenarios
   - **Use this for day-to-day scheduling**

---

## Phase 2 at a Glance

### What Gets Built

| Component | Type | Quantity | Hours | Status |
|-----------|------|----------|-------|--------|
| **Query Hooks** | React Query hooks | 5 hooks | 7.25h | ⏳ To-do |
| **Mutation Hooks** | React Query mutations | 4 hooks | 6.5h | ⏳ To-do |
| **API Migrations** | Type-safe API files | 4 files | 3h | ⏳ To-do |
| **Tests** | Unit + integration | 15+ test files | 12h | ⏳ To-do |
| **Documentation** | Patterns + reference | 4 guides | 4.25h | ⏳ To-do |
| **Validation** | Checkpoints + sign-offs | 2 gates | 2.25h | ⏳ To-do |
| **Total** | **Complete Phase 2** | **13 tasks** | **38.25h** | ⏳ Ready |

### Build Sequence

```
WEEK 3: Query Foundation          WEEK 4: Mutations & Integration
───────────────────────          ──────────────────────────────

1. API Functions                  1. Optimistic Mutations
   ↓                                ↓
2. Query Hooks                    2. SSE Integration
   ↓                                ↓
3. Unit Tests                     3. Integration Tests
   ↓                                ↓
4. Validation Gate 1              4. Component Audit
                                     ↓
                                  5. Phase 2 Sign-Off (Validation Gate 2)
```

### Team Composition

```
┌─ frontend-developer (100%) ────────────────────────┐
│  Implements all hooks and migrations              │
│  ✓ 9 custom hooks (205-213)                      │
│  ✓ 4 API migrations (201-204)                    │
│  ✓ Component audit (216)                         │
│  ~52.5 hours over 2 weeks                        │
└────────────────────────────────────────────────────┘
  ├─ qa-expert (30%)
  │  Testing, MSW mocks, coverage
  │  ✓ ~12 hours test work
  │
  ├─ typescript-pro (20%)
  │  Type safety, generics, DX
  │  ✓ ~6 hours type review
  │
  ├─ architecture-reviewer (5%)
  │  Weekly reviews, quality gates
  │  ✓ ~2.6 hours oversight
  │
  └─ documentation-expert (10%)
     Patterns guide, API reference
     ✓ ~3.5 hours documentation
```

---

## Phase 2 Success Criteria (Must All Pass)

### Deliverables ✅
- [ ] All 13 tasks complete (201-217)
- [ ] 9 React Query custom hooks implemented
- [ ] 4 optimistic mutation hooks implemented
- [ ] 4 API files migrated to validated request pattern
- [ ] All hooks exported from `/src/ui/api/hooks/index.ts`
- [ ] Comprehensive unit tests (80%+ coverage)
- [ ] Integration tests for complete flows
- [ ] Phase 2 patterns guide documented
- [ ] Component audit document completed

### Quality Gates ✅
- [ ] **TypeScript**: 100% no compilation errors
- [ ] **Testing**: 80%+ branch coverage
- [ ] **Linting**: All files pass ESLint
- [ ] **Type Safety**: Full TypeScript support in hooks
- [ ] **Performance**: No regression vs Phase 1
- [ ] **Documentation**: All hooks documented with examples

### Functional Requirements ✅
- [ ] All query hooks work with real API responses
- [ ] All mutations perform operations without errors
- [ ] Optimistic updates work correctly
- [ ] Rollback scenarios tested and working
- [ ] SSE events properly invalidate caches
- [ ] Error handling comprehensive and tested
- [ ] Component migration audit complete

### Sign-Off Criteria ✅
- [ ] Frontend-developer: Implementation complete
- [ ] QA-expert: Test coverage target met
- [ ] TypeScript-pro: Type safety verified
- [ ] Architect-reviewer: Architecture consistent
- [ ] Documentation-expert: Docs complete
- [ ] Product: Timeline and scope approved

---

## Key Dates & Milestones

| Milestone | Target | Owner | Status |
|-----------|--------|-------|--------|
| **Phase 2 Start** | Week 3, Mon | Team | ⏳ Pending Phase 1 |
| **API Migrations Complete** | Week 3, Tue EOD | frontend-dev | ⏳ To-do |
| **Query Hooks Complete** | Week 3, Thu EOD | frontend-dev | ⏳ To-do |
| **Week 3 Checkpoint** | Week 3, Fri 4 PM | Team | ⏳ To-do |
| **Mutation Hooks Complete** | Week 4, Tue EOD | frontend-dev | ⏳ To-do |
| **SSE Integration Done** | Week 4, Wed EOD | frontend-dev | ⏳ To-do |
| **Integration Tests Complete** | Week 4, Thu EOD | qa-expert | ⏳ To-do |
| **Phase 2 Sign-Off** | Week 4, Fri 4 PM | architect-reviewer | ⏳ To-do |

---

## Task Inventory (13 Total Tasks)

### Week 3: API Migration & Query Hooks (9 Tasks)

#### API Functions (4 tasks, 3 hours)
- **T201**: servers.ts migration → `request<T>(path, ServerResponseSchema)` (1h)
- **T202**: config.ts migration → `request<T>(path, ConfigResponseSchema)` (0.75h)
- **T203**: filtering.ts migration → `request<T>(path, FilteringStatsResponseSchema)` (0.75h)
- **T204**: tools.ts migration → `request<T>(path, ToolsResponseSchema)` (0.5h)

#### Query Hooks (5 tasks, 5.25 hours)
- **T205**: useHealth() hook → Health data with cache (1h)
- **T206**: useServers() hook → All servers list (1.25h)
- **T207**: useServer() hook → Single server detail (1h)
- **T208**: useConfig() hook → Config data (0.75h)
- **T209**: useTools() + useFilteringStats() hooks (1.5h)

### Week 4: Mutations & Integration (4 Tasks)

#### Mutation Hooks (4 tasks, 6.5 hours)
- **T210**: useStartServer() mutation → Optimistic update (1.75h)
- **T211**: useStopServer() mutation → Optimistic update (1.75h)
- **T212**: useSaveConfig() mutation → Version checking (1.5h)
- **T213**: useUpdateFilteringMode() mutation → Tool list sync (1.5h)

#### Integration & Validation (4 tasks, 6 hours)
- **T214**: SSE integration → Cache invalidation (2h)
- **T215**: Integration tests → Complete flow testing (1.5h)
- **T216**: Component audit → Phase 3 migration list (1h)
- **T217**: Phase 2 validation → Checklist & sign-off (1.5h)

---

## Risk Register

### High-Impact Risks

| Risk | Impact | Prob | Mitigation | Status |
|------|--------|------|-----------|--------|
| **Schema validation breaking** | Severe | Low | Phase 1 schemas validated | Active |
| **Cache invalidation race conditions** | High | Med | Deterministic test timing | Active |
| **Type inference complexity** | High | Med | typescript-pro review | Active |

### Medium-Impact Risks

| Risk | Impact | Prob | Mitigation | Status |
|------|--------|------|-----------|--------|
| **Validation performance** | Med | Low | Profiling + benchmarks | Active |
| **Optimistic update edge cases** | Med | Med | Comprehensive testing | Active |

### Low-Impact Risks

| Risk | Impact | Prob | Mitigation | Status |
|------|--------|------|-----------|--------|
| **MSW mock setup** | Low | Low | Reuse Phase 1 handlers | Active |
| **Hook naming conflicts** | Low | VLow | Consistent naming scheme | Active |

**See PHASE2_ORCHESTRATION_PLAN.md for full risk register.**

---

## Communication Protocol

### Daily Standup (9 AM, 15 min)
- Frontend-dev: Progress, blockers, plan
- QA-expert: Test status updates
- Others: Brief updates if needed

### Weekly Sync (Friday 4 PM, 60 min)
- **Attendees**: Full 5-agent team
- **Agenda**: Progress, technical deep-dive, blockers, next week plan
- **Deliverable**: Weekly status report

### Code Review (4-hour SLA)
- **Reviewers**: typescript-pro, qa-expert, architect-reviewer
- **Turnaround**: Same day approval or feedback

---

## Critical Path & Schedule Compression

### Critical Path (Longest Sequence)
```
T201 (1h) → T206 (1.25h) → T210 (1.75h) → T214 (2h) →
T215 (1.5h) → T217 (1h) = 8.5 hours (must run sequentially)
```

### Non-Critical Paths (Can Run Parallel)
- Config path: T202 → T208 → T212 (3h, +1.5h buffer)
- Filtering path: T203-T204 → T209 → T213 (4.25h, +1h buffer)
- Health: T205 standalone (1h)
- Testing: Parallel with implementation

### Schedule Buffer
- **Built-in buffer**: ~4 hours (10% of 38.25h)
- **Contingency scenarios**: Up to 1-day slip possible
- **Flexibility**: Can compress integration tests if needed

---

## Paralllelization Opportunities

### Week 3 Parallelization
```
Day 1:   T201 (servers)     + T205 (useHealth)
Day 2:   T202-T204 (config) + T206 (useServers) + T207 (server detail)
Day 3:   T208 (useConfig) [parallel with T206]
Day 4:   T209 (useTools) [waits for T203-T204]
```

**Result**: ~30% time savings through parallelization

### Week 4 Parallelization
```
Day 1-2: T210-T211 (mutations) [parallel]
         T212-T213 (mutations) [parallel with T210-T211]
Day 3:   T214 (SSE) [independent]
Day 4-5: T215-T216 (testing) [parallel]
```

---

## Dependencies on Phase 1

### Phase 1 Inputs (All Available ✅)

| Component | Phase 1 Status | Phase 2 Usage |
|-----------|---------------|--------------|
| Zod schemas | ✅ Complete | `request<T>(path, schema)` validation |
| API client | ✅ Enhanced | Use validated request wrapper |
| Query client | ✅ Configured | Access via useQueryClient() |
| Query keys | ✅ Factory pattern | Consistent cache key management |
| App providers | ✅ Integrated | QueryClientProvider wrapping |
| SSE manager | ✅ Complete | Cache invalidation system |
| useSSESubscription | ✅ Implemented | Hook integration pattern |

### Phase 2 Outputs (For Phase 3)

| Component | Phase 2 Output | Phase 3 Usage |
|-----------|----------------|--------------|
| 9 hooks | ✅ Custom React Query | Replace direct API calls |
| 4 mutations | ✅ With optimistic updates | Server state changes |
| API files | ✅ Type-safe | Keep as-is |
| Test suite | ✅ Unit + integration | Extend with component tests |
| Type defs | ✅ Exported | Import in components |
| Component audit | ✅ Task 216 | Phase 3 migration checklist |

---

## How to Use This Package

### For Project Manager/Team Lead
1. Read: **PHASE2_ORCHESTRATION_PLAN.md** (executive overview)
2. Reference: **PHASE2_EXECUTION_TIMELINE.md** (milestone tracking)
3. Monitor: **PHASE2_AGENT_ASSIGNMENT.md** (team allocation)

### For Frontend Developer
1. Read: **PHASE2_ORCHESTRATION_PLAN.md** (task details)
2. Reference: **PHASE2_EXECUTION_TIMELINE.md** (daily schedule)
3. Detail: **PHASE2_AGENT_ASSIGNMENT.md** (your responsibilities)

### For QA Expert
1. Read: **PHASE2_ORCHESTRATION_PLAN.md** (testing strategy section)
2. Reference: **PHASE2_AGENT_ASSIGNMENT.md** (your test plan)
3. Detail: **PHASE2_EXECUTION_TIMELINE.md** (test schedule)

### For TypeScript Pro
1. Skim: **PHASE2_ORCHESTRATION_PLAN.md** (overview)
2. Focus: **PHASE2_AGENT_ASSIGNMENT.md** (your type strategy)
3. Reference: **PHASE2_EXECUTION_TIMELINE.md** (review schedule)

### For Architect Reviewer
1. Read: **PHASE2_ORCHESTRATION_PLAN.md** (architecture section)
2. Reference: **PHASE2_AGENT_ASSIGNMENT.md** (review criteria)
3. Monitor: **PHASE2_EXECUTION_TIMELINE.md** (checkpoints)

### For Documentation Expert
1. Skim: **PHASE2_ORCHESTRATION_PLAN.md** (overview)
2. Focus: **PHASE2_AGENT_ASSIGNMENT.md** (documentation tasks)
3. Schedule: **PHASE2_EXECUTION_TIMELINE.md** (documentation timeline)

---

## Pre-Execution Checklist

Before Phase 2 begins, verify:

### Phase 1 Completion ✅
- [ ] All Phase 1 tasks complete (201-217 from Phase 1)
- [ ] All schemas validated against API
- [ ] App.tsx providers integrated
- [ ] SSE manager functional
- [ ] Phase 1 documentation complete

### Team Readiness ✅
- [ ] frontend-developer allocated 100% (Weeks 3-4)
- [ ] qa-expert allocated 30% for testing
- [ ] typescript-pro allocated 20% for type review
- [ ] architect-reviewer allocated 5% for oversight
- [ ] documentation-expert allocated 10% for Phase 2 docs

### Environment Setup ✅
- [ ] Development environment ready
- [ ] TypeScript configured correctly
- [ ] React Query DevTools installed
- [ ] Testing infrastructure available (Vitest, React Testing Library)
- [ ] MSW mocking library ready

### Knowledge Transfer ✅
- [ ] Team read Phase 1 documentation
- [ ] Team reviewed Phase 1 implementation
- [ ] Architecture decisions understood
- [ ] Integration points documented
- [ ] Conventions established

### Backend API Readiness ✅
- [ ] Backend API running and stable
- [ ] API response formats confirmed
- [ ] Authentication working
- [ ] SSE endpoint functional
- [ ] All endpoints return expected data

---

## Success Indicators

### End of Week 3
- ✓ All 9 tasks (201-209) complete
- ✓ 5 query hooks implemented and tested
- ✓ 4 API files migrated to validated pattern
- ✓ Zero TypeScript compilation errors
- ✓ 70%+ test coverage achieved
- ✓ Week 3 checkpoint passed (Go/No-Go = GO)
- ✓ Ready for Week 4 mutation implementation

### End of Week 4
- ✓ All 13 tasks (201-217) complete
- ✓ 4 mutation hooks with optimistic updates
- ✓ SSE integration verified
- ✓ 80%+ test coverage achieved
- ✓ Integration tests passing
- ✓ All success criteria met
- ✓ Phase 2 sign-off approved
- ✓ Ready for Phase 3 component migration

---

## Next Steps (After Phase 2)

### Phase 3: Component Migration (Weeks 5-6)
- Migrate DashboardPage, ServersPage, ToolsPage, ConfigPage
- Refactor to use new hooks
- Implement Atomic Design components
- Estimated: 30 hours, 4 agents

### Phase 4: Testing & Optimization (Weeks 7-8)
- Achieve 80%+ overall test coverage
- Performance optimization
- Accessibility audit
- Estimated: 40 hours, 5 agents

### Phase 5: Polish & Deploy (Weeks 9-10)
- Documentation completeness
- Error monitoring setup
- Deployment preparation
- Estimated: 30 hours, 4 agents

---

## Document References

### Phase 1 Documentation (Foundation)
- `/task-orchestration/01_08_2025/ui_api_integration_phase1/IMPLEMENTATION-SUMMARY.md`
- `/task-orchestration/01_08_2025/ui_api_integration_phase1/PHASE1_COMPLETION_SUMMARY.md`
- `/task-orchestration/01_08_2025/ui_api_integration_phase1/MASTER-COORDINATION.md`
- `/docs/phase1-patterns.md` (usage patterns)

### Phase 2 Documentation (This Package)
- `PHASE2_ORCHESTRATION_PLAN.md` (complete plan)
- `PHASE2_AGENT_ASSIGNMENT.md` (team details)
- `PHASE2_EXECUTION_TIMELINE.md` (scheduling)
- `README.md` (this file)

### Project Source
- `/src/ui/api/schemas/` (Zod schemas from Phase 1)
- `/src/ui/api/client.ts` (enhanced API client)
- `/src/ui/utils/query-client.ts` (React Query config)
- `/src/ui/store/` (Zustand stores)
- `/src/ui/App.tsx` (providers integration)

---

## FAQ & Troubleshooting

**Q: What if Phase 1 isn't complete on time?**
A: Phase 2 depends on Phase 1 completion. Start Phase 2 after Phase 1 sign-off.

**Q: Can we start Phase 2 with fewer team members?**
A: Yes, reduce qa-expert and typescript-pro allocations. QA is critical - maintain minimum 20%.

**Q: What if a hook implementation takes longer than estimated?**
A: Non-critical hooks have parallel execution flexibility. Use built-in buffer (4h).

**Q: How do we handle scope creep?**
A: Architect-reviewer gates changes. Document in weekly sync. Defer to Phase 3 if possible.

**Q: Can we skip documentation in Phase 2?**
A: Not recommended. Phase 3 needs patterns guide. Compress testing instead if pressed.

**Q: What's the minimum viable Phase 2?**
A: All 9 hooks + 4 mutations (Tasks 201-213). Tasks 214-217 could be deferred to Phase 3.

---

## Contact & Escalation

For issues during Phase 2:

- **Task-level blockers**: Contact frontend-developer directly
- **Testing questions**: Reach out to qa-expert
- **Type system issues**: Escalate to typescript-pro
- **Architecture conflicts**: Escalate to architect-reviewer
- **Documentation gaps**: Contact documentation-expert
- **Timeline concerns**: Escalate to architect-reviewer (gatekeeper)

---

## Approval & Sign-Off

**Phase 2 Orchestration Plan Status**: ✅ READY FOR EXECUTION

### Required Approvals (Awaiting Phase 1 Completion)
- [ ] frontend-developer: Confirms task feasibility ⏳
- [ ] qa-expert: Confirms testing approach ⏳
- [ ] typescript-pro: Confirms type strategy ⏳
- [ ] architect-reviewer: Confirms timeline ⏳
- [ ] Product Manager: Confirms scope/timeline ⏳

### Phase 2 Go/No-Go Decision
- **Status**: ⏳ PENDING Phase 1 completion
- **Expected**: Week 3, Monday
- **Authority**: architect-reviewer

---

## Document Info

| Property | Value |
|----------|-------|
| **Document Type** | Orchestration Plan Package |
| **Phase** | 2 (of 5) |
| **Created** | 2025-11-08 |
| **Version** | 1.0 |
| **Status** | Ready for Execution |
| **Total Pages** | ~50 pages (full package) |
| **Files** | 4 markdown documents |
| **Next Review** | Week 3 Kickoff |

---

## Quick Links

- [Full Orchestration Plan](./PHASE2_ORCHESTRATION_PLAN.md)
- [Agent Assignments](./PHASE2_AGENT_ASSIGNMENT.md)
- [Execution Timeline](./PHASE2_EXECUTION_TIMELINE.md)
- [Phase 1 Summary](../ui_api_integration_phase1/IMPLEMENTATION-SUMMARY.md)
- [Project Source Code](/src/ui)

---

**Phase 2 is ready to begin immediately upon Phase 1 completion.**

For questions or clarifications, refer to the appropriate detailed document or contact the architect-reviewer.

---

**Last Updated**: 2025-11-08
**Next Update**: Week 3 Kickoff
**Document Status**: ✅ APPROVED FOR EXECUTION
