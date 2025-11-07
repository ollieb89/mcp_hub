# Day 0 Staging Validation Checklist
## Analyze Prompt Feature - Staging Deployment

**Date**: 2025-11-07
**Deployment Lead**: [Your Name]
**Feature**: LLM-based prompt analysis and tool categorization
**Target Duration**: 2-4 hours (initial deployment + validation)

---

## Overview

This checklist guides the Day 0 staging deployment and initial validation. Follow each step sequentially, marking completion as you go.

**Expected Timeline**:
- Pre-deployment: 15 minutes
- Deployment: 10 minutes
- Smoke tests: 10 minutes
- Integration tests: 5 minutes
- Initial validation: 30 minutes
- **Total**: ~70 minutes for Day 0

---

## Prerequisites Check

### Environment Verification

- [ ] **Working Directory**: `/home/ob/Development/Tools/mcp-hub`
  ```bash
  cd /home/ob/Development/Tools/mcp-hub
  pwd
  ```

- [ ] **Git Branch**: On `fix/analyze-prompt-tool-activation`
  ```bash
  git branch --show-current
  # Expected: fix/analyze-prompt-tool-activation
  ```

- [ ] **Working Tree**: Clean (no uncommitted changes)
  ```bash
  git status
  # Expected: "working tree clean"
  ```

- [ ] **All Tests Passing**: 308/308 production tests
  ```bash
  bun test --exclude tests/ui/**
  # Expected: 308/308 tests passing
  ```

### API Key Verification

- [ ] **Gemini API Key**: Set in environment
  ```bash
  echo "GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
  # If not set, export it now:
  export GEMINI_API_KEY="your-gemini-api-key-here"
  ```

- [ ] **GitHub Token** (optional for GitHub MCP server):
  ```bash
  echo "GITHUB_TOKEN: ${GITHUB_PERSONAL_ACCESS_TOKEN:0:10}..."
  # If not set and needed:
  export GITHUB_PERSONAL_ACCESS_TOKEN="your-github-token-here"
  ```

- [ ] **Test API Key**: Verify Gemini API key works
  ```bash
  curl -s -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"test"}]}]}' | jq '.candidates[0].content.parts[0].text'
  # Expected: Some text response (not an error)
  ```

### File Verification

- [ ] **Staging Config**: Exists and valid
  ```bash
  ls -lh mcp-servers.staging.json
  jq '.' mcp-servers.staging.json > /dev/null && echo "✓ Valid JSON"
  ```

- [ ] **Smoke Test Script**: Executable
  ```bash
  ls -lh scripts/staging-smoke-tests.sh
  bash -n scripts/staging-smoke-tests.sh && echo "✓ Bash syntax OK"
  ```

- [ ] **Validation Script**: Executable
  ```bash
  ls -lh scripts/test-analyze-prompt.sh
  bash -n scripts/test-analyze-prompt.sh && echo "✓ Bash syntax OK"
  ```

- [ ] **Test Suite**: Available
  ```bash
  ls -lh tests/prompt-based-filtering.test.js
  ```

---

## Step 1: Pre-Deployment Setup (15 minutes)

### 1.1 Backup Current Configuration

- [ ] **Backup production config** (if exists):
  ```bash
  if [ -f mcp-servers.json ]; then
      cp mcp-servers.json mcp-servers.json.backup.$(date +%Y%m%d_%H%M%S)
      echo "✓ Backed up existing config"
  else
      echo "ℹ No existing config to backup"
  fi
  ```

### 1.2 Stop Running Instances

- [ ] **Stop any running MCP Hub**:
  ```bash
  # Check if running
  pgrep -f "bun.*server.js" && echo "MCP Hub is running" || echo "No MCP Hub running"

  # Stop if running
  pkill -f "bun.*server.js" && echo "✓ Stopped MCP Hub" || echo "ℹ No process to stop"

  # Verify stopped
  sleep 2
  pgrep -f "bun.*server.js" || echo "✓ Confirmed stopped"
  ```

### 1.3 Apply Staging Configuration

- [ ] **Copy staging config**:
  ```bash
  cp mcp-servers.staging.json mcp-servers.json
  echo "✓ Applied staging configuration"
  ```

- [ ] **Verify configuration**:
  ```bash
  echo "Verifying staging config..."

  # Check mode
  MODE=$(jq -r '.toolFiltering.mode' mcp-servers.json)
  echo "  Mode: $MODE (expected: prompt-based)"

  # Check LLM provider
  PROVIDER=$(jq -r '.toolFiltering.llmCategorization.provider' mcp-servers.json)
  echo "  LLM Provider: $PROVIDER (expected: gemini)"

  # Check session isolation
  ISOLATION=$(jq -r '.toolFiltering.promptBasedFiltering.sessionIsolation' mcp-servers.json)
  echo "  Session Isolation: $ISOLATION (expected: true)"

  # Check default exposure
  EXPOSURE=$(jq -r '.toolFiltering.promptBasedFiltering.defaultExposure' mcp-servers.json)
  echo "  Default Exposure: $EXPOSURE (expected: meta-only)"
  ```

### 1.4 Set Environment Variables

- [ ] **Export required variables**:
  ```bash
  # LLM Provider API Key (already exported in prerequisites)
  export GEMINI_API_KEY="${GEMINI_API_KEY}"

  # Optional: GitHub token for GitHub MCP server
  # export GITHUB_PERSONAL_ACCESS_TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN}"

  # Enable debug logging for troubleshooting
  export DEBUG_TOOL_FILTERING=true
  export ENABLE_PINO_LOGGER=true

  echo "✓ Environment variables set"
  ```

- [ ] **Verify environment**:
  ```bash
  env | grep -E "GEMINI_API_KEY|DEBUG_TOOL_FILTERING|ENABLE_PINO_LOGGER"
  ```

---

## Step 2: Deploy Staging Application (10 minutes)

### 2.1 Clean Build (Optional)

- [ ] **Clean previous build** (if desired):
  ```bash
  bun run clean
  echo "✓ Build artifacts cleaned"
  ```

### 2.2 Install Dependencies

- [ ] **Ensure dependencies up to date**:
  ```bash
  bun install
  echo "✓ Dependencies installed"
  ```

### 2.3 Start MCP Hub

- [ ] **Start with debug logging**:
  ```bash
  # Create log file for this session
  LOG_FILE="staging-deployment-$(date +%Y%m%d_%H%M%S).log"

  # Start in background with logging
  DEBUG_TOOL_FILTERING=true ENABLE_PINO_LOGGER=true bun start > "$LOG_FILE" 2>&1 &

  # Store PID
  HUB_PID=$!
  echo "✓ MCP Hub started (PID: $HUB_PID)"
  echo "  Log file: $LOG_FILE"
  ```

### 2.4 Wait for Startup

- [ ] **Wait for hub to be ready**:
  ```bash
  echo "Waiting for MCP Hub to start..."

  for i in {1..30}; do
      if curl -sf http://localhost:7000/health > /dev/null 2>&1; then
          echo "✓ MCP Hub is ready (${i}s)"
          break
      fi

      if [ $i -eq 30 ]; then
          echo "✗ MCP Hub failed to start within 30 seconds"
          echo "Check logs: tail -50 $LOG_FILE"
          exit 1
      fi

      sleep 1
      echo -n "."
  done
  ```

### 2.5 Verify Running

- [ ] **Health check**:
  ```bash
  curl -s http://localhost:7000/health | jq '.'
  # Expected: {"status": "ok", ...}
  ```

- [ ] **Check process**:
  ```bash
  ps aux | grep "bun.*server.js" | grep -v grep
  echo "✓ MCP Hub process running"
  ```

---

## Step 3: Run Smoke Tests (10 minutes)

### 3.1 Execute Smoke Test Suite

- [ ] **Run all 10 smoke tests**:
  ```bash
  ./scripts/staging-smoke-tests.sh

  # Expected output:
  # ✓ All smoke tests passed!
  # Total Tests: 10
  # Passed: 10
  # Failed: 0
  ```

### 3.2 Smoke Test Results

**Record results**:
- Test 1 (Hub Health): [ ] PASS / [ ] FAIL
- Test 2 (Config Exists): [ ] PASS / [ ] FAIL
- Test 3 (Prompt Mode): [ ] PASS / [ ] FAIL
- Test 4 (LLM Provider): [ ] PASS / [ ] FAIL
- Test 5 (API Key): [ ] PASS / [ ] FAIL
- Test 6 (Session Isolation): [ ] PASS / [ ] FAIL
- Test 7 (Default Exposure): [ ] PASS / [ ] FAIL
- Test 8 (Validation Script): [ ] PASS / [ ] FAIL
- Test 9 (Test Suite): [ ] PASS / [ ] FAIL
- Test 10 (Log Directory): [ ] PASS / [ ] FAIL

**Total**: ___ / 10 passed

### 3.3 Troubleshoot Failures (if any)

If any smoke tests fail, check:

```bash
# View recent logs
tail -100 "$LOG_FILE"

# Check for errors
grep -i "error" "$LOG_FILE" | tail -20

# Verify configuration
jq '.' mcp-servers.json

# Verify environment variables
env | grep -E "GEMINI_API_KEY|DEBUG_TOOL_FILTERING"
```

See `claudedocs/TROUBLESHOOTING_ANALYZE_PROMPT.md` for detailed troubleshooting.

---

## Step 4: Run Integration Tests (5 minutes)

### 4.1 Execute Full Test Suite

- [ ] **Run 23 integration tests**:
  ```bash
  bun test tests/prompt-based-filtering.test.js

  # Expected:
  # ✓ tests/prompt-based-filtering.test.js (23)
  # 23 passed
  # Duration: <1s
  ```

### 4.2 Integration Test Results

**Record results**:
- Total tests: ___ / 23
- Passed: ___ / 23
- Failed: ___ / 23
- Duration: ___ ms (target: <1000ms)

**Categories**:
- [ ] Meta-tool registration (3 tests)
- [ ] Session initialization (3 tests)
- [ ] Tool exposure filtering (4 tests)
- [ ] Session isolation (4 tests)
- [ ] LLM analysis (6 tests)
- [ ] Backward compatibility (3 tests)

### 4.3 Troubleshoot Test Failures (if any)

If tests fail:

```bash
# Run with verbose output
bun test tests/prompt-based-filtering.test.js --reporter=verbose

# Check specific test
bun test tests/prompt-based-filtering.test.js -t "test name pattern"

# Run with coverage
bun run test:coverage
```

---

## Step 5: Run Validation Script (10 minutes)

### 5.1 Test Various Prompt Types

- [ ] **GitHub-related prompt**:
  ```bash
  ./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

  # Expected: github category identified
  # Exit code: 0
  ```

- [ ] **Filesystem-related prompt**:
  ```bash
  ./scripts/test-analyze-prompt.sh "List files in current directory"

  # Expected: filesystem category identified
  # Exit code: 0
  ```

- [ ] **Git-related prompt**:
  ```bash
  ./scripts/test-analyze-prompt.sh "Show recent commits"

  # Expected: git category identified
  # Exit code: 0
  ```

- [ ] **Multi-category prompt**:
  ```bash
  ./scripts/test-analyze-prompt.sh "Search for TODO in project files and create GitHub issue"

  # Expected: filesystem, github categories
  # Exit code: 0
  ```

### 5.2 Validation Results

**Record validation outcomes**:
- GitHub prompt: [ ] PASS / [ ] FAIL - Categories: _______
- Filesystem prompt: [ ] PASS / [ ] FAIL - Categories: _______
- Git prompt: [ ] PASS / [ ] FAIL - Categories: _______
- Multi-category prompt: [ ] PASS / [ ] FAIL - Categories: _______

---

## Step 6: Verify Initial Health (30 minutes)

### 6.1 Check Logs

- [ ] **View startup logs**:
  ```bash
  head -100 "$LOG_FILE"
  ```

- [ ] **Check for errors**:
  ```bash
  grep -i "error" "$LOG_FILE" | wc -l
  # Expected: 0 or very few non-critical errors

  # View any errors
  grep -i "error" "$LOG_FILE" | tail -20
  ```

- [ ] **Check analyze_prompt activity**:
  ```bash
  grep "hub__analyze_prompt called" "$LOG_FILE" | wc -l
  # Expected: >= number of validation script runs

  # View recent calls
  grep "hub__analyze_prompt called" "$LOG_FILE" | tail -5
  ```

### 6.2 Verify LLM Integration

- [ ] **Check LLM calls**:
  ```bash
  grep "LLM analysis completed" "$LOG_FILE" | wc -l
  # Expected: >= validation script runs
  ```

- [ ] **Check LLM performance**:
  ```bash
  grep "LLM analysis completed" "$LOG_FILE" | \
    awk '{print $(NF-1)}' | \
    awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

  # Expected: <2000ms average
  ```

- [ ] **Check LLM errors**:
  ```bash
  grep "LLM provider error" "$LOG_FILE" | wc -l
  # Expected: 0
  ```

### 6.3 Verify Tool Filtering

- [ ] **Check tool exposure updates**:
  ```bash
  grep "Tool exposure updated" "$LOG_FILE" | wc -l
  # Expected: >= validation script runs

  # View recent updates
  grep "Tool exposure updated" "$LOG_FILE" | tail -5
  ```

- [ ] **Check categories identified**:
  ```bash
  grep "categories:" "$LOG_FILE" | \
    awk -F'categories:' '{print $2}' | \
    sort | uniq -c | sort -rn

  # Expected: Various categories (github, filesystem, git, etc.)
  ```

### 6.4 Performance Metrics

- [ ] **Calculate performance metrics**:
  ```bash
  echo "=== Performance Metrics ==="

  # LLM analysis time
  echo "LLM Analysis Time:"
  grep "LLM analysis completed" "$LOG_FILE" | \
    awk '{print $(NF-1)}' | \
    awk '{sum+=$1; count++; if($1>max)max=$1; if(min==""||$1<min)min=$1}
         END {print "  Avg:", sum/count, "ms\n  Min:", min, "ms\n  Max:", max, "ms"}'

  # Tool exposure update time
  echo "Tool Exposure Update Time:"
  grep "Tool exposure updated" "$LOG_FILE" | \
    awk '{print $(NF-1)}' | \
    awk '{sum+=$1; count++} END {print "  Avg:", sum/count, "ms"}'

  # End-to-end time (if logged)
  echo "End-to-End Flow Time:"
  grep "analyze_prompt completed" "$LOG_FILE" | \
    awk '{print $(NF-1)}' | \
    awk '{sum+=$1; count++} END {print "  Avg:", sum/count, "ms"}'
  ```

**Record metrics**:
- LLM Analysis: Avg ___ ms, Min ___ ms, Max ___ ms (target: <2000ms)
- Tool Exposure: Avg ___ ms (target: <500ms)
- End-to-End: Avg ___ ms (target: <3000ms)

### 6.5 Memory Usage

- [ ] **Check memory usage**:
  ```bash
  ps aux | grep "bun.*server.js" | grep -v grep | awk '{print "Memory: " $6/1024 " MB"}'

  # Expected: <300MB
  ```

**Record memory**: ___ MB (target: <300MB)

---

## Step 7: Begin Monitoring Period (Ongoing)

### 7.1 Set Up Monitoring

- [ ] **Create monitoring script** (optional):
  ```bash
  cat > monitor-staging.sh << 'EOF'
  #!/bin/bash
  LOG_FILE="${1:-staging-deployment-*.log}"
  INTERVAL="${2:-300}"  # 5 minutes default

  while true; do
      echo "=== Staging Monitor - $(date) ==="

      # Process health
      ps aux | grep "bun.*server.js" | grep -v grep || echo "⚠️ Process not running!"

      # Memory usage
      ps aux | grep "bun.*server.js" | grep -v grep | awk '{print "Memory: " $6/1024 " MB"}'

      # Recent errors
      ERROR_COUNT=$(grep -i "error" $LOG_FILE | wc -l)
      echo "Total errors: $ERROR_COUNT"

      # Recent LLM calls
      LLM_CALLS=$(grep "LLM analysis completed" $LOG_FILE | tail -10 | wc -l)
      echo "Recent LLM calls (last 10): $LLM_CALLS"

      echo ""
      sleep $INTERVAL
  done
  EOF

  chmod +x monitor-staging.sh
  echo "✓ Monitoring script created"
  ```

- [ ] **Start monitoring** (in separate terminal):
  ```bash
  # Run in background or separate terminal
  ./monitor-staging.sh &
  MONITOR_PID=$!
  echo "✓ Monitor started (PID: $MONITOR_PID)"
  ```

### 7.2 Document Initial State

- [ ] **Create Day 0 report**:
  ```bash
  cat > staging-day0-report.txt << EOF
  Staging Deployment - Day 0 Report
  Generated: $(date)
  =====================================

  Deployment Status: SUCCESS / PARTIAL / FAILED

  Smoke Tests: ___ / 10 passed
  Integration Tests: ___ / 23 passed
  Validation Scripts: ___ / 4 passed

  Performance Metrics:
  - LLM Analysis: Avg ___ ms (target: <2000ms)
  - Tool Exposure: Avg ___ ms (target: <500ms)
  - Memory Usage: ___ MB (target: <300MB)

  LLM Provider: Gemini (gemini-2.5-flash)
  API Key Status: Active
  Session Isolation: Enabled
  Default Exposure: meta-only

  Issues Identified: [List any issues]

  Next Steps:
  - Continue 24h monitoring
  - Run functional tests (Day 1)
  - Monitor performance trends

  Sign-off: [Your Name]
  Date: $(date)
  EOF

  echo "✓ Day 0 report created: staging-day0-report.txt"
  ```

### 7.3 Set Reminders

- [ ] **Schedule Day 1 activities**:
  ```text
  Day 1 (24 hours from now):
  - Run functional tests (various prompt types)
  - Check performance metrics
  - Review error logs
  - Verify memory stability
  - Document any issues
  ```

---

## Step 8: Completion Checklist

### 8.1 Success Criteria

**Must Pass** (Blocking):
- [ ] All smoke tests pass (10/10)
- [ ] Integration tests pass (23/23)
- [ ] No critical errors in logs
- [ ] LLM provider responds successfully
- [ ] Performance benchmarks met

**Should Pass** (Important):
- [ ] Validation scripts pass (4/4 prompts)
- [ ] Memory usage stable (<300MB)
- [ ] Tool exposure updates correctly
- [ ] Debug logging functional

### 8.2 Documentation

- [ ] Day 0 report completed
- [ ] Logs archived: `$LOG_FILE`
- [ ] Metrics recorded
- [ ] Issues documented (if any)

### 8.3 Communication

- [ ] Stakeholders notified of deployment
- [ ] Day 1 checklist reviewed
- [ ] Monitoring confirmed active
- [ ] Escalation contacts identified

---

## Day 0 Sign-Off

**Deployment Lead**: _______________________
**Date/Time**: _______________________
**Overall Status**: [ ] SUCCESS / [ ] PARTIAL / [ ] FAILED

**Key Metrics**:
- Smoke Tests: ___ / 10
- Integration Tests: ___ / 23
- Validation: ___ / 4
- Performance: [ ] MET / [ ] NOT MET

**Ready for Day 1**: [ ] YES / [ ] NO / [ ] WITH RESERVATIONS

**Notes**:
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

---

## Quick Reference

### Log Locations
```bash
# Current session log
LOG_FILE="staging-deployment-$(date +%Y%m%d_%H%M%S).log"

# MCP Hub logs
~/.local/state/mcp-hub/logs/mcp-hub.log
```

### Common Commands
```bash
# Check hub health
curl http://localhost:7000/health

# View recent logs
tail -f "$LOG_FILE"

# Check process
ps aux | grep "bun.*server.js" | grep -v grep

# Stop hub
pkill -f "bun.*server.js"

# Restart hub
DEBUG_TOOL_FILTERING=true bun start > staging-restart.log 2>&1 &
```

### Emergency Contacts
- Deployment Lead: [Your Name/Contact]
- Technical Lead: [Name/Contact]
- On-Call: [Name/Contact]

### Escalation Path
1. Review troubleshooting guide: `claudedocs/TROUBLESHOOTING_ANALYZE_PROMPT.md`
2. Check logs for specific error patterns
3. Contact deployment lead
4. Execute rollback if critical issue

---

**Next Document**: `DAY_1_STAGING_CHECKLIST.md` (to be created for 24h validation)
