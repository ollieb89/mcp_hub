#!/usr/bin/env node

/**
 * Configuration Validation Script
 *
 * Validates MCP Hub configuration files against the JSON schema.
 * Can be used in CI/CD pipelines or pre-commit hooks.
 *
 * Usage:
 *   node scripts/validate-config.js [config-file]
 *   bun scripts/validate-config.js [config-file]
 *
 * Exit codes:
 *   0 - Configuration is valid
 *   1 - Configuration is invalid
 *   2 - File not found or read error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadSchema() {
  try {
    const schemaPath = path.resolve(__dirname, '../config.schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    log(`❌ Failed to load schema: ${error.message}`, colors.red);
    process.exit(2);
  }
}

function loadConfig(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    // Try JSON5 first (supports comments, trailing commas)
    return JSON5.parse(content);
  } catch (error) {
    log(`❌ Failed to parse config file: ${error.message}`, colors.red);
    process.exit(2);
  }
}

function validateType(value, schema, path = 'root') {
  const errors = [];

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (schema.required && schema.required.length > 0) {
      errors.push(`${path}: Missing required properties`);
    }
    return errors;
  }

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path}: Expected type '${schema.type}', got '${actualType}'`);
      return errors;
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: Value '${value}' not in allowed values: ${schema.enum.join(', ')}`);
  }

  // Range validation
  if (schema.type === 'integer' || schema.type === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: Value ${value} is less than minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: Value ${value} is greater than maximum ${schema.maximum}`);
    }
  }

  // Object validation
  if (schema.type === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        errors.push(...validateType(value[key], propSchema, `${path}.${key}`));
      }
    }

    // Required properties
    if (schema.required) {
      for (const requiredKey of schema.required) {
        if (value[requiredKey] === undefined) {
          errors.push(`${path}: Missing required property '${requiredKey}'`);
        }
      }
    }
  }

  // Array validation
  if (schema.type === 'array' && schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validateType(item, schema.items, `${path}[${index}]`));
    });
  }

  return errors;
}

function validateConfig(config, schema) {
  const errors = [];

  // Validate top-level properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (config[key] !== undefined) {
        const propErrors = validateType(config[key], propSchema, key);
        errors.push(...propErrors);
      }
    }
  }

  // Check for additional properties if not allowed
  if (schema.additionalProperties === false) {
    const allowedKeys = new Set(Object.keys(schema.properties || {}));
    for (const key of Object.keys(config)) {
      if (!allowedKeys.has(key) && key !== '$schema') {
        errors.push(`Unknown property '${key}' at root level`);
      }
    }
  }

  // Special validations for MCP Hub config
  if (config.mcpServers) {
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      // Validate server name pattern
      if (!/^[a-zA-Z0-9_-]+$/.test(serverName)) {
        errors.push(`Server name '${serverName}' must match pattern ^[a-zA-Z0-9_-]+$`);
      }

      // STDIO servers cannot have connectionPool
      if (serverConfig.command && serverConfig.connectionPool) {
        errors.push(`Server '${serverName}': STDIO servers cannot have connectionPool configuration`);
      }

      // Dev mode requires absolute cwd
      if (serverConfig.dev?.enabled && serverConfig.dev.cwd) {
        if (!path.isAbsolute(serverConfig.dev.cwd)) {
          errors.push(`Server '${serverName}': dev.cwd must be an absolute path`);
        }
      }

      // streamable-http requires type field
      if (serverConfig.url && serverConfig.type === 'streamable-http') {
        // Valid
      } else if (serverConfig.url && !serverConfig.type && !serverConfig.command) {
        // SSE type is inferred, but warn
        log(`  ℹ Server '${serverName}': URL without type, assuming SSE transport`, colors.cyan);
      }
    }
  }

  // Tool filtering validations
  if (config.toolFiltering?.enabled) {
    const mode = config.toolFiltering.mode || 'static';
    const validModes = ['static', 'server-allowlist', 'category', 'hybrid', 'prompt-based'];

    if (!validModes.includes(mode)) {
      errors.push(`toolFiltering.mode: Invalid mode '${mode}', must be one of: ${validModes.join(', ')}`);
    }

    // Prompt-based filtering requires LLM config
    if (mode === 'prompt-based' && config.toolFiltering.promptBasedFiltering?.enabled) {
      if (config.toolFiltering.llmCategorization?.enabled && !config.toolFiltering.llmCategorization?.apiKey) {
        errors.push('toolFiltering.llmCategorization: apiKey is required when LLM categorization is enabled');
      }
    }
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const configPath = args[0] || path.resolve(process.cwd(), 'mcp-servers.json');

  log('\n🔍 MCP Hub Configuration Validator\n', colors.blue);

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    log(`❌ Config file not found: ${configPath}`, colors.red);
    log(`\nUsage: node scripts/validate-config.js [config-file]`, colors.yellow);
    process.exit(2);
  }

  log(`📄 Validating: ${configPath}`, colors.cyan);

  // Load schema
  const schema = loadSchema();
  log('✓ Schema loaded', colors.green);

  // Load config
  const config = loadConfig(configPath);
  log('✓ Config parsed', colors.green);

  // Validate
  const errors = validateConfig(config, schema);

  if (errors.length === 0) {
    log('\n✅ Configuration is valid!\n', colors.green);

    // Print summary
    const serverCount = Object.keys(config.mcpServers || {}).length;
    log(`Summary:`, colors.cyan);
    log(`  - Servers: ${serverCount}`, colors.cyan);
    if (config.connectionPool?.enabled) {
      log(`  - Connection pooling: enabled`, colors.cyan);
    }
    if (config.toolFiltering?.enabled) {
      log(`  - Tool filtering: ${config.toolFiltering.mode || 'static'} mode`, colors.cyan);
    }

    process.exit(0);
  } else {
    log('\n❌ Configuration validation failed:\n', colors.red);
    errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, colors.red);
    });
    log(`\n${errors.length} error(s) found\n`, colors.red);
    log('See docs/CONFIG_SCHEMA.md for configuration documentation', colors.yellow);
    process.exit(1);
  }
}

main();
