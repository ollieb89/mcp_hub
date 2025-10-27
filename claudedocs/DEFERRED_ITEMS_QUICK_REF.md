# Sprint 3 Deferred Items - Quick Reference

**Status**: Analysis Complete | **Action Required**: Sprint 3.5 Decision

---

## 🎯 Three Deferred Items at a Glance

### 🔴 Item 1: src/mcp/ Coverage (P0 - CRITICAL)
- **File**: `src/mcp/server.js` (669 lines, 588 uncovered)
- **Coverage**: 0% → Target: 70%+
- **Component**: Unified MCP server endpoint (core functionality)
- **Why Critical**: All client connections use this endpoint
- **Effort**: 15-20 tests, 3-4 hours
- **Test File**: `tests/MCPServer.test.js` (new)

**Key Tests Needed**:
- Capability aggregation with namespacing
- Request routing (tool/resource/prompt calls)
- Error handling (timeout, server unavailable)
- Capability synchronization on server changes

### 🟡 Item 2: OAuth Integration (P1 - HIGH)
- **File**: `src/utils/oauth-provider.js` (122 lines)
- **Coverage**: Partial → Target: 90%+
- **Component**: OAuth PKCE flow for remote servers
- **Why Important**: Remote server authentication reliability
- **Effort**: 15-18 tests, 2-3 hours
- **Test File**: `tests/MCPConnection.oauth.test.js` (new)

**Key Tests Needed**:
- PKCE authorization flow (5 steps)
- Token management (storage, refresh, expiration)
- Error scenarios (access_denied, invalid_grant, network)

### 🟢 Item 3: Real Process Spawning (P2 - MEDIUM)
- **Component**: STDIO transport
- **Current**: Mock-based (adequate)
- **Enhancement**: Real process validation
- **Why Optional**: Mock tests provide sufficient coverage
- **Effort**: 5-7 tests, 1-2 hours
- **Test File**: `tests/MCPConnection.stdio-real.test.js` (new)

**Key Tests Needed**:
- Real process spawning and communication
- Environment variable injection validation
- Process cleanup verification (no zombies)

---

## 📊 Impact Summary

| Item | Priority | Tests | Duration | Coverage Impact | Risk if Deferred |
|------|----------|-------|----------|-----------------|------------------|
| src/mcp/ | 🔴 P0 | 15-20 | 3-4h | 0% → 70%+ | **CRITICAL** - Client failures |
| OAuth | 🟡 P1 | 15-18 | 2-3h | 0% → 90%+ | **HIGH** - Auth failures |
| Real Process | 🟢 P2 | 5-7 | 1-2h | Enhancement | **LOW** - Already covered |

**Total**: 35-45 tests, 6-9 hours (5-7h without P2)

---

## 🚀 Recommended Action: Sprint 3.5

### Sprint 3.5: Deferred Coverage
- **Duration**: 5-7 hours
- **Tests**: 30-38 (P0 + P1, P2 optional)
- **Status**: Insert between Sprint 3 and Sprint 4

**Subtasks**:
1. **3.5.1**: MCP Server Endpoint Tests (3-4h, P0)
2. **3.5.2**: OAuth Integration Tests (2-3h, P1)
3. **3.5.3**: Real Process Enhancement (1-2h, P2 - Optional)

**Outcome**:
- Sprint 3: 33 tests → Sprint 3.5: 63-71 tests
- Critical gaps eliminated
- Ready for Sprint 4 with confidence

---

## ⚖️ Decision Matrix

### ✅ Option 1: Sprint 3.5 Micro-Sprint (Recommended)
- **Pros**: Clean boundaries, focused scope, technical debt prevention
- **Cons**: Extra sprint planning overhead
- **Timeline**: 1 week dedicated sprint
- **Risk**: LOW

### ⚠️ Option 2: Integrate into Sprint 4
- **Pros**: Fewer sprint boundaries
- **Cons**: Sprint 4 scope creep (50% longer)
- **Timeline**: Sprint 4 becomes 8-10 hours
- **Risk**: MEDIUM (may delay Sprint 4 completion)

### 🔴 Option 3: Defer to Sprint 5
- **Pros**: Focus on Sprint 4 first
- **Cons**: Technical debt accumulation, production risk
- **Timeline**: Address in Sprint 5 (weeks later)
- **Risk**: HIGH (critical gaps remain uncovered)

---

## 📋 Implementation Checklist

### If Sprint 3.5 Approved:
- [ ] Create TEST_P3.5_WF.md workflow document
- [ ] Review MCP SDK protocol documentation
- [ ] Prepare OAuth PKCE flow references
- [ ] Set up test scaffolding and fixtures
- [ ] Define acceptance criteria
- [ ] Schedule 5-7 hour execution window

### If Integrated into Sprint 4:
- [ ] Update TEST_P4_WF.md with deferred items
- [ ] Extend Sprint 4 timeline (5h → 8-10h)
- [ ] Adjust Sprint 4 scope prioritization
- [ ] Communicate timeline changes

### If Deferred to Sprint 5:
- [ ] Document technical debt items
- [ ] Include in Sprint 5 quality focus
- [ ] Monitor production for related issues
- [ ] Plan 6-9 hour allocation in Sprint 5

---

## 🔗 Related Documents

- **Detailed Analysis**: `SPRINT3_DEFERRED_ITEMS_RESOLUTION.md`
- **Sprint 3 Complete**: `SPRINT3_COMPLETE_SUMMARY.md`
- **Sprint 3 Workflow**: `TEST_P3_WF.md`
- **OAuth Example**: `TEST_P3_WF.md` lines 299-467
- **Test Helpers**: `tests/helpers/mocks.js`, `tests/helpers/fixtures.js`

---

**Next Step**: Decide on Sprint 3.5 vs Sprint 4 integration vs Sprint 5 deferral
**Recommendation**: Sprint 3.5 micro-sprint (5-7 hours, addresses P0+P1)
**Decision Deadline**: Before starting Sprint 4
