# Contributing to MCP Hub

We love your input! We want to make contributing to MCP Hub as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Testing Guidelines

### Coverage Expectations

MCP Hub uses per-file coverage thresholds configured in `vitest.config.js`:

- **Core Business Logic**: Aim for 70-80%+ coverage
  - `MCPConnection.js`, `MCPHub.js`: Strict thresholds enforced
  - New core components should include comprehensive test coverage

- **Utilities**: Aim for 60-80%+ coverage
  - `env-resolver.js`, `errors.js`, `config.js`: High value per line
  - Focus on edge cases and error handling

- **Infrastructure**: Integration test coverage preferred
  - `server.js`, `sse-manager.js`, `router.js`: E2E tests more valuable than mocking
  - May have lower unit test coverage by design

### Writing Effective Tests

Follow the AAA (Arrange-Act-Assert) pattern with explicit comments:
```javascript
it('should handle connection timeout gracefully', async () => {
  // ARRANGE: Set up test conditions
  const connection = new MCPConnection(config);
  const timeout = 1000;

  // ACT: Execute the operation
  const result = await connection.connect({ timeout });

  // ASSERT: Verify expected outcomes
  expect(result.status).toBe('timeout');
  expect(result.error).toMatch(/timeout/i);
});
```

### Testing the Five "Exit Doors"

Focus on observable outcomes rather than implementation details:

1. **Response**: HTTP status codes, response schemas, headers
2. **State**: Database changes, cache updates, file system modifications
3. **External Calls**: API requests to third-party services
4. **Queues**: Message publishing and consumption
5. **Observability**: Logging, metrics, error handling

### Test Helpers

Reusable helpers are available in `tests/helpers/`:
- `testHelpers.js` - Generic test utilities
- `serverHelpers.js` - MCP server setup/teardown
- `mockFactories.js` - Mock object creation

### Running Tests

```bash
# Development workflow
npm run test:watch         # Interactive watch mode

# Before committing
npm test                   # Full test suite (must pass)
npm run test:coverage      # Verify coverage thresholds

# CI validation
npm test                   # Same as local, runs in GitHub Actions
```

### Test File Naming

- Unit tests: `*.test.js`
- Integration tests: `*.integration.test.js`
- Place tests in `tests/` directory, mirroring `src/` structure

### Pull Request Testing Requirements

- [ ] All existing tests pass (308/308)
- [ ] New features include tests
- [ ] Coverage thresholds maintained
- [ ] No skipped tests (.skip or .todo) without justification
- [ ] Tests follow AAA pattern with explicit comments

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the CHANGELOG.md with notes on your changes.
3. The PR will be merged once you have the sign-off of the maintainers.

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/ollieb89/mcp_hub/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/ollieb89/mcp_hub/issues/new).

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/a9316a723f9e918afde44dea68b5f9f39b7d9b00/CONTRIBUTING.md).
