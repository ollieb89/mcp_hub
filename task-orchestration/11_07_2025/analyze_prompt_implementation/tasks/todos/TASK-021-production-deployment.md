# TASK-021: Production Deployment

## Status
- **Current**: TODO
- **Assigned**: DevOps / Lead Developer
- **Priority**: HIGH
- **Estimated**: 1 hour
- **Phase**: 4 - Documentation & Deployment

## Description
Deploy analyze_prompt implementation to production environment after successful staging validation.

## Context
Final deployment enables the feature for all users after thorough testing and validation.

## Dependencies
- **Blocks**: None (final task)
- **Requires**: TASK-020 (staging deployment successful)

## Acceptance Criteria
- [ ] Staging validation complete (24-48 hours)
- [ ] All metrics within acceptable ranges
- [ ] Stakeholder approval obtained
- [ ] Production configuration prepared
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Documentation published
- [ ] Deployment successful
- [ ] Post-deployment validation complete

## Pre-Deployment Checklist

**Staging Validation**:
- [ ] Staging running 24-48 hours without issues
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] No critical bugs reported
- [ ] Metrics within acceptable ranges

**Production Readiness**:
- [ ] Production API keys configured
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested
- [ ] Documentation finalized
- [ ] Team notified of deployment
- [ ] On-call engineer assigned

## Deployment Procedure

### Phase 1: Preparation (15 minutes)

**1. Final Verification**
```bash
# Verify main branch up to date
git checkout main
git pull origin main

# Verify all tests pass
bun test  # Should be 505/505 passing

# Build production artifacts
bun run build
```

**2. Configuration Preparation**
```bash
# Prepare production config (secure secret management)
# Use environment-specific API keys
export GEMINI_API_KEY="prod-key-here"

# Verify configuration
cat mcp-servers.production.json | jq '.toolFiltering'
```

### Phase 2: Deployment (30 minutes)

**1. Backup Current State**
```bash
# Tag current production version
git tag -a v1.X.X-pre-analyze-prompt -m "Pre analyze_prompt deployment"
git push origin v1.X.X-pre-analyze-prompt

# Backup configuration
cp mcp-servers.json mcp-servers.json.backup
```

**2. Deploy New Version**
```bash
# Graceful shutdown with active session handling
# (Implementation depends on your deployment strategy)

# Option A: Blue-Green Deployment (recommended)
# - Start new instance on different port
# - Verify health checks pass
# - Switch load balancer
# - Drain old instance

# Option B: Rolling Restart
# - For single-instance deployments
pkill -SIGTERM -f "bun.*server.js"  # Graceful shutdown
sleep 5  # Allow cleanup
bun start > production.log 2>&1 &
```

**3. Health Checks**
```bash
# Wait for startup
sleep 10

# Verify Hub started
curl https://prod-hub.example.com/health

# Verify meta-tool registered
curl https://prod-hub.example.com/mcp/messages?sessionId=health-check \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  jq '.result.tools[] | select(.name=="hub__analyze_prompt")'
```

### Phase 3: Validation (15 minutes)

**Smoke Tests**:
```bash
# Test 1: Analysis works
./scripts/test-analyze-prompt.sh --url https://prod-hub.example.com \
  "Check GitHub notifications"

# Test 2: Tool filtering works
# (Verify tools/list returns filtered results)

# Test 3: Session isolation works
# (Create multiple sessions, verify independent)
```

**Integration Tests**:
```bash
# Run against production
MCP_HUB_URL=https://prod-hub.example.com \
  bun test tests/prompt-based-filtering.test.js
```

**Performance Validation**:
```bash
# Monitor first 100 requests
# - Analysis latency p95 < 2000ms
# - Success rate > 99%
# - No errors in logs
```

### Phase 4: Monitoring (Ongoing)

**Metrics to Track** (first 24 hours):
```
- Request volume
- Success rate
- Error rate
- Analysis latency (p50, p95, p99)
- Tool exposure changes per session
- LLM API costs
- Session count
```

**Alerts to Configure**:
```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    action: notify_on_call

  - name: High Latency
    condition: p95_latency > 3000ms
    action: notify_team

  - name: LLM Failure Rate
    condition: llm_failure_rate > 10%
    action: notify_on_call
```

**Log Monitoring**:
```bash
# Real-time error monitoring
tail -f production.log | grep -E "ERROR|analyze_prompt.*failed"

# Track analysis patterns
tail -f production.log | grep "LLM analysis completed" | \
  jq '.categories'
```

## Rollback Procedure

If critical issues detected within first 24 hours:

**Quick Rollback** (< 5 minutes):
```bash
# Stop current instance
pkill -f "bun.*server.js"

# Restore previous config
cp mcp-servers.json.backup mcp-servers.json

# Checkout previous version
git checkout v1.X.X-pre-analyze-prompt

# Restart
bun start

# Verify rollback
curl https://prod-hub.example.com/health
```

**Post-Rollback**:
- [ ] Notify team of rollback
- [ ] Document issue that caused rollback
- [ ] Create hotfix plan
- [ ] Schedule re-deployment

## Success Criteria

**Immediate (First Hour)**:
- [ ] Deployment completes without errors
- [ ] All smoke tests pass
- [ ] No error spike in logs
- [ ] Performance within acceptable range

**Short-term (First 24 Hours)**:
- [ ] Success rate >99%
- [ ] Analysis latency p95 <2000ms
- [ ] No critical bugs reported
- [ ] User feedback positive
- [ ] Metrics stable

**Long-term (First Week)**:
- [ ] Feature adoption tracking
- [ ] Cost analysis (LLM API usage)
- [ ] User satisfaction metrics
- [ ] Performance optimization opportunities identified

## Post-Deployment Tasks

- [ ] Update status page (feature launched)
- [ ] Announce to users (release notes)
- [ ] Monitor metrics dashboard
- [ ] Collect user feedback
- [ ] Plan optimization iterations
- [ ] Update project memories

## Related Tasks
- TASK-020: Staging deployment (prerequisite)
- All previous implementation tasks

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 8
- Production deployment procedures
- Monitoring and alerting documentation
