# Wave 1 Execution Guide - Independent Tasks

**Duration**: 30 minutes
**Parallelization**: 3 concurrent tasks
**Dependencies**: None - can start immediately
**Status**: Ready for execution

---

## Task 4.1: Metrics Collection Script

### Objective
Create automated script to collect beta program metrics daily.

### Prerequisites
- Bash shell environment
- `curl` command available
- `jq` for JSON parsing (optional but recommended)
- GitHub CLI (`gh`) for API access (optional for enhanced metrics)

### Execution Steps

#### Step 1: Create Script File
```bash
# Location
/home/ob/Development/Tools/mcp-hub/scripts/beta_metrics.sh

# Create with execute permissions
touch scripts/beta_metrics.sh
chmod +x scripts/beta_metrics.sh
```

#### Step 2: Script Implementation
```bash
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
```

#### Step 3: Test Script
```bash
# Test execution
cd /home/ob/Development/Tools/mcp-hub
./scripts/beta_metrics.sh

# Verify output
ls -la beta-metrics/
cat beta-metrics/metrics_$(date +%Y-%m-%d).log
```

#### Step 4: Create Cron Job Template
```bash
# Add to documentation: METRICS_AUTOMATION.md
# Cron job for daily execution at 9:00 AM
0 9 * * * cd /home/ob/Development/Tools/mcp-hub && ./scripts/beta_metrics.sh /home/ob/beta-metrics >> /var/log/mcp-hub-beta.log 2>&1
```

### Success Criteria
- ✅ Script created at `scripts/beta_metrics.sh`
- ✅ Execute permissions set (`chmod +x`)
- ✅ Successfully collects system uptime
- ✅ Successfully queries filtering stats API
- ✅ Generates both log and JSON output
- ✅ Test execution completes without errors
- ✅ Cron template documented

### Output Artifacts
1. `scripts/beta_metrics.sh` - Executable script
2. `beta-metrics/metrics_YYYY-MM-DD.log` - Daily log file
3. `beta-metrics/metrics_YYYY-MM-DD.json` - JSON summary
4. Cron job template in documentation

---

## Task 1.2: GitHub Labels Setup

### Objective
Create 6 beta-specific issue labels for tracking feedback and bugs.

### Prerequisites
- Repository admin or write access
- GitHub account authenticated

### Execution Steps

#### Step 1: Navigate to Labels Page
```
1. Open: https://github.com/ollieb89/mcp_hub/labels
2. Click "New label" button
```

#### Step 2: Create Beta Labels

**Label 1: beta-bug**
- Name: `beta-bug`
- Description: `Bug report from beta testing program`
- Color: `#d73a4a` (red)

**Label 2: beta-feature-request**
- Name: `beta-feature-request`
- Description: `Feature request from beta testers`
- Color: `#a2eeef` (light blue)

**Label 3: beta-question**
- Name: `beta-question`
- Description: `Question from beta program participants`
- Color: `#d876e3` (purple)

**Label 4: beta-p0**
- Name: `beta-p0`
- Description: `Critical blocking issue - immediate attention required`
- Color: `#b60205` (dark red)

**Label 5: beta-p1**
- Name: `beta-p1`
- Description: `High priority issue - address within 48 hours`
- Color: `#e99695` (light red)

**Label 6: beta-p2**
- Name: `beta-p2`
- Description: `Medium priority issue - address within 72 hours`
- Color: `#fbca04` (yellow)

#### Step 3: Verify Labels
```bash
# Using GitHub CLI (if available)
gh label list | grep beta

# Expected output (6 labels)
beta-bug
beta-feature-request
beta-question
beta-p0
beta-p1
beta-p2
```

#### Step 4: Document Label Usage
Create reference guide for when to use each label.

### Success Criteria
- ✅ All 6 labels created with correct names
- ✅ Color codes match specification
- ✅ Descriptions are clear and actionable
- ✅ Labels visible in issue creation UI
- ✅ Can filter issues by beta labels
- ✅ Label usage documented

### Output Artifacts
1. 6 GitHub labels created in repository
2. Label usage guide (added to APPLICATION_PROCESSING.md)

---

## Task 2.2: README Beta Section (Draft)

### Objective
Prepare README.md beta program section (pending announcement URL).

### Prerequisites
- Access to `/home/ob/Development/Tools/mcp-hub/README.md`
- Understanding of README structure

### Execution Steps

#### Step 1: Analyze README Structure
```bash
# Read current structure
head -100 /home/ob/Development/Tools/mcp-hub/README.md

# Identify insertion point (after "Recent Highlights", before "Feature Support")
grep -n "## Recent Highlights" README.md
grep -n "## Feature Support" README.md
```

#### Step 2: Draft Beta Section Content
```markdown
## 🧪 Beta Testing Program

> **Status**: 🟢 **Applications Open** - Join our beta testing program to help shape the future of MCP Hub tool filtering!

### What We're Testing
We're seeking **5-10 beta testers** to validate our new **Tool Filtering** feature that reduces overwhelming tool counts from **3,000+ → 15-200 relevant tools**, freeing up to **50k tokens** for actual productivity.

### Beta Program Benefits
- ✅ **80-85% tool reduction** for focused workflows
- ✅ **30-50k token savings** per session
- ✅ **Real-time statistics** via REST API and dashboard
- ✅ **Background LLM categorization** for smart filtering
- ✅ **Zero breaking changes** to existing workflows

### Who Should Apply
We need diverse beta testers across these workflows:
- 🎨 **Frontend Developers** (React/Vue/Angular) - 2 slots
- ⚙️ **Backend Developers** (Node.js/Python) - 1-2 slots
- 🌐 **Full-Stack Team Leads** - 1-2 slots
- 🚢 **DevOps Engineers** - 1 slot (optional)

### Application Requirements
- ✅ MCP Hub user with **10+ servers configured**
- ✅ Active GitHub account (for feedback and issues)
- ✅ **2-week availability** for testing (Days 1-14)
- ✅ Willingness to provide **structured feedback**

### How to Apply
**👉 [Apply Now in GitHub Discussions]({ANNOUNCEMENT_URL_PLACEHOLDER}) 👈**

See our [Beta Onboarding Guide](./docs/BETA_ONBOARDING.md) for complete details.

**Timeline**:
- Days 1-2: Application review and enrollment
- Days 3-7: Active testing and feedback
- Days 8-10: Issue resolution and iteration
- Days 11-14: Final synthesis and GA preparation

---
```

#### Step 3: Prepare Badge (Optional)
```markdown
[![Beta Program](https://img.shields.io/badge/Beta-Applications%20Open-green)]({ANNOUNCEMENT_URL_PLACEHOLDER})
```

#### Step 4: Save Draft
```bash
# Save to temporary file for later insertion
cat > /tmp/readme_beta_section.md <<'EOF'
[Content from Step 2]
EOF

echo "✅ Draft saved to /tmp/readme_beta_section.md"
echo "⏳ Awaiting announcement URL from Task 2.1"
```

### Success Criteria
- ✅ Beta section content drafted
- ✅ Matches README tone and style
- ✅ All links prepared (with placeholders)
- ✅ Badge code ready
- ✅ Insertion point identified
- ✅ Draft saved for Wave 3 finalization

### Output Artifacts
1. `/tmp/readme_beta_section.md` - Draft content
2. Insertion instructions for Wave 3
3. Badge markdown ready

---

## Wave 1 Completion Checklist

### Task 4.1: Metrics Script
- [ ] Script file created at `scripts/beta_metrics.sh`
- [ ] Execute permissions set
- [ ] System uptime collection working
- [ ] Filtering stats API working
- [ ] JSON output generated
- [ ] Test execution successful
- [ ] Cron template documented

### Task 1.2: GitHub Labels
- [ ] `beta-bug` label created
- [ ] `beta-feature-request` label created
- [ ] `beta-question` label created
- [ ] `beta-p0` label created
- [ ] `beta-p1` label created
- [ ] `beta-p2` label created
- [ ] All labels visible in UI
- [ ] Label usage documented

### Task 2.2: README Draft
- [ ] README structure analyzed
- [ ] Insertion point identified
- [ ] Beta section content drafted
- [ ] Badge markdown prepared
- [ ] Links prepared with placeholders
- [ ] Draft saved to temporary file
- [ ] Ready for Wave 3 finalization

---

## Ready for Wave 2

**Completion Time**: ~30 minutes
**Status**: ✅ Ready to proceed to Wave 2 tasks
**Next Actions**:
1. Task 1.1: GitHub Discussions Setup (BLOCKING for Wave 3)
2. Task 3.1: Application Processing Workflow (after Task 1.2)

**Dependencies Satisfied**:
- Task 1.2 → enables Task 3.1
- Task 4.1 → enables Task 4.2 (can draft in parallel)
- Task 2.2 → ready for finalization after Task 2.1

---

**Wave 1 Status**: EXECUTION GUIDE COMPLETE
**Estimated Completion**: 30 minutes with parallel execution
**Critical Outputs**: Labels, Metrics Script, README Draft
