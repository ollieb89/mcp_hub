# Testing Resource Optimization

## Overview

The MCP Hub test suite is configured to prioritize **resource efficiency** over speed by default. This ensures tests can run on resource-constrained systems without overwhelming CPU, memory, or causing system instability.

## Default Configuration

**File**: `vitest.config.js`

The test configuration uses these resource-saving defaults:

- **`fileParallelism: false`** - Test files run sequentially (one at a time)
- **`maxConcurrency: 5`** - Maximum 5 tests run concurrently within a single file
- **`pool: 'threads'`** - Uses thread pool (more stable than fork pool)
- **`poolOptions.threads.singleThread: true`** - Single worker thread only
- **`isolate: true`** - Each test file runs in isolated context (prevents memory leaks)

### Why Sequential by Default?

Sequential execution provides:
- **Lower memory usage** (~50-100MB vs 200-500MB for parallel)
- **Lower CPU usage** (single core vs all cores)
- **More predictable behavior** (no race conditions in tests)
- **Better for CI environments** (shared resources)
- **Easier debugging** (clear execution order)

## Test Scripts

### Resource-Efficient Scripts (Recommended)

```bash
# Default: Sequential execution, minimal resources
npm test

# Sequential with coverage (quality assurance)
npm run test:quality

# Explicit sequential mode (same as default)
npm run test:seq
```

**Resource Usage**:
- Memory: ~50-100MB
- CPU: Single core, ~20-40% utilization
- Time: ~30-60 seconds (442 tests)

### Fast Scripts (Use When Resources Available)

```bash
# Parallel execution with 4 worker threads
npm run test:fast
```

**Resource Usage**:
- Memory: ~200-300MB
- CPU: 4 cores, ~60-80% utilization per core
- Time: ~10-20 seconds (442 tests)

### Watch Mode

```bash
# Watch mode with sequential execution
npm run test:watch
```

Automatically re-runs tests on file changes. Uses same resource-efficient defaults.

### Coverage Scripts

```bash
# Sequential with coverage report
npm run test:quality

# Coverage with HTML report
npm run test:coverage:ui
```

Coverage adds ~20-30% overhead but provides detailed code coverage metrics.

## Configuration Options

### Override Sequential Mode

If you have resources available and want faster execution:

```bash
# Override in CLI
vitest run --no-file-parallelism=false --poolOptions.threads.singleThread=false

# Or use the fast script
npm run test:fast
```

### Adjust Concurrency

```bash
# Very low resources (1 test at a time)
vitest run --maxConcurrency=1

# More resources available (10 concurrent tests)
vitest run --maxConcurrency=10
```

### Thread Pool Options

```bash
# Multiple worker threads (faster but more memory)
vitest run --poolOptions.threads.singleThread=false --poolOptions.threads.maxThreads=4

# Single thread (slower but minimal memory)
vitest run --poolOptions.threads.singleThread=true
```

## Performance Comparison

| Mode | Time | Memory | CPU Cores | Use Case |
|------|------|--------|-----------|----------|
| Sequential (default) | 30-60s | 50-100MB | 1 | CI, low-resource systems |
| test:quality | 40-80s | 80-150MB | 1 | Quality gates, coverage |
| test:seq | 30-60s | 50-100MB | 1 | Explicit sequential |
| test:fast | 10-20s | 200-300MB | 4 | Development, powerful machines |

## CI/CD Recommendations

### GitHub Actions

```yaml
- name: Run Tests (Sequential)
  run: npm test
  # Uses default sequential mode, ~100MB memory
```

### GitLab CI

```yaml
test:
  script:
    - npm run test:quality
  # Sequential + coverage for quality gates
```

### Resource-Constrained CI

```yaml
test:
  script:
    - npm run test:seq -- --maxConcurrency=1
  # Absolute minimum resources
```

## Troubleshooting

### Out of Memory Errors

If you encounter OOM errors even in sequential mode:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=512" npm test

# Or reduce concurrency further
npm run test:seq -- --maxConcurrency=1
```

### Slow Test Execution

If sequential mode is too slow:

```bash
# Use fast mode (requires more resources)
npm run test:fast

# Or adjust thread count
vitest run --poolOptions.threads.maxThreads=2
```

### Test Flakiness

If tests are flaky in parallel mode:

```bash
# Use sequential mode (default)
npm test

# Or increase isolation
vitest run --isolate=true --no-file-parallelism
```

## Best Practices

1. **Use default `npm test` for CI/CD** - Sequential mode is reliable and predictable
2. **Use `npm run test:fast` for local development** - When you have resources available
3. **Use `npm run test:quality` before commits** - Ensures coverage and quality
4. **Monitor resource usage** - Use `htop` or task manager to verify impact
5. **Adjust as needed** - Override defaults via CLI flags when appropriate

## Resource Monitoring

Monitor test resource usage:

```bash
# Linux
htop  # Watch CPU/memory during tests

# macOS
top -pid $(pgrep -f vitest)

# Windows
Task Manager > Details > node.exe processes
```

## Summary

- **Default mode**: Sequential, low-resource (50-100MB, 1 core)
- **Quality mode**: Sequential + coverage (80-150MB, 1 core)
- **Fast mode**: Parallel, high-resource (200-300MB, 4 cores)

Choose based on your system resources and time constraints. When in doubt, use the defaults - they're optimized for reliability and efficiency.
