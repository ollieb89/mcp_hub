# Load Testing Quick Start

Get load testing running in under 5 minutes.

## Prerequisites
- MCP Hub installed and configured
- k6 load testing tool

## Step 1: Install k6 (Ubuntu/Debian)

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

**Other platforms**: See `INSTALL_K6.md`

## Step 2: Start MCP Hub

```bash
cd /home/ob/Development/Tools/mcp-hub
bun start
```

## Step 3: Run Load Test

In another terminal:

```bash
# Basic load test
bun run test:load

# OR directly with k6
k6 run tests/load/basic-mcp-endpoint.js
```

## Interpreting Results

Look for these key metrics:

```
✓ http_req_duration: p(95)<500ms    ← GOOD: 95% requests under 500ms
✗ http_req_duration: p(95)<500ms    ← BAD: Threshold exceeded
✓ errors: rate<0.01                 ← GOOD: Error rate under 1%
✓ checks: rate>0.9                  ← GOOD: 90%+ checks passed

http_reqs: 3601   60.01/s          ← 60 requests/second throughput
```

### Success Indicators
✅ All thresholds marked with ✓ (green)
✅ http_req_duration p95 < 500ms
✅ Error rate < 1%
✅ Checks pass rate > 90%

## Other Test Scenarios

```bash
# Find system breaking point
bun run test:load:stress

# Test LLM filtering under spike
bun run test:load:spike

# Generate JSON for CI/CD
bun run test:load:ci
```

## Troubleshooting

### Connection Refused
```bash
# Verify MCP Hub is running
curl http://localhost:7000/api/health

# Expected: {"status":"ok","state":"ready",...}
```

### High Error Rates
```bash
# Check MCP Hub logs
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log
```

### k6 Not Found
```bash
# Verify installation
k6 version

# If missing, reinstall (see Step 1)
```

## Next Steps

1. **Review Results**: See `README.md` for detailed metric explanations
2. **Check Baselines**: Compare against `baseline-metrics.json`
3. **Optimize**: Tune connection pool, enable async logging
4. **Automate**: Set up CI/CD integration

## Documentation

- **Complete Guide**: `README.md`
- **Installation**: `INSTALL_K6.md`
- **Baselines**: `baseline-metrics.json`
- **Test Files**: `basic-mcp-endpoint.js`, `stress-test.js`, `spike-test-llm.js`

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run test:load` | Basic load test |
| `bun run test:load:stress` | Stress test |
| `bun run test:load:spike` | LLM spike test |
| `bun run test:load:ci` | CI/CD mode |
| `k6 run --vus 10 --duration 30s <test>` | Custom load |

**Expected Runtime**: 8-10 minutes for basic test
