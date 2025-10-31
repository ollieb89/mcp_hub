# MCP Hub Meta-Tool Preservation Fix - 2025-10-31

## Problem Summary
The `hub__analyze_prompt` meta-tool was disappearing during capability synchronization in prompt-based filtering mode, resulting in 355 tools instead of 356 (355 from servers + 1 meta-tool).

## Root Cause
The `syncCapabilityType()` method in `src/mcp/server.js` was calling `capabilityMap.clear()` without preserving hub-internal meta-tools (tools with `category === 'meta'`). This caused the meta-tool registered by `registerMetaTools()` to be removed when servers synchronized their capabilities.

## Solution Implemented
Modified `syncCapabilityType()` method to preserve meta-tools during capability synchronization:

### Incremental Sync (Lines 818-828)
```javascript
// Skip meta-tools (hub-internal) during incremental sync
for (const [key, registration] of capabilityMap.entries()) {
  if (registration.category === 'meta') continue;
  
  if (affectedServers.includes(registration.serverName)) {
    capabilityMap.delete(key);
  }
}
```

### Full Rebuild (Lines 831-857)
```javascript
// Save meta-tools before clearing
const metaTools = new Map();
if (capabilityId === CAPABILITY_TYPES.TOOLS.id) {
  for (const [key, registration] of capabilityMap.entries()) {
    if (registration.category === 'meta') {
      metaTools.set(key, registration);
    }
  }
}

// Clear all capabilities
capabilityMap.clear();

// Restore meta-tools first
for (const [key, registration] of metaTools.entries()) {
  capabilityMap.set(key, registration);
}

// Then rebuild capabilities from connected servers
for (const [serverId, connection] of this.serversMap) {
  if (connection.status === "connected" && !connection.disabled) {
    this.registerServerCapabilities(connection, { capabilityId, serverId });
  }
}
```

### Debug Logging Added
- Lines 677-681: `syncCapabilities()` entry logging
- Lines 812-816: `syncCapabilityType()` meta-tool count tracking
- Lines 182-189: `registerMetaTools()` registration confirmation
- Lines 412-428: Individual meta-tool registration logging

## Verification Results

**Before Fix:**
- Tool count: 355 (meta-tool missing)
- Logs showed registration but disappearance after sync

**After Fix:**
- Tool count: 356 ✅ (355 from servers + 1 meta-tool)
- Logs confirm preservation:
  ```
  Registered 1 meta-tools in allCapabilities.tools (total tools now: 1)
  syncCapabilityType for tools: 1 tools before sync
    Meta-tools before sync: 1
  Preserving 1 meta-tools during sync: hub__analyze_prompt
  Restored 1 meta-tools after clear
  ```

## Files Modified
- `/home/ob/Development/Tools/mcp-hub/src/mcp/server.js` - Meta-tool preservation logic and debug logging

## Configuration Context
- Filtering mode: `prompt-based`
- Default exposure: `meta-only`
- Enable meta-tools: `true`
- Session isolation: `true`
- LLM provider: `gemini` with `gemini-2.5-flash`

## Impact
- Prompt-based filtering now correctly exposes `hub__analyze_prompt` meta-tool to MCP clients
- Enables dynamic tool exposure based on LLM analysis of user prompts
- Preserves hub-internal capabilities during server synchronization
- Maintains proper tool count across capability sync operations

## Testing Notes
- Verified via `/api/health` endpoint showing 356 total tools
- Confirmed preservation through debug logs tracking meta-tool lifecycle
- Hub restart maintains meta-tool across initialization and sync cycles

## Future Considerations
- Monitor for additional hub-internal capabilities that may need preservation
- Consider generalizing preservation logic for other capability types (resources, prompts)
- Evaluate performance impact of meta-tool filtering during high-frequency sync operations
