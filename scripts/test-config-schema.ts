#!/usr/bin/env bun
/**
 * Quick validation script to test config schema against real API response
 */
import { ConfigResponseSchema } from '../src/ui/api/schemas/config.schema';

const realResponse = {
  config: {
    toolFiltering: {
      enabled: true,
      mode: 'server-allowlist',
      comment: "Modes: 'static', 'server-allowlist', 'prompt-based'",
      promptBasedFiltering: {
        enabled: true,
        defaultExposure: 'meta-only',
        enableMetaTools: true,
        sessionIsolation: true,
      },
      serverFilter: {
        mode: 'allowlist',
        servers: ['serena', 'git', 'github'],
      },
      llmCategorization: {
        enabled: true,
        provider: 'gemini',
        apiKey: '${GEMINI_API_KEY}',
        model: 'gemini-2.5-flash',
      },
    },
    connectionPool: {
      enabled: true,
      keepAliveTimeout: 60000,
      maxConnections: 50,
    },
    mcpServers: {
      serena: {
        command: 'uv',
        args: ['run', '--directory', '${HOME}/serena'],
        cwd: '.',
        env: {},
        disabled: false,
      },
      'shadcn-ui': {
        command: 'npx',
        args: ['-y', 'shadcn-ui-mcp-server'],
        cwd: '.',
        env: {},
        disabled: false,
      },
    },
  },
};

const result = ConfigResponseSchema.safeParse(realResponse);

if (result.success) {
  console.log('✅ Config schema validation: SUCCESS');
  console.log(
    `   - toolFiltering enabled: ${result.data.config.toolFiltering?.enabled}`
  );
  console.log(
    `   - mode: ${result.data.config.toolFiltering?.mode}`
  );
  console.log(
    `   - mcpServers: ${Object.keys(result.data.config.mcpServers).length} servers`
  );
  console.log('\nType inference test:');
  const toolFiltering = result.data.config.toolFiltering;
  if (toolFiltering) {
    const mode:
      | 'static'
      | 'server-allowlist'
      | 'category'
      | 'prompt-based'
      | undefined = toolFiltering.mode;
    console.log(`   - Type-safe mode: ${mode}`);
  }
  process.exit(0);
} else {
  console.log('❌ Config schema validation: FAILED');
  console.error('\nValidation errors:');
  result.error.issues.forEach((issue, index) => {
    console.error(`\n  Error ${index + 1}:`);
    console.error(`    Path: ${issue.path.join('.')}`);
    console.error(`    Message: ${issue.message}`);
    console.error(`    Code: ${issue.code}`);
  });
  process.exit(1);
}
