#!/bin/bash

# MCP Hub Complete Deployment Orchestration Script
# Orchestrates full deployment: backup → stop → deploy → start → validate

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 MCP Hub Complete Deployment"
echo "========================================"
echo ""

# Phase 1: Backup (5 minutes)
echo "📋 Phase 1: Pre-Deployment Backup"
echo "----------------------------------------"
if ! bash "$SCRIPT_DIR/backup-pre-deployment.sh"; then
  echo "❌ Backup failed"
  exit 1
fi
echo ""

# Phase 2: Stop Current Version (2 minutes)
echo "🛑 Phase 2: Stop Current Version"
echo "----------------------------------------"
if ! bash "$SCRIPT_DIR/stop-mcp-hub.sh"; then
  echo "❌ Shutdown failed"
  exit 1
fi
echo ""

# Phase 3: Deploy New Version (5 minutes)
echo "📦 Phase 3: Deploy New Version"
echo "----------------------------------------"
if ! bash "$SCRIPT_DIR/deploy-mcp-hub.sh"; then
  echo "❌ Deployment failed"
  echo "Rolling back..."
  bash "$SCRIPT_DIR/rollback-deployment.sh"
  exit 1
fi
echo ""

# Phase 4: Start New Version (2 minutes)
echo "🚀 Phase 4: Start New Version"
echo "----------------------------------------"
if ! bash "$SCRIPT_DIR/start-mcp-hub.sh"; then
  echo "❌ Startup failed"
  echo "Rolling back..."
  bash "$SCRIPT_DIR/rollback-deployment.sh"
  exit 1
fi
echo ""

# Phase 5: Validation (3 minutes)
echo "🔍 Phase 5: Deployment Validation"
echo "----------------------------------------"
sleep 5  # Give service time to stabilize
if ! bash "$SCRIPT_DIR/validate-deployment.sh"; then
  echo "❌ Validation failed"
  echo "Consider rolling back: bash scripts/rollback-deployment.sh"
  exit 1
fi
echo ""

# Success
echo "========================================="
echo "✅ Deployment Complete"
echo "========================================="
echo "Total time: ~17 minutes"
echo ""
echo "Next Steps:"
echo "1. Monitor: bash scripts/monitor-production.sh"
echo "2. Check alerts: bash scripts/check-alerts.sh"
echo "3. Measure performance: bash scripts/measure-performance.sh"
echo ""
echo "Rollback available: bash scripts/rollback-deployment.sh"
echo "========================================="
