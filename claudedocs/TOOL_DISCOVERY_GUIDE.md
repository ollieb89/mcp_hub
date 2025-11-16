# Tool Discovery & Categorization Explorer Guide

**Version**: 1.0
**Date**: November 16, 2025
**Status**: Production Ready

## Overview

The Tool Discovery Explorer is an interactive CLI tool for analyzing MCP Hub tool categorization, viewing statistics, simulating filtering scenarios, and exporting reports.

**Location**: `scripts/tool-discovery.js`

### Key Features

✅ **Tool Categorization Analysis**: Explore how tools are categorized across servers
✅ **Statistics Dashboard**: View distribution by category and server
✅ **Filtering Simulation**: Test different filtering configurations without affecting production
✅ **Export Capabilities**: Generate reports in JSON, CSV, or Markdown format
✅ **Interactive Mode**: User-friendly CLI interface for exploration

---

## Installation

### Prerequisites

- Node.js >= 18.0.0 or Bun >= 1.0.0
- MCP Hub installed

### Setup

```bash
# Make script executable (already done)
chmod +x scripts/tool-discovery.js

# Verify installation
node scripts/tool-discovery.js --help
```

---

## Usage

### Basic Usage

```bash
# Interactive mode (default)
node scripts/tool-discovery.js

# Show statistics
node scripts/tool-discovery.js --mode stats

# Simulate filtering
node scripts/tool-discovery.js --mode simulate --filter category=filesystem

# Export report
node scripts/tool-discovery.js --mode export --format json --output report.json
```

### Command-Line Options

```
--mode, -m <mode>         Operation mode: interactive, stats, simulate, export
--filter, -f <key=value>  Filter criteria (mode, category, server)
--format <format>         Output format: table, json, csv, markdown
--output, -o <file>       Output file path (default: stdout)
--help, -h                Show help message
```

---

## Modes

### 1. Interactive Mode

**Description**: User-friendly interactive exploration

**Usage**:
```bash
node scripts/tool-discovery.js
# OR
node scripts/tool-discovery.js --mode interactive
```

**Features**:
- Menu-driven interface
- Real-time statistics
- Filter simulation
- Export capabilities

**Example Session**:
```
================================================================================
MCP Hub Tool Discovery - Interactive Mode
================================================================================

Available Commands:
  1. Show statistics
  2. Filter by category
  3. Filter by server
  4. Export report
  5. Exit

Enter command (1-5): 1

=== TOOL CATEGORIZATION STATISTICS ===

Total Tools: 24
Categories: 5 (50.0% coverage)

Category Distribution:
────────────────────────────────────────────────────────────
filesystem            5 ( 20.8%) ██████████
version-control       4 ( 16.7%) ████████
web                   3 ( 12.5%) ██████
docker                3 ( 12.5%) ██████
database              2 (  8.3%) ████
other                 7 ( 29.2%) ██████████████
────────────────────────────────────────────────────────────
```

### 2. Statistics Mode

**Description**: Display categorization statistics

**Usage**:
```bash
node scripts/tool-discovery.js --mode stats
```

**Output**:
```
=== TOOL CATEGORIZATION STATISTICS ===

Total Tools: 24
Categories: 5 (50.0% coverage)

Category Distribution:
────────────────────────────────────────────────────────────
filesystem            5 ( 20.8%) ██████████
version-control       4 ( 16.7%) ████████
web                   3 ( 12.5%) ██████
...

Server Distribution:
────────────────────────────────────────────────────────────
filesystem           5 tools ( 20.8%)
                     Categories: filesystem
github               4 tools ( 16.7%)
                     Categories: version-control
...
```

### 3. Simulation Mode

**Description**: Test filtering configurations without affecting production

**Usage**:
```bash
# Filter by category
node scripts/tool-discovery.js --mode simulate --filter category=filesystem

# Filter by server
node scripts/tool-discovery.js --mode simulate --filter server=github

# Multiple filters
node scripts/tool-discovery.js --mode simulate \
  --filter mode=category \
  --filter categories=filesystem,web
```

**Output**:
```
=== FILTERING SIMULATION RESULTS ===

Original Tools: 24
Filtered Tools: 5
Reduction: 79.2%

Applied Filters:
  category: filesystem

Filtered Tools:
────────────────────────────────────────────────────────────

FILESYSTEM (5 tools):
  - filesystem__read_file                    (filesystem)
  - filesystem__write_file                   (filesystem)
  - filesystem__list_dir                     (filesystem)
  - filesystem__delete_file                  (filesystem)
  - filesystem__move_file                    (filesystem)

────────────────────────────────────────────────────────────
```

### 4. Export Mode

**Description**: Generate reports in various formats

**Usage**:
```bash
# Export to JSON
node scripts/tool-discovery.js --mode export --format json --output report.json

# Export to CSV
node scripts/tool-discovery.js --mode export --format csv --output tools.csv

# Export to Markdown
node scripts/tool-discovery.js --mode export --format markdown --output report.md

# Print to stdout
node scripts/tool-discovery.js --mode export --format json
```

---

## Output Formats

### JSON Format

**Structure**:
```json
{
  "total": 24,
  "byCategory": {
    "filesystem": {
      "count": 5,
      "tools": ["filesystem__read_file", "filesystem__write_file", ...]
    },
    "version-control": {
      "count": 4,
      "tools": ["github__search_repositories", ...]
    }
  },
  "byServer": {
    "filesystem": {
      "count": 5,
      "categories": ["filesystem"]
    },
    "github": {
      "count": 4,
      "categories": ["version-control"]
    }
  },
  "categoryCoverage": {
    "total": 5,
    "percentage": "50.0%"
  }
}
```

### CSV Format

**Structure**:
```csv
Tool Name,Server,Category,Description
"filesystem__read_file","filesystem","filesystem","Read a file from disk"
"filesystem__write_file","filesystem","filesystem","Write content to a file"
"github__search_repositories","github","version-control","Search for repositories"
...
```

### Markdown Format

**Structure**:
```markdown
# Tool Categorization Report

**Generated**: 2025-11-16T10:30:00.000Z

## Summary

- **Total Tools**: 24
- **Categories**: 5
- **Coverage**: 50.0%

## Category Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| filesystem | 5 | 20.8% |
| version-control | 4 | 16.7% |
...

## Server Distribution

| Server | Tools | Categories |
|--------|-------|------------|
| filesystem | 5 | filesystem |
| github | 4 | version-control |
...
```

---

## Use Cases

### 1. Understanding Tool Distribution

**Goal**: See how tools are categorized across servers

**Steps**:
```bash
# View statistics
node scripts/tool-discovery.js --mode stats

# Or export detailed report
node scripts/tool-discovery.js --mode export --format markdown --output distribution.md
```

**Output Insights**:
- Which categories have the most tools
- Server-to-category mapping
- Coverage percentage (categories used / total categories)

### 2. Testing Filtering Configurations

**Goal**: Validate filtering configuration before deploying to production

**Steps**:
```bash
# Test category filter
node scripts/tool-discovery.js --mode simulate --filter category=filesystem

# Test server filter
node scripts/tool-discovery.js --mode simulate --filter server=github

# Test hybrid filter
node scripts/tool-discovery.js --mode simulate \
  --filter mode=hybrid \
  --filter categories=filesystem,web \
  --filter servers=github
```

**Output Insights**:
- How many tools will be exposed
- What the reduction percentage is
- Which tools will be included/excluded

### 3. Generating Reports for Documentation

**Goal**: Create comprehensive tool inventory for documentation

**Steps**:
```bash
# Generate JSON for programmatic use
node scripts/tool-discovery.js --mode export --format json --output inventory.json

# Generate CSV for spreadsheet analysis
node scripts/tool-discovery.js --mode export --format csv --output tools.csv

# Generate Markdown for documentation
node scripts/tool-discovery.js --mode export --format markdown --output README_TOOLS.md
```

### 4. Identifying Categorization Issues

**Goal**: Find tools that might be miscategorized

**Steps**:
```bash
# Interactive exploration
node scripts/tool-discovery.js

# Commands:
# 1. Show statistics → identify large "other" category
# 2. Filter by category → view "other" tools
# 3. Manually review categorization logic
```

**Common Issues**:
- Too many tools in "other" category
- Unexpected category assignments
- Missing category coverage

---

## Advanced Workflows

### Workflow 1: Pre-Deployment Validation

```bash
#!/bin/bash
# validate-filtering.sh

echo "Running pre-deployment validation..."

# 1. Generate baseline report
node scripts/tool-discovery.js --mode export --format json --output baseline.json

# 2. Test proposed configuration
node scripts/tool-discovery.js --mode simulate \
  --filter mode=category \
  --filter categories=filesystem,web,version-control

# 3. Verify reduction is acceptable
REDUCTION=$(node scripts/tool-discovery.js --mode simulate \
  --filter category=filesystem | grep "Reduction:" | awk '{print $2}')

echo "Tool reduction: $REDUCTION"

# 4. Export final report
node scripts/tool-discovery.js --mode export --format markdown \
  --output deployment-report.md

echo "Validation complete. Review deployment-report.md"
```

### Workflow 2: Monitoring Categorization Drift

```bash
#!/bin/bash
# monitor-drift.sh

echo "Monitoring categorization drift..."

# 1. Generate current snapshot
node scripts/tool-discovery.js --mode export --format json \
  --output snapshots/$(date +%Y%m%d).json

# 2. Compare with last snapshot
LAST=$(ls -1 snapshots/*.json | tail -2 | head -1)
CURRENT=$(ls -1 snapshots/*.json | tail -1)

echo "Comparing $LAST to $CURRENT"

# 3. Report differences
jq -s '.[0].total - .[1].total' $LAST $CURRENT

echo "Drift monitoring complete"
```

### Workflow 3: Automated Reporting

```bash
#!/bin/bash
# generate-weekly-report.sh

echo "Generating weekly tool categorization report..."

WEEK=$(date +%Y-W%W)

# 1. Generate comprehensive report
node scripts/tool-discovery.js --mode export --format markdown \
  --output reports/tool-report-$WEEK.md

# 2. Generate CSV for analytics
node scripts/tool-discovery.js --mode export --format csv \
  --output reports/tool-data-$WEEK.csv

# 3. Send email notification (example)
cat reports/tool-report-$WEEK.md | mail -s "MCP Hub Weekly Report: $WEEK" team@example.com

echo "Report generated: reports/tool-report-$WEEK.md"
```

---

## Troubleshooting

### Issue: "Configuration not found"

**Symptom**:
```
Loading configuration...
Error: No configuration file found
```

**Solution**:
```bash
# Check config file exists
ls -la config/mcp-hub.json

# Or specify custom config location
# (modify script to accept --config parameter)
```

### Issue: "No tools found"

**Symptom**:
```
Collecting tool data...
Total Tools: 0
```

**Solution**:
- Tool discovery script uses example data by default
- To use real data, connect to running MCP Hub:
  ```javascript
  // Fetch from API instead of example data
  const response = await fetch('http://localhost:7000/api/tools');
  const data = await response.json();
  ```

### Issue: "Permission denied"

**Symptom**:
```
bash: ./scripts/tool-discovery.js: Permission denied
```

**Solution**:
```bash
chmod +x scripts/tool-discovery.js
```

### Issue: "Module not found"

**Symptom**:
```
Error: Cannot find module 'readline'
```

**Solution**:
```bash
# Ensure Node.js >= 18 or Bun >= 1.0
node --version
bun --version

# Reinstall dependencies
bun install
```

---

## Extending the Tool

### Adding Custom Categories

**Modify categorization logic**:
```javascript
// In function categorize(toolName)
function categorize(toolName) {
  const name = toolName.toLowerCase();

  // Add your custom categories
  if (name.includes('ai') || name.includes('llm')) return 'ai';
  if (name.includes('analytics')) return 'analytics';

  // ... existing logic
}
```

### Connecting to Live MCP Hub

**Replace example data with API calls**:
```javascript
async function collectToolsFromServers(config) {
  // Fetch from running MCP Hub
  const response = await fetch('http://localhost:7000/api/tools');
  const data = await response.json();

  return data.tools.map(tool => ({
    toolName: tool.name,
    serverName: tool.server,
    description: tool.description,
    category: categorize(tool.name)
  }));
}
```

### Adding Custom Export Formats

**Add new format**:
```javascript
function formatXML(stats) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<toolReport>\n';
  xml += `  <summary>\n`;
  xml += `    <total>${stats.total}</total>\n`;
  // ... build XML structure
  xml += '</toolReport>\n';
  return xml;
}

// Add to export mode
if (args.format === 'xml') {
  output = formatXML(stats);
}
```

---

## Best Practices

### 1. Regular Reporting

**Generate weekly reports**:
```bash
# Cron job: Every Monday at 9 AM
0 9 * * 1 /path/to/mcp-hub/scripts/tool-discovery.js \
  --mode export \
  --format markdown \
  --output /var/reports/tool-report-$(date +\%Y-\%W).md
```

### 2. Pre-Deployment Validation

**Always simulate before deploying**:
```bash
# Test configuration changes
node scripts/tool-discovery.js --mode simulate \
  --filter mode=category \
  --filter categories=filesystem,web

# Verify reduction is acceptable (e.g., >80%)
# Only deploy if results meet expectations
```

### 3. Version Control Reports

**Track categorization changes over time**:
```bash
# Generate monthly snapshots
node scripts/tool-discovery.js --mode export --format json \
  --output reports/$(date +%Y-%m).json

# Commit to git
git add reports/$(date +%Y-%m).json
git commit -m "Tool categorization snapshot: $(date +%Y-%m)"
```

### 4. Automated Anomaly Detection

**Detect unexpected changes**:
```bash
#!/bin/bash
# Check for anomalies

CURRENT_TOTAL=$(node scripts/tool-discovery.js --mode export --format json | \
  jq '.total')

LAST_TOTAL=$(cat reports/last-snapshot.json | jq '.total')

DIFF=$((CURRENT_TOTAL - LAST_TOTAL))

if [ $DIFF -gt 100 ]; then
  echo "⚠️  WARNING: Tool count increased by $DIFF (potential issue)"
  # Send alert
fi
```

---

## FAQ

**Q: Can I use this tool with a running MCP Hub?**
A: Yes. Modify the `collectToolsFromServers()` function to fetch from the MCP Hub API instead of using example data.

**Q: How often should I generate reports?**
A: Recommended: Weekly for active development, Monthly for stable deployments.

**Q: Can I customize categorization rules?**
A: Yes. Edit the `categorize()` function to add custom patterns or use LLM categorization via API.

**Q: Does this tool affect production?**
A: No. It's read-only and doesn't modify configuration or running systems. All simulations are local.

**Q: Can I export to Excel?**
A: Export to CSV, then open in Excel. Or extend the tool to generate XLSX using a library like `xlsx`.

---

## Additional Resources

### Related Documentation
- [Security Guide](./ML_TOOL_FILTERING_SECURITY_GUIDE.md)
- [Migration Guide](./ML_TOOL_FILTERING_MIGRATION_GUIDE.md)
- [Sprint 3 Roadmap](../SPRINT_3_ROADMAP.md)

### Example Scripts
- `scripts/validate-filtering.sh` - Pre-deployment validation
- `scripts/monitor-drift.sh` - Categorization drift detection
- `scripts/generate-weekly-report.sh` - Automated reporting

---

**Last Updated**: November 16, 2025
**Version**: 1.0
**Maintained By**: MCP Hub Development Team
