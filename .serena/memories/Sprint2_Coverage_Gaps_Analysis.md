# Sprint 2 Coverage Gap Analysis

## Coverage Status Summary

- **MCPHub.js**: 63.15% statements, 84.48% branches, 62.50% functions
- **MCPConnection.js**: 62.47% statements, 71.59% branches, 60.60% functions
- **Target**: 80% for all metrics

## Uncovered Areas

### MCPHub.js (36.85% uncovered)

1. **Error Handling Paths**
   - Initialization error handling with wrapError
   - Config watching error scenarios
   - Multi-server startup failure handling

2. **Lifecycle Methods**
   - `startServer()` method (manual server startup)
   - `cleanup()` method (graceful shutdown)
   - `restartHub()` scenarios

3. **Configuration Scenarios**
   - Object-based config (non-file config)
   - Public hub URL override via environment variable
   - Restart scenarios with state management

4. **Edge Cases**
   - No servers configured (empty config)
   - All servers disabled scenario
   - Partial server failures

### MCPConnection.js (37.53% uncovered)

1. **OAuth Flow**
   - OAuth authorization flows
   - Authorization callback handling
   - Token refresh scenarios

2. **Transport Fallback Logic**
   - streamable-http → SSE transport fallback
   - Multiple transport failure scenarios
   - Auth error handling in transport layers

3. **Error Recovery**
   - Automatic reconnection logic
   - Transient network failure recovery
   - Stderr error stream handling

4. **Dev Mode Features**
   - File watching and auto-restart
   - Dev watcher lifecycle management
   - Hot-reload scenarios

## Sprint 2.5 Recommendation

**Time Estimate**: 2-3 hours
**Additional Tests**: ~15-20 edge case tests
**Expected Outcome**: 80%+ coverage for all metrics

**Focus Areas**:
1. Error Scenarios (30 min)
2. Edge Cases (45 min)
3. Lifecycle Methods (30 min)
4. Advanced Features (45 min)

See claudedocs/SPRINT2_COVERAGE_ANALYSIS.md for complete analysis.