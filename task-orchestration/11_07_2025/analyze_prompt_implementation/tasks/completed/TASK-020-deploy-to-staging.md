# TASK-020: Deploy to Staging Environment

## Status
- **Current**: TODO
- **Assigned**: DevOps / Lead Developer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 4 - Documentation & Deployment

## Description
Deploy analyze_prompt implementation to staging environment for validation before production.

## Context
Staging validation catches integration issues and verifies real-world behavior before production deployment.

## Dependencies
- **Blocks**: TASK-021 (production deployment)
- **Requires**: All implementation and testing tasks complete (TASK-001 through TASK-019)

## Acceptance Criteria
- [ ] Code merged to staging branch
- [ ] Staging environment updated
- [ ] Configuration applied
- [ ] API key configured securely
- [ ] Smoke tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] No regressions detected

## Deployment Checklist

### Pre-Deployment
- [ ] All 23 integration tests passing locally
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Configuration examples validated
- [ ] Rollback plan prepared

### Deployment Steps

**1. Merge to Staging Branch**
```bash
git checkout main
git pull origin main
git checkout staging
git merge main
git push origin staging
```

**2. Configure Staging Environment**
```bash
# Set API key securely (use secret management)
export GEMINI_API_KEY="staging-key-here"

# Update configuration
cp mcp-servers.staging.json mcp-servers.json

# Verify configuration
cat mcp-servers.json | jq '.toolFiltering.promptBasedFiltering'
```

**3. Deploy to Staging**
```bash
# Stop existing instance
pkill -f "bun.*server.js"

# Pull latest code
git pull origin staging

# Install dependencies (if needed)
bun install

# Start with debug logging
DEBUG_TOOL_FILTERING=true bun start > staging.log 2>&1 &
```

**4. Smoke Tests**
```bash
# Test 1: Hub starts successfully
curl http://staging-hub:7000/health

# Test 2: Meta-tool registered
curl http://staging-hub:7000/mcp/messages?sessionId=smoke-test \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  jq '.result.tools[] | select(.name=="hub__analyze_prompt")'

# Test 3: Analysis works
./scripts/test-analyze-prompt.sh "Check GitHub issues"
```

### Post-Deployment Validation

**Integration Testing**:
```bash
# Run full test suite against staging
MCP_HUB_URL=http://staging-hub:7000 bun test tests/prompt-based-filtering.test.js
```

**Performance Testing**:
```bash
# Check analysis latency
for i in {1..10}; do
  time curl http://staging-hub:7000/mcp/messages?sessionId=perf-$i \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hub__analyze_prompt","arguments":{"prompt":"test"}}}' \
    -s > /dev/null
done | grep real
# Should be < 2000ms (p95)
```

**Regression Testing**:
```bash
# Test existing functionality unaffected
bun test  # All 505 tests should pass (482 + 23 new)
```

### Monitoring

**Key Metrics to Monitor**:
- Request success rate: Should be >99%
- Analysis latency (p95): Should be <2000ms
- Error rate: Should be <1%
- Session count: Track active sessions
- Tool exposure changes: Track category updates

**Log Monitoring**:
```bash
# Watch for errors
tail -f staging.log | grep ERROR

# Watch analysis flow
tail -f staging.log | grep "analyze_prompt"

# Watch for unexpected patterns
tail -f staging.log | grep -E "WARNING|WARN"
```

### Rollback Plan

If issues detected:
```bash
# Stop current instance
pkill -f "bun.*server.js"

# Revert to previous version
git checkout staging
git reset --hard HEAD~1  # Revert merge
git push origin staging --force

# Redeploy previous version
bun start

# Verify rollback successful
curl http://staging-hub:7000/health
```

## Success Criteria
- All smoke tests pass
- Integration tests pass
- Performance benchmarks met
- No errors in logs (first 1 hour)
- Regression tests pass
- Ready for production deployment

## Validation Period
- Monitor staging for 24-48 hours
- Collect metrics and logs
- Verify no unexpected issues
- Get stakeholder approval

## Related Tasks
- TASK-015: Integration tests (run against staging)
- TASK-016: Validation script (staging validation)
- TASK-021: Production deployment (next phase)

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 8 (Deployment)
- Staging environment documentation
- Deployment procedures
