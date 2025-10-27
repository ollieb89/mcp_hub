#!/usr/bin/env node
/**
 * Minimal MCP test server for STDIO transport integration tests
 * 
 * Implements basic MCP protocol over STDIO for testing:
 * - Initialization handshake
 * - Environment variable logging
 * - Graceful shutdown
 */

import { spawn } from 'child_process';

// Capture environment variables passed from test
const ENV_VARS = process.env;

// Handle MCP protocol messages via JSON-RPC over STDIO
process.stdin.setEncoding('utf8');

let requestId = 0;

process.stdin.on('data', (chunk) => {
  // Parse JSON-RPC messages
  const lines = chunk.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const message = JSON.parse(line);
      handleMessage(message);
    } catch (e) {
      // Ignore invalid JSON
    }
  });
});

function handleMessage(message) {
  if (message.method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        },
        serverInfo: {
          name: 'stdio-test-server',
          version: '1.0.0'
        }
      }
    };
    sendResponse(response);
  }
  
  if (message.method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: []
      }
    };
    sendResponse(response);
  }
  
  if (message.method === 'resources/list') {
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        resources: []
      }
    };
    sendResponse(response);
  }
  
  if (message.method === 'prompts/list') {
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        prompts: []
      }
    };
    sendResponse(response);
  }
}

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Log environment variables for testing
process.stderr.write(`STDIO Test Server Started\n`);
process.stderr.write(`Environment: ${JSON.stringify(ENV_VARS, null, 2)}\n`);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

// Exit on stdin close
process.stdin.on('end', () => {
  process.exit(0);
});

