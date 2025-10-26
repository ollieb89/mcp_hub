# MCP Hub Usage Guide

## Environment Variables Setup

MCP Hub now **automatically loads** environment variables from a `.env` file in your project directory when you start the server.

### Creating Your `.env` File

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual credentials:
   ```bash
   # MCP Hub Environment Variables
   GITHUB_TOKEN=ghp_your_github_personal_access_token
   MCP_HUB_PUBLIC_URL=https://your-public-domain.com
   GOOGLE_API_KEY=your_google_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

### Automatic Loading

When you run `npm start`, MCP Hub will:
- Automatically detect and load the `.env` file from the project directory
- Make all variables available to all MCP servers
- Variables are loaded before server configuration
- Existing environment variables take precedence over `.env` file values

### Starting MCP Hub

Simply run:
```bash
npm start
```

The `.env` file will be automatically loaded. No manual sourcing required!

### Environment Variables Overview

- **`GITHUB_TOKEN`**: GitHub Personal Access Token for shadcn-ui server (removes rate limits)
- **`MCP_HUB_PUBLIC_URL`**: Public URL for OAuth callbacks in remote servers
- **`GOOGLE_API_KEY`**: Google API key for Gemini MCP server
- **`ANTHROPIC_API_KEY`**: Anthropic API key for Claude services

### Server Configuration

Your MCP servers can now reference these variables in `mcp-servers.json`:

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@jpisnice/shadcn-ui-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

The `${GITHUB_TOKEN}` placeholder will automatically resolve from your `.env` file.

## Current MCP Servers

Your setup includes:

1. **Serena** - Semantic coding tools (27 tools)
2. **Shadcn UI** - React component management (7 tools)
3. **Gemini** - Google Gemini analysis (6 tools)
4. **Vercel** - Disabled (OAuth limitations)

All servers are accessible through MCP Hub at `http://localhost:7000`.
