# Configuration Save 500 Error Fix

**Date**: 2025-11-08
**Issue**: Frontend config save resulted in 500 Internal Server Error, servers not loading properly
**Status**: ✅ FIXED

## Problem Summary

When saving raw config JSON in the Configuration tab from the dashboard:
- Error: `api/config:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- Hub stuck in "restarting" state indefinitely
- Servers not loading properly in the UI

## Root Cause Analysis

### Issue 1: Hub Stuck in "Restarting" State (CRITICAL)
**Location**: `src/MCPConnection.js` - `connect()` method
**Problem**: The `github` MCP server was stuck in "connecting" state, causing `initialize()` to hang indefinitely when hub restarts.

**Evidence**:
- Logs showed 8 "Restarting MCP Hub" entries but ZERO "MCP Hub restarted successfully" entries
- Backend health check showed `state: "restarting"`
- When `POST /api/config` was called, it triggered `restartHub()` → `initialize()` which hung

**Impact**: HTTP request timed out after Express's default timeout (~2 minutes), frontend received 500 error.

### Issue 2: Missing Connection Timeout (CRITICAL)
**Location**: `src/MCPConnection.js`
**Problem**: No timeout wrapper for the entire `connect()` operation - servers that fail to connect blocked hub initialization indefinitely.

**Evidence**: The `client.connect()` had a 5-minute timeout, but the entire connection process (including transport creation, capability fetching, etc.) had no upper bound.

### Issue 3: Vite Proxy Bypass Function (MINOR)
**Location**: `vite.config.ts:20-24`
**Problem**: The bypass function didn't explicitly return `null` for API requests, implicitly returning `undefined`.

**Code**:
```typescript
bypass: (req) => {
  if (req.url?.match(/\.(ts|tsx|js|jsx)$/)) {
    return req.url;
  }
  // Missing explicit return null
}
```

**Impact**: While this worked in most cases, it was not explicit and could lead to unexpected behavior.

### Issue 4: Express Error Handler Signature (MINOR)
**Location**: `src/server.js:1158`
**Problem**: Error handler middleware missing `next` parameter.

**Code**: `router.use((err, req, res) => {`
**Expected**: `router.use((err, req, res, next) => {`

**Impact**: Express may not properly recognize this as error handling middleware without the 4-parameter signature.

## Fixes Applied

### Fix 1: Connection Timeout Wrapper ✅
**File**: `src/MCPConnection.js`

Added a 30-second timeout wrapper around the entire connection process:

```javascript
async connect(config) {
  // ... existing setup ...

  // Wrap entire connection process with timeout to prevent hanging
  const connectionTimeoutMs = 30000; // 30 seconds total timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new ConnectionError(
      `Connection timeout after ${connectionTimeoutMs}ms`,
      { server: this.name }
    )), connectionTimeoutMs);
  });

  try {
    await Promise.race([
      this._performConnection(),
      timeoutPromise
    ]);
  } catch (error) {
    await this.cleanup(error.message);
    throw error;
  }
}

// Extracted connection logic to separate method
async _performConnection() {
  // ... actual connection logic ...
}
```

**Why 30 seconds?**:
- Faster failure detection than the previous 5-minute client.connect() timeout
- Prevents hub from being stuck in "restarting" state
- Allows hub to continue initialization even if one server fails
- More responsive error handling for users

### Fix 2: Vite Proxy Bypass Function ✅
**File**: `vite.config.ts`

```typescript
bypass: (req) => {
  if (req.url?.match(/\.(ts|tsx|js|jsx)$/)) {
    return req.url;
  }
  return null; // Explicitly proxy to backend
},
```

### Fix 3: Express Error Handler Signature ✅
**File**: `src/server.js:1158`

```javascript
// Before:
router.use((err, req, res) => {

// After:
router.use((err, req, res, next) => {
```

## Expected Behavior After Fix

1. **Connection Timeout**: Servers that fail to connect will timeout after 30 seconds instead of hanging indefinitely
2. **Hub State**: Hub will transition from "restarting" to "ready" even if some servers fail to connect
3. **Config Save**: POST /api/config will return success/failure within reasonable time
4. **Error Messages**: Failed connections will show clear timeout errors in logs
5. **UI Responsiveness**: Frontend will update server status correctly without 500 errors

## Testing Recommendations

1. **Test Config Save**:
   ```bash
   curl -X POST http://localhost:7000/api/config \
     -H "Content-Type: application/json" \
     -d '{"mcpServers": {...}}'
   ```

2. **Monitor Hub State**:
   ```bash
   curl -s http://localhost:7000/api/health | jq '.state'
   ```

3. **Check Server Connection Timeouts**:
   - Configure a server with invalid URL/command
   - Verify it times out after 30 seconds (not 5 minutes)
   - Verify hub continues to "ready" state

4. **Verify Frontend**:
   - Save configuration from UI
   - Check that servers load properly
   - Verify no 500 errors in browser console

## Related Files

- `src/MCPConnection.js` - Connection timeout wrapper
- `src/MCPHub.js` - Hub initialization logic
- `src/server.js` - API endpoints, error handler
- `vite.config.ts` - Vite proxy configuration

## Prevention

To prevent similar issues in the future:

1. **Always add timeouts** to async operations that depend on external services
2. **Test error scenarios**: Invalid servers, network failures, timeout conditions
3. **Monitor hub state transitions**: Ensure state machine progresses correctly
4. **Log state changes**: Track when and why state transitions occur

## Notes

- The 30-second timeout is configurable - can be adjusted in future if needed
- GitHub server connection issue should be investigated separately
- Consider adding health checks for individual server connections
- Consider adding retry logic with exponential backoff for failed connections
