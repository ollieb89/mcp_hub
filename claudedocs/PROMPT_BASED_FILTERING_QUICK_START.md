# Prompt-Based Dynamic Tool Filtering - Quick Start

## What Changed?

MCP Hub now supports **intelligent, prompt-based tool exposure**. Instead of exposing all tools at once, clients start with zero tools and dynamically receive only relevant tools based on LLM analysis of user prompts.

## How It Works

### For MCP Client Users

When you connect to MCP Hub, you'll initially see only one tool:

**`hub__analyze_prompt`** - Meta-tool for analyzing user intent

#### Usage Pattern

1. **User makes a request** (natural language)
2. **Client calls** `hub__analyze_prompt` with the user's prompt
3. **Hub analyzes** the prompt using Gemini LLM
4. **Hub exposes** relevant tools and notifies client
5. **Client receives** updated tool list
6. **Client proceeds** with the original request using newly available tools

### Example Workflows

#### Workflow 1: Simple GitHub Request

```
User: "Check my GitHub notifications"
↓
Client: hub__analyze_prompt({ prompt: "Check my GitHub notifications" })
↓
Hub Response: {
  categories: ["github"],
  confidence: 0.98,
  reasoning: "User wants to check GitHub notifications",
  message: "Updated tool exposure: github",
  nextStep: "Tools list has been updated. Proceed with your request."
}
↓
Client: [Receives tools/list_changed notification]
↓
Client: [Re-fetches tool list, now sees GitHub tools]
↓
Client: github__list_notifications()
↓
Done! ✅
```

#### Workflow 2: Multi-Category Request

```
User: "Read the Dockerfile, check GitHub for the latest image tag, and search web for deployment best practices"
↓
Client: hub__analyze_prompt({ prompt: "Read the Dockerfile..." })
↓
Hub Response: {
  categories: ["filesystem", "github", "web", "docker"],
  confidence: 0.95,
  reasoning: "User needs file reading, GitHub integration, web search, and Docker operations",
  message: "Updated tool exposure: filesystem, github, web, docker",
  nextStep: "Tools list has been updated. Proceed with your request."
}
↓
Client: [Receives tools/list_changed notification with 4 categories]
↓
Client: [Re-fetches tool list, now sees 10+ tools from all 4 categories]
↓
Client: filesystem__read_file({ path: "Dockerfile" })
↓
Client: github__search_repositories({ query: "image tags" })
↓
Client: web__search({ query: "Docker deployment best practices" })
↓
Done! ✅
```

#### Workflow 3: Additive Mode (Progressive Tool Exposure)

```
Session Start: Client sees only hub__analyze_prompt
↓
User Request 1: "List my GitHub repos"
→ Categories exposed: [github]
→ Tools available: 3 GitHub tools
↓
User Request 2: "Read the config.json file"
→ Categories exposed: [github, filesystem] (accumulated!)
→ Tools available: 3 GitHub + 3 filesystem = 6 tools
↓
User Request 3: "Search web for documentation"
→ Categories exposed: [github, filesystem, web] (accumulated!)
→ Tools available: 3 GitHub + 3 filesystem + 2 web = 8 tools
↓
Note: Categories accumulate throughout the session.
      Tools are NEVER removed once exposed.
```

#### Workflow 4: Session Isolation

```
┌─────────────────────────────────────────────┐
│ Client A (Claude Desktop)                   │
├─────────────────────────────────────────────┤
│ Request: "GitHub notifications"             │
│ Categories: [github]                        │
│ Tools visible: github__* (3 tools)          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Client B (VS Code)                          │
├─────────────────────────────────────────────┤
│ Request: "Read package.json"                │
│ Categories: [filesystem]                    │
│ Tools visible: filesystem__* (3 tools)      │
└─────────────────────────────────────────────┘

Each client maintains independent tool exposure!
Client A cannot see filesystem tools.
Client B cannot see GitHub tools.
```

## Meta-Tool API

### `hub__analyze_prompt`

**Purpose**: Analyze user prompt and expose relevant tools

**Input Schema**:
```json
{
  "prompt": "string (required) - The user's request or query",
  "context": "string (optional) - Conversation context for better analysis"
}
```

**Output**:
```json
{
  "categories": ["array", "of", "categories"],
  "confidence": 0.95,
  "reasoning": "Why these categories were selected",
  "message": "Human-readable status",
  "nextStep": "What to do next"
}
```

**Tool Categories**:
- `github` - GitHub operations (repos, issues, PRs)
- `filesystem` - File reading/writing
- `web` - Web browsing, fetching URLs
- `docker` - Container management
- `git` - Local git operations
- `python` - Python environment management
- `database` - Database queries
- `memory` - Knowledge graph management
- `vertex_ai` - AI-assisted development
- `meta` - Hub internal tools (always available)

## For MCP Server Developers

### Current Behavior

✅ **Default**: Clients start with only `hub__analyze_prompt` exposed  
✅ **Dynamic**: Tool list updates based on user prompts  
✅ **Isolated**: Each client session has independent tool exposure  
✅ **Automatic**: No server-side changes needed

### Backward Compatibility

If a client doesn't use `hub__analyze_prompt`, they'll still see all tools (backward compatible with existing clients that don't support dynamic filtering).

## Configuration

### Enable Prompt-Based Mode

Edit `mcp-servers.json`:

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "enableMetaTools": true,
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  }
}
```

### Configuration Options

**`mode`**: 
- `"prompt-based"` - Dynamic tool exposure (recommended)
- `"static"` - All tools visible at once
- `"server-allowlist"` - Filter by server names only

**`promptBasedFiltering.defaultExposure`**:
- `"zero"` - No tools initially
- `"meta-only"` - Only meta-tools (recommended)
- `"minimal"` - Core tools (meta + filesystem + memory)
- `"all"` - All tools (disables filtering)

**`promptBasedFiltering.enableMetaTools`**: Set to `true` to enable `hub__analyze_prompt`

**`promptBasedFiltering.sessionIsolation`**: Set to `true` for per-client tool isolation

### Switching Modes

**Back to Static** (all tools visible):
```json
{
  "toolFiltering": {
    "mode": "static"
  }
}
```

**Server Allowlist** (static filtering by server):
```json
{
  "toolFiltering": {
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["github", "filesystem"]
    }
  }
}
```

## Testing

### Manual Test

1. Connect MCP client to hub
2. List tools → Should see only `hub__analyze_prompt`
3. Call `hub__analyze_prompt` with prompt: `"list my GitHub repos"`
4. Wait for `tools/list_changed` notification
5. List tools → Should now see GitHub tools
6. Call `github__list_repos`
7. Success! ✅

### Verify Session Isolation

1. Connect two clients (e.g., Claude Desktop + VS Code)
2. Client A: Analyze prompt for GitHub tools
3. Client B: List tools → Should NOT see GitHub tools (only meta)
4. Each client has independent tool exposure ✅

## Troubleshooting

### Scenario 1: "LLM-based prompt analysis not available"

**Symptoms**:
- `hub__analyze_prompt` returns error message
- Error: "LLM client not available for prompt analysis"

**Cause**: LLM provider not configured or missing API key

**Debug Steps**:
1. Check MCP Hub logs: `~/.mcp-hub/logs/mcp-hub.log`
2. Look for: `"LLM categorization enabled: false"` or `"LLM client creation failed"`

**Fix**:
```bash
# 1. Verify configuration in mcp-servers.json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  }
}

# 2. Set environment variable
export GEMINI_API_KEY="your-api-key-here"

# 3. Restart MCP Hub
pkill -f mcp-hub && npm start
```

### Scenario 2: Tools not updating after analyze_prompt

**Symptoms**:
- `hub__analyze_prompt` succeeds
- Returns categories in response
- BUT tools/list stays the same

**Cause**: Client not handling `tools/list_changed` notification

**Debug Steps**:
1. Check if client supports `listChanged` capability
2. Monitor SSE events: `curl -N http://localhost:7000/events`
3. Look for `tools/list_changed` notification being sent

**Fix**:
- Ensure MCP client implements `notifications/tools/list_changed` handler
- Client must re-fetch tool list after receiving notification
- Verify client session ID is being tracked properly

**Validation**:
```javascript
// MCP Client should implement:
client.setNotificationHandler("notifications/tools/list_changed", async (params) => {
  console.log("Tool list changed:", params);
  // Re-fetch tools
  const tools = await client.request("tools/list", {});
  console.log("Updated tools:", tools);
});
```

### Scenario 3: Wrong tools exposed (LLM misunderstood)

**Symptoms**:
- User asks for GitHub operation
- Hub exposes filesystem tools instead
- Or no tools exposed at all

**Cause**: LLM misunderstood user intent or ambiguous prompt

**Debug Steps**:
1. Check analyze_prompt response for `reasoning` field
2. Review confidence score (should be > 0.7)
3. Look at detected categories

**Solution 1 - Add Context**:
```json
{
  "prompt": "read package.json",
  "context": "User is working on a Node.js project and needs to inspect dependencies in the package manifest file"
}
```

**Solution 2 - Be More Specific**:
```diff
- "check my repos"
+ "list my GitHub repositories"

- "read the file"
+ "read the package.json configuration file using filesystem tools"
```

**Solution 3 - Call Again** (Additive Mode):
```javascript
// First call exposed wrong category
await hub__analyze_prompt({ prompt: "read file" });
// → Categories: [filesystem]

// Call again with more specific request
await hub__analyze_prompt({ prompt: "I need GitHub repository tools" });
// → Categories: [filesystem, github] (accumulated!)
```

### Scenario 4: Session isolation not working

**Symptoms**:
- Client A's tool changes affect Client B
- Multiple clients seeing same tool exposure

**Cause**: `sessionIsolation: false` or missing sessionId

**Fix**:
```json
{
  "toolFiltering": {
    "promptBasedFiltering": {
      "sessionIsolation": true  // ← Ensure this is true
    }
  }
}
```

**Validation**:
```bash
# Connect 2 clients and check they have different tool lists
# Client A exposes GitHub, Client B exposes filesystem
# They should remain isolated
```

### Scenario 5: Performance degradation

**Symptoms**:
- analyze_prompt takes > 5 seconds
- High LLM API usage

**Cause**: LLM API latency or rate limiting

**Debug**:
```bash
# Check MCP Hub logs for LLM call duration
grep "LLM analysis complete" ~/.mcp-hub/logs/mcp-hub.log

# Look for:
# "duration": 1500  ← Good (1.5s)
# "duration": 8000  ← Slow (8s)
```

**Fix**:
1. **Switch to faster model**:
   ```json
   {
     "model": "gemini-2.0-flash-lite"  // Faster, slightly less accurate
   }
   ```

2. **Check API quotas**: Verify Gemini API quota hasn't been exceeded

3. **Future**: Enable prompt caching (not yet implemented)

### Scenario 6: Empty tool list after analyze_prompt

**Symptoms**:
- analyze_prompt succeeds
- Returns categories: ["github"]
- But tools/list returns empty array

**Cause**: GitHub server not connected or disabled

**Debug**:
```bash
# Check server status
curl http://localhost:7000/api/servers | jq '.[] | select(.name=="github")'

# Should show:
# {
#   "name": "github",
#   "status": "connected",  ← Must be "connected"
#   "disabled": false       ← Must be false
# }
```

**Fix**:
1. Check backend server configuration in `mcp-servers.json`
2. Verify server is running: `curl http://localhost:7000/api/servers`
3. Restart disconnected server
4. Check server logs for connection errors

## Performance Notes

- **LLM Analysis**: ~1-2 seconds per prompt
- **Tool Update**: Instantaneous (in-memory)
- **Notification**: Near-instant via SSE
- **Caching**: Not yet implemented (future enhancement)

## Future Enhancements

- [ ] Configuration to toggle prompt-based vs static mode
- [ ] Conversation history for multi-turn context
- [ ] Caching frequent prompt patterns
- [ ] Fine-tuned category detection
- [ ] Custom category definitions per deployment

## Architecture Overview

```
┌─────────────┐
│ MCP Client  │
│ (Claude,    │
│  VS Code)   │
└──────┬──────┘
       │ 1. Connect
       ↓
┌─────────────────────┐
│   MCP Hub Server    │
│ ┌─────────────────┐ │
│ │ Session Manager │ │ ← Per-client state
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │  Meta-Tool:     │ │
│ │  analyze_prompt │ │ ← Always exposed
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │  Gemini LLM     │ │ ← Intent analysis
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Tool Registry   │ │ ← All available tools
│ │ (allCapabilities)│ │
│ └─────────────────┘ │
└──────┬──────────────┘
       │ 2. Proxy tool calls
       ↓
┌──────────────────┐
│ Backend MCP      │
│ Servers          │
│ (GitHub, FS...)  │
└──────────────────┘
```

## Key Differences vs Static Filtering

| Feature | Static Filtering | Prompt-Based Filtering |
|---------|------------------|------------------------|
| Initial exposure | All tools | Only meta-tool |
| Tool selection | Configuration file | LLM analysis |
| Context-aware | No | Yes |
| Per-client | No | Yes |
| Requires LLM | Optional | Required |
| Latency | None | ~1-2s per analysis |

---

**Implementation**: Complete ✅  
**Status**: Ready for testing  
**Documentation**: [PROMPT_BASED_FILTERING_IMPLEMENTATION.md](./PROMPT_BASED_FILTERING_IMPLEMENTATION.md)
