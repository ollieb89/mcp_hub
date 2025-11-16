# Production Deployment Guide: ML Tool Filtering

**Version**: 1.0
**Date**: November 16, 2025
**Status**: Ready for Production Deployment

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Deployment Procedure](#deployment-procedure)
5. [Validation & Testing](#validation--testing)
6. [Monitoring Setup](#monitoring-setup)
7. [Post-Deployment](#post-deployment)
8. [Rollback Plan](#rollback-plan)

---

## Pre-Deployment Checklist

### Code & Dependencies

- [ ] **Code Review Complete**
  ```bash
  # Verify latest code pulled
  git status
  git log -1

  # Expected: Clean working directory, latest commit
  ```

- [ ] **Dependencies Updated**
  ```bash
  # Install/update dependencies
  bun install

  # Verify critical packages
  bun list | grep -E "(pqueue|vitest|@anthropic-ai|openai|@google)"
  ```

- [ ] **Tests Passing**
  ```bash
  # Run full test suite
  bun test

  # Run ML filtering specific tests
  bun test tests/task-3-7-integration-testing.test.js
  bun test tests/task-3-8-monitoring-observability.test.js

  # Expected: All tests passing
  ```

- [ ] **Lint Clean**
  ```bash
  # Run linter
  bun run lint

  # Expected: 0 errors, 0 warnings
  ```

### Security

- [ ] **API Keys Configured**
  ```bash
  # Verify API keys in secret management system
  op list items | grep -i "mcp-hub"
  # OR
  aws secretsmanager list-secrets | grep mcp-hub

  # Verify environment variables NOT hardcoded
  grep -r "sk-" config/ src/
  grep -r "API_KEY.*=" config/ src/
  # Expected: No results
  ```

- [ ] **File Permissions Set**
  ```bash
  # Set secure permissions
  chmod 600 .env
  chmod 700 ~/.cache/mcp-hub
  chmod 600 ~/.cache/mcp-hub/llm-categorization-cache.json

  # Verify
  ls -la .env
  ls -la ~/.cache/mcp-hub/
  ```

- [ ] **Security Audit Complete**
  - Review `ML_TOOL_FILTERING_SECURITY_GUIDE.md`
  - Verify threat model addressed
  - Check incident response procedures documented

### Documentation

- [ ] **Documentation Current**
  - Security Guide: ✅ `ML_TOOL_FILTERING_SECURITY_GUIDE.md`
  - Migration Guide: ✅ `ML_TOOL_FILTERING_MIGRATION_GUIDE.md`
  - Discovery Tool Guide: ✅ `TOOL_DISCOVERY_GUIDE.md`
  - Deployment Guide: ✅ This document

- [ ] **Runbooks Available**
  - Incident response playbooks
  - Rollback procedures
  - Monitoring guides

---

## Environment Setup

### Development → Staging → Production

**Recommended Timeline**:
- Development: Immediate (testing environment)
- Staging: 1 week after code freeze (pre-production validation)
- Production: 2 weeks after staging validation (phased rollout)

### Environment Variables

**Create `.env.production` file**:
```bash
# LLM Provider API Key (choose one or multiple)
OPENAI_API_KEY=$(op read "op://vault/mcp-hub/openai-key")
ANTHROPIC_API_KEY=$(op read "op://vault/mcp-hub/anthropic-key")
GEMINI_API_KEY=$(op read "op://vault/mcp-hub/gemini-key")

# Environment
NODE_ENV=production

# Logging
LOG_LEVEL=info
ENABLE_PINO_LOGGER=true

# Port (if different from default)
PORT=7000
```

**Validate Environment**:
```bash
# Load environment
source .env.production

# Verify variables set
echo $GEMINI_API_KEY | wc -c
# Should be > 30 characters

# Test API key validity (optional)
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq .data[0].id
# Should return model name
```

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 2GB
- Disk: 10GB
- Network: Stable internet for LLM APIs

**Recommended**:
- CPU: 4 cores
- RAM: 4GB
- Disk: 20GB
- Network: Low-latency connection (<100ms to LLM providers)

---

## Configuration

### Production Configuration Template

**Create `config/mcp-hub.production.json`**:
```json
{
  "mcpServers": {
    // Your existing MCP server configurations
  },

  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",

    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "sessionIsolation": true,
      "enableMetaTools": true
    },

    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "${GEMINI_API_KEY}",

      "retryConfig": {
        "maxRetries": 3,
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 5
      },

      "circuitBreaker": {
        "enabled": true,
        "failureThreshold": 5,
        "resetTimeout": 30000
      },

      "cacheTTL": 86400,
      "cachePrewarm": true
    },

    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "version-control",
        "docker",
        "database"
      ]
    }
  },

  "connectionPool": {
    "enabled": true,
    "keepAliveTimeout": 60000,
    "maxConnections": 50
  }
}
```

### Configuration Validation

```bash
# Validate JSON syntax
cat config/mcp-hub.production.json | jq empty
# Expected: No output (valid JSON)

# Validate configuration (if MCP Hub supports it)
bun start --config config/mcp-hub.production.json --validate-config

# Check for environment variables referenced
grep '\${.*}' config/mcp-hub.production.json
# Verify all variables are set in .env.production
```

---

## Deployment Procedure

### Phase 1: Backup (5 minutes)

```bash
#!/bin/bash
# backup-pre-deployment.sh

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup configuration
cp -r config/ "$BACKUP_DIR/config/"

# Backup cache
cp -r ~/.cache/mcp-hub/ "$BACKUP_DIR/cache/"

# Backup logs
cp -r ~/.local/state/mcp-hub/logs/ "$BACKUP_DIR/logs/"

# Create backup manifest
cat > "$BACKUP_DIR/manifest.txt" <<EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD)
Git branch: $(git branch --show-current)
MCP Hub version: $(cat package.json | jq -r .version)
EOF

echo "✅ Backup complete: $BACKUP_DIR"
```

### Phase 2: Stop Current Version (2 minutes)

```bash
#!/bin/bash
# stop-mcp-hub.sh

echo "Stopping MCP Hub..."

# Graceful shutdown
if [ -f /var/run/mcp-hub.pid ]; then
  PID=$(cat /var/run/mcp-hub.pid)
  kill -SIGTERM $PID

  # Wait for graceful shutdown (max 30 seconds)
  for i in {1..30}; do
    if ! ps -p $PID > /dev/null; then
      echo "✅ MCP Hub stopped gracefully"
      break
    fi
    sleep 1
  done

  # Force kill if still running
  if ps -p $PID > /dev/null; then
    echo "⚠️  Forcing shutdown..."
    kill -SIGKILL $PID
  fi
fi

# Or systemd
# sudo systemctl stop mcp-hub

# Verify stopped
sleep 2
if pgrep -f "mcp-hub" > /dev/null; then
  echo "❌ Failed to stop MCP Hub"
  exit 1
else
  echo "✅ MCP Hub stopped"
fi
```

### Phase 3: Deploy New Version (5 minutes)

```bash
#!/bin/bash
# deploy-mcp-hub.sh

echo "Deploying MCP Hub..."

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies
bun install --production

# Build if necessary
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
  bun run build
fi

# Update configuration
cp config/mcp-hub.production.json config/mcp-hub.json

# Set permissions
chmod 600 .env.production
chmod 700 ~/.cache/mcp-hub

echo "✅ Deployment complete"
```

### Phase 4: Start New Version (2 minutes)

```bash
#!/bin/bash
# start-mcp-hub.sh

echo "Starting MCP Hub..."

# Load environment
source .env.production

# Start MCP Hub
bun start > /var/log/mcp-hub/startup.log 2>&1 &
echo $! > /var/run/mcp-hub.pid

# Or systemd
# sudo systemctl start mcp-hub

# Wait for startup
sleep 5

# Verify started
if curl -s http://localhost:7000/api/health > /dev/null; then
  echo "✅ MCP Hub started successfully"
else
  echo "❌ Failed to start MCP Hub"
  tail -20 /var/log/mcp-hub/startup.log
  exit 1
fi
```

### Complete Deployment Script

```bash
#!/bin/bash
# complete-deployment.sh

set -e  # Exit on error

echo "========================================="
echo "MCP Hub Production Deployment"
echo "========================================="
echo ""

# Phase 1: Backup
echo "📦 Phase 1: Creating backup..."
bash scripts/backup-pre-deployment.sh

# Phase 2: Stop
echo "🛑 Phase 2: Stopping current version..."
bash scripts/stop-mcp-hub.sh

# Phase 3: Deploy
echo "🚀 Phase 3: Deploying new version..."
bash scripts/deploy-mcp-hub.sh

# Phase 4: Start
echo "▶️  Phase 4: Starting new version..."
bash scripts/start-mcp-hub.sh

echo ""
echo "========================================="
echo "✅ Deployment Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run validation tests (bash scripts/validate-deployment.sh)"
echo "2. Monitor metrics (curl http://localhost:7000/api/filtering/stats)"
echo "3. Check logs (tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log)"
```

---

## Validation & Testing

### Post-Deployment Validation

```bash
#!/bin/bash
# validate-deployment.sh

echo "Running post-deployment validation..."

PASSED=0
FAILED=0

# Test 1: Health Check
echo -n "Test 1: Health check... "
if curl -s http://localhost:7000/api/health | jq -e '.status == "ok"' > /dev/null; then
  echo "✅ PASS"
  ((PASSED++))
else
  echo "❌ FAIL"
  ((FAILED++))
fi

# Test 2: Filtering Stats
echo -n "Test 2: Filtering stats... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.enabled == true' > /dev/null; then
  echo "✅ PASS"
  ((PASSED++))
else
  echo "❌ FAIL"
  ((FAILED++))
fi

# Test 3: LLM Provider
echo -n "Test 3: LLM provider configured... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.llm.enabled == true' > /dev/null; then
  echo "✅ PASS"
  ((PASSED++))
else
  echo "⚠️  SKIP (LLM not enabled)"
fi

# Test 4: Cache Hit Rate (after some usage)
echo -n "Test 4: Cache functional... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.llmCache' > /dev/null; then
  echo "✅ PASS"
  ((PASSED++))
else
  echo "❌ FAIL"
  ((FAILED++))
fi

# Test 5: Tool List
echo -n "Test 5: Tool list accessible... "
TOOL_COUNT=$(curl -s http://localhost:7000/api/tools | jq '.tools | length')
if [ "$TOOL_COUNT" -gt 0 ]; then
  echo "✅ PASS ($TOOL_COUNT tools)"
  ((PASSED++))
else
  echo "❌ FAIL"
  ((FAILED++))
fi

# Summary
echo ""
echo "Validation Summary:"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo "✅ All validation tests passed"
  exit 0
else
  echo "❌ Some validation tests failed"
  exit 1
fi
```

### Performance Baseline

```bash
#!/bin/bash
# measure-performance.sh

echo "Measuring performance baseline..."

# Test 1: Sync Latency
echo -n "Sync latency (100 requests): "
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s http://localhost:7000/api/tools
done | awk '{ sum += $1 } END { print sum/NR * 1000 "ms" }'

# Test 2: LLM Analysis Latency (if enabled)
echo -n "LLM p95 latency: "
curl -s http://localhost:7000/api/filtering/stats | jq -r '.llm.p95Latency + "ms"'

# Test 3: Cache Hit Rate
echo -n "Cache hit rate: "
curl -s http://localhost:7000/api/filtering/stats | jq -r '.llmCache.hitRate'

# Test 4: Success Rate
echo -n "LLM success rate: "
curl -s http://localhost:7000/api/filtering/stats | jq -r '.llm.successRate'
```

---

## Monitoring Setup

### Metrics Collection

**Key Metrics to Monitor**:
```bash
# Create monitoring dashboard
cat > scripts/monitor-production.sh <<'EOF'
#!/bin/bash

while true; do
  clear
  echo "========================================="
  echo "MCP Hub Production Monitoring"
  echo "========================================="
  echo "Time: $(date)"
  echo ""

  STATS=$(curl -s http://localhost:7000/api/filtering/stats)

  echo "LLM Performance:"
  echo "  Success Rate: $(echo $STATS | jq -r '.llm.successRate')"
  echo "  Avg Latency:  $(echo $STATS | jq -r '.llm.averageLatency')ms"
  echo "  P95 Latency:  $(echo $STATS | jq -r '.llm.p95Latency')ms"
  echo "  P99 Latency:  $(echo $STATS | jq -r '.llm.p99Latency')ms"
  echo "  Queue Depth:  $(echo $STATS | jq -r '.llm.queueDepth')"
  echo ""

  echo "Cache Performance:"
  echo "  Hit Rate:     $(echo $STATS | jq -r '.llmCache.hitRate')"
  echo "  Cache Size:   $(echo $STATS | jq -r '.llmCache.size')"
  echo "  Memory:       $(echo $STATS | jq -r '.llmCache.memoryUsageMB')MB"
  echo ""

  echo "Circuit Breaker:"
  echo "  State:        $(echo $STATS | jq -r '.llm.circuitBreakerState')"
  echo "  Failures:     $(echo $STATS | jq -r '.llm.circuitBreakerFailures')"
  echo ""

  sleep 5
done
EOF

chmod +x scripts/monitor-production.sh
```

### Alert Configuration

**Alert Thresholds** (`config/alerts.json`):
```json
{
  "critical": {
    "llm_success_rate": 0.90,
    "circuit_breaker_state": "open"
  },
  "warning": {
    "llm_success_rate": 0.95,
    "p95_latency": 2000,
    "queue_depth": 50,
    "cache_hit_rate": 0.80
  }
}
```

**Alert Script**:
```bash
#!/bin/bash
# check-alerts.sh

STATS=$(curl -s http://localhost:7000/api/filtering/stats)

# Critical: Circuit breaker open
if echo $STATS | jq -e '.llm.circuitBreakerState == "open"' > /dev/null; then
  echo "🚨 CRITICAL: Circuit breaker is OPEN"
  # Send alert (Slack, email, PagerDuty, etc.)
fi

# Critical: Success rate < 90%
SUCCESS_RATE=$(echo $STATS | jq -r '.llm.successRate')
if (( $(echo "$SUCCESS_RATE < 0.90" | bc -l) )); then
  echo "🚨 CRITICAL: Success rate below 90%: $SUCCESS_RATE"
fi

# Warning: P95 latency > 2000ms
P95=$(echo $STATS | jq -r '.llm.p95Latency')
if (( $(echo "$P95 > 2000" | bc -l) )); then
  echo "⚠️  WARNING: P95 latency above 2000ms: ${P95}ms"
fi

# Warning: Queue depth > 50
QUEUE=$(echo $STATS | jq -r '.llm.queueDepth')
if (( $(echo "$QUEUE > 50" | bc -l) )); then
  echo "⚠️  WARNING: Queue depth high: $QUEUE"
fi
```

### Log Monitoring

```bash
# Watch logs in real-time
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq

# Watch for errors
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq 'select(.level >= 40)'

# Watch LLM-related logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq 'select(.message | contains("LLM"))'
```

---

## Post-Deployment

### Week 1: Close Monitoring

**Daily Tasks**:
```bash
# Morning check (9 AM)
bash scripts/validate-deployment.sh
bash scripts/check-alerts.sh
curl http://localhost:7000/api/filtering/stats | jq

# Evening check (5 PM)
bash scripts/measure-performance.sh
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | jq 'select(.level >= 40)'
```

**Metrics to Track**:
- Success rate (target: >95%)
- P95 latency (target: <2000ms)
- Cache hit rate (target: >80%)
- Circuit breaker trips (target: 0)
- Queue depth (target: <10)

### Month 1: Optimization

**Weekly Tasks**:
- Review performance trends
- Analyze cache efficiency
- Check API costs
- Update documentation based on real-world usage

**Optimization Opportunities**:
```bash
# Identify frequently categorized tools
curl http://localhost:7000/api/filtering/stats | \
  jq '.llmCache' | \
  jq 'to_entries | sort_by(.value.timestamp) | reverse | .[0:20]'

# Check for category distribution
node scripts/tool-discovery.js --mode stats
```

### Quarter 1: Review

**Quarterly Tasks**:
- Security audit
- API key rotation
- Documentation refresh
- Performance review
- Cost analysis

---

## Rollback Plan

### When to Rollback

**Critical Triggers**:
- Success rate < 80%
- P95 latency > 5000ms
- Circuit breaker continuously tripping
- Memory leak detected
- Security vulnerability discovered

**Warning Signs**:
- Increased error logs
- Client complaints
- Unexpected API costs
- Degraded performance

### Rollback Procedure

```bash
#!/bin/bash
# rollback-deployment.sh

set -e

echo "========================================="
echo "MCP Hub Rollback Procedure"
echo "========================================="
echo ""

# Find latest backup
BACKUP_DIR=$(ls -1 backups/ | tail -1)
echo "Rolling back to: backups/$BACKUP_DIR"

# Stop current version
echo "Stopping current version..."
bash scripts/stop-mcp-hub.sh

# Restore configuration
echo "Restoring configuration..."
cp -r "backups/$BACKUP_DIR/config/" config/

# Restore cache (optional)
echo "Restoring cache..."
cp -r "backups/$BACKUP_DIR/cache/" ~/.cache/mcp-hub/

# Restore code (git checkout)
BACKUP_COMMIT=$(cat "backups/$BACKUP_DIR/manifest.txt" | grep "Git commit" | awk '{print $3}')
echo "Restoring code to commit: $BACKUP_COMMIT"
git checkout $BACKUP_COMMIT

# Reinstall dependencies
echo "Reinstalling dependencies..."
bun install

# Start previous version
echo "Starting previous version..."
bash scripts/start-mcp-hub.sh

# Validate rollback
echo "Validating rollback..."
bash scripts/validate-deployment.sh

echo ""
echo "========================================="
echo "✅ Rollback Complete"
echo "========================================="
echo ""
echo "Incident report template:"
echo "backups/$BACKUP_DIR/incident-report.md"
```

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] Code review complete
- [ ] Tests passing (72/72 Sprint 3 tests)
- [ ] Lint clean (0 errors)
- [ ] API keys configured securely
- [ ] File permissions set (600/700)
- [ ] Security audit complete
- [ ] Documentation current
- [ ] Backup created

### Deployment
- [ ] Stop current version
- [ ] Deploy new code
- [ ] Update configuration
- [ ] Start new version
- [ ] Validate deployment

### Post-Deployment
- [ ] Health check passed
- [ ] Filtering stats validated
- [ ] Performance baseline measured
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Logs accessible

### Week 1
- [ ] Daily validation
- [ ] Daily alert checks
- [ ] Daily performance review
- [ ] No critical issues

### Month 1
- [ ] Weekly optimization
- [ ] Cache efficiency analysis
- [ ] API cost review
- [ ] Documentation updates

---

## Quick Reference Commands

```bash
# Health check
curl http://localhost:7000/api/health | jq

# Stats
curl http://localhost:7000/api/filtering/stats | jq

# Validate deployment
bash scripts/validate-deployment.sh

# Monitor real-time
bash scripts/monitor-production.sh

# Check alerts
bash scripts/check-alerts.sh

# View logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | jq

# Performance baseline
bash scripts/measure-performance.sh

# Discovery tool
node scripts/tool-discovery.js --mode stats
```

---

**Deployment Status**: Ready for Production
**Last Updated**: November 16, 2025
**Next Review**: 1 week post-deployment

**For assistance, refer to**:
- Security: `ML_TOOL_FILTERING_SECURITY_GUIDE.md`
- Migration: `ML_TOOL_FILTERING_MIGRATION_GUIDE.md`
- Troubleshooting: `ML_TOOL_FILTERING_MIGRATION_GUIDE.md` (FAQ section)
