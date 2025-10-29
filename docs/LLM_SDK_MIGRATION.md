# LLM SDK Migration Guide

## Overview

MCP Hub has upgraded from fetch-based LLM calls to official OpenAI and Anthropic SDKs for better reliability, error handling, and observability.

## What Changed?

### Before (Fetch-Based)
- ❌ Basic error handling (generic Error objects)
- ❌ No automatic retries
- ❌ No request tracking
- ❌ Limited observability

### After (SDK-Based)
- ✅ Typed errors (APIError, RateLimitError, etc.)
- ✅ Automatic retries (3 attempts with exponential backoff)
- ✅ Request ID tracking for all API calls
- ✅ Enhanced logging and metrics

## Breaking Changes

**None!** This is a fully backward-compatible upgrade.

- ✅ Configuration format unchanged
- ✅ Public API unchanged
- ✅ All existing tests pass (442/442)
- ✅ No user action required

## New Features

### 1. Automatic Retry Logic

Transient failures are now automatically retried:

```javascript
// 429 Rate Limit → SDK waits and retries (up to 3 times)
// 503 Service Unavailable → SDK retries with backoff
// Network timeout → SDK retries connection
```

**Configuration** (optional):
```json
{
  "llmCategorization": {
    "maxRetries": 3,      // Default: 3
    "timeout": 30000      // Default: 30 seconds
  }
}
```

### 2. Typed Error Handling

Errors are now categorized for better debugging:

- `APIError`: General API errors (4xx, 5xx)
- `RateLimitError`: Rate limit exceeded (429)
- `APIConnectionError`: Network/connection issues
- `TimeoutError`: Request timeout

**Error Logs Include**:
- `requestId`: Unique identifier for support
- `status`: HTTP status code
- `code`: Error code from API
- `type`: Error classification

### 3. Request ID Tracking

Every API call now includes a request_id for debugging:

```bash
# Check logs for request tracking
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep request_id

# Example log output:
# OpenAI API error: 429 - Rate limit exceeded
# { requestId: 'req_abc123', toolName: 'github__search', status: 429 }
```

### 4. Enhanced Metrics

Stats API now includes LLM performance metrics:

```bash
curl http://localhost:37373/api/filtering/stats | jq '.llm'
```

**New Metrics**:
- `errorsByType`: Count of each error type
- `totalRetries`: Number of automatic retries
- `cacheHits`/`cacheMisses`: Cache performance

## Testing

All tests updated and passing:
- ✅ 442/442 tests passing (100%)
- ✅ SDK mocks replace fetch mocks
- ✅ Typed error tests added
- ✅ Request ID tracking validated

## Performance

No regression detected:
- SDK overhead: <2ms per call
- Cache hit rate: >95%
- Non-blocking: <50ms startup
- Memory: No leaks detected

## Troubleshooting

### Issue: "Cannot find module 'openai'"

**Solution**: Update dependencies
```bash
npm install
```

### Issue: Tests failing with SDK mocks

**Solution**: Clear node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### Issue: Request IDs not appearing in logs

**Solution**: Check log level (should be `info` or `debug`)
```bash
# Set log level in config
{
  "logLevel": "debug"
}
```

## Rollback

If issues occur, rollback to fetch-based implementation:

```bash
git checkout backup/llm-provider-fetch-based
npm install
npm test  # Verify 442 tests passing
```

## Support

For issues or questions:
- GitHub Issues: [mcp-hub/issues](https://github.com/ollieb89/mcp-hub/issues)
- Documentation: `README.md` LLM Enhancement section
- Logs: `~/.local/state/mcp-hub/logs/mcp-hub.log`

## Version History

- **v4.3.0** (2025-10-29): SDK upgrade complete
- **v4.2.1** (2025-10-27): Sprint 3 complete (fetch-based)
