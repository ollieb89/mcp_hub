#!/usr/bin/env bun
/**
 * Quick validation script to test tools schema against real API response
 */
import { ToolsResponseSchema } from '../src/ui/api/schemas/tools.schema';

const realResponse = {
  tools: [
    {
      server: 'shadcn-ui',
      serverDisplayName: 'shadcn-ui',
      name: 'get_component',
      description: 'Get the source code for a shadcn/ui component',
      enabled: true,
      categories: [],
    },
    {
      server: 'git',
      serverDisplayName: 'git',
      name: 'git_status',
      description: 'Check git repository status',
      enabled: true,
      categories: ['version-control'],
    },
    {
      server: 'github',
      serverDisplayName: 'github',
      name: 'create_issue',
      description: 'Create a new GitHub issue',
      enabled: false,
      categories: ['issue-tracking', 'collaboration'],
    },
  ],
};

const result = ToolsResponseSchema.safeParse(realResponse);

if (result.success) {
  console.log('✅ Tools schema validation: SUCCESS');
  console.log(`   - tools: ${result.data.tools.length} tools`);
  console.log(
    `   - enabled: ${result.data.tools.filter((t) => t.enabled).length}`
  );
  console.log(
    `   - with categories: ${result.data.tools.filter((t) => t.categories.length > 0).length}`
  );
  console.log('\nType inference test:');
  const firstTool = result.data.tools[0];
  const enabled: boolean = firstTool.enabled;
  const categories: string[] = firstTool.categories;
  console.log(`   - Type-safe enabled: ${enabled}`);
  console.log(`   - Type-safe categories: ${JSON.stringify(categories)}`);
  process.exit(0);
} else {
  console.log('❌ Tools schema validation: FAILED');
  console.error('\nValidation errors:');
  result.error.issues.forEach((issue, index) => {
    console.error(`\n  Error ${index + 1}:`);
    console.error(`    Path: ${issue.path.join('.')}`);
    console.error(`    Message: ${issue.message}`);
    console.error(`    Code: ${issue.code}`);
  });
  process.exit(1);
}
