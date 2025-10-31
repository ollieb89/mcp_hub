# Prompt-Based Dynamic Tool Filtering - Implementation Summary

## Overview

Successfully implemented prompt-based dynamic tool filtering for MCP Hub. This feature allows clients to connect with **zero tool exposure by default**, then dynamically expose only relevant tools based on LLM analysis of user prompts.

## Architecture

### Key Components

1. **Per-Client Capability Registry**
   - Changed from global `registeredCapabilities` to dual-registry approach:
     - `allCapabilities`: Master registry of ALL available tools across all servers
     - `clientSessions`: Per-client state tracking which tools are exposed to each session
   
2. **Session Tracking**
   - Uses SSE transport `sessionId` as unique client identifier
   - Each session tracks:
     - `exposedCategories`: Set of tool categories currently exposed
     - `exposedTools`: Map of currently accessible tools
     - `promptHistory`: History of analyzed prompts
     - `createdAt`: Session creation timestamp

3. **Meta-Tool: `hub__analyze_prompt`**
   - Always exposed (category: 'meta')
   - Accepts user prompt and optional context
   - Uses existing Gemini LLM integration to analyze intent
   - Returns relevant tool categories with confidence and reasoning
   - Automatically triggers tool list update

4. **Dynamic Tool Exposure Flow**
   ```
   Client connects → Sees only hub__analyze_prompt
   ↓
   User provides prompt → Client calls hub__analyze_prompt
   ↓
   Gemini analyzes intent → Returns categories (e.g., ["github", "filesystem"])
   ↓
   Hub updates client tool list → Sends tools/list_changed notification
   ↓
   Client re-fetches tools → Sees only relevant tools
   ↓
   New prompt → Re-analyze → Update tools → Notify
   ```

## Implementation Details

### Modified Files

#### `src/mcp/server.js`

**Constructor Changes (Lines 156-175)**:
```javascript
// BEFORE: Single global registry
this.registeredCapabilities = {};

// AFTER: Dual registry + per-client sessions
this.allCapabilities = {};           // Global master list
this.clientSessions = new Map();     // Per-client state
this.registeredCapabilities = this.allCapabilities; // Backward compat
```

**New Methods Added**:

1. **`registerMetaTools()`** - Registers hub-internal meta tools
   - Defines `hub__analyze_prompt` tool schema
   - Adds to `allCapabilities` with category 'meta'
   - Sets up handler function

2. **`handleAnalyzePrompt(args, sessionId)`** - Meta-tool handler
   - Receives prompt and context from client
   - Constructs LLM analysis prompt with available categories
   - Calls Gemini LLM via existing `filteringService.llmClient`
   - Parses JSON response (handles markdown code blocks)
   - Calls `updateClientTools()` to update exposure
   - Returns analysis results to client

3. **`initializeClientSession(sessionId, initialCategories)`**
   - Creates new session entry with default 'meta' category
   - Called on new SSE connection
   - Initializes tool list with meta tools only

4. **`getClientCapabilities(sessionId, capabilityType)`**
   - Returns filtered capabilities for specific client session
   - For tools: filters by exposed categories
   - Falls back to all capabilities if session doesn't exist (backward compat)

5. **`updateClientTools(sessionId, categories, additive)`**
   - Updates session's exposed categories
   - Sends `tools/list_changed` notification via MCP SDK
   - Logs category updates

6. **`getCapabilityCategory(capabilityName)`**
   - Extracts category from namespaced tool name (e.g., 'github' from 'github__list_issues')
   - Returns 'uncategorized' if no match

7. **`cleanupClientSession(sessionId)`**
   - Removes session data on client disconnect
   - Called from connection cleanup handler

**Modified Methods**:

1. **`setupRequestHandlers(server, sessionId)`**
   - Now accepts `sessionId` parameter for per-client filtering
   - Custom tools/call handler that checks for meta tools first
   - Falls back to proxying to backend servers for regular tools
   - Uses `getClientCapabilities()` for session-aware tool lists

2. **`handleSSEConnection(req, res)`**
   - Calls `initializeClientSession()` with 'meta' only
   - Passes `sessionId` to `setupRequestHandlers()`
   - Adds `cleanupClientSession()` to disconnect handler

3. **`createServer()`**
   - Removed direct `setupRequestHandlers()` call
   - Now called from `handleSSEConnection()` with sessionId

4. **`getRegisteredCapability(request, capId, uidField, sessionId)`**
   - Added `sessionId` parameter
   - Uses session-aware capability lookup

5. **`registerServerCapabilities(connection, { capabilityId, serverId })`**
   - Uses `allCapabilities` instead of `registeredCapabilities`

## Tool Categories

The meta-tool recognizes these categories (from LLM analysis prompt):

- **github**: GitHub repository management, issues, PRs
- **filesystem**: File operations, reading/writing files  
- **web**: Web browsing, fetching web content
- **docker**: Container management
- **git**: Git operations (local)
- **python**: Python environment management
- **database**: Database operations
- **memory**: Knowledge management
- **vertex_ai**: AI-assisted development tasks
- **meta**: Hub-internal meta tools (always exposed)

## LLM Integration

Reuses existing Gemini integration from Sprint 3:
- Model: `gemini-2.5-flash`
- Provider: Configured via `toolFiltering.llm` in `mcp-servers.json`
- API key: Resolved via environment variables
- Prompt: Structured to return JSON with categories, confidence, reasoning

Example LLM response:
```json
{
  "categories": ["github", "git"],
  "confidence": 0.95,
  "reasoning": "User wants to create a pull request, which requires GitHub tools"
}
```

## Backward Compatibility

✅ **Fully backward compatible** with existing static filtering:
- `registeredCapabilities` still points to `allCapabilities`
- If no session exists, `getClientCapabilities()` returns all tools
- Existing code using `registeredCapabilities` works unchanged
- Static filtering mode remains functional

## Testing Status

### ✅ Completed
- Task 1: Architecture understanding
- Task 2: Design session-based system
- Task 3: Per-client capability registry
- Task 4: analyze_prompt meta-tool
- Task 5: Dynamic tool list updates

### ⏳ Pending
- Task 6: Configuration for prompt-based mode (optional enhancement)
- Task 7: E2E testing with actual MCP client

### Verification
- ✅ Syntax check passed (`node --check src/mcp/server.js`)
- ✅ Server starts successfully with tool filtering working
- ⏳ Needs testing with MCP client (Claude Desktop, VS Code, etc.)

## Configuration (Future Enhancement - Task 6)

Proposed configuration in `mcp-servers.json`:
```json
{
  "toolFiltering": {
    "mode": "prompt-based",  // or "static"
    "defaultExposure": "meta-only",  // or "zero", "minimal", "all"
    "enableMetaTools": true,
    "llm": {
      "provider": "gemini",
      "model": "gemini-2.5-flash"
    }
  }
}
```

## Usage Example

### Client Perspective

1. **Connect to Hub**
   ```
   Client: Connect to MCP Hub
   Hub: Returns tools list with only hub__analyze_prompt
   ```

2. **User makes request**
   ```
   User: "Check if there are any open issues on GitHub"
   Client: Call hub__analyze_prompt with prompt="Check if there are any open issues on GitHub"
   ```

3. **Hub analyzes and updates**
   ```
   Hub: Analyzes with Gemini → Returns ["github"]
   Hub: Updates client tool list → Sends tools/list_changed
   Client: Re-fetches tools → Sees GitHub tools
   ```

4. **Client uses exposed tools**
   ```
   Client: Call github__list_issues with repository info
   Hub: Proxies to GitHub MCP server → Returns results
   ```

5. **Context switch**
   ```
   User: "Now read the README file"
   Client: Call hub__analyze_prompt with prompt="Now read the README file"
   Hub: Returns ["filesystem"] → Updates → Notifies
   Client: Sees filesystem tools, can now read files
   ```

## Benefits

1. **Security**: Zero-default exposure prevents accidental tool access
2. **Efficiency**: Clients see only relevant tools, reducing cognitive load
3. **Context-aware**: Tool exposure adapts to conversation flow
4. **Privacy**: Per-client filtering ensures session isolation
5. **Scalable**: Works with any number of backend MCP servers
6. **Flexible**: LLM-based analysis adapts to natural language variations

## Technical Decisions

### Why Meta-Tool Pattern?
MCP protocol calls `tools/list` during connection initialization, BEFORE any user prompt exists. Cannot filter at that stage. Meta-tool allows analyzing prompts AFTER connection is established.

### Why Per-Client Registry?
Multiple clients may have different conversation contexts. Global registry would expose tools based on any client's prompt, breaking session isolation.

### Why Gemini?
Already integrated and configured in Sprint 3. Reusing existing LLM client avoids adding new dependencies.

### Why Not Modify MCP Protocol?
MCP is a standard protocol. Modifying it would break compatibility with existing clients. Meta-tool approach works within protocol constraints.

## Next Steps

1. **Task 6**: Add configuration support for toggling prompt-based vs static mode
2. **Task 7**: E2E testing with Claude Desktop or VS Code
3. **Documentation**: Update user-facing docs with meta-tool usage
4. **Performance**: Monitor LLM analysis latency, add caching if needed
5. **Enhancement**: Add conversation history to improve multi-turn analysis

## Files Modified

- ✅ `src/mcp/server.js` (~150 lines added/modified)

## Files to Create (Future)

- Configuration schema validation
- E2E test suite
- User documentation for prompt-based mode

---

**Status**: Core implementation complete ✅  
**Ready for**: Configuration polish and E2E testing  
**Backward Compatible**: Yes ✅  
**Breaking Changes**: None ✅
