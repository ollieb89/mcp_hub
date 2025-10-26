# MCP Hub - Common Development Workflows

## Adding a New Server Configuration Option

### Steps
1. **Update ConfigManager** (`src/utils/config.js`)
   - Add validation for new option in schema
   - Update deep merge logic if needed for complex types
   - Add to change detection logic

2. **Update MCPConnection** (`src/MCPConnection.js`)
   - Add property to constructor to store the option
   - Handle option in appropriate transport type
   - Add initialization logic if needed

3. **Update EnvResolver** (if option needs placeholder resolution)
   - Add field to `fieldsToResolve` array in `resolveConfig()`
   - Add specific resolution logic if special handling needed

4. **Add Tests**
   - Unit test in `tests/config.test.js` for parsing
   - Integration test in `tests/MCPConnection.test.js` for behavior
   - Test placeholder resolution if applicable

5. **Update Documentation**
   - Add to README.md configuration section
   - Update CLAUDE.md if architecturally significant
   - Add example configuration

### Example: Adding "timeout" Option
```javascript
// 1. In config.js - add validation
validateServerConfig(config) {
  // ... existing validation
  if (config.timeout && typeof config.timeout !== 'number') {
    throw new ConfigError('timeout must be a number');
  }
}

// 2. In MCPConnection.js - use option
constructor(name, config, ...) {
  this.timeout = config.timeout || 30000; // default 30s
}

// 3. In env-resolver.js - resolve if needed
async resolveConfig(config, fieldsToResolve = [..., 'timeout']) {
  // timeout will be resolved if it contains placeholders
}
```

## Adding a New API Endpoint

### Steps
1. **Define Route** (`src/utils/router.js`)
   - Use `registerRoute()` helper for consistent structure
   - Choose appropriate HTTP method (GET, POST, PUT, DELETE)
   - Define path with parameters if needed

2. **Add Request Validation**
   - Validate request body/params/query
   - Throw ValidationError for invalid requests
   - Check server existence/connection state if applicable

3. **Implement Handler**
   - Access hub/connections via serviceManager
   - Call appropriate MCPHub/MCPConnection methods
   - Handle errors with try/catch

4. **Return Consistent Response**
   - Always include timestamp
   - Use standard format: `{ status, data, timestamp }`
   - Let error middleware handle errors

5. **Add Tests**
   - Create test in `tests/` directory
   - Use supertest for HTTP testing
   - Test success cases, validation, and error cases

### Example: Adding Server Metrics Endpoint
```javascript
// In router.js
registerRoute({
  method: 'GET',
  path: '/servers/:name/metrics',
  description: 'Get server performance metrics',
  handler: async (req, res) => {
    const { name } = req.params;
    
    // Validation
    const hub = serviceManager.mcpHub;
    const connection = hub.connections.get(name);
    if (!connection) {
      throw new ValidationError('Server not found', { server: name });
    }
    
    // Get metrics
    const metrics = {
      uptime: Date.now() - connection.startTime,
      toolCallCount: connection.toolCallCount || 0,
      status: connection.status
    };
    
    // Return response
    res.json({
      status: 'ok',
      metrics,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Adding a New Event Type

### Steps
1. **Define Event Type** (`src/utils/sse-manager.js`)
   - Add to EventTypes or SubscriptionTypes enum
   - Document event structure in JSDoc

2. **Emit from Component**
   - Identify where event should originate (MCPConnection, MCPHub, ServiceManager)
   - Call appropriate emit method
   - Include all necessary data

3. **Add SSE Broadcast** (if needed)
   - In ServiceManager, listen to event
   - Call `broadcastSubscriptionEvent()` or `broadcast()`
   - Format data consistently

4. **Update Documentation**
   - Add to README.md event types section
   - Document event payload structure
   - Provide usage examples

5. **Add Tests**
   - Verify event is emitted with correct data
   - Test SSE broadcast if applicable
   - Validate event payload structure

### Example: Adding "serverHealthCheck" Event
```javascript
// 1. In sse-manager.js
export const SubscriptionTypes = {
  // ... existing types
  SERVER_HEALTH_CHECK: 'server_health_check'
};

// 2. In MCPConnection.js - emit event
async checkHealth() {
  const health = {
    status: this.status,
    uptime: Date.now() - this.startTime,
    toolCount: this.tools.length
  };
  
  this.emit('healthCheck', { server: this.name, health });
  return health;
}

// 3. In server.js - broadcast via SSE
this.mcpHub.on('healthCheck', (data) => {
  this.broadcastSubscriptionEvent(
    SubscriptionTypes.SERVER_HEALTH_CHECK,
    data
  );
});
```

## Debugging Connection Issues

### STDIO Transport Issues

**Symptom**: Server fails to start or immediately disconnects

**Debug Steps**:
1. Check logs: `tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log`
2. Verify command exists: `which <command>`
3. Test command manually: `<command> <args>` in terminal
4. Check environment resolution:
   - Add debug logging in env-resolver.js
   - Verify placeholders resolve correctly
   - Check MCP_HUB_ENV is valid JSON if used
5. Verify cwd path exists and is accessible
6. Check process spawn errors in logs

**Common Issues**:
- Command not in PATH
- Missing environment variables
- Invalid placeholder syntax
- Incorrect working directory

### Remote Transport Issues (SSE/streamable-http)

**Symptom**: Connection fails or times out

**Debug Steps**:
1. Test URL manually: `curl -v <url>`
2. Check headers/authentication:
   - Verify tokens are resolved correctly
   - Test auth independently
3. Check network connectivity
4. Verify server is running and accessible
5. Check OAuth flow for streamable-http:
   - Verify callback URL is accessible
   - Check authorization URL generation
   - Verify token exchange

**Common Issues**:
- Network firewalls blocking connection
- Invalid authentication tokens
- OAuth callback not reachable
- Server requires additional headers

### OAuth Flow Issues

**Symptom**: Authorization fails or hangs

**Debug Steps**:
1. Check callback endpoint accessibility: `http://localhost:<port>/oauth/callback`
2. Verify browser opens with correct URL
3. Check logs for authorization code reception
4. Verify OAuth provider configuration
5. Test token exchange manually

**Common Issues**:
- Callback URL not accessible (firewall/network)
- Browser security blocking popup
- Invalid OAuth configuration
- Token exchange endpoint unreachable

### Dev Mode Issues

**Symptom**: Hot reload not working

**Debug Steps**:
1. Verify `dev.cwd` is **absolute** path
2. Check watch patterns match changed files
3. Verify chokidar has file access permissions
4. Check logs for file change detection
5. Test file watcher: `chokidar "pattern" --cwd /path`

**Common Issues**:
- Relative cwd path (must be absolute!)
- Watch patterns don't match files
- File system permissions
- Dev mode not enabled in config

## Adding Transport Type

### Steps
1. **Create Transport Client**
   - Add to MCPConnection transport initialization
   - Implement connection/disconnection logic
   - Handle authentication if needed

2. **Add Configuration Support**
   - Update config schema validation
   - Add transport detection logic
   - Update env-resolver if special fields needed

3. **Implement Capability Fetching**
   - Override `fetchCapabilities()` if needed
   - Handle transport-specific responses

4. **Add Error Handling**
   - Handle transport-specific errors
   - Map to standard error classes
   - Add reconnection logic if applicable

5. **Add Tests**
   - Integration test for transport
   - Test connection lifecycle
   - Test error scenarios

## Performance Optimization

### Reducing Startup Time
1. **Parallel Server Connections**: Already implemented with Promise.allSettled()
2. **Capability Caching**: Cache server capabilities in memory
3. **Config File Caching**: Only reload on changes when watching
4. **Lazy Loading**: Connect servers on-demand vs all at startup

### Reducing Memory Usage
1. **Capability Pruning**: Remove unused capability details
2. **Event Listener Management**: Clean up listeners on disconnect
3. **Log Rotation**: Ensure old logs are cleaned up
4. **Cache Eviction**: Clear workspace cache of stale entries

### Improving Response Time
1. **Connection Pooling**: Reuse connections for multiple requests
2. **Request Batching**: Batch multiple MCP requests together
3. **Streaming Responses**: Use SSE for long-running operations
4. **Timeout Optimization**: Tune timeouts based on operation type

## Troubleshooting Workspace Cache

### Symptom: Port already in use

**Debug Steps**:
1. Check workspace cache: `cat ~/.local/state/mcp-hub/workspaces.json`
2. Verify process is running: `ps aux | grep <pid>`
3. Clean stale entries manually if needed
4. Restart with different port

**Fix**:
```javascript
// Force cache cleanup
const cache = new WorkspaceCacheManager({ port });
await cache.cleanup(); // Removes stale entries
```

### Symptom: Auto-shutdown not working

**Debug Steps**:
1. Verify auto-shutdown enabled in options
2. Check shutdown delay configuration
3. Verify SSE connection count is zero
4. Check logs for shutdown trigger events

**Common Issues**:
- Lingering SSE connections not cleaned up
- Shutdown delay too long
- Connection count not updating correctly
