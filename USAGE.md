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

## Tool Filtering & LLM Categorization

MCP Hub can automatically filter and categorize tools using pattern matching and LLM analysis. This reduces token usage by exposing only relevant tools to AI models.

### Quick Start: Enable Tool Filtering

1. **Minimal config** (pattern-based only):
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

2. **With LLM enhancement** (requires API key):
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

### LLM Queue Reliability Configuration

For production use with LLM categorization, configure retry and circuit breaker settings:

**Conservative approach** (fewer API calls, more fallback):
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": true,
      "provider": "openai",
      "apiKey": "${env:OPENAI_API_KEY}",
      "retryCount": 2,
      "backoffBase": 500,
      "maxBackoff": 15000,
      "circuitBreakerThreshold": 3,
      "circuitBreakerTimeout": 20000
    }
  }
}
```

**Aggressive approach** (more retries, higher reliability):
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": true,
      "provider": "anthropic",
      "apiKey": "${env:ANTHROPIC_API_KEY}",
      "retryCount": 5,
      "backoffBase": 2000,
      "maxBackoff": 60000,
      "circuitBreakerThreshold": 10,
      "circuitBreakerTimeout": 60000
    }
  }
}
```

**Balanced approach** (recommended defaults):
```json
{
  "toolFiltering": {
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${env:GOOGLE_API_KEY}",
      "retryCount": 3,
      "backoffBase": 1000,
      "maxBackoff": 30000,
      "circuitBreakerThreshold": 5,
      "circuitBreakerTimeout": 30000
    }
  }
}
```

### Configuration Parameters Explained

| Parameter | Default | Min | Max | Purpose |
|-----------|---------|-----|-----|---------|
| `retryCount` | 3 | 0 | 10 | Retry attempts on transient errors (timeout, 429, 503) |
| `backoffBase` | 1000 | 100 | 10,000 | Initial backoff delay in milliseconds |
| `maxBackoff` | 30,000 | 1,000 | 120,000 | Maximum backoff delay in milliseconds |
| `circuitBreakerThreshold` | 5 | 1 | 100 | Consecutive failures before circuit opens |
| `circuitBreakerTimeout` | 30,000 | 1,000 | 600,000 | Wait time before retrying when circuit is open |

### Monitoring Queue Health

Check filtering and LLM queue statistics:

```bash
# Get all filtering stats
curl http://localhost:3000/api/filtering/stats | jq

# Get just LLM queue metrics
curl http://localhost:3000/api/filtering/stats | jq '.llm'
```

**Key metrics:**
- `successRate`: Percentage of successful LLM calls (0.967 = 96.7%)
- `circuitBreakerState`: `closed` (normal), `open` (failing), `half-open` (recovering)
- `p95Latency`: 95th percentile response time in milliseconds
- `totalRetries`: Number of API calls requiring retry
- `fallbacksUsed`: Times heuristic fallback was invoked

### Troubleshooting

**Issue: LLM categorization too slow**
- Increase `backoffBase` to reduce retry wait time
- Reduce `retryCount` for faster failure
- Check `p99Latency` in stats - if >3s, consider circuit breaker tuning

**Issue: Circuit breaker frequently opens**
- Check API quota and rate limits
- Increase `circuitBreakerThreshold` to allow more failures before opening
- Increase `circuitBreakerTimeout` to give API more recovery time

**Issue: Too many API calls despite filtering**
- Reduce tool exposure with stricter `categoryFilter`
- Enable LLM caching by using longer session lifetimes
- Check `fallbacksUsed` - if high, circuit breaker is activating

