#!/usr/bin/env bun
/**
 * Quick validation script to test health schema against real API response
 */
import { HealthResponseSchema } from '../src/ui/api/schemas/health.schema';

const realResponse = {
  status: 'ok',
  state: 'ready',
  server_id: 'mcp-hub',
  activeClients: 0,
  timestamp: '2025-11-08T04:10:00.173Z',
  servers: [
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
    {
      name: 'shadcn-ui',
      displayName: 'shadcn-ui',
      description: '',
      transportType: 'stdio',
      status: 'connected',
      error: null,
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
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
  ],
};

const result = HealthResponseSchema.safeParse(realResponse);

if (result.success) {
  console.log('✅ Health schema validation: SUCCESS');
  console.log(`   - status: ${result.data.status}`);
  console.log(`   - state: ${result.data.state}`);
  console.log(`   - servers: ${result.data.servers.length} servers`);
  console.log(`   - activeClients: ${result.data.activeClients}`);
  console.log('\nType inference test:');
  const status: 'ok' | 'error' = result.data.status;
  const state: 'starting' | 'ready' | 'restarting' | 'stopped' = result.data.state;
  console.log(`   - Type-safe status: ${status}`);
  console.log(`   - Type-safe state: ${state}`);
  process.exit(0);
} else {
  console.log('❌ Health schema validation: FAILED');
  console.error('\nValidation errors:');
  result.error.issues.forEach((issue, index) => {
    console.error(`\n  Error ${index + 1}:`);
    console.error(`    Path: ${issue.path.join('.')}`);
    console.error(`    Message: ${issue.message}`);
    console.error(`    Code: ${issue.code}`);
  });
  process.exit(1);
}
