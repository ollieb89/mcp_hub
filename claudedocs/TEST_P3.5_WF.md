# Sprint 3.5 Workflow - Deferred Coverage Resolution

**Date Started**: 2025-10-27
**Status**: 🔄 IN PROGRESS
**Sprint Goal**: Address critical deferred items from Sprint 3 with comprehensive test coverage
**Duration Estimate**: 5-7 hours
**Test Target**: 30-38 tests (P0 + P1), +5-7 optional (P2)

---

## Executive Summary

**Sprint 3.5 Rationale**: Technical Debt Prevention Micro-Sprint

Sprint 3 successfully completed with 33/33 integration tests passing, but deferred three critical items due to scope constraints. Sprint 3.5 addresses the two highest-priority gaps (P0 + P1) before proceeding to Sprint 4.

**Why Sprint 3.5 Now?**
1. **Production Readiness**: Core MCP endpoint (src/mcp/) has 0% coverage - HIGH RISK
2. **Remote Server Support**: OAuth flow untested - blocks production remote server usage
3. **Clean Boundaries**: Complete Sprint 3 scope comprehensively before new work
4. **Technical Debt Prevention**: Address gaps before they compound in Sprint 4+

**Impact**:
- Test Count: 33 → 63-71 tests (91-115% increase)
- Coverage: src/mcp/ 0% → 70%+, OAuth 0% → 90%+
- Risk Level: HIGH/CRITICAL → LOW
- Timeline: 1 focused week (5-7 hours)

---

## Sprint 3.5 Context

### Deferred Items from Sprint 3

**🔴 P0 Critical - src/mcp/ Coverage**
- **File**: `src/mcp/server.js` (669 lines, 588 uncovered)
- **Coverage**: 0% → Target: 70%+
- **Component**: Unified MCP server endpoint (MCPServerEndpoint class)
- **Why Critical**: All MCP client connections route through this endpoint
- **Risk**: Production client failures, unhandled errors, capability routing bugs
- **Tests Needed**: 15-20 tests
- **Duration**: 3-4 hours

**🟡 P1 High - OAuth Integration**
- **File**: `src/utils/oauth-provider.js` (122 lines)
- **Coverage**: Partial → Target: 90%+
- **Component**: OAuth PKCE flow (MCPHubOAuthProvider class)
- **Why Important**: Remote server authentication reliability
- **Risk**: Authorization failures, token refresh issues, storage corruption
- **Tests Needed**: 15-18 tests
- **Duration**: 2-3 hours

**🟢 P2 Medium - Real Process Spawning** (Optional)
- **Component**: STDIO transport with real process validation
- **Current**: Mock-based (adequate coverage)
- **Enhancement**: Real process communication validation
- **Tests Needed**: 5-7 tests
- **Duration**: 1-2 hours
- **Decision**: Include if time permits after P0+P1 complete

### Success Criteria Reference

Sprint 3.5 builds upon Sprint 3's quality standards:
- ✅ All tests must pass (100% pass rate)
- ✅ Zero logger assertions (anti-pattern eliminated)
- ✅ Minimal hardcoded delays (intentional only)
- ✅ AAA pattern (Arrange/Act/Assert) enforced
- ✅ Fixture-based test architecture
- ✅ Transport isolation validated
- ✅ Quality gates passed

---

## Expected Outcomes

### Test Coverage Targets

**Sprint 3 Baseline**:
- Integration tests: 33/33 passing (100%)
- src/mcp/: 0% coverage (588 uncovered lines)
- OAuth: 0% coverage
- Real process: Mock-based (adequate)

**Sprint 3.5 Targets**:
- **P0 + P1 Complete**: 63-71 tests passing (100%)
  - src/mcp/: 70%+ coverage (~410 lines covered)
  - OAuth: 90%+ coverage (~110 lines covered)
  - Test increase: 91-115%
- **P0 + P1 + P2 Complete**: 68-78 tests passing (100%)
  - Additional real process validation
  - Test increase: 106-136%

### Coverage Impact Analysis

| Component | Before | After (P0+P1) | After (P0+P1+P2) | Lines Covered |
|-----------|--------|---------------|------------------|---------------|
| src/mcp/server.js | 0% | 70%+ | 70%+ | ~410 of 588 |
| oauth-provider.js | 0% | 90%+ | 90%+ | ~110 of 122 |
| STDIO (real process) | Mock | Mock | Real | Enhancement |
| **Total Tests** | **33** | **63-71** | **68-78** | **+30-45** |

### Risk Mitigation

**Before Sprint 3.5** (Current State):
- 🔴 **CRITICAL**: MCP endpoint failures could break ALL client connections
- 🟡 **HIGH**: OAuth failures block remote server usage entirely
- ℹ️ **LOW**: Mock-based STDIO tests provide adequate coverage

**After Sprint 3.5** (P0 + P1):
- ✅ **RESOLVED**: MCP endpoint thoroughly tested with 70%+ coverage
- ✅ **RESOLVED**: OAuth flow validated with 90%+ coverage
- ℹ️ **UNCHANGED**: Mock-based STDIO (acceptable for production)

---

## Execution Model

**Sequential Execution with Quality Gates**:

```
Phase 1: Planning & Preparation (Current)
├─ Create TEST_P3.5_WF.md ✅
├─ Review deferred items analysis ✅
├─ Understand existing test infrastructure ✅
└─ Quality Gate: Workflow approved → Proceed

Phase 2: P0 Critical - MCP Server Tests (3-4h)
├─ Subtask 3.5.1: Implement MCPServer.test.js
├─ Tests: 15-20 comprehensive tests
├─ Coverage Target: 70%+ for src/mcp/server.js
└─ Quality Gate: All tests passing → Proceed

Phase 3: P1 High - OAuth Integration Tests (2-3h)
├─ Subtask 3.5.2: Implement MCPConnection.oauth.test.js
├─ Tests: 15-18 PKCE flow tests
├─ Coverage Target: 90%+ for oauth-provider.js
└─ Quality Gate: All tests passing → Proceed

Phase 4: Validation & Documentation (30m)
├─ Run full test suite (63-71 tests)
├─ Validate coverage reports
├─ Update documentation
└─ Decision: P2 optional enhancement

Phase 5: Optional - P2 Medium (1-2h, time permitting)
├─ Subtask 3.5.3: Implement MCPConnection.stdio-real.test.js
├─ Tests: 5-7 real process tests
└─ Quality Gate: All tests passing → Complete
```

**Dependencies**:
- Subtask 3.5.1 and 3.5.2 are INDEPENDENT → Can be implemented in parallel after workflow approval
- Subtask 3.5.3 is OPTIONAL → Only execute if P0+P1 complete ahead of schedule

---

## Subtask Breakdown

### Subtask 3.5.1: MCP Server Endpoint Tests 🔴 P0 Critical

**Objective**: Achieve 70%+ coverage for src/mcp/server.js (669 lines, 588 uncovered)

**Duration**: 3-4 hours
**Test Count**: 15-20 tests
**Test File**: `tests/MCPServer.test.js` (new)

**Key Testing Areas**:

1. **Capability Aggregation** (4-5 tests)
   - Multiple servers with different tool sets
   - Multiple servers with overlapping tool names
   - Resource and resource template aggregation
   - Prompt aggregation from multiple sources
   - Empty capability handling

2. **Namespacing Logic** (3-4 tests)
   - Tool name namespacing: `filesystem__search`, `github__search`
   - Resource URI namespacing with special characters
   - Resource template URI namespacing
   - Safe server name generation (special chars → underscores)
   - Duplicate server name handling (counter suffix)

3. **Request Routing** (4-5 tests)
   - Tool call routing to correct server
   - Resource read routing with namespaced URIs
   - Resource template URI resolution
   - Prompt execution routing
   - Invalid capability requests (404 handling)

4. **Error Handling** (2-3 tests)
   - Tool execution timeout (5 min default)
   - Server unavailable during request
   - Malformed request handling
   - Error response formatting

5. **Capability Synchronization** (2-3 tests)
   - Server connect/disconnect updates
   - Configuration change handling
   - Hub state transition updates (READY, RESTARTED)
   - Client notification delivery

**Technical Requirements**:
- Mock MCPHub with multiple MCPConnection instances
- Simulate tools/resources/prompts from different servers
- Test SSE transport message handling
- Validate JSON-RPC protocol compliance

**Acceptance Criteria**:
- ✅ All 15-20 tests passing
- ✅ Coverage: src/mcp/server.js 70%+ (≥410 lines covered)
- ✅ Zero brittle patterns (no logger assertions)
- ✅ Fixture-based test architecture
- ✅ AAA pattern enforced

---

### Subtask 3.5.2: OAuth Integration Tests 🟡 P1 High

**Objective**: Achieve 90%+ coverage for src/utils/oauth-provider.js (122 lines)

**Duration**: 2-3 hours
**Test Count**: 15-18 tests
**Test File**: `tests/MCPConnection.oauth.test.js` (new)

**Key Testing Areas**:

1. **PKCE Authorization Flow** (5-6 tests)
   - Authorization URL generation with PKCE challenge
   - Code verifier generation and storage
   - Authorization callback handling
   - Token exchange with code verifier
   - Refresh token flow
   - Multiple server OAuth isolation

2. **Token Management** (4-5 tests)
   - Token storage to XDG data directory
   - Token retrieval for authenticated requests
   - Token persistence across restarts
   - Token expiration handling
   - Concurrent token operations (race conditions)

3. **Client Information Management** (3-4 tests)
   - Client metadata generation (redirect URIs, grant types)
   - Client information storage and retrieval
   - Client information updates
   - Multiple server client isolation

4. **Error Scenarios** (3-4 tests)
   - Authorization denied (access_denied error)
   - Invalid authorization code (invalid_grant error)
   - Token exchange network failures
   - Storage file I/O errors
   - Corrupted storage file handling

**Technical Requirements**:
- Mock OAuth authorization server responses
- Mock file system operations (fs/promises)
- Simulate PKCE code challenge/verifier generation
- Test storage persistence and isolation
- Validate OAuth 2.0 protocol compliance

**Acceptance Criteria**:
- ✅ All 15-18 tests passing
- ✅ Coverage: oauth-provider.js 90%+ (≥110 lines covered)
- ✅ Zero brittle patterns (no logger assertions)
- ✅ Fixture-based test architecture
- ✅ AAA pattern enforced
- ✅ Storage isolation validated

---

### Subtask 3.5.3: Real Process Spawning Tests 🟢 P2 Medium (Optional)

**Objective**: Enhance STDIO transport validation with real process communication

**Duration**: 1-2 hours (OPTIONAL)
**Test Count**: 5-7 tests
**Test File**: `tests/MCPConnection.stdio-real.test.js` (new)

**Key Testing Areas**:

1. **Real Process Communication** (2-3 tests)
   - Spawn actual Node.js MCP server process
   - JSON-RPC message exchange over STDIO
   - Process cleanup and termination
   - Process error handling (crashes, invalid output)

2. **Environment Variable Injection** (1-2 tests)
   - Environment variable resolution validation
   - Command substitution validation (${cmd:...})
   - VS Code variable resolution validation

3. **Dev Mode Integration** (2-3 tests)
   - File watching with real process restarts
   - Server output capture during restart
   - Graceful shutdown during file changes

**Technical Requirements**:
- Real Node.js process spawning (no mocks)
- Actual fixture STDIO server (tests/fixtures/stdio-test-server.js)
- Real file I/O for dev mode watching
- Process lifecycle validation

**Decision Criteria**:
- Execute ONLY if P0 + P1 complete ahead of schedule (< 5 hours)
- Skip if time constraint (prioritize documentation and validation)
- Optional enhancement, not blocking Sprint 3.5 completion

**Acceptance Criteria** (if executed):
- ✅ All 5-7 tests passing
- ✅ Real process validation complete
- ✅ Zero brittle patterns
- ✅ Fixture-based architecture
- ✅ AAA pattern enforced

---

## Quality Gates

### Pre-Execution Gate (Phase 1 → Phase 2)
**Criteria**:
- ✅ TEST_P3.5_WF.md workflow document complete
- ✅ Deferred items analysis reviewed and understood
- ✅ Test infrastructure (helpers, fixtures) understood
- ✅ MCP protocol documentation reviewed (Context7)
- ✅ User approval received for Sprint 3.5 execution

**Go/No-Go Decision**: Proceed to Subtask 3.5.1

---

### Subtask 3.5.1 Gate (Phase 2 → Phase 3)
**Criteria**:
- ✅ tests/MCPServer.test.js created with 15-20 tests
- ✅ All tests passing (100% pass rate)
- ✅ Coverage: src/mcp/server.js ≥70% (≥410 lines)
- ✅ Zero logger assertions detected
- ✅ All tests use AAA pattern
- ✅ Fixture patterns applied consistently

**Validation Commands**:
```bash
npm test tests/MCPServer.test.js        # All tests pass
npm run test:coverage                    # Verify coverage ≥70%
grep -r "logger\." tests/MCPServer.test.js  # No logger assertions
```

**Go/No-Go Decision**: Proceed to Subtask 3.5.2

---

### Subtask 3.5.2 Gate (Phase 3 → Phase 4)
**Criteria**:
- ✅ tests/MCPConnection.oauth.test.js created with 15-18 tests
- ✅ All tests passing (100% pass rate)
- ✅ Coverage: oauth-provider.js ≥90% (≥110 lines)
- ✅ Zero logger assertions detected
- ✅ All tests use AAA pattern
- ✅ Storage isolation validated

**Validation Commands**:
```bash
npm test tests/MCPConnection.oauth.test.js  # All tests pass
npm run test:coverage                        # Verify coverage ≥90%
grep -r "logger\." tests/MCPConnection.oauth.test.js  # No logger assertions
```

**Go/No-Go Decision**: Proceed to Phase 4 (Validation)

---

### Sprint 3.5 Completion Gate (Phase 4 → Complete)
**Criteria**:
- ✅ All tests passing: 63-71/63-71 (100%)
- ✅ Coverage targets achieved:
  - src/mcp/server.js: ≥70%
  - oauth-provider.js: ≥90%
- ✅ Full test suite execution: <90 seconds
- ✅ Test isolation validated (`--sequence.shuffle`)
- ✅ Quality anti-patterns: Zero detected
- ✅ Documentation updated:
  - SPRINT3.5_COMPLETE_SUMMARY.md created
  - DEFERRED_ITEMS_QUICK_REF.md updated (status → resolved)
  - TEST_P3.5_WF.md updated (final status)

**Validation Commands**:
```bash
npm test                                     # All 63-71 tests pass
npm test -- --sequence.shuffle               # Isolation verified
npm run test:coverage                        # Coverage targets met
```

**Decision Point**:
- **P2 Optional**: If time remaining (< 5 total hours) → Execute Subtask 3.5.3
- **Otherwise**: Mark Sprint 3.5 complete, proceed to Sprint 4 preparation

---

## Test Infrastructure

### Existing Helpers (Leverage from Sprint 3)

**tests/helpers/mocks.js**:
- `createMockConnection()` - Mock MCPConnection instances
- Event emitter patterns for hub/connection events
- Mock capability lists (tools, resources, prompts)

**tests/helpers/fixtures.js**:
- `createStdioConfig()` - STDIO server configuration
- `createSSEConfig()` - SSE server configuration
- `createEnvContext()` - Environment variable context
- Can be extended for OAuth scenarios

**tests/helpers/assertions.js**:
- Custom assertion helpers
- Error validation utilities

### New Test Files

**tests/MCPServer.test.js** (Subtask 3.5.1):
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPServerEndpoint } from '../src/mcp/server.js';
import { createMockHub } from './helpers/mocks.js';

describe('MCPServerEndpoint', () => {
  // ARRANGE: Mock hub with multiple servers
  // ACT: Test capability aggregation, routing, sync
  // ASSERT: Validate behavior and coverage
});
```

**tests/MCPConnection.oauth.test.js** (Subtask 3.5.2):
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MCPHubOAuthProvider from '../src/utils/oauth-provider.js';
import fs from 'fs/promises';

// Mock fs operations
vi.mock('fs/promises');

describe('OAuth Integration', () => {
  // ARRANGE: Mock OAuth server, file system
  // ACT: Test PKCE flow, token management, errors
  // ASSERT: Validate storage, protocol compliance
});
```

**tests/MCPConnection.stdio-real.test.js** (Subtask 3.5.3, Optional):
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPConnection } from '../src/MCPConnection.js';
import { createStdioConfig } from './helpers/fixtures.js';

describe('Real Process Spawning', () => {
  // ARRANGE: Real STDIO server process
  // ACT: Test real communication, restarts
  // ASSERT: Validate process behavior
});
```

---

## Technical Reference

### MCP Server Endpoint Architecture

**Key Classes and Methods** (src/mcp/server.js):
- `MCPServerEndpoint` constructor - Initializes capability maps
- `createSafeServerName(serverName)` - Namespacing logic
- `syncCapabilities(capabilityIds, affectedServers)` - Event-driven sync
- `registerServerCapabilities(connection, {capabilityId, serverId})` - Capability registration
- `getRegisteredCapability(request, capId, uidField)` - Request routing
- `handleSSEConnection(req, res)` - SSE transport creation
- `handleMCPMessage(req, res)` - JSON-RPC message handling

**Capability Types** (CAPABILITY_TYPES constant):
- TOOLS: `name` field, `tools/call` handler
- RESOURCES: `uri` field, `resources/read` handler
- RESOURCE_TEMPLATES: `uriTemplate` field, list-only
- PROMPTS: `name` field, `prompts/get` handler

**Event-Driven Synchronization**:
- `toolsChanged` → Sync tools
- `resourcesChanged` → Sync resources + resourceTemplates
- `promptsChanged` → Sync prompts
- `importantConfigChangeHandled` → Sync all capabilities
- `hubStateChanged` (READY, RESTARTED, STOPPED, ERROR) → Sync all

### OAuth Provider Architecture

**Key Classes and Methods** (src/utils/oauth-provider.js):
- `StorageManager` - File-based token persistence
  - `init()` - Initialize XDG data directory storage
  - `save()` - Persist storage to disk
  - `get(serverUrl)` - Retrieve server-specific data
  - `update(serverUrl, data)` - Update and persist
- `MCPHubOAuthProvider` - OAuth client implementation
  - `redirectUrl` getter - Callback URL with server_name param
  - `clientMetadata` getter - OAuth client configuration
  - `clientInformation()` / `saveClientInformation(info)` - Client info management
  - `tokens()` / `saveTokens(tokens)` - Token management
  - `redirectToAuthorization(authUrl)` - Authorization initiation
  - `codeVerifier()` / `saveCodeVerifier(verifier)` - PKCE verifier management

**Storage Schema**:
```json
{
  "https://example.com/mcp": {
    "clientInfo": { "client_id": "...", "..." },
    "tokens": { "access_token": "...", "refresh_token": "...", "..." },
    "codeVerifier": "..."
  }
}
```

### MCP Protocol Reference (Use Context7)

**Required Knowledge**:
- JSON-RPC 2.0 protocol structure
- MCP capability schemas (tools, resources, prompts)
- Error codes and McpError class
- SSE transport message format
- Client initialization and handshake

**Context7 Integration**:
```bash
# During test implementation, consult MCP SDK documentation
# Example: Understanding tools/call request schema
```

---

## Sprint 3.5 Acceptance Criteria

### Test Results ✅
- [ ] tests/MCPServer.test.js: 15-20/15-20 passing (100%)
- [ ] tests/MCPConnection.oauth.test.js: 15-18/15-18 passing (100%)
- [ ] tests/MCPConnection.stdio-real.test.js: 5-7/5-7 passing (100%) [Optional P2]
- [ ] Total test suite: 63-71 tests passing (100%) [P0+P1], 68-78 [P0+P1+P2]
- [ ] Suite execution: <90 seconds

### Coverage Targets ✅
- [ ] src/mcp/server.js: ≥70% coverage (≥410 of 588 lines)
- [ ] src/utils/oauth-provider.js: ≥90% coverage (≥110 of 122 lines)
- [ ] Overall project coverage: Improvement from 48.48% baseline

### Quality Standards ✅
- [ ] Zero logger assertions (anti-pattern eliminated)
- [ ] Zero hardcoded setTimeout patterns (intentional only)
- [ ] All tests follow AAA pattern (Arrange/Act/Assert)
- [ ] All tests use Sprint 1-3 helper utilities
- [ ] Async errors use rejects.toThrow() pattern

### Integration Validation ✅
- [ ] Tests pass with --sequence.shuffle (3 runs verified)
- [ ] Transport isolation verified (no interference)
- [ ] Process cleanup validated (zero zombies) [if P2 included]
- [ ] Coverage report generated successfully

### Risk Mitigation ✅
- [ ] MCP endpoint failures: CRITICAL → LOW (70%+ coverage)
- [ ] OAuth authentication: HIGH → LOW (90%+ coverage)
- [ ] Remote server support: BLOCKED → ENABLED
- [ ] Production readiness: At-risk → Confident

### Documentation ✅
- [ ] TEST_P3.5_WF.md: Final status updated
- [ ] SPRINT3.5_COMPLETE_SUMMARY.md: Created with all metrics
- [ ] DEFERRED_ITEMS_QUICK_REF.md: Updated (status → resolved)
- [ ] Subtask completion docs: 3.5.1, 3.5.2, [3.5.3] created

---

## Go/No-Go Decision Framework

### 🟢 GO - Sprint 3.5 Complete, Proceed to Sprint 4

**Criteria**:
- ✅ All P0 + P1 acceptance criteria met (63-71 tests passing)
- ✅ Coverage targets achieved (≥70% MCP, ≥90% OAuth)
- ✅ Quality gates passed (zero anti-patterns)
- ✅ Documentation complete

**Next Steps**:
1. Mark Sprint 3.5 complete
2. Update Sprint 4 preparation checklist
3. Begin Sprint 4: CLI & Configuration Tests

---

### 🟡 CONDITIONAL - P2 Optional Enhancement

**Criteria**:
- ✅ P0 + P1 complete in <5 hours
- ✅ Time remaining for P2 implementation (1-2 hours)
- ✅ All quality gates passed

**Decision**:
- Execute Subtask 3.5.3 if conditions met
- Otherwise, defer P2 to future sprint (acceptable risk)

---

### 🔴 NO-GO - Sprint 3.5 Incomplete

**Criteria**:
- ❌ P0 OR P1 tests failing
- ❌ Coverage targets not met
- ❌ Quality anti-patterns detected
- ❌ Time overrun (>7 hours)

**Actions**:
1. Stop execution and analyze blockers
2. Root cause analysis for failures
3. Revised plan with adjusted estimates
4. Re-execute with corrected approach

---

## Timeline and Milestones

### Phase 1: Planning & Preparation ✅
- **Duration**: Complete
- **Milestone**: TEST_P3.5_WF.md approved

### Phase 2: Subtask 3.5.1 (MCP Server Tests)
- **Duration**: 3-4 hours
- **Start**: Upon workflow approval
- **Milestone**: 15-20 tests passing, 70%+ coverage

### Phase 3: Subtask 3.5.2 (OAuth Tests)
- **Duration**: 2-3 hours
- **Start**: Upon 3.5.1 completion
- **Milestone**: 15-18 tests passing, 90%+ coverage

### Phase 4: Validation & Documentation
- **Duration**: 30 minutes
- **Start**: Upon 3.5.2 completion
- **Milestone**: Sprint 3.5 documentation complete

### Phase 5: Optional P2 (If Time Permits)
- **Duration**: 1-2 hours
- **Start**: Upon Phase 4 completion (if <5 total hours)
- **Milestone**: 5-7 additional tests passing

**Total Timeline**: 5-7 hours (P0+P1), 6-9 hours (P0+P1+P2)

---

## Sprint 3.5 Retrospective (Post-Completion)

### Lessons Learned
- [ ] Estimation accuracy (planned vs actual)
- [ ] Test pattern effectiveness
- [ ] Quality gate effectiveness
- [ ] Documentation completeness
- [ ] Tool/MCP integration insights

### Continuous Improvement
- [ ] What worked well?
- [ ] What could be improved?
- [ ] Patterns to replicate in Sprint 4+
- [ ] Process optimizations identified

---

## Related Documents

- **Sprint 3 Complete**: `SPRINT3_COMPLETE_SUMMARY.md`
- **Deferred Items Analysis**: `SPRINT3_DEFERRED_ITEMS_RESOLUTION.md`
- **Quick Reference**: `DEFERRED_ITEMS_QUICK_REF.md`
- **Sprint 3 Workflow**: `TEST_P3_WF.md`
- **Sprint 4 Workflow**: `TEST_P4_WF.md` (future)

---

**Sprint 3.5 Status**: 🔄 Ready for Execution
**Next Action**: User approval → Begin Subtask 3.5.1
**Expected Completion**: Within 5-7 hours of focused work
