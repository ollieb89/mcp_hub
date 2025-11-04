# Configuration Guide

## Quick Start

MCP Hub uses a JSON configuration file to define which MCP servers to load and how to connect to them.

### Using the Example Configuration

1. **Copy the example configuration**:
   ```bash
   cp mcp-servers.example.json mcp-servers.json
   ```

2. **Edit paths** to match your local setup:
   - Replace `${HOME}/mcps/` with your actual MCP servers directory
   - Replace `${HOME}/bin/` with your binary installation directory
   - Update `${GOOGLE_CLOUD_PROJECT}` and other placeholders

3. **Set environment variables**:
   Create a `.env` file with your API keys:
   ```bash
   GEMINI_API_KEY=your_gemini_key_here
   GITHUB_TOKEN=your_github_token_here
   GOOGLE_CLOUD_PROJECT=your-gcp-project-id
   # ... add other keys as needed
   ```

4. **Start MCP Hub**:
   ```bash
   bun start
   ```

## Configuration File Location

By default, MCP Hub looks for `mcp-servers.json` in the current directory. You can specify a custom location:

```bash
bun start --config /path/to/your/config.json
```

## Important Notes

⚠️ **Never commit `mcp-servers.json` to version control** - it contains personal paths and configuration.

✅ **Use `mcp-servers.example.json`** as a template for sharing configurations.

✅ **Use environment variables** (`.env` file) for all sensitive data like API keys.

## Environment Variable Syntax

The configuration supports several placeholder syntaxes:

- `${VARIABLE_NAME}` - Environment variable
- `${env:VARIABLE_NAME}` - Explicit environment variable
- `${HOME}` - User home directory
- `${workspaceFolder}` - Current working directory (VS Code compatible)
- `${cmd: command args}` - Execute command and use output

Example:
```json
{
  "command": "node",
  "args": ["${HOME}/mcps/server/index.js"],
  "env": {
    "API_KEY": "${GEMINI_API_KEY}"
  }
}
```

## See Also

- [MCP Server Setup Guide](./docs/MCP_README.md)
- [External Services Setup](./docs/EXTERNAL_SERVICES_SETUP.md)
- [Main README](../README.md)
