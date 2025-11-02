#!/bin/bash
# beta_metrics.sh - Collect daily beta program metrics
# Usage: ./scripts/beta_metrics.sh [output_dir]

set -e

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)
OUTPUT_DIR="${1:-./beta-metrics}"
LOG_FILE="${OUTPUT_DIR}/metrics_${DATE}.log"
JSON_FILE="${OUTPUT_DIR}/metrics_${DATE}.json"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo "=== MCP Hub Beta Metrics - ${DATE} ${TIME} ===" > "${LOG_FILE}"

# 1. System Uptime
echo "## System Uptime" >> "${LOG_FILE}"
if curl -s http://localhost:7000/health > /dev/null 2>&1; then
    echo "✅ MCP Hub: RUNNING" >> "${LOG_FILE}"
    uptime >> "${LOG_FILE}"
else
    echo "❌ MCP Hub: NOT RUNNING" >> "${LOG_FILE}"
fi
echo "" >> "${LOG_FILE}"

# 2. Tool Filtering Statistics
echo "## Tool Filtering Stats" >> "${LOG_FILE}"
if command -v jq > /dev/null 2>&1; then
    curl -s http://localhost:7000/api/filtering/stats | jq '.' >> "${LOG_FILE}" 2>/dev/null || echo "Error fetching filtering stats" >> "${LOG_FILE}"
else
    curl -s http://localhost:7000/api/filtering/stats >> "${LOG_FILE}" 2>/dev/null || echo "Error fetching filtering stats" >> "${LOG_FILE}"
fi
echo "" >> "${LOG_FILE}"

# 3. GitHub Metrics (if gh CLI available)
if command -v gh > /dev/null 2>&1; then
    echo "## GitHub Activity" >> "${LOG_FILE}"

    # Discussion count (beta categories)
    echo "### Discussions:" >> "${LOG_FILE}"
    gh search prs --owner=ollieb89 --repo=mcp_hub --label="beta" --json number,title,createdAt,state >> "${LOG_FILE}" 2>/dev/null || echo "No discussions found or API error" >> "${LOG_FILE}"

    # Issue counts by label
    echo "### Issues:" >> "${LOG_FILE}"
    echo "Beta Bugs:" >> "${LOG_FILE}"
    gh issue list --label "beta-bug" --json number,title,state,priority >> "${LOG_FILE}" 2>/dev/null || echo "0 beta bugs" >> "${LOG_FILE}"

    echo "Feature Requests:" >> "${LOG_FILE}"
    gh issue list --label "beta-feature-request" --json number,title,state >> "${LOG_FILE}" 2>/dev/null || echo "0 feature requests" >> "${LOG_FILE}"

    echo "Questions:" >> "${LOG_FILE}"
    gh issue list --label "beta-question" --json number,title,state >> "${LOG_FILE}" 2>/dev/null || echo "0 questions" >> "${LOG_FILE}"
else
    echo "## GitHub Metrics: gh CLI not installed (skipping)" >> "${LOG_FILE}"
fi
echo "" >> "${LOG_FILE}"

# 4. Generate JSON Summary
if command -v jq > /dev/null 2>&1; then
    cat > "${JSON_FILE}" <<EOF
{
  "date": "${DATE}",
  "time": "${TIME}",
  "hub_status": "$(curl -s http://localhost:7000/health > /dev/null 2>&1 && echo 'running' || echo 'stopped')",
  "filtering_enabled": $(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null | jq -r '.enabled // false'),
  "tools_exposed": $(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null | jq -r '.totalExposed // 0'),
  "filter_rate": $(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null | jq -r '.filterRate // 0')
}
EOF
    echo "📊 JSON metrics saved: ${JSON_FILE}"
fi

# 5. Summary output
echo ""
echo "✅ Metrics collection complete"
echo "📄 Log file: ${LOG_FILE}"
echo ""
echo "Quick Summary:"
grep -E "MCP Hub:|Uptime:|beta" "${LOG_FILE}" | head -10 || echo "See full log for details"
