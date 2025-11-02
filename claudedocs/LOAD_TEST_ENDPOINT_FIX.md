# Load Test Endpoint Fix - MCP Hub SSE Transport

**Date**: 2025-11-02
**Issue**: Load tests failing with 100% error rate
**Status**: ✅ **ROOT CAUSE IDENTIFIED**

## Problem Summary

Load tests were sending HTTP POST requests to `/mcp` endpoint:
```bash
POST /mcp
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

**Result**: HTTP 404 - "Cannot POST /mcp"

## Root Cause Analysis

**Symptom**: 100% failure rate on `/mcp` endpoint (9,112 failed requests)

**Investigation**:
1. ✅ Verified MCP Hub running (PID 446703, port 7000)
2. ✅ `/api/health` endpoint works perfectly (100% success)
3. ❌ `POST /mcp` returns 404 error
4. ✅ Discovered actual endpoint structure

**Root Cause**: **MCP Hub uses SSE (Server-Sent Events) transport, not direct HTTP POST**

The correct endpoint structure is:
- **`GET /mcp`** → Establishes SSE connection, returns sessionId
- **`POST /messages?sessionId=xxx`** → Send JSONRPC messages

From `src/mcp/server.js:23`:
```javascript
{
  "Hub": {
    "url": "http://localhost:${port}/mcp"  // SSE endpoint, NOT HTTP POST
  }
}
```

From `src/server.js`:
```javascript
app.get("/mcp", async (req, res) => {
  await mcpServerEndpoint.handleSSEConnection(req, res);  // SSE connection
});

app.post("/messages", async (req, res) => {
  await mcpServerEndpoint.handleMCPMessage(req, res);     // JSONRPC messages
});
```

## MCP Hub Endpoint Structure

### Management API (HTTP REST)
- `GET /api/health` → Health check ✅
- `GET /api/servers` → List all MCP servers
- `GET /api/filtering/stats` → Tool filtering statistics
- `GET /api/marketplace` → Marketplace catalog

### MCP Server Interface (SSE Transport)
- `GET /mcp` → Establish SSE connection (returns sessionId)
- `POST /messages?sessionId=xxx` → Send JSONRPC messages

### Event Streaming
- `GET /api/events` → Server-Sent Events stream

## Solution Options

### Option 1: Test Management API Instead (Recommended)
Load test the HTTP REST API endpoints that don't require SSE:

**Pros**:
- Simple HTTP requests (no SSE complexity)
- Tests actual production API usage
- Validates server performance under load

**Cons**:
- Doesn't test MCP protocol directly
- Different code paths than MCP clients use

**Implementation**:
```javascript
// Test /api/servers endpoint
const response = http.get(`${BASE_URL}/api/servers`);
check(response, {
  'servers status is 200': (r) => r.status === 200,
  'servers has array': (r) => {
    const body = JSON.parse(r.body);
    return Array.isArray(body);
  }
});
```

### Option 2: Implement SSE Flow in k6 (Advanced)
Use k6's WebSocket/SSE capabilities to properly establish MCP connection:

**Pros**:
- Tests actual MCP protocol flow
- Most realistic load testing scenario
- Validates SSE transport performance

**Cons**:
- Complex implementation
- k6 SSE support requires additional setup
- May not accurately simulate multiple independent clients

**Implementation** (requires k6-sse extension):
```javascript
import { check } from 'k6';
import http from 'k6/http';
import { EventSource } from 'k6/experimental/sse';

export default function() {
  // Step 1: Establish SSE connection
  const sseUrl = `${BASE_URL}/mcp`;
  const eventSource = new EventSource(sseUrl);

  let sessionId;
  eventSource.addEventListener('endpoint', (event) => {
    const data = JSON.parse(event.data);
    sessionId = data.sessionId;
  });

  // Wait for sessionId
  eventSource.addEventListener('open', () => {
    // Step 2: Send JSONRPC message
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    const response = http.post(
      `${BASE_URL}/messages?sessionId=${sessionId}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(response, {
      'tools/list status is 200': (r) => r.status === 200,
    });
  });

  eventSource.close();
}
```

### Option 3: Create Simplified HTTP Endpoint for Testing
Add a test-only HTTP endpoint that bypasses SSE for load testing:

**Pros**:
- Simple load testing
- Minimal test changes

**Cons**:
- Requires code changes to MCP Hub
- Test-only endpoint not used in production
- May mask real SSE performance issues

## Recommended Solution

**Use Option 1**: Test the Management API endpoints instead.

**Rationale**:
1. ✅ Simple HTTP requests (no SSE complexity)
2. ✅ Tests actual production API usage patterns
3. ✅ Validates server performance characteristics
4. ✅ Easier to establish baseline metrics
5. ✅ No code changes to MCP Hub required

**Updated Test Targets**:
- `/api/servers` → List all MCP servers and their status
- `/api/filtering/stats` → Tool filtering statistics (if enabled)
- `/api/health` → Health check (already working)
- `/api/events` → SSE event stream (optional)

## Files to Update

### 1. `tests/load/basic-mcp-endpoint.js`
**Change**: Replace `/mcp` POST with `/api/servers` GET
```javascript
// OLD (broken):
function testToolsList() {
  const url = `${BASE_URL}/mcp`;
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  });
  const response = http.post(url, payload, params);
  // ...
}

// NEW (working):
function testServersList() {
  const url = `${BASE_URL}/api/servers`;
  const response = http.get(url);

  const success = check(response, {
    'servers status is 200': (r) => r.status === 200,
    'servers is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'servers response time < 500ms': () => duration < 500
  });

  return response;
}
```

### 2. `tests/load/stress-test.js`
**Change**: Same as above

### 3. `tests/load/spike-test-llm.js`
**Change**: Keep as-is if testing LLM categorization, otherwise update

### 4. `tests/load/baseline-metrics.json`
**Change**: Update endpoint targets
```json
{
  "endpoints": {
    "/api/servers": {
      "baseline": {
        "p50_ms": 30,
        "p95_ms": 150,
        "p99_ms": 300,
        "max_acceptable_ms": 500
      }
    },
    "/api/health": {
      // ... existing
    }
  }
}
```

## Next Steps

1. **Update Load Test Scripts**: Modify all three test scripts to use `/api/servers`
2. **Re-run Load Tests**: Execute full 8-minute test suite
3. **Collect Baseline Metrics**: Document actual performance vs targets
4. **Update Documentation**: Revise guides with correct endpoint information

## Lessons Learned

### API Discovery Best Practices
1. **Read Source Code First**: Check actual Express routes before testing
2. **Understand Transport Type**: SSE vs HTTP vs WebSocket
3. **Test Manually**: Verify endpoints with curl before load testing
4. **Document Accurately**: CLAUDE.md should specify exact endpoint paths

### MCP Protocol Understanding
1. **SSE Transport**: MCP servers can use Server-Sent Events (not just HTTP)
2. **Session Management**: SSE requires sessionId for message routing
3. **Connection Lifecycle**: GET establishes connection, POST sends messages

---

**Resolution Timeline**:
- **02:40 UTC**: Load test executed, 100% failure
- **02:53 UTC**: Root cause analysis (endpoint discovery)
- **02:54 UTC**: Solution options evaluated
- **02:55 UTC**: Recommendation: Test Management API instead

**Total Analysis Time**: ~15 minutes

## Status

❌ **ISSUE IDENTIFIED** - Awaiting fix implementation

**Next Action**: Update load test scripts to use correct endpoints
