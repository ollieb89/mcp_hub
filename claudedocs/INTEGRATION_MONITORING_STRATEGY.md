# Integration Monitoring Strategy for Staging Deployment

**Deployment Context**: TASK-020 Staging Deployment
**Monitoring Period**: 24-48 hours
**Start Time**: 2025-11-07 21:05:53 UTC
**System State**: MCP Hub operational, 1/2 servers connected

## Executive Summary

This document defines the monitoring strategy for validating integration health across all MCP Hub system components during the staging deployment period. Focus areas include inter-component communication, session management, graceful degradation, and long-term stability.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Hub Server                        │
│                     PID: 453077, Port: 7000                  │
│                      Uptime: 06:38 hours                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Filesystem  │    │    GitHub    │    │  Gemini API  │
│ MCP Server   │    │ MCP Server   │    │ Integration  │
│              │    │              │    │              │
│ Status:      │    │ Status:      │    │ Status:      │
│ CONNECTED    │    │ CONNECTING   │    │ ACTIVE       │
│              │    │ (Expected)   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │     Tool Filtering Service            │
        │  - LLM Categorization: Enabled        │
        │  - Session Isolation: Per-Client      │
        │  - Meta-Tool: hub__analyze_prompt     │
        │  - Active Clients: 2                  │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │       Logging Subsystem               │
        │  - Location: XDG-compliant            │
        │  - Format: JSON structured            │
        │  - Streams: Console + File + SSE      │
        └──────────────────────────────────────┘
```

## Current System State (T+0 Baseline)

### Process Health
- **PID**: 453077
- **Uptime**: 06:38 hours (started ~14:28 UTC)
- **CPU Usage**: 0.4%
- **Memory Usage**: 0.7%
- **Port Status**: Listening on 7000

### Server Connections
- **Filesystem**: Connected, 14 tools available, uptime 405s
- **GitHub**: Connecting (expected failure - missing token)
- **Total Capabilities**: 15 tools, 0 resources, 0 prompts

### MCP Endpoint State
- **Active Clients**: 2
- **Registered Tools**: 15 (all from filesystem)
- **Session Isolation**: Active
- **Meta-Tool Status**: Registered

### Workspace Cache
- **Current Workspace**: 7000
- **State**: active
- **Active Connections**: 0
- **Config Files**: ./mcp-servers.json

## Integration Points to Monitor

### 1. MCP Hub ↔ MCP Servers Communication

**Components**: MCPHub.js, MCPConnection.js, filesystem/github servers

**Health Indicators**:
- Connection state transitions
- Tool list synchronization
- Error rate and types
- Reconnection behavior

**Monitoring Commands**:
```bash
# Check server status
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | {name, status, uptime, error}'

# Monitor connection state changes
grep -E '"msg":"(Server|Connection)' ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20

# Check filesystem tool availability
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | select(.name=="filesystem") | .capabilities.tools | length'
```

**Success Criteria**:
- Filesystem remains connected (status: "connected")
- No unexpected disconnections
- Tool count remains stable at 14-15
- GitHub remains in "connecting" state (expected)

**Failure Scenarios**:
- Filesystem disconnects → Log error, attempt reconnection
- Tool list becomes empty → Critical failure
- Connection state oscillates → Stability issue

### 2. MCP Hub ↔ Gemini API Integration

**Components**: LLM categorization service, prompt analyzer

**Health Indicators**:
- API response times
- Error rates (rate limits, invalid requests)
- Categorization accuracy
- Token usage patterns

**Monitoring Commands**:
```bash
# Check LLM categorization logs
grep -E '"msg":".*LLM|Gemini|categoriz"' ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20

# Monitor API errors
grep -E '"level":"error".*gemini' ~/.local/state/mcp-hub/logs/mcp-hub.log

# Check configuration
curl -s http://127.0.0.1:7000/api/health | jq '.servers[] | select(.name=="filesystem")'
```

**Success Criteria**:
- Gemini API responds within 2-5 seconds
- No rate limit errors during normal operation
- Categorization produces valid categories
- Token usage remains within budget

**Failure Scenarios**:
- API key invalid → Immediate failure, check environment
- Rate limit exceeded → Backoff and retry
- Invalid response → Fall back to static filtering
- Network timeout → Graceful degradation

### 3. Tool Filtering ↔ Session Management

**Components**: Tool filtering service, session state tracking, MCPServerEndpoint

**Health Indicators**:
- Session creation/destruction
- Per-client tool exposure state
- Meta-tool invocation success
- Session isolation integrity

**Monitoring Commands**:
```bash
# Check active client sessions
curl -s http://127.0.0.1:7000/api/health | jq '.mcpEndpoint.activeClients'

# Monitor session state changes
grep -E '"msg":".*session|client"' ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20

# Check meta-tool presence
curl -s http://127.0.0.1:7000/api/health | jq '.mcpEndpoint.registeredCapabilities'
```

**Success Criteria**:
- Each client has independent tool exposure
- Meta-tool available to all clients
- Session state persists across requests
- Clean session termination on disconnect

**Failure Scenarios**:
- Session state leaks between clients → Privacy issue
- Meta-tool unavailable → Filtering unusable
- Session not cleaned up → Memory leak
- Tool exposure persists after client disconnect → Stale state

### 4. Meta-Tool ↔ Client Connections

**Components**: hub__analyze_prompt tool, MCP protocol handler

**Health Indicators**:
- Tool invocation success rate
- Response payload structure
- Category identification accuracy
- Client notification delivery

**Monitoring Commands**:
```bash
# Monitor meta-tool invocations
grep -E '"msg":".*analyze_prompt"' ~/.local/state/mcp-hub/logs/mcp-hub.log | tail -20

# Check tool execution success
grep -E '"level":"error".*hub__analyze_prompt' ~/.local/state/mcp-hub/logs/mcp-hub.log

# Verify notifications sent
grep -E '"msg":".*tools/list_changed"' ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Success Criteria**:
- Meta-tool executes within 3-6 seconds
- Returns valid JSON response
- Triggers tools/list_changed notification
- Clients receive and process notification

**Failure Scenarios**:
- Tool execution timeout → Gemini API issue
- Invalid response structure → Protocol violation
- Notification not sent → Client won't see new tools
- Client ignores notification → Client implementation issue

### 5. Logging ↔ All Components

**Components**: Pino logger, SSE manager, log file rotation

**Health Indicators**:
- Log file growth rate
- SSE log streaming functionality
- Log level distribution
- File system space usage

**Monitoring Commands**:
```bash
# Check log file size and growth
ls -lh ~/.local/state/mcp-hub/logs/mcp-hub.log
du -h ~/.local/state/mcp-hub/logs/

# Monitor log level distribution (last 100 entries)
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '.level' | sort | uniq -c

# Check SSE connection count
curl -s http://127.0.0.1:7000/api/health | jq '.connections.totalConnections'

# Monitor log accumulation over 1 hour
watch -n 3600 'ls -lh ~/.local/state/mcp-hub/logs/mcp-hub.log'
```

**Success Criteria**:
- Log file grows linearly with activity
- No errors in log writing
- SSE streams deliver logs in real-time
- File size remains manageable (<100MB/day)

**Failure Scenarios**:
- Log file growth exponential → Logging loop
- File write errors → Disk full or permissions
- SSE streams fail → Client loses real-time monitoring
- Missing log entries → Silent failures

## 24-48 Hour Stability Monitoring Protocol

### Phase 1: Initial Validation (Hours 0-2)

**Objective**: Verify all integration points are functioning correctly

**Tasks**:
1. Baseline system metrics (CPU, memory, connections)
2. Execute test scenarios for each integration point
3. Monitor log output for errors/warnings
4. Validate session isolation with multiple clients
5. Test graceful degradation scenarios

**Validation Script**:
```bash
#!/bin/bash
# Save as: scripts/monitoring/phase1-validation.sh

echo "=== Phase 1: Initial Validation ==="
echo "Timestamp: $(date -Iseconds)"

# 1. System Health
echo -e "\n--- System Health ---"
ps -p 453077 -o pid,ppid,cmd,%cpu,%mem,etime --no-headers
ss -tlnp 2>/dev/null | grep :7000

# 2. API Health
echo -e "\n--- API Health ---"
curl -s http://127.0.0.1:7000/api/health | jq '{status, state, activeClients, servers: [.servers[] | {name, status, uptime}]}'

# 3. Server Connections
echo -e "\n--- Server Connections ---"
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | {name, status, tools: .capabilities.tools | length}'

# 4. MCP Endpoint State
echo -e "\n--- MCP Endpoint State ---"
curl -s http://127.0.0.1:7000/api/health | jq '.mcpEndpoint'

# 5. Recent Errors
echo -e "\n--- Recent Errors (last 10) ---"
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error") | [.time, .msg] | @tsv' | tail -10

# 6. Log Level Distribution
echo -e "\n--- Log Level Distribution (last 100 entries) ---"
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r '.level' | sort | uniq -c

# 7. Workspace Cache
echo -e "\n--- Workspace Cache ---"
curl -s http://127.0.0.1:7000/api/health | jq '.workspaces'

echo -e "\n=== Phase 1 Validation Complete ==="
```

**Expected Output**:
- CPU: <1%, Memory: <1%
- Status: ok, State: ready
- Filesystem: connected, 14-15 tools
- GitHub: connecting (expected)
- Errors: 0-1 (GitHub token missing only)
- activeClients: 0-2

### Phase 2: Continuous Monitoring (Hours 2-24)

**Objective**: Identify any degradation or instability over time

**Monitoring Intervals**:
- Every 5 minutes: System metrics (CPU, memory, uptime)
- Every 15 minutes: Server connection status
- Every 30 minutes: Full health check
- Every 2 hours: Log file analysis
- Continuous: Error log monitoring

**Monitoring Script**:
```bash
#!/bin/bash
# Save as: scripts/monitoring/phase2-continuous.sh

LOG_DIR="$HOME/.local/state/mcp-hub/monitoring"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HEALTH_LOG="$LOG_DIR/health_${TIMESTAMP}.jsonl"

echo "=== Phase 2: Continuous Monitoring Started ==="
echo "Logging to: $HEALTH_LOG"

while true; do
    CURRENT_TIME=$(date -Iseconds)

    # System metrics (every 5 min)
    SYSTEM_METRICS=$(ps -p 453077 -o %cpu,%mem,etime --no-headers)

    # Health check (every 30 min)
    if [ $(date +%M) -eq 00 ] || [ $(date +%M) -eq 30 ]; then
        HEALTH_CHECK=$(curl -s http://127.0.0.1:7000/api/health)
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"full_health\",\"data\":$HEALTH_CHECK}" >> "$HEALTH_LOG"
    else
        # Light check
        SERVER_STATUS=$(curl -s http://127.0.0.1:7000/api/servers | jq -c '[.servers[] | {name, status}]')
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"light_check\",\"system\":\"$SYSTEM_METRICS\",\"servers\":$SERVER_STATUS}" >> "$HEALTH_LOG"
    fi

    # Error check
    ERROR_COUNT=$(tail -50 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq -r 'select(.level=="error")' | wc -l)
    if [ $ERROR_COUNT -gt 1 ]; then
        echo "{\"timestamp\":\"$CURRENT_TIME\",\"type\":\"error_alert\",\"count\":$ERROR_COUNT}" >> "$HEALTH_LOG"
        # Send alert (implement notification mechanism)
    fi

    sleep 300  # 5 minutes
done
```

**Alert Thresholds**:
- CPU usage >10% sustained: Warning
- Memory usage >5%: Warning
- Filesystem disconnects: Critical
- Error rate >10/hour: Warning
- API response time >10s: Warning
- Active clients >10: Investigate

### Phase 3: Stress Testing (Hours 24-36)

**Objective**: Test system behavior under load and degradation scenarios

**Test Scenarios**:

1. **Multiple Client Connections** (Session Isolation)
```bash
#!/bin/bash
# Save as: scripts/monitoring/test-multiple-clients.sh

echo "=== Testing Multiple Client Connections ==="

# Simulate 5 concurrent clients
for i in {1..5}; do
    (
        echo "Client $i connecting..."
        # Simulate MCP client connection
        # NOTE: Requires actual MCP client implementation
        # For now, just monitor SSE connections
        curl -N -H "Accept: text/event-stream" \
             http://127.0.0.1:7000/sse &
    ) &
done

# Wait 30 seconds
sleep 30

# Check active clients
echo "Active clients after 30s:"
curl -s http://127.0.0.1:7000/api/health | jq '.mcpEndpoint.activeClients'

# Cleanup
pkill -f "curl.*127.0.0.1:7000/sse"

echo "=== Test Complete ==="
```

2. **Gemini API Failure Simulation** (Graceful Degradation)
```bash
#!/bin/bash
# Save as: scripts/monitoring/test-gemini-failure.sh

echo "=== Testing Gemini API Failure Handling ==="

# 1. Baseline: Working state
echo "1. Baseline check..."
curl -s http://127.0.0.1:7000/api/health | jq '.servers[] | select(.name=="filesystem") | {name, status}'

# 2. Temporarily invalidate API key (requires config modification)
echo "2. Simulating API failure..."
echo "NOTE: Manually invalidate GEMINI_API_KEY and restart to test"
echo "Expected: System should fall back to static filtering"

# 3. Test meta-tool behavior
echo "3. Testing meta-tool with invalid API key..."
# NOTE: Requires actual MCP client to invoke hub__analyze_prompt
echo "Expected: Tool should return error with clear message"

# 4. Restore API key
echo "4. Restore API key and verify recovery..."
echo "Expected: System should resume LLM categorization"

echo "=== Test Complete ==="
```

3. **Filesystem Server Crash** (Reconnection Behavior)
```bash
#!/bin/bash
# Save as: scripts/monitoring/test-server-crash.sh

echo "=== Testing Server Crash Recovery ==="

# 1. Get filesystem server PID
FS_PID=$(ps aux | grep '@modelcontextprotocol/server-filesystem' | grep -v grep | awk '{print $2}')
echo "Filesystem server PID: $FS_PID"

# 2. Kill filesystem server
echo "Killing filesystem server..."
kill -9 $FS_PID

# 3. Monitor reconnection
echo "Monitoring reconnection (60 seconds)..."
for i in {1..12}; do
    sleep 5
    STATUS=$(curl -s http://127.0.0.1:7000/api/servers | jq -r '.servers[] | select(.name=="filesystem") | .status')
    echo "  T+${i}0s: Status = $STATUS"
done

# 4. Verify recovery
echo "Final status:"
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | select(.name=="filesystem") | {name, status, uptime, tools: .capabilities.tools | length}'

echo "=== Test Complete ==="
```

4. **Log File Growth** (Resource Management)
```bash
#!/bin/bash
# Save as: scripts/monitoring/test-log-growth.sh

echo "=== Testing Log File Growth ==="

LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"

# 1. Initial size
INITIAL_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE")
echo "Initial log size: $(numfmt --to=iec $INITIAL_SIZE)"

# 2. Generate load (simulate 100 API requests)
echo "Generating load (100 requests)..."
for i in {1..100}; do
    curl -s http://127.0.0.1:7000/api/health > /dev/null
done

# 3. Check growth
sleep 5
FINAL_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE")
GROWTH=$((FINAL_SIZE - INITIAL_SIZE))
echo "Final log size: $(numfmt --to=iec $FINAL_SIZE)"
echo "Growth: $(numfmt --to=iec $GROWTH) ($(echo "scale=2; $GROWTH / $INITIAL_SIZE * 100" | bc)%)"

# 4. Extrapolate daily growth
DAILY_GROWTH=$(echo "scale=0; $GROWTH * 100 * 24 * 60 / 5" | bc)  # Assuming 100 req every 5 min
echo "Estimated daily growth at this rate: $(numfmt --to=iec $DAILY_GROWTH)"

echo "=== Test Complete ==="
```

**Success Criteria**:
- Multiple clients: Each has isolated tool exposure
- Gemini failure: Falls back to static filtering gracefully
- Server crash: Reconnects within 30 seconds
- Log growth: <500MB/day under normal load

### Phase 4: Long-Term Stability (Hours 36-48)

**Objective**: Validate sustained operation without degradation

**Monitoring Focus**:
- Memory leak detection (memory usage trends)
- Connection stability (no unexpected disconnections)
- Log file management (rotation, cleanup)
- Resource exhaustion prevention

**Analysis Script**:
```bash
#!/bin/bash
# Save as: scripts/monitoring/phase4-analysis.sh

echo "=== Phase 4: Long-Term Stability Analysis ==="

MONITORING_DIR="$HOME/.local/state/mcp-hub/monitoring"

# 1. Memory trend analysis
echo -e "\n--- Memory Usage Trend ---"
jq -r 'select(.type=="light_check") | [.timestamp, .system] | @tsv' \
    "$MONITORING_DIR"/health_*.jsonl | \
    awk '{print $1, $3}' | \
    tail -20

# 2. Connection stability
echo -e "\n--- Connection Stability ---"
jq -r 'select(.type=="full_health") | .data.servers[] | select(.name=="filesystem") | [.status, .uptime] | @tsv' \
    "$MONITORING_DIR"/health_*.jsonl | \
    tail -10

# 3. Error frequency
echo -e "\n--- Error Frequency Over Time ---"
jq -r 'select(.type=="error_alert") | [.timestamp, .count] | @tsv' \
    "$MONITORING_DIR"/health_*.jsonl | \
    tail -10

# 4. Client connection patterns
echo -e "\n--- Client Connection Patterns ---"
jq -r 'select(.type=="full_health") | [.timestamp, .data.mcpEndpoint.activeClients] | @tsv' \
    "$MONITORING_DIR"/health_*.jsonl | \
    tail -20

# 5. Overall health summary
echo -e "\n--- Overall Health Summary ---"
TOTAL_CHECKS=$(jq -s 'length' "$MONITORING_DIR"/health_*.jsonl)
ERROR_CHECKS=$(jq -s '[.[] | select(.type=="error_alert")] | length' "$MONITORING_DIR"/health_*.jsonl)
SUCCESS_RATE=$(echo "scale=2; ($TOTAL_CHECKS - $ERROR_CHECKS) / $TOTAL_CHECKS * 100" | bc)

echo "Total health checks: $TOTAL_CHECKS"
echo "Error checks: $ERROR_CHECKS"
echo "Success rate: ${SUCCESS_RATE}%"

echo -e "\n=== Phase 4 Analysis Complete ==="
```

**Health Indicators**:
- Memory usage stable or slowly increasing (not exponential)
- No unexpected connection losses
- Error rate <1% of total checks
- System uptime matches process uptime

## Graceful Degradation Scenarios

### Scenario 1: Gemini API Unavailable

**Trigger**: API key invalid, rate limit, network failure

**Expected Behavior**:
1. Meta-tool returns error message
2. System falls back to static tool filtering
3. Warning logged but system remains operational
4. Clients notified of degraded mode

**Validation**:
```bash
# Check fallback mode activation
grep -E '"msg":".*fallback|degraded"' ~/.local/state/mcp-hub/logs/mcp-hub.log

# Verify system still operational
curl -s http://127.0.0.1:7000/api/health | jq '.status'
```

### Scenario 2: Filesystem Server Disconnects

**Trigger**: Server crash, process kill, network issue

**Expected Behavior**:
1. Connection state transitions to "disconnected"
2. Hub attempts automatic reconnection
3. Tools remain in MCP endpoint until reconnected
4. Clients notified of server unavailability

**Validation**:
```bash
# Monitor reconnection attempts
grep -E '"msg":".*reconnect|retry"' ~/.local/state/mcp-hub/logs/mcp-hub.log

# Check server status
curl -s http://127.0.0.1:7000/api/servers | jq '.servers[] | select(.name=="filesystem") | {name, status, error}'
```

### Scenario 3: SSE Connection Lost

**Trigger**: Client network issue, timeout, client crash

**Expected Behavior**:
1. SSE manager detects disconnection
2. Client removed from active connections
3. Session state cleaned up (if session isolation enabled)
4. No impact on other clients

**Validation**:
```bash
# Check active connections before/after
curl -s http://127.0.0.1:7000/api/health | jq '.connections.totalConnections'

# Verify cleanup
grep -E '"msg":".*connection.*closed|removed"' ~/.local/state/mcp-hub/logs/mcp-hub.log
```

### Scenario 4: Log File Full (Disk Space Exhausted)

**Trigger**: Disk full, log directory permissions, quota exceeded

**Expected Behavior**:
1. Logger handles write failure gracefully
2. Error logged to console/stderr
3. System continues operating (no crash)
4. Alert triggered for operator intervention

**Validation**:
```bash
# Check log file write errors
grep -E '"level":"error".*log.*write|disk' ~/.local/state/mcp-hub/logs/mcp-hub.log

# Monitor process health
ps -p 453077 -o pid,state,cmd
```

## Session Management Verification

### Test Case 1: Session Isolation

**Objective**: Verify each client has independent tool exposure state

**Test Steps**:
1. Connect Client A
2. Client A invokes `hub__analyze_prompt` with "github" keywords
3. Verify Client A receives github tools
4. Connect Client B
5. Verify Client B has zero tools (not github tools from Client A)
6. Client B invokes `hub__analyze_prompt` with "filesystem" keywords
7. Verify Client B receives filesystem tools only
8. Verify Client A still has github tools (not affected by Client B)

**Expected Result**: Each client maintains independent tool exposure

### Test Case 2: Session Cleanup

**Objective**: Verify session state is cleaned up on client disconnect

**Test Steps**:
1. Connect Client A
2. Client A invokes `hub__analyze_prompt` to expose tools
3. Record active clients count
4. Client A disconnects
5. Verify active clients count decremented
6. Reconnect as Client A (same client ID if possible)
7. Verify tool exposure reset to default (meta-only)

**Expected Result**: Session state does not persist after disconnect

### Test Case 3: Concurrent Session Modification

**Objective**: Verify concurrent clients don't interfere with each other

**Test Steps**:
1. Connect 3 clients simultaneously
2. All 3 clients invoke `hub__analyze_prompt` with different categories
3. Verify each client receives appropriate tools
4. Client 2 invokes `hub__analyze_prompt` again with new category
5. Verify only Client 2's tool exposure changes
6. Verify Client 1 and 3 unchanged

**Expected Result**: Concurrent modifications are isolated per-client

## Log Analysis and Alerting

### Critical Error Patterns

```bash
# Monitor for critical errors
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | \
    jq -r 'select(.level=="error") | [.time, .msg, .error.code] | @tsv'
```

**Alert Triggers**:
- Connection errors (filesystem server disconnect)
- Gemini API failures (repeated rate limit or auth errors)
- Session management errors (state corruption)
- Resource exhaustion (memory >10%, disk full)

### Performance Degradation Patterns

```bash
# Monitor for performance issues
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | \
    jq -r 'select(.msg | contains("slow") or contains("timeout")) | [.time, .msg] | @tsv'
```

**Alert Triggers**:
- API response time >10 seconds
- Meta-tool execution >10 seconds
- Server reconnection >5 attempts
- Log file growth >100MB/hour

### Anomaly Detection

```bash
#!/bin/bash
# Save as: scripts/monitoring/detect-anomalies.sh

echo "=== Anomaly Detection ==="

LOG_FILE="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"

# 1. Sudden error spike (>10 errors in 5 minutes)
ERROR_SPIKE=$(tail -100 "$LOG_FILE" | jq -r 'select(.level=="error")' | wc -l)
if [ $ERROR_SPIKE -gt 10 ]; then
    echo "ALERT: Error spike detected ($ERROR_SPIKE errors)"
fi

# 2. Connection flapping (>3 disconnect/reconnect cycles in 10 minutes)
DISCONNECT_COUNT=$(tail -200 "$LOG_FILE" | jq -r 'select(.msg | contains("disconnect"))' | wc -l)
RECONNECT_COUNT=$(tail -200 "$LOG_FILE" | jq -r 'select(.msg | contains("reconnect"))' | wc -l)
if [ $DISCONNECT_COUNT -gt 3 ] && [ $RECONNECT_COUNT -gt 3 ]; then
    echo "ALERT: Connection flapping detected"
fi

# 3. Memory growth (>1% increase per hour)
# NOTE: Requires baseline measurement
CURRENT_MEM=$(ps -p 453077 -o %mem --no-headers | xargs)
echo "Current memory usage: ${CURRENT_MEM}%"

# 4. Unusual client count (>5 concurrent clients)
ACTIVE_CLIENTS=$(curl -s http://127.0.0.1:7000/api/health | jq -r '.mcpEndpoint.activeClients')
if [ $ACTIVE_CLIENTS -gt 5 ]; then
    echo "ALERT: Unusual client count ($ACTIVE_CLIENTS)"
fi

echo "=== Anomaly Detection Complete ==="
```

## Deliverables

### 1. Monitoring Dashboard Data

**File**: `~/.local/state/mcp-hub/monitoring/dashboard.json`

**Contents**:
```json
{
  "deploymentInfo": {
    "startTime": "2025-11-07T21:05:53Z",
    "pid": 453077,
    "port": 7000,
    "configFile": "./mcp-servers.json"
  },
  "currentState": {
    "timestamp": "...",
    "status": "ok",
    "uptime": "...",
    "cpu": "...",
    "memory": "...",
    "activeClients": 0,
    "servers": [
      {
        "name": "filesystem",
        "status": "connected",
        "tools": 14,
        "uptime": "..."
      }
    ]
  },
  "metrics": {
    "totalHealthChecks": 0,
    "errorCount": 0,
    "successRate": "100%",
    "avgResponseTime": "...",
    "peakMemoryUsage": "...",
    "peakCpuUsage": "..."
  },
  "incidents": []
}
```

### 2. Integration Health Report

**File**: `claudedocs/STAGING_INTEGRATION_HEALTH_REPORT.md`

**Contents**:
- Executive summary
- Integration point status (pass/fail per component)
- Degradation scenario test results
- Session management validation results
- Performance metrics
- Incident log
- Recommendations

### 3. Monitoring Scripts

All scripts created in `scripts/monitoring/`:
- `phase1-validation.sh` - Initial validation
- `phase2-continuous.sh` - Continuous monitoring
- `test-multiple-clients.sh` - Session isolation testing
- `test-gemini-failure.sh` - Graceful degradation
- `test-server-crash.sh` - Reconnection behavior
- `test-log-growth.sh` - Resource management
- `phase4-analysis.sh` - Long-term stability analysis
- `detect-anomalies.sh` - Anomaly detection

### 4. Automated Monitoring Cron Job

**Setup**:
```bash
# Add to crontab
crontab -e

# Add these lines:
# Health check every 15 minutes
*/15 * * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/phase1-validation.sh >> ~/.local/state/mcp-hub/monitoring/cron.log 2>&1

# Anomaly detection every 5 minutes
*/5 * * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/detect-anomalies.sh >> ~/.local/state/mcp-hub/monitoring/anomalies.log 2>&1

# Daily summary report (8 AM)
0 8 * * * /home/ob/Development/Tools/mcp-hub/scripts/monitoring/daily-summary.sh
```

## Success Criteria Summary

### Integration Health (Must Pass)
- [ ] Filesystem server remains connected for 48 hours
- [ ] No unexpected disconnections or reconnection failures
- [ ] Tool list synchronized correctly between hub and servers
- [ ] Gemini API integration functions without errors
- [ ] Session isolation verified with multiple concurrent clients
- [ ] Meta-tool executes successfully with valid responses
- [ ] Logging system functions without errors or data loss

### Performance (Must Pass)
- [ ] CPU usage <1% average, <5% peak
- [ ] Memory usage <2% average, <5% peak
- [ ] API response time <2 seconds average
- [ ] Meta-tool execution <6 seconds average
- [ ] Log file growth <100MB/day

### Stability (Must Pass)
- [ ] Process uptime matches monitoring period (48 hours)
- [ ] No crashes or unexpected restarts
- [ ] Error rate <1% of total operations
- [ ] No memory leaks detected
- [ ] Graceful degradation scenarios pass

### Degradation Scenarios (Should Pass)
- [ ] Gemini API failure: System falls back gracefully
- [ ] Server crash: Automatic reconnection within 30s
- [ ] SSE disconnect: Clean session cleanup
- [ ] High load: System remains responsive under 10 concurrent clients

## Monitoring Checklist

### Daily Tasks
- [ ] Review monitoring dashboard data
- [ ] Check anomaly detection log
- [ ] Verify no critical errors in last 24 hours
- [ ] Confirm filesystem server connected
- [ ] Validate log file size and rotation

### End of Monitoring Period Tasks
- [ ] Generate integration health report
- [ ] Analyze trend data (CPU, memory, errors)
- [ ] Document all incidents and resolutions
- [ ] Export monitoring data for archival
- [ ] Compile recommendations for production deployment

## Next Steps

1. **Setup Monitoring Infrastructure**
   - Create monitoring scripts directory
   - Initialize monitoring log directory
   - Set up automated health checks

2. **Execute Phase 1 (Hours 0-2)**
   - Run initial validation script
   - Document baseline metrics
   - Execute test scenarios

3. **Start Continuous Monitoring (Hours 2-24)**
   - Start continuous monitoring script
   - Configure cron jobs
   - Set up alert notifications

4. **Stress Testing (Hours 24-36)**
   - Execute all degradation scenarios
   - Test concurrent client connections
   - Validate session management

5. **Long-Term Analysis (Hours 36-48)**
   - Run stability analysis script
   - Generate health report
   - Document findings and recommendations

6. **Final Review**
   - Validate all success criteria met
   - Compile monitoring data
   - Create production deployment plan

## Contact and Escalation

**Monitoring Lead**: [Your name]
**Escalation Path**: [Define escalation process]
**Critical Alert Threshold**: Any failure in "Must Pass" criteria

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**Next Review**: End of monitoring period (48 hours)
