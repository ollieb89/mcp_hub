#!/usr/bin/env bun
/**
 * Quick validation script to test filtering schema against real API response
 */
import { FilteringStatsSchema } from '../src/ui/api/schemas/filtering.schema';

const realResponse = {
  enabled: true,
  mode: 'server-allowlist',
  totalTools: 355,
  filteredTools: 205,
  exposedTools: 150,
  filterRate: 0.5774647887323944,
  serverFilterMode: 'allowlist',
  allowedServers: ['serena', 'git', 'github'],
  allowedCategories: [],
  categoryCacheSize: 352,
  cacheHitRate: 0.008450704225352112,
  llmCacheSize: 153,
  llmCacheHitRate: 0,
  timestamp: '2025-11-08T04:12:56.647Z',
};

const result = FilteringStatsSchema.safeParse(realResponse);

if (result.success) {
  console.log('✅ Filtering schema validation: SUCCESS');
  console.log(`   - enabled: ${result.data.enabled}`);
  console.log(`   - mode: ${result.data.mode}`);
  console.log(`   - totalTools: ${result.data.totalTools}`);
  console.log(`   - exposedTools: ${result.data.exposedTools}`);
  console.log(`   - filterRate: ${(result.data.filterRate * 100).toFixed(1)}%`);
  console.log('\nType inference test:');
  const mode: 'static' | 'server-allowlist' | 'category' | 'prompt-based' =
    result.data.mode;
  const serverFilterMode: 'allowlist' | 'blocklist' =
    result.data.serverFilterMode;
  console.log(`   - Type-safe mode: ${mode}`);
  console.log(`   - Type-safe serverFilterMode: ${serverFilterMode}`);
  process.exit(0);
} else {
  console.log('❌ Filtering schema validation: FAILED');
  console.error('\nValidation errors:');
  result.error.issues.forEach((issue, index) => {
    console.error(`\n  Error ${index + 1}:`);
    console.error(`    Path: ${issue.path.join('.')}`);
    console.error(`    Message: ${issue.message}`);
    console.error(`    Code: ${issue.code}`);
  });
  process.exit(1);
}
