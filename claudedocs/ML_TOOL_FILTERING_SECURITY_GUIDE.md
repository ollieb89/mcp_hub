# ML Tool Filtering Security Guide

**Version**: 1.0
**Date**: November 16, 2025
**Status**: Production Ready

## Table of Contents

1. [Overview](#overview)
2. [API Key Management](#api-key-management)
3. [Cache Security](#cache-security)
4. [Network Security](#network-security)
5. [Data Privacy](#data-privacy)
6. [Best Practices](#best-practices)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

---

## Overview

The ML Tool Filtering system integrates with external LLM providers (OpenAI, Anthropic, Gemini) to enhance tool categorization accuracy. This introduces several security considerations that must be addressed in production deployments.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Minimal access rights for each component
3. **Fail Secure**: Default to restrictive behavior on errors
4. **Zero Trust**: Verify all inputs and outputs
5. **Graceful Degradation**: Maintain functionality when LLM unavailable

### Threat Model

**Assets to Protect**:
- LLM API keys (OpenAI, Anthropic, Gemini)
- Tool metadata (names, descriptions, input schemas)
- LLM categorization cache data
- System performance and availability

**Threat Actors**:
- External attackers (API key theft, data exfiltration)
- Malicious MCP servers (sending malformed tool definitions)
- Compromised dependencies (supply chain attacks)
- Insider threats (credential misuse)

**Attack Vectors**:
- Environment variable exposure
- Cache file tampering
- Man-in-the-middle attacks
- API rate limit exhaustion
- Prompt injection attacks

---

## API Key Management

### Secure Storage

**✅ DO: Use Environment Variables**
```bash
# .env file (NEVER commit to version control)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

**✅ DO: Use Secret Management Systems**
```bash
# 1Password CLI
export OPENAI_API_KEY=$(op read "op://vault/openai/api-key")

# AWS Secrets Manager
export OPENAI_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id mcp-hub/openai-key \
  --query SecretString \
  --output text)

# HashiCorp Vault
export OPENAI_API_KEY=$(vault kv get -field=api-key secret/mcp-hub/openai)
```

**❌ DON'T: Hardcode in Configuration**
```json
{
  "llmCategorization": {
    "apiKey": "sk-proj-abc123..."  // ❌ NEVER DO THIS
  }
}
```

### Access Control

**File Permissions**:
```bash
# Restrict .env file access
chmod 600 .env
chown mcp-hub:mcp-hub .env

# Verify permissions
ls -la .env
# Expected: -rw------- 1 mcp-hub mcp-hub
```

**Process Isolation**:
```bash
# Run MCP Hub as dedicated user
sudo useradd -r -s /bin/false mcp-hub
sudo -u mcp-hub bun start
```

### Key Rotation

**Rotation Schedule**:
- **Production**: Every 90 days
- **Development**: Every 180 days
- **Immediate**: On suspected compromise

**Rotation Procedure**:
```bash
# 1. Generate new API key from provider
# 2. Update secret management system
op item edit "openai" api-key=sk-proj-NEW_KEY

# 3. Update environment variable
export OPENAI_API_KEY=$(op read "op://vault/openai/api-key")

# 4. Restart MCP Hub gracefully
kill -SIGTERM $(cat /var/run/mcp-hub.pid)
bun start

# 5. Verify new key working
curl http://localhost:7000/api/filtering/stats | jq '.llm.successfulCalls'

# 6. Revoke old key from provider dashboard
```

### Key Validation

**Startup Validation**:
```javascript
// src/utils/llm-provider.js validates on initialization
if (!apiKey) {
  logger.warn('LLM API key not configured, categorization disabled');
  return null; // Graceful fallback to heuristics
}
```

**Runtime Validation**:
- API returns 401/403 → Circuit breaker trips after 5 failures
- Automatic fallback to heuristic categorization
- Alerts sent when circuit breaker opens

---

## Cache Security

### Cache Location

**XDG-Compliant Paths** (Linux/macOS):
```bash
# Cache location
$XDG_CACHE_HOME/mcp-hub/llm-categorization-cache.json
# Usually: ~/.cache/mcp-hub/llm-categorization-cache.json

# State directory (for logs, workspaces)
$XDG_STATE_HOME/mcp-hub/
# Usually: ~/.local/state/mcp-hub/
```

**Windows**:
```
%LOCALAPPDATA%\mcp-hub\cache\llm-categorization-cache.json
```

### File Permissions

**Restrictive Permissions**:
```bash
# Set secure permissions on cache file
chmod 600 ~/.cache/mcp-hub/llm-categorization-cache.json

# Verify
ls -la ~/.cache/mcp-hub/llm-categorization-cache.json
# Expected: -rw------- 1 user user
```

### Cache Content Security

**Sensitive Data in Cache**:
```json
{
  "filesystem__read_file": {
    "category": "filesystem",
    "confidence": 0.95,
    "source": "llm",
    "timestamp": 1700000000,
    "ttl": 86400
  }
}
```

**Data Classification**:
- **Tool names**: Low sensitivity (public MCP server names)
- **Categories**: Low sensitivity (standard taxonomy)
- **Confidence scores**: Low sensitivity (numeric values)
- **Timestamps**: Low sensitivity (cache metadata)

**Risk Assessment**: Cache data is **non-sensitive** but should still be protected:
- No PII or user data stored
- No API keys or credentials
- Tool names may reveal infrastructure details
- Defense in depth: restrict access anyway

### Cache Tampering Prevention

**Integrity Validation**:
```javascript
// Cache entries validated on load
const isValid =
  entry.category &&
  typeof entry.confidence === 'number' &&
  entry.confidence >= 0 &&
  entry.confidence <= 1 &&
  entry.source &&
  entry.timestamp;

if (!isValid) {
  logger.warn('Invalid cache entry detected, skipping');
  continue; // Skip corrupted entries
}
```

**TTL Enforcement**:
```javascript
// Expired entries automatically purged
const isExpired = Date.now() - entry.timestamp > (entry.ttl * 1000);
if (isExpired) {
  this.llmCache.delete(toolName);
}
```

### Cache Encryption (Optional)

For highly sensitive environments, encrypt cache at rest:

```bash
# Using gpg
gpg --symmetric --cipher-algo AES256 llm-categorization-cache.json

# Using age (modern alternative)
age --encrypt --output cache.json.age \
  --passphrase llm-categorization-cache.json
```

**Trade-offs**:
- **Benefit**: Protection against disk access attacks
- **Cost**: Slower startup (decryption overhead)
- **Recommendation**: Only for high-security environments

---

## Network Security

### TLS/HTTPS

**All LLM Providers Use HTTPS**:
```javascript
// src/utils/llm-provider.js
const apiEndpoints = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/...'
};
```

**Certificate Validation**:
- Node.js/Bun enforces certificate validation by default
- Uses system certificate store
- No custom CA certificates needed

### Proxy Support

**HTTP Proxy Configuration**:
```bash
# Environment variables
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1

# Node.js respects these automatically
bun start
```

**Corporate Environments**:
```javascript
// Custom proxy with authentication
const proxyAgent = new HttpsProxyAgent({
  host: 'proxy.example.com',
  port: 8080,
  auth: `${username}:${password}`
});

// Configure fetch (if needed)
global.fetch = (url, options) => {
  return fetch(url, { ...options, agent: proxyAgent });
};
```

### Rate Limiting

**Provider Rate Limits**:
- **OpenAI**: 10,000 RPM (Tier 1), 500,000 TPM
- **Anthropic**: 50 RPM (free), 1,000 RPM (paid)
- **Gemini**: 15 RPM (free), 1,000 RPM (paid)

**MCP Hub Protection**:
```javascript
// src/utils/tool-filtering-service.js
this._llmQueue = new PQueue({
  concurrency: 5,          // Max 5 concurrent requests
  interval: 1000,          // Per second
  intervalCap: 10          // Max 10 requests per second
});
```

**DDoS Protection**:
- PQueue prevents API exhaustion
- Circuit breaker trips after 5 failures (prevents runaway retries)
- Exponential backoff: 1s → 5s → 15s delays

---

## Data Privacy

### Tool Metadata Sent to LLM

**Data Transmitted**:
```javascript
{
  toolName: "github__search_repositories",
  definition: "Search for repositories on GitHub",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      sort: { type: "string", enum: ["stars", "forks", "updated"] }
    }
  }
}
```

**Privacy Assessment**:
- **Tool names**: Non-sensitive (public MCP server capabilities)
- **Descriptions**: Non-sensitive (public documentation)
- **Input schemas**: Non-sensitive (API metadata)
- **No user data**: No PII, passwords, or sensitive content transmitted

### LLM Provider Data Handling

**OpenAI**:
- API requests NOT used for model training (as of 2024)
- 30-day retention for abuse monitoring
- Opt-out available via zero retention policy

**Anthropic**:
- API requests NOT used for model training
- 90-day retention for trust & safety
- Enterprise customers: custom retention policies

**Gemini**:
- API requests NOT used for model training
- Standard retention: 18 months
- Enterprise options available

**Recommendation**:
- Review provider data policies before deployment
- Use enterprise tier for sensitive environments
- Enable zero retention where available

### Compliance Considerations

**GDPR**:
- Tool metadata is NOT personal data
- No data subject rights applicable
- No GDPR concerns for typical usage

**SOC 2**:
- All providers offer SOC 2 Type II compliance
- Audit reports available on request
- Suitable for enterprise deployments

**HIPAA**:
- Tool metadata NOT protected health information
- LLM categorization NOT subject to HIPAA
- Use BAA-compliant providers if needed

---

## Best Practices

### 1. Provider Selection

**Evaluation Criteria**:

| Criteria | OpenAI | Anthropic | Gemini |
|----------|---------|-----------|---------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cost | $$ | $$$ | $ |
| Latency | 500-1500ms | 400-1200ms | 300-800ms |
| Rate Limits | High | Medium | Low (free) |
| Privacy | Good | Excellent | Good |
| Compliance | SOC 2 | SOC 2 | SOC 2 |

**Recommendations**:
- **Production**: OpenAI GPT-4o-mini (balance of cost/performance)
- **High Security**: Anthropic Claude 3.5 Haiku (best privacy)
- **Cost-Sensitive**: Gemini 2.5 Flash (lowest cost)

### 2. Monitoring & Alerts

**Critical Metrics**:
```javascript
// Monitor via /api/filtering/stats
{
  llm: {
    successRate: "0.985",          // Alert if < 0.95
    averageLatency: 856,            // Alert if > 2000ms
    p95Latency: 1450,               // Alert if > 3000ms
    circuitBreakerState: "closed",  // Alert if "open"
    queueDepth: 3,                  // Alert if > 50
    fallbacksUsed: 2                // Alert if > 100/day
  }
}
```

**Alert Thresholds**:
```yaml
critical:
  - circuitBreakerState: "open"       # LLM provider down
  - successRate: < 0.90                # >10% failure rate

warning:
  - successRate: < 0.95                # >5% failure rate
  - p95Latency: > 2000                 # Slow responses
  - queueDepth: > 50                   # Queue backing up
  - fallbacksUsed: > 100/day           # Too many fallbacks
```

**Alert Channels**:
```bash
# Example: Slack webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "⚠️ MCP Hub LLM circuit breaker opened - success rate: 85%"
  }'
```

### 3. Graceful Degradation

**Fallback Strategy**:
```
1. LLM categorization (primary)
   ↓ (timeout/error)
2. Retry with exponential backoff (3 attempts)
   ↓ (all retries exhausted)
3. Circuit breaker check
   ↓ (circuit open)
4. Heuristic categorization (fallback)
   ↓
5. Always succeeds (never blocks tools)
```

**Heuristic Fallback**:
```javascript
// src/utils/tool-filtering-service.js
_categorizeBySyntax(toolName) {
  const name = toolName.toLowerCase();

  // Syntax pattern matching
  if (name.includes('filesystem') || name.includes('file')) return 'filesystem';
  if (name.includes('github') || name.includes('git')) return 'version-control';
  if (name.includes('fetch') || name.includes('http')) return 'web';
  // ... more patterns

  return 'other'; // Safe default
}
```

### 4. Secure Configuration

**Minimal Configuration**:
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"  // Environment variable only
    }
  }
}
```

**Configuration Validation**:
```bash
# Validate before deployment
bun start --validate-config

# Check for hardcoded secrets
grep -r "sk-" config/
grep -r "API_KEY.*=" config/
# Should return no results
```

### 5. Audit Logging

**Security Events to Log**:
```javascript
// API key validation failures
logger.warn('LLM API key validation failed', {
  provider: 'openai',
  error: 'Invalid API key'
});

// Circuit breaker state changes
logger.warn('LLM circuit breaker opened', {
  consecutiveFailures: 5,
  lastError: 'API timeout'
});

// Suspicious cache activity
logger.warn('Cache entry tampering detected', {
  toolName: 'suspicious__tool',
  reason: 'Invalid confidence score'
});
```

**Log Retention**:
- **Security logs**: 90 days minimum
- **Operational logs**: 30 days
- **Debug logs**: 7 days

---

## Incident Response

### Security Incident Types

**1. API Key Compromise**

**Detection**:
- Unexpected API usage spikes
- Requests from unknown IPs
- Provider billing alerts

**Response**:
```bash
# 1. Immediately revoke compromised key
# (via provider dashboard)

# 2. Generate new key
# 3. Update secret management system
op item edit "openai" api-key=sk-proj-NEW_KEY

# 4. Restart MCP Hub
sudo systemctl restart mcp-hub

# 5. Review logs for unauthorized usage
grep "LLM API" /var/log/mcp-hub/mcp-hub.log | \
  jq 'select(.timestamp > "2024-01-01T00:00:00Z")'

# 6. File incident report
```

**2. Cache Tampering**

**Detection**:
- Invalid cache entries logged
- Unexpected category distributions
- Cache file modification time mismatches

**Response**:
```bash
# 1. Stop MCP Hub
sudo systemctl stop mcp-hub

# 2. Backup compromised cache
cp ~/.cache/mcp-hub/llm-categorization-cache.json \
   /var/backups/cache-compromised-$(date +%Y%m%d).json

# 3. Delete compromised cache
rm ~/.cache/mcp-hub/llm-categorization-cache.json

# 4. Restart (fresh cache rebuild)
sudo systemctl start mcp-hub

# 5. Investigate how tampering occurred
# - Check file permissions
# - Review user access logs
# - Scan for malware
```

**3. LLM Provider Outage**

**Detection**:
- Circuit breaker opens
- Success rate drops below 50%
- Multiple timeout errors

**Response**:
```bash
# 1. Verify outage (check provider status page)
curl https://status.openai.com/api/v2/status.json

# 2. Switch to backup provider (if configured)
export ANTHROPIC_API_KEY=$(op read "op://vault/anthropic/key")
# Update config: provider: "anthropic"
sudo systemctl restart mcp-hub

# 3. Monitor fallback behavior
watch -n 5 "curl -s http://localhost:7000/api/filtering/stats | \
  jq '.llm.fallbacksUsed'"

# 4. Document incident for post-mortem
```

### Incident Severity Levels

**P0 - Critical**:
- LLM provider completely down
- API key compromised and actively exploited
- Security vulnerability actively exploited

**P1 - High**:
- Degraded LLM performance (>50% failure rate)
- Cache tampering detected
- Unexpected rate limit exhaustion

**P2 - Medium**:
- Circuit breaker tripped (>5 consecutive failures)
- Elevated error rates (10-50%)
- Configuration issues

**P3 - Low**:
- Occasional API timeouts
- Cache performance degradation
- Non-critical errors

### Communication Plan

**Incident Template**:
```markdown
## Incident Report: [Brief Description]

**Severity**: P0/P1/P2/P3
**Detected**: YYYY-MM-DD HH:MM UTC
**Resolved**: YYYY-MM-DD HH:MM UTC
**Duration**: X hours

### Impact
- Affected systems: [list]
- User impact: [description]
- Data impact: [description]

### Timeline
- HH:MM - Incident detected
- HH:MM - Response initiated
- HH:MM - Mitigation applied
- HH:MM - Incident resolved

### Root Cause
[Technical analysis]

### Remediation
- Immediate: [actions taken]
- Short-term: [within 1 week]
- Long-term: [within 1 month]

### Lessons Learned
- What went well
- What could be improved
- Action items
```

---

## Security Checklist

### Pre-Deployment

- [ ] **API Key Security**
  - [ ] Keys stored in environment variables (not config files)
  - [ ] .env file in .gitignore
  - [ ] File permissions: 600 on .env
  - [ ] Keys validated before deployment

- [ ] **Cache Security**
  - [ ] Cache directory permissions: 700
  - [ ] Cache file permissions: 600
  - [ ] XDG-compliant paths used

- [ ] **Network Security**
  - [ ] HTTPS enforced for all API calls
  - [ ] Proxy configuration (if applicable)
  - [ ] Rate limiting configured

- [ ] **Configuration Security**
  - [ ] No hardcoded secrets in config files
  - [ ] Configuration validation passed
  - [ ] Secure defaults applied

### Post-Deployment

- [ ] **Monitoring**
  - [ ] Success rate monitoring enabled
  - [ ] Latency alerts configured
  - [ ] Circuit breaker alerts configured
  - [ ] Log aggregation working

- [ ] **Access Control**
  - [ ] MCP Hub running as dedicated user
  - [ ] File permissions verified
  - [ ] Process isolation confirmed

- [ ] **Incident Response**
  - [ ] Incident playbooks documented
  - [ ] Contact information current
  - [ ] Escalation paths defined

- [ ] **Compliance**
  - [ ] Data handling reviewed
  - [ ] Provider policies accepted
  - [ ] Audit logging enabled

### Ongoing Operations

- [ ] **Monthly**
  - [ ] Review API usage metrics
  - [ ] Check for provider policy updates
  - [ ] Verify alert thresholds

- [ ] **Quarterly**
  - [ ] Rotate API keys
  - [ ] Security audit
  - [ ] Update incident playbooks

- [ ] **Annually**
  - [ ] Provider selection review
  - [ ] Compliance assessment
  - [ ] Security training

---

## Additional Resources

### Documentation
- [LLM Provider Configuration](../tests/task-3-1-llm-provider-configuration.test.js)
- [Prompt Design Guide](../tests/task-3-2-llm-prompt-design.test.js)
- [Monitoring Guide](../tests/task-3-8-monitoring-observability.test.js)

### Provider Documentation
- [OpenAI Security Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [Anthropic Security Guidelines](https://docs.anthropic.com/claude/docs/security)
- [Google Cloud Security](https://cloud.google.com/security/best-practices)

### Standards & Compliance
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: November 16, 2025
**Version**: 1.0
**Maintained By**: MCP Hub Security Team
