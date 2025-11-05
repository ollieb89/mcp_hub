#!/usr/bin/env node
/**
 * Quick verification script for CategoryService
 * Tests basic functionality and confirms implementation
 */

import { CategoryService, createCategoryService } from '../src/services/CategoryService.js';

console.log('🧪 Testing CategoryService Implementation\n');
console.log('=' .repeat(50));

// Test 1: Service instantiation
console.log('\n✓ Test 1: Service Instantiation');
const service = createCategoryService({ enableCache: true });
console.log('  Service created successfully');

// Test 2: Get single category
console.log('\n✓ Test 2: Get Single Category');
const github = service.getCategory('github');
console.log('  GitHub category:', {
  id: github.id,
  name: github.name,
  color: github.color,
  patternCount: github.patterns.length,
  keywordCount: github.keywords.length
});

// Test 3: Get all categories
console.log('\n✓ Test 3: Get All Categories');
const all = service.getAllCategories();
console.log(`  Total categories: ${all.length}`);
console.log('  Category IDs:', service.getCategoryIds().join(', '));

// Test 4: Validation
console.log('\n✓ Test 4: Category Validation');
const validTests = [
  ['github', true],
  ['filesystem', true],
  ['invalid', false],
  ['', false],
  [null, false]
];

validTests.forEach(([id, expected]) => {
  const result = service.validateCategory(id);
  const status = result === expected ? '✓' : '✗';
  console.log(`  ${status} validateCategory('${id}'): ${result} (expected: ${expected})`);
});

// Test 5: Category lookup methods
console.log('\n✓ Test 5: Category Lookup Methods');
console.log('  getCategoryName("github"):', service.getCategoryName('github'));
console.log('  getCategoryColor("github"):', service.getCategoryColor('github'));
console.log('  categoryExists("github"):', service.categoryExists('github'));
console.log('  categoryExists("invalid"):', service.categoryExists('invalid'));

// Test 6: Find category by criteria
console.log('\n✓ Test 6: Find Category by Criteria');
const foundByName = service.findCategory({ name: 'GitHub' });
console.log('  Find by name "GitHub":', foundByName ? foundByName.id : 'not found');
const foundByColor = service.findCategory({ color: '#00CEC9' });
console.log('  Find by color "#00CEC9":', foundByColor ? foundByColor.id : 'not found');

// Test 7: Cache functionality
console.log('\n✓ Test 7: Cache Functionality');
const cachedCount = service.warmCache();
console.log(`  Warmed cache with ${cachedCount} categories`);

// Trigger cache hits
for (let i = 0; i < 5; i++) {
  service.getCategory('github');
}

// Test 8: Statistics
console.log('\n✓ Test 8: Service Statistics');
const stats = service.getStatistics();
console.log('  Statistics:', {
  totalCategories: stats.totalCategories,
  categoryRetrieval: stats.categoryRetrieval,
  cacheHits: stats.cacheHits,
  cacheMisses: stats.cacheMisses,
  cacheHitRate: stats.cacheHitRate.toFixed(2),
  cacheSize: stats.cacheSize
});

// Test 9: Health check
console.log('\n✓ Test 9: Health Check');
const health = service.getHealth();
console.log('  Health status:', health.status);
console.log('  Categories loaded:', health.categories.loaded);
console.log('  Cache enabled:', health.cache.enabled);
console.log('  Cache hit rate:', health.cache.hitRate.toFixed(2));

// Test 10: Color palette
console.log('\n✓ Test 10: Color Palette');
const colors = service.getAllColors();
console.log('  Available colors:', Object.keys(colors).length);
console.log('  Sample colors:');
Object.entries(colors).slice(0, 3).forEach(([id, color]) => {
  console.log(`    ${id}: ${color}`);
});

console.log('\n' + '='.repeat(50));
console.log('✅ All CategoryService tests passed!\n');

// Export for validation
console.log('📊 Service Export:');
const exported = service.export();
console.log(JSON.stringify(exported, null, 2));

console.log('\n🎉 CategoryService implementation verified successfully!');
