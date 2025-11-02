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

### Example Conversation

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

### "LLM-based prompt analysis not available"

**Cause**: LLM provider not configured or missing API key

**Fix**: 
1. Check `mcp-servers.json` has `toolFiltering.llm` configured
2. Verify Gemini API key in environment: `GEMINI_API_KEY`
3. Restart MCP Hub

### Tools not updating after analyze_prompt

**Cause**: Client not handling `tools/list_changed` notification

**Fix**: Ensure MCP client supports dynamic tool lists (requires `listChanged: true` capability)

### Wrong tools exposed

**Cause**: LLM misunderstood user intent

**Solution**: Call `hub__analyze_prompt` again with more context:
```json
{
  "prompt": "read package.json",
  "context": "User is working on a Node.js project and needs to inspect dependencies"
}
```

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
