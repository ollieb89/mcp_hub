/**
 * @fileoverview Shared constants for MCP Hub
 * @module utils/constants
 */

/**
 * Timeout values in milliseconds
 * @readonly
 * @enum {number}
 */
export const TIMEOUTS = {
  /** Default command execution timeout (30 seconds) */
  COMMAND_EXECUTION: 30000,
  
  /** Client connection timeout (5 minutes) */
  CLIENT_CONNECT: 5 * 60 * 1000,
  
  /** MCP request timeout (5 minutes) */
  MCP_REQUEST: 5 * 60 * 1000,
};

/**
 * Connection status states
 * @readonly
 * @enum {string}
 */
export const CONNECTION_STATUS = {
  /** Server is connected and operational */
  CONNECTED: 'connected',
  
  /** Server is in the process of connecting */
  CONNECTING: 'connecting',
  
  /** Server is not connected */
  DISCONNECTED: 'disconnected',
  
  /** Server requires OAuth authorization */
  UNAUTHORIZED: 'unauthorized',
  
  /** Server is disabled in configuration */
  DISABLED: 'disabled',
};

/**
 * Delimiter used for namespacing capabilities
 * Used to prevent naming conflicts when multiple servers provide the same capability
 * Example: "filesystem__search", "github__search"
 * @type {string}
 * @readonly
 */
export const CAPABILITY_DELIMITER = '__';

/**
 * Internal server name for the MCP Hub endpoint
 * @type {string}
 * @readonly
 */
export const HUB_INTERNAL_SERVER_NAME = 'mcp-hub-internal-endpoint';

/**
 * Maximum depth for placeholder resolution to prevent infinite loops
 * @type {number}
 * @readonly
 */
export const MAX_RESOLUTION_DEPTH = 10;

/**
 * Cache TTL for marketplace data (1 hour)
 * @type {number}
 * @readonly
 */
export const MARKETPLACE_CACHE_TTL = 60 * 60 * 1000;

/**
 * Command execution timeout (same as COMMAND_EXECUTION for backward compatibility)
 * @deprecated Use TIMEOUTS.COMMAND_EXECUTION instead
 * @type {number}
 */
export const COMMAND_TIMEOUT = TIMEOUTS.COMMAND_EXECUTION;
