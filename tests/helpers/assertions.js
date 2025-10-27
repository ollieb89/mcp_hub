/**
 * Assertion Helpers for Semantic Test Clarity
 *
 * These helpers encapsulate common assertion patterns,
 * making tests more readable and maintainable.
 */

import { expect } from 'vitest';

/**
 * Assert that a server is connected in the hub
 * @param {MCPHub} hub - MCPHub instance
 * @param {string} serverName - Server name to check
 */
export function expectServerConnected(hub, serverName) {
  expect(hub.connections.has(serverName)).toBe(true);
  const status = hub.getServerStatus(serverName);
  expect(status).toBeDefined();
  expect(status.status).toBe('connected');
}

/**
 * Assert that a server is disconnected (not in connections map)
 * @param {MCPHub} hub - MCPHub instance
 * @param {string} serverName - Server name to check
 */
export function expectServerDisconnected(hub, serverName) {
  expect(hub.connections.has(serverName)).toBe(false);
}

/**
 * Assert that a tool call was successful
 * @param {Object} result - Tool call result
 */
export function expectToolCallSuccess(result) {
  expect(result).toBeDefined();
  expect(result).toHaveProperty('content');
  expect(result.isError).toBe(false);
}

/**
 * Assert that a resource read was successful
 * @param {Object} result - Resource read result
 */
export function expectResourceReadSuccess(result) {
  expect(result).toBeDefined();
  expect(result).toHaveProperty('contents');
}

/**
 * Assert server error structure and details
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 * @param {string} serverName - Expected server name in details
 */
export function expectServerError(error, code, serverName) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
  expect(error.data.server).toBe(serverName);
}

/**
 * Assert connection error structure
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 */
export function expectConnectionError(error, code) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
}

/**
 * Assert tool error structure
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 * @param {string} toolName - Expected tool name in details
 */
export function expectToolError(error, code, toolName) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
  expect(error.data.tool).toBe(toolName);
}

/**
 * Assert resource error structure
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 * @param {string} uri - Expected resource URI in details
 */
export function expectResourceError(error, code, uri) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
  expect(error.data.uri).toBe(uri);
}

/**
 * Assert configuration error structure
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 */
export function expectConfigError(error, code) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
}

/**
 * Assert validation error structure
 * @param {Error} error - Error object
 * @param {string} code - Expected error code
 * @param {string} field - Expected field name in details
 */
export function expectValidationError(error, code, field) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.data).toBeDefined();
  expect(error.data.field).toBe(field);
}

/**
 * Assert that a tool call result has the expected content
 * @param {Object} result - Tool call result
 * @param {string} expectedText - Expected text in content
 */
export function expectToolCallContent(result, expectedText) {
  expectToolCallSuccess(result);
  expect(result.content).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining(expectedText)
      })
    ])
  );
}

/**
 * Assert that a resource read result has the expected content
 * @param {Object} result - Resource read result
 * @param {string} expectedUri - Expected resource URI
 */
export function expectResourceContent(result, expectedUri) {
  expectResourceReadSuccess(result);
  expect(result.contents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        uri: expectedUri
      })
    ])
  );
}

/**
 * Assert that a server has the expected capabilities
 * @param {Object} status - Server status object
 * @param {number} expectedTools - Expected number of tools
 * @param {number} expectedResources - Expected number of resources
 * @param {number} expectedPrompts - Expected number of prompts
 */
export function expectServerCapabilities(status, expectedTools = 0, expectedResources = 0, expectedPrompts = 0) {
  expect(status.capabilities).toBeDefined();
  expect(status.capabilities.tools).toBeDefined();
  expect(status.capabilities.resources).toBeDefined();
  expect(status.capabilities.prompts).toBeDefined();
  expect(status.capabilities.tools.length).toBe(expectedTools);
  expect(status.capabilities.resources.length).toBe(expectedResources);
  expect(status.capabilities.prompts.length).toBe(expectedPrompts);
}

/**
 * Assert that multiple servers are connected
 * @param {MCPHub} hub - MCPHub instance
 * @param {Array<string>} serverNames - Array of server names
 */
export function expectAllServersConnected(hub, serverNames) {
  serverNames.forEach(name => {
    expectServerConnected(hub, name);
  });
  expect(hub.connections.size).toBe(serverNames.length);
}

/**
 * Assert that the hub has no active connections
 * @param {MCPHub} hub - MCPHub instance
 */
export function expectNoActiveConnections(hub) {
  expect(hub.connections.size).toBe(0);
}

