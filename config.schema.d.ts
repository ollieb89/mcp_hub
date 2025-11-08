/**
 * MCP Hub Configuration Type Definitions
 *
 * TypeScript definitions for MCP Hub configuration schema.
 * Provides type safety and IDE autocomplete for configuration files.
 *
 * @module config.schema
 */

/**
 * HTTP connection pool configuration for remote MCP servers
 */
export interface ConnectionPoolConfig {
  /** Enable connection pooling globally (default: true) */
  enabled?: boolean;
  /** Socket keep-alive timeout in milliseconds (1s - 10min, default: 60000ms) */
  keepAliveTimeout?: number;
  /** Maximum socket lifetime in milliseconds (1s - 10min, default: 600000ms) */
  keepAliveMaxTimeout?: number;
  /** Maximum connections per host (1-1000, default: 50) */
  maxConnections?: number;
  /** Maximum idle connections per host (0-100, default: 10) */
  maxFreeConnections?: number;
  /** Socket timeout in milliseconds (1s - 5min, default: 30000ms) */
  timeout?: number;
  /** Number of pipelined requests (0-100, default: 0) */
  pipelining?: number;
}

/**
 * Server filter configuration for tool filtering
 */
export interface ServerFilterConfig {
  /** Filter mode: 'allowlist' or 'denylist' */
  mode: "allowlist" | "denylist";
  /** List of server names to allowlist or denylist */
  servers: string[];
}

/**
 * Valid tool categories for filtering
 */
export type ToolCategory =
  | "filesystem"
  | "web"
  | "search"
  | "database"
  | "version-control"
  | "docker"
  | "cloud"
  | "development"
  | "communication"
  | "other";

/**
 * Category filter configuration for tool filtering
 */
export interface CategoryFilterConfig {
  /** List of categories to expose */
  categories: ToolCategory[];
  /** Custom pattern-to-category mappings (e.g., { "myserver__*": "custom-category" }) */
  customMappings?: Record<string, string>;
}

/**
 * Prompt-based filtering configuration
 */
export interface PromptBasedFilteringConfig {
  /** Enable prompt-based filtering */
  enabled?: boolean;
  /** Default tool exposure level */
  defaultExposure?: "zero" | "meta-only" | "minimal" | "all";
  /** Enable meta-tools like hub__analyze_prompt */
  enableMetaTools?: boolean;
  /** Enable per-client session isolation */
  sessionIsolation?: boolean;
}

/**
 * LLM provider configuration for prompt-based filtering
 */
export interface LLMCategorizationConfig {
  /** Enable LLM-based prompt analysis */
  enabled: boolean;
  /** LLM provider */
  provider: "openai" | "anthropic" | "gemini";
  /** API key for the LLM provider (supports ${ENV_VAR} syntax) */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** LLM temperature (0-2, default: 0) */
  temperature?: number;
  /** Maximum retry attempts (0-10, default: 3) */
  maxRetries?: number;
}

/**
 * Tool filtering configuration
 */
export interface ToolFilteringConfig {
  /** Enable tool filtering globally */
  enabled?: boolean;
  /** Filtering mode */
  mode?: "static" | "server-allowlist" | "category" | "hybrid" | "prompt-based";
  /** Server filter configuration */
  serverFilter?: ServerFilterConfig;
  /** Category filter configuration */
  categoryFilter?: CategoryFilterConfig;
  /** Prompt-based filtering configuration */
  promptBasedFiltering?: PromptBasedFilteringConfig;
  /** LLM categorization configuration */
  llmCategorization?: LLMCategorizationConfig;
  /** Auto-enable filtering when tool count exceeds threshold */
  autoEnableThreshold?: number;
}

/**
 * Development mode configuration for hot-reload
 */
export interface DevConfig {
  /** Enable development mode with file watching */
  enabled: boolean;
  /** Glob patterns for files to watch */
  watch?: string[];
  /** Absolute path to watch directory (REQUIRED) */
  cwd: string;
}

/**
 * Base server configuration properties
 */
export interface BaseServerConfig {
  /** Disable this server without removing configuration */
  disabled?: boolean;
  /** Optional documentation note */
  note?: string;
}

/**
 * STDIO transport configuration (local script-based servers)
 */
export interface StdioServerConfig extends BaseServerConfig {
  /** Command to execute (supports ${ENV_VAR} and ${cmd: command} syntax) */
  command: string;
  /** Command arguments (supports ${ENV_VAR} and ${cmd: command} syntax) */
  args?: string[];
  /** Environment variables (supports ${ENV_VAR}, ${workspaceFolder}, etc.) */
  env?: Record<string, string>;
  /** Working directory (supports ${workspaceFolder}, default: '.') */
  cwd?: string;
  /** Development mode configuration */
  dev?: DevConfig;
  /** STDIO servers do not support connection pooling */
  connectionPool?: never;
}

/**
 * SSE (Server-Sent Events) transport configuration
 */
export interface SseServerConfig extends BaseServerConfig {
  /** Transport type */
  type?: "sse";
  /** Server URL (supports ${ENV_VAR} syntax) */
  url: string;
  /** HTTP headers for authentication (supports ${ENV_VAR} syntax) */
  headers?: Record<string, string>;
  /** Per-server connection pool configuration (overrides global) */
  connectionPool?: ConnectionPoolConfig;
}

/**
 * streamable-http transport configuration with OAuth support
 */
export interface StreamableHttpServerConfig extends BaseServerConfig {
  /** Transport type */
  type: "streamable-http";
  /** Server URL (supports ${ENV_VAR} syntax) */
  url: string;
  /** HTTP headers for authentication (supports ${ENV_VAR} syntax) */
  headers?: Record<string, string>;
  /** Per-server connection pool configuration (overrides global) */
  connectionPool?: ConnectionPoolConfig;
}

/**
 * Union type for all server configurations
 */
export type ServerConfig =
  | StdioServerConfig
  | SseServerConfig
  | StreamableHttpServerConfig;

/**
 * MCP servers configuration map
 */
export interface McpServersConfig {
  [serverName: string]: ServerConfig;
}

/**
 * Complete MCP Hub configuration
 */
export interface McpHubConfig {
  /** Global HTTP connection pool configuration */
  connectionPool?: ConnectionPoolConfig;
  /** Tool filtering configuration */
  toolFiltering?: ToolFilteringConfig;
  /** MCP server configurations */
  mcpServers?: McpServersConfig;
  /** VS Code compatibility alias for 'mcpServers' */
  servers?: McpServersConfig;
}

/**
 * Environment variable resolution syntax examples:
 * - ${ENV_VAR} - Standard environment variable
 * - ${env:ENV_VAR} - Explicit environment variable
 * - ${cmd: command args} - Command execution
 * - ${workspaceFolder} - VS Code workspace folder
 * - ${userHome} - User home directory
 * - ${/} - Path separator
 * - ${input:variable-id} - VS Code input variable
 */
export type EnvironmentVariableSyntax = string;

/**
 * VS Code-compatible predefined variables
 */
export type PredefinedVariable =
  | "${workspaceFolder}"
  | "${workspaceFolderBasename}"
  | "${userHome}"
  | "${/}"
  | "${pathSeparator}";

/**
 * Type guard to check if a server config is STDIO
 */
export function isStdioServer(
  config: ServerConfig,
): config is StdioServerConfig;

/**
 * Type guard to check if a server config is SSE
 */
export function isSseServer(config: ServerConfig): config is SseServerConfig;

/**
 * Type guard to check if a server config is streamable-http
 */
export function isStreamableHttpServer(
  config: ServerConfig,
): config is StreamableHttpServerConfig;

export default McpHubConfig;
