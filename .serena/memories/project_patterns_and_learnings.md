# MCP Hub - Project Patterns and Learnings

## Architecture Insights

### Connection Management
- MCPConnection handles individual server connections
- Supports multiple transport types: STDIO, SSE, StreamableHTTP
- OAuth support with PKCE flow
- Connection states: connected, connecting, disconnected, unauthorized, disabled

### Error Handling Patterns
- Use Promise.allSettled instead of Promise.all for parallel operations
- Always include server name in error logs for debugging
- Defensive programming: null checks in all error paths
- Try-catch blocks around cleanup operations

### Testing Strategies
- TDD approach works well for bug fixes
- Integration tests need careful mock setup
- Logger mock must include all methods (info, warn, debug, error)
- Mock setup issues discovered - needs standardization

### Code Quality Issues Fixed
1. Variable scope bugs (use `this.property` not `property`)
2. Missing null checks in error paths
3. Promise error handling improvements
4. Test coverage gaps in integration tests

## Development Workflow
- Agile sprint-based development
- Clear user stories with acceptance criteria
- TDD approach for critical fixes
- Comprehensive documentation throughout
- Proper git workflow with meaningful commits

## Common Pitfalls
1. Forgetting to use `this.` for class properties
2. Missing null checks in cleanup code
3. Not handling all error paths in promises
4. Incomplete test mocks causing test failures
5. Inconsistent mock patterns across test files

## Best Practices Established
1. Always write tests first for bug fixes
2. Include comprehensive error handling
3. Document all changes with clear commit messages
4. Follow TDD approach for reliability
5. Include null checks in all error paths