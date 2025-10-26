# Vercel MCP Setup

Based on the Vercel documentation, Vercel MCP uses OAuth with **localhost-only redirect URLs**. This means it cannot work through MCP Hub's OAuth callback system.

## Direct Setup (Recommended)

Add Vercel MCP directly to your Cursor configuration:

### Step 1: Add to `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

### Step 2: Restart Cursor

The browser will open automatically for OAuth authorization.

### Why This Doesn't Work Through MCP Hub

Vercel's OAuth app is configured with localhost redirect URLs only:
- `http://localhost:50290/callback`
- `http://127.0.0.1:33673/auth/callback`
- `http://localhost:8020`
- etc.

These don't include query parameters (`?server_name=vercel`), so MCP Hub cannot identify which server to authorize when the callback arrives.

**Tunnel services won't work** because:
1. Vercel only accepts registered localhost redirect URIs
2. Your tunnel URL (`https://proud-hoops-see.loca.lt`) is not in the allowed list
3. You cannot add custom redirect URIs to Vercel's OAuth app

## Alternative: Use Vercel API Directly

If you need Vercel functionality through MCP Hub, you could:
1. Create your own MCP server that uses Vercel's REST API with API tokens
2. Use Vercel's API endpoints directly in your tools
3. Set up a local proxy that accepts localhost redirects

## Summary

- **Serena MCP**: ✅ Working through MCP Hub
- **Vercel MCP**: ❌ Cannot work through MCP Hub (OAuth restrictions)
- **Recommendation**: Add Vercel MCP directly to Cursor's `.cursor/mcp.json`
