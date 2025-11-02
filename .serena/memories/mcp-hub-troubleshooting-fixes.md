# MCP Hub Troubleshooting - Common Issues and Fixes

## Issue 1: Tool Filtering Blocking All Tools

### Symptoms
- MCP client connects but discovers 0 tools
- Hub shows `registeredCapabilities.tools: 0` in health endpoint
- Filtering stats show high filter rate (e.g., 355 tools filtered to 0)

### Root Cause
Tool filtering enabled with category mode, but tool names don't match configured categories. Example:
```json
"toolFiltering": {
  "enabled": true,
  "mode": "category",
  "categoryFilter": {
    "categories": ["filesystem", "web", "search"]
  }
}
```

### Solution
Either disable tool filtering or use server-allowlist mode:

**Option 1 - Disable filtering:**
```json
"toolFiltering": {
  "enabled": false
}
```

**Option 2 - Use server-allowlist:**
```json
"toolFiltering": {
  "enabled": true,
  "mode": "server-allowlist",
  "serverFilter": {
    "mode": "allowlist",
    "servers": ["github", "filesystem", "git"]
  }
}
```

### Verification
```bash
# Check exposed tools
curl -s http://localhost:7000/api/health | jq '.mcpEndpoint.registeredCapabilities.tools'

# Check filtering stats
curl -s http://localhost:7000/api/filtering/stats | jq '{enabled, exposedTools, filteredTools}'
```

---

## Issue 2: JSON Parse Errors from MCP Servers with ANSI Codes

### Symptoms
- Log shows: `"'server-name' error: Unexpected token '\u001b'"`
- Server outputs colored/formatted logs to stdout
- MCP SDK tries to parse ANSI escape codes as JSON-RPC messages

### Root Cause
Some MCP servers (especially Rust binaries) output ANSI color codes to stdout, which the MCP SDK expects to contain only JSON-RPC messages.

### Solution
Add environment variables to disable colored output:

```json
"server-name": {
  "command": "/path/to/binary",
  "env": {
    "NO_COLOR": "1",
    "CLICOLOR": "0",
    "CLICOLOR_FORCE": "0"
  }
}
```

### Common Servers Affected
- `imagen3` (Rust binary)
- `vertex-ai` (outputs "Initialize" text)
- Any server using colored logging libraries

### Verification
```bash
# Check for ANSI-related errors
grep "Unexpected token" /tmp/mcp-hub.log

# Should show no errors after fix
```

---

## Issue 3: Connection Errors - "fetch failed" and "404"

### Symptoms
```
[info] Connection state: Error Error sending message to http://localhost:7000/mcp: TypeError: fetch failed
[info] 404 status sending message to http://localhost:7000/mcp, will attempt to fall back to legacy SSE
```

### Root Cause
MCP Hub implements **SSE transport only**, not streamable-http. MCP clients try streamable-http first (POST to `/mcp`), which returns 404, then automatically fall back to SSE.

### Expected Behavior
This is **normal behavior**:
1. Client tries: `POST /mcp` (streamable-http) → 404
2. Client falls back: `GET /mcp` (SSE) → Success

### Verification
The SSE fallback works correctly. Check that tools are discovered:
```bash
curl -s http://localhost:7000/api/health | jq '.mcpEndpoint'
```

Should show non-zero tools, resources, prompts.

---

## Issue 4: Hub Not Starting on Expected Port

### Symptoms
- Port 7000 not responding
- Process exists but wrong port

### Diagnosis
```bash
# Check what's running on port 7000
lsof -i :7000 | grep LISTEN

# Check hub process
ps aux | grep mcp-hub | grep -v grep
```

### Solution
Ensure hub is started with correct port:
```bash
cd /home/ob/Development/Tools/mcp-hub
npm start  # Uses port 7000 from package.json scripts
```

Or explicitly:
```bash
node ./src/utils/cli.js --port 7000 --config ./mcp-servers.json
```

---

## Configuration Best Practices

### Recommended Tool Filtering Setup

For most use cases, start with filtering **disabled**:
```json
{
  "toolFiltering": {
    "enabled": false
  }
}
```

Enable only when you have 100+ tools and need to reduce token usage.

### Environment Variables for ANSI-prone Servers

Always add these for binary MCP servers:
```json
"env": {
  "NO_COLOR": "1",
  "CLICOLOR": "0",
  "CLICOLOR_FORCE": "0"
}
```

### Restart After Configuration Changes

Always restart MCP Hub after editing `mcp-servers.json`:
```bash
# Kill existing process
pkill -f "mcp-hub.*--port 7000"

# Restart
cd /home/ob/Development/Tools/mcp-hub
npm start
```

---

## Quick Health Check Commands

```bash
# Overall hub health
curl -s http://localhost:7000/api/health | jq -c '{state, tools: .mcpEndpoint.registeredCapabilities.tools, resources: .mcpEndpoint.registeredCapabilities.resources}'

# Tool filtering status
curl -s http://localhost:7000/api/filtering/stats | jq -c '{enabled, exposedTools, filteredTools}'

# List connected servers
curl -s http://localhost:7000/api/servers | jq '.servers[] | {name, status}'

# Check for errors in log
tail -50 /tmp/mcp-hub.log | grep -i error
```

---

## Common Configuration File Location

- **Config**: `/home/ob/Development/Tools/mcp-hub/mcp-servers.json`
- **Logs**: `/tmp/mcp-hub.log` or `~/.local/state/mcp-hub/logs/mcp-hub.log`
- **Process**: Check with `ps aux | grep mcp-hub`

---

## Resolution Summary (2025-10-30)

Fixed two critical issues:

1. **Tool Filtering**: Disabled filtering that was blocking all 355 tools
2. **ANSI Codes**: Added NO_COLOR environment variables to imagen3 server

Result: Hub now properly exposes 355 tools, 26 resources, 31 prompts. MCP clients can successfully connect via SSE and discover all capabilities.
