# Sprint 2 Helper Utilities Reference

## Helper Files Location
- tests/helpers/mocks.js (144 lines)
- tests/helpers/fixtures.js (202 lines)
- tests/helpers/assertions.js (194 lines)

## Mock Factories (mocks.js)

1. **createMockLogger()** - Logger with all methods mocked
2. **createMockConfigManager()** - Config manager with load/watch methods
3. **createMockConnection()** - MCP connection with all lifecycle methods
4. **createMockRequest()** - Express request object
5. **createMockResponse()** - Express response object
6. **createMockServiceManager()** - Service manager with lifecycle methods

## Fixture Generators (fixtures.js)

1. **createTestConfig()** - Base test configuration
2. **createServerConfig()** - Server configuration
3. **createToolResponse()** - Tool execution response
4. **createResourceResponse()** - Resource read response
5. **createServerStatus()** - Server status object
6. **createToolList()** - List of tools
7. **createResourceList()** - List of resources
8. **createPromptList()** - List of prompts
9. **createServerInfo()** - Server info object
10. **createMultiServerConfig()** - Multi-server configuration
11. **createDisabledServerConfig()** - Disabled server configuration
12. **createConnectionConfig()** - Connection configuration
13. **createMockTransport()** - Transport mock
14. **createMockClient()** - Client mock

## Assertion Helpers (assertions.js)

1. **expectServerConnected()** - Verify server is connected
2. **expectServerDisconnected()** - Verify server is disconnected
3. **expectToolCallSuccess()** - Verify successful tool execution
4. **expectResourceReadSuccess()** - Verify successful resource read
5. **expectServerError()** - Verify server error
6. **expectConnectionError()** - Verify connection error
7. **expectToolError()** - Verify tool error
8. **expectResourceError()** - Verify resource error
9. **expectConfigError()** - Verify configuration error
10. **expectValidationError()** - Verify validation error
11. **expectToolCallContent()** - Verify tool call content
12. **expectResourceContent()** - Verify resource content
13. **expectServerCapabilities()** - Verify server capabilities
14. **expectAllServersConnected()** - Verify all servers connected
15. **expectNoActiveConnections()** - Verify no active connections
16. **expectConnectionStatus()** - Verify connection status
17. **expectConnectionTools()** - Verify connection tools
18. **expectConnectionResources()** - Verify connection resources
19. **expectConnectionPrompts()** - Verify connection prompts

## Usage Pattern

```javascript
// ARRANGE: Setup test data and mocks
const config = createTestConfig();
const mockConfigManager = createMockConfigManager();

// ACT: Execute code under test
const hub = new MCPHub(config);

// ASSERT: Verify observable behavior
expectServerConnected(hub, 'server1');
```

## Testing Standards

- Always use AAA pattern (Arrange-Act-Assert)
- Test behavior, not implementation
- Use helper utilities for consistency
- Never assert on logger calls
- Never assert on constructor calls
- Never assert on internal method calls

See tests/TESTING_STANDARDS.md for complete standards.