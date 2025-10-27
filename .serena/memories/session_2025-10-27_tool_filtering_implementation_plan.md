# Session: Tool Filtering Implementation Plan - 2025-10-27

## Session Summary

**Duration**: ~2 hours
**Objective**: Design and plan implementation for Intelligent Tool Filtering to reduce MCP Hub's tool exposure from 3469 to 50-200 tools
**Status**: Planning Complete - Ready for Implementation

## Key Discoveries

### 1. MCP Protocol Constraint (Critical)
- **Discovery**: MCP `tools/list` method ONLY accepts pagination cursor parameter
- **Impact**: Original "Intent Analysis" approach (LLM analyzing user intent at tool listing time) is NOT possible
- **Evidence**: MCP specification 2025-03-26 shows no context parameter support in tools/list
- **Implication**: Filtering must be predetermined/config-based, not dynamic

### 2. Architecture Revision
- **Original Approach**: LLM-based intent analysis at tools/list request time
- **Revised Approach**: Config-based filtering with optional LLM categorization
- **Rationale**: MCP protocol compliance requires static filtering strategy

### 3. Three-Phase Solution Design

**Phase 1: Server-Based Filtering** (6 hours)
- Simple allowlist/denylist by server name
- Immediate relief: 3469 → ~100-200 tools
- No external dependencies
- Quick win for users

**Phase 2: Category-Based Filtering** (8 hours)
- Pattern matching against tool names
- Default category mappings for 9 domains
- Custom mapping support
- Auto-enable threshold (>1000 tools)
- Better UX: 3469 → ~50-150 tools

**Phase 3: LLM Enhancement** (8 hours, Optional)
- LLM categorization for ambiguous tools
- Persistent caching to avoid repeated API calls
- Async processing to avoid blocking
- Improves accuracy by 10-20%

## Deliverables Created

### 1. Tool_Exposure_Architecture_Analysis.md
- Analyzed current "dumb aggregator" architecture
- Identified 5 solution options with pros/cons
- Recommended hybrid approach

### 2. ML_TOOL_PLAN.md (Comprehensive Implementation Plan)
- Complete architecture design for ToolFilteringService class
- Integration points with MCPServerEndpoint
- Configuration schema with validation
- Hour-by-hour implementation timeline
- Testing strategy (unit, integration, performance)
- Configuration examples for common use cases
- Quick-start guide for immediate relief
- Default category mappings for 9 domains

## Technical Decisions

### Configuration Schema
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist" | "category" | "hybrid",
    "autoEnableThreshold": 1000,
    "serverFilter": {
      "mode": "allowlist" | "denylist",
      "servers": ["filesystem", "web", "github"]
    },
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"],
      "customMappings": { "pattern": "category" }
    },
    "llmCategorization": {
      "enabled": false,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

### ToolFilteringService Architecture
- Main method: `shouldIncludeTool(toolName, serverName, toolDefinition)`
- Filter strategies: server-based, category-based, hybrid
- Pattern matching with wildcard support
- Category cache for performance
- Optional LLM integration for edge cases

### Integration Points
- MCPServerEndpoint constructor: Initialize ToolFilteringService
- registerServerCapabilities: Apply filtering before capability registration
- syncCapabilities: Auto-enable when threshold exceeded

## Implementation Estimates

**Total Effort**: 18-26 hours (2.5-3.5 days)
- Phase 1: 6 hours
- Phase 2: 8 hours
- Phase 3: 8 hours (optional)
- Testing & Docs: 4 hours

**Recommended**: Implement Phase 1 + 2 (14 hours), defer Phase 3 based on user feedback

## User Impact

**Immediate Relief Available**:
Users can add server filtering to their config TODAY to reduce tool count:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "web", "github", "brave-search"]
    }
  }
}
```
**Result**: 3469 → ~150 tools immediately

## Next Steps

1. Review implementation plan with user
2. Confirm approach and priorities
3. Begin Phase 1 implementation (server-based filtering)
4. Test with user's actual 25-server configuration
5. Iterate based on feedback

## Session Context

**Related Files**:
- `/home/ob/Development/Tools/mcp-hub/src/mcp/server.js` - MCPServerEndpoint (integration point)
- `/home/ob/Development/Tools/mcp-hub/src/utils/sse-manager.js` - SSEManager (modified for stack overflow fix)
- `/home/ob/Development/Tools/mcp-hub/src/utils/event-batcher.js` - EventBatcher (modified for stack overflow fix)
- `/home/ob/Development/Tools/mcp-hub/claudedocs/Tool_Exposure_Architecture_Analysis.md` - Architecture analysis
- `/home/ob/Development/Tools/mcp-hub/claudedocs/ML_TOOL_PLAN.md` - Implementation plan

**Project State**:
- All 311 tests passing (100% pass rate)
- 82.94% branch coverage
- MCP Hub server running with 25 servers connected
- Stack overflow bug fixed (infinite recursion in logging system)

**Previous Session Context**:
- Sprint 5 completion (Test Suite Rewrite Project)
- ConnectionPool validation complete
- PR #10 created for Sprint 5

## Patterns Learned

1. **MCP Protocol Compliance**: Always verify protocol specifications before designing features
2. **Progressive Enhancement**: Build simple solutions first, add complexity only when needed
3. **Config-Based vs. Dynamic**: When protocol doesn't support dynamic behavior, use configuration
4. **Backward Compatibility**: Default-disabled features maintain existing behavior
5. **Caching Strategy**: Cache expensive operations (LLM calls, categorizations) aggressively

## Questions for Next Session

1. Should we implement Phase 1 immediately?
2. Does the user have an LLM API key available for Phase 3?
3. What are the user's most frequently used servers (for default allowlist)?
4. Should auto-enable threshold be configurable or fixed at 1000?
5. Do we need a UI for managing filtering configuration?
