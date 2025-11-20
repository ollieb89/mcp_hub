#!/bin/bash

# MCP Hub Pre-Flight Check Script
# Validates deployment readiness before production deployment

set -e  # Exit on first error

echo "🚀 MCP Hub Pre-Flight Check"
echo "========================================"
echo ""

FAILED=0
PASSED=0

# Check 1: Git status
echo -n "Check 1: Git repository clean... "
if git diff-index --quiet HEAD --; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ Uncommitted changes detected"
  git status --short
  ((FAILED++))
fi

# Check 2: Baseline test suite
echo -n "Check 2: Baseline tests (273 tests)... "
if bun run test:baseline > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ Baseline tests failed"
  ((FAILED++))
fi

# Check 3: Build
echo -n "Check 3: Build successful... "
if bun run build > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ Build failed"
  ((FAILED++))
fi

# Check 4: Build artifact validation
echo -n "Check 4: Build artifact executable... "
if [ -x dist/cli.js ]; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ dist/cli.js not executable"
  ((FAILED++))
fi

# Check 5: Build artifact size
echo -n "Check 5: Build artifact size... "
BUILD_SIZE=$(du -k dist/cli.js | cut -f1)
if [ "$BUILD_SIZE" -gt 100 ] && [ "$BUILD_SIZE" -lt 10000 ]; then
  echo "✅ (${BUILD_SIZE}KB)"
  ((PASSED++))
else
  echo "❌ Unexpected size: ${BUILD_SIZE}KB (expected: 100-10000KB)"
  ((FAILED++))
fi

# Check 6: Configuration file exists
echo -n "Check 6: Configuration file exists... "
if [ -f "config/mcp-hub.json" ] || [ -f "mcp-servers.json" ]; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ No configuration file found"
  ((FAILED++))
fi

# Check 7: API keys configured
echo -n "Check 7: LLM API keys configured... "
if [ -n "$GEMINI_API_KEY" ] || [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ No LLM API keys configured"
  echo "   Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY"
  ((FAILED++))
fi

# Check 8: Disk space
echo -n "Check 8: Disk space available... "
DISK_FREE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$DISK_FREE" -gt 10 ]; then
  echo "✅ (${DISK_FREE}GB free)"
  ((PASSED++))
else
  echo "❌ Insufficient disk space: ${DISK_FREE}GB (minimum: 10GB)"
  ((FAILED++))
fi

# Check 9: Memory available
echo -n "Check 9: Memory available... "
MEM_FREE=$(free -g | awk '/^Mem:/ {print $7}')
if [ "$MEM_FREE" -gt 2 ]; then
  echo "✅ (${MEM_FREE}GB free)"
  ((PASSED++))
else
  echo "⚠️  Low memory: ${MEM_FREE}GB (recommended: >2GB)"
  # Warning only, don't fail
  ((PASSED++))
fi

# Check 10: Node/Bun version
echo -n "Check 10: Runtime version... "
BUN_VERSION=$(bun --version)
if [ -n "$BUN_VERSION" ]; then
  echo "✅ (bun $BUN_VERSION)"
  ((PASSED++))
else
  echo "❌ Bun not installed"
  ((FAILED++))
fi

# Check 11: Port availability
echo -n "Check 11: Port 7000 available... "
if ! lsof -i :7000 > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️  Port 7000 in use (will be stopped during deployment)"
  # Warning only, don't fail
  ((PASSED++))
fi

# Check 12: Backup directory writable
echo -n "Check 12: Backup directory writable... "
mkdir -p backups
if [ -w backups ]; then
  echo "✅"
  ((PASSED++))
else
  echo "❌ Cannot write to backups/ directory"
  ((FAILED++))
fi

# Summary
echo ""
echo "========================================"
echo "Pre-Flight Check Results"
echo "========================================"
echo "Passed: $PASSED/12"
echo "Failed: $FAILED/12"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo "✅ All pre-flight checks passed"
  echo ""
  echo "Ready for deployment!"
  echo "Next step: bash scripts/complete-deployment.sh"
  exit 0
else
  echo "❌ Some pre-flight checks failed"
  echo ""
  echo "Fix the issues above before deploying."
  exit 1
fi
