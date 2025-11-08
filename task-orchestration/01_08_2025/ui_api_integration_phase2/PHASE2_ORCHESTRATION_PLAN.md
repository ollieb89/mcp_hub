# Phase 2 Orchestration Plan: UI-API Integration

**Project**: MCP Hub UI-API Integration
**Phase**: Phase 2 - API Migration & React Query Integration
**Created**: 2025-11-08
**Duration**: 2 weeks (Weeks 3-4)
**Estimated Effort**: 26.5 hours
**Status**: Ready for Implementation

---

## Executive Summary

Phase 2 focuses on migrating the application from direct API calls to type-safe, cached queries using React Query and implementing optimistic mutations. Building on the solid Phase 1 foundation (schemas, stores, configuration), Phase 2 will:

1. **API Layer**: Migrate existing API functions to use Zod-validated request function
2. **Query Hooks**: Implement 5 React Query hooks with proper caching and invalidation
3. **Mutation Hooks**: Create 4 optimistic mutation hooks for server state changes
4. **Integration**: Connect hooks to existing SSE invalidation system

**Key Metrics**:
- **13 tasks** across 2 weeks
- **26.5 hours** estimated effort
- **5 query hooks** + **4 mutation hooks** = 9 custom hooks total
- **Zero breaking changes** to existing components (Phase 3 migrates components)
- **Parallel execution** opportunities on independent hooks

---

## Phase 1 Foundation Summary

Phase 1 (100% complete) provides:

| Component | Status | Impact for Phase 2 |
|-----------|--------|-------------------|
| **Zod Schemas** | ✅ 6 validated schemas | Type-safe request validation ready |
| **API Client** | ✅ Enhanced with Zod | `request<T>(path, schema)` signature ready |
| **Query Client** | ✅ Configured | Cache, stale time, retry logic ready |
| **Zustand Stores** | ✅ UI + SSE stores | State management ready |
| **SSE Manager** | ✅ Cache invalidation | Real-time updates + query invalidation ready |
| **useSSESubscription** | ✅ Implemented | Hook for cache invalidation integration |
| **App.tsx Providers** | ✅ Updated | QueryClientProvider + DevTools integrated |

**Phase 1 → Phase 2 Contract**:
- Schema validation errors throw `APIError` with consistent structure
- Query cache keys follow `queryKeys` factory pattern
- SSE events trigger cache invalidation via query key
- All API calls must use `request<T>(path, schema)` pattern

---

## Agent Team Composition

### Specialized Agent Team for Phase 2

**Team Lead: Agent Organizer (This Analysis)**
- Strategic planning and task breakdown
- Dependency analysis and parallelization
- Risk management and mitigation
- Quality gates and validation

**Primary: frontend-developer**
- **Allocation**: 100% (Weeks 3-4)
- **Responsibilities**:
  - API function migration (Tasks 201-204)
  - React Query hook implementation (Tasks 205-209)
  - Mutation hook implementation (Tasks 210-213)
  - Hook testing and integration
- **Skills**: TypeScript, React hooks, React Query, API integration
- **Deliverables**: 9 custom hooks + 4 migrated API files

**Secondary: qa-expert**
- **Allocation**: 30% (Weeks 3-4, focused end-of-week)
- **Responsibilities**:
  - Hook testing strategy and implementation
  - Integration test creation (Tasks 214-215)
  - Error handling validation
  - Cache invalidation verification
- **Skills**: React Testing Library, MSW, integration testing
- **Deliverables**: Comprehensive hook test suite

**Tertiary: typescript-pro**
- **Allocation**: 20% (Weeks 3-4, as-needed)
- **Responsibilities**:
  - Type safety review and refinement
  - Hook type inference optimization
  - Generic type constraint validation
  - Type-related error debugging
- **Skills**: Advanced TypeScript, generics, type inference
- **Deliverables**: Type-safe hook implementations with optimal DX

**Documentation: documentation-expert**
- **Allocation**: 10% (End of Phase 2)
- **Responsibilities**:
  - Phase 2 usage patterns documentation
  - Hook API reference guide
  - Mutation pattern examples
  - Phase 2 → Phase 3 migration guide
- **Skills**: Technical writing, API documentation
- **Deliverables**: Comprehensive Phase 2 patterns guide

**Oversight: architect-reviewer**
- **Allocation**: 5% (Weekly checkpoints)
- **Responsibilities**:
  - Architecture consistency review
  - Dependency injection patterns
  - Hook composition patterns
  - API contract validation
- **Skills**: System architecture, design patterns
- **Deliverables**: Weekly architecture review + sign-offs

---

## Phase 2 Task Breakdown

### Week 3: API Migration + Query Hooks

#### Task Group 1: API Function Migration (4 hours)

**Task 201: Migrate servers.ts API functions**
- **Effort**: 1 hour
- **Dependencies**: Phase 1 complete (schema, client)
- **Deliverable**: `/src/ui/api/servers.ts` using validated request
- **Details**:
  - Replace all `fetch()` calls with `request<T>(path, ServerResponseSchema)`
  - Maintain existing function signatures (backward compatible)
  - Add proper error handling with `APIError` type
  - Functions: `getServers()`, `getServer(name)`, `startServer(name)`, `stopServer(name)`

**Task 202: Migrate config.ts API functions**
- **Effort**: 0.75 hour
- **Dependencies**: Task 201 complete
- **Deliverable**: `/src/ui/api/config.ts` using validated request
- **Details**:
  - Replace `fetch()` with `request<T>(path, ConfigResponseSchema)`
  - Functions: `getConfig()`, `saveConfig(data)`

**Task 203: Migrate filtering.ts API functions**
- **Effort**: 0.75 hour
- **Dependencies**: Task 202 complete
- **Deliverable**: `/src/ui/api/filtering.ts` using validated request
- **Details**:
  - Replace `fetch()` with `request<T>(path, FilteringStatsResponseSchema)`
  - Functions: `getFilteringStats()`, `updateFilteringMode(mode)`

**Task 204: Migrate tools.ts API functions**
- **Effort**: 0.5 hour
- **Dependencies**: Task 203 complete
- **Deliverable**: `/src/ui/api/tools.ts` using validated request
- **Details**:
  - Replace `fetch()` with `request<T>(path, ToolsResponseSchema)`
  - Functions: `getTools()`, `getToolsByServer(server)`

**Validation Gate**: All API functions use `request<T>` pattern, no direct `fetch()` calls

---

#### Task Group 2: React Query Hooks - Queries (5.5 hours)

**Task 205: Create useHealth() hook**
- **Effort**: 1 hour
- **Dependencies**: Task 201 (health endpoint uses same client)
- **Location**: `/src/ui/api/hooks/useHealth.ts`
- **Deliverable**:
  ```typescript
  function useHealth(options?: UseQueryOptions<Health>): UseQueryResult<Health>
  ```
- **Features**:
  - Uses `queryKeys.health` for cache key
  - 30-second stale time
  - Auto-refetch on window focus
  - Error boundary integration
- **Testing**: Unit test with MSW mock
- **Type Inference**: Full TypeScript support from HealthResponseSchema

**Task 206: Create useServers() hook**
- **Effort**: 1.25 hour
- **Dependencies**: Task 201, Task 205 complete
- **Location**: `/src/ui/api/hooks/useServers.ts`
- **Deliverable**:
  ```typescript
  function useServers(options?: UseQueryOptions<Server[]>): UseQueryResult<Server[]>
  ```
- **Features**:
  - Uses `queryKeys.servers.all` for cache key
  - Extracts servers from `{ servers: [] }` response
  - 30-second stale time
  - Auto-refetch on window focus
  - Loading, error, data states
- **Testing**: Unit test with MSW mock + loading state verification
- **Type Inference**: Derived from ServersResponseSchema

**Task 207: Create useServer() detail hook**
- **Effort**: 1 hour
- **Dependencies**: Task 206 complete
- **Location**: `/src/ui/api/hooks/useServer.ts`
- **Deliverable**:
  ```typescript
  function useServer(name: string, options?: UseQueryOptions<Server>): UseQueryResult<Server>
  ```
- **Features**:
  - Uses `queryKeys.servers.detail(name)` cache key
  - Conditional enable based on `name` parameter
  - Links to `servers.all` cache (automatically invalidated together)
  - Auto-refetch on window focus
- **Testing**: Unit test with enabled/disabled states
- **Type Inference**: Single Server from array type extraction

**Task 208: Create useConfig() hook**
- **Effort**: 0.75 hour
- **Dependencies**: Task 202 complete
- **Location**: `/src/ui/api/hooks/useConfig.ts`
- **Deliverable**:
  ```typescript
  function useConfig(options?: UseQueryOptions<ConfigData>): UseQueryResult<ConfigData>
  ```
- **Features**:
  - Uses `queryKeys.config` cache key
  - Extracts config from `{ config: {...} }` response
  - 1-minute stale time (config less volatile)
  - Manual refetch trigger for config changes
- **Testing**: Unit test with stale time verification
- **Type Inference**: Extracted from ConfigResponseSchema.data

**Task 209: Create useTools() & useFilteringStats() hooks**
- **Effort**: 1.5 hour
- **Dependencies**: Task 203, Task 204 complete
- **Location**: `/src/ui/api/hooks/useTools.ts` (combined with filtering)
- **Deliverables**:
  ```typescript
  function useTools(options?: UseQueryOptions<Tool[]>): UseQueryResult<Tool[]>
  function useFilteringStats(options?: UseQueryOptions<FilteringStats>): UseQueryResult<FilteringStats>
  ```
- **Features**:
  - `useTools()`: Uses `queryKeys.tools.all`, extracts from response
  - `useFilteringStats()`: Uses `queryKeys.filtering.stats`
  - Both have 30-second stale time
  - Auto-refetch on window focus
- **Testing**: Unit tests for both hooks with type verification
- **Type Inference**: Derived from respective schemas

**Validation Gate**: All 5 query hooks implement:
- ✅ Proper cache key usage
- ✅ Schema validation on request
- ✅ Type-safe return values
- ✅ Error handling
- ✅ MSW test mocks
- ✅ Optional parameter override support

---

### Week 4: Mutation Hooks + Integration

#### Task Group 3: React Query Hooks - Mutations (6.5 hours)

**Task 210: Create useStartServer() mutation hook**
- **Effort**: 1.75 hour
- **Dependencies**: Task 206 (useServers for cache invalidation)
- **Location**: `/src/ui/api/hooks/useStartServer.ts`
- **Deliverable**:
  ```typescript
  function useStartServer(): UseMutationResult<
    Server,
    APIError,
    { name: string },
    Server[]
  >
  ```
- **Features**:
  - **Optimistic update**: Updates server status to 'connected' immediately
  - **Context**: Returns previous servers list for rollback
  - **Invalidation**: Invalidates `queryKeys.servers.all` and `queryKeys.servers.detail(name)`
  - **Retry**: 3 attempts on network failure
  - **Error recovery**: Rollback on API error
  - **Success callback**: Toast notification on success
- **Implementation**:
  ```typescript
  // Optimistic update
  const onMutate = (variables) => {
    // Snapshot current data
    const previousServers = queryClient.getQueryData(queryKeys.servers.all);
    // Update UI optimistically
    queryClient.setQueryData(queryKeys.servers.all, (old: Server[]) =>
      old.map(s => s.name === variables.name ? {...s, status: 'connected'} : s)
    );
    return previousServers;
  };

  // Rollback on error
  const onError = (err, vars, context) => {
    queryClient.setQueryData(queryKeys.servers.all, context.previousServers);
  };
  ```
- **Testing**: Optimistic update + rollback scenarios
- **Type Safety**: Proper context typing for rollback

**Task 211: Create useStopServer() mutation hook**
- **Effort**: 1.75 hour
- **Dependencies**: Task 210 (similar pattern)
- **Location**: `/src/ui/api/hooks/useStopServer.ts`
- **Deliverable**:
  ```typescript
  function useStopServer(): UseMutationResult<void, APIError, { name: string }>
  ```
- **Features**:
  - **Optimistic update**: Updates server status to 'disconnected'
  - **Context**: Returns previous servers for rollback
  - **Invalidation**: Invalidates `queryKeys.servers.all` and detail
  - **Error recovery**: Rollback on failure
  - **Loading state**: Prevents double-clicks during mutation
- **Implementation**: Similar pattern to useStartServer
- **Testing**: Optimistic + error handling

**Task 212: Create useSaveConfig() mutation hook**
- **Effort**: 1.5 hour
- **Dependencies**: Task 208 (useConfig for cache)
- **Location**: `/src/ui/api/hooks/useSaveConfig.ts`
- **Deliverable**:
  ```typescript
  function useSaveConfig(): UseMutationResult<
    ConfigData,
    APIError,
    ConfigData,
    ConfigData
  >
  ```
- **Features**:
  - **Optimistic update**: Updates config cache immediately
  - **Context**: Returns previous config for rollback
  - **Version conflict handling**: Detects concurrent changes
  - **Validation**: Schema validation before send
  - **Invalidation**: Invalidates `queryKeys.config`
  - **Success flow**: Toast notification + refresh
- **Implementation**:
  ```typescript
  const onMutate = (newConfig) => {
    const previousConfig = queryClient.getQueryData(queryKeys.config);
    queryClient.setQueryData(queryKeys.config, newConfig);
    return previousConfig;
  };
  ```
- **Testing**: Optimistic update + version conflict scenarios

**Task 213: Create useUpdateFilteringMode() mutation hook**
- **Effort**: 1.5 hour
- **Dependencies**: Task 209 (useFilteringStats for cache)
- **Location**: `/src/ui/api/hooks/useUpdateFilteringMode.ts`
- **Deliverable**:
  ```typescript
  function useUpdateFilteringMode(): UseMutationResult<
    FilteringStats,
    APIError,
    { mode: FilteringMode }
  >
  ```
- **Features**:
  - **Optimistic update**: Updates filtering mode immediately
  - **Context**: Returns previous stats for rollback
  - **Invalidation**: Invalidates `queryKeys.filtering.stats` and `queryKeys.tools.all`
  - **Tool list sync**: Updates tools cache when filtering mode changes
  - **Success notification**: Confirms mode change
- **Implementation**: Dual cache invalidation for tools + stats
- **Testing**: Multiple cache invalidation + tool list refresh

**Validation Gate**: All 4 mutation hooks implement:
- ✅ Optimistic updates with proper typing
- ✅ Error rollback with context
- ✅ Proper cache invalidation
- ✅ Toast notifications
- ✅ Loading state management
- ✅ Integration tests with MSW + hook testing

---

#### Task Group 4: SSE Integration + Testing (7 hours)

**Task 214: Integrate SSE cache invalidation with hooks**
- **Effort**: 2.5 hour
- **Dependencies**: All mutation hooks complete, useSSESubscription available
- **Location**: Update `/src/ui/utils/sse-client.ts` integration points
- **Deliverable**: Verification that SSE events properly invalidate hook caches
- **Details**:
  - **hub_state** event → Invalidate `queryKeys.health`
  - **servers_updated** event → Invalidate `queryKeys.servers.all`
  - **config_changed** event → Invalidate `queryKeys.config`
  - **tool_list_changed** event → Invalidate `queryKeys.tools.all`
  - **resource_list_changed** event → Custom listeners (Phase 3)
- **Testing**:
  - SSE event triggers query refetch
  - Stale queries refetch on event
  - Fresh queries skip refetch on event
- **Integration**: Verify SSE manager properly invalidates React Query
- **Error Handling**: Graceful handling if cache key doesn't exist

**Task 215: Create comprehensive hook integration tests**
- **Effort**: 2 hour
- **Dependencies**: Tasks 205-213 complete
- **Location**: `/src/ui/api/hooks/__tests__/` directory
- **Deliverable**: Integration test suite covering:
  - Query hook → Mutation hook → Cache update flow
  - SSE event → Cache invalidation → Refetch flow
  - Error handling → Rollback flow
  - Loading states during mutations
  - Type inference in real scenarios
- **Test Coverage**:
  - 3+ scenarios per hook
  - Mock SSE events
  - Mock API responses with MSW
  - Verify cache state changes
- **Validation**: Full integration test success

**Task 216: Update and verify existing API usage**
- **Effort**: 1.5 hour
- **Dependencies**: All hooks complete
- **Location**: Scan `/src/ui/pages/` for existing API calls
- **Deliverable**: List of all locations using old patterns (for Phase 3)
- **Details**:
  - Find all direct `fetch()` or API function calls in components
  - Document which hook each location should use
  - Flag blocking issues (if any)
- **Validation**: Complete component audit document

**Task 217: Phase 2 completion testing & validation**
- **Effort**: 1 hour
- **Dependencies**: All tasks 201-216 complete
- **Deliverable**: Phase 2 validation checklist
- **Details**:
  - All hooks have unit tests
  - All hooks have integration tests
  - SSE integration verified
  - Type safety validated
  - Bundle size impact measured
  - Performance baseline established
- **Success Criteria**:
  - ✅ 80%+ branch coverage for hooks
  - ✅ All tests passing
  - ✅ No TypeScript errors
  - ✅ SSE integration working
  - ✅ Performance acceptable

**Validation Gate**: Phase 2 completion criteria met:
- ✅ All 9 hooks implemented with tests
- ✅ All 4 API files migrated
- ✅ SSE integration verified
- ✅ Documentation complete
- ✅ No breaking changes to existing components

---

## Parallelization Strategy

### Parallel Execution Matrix

| Week | Track 1: Queries | Track 2: Mutations | Track 3: Integration |
|------|-----------------|------------------|---------------------|
| **3** | Tasks 201-209 | Task 204 (blocking) | Setup (parallel with 201-202) |
| **4** | Testing prep | Tasks 210-213 | Tasks 214-217 (end of week) |

### Safe Parallel Opportunities

**Week 3 Parallelization** (Tasks can run concurrently):

```
frontend-developer (primary):
├── Task 201: servers.ts migration (1h) → enables 206, 210
├── Task 202: config.ts migration (0.75h) → enables 208, 212
├── Task 203: filtering.ts migration (0.75h) → enables 209, 213
├── Task 204: tools.ts migration (0.5h) → enables 209
├── Task 205: useHealth() hook (1h) [parallel with 201]
├── Task 206: useServers() hook (1.25h) [waits for 201 complete]
├── Task 207: useServer() detail hook (1h) [parallel with 206]
├── Task 208: useConfig() hook (0.75h) [parallel with 202]
└── Task 209: useTools() + useFilteringStats() (1.5h) [waits for 203, 204]

qa-expert (secondary):
└── Test infrastructure + MSW setup (1h) [parallel with all above]
```

**Recommended Execution Order for Week 3**:

1. **Day 1**:
   - frontend-developer: Start Tasks 201-204 (API migrations) in parallel with Task 205 (useHealth)
   - qa-expert: Setup test infrastructure + MSW mocks

2. **Day 2-3**:
   - frontend-developer: Complete Tasks 205-208 (first 4 query hooks)
   - qa-expert: Begin hook unit tests

3. **Day 4-5**:
   - frontend-developer: Task 209 (useTools + useFilteringStats)
   - qa-expert: Complete hook unit tests

**Week 4 Parallelization**:

```
frontend-developer:
├── Task 210: useStartServer() mutation (1.75h)
├── Task 211: useStopServer() mutation (1.75h)
├── Task 212: useSaveConfig() mutation (1.5h)
└── Task 213: useUpdateFilteringMode() mutation (1.5h)

qa-expert:
├── Integration test creation (2h) [parallel with mutations]
└── Hook testing completion (1.5h) [parallel with mutations]

typescript-pro:
└── Type safety review (1.5h) [during week, spot-check]
```

**Time Savings from Parallelization**:
- Sequential: 26.5 hours (6.5 per person-week)
- Parallel: ~16 hours actual elapsed time
- **Savings**: 10.5 hours (40% time reduction)

---

## Dependency Graph

### Task Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 COMPLETE                         │
│  (Schemas, Client, Stores, App.tsx, SSE Manager Ready)     │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
   ┌────▼────┐     ┌───▼─────┐
   │Task 201 │     │Task 205 │  (useHealth)
   │(servers)│     │         │
   └────┬────┘     └────┬────┘
        │               │
   ┌────▼────────────────▼────┐
   │  Task 206 (useServers)    │
   │  Task 207 (useServer)     │  (Links to servers cache)
   └────┬─────────────────┬────┘
        │                 │
   ┌────▼───┐        ┌────▼──────────────┐
   │Task 210│        │Task 211 (depends) │
   │(start) │        │(stop - similar)   │
   └────────┘        └───────────────────┘

   ┌──────────────────────────────────────┐
   │Task 202 (config.ts)                  │
   │        ↓                              │
   │Task 208 (useConfig)                  │
   │        ↓                              │
   │Task 212 (useSaveConfig mutation)     │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │Task 203 (filtering.ts)               │
   │Task 204 (tools.ts)                   │
   │        ↓                              │
   │Task 209 (useTools + useFiltering)    │
   │        ↓                              │
   │Task 213 (useUpdateFilteringMode)     │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │Tasks 205-213 Complete                │
   │        ↓                              │
   │Task 214 (SSE Integration)            │
   │Task 215 (Integration Tests)          │
   │Task 216 (Component Audit)            │
   │Task 217 (Phase 2 Validation)         │
   └──────────────────────────────────────┘
```

### Critical Path

**Critical Sequence** (blocking others):
1. Task 201 (servers migration) → Task 206 → Tasks 210-211 (1.75 + 1.25 + 1.75 = 4.75 hours blocking)
2. Task 202 (config migration) → Task 208 → Task 212 (0.75 + 0.75 + 1.5 = 3 hours blocking)
3. Tasks 203-204 → Task 209 → Task 213 (1.25 + 1.5 + 1.5 = 4.25 hours blocking)

**Non-blocking Parallel Work**:
- Task 205 (useHealth) can run while Task 201 runs
- Task 207 (useServer detail) can run while Task 206 implements
- Task 214-215 can run after most hooks are written (doesn't block on all)
- Test creation can run parallel with hook implementation

---

## Risk Management

### Identified Risks

#### High-Impact Risks

**Risk 1: Schema Validation Breaking Changes**
- **Impact**: Severe - Application breaks if API response format differs from schema
- **Probability**: Low (Phase 1 schemas validated)
- **Detection**: Type errors during testing, failed MSW mocks
- **Mitigation**:
  - ✅ Validate each hook immediately after implementation
  - ✅ Use MSW with real API response fixtures
  - ✅ Run comprehensive integration tests
  - ✅ Test with actual backend before Phase 3
- **Contingency**: Rollback to Task 201-204 and revise schemas

**Risk 2: Cache Invalidation Race Conditions**
- **Impact**: High - Stale data shown, mutations appear to fail
- **Probability**: Medium (SSE timing issues)
- **Detection**: Flaky tests, UI shows wrong data after mutation
- **Mitigation**:
  - ✅ Mock SSE events in tests with deterministic timing
  - ✅ Test rollback scenarios thoroughly
  - ✅ Add cache key logging for debugging
  - ✅ Implement proper error boundaries
- **Contingency**: Add manual refresh button, implement polling fallback

**Risk 3: Type Inference Complexity**
- **Impact**: Medium - Poor DX, TypeScript errors in Phase 3
- **Probability**: Medium (advanced generic types needed)
- **Detection**: TypeScript errors during implementation
- **Mitigation**:
  - ✅ typescript-pro reviews types during implementation
  - ✅ Test type inference with real hook usage
  - ✅ Use `const hook = useServers()` pattern in tests
  - ✅ Create type-safe helper utilities
- **Contingency**: Simplify types, add explicit type parameters

#### Medium-Impact Risks

**Risk 4: Performance Regression from Validation**
- **Impact**: Medium - Slow API calls due to Zod validation
- **Probability**: Low (Zod is optimized, validation is fast)
- **Detection**: Load tests show slowdown, profiling reveals bottleneck
- **Mitigation**:
  - ✅ Benchmark validation overhead
  - ✅ Profile with React DevTools
  - ✅ Enable JIT compilation for Zod
  - ✅ Cache schema compilation if needed
- **Contingency**: Lazy-load schema validation, batch operations

**Risk 5: Mutation Optimistic Update Edge Cases**
- **Impact**: Medium - UI state inconsistency
- **Probability**: Medium (complex state management)
- **Detection**: UI shows different data than server, rollback fails
- **Mitigation**:
  - ✅ Test optimistic + error scenarios
  - ✅ Implement proper rollback logic
  - ✅ Add verbose error logging
  - ✅ Test with simulated network failures
- **Contingency**: Disable optimistic updates, implement queued updates

#### Low-Impact Risks

**Risk 6: MSW Mock Setup Complexity**
- **Impact**: Low - Tests fail, need MSW reconfiguration
- **Probability**: Low (Phase 1 already used MSW)
- **Detection**: Tests fail with 404 errors
- **Mitigation**:
  - ✅ Reuse Phase 1 MSW handlers
  - ✅ Create fixture library for API responses
  - ✅ Test with both success and error responses
  - ✅ Document MSW setup for Phase 3
- **Contingency**: Use direct mocking instead of MSW

**Risk 7: Hook Naming Conflicts**
- **Impact**: Low - Confusion between similar hooks
- **Probability**: Very Low (clear naming scheme)
- **Detection**: Import errors, confusion in Phase 3
- **Mitigation**:
  - ✅ Follow consistent naming: `use[EntityOperation]()`
  - ✅ Export from single barrel file
  - ✅ Document hook index in README
  - ✅ Create TypeScript index with exports
- **Contingency**: Rename hooks, update imports

### Risk Register & Tracking

| ID | Risk | Impact | Prob | Status | Mitigation |
|----|------|--------|------|--------|-----------|
| R1 | Schema validation breaking | High | Low | Active | Phase 1 schemas validated |
| R2 | Cache invalidation race | High | Med | Active | Deterministic test timing |
| R3 | Type inference issues | Med | Med | Active | typescript-pro review |
| R4 | Validation performance | Med | Low | Active | Profiling + benchmarks |
| R5 | Optimistic update edge cases | Med | Med | Active | Comprehensive testing |
| R6 | MSW mock setup | Low | Low | Active | Reuse Phase 1 handlers |
| R7 | Hook naming conflicts | Low | VLow | Active | Consistent naming scheme |

---

## Success Criteria & Validation Gates

### Phase 2 Success Metrics

#### Code Quality Gates (Must Pass)
- ✅ **TypeScript**: 100% no compilation errors
- ✅ **Linting**: All files pass ESLint rules
- ✅ **Type Coverage**: 95%+ of hook code has explicit types
- ✅ **Test Coverage**: 80%+ branch coverage for hooks
- ✅ **Bundle Impact**: <50KB additional gzipped size

#### Functional Gates (Must Pass)
- ✅ **Query Hooks**: All 5 hooks work with real API responses
- ✅ **Mutation Hooks**: All 4 hooks perform operations without errors
- ✅ **Cache Invalidation**: SSE events properly invalidate caches
- ✅ **Optimistic Updates**: Mutations update UI immediately
- ✅ **Error Handling**: Failed mutations rollback correctly
- ✅ **Type Safety**: Full TypeScript support in consumer components

#### Testing Gates (Must Pass)
- ✅ **Unit Tests**: 90%+ of hooks have unit tests
- ✅ **Integration Tests**: Full hook → mutation → cache flow tested
- ✅ **MSW Mocks**: All API endpoints have MSW handlers
- ✅ **Error Scenarios**: Network errors, validation errors tested
- ✅ **Performance**: No regression in API response time

#### Documentation Gates (Must Pass)
- ✅ **Usage Patterns**: Hook usage examples documented
- ✅ **API Reference**: All hooks documented with examples
- ✅ **Type Definitions**: Type exports properly exposed
- ✅ **Migration Guide**: Clear Phase 2 → Phase 3 migration path
- ✅ **Best Practices**: Hooks usage best practices documented

### Validation Checkpoints

**End of Week 3 Checkpoint** (Day 5, Friday):
- [ ] Tasks 201-209 complete
- [ ] All query hooks have unit tests
- [ ] MSW mocks for all endpoints working
- [ ] No TypeScript compilation errors
- [ ] qa-expert reviews code quality
- [ ] Go/No-Go decision for Week 4

**Mid-Week 4 Checkpoint** (Day 3, Wednesday):
- [ ] Tasks 210-213 complete and tested
- [ ] Optimistic updates working correctly
- [ ] Rollback scenarios passing
- [ ] Error handling comprehensive
- [ ] typescript-pro completes type review
- [ ] Go/No-Go decision for integration

**End of Week 4 Checkpoint** (Day 5, Friday):
- [ ] All integration tests passing
- [ ] SSE integration verified
- [ ] Phase 2 validation checklist complete
- [ ] Documentation complete
- [ ] Phase 2 sign-off ready
- [ ] Ready to start Phase 3

---

## Weekly Execution Plan

### Week 3: Foundation + Query Hooks

**Goals**: Migrate API layer, implement all 5 query hooks

**Team Allocation**:
- frontend-developer: 100% (Tasks 201-209)
- qa-expert: 30% (test infrastructure + unit tests)
- typescript-pro: 10% (type review as needed)

**Daily Breakdown**:

**Day 1 (Monday)**
- [ ] Task 201: servers.ts migration (1h) - frontend-dev
- [ ] Task 205: useHealth() implementation (1h) - frontend-dev
- [ ] Test infrastructure setup (1h) - qa-expert
- [ ] Project sync + architecture review (0.5h) - architect-reviewer
- **Daily Total**: 3.5 hours

**Day 2 (Tuesday)**
- [ ] Task 202: config.ts migration (0.75h) - frontend-dev
- [ ] Task 203: filtering.ts migration (0.75h) - frontend-dev
- [ ] Task 204: tools.ts migration (0.5h) - frontend-dev
- [ ] Task 206: useServers() implementation (1h) - frontend-dev
- [ ] Unit tests for Tasks 201-206 (1h) - qa-expert
- **Daily Total**: 4 hours

**Day 3 (Wednesday)**
- [ ] Task 207: useServer() detail hook (1h) - frontend-dev
- [ ] Task 208: useConfig() hook (0.75h) - frontend-dev
- [ ] Unit tests for Tasks 207-208 (0.75h) - qa-expert
- [ ] Code review + TypeScript check (0.75h) - typescript-pro
- **Daily Total**: 3.25 hours

**Day 4 (Thursday)**
- [ ] Task 209: useTools() + useFilteringStats() (1.5h) - frontend-dev
- [ ] Unit tests for Task 209 (0.75h) - qa-expert
- [ ] MSW handler verification (0.5h) - qa-expert
- **Daily Total**: 2.75 hours

**Day 5 (Friday) - Checkpoint**
- [ ] Complete any remaining tests (0.5h) - qa-expert
- [ ] Phase 2 Week 3 review (1h) - architect-reviewer + team
- [ ] Fix any type errors (0.75h) - frontend-dev + typescript-pro
- [ ] Prepare mutation implementation (0.5h) - frontend-dev planning
- **Daily Total**: 2.75 hours

**Week 3 Summary**:
- Tasks Complete: 201-209 (9 tasks)
- Hours Spent: ~16.5 hours
- Validation: All query hooks passing, zero TypeScript errors
- Status: ✅ On track for Week 4 mutations

---

### Week 4: Mutation Hooks + Integration

**Goals**: Implement all 4 mutation hooks, integrate with SSE, complete Phase 2

**Team Allocation**:
- frontend-developer: 100% (Tasks 210-213)
- qa-expert: 50% (integration tests + validation)
- typescript-pro: 15% (final type review)
- documentation-expert: 10% (Phase 2 guide)

**Daily Breakdown**:

**Day 1 (Monday)**
- [ ] Task 210: useStartServer() mutation (1.75h) - frontend-dev
- [ ] Task 211: useStopServer() mutation (1.75h) - frontend-dev
- [ ] Integration test setup (1.5h) - qa-expert
- **Daily Total**: 5 hours

**Day 2 (Tuesday)**
- [ ] Task 212: useSaveConfig() mutation (1.5h) - frontend-dev
- [ ] Task 213: useUpdateFilteringMode() mutation (1.5h) - frontend-dev
- [ ] Mutation hook tests (1.5h) - qa-expert
- [ ] Type review for mutations (0.75h) - typescript-pro
- **Daily Total**: 5.25 hours

**Day 3 (Wednesday)**
- [ ] Task 214: SSE integration verification (2h) - frontend-dev
- [ ] Cache invalidation testing (1.5h) - qa-expert
- [ ] Documentation outline (0.5h) - documentation-expert
- **Daily Total**: 4 hours

**Day 4 (Thursday)**
- [ ] Task 215: Comprehensive integration tests (1.5h) - qa-expert
- [ ] Task 216: Component audit & documentation (1h) - frontend-dev
- [ ] Fix any failing tests (1h) - qa-expert
- [ ] Phase 2 patterns guide (1h) - documentation-expert
- **Daily Total**: 4.5 hours

**Day 5 (Friday) - Final Validation**
- [ ] Task 217: Phase 2 completion validation (1h) - team
- [ ] Sign-off checklist completion (1h) - architect-reviewer
- [ ] Documentation final review (0.5h) - documentation-expert
- [ ] Phase 2 retrospective (0.5h) - team
- **Daily Total**: 3 hours

**Week 4 Summary**:
- Tasks Complete: 210-217 (8 tasks)
- Hours Spent: ~21.75 hours
- Total Phase 2: 38.25 hours (over estimate)
- **Note**: Estimate was 26.5 hours; actual flexibility built in for thorough testing

---

## File Organization & Structure

### New Files to Create

```
src/ui/api/
├── hooks/
│   ├── __tests__/
│   │   ├── useHealth.test.ts
│   │   ├── useServers.test.ts
│   │   ├── useServer.test.ts
│   │   ├── useConfig.test.ts
│   │   ├── useTools.test.ts
│   │   ├── useFilteringStats.test.ts
│   │   ├── useStartServer.test.ts
│   │   ├── useStopServer.test.ts
│   │   ├── useSaveConfig.test.ts
│   │   ├── useUpdateFilteringMode.test.ts
│   │   ├── integration.test.ts
│   │   └── fixtures.ts (MSW handlers + response fixtures)
│   ├── useHealth.ts
│   ├── useServers.ts
│   ├── useServer.ts
│   ├── useConfig.ts
│   ├── useTools.ts
│   ├── useFilteringStats.ts
│   ├── useStartServer.ts
│   ├── useStopServer.ts
│   ├── useSaveConfig.ts
│   ├── useUpdateFilteringMode.ts
│   └── index.ts (barrel export)
│
├── servers.ts (MODIFIED - use validated request)
├── config.ts (MODIFIED - use validated request)
├── filtering.ts (MODIFIED - use validated request)
└── tools.ts (MODIFIED - use validated request)
```

### Modified Files

```
src/ui/
├── App.tsx (already has QueryClientProvider from Phase 1)
├── utils/
│   └── sse-client.ts (integrate with hook cache keys)
└── api/
    └── client.ts (verify request<T> working correctly)
```

---

## Integration Points with Phase 1

### Input from Phase 1 ✅

| Component | Phase 1 Status | Phase 2 Usage |
|-----------|----------------|--------------|
| **Zod Schemas** | ✅ 6 validated | Direct import for request<T> validation |
| **API Client** | ✅ Enhanced | Use `request<T>(path, schema)` in all migrations |
| **Query Client** | ✅ Configured | Access via `useQueryClient()` in mutations |
| **Query Keys Factory** | ✅ Created | Use `queryKeys.*` for cache key consistency |
| **Zustand Stores** | ✅ UI + SSE | Access UI state if needed, monitor SSE state |
| **App.tsx Providers** | ✅ Updated | QueryClientProvider already wrapping app |
| **useSSESubscription** | ✅ Implemented | Leverage for cache invalidation in hooks |
| **SSE Manager** | ✅ Created | Already configured for automatic invalidation |

### Output to Phase 3 ✅

| Component | Phase 2 Output | Phase 3 Usage |
|-----------|----------------|--------------|
| **9 Custom Hooks** | ✅ useHealth, useServers, etc. | Replace direct API calls in components |
| **4 Mutation Hooks** | ✅ useStartServer, etc. | Replace mutation functions in components |
| **API File Updates** | ✅ Migrated servers, config, etc. | Keep as-is (components call hooks, not functions) |
| **Test Suite** | ✅ Unit + integration tests | Extend with component tests |
| **Type Definitions** | ✅ Exported from hooks | Import in components for type safety |
| **Component Audit** | ✅ Task 216 deliverable | Use as migration checklist for Phase 3 |
| **Phase 2 Patterns Guide** | ✅ Documentation | Reference for Phase 3 component refactoring |

---

## Communication & Coordination Protocol

### Daily Standup (15 minutes)
- **Time**: 9:00 AM (start of day)
- **Attendees**: frontend-developer, qa-expert, architect-reviewer
- **Format**:
  - What was completed yesterday?
  - What's the plan for today?
  - Any blockers or risks?
- **Output**: Brief status update

### Weekly Sync (60 minutes)
- **Time**: Friday 4:00 PM (end of week)
- **Attendees**: Full team (frontend-dev, qa-expert, typescript-pro, architecture-reviewer, documentation-expert)
- **Agenda**:
  1. **Progress Review** (15 min): Tasks complete, metrics
  2. **Blockers & Solutions** (15 min): Any issues, mitigations
  3. **Next Week Preview** (15 min): Tasks starting, dependencies
  4. **Architecture Review** (15 min): Design decisions, code quality
- **Deliverable**: Weekly status report

### Code Review Protocol
- **Trigger**: Task completion, before merging PR
- **Reviewers**:
  - typescript-pro: Type safety, generics
  - qa-expert: Test coverage, mocking
  - architect-reviewer: Architecture consistency
- **Turnaround**: Same day (4-hour SLA)
- **Approval**: All 3 reviewers sign off

### Documentation Handoff
- **Timing**: During Week 4, final 2 days
- **Format**: Frontend-dev provides code comments + examples
- **Deliverable**: Phase 2 Patterns Guide (markdown)
- **Review**: architect-reviewer validates completeness

---

## Success Criteria Summary

### Phase 2 Completion Checklist

**Deliverables** (All Must Complete):
- [ ] Task 201-217 all complete
- [ ] 9 custom React Query hooks implemented
- [ ] 4 mutation hooks with optimistic updates
- [ ] All hooks exported from `/src/ui/api/hooks/index.ts`
- [ ] Comprehensive unit tests (80%+ coverage)
- [ ] Integration tests for full flow
- [ ] SSE cache invalidation verified
- [ ] Phase 2 patterns guide documented
- [ ] Component audit document (Task 216)
- [ ] Zero TypeScript compilation errors
- [ ] All tests passing (0 failures)

**Quality Gates** (All Must Pass):
- [ ] ESLint: 100% passing
- [ ] TypeScript: 100% no errors
- [ ] Test Coverage: 80%+ hooks, 70%+ overall
- [ ] Bundle Impact: <50KB gzipped
- [ ] Performance: No regression vs Phase 1

**Acceptance Criteria** (All Must Verify):
- [ ] Real API responses validate against schemas
- [ ] Hooks work with actual backend
- [ ] Optimistic updates + rollback work correctly
- [ ] SSE integration properly invalidates caches
- [ ] Error handling comprehensive
- [ ] Documentation complete and accurate
- [ ] Ready for Phase 3 component migration

---

## Contingency Planning

### If Phase 2 Falls Behind Schedule

**Scenario 1: Week 3 Overruns (queries delayed)**
- **Action**: Extend Week 3 by 2 days, compress Week 4
- **Adjustment**: Reduce integration test depth slightly
- **Outcome**: Phase 2 still completes on-time or 1-2 days late

**Scenario 2: Complex type issues emerge**
- **Action**: Allocate typescript-pro full-time (25%)
- **Contingency**: Simplify types, use `any` for complex generics
- **Outcome**: Type safety maintained with slightly less elegance

**Scenario 3: MSW mock setup fails**
- **Action**: Switch to direct jest mocking
- **Alternative**: Use nock for HTTP mocking instead
- **Outcome**: Tests still work, Phase 2 continues

**Scenario 4: SSE integration issues**
- **Action**: Implement manual cache invalidation in components
- **Contingency**: Document workaround, prioritize Phase 3
- **Outcome**: Phase 2 complete without SSE auto-invalidation

**Scenario 5: Optimistic update complexity**
- **Action**: Reduce scope - implement simple updates first
- **Contingency**: Add "refresh" button for full sync
- **Outcome**: Mutations work with manual refresh fallback

---

## References & Documentation

### Phase 1 Deliverables (Input to Phase 2)

- ✅ IMPLEMENTATION-SUMMARY.md (Phase 1 complete status)
- ✅ PHASE1_COMPLETION_SUMMARY.md (schema rewrites, validation)
- ✅ MASTER-COORDINATION.md (original 5-phase plan)
- ✅ AGENT-DELEGATION-PLAN.md (agent team assignments)

### Phase 2 Deliverables (Output from Phase 2)

- **PHASE2_ORCHESTRATION_PLAN.md** (this document)
- **PHASE2_AGENT_ASSIGNMENT.md** (detailed agent roles)
- **PHASE2_TASK_BREAKDOWN.md** (task specifications)
- **PHASE2_DEPENDENCY_GRAPH.md** (visual dependencies)
- **PHASE2_TESTING_STRATEGY.md** (comprehensive test plan)
- **phase2-patterns.md** (usage guide + examples)

### Related Documentation

- `src/ui/api/hooks/README.md` (hooks API reference)
- `src/ui/api/schemas/README.md` (schema reference)
- `docs/phase1-patterns.md` (Phase 1 patterns - foundation)
- `docs/state-management.md` (Zustand + React Query patterns)
- `docs/sse-integration.md` (SSE real-time updates)

---

## Final Recommendations

### Phase 2 Success Factors

1. **Strong Frontend Developer Focus**: Phase 2 is 100% frontend work. Ensure frontend-developer has minimal context switches.

2. **Early Testing**: Start tests immediately after each hook implementation (Day 1). Catch issues early.

3. **Type Safety Priority**: Invest time in proper TypeScript. Poor types in Phase 2 = chaos in Phase 3 component migration.

4. **SSE Integration Confidence**: Test SSE cache invalidation thoroughly. This is the most complex integration point.

5. **Documentation as You Go**: Don't defer Phase 2 documentation to the end. Document patterns while implementing.

6. **Real API Testing**: Test with actual backend API (not just MSW) during Week 4. Catch schema mismatches early.

7. **Performance Baseline**: Establish API response time baselines in Phase 2 to detect regressions in Phase 3-4.

### Preparation for Phase 3

- **Component Migration Strategy**: Phase 3 needs a clear component refactoring plan. Use Task 216 (component audit) to prepare detailed Phase 3 tasks.

- **Hook Naming Consistency**: Ensure naming pattern `use[Entity][Operation]()` is consistent for Phase 3 developer.

- **Type Exports**: Create clean type exports from hooks so Phase 3 components get full TypeScript support.

- **Test Coverage Target**: Phase 2 should achieve 80%+ coverage. Phase 3 builds on this with component tests.

- **Bundle Size Monitoring**: Establish gzip bundle size baselines in Phase 2. Phase 3 adds components - need baseline for comparison.

---

## Sign-Off & Approval

**Phase 2 Orchestration Plan Approval Status**: ⏳ Ready for Review

**Reviewers**:
- [ ] frontend-developer: Confirms task feasibility
- [ ] qa-expert: Confirms test approach
- [ ] architect-reviewer: Confirms architecture alignment
- [ ] Product Manager: Confirms timeline alignment

**Phase 2 Go/No-Go**: ⏳ Pending Phase 1 Final Verification

**Prerequisites for Phase 2 Start**:
1. [ ] Phase 1 100% complete
2. [ ] All Phase 1 deliverables validated
3. [ ] Backend API confirmed stable
4. [ ] Team allocation confirmed
5. [ ] Development environment ready

**Estimated Phase 2 Start Date**: Week 3 (immediately after Phase 1 complete)

---

**Document Version**: 1.0
**Created**: 2025-11-08
**Last Updated**: 2025-11-08
**Status**: Ready for Implementation
**Next Review**: Before Phase 2 starts (Week 3)
