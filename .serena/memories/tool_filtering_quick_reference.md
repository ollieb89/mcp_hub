# Tool Filtering Quick Reference

## Problem
MCP Hub exposes ALL 3469 tools from ALL servers to clients, causing:
- Context pollution (LLM overwhelmed)
- Poor tool discovery
- Increased latency and API costs
- User complained: "cursor sees 3469 tools and even more prompts"

## Root Cause
MCP Hub is a "dumb aggregator" - it exposes all capabilities with namespace prefixing. No intelligent routing exists.

## Solution: Config-Based Filtering (MCP-Compliant)

### Critical Constraint
MCP protocol's `tools/list` method ONLY accepts pagination cursor. Cannot pass user intent or context. Therefore, filtering must be config-based, not dynamic.

## Quick Implementation Priorities

### Phase 1: Server Filtering (6 hours - Quick Win)
**File**: `src/utils/tool-filtering-service.js`
**Integration**: `src/mcp/server.js` - MCPServerEndpoint.registerServerCapabilities()

**Config Example**:
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

### Phase 2: Category Filtering (8 hours - Better UX)
**Pattern Matching**: Match tool names against default categories
**Default Categories**: filesystem, web, search, database, version-control, docker, cloud, development, communication

**Config Example**:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

### Phase 3: LLM Enhancement (8 hours - Optional)
**Purpose**: Categorize ambiguous tools using LLM
**Caching**: Persistent cache to avoid repeated API calls
**Async**: Don't block server startup

## Default Category Mappings

```javascript
const DEFAULT_CATEGORIES = {
  filesystem: ['filesystem__*', 'files__*', '*__read', '*__write'],
  web: ['fetch__*', 'http__*', 'browser__*'],
  search: ['brave__*', 'tavily__*', '*__search'],
  database: ['postgres__*', 'mysql__*', '*__query'],
  'version-control': ['github__*', 'git__*'],
  docker: ['docker__*', 'container__*'],
  cloud: ['aws__*', 'gcp__*', 'azure__*'],
  development: ['npm__*', 'compiler__*', 'test__*'],
  communication: ['slack__*', 'email__*']
};
```

## Integration Points

### 1. MCPServerEndpoint Constructor
```javascript
this.toolFilteringService = new ToolFilteringService(mcpHub.config, mcpHub);
```

### 2. registerServerCapabilities Method
```javascript
if (capabilityId === 'tools') {
  const shouldInclude = this.toolFilteringService.shouldIncludeTool(
    originalValue,
    serverName,
    cap
  );
  
  if (!shouldInclude) {
    continue; // Skip this tool
  }
}
```

### 3. syncCapabilities Method
```javascript
const toolCount = this.registeredCapabilities['tools'].size;
this.toolFilteringService.autoEnableIfNeeded(toolCount);
```

## Testing Strategy

**Unit Tests**: `tests/tool-filtering-service.test.js`
- Server allowlist/denylist
- Category pattern matching
- Auto-enable threshold
- LLM categorization (mocked)

**Integration Tests**: `tests/MCPServerEndpoint.integration.test.js`
- Tool registration with filtering
- tools/list excludes filtered tools
- Config hot-reload
- Backward compatibility

## Expected Results

- **Server Filtering**: 3469 → ~100-200 tools
- **Category Filtering**: 3469 → ~50-150 tools
- **With LLM**: 3469 → ~80 tools (better accuracy)

## Documentation Locations

- **Full Plan**: `/home/ob/Development/Tools/mcp-hub/claudedocs/ML_TOOL_PLAN.md`
- **Architecture Analysis**: `/home/ob/Development/Tools/mcp-hub/claudedocs/Tool_Exposure_Architecture_Analysis.md`
- **Session Memory**: `session_2025-10-27_tool_filtering_implementation_plan`
