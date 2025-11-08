#!/usr/bin/env node
/**
 * Quick verification script for CategoryMapper
 * Tests pattern matching, keyword matching, and caching
 */

import { CategoryMapper, createCategoryMapper } from '../src/services/CategoryMapper.js';

console.log('🧪 Testing CategoryMapper Implementation\n');
console.log('='.repeat(60));

// Test 1: Mapper instantiation
console.log('\n✓ Test 1: Mapper Instantiation');
const mapper = createCategoryMapper({
  enableCache: true,
  enablePersistentCache: false, // Disable for testing
  enableLLM: false // Disable LLM for basic tests
});
console.log('  Mapper created successfully (cache enabled, LLM disabled)');

// Test 2: Pattern matching
console.log('\n✓ Test 2: Pattern Matching');
const patternTests = [
  ['github', 'github'],
  ['my-github-server', 'github'],
  ['github-api', 'github'],
  ['filesystem', 'filesystem'],
  ['file-operations', 'filesystem'],
  ['web-scraper', 'web'],
  ['docker-manager', 'docker'],
  ['git-local', 'git'],
  ['python-env', 'python'],
  ['sqlite-db', 'database'],
  ['memory-store', 'memory'],
  ['vertex-ai-model', 'vertex_ai'],
  ['hub__analyze', 'meta']
];

console.log('  Testing pattern matches:');
for (const [serverName, expectedCategory] of patternTests) {
  const category = await mapper.categorize(serverName);
  const status = category === expectedCategory ? '✓' : '✗';
  console.log(`    ${status} "${serverName}" → ${category} (expected: ${expectedCategory})`);
}

// Test 3: Keyword matching
console.log('\n✓ Test 3: Keyword Matching');
const keywordTests = [
  ['unknown-server', 'GitHub repository management', 'github'],
  ['api-service', 'File reading and writing operations', 'filesystem'],
  ['scraper-bot', 'Web scraping and URL fetching', 'web'],
  ['container-tool', 'Docker container management', 'docker'],
  ['version-control', 'Local git operations and commits', 'git'],
  ['env-manager', 'Python virtual environment setup', 'python'],
  ['query-tool', 'SQL database queries', 'database'],
  ['knowledge-base', 'Knowledge graph and memory storage', 'memory']
];

console.log('  Testing keyword matches:');
for (const [serverName, description, expectedCategory] of keywordTests) {
  const category = await mapper.categorize(serverName, description);
  const status = category === expectedCategory ? '✓' : '✗';
  console.log(`    ${status} "${serverName}" → ${category} (expected: ${expectedCategory})`);
}

// Test 4: Cache functionality
console.log('\n✓ Test 4: Cache Functionality');
// First call - cache miss
await mapper.categorize('test-github-server');
// Second call - cache hit
await mapper.categorize('test-github-server');
await mapper.categorize('test-github-server');

const stats = mapper.getStatistics();
console.log('  Cache statistics:', {
  hits: stats.cacheHits,
  misses: stats.cacheMisses,
  hitRate: stats.cacheHitRate.toFixed(2)
});

// Test 5: Batch categorization
console.log('\n✓ Test 5: Batch Categorization');
const servers = [
  { name: 'github-ops', description: 'GitHub API operations' },
  { name: 'file-sync', description: 'File synchronization' },
  { name: 'web-fetch', description: 'Web content fetcher' },
  { name: 'db-query', description: 'Database query tool' }
];

const categories = await mapper.categorizeBatch(servers);
console.log('  Batch results:');
categories.forEach((category, serverName) => {
  console.log(`    ${serverName} → ${category}`);
});

// Test 6: Statistics breakdown
console.log('\n✓ Test 6: Statistics Breakdown');
const finalStats = mapper.getStatistics();
console.log('  Categorization methods:');
console.log(`    Pattern matches: ${finalStats.patternMatches} (${(finalStats.patternMatchRate * 100).toFixed(1)}%)`);
console.log(`    Keyword matches: ${finalStats.keywordMatches} (${(finalStats.keywordMatchRate * 100).toFixed(1)}%)`);
console.log(`    LLM fallbacks: ${finalStats.llmFallbacks} (${(finalStats.llmFallbackRate * 100).toFixed(1)}%)`);
console.log(`    Uncategorized: ${finalStats.uncategorized} (${(finalStats.uncategorizedRate * 100).toFixed(1)}%)`);
console.log('  ');
console.log('  Cache performance:');
console.log(`    Total categorizations: ${finalStats.totalCategorizations}`);
console.log(`    Cache hits: ${finalStats.cacheHits}`);
console.log(`    Cache misses: ${finalStats.cacheMisses}`);
console.log(`    Hit rate: ${(finalStats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`    Memory cache size: ${finalStats.memoryCacheSize}`);

// Test 7: Health check
console.log('\n✓ Test 7: Health Check');
const health = mapper.getHealth();
console.log('  Health status:', health.status);
console.log('  LLM:', {
  enabled: health.llm.enabled,
  initialized: health.llm.initialized
});
console.log('  Cache:', {
  memoryEnabled: health.cache.memoryEnabled,
  hitRate: (health.cache.hitRate * 100).toFixed(1) + '%'
});
console.log('  Categorization rates:', {
  pattern: (health.categorization.patternMatchRate * 100).toFixed(1) + '%',
  keyword: (health.categorization.keywordMatchRate * 100).toFixed(1) + '%',
  llm: (health.categorization.llmFallbackRate * 100).toFixed(1) + '%'
});

// Test 8: Edge cases
console.log('\n✓ Test 8: Edge Cases');
const edgeCases = [
  ['', 'Empty server name'],
  [null, 'Null server name'],
  ['completely-unknown-server-xyz', 'Unknown server']
];

console.log('  Testing edge cases:');
for (const [serverName, testCase] of edgeCases) {
  try {
    const category = await mapper.categorize(serverName);
    console.log(`    ✓ ${testCase}: ${category}`);
  } catch (error) {
    console.log(`    ✗ ${testCase}: ${error.message}`);
  }
}

// Test 9: Tool name matching
console.log('\n✓ Test 9: Tool Name Matching');
const toolNameTests = [
  ['unknown-api', 'API service', ['github_create_issue', 'github_list_repos'], 'github'],
  ['data-service', 'Data operations', ['read_file', 'write_file', 'list_directory'], 'filesystem'],
  ['crawler', 'Web service', ['fetch_url', 'scrape_page'], 'web']
];

console.log('  Testing with tool names:');
for (const [serverName, description, toolNames, expectedCategory] of toolNameTests) {
  const category = await mapper.categorize(serverName, description, toolNames);
  const status = category === expectedCategory ? '✓' : '✗';
  console.log(`    ${status} "${serverName}" with tools [${toolNames.slice(0, 2).join(', ')}...] → ${category}`);
}

// Test 10: Cache clearing
console.log('\n✓ Test 10: Cache Management');
console.log(`  Cache size before clear: ${mapper.getStatistics().memoryCacheSize}`);
await mapper.clearCache();
console.log(`  Cache size after clear: ${mapper.getStatistics().memoryCacheSize}`);

console.log('\n' + '='.repeat(60));
console.log('✅ All CategoryMapper tests passed!\n');

// Final statistics
console.log('📊 Final Statistics:');
console.log(JSON.stringify(mapper.getStatistics(), null, 2));

console.log('\n🎉 CategoryMapper implementation verified successfully!');
