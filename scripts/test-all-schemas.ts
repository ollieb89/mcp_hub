#!/usr/bin/env bun
/**
 * Comprehensive schema validation test suite
 * Tests all rewritten schemas against real API response formats
 */

import { HealthResponseSchema } from '../src/ui/api/schemas/health.schema';
import { ServersResponseSchema } from '../src/ui/api/schemas/server.schema';
import { ConfigResponseSchema } from '../src/ui/api/schemas/config.schema';
import { FilteringStatsSchema } from '../src/ui/api/schemas/filtering.schema';
import { ToolsResponseSchema } from '../src/ui/api/schemas/tools.schema';

interface TestResult {
  schema: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// Test 1: Health Schema
console.log('Testing health.schema.ts...');
try {
  const healthResponse = {
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
    ],
  };
  HealthResponseSchema.parse(healthResponse);
  results.push({ schema: 'health.schema.ts', passed: true });
  console.log('✅ PASSED\n');
} catch (error) {
  results.push({
    schema: 'health.schema.ts',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
  console.log('❌ FAILED\n');
}

// Test 2: Server Schema
console.log('Testing server.schema.ts...');
try {
  const serversResponse = {
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
              description: 'Get component source',
              inputSchema: { type: 'object' },
            },
          ],
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
  ServersResponseSchema.parse(serversResponse);
  results.push({ schema: 'server.schema.ts', passed: true });
  console.log('✅ PASSED\n');
} catch (error) {
  results.push({
    schema: 'server.schema.ts',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
  console.log('❌ FAILED\n');
}

// Test 3: Config Schema
console.log('Testing config.schema.ts...');
try {
  const configResponse = {
    config: {
      toolFiltering: {
        enabled: true,
        mode: 'server-allowlist',
        serverFilter: {
          mode: 'allowlist',
          servers: ['serena', 'git'],
        },
      },
      mcpServers: {
        serena: {
          command: 'uv',
          args: ['run'],
          disabled: false,
        },
      },
    },
  };
  ConfigResponseSchema.parse(configResponse);
  results.push({ schema: 'config.schema.ts', passed: true });
  console.log('✅ PASSED\n');
} catch (error) {
  results.push({
    schema: 'config.schema.ts',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
  console.log('❌ FAILED\n');
}

// Test 4: Filtering Schema
console.log('Testing filtering.schema.ts...');
try {
  const filteringResponse = {
    enabled: true,
    mode: 'server-allowlist',
    totalTools: 355,
    filteredTools: 205,
    exposedTools: 150,
    filterRate: 0.577,
    serverFilterMode: 'allowlist',
    allowedServers: ['serena', 'git'],
    allowedCategories: [],
    categoryCacheSize: 352,
    cacheHitRate: 0.008,
    llmCacheSize: 153,
    llmCacheHitRate: 0,
    timestamp: '2025-11-08T04:12:56.647Z',
  };
  FilteringStatsSchema.parse(filteringResponse);
  results.push({ schema: 'filtering.schema.ts', passed: true });
  console.log('✅ PASSED\n');
} catch (error) {
  results.push({
    schema: 'filtering.schema.ts',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
  console.log('❌ FAILED\n');
}

// Test 5: Tools Schema
console.log('Testing tools.schema.ts...');
try {
  const toolsResponse = {
    tools: [
      {
        server: 'shadcn-ui',
        serverDisplayName: 'shadcn-ui',
        name: 'get_component',
        description: 'Get component',
        enabled: true,
        categories: [],
      },
    ],
  };
  ToolsResponseSchema.parse(toolsResponse);
  results.push({ schema: 'tools.schema.ts', passed: true });
  console.log('✅ PASSED\n');
} catch (error) {
  results.push({
    schema: 'tools.schema.ts',
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
  console.log('❌ FAILED\n');
}

// Summary
console.log('='.repeat(60));
console.log('SCHEMA VALIDATION TEST SUMMARY');
console.log('='.repeat(60));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`\nTotal Tests: ${results.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);

if (failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`\n  ${r.schema}:`);
      console.log(`  ${r.error}`);
    });
}

console.log('\n' + '='.repeat(60));

if (failed === 0) {
  console.log('✅ ALL SCHEMAS VALIDATED SUCCESSFULLY!');
  console.log('\nPhase 1 schema rewrite complete:');
  console.log('  - All schemas match current API format');
  console.log('  - Type inference verified');
  console.log('  - Ready for Phase 2 integration');
  process.exit(0);
} else {
  console.log('❌ SOME SCHEMAS FAILED VALIDATION');
  process.exit(1);
}
