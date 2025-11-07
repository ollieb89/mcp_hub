# Testing and Debugging Guide: `hub__analyze_prompt` Feature

## Table of Contents
1. [Overview](#overview)
2. [Automated Testing](#automated-testing)
3. [Manual Testing Guide](#manual-testing-guide)
4. [Debug Logging](#debug-logging)
5. [Web UI Integration](#web-ui-integration)
6. [Test Scenarios](#test-scenarios)
7. [Validation Commands](#validation-commands)
8. [Validation Checklist](#validation-checklist)
9. [Troubleshooting](#troubleshooting)
10. [CI/CD Integration](#cicd-integration)

---

## Overview

### Purpose

This guide provides comprehensive testing procedures for the `hub__analyze_prompt` meta-tool and prompt-based tool filtering system. The feature enables intelligent, LLM-driven tool exposure based on user intent analysis.

### Test Coverage Goals

- **Functional Coverage**: 100% of analyze_prompt workflow
- **Integration Coverage**: All 3 critical bug fixes validated
- **Scenario Coverage**: 10+ real-world usage scenarios
- **Performance Coverage**: LLM response time, tool exposure latency
- **Error Coverage**: All error paths and edge cases

### Testing Tools

| Tool | Purpose | Location |
|------|---------|----------|
| **Vitest** | Unit and integration tests | `bun test` |
| **Validation Script** | End-to-end testing | `scripts/test-analyze-prompt.sh` |
| **curl** | Manual API testing | Command line |
| **Load Testing** | Performance validation | `bun run test:load` |

---

## Automated Testing

### Running the Test Suite

#### Complete Test Suite
```bash
# Run all analyze_prompt tests
bun test tests/prompt-based-filtering.test.js

# Expected output:
# ✓ tests/prompt-based-filtering.test.js (23) 142ms
#   ✓ Meta-tool Registration (2)
#   ✓ Session Initialization (3)
#   ✓ Tool Exposure Filtering (6)
#   ✓ Session Isolation (3)
#   ✓ LLM Analysis Workflow (6)
#   ✓ Backward Compatibility (3)
```

#### Watch Mode (Development)
```bash
# Auto-rerun tests on file changes
bun test --watch tests/prompt-based-filtering.test.js
```

#### Coverage Report
```bash
# Generate coverage report
bun run test:coverage

# View HTML report
bun run test:coverage:ui
```

### Test Categories Explained

#### 1. Meta-tool Registration (2 tests)
**Purpose**: Verify `hub__analyze_prompt` is properly exposed

**Tests**:
- Meta-tool exists in initial tool list
- Meta-tool has correct schema and parameters

**Critical**: Must pass for feature to function

#### 2. Session Initialization (3 tests)
**Purpose**: Verify session-level state management

**Tests**:
- Each session starts with empty exposedCategories
- Session IDs are unique and properly tracked
- Session state persists across tool calls

**Critical**: Required for per-client isolation

#### 3. Tool Exposure Filtering (6 tests)
**Purpose**: Verify tools/list filtering works correctly

**Tests**:
- Zero-default exposure (no categories = no tools)
- Single category exposure
- Multi-category exposure
- Meta-tools always available
- Category inference from tool names
- Filtering respects session categories

**Critical**: Core filtering functionality

#### 4. Session Isolation (3 tests)
**Purpose**: Verify per-client independence

**Tests**:
- Client A exposure doesn't affect Client B
- Session categories are truly session-scoped
- Concurrent sessions maintain independence

**Critical**: Multi-client support

#### 5. LLM Analysis Workflow (6 tests)
**Purpose**: Verify end-to-end analyze_prompt flow

**Tests**:
- Prompt analysis returns categories
- Categories are added to session state
- tools/list_changed notification sent
- Subsequent tools/list returns filtered tools
- Multiple analyze_prompt calls work (additive)
- Low confidence prompts handled gracefully

**Critical**: Complete workflow validation

#### 6. Backward Compatibility (3 tests)
**Purpose**: Verify feature can be disabled

**Tests**:
- Disabled mode exposes all tools
- Static mode works as before
- Configuration changes respected

**Critical**: Safe rollback capability

### Expected Test Output

#### Success Output
```
✓ tests/prompt-based-filtering.test.js (23) 142ms
  ✓ Meta-tool Registration (2)
  ✓ Session Initialization (3)
  ✓ Tool Exposure Filtering (6)
  ✓ Session Isolation (3)
  ✓ LLM Analysis Workflow (6)
  ✓ Backward Compatibility (3)

Test Files  1 passed (1)
Tests  23 passed (23)
Duration  142ms
```

#### Failure Output Example
```
✗ tests/prompt-based-filtering.test.js > Tool Exposure Filtering > should filter tools by session categories
  AssertionError: expected 0 to equal 1

  Expected: 1
  Received: 0

  at tests/prompt-based-filtering.test.js:125:35
```

### Coverage Report Interpretation

**Target Thresholds**:
- **Branches**: ≥80% (currently 82.94%)
- **Lines**: ≥80%
- **Functions**: ≥80%
- **Statements**: ≥80%

**Coverage Gaps**: Acceptable for error paths and edge cases that are difficult to trigger in tests.

### Using the Validation Script

The validation script (`scripts/test-analyze-prompt.sh`) provides end-to-end testing with a real MCP Hub instance.

#### Basic Usage
```bash
# Default test with standard prompt
./scripts/test-analyze-prompt.sh

# Custom prompt
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# Verbose mode (detailed logging)
./scripts/test-analyze-prompt.sh --verbose "Read config.json"

# CI mode (JSON output)
./scripts/test-analyze-prompt.sh --ci "Create a new file"
```

#### Interactive Test Output
```
==========================================
  hub__analyze_prompt Test Script
==========================================

[INFO] Checking if MCP Hub is running...
[SUCCESS] MCP Hub is running
[SUCCESS] Prompt-based filtering enabled
[SUCCESS] LLM provider: gemini

[INFO] Starting test workflow...
[SUCCESS] SSE connection established (PID: 12345)
[SUCCESS] Initial tool count: 1

[INFO] Calling hub__analyze_prompt with prompt:
  "Check my GitHub notifications"
[SUCCESS] Analysis completed in 1234ms

Analysis Results:
  Categories: github
  Confidence: 0.98
  Reasoning: User wants to check GitHub notifications

[SUCCESS] Updated tool count: 25
✓ github tools exposed

==========================================
  Test Summary
==========================================
Total Tests:   10
Passed:       10
Failed:        0
Success Rate: 100.0%
==========================================
[SUCCESS] ALL TESTS PASSED (10/10)
==========================================
```

#### CI/CD Mode Output
```json
{
  "total": 10,
  "passed": 10,
  "failed": 0,
  "success_rate": 100.00,
  "exit_code": 0
}
```

---

## Manual Testing Guide

### Prerequisites
```bash
# 1. Ensure MCP Hub is configured with prompt-based filtering
# Edit mcp-servers.json to enable prompt-based mode:
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

# 2. Set environment variable
export GEMINI_API_KEY="your-api-key-here"

# 3. Start MCP Hub with debug logging
DEBUG_TOOL_FILTERING=true bun start
```

### Manual Test Flow (Using Claude Desktop)

**Test 1: Basic Prompt Analysis**
```
1. Connect Claude Desktop to MCP Hub
   - Configure in ~/Library/Application Support/Claude/claude_desktop_config.json:
   {
     "mcpServers": {
       "hub": {
         "url": "http://localhost:7000/mcp"
       }
     }
   }

2. Check initial tool exposure
   - Ask: "What tools are available?"
   - Expected: Only meta-tools (hub__analyze_prompt)

3. Trigger prompt analysis
   - Say: "Check my GitHub notifications"
   - Expected workflow:
     a. Claude calls hub__analyze_prompt with prompt
     b. LLM analyzes → identifies "github" category
     c. Hub exposes github tools
     d. Hub sends tools/list_changed notification
     e. Claude re-fetches tool list
     f. Claude proceeds with github__* tools

4. Verify tool exposure
   - Ask: "What tools are available now?"
   - Expected: github__* tools + meta-tools
```

**Test 2: Multiple Category Exposure**
```
1. Start fresh session (restart Claude Desktop)

2. Complex request spanning categories
   - Say: "Read the file config.json and commit it to GitHub"
   - Expected categories: ["filesystem", "github"]

3. Verify both categories exposed
   - Ask: "List all available tools"
   - Expected: filesystem__* + github__* + meta-tools
```

**Test 3: Session Isolation**
```
1. Open two Claude Desktop windows (two separate sessions)

2. In Window 1:
   - Say: "List my Docker containers"
   - Verify: docker__* tools exposed in this session only

3. In Window 2:
   - Say: "What tools are available?"
   - Verify: Only meta-tools (session isolation working)
```

### Manual Test Flow (Using curl)

**Direct MCP Protocol Testing**
```bash
# 1. Establish SSE connection
curl -N http://localhost:7000/mcp

# 2. Extract sessionId from response headers

# 3. Call hub__analyze_prompt
curl -X POST "http://localhost:7000/mcp/messages?sessionId=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "hub__analyze_prompt",
      "arguments": {
        "prompt": "Check my GitHub notifications",
        "context": "User wants to see recent activity"
      }
    }
  }'

# Expected response:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"categories\":[\"github\"],\"confidence\":0.98,\"reasoning\":\"User wants to check GitHub notifications\",\"message\":\"Updated tool exposure: github\",\"nextStep\":\"Tools list has been updated. Please proceed with your request using the newly available tools.\"}"
    }]
  }
}

# 4. Verify tools/list_changed notification sent (check SSE stream)

# 5. List tools to verify exposure
curl -X POST "http://localhost:7000/mcp/messages?sessionId=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Expected: github__* tools + hub__analyze_prompt
```

---

## Debug Logging

### Log Levels and Points

**Configuration: Enable debug logging**
```bash
# Environment variable
DEBUG_TOOL_FILTERING=true bun start

# Or in code (src/utils/logger.js)
logger.setLogLevel('debug');
```

### Critical Log Points

**1. Meta-Tool Registration (src/mcp/server.js:182-189)**
```javascript
// CHECKPOINT 1: Meta-tool registration
logger.info(`Registering meta-tools for prompt-based filtering (mode: ${this.filteringMode}, enableMetaTools: ${this.promptBasedConfig.enableMetaTools})`);
// ✓ Verify: "Registered 1 meta-tools" appears in logs
```

**2. Session Initialization (src/mcp/server.js:206-238)**
```javascript
// CHECKPOINT 2: Client session setup
logger.debug(`Initialized client session ${sessionId} with categories: ${initialCategories.join(', ')}`);
// ✓ Verify: "meta" category in initial exposure
```

**3. Prompt Analysis Entry (src/mcp/server.js:434-448)**
```javascript
// CHECKPOINT 3: Meta-tool invocation
logger.info(`hub__analyze_prompt called for session ${sessionId} with prompt: "${prompt.substring(0, 50)}..."`);
// ✓ Verify: Prompt received correctly
```

**4. LLM Provider Call (src/utils/llm-provider.js:280-320)**
```javascript
// CHECKPOINT 4: LLM categorization
logger.debug(`Calling Gemini API to categorize prompt: ${prompt.substring(0, 30)}...`);
// ✓ Verify: API call successful, no rate limits
```

**5. Category Analysis (src/mcp/server.js:450-486)**
```javascript
// CHECKPOINT 5: LLM response parsing
logger.debug(`LLM analysis result: ${JSON.stringify(analysis)}`);
// ✓ Verify: Valid categories returned
```

**6. Tool Exposure Update (src/mcp/server.js:290-317)**
```javascript
// CHECKPOINT 6: Category exposure
logger.info(`Updated client ${sessionId} tool exposure: ${Array.from(session.exposedCategories).join(', ')}`);
// ✓ Verify: Categories added to session
```

**7. Notification Broadcast (src/mcp/server.js:308-316)**
```javascript
// CHECKPOINT 7: Client notification
logger.debug(`Sent tools/list_changed notification to client ${sessionId}`);
// ✓ Verify: MCP notification sent successfully
```

### Recommended Log Format

**Add structured logging to meta-tool handler:**
```javascript
// src/mcp/server.js:434
async handleAnalyzePrompt(args, sessionId) {
  const startTime = Date.now();

  logger.info('ANALYZE_PROMPT_START', {
    sessionId,
    promptLength: args.prompt?.length,
    hasContext: !!args.context
  });

  try {
    // ... existing code ...

    logger.info('ANALYZE_PROMPT_SUCCESS', {
      sessionId,
      categories: analysis.categories,
      confidence: analysis.confidence,
      duration: Date.now() - startTime
    });

    return result;
  } catch (error) {
    logger.error('ANALYZE_PROMPT_ERROR', {
      sessionId,
      error: error.message,
      duration: Date.now() - startTime
    });
    throw error;
  }
}
```

### Log Monitoring Commands

**Real-time log streaming:**
```bash
# Follow all logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log

# Filter for prompt analysis
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i "analyze_prompt\|meta-tool\|tool exposure"

# Monitor LLM calls
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i "gemini\|llm\|categorize"

# Track session lifecycle
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i "session\|client"
```

---

## Web UI Integration

### Proposed UI Enhancements

**Location:** `/home/ob/Development/Tools/mcp-hub/public/index.html` (served via bundle.js)

### UI Component 1: Prompt Analysis Tester

**Add to Web UI Dashboard:**
```tsx
// src/ui/components/PromptAnalysisTester.tsx
interface PromptAnalysisTesterProps {
  hubUrl: string;
}

export const PromptAnalysisTester: React.FC<PromptAnalysisTesterProps> = ({ hubUrl }) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testPromptAnalysis = async () => {
    setLoading(true);
    try {
      // Call hub__analyze_prompt via REST API
      const response = await fetch(`${hubUrl}/api/test-prompt-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prompt-tester">
      <h3>Test Prompt Analysis</h3>
      <textarea
        placeholder="Enter user prompt..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
      />
      <textarea
        placeholder="Optional context..."
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={2}
      />
      <button onClick={testPromptAnalysis} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Prompt'}
      </button>

      {result && (
        <div className="result">
          <h4>Analysis Result</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

### UI Component 2: Session Tool Exposure Viewer

**Real-time tool exposure monitoring:**
```tsx
// src/ui/components/SessionToolExposure.tsx
export const SessionToolExposure: React.FC = () => {
  const [sessions, setSessions] = useState<Map<string, SessionData>>(new Map());

  useEffect(() => {
    // Subscribe to SSE events for session updates
    const eventSource = new EventSource('http://localhost:7000/events');

    eventSource.addEventListener('session_updated', (event) => {
      const data = JSON.parse(event.data);
      setSessions(prev => new Map(prev).set(data.sessionId, data));
    });

    return () => eventSource.close();
  }, []);

  return (
    <div className="session-exposure">
      <h3>Active Sessions - Tool Exposure</h3>
      {Array.from(sessions).map(([sessionId, session]) => (
        <div key={sessionId} className="session-card">
          <div className="session-id">Session: {sessionId.substring(0, 8)}...</div>
          <div className="exposed-categories">
            Categories: {Array.from(session.exposedCategories).join(', ')}
          </div>
          <div className="tool-count">
            Tools: {session.exposedTools.size}
          </div>
          <button onClick={() => resetSession(sessionId)}>Reset</button>
        </div>
      ))}
    </div>
  );
};
```

### REST API Endpoints for UI

**Add to src/server.js:**
```javascript
// Test endpoint for prompt analysis (development only)
router.post('/api/test-prompt-analysis', async (req, res) => {
  const { prompt, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    // Create temporary session for testing
    const testSessionId = `test-${Date.now()}`;
    endpoint.initializeClientSession(testSessionId);

    // Call analyze_prompt handler
    const result = await endpoint.handleAnalyzePrompt(
      { prompt, context },
      testSessionId
    );

    // Get updated tool exposure
    const session = endpoint.clientSessions.get(testSessionId);

    res.json({
      analysis: JSON.parse(result.content[0].text),
      exposedCategories: Array.from(session.exposedCategories),
      toolCount: session.exposedTools.size
    });

    // Cleanup
    endpoint.cleanupClientSession(testSessionId);
  } catch (error) {
    logger.error('Test prompt analysis failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all active sessions and their tool exposure
router.get('/api/sessions', (req, res) => {
  const sessions = Array.from(endpoint.clientSessions.entries()).map(([sessionId, session]) => ({
    sessionId,
    exposedCategories: Array.from(session.exposedCategories),
    toolCount: session.exposedTools.size,
    createdAt: session.createdAt
  }));

  res.json({ sessions });
});
```

---

## Test Scenarios

### Happy Path Scenarios

#### Scenario 1: GitHub Operations
**Input:** "Check my GitHub notifications and create a PR"
**Expected Categories:** `["github"]`
**Expected Tools:** `github__*` tools exposed
**Validation:**
- ✓ LLM analyzes intent correctly
- ✓ Tools list updated within 2 seconds
- ✓ Client receives tools/list_changed notification
- ✓ Subsequent operations use github tools

#### Scenario 2: File + Git Workflow
**Input:** "Read config.json and commit it to the repository"
**Expected Categories:** `["filesystem", "git"]`
**Expected Tools:** `filesystem__*` + `git__*` tools
**Validation:**
- ✓ Multiple categories identified
- ✓ Both category tools exposed
- ✓ Session maintains both categories

#### Scenario 3: Web Research
**Input:** "Search for the latest TypeScript documentation"
**Expected Categories:** `["web"]`
**Expected Tools:** `web__*` tools (playwright, fetch)
**Validation:**
- ✓ Web category identified
- ✓ Browser/fetch tools available
- ✓ Meta-tools remain available

### Edge Cases

#### Edge 1: Ambiguous Request
**Input:** "Help me with data"
**Expected:** `confidence < 0.7`, fallback to minimal categories
**Validation:**
- ✓ LLM returns low confidence
- ✓ System asks for clarification OR
- ✓ Defaults to safe minimal set

#### Edge 2: Invalid Category Response
**Input:** "Do quantum computing analysis"
**Expected:** LLM returns invalid category, system defaults to "other"
**Validation:**
- ✓ Invalid response detected
- ✓ Warning logged
- ✓ Graceful fallback to 'other' category

#### Edge 3: LLM Timeout
**Input:** Any prompt (with network issue)
**Expected:** Timeout after 30s, error response
**Validation:**
- ✓ Request times out cleanly
- ✓ Error returned to client
- ✓ Session remains valid

#### Edge 4: Session Isolation Verification
**Setup:** Two concurrent clients
**Client 1:** "Check GitHub"
**Client 2:** "List Docker containers"
**Validation:**
- ✓ Client 1 sees only github tools
- ✓ Client 2 sees only docker tools
- ✓ No cross-session leakage

### Failure Scenarios

#### Failure 1: Missing API Key
**Setup:** `GEMINI_API_KEY` not set
**Expected:** Error on initialization, filtering disabled
**Validation:**
- ✓ Error logged: "API key required"
- ✓ Meta-tool handler returns error
- ✓ System falls back to static filtering

#### Failure 2: Invalid API Key
**Setup:** Wrong/expired API key
**Expected:** LLM call fails with auth error
**Validation:**
- ✓ 401/403 error from Gemini
- ✓ Error logged with request details
- ✓ Client receives error response

#### Failure 3: Rate Limit Exceeded
**Setup:** Make 100+ rapid requests
**Expected:** Rate limit error, queue backlog
**Validation:**
- ✓ 429 error from LLM provider
- ✓ Queue handles backpressure
- ✓ Retry with backoff

#### Failure 4: Session Not Found
**Input:** Call with invalid sessionId
**Expected:** Error response, no crash
**Validation:**
- ✓ Warning logged
- ✓ Error returned to client
- ✓ Server remains stable

---

## Validation Commands

### System Health Checks

**Check 1: Verify meta-tools registered**
```bash
# Query tool list
curl -X POST "http://localhost:7000/mcp/messages?sessionId=test" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools[] | select(.name | contains("hub__"))'

# Expected output:
{
  "name": "hub__analyze_prompt",
  "description": "Analyze a user prompt to determine which tool categories are needed...",
  "inputSchema": { ... }
}
```

**Check 2: Verify LLM provider initialized**
```bash
# Check logs for initialization
grep -i "llm categorization initialized" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Expected: "LLM categorization initialized: gemini (gemini-2.5-flash)"
```

**Check 3: Test prompt analysis directly**
```bash
# Use validation script
cat > test-analyze-prompt.sh << 'EOF'
#!/bin/bash
SESSION_ID="test-$(date +%s)"

# Establish connection
curl -N http://localhost:7000/mcp &
PID=$!
sleep 2

# Call analyze_prompt
curl -X POST "http://localhost:7000/mcp/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "hub__analyze_prompt",
      "arguments": {
        "prompt": "Check my GitHub notifications"
      }
    }
  }' | jq '.'

kill $PID
EOF

chmod +x test-analyze-prompt.sh
./test-analyze-prompt.sh
```

**Check 4: Monitor session state**
```bash
# Add to src/server.js (debug endpoint)
router.get('/api/debug/sessions', (req, res) => {
  const sessions = Array.from(endpoint.clientSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    exposedCategories: Array.from(session.exposedCategories),
    exposedTools: session.exposedTools.size,
    promptHistory: session.promptHistory,
    createdAt: session.createdAt
  }));

  res.json({ sessions, total: sessions.length });
});

# Query sessions
curl http://localhost:7000/api/debug/sessions | jq '.'
```

### Performance Validation

**Latency Test:**
```bash
# Measure prompt analysis latency
cat > benchmark-prompt-analysis.sh << 'EOF'
#!/bin/bash
for i in {1..10}; do
  START=$(date +%s%3N)
  curl -s -X POST "http://localhost:7000/api/test-prompt-analysis" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Check GitHub notifications"}' > /dev/null
  END=$(date +%s%3N)
  DURATION=$((END - START))
  echo "Request $i: ${DURATION}ms"
done
EOF

chmod +x benchmark-prompt-analysis.sh
./benchmark-prompt-analysis.sh

# Expected: <2000ms average (LLM call + processing)
```

---

## Validation Checklist

### Pre-Deployment Validation

Use this checklist before deploying the analyze_prompt feature to staging or production:

- [ ] **All automated tests passing**
  - Run: `bun test tests/prompt-based-filtering.test.js`
  - Expected: 23/23 tests passing

- [ ] **Validation script passes**
  - Run: `./scripts/test-analyze-prompt.sh`
  - Expected: 10/10 tests passing, exit code 0

- [ ] **Code coverage meets threshold**
  - Run: `bun run test:coverage`
  - Expected: ≥80% branch coverage (currently 82.94%)

- [ ] **Manual testing successful**
  - Test with curl commands from this guide
  - Verify tool exposure works correctly
  - Test multiple scenarios from Test Scenarios section

- [ ] **Client integration tested**
  - Test with Claude Desktop or equivalent MCP client
  - Verify analyze_prompt workflow end-to-end
  - Confirm additive tool exposure works

- [ ] **Performance benchmarks met**
  - LLM analysis: <2000ms (p95)
  - Tool exposure update: <10ms
  - End-to-end flow: <3000ms

- [ ] **Error handling verified**
  - Test LLM timeout scenario
  - Test invalid JSON response
  - Test LLM provider failure
  - Verify fallback mechanisms work

- [ ] **Session isolation confirmed**
  - Test with 2+ concurrent sessions
  - Verify client A doesn't see client B's tools
  - Confirm per-session category tracking

- [ ] **Backward compatibility validated**
  - Test with prompt-based mode disabled
  - Verify static mode still works
  - Confirm all tools exposed when disabled

- [ ] **Debug logging comprehensive**
  - Verify all 7 log checkpoints present
  - Test log filtering and analysis commands
  - Confirm structured logging format

- [ ] **Configuration validated**
  - Test all filtering modes work
  - Verify LLM provider configuration
  - Confirm environment variables resolved

### Smoke Tests (Quick Validation)

Run these quick tests after any deployment (< 2 minutes):

```bash
# 1. Hub health check
curl -sf http://localhost:7000/health || echo "❌ FAIL: Hub not running"

# 2. Prompt-based mode enabled
jq -r '.toolFiltering.mode' mcp-servers.json | grep -q "prompt-based" || echo "❌ FAIL: Wrong mode"

# 3. LLM provider configured
jq -r '.toolFiltering.llmCategorization.enabled' mcp-servers.json | grep -q "true" || echo "❌ FAIL: LLM not enabled"

# 4. Quick validation script run
./scripts/test-analyze-prompt.sh --ci "Quick test" | jq -e '.exit_code == 0' || echo "❌ FAIL: Validation failed"

# 5. Automated tests passing
bun test tests/prompt-based-filtering.test.js --run || echo "❌ FAIL: Tests failed"
```

### Regression Tests

Run these comprehensive tests before major releases (15-20 minutes):

1. **All Test Scenarios**: Execute scenarios 1-10 from Test Scenarios section
2. **Multi-Client Testing**: Test with 3+ concurrent sessions
3. **Load Testing**: Run `bun run test:load` for performance validation
4. **Configuration Variations**: Test all filtering modes
   - prompt-based (primary mode)
   - static (legacy)
   - category (category-based)
   - server-allowlist (allowlist-based)
5. **Error Paths**: Trigger and verify all error scenarios
6. **Backward Compatibility**: Test with feature disabled

### Performance Benchmarks

Track these metrics for performance monitoring:

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| LLM Analysis (p50) | <1000ms | _TBD_ | ⏳ |
| LLM Analysis (p95) | <2000ms | _TBD_ | ⏳ |
| Tool Exposure Update | <10ms | _TBD_ | ⏳ |
| End-to-End Flow | <3000ms | _TBD_ | ⏳ |
| Concurrent Sessions | 100+ | _TBD_ | ⏳ |

**Measure with**:
```bash
# Run performance tests
bun run test:load

# Check results
cat tests/load/results/summary.json | jq
```

---

## Troubleshooting

### Issue 1: Meta-tool not appearing in tool list

**Symptoms:**
- `hub__analyze_prompt` not in tools/list response
- Client can't call the meta-tool

**Debug Steps:**
```bash
# 1. Check configuration
grep -A 10 "promptBasedFiltering" mcp-servers.json

# 2. Verify enableMetaTools is true
# 3. Check logs for registration
grep "Registered meta-tools" ~/.local/state/mcp-hub/logs/mcp-hub.log

# 4. Verify filtering mode
grep "filteringMode" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Solution:**
- Ensure `mode: "prompt-based"` in config
- Ensure `enableMetaTools: true` (or undefined, defaults to true)
- Restart MCP Hub after config changes

### Issue 2: LLM analysis failing silently

**Symptoms:**
- No categories returned
- Prompt analysis returns empty array
- No error in client response

**Debug Steps:**
```bash
# 1. Check API key resolution
grep "GEMINI_API_KEY" ~/.local/state/mcp-hub/logs/mcp-hub.log

# 2. Verify LLM provider initialization
grep -i "llm.*initialized\|llm.*failed" ~/.local/state/mcp-hub/logs/mcp-hub.log

# 3. Check for API errors
grep -i "gemini\|api error\|rate limit" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Solution:**
- Verify API key is valid: `curl -H "x-goog-api-key: $GEMINI_API_KEY" "https://generativelanguage.googleapis.com/v1beta/models"`
- Check rate limits on Google AI Studio dashboard
- Try different model: `"model": "gemini-1.5-flash"`

### Issue 3: tools/list_changed notification not received

**Symptoms:**
- Tools updated on server
- Client doesn't see new tools
- No notification in SSE stream

**Debug Steps:**
```bash
# 1. Monitor SSE stream
curl -N http://localhost:7000/mcp 2>&1 | grep -i "tools_changed\|notification"

# 2. Check notification sending
grep "Sent tools/list_changed" ~/.local/state/mcp-hub/logs/mcp-hub.log

# 3. Verify session exists
curl http://localhost:7000/api/debug/sessions | jq '.sessions[] | select(.sessionId == "YOUR_SESSION")'
```

**Solution:**
- Ensure SSE connection is active
- Check client reconnection logic
- Verify sessionId matches between requests

### Issue 4: Session isolation not working

**Symptoms:**
- Tools exposed in one session appear in another
- Categories leak between clients

**Debug Steps:**
```bash
# 1. Check sessionIsolation config
jq '.toolFiltering.promptBasedFiltering.sessionIsolation' mcp-servers.json

# 2. Verify session creation
grep "Initialized client session" ~/.local/state/mcp-hub/logs/mcp-hub.log

# 3. Check session map
curl http://localhost:7000/api/debug/sessions | jq '.total'
```

**Solution:**
- Ensure `sessionIsolation: true` in config
- Verify each client gets unique sessionId
- Check for session cleanup on disconnect

### Debug Checklist

Use this checklist when debugging issues:

- [ ] Configuration valid (mode: prompt-based, enableMetaTools: true)
- [ ] API key environment variable set and resolved
- [ ] LLM provider initialized successfully
- [ ] Meta-tools registered in allCapabilities
- [ ] Client session initialized on connection
- [ ] hub__analyze_prompt appears in initial tools/list
- [ ] LLM analysis returns valid categories
- [ ] Session exposedCategories updated
- [ ] tools/list_changed notification sent
- [ ] Client receives and processes notification
- [ ] New tools appear in subsequent tools/list
- [ ] Session isolation working (if enabled)
- [ ] No errors in logs

---

## Performance Expectations

**Latency Targets:**
- Meta-tool registration: <100ms (startup)
- Session initialization: <50ms
- LLM analysis: <2000ms (network dependent)
- Tool exposure update: <10ms
- Notification broadcast: <50ms
- **Total end-to-end: <3000ms**

**Resource Usage:**
- Memory: +5-10MB per active session
- LLM API calls: 1 per prompt analysis
- Disk I/O: Cache writes batched (30s intervals)

**Scalability:**
- Concurrent sessions: 100+ supported
- Rate limiting: 10 LLM requests/second (configurable)
- Queue backlog: Graceful handling up to 1000 pending

---

## CI/CD Integration

### GitHub Actions Example

Complete CI/CD workflow for testing the analyze_prompt feature:

```yaml
# .github/workflows/test-analyze-prompt.yml
name: Test Analyze Prompt Feature

on:
  push:
    branches: [main, develop, 'fix/analyze-prompt-*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Dependencies
        run: bun install

      - name: Start MCP Hub
        run: |
          bun start &
          sleep 5
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          ENABLE_PINO_LOGGER: true

      - name: Run Automated Tests
        run: bun test tests/prompt-based-filtering.test.js

      - name: Generate Coverage Report
        run: bun run test:coverage

      - name: Check Coverage Thresholds
        run: |
          jq -e '.total.branches.pct >= 80' coverage/coverage-summary.json || exit 1

      - name: Run Validation Script
        run: |
          ./scripts/test-analyze-prompt.sh --ci "Test prompt" > results.json
          cat results.json

      - name: Verify Test Results
        run: |
          jq -e '.exit_code == 0' results.json || exit 1
          jq '.success_rate >= 90' results.json || exit 1

      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            results.json
            coverage/

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));
            const body = `
            ## 🧪 Test Results: analyze_prompt Feature

            | Metric | Value |
            |--------|-------|
            | **Total Tests** | ${results.total} |
            | **Passed** | ✅ ${results.passed} |
            | **Failed** | ❌ ${results.failed} |
            | **Success Rate** | ${results.success_rate}% |

            ${results.exit_code === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Coverage Thresholds Configuration

Add coverage requirements to `vitest.config.js`:

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.js'
      ]
    }
  }
}
```

### Test Failure Handling Strategies

**Strategy 1: Fail Fast on Critical Failures**
```yaml
- name: Run Critical Tests
  run: bun test tests/prompt-based-filtering.test.js
  continue-on-error: false  # Fail pipeline immediately

- name: Run Performance Tests
  run: bun run test:load
  continue-on-error: true   # Don't block on perf issues
```

**Strategy 2: Retry on Transient Failures**
```yaml
- name: Run Validation Script (with retry)
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 5
    max_attempts: 3
    retry_on: error
    command: ./scripts/test-analyze-prompt.sh --ci "Test"
```

### Deployment Gates

#### Staging Gate Requirements
- ✅ All automated tests passing (23/23)
- ✅ Validation script passes (10/10)
- ✅ Code coverage ≥80% branches
- ✅ No critical security issues
- ✅ Performance benchmarks met

```yaml
staging_deploy:
  needs: test
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to Staging
      run: ./scripts/deploy-staging.sh
    - name: Run Smoke Tests
      run: ./scripts/test-analyze-prompt.sh --ci "Smoke test"
```

#### Production Gate Requirements
- ✅ Staging validated for 24-48 hours
- ✅ No critical issues reported
- ✅ Performance metrics stable
- ✅ Manual approval required

```yaml
production_deploy:
  needs: staging_deploy
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://mcp-hub.example.com
  steps:
    - name: Manual Approval Gate
      uses: trstringer/manual-approval@v1
    - name: Deploy to Production
      run: ./scripts/deploy-production.sh
    - name: Verify Deployment
      run: |
        sleep 30
        curl -sf https://mcp-hub.example.com/health || exit 1
```

### Monitoring Integration

**Post-Deployment Monitoring:**
```yaml
- name: Setup Monitoring
  run: |
    # Send deployment event to monitoring
    curl -X POST https://monitoring.example.com/events \
      -d '{
        "type": "deployment",
        "service": "mcp-hub",
        "feature": "analyze_prompt",
        "version": "${{ github.sha }}"
      }'

- name: Track Error Rate
  run: |
    # Monitor error rate for 5 minutes
    ./scripts/monitor-error-rate.sh --duration 300 --threshold 1
```

### Performance Regression Detection

```yaml
- name: Run Performance Tests
  run: bun run test:load:ci > perf-results.json

- name: Compare Performance
  run: |
    # Compare with baseline
    BASELINE=$(cat baseline-perf.json | jq '.p95_latency')
    CURRENT=$(cat perf-results.json | jq '.p95_latency')

    if [ $(echo "$CURRENT > $BASELINE * 1.2" | bc) -eq 1 ]; then
      echo "⚠️ Performance regression detected"
      echo "Baseline: ${BASELINE}ms, Current: ${CURRENT}ms"
      exit 1
    fi
```

### Rollback Automation

```yaml
- name: Automatic Rollback on Failure
  if: failure()
  run: |
    echo "🔄 Rolling back deployment"
    ./scripts/rollback.sh
    # Disable feature flag
    curl -X POST https://mcp-hub.example.com/api/config \
      -d '{"toolFiltering": {"mode": "static"}}'
```

### Notification Integration

**Slack Notifications:**
```yaml
- name: Notify Slack on Success
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "✅ analyze_prompt tests passed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*analyze_prompt Feature Tests*\n✅ All tests passed\n📊 Coverage: 82.94%"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ analyze_prompt tests failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*analyze_prompt Feature Tests*\n❌ Tests failed\n🔗 <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Results>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Local CI Testing

Test CI pipeline locally before pushing:

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -j test --secret GEMINI_API_KEY=your-key-here

# Run specific job
act -j staging_deploy

# Dry run (show what would be executed)
act --dryrun
```

---

## Next Steps

**For Production Deployment:**
1. Configure CI/CD pipeline with GitHub Actions workflow above
2. Set up monitoring and alerting for LLM failures
3. Implement performance tracking and regression detection
4. Create runbook for common issues (based on Troubleshooting section)
5. Set up automated rollback procedures

**For Development:**
1. Use automated tests for rapid iteration (`bun test --watch`)
2. Use validation script for end-to-end testing
3. Enable debug logging to understand flow
4. Test edge cases and failure scenarios
5. Validate with multiple clients simultaneously
