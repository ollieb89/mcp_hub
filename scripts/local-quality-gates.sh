#!/bin/bash

# Local Quality Gates Check
# Runs all CI quality gates locally before pushing

echo "========================================="
echo "Local Quality Gates Check"
echo "========================================="
echo ""

FAILED=0
START_TIME=$(date +%s)

# Gate 1: Lint
echo "🔍 Gate 1: Lint & Format"
if bun run lint; then
  echo "✅ PASS: Lint"
else
  echo "❌ FAIL: Lint"
  ((FAILED++))
fi
echo ""

# Gate 2: Baseline Tests
echo "🧪 Gate 2: Baseline Tests (273 tests - CRITICAL)"
if bun run test:baseline; then
  echo "✅ PASS: Baseline Tests"
else
  echo "❌ FAIL: Baseline Tests - These MUST pass 100%"
  ((FAILED++))
fi
echo ""

# Gate 3: Feature Tests
echo "🧪 Gate 3: Feature Tests (498 tests - 80%+ target)"
FEATURE_OUTPUT=$(bun run test:features 2>&1)
FEATURE_RESULT=$?
echo "$FEATURE_OUTPUT"

if [ $FEATURE_RESULT -eq 0 ]; then
  echo "✅ PASS: Feature Tests"
else
  echo "⚠️  WARN: Feature Tests (not critical, target 80%+)"
fi
echo ""

# Gate 4: Coverage
echo "📊 Gate 4: Code Coverage (80%+ branches)"
if bun run test:coverage > /dev/null 2>&1; then
  if [ -f "coverage/coverage-summary.json" ]; then
    BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)
    if (( $(echo "$BRANCHES >= 80" | bc -l 2>/dev/null || echo "0") )); then
      echo "✅ PASS: Coverage (${BRANCHES}% branches)"
    else
      echo "❌ FAIL: Coverage (${BRANCHES}% < 80%)"
      ((FAILED++))
    fi
  else
    echo "❌ FAIL: Coverage summary not found"
    ((FAILED++))
  fi
else
  echo "❌ FAIL: Coverage tests failed"
  ((FAILED++))
fi
echo ""

# Gate 6: Build
echo "🏗️  Gate 6: Build Package"
if bun run clean > /dev/null 2>&1 && bun run build > /dev/null 2>&1; then
  if [ -f "dist/cli.js" ]; then
    echo "✅ PASS: Build (dist/cli.js created)"
  else
    echo "❌ FAIL: Build (dist/cli.js missing)"
    ((FAILED++))
  fi
else
  echo "❌ FAIL: Build process failed"
  ((FAILED++))
fi
echo ""

# Gate 7: ML Filtering
echo "🤖 Gate 7: ML Tool Filtering"
if bun test tests/tool-filtering*.test.js tests/task-3-*.test.js tests/prompt-based*.test.js > /dev/null 2>&1; then
  echo "✅ PASS: ML Filtering Tests"
else
  echo "❌ FAIL: ML Filtering Tests"
  ((FAILED++))
fi
echo ""

# Gate 8: Monitoring
echo "📊 Gate 8: Monitoring System"
MONITORING_OK=1

# Check scripts exist and are executable
for script in \
  scripts/monitor-production.sh \
  scripts/check-alerts.sh \
  scripts/measure-performance.sh \
  scripts/monitoring/phase1-validation.sh \
  scripts/monitoring/detect-anomalies.sh \
  scripts/monitoring/daily-summary.sh; do
  if [ ! -x "$script" ]; then
    echo "❌ Missing or not executable: $script"
    MONITORING_OK=0
  fi
done

# Check alert config
if [ -f "config/alerts.json" ]; then
  if jq empty config/alerts.json 2>/dev/null; then
    : # Valid JSON
  else
    echo "❌ Invalid JSON: config/alerts.json"
    MONITORING_OK=0
  fi
else
  echo "❌ Missing: config/alerts.json"
  MONITORING_OK=0
fi

# Run monitoring tests
if ! bun test tests/event-batcher.test.js tests/background-queue.test.js > /dev/null 2>&1; then
  echo "❌ Monitoring tests failed"
  MONITORING_OK=0
fi

if [ $MONITORING_OK -eq 1 ]; then
  echo "✅ PASS: Monitoring System"
else
  echo "❌ FAIL: Monitoring System"
  ((FAILED++))
fi
echo ""

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
echo "========================================="
echo "Quality Gates Summary"
echo "========================================="
echo "Duration: ${DURATION}s"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All critical gates passed"
  echo ""
  echo "Ready to push! All quality gates met."
  exit 0
else
  echo "❌ $FAILED critical gate(s) failed"
  echo ""
  echo "⚠️  Fix failing gates before pushing:"
  echo "   - Baseline tests must pass 100%"
  echo "   - Coverage must be ≥80% branches"
  echo "   - Build must succeed"
  echo "   - ML filtering tests must pass"
  echo "   - Monitoring system must be valid"
  exit 1
fi
