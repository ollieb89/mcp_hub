#!/usr/bin/env bun
/**
 * Quick validation script to test server schema against real API response
 */
import { ServersResponseSchema } from '../src/ui/api/schemas/server.schema';

const realResponse = {
  servers: [
    {
      name: 'shadcn-ui',
      displayName: 'shadcn-ui',
      description: '',
      transportType: 'stdio',
      status: 'connected',
      error: null,
      capabilities: {
        tools: [
          {
            name: 'get_component',
            description: 'Get the source code for a shadcn/ui component',
            inputSchema: {
              type: 'object',
              properties: {
                componentName: { type: 'string' },
              },
            },
          },
        ],
        resources: [
          {
            name: 'get_components',
            uri: 'resource:get_components',
            description: 'List of available shadcn/ui components',
            contentType: 'text/plain',
          },
        ],
        resourceTemplates: [
          {
            name: 'get_install_script_for_component',
            uriTemplate: 'resource-template:install/{componentName}',
            description: 'Generate installation script for component',
            contentType: 'text/plain',
          },
        ],
        prompts: [
          {
            name: 'build-shadcn-page',
            description: 'Generate a complete page using shadcn/ui',
            arguments: [
              {
                name: 'pageType',
                description: 'Type of page to build',
                required: true,
              },
            ],
          },
        ],
      },
      uptime: 4696,
      lastStarted: '2025-11-08T02:51:40.914Z',
      authorizationUrl: null,
      serverInfo: {
        name: 'shadcn-ui-mcp-server',
        version: '1.1.4',
      },
      config_source: './mcp-servers.json',
    },
    {
      name: 'serena',
      displayName: 'serena',
      description: '',
      transportType: 'stdio',
      status: 'disconnected',
      error: 'Failed to connect',
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      },
      uptime: 0,
      lastStarted: null,
      authorizationUrl: null,
      serverInfo: null,
      config_source: './mcp-servers.json',
    },
  ],
};

const result = ServersResponseSchema.safeParse(realResponse);

if (result.success) {
  console.log('✅ Server schema validation: SUCCESS');
  console.log(`   - servers: ${result.data.servers.length} servers`);
  console.log(
    `   - connected: ${result.data.servers.filter((s) => s.status === 'connected').length}`
  );
  console.log(
    `   - total tools: ${result.data.servers.reduce((acc, s) => acc + s.capabilities.tools.length, 0)}`
  );
  console.log('\nType inference test:');
  const firstServer = result.data.servers[0];
  const status: 'connected' | 'connecting' | 'disconnected' | 'error' =
    firstServer.status;
  const transportType: 'stdio' | 'sse' | 'streamable-http' =
    firstServer.transportType;
  console.log(`   - Type-safe status: ${status}`);
  console.log(`   - Type-safe transportType: ${transportType}`);
  process.exit(0);
} else {
  console.log('❌ Server schema validation: FAILED');
  console.error('\nValidation errors:');
  result.error.issues.forEach((issue, index) => {
    console.error(`\n  Error ${index + 1}:`);
    console.error(`    Path: ${issue.path.join('.')}`);
    console.error(`    Message: ${issue.message}`);
    console.error(`    Code: ${issue.code}`);
  });
  process.exit(1);
}
