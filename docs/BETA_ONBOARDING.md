# MCP Hub Tool Filtering - Beta Testing Onboarding Guide

**Beta Phase**: Week 2 (Phase 2 of Rollout)
**Duration**: 2 weeks
**Target**: 5-10 beta testers across diverse workflows
**Status**: 🟢 Active Beta Enrollment

---

## Welcome to the Beta Program!

Thank you for participating in the MCP Hub Tool Filtering beta test! This guide will help you get started quickly and provide structured feedback to help us refine the system for general availability.

## What You'll Be Testing

**Goal**: Reduce overwhelming tool counts from 3,000+ tools → 15-200 relevant tools, freeing 30-50k tokens for actual work.

**Key Features**:
- Server-based filtering (allowlist/denylist specific servers)
- Category-based filtering (filter by functional category)
- Hybrid mode (combine server and category filtering)
- Auto-enable (automatically activate when tool count exceeds threshold)
- Background LLM categorization (optional)

## Prerequisites

### Required
- ✅ MCP Hub installed and running
- ✅ 10+ MCP servers configured
- ✅ GitHub account (for feedback and issue reporting)
- ✅ 2-week availability for testing

### Recommended
- 📊 Baseline metrics: Note your current tool count and token usage
- 📝 Document your primary workflows (e.g., "React development with Playwright testing")
- 🔍 Familiarity with your MCP server configurations

## Quick Start (5 Minutes)

### Step 1: Identify Your Workflow Persona

Choose the profile that best matches your primary use case:

**A. Frontend Developer** (React/Vue/Angular)
- Servers needed: `filesystem`, `playwright`, `web-browser`
- Expected reduction: 80-85% (→ ~18 tools)
- Configuration: [Jump to Frontend Config](#frontend-developer-configuration)

**B. Backend Developer** (Node.js/Python)
- Servers needed: `filesystem`, `postgres`, `github`, `sequential-thinking`
- Expected reduction: 75-80% (→ ~24 tools)
- Configuration: [Jump to Backend Config](#backend-developer-configuration)

**C. Full-Stack Team Lead**
- Approach: Category-based filtering
- Expected reduction: 60-70% (→ ~42 tools)
- Configuration: [Jump to Full-Stack Config](#full-stack-configuration)

**D. DevOps Engineer**
- Approach: Denylist mode (exclude dev tools)
- Expected reduction: 70-75% (→ ~28 tools)
- Configuration: [Jump to DevOps Config](#devops-configuration)

### Step 2: Backup Your Configuration

```bash
# Create backup of current configuration
cp mcp-servers.json mcp-servers.json.backup

# Note: You can rollback anytime with:
# mv mcp-servers.json.backup mcp-servers.json && npm restart
```

### Step 3: Apply Your Beta Configuration

Add the `toolFiltering` section to your `mcp-servers.json` file based on your persona (see configurations below).

### Step 4: Restart MCP Hub

```bash
# Stop current instance
npm stop

# Start with new configuration
npm start

# Verify filtering is active
curl http://localhost:7000/api/filtering/stats | jq
```

### Step 5: Validate Your Setup

**Check 1: Filtering Enabled**
```bash
curl http://localhost:7000/api/filtering/stats | jq '.enabled'
# Expected: true
```

**Check 2: Tool Count Reduced**
```bash
curl http://localhost:7000/api/filtering/stats | jq '.totalExposed'
# Expected: 15-200 tools (down from 3000+)
```

**Check 3: Critical Workflows Still Work**
- Test your most common tasks
- Verify essential tools are accessible
- Note any missing functionality

## Beta Testing Persona Configurations

### Frontend Developer Configuration

**Use Case**: React/Vue component development with browser testing

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "playwright", "web-browser"]
    }
  },
  "mcpServers": {
    "filesystem": { /* your existing config */ },
    "playwright": { /* your existing config */ },
    "web-browser": { /* your existing config */ }
  }
}
```

**Expected Results**:
- Tools: 3,247 → ~18 tools (84% reduction)
- Token savings: ~45k tokens
- Workflows: File operations, browser automation, web testing

**What to Test**:
1. ✅ Component file creation and editing
2. ✅ Browser-based UI testing
3. ✅ Screenshot capture and visual validation
4. ✅ Form interaction testing

### Backend Developer Configuration

**Use Case**: Node.js/Python API development with database integration

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "postgres", "github", "sequential-thinking"]
    }
  },
  "mcpServers": {
    "filesystem": { /* your existing config */ },
    "postgres": { /* your existing config */ },
    "github": { /* your existing config */ },
    "sequential-thinking": { /* your existing config */ }
  }
}
```

**Expected Results**:
- Tools: 3,247 → ~24 tools (77% reduction)
- Token savings: ~42k tokens
- Workflows: API development, database operations, version control

**What to Test**:
1. ✅ Database schema migrations
2. ✅ API endpoint creation
3. ✅ Git workflow (commit, push, PR creation)
4. ✅ Code analysis and debugging

### Full-Stack Configuration

**Use Case**: Comprehensive web application development (mixed frontend/backend)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "code", "data"]
    }
  },
  "mcpServers": {
    /* all your existing servers */
  }
}
```

**Expected Results**:
- Tools: 3,247 → ~42 tools (65% reduction)
- Token savings: ~35k tokens
- Workflows: Full-stack development with database, version control, browser testing

**What to Test**:
1. ✅ End-to-end feature development
2. ✅ Database + API + UI integration
3. ✅ Testing across stack layers
4. ✅ Deployment and infrastructure tasks

### DevOps Configuration

**Use Case**: Infrastructure management and deployment automation

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "denylist",
      "servers": ["debug-tools", "experimental", "dev-only"]
    }
  },
  "mcpServers": {
    /* all your existing servers */
  }
}
```

**Expected Results**:
- Tools: 3,247 → ~28 tools (73% reduction)
- Token savings: ~40k tokens
- Workflows: Infrastructure management, deployment, monitoring

**What to Test**:
1. ✅ Kubernetes/Docker operations
2. ✅ Terraform/infrastructure-as-code
3. ✅ CI/CD pipeline management
4. ✅ Monitoring and alerting setup

## Monitoring Your Beta Experience

### Real-Time Statistics

```bash
# View current filtering stats
curl http://localhost:7000/api/filtering/stats | jq

# Key metrics to monitor:
# - enabled: true
# - mode: "server-allowlist" or "category"
# - totalChecked: Total tools evaluated
# - totalFiltered: Tools filtered out
# - totalExposed: Tools available to clients
# - filterRate: Percentage filtered
```

### Web Dashboard

Visit `http://localhost:7000` to access the visual dashboard showing:
- Connected servers
- Tool counts per server
- Filtering statistics
- Category breakdowns

### Log Monitoring

```bash
# Watch filtering decisions in real-time
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -i filtering

# Check for any errors or warnings
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E 'ERROR|WARN'
```

## Providing Feedback

### Structured Feedback Template

Please provide feedback using this template (post in GitHub Discussions):

```markdown
## Beta Feedback: [Your Workflow Persona]

**Configuration Used**: Frontend / Backend / Full-Stack / DevOps

**Testing Period**: [Start Date] - [Current Date]

### 1. Setup Experience (1-5 stars)
- Configuration difficulty: ⭐⭐⭐⭐⭐
- Documentation clarity: ⭐⭐⭐⭐⭐
- Time to first success: [X minutes]

### 2. Functionality Testing
- ✅ Works as expected: [List working features]
- ⚠️ Needs improvement: [List issues or confusion]
- ❌ Broken workflows: [List any blocking issues]

### 3. Performance Impact
- Token reduction: [Before: X → After: Y]
- LLM response speed: Faster / Same / Slower
- Overall productivity: Improved / Same / Decreased

### 4. Configuration Feedback
- Server list accuracy: Too many / Just right / Too few
- Category accuracy: Good / Needs refinement
- Missing tools: [List any critical missing tools]

### 5. Feature Requests
[Any additional features or improvements you'd like to see]

### 6. Open Questions
[Any questions or clarifications needed]
```

### Where to Submit Feedback

1. **Structured Feedback**: GitHub Discussions → Beta Feedback category
2. **Bug Reports**: GitHub Issues with `beta-bug` label
3. **Feature Requests**: GitHub Issues with `beta-feature-request` label
4. **Quick Questions**: GitHub Discussions → Beta Q&A category

**Response SLA**: We aim to respond within 24-48 hours for critical issues, 72 hours for feature requests.

## Common Issues and Troubleshooting

### Issue 1: Tool Count Didn't Decrease

**Symptoms**: `totalExposed` still shows 3000+ tools

**Solutions**:
1. Verify `enabled: true` in configuration
2. Check server names match exactly (case-sensitive)
3. Restart MCP Hub: `npm restart`
4. Check logs: `grep filtering ~/.local/state/mcp-hub/logs/mcp-hub.log`

### Issue 2: Critical Tools Missing

**Symptoms**: Essential workflow tools not available

**Solutions**:
1. Add missing server to allowlist
2. Switch to category mode for broader coverage
3. Use hybrid mode: server allowlist + category filter
4. Report as beta-bug if tool should be in category

### Issue 3: Configuration Not Loading

**Symptoms**: Stats API shows `enabled: false`

**Solutions**:
1. Validate JSON syntax: `jq empty mcp-servers.json`
2. Check file permissions: `ls -la mcp-servers.json`
3. Verify configuration file path is correct
4. Look for ConfigError in logs

### Issue 4: Performance Degradation

**Symptoms**: Slower LLM responses or increased latency

**Solutions**:
1. Check filtering overhead: Should be <10ms per tool
2. Verify LLM categorization is not blocking (should be background)
3. Monitor cache hit rate: Should be >85%
4. Report performance metrics in feedback

## Rollback Procedure

If you need to disable filtering at any time:

**Option 1: Temporary Disable**
```json
{
  "toolFiltering": {
    "enabled": false
  }
}
```
Then restart: `npm restart`

**Option 2: Full Rollback**
```bash
# Restore backup configuration
mv mcp-servers.json.backup mcp-servers.json

# Restart MCP Hub
npm restart

# Verify tools restored
curl http://localhost:7000/api/filtering/stats | jq
```

## Beta Success Criteria

We're tracking these metrics to measure beta success:

### Quantitative KPIs
- ✅ Beta enrollment: 5-10 users
- ✅ Feedback submissions: 15+ data points
- ✅ System uptime: >95% during beta
- ✅ Tool reduction: 50-85% across workflows
- ✅ Zero P0 blocking bugs

### Qualitative KPIs
- ✅ Net Promoter Score: >6/10
- ✅ Documentation clarity: <3 clarification requests per user
- ✅ First-time configuration success: >80%
- ✅ Category accuracy validation
- ✅ Feature request cataloging

## Timeline and Milestones

**Week 2 (Beta Phase)**:
- Days 1-2: Beta enrollment and onboarding
- Days 3-7: Active testing and feedback collection
- Days 8-10: Issue resolution and iteration
- Days 11-14: Final feedback synthesis and Phase 3 preparation

**What Happens Next**:
- **Week 3**: General Availability (Phase 3)
- Your feedback directly shapes the GA release
- Successful beta testers acknowledged in release notes
- Migration guide created based on beta learnings

## Support and Communication

### Beta Tester Resources
- 📖 Main Documentation: [README.md](../README.md) lines 368-693
- 📚 Configuration Examples: [TOOL_FILTERING_EXAMPLES.md](../TOOL_FILTERING_EXAMPLES.md)
- 🔧 Integration Guide: [TOOL_FILTERING_INTEGRATION.md](./TOOL_FILTERING_INTEGRATION.md)
- 📊 Quick Reference: Available in project memories

### Communication Schedule
- **Weekly Update**: Posted every Monday in GitHub Discussions
- **Bug Fixes**: Hotfix releases as needed (within 24-48 hours)
- **Feature Iterations**: Bi-weekly based on feedback themes

### Contact Information
- **GitHub Discussions**: Primary communication channel
- **GitHub Issues**: Bug reports and feature requests
- **Email**: [Beta tester email list - TBD]

## Thank You!

Your participation in this beta test is invaluable. The insights you provide will help us deliver a production-ready tool filtering system that benefits the entire MCP Hub community.

**Questions?** Post in GitHub Discussions → Beta Q&A category

**Found a bug?** Create an issue with the `beta-bug` label

**Have an idea?** Share it in Discussions → Beta Feature Requests

---

**Last Updated**: 2025-11-02
**Version**: Beta Phase 2 (Week 2)
**Status**: 🟢 Active Enrollment
