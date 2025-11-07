# MCP Hub Scripts Directory

Automation scripts for development, testing, validation, and deployment workflows.

## Table of Contents
- [Validation Scripts](#validation-scripts)
- [Testing Scripts](#testing-scripts)
- [Monitoring Scripts](#monitoring-scripts)
- [Release & Deployment](#release--deployment)
- [Usage Examples](#usage-examples)

---

## Validation Scripts

### `day1-checkpoint.sh`
**Purpose**: Day 1 (H+24) checkpoint validation for staging deployment

**Categories Validated**:
1. Functional Stability (integration tests, smoke tests, logs)
2. Performance Baseline (regression check, load test results)
3. Memory Stability (memory regression, limits, process health)
4. Edge Case Coverage (integration test suite)
5. Regression Status (full test suite, coverage)

**Usage**:
```bash
./scripts/day1-checkpoint.sh
./scripts/day1-checkpoint.sh --verbose  # Detailed output
```

**Exit Codes**:
- `0` - All categories passed (GO for Day 2)
- `1` - One or more categories failed (NO-GO)
- `2` - Script error

**Output**:
```
==========================================
  Day 1 Checkpoint Validation (H+24)
==========================================

[1/5] Functional Stability
========================================
✓ All 23 integration tests passing
✓ All 10 smoke tests passing
✓ Zero ERROR level entries found
✓ Warnings below threshold (<10)
✅ Category 1: PASS

...

==========================================
  Day 1 Checkpoint Summary
==========================================
✅ DAY 1 CHECKPOINT: GO FOR DAY 2
```

---

### `final-sign-off-validation.sh`
**Purpose**: Final (H+48) production readiness validation

**Checklist Items** (10):
1. Test Coverage Validation (482/482, 82%+)
2. Performance Benchmarks Met (p95 < 500ms)
3. Memory Usage Stable (< 512MB, < 5%)
4. Error-Free Logs (0 critical errors)
5. Feature Functionality Verified (hub__analyze_prompt)
6. Documentation Complete (all guides present)
7. Configuration Validation (example config valid)
8. Rollback Plan Validated (documented and tested)
9. Edge Case Coverage (all scenarios passing)
10. Regression Status (no regressions introduced)

**Usage**:
```bash
./scripts/final-sign-off-validation.sh
./scripts/final-sign-off-validation.sh --verbose  # Detailed output
```

**Exit Codes**:
- `0` - All criteria met (APPROVED for production)
- `1` - One or more criteria failed (REJECTED)
- `2` - Script error

**Output**:
```
==========================================
  ✅ ALL SIGN-OFF CRITERIA MET
  STATUS: APPROVED FOR PRODUCTION
==========================================
```

---

### `performance-regression-check.sh`
**Purpose**: Detect performance regressions against baseline

**Metrics Compared**:
- p95 Latency (threshold: +10%)
- Error Rate (threshold: +50%)
- Throughput (threshold: -15%)

**Usage**:
```bash
# Use default baseline (baseline-pre-staging.json)
./scripts/performance-regression-check.sh

# Use custom baseline
./scripts/performance-regression-check.sh custom-baseline.json
```

**Prerequisites**:
1. Baseline file must exist: `baseline-pre-staging.json`
2. k6 must be installed
3. MCP Hub must be running

**Create Baseline**:
```bash
bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json
```

**Exit Codes**:
- `0` - No regression detected
- `1` - Regression detected
- `2` - Script error (missing files, invalid JSON)

**Output**:
```
Metric Comparison:
==================
Metric               | Baseline        | Current         | Change
------------------------------------------------------------------------
p95 Latency          | 245.67ms        | 253.12ms        | +3.03%
Error Rate           | 0.0012          | 0.0015          | +25.00%
Throughput           | 125.4 req/s     | 132.1 req/s     | +5.34%

✓ p95 latency: 3.03% change (within threshold)
✓ error rate: 25.00% change (within threshold)
✓ throughput: 5.34% change (within threshold)

✅ No performance regressions detected
```

---

### `memory-regression-check.sh`
**Purpose**: Monitor memory usage and detect regressions

**Metrics Validated**:
- Memory increase vs baseline (threshold: +5%)
- Absolute maximum limit (512MB)

**Usage**:
```bash
# Use baseline from file (baseline-memory.txt)
./scripts/memory-regression-check.sh

# Use custom baseline (KB)
./scripts/memory-regression-check.sh --baseline 350000
```

**Create Baseline**:
```bash
ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt
```

**Exit Codes**:
- `0` - No regression detected
- `1` - Regression detected
- `2` - Script error (Hub not running)

**Output**:
```
Memory Usage Comparison:
========================
Baseline            : 341.23MB (349408KB)
Current             : 355.67MB (364208KB)
Change              : +4.23%

✓ Memory usage within threshold (4.23% change)
✓ Memory usage below 512MB limit

✅ No memory regressions detected
```

---

## Testing Scripts

### `staging-smoke-tests.sh`
**Purpose**: Quick validation suite for staging deployment health

**Tests** (10):
1. Hub health check
2. Configuration file exists
3. Prompt-based mode enabled
4. LLM provider configured
5. API key environment variable set
6. Session isolation configuration
7. Default exposure configuration
8. Validation script exists
9. Test suite available
10. Log directory writable

**Usage**:
```bash
./scripts/staging-smoke-tests.sh
./scripts/staging-smoke-tests.sh --verbose
```

**Environment Variables**:
- `HUB_URL` - Hub URL (default: http://localhost:7000)
- `CONFIG_FILE` - Config file path (default: mcp-servers.json)

**Exit Codes**:
- `0` - All tests passed
- `1` - One or more tests failed

---

### `test-analyze-prompt.sh`
**Purpose**: End-to-end validation of hub__analyze_prompt workflow

**Test Flow**:
1. Hub health check
2. Configuration validation
3. Establish MCP connection (SSE)
4. List initial tools (verify meta-tool)
5. Call hub__analyze_prompt
6. Verify dynamic tool exposure

**Usage**:
```bash
# Test with default prompt
./scripts/test-analyze-prompt.sh

# Test with custom prompt
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# CI mode (JSON output)
./scripts/test-analyze-prompt.sh --ci "Test prompt"

# Verbose mode
./scripts/test-analyze-prompt.sh --verbose "Test prompt"
```

**Exit Codes**:
- `0` - All tests passed
- `1` - Hub not running or configuration error
- `2` - Test execution failed
- `3` - Validation failed

---

### `test-analyze-prompt-performance.sh`
**Purpose**: Performance testing for hub__analyze_prompt meta-tool

**Metrics Measured**:
- Categorization latency (p50, p95, p99)
- Categorization accuracy
- Success rate
- LLM API performance

**Usage**:
```bash
./scripts/test-analyze-prompt-performance.sh
./scripts/test-analyze-prompt-performance.sh --iterations 100
./scripts/test-analyze-prompt-performance.sh --verbose
```

---

## Monitoring Scripts

### `monitor-staging-performance.sh`
**Purpose**: Real-time performance monitoring during staging

**Monitors**:
- Response times
- Error rates
- Memory usage
- Request throughput

**Usage**:
```bash
./scripts/monitor-staging-performance.sh
# Runs continuously until Ctrl+C
```

---

### `monitor-llm-health.sh`
**Purpose**: Monitor LLM provider health and categorization quality

**Metrics**:
- API response times
- API error rates
- Categorization success rate
- Categorization accuracy

**Usage**:
```bash
./scripts/monitor-llm-health.sh
# Runs continuously, logs to monitor-llm-health.log
```

---

### `monitor-llm-latency.sh`
**Purpose**: Track LLM categorization latency over time

**Usage**:
```bash
./scripts/monitor-llm-latency.sh
# Outputs latency measurements to CSV
```

---

### `validate-llm-accuracy.sh`
**Purpose**: Validate LLM categorization accuracy with known test cases

**Test Cases**:
- 20+ prompts with expected categories
- Accuracy threshold: 80%

**Usage**:
```bash
./scripts/validate-llm-accuracy.sh
```

---

## Release & Deployment

### `release.sh`
**Purpose**: Automated version bumping and git tagging

**Usage**:
```bash
# Patch release (bug fixes)
bash scripts/release.sh patch
# or: bun run release:patch

# Minor release (new features)
bash scripts/release.sh minor
# or: bun run release:minor

# Major release (breaking changes)
bash scripts/release.sh major
# or: bun run release:major
```

**Actions Performed**:
1. Validates clean git working directory
2. Bumps version in package.json
3. Creates git commit with version
4. Creates git tag (e.g., v4.2.0)
5. Pushes commit and tag to remote

---

### `beta_metrics.sh`
**Purpose**: Collect beta testing metrics and usage statistics

**Usage**:
```bash
./scripts/beta_metrics.sh
```

---

## Usage Examples

### Complete Staging Validation Workflow

```bash
# Prerequisites: Capture baselines
cd /home/ob/Development/Tools/mcp-hub
bun start  # In separate terminal

bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json

ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt

# Day 1 (H+0 to H+24)
./scripts/staging-smoke-tests.sh
bun test tests/prompt-based-filtering.test.js
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"
bun run test:load
bun run test:load:stress
bun run test:load:spike

# Day 1 Checkpoint (H+24)
./scripts/day1-checkpoint.sh
# Expected: ✅ DAY 1 CHECKPOINT: GO FOR DAY 2

# Day 2 (H+24 to H+48)
bun test  # Full suite
bun run test:coverage
./scripts/performance-regression-check.sh
./scripts/memory-regression-check.sh

# Final Sign-Off (H+48)
./scripts/final-sign-off-validation.sh --verbose
# Expected: ✅ ALL SIGN-OFF CRITERIA MET - APPROVED FOR PRODUCTION
```

### Quick Health Check

```bash
# One-liner to check all key metrics
./scripts/staging-smoke-tests.sh && \
./scripts/performance-regression-check.sh && \
./scripts/memory-regression-check.sh && \
echo "✅ All checks passed"
```

### Monitoring Dashboard

```bash
# Terminal 1: Error monitoring
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep --color=always -E 'ERROR|WARN|hub__analyze_prompt'

# Terminal 2: Memory monitoring
watch -n 60 'ps aux | grep "bun.*mcp-hub" | awk "{print \$2, \$4, \$6}"'

# Terminal 3: Performance monitoring
./scripts/monitor-staging-performance.sh

# Terminal 4: LLM health monitoring
./scripts/monitor-llm-health.sh
```

---

## Script Dependencies

### Required Tools
- `bash` (v4.0+)
- `curl` - HTTP requests
- `jq` - JSON parsing
- `bun` - Runtime and package manager
- `k6` - Load testing (for performance tests)
- `bc` - Calculation (for regression scripts)

### Optional Tools
- `screen` / `tmux` - Background monitoring
- `watch` - Real-time monitoring
- `grep` / `awk` / `sed` - Text processing

### Check Dependencies
```bash
for cmd in bash curl jq bun k6 bc; do
    command -v $cmd &> /dev/null && echo "✓ $cmd" || echo "✗ $cmd (missing)"
done
```

---

## Environment Variables

### Common Variables
- `HUB_URL` - MCP Hub URL (default: http://localhost:7000)
- `CONFIG_FILE` - Configuration file path (default: mcp-servers.json)
- `GEMINI_API_KEY` - Gemini API key (required for LLM tests)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)

### Set Environment
```bash
export HUB_URL="http://localhost:7000"
export CONFIG_FILE="mcp-servers.json"
export GEMINI_API_KEY="your-api-key"
```

---

## Troubleshooting

### Script Not Executable
```bash
chmod +x scripts/*.sh
```

### Dependencies Missing
```bash
# Install k6 (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install k6

# Install jq
sudo apt-get install jq
```

### Hub Not Running
```bash
# Check if running
curl -sf http://localhost:7000/health || echo "Hub not running"

# Start Hub
bun start
```

### Baseline Files Missing
```bash
# Create performance baseline
bun run test:load:ci
mv test-results-load.json baseline-pre-staging.json

# Create memory baseline
ps aux | grep "bun.*mcp-hub" | awk '{print $6}' > baseline-memory.txt
```

---

## Contributing

When adding new scripts:
1. Follow existing naming conventions (`kebab-case.sh`)
2. Include comprehensive help text (use `--help` flag)
3. Add exit code documentation
4. Add example usage to this README
5. Make script executable: `chmod +x scripts/new-script.sh`
6. Test on clean environment before committing

---

## See Also

- **Validation Strategy**: `claudedocs/STAGING_VALIDATION_STRATEGY.md`
- **Quick Reference**: `claudedocs/STAGING_VALIDATION_QUICK_REFERENCE.md`
- **Deployment Guide**: `claudedocs/DEPLOYMENT_STAGING.md`
- **Troubleshooting**: `claudedocs/TROUBLESHOOTING_MCP_CONNECTION.md`

---

**Last Updated**: 2025-11-07
**Maintained By**: Development Team
