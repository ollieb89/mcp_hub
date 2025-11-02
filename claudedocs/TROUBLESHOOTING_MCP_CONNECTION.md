# MCP Hub Connection Troubleshooting Guide

## Quick Reference: Common Connection Issues

| Error Pattern | Likely Cause | Quick Fix |
|--------------|--------------|-----------|
| `TypeError: fetch failed` | Hub not running | Start MCP Hub: `npm start` |
| `Connection refused` | Port 7000 not listening | Check port conflicts, verify config |
| `404 Not Found` | Wrong endpoint URL | Use `/mcp` not `/messages` |
| Connection timeout | Firewall/network issue | Check firewall, try 127.0.0.1 |
| `EADDRINUSE` | Port already in use | Kill process or change port |

---

## Issue: "TypeError: fetch failed" - Hub Not Running

### Error Pattern
```
[info] Connection state: Error Error sending message to http://localhost:7000/mcp: TypeError: fetch failed
```

### Root Cause
MCP Hub server is not running on port 7000, or the port is not accessible.

### Diagnostic Steps

#### 1. Check if MCP Hub is Running
```bash
# Check if process is running
ps aux | grep -E "mcp-hub|node.*cli.js" | grep -v grep

# Check if port 7000 is listening
ss -tuln | grep 7000
# OR
lsof -i :7000
# OR
netstat -tuln | grep 7000
```

**Expected Output (when running):**
```
tcp   LISTEN  0  511  127.0.0.1:7000  0.0.0.0:*
```

**No Output = Hub Not Running**

#### 2. Check Hub Health (if running)
```bash
curl -s http://localhost:7000/api/health | jq '.'
```

**Expected Response:**
```json
{
  "status": "ok",
  "state": "ready",
  "server_id": "mcp-hub",
  "version": "4.2.1",
  "activeClients": 0
}
```

#### 3. Check MCP Endpoint Availability
```bash
# Test MCP endpoint
curl -v http://localhost:7000/mcp
```

**Expected:** HTTP 200 or 405 (POST required)
**Problem:** Connection refused or timeout

### Solutions

#### Solution 1: Start MCP Hub
```bash
# From project directory
npm start

# Or with custom config
mcp-hub --port 7000 --config ./mcp-servers.json

# Or with multiple configs
mcp-hub --port 7000 --config ~/.config/mcphub/global.json --config ./.mcphub/project.json
```

**Verify startup logs:**
```
✓ Server running on http://localhost:7000
✓ MCP Server endpoint available at http://localhost:7000/mcp
✓ Connected to server: filesystem
✓ Connected to server: github
```

#### Solution 2: Check for Port Conflicts
```bash
# Check what's using port 7000
sudo lsof -i :7000

# Kill the conflicting process
kill -9 <PID>

# OR use a different port
mcp-hub --port 7001 --config ./mcp-servers.json
```

**Update client config if using different port:**
```json
{
  "mcpServers": {
    "Hub": {
      "url": "http://localhost:7001/mcp"
    }
  }
}
```

#### Solution 3: Check Configuration File
```bash
# Verify config file exists and is valid
cat mcp-servers.json | jq '.'

# Check for JSON syntax errors
node -e "console.log(JSON.stringify(require('./mcp-servers.json'), null, 2))"
```

**Common config issues:**
- Missing or invalid JSON
- Incorrect `mcpServers` structure
- Invalid environment variable placeholders
- Missing required API keys

#### Solution 4: Check Firewall/Network
```bash
# Try 127.0.0.1 instead of localhost
curl http://127.0.0.1:7000/api/health

# Check firewall rules (Linux)
sudo iptables -L -n | grep 7000

# Check firewall (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

### Prevention

#### 1. Auto-Start MCP Hub (systemd - Linux)
```bash
# Create systemd service
sudo nano /etc/systemd/system/mcp-hub.service
```

```ini
[Unit]
Description=MCP Hub Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/mcp-hub
ExecStart=/usr/bin/node src/utils/cli.js --port 7000 --config ./mcp-servers.json
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable mcp-hub
sudo systemctl start mcp-hub

# Check status
sudo systemctl status mcp-hub
```

#### 2. Health Check Script
```bash
#!/bin/bash
# save as check-hub.sh

if ! curl -s http://localhost:7000/api/health > /dev/null; then
  echo "MCP Hub is down! Starting..."
  cd /path/to/mcp-hub
  npm start &
else
  echo "MCP Hub is running"
fi
```

#### 3. MCP Client Retry Configuration
Configure your MCP client to retry connections:

**Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "Hub": {
      "url": "http://localhost:7000/mcp",
      "timeout": 30000,
      "retries": 3
    }
  }
}
```

---

## Issue: Hub Running But Connection Still Fails

### Diagnostic Steps

#### 1. Verify MCP Endpoint Registration
```bash
# Check if /mcp endpoint is registered
curl -s http://localhost:7000/api/health | jq '.mcpEndpoint'
```

**Expected:**
```json
{
  "enabled": true,
  "registeredCapabilities": {
    "tools": [...],
    "resources": [...]
  }
}
```

#### 2. Test Direct HTTP Request to /mcp
```bash
# POST request (MCP protocol)
curl -X POST http://localhost:7000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }' | jq '.'
```

**Expected:** Valid JSON-RPC response
**Problem:** 404, 500, or connection error

#### 3. Check Hub Logs
```bash
# Check structured logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.'

# Filter for errors
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq 'select(.type == "error")'
```

### Solutions

#### Solution 1: Restart Hub
```bash
# Graceful restart
curl -X POST http://localhost:7000/api/restart

# Wait for restart
sleep 5

# Verify health
curl http://localhost:7000/api/health
```

#### Solution 2: Hard Restart (if graceful fails)
```bash
# Stop all MCP Hub processes
pkill -f "mcp-hub"
pkill -f "node.*cli.js"

# Verify stopped
ps aux | grep -E "mcp-hub|node.*cli.js" | grep -v grep

# Start fresh
npm start
```

#### Solution 3: Check Server Connections
```bash
# List all servers and their status
curl -s http://localhost:7000/api/servers | jq '.servers[] | {name, status, error}'
```

**Look for:**
- Servers in `disconnected` state
- Servers with error messages
- Missing expected servers

**Fix server connection issues:**
```bash
# Restart specific server
curl -X POST http://localhost:7000/api/servers/start \
  -H "Content-Type: application/json" \
  -d '{"server_name": "filesystem"}'

# Check server info
curl -X POST http://localhost:7000/api/servers/info \
  -H "Content-Type: application/json" \
  -d '{"server_name": "filesystem"}' | jq '.'
```

---

## Issue: Client Configuration Problems

### Common Client Config Errors

#### 1. Wrong Endpoint Path
**Problem:**
```json
{
  "mcpServers": {
    "Hub": {
      "url": "http://localhost:7000"  // Missing /mcp
    }
  }
}
```

**Fix:**
```json
{
  "mcpServers": {
    "Hub": {
      "url": "http://localhost:7000/mcp"  // Correct!
    }
  }
}
```

#### 2. Protocol Mismatch
**Problem:**
```json
{
  "mcpServers": {
    "Hub": {
      "command": "mcp-hub",  // STDIO config
      "url": "http://localhost:7000/mcp"  // Remote config
    }
  }
}
```

**Fix (choose ONE):**
```json
{
  "mcpServers": {
    "Hub": {
      "url": "http://localhost:7000/mcp"  // Remote server
    }
  }
}
```

#### 3. Transport Type
MCP Hub uses **streamable-http** transport. Ensure your client supports it:

**Supported MCP Clients:**
- Claude Desktop (≥ 0.7.0)
- Cline VS Code Extension
- Continue VS Code Extension
- Custom clients using @modelcontextprotocol/sdk ≥ 1.0.0

---

## Environment-Specific Issues

### Development Environment

#### Issue: Hub starts but immediately exits
```bash
# Check if auto-shutdown is enabled
grep -A 5 "auto-shutdown" mcp-servers.json
```

**Solution:** Disable auto-shutdown in development
```bash
mcp-hub --port 7000 --config ./mcp-servers.json --auto-shutdown=false
```

#### Issue: File watching not working (dev mode)
```bash
# Check dev mode configuration
curl -s http://localhost:7000/api/servers | jq '.servers[] | select(.dev.enabled == true)'
```

**Requirements:**
- Absolute `cwd` path in dev config
- Watch patterns configured
- chokidar dependency installed

**Fix:**
```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["server.js"],
      "dev": {
        "enabled": true,
        "watch": ["**/*.js"],
        "cwd": "/absolute/path/to/server"  // Must be absolute!
      }
    }
  }
}
```

### Production Environment

#### Issue: Hub crashes under load
```bash
# Check memory usage
ps aux | grep mcp-hub | awk '{print $4, $11}'

# Check open file descriptors
lsof -p $(pgrep -f mcp-hub) | wc -l
```

**Solution:** Increase Node.js memory limit
```bash
NODE_OPTIONS="--max-old-space-size=4096" mcp-hub --port 7000 --config ./mcp-servers.json
```

#### Issue: Connection pool exhausted
```bash
# Check pool stats
curl -s http://localhost:7000/api/health | jq '.servers[] | select(.transport == "sse" or .transport == "streamable-http") | {name, connectionPool}'
```

**Solution:** Increase connection pool limits
```json
{
  "connectionPool": {
    "enabled": true,
    "maxConnections": 100,
    "keepAliveTimeout": 60000
  }
}
```

---

## Network Diagnostics

### Test Connectivity Matrix

```bash
#!/bin/bash
# save as test-connectivity.sh

echo "=== MCP Hub Connectivity Test ==="

# 1. Localhost
echo -n "localhost:7000 HTTP... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:7000/api/health | grep -q "200"; then
  echo "✓"
else
  echo "✗"
fi

# 2. 127.0.0.1
echo -n "127.0.0.1:7000 HTTP... "
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:7000/api/health | grep -q "200"; then
  echo "✓"
else
  echo "✗"
fi

# 3. MCP endpoint
echo -n "MCP endpoint POST... "
if curl -s -X POST http://localhost:7000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}' 2>&1 | grep -q "jsonrpc"; then
  echo "✓"
else
  echo "✗"
fi

# 4. SSE endpoint
echo -n "SSE events... "
if curl -s -N http://localhost:7000/api/events 2>&1 | head -1 | grep -q "event:"; then
  echo "✓"
else
  echo "✗"
fi

echo ""
echo "=== Server Status ==="
curl -s http://localhost:7000/api/servers | jq '.servers[] | {name, status}'
```

### DNS/Hosts File Issues

```bash
# Check localhost resolution
getent hosts localhost

# Expected output:
# 127.0.0.1       localhost
# ::1             localhost

# If missing, add to /etc/hosts:
echo "127.0.0.1 localhost" | sudo tee -a /etc/hosts
```

---

## Monitoring and Alerting

### Real-Time Monitoring

```bash
# Monitor connection state
watch -n 2 'curl -s http://localhost:7000/api/health | jq "{state, servers: .servers | length, clients: .activeClients}"'

# Monitor logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq 'select(.type == "error" or .type == "warn")'

# Monitor SSE events
curl -N http://localhost:7000/api/events
```

### Health Check Script (for monitoring systems)

```bash
#!/bin/bash
# save as healthcheck.sh

# Exit codes:
# 0 = healthy
# 1 = unhealthy
# 2 = degraded

HEALTH=$(curl -s http://localhost:7000/api/health)

if [ -z "$HEALTH" ]; then
  echo "ERROR: Hub not responding"
  exit 1
fi

STATE=$(echo $HEALTH | jq -r '.state')
SERVERS=$(echo $HEALTH | jq '.servers | length')
DISCONNECTED=$(echo $HEALTH | jq '[.servers[] | select(.status != "connected")] | length')

if [ "$STATE" != "ready" ]; then
  echo "ERROR: Hub state is $STATE"
  exit 1
fi

if [ "$DISCONNECTED" -gt 0 ]; then
  echo "WARNING: $DISCONNECTED servers disconnected"
  exit 2
fi

echo "OK: Hub healthy, $SERVERS servers connected"
exit 0
```

---

## Advanced Troubleshooting

### Enable Debug Logging

```bash
# Set debug environment variable
DEBUG=mcp-hub:* npm start

# OR in systemd service
Environment="DEBUG=mcp-hub:*"
```

### Inspect Traffic with tcpdump

```bash
# Capture HTTP traffic on port 7000
sudo tcpdump -i lo -A -s 0 'tcp port 7000' -w mcp-hub-traffic.pcap

# View captured traffic
tcpdump -r mcp-hub-traffic.pcap -A | less
```

### Memory Leak Detection

```bash
# Take heap snapshot
node --inspect src/utils/cli.js --port 7000 --config ./mcp-servers.json

# Open Chrome DevTools
# Navigate to chrome://inspect
# Take heap snapshots during operation
# Compare snapshots to find leaks
```

### Strace for System Calls

```bash
# Trace system calls
strace -p $(pgrep -f mcp-hub) -e trace=network -o strace.log

# Analyze connection attempts
grep "connect\|bind\|listen" strace.log
```

---

## Escalation Matrix

| Severity | Response Time | Escalation Path | Communication |
|----------|---------------|-----------------|---------------|
| **P1: Hub Down** | Immediate | On-call engineer → Team lead → CTO | Slack #incidents, Status page |
| **P2: Degraded** | < 30 min | Assigned engineer → Senior engineer | Slack #support |
| **P3: Minor** | < 4 hours | Team member → Documentation update | GitHub issue |

---

## Common Solutions Checklist

Before escalating, verify:

- [ ] MCP Hub process is running (`ps aux | grep mcp-hub`)
- [ ] Port 7000 is listening (`ss -tuln | grep 7000`)
- [ ] Health endpoint responds (`curl http://localhost:7000/api/health`)
- [ ] MCP endpoint responds to POST (`curl -X POST http://localhost:7000/mcp`)
- [ ] Client config has correct URL (`http://localhost:7000/mcp`)
- [ ] No firewall blocking port 7000
- [ ] Configuration file is valid JSON (`jq '.' mcp-servers.json`)
- [ ] Required environment variables are set
- [ ] Sufficient disk space and memory
- [ ] No conflicting processes on port 7000
- [ ] Logs don't show critical errors

---

## Quick Recovery Commands

```bash
# Nuclear option: Complete restart
pkill -f mcp-hub
rm -f ~/.local/state/mcp-hub/workspaces.json
npm start

# Verify recovery
curl http://localhost:7000/api/health && echo "✓ Hub recovered"
```

---

## Getting Help

### Information to Gather

When reporting issues, include:

1. **Error logs:**
```bash
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.'
```

2. **System info:**
```bash
node --version
npm --version
uname -a
```

3. **Hub version:**
```bash
curl -s http://localhost:7000/api/health | jq '{version, state}'
```

4. **Server status:**
```bash
curl -s http://localhost:7000/api/servers | jq '.servers[] | {name, status, error}'
```

5. **Configuration (sanitized):**
```bash
jq '.mcpServers | keys' mcp-servers.json
```

### Support Channels

- GitHub Issues: https://github.com/ollieb89/mcp_hub/issues
- Documentation: README.md, CLAUDE.md
- Logs: `~/.local/state/mcp-hub/logs/mcp-hub.log`

---

## Prevention Best Practices

1. **Use health checks in production**
2. **Configure auto-restart (systemd/supervisord)**
3. **Monitor logs for warnings**
4. **Keep MCP Hub updated**
5. **Use connection pooling for remote servers**
6. **Configure proper resource limits**
7. **Test configuration changes in staging first**
8. **Document custom configurations**
9. **Regular backup of workspace cache**
10. **Monitor port conflicts**
