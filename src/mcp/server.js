/**
 * MCP Hub Server Endpoint - Unified MCP Server Interface
 * 
 * This module creates a single MCP server endpoint that exposes ALL capabilities
 * from multiple managed MCP servers through one unified interface.
 * 
 * HOW IT WORKS:
 * 1. MCP Hub manages multiple individual MCP servers (like filesystem, github, etc.)
 * 2. This endpoint collects all tools/resources/prompts from those servers
 * 3. It creates a single MCP server that any MCP client can connect to
 * 4. When a client calls a tool, it routes the request to the correct underlying server
 * 
 * BENEFITS:
 * - Users manage all MCP servers in one place through MCP Hub's TUI
 * - MCP clients (like Claude Desktop, Cline, etc.) only need to connect to one endpoint
 * - No need to configure each MCP client with dozens of individual server connections
 * - Automatic capability updates when servers are added/removed/restarted
 * 
 * EXAMPLE:
 * Just configure clients with with:
 * {
 *  "Hub": {
 *    "url": "http://localhost:${port}/mcp"
 *  }
 * }
 * The hub automatically namespaces capabilities to avoid conflicts:
 * - "search" tool from filesystem server becomes "filesystem__search"
 * - "search" tool from github server becomes "github__search"
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  GetPromptResultSchema,
  CallToolResultSchema,
  ReadResourceResultSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { HubState } from "../utils/sse-manager.js";
import logger from "../utils/logger.js";
import { HUB_INTERNAL_SERVER_NAME, CAPABILITY_DELIMITER, TIMEOUTS } from "../utils/constants.js";
import ToolFilteringService from "../utils/tool-filtering-service.js";

// Delimiter for namespacing (backward compatibility alias)
const DELIMITER = CAPABILITY_DELIMITER;
// MCP request timeout (backward compatibility alias)
const MCP_REQUEST_TIMEOUT = TIMEOUTS.MCP_REQUEST;

// Comprehensive capability configuration
const CAPABILITY_TYPES = {
  TOOLS: {
    id: 'tools',
    uidField: 'name',
    syncWithEvents: {
      events: ['toolsChanged'],
      capabilityIds: ['tools'],
      notificationMethod: 'sendToolListChanged'
    },
    listSchema: ListToolsRequestSchema,
    handler: {
      method: "tools/call",
      callSchema: CallToolRequestSchema,
      resultSchema: CallToolResultSchema,
      form_error(error) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        }
      },
      form_params(cap) {
        return {
          name: cap.originalName,
          arguments: {},
        }
      }
    }
  },
  RESOURCES: {
    id: 'resources',
    uidField: 'uri',
    syncWithEvents: {
      events: ['resourcesChanged'],
      capabilityIds: ['resources', 'resourceTemplates'],
      notificationMethod: 'sendResourceListChanged'
    },
    listSchema: ListResourcesRequestSchema,
    handler: {
      method: "resources/read",
      form_error(error) {
        throw new McpError(ErrorCode.InvalidParams, `Failed to read resource: ${error.message}`);
      },
      form_params(cap) {
        return {
          uri: cap.originalName,
        }
      },
      callSchema: ReadResourceRequestSchema,
      resultSchema: ReadResourceResultSchema,
    }
  },
  RESOURCE_TEMPLATES: {
    id: 'resourceTemplates',
    uidField: 'uriTemplate',
    // No syncWithEvents - handled by resources event
    listSchema: ListResourceTemplatesRequestSchema,
    // No callSchema - templates are listed only
    syncWithEvents: {
      events: [],
      capabilityIds: [],
      notificationMethod: 'sendResourceListChanged'
    },
  },
  PROMPTS: {
    id: 'prompts',
    uidField: 'name',
    syncWithEvents: {
      events: ['promptsChanged'],
      capabilityIds: ['prompts'],
      notificationMethod: 'sendPromptListChanged'
    },
    listSchema: ListPromptsRequestSchema,
    handler: {
      method: "prompts/get",
      callSchema: GetPromptRequestSchema,
      resultSchema: GetPromptResultSchema,
      form_params(cap) {
        return {
          name: cap.originalName,
          arguments: {},
        }
      },
      form_error(error) {
        throw new McpError(ErrorCode.InvalidParams, `Failed to read resource: ${error.message}`);
      }
    }
  },
};

/**
 * MCP Server endpoint that exposes all managed server capabilities
 * This allows standard MCP clients to connect to mcp-hub via MCP protocol
 */
export class MCPServerEndpoint {
  constructor(mcpHub) {
    this.mcpHub = mcpHub;
    this.clients = new Map(); // sessionId -> { transport, server }
    this.serversMap = new Map(); // sessionId -> server instance

    // Store ALL available capabilities (global registry)
    this.allCapabilities = {};
    Object.values(CAPABILITY_TYPES).forEach(capType => {
      this.allCapabilities[capType.id] = new Map(); // namespacedName -> { serverName, originalName, definition, category }
    });

    // Store per-client capability exposure (session-based)
    this.clientSessions = new Map(); // sessionId -> { exposedCategories: Set, exposedTools: Map, promptHistory: [] }

    // Backward compatibility: registeredCapabilities points to allCapabilities for non-prompt-based mode
    this.registeredCapabilities = this.allCapabilities;

    // Initialize tool filtering service (Sprint 2)
    const config = this.mcpHub.configManager?.getConfig() || {};
    this.filteringService = new ToolFilteringService(config, this.mcpHub);

    // Read prompt-based filtering configuration
    this.promptBasedConfig = config.toolFiltering?.promptBasedFiltering || {};
    this.filteringMode = config.toolFiltering?.mode || 'static';
    
    // Register hub-internal meta tools if prompt-based filtering is enabled
    if (this.filteringMode === 'prompt-based' && this.promptBasedConfig.enableMetaTools !== false) {
      logger.info(`Registering meta-tools for prompt-based filtering (mode: ${this.filteringMode}, enableMetaTools: ${this.promptBasedConfig.enableMetaTools})`);
      this.registerMetaTools();
      logger.info(`Meta-tools registered: ${this.allCapabilities.tools.size} total tools in allCapabilities`);
    } else {
      logger.warn(`Meta-tools NOT registered: mode=${this.filteringMode}, enableMetaTools=${this.promptBasedConfig.enableMetaTools}`);
    }

    // Setup capability synchronization once
    this.setupCapabilitySync();

    // Initial capability registration
    this.syncCapabilities();
  }

  getEndpointUrl() {
    return `${this.mcpHub.hubServerUrl}/mcp`;
  }

  /**
   * Initialize capabilities for a new client session
   * @param {string} sessionId - Client session identifier
   * @param {string[]} initialCategories - Initial categories to expose (default: from config)
   */
  initializeClientSession(sessionId, initialCategories = null) {
    // Determine initial categories based on configuration
    if (!initialCategories) {
      const defaultExposure = this.promptBasedConfig.defaultExposure || 'meta-only';
      switch (defaultExposure) {
        case 'zero':
          initialCategories = [];
          break;
        case 'meta-only':
          initialCategories = ['meta'];
          break;
        case 'minimal':
          initialCategories = ['meta', 'filesystem', 'memory'];
          break;
        case 'all':
          initialCategories = ['all'];
          break;
        default:
          initialCategories = ['meta'];
      }
    }

    this.clientSessions.set(sessionId, {
      exposedCategories: new Set(initialCategories),
      exposedTools: new Map(), // toolName -> capability
      promptHistory: [],
      createdAt: new Date()
    });

    // Debug checkpoint: Session initialization
    logger.debug({
      sessionId,
      initialCategories,
      defaultExposure: this.promptBasedConfig.defaultExposure,
      filteringMode: this.filteringMode,
      promptBasedEnabled: this.filteringMode === 'prompt-based'
    }, 'CHECKPOINT: Session initialized with tool exposure');

    // Build initial tool list based on categories
    this.updateClientTools(sessionId, initialCategories);
  }

  /**
   * Get capabilities exposed to a specific client session
   * @param {string} sessionId - Client session ID
   * @param {string} capabilityType - Type of capability (tools, resources, etc)
   * @returns {Map} Filtered capability map for this client
   */
  getClientCapabilities(sessionId, capabilityType) {
    // If prompt-based filtering is disabled, return all capabilities
    if (this.filteringMode !== 'prompt-based') {
      return this.allCapabilities[capabilityType];
    }

    // If no session or session doesn't exist, return all capabilities (backward compatibility)
    if (!sessionId || !this.clientSessions.has(sessionId)) {
      return this.allCapabilities[capabilityType];
    }

    const session = this.clientSessions.get(sessionId);
    const allCaps = this.allCapabilities[capabilityType];
    
    // If 'all' category is exposed, return everything
    if (session.exposedCategories.has('all')) {
      return allCaps;
    }
    
    // For tools, filter by exposed categories
    if (capabilityType === CAPABILITY_TYPES.TOOLS.id) {
      const filteredCaps = new Map();
      
      // Always include meta tools
      for (const [name, cap] of allCaps) {
        const category = cap.category || this.getCapabilityCategory(name);
        if (category === 'meta' || session.exposedCategories.has(category)) {
          filteredCaps.set(name, cap);
        }
      }
      
      return filteredCaps;
    }
    
    // For other capability types, return all (or implement filtering as needed)
    return allCaps;
  }

  /**
   * Update client's exposed tool categories with additive or replacement mode
   * @param {string} sessionId - Session identifier
   * @param {string[]} categories - Categories to expose
   * @param {string|boolean} mode - 'additive' (default), 'replacement', or boolean (backward compat)
   * @returns {Promise<{added: string[], total: string[]}>} Categories added and total exposed
   */
  async updateClientTools(sessionId, categories, mode = 'additive') {
    // Backward compatibility: convert boolean to mode string
    if (typeof mode === 'boolean') {
      mode = mode ? 'additive' : 'replacement';
    }

    // Validate session exists
    if (!this.clientSessions.has(sessionId)) {
      logger.warn({ sessionId }, 'Attempted to update tools for non-existent session');
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = this.clientSessions.get(sessionId);
    const addedCategories = [];
    const previousSize = session.exposedCategories.size;
    const previousCategories = Array.from(session.exposedCategories);

    // Apply mode logic
    if (mode === 'additive') {
      // Additive mode: Add new categories, keep existing
      for (const cat of categories) {
        if (!session.exposedCategories.has(cat)) {
          session.exposedCategories.add(cat);
          addedCategories.push(cat);
        }
      }

      logger.debug({
        sessionId,
        mode,
        requestedCategories: categories,
        addedCategories,
        alreadyExposed: categories.filter(cat => !addedCategories.includes(cat))
      }, 'Additive mode: accumulating categories');

    } else if (mode === 'replacement') {
      // Replacement mode: Replace all categories (but always include meta)
      const newCategories = new Set(['meta', ...categories]);

      // Identify what was added
      for (const cat of newCategories) {
        if (!session.exposedCategories.has(cat)) {
          addedCategories.push(cat);
        }
      }

      session.exposedCategories = newCategories;

      logger.debug({
        sessionId,
        mode,
        previousCategories,
        newCategories: Array.from(newCategories),
        addedCategories
      }, 'Replacement mode: reset categories');

    } else {
      throw new Error(`Invalid mode: ${mode}. Use 'additive' or 'replacement'`);
    }

    // Track exposure history
    if (!session.exposureHistory) {
      session.exposureHistory = [];
    }

    session.exposureHistory.push({
      timestamp: Date.now(),
      operation: mode,
      addedCategories: [...addedCategories],
      totalCategories: Array.from(session.exposedCategories)
    });

    // Log the update
    logger.info({
      sessionId,
      mode,
      addedCategories,
      totalCategories: Array.from(session.exposedCategories),
      previousSize,
      newSize: session.exposedCategories.size,
      changed: addedCategories.length > 0
    }, 'Updated client tool exposure');

    // Send notification only if categories actually changed
    if (addedCategories.length > 0) {
      await this.sendToolsChangedNotification(sessionId, addedCategories, mode);
    } else {
      logger.debug({ sessionId },
        'No new categories added, skipping notification');
    }

    // Return result for caller
    return {
      added: addedCategories,
      total: Array.from(session.exposedCategories)
    };
  }

  /**
   * Send tools/list_changed notification to client
   * @param {string} sessionId - Session identifier
   * @param {string[]} addedCategories - Categories just added
   * @param {string} mode - Operation mode ('additive' or 'replacement')
   * @returns {Promise<void>}
   */
  async sendToolsChangedNotification(sessionId, addedCategories, mode) {
    const client = this.clients.get(sessionId);

    if (!client) {
      logger.warn({ sessionId }, 'Cannot send notification: client not found');
      return;
    }

    if (!client.server) {
      logger.warn({ sessionId }, 'Cannot send notification: client.server not available');
      return;
    }

    try {
      // Send MCP notification via SDK method
      await client.server.sendToolListChanged();

      logger.info({
        sessionId,
        addedCategories,
        mode,
        categoriesCount: addedCategories.length
      }, 'Sent tools/list_changed notification to client');
    } catch (error) {
      logger.error({
        sessionId,
        error: error.message,
        stack: error.stack
      }, 'Failed to send tools/list_changed notification');
      // Don't throw - notification failure shouldn't break analysis
    }
  }

  /**
   * Infer category from tool object
   * Extracts namespace prefix from namespaced tools: "github__search" -> "github"
   * @param {Object} tool - Tool object with definition
   * @returns {string} Category name or 'uncategorized'
   */
  inferToolCategory(tool) {
    const toolName = tool?.definition?.name;

    if (!toolName) {
      logger.warn({ tool }, 'Tool missing name in definition');
      return 'uncategorized';
    }

    // Check if it's a meta tool first
    if (toolName.startsWith('hub__')) {
      return 'meta';
    }

    // Extract namespace: "github__search" -> "github"
    const match = toolName.match(/^([^_]+)__/);

    if (match) {
      return match[1].toLowerCase();
    }

    // No namespace found
    logger.debug({ toolName }, 'Tool has no category namespace');
    return 'uncategorized';
  }

  /**
   * Filter tools by session's exposed categories
   * @param {Object} session - Session object with exposedCategories Set
   * @returns {Array} Filtered tools matching exposed categories
   */
  filterToolsBySessionCategories(session) {
    const { exposedCategories } = session;
    const allTools = Array.from(this.allCapabilities.tools.values());

    // If no categories exposed, return empty (zero-default)
    if (exposedCategories.size === 0) {
      logger.debug({ sessionId: session.id }, 'No categories exposed, returning empty tool list');
      return [];
    }

    // Filter tools by category
    const filtered = allTools.filter(tool => {
      const category = tool.category || this.inferToolCategory(tool);
      const included = exposedCategories.has(category);

      if (included) {
        logger.debug({
          tool: tool.definition?.name,
          category,
          sessionId: session.id
        }, 'Tool included in filter');
      }

      return included;
    });

    logger.info({
      sessionId: session.id,
      totalTools: allTools.length,
      filteredTools: filtered.length,
      categories: Array.from(exposedCategories)
    }, 'Filtered tools by session categories');

    return filtered;
  }

  /**
   * Get category for a capability (used for filtering)
   * @param {string} capabilityName - Name of the capability
   * @returns {string} Category name
   */
  getCapabilityCategory(capabilityName) {
    // Extract server prefix (e.g., 'github' from 'github__list_issues')
    const match = capabilityName.match(/^([^_]+)__/);
    if (match) {
      return match[1];
    }
    return 'uncategorized';
  }

  /**
   * Cleanup client session on disconnect
   * @param {string} sessionId - Client session ID to cleanup
   */
  cleanupClientSession(sessionId) {
    if (this.clientSessions.has(sessionId)) {
      this.clientSessions.delete(sessionId);
      logger.debug(`Cleaned up session ${sessionId}`);
    }
  }

  /**
   * Create a new MCP server instance for each connection
   */
  createServer() {
    // Create low-level MCP server instance with unique name
    const server = new Server(
      {
        name: HUB_INTERNAL_SERVER_NAME,
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true
          },
          resources: {
            listChanged: true,
          },
          prompts: {
            listChanged: true,
          },
        },
      }
    );
    server.onerror = function(err) {
      logger.warn(`Hub Endpoint onerror: ${err.message}`);
    }
    // Note: Request handlers will be set up in handleSSEConnection with sessionId

    return server;
  }

  /**
   * Creates a safe server name for namespacing (replace special chars with underscores)
   */
  createSafeServerName(serverName) {
    return serverName.replace(/[^a-zA-Z0-9]/g, '_');
  }


  /**
   * Register hub-internal meta tools for prompt-based filtering
   */
  registerMetaTools() {
    const metaTools = [
      {
        name: 'hub__analyze_prompt',
        description: 'Analyze a user prompt to determine which tool categories are needed. This meta-tool uses LLM to understand user intent and dynamically expose relevant tools. Call this when you receive a new user request.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The user prompt or query to analyze'
            },
            context: {
              type: 'string',
              description: 'Optional conversation context to improve analysis'
            }
          },
          required: ['prompt']
        },
        handler: async (args, sessionId) => {
          return await this.handleAnalyzePrompt(args, sessionId);
        }
      }
    ];

    // Register meta tools in allCapabilities with 'meta' category
    const toolsMap = this.allCapabilities[CAPABILITY_TYPES.TOOLS.id];
    metaTools.forEach(tool => {
      toolsMap.set(tool.name, {
        serverName: HUB_INTERNAL_SERVER_NAME,
        originalName: tool.name,
        definition: {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        },
        category: 'meta',
        handler: tool.handler
      });
      logger.debug(`Registered meta-tool: ${tool.name}`);
    });
    logger.info(`Registered ${metaTools.length} meta-tools in allCapabilities.tools (total tools now: ${toolsMap.size})`);
  }

  /**
   * Handle analyze_prompt meta-tool invocation
   */
  async handleAnalyzePrompt(args, sessionId) {
    const { prompt, context } = args;

    // Debug checkpoint 1: Entry
    logger.debug({ sessionId, prompt: prompt?.substring(0, 100), hasContext: !!context },
      'CHECKPOINT 1: handleAnalyzePrompt entry');

    // Validation: Check LLM availability
    if (!this.filteringService || !this.filteringService.llmClient) {
      logger.warn({ sessionId }, 'LLM client not available for prompt analysis');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'LLM-based prompt analysis not available',
            suggestion: 'Configure toolFiltering.llmCategorization with a valid provider in mcp-servers.json'
          })
        }]
      };
    }

    // Validation: Check prompt is non-empty
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      logger.warn({ sessionId }, 'Empty or invalid prompt provided to analyze_prompt');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Invalid prompt',
            message: 'Prompt must be a non-empty string'
          })
        }],
        isError: true
      };
    }

    try {
      // Define valid categories (should match tool-filtering-service.js)
      const validCategories = [
        'github', 'filesystem', 'web', 'docker', 'git',
        'python', 'database', 'memory', 'vertex_ai', 'meta'
      ];

      // Debug checkpoint 2: Before LLM call
      logger.debug({ sessionId, validCategories },
        'CHECKPOINT 2: Calling analyzePromptWithFallback');

      // Call LLM provider with retry and fallback logic
      const analysis = await this.filteringService.llmClient.analyzePromptWithFallback(
        prompt,
        context,
        validCategories
      );

      // Debug checkpoint 3: After LLM analysis
      logger.debug({
        sessionId,
        categories: analysis.categories,
        confidence: analysis.confidence
      }, 'CHECKPOINT 3: LLM analysis complete');

      // Update client tools based on analysis
      if (analysis.categories && analysis.categories.length > 0) {
        // Debug checkpoint 4: Before tool update
        logger.debug({ sessionId, categories: analysis.categories },
          'CHECKPOINT 4: Updating client tools');

        await this.updateClientTools(sessionId, analysis.categories, 'additive');

        // Debug checkpoint 5: After tool update
        logger.debug({ sessionId }, 'CHECKPOINT 5: Client tools updated');
      } else {
        logger.warn({ sessionId, analysis }, 'No categories identified by LLM analysis');
      }

      // Format successful response
      const response = {
        categories: analysis.categories,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        message: `Updated tool exposure: ${analysis.categories.join(', ')}`,
        nextStep: 'Tools list has been updated. Proceed with your request using the newly available tools.'
      };

      // Debug checkpoint 6: Response prepared
      logger.debug({ sessionId, response },
        'CHECKPOINT 6: Returning success response');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response)
        }]
      };

    } catch (error) {
      // Debug checkpoint 7: Error occurred
      logger.error({
        sessionId,
        error: error.message,
        stack: error.stack
      }, 'CHECKPOINT 7: Error in analyze_prompt meta-tool');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to analyze prompt',
            details: error.message,
            suggestion: 'Check LLM provider configuration and API key'
          })
        }],
        isError: true
      };
    }
  }

  /**
   * Setup MCP request handlers for a server instance
   * @param {Server} server - MCP server instance
   * @param {string} sessionId - Client session ID for per-client filtering
   */
  setupRequestHandlers(server, sessionId = null) {
    // Setup handler for meta tools (hub-internal tools)
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      
      // Check if this is a meta tool
      const toolsMap = this.allCapabilities[CAPABILITY_TYPES.TOOLS.id];
      const tool = toolsMap.get(toolName);
      
      if (tool && tool.category === 'meta' && tool.handler) {
        // Execute meta tool handler
        try {
          return await tool.handler(request.params.arguments || {}, sessionId);
        } catch (error) {
          throw new McpError(ErrorCode.InternalError, `Meta tool error: ${error.message}`);
        }
      }
      
      // Not a meta tool, proceed with normal tool handling below
      const registeredCap = this.getRegisteredCapability(request, CAPABILITY_TYPES.TOOLS.id, 'name', sessionId);
      if (!registeredCap) {
        throw new McpError(ErrorCode.InvalidParams, `Tool not found: ${toolName}`);
      }
      
      const { serverName, originalName } = registeredCap;
      try {
        const result = await this.mcpHub.rawRequest(serverName, {
          method: 'tools/call',
          params: { name: originalName, arguments: request.params.arguments }
        }, null, { timeout: MCP_REQUEST_TIMEOUT });
        return result;
      } catch (error) {
        logger.debug(`Error executing tool '${originalName}': ${error.message}`);
        throw new McpError(ErrorCode.InternalError, error.message);
      }
    });

    // Setup handlers for each capability type
    Object.values(CAPABILITY_TYPES).forEach(capType => {
      const capId = capType.id;

      // Skip tools - already handled above with meta-tool support
      if (capId === CAPABILITY_TYPES.TOOLS.id) {
        // Setup list handler with prompt-based filtering support
        server.setRequestHandler(capType.listSchema, () => {
          const promptBasedEnabled = this.config.toolFiltering?.promptBasedFiltering?.enabled;

          let toolsToExpose;

          if (promptBasedEnabled && sessionId) {
            // NEW: Filter by session categories
            const session = this.clientSessions.get(sessionId);
            if (session) {
              toolsToExpose = this.filterToolsBySessionCategories(session);

              logger.debug({
                sessionId,
                exposedCategories: Array.from(session.exposedCategories),
                toolCount: toolsToExpose.length
              }, 'Filtered tools by session categories');
            } else {
              // Session not found, return empty (zero-default)
              logger.warn({ sessionId }, 'Session not found for tools/list, returning empty');
              toolsToExpose = [];
            }
          } else {
            // Existing behavior: return all tools
            const capabilityMap = this.getClientCapabilities(sessionId, capId);
            toolsToExpose = Array.from(capabilityMap.values());

            logger.debug({
              sessionId,
              toolCount: toolsToExpose.length
            }, 'Returning all tools (filtering disabled)');
          }

          const capabilities = toolsToExpose.map(item => item.definition);
          return { [capId]: capabilities };
        });
        return; // Skip call handler
      }

      // Setup list handler if schema exists
      if (capType.listSchema) {
        server.setRequestHandler(capType.listSchema, () => {
          // Get capabilities for this specific client session
          const capabilityMap = this.getClientCapabilities(sessionId, capId);
          const capabilities = Array.from(capabilityMap.values()).map(item => item.definition);
          return { [capId]: capabilities };
        });
      }

      // Setup call/action handler if schema exists
      if (capType.handler?.callSchema) {
        server.setRequestHandler(capType.handler.callSchema, async (request) => {

          const registeredCap = this.getRegisteredCapability(request, capType.id, capType.uidField);
          if (!registeredCap) {
            const key = request.params[capType.uidField];
            throw new McpError(
              ErrorCode.InvalidParams,
              `${capId} capability not found: ${key}`
            );
          }
          const { serverName, originalName } = registeredCap;
          const request_options = {
            timeout: MCP_REQUEST_TIMEOUT
          }
          try {
            const result = await this.mcpHub.rawRequest(serverName, {
              method: capType.handler.method,
              params: capType.handler.form_params(registeredCap)
            }, capType.handler.resultSchema, request_options)
            return result;
          } catch (error) {
            logger.debug(`Error executing ${capId} '${originalName}': ${error.message}`);
            return capType.handler.form_error(error)
          }
        });
      }
    });
  }

  getRegisteredCapability(request, capId, uidField, sessionId = null) {
    // Check in client-specific capabilities first, then fall back to all capabilities
    const capabilityMap = sessionId ? this.getClientCapabilities(sessionId, capId) : this.allCapabilities[capId];
    let key = request.params[uidField]
    const registeredCap = capabilityMap.get(key);
    // key might be a resource Template
    if (!registeredCap && capId === CAPABILITY_TYPES.RESOURCES.id) {
      let [serverName, ...uri] = key.split(DELIMITER);
      if (!serverName || !uri) {
        return null; // Invalid format
      }
      serverName = this.serversMap.get(serverName)?.name
      return {
        serverName,
        originalName: uri.join(DELIMITER),
      }
    }
    return registeredCap
  }

  /**
   * Setup listeners for capability changes from managed servers
   */
  setupCapabilitySync() {
    // For each capability type with syncWithEvents
    Object.values(CAPABILITY_TYPES).forEach(capType => {
      if (capType.syncWithEvents) {
        const { events, capabilityIds } = capType.syncWithEvents;

        events.forEach(event => {
          this.mcpHub.on(event, () => {
            this.syncCapabilities(capabilityIds);
          });
        });
      }
    });

    // Global events that sync ALL capabilities
    const globalSyncEvents = ['importantConfigChangeHandled'];
    globalSyncEvents.forEach(event => {
      this.mcpHub.on(event, () => {
        this.syncCapabilities(); // Sync all capabilities
      });
    });

    // Listen for hub state changes to re-sync all capabilities when servers are ready
    this.mcpHub.on('hubStateChanged', (data) => {
      const { state } = data;
      const criticalStates = [HubState.READY, HubState.RESTARTED, HubState.STOPPED, HubState.ERROR];

      if (criticalStates.includes(state)) {
        this.syncCapabilities(); // Sync all capabilities
      }
    });
  }

  /**
   * Synchronize capabilities from connected servers
   * @param {string[]} capabilityIds - Specific capability IDs to sync, defaults to all
   * Includes auto-enable logic for tool filtering (Sprint 2)
   */
  syncCapabilities(capabilityIds = null, affectedServers = null) {
    logger.debug(`syncCapabilities called with capabilityIds: ${capabilityIds ? JSON.stringify(capabilityIds) : 'null'}, affectedServers: ${affectedServers ? JSON.stringify(affectedServers) : 'null'}`);

    // Default to all capability IDs if none specified
    const idsToSync = capabilityIds || Object.values(CAPABILITY_TYPES).map(capType => capType.id);
    logger.debug(`  Will sync capability IDs: ${JSON.stringify(idsToSync)}`);

    // Update the servers map with current connection states
    // If affectedServers is specified, only update those specific servers
    if (affectedServers && affectedServers.length > 0) {
      this.syncServersMapPartial(affectedServers);
    } else {
      this.syncServersMap();
    }

    // Auto-enable filtering if threshold is exceeded (Sprint 2)
    if (this.filteringService && idsToSync.includes('tools')) {
      // Calculate total tool count before filtering
      let totalToolCount = 0;
      for (const connection of this.serversMap.values()) {
        if (connection.status === "connected" && !connection.disabled && connection.tools) {
          totalToolCount += connection.tools.length;
        }
      }

      // Check if auto-enable should trigger
      this.filteringService.autoEnableIfNeeded(totalToolCount);
    }

    // Track which capabilities actually changed
    const changedCapabilities = [];

    // Sync each requested capability type and notify clients of changes
    idsToSync.forEach(capabilityId => {
      const changed = this.syncCapabilityType(capabilityId, affectedServers);
      if (changed) {
        changedCapabilities.push(capabilityId);
      }
    });

    // Batch notify clients if we have active connections and changes occurred
    if (changedCapabilities.length > 0 && this.hasActiveConnections()) {
      changedCapabilities.forEach(capabilityId => {
        const capType = Object.values(CAPABILITY_TYPES).find(cap => cap.id === capabilityId);
        if (capType?.syncWithEvents?.notificationMethod) {
          this.notifyCapabilityChanges(capType.syncWithEvents.notificationMethod);
        }
      });
    }
  }

  /**
   * Synchronize the servers map with current connection states
   * Creates safe server IDs for namespacing capabilities
   */
  syncServersMap() {
    this.serversMap.clear();

    // Register all connected servers with unique safe IDs
    for (const connection of this.mcpHub.connections.values()) {
      if (connection.status === "connected" && !connection.disabled) {
        const name = connection.name;
        let id = this.createSafeServerName(name);

        // Ensure unique ID by appending counter if needed
        if (this.serversMap.has(id)) {
          let counter = 1;
          while (this.serversMap.has(`${id}_${counter}`)) {
            counter++;
          }
          id = `${id}_${counter}`;
        }
        this.serversMap.set(id, connection);
      }
    }
  }

  syncServersMapPartial(serverNames) {
    // Only update the specified servers instead of clearing and rebuilding everything
    for (const serverName of serverNames) {
      const connection = this.mcpHub.connections.get(serverName);
      
      if (!connection) {
        // Server was removed, delete from map
        for (const [id, conn] of this.serversMap.entries()) {
          if (conn.name === serverName) {
            this.serversMap.delete(id);
            break;
          }
        }
        continue;
      }
      
      if (connection.status === "connected" && !connection.disabled) {
        // Server added or modified, update in map
        let id = this.createSafeServerName(serverName);
        
        // Find existing entry or create new one
        let existingId = null;
        for (const [mapId, conn] of this.serversMap.entries()) {
          if (conn.name === serverName) {
            existingId = mapId;
            break;
          }
        }
        
        if (existingId) {
          // Update existing entry
          this.serversMap.set(existingId, connection);
        } else {
          // Add new entry with unique ID
          if (this.serversMap.has(id)) {
            let counter = 1;
            while (this.serversMap.has(`${id}_${counter}`)) {
              counter++;
            }
            id = `${id}_${counter}`;
          }
          this.serversMap.set(id, connection);
        }
      } else {
        // Server disconnected or disabled, remove from map
        for (const [id, conn] of this.serversMap.entries()) {
          if (conn.name === serverName) {
            this.serversMap.delete(id);
            break;
          }
        }
      }
    }
  }

  /**
   * Synchronize a specific capability type and detect changes
   */
  syncCapabilityType(capabilityId, affectedServers = null) {
    const capabilityMap = this.registeredCapabilities[capabilityId];
    const previousKeys = new Set(capabilityMap.keys());

    if (capabilityId === CAPABILITY_TYPES.TOOLS.id) {
      logger.debug(`syncCapabilityType for tools: ${capabilityMap.size} tools before sync`);
      const metaCount = Array.from(capabilityMap.values()).filter(v => v.category === 'meta').length;
      logger.debug(`  Meta-tools before sync: ${metaCount}`);
    }

    if (affectedServers && affectedServers.length > 0) {
      // Incremental update: only update capabilities for affected servers
      // First, remove capabilities from affected servers (but preserve meta-tools)
      for (const [key, registration] of capabilityMap.entries()) {
        // Skip meta-tools (hub-internal) during incremental sync
        if (registration.category === 'meta') continue;

        if (affectedServers.includes(registration.serverName)) {
          capabilityMap.delete(key);
        }
      }

      // Then, re-register capabilities for affected servers
      for (const [serverId, connection] of this.serversMap) {
        if (affectedServers.includes(connection.name) &&
            connection.status === "connected" &&
            !connection.disabled) {
          this.registerServerCapabilities(connection, { capabilityId, serverId });
        }
      }
    } else {
      // Full rebuild: preserve meta-tools, clear and rebuild other capabilities
      // Save meta-tools before clearing (tools with category === 'meta')
      const metaTools = new Map();
      if (capabilityId === CAPABILITY_TYPES.TOOLS.id) {
        for (const [key, registration] of capabilityMap.entries()) {
          if (registration.category === 'meta') {
            metaTools.set(key, registration);
          }
        }
        if (metaTools.size > 0) {
          logger.debug(`Preserving ${metaTools.size} meta-tools during sync: ${Array.from(metaTools.keys()).join(', ')}`);
        }
      }

      // Clear all capabilities
      capabilityMap.clear();

      // Restore meta-tools first
      for (const [key, registration] of metaTools.entries()) {
        capabilityMap.set(key, registration);
      }
      if (metaTools.size > 0) {
        logger.debug(`Restored ${metaTools.size} meta-tools after clear`);
      }

      // Then rebuild capabilities from all connected servers
      for (const [serverId, connection] of this.serversMap) {
        if (connection.status === "connected" && !connection.disabled) {
          this.registerServerCapabilities(connection, { capabilityId, serverId });
        }
      }
    }

    // Check if capability keys changed
    const newKeys = new Set(capabilityMap.keys());
    return previousKeys.size !== newKeys.size ||
      [...newKeys].some(key => !previousKeys.has(key));
  }


  /**
   * Send capability change notifications to all connected clients
   */
  notifyCapabilityChanges(notificationMethod) {
    for (const { server } of this.clients.values()) {
      try {
        server[notificationMethod]();
      } catch (error) {
        logger.warn(`Error sending ${notificationMethod} notification: ${error.message}`);
      }
    }
  }

  /**
   * Register capabilities from a server connection for a specific capability type
   * Creates namespaced capability names to avoid conflicts between servers
   * Applies tool filtering for tools capability type (Sprint 2)
   */
  registerServerCapabilities(connection, { capabilityId, serverId }) {
    const serverName = connection.name;

    // Skip self-reference to prevent infinite recursion
    if (this.isSelfReference(connection)) {
      return;
    }

    // Find the capability type configuration and get server's capabilities
    const capType = Object.values(CAPABILITY_TYPES).find(cap => cap.id === capabilityId);
    let capabilities = connection[capabilityId];
    if (!capabilities || !Array.isArray(capabilities)) {
      return; // No capabilities of this type
    }

    // Apply tool filtering for tools capability type (Sprint 2)
    if (capabilityId === 'tools' && this.filteringService) {
      const originalCount = capabilities.length;

      // Filter tools using shouldIncludeTool method
      capabilities = capabilities.filter(tool =>
        this.filteringService.shouldIncludeTool(tool.name, serverName, tool)
      );

      // Log filtering results
      const filteredCount = capabilities.length;
      if (filteredCount < originalCount) {
        logger.info(`Tool filtering: ${serverName} reduced from ${originalCount} to ${filteredCount} tools`);
      }
    }

    const capabilityMap = this.allCapabilities[capabilityId];

    // Register each capability with namespaced name
    for (const cap of capabilities) {
      const originalValue = cap[capType.uidField];
      const uniqueName = serverId + DELIMITER + originalValue;

      // Create capability with namespaced unique identifier
      const formattedCap = {
        ...cap,
        [capType.uidField]: uniqueName
      };

      // Store capability with metadata for routing back to original server
      capabilityMap.set(uniqueName, {
        serverName,
        originalName: originalValue,
        definition: formattedCap,
      });
    }
  }


  /**
   * Check if a connection is a self-reference (connecting to our own MCP endpoint)
   */
  isSelfReference(connection) {
    // Primary check: Compare server's reported name with our internal server name
    if (connection.serverInfo && connection.serverInfo.name === HUB_INTERNAL_SERVER_NAME) {
      return true;
    }
    return false;
  }

  /**
   * Check if there are any active MCP client connections
   */
  hasActiveConnections() {
    return this.clients.size > 0;
  }




  /**
   * Handle SSE transport creation (GET /mcp)
   */
  async handleSSEConnection(req, res) {

    // Create SSE transport
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;

    // Create a new server instance for this connection
    const server = this.createServer();

    // Initialize client session if prompt-based filtering is enabled
    if (this.filteringMode === 'prompt-based' && this.promptBasedConfig.sessionIsolation !== false) {
      this.initializeClientSession(sessionId);
    }

    // Setup request handlers with sessionId for per-client filtering
    this.setupRequestHandlers(server, sessionId);

    // Store transport and server together
    this.clients.set(sessionId, { transport, server });

    let clientInfo


    // Setup cleanup on close
    const cleanup = async () => {
      this.clients.delete(sessionId);
      this.cleanupClientSession(sessionId); // Cleanup session data
      try {
        await server.close();
      } catch (error) {
        logger.warn(`Error closing server connected to ${clientInfo?.name ?? "Unknown"}: ${error.message}`);
      } finally {
        logger.info(`'${clientInfo?.name ?? "Unknown"}' client disconnected from MCP HUB`);
      }
    };

    res.on("close", cleanup);
    transport.onclose = cleanup;

    // Connect MCP server to transport
    await server.connect(transport);
    server.oninitialized = () => {
      clientInfo = server.getClientVersion()
      if (clientInfo) {
        logger.info(`'${clientInfo.name}' client connected to MCP HUB`)
      }
    }
  }

  /**
   * Handle MCP messages (POST /messages)
   */
  async handleMCPMessage(req, res) {
    const sessionId = req.query.sessionId;
    function sendErrorResponse(code, error) {
      res.status(code).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: error.message || 'Invalid request',
        },
        id: null,
      });
    }

    if (!sessionId) {
      logger.warn('MCP message received without session ID');
      return sendErrorResponse(400, new Error('Missing sessionId parameter'));
    }

    const transportInfo = this.clients.get(sessionId);
    if (transportInfo) {
      await transportInfo.transport.handlePostMessage(req, res, req.body);
    } else {
      logger.warn(`MCP message for unknown session: ${sessionId} (hub may have restarted)`);
      return sendErrorResponse(404, new Error(
        `Session not found: ${sessionId}. The hub may have restarted. Please reconnect.`
      ));
    }
  }

  /**
   * Get statistics about the MCP endpoint
   */
  getStats() {
    const capabilityCounts = Object.entries(this.registeredCapabilities)
      .reduce((acc, [type, map]) => {
        acc[type] = map.size;
        return acc;
      }, {});

    return {
      activeClients: this.clients.size,
      registeredCapabilities: capabilityCounts,
      totalCapabilities: Object.values(capabilityCounts).reduce((sum, count) => sum + count, 0),
    };
  }

  /**
   * Close all transports and cleanup
   */
  async close() {
    // Close all servers (which will close their transports)
    for (const [sessionId, { server }] of this.clients) {
      try {
        await server.close();
      } catch (error) {
        logger.debug(`Error closing server ${sessionId}: ${error.message}`);
      }
    }

    this.clients.clear();

    // Clear all registered capabilities
    Object.values(this.registeredCapabilities).forEach(map => map.clear());

    logger.info('MCP server endpoint closed');
  }
}

