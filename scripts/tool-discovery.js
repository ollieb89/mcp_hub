#!/usr/bin/env node

/**
 * MCP Hub Tool Discovery & Categorization Explorer
 *
 * Interactive CLI tool for exploring tool categorization, statistics, and filtering simulation.
 *
 * Features:
 * - Tool categorization analysis
 * - Category statistics and distribution
 * - Filtering simulation (server, category, hybrid modes)
 * - Export reports (JSON, CSV, Markdown)
 *
 * Usage:
 *   node scripts/tool-discovery.js
 *   node scripts/tool-discovery.js --mode stats
 *   node scripts/tool-discovery.js --mode simulate --filter category=filesystem
 *   node scripts/tool-discovery.js --mode export --format json
 */

import { readFileSync, existsSync } from 'fs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    mode: 'interactive',
    filter: {},
    format: 'table',
    output: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--mode' || arg === '-m') {
      parsed.mode = args[++i];
    } else if (arg === '--filter' || arg === '-f') {
      const [key, value] = args[++i].split('=');
      parsed.filter[key] = value;
    } else if (arg === '--format') {
      parsed.format = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      parsed.output = args[++i];
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
MCP Hub Tool Discovery & Categorization Explorer

USAGE:
  node scripts/tool-discovery.js [OPTIONS]

OPTIONS:
  --mode, -m <mode>        Operation mode: interactive, stats, simulate, export
  --filter, -f <key=value> Filter criteria (mode=<mode>, category=<cat>, server=<name>)
  --format <format>        Output format: table, json, csv, markdown
  --output, -o <file>      Output file path (default: stdout)
  --help, -h               Show this help message

MODES:
  interactive   Interactive exploration (default)
  stats         Show categorization statistics
  simulate      Simulate filtering with given criteria
  export        Export tool data in specified format

EXAMPLES:
  # Interactive mode
  node scripts/tool-discovery.js

  # Show statistics
  node scripts/tool-discovery.js --mode stats

  # Simulate category filtering
  node scripts/tool-discovery.js --mode simulate --filter category=filesystem

  # Export to JSON
  node scripts/tool-discovery.js --mode export --format json --output tools.json

  # Export to CSV
  node scripts/tool-discovery.js --mode export --format csv --output tools.csv
`);
}

// ============================================================================
// Configuration Loading
// ============================================================================

function loadConfig() {
  const configPaths = [
    join(__dirname, '..', 'config', 'mcp-hub.json'),
    join(__dirname, '..', 'config.json'),
    join(homedir(), '.mcp-hub', 'config.json')
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        console.error(`Error loading config from ${path}:`, error.message);
      }
    }
  }

  return { mcpServers: {}, toolFiltering: { enabled: false } };
}

// ============================================================================
// Tool Data Collection
// ============================================================================

function collectToolsFromServers(config) {
  const tools = [];
  const servers = config.mcpServers || {};

  // Simulated tool collection (in real usage, would connect to running MCP Hub)
  // For demonstration, we'll use example data

  const exampleTools = {
    filesystem: [
      { name: 'filesystem__read_file', description: 'Read a file from disk' },
      { name: 'filesystem__write_file', description: 'Write content to a file' },
      { name: 'filesystem__list_dir', description: 'List directory contents' },
      { name: 'filesystem__delete_file', description: 'Delete a file' },
      { name: 'filesystem__move_file', description: 'Move or rename a file' }
    ],
    github: [
      { name: 'github__search_repositories', description: 'Search for repositories' },
      { name: 'github__get_pull_requests', description: 'Get pull requests for a repo' },
      { name: 'github__create_issue', description: 'Create a new issue' },
      { name: 'github__list_commits', description: 'List commits in a repository' }
    ],
    web: [
      { name: 'fetch__url', description: 'Fetch content from a URL' },
      { name: 'fetch__post', description: 'Send POST request to URL' },
      { name: 'web__screenshot', description: 'Capture webpage screenshot' }
    ],
    docker: [
      { name: 'docker__run', description: 'Run a Docker container' },
      { name: 'docker__build', description: 'Build a Docker image' },
      { name: 'docker__ps', description: 'List running containers' }
    ],
    database: [
      { name: 'postgres__query', description: 'Execute SQL query on PostgreSQL' },
      { name: 'mongo__find', description: 'Find documents in MongoDB' }
    ]
  };

  // Convert to standard format with server names
  for (const [serverName, serverTools] of Object.entries(exampleTools)) {
    for (const tool of serverTools) {
      tools.push({
        toolName: tool.name,
        serverName: serverName,
        description: tool.description,
        category: categorize(tool.name)
      });
    }
  }

  return tools;
}

// Simple heuristic categorization
function categorize(toolName) {
  const name = toolName.toLowerCase();

  if (name.includes('filesystem') || name.includes('file')) return 'filesystem';
  if (name.includes('github') || name.includes('git')) return 'version-control';
  if (name.includes('fetch') || name.includes('http') || name.includes('web')) return 'web';
  if (name.includes('docker')) return 'docker';
  if (name.includes('postgres') || name.includes('mongo') || name.includes('database')) return 'database';
  if (name.includes('search')) return 'search';
  if (name.includes('cloud') || name.includes('aws') || name.includes('gcp')) return 'cloud';

  return 'other';
}

// ============================================================================
// Statistics Calculation
// ============================================================================

function calculateStats(tools) {
  const stats = {
    total: tools.length,
    byCategory: {},
    byServer: {},
    categoryCoverage: {}
  };

  // Group by category
  for (const tool of tools) {
    const cat = tool.category;
    if (!stats.byCategory[cat]) {
      stats.byCategory[cat] = { count: 0, tools: [] };
    }
    stats.byCategory[cat].count++;
    stats.byCategory[cat].tools.push(tool.toolName);
  }

  // Group by server
  for (const tool of tools) {
    const server = tool.serverName;
    if (!stats.byServer[server]) {
      stats.byServer[server] = { count: 0, categories: new Set() };
    }
    stats.byServer[server].count++;
    stats.byServer[server].categories.add(tool.category);
  }

  // Convert Sets to arrays
  for (const [server, data] of Object.entries(stats.byServer)) {
    data.categories = Array.from(data.categories);
  }

  // Calculate category coverage
  const totalCategories = Object.keys(stats.byCategory).length;
  stats.categoryCoverage = {
    total: totalCategories,
    percentage: ((totalCategories / 10) * 100).toFixed(1) + '%'
  };

  return stats;
}

// ============================================================================
// Filtering Simulation
// ============================================================================

function simulateFiltering(tools, filters) {
  let filtered = [...tools];
  const results = {
    original: tools.length,
    filtered: 0,
    reduction: 0,
    filters: filters,
    tools: []
  };

  // Apply filters
  if (filters.mode === 'server-allowlist' && filters.servers) {
    const allowedServers = filters.servers.split(',');
    filtered = filtered.filter(t => allowedServers.includes(t.serverName));
  }

  if (filters.mode === 'category' && filters.categories) {
    const allowedCategories = filters.categories.split(',');
    filtered = filtered.filter(t => allowedCategories.includes(t.category));
  }

  if (filters.server) {
    filtered = filtered.filter(t => t.serverName === filters.server);
  }

  if (filters.category) {
    filtered = filtered.filter(t => t.category === filters.category);
  }

  results.filtered = filtered.length;
  results.reduction = ((1 - filtered.length / tools.length) * 100).toFixed(1) + '%';
  results.tools = filtered;

  return results;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatTable(stats) {
  console.log('\n=== TOOL CATEGORIZATION STATISTICS ===\n');
  console.log(`Total Tools: ${stats.total}`);
  console.log(`Categories: ${stats.categoryCoverage.total} (${stats.categoryCoverage.percentage} coverage)\n`);

  console.log('Category Distribution:');
  console.log('─'.repeat(60));

  const categories = Object.entries(stats.byCategory)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [category, data] of categories) {
    const percentage = ((data.count / stats.total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`${category.padEnd(20)} ${data.count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\nServer Distribution:');
  console.log('─'.repeat(60));

  const servers = Object.entries(stats.byServer)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [server, data] of servers) {
    const percentage = ((data.count / stats.total) * 100).toFixed(1);
    console.log(`${server.padEnd(20)} ${data.count.toString().padStart(4)} tools (${percentage.padStart(5)}%)`);
    console.log(`${''.padEnd(20)} Categories: ${data.categories.join(', ')}`);
  }

  console.log('─'.repeat(60) + '\n');
}

function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

function formatCSV(tools) {
  const header = 'Tool Name,Server,Category,Description\n';
  const rows = tools.map(t =>
    `"${t.toolName}","${t.serverName}","${t.category}","${t.description}"`
  ).join('\n');
  return header + rows;
}

function formatMarkdown(stats) {
  let md = '# Tool Categorization Report\n\n';
  md += `**Generated**: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total Tools**: ${stats.total}\n`;
  md += `- **Categories**: ${stats.categoryCoverage.total}\n`;
  md += `- **Coverage**: ${stats.categoryCoverage.percentage}\n\n`;

  md += `## Category Distribution\n\n`;
  md += `| Category | Count | Percentage |\n`;
  md += `|----------|-------|------------|\n`;

  const categories = Object.entries(stats.byCategory)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [category, data] of categories) {
    const percentage = ((data.count / stats.total) * 100).toFixed(1) + '%';
    md += `| ${category} | ${data.count} | ${percentage} |\n`;
  }

  md += `\n## Server Distribution\n\n`;
  md += `| Server | Tools | Categories |\n`;
  md += `|--------|-------|------------|\n`;

  const servers = Object.entries(stats.byServer)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [server, data] of servers) {
    md += `| ${server} | ${data.count} | ${data.categories.join(', ')} |\n`;
  }

  return md;
}

function formatSimulationResults(results) {
  console.log('\n=== FILTERING SIMULATION RESULTS ===\n');
  console.log(`Original Tools: ${results.original}`);
  console.log(`Filtered Tools: ${results.filtered}`);
  console.log(`Reduction: ${results.reduction}\n`);

  console.log('Applied Filters:');
  for (const [key, value] of Object.entries(results.filters)) {
    console.log(`  ${key}: ${value}`);
  }

  console.log('\nFiltered Tools:');
  console.log('─'.repeat(80));

  const grouped = {};
  for (const tool of results.tools) {
    if (!grouped[tool.category]) {
      grouped[tool.category] = [];
    }
    grouped[tool.category].push(tool);
  }

  for (const [category, tools] of Object.entries(grouped).sort()) {
    console.log(`\n${category.toUpperCase()} (${tools.length} tools):`);
    for (const tool of tools) {
      console.log(`  - ${tool.toolName.padEnd(40)} (${tool.serverName})`);
    }
  }

  console.log('\n' + '─'.repeat(80) + '\n');
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function runInteractive(tools, stats) {
  console.log('\n' + '='.repeat(80));
  console.log('MCP Hub Tool Discovery - Interactive Mode');
  console.log('='.repeat(80) + '\n');

  console.log('Available Commands:');
  console.log('  1. Show statistics');
  console.log('  2. Filter by category');
  console.log('  3. Filter by server');
  console.log('  4. Export report');
  console.log('  5. Exit\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (question) => new Promise(resolve => {
    rl.question(question, resolve);
  });

  let running = true;
  while (running) {
    const choice = await prompt('Enter command (1-5): ');

    switch (choice.trim()) {
      case '1':
        formatTable(stats);
        break;

      case '2': {
        const category = await prompt('Enter category (or "list" to see all): ');
        if (category === 'list') {
          console.log('\nAvailable categories:');
          Object.keys(stats.byCategory).forEach(cat => console.log(`  - ${cat}`));
          console.log();
        } else {
          const results = simulateFiltering(tools, { category });
          formatSimulationResults(results);
        }
        break;
      }

      case '3': {
        const server = await prompt('Enter server name (or "list" to see all): ');
        if (server === 'list') {
          console.log('\nAvailable servers:');
          Object.keys(stats.byServer).forEach(srv => console.log(`  - ${srv}`));
          console.log();
        } else {
          const results = simulateFiltering(tools, { server });
          formatSimulationResults(results);
        }
        break;
      }

      case '4': {
        const format = await prompt('Enter format (json/csv/markdown): ');
        const filename = await prompt('Enter filename (or press Enter for stdout): ');

        let output;
        if (format === 'json') {
          output = formatJSON(stats);
        } else if (format === 'csv') {
          output = formatCSV(tools);
        } else if (format === 'markdown') {
          output = formatMarkdown(stats);
        } else {
          console.log('Invalid format');
          break;
        }

        if (filename) {
          writeFileSync(filename, output);
          console.log(`Report exported to ${filename}\n`);
        } else {
          console.log('\n' + output + '\n');
        }
        break;
      }

      case '5':
        running = false;
        break;

      default:
        console.log('Invalid choice\n');
    }
  }

  rl.close();
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('Loading configuration...');
  const config = loadConfig();

  console.log('Collecting tool data...');
  const tools = collectToolsFromServers(config);

  console.log('Calculating statistics...');
  const stats = calculateStats(tools);

  if (args.mode === 'stats') {
    formatTable(stats);
  } else if (args.mode === 'simulate') {
    const results = simulateFiltering(tools, args.filter);
    formatSimulationResults(results);
  } else if (args.mode === 'export') {
    let output;
    if (args.format === 'json') {
      output = formatJSON(stats);
    } else if (args.format === 'csv') {
      output = formatCSV(tools);
    } else if (args.format === 'markdown') {
      output = formatMarkdown(stats);
    } else {
      formatTable(stats);
      return;
    }

    if (args.output) {
      writeFileSync(args.output, output);
      console.log(`Report exported to ${args.output}`);
    } else {
      console.log(output);
    }
  } else if (args.mode === 'interactive') {
    await runInteractive(tools, stats);
  } else {
    console.error(`Unknown mode: ${args.mode}`);
    printHelp();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
