import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import ReconnectingEventSource from "reconnecting-eventsource";
import MCPHubOAuthProvider from "./utils/oauth-provider.js"
import {
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  GetPromptResultSchema,
  CallToolResultSchema,
  ReadResourceResultSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ListPromptsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import EventEmitter from "events";
import logger from "./utils/logger.js";
import open from "open";
import {
  ConnectionError,
  ToolError,
  ServerError,
  ResourceError,
  wrapError,
} from "./utils/errors.js";
import { DevWatcher } from "./utils/dev-watcher.js";
import { envResolver } from "./utils/env-resolver.js";
import { CONNECTION_STATUS, TIMEOUTS } from "./utils/constants.js";

// Alias for backward compatibility
const ConnectionStatus = CONNECTION_STATUS;


/**
 * MCPConnection manages a single MCP server connection, handling transport setup,
 * capability discovery, tool execution, resource access, and OAuth authentication.
 * 
 * @class MCPConnection
 * @extends {EventEmitter}
 * 
 * @emits {toolsChanged} When tools list changes
 * @emits {resourcesChanged} When resources list changes
 * @emits {promptsChanged} When prompts list changes
 * @emits {notification} When server sends a notification
 * @emits {devServerRestarting} When dev mode server is restarting
 * @emits {devServerRestarted} When dev mode server has restarted
 * @emits {hubStateChanged} When hub state changes
 */
export class MCPConnection extends EventEmitter {
  /**
   * Create a new MCPConnection instance.
   * 
   * @param {string} name - Server identifier (MCP ID)
   * @param {Object} config - Server configuration (command, args, env, url, headers, etc.)
   * @param {Object} marketplace - Marketplace instance for server metadata
   * @param {string} hubServerUrl - Hub server URL for OAuth callbacks
   */
  constructor(name, config, marketplace, hubServerUrl) {
    super();
    this.name = name; // Keep as mcpId

    // OAuth state
    this.authProvider = null;
    this.authCallback = null;
    this.authCode = null;

    // Dev watcher for file changes (stdio servers only)
    this.devWatcher = null;

    // Set display name from marketplace
    this.displayName = name; // Default to mcpId
    let serverDescription = ""
    if (marketplace?.cache?.catalog?.items) {
      const item = marketplace.cache.catalog.items.find(
        (item) => item.mcpId === name
      );
      if (item?.name) {
        this.displayName = item.name;
        serverDescription = item.description || ""
        logger.debug(`Using marketplace name for server '${name}'`, {
          name,
          displayName: item.name,
        });
      }
    }
    this.config = config;
    this.description = config.description ? config.description : serverDescription
    this.client = null;
    this.transport = null;
    this.transportType = config.type; // Store the transport type from config
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.resourceTemplates = [];
    this.status = config.disabled ? ConnectionStatus.DISABLED : ConnectionStatus.DISCONNECTED;
    this.error = null;
    this.startTime = null;
    this.lastStarted = null;
    this.disabled = config.disabled || false;
    this.authorizationUrl = null;
    this.hubServerUrl = hubServerUrl;
    this.serverInfo = null; // Will store server's reported name/version

    // Initialize dev watcher for stdio servers with dev config
    if (this.transportType === 'stdio' && config.dev) {
      this.devWatcher = new DevWatcher(this.name, config.dev);
      this.devWatcher.on('filesChanged', (data) => this.#handleDevFilesChanged(data));
    }
  }

  /**
   * Start the MCP server connection. If the server is disabled, it will be enabled.
   * If already connected, returns current server information.
   * 
   * @returns {Promise<Object>} Server information object
   * @throws {ConnectionError} If connection fails
   */
  async start() {
    // If disabled, enable it
    if (this.disabled) {
      this.disabled = false;
      this.config.disabled = false;
      this.status = ConnectionStatus.DISCONNECTED;
    }

    // If already connected, return current state
    if (this.status === ConnectionStatus.CONNECTED) {
      return this.getServerInfo();
    }

    await this.connect();
    return this.getServerInfo();
  }

  /**
   * Stop the MCP server connection. Optionally disable the server to prevent reconnection.
   * 
   * @param {boolean} [disable=false] - If true, disable the server after stopping
   * @returns {Promise<Object>} Server information object
   */
  async stop(disable = false) {
    if (disable) {
      this.disabled = true;
      this.config.disabled = true;
      this.status = ConnectionStatus.DISABLED;
    }

    // if (this.status !== "disconnected") {
    await this.disconnect();
    // }

    return this.getServerInfo();
  }

  /**
   * Calculate the server uptime in seconds since the last successful connection.
   * Returns 0 if the server has never been connected or is not currently running.
   * 
   * @returns {number} Uptime in seconds (0 if disconnected)
   */
  getUptime() {
    if (!this.startTime || ![ConnectionStatus.CONNECTED, ConnectionStatus.DISABLED].includes(this.status)) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Connect to the MCP server using the configured transport type (stdio, SSE, or HTTP).
   * Establishes transport connection, fetches server capabilities, and sets up event handlers.
   * 
   * @param {Object} [config] - Optional updated configuration to use
   * @returns {Promise<void>}
   * @throws {ConnectionError} If connection fails
   * @emits {toolsChanged} When tools are discovered
   * @emits {resourcesChanged} When resources are discovered
   * @emits {promptsChanged} When prompts are discovered
   */
  async connect(config) {
    try {
      if (config) {
        this.config = config
      }
      if (this.config?.name) {
        this.displayName = this.config.name
      }
      if (this.disabled) {
        this.status = ConnectionStatus.DISABLED;
        this.startTime = Date.now(); // Track uptime even when disabled
        this.lastStarted = new Date().toISOString();
        return;
      }

      this.error = null;
      this.status = ConnectionStatus.CONNECTING;
      this.lastStarted = new Date().toISOString();

      // Resolve config once for all transport types
      const resolvedConfig = await envResolver.resolveConfig(this.config, [
        'env', 'args', 'command', 'url', 'headers', 'cwd'
      ]);

      try {
        // Create appropriate transport based on transport type
        if (this.transportType === 'stdio') {
          this.transport = await this._createStdioTransport(resolvedConfig);
          this.client = this._createClient();
          await this.client.connect(this.transport, {
            timeout: TIMEOUTS.CLIENT_CONNECT
          });
        } else {
          //First try the new http transport with fallback to deprecated sse transport
          try {
            this.authProvider = this._createOAuthProvider()
            this.transport = await this._createStreambleHTTPTransport(this.authProvider, resolvedConfig)
            this.client = this._createClient();
            await this.client.connect(this.transport, {
              timeout: TIMEOUTS.CLIENT_CONNECT
            });
          } catch (httpError) {
            try {
              //catches 401 error from http transport
              if (this._isAuthError(httpError)) {
                logger.debug(`'${this.name}' streamable-http transport needs authorization: ${httpError.message}`);
                return this._handleUnauthorizedConnection()
              } else {
                logger.debug(`'${this.name}' streamable-http error: ${httpError.message}. Falling back to SSE transport`);
                this.authProvider = this._createOAuthProvider()
                this.transport = await this._createSSETransport(this.authProvider, resolvedConfig);
                this.client = this._createClient();
                await this.client.connect(this.transport, {
                  timeout: TIMEOUTS.CLIENT_CONNECT
                });
              }
            } catch (sseError) {

              //catches 401 error from sse transport
              if (this._isAuthError(sseError)) {
                logger.debug(`'${this.name}' SSE transport needs authorization: ${sseError.message}`);
                return this._handleUnauthorizedConnection()
              } else {
                logger.debug(`'${this.name}' failed to start connection with http and sse transports: ${sseError.message}`);
                throw sseError
              }
            }
          }
        }

        // Fetch server info and initial capabilities before marking as connected
        await this.fetchServerInfo();
        await this.updateCapabilities();

        // Set up notification handlers
        this.setupNotificationHandlers();

        // Only mark as connected after capabilities are fetched
        this.status = ConnectionStatus.CONNECTED;
        this.startTime = Date.now();
        this.error = null;

        // Start dev watcher if configured
        if (this.devWatcher) {
          await this.devWatcher.start(this.config.dev);
        }

        logger.info(`'${this.name}' MCP server connected`);
      } catch (error) {
        // Ensure proper cleanup on error using finally-like pattern
        await this.cleanup(error.message);
        throw new ConnectionError(
          `Failed to connect to "${this.name}" MCP server: ${error.message}`,
          {
            server: this.name,
            error: error.message,
          }
        );
      }
    } catch (error) {
      // Outer catch for any errors during connection process
      // Cleanup has already been handled above
      throw error;
    }
  }

  removeNotificationHandlers() {
    if (!this.client) return
    // Remove all notification handlers
    // For some reason removeNotificationHandlers doesn't seem to work 
    // so we are setting them to nothing
    const nothing = () => { };
    this.client.setNotificationHandler(ToolListChangedNotificationSchema, nothing)
    this.client.setNotificationHandler(ResourceListChangedNotificationSchema, nothing)
    this.client.setNotificationHandler(PromptListChangedNotificationSchema, nothing)
    this.client.setNotificationHandler(LoggingMessageNotificationSchema, nothing)
  }

  /**
   * Setup notification handlers for this connection.
   * Automatically removes existing handlers before adding new ones to prevent duplicates.
   */
  setupNotificationHandlers() {
    if (!this.client) return;

    // Remove existing handlers first to prevent duplicates
    this.removeNotificationHandlers();

    // Handle general logging messages
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification) => {
        let params = notification.params || {};
        let data = params.data || {};
        let level = params.level || "debug";
        logger.debug(`["${this.name}" server ${level} log]: ${JSON.stringify(data, null, 2)}`);
      }
    );

    const map = {
      "tools": ToolListChangedNotificationSchema,
      "resources": ResourceListChangedNotificationSchema,
      "prompts": PromptListChangedNotificationSchema,
    };

    // Handle capability change notifications
    Object.keys(map).forEach(type => {
      this.client.setNotificationHandler(map[type], async () => {
        logger.debug(`Received ${type}Changed notification`);
        await this.updateCapabilities(type === "resources" ? ["resources", "resourceTemplates"] : [type]);
        const updatedData = type === "resources" ? {
          resources: this.resources,
          resourceTemplates: this.resourceTemplates,
        } : {
          [type]: this[type],
        };
        this.emit(`${type}Changed`, {
          server: this.name,
          ...updatedData,
        });
      });
    });
  }


  async fetchServerInfo() {
    if (!this.client) {
      return;
    }

    try {
      // Get server info from the connected server
      this.serverInfo = this.client.getServerVersion();
    } catch (error) {
      logger.debug(`Could not fetch server info for '${this.name}': ${error.message}`);
      this.serverInfo = null;
    }
  }

  async updateCapabilities(capabilitiesToUpdate) {
    //skip for disabled servers
    if (!this.client) {
      return;
    }
    // Helper function to safely request capabilities
    const safeRequest = async (method, schema) => {
      try {
        const response = await this.client.request({ method }, schema);
        return response;
      } catch {
        // logger.debug( `Server '${this.name}' does not support capability '${method}'`);
        return null;
      }
    };
    const map = {
      tools: {
        method: "tools/list",
        schema: ListToolsResultSchema,
      },
      resources: {
        method: "resources/list",
        schema: ListResourcesResultSchema,
      },
      resourceTemplates: {
        method: "resources/templates/list",
        schema: ListResourceTemplatesResultSchema,
      },
      prompts: {
        method: "prompts/list",
        schema: ListPromptsResultSchema,
      }
    }

    try {
      const typesToFetch = capabilitiesToUpdate || Object.keys(map);
      const fetchPromises = typesToFetch.map(async (type) => {
        this[type] = (await safeRequest(map[type].method, map[type].schema))?.[type] || [];
      });
      await Promise.all(fetchPromises);
      //TODO: handle pagination
    } catch (error) {
      // Only log as warning since missing capabilities are expected in some cases
      logger.warn(`Error updating capabilities for server '${this.name}'`, {
        server: this.name,
        error: error.message,
      });
    }
  }

  async raw_request(...args) {
    if (!this.client) {
      throw new ToolError("Server not initialized", {
        server: this.name,
      });
    }
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ServerError("Server not connected", {
        server: this.name,
        status: this.status,
      });
    }

    try {
      return await this.client.request(...args);
    } catch (error) {
      throw wrapError(error, "RAW_REQUEST_ERROR", {
        server: this.name,
      });
    }
  }


  /**
   * Get a prompt from the MCP server.
   * 
   * @param {string} promptName - Name of the prompt to retrieve
   * @param {Object|Array|null} [args] - Prompt arguments (object, array, or null)
   * @param {Object} [request_options] - Additional request options
   * @returns {Promise<Object>} Prompt content
   * @throws {ToolError} If prompt retrieval fails or prompt not found
   * @throws {ConnectionError} If server not connected
   * 
   * @example
   * // Get a prompt with arguments
   * const prompt = await connection.getPrompt('summarize', { text: 'Long text...' });
   */
  async getPrompt(promptName, args, request_options) {
    if (!this.client) {
      throw new ToolError("Server not initialized", {
        server: this.name,
        prompt: promptName,
      });
    }
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ToolError("Server not connected", {
        server: this.name,
        prompt: promptName,
        status: this.status,
      });
    }

    const prompt = this.prompts.find((p) => p.name === promptName);
    if (!prompt) {
      throw new ToolError("Prompt not found", {
        server: this.name,
        prompt: promptName,
        availablePrompts: this.prompts.map((p) => p.name),
      });
    }
    //check args, it should be either a list or an object or null
    if (args && !Array.isArray(args) && typeof args !== "object") {
      throw new ToolError("Invalid arguments", {
        server: this.name,
        prompt: promptName,
        args,
      });
    }

    try {

      return await this.client.request({
        method: "prompts/get", params: {
          name: promptName,
          arguments: args
        }
      }, GetPromptResultSchema, request_options);
    } catch (error) {
      throw wrapError(error, "PROMPT_EXECUTION_ERROR", {
        server: this.name,
        prompt: promptName,
        args,
      });
    }

  }

  /*
  * | Scenario            | Example Response                                                                 |
    |---------------------|----------------------------------------------------------------------------------|
    | Text Output         | `{ "content": [{ "type": "text", "text": "Hello, World!" }], "isError": false }` |
    | Image Output        | `{ "content": [{ "type": "image", "data": "base64data...", "mimeType": "image/png" }], "isError": false }` |
    | Text Resource       | `{ "content": [{ "type": "resource", "resource": { "uri": "file.txt", "text": "Content" } }], "isError": false }` |
    | Binary Resource     | `{ "content": [{ "type": "resource", "resource": { "uri": "image.jpg", "blob": "base64data...", "mimeType": "image/jpeg" } }], "isError": false }` |
    | Error Case          | `{ "content": [], "isError": true }` (Note: Error details might be in JSON-RPC level) |
    */
  /**
   * Execute a tool on the MCP server.
   * 
   * @param {string} toolName - Name of the tool to execute
   * @param {Object|Array|null} [args] - Tool arguments (object, array, or null)
   * @param {Object} [request_options] - Additional request options
   * @returns {Promise<Object>} Tool execution result
   * @throws {ToolError} If tool execution fails or tool not found
   * @throws {ConnectionError} If server not connected
   * 
   * @example
   * // Execute a tool with arguments
   * const result = await connection.callTool('readFile', { path: '/tmp/file.txt' });
   */
  async callTool(toolName, args, request_options) {
    if (!this.client) {
      throw new ToolError("Server not initialized", {
        server: this.name,
        tool: toolName,
      });
    }

    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ToolError("Server not connected", {
        server: this.name,
        tool: toolName,
        status: this.status,
      });
    }

    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new ToolError("Tool not found", {
        server: this.name,
        tool: toolName,
        availableTools: this.tools.map((t) => t.name),
      });
    }

    //check args, it should be either a list or an object or null
    if (args && !Array.isArray(args) && typeof args !== "object") {
      throw new ToolError("Invalid arguments", {
        server: this.name,
        tool: toolName,
        args,
      });
    }

    try {
      return await this.client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        },
        CallToolResultSchema,
        request_options
      );
    } catch (error) {
      throw wrapError(error, "TOOL_EXECUTION_ERROR", {
        server: this.name,
        tool: toolName,
        args,
      });
    }
  }

  /*
  * | Scenario                     | Example Response                                                                 |
    |------------------------------|----------------------------------------------------------------------------------|
    | Text Resource                | `{ "contents": [{ "uri": "file.txt", "text": "This is the content of the file." }] }` |
    | Binary Resource without `mimeType` | `{ "contents": [{ "uri": "image.jpg", "blob": "base64encodeddata..." }] }`         |
    | Binary Resource with `mimeType` | `{ "contents": [{ "uri": "image.jpg", "mimeType": "image/jpeg", "blob": "base64encodeddata..." }] }` |
    | Multiple Resources           | `{ "contents": [{ "uri": "file1.txt", "text": "Content of file1" }, { "uri": "file2.png", "blob": "base64encodeddata..." }] }` |
    | No Resources (empty)         | `{ "contents": [] }`                                                             |
  */

  /**
   * Read a resource from the MCP server.
   * 
   * @param {string} uri - Resource URI to read
   * @param {Object} [request_options] - Additional request options
   * @returns {Promise<Object>} Resource content
   * @throws {ResourceError} If resource read fails or resource not found
   * @throws {ConnectionError} If server not connected
   * 
   * @example
   * // Read a text resource
   * const resource = await connection.readResource('file:///tmp/file.txt');
   */
  async readResource(uri, request_options) {
    if (!this.client) {
      throw new ResourceError("Server not initialized", {
        server: this.name,
        uri,
      });
    }

    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ResourceError("Server not connected", {
        server: this.name,
        uri,
        status: this.status,
      });
    }

    // const isValidResource =
    //   this.resources.some((r) => r.uri === uri) ||
    //   this.resourceTemplates.some((t) => {
    //     // Convert template to regex pattern
    //     const pattern = t.uriTemplate.replace(/\{[^}]+\}/g, "[^/]+");
    //     return new RegExp(`^${pattern}$`).test(uri);
    //   });

    // if (!isValidResource) {
    //   throw new ResourceError(`Resource not found : ${uri}`, {
    //     server: this.name,
    //     uri,
    //     availableResources: this.resources.map((r) => r.uri),
    //     availableTemplates: this.resourceTemplates.map((t) => t.uriTemplate),
    //   });
    // }

    try {
      return await this.client.request(
        {
          method: "resources/read",
          params: { uri },
        },
        ReadResourceResultSchema,
        request_options
      );
    } catch (error) {
      throw wrapError(error, "RESOURCE_READ_ERROR", {
        server: this.name,
        uri,
      });
    }
  }



  /**
   * Centralized cleanup method that is idempotent and safe to call multiple times.
   * Cleans up all resources: transport, client, devWatcher, event handlers, and state.
   * @param {Error} error - Optional error to store in state after cleanup
   */
  async cleanup(error) {
    // Remove event handlers to prevent memory leaks
    this.removeNotificationHandlers();

    // Stop dev watcher if exists
    if (this.devWatcher) {
      try {
        await this.devWatcher.stop();
      } catch (err) {
        logger.debug(`'${this.name}': Error stopping dev watcher: ${err.message}`);
      }
      this.devWatcher = null;
    }

    // Close transport if exists
    if (this.transport) {
      // First try to terminate the session gracefully
      if (this.transport.sessionId) {
        try {
          logger.debug(`'${this.name}': Terminating session before exit...`);
          await this.transport.terminateSession();
        } catch (err) {
          logger.debug(`'${this.name}': Error terminating session: ${err.message}`);
        }
      }
      try {
        await this.transport.close();
      } catch (err) {
        logger.debug(`'${this.name}': Error closing transport: ${err.message}`);
      }
      this.transport = null;
    }

    // Close client if exists
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        logger.debug(`'${this.name}': Error closing client: ${err.message}`);
      }
      this.client = null;
    }

    // Reset OAuth provider
    this.authProvider = null;

    // Reset state variables
    this.resetState(error);
  }

  async resetState(error) {
    this.client = null;
    this.transport = null;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.resourceTemplates = [];
    this.status = this.config.disabled ? ConnectionStatus.DISABLED : ConnectionStatus.DISCONNECTED;
    this.error = error || null;
    this.startTime = null;
    this.lastStarted = null;
    this.disabled = this.config.disabled || false;
    this.authorizationUrl = null;
    this.authProvider = null;
    this.serverInfo = null;
  }

  /**
   * Disconnect from the MCP server and clean up all resources.
   * 
   * @param {string} [error] - Optional error message to store in state
   * @returns {Promise<void>}
   */
  async disconnect(error) {
    // Use centralized cleanup method
    await this.cleanup(error);
  }

  // Create OAuth provider with proper metadata and storage
  _createOAuthProvider() {
    return new MCPHubOAuthProvider({
      serverName: this.name,
      serverUrl: this.config.url,
      hubServerUrl: this.hubServerUrl
    })
  }

  /**
   * Initiate OAuth authorization flow by opening the authorization URL in the default browser.
   * 
   * @returns {Promise<Object>} Object containing the authorization URL
   * @returns {string} returns.authorizationUrl - The OAuth authorization URL
   * @throws {Error} If no authorization URL is available
   * 
   * @example
   * // Start OAuth flow
   * const { authorizationUrl } = await connection.authorize();
   * // Browser opens automatically for user to authorize
   */
  async authorize() {
    if (!this.authorizationUrl) {
      throw new Error(`No authorization URL available for server '${this.name}'`);
    }
    //validate
    new URL(this.authorizationUrl)
    // log it in cases where the user in a browserless environment
    logger.info(`Opening authorization URL for server '${this.name}': ${this.authorizationUrl.toString()}`);
    // Open the authorization URL in the default browser 
    await open(this.authorizationUrl.toString())
    //Once the user authorizes, handleAuthCallback is called.
    return {
      authorizationUrl: this.authorizationUrl,
    }
  }

  /**
   * Reconnect to the MCP server. First disconnects any existing connection, then establishes a new one.
   * 
   * @returns {Promise<void>}
   * @throws {ConnectionError} If reconnection fails
   * 
   * @example
   * // Reconnect after connection loss
   * await connection.reconnect();
   */
  async reconnect() {
    if (this.client) {
      try {
        await this.disconnect();
      }
      catch (error) {
        // Log but continue - disconnect errors shouldn't block reconnection
        logger.debug(`'${this.name}': Error during disconnect before reconnect: ${error.message}`);
        this.resetState();
      }
    }
    await this.connect();
  }

  /**
   * Handle OAuth callback with authorization code exchange.
   * Called after user completes authorization in the browser.
   * 
   * @param {string} code - Authorization code from OAuth provider
   * @returns {Promise<void>}
   * @throws {Error} If transport not available or authorization fails
   * @emits {hubStateChanged} When hub state changes after authorization
   */
  async handleAuthCallback(code) {
    if (!this.transport) {
      throw new Error(`No transport available for server '${this.name}'`);
    }
    
    logger.debug(`Handling OAuth callback for server '${this.name}'`);
    await this.transport.finishAuth(code);
    logger.debug(`Successful code exchange for '${this.name}': Authorized, connecting with new tokens`);
    await this.connect()
  }

  /**
   * Get comprehensive server information including status, capabilities, and metadata.
   * 
   * @returns {Object} Server information object with:
   * @returns {string} returns.name - Server identifier (MCP ID)
   * @returns {string} returns.displayName - Friendly display name from marketplace
   * @returns {string} returns.description - Server description
   * @returns {string} returns.transportType - Transport type ('stdio', 'sse', or 'streamable-http')
   * @returns {string} returns.status - Connection status ('connected', 'connecting', 'disconnected', etc.)
   * @returns {string|null} returns.error - Error message if connection failed
   * @returns {Object} returns.capabilities - Server capabilities (tools, resources, prompts, etc.)
   * @returns {number} returns.uptime - Server uptime in seconds
   * @returns {string|null} returns.lastStarted - ISO timestamp of last connection attempt
   * @returns {string|null} returns.authorizationUrl - OAuth authorization URL if needed
   * @returns {Object|null} returns.serverInfo - Server-reported metadata (name, version)
   * @returns {string} returns.config_source - Source config file path
   */
  getServerInfo() {
    return {
      name: this.name, // Original mcpId
      displayName: this.displayName, // Friendly name from marketplace
      description: this.description,
      transportType: this.transportType, // Include transport type in server info
      status: this.status,
      error: this.error,
      capabilities: {
        tools: this.tools,
        resources: this.resources,
        resourceTemplates: this.resourceTemplates,
        prompts: this.prompts,
      },
      uptime: this.getUptime(),
      lastStarted: this.lastStarted,
      authorizationUrl: this.authorizationUrl,
      serverInfo: this.serverInfo, // Include server's reported name/version
      config_source: this.config.config_source, // Include which config file this server came from
    };
  }

  async _createStdioTransport(resolvedConfig) {

    // Build serverEnv with resolved values
    const serverEnv = {
      // INFO: getDefaultEnvironment is imp in order to start mcp servers properly
      ...getDefaultEnvironment(),
      ...resolvedConfig.env,
    };

    const transport = new StdioClientTransport({
      cwd: resolvedConfig.cwd,
      command: resolvedConfig.command, // Now supports ${} placeholders too!
      args: resolvedConfig.args,       // Supports both ${} and legacy $VAR
      env: serverEnv,
      stderr: 'pipe',
    });

    //listen to stderr for stdio servers
    const stderrStream = transport.stderr;
    if (stderrStream) {
      stderrStream.on("data", (data) => {
        const errorOutput = data.toString().trim();
        logger.warn(`${this.name} stderr: ${errorOutput}`)
      });
    }
    return transport
  }


  async _createStreambleHTTPTransport(authProvider, resolvedConfig) {

    const options = {
      authProvider,
      requestInit: {
        headers: resolvedConfig.headers, // Already resolved with commands support
      },
      // reconnectionOptions?: StreamableHTTPReconnectionOptions
      // sessionId?: string;
    }
    const transport = new StreamableHTTPClientTransport(new URL(resolvedConfig.url), options);
    return transport
  }

  async _createSSETransport(authProvider, resolvedConfig) {

    // SSE transport setup with reconnection support
    const reconnectingEventSourceOptions = {
      max_retry_time: 5000, // Maximum time between retries (5 seconds)
      // withCredentials: resolvedConfig.headers?.["Authorization"] ? true : false,
    };

    //HACK: sending reconnectingEventSourceOptions in the SSEClientTransport needs us to create custom fetch function with headers created from authProvider tokens. This way we can use ReconnectingEventSource with necessary options
    class ReconnectingES extends ReconnectingEventSource {
      constructor(url, options) {
        super(url, {
          ...options || {},
          ...reconnectingEventSourceOptions
        })
      }
    }
    // Use ReconnectingEventSource for automatic reconnection
    global.EventSource = ReconnectingES
    const transport = new SSEClientTransport(new URL(resolvedConfig.url), {
      requestInit: {
        headers: resolvedConfig.headers, // Already resolved with commands support
      },
      authProvider,
      // INFO:: giving eventSourceInit leading to infinite loop, not needed anymore with global ReconnectingES
      // eventSourceInit: reconnectingEventSourceOptions
    });
    return transport
  }

  _createClient() {
    const client = new Client(
      {
        name: "mcp-hub",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
    client.onerror = (error) => {
      // logger.error("CLIENT_ERROR", `${this.name}: client error: ${error.message}`, {}, false);
      //INFO: onerror is being called for even minor errors, so debug seems more appropriate
      logger.debug(`'${this.name}' error: ${error.message}`)
    };

    client.onclose = () => {
      logger.debug(`'${this.name}' transport closed`)
      //This is causing a bug where in the frontend the server is shown as disconnected when we try disconnect() which sets to disconnected and again connect() which sets to connecting. Having this here negated the connecting status.
      // this.status = [ConnectionStatus.DISCONNECTED, ConnectionStatus.DISABLED].includes(this.status) ? this.status : ConnectionStatus.DISCONNECTED;
      this.startTime = null;
      // Emit close event for handling reconnection if needed
      this.emit("connectionClosed", {
        server: this.name,
        type: this.transportType
      });
    };
    return client
  }

  _isAuthError(error) {
    return error.code === 401 || error instanceof UnauthorizedError
  }

  _handleUnauthorizedConnection() {
    logger.warn(`Server '${this.name}' requires authorization`);
    this.status = ConnectionStatus.UNAUTHORIZED;
    //our custom oauth provider stores auth url generated from redirecthandler rather than opening url  right away
    this.authorizationUrl = this.authProvider.generatedAuthUrl;
    if (!this.authorizationUrl) {
      logger.warn(`No authorization URL available for server '${this.name}'`);
    }
  }

  async #handleDevFilesChanged(data) {
    try {
      logger.debug(`Dev file changes detected, restarting server '${this.name}'`)

      // Emit dev restart starting event
      this.emit('devServerRestarting', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: data.timestamp,
      });
      // Perform restart
      await this.restartForDev();
      // Emit dev restart completed event
      this.emit('devServerRestarted', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: new Date().toISOString(),
        newCapabilities: this.getServerInfo().capabilities,
      });
      logger.debug(`Dev restart completed for server '${this.name}'`);
    } catch (error) {
      logger.error(
        'DEV_RESTART_ERROR',
        `Failed to restart server '${this.name}' after file changes: ${error.message}`,
        {
          server: this.name,
          files: data.relativeFiles,
          error: error.message,
        },
        false
      );
      // Still emit the completed event with error info
      this.emit('devServerRestarted', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  async restartForDev() {
    // Store current config and dev watcher before reset
    const currentConfig = this.config;
    const devWatcher = this.devWatcher; // Preserve dev watcher
    // Disconnect current connection (but keep dev watcher running)
    this.removeNotificationHandlers();
    if (this.transport) {
      await this.transport.close();
    }
    // Reset connection state using resetState
    await this.resetState();
    // Restore dev watcher and set connecting status
    this.devWatcher = devWatcher;
    this.status = ConnectionStatus.CONNECTING;
    // Reconnect with same config
    await this.connect(currentConfig);
  }
}
