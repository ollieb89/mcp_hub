# MCP Hub Load Testing Guide

Comprehensive guide for performance and load testing of MCP Hub using k6.

## Table of Contents
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Baseline Metrics](#baseline-metrics)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# 1. Install k6 (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# 2. Start MCP Hub
bun start

# 3. Run basic load test
bun run test:load
```

## Installation

### macOS
```bash
brew install k6
```

### Ubuntu/Debian
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```powershell
choco install k6
```

### Verification
```bash
k6 version
# Expected: k6 v0.47.0 or higher
```

## Test Scenarios

### 1. Basic Load Test (`basic-mcp-endpoint.js`)
**Purpose**: Validate normal operational performance

**Load Pattern**:
- Ramp to 20 users (1 min)
- Stay at 20 users (3 min)
- Spike to 50 users (1 min)
- Stay at 50 users (2 min)
- Ramp down (1 min)

**Target Endpoints**:
- `/mcp` (tools/list)
- `/health`

**Success Criteria**:
- p95 latency < 500ms
- Error rate < 1%
- Checks pass rate > 90%

**Run Command**:
```bash
bun run test:load
# OR
k6 run tests/load/basic-mcp-endpoint.js
```

### 2. Stress Test (`stress-test.js`)
**Purpose**: Find system breaking point and degradation behavior

**Load Pattern**:
- Progressive ramp: 50 → 100 → 200 → 300 → 400 → 500 users
- Each stage: 2 minutes
- Total duration: ~15 minutes

**Success Criteria**:
- p95 latency < 2s (degraded but acceptable)
- Error rate < 10%

**Run Command**:
```bash
bun run test:load:stress
# OR
k6 run tests/load/stress-test.js
```

**Expected Outcomes**:
- Identify at what user count performance degrades
- Determine maximum sustainable load
- Validate graceful degradation (no crashes)

### 3. Spike Test - LLM Filtering (`spike-test-llm.js`)
**Purpose**: Test LLM-based tool filtering under sudden traffic bursts

**Load Pattern**:
- Warm-up: 10 users (30s)
- Sudden spike: 100 users (10s)
- Hold spike: 100 users (1 min)
- Rapid drop: 10 users (30s)

**Target Operation**:
- `hub__analyze_prompt` meta-tool
- LLM categorization via Gemini API

**Prerequisites**:
```bash
export GEMINI_API_KEY="your-api-key"
# Ensure LLM filtering is enabled in mcp-servers.json
```

**Success Criteria**:
- p95 latency < 3s (includes external API)
- Error rate < 5%
- Categorization accuracy > 80%

**Run Command**:
```bash
bun run test:load:spike
# OR
k6 run tests/load/spike-test-llm.js
```

## Running Tests

### Environment Variables

```bash
# Change target URL (default: http://localhost:7000)
K6_BASE_URL=http://your-server:port k6 run tests/load/basic-mcp-endpoint.js

# Override test parameters
k6 run --vus 100 --duration 5m tests/load/basic-mcp-endpoint.js
```

### Output Formats

**Console Output** (default):
```bash
k6 run tests/load/basic-mcp-endpoint.js
```

**JSON Output** (for CI/CD):
```bash
k6 run --out json=results.json tests/load/basic-mcp-endpoint.js
```

**CSV Output**:
```bash
k6 run --out csv=results.csv tests/load/basic-mcp-endpoint.js
```

**Grafana Cloud** (real-time monitoring):
```bash
K6_CLOUD_TOKEN=your-token k6 cloud tests/load/basic-mcp-endpoint.js
```

### Test Execution Workflow

```bash
# 1. Start MCP Hub in one terminal
bun start

# 2. In another terminal, run load tests
bun run test:load         # Basic load test
bun run test:load:stress  # Stress test
bun run test:load:spike   # LLM spike test

# 3. For CI/CD pipeline
bun run test:load:ci      # Generates JSON output
```

## Interpreting Results

### Key Metrics

**http_req_duration**: Request response time
- p50: Median (50% of requests faster)
- p95: 95th percentile (95% of requests faster)
- p99: 99th percentile (99% of requests faster)

**http_req_failed**: Error rate
- Goal: < 1% for normal load
- Acceptable: < 5% under stress

**http_reqs**: Throughput (requests/second)
- Baseline: 100 req/s minimum
- Target: 500 req/s

**checks**: Success rate of test validations
- Goal: > 95%

### Sample Output

```
     ✓ tools/list status is 200
     ✓ tools/list has jsonrpc response
     ✓ tools/list has result
     ✓ tools/list response time < 500ms

     checks.........................: 98.42% ✓ 3544     ✗ 57
     data_received..................: 2.1 MB 35 kB/s
     data_sent......................: 156 kB 2.6 kB/s
     http_req_blocked...............: avg=1.23ms   min=2µs      med=7µs      max=234ms   p(90)=13µs     p(95)=17µs
     http_req_connecting............: avg=876µs    min=0s       med=0s       max=156ms   p(90)=0s       p(95)=0s
   ✓ http_req_duration..............: avg=128.45ms min=12.34ms  med=98.23ms  max=987ms   p(90)=256ms    p(95)=389ms
       { type:tool_list }...........: avg=156.78ms min=15.67ms  med=122.45ms max=987ms   p(90)=312ms    p(95)=456ms
     http_req_failed................: 0.87%  ✓ 32       ✗ 3569
     http_req_receiving.............: avg=45.23µs  min=11µs     med=38µs     max=1.2ms   p(90)=67µs     p(95)=89µs
     http_req_sending...............: avg=34.12µs  min=8µs      med=28µs     max=890µs   p(90)=56µs     p(95)=78µs
     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s      p(90)=0s       p(95)=0s
     http_req_waiting...............: avg=128.37ms min=12.31ms  med=98.16ms  max=986ms   p(90)=256ms    p(95)=389ms
     http_reqs......................: 3601   60.01/s
     iteration_duration.............: avg=1.28s    min=1.01s    med=1.23s    max=2.1s    p(90)=1.56s    p(95)=1.78s
     iterations.....................: 1800   30.00/s
     vus............................: 20     min=0      max=50
     vus_max........................: 50     min=50     max=50
```

### Interpreting Thresholds

✓ **Green (Passing)**: Threshold met
```
✓ http_req_duration: p(95)<500ms
```

✗ **Red (Failing)**: Threshold exceeded
```
✗ http_req_duration: p(95)<500ms
```

## Baseline Metrics

See [`baseline-metrics.json`](./baseline-metrics.json) for complete reference.

### Critical Endpoints Performance Targets

| Endpoint | p50 | p95 | p99 | Max |
|----------|-----|-----|-----|-----|
| `/mcp` (tools/list) | 50ms | 200ms | 500ms | 1000ms |
| `/mcp` (tools/call) | 100ms | 500ms | 1000ms | 2000ms |
| `/health` | 10ms | 50ms | 100ms | 200ms |
| `/events` (SSE) | - | 100ms | - | 500ms |
| LLM categorization | 800ms | 2000ms | 3000ms | 5000ms |

### Load Capacity Targets

- **Normal Load**: 50 concurrent users
- **Peak Load**: 100 concurrent users
- **Stress Limit**: 300+ concurrent users
- **Throughput**: 100-500 req/s

### System Resource Limits

- **Memory**: < 512MB under peak load
- **CPU**: < 70% on single core
- **Connection Pool**: 50 max connections (configurable)
- **Error Rate**: < 1% under normal load

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/load-test.yml
name: Load Testing

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Install dependencies
        run: bun install

      - name: Start MCP Hub
        run: |
          bun start &
          sleep 5  # Wait for server startup

      - name: Run load tests
        run: bun run test:load:ci

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: load-test-results
          path: test-results-load.json

      - name: Analyze results
        run: |
          # Add custom result analysis script here
          # Example: Check if p95 < 500ms threshold
          echo "Load test completed"
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:load": "k6 run tests/load/basic-mcp-endpoint.js",
    "test:load:stress": "k6 run tests/load/stress-test.js",
    "test:load:spike": "k6 run tests/load/spike-test-llm.js",
    "test:load:ci": "k6 run --out json=test-results-load.json tests/load/basic-mcp-endpoint.js"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
**Error**: `dial: i/o timeout` or `connection refused`

**Solutions**:
- Verify MCP Hub is running: `curl http://localhost:7000/api/health`
- Check port 7000 is not in use: `lsof -i :7000`
- Start MCP Hub: `bun start`

#### 2. High Error Rates
**Symptom**: `http_req_failed` > 5%

**Diagnosis**:
```bash
# Check MCP Hub logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log

# Verify server health during test
watch -n 1 curl http://localhost:7000/health
```

**Common Causes**:
- MCP server connection failures
- Resource exhaustion (CPU/memory)
- Connection pool saturation
- External API rate limits (LLM providers)

#### 3. Slow Response Times
**Symptom**: p95 > threshold

**Diagnosis**:
```bash
# Monitor system resources during test
htop  # or top

# Check Bun runtime performance
bun --inspect start

# Review connection pool settings
cat mcp-servers.json | grep -A5 connectionPool
```

**Optimization**:
- Increase connection pool: `maxConnections: 100`
- Reduce keep-alive timeout for faster recycling
- Enable Pino async logger: `ENABLE_PINO_LOGGER=true`
- Profile MCP server performance

#### 4. LLM Spike Test Failures
**Symptom**: High error rate in `spike-test-llm.js`

**Causes**:
- Missing `GEMINI_API_KEY` environment variable
- Gemini API rate limits exceeded
- LLM filtering not enabled in config

**Solutions**:
```bash
# Set API key
export GEMINI_API_KEY="your-key-here"

# Enable LLM filtering in mcp-servers.json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${env:GEMINI_API_KEY}"
    }
  }
}
```

#### 5. Memory Leaks
**Symptom**: Memory usage continuously increases

**Diagnosis**:
```bash
# Run endurance test
k6 run --vus 20 --duration 30m tests/load/basic-mcp-endpoint.js

# Monitor memory during test
watch -n 5 'ps aux | grep "bun\|k6"'
```

**Tools**:
- Bun profiler: `bun --inspect start`
- Memory snapshots at intervals
- Review SSE connection cleanup

### Performance Tuning Tips

1. **Connection Pool Optimization**:
```json
{
  "connectionPool": {
    "enabled": true,
    "maxConnections": 100,
    "keepAliveTimeout": 30000
  }
}
```

2. **Enable Async Logging**:
```bash
ENABLE_PINO_LOGGER=true bun start
```

3. **MCP Server Configuration**:
- Use STDIO servers for local performance
- Configure SSE servers with connection pooling
- Monitor OAuth token refresh frequency

4. **System Tuning**:
```bash
# Increase file descriptor limits
ulimit -n 10000

# TCP tuning for high concurrency
sudo sysctl -w net.core.somaxconn=4096
```

## Advanced Usage

### Custom Test Scenarios

```javascript
// tests/load/custom-scenario.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    // Scenario 1: Constant load
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    // Scenario 2: Ramping arrivals
    ramping_arrivals: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      stages: [
        { target: 50, duration: '2m' },
        { target: 100, duration: '5m' },
        { target: 0, duration: '1m' },
      ],
    },
  },
};
```

### Grafana Cloud Integration

```bash
# Sign up at https://grafana.com/products/cloud/k6/
K6_CLOUD_TOKEN=your-token k6 cloud tests/load/basic-mcp-endpoint.js
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [MCP Hub Documentation](../../README.md)
- [Baseline Metrics](./baseline-metrics.json)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Grafana k6 Cloud](https://grafana.com/products/cloud/k6/)

## Support

For issues or questions:
- GitHub Issues: [MCP Hub Issues](https://github.com/ollieb89/mcp_hub/issues)
- k6 Community: [k6 Community Forum](https://community.k6.io/)
