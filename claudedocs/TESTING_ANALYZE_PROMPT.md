# Testing and Debugging Guide: `hub__analyze_prompt` Feature

## Table of Contents
1. [Manual Testing Guide](#manual-testing-guide)
2. [Debug Logging](#debug-logging)
3. [Web UI Integration](#web-ui-integration)
4. [Test Scenarios](#test-scenarios)
5. [Validation Commands](#validation-commands)
6. [Troubleshooting](#troubleshooting)

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

## Next Steps

**For Production Deployment:**
1. Add comprehensive integration tests (see Test Scenarios section)
2. Implement UI components (Prompt Tester + Session Viewer)
3. Add performance monitoring (latency tracking, error rates)
4. Create runbook for common issues (based on Troubleshooting section)
5. Set up alerting for LLM failures and rate limits

**For Development:**
1. Use manual testing guide to verify functionality
2. Enable debug logging to understand flow
3. Monitor logs during testing
4. Test edge cases and failure scenarios
5. Validate with multiple clients simultaneously
